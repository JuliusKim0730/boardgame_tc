import { useEffect } from 'react';
import './CardDrawModal.css';

interface Card {
  id: string;
  code: string;
  name: string;
  type: string;
  cost?: number;
  effects: any;
  metadata?: any;
}

interface Props {
  isOpen: boolean;
  card: Card | null;
  onClose: () => void;
}

function CardDrawModal({ isOpen, card, onClose }: Props) {
  useEffect(() => {
    if (isOpen && card) {
      // 1초 후 자동으로 닫기
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, card, onClose]);

  if (!isOpen || !card) return null;

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
  const renderEffects = () => {
    if (!card.effects || typeof card.effects !== 'object') return null;
    
    return Object.entries(card.effects).map(([key, value]) => {
      const uniqueKey = `${card.id}-${key}`;
      const numValue = Number(value);
      
      if (key === 'money') {
        return (
          <div key={uniqueKey} className="effect-item">
            💰 {numValue > 0 ? '+' : ''}{numValue.toLocaleString()}TC
          </div>
        );
      }
      
      const traitName = traitNames[key] || key;
      return (
        <div key={uniqueKey} className="effect-item">
          ✨ {traitName} +{numValue}
        </div>
      );
    });
  };

  return (
    <div className="card-draw-modal-overlay" onClick={onClose}>
      <div className="card-draw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-draw-header">
          <h2>🎴 카드 획득!</h2>
        </div>
        
        <div className="card-draw-content">
          <div className="card-draw-card">
            <div className="card-type-badge">{card.type}</div>
            <div className="card-draw-name">{card.name}</div>
            <div className="card-draw-code">{card.code}</div>
            
            {card.cost && (
              <div className="card-draw-cost">
                💵 {card.cost.toLocaleString()}TC
              </div>
            )}
            
            <div className="card-draw-effects">
              <div className="effects-title">효과</div>
              <div className="effects-list">
                {renderEffects()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="card-draw-footer">
          <p className="auto-close-hint">3초 후 자동으로 닫힙니다...</p>
          <button className="btn-close" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default CardDrawModal;
