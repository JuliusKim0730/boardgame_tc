import { Router, Request, Response } from 'express';
import { turnService } from '../services/TurnService';
import { turnManager } from '../services/TurnManager';
import { chanceService } from '../services/ChanceService';
import { jointPlanService } from '../services/JointPlanService';
import { gameFinalizationService } from '../services/GameFinalizationService';
import { getTurnInfo } from '../services/TurnState';
import { pool } from '../db/pool';
import { maxConversions, multipliersFromTravelCard, parseJSON, scorePlayer, Traits } from '../game/rules';
import { Server } from 'socket.io';

const router = Router();

export function setSocketIO(socketIO: Server) {
  turnService.setSocketIO(socketIO);
  gameFinalizationService.setSocketIO(socketIO);
}

/** 공통 에러 처리: 규칙 위반 등은 400 + 한국어 메시지 */
const handle =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  async (req: Request, res: Response) => {
    try {
      const data = await fn(req, res);
      if (!res.headersSent) res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

// 이동
router.post(
  '/games/:gameId/move',
  handle(async (req) => {
    await turnService.move(req.params.gameId, req.body.playerId, Number(req.body.position));
    return { success: true };
  })
);

// 행동 (주 행동 또는 추가 행동)
router.post(
  '/games/:gameId/action',
  handle((req) => turnService.performAction(req.params.gameId, req.body.playerId, Number(req.body.actionType)))
);

// 추가 행동 (찬스 카드 효과) - /action과 동일한 검증을 거친다
router.post(
  '/games/:gameId/extra-action',
  handle((req) => turnService.performAction(req.params.gameId, req.body.playerId, Number(req.body.actionType)))
);

// 2인 전용 찬스 칸 선택
router.post(
  '/games/:gameId/chance-option',
  handle(async (req) => {
    const { playerId, option } = req.body;
    if (option !== 'card' && option !== 'money') throw new Error('잘못된 옵션입니다');
    const result = await turnService.chanceOption(req.params.gameId, playerId, option);
    return { ...result, option };
  })
);

// 결심 토큰 사용 → 추가 행동 권한 부여
router.post(
  '/games/:gameId/use-resolve-token',
  handle((req) =>
    turnService.useResolveToken(
      req.params.gameId,
      req.body.playerId,
      req.body.actionType !== undefined ? Number(req.body.actionType) : undefined
    )
  )
);

// 결심 토큰 회복은 7일차 시작 시 서버가 자동 처리 (하위 호환용)
router.post('/games/:gameId/check-resolve-recovery', (_req, res) => {
  res.json({ success: true });
});

// 턴 종료
router.post(
  '/games/:gameId/end-turn',
  handle((req) => turnManager.endTurn(req.params.gameId, req.body.playerId))
);

// 찬스 상호작용 응답
const respond = handle(async (req) => {
  await chanceService.respondToInteraction(req.body.interactionId, req.body.response || {});
  return { success: true };
});
router.post('/games/:gameId/chance-response', respond);
router.post('/chance/respond', respond);

// CH16: 버린만큼 뽑기
router.post(
  '/games/:gameId/discard-and-draw',
  handle((req) => chanceService.executeDiscardAndDraw(req.params.gameId, req.body.playerId, req.body.cardIds || []))
);

// CH17: 공동 목표 카드 선택
router.post(
  '/games/:gameId/select-joint-plan',
  handle(async (req) => {
    const card = await chanceService.selectJointPlan(req.params.gameId, req.body.playerId, req.body.cardId);
    return { success: true, card };
  })
);

// 공동 목표 기여는 최종 결산에서 비공개로 동시에 진행 (룰북 8)
router.post('/games/:gameId/contribute', (_req, res) => {
  res.status(400).json({ error: '공동 목표 기여는 14일차 이후 최종 결산에서 진행합니다' });
});

router.get(
  '/games/:gameId/joint-plan',
  handle((req) => jointPlanService.getContributionStatus(req.params.gameId))
);

router.get(
  '/cards/joint-plan',
  handle(async () => {
    const result = await pool.query(`SELECT id, code, name, cost, effects, metadata FROM cards WHERE type = 'joint' ORDER BY code`);
    return result.rows;
  })
);

// 최종 제출: 구매할 카드 + 공동 목표 기여(비공개) + 비주류 특성 변환
router.post(
  '/games/:gameId/final-purchase',
  handle(async (req) => {
    const { playerId, cardIds, contribution, conversions } = req.body;
    const result = await gameFinalizationService.finalPurchase(req.params.gameId, playerId, {
      cardIds: cardIds || [],
      contribution,
      conversions,
    });
    return { success: true, ...result };
  })
);

// 최종 결과 조회 (모두 제출한 뒤에만)
router.post(
  '/games/:gameId/finalize',
  handle(async (req, res) => {
    const game = await pool.query('SELECT status FROM games WHERE id = $1', [req.params.gameId]);
    if (game.rows[0]?.status !== 'finished') {
      const submitted = await gameFinalizationService.getSubmittedPlayers(req.params.gameId);
      res.status(409).json({ error: '아직 최종 결산이 끝나지 않았습니다', submitted });
      return;
    }
    return gameFinalizationService.getResults(req.params.gameId);
  })
);

router.post(
  '/games/:gameId/result-closed',
  handle(async (req) => ({
    allClosed: await gameFinalizationService.recordResultClosed(req.params.gameId, req.body.playerId),
  }))
);

// 비주류 특성 변환은 최종 제출에 포함 (점수 확정 전에 적용되어야 함)
router.post('/games/:gameId/convert-traits', (_req, res) => {
  res.status(400).json({ error: '특성 변환은 최종 결산 제출 시 함께 선택합니다' });
});

// 게임 상태 조회
router.get(
  '/games/:gameId/state',
  handle(async (req, res) => {
    const { gameId } = req.params;
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
    if (gameResult.rows.length === 0) {
      res.status(404).json({ error: '게임을 찾을 수 없습니다' });
      return;
    }
    const game = gameResult.rows[0];

    const playersResult = await pool.query(
      `SELECT ps.*, p.is_ai, u.nickname
         FROM player_states ps
         JOIN players p ON ps.player_id = p.id
         JOIN users u ON p.user_id = u.id
        WHERE ps.game_id = $1
        ORDER BY ps.turn_order`,
      [gameId]
    );
    const submitted = await gameFinalizationService.getSubmittedPlayers(gameId);

    const players = await Promise.all(
      playersResult.rows.map(async (player: any) => {
        const travel = await pool.query(
          `SELECT c.* FROM purchased pu JOIN cards c ON pu.card_id = c.id
            WHERE pu.player_state_id = $1 AND c.type = 'travel' LIMIT 1`,
          [player.id]
        );
        const travelCard = travel.rows[0] || null;
        const hand = await pool.query(
          `SELECT h.id AS hand_id, h.seq, c.id, c.code, c.name, c.type, c.cost, c.effects, c.metadata
             FROM hands h JOIN cards c ON h.card_id = c.id
            WHERE h.player_state_id = $1 ORDER BY h.seq`,
          [player.id]
        );
        const acquired = await pool.query(
          `SELECT c.id, c.code, c.name, c.type, c.cost, c.effects FROM purchased pu JOIN cards c ON pu.card_id = c.id
            WHERE pu.player_state_id = $1 AND c.type <> 'travel' ORDER BY pu.purchased_at`,
          [player.id]
        );
        const traits = parseJSON<Traits>(player.traits, {});
        const multipliers = multipliersFromTravelCard(travelCard);
        return {
          ...player,
          traits,
          travelCard,
          multipliers,
          currentScore: scorePlayer(traits, multipliers).totalScore,
          maxConversions: maxConversions(traits, multipliers),
          hand_cards: hand.rows,
          acquired_cards: acquired.rows,
          finalSubmitted: submitted.includes(player.player_id),
        };
      })
    );

    let turn = null;
    const current = players.find((p: any) => p.player_id === game.current_turn_player_id);
    if (current) {
      const info = await getTurnInfo(pool, current.id);
      turn = {
        playerId: current.player_id,
        moved: info.moved,
        mainDone: info.mainDone,
        lastAction: info.lastAction,
        pendingExtraActions: info.pendingCredits,
        forcedMove: !!current.forced_move,
      };
    }

    const joint = await jointPlanService.getContributionStatus(gameId);
    return {
      game: {
        id: game.id,
        day: game.day,
        status: game.status,
        currentTurnPlayerId: game.current_turn_player_id,
        jointPlanCardId: game.joint_plan_card_id,
      },
      turn,
      players,
      jointPlan: {
        card: joint.card,
        total: joint.totalAmount,
        target: joint.targetAmount,
      },
      finalSubmitted: submitted,
    };
  })
);

// 플레이어 상태 조회
router.get(
  '/games/:gameId/players/:playerId',
  handle(async (req, res) => {
    const result = await pool.query(
      `SELECT ps.*,
         (SELECT json_agg(json_build_object('id', c.id, 'code', c.code, 'name', c.name, 'cost', c.cost, 'effects', c.effects) ORDER BY h.seq)
            FROM hands h JOIN cards c ON h.card_id = c.id WHERE h.player_state_id = ps.id) AS hand_cards
         FROM player_states ps
        WHERE ps.game_id = $1 AND ps.player_id = $2`,
      [req.params.gameId, req.params.playerId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: '플레이어를 찾을 수 없습니다' });
      return;
    }
    return result.rows[0];
  })
);

// 이벤트 로그 조회
router.get(
  '/games/:gameId/logs',
  handle(async (req) => {
    const logs = await pool.query(
      `SELECT el.id, el.event_type, el.data, el.created_at, u.nickname
         FROM event_logs el
         LEFT JOIN players p ON p.id::text = el.data->>'playerId'
         LEFT JOIN users u ON p.user_id = u.id
        WHERE el.game_id = $1
        ORDER BY el.created_at DESC
        LIMIT 50`,
      [req.params.gameId]
    );
    return { logs: logs.rows };
  })
);

export default router;
