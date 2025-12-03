import { pool } from '../db/pool';
import { Server } from 'socket.io';

interface ChanceInteraction {
  gameId: string;
  requesterId: string;
  targetId?: string;
  chanceCode: string;
  timeout: NodeJS.Timeout;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

export class ChanceService {
  private pendingInteractions: Map<string, ChanceInteraction> = new Map();
  private io: Server | null = null;

  setSocketIO(io: Server) {
    this.io = io;
  }

  // 플레이어 수 조회
  private async getPlayerCount(gameId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM player_states WHERE game_id = $1',
      [gameId]
    );
    return parseInt(result.rows[0].count);
  }

  // 찬스 카드 실행
  async executeChance(gameId: string, playerId: string, cardCode: string): Promise<any> {
    const client = await pool.connect();
    try {
      const cardResult = await client.query(
        'SELECT * FROM cards WHERE code = $1',
        [cardCode]
      );
      
      if (cardResult.rows.length === 0) {
        throw new Error('카드를 찾을 수 없습니다');
      }

      const card = cardResult.rows[0];
      const metadata = card.metadata || {};

      // 2인 전용 금지 카드 체크
      const playerCount = await this.getPlayerCount(gameId);
      if (playerCount === 2 && metadata.forbidden_2p) {
        throw new Error(`이 카드는 2인 플레이에서 사용할 수 없습니다. (${card.name})`);
      }

      // 카드 타입별 처리
      switch (metadata.type) {
        case 'money':
          return await this.handleMoneyCard(client, gameId, playerId, card);
        
        case 'interaction':
          return await this.handleInteractionCard(gameId, playerId, card, metadata.action);
        
        case 'draw':
          return await this.handleDrawCard(client, gameId, playerId, metadata.action);
        
        case 'special':
          return await this.handleSpecialCard(client, gameId, playerId, metadata.action);
        
        case 'catchup':
          return await this.handleCatchupCard(client, gameId, playerId, metadata.action);
        
        default:
          throw new Error('알 수 없는 카드 타입입니다');
      }
    } finally {
      client.release();
    }
  }

  // 돈 카드 처리
  private async handleMoneyCard(client: any, gameId: string, playerId: string, card: any) {
    const moneyChange = card.effects.money || 0;
    
    await client.query(
      `UPDATE player_states SET money = money + $1 
       WHERE game_id = $2 AND player_id = $3`,
      [moneyChange, gameId, playerId]
    );

    return { type: 'money', amount: moneyChange };
  }

  // 상호작용 카드 처리
  private async handleInteractionCard(gameId: string, playerId: string, card: any, action: string) {
    switch (action) {
      case 'shared_house':
        return await this.handleSharedHouse(gameId, playerId);
      
      case 'shared_invest':
        return await this.handleSharedInvest(gameId, playerId);
      
      case 'purchase_request':
        return await this.handlePurchaseRequest(gameId, playerId);
      
      case 'card_exchange':
        return await this.handleCardExchange(gameId, playerId);
      
      case 'summon_all':
        return await this.handleSummonAll(gameId, playerId);
      
      case 'swap_position':
        return await this.handleSwapPosition(gameId, playerId);
      
      default:
        throw new Error('알 수 없는 상호작용입니다');
    }
  }

