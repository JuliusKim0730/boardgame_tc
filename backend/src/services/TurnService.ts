import { pool } from '../db/pool';
import { turnManager } from './TurnManager';
import { Server } from 'socket.io';
import { drawCard } from './DeckService';
import { addEffects, allowedActionsAt, moveError, parseJSON, Traits } from '../game/rules';
import {
  getPlayerCount,
  getPlayerState,
  getRoomId,
  getTurnInfo,
  grantExtraCredit,
  logEvent,
  recordAction,
  withTransaction,
} from './TurnState';

export const ACTION_NAMES = ['', '무료 계획', '조사하기', '집안일', '여행 지원', '찬스', '자유 행동'];

export class TurnService {
  private io: Server | null = null;

  setSocketIO(io: Server) {
    this.io = io;
  }

  // 이동 처리 (룰북 6.1: 인접 칸, 직전 턴 행동 칸 금지)
  async move(gameId: string, playerId: string, targetPosition: number): Promise<void> {
    turnManager.validateTurn(gameId, playerId);

    const { from } = await withTransaction(async (client) => {
      const state = await getPlayerState(client, gameId, playerId);
      const info = await getTurnInfo(client, state.id);
      if (!info.turnId) throw new Error('진행 중인 턴이 없습니다');
      if (info.moved) throw new Error('이미 이동했습니다');
      if (info.mainDone) throw new Error('이미 행동을 마쳤습니다');
      if (state.forced_move) {
        throw new Error('강제 이동된 칸에서는 이동 없이 바로 행동합니다');
      }

      const error = moveError(state.position, targetPosition, state.last_position ?? null);
      if (error) throw new Error(error);

      await client.query('UPDATE player_states SET position = $1 WHERE id = $2', [targetPosition, state.id]);
      await recordAction(client, info.turnId, 'move', { from: state.position, to: targetPosition });
      await logEvent(client, gameId, 'move', { playerId, from: state.position, to: targetPosition });
      return { from: state.position };
    });

    const roomId = await getRoomId(gameId);
    if (this.io && roomId) {
      this.io.to(roomId).emit('move-completed', { playerId, from, to: targetPosition });
    }
  }

  /**
   * 행동 처리. 이번 턴 주 행동 전이면 주 행동, 이후라면 추가 행동(권한 필요)으로 처리한다.
   * @param option 2인 전용 찬스 칸 선택 ('card' | 'money')
   */
  async performAction(gameId: string, playerId: string, actionType: number, option?: 'card' | 'money'): Promise<any> {
    turnManager.validateTurn(gameId, playerId);

    const outcome = await withTransaction(async (client) => {
      const state = await getPlayerState(client, gameId, playerId);
      const info = await getTurnInfo(client, state.id);
      if (!info.turnId) throw new Error('진행 중인 턴이 없습니다');
      const playerCount = await getPlayerCount(client, gameId);
      const is2Player = playerCount === 2;

      const isExtra = info.mainDone;
      let credit = null;
      if (!isExtra) {
        if (!info.moved && !state.forced_move) throw new Error('먼저 이동해야 합니다');
        if (actionType === 6 && state.position === 6) {
          return { result: { success: true, requiresFreeChoice: true, message: '1~5번 행동 중 하나를 선택하세요' } };
        }
        if (!allowedActionsAt(state.position).includes(actionType)) {
          throw new Error(`${state.position}번 칸에서는 ${allowedActionsAt(state.position).join(', ')}번 행동만 가능합니다`);
        }
      } else {
        credit = info.pendingCredits[0];
        if (!credit) throw new Error('이미 행동했습니다. 추가 행동에는 결심 토큰이나 찬스 카드 효과가 필요합니다');
        if (actionType === 6) {
          return { result: { success: true, requiresFreeChoice: true, message: '1~5번 행동 중 하나를 선택하세요' } };
        }
        if (actionType < 1 || actionType > 5) throw new Error('잘못된 행동입니다');
        if (credit.fixedAction && actionType !== credit.fixedAction) {
          throw new Error(`이 추가 행동은 ${credit.fixedAction}번 행동만 가능합니다`);
        }
        if (!credit.allowRepeat && actionType === info.lastAction) {
          throw new Error('직전에 행동한 칸은 반복할 수 없습니다');
        }
      }

      if (actionType === 5 && is2Player && !option) {
        return { result: { success: true, requiresChoice: true, message: '찬스 카드 또는 500TC를 선택하세요' } };
      }

      const result = await this.resolveAction(client, gameId, playerId, state, actionType, { is2Player, option });

      await recordAction(client, info.turnId, isExtra ? 'extra' : 'main', { actionType, source: credit?.source });
      if (!isExtra) {
        // 다음 턴 이동 제한(직전 턴 행동 칸)을 위해 행동한 칸을 기록
        await client.query('UPDATE player_states SET last_position = position, forced_move = FALSE WHERE id = $1', [
          state.id,
        ]);
      }
      await logEvent(client, gameId, `action_${actionType}`, {
        playerId,
        actionType,
        extra: isExtra,
        cardCode: result.card?.code || result.chanceCard?.code,
        message: result.message,
      });
      return { result };
    });

    let result = outcome.result;
    if (result.chanceCard) {
      // 찬스 카드 효과는 커밋 후 실행 (상대 선택을 기다릴 수 있으므로 트랜잭션을 오래 잡지 않는다)
      const { chanceService } = await import('./ChanceService');
      const card = result.chanceCard;
      const effectResult = await chanceService.executeCard(gameId, playerId, card);
      result = {
        ...result,
        ...effectResult,
        success: true,
        card,
        effectResult,
        message: `찬스 카드 "${card.name}" - ${effectResult.message || ''}`.trim(),
      };
      delete result.chanceCard;
    }

    if (!result.requiresChoice && !result.requiresFreeChoice) {
      await this.broadcastAction(gameId, playerId, actionType, result);
    }
    return result;
  }

