import { pool } from '../db/pool';
import { Server } from 'socket.io';
import { jointPlanService } from './JointPlanService';
import {
  addEffects,
  applyConversions,
  maxConversions,
  multipliersFromTravelCard,
  parseJSON,
  rankPlayers,
  scorePlayer,
  Traits,
} from '../game/rules';
import { getPlayerState, getRoomId, logEvent, withTransaction } from './TurnState';

export interface FinalSubmission {
  cardIds: string[];
  contribution?: number;
  conversions?: number;
}

/**
 * 최종 결산 (룰북 9)
 *  9.1 일반 계획 카드 구매 → 9.2 공동 목표 판정 → 9.3 비주류 특성 변환 → 9.4 점수 확정
 *
 * 각 플레이어는 구매할 카드, 공동 목표 기여액(비공개), 특성 변환 횟수를 한 번에 제출한다.
 * 모두 제출하면 기여액을 동시에 공개하고 점수를 계산한다.
 */
export class GameFinalizationService {
  private io: Server | null = null;

  setSocketIO(io: Server) {
    this.io = io;
  }

  async finalPurchase(gameId: string, playerId: string, submission: FinalSubmission): Promise<{ allSubmitted: boolean }> {
    const cardIds = [...new Set(submission.cardIds || [])];
    const contribution = Math.max(0, Math.floor(Number(submission.contribution) || 0));
    const conversions = Math.max(0, Math.floor(Number(submission.conversions) || 0));

    const allSubmitted = await withTransaction(async (client) => {
      const game = await client.query('SELECT status FROM games WHERE id = $1 FOR UPDATE', [gameId]);
      if (game.rows[0]?.status !== 'finalizing') throw new Error('최종 결산 단계가 아닙니다');
      if (await this.hasSubmitted(client, gameId, playerId)) throw new Error('이미 최종 제출을 완료했습니다');

      const state = await getPlayerState(client, gameId, playerId);
      const hand = await client.query(
        `SELECT h.card_id, c.cost, c.effects, c.type FROM hands h JOIN cards c ON c.id = h.card_id
          WHERE h.player_state_id = $1`,
        [state.id]
      );
      const handById = new Map(hand.rows.map((r: any) => [r.card_id, r]));
      const chosen = cardIds.map((id) => {
        const card: any = handById.get(id);
        if (!card) throw new Error('손에 없는 카드는 구매할 수 없습니다');
        return { id, ...card };
      });

      const totalCost = chosen.reduce((sum, c) => sum + (c.cost || 0), 0);
      if (totalCost + contribution > state.money) {
        throw new Error(`TC가 부족합니다 (필요 ${(totalCost + contribution).toLocaleString()}TC / 보유 ${state.money.toLocaleString()}TC)`);
      }

      let traits = parseJSON<Traits>(state.traits, {});
      for (const card of chosen) {
        traits = addEffects(traits, parseJSON(card.effects, {}));
        await client.query('INSERT INTO purchased (player_state_id, card_id, price_paid) VALUES ($1, $2, $3)', [
          state.id,
          card.id,
          card.cost || 0,
        ]);
      }
      // 구매하지 않은 카드는 버린다 (효과 없음, 손패에서 제거되면 버린 카드 더미로 간주)
      await client.query('DELETE FROM hands WHERE player_state_id = $1', [state.id]);
      await client.query('UPDATE player_states SET money = money - $1, traits = $2 WHERE id = $3', [
        totalCost + contribution,
        JSON.stringify(traits),
        state.id,
      ]);

      await logEvent(client, gameId, 'final_submitted', {
        playerId,
        cardIds,
        totalCost,
        contribution,
        conversions,
      });

      const counts = await client.query(
        `SELECT
           (SELECT COUNT(*)::int FROM player_states WHERE game_id = $1) AS total,
           (SELECT COUNT(DISTINCT data->>'playerId')::int FROM event_logs WHERE game_id = $1 AND event_type = 'final_submitted') AS done`,
        [gameId]
      );
      return counts.rows[0].done >= counts.rows[0].total;
    });

    const roomId = await getRoomId(gameId);
    if (this.io && roomId) this.io.to(roomId).emit('final-submitted', { playerId });

    if (allSubmitted) {
      const results = await this.calculateFinalScore(gameId);
      if (this.io && roomId) this.io.to(roomId).emit('final-results', { gameId, results });
    }
    return { allSubmitted };
  }

  async getSubmittedPlayers(gameId: string, client: any = pool): Promise<string[]> {
    const r = await client.query(
      `SELECT DISTINCT data->>'playerId' AS player_id FROM event_logs WHERE game_id = $1 AND event_type = 'final_submitted'`,
      [gameId]
    );
    return r.rows.map((row: any) => row.player_id);
  }

  private async hasSubmitted(client: any, gameId: string, playerId: string): Promise<boolean> {
    return (await this.getSubmittedPlayers(gameId, client)).includes(playerId);
  }

