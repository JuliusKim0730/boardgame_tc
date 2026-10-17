import { useState, useEffect } from 'react';
import './JointPlanSelectModal.css';

interface Card {
  id: string;
  code: string;
  name: string;
  cost: number;
  effects: any;
  metadata: any;
}

interface Props {
  isOpen: boolean;
  options?: Card[]; // CH17: 현재 공동 목표 + 새로 본 1장
  onSelect: (cardId: string) => void;
  onCancel: () => void;
}

function JointPlanSelectModal({ isOpen, options, onSelect, onCancel }: Props) {
  const [jointPlanCards, setJointPlanCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (options && options.length > 0) {
      setJointPlanCards(options);
      setLoading(false);
    } else {
      loadJointPlanCards();
    }
  }, [isOpen, options]);

  const loadJointPlanCards = async () => {
    try {
      setLoading(true);
      // API에서 공동 계획 카드 목록 조회
      const { api } = await import('../services/api');
      const response = await api.getJointPlanCards();
      setJointPlanCards(response.data);
    } catch (error) {
      console.error('공동 계획 카드 로드 실패:', error);
      // 에러 시 빈 배열
      setJointPlanCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedCardId) {
      alert('공동 목표 카드를 선택해주세요');
      return;
    }
    onSelect(selectedCardId);
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
    <div className="modal-overlay">
      <div className="joint-plan-select-modal">
        <div className="modal-header">
          <h2>📖 여행 팜플렛</h2>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            공동 목표로 사용할 카드를 선택하세요. 선택한 카드가 게임의 공동 목표가 됩니다.
          </p>

          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : (
            <div className="cards-grid">
              {jointPlanCards.map(card => (
                <div
                  key={card.id}
                  className={`joint-card ${selectedCardId === card.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCardId(card.id)}
                >
                  <div className="card-header">
                    <div className="card-name">{card.name}</div>
                    <div className="card-code">{card.code}</div>
                  </div>
                  
                  <div className="card-cost">
                    목표: {card.cost.toLocaleString()}TC
                  </div>
                  
                  <div className="card-effects">
                    <div className="effects-title">달성 시 효과</div>
                    {Object.entries(card.effects).map(([key, value]) => (
                      <span key={key} className="effect-badge">
                        ✨ {traitNames[key] || key} +{String(value)}
                      </span>
                    ))}
                  </div>
                  
                  {card.metadata?.bonus && (
                    <div className="card-bonus">
                      🎁 최다 기여자: {card.metadata.bonus}
                    </div>
                  )}
                  
                  {selectedCardId === card.id && (
                    <div className="selected-badge">✓ 선택됨</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>
            취소
          </button>
          <button 
            className="btn-confirm" 
            onClick={handleConfirm}
            disabled={!selectedCardId}
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
}

export default JointPlanSelectModal;