  private async resolveAction(
    client: any,
    gameId: string,
    playerId: string,
    state: any,
    actionType: number,
    ctx: { is2Player: boolean; option?: 'card' | 'money' }
  ): Promise<any> {
    switch (actionType) {
      case 1: {
        // 무료 계획: 카드 획득 즉시 특성·추억 적용
        const card = await drawCard(client, gameId, 'freeplan');
        if (!card) return { success: true, message: '무료 계획 카드가 모두 소진되었습니다' };
        await this.applyTraitEffects(client, state.id, card.effects);
        await client.query('INSERT INTO purchased (player_state_id, card_id, price_paid) VALUES ($1, $2, 0)', [
          state.id,
          card.id,
        ]);
        let message = `무료 계획 "${card.name}" 획득! ${describeEffects(card.effects)}`;
        if (card.code === 'F5') {
          // 친구랑 놀기: 지정 친구(다음 차례 플레이어) 추억 +1
          const friend = await this.nextPlayer(client, gameId, state.turn_order);
          if (friend) {
            await this.applyTraitEffects(client, friend.id, { memory: 1 });
            message += ' (함께 논 친구 추억 +1)';
          }
        }
        return { success: true, card, message };
      }
      case 2: {
        const card = await drawCard(client, gameId, 'plan');
        if (!card) return { success: true, message: '일반 계획 카드가 모두 소진되었습니다' };
        const seq = await client.query(
          'SELECT COALESCE(MAX(seq), -1) + 1 AS next FROM hands WHERE player_state_id = $1',
          [state.id]
        );
        await client.query('INSERT INTO hands (player_state_id, card_id, seq) VALUES ($1, $2, $3)', [
          state.id,
          card.id,
          seq.rows[0].next,
        ]);
        return { success: true, card, message: `계획 카드 "${card.name}" 획득! (${card.cost.toLocaleString()}TC)` };
      }
      case 3: {
        const card = await drawCard(client, gameId, 'house');
        if (!card) return { success: true, message: '집안일 카드가 모두 소진되었습니다' };
        let money = Number(card.effects.money || 0);
        let message = `집안일 "${card.name}" 완료! +${money.toLocaleString()}TC`;
        if (ctx.is2Player) {
          const visited = await client.query(
            `SELECT 1 FROM event_logs WHERE game_id = $1 AND event_type = 'action_3' AND data->>'playerId' = $2 LIMIT 1`,
            [gameId, playerId]
          );
          if (visited.rows.length === 0) {
            money += 500;
            message += ' (2인 첫 방문 보너스 +500TC)';
          }
        }
        await this.addMoney(client, state.id, money);
        return { success: true, card, money, message };
      }
      case 4: {
        const card = await drawCard(client, gameId, 'support');
        if (!card) return { success: true, message: '여행 지원 카드가 모두 소진되었습니다' };
        const money = Number(card.effects.money || 0);
        await this.addMoney(client, state.id, money);
        return {
          success: true,
          card,
          money,
          message: `여행 지원 "${card.name}" ${money >= 0 ? '+' : ''}${money.toLocaleString()}TC`,
        };
      }
      case 5: {
        if (ctx.is2Player && ctx.option === 'money') {
          await this.addMoney(client, state.id, 500);
          return { success: true, money: 500, message: '찬스 칸: 500TC 획득' };
        }
        const card = await drawCard(client, gameId, 'chance');
        if (!card) return { success: true, message: '찬스 카드가 모두 소진되었습니다' };
        return { success: true, chanceCard: card };
      }
      default:
        throw new Error('잘못된 행동입니다');
    }
  }