  /** 모든 제출이 끝난 뒤 한 번만 점수를 확정한다 (중복 호출 시 저장된 결과 반환) */
  async calculateFinalScore(gameId: string): Promise<any[]> {
    const computed = await withTransaction(async (client) => {
      const claim = await client.query(
        `UPDATE games SET status = 'finished' WHERE id = $1 AND status = 'finalizing' RETURNING id`,
        [gameId]
      );
      if (claim.rows.length === 0) return null;

      const players = await client.query(
        `SELECT ps.*, u.nickname FROM player_states ps
           JOIN players p ON p.id = ps.player_id JOIN users u ON u.id = p.user_id
          WHERE ps.game_id = $1 ORDER BY ps.turn_order`,
        [gameId]
      );
      const submissions = await client.query(
        `SELECT data FROM event_logs WHERE game_id = $1 AND event_type = 'final_submitted'`,
        [gameId]
      );
      const byPlayer = new Map<string, any>();
      for (const row of submissions.rows) {
        const data = parseJSON<any>(row.data, {});
        byPlayer.set(data.playerId, data);
      }
      if (byPlayer.size < players.rows.length) throw new Error('아직 모든 플레이어가 최종 제출을 하지 않았습니다');

      // 9.2 공동 목표: 비공개 기여액 동시 공개
      for (const p of players.rows) {
        const amount = byPlayer.get(p.player_id)?.contribution || 0;
        if (amount > 0) {
          await client.query('INSERT INTO joint_plan_contributions (game_id, player_state_id, amount) VALUES ($1, $2, $3)', [
            gameId,
            p.id,
            amount,
          ]);
        }
      }
      const joint = await jointPlanService.finalizeJointPlan(client, gameId);

      const results = [];
      for (const p of players.rows) {
        const fresh = await client.query('SELECT traits, money FROM player_states WHERE id = $1', [p.id]);
        const travel = await client.query(
          `SELECT c.* FROM purchased pu JOIN cards c ON c.id = pu.card_id
            WHERE pu.player_state_id = $1 AND c.type = 'travel' LIMIT 1`,
          [p.id]
        );
        const travelCard = travel.rows[0] || null;
        const multipliers = multipliersFromTravelCard(travelCard);

        // 9.3 비주류 특성 변환 (요청 횟수를 가능한 범위로 제한)
        let traits = parseJSON<Traits>(fresh.rows[0].traits, {});
        const requested = byPlayer.get(p.player_id)?.conversions || 0;
        const conversions = Math.min(requested, maxConversions(traits, multipliers));
        traits = applyConversions(traits, multipliers, conversions);
        await client.query('UPDATE player_states SET traits = $1 WHERE id = $2', [JSON.stringify(traits), p.id]);

        const score = scorePlayer(traits, multipliers);
        const purchased = await client.query(
          `SELECT c.id, c.code, c.name, c.type, c.cost, c.effects FROM purchased pu JOIN cards c ON c.id = pu.card_id
            WHERE pu.player_state_id = $1 AND c.type <> 'travel' ORDER BY pu.purchased_at`,
          [p.id]
        );
        const breakdown = {
          ...score.traits,
          memory: { base: score.memoryScore, score: score.memoryScore },
          traitScore: score.traitScore,
          conversions,
          contribution: byPlayer.get(p.player_id)?.contribution || 0,
          jointPlan: joint,
          nickname: p.nickname,
          money: fresh.rows[0].money,
          travelCard,
          purchasedCards: purchased.rows,
        };
        await client.query(
          'INSERT INTO game_results (game_id, player_state_id, total_score, breakdown) VALUES ($1, $2, $3, $4)',
          [gameId, p.id, score.totalScore, JSON.stringify(breakdown)]
        );
        results.push(this.toResult(p.player_id, score.totalScore, breakdown));
      }
      await logEvent(client, gameId, 'game_finished', { joint: { success: joint.success, total: joint.total } });
      return rankPlayers(results);
    });

    return computed ?? this.getResults(gameId);
  }

  async getResults(gameId: string): Promise<any[]> {
    const rows = await pool.query(
      `SELECT gr.total_score, gr.breakdown, ps.player_id FROM game_results gr
         JOIN player_states ps ON ps.id = gr.player_state_id WHERE gr.game_id = $1`,
      [gameId]
    );
    return rankPlayers(rows.rows.map((r: any) => this.toResult(r.player_id, r.total_score, parseJSON(r.breakdown, {}))));
  }

  private toResult(playerId: string, totalScore: number, breakdown: any) {
    return {
      playerId,
      nickname: breakdown.nickname,
      totalScore,
      memoryScore: breakdown.memory?.score || 0,
      money: breakdown.money || 0,
      breakdown,
      purchasedCards: breakdown.purchasedCards || [],
      travelCard: breakdown.travelCard || null,
    };
  }

  // 소프트 리셋 (같은 방에서 다시 하기)
  async softReset(roomId: string): Promise<void> {
    await withTransaction(async (client) => {
      await client.query('DELETE FROM games WHERE room_id = $1', [roomId]);
      await client.query('UPDATE rooms SET status = $1 WHERE id = $2', ['waiting', roomId]);
    });
  }

  // 결과 창 닫기 신호 수집
  private resultClosedSignals: Map<string, Set<string>> = new Map();

  async recordResultClosed(gameId: string, playerId: string): Promise<boolean> {
    if (!this.resultClosedSignals.has(gameId)) this.resultClosedSignals.set(gameId, new Set());
    const signals = this.resultClosedSignals.get(gameId)!;
    signals.add(playerId);

    const humans = await pool.query(
      `SELECT COUNT(*)::int AS n FROM player_states ps JOIN players p ON p.id = ps.player_id
        WHERE ps.game_id = $1 AND NOT COALESCE(p.is_ai, false)`,
      [gameId]
    );
    if (signals.size >= humans.rows[0].n) {
      this.resultClosedSignals.delete(gameId);
      return true;
    }
    return false;
  }
}

export const gameFinalizationService = new GameFinalizationService();
