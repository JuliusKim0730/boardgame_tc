import { pool } from '../db/pool';

export class JointPlanService {
  // 공동 계획 기여
  async contribute(gameId: string, playerId: string, amount: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 플레이어 상태 조회
      const stateResult = await client.query(
        'SELECT id, money FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );

      if (stateResult.rows.length === 0) {
        throw new Error('플레이어를 찾을 수 없습니다');
      }

      const playerState = stateResult.rows[0];

      if (playerState.money < amount) {
        throw new Error('돈이 부족합니다');
      }

      // 돈 차감 (원자적 트랜잭션)
      await client.query(
        'UPDATE player_states SET money = money - $1 WHERE id = $2',
        [amount, playerState.id]
      );

      // 기여 기록
      await client.query(
        'INSERT INTO joint_plan_contributions (game_id, player_state_id, amount) VALUES ($1, $2, $3)',
        [gameId, playerState.id, amount]
      );

      // 이벤트 로그
      await client.query(
        'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
        [gameId, 'joint_plan_contribution', JSON.stringify({ playerId, amount })]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 공동 계획 현황 조회
  async getContributionStatus(gameId: string): Promise<any> {
    const result = await pool.query(
      `SELECT 
        ps.player_id,
        COALESCE(SUM(jpc.amount), 0) as total_contribution
       FROM player_states ps
       LEFT JOIN joint_plan_contributions jpc ON ps.id = jpc.player_state_id
       WHERE ps.game_id = $1
       GROUP BY ps.player_id`,
      [gameId]
    );

    const contributions = result.rows;
    const totalAmount = contributions.reduce((sum, c) => sum + parseInt(c.total_contribution), 0);

    // 공동 계획 카드 목표 금액 조회
    const gameResult = await pool.query(
      `SELECT g.joint_plan_card_id, c.cost 
       FROM games g
       JOIN cards c ON g.joint_plan_card_id = c.id
       WHERE g.id = $1`,
      [gameId]
    );

    const targetAmount = gameResult.rows[0]?.cost || 0;

    return {
      contributions,
      totalAmount,
      targetAmount,
      isSuccess: totalAmount >= targetAmount
    };
  }

  // 공동 계획 최종 정산
  async finalizeJointPlan(gameId: string, is2Player: boolean = false): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const status = await this.getContributionStatus(gameId);

      // 플레이어 수 확인
      const playerCountResult = await client.query(
        'SELECT COUNT(*) as count FROM player_states WHERE game_id = $1',
        [gameId]
      );
      const playerCount = parseInt(playerCountResult.rows[0].count);

      // 공동 계획 카드 효과 조회
      const cardResult = await client.query(
        `SELECT c.* FROM games g
         JOIN cards c ON g.joint_plan_card_id = c.id
         WHERE g.id = $1`,
        [gameId]
      );
      const jointCard = cardResult.rows[0];

      if (status.isSuccess) {
        // 성공: 모든 플레이어에게 보상
        for (const contrib of status.contributions) {
          const traits = jointCard.effects;
          await client.query(
            `UPDATE player_states 
             SET traits = jsonb_set(
               jsonb_set(
                 jsonb_set(
                   jsonb_set(
                     jsonb_set(
                       jsonb_set(
                         jsonb_set(traits, '{taste}', (COALESCE((traits->>'taste')::int, 0) + COALESCE($2, 0))::text::jsonb),
                       '{history}', (COALESCE((traits->>'history')::int, 0) + COALESCE($3, 0))::text::jsonb),
                     '{nature}', (COALESCE((traits->>'nature')::int, 0) + COALESCE($4, 0))::text::jsonb),
                   '{culture}', (COALESCE((traits->>'culture')::int, 0) + COALESCE($5, 0))::text::jsonb),
                 '{leisure}', (COALESCE((traits->>'leisure')::int, 0) + COALESCE($6, 0))::text::jsonb),
               '{water}', (COALESCE((traits->>'water')::int, 0) + COALESCE($7, 0))::text::jsonb),
             '{memory}', (COALESCE((traits->>'memory')::int, 0) + COALESCE($8, 0))::text::jsonb)
             WHERE game_id = $1 AND player_id = $9`,
            [
              gameId,
              traits.taste || 0,
              traits.history || 0,
              traits.nature || 0,
              traits.culture || 0,
              traits.leisure || 0,
              traits.water || 0,
              traits.memory || 0,
              contrib.player_id
            ]
          );
        }

        // 최다 기여자 보너스
        const maxContribution = Math.max(...status.contributions.map((c: any) => parseInt(c.total_contribution)));
        const topContributors = status.contributions.filter((c: any) => parseInt(c.total_contribution) === maxContribution);

        for (const top of topContributors) {
          const bonusType = jointCard.metadata?.bonus || 'memory+1';
          const [trait, value] = bonusType.split('+');
          
          await client.query(
            `UPDATE player_states 
             SET traits = jsonb_set(traits, $1, ((COALESCE((traits->>$2)::int, 0) + $3)::text::jsonb))
             WHERE game_id = $4 AND player_id = $5`,
            [`{${trait}}`, trait, parseInt(value), gameId, top.player_id]
          );
        }

        await client.query('COMMIT');
        return { success: true, topContributors: topContributors.map((c: any) => c.player_id) };
      } else {
        // 실패: 패널티 적용 (2인 예외)
        if (!is2Player && playerCount > 2) {
          const minContribution = Math.min(...status.contributions.map((c: any) => parseInt(c.total_contribution)));
          const lowestContributors = status.contributions.filter((c: any) => parseInt(c.total_contribution) === minContribution);

          for (const lowest of lowestContributors) {
            await client.query(
              `UPDATE player_states 
               SET traits = jsonb_set(traits, '{memory}', ((COALESCE((traits->>'memory')::int, 0) - 2)::text::jsonb))
               WHERE game_id = $1 AND player_id = $2`,
              [gameId, lowest.player_id]
            );
          }

          await client.query('COMMIT');
          return { success: false, penalizedPlayers: lowestContributors.map((c: any) => c.player_id) };
        }

        await client.query('COMMIT');
        return { success: false, penalizedPlayers: [] }; // 2인 예외
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const jointPlanService = new JointPlanService();
