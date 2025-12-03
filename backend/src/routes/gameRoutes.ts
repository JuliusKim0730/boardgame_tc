import { Router } from 'express';
import { TurnService } from '../services/TurnService';
import { turnManager } from '../services/TurnManager';
import { chanceService } from '../services/ChanceService';
import { jointPlanService } from '../services/JointPlanService';
import { gameFinalizationService } from '../services/GameFinalizationService';
import { pool } from '../db/pool';
import { Server } from 'socket.io';

const router = Router();
const turnService = new TurnService();

let io: Server;

export function setSocketIO(socketIO: Server) {
  io = socketIO;
  turnService.setSocketIO(socketIO);
}

// 이동
router.post('/games/:gameId/move', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, position } = req.body;
    await turnService.move(gameId, playerId, position);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 행동
router.post('/games/:gameId/action', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, actionType } = req.body;
    const result = await turnService.performAction(gameId, playerId, actionType);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 턴 종료
router.post('/games/:gameId/end-turn', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;
    const result = await turnManager.endTurn(gameId, playerId);
    
    // 다음 턴 시작 알림
    if (result.nextPlayerId && io) {
      const roomResult = await pool.query(
        'SELECT room_id, day FROM games WHERE id = $1',
        [gameId]
      );
      const roomId = roomResult.rows[0].room_id;
      const currentDay = roomResult.rows[0].day;
      
      io.to(roomId).emit('turn-started', {
        playerId: result.nextPlayerId,
        day: currentDay
      });
    }
    
    // 게임 종료 알림
    if (result.isGameEnd && io) {
      const roomResult = await pool.query(
        'SELECT room_id FROM games WHERE id = $1',
        [gameId]
      );
      const roomId = roomResult.rows[0].room_id;
      
      io.to(roomId).emit('game-ended', { gameId });
    }
    
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 찬스 카드 실행
router.post('/games/:gameId/chance/:cardCode', async (req, res) => {
  try {
    const { gameId, cardCode } = req.params;
    const { playerId } = req.body;
    const result = await chanceService.executeChance(gameId, playerId, cardCode);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 찬스 상호작용 응답
router.post('/games/:gameId/chance-response', async (req, res) => {
  try {
    const { interactionId, response } = req.body;
    await chanceService.respondToInteraction(interactionId, response);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 공동 계획 기여
router.post('/games/:gameId/contribute', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, amount } = req.body;
    await jointPlanService.contribute(gameId, playerId, amount);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 공동 계획 현황 조회
router.get('/games/:gameId/joint-plan', async (req, res) => {
  try {
    const { gameId } = req.params;
    const status = await jointPlanService.getContributionStatus(gameId);
    res.json(status);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 최종 구매
router.post('/games/:gameId/final-purchase', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, cardIds } = req.body;
    await gameFinalizationService.finalPurchase(gameId, playerId, cardIds);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 최종 정산
router.post('/games/:gameId/finalize', async (req, res) => {
  try {
    const { gameId } = req.params;
    const results = await gameFinalizationService.calculateFinalScore(gameId);
    res.json(results);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 결과 창 닫기
router.post('/games/:gameId/result-closed', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;
    const allClosed = await gameFinalizationService.recordResultClosed(gameId, playerId);
    res.json({ allClosed });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 비주류 특성 변환
router.post('/games/:gameId/convert-traits', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, conversions } = req.body;
    await gameFinalizationService.convertMinorTraits(gameId, playerId, conversions);
    res.json({ success: true, conversions });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 2인 전용 찬스 칸 선택
router.post('/games/:gameId/chance-option', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, option } = req.body; // 'card' or 'money'
    
    if (option === 'money') {
      // 500TC 지급
      await turnService.applyMoneyBonus(gameId, playerId, 500);
      res.json({ success: true, option: 'money', amount: 500 });
    } else if (option === 'card') {
      // 찬스 카드 드로우
      const result = await turnService.drawChanceCard(gameId, playerId);
      res.json({ success: true, option: 'card', card: result.card });
    } else {
      res.status(400).json({ error: '잘못된 옵션입니다' });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 결심 토큰 회복 체크 (7일차 시작 시)
router.post('/games/:gameId/check-resolve-recovery', async (req, res) => {
  try {
    const { gameId } = req.params;
    await turnService.checkResolveTokenRecovery(gameId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 결심 토큰 사용
router.post('/games/:gameId/use-resolve-token', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, actionType } = req.body;
    const result = await turnService.useResolveToken(gameId, playerId, actionType);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 안전한 JSON 파싱 헬퍼
function safeParseJSON(data: any, fieldName: string = 'data'): any {
  if (!data) {
    return {};
  }
  if (typeof data === 'object') {
    return data;
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error(`${fieldName} 파싱 실패:`, error);
      return {};
    }
  }
  return {};
}

// 게임 상태 조회
router.get('/games/:gameId/state', async (req, res) => {
  try {
    const { gameId } = req.params;
    const client = await pool.connect();
    
    try {
      // 게임 정보
      const gameResult = await client.query(
        'SELECT * FROM games WHERE id = $1',
        [gameId]
      );
      
      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: '게임을 찾을 수 없습니다' });
      }
      
      const game = gameResult.rows[0];
      
      // 플레이어 상태들
      const playersResult = await client.query(
        `SELECT ps.*, p.id as player_id, u.nickname
         FROM player_states ps
         JOIN players p ON ps.player_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE ps.game_id = $1
         ORDER BY ps.turn_order`,
        [gameId]
      );
      
      // 각 플레이어의 여행지 카드 및 손패 조회
      const playersWithTravelCards = await Promise.all(
        playersResult.rows.map(async (player) => {
          // 여행지 카드 조회
          const travelCardResult = await client.query(
            `SELECT c.* FROM purchased pu
             JOIN cards c ON pu.card_id = c.id
             WHERE pu.player_state_id = $1 AND c.type = 'travel'
             LIMIT 1`,
            [player.id]
          );
          
          let travelCard = null;
          if (travelCardResult.rows.length > 0) {
            const card = travelCardResult.rows[0];
            travelCard = {
              ...card,
              effects: safeParseJSON(card.effects, 'travelCard.effects'),
              metadata: safeParseJSON(card.metadata, 'travelCard.metadata')
            };
          }
          
          // 손패 조회
          const handCardsResult = await client.query(
            `SELECT c.id, c.code, c.name, c.type, c.cost, c.effects, c.metadata
             FROM hands h
             JOIN cards c ON h.card_id = c.id
             WHERE h.player_state_id = $1
             ORDER BY h.seq`,
            [player.id]
          );
          
          const handCards = handCardsResult.rows.map(card => ({
            ...card,
            effects: safeParseJSON(card.effects, 'handCard.effects'),
            metadata: safeParseJSON(card.metadata, 'handCard.metadata')
          }));
          
          return {
            ...player,
            traits: safeParseJSON(player.traits, 'player.traits'),
            travelCard,
            hand_cards: handCards
          };
        })
      );
      
      // 공동 목표 현황
      const jointPlanResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM joint_plan_contributions
         WHERE game_id = $1`,
        [gameId]
      );
      
      // 공동 계획 카드 정보 조회
      let jointPlanCard = null;
      if (game.joint_plan_card_id) {
        const jointCardResult = await client.query(
          'SELECT id, code, name, type, cost, effects, metadata FROM cards WHERE id = $1',
          [game.joint_plan_card_id]
        );
        if (jointCardResult.rows.length > 0) {
          const card = jointCardResult.rows[0];
          jointPlanCard = {
            ...card,
            effects: safeParseJSON(card.effects, 'jointPlan.effects'),
            metadata: safeParseJSON(card.metadata, 'jointPlan.metadata')
          };
        }
      }
      
      res.json({
        game: {
          id: game.id,
          day: game.day,
          status: game.status,
          currentTurnPlayerId: game.current_turn_player_id,
          travelTheme: game.travel_theme,
          jointPlanCardId: game.joint_plan_card_id
        },
        players: playersWithTravelCards,
        jointPlan: {
          card: jointPlanCard,
          total: parseInt(jointPlanResult.rows[0].total),
          target: 10000
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 플레이어 상태 조회
router.get('/games/:gameId/players/:playerId', async (req, res) => {
  try {
    const { gameId, playerId } = req.params;
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT ps.*, 
         (SELECT json_agg(json_build_object('id', c.id, 'code', c.code, 'name', c.name, 'cost', c.cost, 'effects', c.effects))
          FROM hands h
          JOIN cards c ON h.card_id = c.id
          WHERE h.player_state_id = ps.id
          ORDER BY h.seq) as hand_cards
         FROM player_states ps
         WHERE ps.game_id = $1 AND ps.player_id = $2`,
        [gameId, playerId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: '플레이어를 찾을 수 없습니다' });
      }
      
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;


// 이벤트 로그 조회
router.get('/games/:gameId/logs', async (req, res) => {
  try {
    const { gameId } = req.params;
    const client = await pool.connect();
    
    try {
      const logsResult = await client.query(
        `SELECT 
          el.id,
          el.event_type,
          el.data,
          el.created_at,
          u.nickname
         FROM event_logs el
         LEFT JOIN player_states ps ON (el.data->>'playerId')::uuid = ps.player_id AND ps.game_id = el.game_id
         LEFT JOIN players p ON ps.player_id = p.id
         LEFT JOIN users u ON p.user_id = u.id
         WHERE el.game_id = $1
         ORDER BY el.created_at DESC
         LIMIT 50`,
        [gameId]
      );
      
      res.json({ logs: logsResult.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
