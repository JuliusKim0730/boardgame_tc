import { pool } from '../db/pool';
import { Server } from 'socket.io';
import {
  ADJACENCY,
  bestPurchase,
  cardPoints,
  MAX_RESOLVE_TOKENS,
  Multipliers,
  multipliersFromTravelCard,
  parseJSON,
  RESOLVE_RECOVERY_DAY,
  scorePlayer,
  TOTAL_DAYS,
  Traits,
} from '../game/rules';
import { getTurnInfo, getRoomId } from './TurnState';
import type { ChanceChoice, ChoiceType } from './ChanceService';

/**
 * NPC(AI) 전략
 *
 * 사람과 똑같이 TurnService(이동/행동/추가 행동)를 통해서만 플레이한다.
 * 각 행동의 기대 가치(점수 단위)를 계산해 가장 좋은 칸으로 이동한다.
 *
 *  - 점수 가치: 카드 효과 × 내 여행지 가중치 (+추억)
 *  - TC 가치 λ: 손패 중 예산이 모자라 못 사는 카드의 '점수/TC' 효율
 *    (돈이 넉넉하면 λ가 낮아져 계획 카드 수집 쪽으로, 부족하면 집안일/지원 쪽으로 기운다)
 *  - 덱 기대값: 남은 덱 카드들의 평균 효과로 계산 (카드 카운팅)
 *  - 1칸 앞을 내다보는 탐색: 이동할 칸 가치 + 0.35 × 다음 턴 최선의 칸 가치
 *  - 결심 토큰: 1~6일차에는 아껴 7일차 회복(+1)을 받고, 이후 가치가 큰 턴에 사용
 *  - 최종 구매: 0/1 배낭 최적화, 남는 TC는 공동 목표에 기여 (3인 이상은 최소 기여 패널티 회피)
 */

interface CardRow {
  id: string;
  code: string;
  name: string;
  type: string;
  cost: number;
  effects: Record<string, number>;
  metadata: any;
}

interface Context {
  gameId: string;
  playerId: string;
  day: number;
  playerCount: number;
  state: any;
  multipliers: Multipliers;
  hand: CardRow[];
  decks: Record<string, CardRow[]>;
  lambda: number;
  houseVisited: boolean;
  tokenUsedEarly: boolean;
}

const LOOKAHEAD = 0.35;
const TOKEN_USE_THRESHOLD = 3;

export class AIPlayerService {
  private io: Server | null = null;
  private cardCache: Map<string, CardRow> | null = null;

  setSocketIO(io: Server) {
    this.io = io;
  }

  /** AI 턴 1회 실행: 이동 → 행동 → (추가 행동) → 턴 종료 */
  async executeTurn(gameId: string, playerId: string): Promise<void> {
    const { turnService } = await import('./TurnService');
    const { turnManager } = await import('./TurnManager');

    let ctx = await this.loadContext(gameId, playerId);

    if (!ctx.state.forced_move) {
      const target = this.chooseMove(ctx);
      await turnService.move(gameId, playerId, target);
      ctx.state.position = target;
    }

    const action = ctx.state.position === 6 ? this.bestAction(ctx, [1, 2, 3, 4, 5]) : ctx.state.position;
    const option = action === 5 && ctx.playerCount === 2 ? this.twoPlayerChanceOption(ctx) : undefined;
    await turnService.performAction(gameId, playerId, action, option);

    // 찬스 카드로 얻은 추가 행동, 결심 토큰 사용
    for (let guard = 0; guard < 5; guard++) {
      ctx = await this.loadContext(gameId, playerId);
      const info = await getTurnInfo(pool, ctx.state.id);
      const credit = info.pendingCredits[0];
      if (credit) {
        const candidates = credit.fixedAction
          ? [credit.fixedAction]
          : [1, 2, 3, 4, 5].filter((a) => credit.allowRepeat || a !== info.lastAction);
        const extra = this.bestAction(ctx, candidates);
        const extraOption = extra === 5 && ctx.playerCount === 2 ? this.twoPlayerChanceOption(ctx) : undefined;
        await turnService.performAction(gameId, playerId, extra, extraOption);
        continue;
      }
      const extraCandidates = [1, 2, 3, 4, 5].filter((a) => a !== info.lastAction);
      if (this.shouldUseResolveToken(ctx, extraCandidates)) {
        await turnService.useResolveToken(gameId, playerId);
        continue;
      }
      break;
    }

    await turnManager.endTurn(gameId, playerId);
  }

  // ---------------------------------------------------------------------------
  // 의사결정
  // ---------------------------------------------------------------------------

