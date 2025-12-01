import { useState } from 'react';
import './ChanceModal.css';

interface Props {
  type: string;
  message: string;
  players?: Array<{ id: string; nickname: string }>;
  cards?: Array<{ id: string; name: string }>;
  onResponse: (response: any) => void;
  onCancel: () => void;
}

function ChanceModal({ type, message, players, cards, onResponse }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<string>('');

  const handleSubmit = () => {
    switch (type) {
      case 'shared_house':
      case 'shared_invest':
      case 'swap_position':
        if (!selectedPlayer) {
          alert('플레이어를 선택하세요');
          return;
        }
        onResponse({ accepted: true, targetId: selectedPlayer });
        break;

      case 'purchase_request':
        if (!selectedCard) {
          alert('카드를 선택하세요');
          return;
        }
        onResponse({ accepted: true, cardId: selectedCard });
        break;

      case 'card_exchange':
        if (!selectedCard) {
          alert('교환할 카드를 선택하세요');
          return;
        }
        onResponse({ accepted: true, cardId: selectedCard });
        break;

      default:
        onResponse({ accepted: true });
    }
  };

  const handleReject = () => {
    onResponse({ accepted: false });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">찬스 카드</h3>
        <p className="modal-message">{message}</p>

        {(type === 'shared_house' || type === 'shared_invest' || type === 'swap_position') && players && (
          <div className="modal-body">
            <p className="modal-label">플레이어 선택:</p>
            <div className="options-list">
              {players.map((player) => (
                <button
                  key={player.id}
                  className={`option-button ${selectedPlayer === player.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPlayer(player.id)}
                >
                  {player.nickname}
                </button>
              ))}
            </div>
          </div>
        )}

        {(type === 'purchase_request' || type === 'card_exchange') && cards && (
          <div className="modal-body">
            <p className="modal-label">카드 선택:</p>
            <div className="options-list">
              {cards.map((card) => (
                <button
                  key={card.id}
                  className={`option-button ${selectedCard === card.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCard(card.id)}
                >
                  {card.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSubmit}>
            확인
          </button>
          <button className="btn btn-secondary" onClick={handleReject}>
            거절
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChanceModal;
