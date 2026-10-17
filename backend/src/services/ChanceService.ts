import { pool } from '../db/pool';
import { Server } from 'socket.io';
import { drawCard, returnToDeckBottom } from './DeckService';
import { addEffects, MAX_RESOLVE_TOKENS, parseJSON, Traits } from '../game/rules';
import {
  getPlayerCount,
  getPlayerState,
  getRoomId,
  grantExtraCredit,
  isAIPlayer,
  logEvent,
  withTransaction,
} from './TurnState';

/** 요청자가 직접 골라야 하는 찬스 카드 */
export type ChoiceType = 'shared_house' | 'shared_invest' | 'purchase_request' | 'card_exchange' | 'swap_position' | 'buddy_action';

export interface ChanceChoice {
  targetId?: string;
  cardId?: string; // CH10: 사 올 상대 카드
  requesterCardId?: string; // CH11: 내가 줄 카드
  targetCardId?: string; // CH11: 받아 올 카드
}

interface PendingInteraction {
  gameId: string;
  requesterId: string;
  type: ChoiceType;
  timeout: NodeJS.Timeout;
  resolve: (choice: ChanceChoice | null) => void;
}

const CHOICE_TIMEOUT_MS = 60000;

const CHOICE_MESSAGES: Record<ChoiceType, string> = {
  shared_house: '함께 집안일을 할 플레이어를 선택하세요',
  shared_invest: '여행 지원 효과를 함께 받을 플레이어를 선택하세요',
  purchase_request: '1,000TC에 사 올 상대의 계획 카드를 선택하세요',
  card_exchange: '교환할 플레이어와 카드를 선택하세요',
  swap_position: '위치를 교환할 플레이어를 선택하세요',
  buddy_action: '동행 버디로 지목할 플레이어를 선택하세요',
};

export class ChanceService {
  private pendingInteractions = new Map<string, PendingInteraction>();
  // CH16/CH17처럼 같은 턴 안에 후속 선택이 필요한 카드
  private pendingDiscard = new Map<string, string>(); // gameId -> playerId
  private pendingJointChoice = new Map<string, { playerId: string; options: string[] }>();
  private io: Server | null = null;

  setSocketIO(io: Server) {
    this.io = io;
  }

  /** 찬스 카드 효과 실행 (TurnService가 카드를 뽑은 직후 호출) */
  async executeCard(gameId: string, playerId: string, card: any): Promise<any> {
    const metadata = parseJSON<any>(card.metadata, {});
    const effects = parseJSON<any>(card.effects, {});

    if (metadata.forbidden_2p && (await getPlayerCount(pool, gameId)) === 2) {
      return { type: 'skipped', message: '2인 플레이에서는 효과가 없는 카드입니다' };
    }

    const result = await this.dispatch(gameId, playerId, card.code, metadata, effects);
    await logEvent(pool, gameId, 'chance_resolved', { playerId, code: card.code, message: result.message });
    return { ...result, chanceCode: card.code };
  }

  private async dispatch(gameId: string, playerId: string, code: string, metadata: any, effects: any): Promise<any> {
    switch (metadata.type) {
      case 'money': {
        const amount = Number(effects.money || 0);
        await withTransaction((c) => this.addMoney(c, gameId, playerId, amount));
        return { type: 'money', amount, message: `${amount >= 0 ? '+' : ''}${amount.toLocaleString()}TC` };
      }
      case 'interaction':
        return this.handleInteraction(gameId, playerId, metadata.action);
      case 'draw':
        if (metadata.action === 'draw_plan') return this.drawPlans(gameId, [playerId], 'CH15');
        return this.catchupPlan(gameId);
      case 'special':
        return this.handleSpecial(gameId, playerId, metadata.action);
      case 'catchup':
        return this.handleCatchup(gameId, playerId, metadata.action);
      default:
        return { type: 'unknown', message: `알 수 없는 찬스 카드입니다 (${code})` };
    }
  }

  // ---------------------------------------------------------------------------
  // 상호작용 카드 (CH8~CH13)
  // ---------------------------------------------------------------------------

