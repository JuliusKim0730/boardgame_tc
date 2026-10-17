import { useMemo, useState } from 'react';
import './FinalPurchaseModal.css';
import {
  TRAIT_KEYS,
  TRAIT_LABELS,
  addEffects,
  bestPurchase,
  cardPoints,
  maxConversions,
  multipliersOf,
  scoreOf,
  type Traits,
} from '../utils/scoring';

interface Card {
  id: string;
  code: string;
  name: string;
  cost: number;
  type?: string;
  effects: any;
}

interface TravelCard {
  id: string;
  name: string;
  metadata: any;
}

export interface FinalSubmission {
  cardIds: string[];
  contribution: number;
  conversions: number;
}

interface Props {
  isOpen: boolean;
  handCards: Card[];
  currentMoney: number;
  travelCard?: TravelCard;
  traits?: Traits;
  jointPlan?: { card: any; total: number; target: number } | null;
  playerCount?: number;
  onPurchase: (submission: FinalSubmission) => void;
}

/**
 * 최종 결산 (룰북 9): 일반 계획 카드 구매 + 공동 목표 비공개 기여 + 비주류 특성 변환을 한 번에 제출
 */
function FinalPurchaseModal({
  isOpen,
  handCards,
  currentMoney,
  travelCard,
  traits = {},
  jointPlan,
  playerCount = 3,
  onPurchase,
}: Props) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [contribution, setContribution] = useState(0);
  const [conversions, setConversions] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const multipliers = multipliersOf(travelCard);
  const planCards = handCards.filter((c) => !c.type || c.type === 'plan');

  const totalCost = selectedCards.reduce((sum, id) => sum + (planCards.find((c) => c.id === id)?.cost || 0), 0);
  const remaining = currentMoney - totalCost - contribution;

  const projected = useMemo(() => {
    let next = { ...traits };
    for (const id of selectedCards) {
      const card = planCards.find((c) => c.id === id);
      if (card) next = addEffects(next, card.effects);
    }
    return next;
  }, [traits, selectedCards, planCards]);
  const maxConv = maxConversions(projected, multipliers);
  const conv = Math.min(conversions, maxConv);
  const projectedScore = scoreOf(projected, multipliers) - conv * 2;

  if (!isOpen) return null;

  const toggleCard = (cardId: string) => {
    setSelectedCards((prev) => (prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]));
  };

  const recommend = () => {
    const items = planCards.map((c) => ({ id: c.id, cost: c.cost, value: cardPoints(c.effects, multipliers) }));
    setSelectedCards(bestPurchase(items, currentMoney - contribution).map((c) => c.id));
  };

  const handleSubmit = () => {
    if (remaining < 0) {
      alert('TC가 부족합니다!');
      return;
    }
    setSubmitting(true);
    onPurchase({ cardIds: selectedCards, contribution, conversions: conv });
  };

  const jointNeeded = jointPlan ? Math.max(0, jointPlan.target - jointPlan.total) : 0;

  return (
    <div className="final-purchase-modal-overlay">
      <div className="final-purchase-modal">
        <h2>🧳 최종 결산</h2>
        <p className="modal-description">
          ① 구매할 계획 카드 → ② 공동 목표 기여(다른 플레이어에게 비공개, 모두 제출 후 동시 공개) → ③ 비주류 특성 변환 순서로
          정하고 한 번에 제출합니다. 구매하지 않은 카드는 점수에 들어가지 않습니다.
        </p>

        {travelCard && (
          <div className="travel-card-info-purchase">
            <div className="travel-card-header-purchase">
              <span className="travel-icon">🎯</span>
              <span className="travel-name">{travelCard.name}</span>
            </div>
            <div className="travel-multipliers-purchase">
              {TRAIT_KEYS.map((trait) => (
                <span key={trait} className={`multiplier-tag mult-${multipliers[trait] ?? 1}`}>
                  {TRAIT_LABELS[trait]} ×{multipliers[trait] ?? 1}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="purchase-info">
          <div className="info-item">
            <span className="label">💰 보유</span>
            <span className="value">{currentMoney.toLocaleString()}TC</span>
          </div>
          <div className="info-item">
            <span className="label">🛒 구매</span>
            <span className="value">{totalCost.toLocaleString()}TC</span>
          </div>
          <div className="info-item">
            <span className="label">🤝 기여</span>
            <span className="value">{contribution.toLocaleString()}TC</span>
          </div>
          <div className="info-item">
            <span className="label">💵 남는 TC</span>
            <span className={`value ${remaining < 0 ? 'over-budget' : ''}`}>{remaining.toLocaleString()}TC</span>
          </div>
          <div className="info-item">
            <span className="label">⭐ 예상 점수</span>
            <span className="value">{projectedScore}점</span>
          </div>
        </div>

        <h3 className="final-section-title">
          ① 계획 카드 구매
          <button type="button" className="btn btn-secondary btn-small" onClick={recommend}>
            최적 조합 추천
          </button>
        </h3>
        <div className="cards-grid">
          {planCards.length === 0 ? (
            <p className="empty-message">구매할 카드가 없습니다</p>
          ) : (
            planCards.map((card) => (
              <div
                key={card.id}
                className={`purchase-card ${selectedCards.includes(card.id) ? 'selected' : ''}`}
                onClick={() => toggleCard(card.id)}
              >
                <div className="card-header">
                  <div className="card-name">{card.name}</div>
                  <div className="card-code">{card.code}</div>
                </div>
                <div className="card-cost">{card.cost.toLocaleString()}TC</div>
                <div className="card-effects">
                  {Object.entries(card.effects).map(([key, value]) => (
                    <span key={`${card.id}-${key}`} className="effect-badge">
                      ✨ {TRAIT_LABELS[key as keyof typeof TRAIT_LABELS] || key} +{String(value)}
                    </span>
                  ))}
                </div>
                <div className="card-points">내 점수 +{cardPoints(card.effects, multipliers)}</div>
                {selectedCards.includes(card.id) && <div className="selected-badge">✓ 선택됨</div>}
              </div>
            ))
          )}
        </div>

        <h3 className="final-section-title">② 공동 목표 기여</h3>
        {jointPlan?.card ? (
          <div className="final-joint">
            <p>
              <strong>{jointPlan.card.name}</strong> — 목표 {jointPlan.target.toLocaleString()}TC, 현재{' '}
              {jointPlan.total.toLocaleString()}TC (남은 금액 {jointNeeded.toLocaleString()}TC)
            </p>
            <p className="final-hint">
              달성 시 전원 카드 효과 + 최다 기여자 보너스.{' '}
              {playerCount >= 3 ? '실패하면 가장 적게 낸 플레이어 추억 -2.' : '2인 플레이는 실패 패널티가 없습니다.'}
            </p>
            <div className="final-stepper">
              <button type="button" onClick={() => setContribution(Math.max(0, contribution - 500))} disabled={contribution <= 0}>
                −500
              </button>
              <span>{contribution.toLocaleString()}TC</span>
              <button
                type="button"
                onClick={() => setContribution(contribution + 500)}
                disabled={currentMoney - totalCost - contribution < 500}
              >
                +500
              </button>
            </div>
          </div>
        ) : (
          <p className="final-hint">공동 목표 카드가 없습니다</p>
        )}

        <h3 className="final-section-title">③ 비주류 특성 변환 (선택)</h3>
        <p className="final-hint">
          가중치 1배 특성 3점 → 추억 +1. 총점은 변환 1회당 2점 줄지만, 동점일 때 추억이 많은 쪽이 이깁니다. (가능 {maxConv}회)
        </p>
        <div className="final-stepper">
          <button type="button" onClick={() => setConversions(Math.max(0, conv - 1))} disabled={conv <= 0}>
            −1
          </button>
          <span>{conv}회</span>
          <button type="button" onClick={() => setConversions(conv + 1)} disabled={conv >= maxConv}>
            +1
          </button>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={remaining < 0 || submitting}>
            {submitting ? '제출 중...' : `제출하기 (카드 ${selectedCards.length}장 · 기여 ${contribution.toLocaleString()}TC)`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FinalPurchaseModal;
