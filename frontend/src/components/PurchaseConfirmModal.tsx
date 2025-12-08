import './PurchaseConfirmModal.css';

interface Props {
  isOpen: boolean;
  currentMoney: number;
  cost: number;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function PurchaseConfirmModal({ isOpen, currentMoney, cost, description, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;

  const canAfford = currentMoney >= cost;

  return (
    <div className="modal-overlay">
      <div className="modal-content purchase-confirm-modal">
        <h2>💰 구매 확인</h2>
        
        <div className="purchase-info">
          <p className="description">{description}</p>
          
          <div className="money-info">
            <div className="info-row">
              <span className="label">보유 TC:</span>
              <span className="value">{currentMoney.toLocaleString()}TC</span>
            </div>
            <div className="info-row">
              <span className="label">필요 TC:</span>
              <span className="value cost">{cost.toLocaleString()}TC</span>
            </div>
            <div className="info-row total">
              <span className="label">구매 후 잔액:</span>
              <span className={`value ${canAfford ? 'positive' : 'negative'}`}>
                {canAfford ? (currentMoney - cost).toLocaleString() : '부족'}TC
              </span>
            </div>
          </div>

          {!canAfford && (
            <div className="warning-message">
              ⚠️ TC가 부족합니다
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>
            취소
          </button>
          <button 
            className="btn-confirm" 
            onClick={onConfirm}
            disabled={!canAfford}
          >
            {canAfford ? '구매하기' : 'TC 부족'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PurchaseConfirmModal;
