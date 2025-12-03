import { pool } from '../db/pool';
import { aiPlayerService } from './AIPlayerService';

/**
 * AI 플레이어 스케줄러
 * 
 * AI 플레이어의 턴이 되면 자동으로 실행
 */
export class AIScheduler {
  private checkInterval: NodeJS.Timeout | null = null;
  private processing = false;

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
  }

  /**
   * AI 턴 체크 및 실행
   */
  private async checkAndExecuteAITurns() {
    const client = await pool.connect();
    try {
      // 진행 중인 게임에서 AI 플레이어의 턴 찾기
      const result = await client.query(`
        SELECT 
          g.id as game_id,
          g.current_turn_player_id,
          p.id as player_id,
          u.nickname,
          ps.position,
          ps.money,
          ps.resolve_token
        FROM games g
        JOIN player_states ps ON ps.game_id = g.id AND ps.player_id = g.current_turn_player_id
        JOIN players p ON p.id = ps.player_id
        JOIN users u ON u.id = p.user_id
        WHERE g.status = 'running'
        AND u.nickname LIKE '%로봇%' OR u.nickname LIKE '%AI%' OR u.nickname LIKE '%봇%'
      `);

      for (const row of result.rows) {
        console.log(`🤖 AI 턴 실행: ${row.nickname} (게임 ${row.game_id})`);
        
        try {
          // AI 턴 실행
          await aiPlayerService.executeTurn(row.game_id, row.player_id);
          
          // 잠시 대기 (자연스러운 플레이를 위해)
          await this.delay(2000);
        } catch (error) {
          console.error(`AI 턴 실행 실패 (${row.nickname}):`, error);
        }
      }
    } finally {
      client.release();
    }
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
}

export const aiScheduler = new AIScheduler();
