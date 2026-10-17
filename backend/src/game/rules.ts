/**
 * 열네 밤의 꿈 v4.1 핵심 규칙 (DB와 무관한 순수 함수 모음)
 *
 * 점수 계산 / 순위 / 이동 / 추가 행동 / 결심 토큰 규칙을 한 곳에 모아
 * 서비스 코드와 단위 테스트가 같은 구현을 공유하도록 한다.
 */

export const TRAIT_KEYS = ['taste', 'history', 'nature', 'culture', 'leisure', 'water'] as const;
export type TraitKey = typeof TRAIT_KEYS[number];
export type Traits = Partial<Record<TraitKey | 'memory', number>>;
export type Multipliers = Partial<Record<TraitKey, number>>;

export const TRAIT_LABELS: Record<TraitKey | 'memory', string> = {
  taste: '맛',
  history: '역사',
  nature: '자연',
  culture: '문화',
  leisure: '레저',
  water: '물놀이',
  memory: '추억',
};

export const TOTAL_DAYS = 14;
export const START_MONEY = 3000;
export const MAX_RESOLVE_TOKENS = 2;
export const RESOLVE_RECOVERY_DAY = 7;
export const CONVERSION_RATE = 3; // 비주류 특성 3점 → 추억 +1

// 게임판 연결 (1 무료계획, 2 조사하기, 3 집안일, 4 여행지원, 5 찬스, 6 자유행동)
export const ADJACENCY: Record<number, number[]> = {
  1: [2, 3],
  2: [1, 4],
  3: [1, 5],
  4: [2, 5, 6],
  5: [3, 4, 6],
  6: [4, 5],
};

export function parseJSON<T = any>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** 여행지 카드에 없는 특성은 '기타'로 가중치 1배 */
export function getMultiplier(multipliers: Multipliers, trait: TraitKey): number {
  return multipliers[trait] ?? 1;
}

export function multipliersFromTravelCard(card: { metadata?: unknown } | null | undefined): Multipliers {
  if (!card) return {};
  const metadata = parseJSON<any>(card.metadata, {});
  return metadata.multipliers || {};
}

/** 카드 효과(특성/추억)를 특성 객체에 더한다. money 등 다른 키는 무시 */
export function addEffects(traits: Traits, effects: Record<string, unknown>, sign = 1): Traits {
  const next: Traits = { ...traits };
  for (const key of [...TRAIT_KEYS, 'memory'] as const) {
    const value = Number(effects[key] ?? 0);
    if (value) next[key] = (next[key] || 0) + sign * value;
  }
  return next;
}

/** 카드 1장이 이 플레이어에게 주는 점수 (특성 × 가중치 + 추억) */
export function cardPoints(effects: Record<string, unknown>, multipliers: Multipliers): number {
  let points = Number(effects.memory ?? 0);
  for (const trait of TRAIT_KEYS) {
    points += Number(effects[trait] ?? 0) * getMultiplier(multipliers, trait);
  }
  return points;
}

export interface ScoreBreakdown {
  traits: Record<TraitKey, { base: number; multiplier: number; score: number }>;
  traitScore: number;
  memoryScore: number;
  totalScore: number;
}

/** 최종 행복 점수 = Σ(특성 × 여행지 가중치) + 추억 (공동 목표 보너스는 이미 traits에 반영) */
export function scorePlayer(traits: Traits, multipliers: Multipliers): ScoreBreakdown {
  const breakdown = {} as ScoreBreakdown['traits'];
  let traitScore = 0;
  for (const trait of TRAIT_KEYS) {
    const base = traits[trait] || 0;
    const multiplier = getMultiplier(multipliers, trait);
    const score = base * multiplier;
    breakdown[trait] = { base, multiplier, score };
    traitScore += score;
  }
  const memoryScore = traits.memory || 0;
  return { traits: breakdown, traitScore, memoryScore, totalScore: traitScore + memoryScore };
}

/**
 * 동률 규정: 총점 → 추억 → 남은 TC. 모든 항목이 같으면 공동 순위(공동 우승).
 */
export function rankPlayers<T extends { totalScore: number; memoryScore: number; money: number }>(
  results: T[]
): Array<T & { rank: number }> {
  const sorted = [...results].sort(
    (a, b) => b.totalScore - a.totalScore || b.memoryScore - a.memoryScore || b.money - a.money
  );
  const ranked: Array<T & { rank: number }> = [];
  sorted.forEach((r, i) => {
    const prev = ranked[i - 1];
    const tied =
      prev &&
      prev.totalScore === r.totalScore &&
      prev.memoryScore === r.memoryScore &&
      prev.money === r.money;
    ranked.push({ ...r, rank: tied ? prev.rank : i + 1 });
  });
  return ranked;
}

