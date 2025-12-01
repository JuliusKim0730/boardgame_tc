import { pool } from '../db/pool';

export class TurnManager {
  private turnLocks: Map<string, string> = new Map(); // gameId -> playerId

  // 턴 잠금 확인
  isCurrentTurn(gameId: string, playerId: string): boolean {
    const lockedPlayer = this.turnLocks.get(gameId);
    return lockedPlayer === playerId;
  }

  // 턴 잠금 설정
  lockTurn(gameId: string, playerId: string): void {
    this.turnLocks.set(gameId, playerId);
  }

  // 턴 잠금 해제
  unlockTurn(gameId: string): void {
    this.turnLocks.delete(gameId);
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

        if (newDay > 14) {
          // 게임 종료
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

        // 7일차 시작 시 결심 토큰 재충전
        if (newDay === 8) {
          await client.query(
            'UPDATE player_states SET resolve_token = 1 WHERE game_id = $1',
            [gameId]
          );
        }

        // 선플레이어 변경 (이전 2번째 플레이어)
        const nextPlayerResult = await client.query(
          `SELECT player_id FROM player_states 
           WHERE game_id = $1 AND turn_order = $2`,
          [gameId, 1] // 2번째 플레이어가 다음 선플레이어
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
