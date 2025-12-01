import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import './WaitingRoom.css';

interface Props {
  roomId: string;
  roomCode: string;
  userId: string;
  isHost: boolean;
  onGameStart: (gameId: string) => void;
  onBack: () => void;
}

interface Player {
  id: string;
  nickname: string;
}

function WaitingRoom({ roomId, roomCode, userId, isHost, onGameStart, onBack }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 초기 플레이어 목록 로드
    loadPlayers();

    // WebSocket 연결
    const socket = socketService.connect(roomId);

    socket.on('player-joined', () => {
      loadPlayers();
    });

    socket.on('player-left', () => {
      loadPlayers();
    });

    socket.on('game-started', (data: { gameId: string }) => {
      onGameStart(data.gameId);
    });

    return () => {
      socketService.disconnect();
    };
  }, [roomId]);

  const loadPlayers = async () => {
    try {
      const response = await api.getRoomState(roomId);
      setPlayers(response.data.players);
    } catch (error) {
      console.error('플레이어 목록 로드 실패:', error);
    }
  };

  const handleStart = async () => {
    if (players.length < 2) {
      alert('최소 2명 이상의 플레이어가 필요합니다');
      return;
    }

    setLoading(true);
    try {
      const response = await api.startGame(roomId);
      onGameStart(response.data.gameId);
    } catch (error: any) {
      alert(error.response?.data?.error || '게임 시작 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="waiting-room-container">
      <div className="card waiting-room-card">
        <h2 className="title">대기실</h2>
        
        <div className="room-code-section">
          <p className="room-code-label">방 코드</p>
          <div className="room-code">{roomCode}</div>
          <p className="room-code-hint">친구들에게 이 코드를 공유하세요!</p>
        </div>

        <div className="players-section">
          <h3>참여자 ({players.length}명)</h3>
          <div className="players-list">
            {players.map((player, index) => (
              <div key={player.id} className="player-item">
                <span className="player-number">{index + 1}</span>
                <span className="player-nickname">{player.nickname}</span>
                {index === 0 && <span className="host-badge">👑 방장</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="waiting-room-actions">
          {isHost ? (
            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={loading || players.length < 2}
            >
              {loading ? '시작 중...' : '게임 시작'}
            </button>
          ) : (
            <p className="waiting-message">방장이 게임을 시작할 때까지 기다려주세요...</p>
          )}
          
          <button
            className="btn btn-secondary"
            onClick={onBack}
            disabled={loading}
          >
            나가기
          </button>
        </div>
      </div>
    </div>
  );
}

export default WaitingRoom;