/** 비주류(가중치 1배) 특성 점수 합계 */
export function minorTraitPoints(traits: Traits, multipliers: Multipliers): number {
  return TRAIT_KEYS.filter((t) => getMultiplier(multipliers, t) === 1).reduce(
    (sum, t) => sum + Math.max(0, traits[t] || 0),
    0
  );
}

export function maxConversions(traits: Traits, multipliers: Multipliers): number {
  return Math.floor(minorTraitPoints(traits, multipliers) / CONVERSION_RATE);
}

/**
 * 비주류 특성 3점 → 추억 +1 변환. 3점 단위가 여러 특성에 걸쳐 있어도 된다.
 * (변환은 항상 총점을 2점 낮추므로 동률 규정용 선택지일 뿐이다)
 */
export function applyConversions(traits: Traits, multipliers: Multipliers, conversions: number): Traits {
  if (conversions <= 0) return { ...traits };
  if (conversions > maxConversions(traits, multipliers)) {
    throw new Error('변환 가능한 비주류 특성 점수가 부족합니다');
  }
  const next: Traits = { ...traits };
  let remaining = conversions * CONVERSION_RATE;
  const minor = TRAIT_KEYS.filter((t) => getMultiplier(multipliers, t) === 1).sort(
    (a, b) => (next[b] || 0) - (next[a] || 0)
  );
  for (const trait of minor) {
    const take = Math.min(remaining, next[trait] || 0);
    next[trait] = (next[trait] || 0) - take;
    remaining -= take;
    if (remaining === 0) break;
  }
  next.memory = (next.memory || 0) + conversions;
  return next;
}

/**
 * 자발적 이동 규칙: 연결된 칸으로만, 직전 턴에 행동한 칸으로는 이동 불가.
 * @returns 이동 불가 사유 (가능하면 null)
 */
export function moveError(current: number, target: number, lastActedCell: number | null): string | null {
  const adjacent = ADJACENCY[current] || [];
  if (!adjacent.includes(target)) {
    return `인접한 칸으로만 이동할 수 있습니다. 현재 위치: ${current}, 인접 칸: ${adjacent.join(', ')}`;
  }
  if (lastActedCell !== null && target === lastActedCell) {
    return '직전 턴에 행동한 칸으로는 이동할 수 없습니다';
  }
  return null;
}

/** 해당 칸에서 수행할 수 있는 행동 번호 (6번 자유 행동은 1~5 중 택1) */
export function allowedActionsAt(cell: number): number[] {
  return cell === 6 ? [1, 2, 3, 4, 5] : [cell];
}

/** 1~6일차에 결심 토큰을 한 번도 쓰지 않았으면 7일차 시작 시 +1 (최대 2개) */
export function recoveredTokens(current: number, usedBeforeRecoveryDay: boolean): number {
  if (usedBeforeRecoveryDay) return current;
  return Math.min(MAX_RESOLVE_TOKENS, current + 1);
}

/** 공동 목표 실패 시 패널티 대상: 3인 이상일 때 최소 기여자 전원 */
export function jointPenaltyTargets(contributions: Array<{ playerId: string; amount: number }>): string[] {
  if (contributions.length <= 2) return [];
  const min = Math.min(...contributions.map((c) => c.amount));
  return contributions.filter((c) => c.amount === min).map((c) => c.playerId);
}

/**
 * 최종 구매 최적화 (0/1 배낭 문제). AI 최종 구매와 프런트 추천에 사용.
 * 비용은 500TC 단위이므로 500으로 나눠 DP 크기를 줄인다.
 */
export function bestPurchase<T extends { cost: number; value: number }>(cards: T[], budget: number): T[] {
  const unit = 500;
  const cap = Math.max(0, Math.floor(budget / unit));
  const items = cards.filter((c) => c.value > 0 && c.cost <= budget);
  const dp: number[] = new Array(cap + 1).fill(0);
  const keep: boolean[][] = items.map(() => new Array(cap + 1).fill(false));
  items.forEach((item, i) => {
    const w = Math.ceil(item.cost / unit);
    for (let c = cap; c >= w; c--) {
      if (dp[c - w] + item.value > dp[c]) {
        dp[c] = dp[c - w] + item.value;
        keep[i][c] = true;
      }
    }
  });
  const chosen: T[] = [];
  let c = cap;
  for (let i = items.length - 1; i >= 0; i--) {
    if (keep[i][c]) {
      chosen.push(items[i]);
      c -= Math.ceil(items[i].cost / unit);
    }
  }
  return chosen.reverse();
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
