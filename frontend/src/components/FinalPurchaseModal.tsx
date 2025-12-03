import { useState, useEffect } from 'react';
import './FinalPurchaseModal.css';

interface Card {
  id: string;
  code: string;
  name: string;
  cost: number;
  effects: any;
}

interface Props {
  isOpen: boolean;
  handCards: Card[];
  currentMoney: number;
  onPurchase: (cardIds: string[]) => void;
}

function FinalPurchaseModal({ isOpen, handCards, currentMoney, onPurchase }: Props) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    const cost = selectedCards.reduce((sum, cardId) => {
      const card = handCards.find(c => c.id === cardId);
      return sum + (card?.cost || 0);
    }, 0);
    setTotalCost(cost);
  }, [selectedCards, handCards]);

  const toggleCard = (cardId: string) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const handlePurchase = () => {
    if (totalCost > currentMoney) {
      alert('돈이 부족합니다!');
      return;
    }
    onPurchase(selectedCards);
  };

  if (!isOpen) return null;

  const traitNames: { [key: string]: string } = {
    taste: '맛',
    history: '역사',
    nature: '자연',
    culture: '문화',
    leisure: '여가',
    water: '물',
    memory: '추억'
  };

  return (
    <div className="final-purchase-modal-overlay">
      <div className="final-purchase-modal">
        <h2>🛒 최종 구매</h2>
        <p className="modal-description">
          손패에서 구매할 카드를 선택하세요. 구매한 카드의 특성 점수가 최종 점수에 반영됩니다.
        </p>

        <div className="purchase-info">
          <div className="info-item">
            <span className="label">💰 보유 금액:</span>
            <span className="value">{currentMoney.toLocaleString()}TC</span>
          </div>
          <div className="info-item">
            <span className="label">🛒 구매 비용:</span>
            <span className={`value ${totalCost > currentMoney ? 'over-budget' : ''}`}>
              {totalCost.toLocaleString()}TC
            </span>
          </div>
          <div className="info-item">
            <span className="label">💵 남은 금액:</span>
            <span className="value">{(currentMoney - totalCost).toLocaleString()}TC</span>
          </div>
        </div>

        <div className="cards-grid">
          {handCards.length === 0 ? (
            <p className="empty-message">구매할 카드가 없습니다</p>
          ) : (
            handCards.map(card => (
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
                  {Object.entries(card.effects).map(([key, value]) => {
                    const traitName = traitNames[key] || key;
                    return (
                      <span key={`${card.id}-${key}`} className="effect-badge">
                        {key === 'money' ? '💰' : '✨'} {traitName} +{String(value)}
                      </span>
                    );
                  })}
                </div>
                {selectedCards.includes(card.id) && (
                  <div className="selected-badge">✓ 선택됨</div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-primary"
            onClick={handlePurchase}
            disabled={totalCost > currentMoney}
          >
            구매 완료 ({selectedCards.length}장)
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onPurchase([])}
          >
            구매하지 않음
          </button>
        </div>
      </div>
    </div>
  );
}

export default FinalPurchaseModal;
