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

interface Slot {
  index: number;
  status: 'user' | 'ai' | 'ban';
  player?: {
    id: string;
    nickname: string;
    isHost: boolean;
  };
}

function WaitingRoom({ roomId, roomCode, isHost, onGameStart, onBack }: Props) {
  const [slots, setSlots] = useState<Slot[]>([
    { index: 0, status: 'user' },
    { index: 1, status: 'user' },
    { index: 2, status: 'user' },
    { index: 3, status: 'user' },
    { index: 4, status: 'user' },
  ]);
  const [loading, setLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  useEffect(() => {
    loadRoomState();

    const socket = socketService.connect(roomId);

    socket.on('player-joined', () => {
      loadRoomState();
    });

    socket.on('player-left', () => {
      loadRoomState();
    });

    socket.on('slot-updated', () => {
      loadRoomState();
    });

    socket.on('game-started', (data: { gameId: string }) => {
      onGameStart(data.gameId);
    });

    return () => {
      socketService.disconnect();
    };
  }, [roomId]);

  const loadRoomState = async () => {
    try {
      const response = await api.getRoomState(roomId);
      const { slots: serverSlots } = response.data;
      
      console.log('서버에서 받은 슬롯 정보:', serverSlots);
      
      // 서버에서 받은 슬롯 정보를 그대로 사용
      if (serverSlots && serverSlots.length > 0) {
        setSlots(serverSlots);
      }
    } catch (error) {
      console.error('방 상태 로드 실패:', error);
    }
  };

  const handleSlotAction = async (slotIndex: number, action: 'user' | 'ai' | 'ban') => {
    if (!isHost) {
      alert('방장만 슬롯을 관리할 수 있습니다');
      return;
    }

    try {
      await api.updateSlot(roomId, slotIndex, action);
      setOpenDropdown(null);
      loadRoomState();
    } catch (error: any) {
      alert(error.response?.data?.error || '슬롯 업데이트 실패');
    }
  };

  const handleStart = async () => {
    const activePlayers = slots.filter(s => s.player || s.status === 'ai').length;
    
    if (activePlayers < 2) {
      alert('최소 2명 이상의 플레이어가 필요합니다');
      return;
    }

    if (activePlayers > 5) {
      alert('최대 5명까지 참여할 수 있습니다');
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

  const getSlotContent = (slot: Slot) => {
    if (slot.status === 'ban') {
      return {
        icon: '🚫',
        text: '차단됨',
        className: 'slot-banned'
      };
    }

    if (slot.player) {
      return {
        icon: slot.player.isHost ? '👑' : '👤',
        text: slot.player.nickname,
        className: slot.status === 'ai' ? 'slot-ai' : 'slot-occupied'
      };
    }

    if (slot.status === 'ai') {
      return {
        icon: '🤖',
        text: 'AI 대기 중...',
        className: 'slot-ai-waiting'
      };
    }

    return {
      icon: '➕',
      text: '빈 슬롯',
      className: 'slot-empty'
    };
  };

  const canModifySlot = (slot: Slot) => {
    if (!isHost) return false;
    // 방장 자신의 슬롯(첫 번째)은 수정 불가
    if (slot.index === 0) return false;
    return true;
  };

  const getDropdownOptions = (slot: Slot) => {
    const options = [];

    if (slot.status !== 'user' || slot.player) {
      options.push({ value: 'user', label: '👤 유저 슬롯', description: '플레이어가 참여할 수 있습니다' });
    }

    if (slot.status !== 'ai') {
      options.push({ value: 'ai', label: '🤖 AI 추가', description: 'AI 봇이 참여합니다' });
    }

    if (slot.status !== 'ban') {
      options.push({ value: 'ban', label: '🚫 슬롯 차단', description: '이 슬롯을 사용하지 않습니다' });
    }

    return options;
  };

  const activePlayerCount = slots.filter(s => s.player || s.status === 'ai').length;

  return (
    <div className="waiting-room-container">
      <div className="waiting-room-card">
        <h2 className="room-title">🌙 대기실</h2>
        
        <div className="room-code-display">
          <div className="room-code-label">방 번호</div>
          <div className="room-code-number">{roomCode}</div>
          <div className="room-code-hint">친구들에게 이 번호를 공유하세요!</div>
        </div>

        <div className="slots-container">
          <div className="slots-header">
            <h3>플레이어 슬롯</h3>
            <span className="player-count">{activePlayerCount} / 5</span>
          </div>

          <div className="slots-grid">
            {slots.map((slot) => {
              const content = getSlotContent(slot);
              const canModify = canModifySlot(slot);

              return (
                <div key={slot.index} className="slot-wrapper">
                  <div className={`slot-card ${content.className}`}>
                    <div className="slot-number">{slot.index + 1}</div>
                    <div className="slot-icon">{content.icon}</div>
                    <div className="slot-text">{content.text}</div>
                    
                    {canModify && (
                      <button
                        className="slot-menu-btn"
                        onClick={() => setOpenDropdown(openDropdown === slot.index ? null : slot.index)}
                      >
                        ⚙️
                      </button>
                    )}
                  </div>

                  {canModify && openDropdown === slot.index && (
                    <div className="slot-dropdown">
                      {getDropdownOptions(slot).map((option) => (
                        <button
                          key={option.value}
                          className="dropdown-option"
                          onClick={() => handleSlotAction(slot.index, option.value as any)}
                        >
                          <div className="option-label">{option.label}</div>
                          <div className="option-description">{option.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="room-info">
          {isHost ? (
            <div className="host-info">
              <span className="info-icon">👑</span>
              <span>당신은 방장입니다. 슬롯을 관리하고 게임을 시작할 수 있습니다.</span>
            </div>
          ) : (
            <div className="guest-info">
              <span className="info-icon">⏳</span>
              <span>방장이 게임을 시작할 때까지 기다려주세요...</span>
            </div>
          )}
        </div>

        <div className="room-actions">
          {isHost && (
            <button
              className="btn btn-start"
              onClick={handleStart}
              disabled={loading || activePlayerCount < 2}
            >
              {loading ? '시작 중...' : `게임 시작 (${activePlayerCount}명)`}
            </button>
          )}
          
          <button
            className="btn btn-leave"
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
