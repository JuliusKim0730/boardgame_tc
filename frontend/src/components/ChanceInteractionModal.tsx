import { useState } from 'react';
import './ChanceInteractionModal.css';

interface Player {
  player_id: string;
  nickname: string;
  position: number;
  money: number;
}

interface Card {
  id: string;
  name: string;
  cost?: number;
}

interface Props {
  isOpen: boolean;
  type: 'shared_house' | 'shared_invest' | 'purchase_request' | 'card_exchange' | 'swap_position' | 'buddy_action' | 'select_joint_plan';
  players: Player[];
  currentPlayerId: string;
  handCards?: Card[];
  targetHandCards?: Card[];
  jointPlanCards?: Card[];
  onResponse: (response: any) => void;
  onCancel: () => void;
}

function ChanceInteractionModal({ 
  isOpen, 
  type, 
  players, 
  currentPlayerId,
  handCards = [],
  targetHandCards = [],
  jointPlanCards = [],
  onResponse, 
  onCancel 
}: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedTargetCardId, setSelectedTargetCardId] = useState<string | null>(null);

  if (!isOpen) return null;

  const otherPlayers = players.filter(p => p.player_id !== currentPlayerId);

  const getTitle = () => {
    switch (type) {
      case 'shared_house':
        return '🏠 친구랑 같이 집안일';
      case 'shared_invest':
        return '💰 공동 지원 이벤트';
      case 'purchase_request':
        return '🛒 계획 구매 요청';
      case 'card_exchange':
        return '🔄 계획 교환';
      case 'swap_position':
        return '↔️ 자리 바꾸기';
      case 'buddy_action':
        return '👥 동행 버디';
      case 'select_joint_plan':
        return '📖 여행 팜플렛';
      default:
        return '찬스 카드';
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'shared_house':
        return '함께 집안일을 할 플레이어를 선택하세요. 두 플레이어 모두 집안일 카드의 수익을 받습니다.';
      case 'shared_invest':
        return '함께 투자할 플레이어를 선택하세요. 두 플레이어 모두 여행 지원 카드의 효과를 받습니다.';
      case 'purchase_request':
        return '1,000TC에 계획 카드를 판매하시겠습니까?';
      case 'card_exchange':
        return '계획 카드를 교환할 플레이어를 선택하세요.';
      case 'swap_position':
        return '위치를 교환할 플레이어를 선택하세요.';
      case 'buddy_action':
        return '함께 행동할 플레이어를 선택하세요. 두 플레이어 모두 추가 행동 1회를 수행할 수 있습니다.';
      case 'select_joint_plan':
        return '공동 목표로 사용할 카드를 선택하세요. 선택한 카드가 게임의 공동 목표가 됩니다.';
      default:
        return '';
    }
  };

  const handleConfirm = () => {
    if (type === 'purchase_request') {
      // 구매 요청 수락/거절
      onResponse({ accepted: true, targetId: selectedPlayerId, cardId: selectedCardId });
    } else if (type === 'card_exchange') {
      // 카드 교환
      if (!selectedPlayerId || !selectedCardId || !selectedTargetCardId) {
        alert('교환할 카드를 모두 선택해주세요');
        return;
      }
      onResponse({ 
        accepted: true, 
        targetId: selectedPlayerId, 
        requesterCardId: selectedCardId,
        targetCardId: selectedTargetCardId
      });
    } else if (type === 'select_joint_plan') {
      // 공동 목표 카드 선택
      if (!selectedCardId) {
        alert('공동 목표 카드를 선택해주세요');
        return;
      }
      onResponse({ cardId: selectedCardId });
    } else {
      // 일반 플레이어 선택
      if (!selectedPlayerId) {
        alert('플레이어를 선택해주세요');
        return;
      }
      onResponse({ targetId: selectedPlayerId });
    }
  };

  const handleReject = () => {
    onResponse({ accepted: false });
  };

  return (
    <div className="modal-overlay">
      <div className="chance-interaction-modal">
        <div className="modal-header">
          <h2>{getTitle()}</h2>
        </div>
        
        <div className="modal-body">
          <p className="interaction-message">{getMessage()}</p>
          
          {/* 플레이어 선택 */}
          {(type !== 'purchase_request' && type !== 'select_joint_plan') && (
            <div className="player-selection">
              <h3>플레이어 선택</h3>
              <div className="player-list">
                {otherPlayers.map(player => (
                  <div
                    key={player.player_id}
                    className={`player-item ${selectedPlayerId === player.player_id ? 'selected' : ''}`}
                    onClick={() => setSelectedPlayerId(player.player_id)}
                  >
                    <div className="player-info">
                      <div className="player-name">{player.nickname}</div>
                      <div className="player-stats">
                        💰 {player.money.toLocaleString()}TC | 📍 {player.position}번
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 카드 교환: 내 카드 선택 */}
          {type === 'card_exchange' && handCards.length > 0 && (
            <div className="card-selection">
              <h3>내 카드 선택</h3>
              <div className="card-list">
                {handCards.map(card => (
                  <div
                    key={card.id}
                    className={`card-item ${selectedCardId === card.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <div className="card-name">{card.name}</div>
                    {card.cost && <div className="card-cost">{card.cost.toLocaleString()}TC</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 카드 교환: 상대 카드 선택 */}
          {type === 'card_exchange' && selectedPlayerId && targetHandCards.length > 0 && (
            <div className="card-selection">
              <h3>상대 카드 선택</h3>
              <div className="card-list">
                {targetHandCards.map(card => (
                  <div
                    key={card.id}
                    className={`card-item ${selectedTargetCardId === card.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTargetCardId(card.id)}
                  >
                    <div className="card-name">{card.name}</div>
                    {card.cost && <div className="card-cost">{card.cost.toLocaleString()}TC</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 구매 요청: 카드 선택 */}
          {type === 'purchase_request' && handCards.length > 0 && (
            <div className="card-selection">
              <h3>판매할 카드 선택</h3>
              <div className="card-list">
                {handCards.map(card => (
                  <div
                    key={card.id}
                    className={`card-item ${selectedCardId === card.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <div className="card-name">{card.name}</div>
                    {card.cost && <div className="card-cost">{card.cost.toLocaleString()}TC</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 공동 목표 카드 선택 */}
          {type === 'select_joint_plan' && jointPlanCards.length > 0 && (
            <div className="card-selection">
              <h3>공동 목표 카드 선택</h3>
              <div className="card-list">
                {jointPlanCards.map(card => (
                  <div
                    key={card.id}
                    className={`card-item ${selectedCardId === card.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <div className="card-name">{card.name}</div>
                    {card.cost && <div className="card-cost">목표: {card.cost.toLocaleString()}TC</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          {type === 'purchase_request' ? (
            <>
              <button className="btn-reject" onClick={handleReject}>
                거절
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleConfirm}
                disabled={!selectedCardId}
              >
                판매 (1,000TC)
              </button>
            </>
          ) : (
            <>
              <button className="btn-cancel" onClick={onCancel}>
                취소
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleConfirm}
                disabled={type === 'select_joint_plan' ? !selectedCardId : !selectedPlayerId}
              >
                확인
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChanceInteractionModal;