  private chooseMove(ctx: Context): number {
    const options = (ADJACENCY[ctx.state.position] || []).filter((c) => c !== ctx.state.last_position);
    let best = options[0];
    let bestScore = -Infinity;
    for (const cell of options) {
      const now = this.cellValue(ctx, cell);
      const next = Math.max(...(ADJACENCY[cell] || []).map((c) => this.cellValue(ctx, c)));
      const score = now + (ctx.day < TOTAL_DAYS ? LOOKAHEAD * next : 0) + Math.random() * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = cell;
      }
    }
    return best;
  }

  private cellValue(ctx: Context, cell: number): number {
    return cell === 6 ? Math.max(...[1, 2, 3, 4, 5].map((a) => this.actionValue(ctx, a))) : this.actionValue(ctx, cell);
  }

  private bestAction(ctx: Context, candidates: number[]): number {
    return candidates.reduce((best, a) => (this.actionValue(ctx, a) > this.actionValue(ctx, best) ? a : best));
  }

  /** 행동 1회의 기대 가치 (점수 단위) */
  actionValue(ctx: Context, action: number): number {
    const avg = (cards: CardRow[], f: (c: CardRow) => number) =>
      cards.length ? cards.reduce((s, c) => s + f(c), 0) / cards.length : 0;
    const pts = (c: CardRow) => cardPoints(c.effects, ctx.multipliers);

    switch (action) {
      case 1:
        return avg(ctx.decks.freeplan, pts);
      case 2: {
        // 계획 카드는 나중에 TC를 내야 하므로 (점수 - TC 기회비용)의 기대값
        const planDeck = ctx.decks.plan.length ? ctx.decks.plan : ctx.decks.planAll;
        return avg(planDeck, (c) => Math.max(0, pts(c) - ctx.lambda * c.cost)) + 0.3;
      }
      case 3: {
        const bonus = ctx.playerCount === 2 && !ctx.houseVisited ? 500 : 0;
        return ctx.lambda * (avg(ctx.decks.house, (c) => c.effects.money || 0) + bonus);
      }
      case 4:
        return ctx.lambda * avg(ctx.decks.support, (c) => c.effects.money || 0);
      case 5: {
        // 찬스: 돈 카드 + 계획/추억/추가 행동 카드가 섞인 덱의 대략적 기대값
        const chanceEV = ctx.lambda * 900 + 1.2;
        return ctx.playerCount === 2 ? Math.max(chanceEV, ctx.lambda * 500) : chanceEV;
      }
      default:
        return 0;
    }
  }

  private twoPlayerChanceOption(ctx: Context): 'card' | 'money' {
    return ctx.lambda * 500 > ctx.lambda * 900 + 1.2 ? 'money' : 'card';
  }

  private shouldUseResolveToken(ctx: Context, candidates: number[]): boolean {
    const tokens = ctx.state.resolve_token;
    if (tokens <= 0 || candidates.length === 0) return false;
    // 1~6일차에 한 번도 안 쓰면 7일차에 +1 → 그 전까지는 아낀다 (이미 최대치면 아낄 이유 없음)
    if (ctx.day < RESOLVE_RECOVERY_DAY && !ctx.tokenUsedEarly && tokens < MAX_RESOLVE_TOKENS) return false;
    const remainingTurns = TOTAL_DAYS - ctx.day + 1;
    const best = Math.max(...candidates.map((a) => this.actionValue(ctx, a)));
    return tokens >= remainingTurns || best >= TOKEN_USE_THRESHOLD || ctx.day === TOTAL_DAYS;
  }

  /** 찬스 카드 대상/카드 선택 */
  async chooseForChance(gameId: string, playerId: string, type: ChoiceType): Promise<ChanceChoice | null> {
    const ctx = await this.loadContext(gameId, playerId);
    const opponents = await this.loadOpponents(gameId, playerId);
    if (opponents.length === 0) return null;
    const pts = (c: CardRow) => cardPoints(c.effects, ctx.multipliers);
    const value = (c: CardRow) => pts(c) - ctx.lambda * c.cost;

    switch (type) {
      case 'shared_house':
      case 'shared_invest':
      case 'buddy_action': {
        // 함께 이득을 보는 카드: 현재 점수가 가장 낮은 상대를 골라 선두를 돕지 않는다
        const weakest = [...opponents].sort((a, b) => a.estimate - b.estimate)[0];
        return { targetId: weakest.playerId };
      }
      case 'purchase_request': {
        let best: { targetId: string; cardId: string; v: number } | null = null;
        for (const o of opponents) {
          for (const c of o.hand) {
            const v = value(c) - ctx.lambda * 1000;
            if (!best || v > best.v) best = { targetId: o.playerId, cardId: c.id, v };
          }
        }
        return best && best.v > 0 ? { targetId: best.targetId, cardId: best.cardId } : null;
      }
      case 'card_exchange': {
        if (ctx.hand.length === 0) return null;
        const worst = [...ctx.hand].sort((a, b) => value(a) - value(b))[0];
        let best: { targetId: string; cardId: string; v: number } | null = null;
        for (const o of opponents) {
          for (const c of o.hand) {
            const v = value(c) - value(worst);
            if (!best || v > best.v) best = { targetId: o.playerId, cardId: c.id, v };
          }
        }
        return best && best.v > 0
          ? { targetId: best.targetId, requesterCardId: worst.id, targetCardId: best.cardId }
          : null;
      }
      case 'swap_position': {
        // 다음 턴에 갈 수 있는 칸이 가장 좋은 상대의 자리로
        const scored = opponents.map((o) => ({
          o,
          v: Math.max(...(ADJACENCY[o.position] || []).map((c) => this.cellValue(ctx, c))),
        }));
        scored.sort((a, b) => b.v - a.v);
        return { targetId: scored[0].o.playerId };
      }
      default:
        return { targetId: opponents[0].playerId };
    }
  }

  /** CH16: 기대 드로우 가치보다 낮은 카드를 버린다 */
  async chooseDiscards(gameId: string, playerId: string): Promise<string[]> {
    const ctx = await this.loadContext(gameId, playerId);
    const drawValue = this.actionValue(ctx, 2);
    return ctx.hand
      .filter((c) => cardPoints(c.effects, ctx.multipliers) - ctx.lambda * c.cost < drawValue)
      .map((c) => c.id);
  }

  /** CH17: 달성 가능성 × 내 점수 이득이 큰 공동 목표 선택 */
  async chooseJointPlan(gameId: string, playerId: string, options: string[]): Promise<string> {
    const ctx = await this.loadContext(gameId, playerId);
    const cards = await this.cards();
    const current = await pool.query(
      'SELECT COALESCE(SUM(amount), 0)::int AS total FROM joint_plan_contributions WHERE game_id = $1',
      [gameId]
    );
    const expectedPool = current.rows[0].total + ctx.playerCount * 2500;
    const score = (id: string) => {
      const card = cards.get(id)!;
      const chance = Math.min(1, expectedPool / Math.max(1, card.cost));
      return cardPoints(card.effects, ctx.multipliers) * chance;
    };
    return options.reduce((a, b) => (score(b) > score(a) ? b : a));
  }

  /** 최종 결산 제출 내용 결정 (구매 / 공동 목표 기여 / 변환) */
  async decideFinal(gameId: string, playerId: string): Promise<{ cardIds: string[]; contribution: number; conversions: number }> {
    const ctx = await this.loadContext(gameId, playerId);
    const items = ctx.hand.map((c) => ({ id: c.id, cost: c.cost, value: cardPoints(c.effects, ctx.multipliers) }));
    const chosen = bestPurchase(items, ctx.state.money);
    const spent = chosen.reduce((s, c) => s + c.cost, 0);
    const leftover = ctx.state.money - spent;

    const { jointPlanService } = await import('./JointPlanService');
    const status = await jointPlanService.getContributionStatus(gameId);
    const remaining = Math.max(0, status.targetAmount - status.totalAmount);
    const roundUp = (v: number) => Math.ceil(v / 500) * 500;
    // 남는 TC는 동률 판정 외에 쓸모가 없으므로 공동 목표에 넉넉히 보탠다
    let contribution = remaining > 0 ? roundUp((remaining / ctx.playerCount) * 1.5) : 0;
    if (ctx.playerCount >= 3) contribution = Math.max(contribution, 1000); // 최소 기여 패널티 회피
    contribution = Math.min(leftover, contribution);

    // 비주류 특성 변환은 총점을 항상 2점 낮추므로 하지 않는다
    return { cardIds: chosen.map((c) => c.id), contribution: Math.max(0, contribution), conversions: 0 };
  }

  // ---------------------------------------------------------------------------
  // 상태 로드
  // ---------------------------------------------------------------------------

  private async cards(): Promise<Map<string, CardRow>> {
    if (!this.cardCache) {
      const rows = await pool.query('SELECT id, code, name, type, cost, effects, metadata FROM cards');
      this.cardCache = new Map(
        rows.rows.map((r: any) => [
          r.id,
          { ...r, cost: r.cost || 0, effects: parseJSON(r.effects, {}), metadata: parseJSON(r.metadata, {}) },
        ])
      );
    }
    return this.cardCache;
  }

  private async loadContext(gameId: string, playerId: string): Promise<Context> {
    const cards = await this.cards();
    const game = await pool.query('SELECT day FROM games WHERE id = $1', [gameId]);
    const stateRes = await pool.query('SELECT * FROM player_states WHERE game_id = $1 AND player_id = $2', [
      gameId,
      playerId,
    ]);
    const state = stateRes.rows[0];
    const count = await pool.query('SELECT COUNT(*)::int AS n FROM player_states WHERE game_id = $1', [gameId]);

    const travel = await pool.query(
      `SELECT c.metadata FROM purchased pu JOIN cards c ON c.id = pu.card_id
        WHERE pu.player_state_id = $1 AND c.type = 'travel' LIMIT 1`,
      [state.id]
    );
    const multipliers = multipliersFromTravelCard(travel.rows[0]);

    const handRes = await pool.query(
      `SELECT h.card_id FROM hands h JOIN cards c ON c.id = h.card_id WHERE h.player_state_id = $1 AND c.type = 'plan'`,
      [state.id]
    );
    const hand = handRes.rows.map((r: any) => cards.get(r.card_id)!).filter(Boolean);

    const deckRes = await pool.query('SELECT type, card_order FROM decks WHERE game_id = $1', [gameId]);
    const decks: Record<string, CardRow[]> = { plan: [], freeplan: [], house: [], support: [], chance: [] };
    for (const row of deckRes.rows) {
      decks[row.type] = parseJSON<string[]>(row.card_order, [])
        .map((id) => cards.get(id)!)
        .filter(Boolean);
    }
    decks.planAll = [...cards.values()].filter((c) => c.type === 'plan');
    for (const type of ['house', 'support']) {
      if (decks[type].length === 0) decks[type] = [...cards.values()].filter((c) => c.type === type);
    }

    const flags = await pool.query(
      `SELECT
         EXISTS(SELECT 1 FROM event_logs WHERE game_id = $1 AND event_type = 'action_3' AND data->>'playerId' = $2) AS house,
         EXISTS(SELECT 1 FROM event_logs WHERE game_id = $1 AND event_type = 'resolve_token_used' AND data->>'playerId' = $2) AS token`,
      [gameId, playerId]
    );

    const day = game.rows[0].day;
    const lambda = this.moneyValue(state.money, day, hand, multipliers, decks.planAll);

    return {
      gameId,
      playerId,
      day,
      playerCount: count.rows[0].n,
      state,
      multipliers,
      hand,
      decks,
      lambda,
      houseVisited: flags.rows[0].house,
      tokenUsedEarly: flags.rows[0].token,
    };
  }

  /** 1TC의 점수 가치 λ */
  private moneyValue(money: number, day: number, hand: CardRow[], m: Multipliers, planAll: CardRow[]): number {
    const expectedIncome = Math.max(0, TOTAL_DAYS - day) * 700;
    const budget = money + expectedIncome;
    const items = hand.map((c) => ({ id: c.id, cost: c.cost, value: cardPoints(c.effects, m) }));
    const funded = new Set(bestPurchase(items, budget).map((c) => c.id));
    const unfunded = items.filter((c) => c.value > 0 && !funded.has(c.id));
    const ratios = planAll.map((c) => cardPoints(c.effects, m) / c.cost).sort((a, b) => b - a);
    const deckRatio = ratios.slice(0, Math.ceil(ratios.length / 3)).reduce((s, r) => s + r, 0) / Math.ceil(ratios.length / 3);
    if (unfunded.length > 0) return Math.max(...unfunded.map((c) => c.value / c.cost));
    // 손패를 다 살 수 있으면 앞으로 뽑을 좋은 카드를 위한 여유 자금 가치만 남는다
    return deckRatio * 0.6;
  }

  private async loadOpponents(gameId: string, playerId: string) {
    const cards = await this.cards();
    const rows = await pool.query(
      `SELECT ps.id, ps.player_id, ps.position, ps.traits, ps.money,
              (SELECT c.metadata FROM purchased pu JOIN cards c ON c.id = pu.card_id
                WHERE pu.player_state_id = ps.id AND c.type = 'travel' LIMIT 1) AS travel_metadata
         FROM player_states ps WHERE ps.game_id = $1 AND ps.player_id <> $2`,
      [gameId, playerId]
    );
    const result = [];
    for (const r of rows.rows) {
      const hand = await pool.query(
        `SELECT h.card_id FROM hands h JOIN cards c ON c.id = h.card_id WHERE h.player_state_id = $1 AND c.type = 'plan'`,
        [r.id]
      );
      const multipliers = multipliersFromTravelCard({ metadata: r.travel_metadata });
      result.push({
        playerId: r.player_id as string,
        position: r.position as number,
        hand: hand.rows.map((h: any) => cards.get(h.card_id)!).filter(Boolean),
        estimate: scorePlayer(parseJSON<Traits>(r.traits, {}), multipliers).totalScore + r.money / 1500,
      });
    }
    return result;
  }

  async notifyError(gameId: string, playerId: string, error: any) {
    const roomId = await getRoomId(gameId);
    if (this.io && roomId) {
      this.io.to(roomId).emit('ai-turn-error', {
        gameId,
        playerId,
        error: error?.message || 'AI 턴 실행 중 오류가 발생했습니다',
        timestamp: new Date(),
      });
    }
  }
}

export const aiPlayerService = new AIPlayerService();
