import { pool } from '../db/pool';
import { Server } from 'socket.io';
import { MAX_RESOLVE_TOKENS, RESOLVE_RECOVERY_DAY, TOTAL_DAYS } from '../game/rules';
import { getPlayerState, getTurnInfo, logEvent } from './TurnState';

export class TurnManager {
  private turnLocks: Map<string, string> = new Map(); // gameId -> playerId
  private io: Server | null = null;

  setSocketIO(io: Server) {
    this.io = io;
  }

  /**
   * 서버 재시작(Render 무료 플랜 슬립 등) 후에도 진행 중인 게임을 이어갈 수 있도록
   * DB의 current_turn_player_id로 턴 락을 복원한다.
   */
  async restoreTurnLocks(): Promise<void> {
    const result = await pool.query(
      `SELECT id, current_turn_player_id FROM games WHERE status = 'running' AND current_turn_player_id IS NOT NULL`
    );
    for (const row of result.rows) {
      this.turnLocks.set(row.id, row.current_turn_player_id);
    }
    if (result.rows.length > 0) console.log(`🔐 턴 락 복원: ${result.rows.length}개 게임`);
  }

  isCurrentTurn(gameId: string, playerId: string): boolean {
    return this.turnLocks.get(gameId) === playerId;
  }

  lockTurn(gameId: string, playerId: string): void {
    this.turnLocks.set(gameId, playerId);
  }

  unlockTurn(gameId: string): void {
    this.turnLocks.delete(gameId);
  }

  validateTurn(gameId: string, playerId: string): void {
    if (!this.isCurrentTurn(gameId, playerId)) {
      throw new Error('현재 당신의 턴이 아닙니다');
    }
  }

  // 턴 시작 (기존 트랜잭션 사용)
  private async startTurnInternal(client: any, gameId: string, playerId: string): Promise<void> {
    const game = await client.query('SELECT day FROM games WHERE id = $1', [gameId]);
    const state = await getPlayerState(client, gameId, playerId);
    await client.query('INSERT INTO turns (game_id, day, player_state_id, started_at) VALUES ($1, $2, $3, clock_timestamp())', [
      gameId,
      game.rows[0].day,
      state.id,
    ]);
    await client.query('UPDATE games SET current_turn_player_id = $1 WHERE id = $2', [playerId, gameId]);
  }

