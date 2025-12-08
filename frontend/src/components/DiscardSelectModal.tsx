import { useState } from 'react';
import './DiscardSelectModal.css';

interface Card {
  id: string;
  hand_id?: string;
  card_id?: string;
  code: string;
  name: string;
  type: string;
  cost?: number;
}

interface Props {
  isOpen: boolean;
  handCards: Card[];
  onConfirm: (cardIds: string[]) => void;
  onCancel: () => void;
}

function DiscardSelectModal({ isOpen, handCards, onConfirm, onCancel }: Props) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleToggleCard = (cardId: string) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const handleConfirm = () => {
    if (selectedCards.length === 0) {
      alert('최소 1장 이상 선택해주세요');
      return;
    }
    onConfirm(selectedCards);
    setSelectedCards([]);
  };

  const handleCancel = () => {
    setSelectedCards([]);
    onCancel();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content discard-select-modal">
        <h2>🎴 버린만큼 뽑기 (CH16)</h2>
        <p className="modal-description">
          버릴 카드를 선택하세요. 버린 만큼 계획 카드를 뽑습니다.
        </p>

        <div className="card-selection-area">
          {handCards.length === 0 ? (
            <p className="no-cards">버릴 수 있는 카드가 없습니다</p>
          ) : (
            <div className="card-grid">
              {handCards.map((card) => {
                const cardId = card.card_id || card.id;
                const isSelected = selectedCards.includes(cardId);
                
                return (
                  <div
                    key={cardId}
                    className={`card-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleCard(cardId)}
                  >
                    <div className="card-checkbox">
                      {isSelected && '✓'}
                    </div>
                    <div className="card-info">
                      <div className="card-code">{card.code}</div>
                      <div className="card-name">{card.name}</div>
                      {card.cost !== undefined && (
                        <div className="card-cost">{card.cost.toLocaleString()}TC</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="selection-summary">
          선택한 카드: {selectedCards.length}장
          {selectedCards.length > 0 && (
            <span className="draw-info"> → 계획 카드 {selectedCards.length}장 획득</span>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={handleCancel}>
            취소
          </button>
          <button 
            className="btn-confirm" 
            onClick={handleConfirm}
            disabled={selectedCards.length === 0}
          >
            확인 ({selectedCards.length}장 버리기)
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiscardSelectModal;
