import { pool } from '../db/pool';
import { jointPlanService } from './JointPlanService';

export class GameFinalizationService {
  // 최종 구매
  async finalPurchase(gameId: string, playerId: string, cardIds: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const stateResult = await client.query(
        'SELECT id, money FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );

      if (stateResult.rows.length === 0) {
        throw new Error('플레이어를 찾을 수 없습니다');
      }

      const playerState = stateResult.rows[0];
      let totalCost = 0;

      // 구매할 카드들의 비용 계산
      for (const cardId of cardIds) {
        const cardResult = await client.query(
          'SELECT cost FROM cards WHERE id = $1',
          [cardId]
        );
        
        if (cardResult.rows.length > 0) {
          totalCost += cardResult.rows[0].cost || 0;
        }
      }

      if (playerState.money < totalCost) {
        throw new Error('돈이 부족합니다');
      }

      // 돈 차감
      await client.query(
        'UPDATE player_states SET money = money - $1 WHERE id = $2',
        [totalCost, playerState.id]
      );

      // 구매 기록
      for (const cardId of cardIds) {
        const cardResult = await client.query(
          'SELECT cost FROM cards WHERE id = $1',
          [cardId]
        );
        
        await client.query(
          'INSERT INTO purchased (player_state_id, card_id, price_paid) VALUES ($1, $2, $3)',
          [playerState.id, cardId, cardResult.rows[0].cost || 0]
        );

        // 손패에서 제거
        await client.query(
          'DELETE FROM hands WHERE player_state_id = $1 AND card_id = $2',
          [playerState.id, cardId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 비주류 특성 변환 (가중치 1배 특성 3점 → 추억 +1)
  async convertMinorTraits(gameId: string, playerId: string, conversions: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const stateResult = await client.query(
        'SELECT id, traits FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );

      if (stateResult.rows.length === 0) {
        throw new Error('플레이어를 찾을 수 없습니다');
      }

      const playerState = stateResult.rows[0];
      const traits = playerState.traits;

      // 여행지 배수 조회
      const travelResult = await client.query(
        `SELECT c.metadata FROM games g
         JOIN cards c ON c.code = g.travel_theme
         WHERE g.id = $1`,
        [gameId]
      );
      const multipliers = travelResult.rows[0]?.metadata?.multipliers || {};

      // 가중치 1배인 특성 찾기
      const minorTraits = Object.keys(multipliers).filter(key => multipliers[key] === 1);
      
      // 변환 가능한 총 점수 계산
      let availablePoints = 0;
      for (const trait of minorTraits) {
        availablePoints += traits[trait] || 0;
      }

      const maxConversions = Math.floor(availablePoints / 3);
      if (conversions > maxConversions) {
        throw new Error('변환 가능한 점수가 부족합니다');
      }

      // 변환 수행 (특성 -3, 추억 +1)
      let remainingConversions = conversions;
      for (const trait of minorTraits) {
        while (remainingConversions > 0 && traits[trait] >= 3) {
          traits[trait] -= 3;
          traits.memory = (traits.memory || 0) + 1;
          remainingConversions--;
        }
        if (remainingConversions === 0) break;
      }

      await client.query(
        'UPDATE player_states SET traits = $1 WHERE id = $2',
        [JSON.stringify(traits), playerState.id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 최종 점수 계산
  async calculateFinalScore(gameId: string): Promise<Array<{
    playerId: string;
    totalScore: number;
    breakdown: any;
    money: number;
    memoryScore: number;
    purchasedCards: any[];
    rank: number;
  }>> {
    const client = await pool.connect();
    try {
      // 여행지 배수 조회
      const travelResult = await client.query(
        `SELECT c.metadata FROM games g
         JOIN cards c ON c.code = g.travel_theme
         WHERE g.id = $1`,
        [gameId]
      );
      const multipliers = travelResult.rows[0]?.metadata?.multipliers || {};

      // 플레이어 수 확인 (2인 전용 규칙)
      const playerCountResult = await client.query(
        'SELECT COUNT(*) as count FROM player_states WHERE game_id = $1',
        [gameId]
      );
      const playerCount = parseInt(playerCountResult.rows[0].count);
      const is2Player = playerCount === 2;

      // 공동 계획 정산 (2인 전용: 패널티 없음)
      const jointResult = await jointPlanService.finalizeJointPlan(gameId, is2Player);

      // 모든 플레이어 점수 계산
      const playersResult = await client.query(
        'SELECT * FROM player_states WHERE game_id = $1',
        [gameId]
      );

      const results: Array<{
        playerId: string;
        totalScore: number;
        breakdown: any;
        money: number;
        memoryScore: number;
        purchasedCards: any[];
        rank: number;
      }> = [];

      for (const playerState of playersResult.rows) {
        const traits = playerState.traits;

        // 특성 점수 × 배수
        const tasteScore = (traits.taste || 0) * (multipliers.taste || 1);
        const historyScore = (traits.history || 0) * (multipliers.history || 1);
        const natureScore = (traits.nature || 0) * (multipliers.nature || 1);
        const cultureScore = (traits.culture || 0) * (multipliers.culture || 1);
        const leisureScore = (traits.leisure || 0) * (multipliers.leisure || 1);
        const waterScore = (traits.water || 0) * (multipliers.water || 1);
        const memoryScore = traits.memory || 0;

        const totalScore = tasteScore + historyScore + natureScore + cultureScore + leisureScore + waterScore + memoryScore;

        const breakdown = {
          taste: { base: traits.taste, multiplier: multipliers.taste || 1, score: tasteScore },
          history: { base: traits.history, multiplier: multipliers.history || 1, score: historyScore },
          nature: { base: traits.nature, multiplier: multipliers.nature || 1, score: natureScore },
          culture: { base: traits.culture, multiplier: multipliers.culture || 1, score: cultureScore },
          leisure: { base: traits.leisure, multiplier: multipliers.leisure || 1, score: leisureScore },
          water: { base: traits.water, multiplier: multipliers.water || 1, score: waterScore },
          memory: { base: traits.memory, score: memoryScore },
          jointPlan: jointResult
        };

        // 결과 저장
        await client.query(
          'INSERT INTO game_results (game_id, player_state_id, total_score, breakdown) VALUES ($1, $2, $3, $4)',
          [gameId, playerState.id, totalScore, JSON.stringify(breakdown)]
        );

        // 구매한 카드 조회
        const purchasedResult = await client.query(
          `SELECT c.* FROM purchased p
           JOIN cards c ON p.card_id = c.id
           WHERE p.player_state_id = $1`,
          [playerState.id]
        );

        results.push({
          playerId: playerState.player_id,
          totalScore,
          breakdown,
          money: playerState.money,
          memoryScore,
          purchasedCards: purchasedResult.rows,
          rank: 0 // 임시값, 아래에서 설정
        });
      }

      // 순위 정렬 (동률 규정: 1순위 추억, 2순위 TC)
      results.sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        if (b.memoryScore !== a.memoryScore) {
          return b.memoryScore - a.memoryScore;
        }
        return b.money - a.money;
      });
      
      results.forEach((r, index) => {
        r.rank = index + 1;
      });

      // 게임 상태 업데이트
      await client.query(
        'UPDATE games SET status = $1 WHERE id = $2',
        ['finished', gameId]
      );

      return results;
    } finally {
      client.release();
    }
  }

  // 소프트 리셋
  async softReset(roomId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 현재 게임 조회
      const gameResult = await client.query(
        'SELECT id FROM games WHERE room_id = $1 ORDER BY created_at DESC LIMIT 1',
        [roomId]
      );

      if (gameResult.rows.length === 0) {
        throw new Error('게임을 찾을 수 없습니다');
      }

      const gameId = gameResult.rows[0].id;

      // 게임 관련 데이터 삭제 (CASCADE로 자동 삭제됨)
      await client.query('DELETE FROM games WHERE id = $1', [gameId]);

      // 방 상태를 대기로 변경
      await client.query(
        'UPDATE rooms SET status = $1 WHERE id = $2',
        ['waiting', roomId]
      );

      // 플레이어 목록은 유지됨

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 결과 창 닫기 신호 수집
  private resultClosedSignals: Map<string, Set<string>> = new Map(); // gameId -> Set<playerId>

  async recordResultClosed(gameId: string, playerId: string): Promise<boolean> {
    if (!this.resultClosedSignals.has(gameId)) {
      this.resultClosedSignals.set(gameId, new Set());
    }

    const signals = this.resultClosedSignals.get(gameId)!;
    signals.add(playerId);

    // 모든 플레이어가 닫았는지 확인
    const playerCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM player_states WHERE game_id = $1',
      [gameId]
    );
    const totalPlayers = parseInt(playerCountResult.rows[0].count);

    if (signals.size >= totalPlayers) {
      this.resultClosedSignals.delete(gameId);
      return true; // 모두 닫음
    }

    return false;
  }
}

export const gameFinalizationService = new GameFinalizationService();
