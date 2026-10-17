import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addEffects,
  applyConversions,
  bestPurchase,
  cardPoints,
  jointPenaltyTargets,
  maxConversions,
  moveError,
  rankPlayers,
  recoveredTokens,
  scorePlayer,
} from './rules';

// 제주: 자연 x3, 맛 x2, 물놀이 x1 (나머지 특성은 기타 x1)
const JEJU = { nature: 3, taste: 2, water: 1 };

test('최종 점수 = 특성 × 여행지 가중치 + 추억', () => {
  const result = scorePlayer({ nature: 4, taste: 3, water: 2, history: 1, memory: 5 }, JEJU);
  assert.equal(result.traitScore, 4 * 3 + 3 * 2 + 2 * 1 + 1 * 1);
  assert.equal(result.memoryScore, 5);
  assert.equal(result.totalScore, 26);
  assert.equal(result.traits.history.multiplier, 1);
});

test('구매한 계획 카드 효과가 특성에 누적된다', () => {
  let traits = addEffects({}, { nature: 4 }); // N1 국립공원 탐방
  traits = addEffects(traits, { taste: 2, memory: 1 }); // T2 가족 디저트 카페
  assert.deepEqual(traits, { nature: 4, taste: 2, memory: 1 });
  assert.equal(cardPoints({ nature: 4 }, JEJU), 12);
  assert.equal(cardPoints({ taste: 2, memory: 1 }, JEJU), 5);
});

test('동률: 총점 → 추억 → TC, 전부 같으면 공동 순위', () => {
  const ranked = rankPlayers([
    { id: 'a', totalScore: 30, memoryScore: 5, money: 1000 },
    { id: 'b', totalScore: 30, memoryScore: 7, money: 0 },
    { id: 'c', totalScore: 30, memoryScore: 5, money: 1000 },
    { id: 'd', totalScore: 31, memoryScore: 0, money: 0 },
  ]);
  assert.deepEqual(
    ranked.map((r) => [r.id, r.rank]),
    [['d', 1], ['b', 2], ['a', 3], ['c', 3]]
  );
});

test('비주류(1배) 특성 3점 → 추억 +1, 여러 특성에 걸쳐 변환 가능', () => {
  const traits = { water: 2, history: 2, culture: 2, nature: 9 };
  assert.equal(maxConversions(traits, JEJU), 2);
  const converted = applyConversions(traits, JEJU, 2);
  assert.equal(converted.memory, 2);
  assert.equal((converted.water || 0) + (converted.history || 0) + (converted.culture || 0), 0);
  assert.equal(converted.nature, 9, '주류 특성은 건드리지 않는다');
  assert.throws(() => applyConversions(traits, JEJU, 3));
});

test('이동: 인접 칸만, 직전 턴 행동 칸 금지', () => {
  assert.equal(moveError(1, 2, null), null);
  assert.match(moveError(1, 4, null) || '', /인접/);
  assert.match(moveError(5, 4, 4) || '', /직전 턴/);
  assert.equal(moveError(5, 6, 4), null);
});

test('결심 토큰: 1~6일차 미사용 시 7일차 +1, 최대 2개', () => {
  assert.equal(recoveredTokens(1, false), 2);
  assert.equal(recoveredTokens(2, false), 2);
  assert.equal(recoveredTokens(0, true), 0);
  assert.equal(recoveredTokens(1, true), 1);
});

test('공동 목표 실패 패널티는 3인 이상에서 최소 기여자 전원', () => {
  assert.deepEqual(jointPenaltyTargets([{ playerId: 'a', amount: 0 }, { playerId: 'b', amount: 500 }]), []);
  assert.deepEqual(
    jointPenaltyTargets([
      { playerId: 'a', amount: 0 },
      { playerId: 'b', amount: 1000 },
      { playerId: 'c', amount: 0 },
    ]),
    ['a', 'c']
  );
});

test('최종 구매 배낭 최적화', () => {
  const cards = [
    { id: 'N1', cost: 7000, value: 12 },
    { id: 'T1', cost: 5000, value: 6 },
    { id: 'N2', cost: 4000, value: 7 },
    { id: 'H5', cost: 3000, value: 2 },
  ];
  const chosen = bestPurchase(cards, 11000).map((c) => c.id).sort();
  assert.deepEqual(chosen, ['N1', 'N2']);
  assert.deepEqual(bestPurchase(cards, 2000), []);
});