  // 결심 토큰 사용: 추가 행동 권한 부여 (실제 행동은 이어지는 /action 호출에서 수행)
  async useResolveToken(gameId: string, playerId: string, actionType?: number): Promise<any> {
    turnManager.validateTurn(gameId, playerId);

    return withTransaction(async (client) => {
      const state = await getPlayerState(client, gameId, playerId);
      const info = await getTurnInfo(client, state.id);
      if (!info.mainDone) throw new Error('결심 토큰은 이번 턴 행동을 마친 뒤 사용할 수 있습니다');
      if (state.resolve_token <= 0) throw new Error('결심 토큰이 부족합니다');
      if (info.pendingCredits.length > 0) throw new Error('먼저 남은 추가 행동을 수행하세요');
      if (actionType !== undefined && actionType === info.lastAction) {
        throw new Error('직전에 행동한 칸은 반복할 수 없습니다');
      }

      await client.query('UPDATE player_states SET resolve_token = resolve_token - 1 WHERE id = $1', [state.id]);
      await grantExtraCredit(client, gameId, playerId, { source: 'resolve' });
      const day = (await client.query('SELECT day FROM games WHERE id = $1', [gameId])).rows[0].day;
      await logEvent(client, gameId, 'resolve_token_used', { playerId, day });
      return { success: true, remainingTokens: state.resolve_token - 1 };
    });
  }

  // 2인 전용 찬스 칸 선택 (카드 또는 500TC) - 주 행동으로 처리
  async chanceOption(gameId: string, playerId: string, option: 'card' | 'money') {
    return this.performAction(gameId, playerId, 5, option);
  }

  // 현재 게임 날짜 조회
  async getCurrentDay(gameId: string): Promise<number> {
    const result = await pool.query('SELECT day FROM games WHERE id = $1', [gameId]);
    return result.rows[0]?.day || 1;
  }

  private async broadcastAction(gameId: string, playerId: string, actionType: number, result: any) {
    if (!this.io) return;
    const roomId = await getRoomId(gameId);
    if (!roomId) return;
    const player = await pool.query(
      'SELECT u.nickname FROM players p JOIN users u ON p.user_id = u.id WHERE p.id = $1',
      [playerId]
    );
    this.io.to(roomId).emit('action-completed', {
      playerId,
      playerName: player.rows[0]?.nickname || '플레이어',
      actionType,
      result,
    });
  }

  private async applyTraitEffects(client: any, playerStateId: string, effects: Record<string, unknown>) {
    const row = await client.query('SELECT traits FROM player_states WHERE id = $1 FOR UPDATE', [playerStateId]);
    const traits = addEffects(parseJSON<Traits>(row.rows[0].traits, {}), effects);
    await client.query('UPDATE player_states SET traits = $1 WHERE id = $2', [JSON.stringify(traits), playerStateId]);
  }

  private async addMoney(client: any, playerStateId: string, amount: number) {
    await client.query('UPDATE player_states SET money = money + $1 WHERE id = $2', [amount, playerStateId]);
  }

  private async nextPlayer(client: any, gameId: string, turnOrder: number) {
    const result = await client.query(
      `SELECT id, player_id FROM player_states WHERE game_id = $1 AND turn_order <> $2
       ORDER BY (turn_order - $2 + 100) % 100 LIMIT 1`,
      [gameId, turnOrder]
    );
    return result.rows[0] || null;
  }
}

export function describeEffects(effects: Record<string, unknown>): string {
  const labels: Record<string, string> = {
    taste: '맛',
    history: '역사',
    nature: '자연',
    culture: '문화',
    leisure: '레저',
    water: '물놀이',
    memory: '추억',
  };
  return Object.entries(effects)
    .filter(([k, v]) => labels[k] && Number(v))
    .map(([k, v]) => `${labels[k]} +${v}`)
    .join(', ');
}

export const turnService = new TurnService();
