import { useState } from 'react';
import './ContributeModal.css';

interface Props {
  currentMoney: number;
  targetAmount: number;
  currentAmount: number;
  onContribute: (amount: number) => void;
  onClose: () => void;
}

function ContributeModal({ currentMoney, targetAmount, currentAmount, onContribute, onClose }: Props) {
  const [amount, setAmount] = useState<number>(0);

  const handleSubmit = () => {
    if (amount <= 0) {
      alert('금액을 입력하세요');
      return;
    }

    if (amount > currentMoney) {
      alert('보유 금액이 부족합니다');
      return;
    }

    onContribute(amount);
  };

  const progress = Math.min((currentAmount / targetAmount) * 100, 100);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">공동 계획 기여</h3>

        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">
            {currentAmount.toLocaleString()}원 / {targetAmount.toLocaleString()}원 ({progress.toFixed(0)}%)
          </p>
        </div>

        <div className="money-info">
          <p>보유 금액: {currentMoney.toLocaleString()}원</p>
        </div>

        <div className="input-section">
          <label className="input-label">기여 금액</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            min="0"
            max={currentMoney}
            step="100"
            className="amount-input"
          />
          <div className="quick-buttons">
            <button onClick={() => setAmount(1000)}>1,000</button>
            <button onClick={() => setAmount(2000)}>2,000</button>
            <button onClick={() => setAmount(5000)}>5,000</button>
            <button onClick={() => setAmount(currentMoney)}>전액</button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSubmit}>
            기여하기
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContributeModal;
