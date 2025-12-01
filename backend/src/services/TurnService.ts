import { pool } from '../db/pool';
import { turnManager } from './TurnManager';

export class TurnService {
  // 결심 토큰 회복 체크 (7일차 시작 시)
  async checkResolveTokenRecovery(gameId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 현재 날짜 확인
      const gameResult = await client.query(
        'SELECT day FROM games WHERE id = $1',
        [gameId]
      );
      const currentDay = gameResult.rows[0].day;
      
      if (currentDay === 7) {
        // 1~6일차 동안 결심 토큰 사용 여부 확인
        const playersResult = await client.query(
          'SELECT id, player_id FROM player_states WHERE game_id = $1',
          [gameId]
        );
        
        for (const player of playersResult.rows) {
          const usageResult = await client.query(
            `SELECT COUNT(*) as count FROM event_logs 
             WHERE game_id = $1 
             AND event_type = 'resolve_token_used' 
             AND data->>\'playerId\' = $2`,
            [gameId, player.player_id]
          );
          
          const usageCount = parseInt(usageResult.rows[0].count);
          
          // 1~6일차 동안 미사용 시 토큰 1개 회복 (최대 2개)
          if (usageCount === 0) {
            await client.query(
              `UPDATE player_states 
               SET resolve_token = LEAST(resolve_token + 1, 2) 
               WHERE id = $1`,
              [player.id]
            );
          }
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  // 이동 처리
  async move(gameId: string, playerId: string, targetPosition: number): Promise<void> {
    // Turn Lock 검증
    turnManager.validateTurn(gameId, playerId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 플레이어 상태 조회
      const stateResult = await client.query(
        'SELECT position, last_position FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      
      const currentPosition = stateResult.rows[0].position;
      const lastPosition = stateResult.rows[0].last_position;
      
      // 연속 사용 금지 검증
      if (targetPosition === lastPosition) {
        throw new Error('같은 칸을 연속으로 사용할 수 없습니다');
      }
      
      // 인접 칸 검증
      const adjacentPositions = this.getAdjacentPositions(currentPosition);
      if (!adjacentPositions.includes(targetPosition)) {
        throw new Error('인접한 칸으로만 이동할 수 있습니다');
      }
      
      // 위치 업데이트
      await client.query(
        'UPDATE player_states SET position = $1, last_position = $2 WHERE game_id = $3 AND player_id = $4',
        [targetPosition, currentPosition, gameId, playerId]
      );
      
      // 이벤트 로그
      await client.query(
        'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
        [gameId, 'move', JSON.stringify({ playerId, from: currentPosition, to: targetPosition })]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 행동 처리 (1~6번)
  async performAction(gameId: string, playerId: string, actionType: number): Promise<any> {
    // Turn Lock 검증
    turnManager.validateTurn(gameId, playerId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const stateResult = await client.query(
        'SELECT * FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      const playerState = stateResult.rows[0];
      
      // 2인 플레이 여부 확인
      const playerCountResult = await client.query(
        'SELECT COUNT(*) as count FROM player_states WHERE game_id = $1',
        [gameId]
      );
      const playerCount = parseInt(playerCountResult.rows[0].count);
      const is2Player = playerCount === 2;

      let result;
      switch (actionType) {
        case 1: // 무료 계획
          result = await this.drawCard(client, gameId, playerState.id, 'freeplan');
          break;
        case 2: // 조사하기
          result = await this.drawCard(client, gameId, playerState.id, 'plan');
          break;
        case 3: // 집안일 (1,500~2,000TC)
          result = await this.drawCard(client, gameId, playerState.id, 'house');
          await this.applyMoneyEffect(client, playerState.id, result.card.effects.money || 0);
          
          // 2인 전용: 첫 방문 시 +500TC
          if (is2Player) {
            const firstVisitResult = await client.query(
              'SELECT COUNT(*) as count FROM event_logs WHERE game_id = $1 AND event_type = $2 AND data->>\'playerId\' = $3',
              [gameId, 'action_house', playerId]
            );
            if (parseInt(firstVisitResult.rows[0].count) === 0) {
              await this.applyMoneyEffect(client, playerState.id, 500);
            }
          }
          break;
        case 4: // 여행 지원 (구 투자)
          result = await this.drawCard(client, gameId, playerState.id, 'support');
          await this.applyMoneyEffect(client, playerState.id, result.card.effects.money || 0);
          break;
        case 5: // 찬스
          // 2인 전용: 찬스 카드 OR 500TC 선택
          if (is2Player) {
            // 선택은 프론트엔드에서 처리, 여기서는 기본 로직만
            result = await this.drawCard(client, gameId, playerState.id, 'chance');
          } else {
            result = await this.drawCard(client, gameId, playerState.id, 'chance');
          }
          // 찬스 카드는 별도 처리 필요
          break;
        case 6: // 자유 행동
          if (!playerState.resolve_token) {
            throw new Error('결심 토큰이 없습니다');
          }
          // 결심 토큰 사용은 별도 처리
          break;
      }
      
      // 행동 로그 기록
      await client.query(
        'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
        [gameId, `action_${actionType}`, JSON.stringify({ playerId, actionType })]
      );
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async drawCard(client: any, gameId: string, playerStateId: string, deckType: string) {
    // 덱에서 카드 드로우
    const deckResult = await client.query(
      'SELECT card_order FROM decks WHERE game_id = $1 AND type = $2',
      [gameId, deckType]
    );
    
    const cardOrder = JSON.parse(deckResult.rows[0].card_order);
    if (cardOrder.length === 0) {
      throw new Error('덱에 카드가 없습니다');
    }
    
    const cardId = cardOrder.shift();
    
    // 덱 업데이트
    await client.query(
      'UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3',
      [JSON.stringify(cardOrder), gameId, deckType]
    );
    
    // 카드 정보 조회
    const cardResult = await client.query('SELECT * FROM cards WHERE id = $1', [cardId]);
    const card = cardResult.rows[0];
    
    // 손패에 추가 (집안일/투자/찬스는 즉시 사용)
    if (['plan', 'freeplan'].includes(deckType)) {
      const seqResult = await client.query(
        'SELECT COALESCE(MAX(seq), -1) + 1 as next_seq FROM hands WHERE player_state_id = $1',
        [playerStateId]
      );
      
      await client.query(
        'INSERT INTO hands (player_state_id, card_id, seq) VALUES ($1, $2, $3)',
        [playerStateId, cardId, seqResult.rows[0].next_seq]
      );
    }
    
    return { card };
  }

  private async applyMoneyEffect(client: any, playerStateId: string, amount: number) {
    await client.query(
      'UPDATE player_states SET money = money + $1 WHERE id = $2',
      [amount, playerStateId]
    );
  }

  private getAdjacentPositions(position: number): number[] {
    const adjacency: { [key: number]: number[] } = {
      1: [2],
      2: [1, 3, 4],
      3: [2, 5],
      4: [2, 6],
      5: [3, 6],
      6: [4, 5]
    };
    return adjacency[position] || [];
  }

  // 결심 토큰 사용 (추가 행동)
  async useResolveToken(gameId: string, playerId: string, actionType: number): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const stateResult = await client.query(
        'SELECT id, resolve_token, last_position FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      
      const playerState = stateResult.rows[0];
      
      if (playerState.resolve_token <= 0) {
        throw new Error('결심 토큰이 부족합니다');
      }
      
      // 직전 행동 칸 반복 불가 검증
      if (actionType === playerState.last_position) {
        throw new Error('직전에 행동한 칸은 반복할 수 없습니다');
      }
      
      // 토큰 차감
      await client.query(
        'UPDATE player_states SET resolve_token = resolve_token - 1 WHERE id = $1',
        [playerState.id]
      );
      
      // 사용 로그 기록
      const gameResult = await client.query('SELECT day FROM games WHERE id = $1', [gameId]);
      const currentDay = gameResult.rows[0].day;
      
      await client.query(
        'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
        [gameId, 'resolve_token_used', JSON.stringify({ playerId, day: currentDay })]
      );
      
      await client.query('COMMIT');
      
      return { success: true, remainingTokens: playerState.resolve_token - 1 };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 2인 전용 찬스 칸 500TC 지급
  async applyMoneyBonus(gameId: string, playerId: string, amount: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const stateResult = await client.query(
        'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      
      await client.query(
        'UPDATE player_states SET money = money + $1 WHERE id = $2',
        [amount, stateResult.rows[0].id]
      );
      
      await client.query(
        'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
        [gameId, 'chance_money_bonus', JSON.stringify({ playerId, amount })]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 찬스 카드 드로우
  async drawChanceCard(gameId: string, playerId: string): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const result = await this.drawCard(client, gameId, playerId, 'chance');
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 현재 게임 날짜 조회
  async getCurrentDay(gameId: string): Promise<number> {
    const result = await pool.query('SELECT day FROM games WHERE id = $1', [gameId]);
    return result.rows[0]?.day || 1;
  }
}
