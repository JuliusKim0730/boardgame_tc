import { pool } from '../db/pool';
import { aiPlayerService } from './AIPlayerService';

const AI_TURN_DELAY_MS = parseInt(process.env.AI_TURN_DELAY_MS || '1200');

/**
 * AI 턴 실행기
 *
 *  - kick(gameId): 현재 턴이 AI면 연속된 AI 턴을 순서대로 실행 (게임당 하나의 루프만)
 *  - 5초 주기 점검: 서버 재시작 등으로 멈춘 AI 턴을 다시 시작하는 안전망
 *  - submitAIFinals: 14일차 이후 AI의 최종 결산 제출
 */
export class AIScheduler {
  private checkInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private executingGames = new Set<string>();
  private failures = new Map<string, number>();

  start() {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => {
      this.resumeStalledGames().catch((error) => console.error('AI 스케줄러 점검 실패:', error.message));
    }, 5000);
    this.cleanupInterval = setInterval(() => {
      this.cleanupFinishedGames().catch((error) => console.error('게임 정리 에러:', error));
    }, 600000);
    this.cleanupFinishedGames().catch(console.error);
  }

  stop() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.checkInterval = null;
    this.cleanupInterval = null;
  }

  isGameExecuting(gameId: string): boolean {
    return this.executingGames.has(gameId);
  }

  stopGame(gameId: string): void {
    this.executingGames.delete(gameId);
  }

  /** 현재 턴이 AI면 AI 턴 루프를 시작한다 (이미 실행 중이면 무시) */
  kick(gameId: string): void {
    if (this.executingGames.has(gameId)) return;
    this.executingGames.add(gameId);
    setImmediate(() => {
      this.runAITurns(gameId)
        .catch((error) => console.error(`❌ AI 턴 루프 실패 (${gameId}):`, error.message))
        .finally(() => this.executingGames.delete(gameId));
    });
  }

  private async runAITurns(gameId: string): Promise<void> {
    for (;;) {
      const current = await pool.query(
        `SELECT g.status, g.current_turn_player_id, p.is_ai FROM games g
           LEFT JOIN players p ON p.id = g.current_turn_player_id WHERE g.id = $1`,
        [gameId]
      );
      const row = current.rows[0];
      if (!row || row.status !== 'running' || !row.is_ai) return;

      await this.delay(AI_TURN_DELAY_MS);
      try {
        await aiPlayerService.executeTurn(gameId, row.current_turn_player_id);
        this.failures.delete(gameId);
      } catch (error: any) {
        const count = (this.failures.get(gameId) || 0) + 1;
        this.failures.set(gameId, count);
        console.error(`❌ AI 턴 실패 (${count}회):`, error.message);
        await aiPlayerService.notifyError(gameId, row.current_turn_player_id, error);
        if (count >= 3) return; // 반복 실패 시 점검 주기에 맡긴다
        await this.delay(1000);
      }
    }
  }

  /** 멈춘 AI 턴 / 미제출 AI 최종 결산을 재개 */
  private async resumeStalledGames() {
    const running = await pool.query(
      `SELECT g.id FROM games g JOIN players p ON p.id = g.current_turn_player_id
        WHERE g.status = 'running' AND p.is_ai = true`
    );
    for (const row of running.rows) {
      if ((this.failures.get(row.id) || 0) < 10) this.kick(row.id);
    }

    const finalizing = await pool.query(
      `SELECT DISTINCT g.id FROM games g
         JOIN player_states ps ON ps.game_id = g.id
         JOIN players p ON p.id = ps.player_id AND p.is_ai = true
        WHERE g.status = 'finalizing'
          AND NOT EXISTS (SELECT 1 FROM event_logs el WHERE el.game_id = g.id
                           AND el.event_type = 'final_submitted' AND el.data->>'playerId' = p.id::text)`
    );
    for (const row of finalizing.rows) this.submitAIFinals(row.id);
  }

  /** 14일차 이후 AI 플레이어들의 최종 구매·기여 제출 */
  submitAIFinals(gameId: string): void {
    const key = `final:${gameId}`;
    if (this.executingGames.has(key)) return;
    this.executingGames.add(key);
    setImmediate(async () => {
      try {
        const { gameFinalizationService } = await import('./GameFinalizationService');
        const ais = await pool.query(
          `SELECT ps.player_id FROM player_states ps JOIN players p ON p.id = ps.player_id
            WHERE ps.game_id = $1 AND p.is_ai = true ORDER BY ps.turn_order`,
          [gameId]
        );
        const submitted = await gameFinalizationService.getSubmittedPlayers(gameId);
        for (const row of ais.rows) {
          if (submitted.includes(row.player_id)) continue;
          await this.delay(500);
          const decision = await aiPlayerService.decideFinal(gameId, row.player_id);
          await gameFinalizationService.finalPurchase(gameId, row.player_id, decision);
        }
      } catch (error: any) {
        console.error('❌ AI 최종 결산 실패:', error.message);
      } finally {
        this.executingGames.delete(key);
      }
    });
  }

  /** 1시간 이상 지난 종료 게임과 방 정리 */
  async cleanupFinishedGames() {
    const result = await pool.query(
      `SELECT id, room_id FROM games WHERE status = 'finished' AND created_at < NOW() - INTERVAL '1 hour'`
    );
    for (const game of result.rows) {
      try {
        await pool.query('DELETE FROM games WHERE id = $1', [game.id]);
        await pool.query('DELETE FROM rooms WHERE id = $1', [game.room_id]);
      } catch (error) {
        console.error(`❌ 게임 삭제 실패: ${game.id}`, error);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const aiScheduler = new AIScheduler();