  private async handleInteraction(gameId: string, requesterId: string, action: string): Promise<any> {
    if (action === 'summon_all') return this.summonAll(gameId, requesterId);

    const type = action as ChoiceType;
    const choice = await this.getChoice(gameId, requesterId, type);
    if (!choice?.targetId) return { type: 'interaction', action, message: '대상을 선택하지 않아 효과가 사라졌습니다' };

    switch (type) {
      case 'shared_house':
        return this.sharedHouse(gameId, requesterId, choice.targetId);
      case 'shared_invest':
        return this.sharedInvest(gameId, requesterId, choice.targetId);
      case 'purchase_request':
        return this.purchaseRequest(gameId, requesterId, choice);
      case 'card_exchange':
        return this.cardExchange(gameId, requesterId, choice);
      case 'swap_position':
        return this.swapPosition(gameId, requesterId, choice.targetId);
      default:
        return { type: 'interaction', action, message: '' };
    }
  }

  /**
   * 요청자의 선택을 받는다. AI는 즉시 AI 정책으로 결정하고,
   * 사람은 소켓으로 선택 창을 띄운 뒤 응답(최대 60초)을 기다린다. 시간 초과 시 자동 선택.
   */
  private async getChoice(gameId: string, requesterId: string, type: ChoiceType): Promise<ChanceChoice | null> {
    const { aiPlayerService } = await import('./AIPlayerService');
    if (await isAIPlayer(pool, requesterId)) {
      return aiPlayerService.chooseForChance(gameId, requesterId, type);
    }

    const roomId = await getRoomId(gameId);
    const interactionId = `${gameId}-${type}-${Date.now()}`;
    const choice = await new Promise<ChanceChoice | null>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingInteractions.delete(interactionId);
        resolve(null);
      }, CHOICE_TIMEOUT_MS);
      this.pendingInteractions.set(interactionId, { gameId, requesterId, type, timeout, resolve });
      this.io?.to(roomId || gameId).emit('chance-request', {
        interactionId,
        type,
        requesterId,
        timeoutMs: CHOICE_TIMEOUT_MS,
        message: CHOICE_MESSAGES[type],
      });
    });

    if (roomId) this.io?.to(roomId).emit('chance-resolved', { interactionId, type, requesterId });
    if (choice && (choice as any).accepted !== false && choice.targetId) return choice;
    // 시간 초과 또는 취소: 효과가 낭비되지 않도록 자동 선택
    return aiPlayerService.chooseForChance(gameId, requesterId, type);
  }

  /** 프런트엔드 선택 응답 */
  async respondToInteraction(interactionId: string, response: ChanceChoice & { accepted?: boolean }): Promise<void> {
    const pending = this.pendingInteractions.get(interactionId);
    if (!pending) throw new Error('상호작용을 찾을 수 없습니다 (시간 초과)');
    clearTimeout(pending.timeout);
    this.pendingInteractions.delete(interactionId);
    pending.resolve(response);
  }

  private async sharedHouse(gameId: string, requesterId: string, targetId: string) {
    return withTransaction(async (client) => {
      const gains: string[] = [];
      for (const pid of [requesterId, targetId]) {
        const card = await drawCard(client, gameId, 'house');
        if (!card) continue;
        const money = Number(card.effects.money || 0);
        await this.addMoney(client, gameId, pid, money);
        gains.push(`${await this.nickname(client, pid)} "${card.name}" +${money.toLocaleString()}TC`);
      }
      return { type: 'interaction', action: 'shared_house', targetId, message: `함께 집안일! ${gains.join(', ')}` };
    });
  }

  private async sharedInvest(gameId: string, requesterId: string, targetId: string) {
    return withTransaction(async (client) => {
      const card = await drawCard(client, gameId, 'support');
      if (!card) return { type: 'interaction', action: 'shared_invest', message: '여행 지원 카드가 소진되었습니다' };
      const money = Number(card.effects.money || 0);
      await this.addMoney(client, gameId, requesterId, money);
      await this.addMoney(client, gameId, targetId, money);
      const target = await this.nickname(client, targetId);
      return {
        type: 'interaction',
        action: 'shared_invest',
        targetId,
        supportCard: card,
        message: `"${card.name}" 효과를 ${target}님과 함께 받음 (각 ${money >= 0 ? '+' : ''}${money.toLocaleString()}TC)`,
      };
    });
  }

  private async purchaseRequest(gameId: string, requesterId: string, choice: ChanceChoice) {
    return withTransaction(async (client) => {
      const buyer = await getPlayerState(client, gameId, requesterId);
      const seller = await getPlayerState(client, gameId, choice.targetId!);
      if (buyer.money < 1000) return { type: 'interaction', action: 'purchase_request', message: 'TC가 부족해 구매하지 못했습니다' };
      const hand = await client.query(
        `SELECT h.id, c.name FROM hands h JOIN cards c ON c.id = h.card_id
          WHERE h.player_state_id = $1 AND c.type = 'plan' AND ($2::uuid IS NULL OR h.card_id = $2::uuid)
          ORDER BY h.seq LIMIT 1`,
        [seller.id, choice.cardId || null]
      );
      if (hand.rows.length === 0) return { type: 'interaction', action: 'purchase_request', message: '상대에게 계획 카드가 없습니다' };
      await client.query('UPDATE player_states SET money = money - 1000 WHERE id = $1', [buyer.id]);
      await client.query('UPDATE player_states SET money = money + 1000 WHERE id = $1', [seller.id]);
      await client.query(
        'UPDATE hands SET player_state_id = $1, seq = (SELECT COALESCE(MAX(seq), -1) + 1 FROM hands WHERE player_state_id = $1) WHERE id = $2',
        [buyer.id, hand.rows[0].id]
      );
      const target = await this.nickname(client, choice.targetId!);
      return {
        type: 'interaction',
        action: 'purchase_request',
        targetId: choice.targetId,
        message: `${target}님의 "${hand.rows[0].name}"을(를) 1,000TC에 구매`,
      };
    });
  }

  private async cardExchange(gameId: string, requesterId: string, choice: ChanceChoice) {
    return withTransaction(async (client) => {
      const me = await getPlayerState(client, gameId, requesterId);
      const other = await getPlayerState(client, gameId, choice.targetId!);
      const pick = async (stateId: string, cardId?: string) =>
        (
          await client.query(
            `SELECT h.id, c.name FROM hands h JOIN cards c ON c.id = h.card_id
              WHERE h.player_state_id = $1 AND c.type = 'plan' AND ($2::uuid IS NULL OR h.card_id = $2::uuid)
              ORDER BY h.seq LIMIT 1`,
            [stateId, cardId || null]
          )
        ).rows[0];
      const mine = await pick(me.id, choice.requesterCardId);
      const theirs = await pick(other.id, choice.targetCardId);
      if (!mine || !theirs) return { type: 'interaction', action: 'card_exchange', message: '교환할 계획 카드가 없습니다' };
      await client.query('UPDATE hands SET player_state_id = $1 WHERE id = $2', [other.id, mine.id]);
      await client.query('UPDATE hands SET player_state_id = $1 WHERE id = $2', [me.id, theirs.id]);
      const target = await this.nickname(client, choice.targetId!);
      return {
        type: 'interaction',
        action: 'card_exchange',
        targetId: choice.targetId,
        message: `${target}님과 "${mine.name}" ↔ "${theirs.name}" 교환`,
      };
    });
  }

  /** CH12: 모든 플레이어를 내 칸으로. 이번 라운드 아직 행동 전인 플레이어는 그 칸에서 바로 행동 */
  private async summonAll(gameId: string, requesterId: string) {
    const position = await withTransaction(async (client) => {
      const me = await getPlayerState(client, gameId, requesterId);
      await client.query(
        `UPDATE player_states SET position = $1, forced_move = (turn_order > $2)
          WHERE game_id = $3 AND player_id <> $4`,
        [me.position, me.turn_order, gameId, requesterId]
      );
      return me.position;
    });
    const roomId = await getRoomId(gameId);
    if (roomId) this.io?.to(roomId).emit('all-summoned', { playerId: requesterId, position });
    return { type: 'interaction', action: 'summon_all', position, message: `모든 플레이어가 ${position}번 칸으로 이동했습니다` };
  }

  /** CH13: 위치 교환. 이미 행동한 요청자는 추가 행동 없음(룰북 6.2) */
  private async swapPosition(gameId: string, requesterId: string, targetId: string) {
    return withTransaction(async (client) => {
      const me = await getPlayerState(client, gameId, requesterId);
      const other = await getPlayerState(client, gameId, targetId);
      await client.query('UPDATE player_states SET position = $1 WHERE id = $2', [other.position, me.id]);
      await client.query('UPDATE player_states SET position = $1, forced_move = $2 WHERE id = $3', [
        me.position,
        other.turn_order > me.turn_order,
        other.id,
      ]);
      const target = await this.nickname(client, targetId);
      return {
        type: 'interaction',
        action: 'swap_position',
        targetId,
        message: `${target}님과 자리 교환 (${me.position}번 ↔ ${other.position}번)`,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // 드로우 / 특수 / 캐치업
  // ---------------------------------------------------------------------------

  private async handleSpecial(gameId: string, playerId: string, action: string): Promise<any> {
    switch (action) {
      case 'extra_action':
        await withTransaction((c) => grantExtraCredit(c, gameId, playerId, { source: 'CH18' }));
        return { type: 'special', action: 'extra_action', message: '이동 없이 행동 1회를 추가로 수행할 수 있습니다' };

      case 'repeat_current': {
        const position = await withTransaction(async (c) => {
          const me = await getPlayerState(c, gameId, playerId);
          await grantExtraCredit(c, gameId, playerId, {
            source: 'CH19',
            allowRepeat: true,
            fixedAction: me.position === 6 ? undefined : me.position,
          });
          return me.position;
        });
        return {
          type: 'special',
          action: 'repeat_current',
          position,
          message: `현재 칸(${position}번) 행동을 1회 더 수행할 수 있습니다`,
        };
      }

      case 'joint_plan_support':
        // CH20: 공동 목표에 3,000TC가 지원된다 (본인 TC 차감 없음, 본인 기여로 집계)
        await withTransaction(async (c) => {
          const me = await getPlayerState(c, gameId, playerId);
          await c.query('INSERT INTO joint_plan_contributions (game_id, player_state_id, amount) VALUES ($1, $2, 3000)', [
            gameId,
            me.id,
          ]);
        });
        return { type: 'special', action: 'joint_plan_support', amount: 3000, message: '공동 목표에 3,000TC 지원!' };

      case 'draw_discarded':
        return this.startDiscardAndDraw(gameId, playerId);

      case 'select_joint_plan':
        return this.startJointPlanChoice(gameId, playerId);

      default:
        return { type: 'special', action, message: '' };
    }
  }

  private async handleCatchup(gameId: string, playerId: string, action: string): Promise<any> {
    switch (action) {
      case 'catchup_money':
        return withTransaction(async (c) => {
          const lowest = await this.lowestBy(c, gameId, 'money');
          for (const p of lowest) await this.addMoney(c, gameId, p.player_id, 2000);
          return {
            type: 'catchup',
            action: 'catchup_money',
            targetPlayerIds: lowest.map((p) => p.player_id),
            message: `TC가 가장 적은 ${await this.names(c, lowest)} +2,000TC`,
          };
        });
      case 'catchup_plan':
        return this.catchupPlan(gameId);
      case 'catchup_memory':
        return withTransaction(async (c) => {
          const lowest = await this.lowestBy(c, gameId, 'memory');
          for (const p of lowest) await this.addTraits(c, p.id, { memory: 2 });
          return {
            type: 'catchup',
            action: 'catchup_memory',
            targetPlayerIds: lowest.map((p) => p.player_id),
            message: `추억이 가장 낮은 ${await this.names(c, lowest)} 추억 +2`,
          };
        });
      case 'buddy_action': {
        // CH25: 본인 추가 행동 1회 + 지목한 1명은 결심 토큰 1개(다음 자기 턴에 행동 1회)
        const choice = await this.getChoice(gameId, playerId, 'buddy_action');
        const message = await withTransaction(async (c) => {
          await grantExtraCredit(c, gameId, playerId, { source: 'CH25' });
          if (!choice?.targetId) return '추가 행동 1회';
          await c.query(
            'UPDATE player_states SET resolve_token = LEAST($1, resolve_token + 1) WHERE game_id = $2 AND player_id = $3',
            [MAX_RESOLVE_TOKENS, gameId, choice.targetId]
          );
          return `추가 행동 1회 + ${await this.nickname(c, choice.targetId)}님 결심 토큰 +1`;
        });
        return { type: 'catchup', action: 'buddy_action', targetId: choice?.targetId, message };
      }
      default:
        return { type: 'catchup', action, message: '' };
    }
  }

  /** CH14/CH22: 일반 계획 카드가 가장 적은 플레이어(동률 전원)에게 1장 */
  private async catchupPlan(gameId: string) {
    const counts = await pool.query(
      `SELECT ps.player_id, COUNT(c.id)::int AS n
         FROM player_states ps
         LEFT JOIN hands h ON h.player_state_id = ps.id
         LEFT JOIN cards c ON c.id = h.card_id AND c.type = 'plan'
        WHERE ps.game_id = $1
        GROUP BY ps.player_id`,
      [gameId]
    );
    const min = Math.min(...counts.rows.map((r: any) => r.n));
    const targets = counts.rows.filter((r: any) => r.n === min).map((r: any) => r.player_id);
    return this.drawPlans(gameId, targets, 'catchup');
  }

  private async drawPlans(gameId: string, playerIds: string[], reason: string) {
    return withTransaction(async (client) => {
      const got: string[] = [];
      for (const pid of playerIds) {
        const card = await this.drawPlanInto(client, gameId, pid);
        if (card) got.push(`${await this.nickname(client, pid)} "${card.name}"`);
      }
      return {
        type: 'draw',
        action: reason === 'CH15' ? 'draw_plan' : 'catchup_plan',
        message: got.length ? `계획 카드 획득: ${got.join(', ')}` : '더 이상 뽑을 계획 카드가 없습니다',
      };
    });
  }

  private async drawPlanInto(client: any, gameId: string, playerId: string) {
    const state = await getPlayerState(client, gameId, playerId);
    const card = await drawCard(client, gameId, 'plan');
    if (!card) return null;
    await client.query(
      'INSERT INTO hands (player_state_id, card_id, seq) VALUES ($1, $2, (SELECT COALESCE(MAX(seq), -1) + 1 FROM hands WHERE player_state_id = $1))',
      [state.id, card.id]
    );
    return card;
  }

  // CH16: 버린만큼 뽑기 ---------------------------------------------------------

  private async startDiscardAndDraw(gameId: string, playerId: string) {
    const state = await getPlayerState(pool, gameId, playerId);
    const hand = await pool.query(
      `SELECT h.id AS hand_id, h.card_id, c.id, c.name, c.code, c.cost, c.effects, c.type
         FROM hands h JOIN cards c ON c.id = h.card_id
        WHERE h.player_state_id = $1 AND c.type = 'plan' ORDER BY h.seq`,
      [state.id]
    );
    if (hand.rows.length === 0) {
      return { type: 'special', action: 'select_discard', requiresSelection: false, message: '버릴 계획 카드가 없습니다' };
    }
    this.pendingDiscard.set(gameId, playerId);
    if (await isAIPlayer(pool, playerId)) {
      const { aiPlayerService } = await import('./AIPlayerService');
      const cardIds = await aiPlayerService.chooseDiscards(gameId, playerId);
      return { type: 'special', action: 'draw_discarded', ...(await this.executeDiscardAndDraw(gameId, playerId, cardIds)) };
    }
    return {
      type: 'special',
      action: 'select_discard',
      requiresSelection: true,
      handCards: hand.rows,
      message: '버릴 계획 카드를 고르세요. 버린 수만큼 새로 뽑습니다',
    };
  }

  async executeDiscardAndDraw(gameId: string, playerId: string, cardIds: string[]): Promise<any> {
    if (this.pendingDiscard.get(gameId) !== playerId) throw new Error('버린만큼 뽑기 효과가 없습니다');
    this.pendingDiscard.delete(gameId);

    return withTransaction(async (client) => {
      const state = await getPlayerState(client, gameId, playerId);
      let discarded = 0;
      for (const cardId of cardIds) {
        const removed = await client.query(
          'DELETE FROM hands WHERE player_state_id = $1 AND card_id = $2 RETURNING id',
          [state.id, cardId]
        );
        if (removed.rows.length === 0) continue;
        discarded++;
      }
      const drawn: string[] = [];
      for (let i = 0; i < discarded; i++) {
        const card = await this.drawPlanInto(client, gameId, playerId);
        if (card) drawn.push(card.name);
      }
      return {
        discardedCount: discarded,
        drawnCount: drawn.length,
        message: `${discarded}장을 버리고 ${drawn.length}장을 새로 뽑았습니다${drawn.length ? `: ${drawn.join(', ')}` : ''}`,
      };
    });
  }

  // CH17: 여행 팜플렛 -----------------------------------------------------------

  private async startJointPlanChoice(gameId: string, playerId: string) {
    const { current, drawn } = await withTransaction(async (client) => {
      const game = await client.query('SELECT joint_plan_card_id FROM games WHERE id = $1', [gameId]);
      const card = await drawCard(client, gameId, 'joint');
      return { current: game.rows[0].joint_plan_card_id as string, drawn: card };
    });
    if (!drawn) {
      return { type: 'special', action: 'select_joint_plan', requiresSelection: false, message: '더 볼 공동 목표 카드가 없습니다' };
    }

    const options = [current, drawn.id];
    this.pendingJointChoice.set(gameId, { playerId, options });
    if (await isAIPlayer(pool, playerId)) {
      const { aiPlayerService } = await import('./AIPlayerService');
      const pick = await aiPlayerService.chooseJointPlan(gameId, playerId, options);
      const selected = await this.selectJointPlan(gameId, playerId, pick);
      return { type: 'special', action: 'joint_plan_selected', message: `공동 목표: "${selected.name}"` };
    }
    const cards = await pool.query('SELECT id, code, name, cost, effects, metadata FROM cards WHERE id = ANY($1)', [options]);
    return {
      type: 'special',
      action: 'select_joint_plan',
      requiresSelection: true,
      options: cards.rows,
      message: '공동 목표 카드를 1장 더 봤습니다. 둘 중 하나를 고르세요',
    };
  }

  async selectJointPlan(gameId: string, playerId: string | undefined, cardId: string): Promise<any> {
    const pending = this.pendingJointChoice.get(gameId);
    if (!pending || (playerId && pending.playerId !== playerId)) throw new Error('공동 목표를 고를 수 있는 상태가 아닙니다');
    if (!pending.options.includes(cardId)) throw new Error('보여준 두 장 중에서만 고를 수 있습니다');
    this.pendingJointChoice.delete(gameId);

    const card = await withTransaction(async (client) => {
      await client.query('UPDATE games SET joint_plan_card_id = $1 WHERE id = $2', [cardId, gameId]);
      const other = pending.options.filter((id) => id !== cardId);
      await returnToDeckBottom(client, gameId, 'joint', other);
      return (await client.query('SELECT * FROM cards WHERE id = $1', [cardId])).rows[0];
    });
    const roomId = await getRoomId(gameId);
    if (roomId) this.io?.to(roomId).emit('joint-plan-selected', { gameId, card });
    return card;
  }

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------

  private async addMoney(client: any, gameId: string, playerId: string, amount: number) {
    await client.query('UPDATE player_states SET money = money + $1 WHERE game_id = $2 AND player_id = $3', [
      amount,
      gameId,
      playerId,
    ]);
  }

  private async addTraits(client: any, playerStateId: string, effects: Record<string, number>) {
    const row = await client.query('SELECT traits FROM player_states WHERE id = $1 FOR UPDATE', [playerStateId]);
    const traits = addEffects(parseJSON<Traits>(row.rows[0].traits, {}), effects);
    await client.query('UPDATE player_states SET traits = $1 WHERE id = $2', [JSON.stringify(traits), playerStateId]);
  }

  private async lowestBy(client: any, gameId: string, key: 'money' | 'memory') {
    const expr = key === 'money' ? 'money' : `COALESCE((traits->>'memory')::int, 0)`;
    const result = await client.query(`SELECT id, player_id, ${expr} AS v FROM player_states WHERE game_id = $1`, [
      gameId,
    ]);
    const min = Math.min(...result.rows.map((r: any) => Number(r.v)));
    return result.rows.filter((r: any) => Number(r.v) === min) as Array<{ id: string; player_id: string }>;
  }

  private async nickname(client: any, playerId: string): Promise<string> {
    const r = await client.query('SELECT u.nickname FROM players p JOIN users u ON u.id = p.user_id WHERE p.id = $1', [
      playerId,
    ]);
    return r.rows[0]?.nickname || '플레이어';
  }

  private async names(client: any, players: Array<{ player_id: string }>): Promise<string> {
    const names = [];
    for (const p of players) names.push(await this.nickname(client, p.player_id));
    return names.join(', ');
  }
}

export const chanceService = new ChanceService();
