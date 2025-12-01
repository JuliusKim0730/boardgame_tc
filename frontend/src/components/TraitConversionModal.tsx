import { useState } from 'react';
import './TraitConversionModal.css';

interface Props {
  isOpen: boolean;
  minorTraits: { [key: string]: number };
  multipliers: { [key: string]: number };
  onConfirm: (conversions: number) => void;
  onCancel: () => void;
}

function TraitConversionModal({ isOpen, minorTraits, multipliers, onConfirm, onCancel }: Props) {
  const [conversions, setConversions] = useState(0);

  if (!isOpen) return null;

  // 가중치 1배인 특성만 필터링
  const minorTraitEntries = Object.entries(minorTraits).filter(
    ([key]) => multipliers[key] === 1
  );

  // 변환 가능한 최대 횟수 계산
  const totalMinorPoints = minorTraitEntries.reduce((sum, [, value]) => sum + value, 0);
  const maxConversions = Math.floor(totalMinorPoints / 3);

  const handleIncrement = () => {
    if (conversions < maxConversions) {
      setConversions(conversions + 1);
    }
  };

  const handleDecrement = () => {
    if (conversions > 0) {
      setConversions(conversions - 1);
    }
  };

  const handleConfirm = () => {
    onConfirm(conversions);
    setConversions(0);
  };

  const handleCancel = () => {
    setConversions(0);
    onCancel();
  };

  const traitNames: { [key: string]: string } = {
    taste: '맛',
    history: '역사',
    nature: '자연',
    culture: '문화',
    leisure: '레저',
    water: '물놀이',
  };

  return (
    <div className="modal-overlay">
      <div className="trait-conversion-modal">
        <h2>🔄 비주류 특성 변환</h2>
        
        <div className="description">
          여행지 가중치가 <strong>1배</strong>인 비주류 특성 <strong>3점</strong>을 
          <strong> 추억 +1</strong>로 변환할 수 있습니다.
          <br />
          (게임 종료 후 한 번만 수행 가능)
        </div>

        <div className="trait-info">
          <h3 style={{ marginTop: 0, marginBottom: 12, color: '#666' }}>
            비주류 특성 (가중치 1배)
          </h3>
          {minorTraitEntries.length > 0 ? (
            minorTraitEntries.map(([key, value]) => (
              <div key={key} className="trait-row">
                <span className="trait-name">{traitNames[key] || key}</span>
                <span className="trait-value">{value}점</span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: '#999' }}>
              변환 가능한 비주류 특성이 없습니다
            </div>
          )}
          <div className="trait-row" style={{ marginTop: 12, borderTop: '2px solid #ddd', paddingTop: 12 }}>
            <span className="trait-name">총 비주류 점수</span>
            <span className="trait-value">{totalMinorPoints}점</span>
          </div>
        </div>

        <div className="conversion-control">
          <label>변환 횟수 선택</label>
          <div className="conversion-input">
            <button onClick={handleDecrement} disabled={conversions === 0}>
              −
            </button>
            <span>{conversions}</span>
            <button onClick={handleIncrement} disabled={conversions >= maxConversions}>
              +
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: '#999' }}>
            최대 {maxConversions}회 변환 가능
          </div>
        </div>

        {conversions > 0 && (
          <div className="conversion-preview">
            <div className="formula">
              비주류 특성 -{conversions * 3}점 → 추억 +{conversions}점
            </div>
            <div className="result">
              변환 후 남은 비주류 점수: {totalMinorPoints - conversions * 3}점
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="cancel-btn" onClick={handleCancel}>
            변환 안함
          </button>
          <button
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={conversions === 0}
          >
            {conversions > 0 ? `${conversions}회 변환` : '변환 확인'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TraitConversionModal;
