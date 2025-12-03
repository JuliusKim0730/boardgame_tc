import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import GameBoard from './GameBoard';
import PlayerInfo from './PlayerInfo';
import HandCards from './HandCards';
import ChanceOptionModal from './ChanceOptionModal';
import ContributeModal from './ContributeModal';
import ResultScreen from './ResultScreen';
import ActionLog from './ActionLog';
import CardDrawModal from './CardDrawModal';
import FinalPurchaseModal from './FinalPurchaseModal';
import ChanceInteractionModal from './ChanceInteractionModal';
import './GameScreen.css';

interface Props {
  roomId: string;
  gameId: string;
  playerId: string;
  userId: string;
  onBackToLobby: () => void;
}

interface PlayerState {
  id: string;
  money: number;
  position: number;
  resolve_token: number;
  traits: any;
  hand_cards?: any[];
}

interface GameState {
  day: number;
  currentTurnPlayerId: string | null;
  status: string;
  travelTheme: string | null;
  jointPlanCardId: string | null;
}

function GameScreen({ roomId, gameId, playerId, onBackToLobby }: Props) {
  const [gameState, setGameState] = useState<GameState>({
    day: 1,
    currentTurnPlayerId: null,
    status: 'running',
    travelTheme: null,
    jointPlanCardId: null
  });
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [_selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [message, setMessage] = useState('게임을 시작합니다!');
  const [is2Player, setIs2Player] = useState(false);
  const [showChanceOption, setShowChanceOption] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [hasActed, setHasActed] = useState(false);
  const [travelCardExpanded, setTravelCardExpanded] = useState(false);
  const [jointPlanCard, setJointPlanCard] = useState<any>(null);
  const [jointPlanTotal, setJointPlanTotal] = useState(0);
  const [drawnCard, setDrawnCard] = useState<any>(null);
  const [showCardDrawModal, setShowCardDrawModal] = useState(false);
  const [showFinalPurchase, setShowFinalPurchase] = useState(false);
  const [finalPurchaseComplete, setFinalPurchaseComplete] = useState(false);
  const [chanceInteraction, setChanceInteraction] = useState<any>(null);
  const [showChanceInteraction, setShowChanceInteraction] = useState(false);

  // 게임 상태 로드
  const loadGameState = async (preserveActionState = false) => {
    try {
      console.log('🔄 Loading game state for gameId:', gameId);
      const response = await api.getGameState(gameId);
      console.log('✅ Game state loaded:', response.data);
      const { game, players, jointPlan } = response.data;
      
      console.log('=== 게임 상태 로드 ===');
      console.log('내 playerId:', playerId);
      console.log('현재 턴 playerId:', game.currentTurnPlayerId);
      console.log('isMyTurn:', game.currentTurnPlayerId === playerId);
      console.log('preserveActionState:', preserveActionState);
      console.log('플레이어 목록:', players.map((p: any) => ({
        player_id: p.player_id,
        nickname: p.nickname,
        turn_order: p.turn_order,
        position: p.position,
        hand_cards_count: p.hand_cards?.length || 0,
        isCurrentTurn: p.player_id === game.currentTurnPlayerId
      })));
      
      setGameState({
        day: game.day,
        currentTurnPlayerId: game.currentTurnPlayerId,
        status: game.status,
        travelTheme: game.travelTheme,
        jointPlanCardId: game.jointPlanCardId
      });
      
      setAllPlayers(players);
      
      // 공동 계획 카드 및 현황 설정
      if (jointPlan) {
        setJointPlanCard(jointPlan.card);
        setJointPlanTotal(jointPlan.total || 0);
      }
      
      // 내 플레이어 상태 찾기
      const myState = players.find((p: any) => p.player_id === playerId);
      if (myState) {
        setPlayerState(myState);
        console.log('내 상태 업데이트:', {
          position: myState.position,
          money: myState.money,
          hand_cards_count: myState.hand_cards?.length || 0
        });
        console.log('내 손패 카드:', myState.hand_cards);
      }
      
      // 턴 메시지 업데이트 (행동 상태 보존 시 메시지 유지)
      if (!preserveActionState) {
        if (game.currentTurnPlayerId === playerId) {
          if (!hasMoved) {
            setMessage('당신의 턴입니다! 이동할 칸을 선택하세요.');
          }
        } else {
          const currentPlayer = players.find((p: any) => p.player_id === game.currentTurnPlayerId);
          setMessage(`⏳ ${currentPlayer?.nickname || '다른 플레이어'}의 턴`);
        }
      }
      
      // 게임 종료 체크
      if (game.status === 'finished') {
        setShowResult(true);
      }
    } catch (error: any) {
      console.error('❌ Failed to load game state:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        setMessage(`게임 상태 로드 실패: ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        console.error('No response received');
        setMessage('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.');
      } else {
        console.error('Error:', error.message);
        setMessage(`에러: ${error.message}`);
      }
    }
  };

  useEffect(() => {
    // 초기 로드
    const initGame = async () => {
      await loadGameState();
      
      // 게임 시작 시 손패 확인 메시지
      const response = await api.getGameState(gameId);
      const myState = response.data.players.find((p: any) => p.player_id === playerId);
      if (myState?.hand_cards && myState.hand_cards.length > 0) {
        const cardNames = myState.hand_cards.map((c: any) => c.name).join(', ');
        setMessage(`🎴 시작 손패: ${cardNames}`);
        setTimeout(() => {
          if (response.data.game.currentTurnPlayerId === playerId) {
            setMessage('당신의 턴입니다! 이동할 칸을 선택하세요.');
          } else {
            setMessage('다른 플레이어의 턴입니다...');
          }
        }, 3000);
      }
    };
    initGame();
    
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
      setGameState(prev => ({ ...prev, currentTurnPlayerId: data.playerId, day: data.day }));
      setHasMoved(false);
      setHasActed(false);
      setSelectedPosition(null);
      
      if (data.playerId === playerId) {
        setMessage('당신의 턴입니다! 이동할 칸을 선택하세요.');
      } else {
        setMessage('다른 플레이어의 턴입니다...');
      }
      
      loadGameState();
    });

    socket.on('state-updated', () => {
      loadGameState();
    });

    socket.on('game-state-updated', () => {
      console.log('📡 게임 상태 업데이트 수신');
      loadGameState();
    });

    socket.on('player-moved', (data: any) => {
      if (data.playerId === playerId) {
        setHasMoved(true);
        setMessage('행동을 선택하세요 (1~6번)');
      }
      loadGameState();
    });

    socket.on('action-completed', (data: any) => {
      if (data.playerId === playerId) {
        setHasActed(true);
        
        // 카드를 뽑은 경우 모달 표시
        if (data.result?.card) {
          setDrawnCard(data.result.card);
          setShowCardDrawModal(true);
        }
      }
      // 행동 완료 후 상태 새로고침 (손패 업데이트 포함)
      setTimeout(() => loadGameState(true), 500);
    });

    socket.on('chance-request', (data: any) => {
      console.log('찬스 카드 상호작용 요청:', data);
      setChanceInteraction(data);
      setShowChanceInteraction(true);
      setMessage(data.message);
    });

    socket.on('chance-resolved', (data: any) => {
      console.log('찬스 카드 상호작용 완료:', data);
      setShowChanceInteraction(false);
      setChanceInteraction(null);
      loadGameState();
    });

    socket.on('house-first-visit-bonus', (data: any) => {
      if (data.playerId === playerId) {
        setMessage('🎉 집안일 첫 방문 보너스 +500TC!');
      }
    });

    socket.on('resolve-token-recovered', (data: any) => {
      if (data.playerId === playerId) {
        setMessage(`🔥 결심 토큰 회복! (${data.newCount}개)`);
      }
      loadGameState();
    });

    socket.on('game-ended', () => {
      setMessage('게임이 종료되었습니다! 최종 구매를 진행하세요.');
      // Day 14 종료 시 최종 구매 모달 표시
      setShowFinalPurchase(true);
    });

    socket.on('day-7-started', () => {
      setMessage('📅 7일차 시작! 결심 토큰 회복 체크 중...');
      api.checkResolveRecovery(gameId).catch(console.error);
    });

    // Socket 재연결 시 상태 동기화
    socket.on('reconnect', () => {
      console.log('🔄 Socket reconnected, reloading game state');
      loadGameState();
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    return () => {
      socketService.disconnect();
    };
  }, [roomId, playerId, gameId]);

  const handleMove = async (position: number) => {
    console.log('=== handleMove 호출 ===');
    console.log('position:', position);
    console.log('isMyTurn:', gameState.currentTurnPlayerId === playerId);
    console.log('hasMoved:', hasMoved);
    
    if (gameState.currentTurnPlayerId !== playerId) {
      setMessage('당신의 턴이 아닙니다!');
      return;
    }

    if (hasMoved) {
      setMessage('이미 이동했습니다!');
      return;
    }

    try {
      console.log('이동 API 호출 중...');
      console.log('API 파라미터:', { gameId, playerId, position });
      
      const response = await api.move(gameId, playerId, position);
      console.log('이동 API 응답:', response);
      
      setSelectedPosition(position);
      setHasMoved(true);
      setMessage(`${position}번 칸으로 이동했습니다. 행동을 선택하세요.`);
      console.log('이동 완료, hasMoved를 true로 설정');
      
      // 행동 상태 보존하면서 게임 상태 로드
      await loadGameState(true);
    } catch (error: any) {
      console.error('=== 이동 실패 상세 ===');
      console.error('에러 객체:', error);
      console.error('에러 응답:', error.response);
      console.error('에러 데이터:', error.response?.data);
      
      const errorMessage = error.response?.data?.error || error.message || '이동 실패';
      console.error('표시할 에러 메시지:', errorMessage);
      setMessage(`❌ ${errorMessage}`);
    }
  };

  const handleAction = async (actionType: number) => {
    if (gameState.currentTurnPlayerId !== playerId) {
      setMessage('당신의 턴이 아닙니다!');
      return;
    }

    if (!hasMoved) {
      setMessage('먼저 이동해야 합니다!');
      return;
    }

    if (hasActed) {
      setMessage('이미 행동했습니다!');
      return;
    }

    const currentPos = playerState?.position || 1;
    
    // 6번 자유행동 칸: 1~5번 중 선택 가능
    if (currentPos === 6) {
      if (actionType < 1 || actionType > 5) {
        setMessage('자유 행동에서는 1~5번 행동만 선택 가능합니다!');
        return;
      }
      // 자유행동에서 선택한 행동 수행
    } else {
      // 일반 칸: 해당 칸의 행동만 가능
      if (actionType !== currentPos) {
        setMessage(`${currentPos}번 칸에서는 ${currentPos}번 행동만 가능합니다!`);
        return;
      }
    }

    // 2인 전용: 찬스 칸(5번) 선택 모달
    if (is2Player && actionType === 5) {
      setShowChanceOption(true);
      return;
    }

    try {
      const response = await api.performAction(gameId, playerId, actionType);
      setHasActed(true);
      
      // 응답 메시지 표시
      if (response.data?.message) {
        setMessage(response.data.message);
      } else if (response.data?.card) {
        setMessage(`🎴 ${response.data.card.name} 카드를 획득했습니다!`);
      } else {
        setMessage(`행동 완료: ${getActionName(actionType)}`);
      }
      
      // 손패 업데이트를 위해 잠시 대기 후 상태 로드
      setTimeout(async () => {
        await loadGameState(true);
      }, 500);
      
      // 턴 종료 버튼 표시 (결심 토큰 사용 여부 선택 가능)
      setMessage('행동 완료! 턴을 종료하거나 결심 토큰을 사용하세요.');
    } catch (error: any) {
      console.error('행동 실패:', error);
      setMessage(error.response?.data?.error || '행동 실패');
    }
  };

  const handleEndTurn = async () => {
    try {
      await api.endTurn(gameId, playerId);
      setMessage('턴이 종료되었습니다.');
      setHasMoved(false);
      setHasActed(false);
      await loadGameState();
    } catch (error: any) {
      setMessage(error.response?.data?.error || '턴 종료 실패');
    }
  };

  const handleUseResolveToken = async (actionType: number) => {
    try {
      // 결심 토큰 사용
      await api.useResolveToken(gameId, playerId, actionType);
      
      // 선택한 행동 수행
      const result = await api.performAction(gameId, playerId, actionType);
      
      if (result.data?.message) {
        setMessage(result.data.message);
      } else {
        setMessage(`결심 토큰 사용! ${getActionName(actionType)} 완료`);
      }
      
      // 상태 새로고침
      await loadGameState(true);
    } catch (error: any) {
      setMessage(error.response?.data?.error || '결심 토큰 사용 실패');
    }
  };

  const handleFinalPurchase = async (cardIds: string[]) => {
    try {
      await api.finalPurchase(gameId, playerId, cardIds);
      setMessage(`${cardIds.length}장의 카드를 구매했습니다!`);
      setShowFinalPurchase(false);
      setFinalPurchaseComplete(true);
      
      // 모든 플레이어가 구매 완료했는지 확인 후 결과 화면으로
      setTimeout(() => {
        setShowResult(true);
      }, 1500);
    } catch (error: any) {
      setMessage(error.response?.data?.error || '최종 구매 실패');
    }
  };

  const handleChanceOptionSelect = async (option: 'card' | 'money') => {
    setShowChanceOption(false);
    
    try {
      const response = await api.selectChanceOption(gameId, playerId, option);
      setHasActed(true);
      
      if (option === 'money') {
        setMessage(`💰 500TC를 획득했습니다!`);
      } else {
        setMessage(`🎴 ${response.data?.card?.name || '찬스 카드'}를 획득했습니다!`);
      }
      
      loadGameState();
      
      // 자동 턴 종료
      setTimeout(async () => {
        try {
          await api.endTurn(gameId, playerId);
          setMessage('턴이 종료되었습니다.');
          setHasMoved(false);
          setHasActed(false);
        } catch (error: any) {
          setMessage(error.response?.data?.error || '턴 종료 실패');
        }
      }, 1500);
    } catch (error: any) {
      setMessage(error.response?.data?.error || '선택 실패');
    }
  };

  const handleContribute = async (amount: number) => {
    try {
      await api.contribute(gameId, playerId, amount);
      setMessage(`공동 계획에 ${amount.toLocaleString()}TC 기여했습니다!`);
      setShowContributeModal(false);
      loadGameState();
    } catch (error: any) {
      setMessage(error.response?.data?.error || '기여 실패');
    }
  };

  const getActionName = (type: number): string => {
    const names = ['', '무료 계획', '조사하기', '집안일', '여행 지원', '찬스', '자유 행동'];
    return names[type] || '알 수 없음';
  };

  const handleChanceResponse = async (response: any) => {
    if (!chanceInteraction) return;

    try {
      await api.respondToChanceInteraction(chanceInteraction.interactionId, response);
      setShowChanceInteraction(false);
      setChanceInteraction(null);
      setMessage('상호작용이 완료되었습니다');
    } catch (error: any) {
      console.error('찬스 카드 응답 실패:', error);
      setMessage(error.response?.data?.error || '응답 실패');
    }
  };

  const handleChanceCancel = () => {
    setShowChanceInteraction(false);
    setChanceInteraction(null);
  };

  const isMyTurn = gameState.currentTurnPlayerId === playerId;

  // 최종 구매 모달 표시
  if (showFinalPurchase && !finalPurchaseComplete) {
    return (
      <div className="game-screen">
        <FinalPurchaseModal
          isOpen={true}
          handCards={playerState?.hand_cards || []}
          currentMoney={playerState?.money || 0}
          onPurchase={handleFinalPurchase}
        />
      </div>
    );
  }

  if (showResult) {
    return (
      <ResultScreen
        gameId={gameId}
        roomId={roomId}
        playerId={playerId}
        onRestart={() => {
          setShowResult(false);
          setShowFinalPurchase(false);
          setFinalPurchaseComplete(false);
          loadGameState();
        }}
        onBackToLobby={onBackToLobby}
      />
    );
  }

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="game-info">
          <h2>🌙 열네 밤의 꿈</h2>
          <div className="day-counter">
            Day {gameState.day} / 14
            {is2Player && <span className="mode-badge">2인 모드</span>}
          </div>
        </div>
        

        
        <button className="btn-exit" onClick={onBackToLobby}>
          나가기
        </button>
      </div>

      <div className="message-bar">
        <div className="message-content">
          <p>{message}</p>
          {isMyTurn && (
            <div className="turn-status active">
              {!hasMoved && '🎯 이동 필요'}
              {hasMoved && !hasActed && '⚡ 행동 필요'}
              {hasMoved && hasActed && '✅ 완료'}
            </div>
          )}
          {!isMyTurn && gameState.currentTurnPlayerId && (
            <div className="turn-status waiting">
              ⏳ {allPlayers.find(p => p.player_id === gameState.currentTurnPlayerId)?.nickname || '다른 플레이어'}의 턴
            </div>
          )}
        </div>
      </div>

      <div className="game-content">
        <div className="left-panel">
          {/* 내 여행지 카드 - 내 카드 위로 이동 */}
          {allPlayers.find(p => p.player_id === playerId)?.travelCard && (
            <div 
              className={`my-travel-card ${travelCardExpanded ? 'expanded' : ''}`}
              onClick={() => setTravelCardExpanded(!travelCardExpanded)}
            >
              <div className="travel-card-header">
                <div className="travel-card-icon">🎯</div>
                <div className="travel-card-title-section">
                  <div className="travel-card-label">내 여행지</div>
                  <div className="travel-card-name">
                    {allPlayers.find(p => p.player_id === playerId)?.travelCard.name}
                  </div>
                </div>
                <div className="expand-icon">{travelCardExpanded ? '▼' : '▶'}</div>
              </div>
              
              {travelCardExpanded && (() => {
                const travelCard = allPlayers.find(p => p.player_id === playerId)?.travelCard;
                if (!travelCard) return null;
                
                // metadata 파싱
                const metadata = typeof travelCard.metadata === 'string'
                  ? JSON.parse(travelCard.metadata)
                  : travelCard.metadata;
                
                // 특성 이름 매핑
                const traitNames: { [key: string]: string } = {
                  nature: '자연',
                  history: '역사',
                  culture: '문화',
                  taste: '맛',
                  water: '물',
                  leisure: '여가'
                };
                
                // multipliers에서 가중치 정보 가져오기
                const multipliers = metadata?.multipliers || {};
                
                return (
                  <div className="travel-card-details">
                    <div className="travel-card-description">
                      {travelCard.name}에서 특별한 추억을 만들어보세요!
                    </div>
                    {Object.keys(multipliers).length > 0 && (
                      <div className="travel-card-weights">
                        <div className="weights-title">특성 가중치</div>
                        <div className="weights-list">
                          {Object.entries(multipliers)
                            .sort(([, a]: any, [, b]: any) => b - a)
                            .map(([trait, weight]: [string, any]) => (
                              <div key={trait} className="weight-item">
                                <span className="trait-name">{traitNames[trait] || trait}</span>
                                <span className={`weight-value weight-${weight}`}>×{weight}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    {travelCard.cost && (
                      <div className="travel-card-cost">
                        비용: {travelCard.cost.toLocaleString()}TC
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          
          <PlayerInfo
            money={playerState?.money || 3000}
            position={playerState?.position || 1}
            resolveToken={playerState?.resolve_token || 1}
            traits={playerState?.traits || {}}
          />
          
          <div className="other-players">
            <h3>플레이어 목록</h3>
            {allPlayers
              .sort((a, b) => a.turn_order - b.turn_order)
              .map(p => {
                const isMe = p.player_id === playerId;
                const isCurrentTurn = gameState.currentTurnPlayerId === p.player_id;
                
                return (
                  <div 
                    key={p.id} 
                    className={`other-player-item ${isMe ? 'me' : ''} ${isCurrentTurn ? 'current-turn' : ''}`}
                  >
                    <div className="player-header">
                      <div className="player-name">
                        {isCurrentTurn && '🎯 '}
                        {p.nickname || `플레이어 ${p.turn_order + 1}`}
                        {isMe && ' (나)'}
                      </div>
                      <div className="player-order">#{p.turn_order + 1}</div>
                    </div>
                    <div className="player-stats">
                      💰 {p.money?.toLocaleString()}TC | 📍 {p.position}번
                    </div>
                    {p.travelCard && (
                      <div className="player-travel">
                        🎯 {p.travelCard.name}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        <div className="center-panel">
          <div className="board-container">
            <h3 className="board-title">
              {isMyTurn ? '이동할 칸을 선택하세요' : '게임 보드'}
            </h3>
            <GameBoard
              currentPosition={playerState?.position || 1}
              onPositionClick={handleMove}
              disabled={!isMyTurn || hasMoved}
            />
            <div className="board-hint">
              {isMyTurn && !hasMoved && '💡 인접한 칸(밝게 표시)을 클릭하여 이동하세요'}
              {isMyTurn && hasMoved && !hasActed && '⚡ 아래에서 행동을 선택하세요'}
              {!isMyTurn && '⏳ 다른 플레이어의 턴을 기다리는 중...'}
            </div>
          </div>
          
          {/* 행동 선택 버튼 */}
          {(() => {
            console.log('=== 행동 버튼 렌더링 조건 ===');
            console.log('isMyTurn:', isMyTurn);
            console.log('hasMoved:', hasMoved);
            console.log('hasActed:', hasActed);
            console.log('playerState?.position:', playerState?.position);
            console.log('조건 충족:', isMyTurn && hasMoved && !hasActed);
            return null;
          })()}
          {isMyTurn && hasMoved && !hasActed && (
            <div className="action-selection">
              <h3>행동 선택</h3>
              <p className="action-hint">
                📍 현재 위치: {playerState?.position}번 칸 - {getActionName(playerState?.position || 1)}
              </p>
              <div className="action-buttons">
                {playerState?.position === 6 ? (
                  // 자유 행동: 1~5번 선택
                  <>
                    <div className="free-action-note">
                      💡 자유 행동: 1~5번 중 하나를 선택하세요
                    </div>
                    {[1, 2, 3, 4, 5].map(num => (
                      <button
                        key={num}
                        className="btn-action"
                        onClick={() => handleAction(num)}
                      >
                        {num}. {getActionName(num)}
                      </button>
                    ))}
                  </>
                ) : (
                  // 일반 칸: 해당 행동만
                  <button
                    className="btn-action btn-action-primary"
                    onClick={() => handleAction(playerState?.position || 1)}
                  >
                    {playerState?.position}. {getActionName(playerState?.position || 1)}
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* 턴 종료 버튼 및 결심 토큰 사용 */}
          {isMyTurn && hasMoved && hasActed && (
            <div className="turn-end-section">
              <button
                className="btn-end-turn btn-primary"
                onClick={handleEndTurn}
              >
                턴 종료
              </button>
              
              {playerState && playerState.resolve_token > 0 && (
                <div className="resolve-token-section">
                  <div className="resolve-token-hint">
                    🔥 결심 토큰 {playerState.resolve_token}개 보유
                  </div>
                  <div className="resolve-token-actions">
                    <p className="resolve-hint">추가 행동을 선택하세요 (직전 행동 제외)</p>
                    <div className="resolve-action-buttons">
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <button
                          key={num}
                          className={`btn-resolve-action ${num === playerState.position ? 'disabled' : ''}`}
                          onClick={() => handleUseResolveToken(num)}
                          disabled={num === playerState.position}
                        >
                          {num}. {getActionName(num)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="right-panel">
          <HandCards cards={playerState?.hand_cards || []} />
          
          <div className="joint-plan-section card">
            <h3>공동 계획</h3>
            {jointPlanCard ? (
              <div className="joint-plan-card">
                <div className="joint-card-name">{jointPlanCard.name || '공동 계획'}</div>
                
                {/* 설명 표시 */}
                <div className="joint-card-description">
                  {jointPlanCard.metadata?.description || 
                   jointPlanCard.name || 
                   '함께 달성할 목표입니다'}
                </div>
                
                {/* 비용 표시 */}
                {jointPlanCard.cost && (
                  <div className="joint-card-cost">
                    목표 금액: {jointPlanCard.cost.toLocaleString()}TC
                  </div>
                )}
                
                {/* 효과 표시 */}
                {jointPlanCard.effects && Object.keys(jointPlanCard.effects).length > 0 && (
                  <div className="joint-card-effects">
                    <div className="effects-title">달성 시 효과</div>
                    <div className="effects-list">
                      {jointPlanCard.effects.money && (
                        <div className="effect-item">
                          💰 {jointPlanCard.effects.money > 0 ? '+' : ''}{jointPlanCard.effects.money.toLocaleString()}TC
                        </div>
                      )}
                      {jointPlanCard.effects.taste && (
                        <div className="effect-item">✨ 맛 +{jointPlanCard.effects.taste}</div>
                      )}
                      {jointPlanCard.effects.history && (
                        <div className="effect-item">✨ 역사 +{jointPlanCard.effects.history}</div>
                      )}
                      {jointPlanCard.effects.nature && (
                        <div className="effect-item">✨ 자연 +{jointPlanCard.effects.nature}</div>
                      )}
                      {jointPlanCard.effects.culture && (
                        <div className="effect-item">✨ 문화 +{jointPlanCard.effects.culture}</div>
                      )}
                      {jointPlanCard.effects.leisure && (
                        <div className="effect-item">✨ 여가 +{jointPlanCard.effects.leisure}</div>
                      )}
                      {jointPlanCard.effects.water && (
                        <div className="effect-item">✨ 물 +{jointPlanCard.effects.water}</div>
                      )}
                      {jointPlanCard.effects.memory && (
                        <div className="effect-item">✨ 추억 +{jointPlanCard.effects.memory}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 보너스 정보 */}
                {jointPlanCard.metadata?.bonus && (
                  <div className="joint-card-bonus">
                    🎁 최다 기여자 보너스: {jointPlanCard.metadata.bonus}
                  </div>
                )}
              </div>
            ) : (
              <div className="joint-plan-card">
                <div className="joint-card-name">공동 계획 준비 중...</div>
              </div>
            )}
            <div className="joint-plan-info">
              <div className="joint-plan-progress">
                <div className="progress-label">
                  <span>현재 기여액</span>
                  <span className="progress-amount">{jointPlanTotal.toLocaleString()}TC</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min((jointPlanTotal / 10000) * 100, 100)}%` }}
                  />
                </div>
                <div className="progress-target">목표: 10,000TC</div>
              </div>
              <button 
                className="btn-contribute"
                onClick={() => setShowContributeModal(true)}
                disabled={!playerState || playerState.money < 1000}
              >
                기여하기
              </button>
            </div>
          </div>
          
          <ActionLog gameId={gameId} />
        </div>
      </div>

      <ChanceOptionModal
        isOpen={showChanceOption}
        onSelect={handleChanceOptionSelect}
      />

      {showContributeModal && (
        <ContributeModal
          currentMoney={playerState?.money || 0}
          targetAmount={10000}
          currentAmount={0}
          onContribute={handleContribute}
          onClose={() => setShowContributeModal(false)}
        />
      )}

      <CardDrawModal
        isOpen={showCardDrawModal}
        card={drawnCard}
        onClose={() => {
          setShowCardDrawModal(false);
          setDrawnCard(null);
        }}
      />

      <ChanceInteractionModal
        isOpen={showChanceInteraction}
        type={chanceInteraction?.type}
        players={allPlayers}
        currentPlayerId={playerId}
        handCards={playerState?.hand_cards || []}
        targetHandCards={chanceInteraction?.targetPlayerId ? 
          allPlayers.find(p => p.player_id === chanceInteraction.targetPlayerId)?.hand_cards || [] : 
          []
        }
        onResponse={handleChanceResponse}
        onCancel={handleChanceCancel}
      />
    </div>
  );
}

export default GameScreen;
