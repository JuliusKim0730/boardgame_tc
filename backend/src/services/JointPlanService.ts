import { pool } from '../db/pool';
import { addEffects, jointPenaltyTargets, parseJSON, Traits, TRAIT_KEYS } from '../game/rules';

/**
 * 공동 목표 (룰북 8): 14일차 이후 각자 비밀리에 TC를 정해 동시에 공개한다.
 * 플레이어별 기여 금액은 최종 제출(GameFinalizationService) 때 joint_plan_contributions에 기록된다.
 * 게임 도중에는 CH20(공동 목표 지원) 카드만 기여를 추가한다.
 */
export class JointPlanService {
  async getContributionStatus(gameId: string, client: any = pool): Promise<any> {
    const result = await client.query(
      `SELECT ps.player_id, COALESCE(SUM(jpc.amount), 0)::int AS total_contribution
         FROM player_states ps
         LEFT JOIN joint_plan_contributions jpc ON ps.id = jpc.player_state_id
        WHERE ps.game_id = $1
        GROUP BY ps.player_id`,
      [gameId]
    );
    const contributions = result.rows;
    const totalAmount = contributions.reduce((sum: number, c: any) => sum + Number(c.total_contribution), 0);

    const card = await client.query(
      `SELECT c.* FROM games g JOIN cards c ON g.joint_plan_card_id = c.id WHERE g.id = $1`,
      [gameId]
    );
    const targetAmount = card.rows[0]?.cost || 0;
    return {
      contributions,
      totalAmount,
      targetAmount,
      card: card.rows[0] || null,
      isSuccess: targetAmount > 0 && totalAmount >= targetAmount,
    };
  }

  /**
   * 공동 목표 판정 (최종 점수 계산 트랜잭션 안에서 호출)
   *  - 성공: 전원에게 카드 효과, 최다 기여자에게 카드 보너스
   *  - 실패: 3인 이상이면 최소 기여자 추억 -2 (2인 면제)
   */
  async finalizeJointPlan(client: any, gameId: string): Promise<any> {
    const status = await this.getContributionStatus(gameId, client);
    const card = status.card;
    const contributions = status.contributions.map((c: any) => ({
      playerId: c.player_id as string,
      amount: Number(c.total_contribution),
    }));

    if (status.isSuccess) {
      const effects = parseJSON<Record<string, number>>(card.effects, {});
      for (const c of contributions) {
        await this.applyTraits(client, gameId, c.playerId, effects);
      }
      const max = Math.max(...contributions.map((c: any) => c.amount));
      const top = contributions.filter((c: any) => c.amount === max).map((c: any) => c.playerId);
      const [trait, value] = String(parseJSON<any>(card.metadata, {}).bonus || 'memory+1').split('+');
      const bonusKey = [...TRAIT_KEYS, 'memory'].includes(trait as any) ? trait : 'memory';
      for (const playerId of top) {
        await this.applyTraits(client, gameId, playerId, { [bonusKey]: parseInt(value) || 1 });
      }
      return {
        success: true,
        cardName: card.name,
        total: status.totalAmount,
        target: status.targetAmount,
        effects,
        bonus: { trait: bonusKey, value: parseInt(value) || 1 },
        topContributors: top,
        contributions,
      };
    }

    const penalized = jointPenaltyTargets(contributions);
    for (const playerId of penalized) {
      await this.applyTraits(client, gameId, playerId, { memory: -2 });
    }
    return {
      success: false,
      cardName: card?.name,
      total: status.totalAmount,
      target: status.targetAmount,
      penalizedPlayers: penalized,
      contributions,
    };
  }

  private async applyTraits(client: any, gameId: string, playerId: string, effects: Record<string, number>) {
    const row = await client.query('SELECT id, traits FROM player_states WHERE game_id = $1 AND player_id = $2 FOR UPDATE', [
      gameId,
      playerId,
    ]);
    const traits = addEffects(parseJSON<Traits>(row.rows[0].traits, {}), effects);
    await client.query('UPDATE player_states SET traits = $1 WHERE id = $2', [JSON.stringify(traits), row.rows[0].id]);
  }
}

export const jointPlanService = new JointPlanService();
