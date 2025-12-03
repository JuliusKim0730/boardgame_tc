import { pool } from '../db/pool';

export class TurnManager {
  private turnLocks: Map<string, string> = new Map(); // gameId -> playerId

  // 서버 시작 시 턴 락 복원
  async restoreTurnLocks(): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT id, current_turn_player_id 
         FROM games 
         WHERE status = 'running' AND current_turn_player_id IS NOT NULL`
      );
      
      result.rows.forEach(row => {
        this.turnLocks.set(row.id, row.current_turn_player_id);
        console.log(`🔄 턴 락 복원: gameId=${row.id}, playerId=${row.current_turn_player_id}`);
      });
      
      console.log(`✅ ${result.rows.length}개 게임의 턴 락 복원 완료`);
    } catch (error) {
      console.error('❌ 턴 락 복원 실패:', error);
    }
  }

  // 턴 잠금 확인
  isCurrentTurn(gameId: string, playerId: string): boolean {
    const lockedPlayer = this.turnLocks.get(gameId);
    return lockedPlayer === playerId;
  }

  // 턴 잠금 설정
  lockTurn(gameId: string, playerId: string): void {
    this.turnLocks.set(gameId, playerId);
    console.log(`🔒 턴 락 설정: gameId=${gameId}, playerId=${playerId}`);
  }

  // 턴 잠금 해제
  unlockTurn(gameId: string): void {
    this.turnLocks.delete(gameId);
    console.log(`🔓 턴 락 해제: gameId=${gameId}`);
  }

  // 턴 시작
  async startTurn(gameId: string, playerId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 턴 레코드 생성
      const gameResult = await client.query(
        'SELECT day FROM games WHERE id = $1',
        [gameId]
      );
      const currentDay = gameResult.rows[0].day;

      const playerStateResult = await client.query(
        'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      const playerStateId = playerStateResult.rows[0].id;

      await client.query(
        'INSERT INTO turns (game_id, day, player_state_id) VALUES ($1, $2, $3)',
        [gameId, currentDay, playerStateId]
      );

      // 게임 상태 업데이트
      await client.query(
        'UPDATE games SET current_turn_player_id = $1 WHERE id = $2',
        [playerId, gameId]
      );

      // 턴 잠금
      this.lockTurn(gameId, playerId);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 턴 종료 및 다음 플레이어로 전환
  async endTurn(gameId: string, playerId: string): Promise<{ nextPlayerId: string | null; isGameEnd: boolean }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 현재 턴 종료
      await client.query(
        `UPDATE turns SET ended_at = NOW() 
         WHERE game_id = $1 AND player_state_id = (
           SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2
         ) AND ended_at IS NULL`,
        [gameId, playerId]
      );

      // 턴 잠금 해제
      this.unlockTurn(gameId);

      // 다음 플레이어 찾기
      const gameResult = await client.query(
        'SELECT day FROM games WHERE id = $1',
        [gameId]
      );
      const currentDay = gameResult.rows[0].day;

      const currentPlayerResult = await client.query(
        'SELECT turn_order FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      const currentTurnOrder = currentPlayerResult.rows[0].turn_order;

      const playersResult = await client.query(
        'SELECT COUNT(*) as count FROM player_states WHERE game_id = $1',
        [gameId]
      );
      const totalPlayers = parseInt(playersResult.rows[0].count);

      const nextTurnOrder = (currentTurnOrder + 1) % totalPlayers;

      // 모든 플레이어가 턴을 마쳤는지 확인
      const turnsResult = await client.query(
        `SELECT COUNT(*) as completed FROM turns 
         WHERE game_id = $1 AND day = $2 AND ended_at IS NOT NULL`,
        [gameId, currentDay]
      );
      const completedTurns = parseInt(turnsResult.rows[0].completed);

      if (completedTurns >= totalPlayers) {
        // 하루 종료, 다음 날로
        const newDay = currentDay + 1;
        
        console.log(`📅 Day ${currentDay} 완료 → Day ${newDay} 시작`);

        if (newDay > 14) {
          // 게임 종료
          console.log('🏁 14일차 완료 - 게임 종료');
          await client.query(
            'UPDATE games SET status = $1, current_turn_player_id = NULL WHERE id = $2',
            ['finalizing', gameId]
          );
          await client.query('COMMIT');
          return { nextPlayerId: null, isGameEnd: true };
        }

        // 다음 날 시작
        await client.query(
          'UPDATE games SET day = $1 WHERE id = $2',
          [newDay, gameId]
        );

        // Day 8 시작 시 결심 토큰 회복 (1-7일차 동안 미사용 시)
        if (newDay === 8) {
          console.log('🔥 Day 8 시작 - 결심 토큰 회복 체크');
          // 1-7일차 동안 결심 토큰 사용하지 않은 플레이어에게 토큰 1개 회복
          await client.query(
            `UPDATE player_states ps
             SET resolve_token = LEAST(resolve_token + 1, 2)
             WHERE game_id = $1
             AND NOT EXISTS (
               SELECT 1 FROM event_logs el
               WHERE el.game_id = $1
               AND el.event_type = 'resolve_token_used'
               AND el.data->>'playerId' = ps.player_id::text
               AND el.created_at < NOW()
             )`,
            [gameId]
          );
        }

        // 턴 순서 재배치 (선플레이어 변경)
        // 현재 0번이 마지막으로 가고, 1번이 0번이 됨
        await client.query(
          `UPDATE player_states 
           SET turn_order = CASE 
             WHEN turn_order = 0 THEN $1 - 1
             ELSE turn_order - 1
           END
           WHERE game_id = $2`,
          [totalPlayers, gameId]
        );
        
        console.log(`🔄 선플레이어 변경: 이전 #2 → 새 #1`);

        // 새로운 선플레이어 (turn_order = 0)
        const nextPlayerResult = await client.query(
          `SELECT player_id FROM player_states 
           WHERE game_id = $1 AND turn_order = 0`,
          [gameId]
        );

        if (nextPlayerResult.rows.length > 0) {
          const nextPlayerId = nextPlayerResult.rows[0].player_id;
          await this.startTurn(gameId, nextPlayerId);
          await client.query('COMMIT');
          return { nextPlayerId, isGameEnd: false };
        }
      } else {
        // 같은 날, 다음 플레이어
        const nextPlayerResult = await client.query(
          `SELECT player_id FROM player_states 
           WHERE game_id = $1 AND turn_order = $2`,
          [gameId, nextTurnOrder]
        );

        if (nextPlayerResult.rows.length > 0) {
          const nextPlayerId = nextPlayerResult.rows[0].player_id;
          await this.startTurn(gameId, nextPlayerId);
          await client.query('COMMIT');
          return { nextPlayerId, isGameEnd: false };
        }
      }

      await client.query('COMMIT');
      return { nextPlayerId: null, isGameEnd: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 턴 검증 미들웨어
  validateTurn(gameId: string, playerId: string): void {
    if (!this.isCurrentTurn(gameId, playerId)) {
      throw new Error('현재 당신의 턴이 아닙니다');
    }
  }
}

export const turnManager = new TurnManager();
