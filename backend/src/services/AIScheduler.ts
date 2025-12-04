import { pool } from '../db/pool';
import { aiPlayerService } from './AIPlayerService';

/**
 * AI 플레이어 스케줄러
 * 
 * AI 플레이어의 턴이 되면 자동으로 실행
 */
export class AIScheduler {
  private checkInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private processing = false;
  private executingGames = new Set<string>(); // 현재 실행 중인 게임 ID
  private stoppedGames = new Set<string>(); // 중지된 게임 ID (에러 또는 종료)

  /**
   * 스케줄러 시작
   */
  start() {
    if (this.checkInterval) {
      return; // 이미 실행 중
    }

    console.log('🤖 AI 스케줄러 시작');

    // 5초마다 AI 턴 체크
    this.checkInterval = setInterval(async () => {
      if (this.processing) return;

      try {
        this.processing = true;
        await this.checkAndExecuteAITurns();
      } catch (error) {
        console.error('AI 턴 실행 에러:', error);
      } finally {
        this.processing = false;
      }
    }, 5000);

    // 10분마다 완료된 게임 정리
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupFinishedGames();
      } catch (error) {
        console.error('게임 정리 에러:', error);
      }
    }, 600000); // 10분 = 600,000ms

    // 시작 시 한 번 정리 실행
    this.cleanupFinishedGames().catch(console.error);
  }

  /**
   * 스케줄러 중지
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🤖 AI 스케줄러 중지');
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🧹 게임 정리 스케줄러 중지');
    }
  }

  /**
   * AI 턴 체크 및 실행
   */
  private async checkAndExecuteAITurns() {
    let client;
    try {
      client = await pool.connect();
      
      // 먼저 진행 중인 게임이 있는지 빠르게 체크
      const runningGamesResult = await client.query(
        `SELECT COUNT(*) as count FROM games WHERE status = 'running'`
      );
      const runningGamesCount = parseInt(runningGamesResult.rows[0].count);
      
      // 진행 중인 게임이 없으면 스킵
      if (runningGamesCount === 0) {
        client.release();
        return;
      }
      
      // 진행 중인 게임에서 AI 플레이어의 턴 찾기
      // 조건:
      // 1. 게임 상태가 'running' (게임 시작됨)
      // 2. 현재 턴 플레이어가 AI
      // 3. 턴이 실제로 시작되었음 (turns 테이블에 레코드 존재)
      // 4. 턴이 아직 끝나지 않음 (ended_at IS NULL)
      // 5. 턴이 최근에 시작됨 (5분 이내 - 오래된 턴 제외)
      // 6. 중지되지 않은 게임만
      const stoppedGameIds = Array.from(this.stoppedGames);
      const stoppedGamesCondition = stoppedGameIds.length > 0 
        ? `AND g.id NOT IN (${stoppedGameIds.map((_, i) => `$${i + 1}`).join(', ')})`
        : '';
      
      const result = await client.query(`
        SELECT 
          g.id as game_id,
          g.current_turn_player_id,
          g.created_at as game_created_at,
          p.id as player_id,
          p.is_ai,
          u.nickname,
          ps.position,
          ps.money,
          ps.resolve_token,
          t.started_at,
          t.ended_at
        FROM games g
        JOIN player_states ps ON ps.game_id = g.id AND ps.player_id = g.current_turn_player_id
        JOIN players p ON p.id = ps.player_id
        JOIN users u ON u.id = p.user_id
        JOIN turns t ON t.game_id = g.id 
          AND t.player_state_id = ps.id 
          AND t.ended_at IS NULL
        WHERE g.status = 'running'
        AND p.is_ai = true
        AND t.started_at > NOW() - INTERVAL '5 minutes'
        ${stoppedGamesCondition}
      `, stoppedGameIds);
      
      if (result.rows.length > 0) {
        console.log(`🔍 AI 스케줄러 체크: ${result.rows.length}개 발견`);
        console.log(`🎯 AI 턴 발견 (스케줄러):`, result.rows.map(r => `${r.nickname} (게임 ${r.game_id})`));
      }

      // 클라이언트 먼저 해제
      client.release();
      client = null;

      for (const row of result.rows) {
        // 중지된 게임은 스킵
        if (this.stoppedGames.has(row.game_id)) {
          console.log(`🛑 게임 ${row.game_id}는 중지됨, 스킵`);
          continue;
        }
        
        // 이미 실행 중인 게임은 스킵
        if (this.executingGames.has(row.game_id)) {
          console.log(`⏭️ 게임 ${row.game_id}는 이미 실행 중, 스킵`);
          continue;
        }
        
        console.log(`🤖 AI 턴 실행 시작 (스케줄러): ${row.nickname} (게임 ${row.game_id}, 플레이어 ${row.player_id})`);
        
        // 실행 중 표시
        this.executingGames.add(row.game_id);
        
        try {
          // AI 턴 실행 (새로운 연결 사용)
          await aiPlayerService.executeTurn(row.game_id, row.player_id);
          console.log(`✅ AI 턴 실행 완료 (스케줄러): ${row.nickname}`);
          
          // 잠시 대기 (자연스러운 플레이를 위해)
          await this.delay(2000);
        } catch (error: any) {
          console.error(`❌ AI 턴 실행 실패 (스케줄러, ${row.nickname}):`, error);
          
          // 치명적 에러 시 게임 중지
          if (
            error?.code === 'XX000' || 
            error?.message?.includes('DbHandler exited') ||
            error?.message?.includes('턴 카운트 오류') ||
            error?.code === '57014' // statement timeout
          ) {
            console.error(`🛑 게임 ${row.game_id} 중지: 치명적 에러 발생`);
            this.stopGame(row.game_id);
            return;
          }
        } finally {
          // 실행 완료 표시 제거
          this.executingGames.delete(row.game_id);
        }
      }
    } catch (error: any) {
      // 연결 에러는 조용히 처리 (다음 체크에서 재시도)
      if (error?.code === 'ECONNRESET' || error?.code === 'ECONNREFUSED' || error?.code === 'XX000') {
        console.log('⚠️  데이터베이스 연결 에러, 다음 체크에서 재시도');
        return;
      }
      console.error('AI 스케줄러 에러:', error);
    } finally {
      if (client) {
        try {
          client.release();
        } catch (e) {
          // 이미 해제된 경우 무시
        }
      }
    }
  }

  /**
   * 게임 실행 중 표시 추가 (외부에서 호출)
   */
  markGameAsExecuting(gameId: string): void {
    this.executingGames.add(gameId);
  }

  /**
   * 게임 실행 완료 표시 제거 (외부에서 호출)
   */
  unmarkGameAsExecuting(gameId: string): void {
    this.executingGames.delete(gameId);
  }

  /**
   * 게임 실행 중 여부 확인 (외부에서 호출)
   */
  isGameExecuting(gameId: string): boolean {
    return this.executingGames.has(gameId);
  }

  /**
   * 게임 중지 (외부에서 호출)
   * 게임 종료, 에러 발생, 플레이어 나가기 등의 경우 호출
   */
  stopGame(gameId: string): void {
    this.stoppedGames.add(gameId);
    this.executingGames.delete(gameId);
    console.log(`🛑 게임 ${gameId} AI 스케줄러 중지`);
  }

  /**
   * 게임 재개 (외부에서 호출)
   */
  resumeGame(gameId: string): void {
    this.stoppedGames.delete(gameId);
    console.log(`▶️ 게임 ${gameId} AI 스케줄러 재개`);
  }

  /**
   * 게임 중지 여부 확인
   */
  isGameStopped(gameId: string): boolean {
    return this.stoppedGames.has(gameId);
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * AI 공동 계획 기여 체크
   */
  async checkAIJointPlanContributions(gameId: string) {
    const client = await pool.connect();
    try {
      // AI 플레이어 찾기
      const result = await client.query(`
        SELECT 
          p.id as player_id,
          u.nickname,
          ps.money
        FROM players p
        JOIN users u ON u.id = p.user_id
        JOIN player_states ps ON ps.player_id = p.id
        WHERE p.room_id = (SELECT room_id FROM games WHERE id = $1)
        AND (u.nickname LIKE '%로봇%' OR u.nickname LIKE '%AI%' OR u.nickname LIKE '%봇%')
        AND ps.game_id = $1
      `, [gameId]);

      for (const row of result.rows) {
        // 이미 기여했는지 확인
        const contributionResult = await client.query(
          'SELECT COUNT(*) as count FROM joint_plan_contributions WHERE game_id = $1 AND player_state_id = (SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2)',
          [gameId, row.player_id]
        );

        if (parseInt(contributionResult.rows[0].count) === 0) {
          // 기여 결정
          const amount = await aiPlayerService.decideJointPlanContribution(gameId, row.player_id);
          
          if (amount > 0) {
            console.log(`🤖 AI 공동 계획 기여: ${row.nickname} - ${amount}TC`);
            
            // 기여 실행
            const { jointPlanService } = await import('./JointPlanService');
            await jointPlanService.contribute(gameId, row.player_id, amount);
          }
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * AI 최종 구매 실행
   */
  async executeAIFinalPurchases(gameId: string) {
    const client = await pool.connect();
    try {
      // AI 플레이어 찾기
      const result = await client.query(`
        SELECT 
          p.id as player_id,
          u.nickname
        FROM players p
        JOIN users u ON u.id = p.user_id
        WHERE p.room_id = (SELECT room_id FROM games WHERE id = $1)
        AND (u.nickname LIKE '%로봇%' OR u.nickname LIKE '%AI%' OR u.nickname LIKE '%봇%')
      `, [gameId]);

      for (const row of result.rows) {
        console.log(`🤖 AI 최종 구매: ${row.nickname}`);
        
        // 구매 결정
        const cardIds = await aiPlayerService.decideFinalPurchase(gameId, row.player_id);
        
        if (cardIds.length > 0) {
          // 구매 실행
          const { gameFinalizationService } = await import('./GameFinalizationService');
          await gameFinalizationService.finalPurchase(gameId, row.player_id, cardIds);
        }

        // 잠시 대기
        await this.delay(1000);
      }
    } finally {
      client.release();
    }
  }

  /**
   * AI 특성 변환 실행
   */
  async executeAITraitConversions(gameId: string) {
    const client = await pool.connect();
    try {
      // AI 플레이어 찾기
      const result = await client.query(`
        SELECT 
          p.id as player_id,
          u.nickname
        FROM players p
        JOIN users u ON u.id = p.user_id
        WHERE p.room_id = (SELECT room_id FROM games WHERE id = $1)
        AND (u.nickname LIKE '%로봇%' OR u.nickname LIKE '%AI%' OR u.nickname LIKE '%봇%')
      `, [gameId]);

      for (const row of result.rows) {
        console.log(`🤖 AI 특성 변환: ${row.nickname}`);
        
        // 변환 결정
        const conversions = await aiPlayerService.decideTraitConversion(gameId, row.player_id);
        
        if (conversions > 0) {
          // 변환 실행
          const { gameFinalizationService } = await import('./GameFinalizationService');
          await gameFinalizationService.convertMinorTraits(gameId, row.player_id, conversions);
        }

        // 잠시 대기
        await this.delay(1000);
      }
    } finally {
      client.release();
    }
  }

  /**
   * 완료된 게임 정리
   * - 1시간 이상 지난 finished 게임 삭제
   * - 관련 데이터 모두 삭제 (CASCADE)
   */
  async cleanupFinishedGames() {
    const client = await pool.connect();
    try {
      // 1시간 이상 지난 finished 게임 찾기
      const result = await client.query(`
        SELECT g.id, g.room_id, g.status, g.created_at
        FROM games g
        WHERE g.status IN ('finished', 'finalizing')
        AND g.created_at < NOW() - INTERVAL '1 hour'
      `);

      if (result.rows.length === 0) {
        return;
      }

      console.log(`🧹 완료된 게임 정리 시작: ${result.rows.length}개`);

      for (const game of result.rows) {
        try {
          await client.query('BEGIN');

          // 게임 관련 데이터 삭제 (CASCADE로 자동 삭제됨)
          // - turns
          // - player_states
          // - hands
          // - purchased
          // - joint_plan_contributions
          // - event_logs
          await client.query('DELETE FROM games WHERE id = $1', [game.id]);

          // 방도 삭제 (players는 CASCADE로 자동 삭제)
          await client.query('DELETE FROM rooms WHERE id = $1', [game.room_id]);

          await client.query('COMMIT');

          // 중지된 게임 목록에서도 제거
          this.stoppedGames.delete(game.id);
          this.executingGames.delete(game.id);

          console.log(`✅ 게임 삭제 완료: ${game.id} (${game.status})`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`❌ 게임 삭제 실패: ${game.id}`, error);
        }
      }

      console.log(`🧹 게임 정리 완료: ${result.rows.length}개 삭제`);
    } catch (error) {
      console.error('게임 정리 중 에러:', error);
    } finally {
      client.release();
    }
  }
}

export const aiScheduler = new AIScheduler();
