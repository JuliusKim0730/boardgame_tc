import { useState } from 'react';
import './ExtraActionModal.css';

interface Props {
  isOpen: boolean;
  type: 'extra_action' | 'repeat_current' | 'buddy_action';
  currentPosition?: number;
  availableActions?: number[];
  onSelectAction: (actionType: number) => void;
  onCancel: () => void;
}

function ExtraActionModal({ 
  isOpen, 
  type, 
  currentPosition, 
  availableActions = [1, 2, 3, 4, 5, 6],
  onSelectAction, 
  onCancel 
}: Props) {
  const [selectedAction, setSelectedAction] = useState<number | null>(null);

  if (!isOpen) return null;

  const getTitle = () => {
    switch (type) {
      case 'extra_action':
        return '⚡ 체력이 넘친다!';
      case 'repeat_current':
        return '🔄 반전의 기회';
      case 'buddy_action':
        return '👥 동행 버디';
      default:
        return '추가 행동';
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'extra_action':
        return '이동 없이 행동 1회를 수행할 수 있습니다. 원하는 행동을 선택하세요.';
      case 'repeat_current':
        return `현재 위치(${currentPosition}번)에서 행동을 1회 더 수행할 수 있습니다.`;
      case 'buddy_action':
        return '추가 행동 1회를 수행할 수 있습니다. 원하는 행동을 선택하세요. (직전 행동은 반복 불가)';
      default:
        return '';
    }
  };

  const getActionName = (type: number): string => {
    const names = ['', '무료 계획', '조사하기', '집안일', '여행 지원', '찬스', '자유 행동'];
    return names[type] || '알 수 없음';
  };

  const handleConfirm = () => {
    if (selectedAction === null) {
      alert('행동을 선택해주세요');
      return;
    }
    onSelectAction(selectedAction);
  };

  // repeat_current인 경우 현재 위치만 선택 가능
  // (6번 자유 행동 칸이면 1~5 중 선택)
  const selectableActions = type === 'repeat_current' && currentPosition && currentPosition !== 6
    ? [currentPosition]
    : availableActions;

  return (
    <div className="modal-overlay">
      <div className="extra-action-modal">
        <div className="modal-header">
          <h2>{getTitle()}</h2>
        </div>
        
        <div className="modal-body">
          <p className="action-message">{getMessage()}</p>
          
          <div className="action-selection">
            <h3>행동 선택</h3>
            <div className="action-buttons">
              {selectableActions.map(actionType => (
                <button
                  key={actionType}
                  className={`action-button ${selectedAction === actionType ? 'selected' : ''}`}
                  onClick={() => setSelectedAction(actionType)}
                >
                  <div className="action-number">{actionType}</div>
                  <div className="action-name">{getActionName(actionType)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>
            취소
          </button>
          <button 
            className="btn-confirm" 
            onClick={handleConfirm}
            disabled={selectedAction === null}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExtraActionModal;
