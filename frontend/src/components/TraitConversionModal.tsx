import { useState } from 'react';
import './TraitConversionModal.css';

interface Props {
  isOpen: boolean;
  minorTraits: { [key: string]: number };
  multipliers: { [key: string]: number };
  maxConversions: number;
  onConfirm: (conversions: number) => void;
  onCancel: () => void;
}

function TraitConversionModal({ 
  isOpen, 
  minorTraits, 
  multipliers, 
  maxConversions,
  onConfirm, 
  onCancel 
}: Props) {
  const [conversions, setConversions] = useState(0);

  if (!isOpen) return null;

  const traitNames: { [key: string]: string } = {
    taste: '🍽️ 맛',
    history: '🏛️ 역사',
    nature: '🌲 자연',
    culture: '🎭 문화',
    leisure: '⚽ 레저',
    water: '🏊 물놀이'
  };

  const getMultiplierText = (mult: number) => {
    if (mult === 3) return 'x3 (주류)';
    if (mult === 2) return 'x2 (중류)';
    return 'x1 (비주류)';
  };

  const previewMemoryGain = conversions;
  const previewTraitLoss = conversions * 3;

  return (
    <div className="modal-overlay">
      <div className="modal-content trait-conversion-modal">
        <h2>🔄 비주류 특성 변환</h2>
        
        <div className="conversion-info">
          <p className="info-text">
            가중치 x1 (비주류) 특성을 추억으로 변환할 수 있습니다.
          </p>
          <p className="conversion-rate">
            <strong>변환 비율:</strong> 특성 3점 → 추억 +1점
          </p>
        </div>

        <div className="current-traits">
          <h3>현재 특성 점수</h3>
          <div className="traits-list">
            {Object.entries(minorTraits).map(([trait, value]) => (
              <div key={trait} className="trait-row">
                <span className="trait-name">{traitNames[trait]}</span>
                <span className="trait-value">{value}점</span>
                <span className="trait-multiplier">
                  {getMultiplierText(multipliers[trait] || 1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="conversion-control">
          <h3>변환 횟수 선택</h3>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max={maxConversions}
              value={conversions}
              onChange={(e) => setConversions(parseInt(e.target.value))}
              className="conversion-slider"
            />
            <div className="slider-labels">
              <span>0회</span>
              <span className="current-value">{conversions}회</span>
              <span>{maxConversions}회</span>
            </div>
          </div>
        </div>

        {conversions > 0 && (
          <div className="conversion-preview">
            <h3>변환 미리보기</h3>
            <div className="preview-content">
              <div className="preview-item loss">
                <span className="label">비주류 특성 감소:</span>
                <span className="value">-{previewTraitLoss}점</span>
              </div>
              <div className="preview-arrow">→</div>
              <div className="preview-item gain">
                <span className="label">💭 추억 증가:</span>
                <span className="value">+{previewMemoryGain}점</span>
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => onConfirm(conversions)}
          >
            {conversions > 0 ? `${conversions}회 변환하기` : '변환하지 않기'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export default TraitConversionModal;
