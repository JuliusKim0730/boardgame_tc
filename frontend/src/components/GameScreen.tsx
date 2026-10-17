import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import GameBoard from './GameBoard';
import PlayerInfo from './PlayerInfo';
import HandCards from './HandCards';
import ChanceOptionModal from './ChanceOptionModal';
import ResultScreen from './ResultScreen';
import ActionLog from './ActionLog';
import CardDrawModal from './CardDrawModal';
import FinalPurchaseModal, { type FinalSubmission } from './FinalPurchaseModal';
import ChanceInteractionModal from './ChanceInteractionModal';
import ExtraActionModal from './ExtraActionModal';
import JointPlanSelectModal from './JointPlanSelectModal';
import DiscardSelectModal from './DiscardSelectModal';
import PurchaseConfirmModal from './PurchaseConfirmModal';
import PlayerSelectModal from './PlayerSelectModal';
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
  players?: any[];
}

// 플레이어 색상 매핑
const getPlayerColor = (index: number): string => {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
  return colors[index % colors.length];
};

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
  const [showResult, setShowResult] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [hasActed, setHasActed] = useState(false);
  const [travelCardExpanded, setTravelCardExpanded] = useState(false);
  const [jointPlanCard, setJointPlanCard] = useState<any>(null);
  const [jointPlanTotal, setJointPlanTotal] = useState(0);
  const [jointPlanTarget, setJointPlanTarget] = useState(0);
  const [jointOptions, setJointOptions] = useState<any[] | undefined>(undefined);
  const [lastAction, setLastAction] = useState<number | null>(null);
  const [submittedPlayers, setSubmittedPlayers] = useState<string[]>([]);
  const [drawnCard, setDrawnCard] = useState<any>(null);
  const [showCardDrawModal, setShowCardDrawModal] = useState(false);
  const [showFinalPurchase, setShowFinalPurchase] = useState(false);
  const [finalPurchaseComplete, setFinalPurchaseComplete] = useState(false);
  const [chanceInteraction, setChanceInteraction] = useState<any>(null);
  const [showChanceInteraction, setShowChanceInteraction] = useState(false);
  const [showExtraAction, setShowExtraAction] = useState(false);
  const [extraActionType, setExtraActionType] = useState<'extra_action' | 'repeat_current' | 'buddy_action'>('extra_action');
  const [showJointPlanSelect, setShowJointPlanSelect] = useState(false);
  const [autoEndTimer, setAutoEndTimer] = useState<number | null>(null);
  
  // 새로운 찬스 카드 모달 상태
  const [showDiscardSelect, setShowDiscardSelect] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [showPlayerSelect, setShowPlayerSelect] = useState(false);
  const [playerSelectConfig] = useState<any>(null);

  // 게임 상태 로드
  const loadGameState = async (preserveActionState = false) => {
    try {
      const response = await api.getGameState(gameId);
      const { game, players, jointPlan, turn, finalSubmitted } = response.data;
      
      
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
        setJointPlanTarget(jointPlan.target || 0);
      }

      // 턴 진행 상태는 서버 기록을 기준으로 복원 (새로고침해도 유지)
      if (turn && turn.playerId === playerId) {
        setHasMoved(turn.moved || turn.forcedMove);
        setHasActed(turn.mainDone);
        setLastAction(turn.lastAction ?? null);
      }

      // 14일차 이후 최종 결산
      const submitted: string[] = finalSubmitted || [];
      setSubmittedPlayers(submitted);
      if (game.status === 'finalizing') {
        setShowFinalPurchase(true);
        setFinalPurchaseComplete(submitted.includes(playerId));
      }
      
      // 내 플레이어 상태 찾기
      const myState = players.find((p: any) => p.player_id === playerId);
      if (myState) {
        setPlayerState(myState);
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
      loadGameState();
    });

    socket.on('player-moved', (data: any) => {
      if (data.playerId === playerId) {
        setHasMoved(true);
        setMessage('행동을 선택하세요 (1~6번)');
      }
      loadGameState();
    });

    socket.on('move-completed', (data: any) => {
      if (data.playerId !== playerId) {
        // 다른 플레이어의 이동 알림
        const player = gameState?.players?.find((p: any) => p.player_id === data.playerId);
        const playerName = player?.name || '다른 플레이어';
        const positionNames: { [key: number]: string } = {
          1: '무료 계획',
          2: '조사하기',
          3: '집안일',
          4: '여행 지원',
          5: '찬스',
          6: '자유 행동'
        };
        const toName = positionNames[data.to] || `${data.to}번`;
        setMessage(`${playerName}님이 ${toName} 칸으로 이동했습니다`);
      }
      // 상태 새로고침
      setTimeout(() => loadGameState(true), 300);
    });

    socket.on('action-completed', (data: any) => {
      if (data.playerId === playerId) {
        setHasActed(true);
        
        // 찬스 카드 특수 효과 처리
        if (data.result?.type === 'special') {
          if (data.result.action === 'extra_action') {
            // CH18: 체력이 넘친다!
            setExtraActionType('extra_action');
            setShowExtraAction(true);
            setMessage('체력이 넘친다! 이동 없이 행동 1회를 수행할 수 있습니다.');
            return;
          } else if (data.result.action === 'repeat_current') {
            // CH19: 반전의 기회
            setExtraActionType('repeat_current');
            setShowExtraAction(true);
            setMessage('반전의 기회! 현재 칸에서 행동을 1회 더 수행할 수 있습니다.');
            return;
          } else if (data.result.action === 'select_joint_plan' && data.result.requiresSelection) {
            // CH17: 여행 팜플렛 - 현재 목표와 새로 본 카드 중 선택
            setJointOptions(data.result.options);
            setShowJointPlanSelect(true);
            setMessage('여행 팜플렛! 공동 목표 카드를 선택하세요.');
            return;
          } else if (data.result.action === 'select_discard' && data.result.requiresSelection) {
            // CH16: 버린만큼 뽑기
            setShowDiscardSelect(true);
            setMessage('버린만큼 뽑기! 버릴 계획 카드를 선택하세요.');
            return;
          }
        } else if (data.result?.type === 'catchup' && data.result.action === 'buddy_action') {
          // CH25: 동행 버디 - 대상 선택 후 추가 행동
          setExtraActionType('buddy_action');
          setShowExtraAction(true);
          setMessage('동행 버디! 추가 행동 1회를 수행할 수 있습니다.');
          return;
        }
        
        // 카드를 뽑은 경우 모달 표시
        if (data.result?.card) {
          setDrawnCard(data.result.card);
          setShowCardDrawModal(true);
        }
        
        // 자동 턴 종료 타이머 시작 (3초)
        setAutoEndTimer(3);
      } else {
        // 다른 플레이어의 행동 알림
        const actionNames: { [key: number]: string } = {
          1: '무료 계획',
          2: '조사하기',
          3: '집안일',
          4: '여행 지원',
          5: '찬스',
          6: '자유 행동'
        };
        const actionName = actionNames[data.actionType] || '행동';
        const playerName = data.playerName || '다른 플레이어';
        
        setMessage(`${playerName}님이 ${actionName}을 수행했습니다`);
        
        // 카드를 뽑은 경우 카드 정보도 표시 (모달로)
        if (data.result?.card) {
          setTimeout(() => {
            setDrawnCard({
              ...data.result.card,
              drawnBy: playerName // 누가 뽑았는지 표시
            });
            setShowCardDrawModal(true);
            setMessage(`${playerName}님이 "${data.result.card.name}" 카드를 획득했습니다`);
          }, 800);
        }
      }
      // 행동 완료 후 상태 새로고침 (손패 업데이트 포함)
      setTimeout(() => loadGameState(true), 500);
    });

    socket.on('chance-request', (data: any) => {
      if (data.requesterId !== playerId) {
        setMessage('다른 플레이어가 찬스 카드 대상을 고르는 중...');
        return;
      }
      setChanceInteraction(data);
      setShowChanceInteraction(true);
      setMessage(data.message);
    });

    socket.on('chance-resolved', () => {
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
      setMessage('14일이 끝났습니다! 최종 결산을 진행하세요.');
      setShowFinalPurchase(true);
      loadGameState();
    });

    socket.on('final-submitted', () => {
      loadGameState();
    });

    socket.on('joint-plan-selected', () => {
      loadGameState(true);
    });

    socket.on('final-results', () => {
      setMessage('모든 플레이어의 최종 구매가 완료되었습니다!');
      // 최종 구매 모달 닫기
      setShowFinalPurchase(false);
      // 결과 화면 표시
      setShowResult(true);
    });


    socket.on('ai-turn-error', (data: any) => {
      console.error('❌ AI 턴 에러:', data);
      setMessage(`⚠️ AI 플레이어 오류: ${data.error}`);
      // 상태 새로고침 시도
      setTimeout(() => loadGameState(), 1000);
    });

    // Socket 재연결 시 상태 동기화
    socket.on('reconnect', () => {
      loadGameState();
    });

    return () => {
      socketService.disconnect();
    };
  }, [roomId, playerId, gameId]);

  // 자동 턴 종료 타이머
  useEffect(() => {
    if (autoEndTimer === null || autoEndTimer <= 0) return;

    const timer = setTimeout(() => {
      if (autoEndTimer === 1) {
        // 타이머 종료 - 자동 턴 종료
        handleEndTurn();
        setAutoEndTimer(null);
      } else {
        // 카운트다운
        setAutoEndTimer(autoEndTimer - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoEndTimer]);

  const handleMove = async (position: number) => {
    
    if (gameState.currentTurnPlayerId !== playerId) {
      setMessage('당신의 턴이 아닙니다!');
      return;
    }

    if (hasMoved) {
      setMessage('이미 이동했습니다!');
      return;
    }

    try {
      
      await api.move(gameId, playerId, position);
      
      // 즉시 상태 업데이트 (버튼 변경을 위해)
      setSelectedPosition(position);
      setHasMoved(true);
      
      // 플레이어 상태도 즉시 업데이트
      if (playerState) {
        setPlayerState({
          ...playerState,
          position: position
        });
      }
      
      setMessage(`${position}번 칸으로 이동했습니다. 행동을 선택하세요.`);
      
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
      // 타이머 취소
      setAutoEndTimer(null);
      
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
      // 타이머 취소
      setAutoEndTimer(null);
      
      // 결심 토큰 사용
      await api.useResolveToken(gameId, playerId, actionType);
      
      // 선택한 행동 수행 (자동 턴 종료 타이머는 action-completed 이벤트에서 다시 시작)
      const result = await api.performAction(gameId, playerId, actionType);
      if (result.data?.requiresChoice) {
        // 2인 찬스 칸: 카드 / 500TC 선택
        setShowChanceOption(true);
        return;
      }
      setMessage(result.data?.message || `결심 토큰 사용! ${getActionName(actionType)} 완료`);
      await loadGameState(true);
    } catch (error: any) {
      setMessage(error.response?.data?.error || '결심 토큰 사용 실패');
    }
  };

  const handleFinalPurchase = async (submission: FinalSubmission) => {
    try {
      const response = await api.finalPurchase(gameId, playerId, submission);
      setFinalPurchaseComplete(true);
      setMessage('제출 완료! 다른 플레이어를 기다리는 중...');
      if (response.data?.allSubmitted) setShowResult(true);
      loadGameState();
    } catch (error: any) {
      alert(error.response?.data?.error || '최종 제출 실패');
      loadGameState();
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
      
    } catch (error: any) {
      setMessage(error.response?.data?.error || '선택 실패');
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

  const handleExtraAction = async (actionType: number) => {
    try {
      // 추가 행동 수행
      const response = await api.extraAction(gameId, playerId, actionType, true);
      
      setShowExtraAction(false);
      if (response.data?.requiresChoice) {
        setShowChanceOption(true);
        return;
      }
      
      if (response.data?.message) {
        setMessage(response.data.message);
      } else {
        setMessage(`추가 행동 완료: ${getActionName(actionType)}`);
      }
      
      // 상태 새로고침
      await loadGameState(true);
    } catch (error: any) {
      console.error('추가 행동 실패:', error);
      setMessage(error.response?.data?.error || '추가 행동 실패');
    }
  };

  const handleJointPlanSelect = async (cardId: string) => {
    try {
      await api.selectJointPlan(gameId, cardId, playerId);
      setShowJointPlanSelect(false);
      setJointOptions(undefined);
      setMessage('공동 목표 카드가 선택되었습니다!');
      
      // 상태 새로고침
      await loadGameState(true);
    } catch (error: any) {
      console.error('공동 목표 선택 실패:', error);
      setMessage(error.response?.data?.error || '공동 목표 선택 실패');
    }
  };

  // CH16: 버린만큼 뽑기 핸들러
  const handleDiscardAndDraw = async (cardIds: string[]) => {
    try {
      const response = await api.post(`/games/${gameId}/discard-and-draw`, {
        playerId,
        cardIds
      });
      
      setShowDiscardSelect(false);
      setMessage(response.data.message || `${cardIds.length}장을 버리고 계획 카드를 획득했습니다!`);
      
      // 상태 새로고침
      await loadGameState(true);
    } catch (error: any) {
      console.error('버린만큼 뽑기 실패:', error);
      setMessage(error.response?.data?.error || '버린만큼 뽑기 실패');
    }
  };

  // CH9: 구매 확인 핸들러
  const handlePurchaseConfirm = async () => {
    try {
      // 구매 로직 실행
      setShowPurchaseConfirm(false);
      setMessage('계획 카드를 구매했습니다!');
      
      // 상태 새로고침
      await loadGameState(true);
    } catch (error: any) {
      console.error('구매 실패:', error);
      setMessage(error.response?.data?.error || '구매 실패');
    }
  };

  // 플레이어 선택 핸들러
  const handlePlayerSelect = async (selectedPlayerId: string) => {
    try {
      setShowPlayerSelect(false);
      
      if (playerSelectConfig?.onSelect) {
        await playerSelectConfig.onSelect(selectedPlayerId);
      }
      
      // 상태 새로고침
      await loadGameState(true);
    } catch (error: any) {
      console.error('플레이어 선택 실패:', error);
      setMessage(error.response?.data?.error || '플레이어 선택 실패');
    }
  };

  const isMyTurn = gameState.currentTurnPlayerId === playerId;

  // 최종 구매 모달 표시
  if (showFinalPurchase && !finalPurchaseComplete && !showResult) {
    const myPlayer = allPlayers.find(p => p.player_id === playerId);
    return (
      <div className="game-screen">
        <FinalPurchaseModal
          isOpen={true}
          handCards={playerState?.hand_cards || []}
          currentMoney={playerState?.money || 0}
          travelCard={myPlayer?.travelCard}
          traits={myPlayer?.traits}
          jointPlan={jointPlanCard ? { card: jointPlanCard, total: jointPlanTotal, target: jointPlanTarget } : null}
          playerCount={allPlayers.length}
          onPurchase={handleFinalPurchase}
        />
      </div>
    );
  }

  if (showFinalPurchase && finalPurchaseComplete && !showResult) {
    return (
      <div className="game-screen">
        <div className="card final-waiting">
          <h2>⏳ 최종 결산 대기 중</h2>
          <p>모든 플레이어가 제출하면 공동 목표 기여액을 동시에 공개하고 점수를 계산합니다.</p>
          <ul>
            {allPlayers.map(p => (
              <li key={p.player_id}>
                {submittedPlayers.includes(p.player_id) ? '✅' : '⌛'} {p.nickname}
                {p.player_id === playerId && ' (나)'}
              </li>
            ))}
          </ul>
        </div>
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
        

        
        <button className="btn-exit" onClick={() => {
          // 게임 나가기 이벤트 발송
          socketService.emit('exit-game', { gameId, playerId });
          onBackToLobby();
        }}>
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
                    {travelCard.cost > 0 && (
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
              blockedPosition={(playerState as any)?.last_position}
              onPositionClick={handleMove}
              disabled={!isMyTurn || hasMoved}
              allPlayers={allPlayers.map((p, index) => ({
                playerId: p.player_id,
                nickname: p.nickname || `플레이어 ${p.turn_order + 1}`,
                position: p.position,
                color: getPlayerColor(index)
              }))}
            />
            <div className="board-hint">
              {isMyTurn && !hasMoved && '💡 인접한 칸(밝게 표시)을 클릭하여 이동하세요'}
              {isMyTurn && hasMoved && !hasActed && '⚡ 아래에서 행동을 선택하세요'}
              {!isMyTurn && '⏳ 다른 플레이어의 턴을 기다리는 중...'}
            </div>
          </div>
          
          {/* 행동 선택 버튼 - 내 턴일 때 항상 노출 */}
          {isMyTurn && (
            <div className="action-selection">
              <h3>행동 선택</h3>
              <p className="action-hint">
                📍 현재 위치: {playerState?.position}번 칸 - {getActionName(playerState?.position || 1)}
                {!hasMoved && <span style={{ color: '#ff9800', marginLeft: '10px' }}>⚠️ 먼저 이동하세요</span>}
                {hasActed && <span style={{ color: '#4caf50', marginLeft: '10px' }}>✅ 행동 완료</span>}
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
                        disabled={!hasMoved || hasActed}
                        style={{ 
                          opacity: (hasMoved && !hasActed) ? 1 : 0.5, 
                          cursor: (hasMoved && !hasActed) ? 'pointer' : 'not-allowed' 
                        }}
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
                    disabled={!hasMoved || hasActed}
                    style={{ 
                      opacity: (hasMoved && !hasActed) ? 1 : 0.5, 
                      cursor: (hasMoved && !hasActed) ? 'pointer' : 'not-allowed' 
                    }}
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
                {autoEndTimer !== null ? `턴 종료 (${autoEndTimer}초)` : '턴 종료'}
              </button>
              
              {playerState && playerState.resolve_token > 0 && (
                <div className="resolve-token-section">
                  <div className="resolve-token-hint">
                    🔥 결심 토큰 {playerState.resolve_token}개 보유
                  </div>
                  <div className="resolve-token-actions">
                    <p className="resolve-hint">추가 행동을 선택하세요 (직전 행동 제외)</p>
                    <div className="resolve-action-buttons">
                      {[1, 2, 3, 4, 5].map(num => (
                        <button
                          key={num}
                          className={`btn-resolve-action ${num === lastAction ? 'disabled' : ''}`}
                          onClick={() => handleUseResolveToken(num)}
                          disabled={num === lastAction}
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
                {jointPlanCard.cost > 0 && (
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
                    style={{ width: `${jointPlanTarget ? Math.min((jointPlanTotal / jointPlanTarget) * 100, 100) : 0}%` }}
                  />
                </div>
                <div className="progress-target">목표: {jointPlanTarget.toLocaleString()}TC</div>
              </div>
              <p className="joint-plan-note">💡 기여는 14일차가 끝난 뒤 최종 결산에서 비공개로 동시에 진행합니다.</p>
            </div>
          </div>
          
          <ActionLog gameId={gameId} />
        </div>
      </div>

      <ChanceOptionModal
        isOpen={showChanceOption}
        onSelect={handleChanceOptionSelect}
      />

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
        onResponse={handleChanceResponse}
        onCancel={handleChanceCancel}
      />

      <ExtraActionModal
        isOpen={showExtraAction}
        type={extraActionType}
        currentPosition={playerState?.position}
        availableActions={[1, 2, 3, 4, 5].filter(a => extraActionType === 'repeat_current' || a !== lastAction)}
        onSelectAction={handleExtraAction}
        onCancel={() => setShowExtraAction(false)}
      />

      <JointPlanSelectModal
        isOpen={showJointPlanSelect}
        options={jointOptions}
        onSelect={handleJointPlanSelect}
        onCancel={() => setShowJointPlanSelect(false)}
      />

      <DiscardSelectModal
        isOpen={showDiscardSelect}
        handCards={(playerState?.hand_cards || []).filter((c: any) => c.type === 'plan')}
        onConfirm={handleDiscardAndDraw}
        onCancel={() => setShowDiscardSelect(false)}
      />

      <PurchaseConfirmModal
        isOpen={showPurchaseConfirm}
        currentMoney={playerState?.money || 0}
        cost={1000}
        description="1,000 TC를 지불해서 계획카드를 구매하시겠습니까?"
        onConfirm={handlePurchaseConfirm}
        onCancel={() => setShowPurchaseConfirm(false)}
      />

      <PlayerSelectModal
        isOpen={showPlayerSelect}
        title={playerSelectConfig?.title || '플레이어 선택'}
        description={playerSelectConfig?.description || '플레이어를 선택하세요'}
        players={allPlayers}
        currentPlayerId={playerId}
        filterCondition={playerSelectConfig?.filterCondition}
        onSelect={handlePlayerSelect}
        onCancel={() => setShowPlayerSelect(false)}
        showGiveUp={playerSelectConfig?.showGiveUp}
      />
    </div>
  );
}

export default GameScreen;
