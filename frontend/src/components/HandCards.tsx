import { useState } from 'react';
import './HandCards.css';

interface Card {
  hand_id?: string; // 손패 레코드의 고유 ID
  id: string; // 카드 ID
  code?: string;
  name: string;
  type?: string;
  cost: number;
  effects: any;
  metadata?: any;
}

interface Props {
  cards: Card[];
}

function HandCards({ cards }: Props) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  
  // 중복 카드 ID 체크
  const cardIds = cards.map(c => c.id);
  const uniqueCardIds = new Set(cardIds);
  if (cardIds.length !== uniqueCardIds.size) {
    console.warn('⚠️ 중복된 카드 ID 발견:', cards);
    const duplicates = cardIds.filter((id, index) => cardIds.indexOf(id) !== index);
    console.warn('중복 ID:', duplicates);
  }

  // 특성 이름 매핑
  const traitNames: { [key: string]: string } = {
    taste: '맛',
    history: '역사',
    nature: '자연',
    culture: '문화',
    leisure: '여가',
    water: '물',
    memory: '추억'
  };

  // 효과 표시
  const renderEffects = (effects: any, cardId?: string) => {
    if (!effects || typeof effects !== 'object') return null;
    
    return Object.entries(effects as Record<string, number>).map(([key, value]) => {
      const uniqueKey = cardId ? `${cardId}-${key}` : key;
      
      if (key === 'money') {
        return (
          <span key={uniqueKey} className="effect-badge">
            💰 {value > 0 ? '+' : ''}{value}TC
          </span>
        );
      }
      
      const traitName = traitNames[key] || key;
      return (
        <span key={uniqueKey} className="effect-badge">
          ✨ {traitName} +{value}
        </span>
      );
    });
  };

  return (
    <>
      <div className="hand-cards card">
        <h3>내 카드 ({cards.length}장)</h3>
        
        <div className="cards-list">
          {cards.length === 0 ? (
            <p className="empty-message">카드가 없습니다</p>
          ) : (
            cards.map((card, index) => (
              <div 
                key={card.hand_id || `${card.id}-${index}`} 
                className="card-item"
                onClick={() => setSelectedCard(card)}
              >
                <div className="card-name">{card.name}</div>
                <div className="card-cost">{card.cost?.toLocaleString() || 0}TC</div>
                <div className="card-effects-preview">
                  {renderEffects(card.effects, card.hand_id || card.id)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 카드 상세 모달 */}
      {selectedCard && (
        <div className="card-detail-modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="card-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-detail-header">
              <h2>{selectedCard.name}</h2>
              {selectedCard.code && (
                <span className="card-code-badge">{selectedCard.code}</span>
              )}
            </div>
            
            <div className="card-detail-content">
              {selectedCard.type && (
                <div className="card-type">
                  <span className="label">타입:</span>
                  <span className="value">{selectedCard.type}</span>
                </div>
              )}
              
              {selectedCard.cost > 0 && (
                <div className="card-cost-detail">
                  <span className="label">비용:</span>
                  <span className="value">{selectedCard.cost.toLocaleString()}TC</span>
                </div>
              )}
              
              <div className="card-effects-detail">
                <div className="label">효과:</div>
                <div className="effects-grid">
                  {renderEffects(selectedCard.effects, `modal-${selectedCard.id}`)}
                </div>
              </div>
            </div>
            
            <button className="btn-close-modal" onClick={() => setSelectedCard(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default HandCards;