  /**
   * 턴 종료 → 다음 플레이어(시계 방향) 또는 다음 날 / 최종 결산으로 전환
   */
  async endTurn(gameId: string, playerId: string): Promise<{ nextPlayerId: string | null; isGameEnd: boolean; isAI: boolean }> {
    this.validateTurn(gameId, playerId);

    const client = await pool.connect();
    let outcome: { nextPlayerId: string | null; isGameEnd: boolean; isAI: boolean; day: number; recovered: string[] };
    let roomId: string;
    try {
      await client.query('BEGIN');
      const game = await client.query('SELECT day, room_id, status FROM games WHERE id = $1 FOR UPDATE', [gameId]);
      if (game.rows[0]?.status !== 'running') throw new Error('진행 중인 게임이 아닙니다');
      roomId = game.rows[0].room_id;
      const currentDay: number = game.rows[0].day;

      const state = await getPlayerState(client, gameId, playerId);
      const info = await getTurnInfo(client, state.id);
      if (!info.mainDone) throw new Error('이동과 행동을 마친 뒤 턴을 종료할 수 있습니다');

      await client.query('UPDATE turns SET ended_at = clock_timestamp() WHERE id = $1', [info.turnId]);

      const players = await client.query(
        `SELECT ps.player_id, ps.turn_order, p.is_ai FROM player_states ps
           JOIN players p ON p.id = ps.player_id
          WHERE ps.game_id = $1 ORDER BY ps.turn_order`,
        [gameId]
      );
      const total = players.rows.length;
      const nextIndex = state.turn_order + 1;
      let recovered: string[] = [];

      if (nextIndex < total) {
        const next = players.rows[nextIndex];
        await this.startTurnInternal(client, gameId, next.player_id);
        outcome = { nextPlayerId: next.player_id, isGameEnd: false, isAI: !!next.is_ai, day: currentDay, recovered };
      } else if (currentDay >= TOTAL_DAYS) {
        // 14일차 종료 → 최종 결산
        await client.query(`UPDATE games SET status = 'finalizing', current_turn_player_id = NULL WHERE id = $1`, [gameId]);
        await logEvent(client, gameId, 'days_completed', { day: currentDay });
        outcome = { nextPlayerId: null, isGameEnd: true, isAI: false, day: currentDay, recovered };
      } else {
        const newDay = currentDay + 1;
        await client.query('UPDATE games SET day = $1 WHERE id = $2', [newDay, gameId]);
        if (newDay === RESOLVE_RECOVERY_DAY) {
          recovered = await this.recoverResolveTokens(client, gameId);
        }
        const first = players.rows[0];
        await this.startTurnInternal(client, gameId, first.player_id);
        outcome = { nextPlayerId: first.player_id, isGameEnd: false, isAI: !!first.is_ai, day: newDay, recovered };
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    if (outcome.nextPlayerId) this.lockTurn(gameId, outcome.nextPlayerId);
    else this.unlockTurn(gameId);

    if (this.io) {
      for (const pid of outcome.recovered) {
        this.io.to(roomId).emit('resolve-token-recovered', { playerId: pid });
      }
      if (outcome.isGameEnd) {
        this.io.to(roomId).emit('game-ended', { gameId, message: '14일차가 끝났습니다! 최종 결산을 진행하세요.' });
      } else {
        this.io.to(roomId).emit('turn-started', { gameId, playerId: outcome.nextPlayerId, day: outcome.day });
        await this.broadcastGameState(gameId);
      }
    }

    const { aiScheduler } = await import('./AIScheduler');
    if (outcome.isGameEnd) {
      aiScheduler.submitAIFinals(gameId);
    } else if (outcome.isAI) {
      aiScheduler.kick(gameId);
    }
    return { nextPlayerId: outcome.nextPlayerId, isGameEnd: outcome.isGameEnd, isAI: outcome.isAI };
  }

  /** 룰북 7.1: 1~6일차에 결심 토큰을 쓰지 않은 플레이어는 7일차 시작 시 +1 (최대 2) */
  private async recoverResolveTokens(client: any, gameId: string): Promise<string[]> {
    const result = await client.query(
      `UPDATE player_states ps SET resolve_token = LEAST($2, ps.resolve_token + 1)
        WHERE ps.game_id = $1
          AND ps.resolve_token < $2
          AND NOT EXISTS (
            SELECT 1 FROM event_logs el
             WHERE el.game_id = $1 AND el.event_type = 'resolve_token_used'
               AND el.data->>'playerId' = ps.player_id::text
          )
        RETURNING ps.player_id`,
      [gameId, MAX_RESOLVE_TOKENS]
    );
    const ids = result.rows.map((r: any) => r.player_id);
    for (const playerId of ids) {
      await logEvent(client, gameId, 'resolve_token_recovered', { playerId, day: RESOLVE_RECOVERY_DAY });
    }
    return ids;
  }

  private async broadcastGameState(gameId: string): Promise<void> {
    if (!this.io) return;
    try {
      const game = await pool.query('SELECT room_id, day, current_turn_player_id FROM games WHERE id = $1', [gameId]);
      if (game.rows.length === 0) return;
      const { room_id, day, current_turn_player_id } = game.rows[0];
      this.io.to(room_id).emit('game-state-updated', { gameId, day, currentTurnPlayerId: current_turn_player_id });
    } catch (error) {
      console.error('게임 상태 브로드캐스트 실패:', error);
    }
  }
}

export const turnManager = new TurnManager();
