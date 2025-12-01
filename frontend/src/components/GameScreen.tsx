import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import GameBoard from './GameBoard';
import PlayerInfo from './PlayerInfo';
import HandCards from './HandCards';
import ChanceOptionModal from './ChanceOptionModal';
import './GameScreen.css';

interface Props {
  roomId: string;
  gameId: string;
  playerId: string;
  userId: string;
  onBackToLobby: () => void;
}

function GameScreen({ roomId, gameId, playerId, onBackToLobby }: Props) {
  const [currentDay] = useState(1);
  const [currentTurnPlayer, setCurrentTurnPlayer] = useState<string | null>(null);
  const [playerState] = useState<any>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [message, setMessage] = useState('게임을 시작합니다!');
  const [is2Player, setIs2Player] = useState(false);
  const [showChanceOption, setShowChanceOption] = useState(false);
  const [isFirstHouseVisit, setIsFirstHouseVisit] = useState(true);

  useEffect(() => {
    // 플레이어 수 확인 (2인 플레이 감지)
    const fetchPlayers = async () => {
      try {
        const response = await api.getRoom(roomId);
        const players = response.data?.players || [];
        if (players?.length === 2) {
          setIs2Player(true);
        }
      } catch (error) {
        console.error('Failed to fetch players:', error);
      }
    };
    fetchPlayers();

    // WebSocket 연결
    const socket = socketService.connect(roomId);

    socket.on('turn-started', (data: any) => {
      setCurrentTurnPlayer(data.playerId);
      if (data.playerId === playerId) {
        setMessage('당신의 턴입니다! 이동할 칸을 선택하세요.');
      } else {
        setMessage('다른 플레이어의 턴입니다...');
      }
    });

    socket.on('state-updated', (state: any) => {
      // 게임 상태 업데이트
      console.log('State updated:', state);
    });

    socket.on('chance-request', (data: any) => {
      // 찬스 카드 상호작용 요청
      console.log('Chance request:', data);
      setMessage(data.message);
    });

    socket.on('house-first-visit-bonus', (data: any) => {
      if (data.playerId === playerId) {
        setMessage('🎉 집안일 첫 방문 보너스 +500TC!');
        setIsFirstHouseVisit(false);
      }
    });

    socket.on('resolve-token-recovered', (data: any) => {
      if (data.playerId === playerId) {
        setMessage(`🔥 결심 토큰 회복! (${data.newCount}개)`);
      }
    });

    return () => {
      socketService.disconnect();
    };
  }, [roomId, playerId]);

  const handleMove = async (position: number) => {
    if (currentTurnPlayer !== playerId) {
      setMessage('당신의 턴이 아닙니다!');
      return;
    }

    try {
      await api.move(gameId, playerId, position);
      setSelectedPosition(position);
      setMessage('행동을 선택하세요 (1~6번)');
    } catch (error: any) {
      setMessage(error.response?.data?.error || '이동 실패');
    }
  };

  const handleAction = async (actionType: number) => {
    if (currentTurnPlayer !== playerId) {
      setMessage('당신의 턴이 아닙니다!');
      return;
    }

    // 2인 전용: 찬스 칸(5번) 선택 모달
    if (is2Player && actionType === 5) {
      setShowChanceOption(true);
      return;
    }

    try {
      await api.performAction(gameId, playerId, actionType);
      setMessage(`행동 완료: ${getActionName(actionType)}`);
      
      // 집안일 첫 방문 체크
      if (is2Player && actionType === 3 && isFirstHouseVisit) {
        setMessage('🎉 집안일 첫 방문 보너스 +500TC!');
        setIsFirstHouseVisit(false);
      }
      
      // 턴 종료
      setTimeout(async () => {
        await api.endTurn(gameId, playerId);
        setMessage('턴이 종료되었습니다.');
      }, 1000);
    } catch (error: any) {
      setMessage(error.response?.data?.error || '행동 실패');
    }
  };

  const handleChanceOptionSelect = async (option: 'card' | 'money') => {
    setShowChanceOption(false);
    
    try {
      await api.selectChanceOption(gameId, playerId, option);
      
      if (option === 'money') {
        setMessage(`💰 500TC를 획득했습니다!`);
      } else {
        setMessage(`🎴 찬스 카드를 획득했습니다!`);
      }
      
      // 턴 종료
      setTimeout(async () => {
        await api.endTurn(gameId, playerId);
        setMessage('턴이 종료되었습니다.');
      }, 1000);
    } catch (error: any) {
      setMessage(error.response?.data?.error || '선택 실패');
    }
  };

  const getActionName = (type: number): string => {
    const names = ['', '무료 계획', '조사하기', '집안일', '여행 지원', '찬스', '자유 행동'];
    return names[type] || '알 수 없음';
  };

  const isMyTurn = currentTurnPlayer === playerId;

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="game-info">
          <h2>🌙 열네 밤의 꿈</h2>
          <div className="day-counter">Day {currentDay} / 14</div>
        </div>
        <button className="btn-exit" onClick={onBackToLobby}>
          나가기
        </button>
      </div>

      <div className="message-bar">
        <p>{message}</p>
      </div>

      <div className="game-content">
        <div className="left-panel">
          <PlayerInfo
            money={playerState?.money || 2000}
            position={playerState?.position || 1}
            resolveToken={playerState?.resolveToken || true}
            traits={playerState?.traits || {}}
          />
        </div>

        <div className="center-panel">
          <GameBoard
            currentPosition={playerState?.position || 1}
            onPositionClick={handleMove}
            disabled={!isMyTurn}
          />

          <div className="action-buttons">
            <h3>행동 선택</h3>
            <div className="actions-grid">
              {[1, 2, 3, 4, 5, 6].map((action) => (
                <button
                  key={action}
                  className="btn-action"
                  onClick={() => handleAction(action)}
                  disabled={!isMyTurn || selectedPosition === null}
                >
                  {action}. {getActionName(action)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="right-panel">
          <HandCards cards={[]} />
          
          <div className="joint-plan-section">
            <h3>공동 계획</h3>
            <div className="joint-plan-info">
              <p>목표: 10,000원</p>
              <p>현재: 0원</p>
              <button className="btn-contribute">기여하기</button>
            </div>
          </div>
        </div>
      </div>

      <ChanceOptionModal
        isOpen={showChanceOption}
        onSelect={handleChanceOptionSelect}
      />
    </div>
  );
}

export default GameScreen;
