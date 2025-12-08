import './PlayerSelectModal.css';

interface Player {
  player_id: string;
  nickname: string;
  position: number;
  money: number;
  hand_cards?: any[];
}

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  players: Player[];
  currentPlayerId: string;
  filterCondition?: (player: Player) => boolean;
  onSelect: (playerId: string) => void;
  onCancel: () => void;
  showGiveUp?: boolean;
}

function PlayerSelectModal({ 
  isOpen, 
  title, 
  description, 
  players, 
  currentPlayerId,
  filterCondition,
  onSelect, 
  onCancel,
  showGiveUp = false
}: Props) {
  if (!isOpen) return null;

  // 자신을 제외하고 조건에 맞는 플레이어만 필터링
  const availablePlayers = players.filter(p => {
    if (p.player_id === currentPlayerId) return false;
    if (filterCondition) return filterCondition(p);
    return true;
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content player-select-modal">
        <h2>{title}</h2>
        <p className="modal-description">{description}</p>

        <div className="player-list">
          {availablePlayers.length === 0 ? (
            <div className="no-players">
              <p>선택 가능한 플레이어가 없습니다</p>
              {showGiveUp && (
                <button className="btn-give-up" onClick={onCancel}>
                  포기
                </button>
              )}
            </div>
          ) : (
            availablePlayers.map((player) => (
              <div
                key={player.player_id}
                className="player-item"
                onClick={() => onSelect(player.player_id)}
              >
                <div className="player-info">
                  <div className="player-name">{player.nickname}</div>
                  <div className="player-stats">
                    <span className="stat">📍 {player.position}번</span>
                    <span className="stat">💰 {player.money.toLocaleString()}TC</span>
                    {player.hand_cards && (
                      <span className="stat">🎴 {player.hand_cards.length}장</span>
                    )}
                  </div>
                </div>
                <div className="select-arrow">→</div>
              </div>
            ))
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlayerSelectModal;
