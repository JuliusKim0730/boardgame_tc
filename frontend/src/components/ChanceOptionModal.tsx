import { useState } from 'react';
import './ChanceOptionModal.css';

interface Props {
  isOpen: boolean;
  onSelect: (option: 'card' | 'money') => void;
}

function ChanceOptionModal({ isOpen, onSelect }: Props) {
  const [selected, setSelected] = useState<'card' | 'money' | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      setSelected(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="chance-option-modal">
        <h2>🎲 찬스 칸 선택 (2인 전용)</h2>
        <p>원하는 옵션을 선택하세요:</p>
        
        <div className="option-buttons">
          <button
            className={`option-btn ${selected === 'card' ? 'selected' : ''}`}
            onClick={() => setSelected('card')}
          >
            <div className="option-icon">🎴</div>
            <div className="option-title">찬스 카드</div>
            <div className="option-desc">찬스 카드 1장 획득</div>
          </button>
          
          <button
            className={`option-btn ${selected === 'money' ? 'selected' : ''}`}
            onClick={() => setSelected('money')}
          >
            <div className="option-icon">💰</div>
            <div className="option-title">500TC</div>
            <div className="option-desc">즉시 500TC 획득</div>
          </button>
        </div>
        
        <button
          className="confirm-btn"
          onClick={handleConfirm}
          disabled={!selected}
        >
          선택 확인
        </button>
      </div>
    </div>
  );
}

export default ChanceOptionModal;