  // CH8: 친구랑 같이 집안일
  private async handleSharedHouse(gameId: string, requesterId: string): Promise<any> {
    const interactionId = `${gameId}-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(async () => {
        this.pendingInteractions.delete(interactionId);
        reject(new Error('응답 시간 초과'));
      }, 30000); // 30초

      this.pendingInteractions.set(interactionId, {
        gameId,
        requesterId,
        chanceCode: 'CH8',
        timeout,
        resolve,
        reject
      });

      // 대상 선택 요청
      this.io?.to(gameId).emit('chance-request', {
        interactionId,
        type: 'shared_house',
        requesterId,
        message: '함께 집안일을 할 플레이어를 선택하세요'
      });
    });
  }

  // CH9: 공동 투자
  private async handleSharedInvest(gameId: string, requesterId: string): Promise<any> {
    const interactionId = `${gameId}-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingInteractions.delete(interactionId);
        reject(new Error('응답 시간 초과'));
      }, 30000);

      this.pendingInteractions.set(interactionId, {
        gameId,
        requesterId,
        chanceCode: 'CH9',
        timeout,
        resolve,
        reject
      });

      this.io?.to(gameId).emit('chance-request', {
        interactionId,
        type: 'shared_invest',
        requesterId,
        message: '함께 투자할 플레이어를 선택하세요'
      });
    });
  }

  // CH10: 계획 구매 요청
  private async handlePurchaseRequest(gameId: string, requesterId: string): Promise<any> {
    const interactionId = `${gameId}-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingInteractions.delete(interactionId);
        resolve({ accepted: false, reason: 'timeout' });
      }, 30000);

      this.pendingInteractions.set(interactionId, {
        gameId,
        requesterId,
        chanceCode: 'CH10',
        timeout,
        resolve,
        reject
      });

      this.io?.to(gameId).emit('chance-request', {
        interactionId,
        type: 'purchase_request',
        requesterId,
        price: 1000,
        message: '1,000원에 계획 카드를 판매하시겠습니까?'
      });
    });
  }

  // CH11: 계획 교환
  private async handleCardExchange(gameId: string, requesterId: string): Promise<any> {
    const interactionId = `${gameId}-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingInteractions.delete(interactionId);
        resolve({ accepted: false, reason: 'timeout' });
      }, 30000);

      this.pendingInteractions.set(interactionId, {
        gameId,
        requesterId,
        chanceCode: 'CH11',
        timeout,
        resolve,
        reject
      });

      this.io?.to(gameId).emit('chance-request', {
        interactionId,
        type: 'card_exchange',
        requesterId,
        message: '계획 카드를 교환하시겠습니까?'
      });
    });
  }

  // CH12: 모두 내 자리로
  private async handleSummonAll(gameId: string, playerId: string): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 요청자의 현재 위치 조회
      const positionResult = await client.query(
        'SELECT position FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      const targetPosition = positionResult.rows[0].position;

      // 모든 플레이어를 해당 위치로 이동하고 forced_move 플래그 설정
      await client.query(
        'UPDATE player_states SET position = $1, forced_move = TRUE WHERE game_id = $2 AND player_id != $3',
        [targetPosition, gameId, playerId]
      );

      await client.query('COMMIT');

      this.io?.to(gameId).emit('all-summoned', {
        playerId,
        position: targetPosition
      });

      return { type: 'summon_all', position: targetPosition };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // CH13: 자릿수 바꾸기
  private async handleSwapPosition(gameId: string, requesterId: string): Promise<any> {
    const interactionId = `${gameId}-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingInteractions.delete(interactionId);
        reject(new Error('응답 시간 초과'));
      }, 30000);

      this.pendingInteractions.set(interactionId, {
        gameId,
        requesterId,
        chanceCode: 'CH13',
        timeout,
        resolve,
        reject
      });

      this.io?.to(gameId).emit('chance-request', {
        interactionId,
        type: 'swap_position',
        requesterId,
        message: '위치를 교환할 플레이어를 선택하세요'
      });
    });
  }

  // 드로우 카드 처리
  private async handleDrawCard(client: any, gameId: string, playerId: string, action: string) {
    switch (action) {
      case 'catchup_plan':
        // CH14: 계획 최저 플레이어에게 드로우
        return await this.drawPlanForLowest(client, gameId);
      
      case 'draw_plan':
        // CH15: 계획 1장 드로우
        return await this.drawPlan(client, gameId, playerId);
      
      default:
        return { type: 'draw', action };
    }
  }

  // 캐치업 카드 처리
  private async handleCatchupCard(client: any, gameId: string, playerId: string, action: string) {
    switch (action) {
      case 'catchup_money':
        // CH21: 엄마의 응원 - TC 가장 적은 사람 +2,000TC
        return await this.catchupMoney(client, gameId);
      
      case 'catchup_plan':
        // CH22: 여행 선생님의 조언 - 일반 계획 가장 적은 사람 +1
        return await this.drawPlanForLowest(client, gameId);
      
      case 'catchup_memory':
        // CH23, CH24: 추억 가장 낮은 사람 +2
        return await this.catchupMemory(client, gameId);
      
      case 'buddy_action':
        // CH25: 동행 버디 - 본인 행동1회, 지목1명 행동1회
        return await this.handleBuddyAction(gameId, playerId);
      
      default:
        return { type: 'catchup', action };
    }
  }

  // CH21: TC 가장 적은 사람에게 +2,000TC
  private async catchupMoney(client: any, gameId: string) {
    const result = await client.query(
      `SELECT player_id, money
       FROM player_states
       WHERE game_id = $1
       ORDER BY money ASC
       LIMIT 1`,
      [gameId]
    );

    if (result.rows.length > 0) {
      const lowestPlayer = result.rows[0];
      
      await client.query(
        'UPDATE player_states SET money = money + 2000 WHERE game_id = $1 AND player_id = $2',
        [gameId, lowestPlayer.player_id]
      );

      return { 
        type: 'catchup', 
        action: 'money', 
        targetPlayerId: lowestPlayer.player_id,
        amount: 2000,
        message: `TC가 가장 적은 플레이어에게 +2,000TC`
      };
    }

    return { type: 'catchup', action: 'money', result: 'no_player' };
  }

  // CH23, CH24: 추억 가장 낮은 사람에게 +2
  private async catchupMemory(client: any, gameId: string) {
    const result = await client.query(
      `SELECT player_id, traits
       FROM player_states
       WHERE game_id = $1
       ORDER BY (traits->>'memory')::int ASC NULLS FIRST
       LIMIT 1`,
      [gameId]
    );

    if (result.rows.length > 0) {
      const lowestPlayer = result.rows[0];
      
      await client.query(
        `UPDATE player_states 
         SET traits = jsonb_set(
           traits, 
           '{memory}', 
           to_jsonb(COALESCE((traits->>'memory')::int, 0) + 2)
         )
         WHERE game_id = $1 AND player_id = $2`,
        [gameId, lowestPlayer.player_id]
      );

      return { 
        type: 'catchup', 
        action: 'memory', 
        targetPlayerId: lowestPlayer.player_id,
        amount: 2,
        message: `추억이 가장 낮은 플레이어에게 추억 +2`
      };
    }

    return { type: 'catchup', action: 'memory', result: 'no_player' };
  }

  // CH25: 동행 버디 - 본인 행동1회, 지목1명 행동1회
  private async handleBuddyAction(gameId: string, requesterId: string): Promise<any> {
    const interactionId = `${gameId}-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingInteractions.delete(interactionId);
        reject(new Error('응답 시간 초과'));
      }, 30000);

      this.pendingInteractions.set(interactionId, {
        gameId,
        requesterId,
        chanceCode: 'CH25',
        timeout,
        resolve,
        reject
      });

      this.io?.to(gameId).emit('chance-request', {
        interactionId,
        type: 'buddy_action',
        requesterId,
        message: '동행 버디: 함께 행동할 플레이어를 선택하세요'
      });
    });
  }

  // 특수 행동 카드 처리
  private async handleSpecialCard(client: any, gameId: string, playerId: string, action: string) {
    switch (action) {
      case 'repeat_current':
        // CH19: 반전의 기회 - 이동 없이 현재 칸 행동 1회 추가
        return await this.handleRepeatCurrentAction(client, gameId, playerId);
      
      case 'extra_action':
        // CH18: 체력이 넘친다 - 이동 없이 행동 1회
        return { type: 'special', action: 'extra_action', message: '이동 없이 행동 1회를 수행할 수 있습니다' };
      
      case 'joint_plan_support':
        // CH20: 공동 목표 지원 - 공동 목표 기여 +3,000TC
        return await this.handleJointPlanSupport(client, gameId, playerId);
      
      case 'draw_discarded':
        // CH16: 버린만큼 뽑기 - 버린 카드 수만큼 계획 카드 드로우
        return await this.handleDrawDiscarded(client, gameId, playerId);
      
      case 'select_joint_plan':
        // CH17: 여행 팜플렛 - 공동 목표 카드 선택
        return await this.handleSelectJointPlan(gameId, playerId);
      
      default:
        return { type: 'special', action };
    }
  }

  // CH16: 버린만큼 뽑기
  private async handleDrawDiscarded(client: any, gameId: string, playerId: string) {
    // 플레이어 상태 ID 조회
    const stateResult = await client.query(
      'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );
    const playerStateId = stateResult.rows[0].id;

    // 버린 카드 수 조회
    const discardedResult = await client.query(
      'SELECT COUNT(*) as count FROM discarded_cards WHERE game_id = $1 AND player_state_id = $2',
      [gameId, playerStateId]
    );
    const discardedCount = parseInt(discardedResult.rows[0].count);

    if (discardedCount === 0) {
      return {
        type: 'special',
        action: 'draw_discarded',
        count: 0,
        message: '버린 카드가 없습니다'
      };
    }

    // 버린 카드 수만큼 계획 카드 드로우
    const drawnCards = [];
    for (let i = 0; i < discardedCount; i++) {
      const result = await this.drawPlan(client, gameId, playerId);
      if (result.cardId) {
        drawnCards.push(result.cardId);
      }
    }

    return {
      type: 'special',
      action: 'draw_discarded',
      count: drawnCards.length,
      cards: drawnCards,
      message: `버린 카드 ${discardedCount}장만큼 계획 카드 ${drawnCards.length}장을 획득했습니다!`
    };
  }

  // CH17: 여행 팜플렛 - 공동 목표 카드 선택
  private async handleSelectJointPlan(gameId: string, playerId: string): Promise<any> {
    const interactionId = `${gameId}-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingInteractions.delete(interactionId);
        reject(new Error('응답 시간 초과'));
      }, 60000); // 60초

      this.pendingInteractions.set(interactionId, {
        gameId,
        requesterId: playerId,
        chanceCode: 'CH17',
        timeout,
        resolve,
        reject
      });

      this.io?.to(gameId).emit('chance-request', {
        interactionId,
        type: 'select_joint_plan',
        requesterId: playerId,
        message: '공동 목표 카드를 선택하세요'
      });
    });
  }

  // CH20: 공동 목표 지원
  private async handleJointPlanSupport(client: any, gameId: string, playerId: string) {
    // 공동 목표 기여 테이블에 3,000TC 추가
    await client.query(
      'INSERT INTO joint_plan_contributions (game_id, player_state_id, amount) VALUES ($1, (SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2), 3000)',
      [gameId, playerId]
    );

    return {
      type: 'special',
      action: 'joint_plan_support',
      amount: 3000,
      message: '공동 목표에 3,000TC를 기여했습니다!'
    };
  }

  // CH19: 반전의 기회 - 현재 칸 행동 반복
  private async handleRepeatCurrentAction(client: any, gameId: string, playerId: string) {
    const positionResult = await client.query(
      'SELECT position FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );
    
    const currentPosition = positionResult.rows[0].position;
    
    return { 
      type: 'special', 
      action: 'repeat_current', 
      position: currentPosition,
      message: `현재 위치(${currentPosition}번)에서 행동을 1회 더 수행할 수 있습니다`
    };
  }

  // 상호작용 응답 처리
  async respondToInteraction(interactionId: string, response: any): Promise<void> {
    const interaction = this.pendingInteractions.get(interactionId);
    
    if (!interaction) {
      throw new Error('상호작용을 찾을 수 없습니다');
    }

    clearTimeout(interaction.timeout);
    this.pendingInteractions.delete(interactionId);

    // 응답 처리
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      switch (interaction.chanceCode) {
        case 'CH8': // 친구랑 같이 집안일
          await this.executeSharedHouse(client, interaction.gameId, interaction.requesterId, response.targetId);
          break;
        
        case 'CH9': // 공동 지원 이벤트
          await this.executeSharedInvest(client, interaction.gameId, interaction.requesterId, response.targetId);
          break;
        
        case 'CH10': // 계획 구매 요청
          if (response.accepted) {
            await this.executePurchase(client, interaction.gameId, interaction.requesterId, response.targetId, response.cardId);
          }
          break;
        
        case 'CH11': // 계획 교환
          if (response.accepted) {
            await this.executeCardExchange(client, interaction.gameId, interaction.requesterId, response.targetId, response.requesterCardId, response.targetCardId);
          }
          break;
        
        case 'CH13': // 자릿수 바꾸기
          await this.executeSwapPosition(client, interaction.gameId, interaction.requesterId, response.targetId);
          break;
        
        case 'CH25': // 동행 버디
          await this.executeBuddyAction(client, interaction.gameId, interaction.requesterId, response.targetId);
          break;
      }

      await client.query('COMMIT');
      interaction.resolve(response);

      this.io?.to(interaction.gameId).emit('chance-resolved', {
        interactionId,
        chanceCode: interaction.chanceCode,
        response
      });
    } catch (error) {
      await client.query('ROLLBACK');
      interaction.reject(error);
    } finally {
      client.release();
    }
  }

  // 실제 집안일 실행
  private async executeSharedHouse(client: any, gameId: string, requesterId: string, targetId: string) {
    // 집안일 카드 드로우
    const deckResult = await client.query(
      'SELECT card_order FROM decks WHERE game_id = $1 AND type = $2',
      [gameId, 'house']
    );
    
    const cardOrder = JSON.parse(deckResult.rows[0].card_order);
    const cardId = cardOrder.shift();
    
    await client.query(
      'UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3',
      [JSON.stringify(cardOrder), gameId, 'house']
    );

    const cardResult = await client.query('SELECT * FROM cards WHERE id = $1', [cardId]);
    const money = cardResult.rows[0].effects.money || 0;

    // 두 플레이어 모두에게 수익 지급
    await client.query(
      'UPDATE player_states SET money = money + $1 WHERE game_id = $2 AND player_id = ANY($3)',
      [money, gameId, [requesterId, targetId]]
    );
  }

  // CH9: 공동 투자 실행
  private async executeSharedInvest(client: any, gameId: string, requesterId: string, targetId: string) {
    // 여행 지원 카드 드로우
    const deckResult = await client.query(
      'SELECT card_order FROM decks WHERE game_id = $1 AND type = $2',
      [gameId, 'support']
    );
    
    const cardOrder = JSON.parse(deckResult.rows[0].card_order);
    const cardId = cardOrder.shift();
    
    await client.query(
      'UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3',
      [JSON.stringify(cardOrder), gameId, 'support']
    );

    const cardResult = await client.query('SELECT * FROM cards WHERE id = $1', [cardId]);
    const money = cardResult.rows[0].effects.money || 0;

    // 두 플레이어 모두에게 동일 효과 적용
    await client.query(
      'UPDATE player_states SET money = money + $1 WHERE game_id = $2 AND player_id = ANY($3)',
      [money, gameId, [requesterId, targetId]]
    );
  }

  // CH25: 동행 버디 실행
  private async executeBuddyAction(client: any, gameId: string, requesterId: string, targetId: string) {
    // 두 플레이어 모두 추가 행동 1회 가능 상태로 설정
    // 실제 행동은 프론트엔드에서 처리
    return {
      type: 'buddy_action',
      requesterId,
      targetId,
      message: '두 플레이어 모두 추가 행동 1회를 수행할 수 있습니다'
    };
  }

  // 실제 구매 실행
  private async executePurchase(client: any, gameId: string, buyerId: string, sellerId: string, cardId: string) {
    // 구매자 돈 차감
    await client.query(
      'UPDATE player_states SET money = money - 1000 WHERE game_id = $1 AND player_id = $2',
      [gameId, buyerId]
    );

    // 판매자 돈 증가
    await client.query(
      'UPDATE player_states SET money = money + 1000 WHERE game_id = $1 AND player_id = $2',
      [gameId, sellerId]
    );

    // 카드 소유권 이전
    const sellerStateResult = await client.query(
      'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, sellerId]
    );
    const buyerStateResult = await client.query(
      'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, buyerId]
    );

    await client.query(
      'UPDATE hands SET player_state_id = $1 WHERE player_state_id = $2 AND card_id = $3',
      [buyerStateResult.rows[0].id, sellerStateResult.rows[0].id, cardId]
    );
  }

  // 카드 교환 실행
  private async executeCardExchange(client: any, gameId: string, player1Id: string, player2Id: string, card1Id: string, card2Id: string) {
    const state1Result = await client.query(
      'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, player1Id]
    );
    const state2Result = await client.query(
      'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, player2Id]
    );

    const state1Id = state1Result.rows[0].id;
    const state2Id = state2Result.rows[0].id;

    // 카드 교환
    await client.query(
      'UPDATE hands SET player_state_id = $1 WHERE player_state_id = $2 AND card_id = $3',
      [state2Id, state1Id, card1Id]
    );
    await client.query(
      'UPDATE hands SET player_state_id = $1 WHERE player_state_id = $2 AND card_id = $3',
      [state1Id, state2Id, card2Id]
    );
  }

  // 위치 교환 실행
  private async executeSwapPosition(client: any, gameId: string, player1Id: string, player2Id: string) {
    const pos1Result = await client.query(
      'SELECT position FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, player1Id]
    );
    const pos2Result = await client.query(
      'SELECT position FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, player2Id]
    );

    const pos1 = pos1Result.rows[0].position;
    const pos2 = pos2Result.rows[0].position;

    // 위치 교환 및 forced_move 플래그 설정
    await client.query(
      'UPDATE player_states SET position = $1, forced_move = TRUE WHERE game_id = $2 AND player_id = $3',
      [pos2, gameId, player1Id]
    );
    await client.query(
      'UPDATE player_states SET position = $1, forced_move = TRUE WHERE game_id = $2 AND player_id = $3',
      [pos1, gameId, player2Id]
    );
  }

  private async drawPlan(client: any, gameId: string, playerId: string) {
    const deckResult = await client.query(
      'SELECT card_order FROM decks WHERE game_id = $1 AND type = $2',
      [gameId, 'plan']
    );
    
    let cardOrder = JSON.parse(deckResult.rows[0].card_order);
    
    // 덱이 비었으면 재충전 시도
    if (cardOrder.length === 0) {
      console.log('⚠️ Plan 덱이 비었습니다. 재충전 시도...');
      cardOrder = await this.refillDeck(client, gameId, 'plan');
      
      if (cardOrder.length === 0) {
        console.log('❌ Plan 덱 완전 소진');
        return { type: 'draw', result: 'deck_empty', message: '더 이상 뽑을 카드가 없습니다' };
      }
    }
    
    const cardId = cardOrder.shift();
    
    await client.query(
      'UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3',
      [JSON.stringify(cardOrder), gameId, 'plan']
    );

    const stateResult = await client.query(
      'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );

    const seqResult = await client.query(
      'SELECT COALESCE(MAX(seq), -1) + 1 as next_seq FROM hands WHERE player_state_id = $1',
      [stateResult.rows[0].id]
    );

    await client.query(
      'INSERT INTO hands (player_state_id, card_id, seq) VALUES ($1, $2, $3)',
      [stateResult.rows[0].id, cardId, seqResult.rows[0].next_seq]
    );

    return { type: 'draw', cardId };
  }

  // 덱 재충전 (버린 카드 더미 섞기)
  private async refillDeck(client: any, gameId: string, deckType: string): Promise<any[]> {
    // 버린 카드 더미 조회 (구매되지 않은 카드들)
    const discardedResult = await client.query(
      `SELECT c.id FROM cards c
       WHERE c.type = $1
       AND NOT EXISTS (
         SELECT 1 FROM hands h
         JOIN player_states ps ON h.player_state_id = ps.id
         WHERE ps.game_id = $2 AND h.card_id = c.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM purchased p
         JOIN player_states ps ON p.player_state_id = ps.id
         WHERE ps.game_id = $2 AND p.card_id = c.id
       )`,
      [deckType, gameId]
    );

    if (discardedResult.rows.length === 0) {
      return [];
    }

    // 카드 ID 배열 생성 및 섞기
    const cardIds = discardedResult.rows.map((row: any) => row.id);
    const shuffled = this.shuffleArray(cardIds);

    // 덱 업데이트
    await client.query(
      'UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3',
      [JSON.stringify(shuffled), gameId, deckType]
    );

    console.log(`✅ ${deckType} 덱 재충전 완료: ${shuffled.length}장`);
    return shuffled;
  }

  // 배열 섞기 (Fisher-Yates)
  private shuffleArray(array: any[]): any[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private async drawPlanForLowest(client: any, gameId: string) {
    // 계획 카드 최저 플레이어 찾기
    const result = await client.query(
      `SELECT ps.id, ps.player_id, COUNT(h.id) as card_count
       FROM player_states ps
       LEFT JOIN hands h ON ps.id = h.player_state_id
       WHERE ps.game_id = $1
       GROUP BY ps.id, ps.player_id
       ORDER BY card_count ASC
       LIMIT 1`,
      [gameId]
    );

    if (result.rows.length > 0) {
      const lowestPlayer = result.rows[0];
      return await this.drawPlan(client, gameId, lowestPlayer.player_id);
    }

    return { type: 'draw', action: 'catchup_plan', result: 'no_player' };
  }
}

export const chanceService = new ChanceService();
