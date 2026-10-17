/**
 * 프런트엔드용 점수 계산 (backend/src/game/rules.ts와 같은 공식)
 * 최종 결산 화면의 예상 점수, 카드별 내 점수, 최적 구매 추천에 사용한다.
 */
export const TRAIT_KEYS = ['taste', 'history', 'nature', 'culture', 'leisure', 'water'] as const;
export type TraitKey = (typeof TRAIT_KEYS)[number];
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

export function multipliersOf(travelCard?: { metadata?: any } | null): Multipliers {
  if (!travelCard?.metadata) return {};
  const metadata = typeof travelCard.metadata === 'string' ? JSON.parse(travelCard.metadata) : travelCard.metadata;
  return metadata.multipliers || {};
}

export function cardPoints(effects: Record<string, any> = {}, m: Multipliers): number {
  let points = Number(effects.memory || 0);
  for (const t of TRAIT_KEYS) points += Number(effects[t] || 0) * (m[t] ?? 1);
  return points;
}

export function addEffects(traits: Traits, effects: Record<string, any> = {}): Traits {
  const next: Traits = { ...traits };
  for (const key of [...TRAIT_KEYS, 'memory'] as const) {
    const v = Number(effects[key] || 0);
    if (v) next[key] = (next[key] || 0) + v;
  }
  return next;
}

export function scoreOf(traits: Traits, m: Multipliers): number {
  return cardPoints(traits as Record<string, number>, m);
}

export function maxConversions(traits: Traits, m: Multipliers): number {
  const minor = TRAIT_KEYS.filter((t) => (m[t] ?? 1) === 1).reduce((s, t) => s + Math.max(0, traits[t] || 0), 0);
  return Math.floor(minor / 3);
}

/** 0/1 배낭: 예산 안에서 점수 합이 최대인 카드 조합 */
export function bestPurchase<T extends { cost: number; value: number }>(cards: T[], budget: number): T[] {
  const unit = 500;
  const cap = Math.max(0, Math.floor(budget / unit));
  const items = cards.filter((c) => c.value > 0 && c.cost <= budget);
  const dp = new Array(cap + 1).fill(0);
  const keep = items.map(() => new Array(cap + 1).fill(false));
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
  return chosen;
}
