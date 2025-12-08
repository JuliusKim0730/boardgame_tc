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
      
      // metadata가 문자열이면 파싱
      let metadata = card.metadata || {};
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.error('metadata 파싱 실패:', metadata);
          metadata = {};
        }
      }
      
      console.log(`🎴 찬스 카드 실행: ${card.code} - ${card.name}, 타입: ${metadata.type}`);

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
    // effects가 문자열이면 파싱
    let effects = card.effects;
    if (typeof effects === 'string') {
      try {
        effects = JSON.parse(effects);
      } catch (e) {
        console.error('effects 파싱 실패:', effects);
        effects = {};
      }
    }
    
    const moneyChange = effects.money || 0;
    console.log(`💰 돈 카드 효과 적용: ${card.code} - ${card.name}, 금액: ${moneyChange}TC`);
    
    // 플레이어 상태 ID 조회
    const stateResult = await client.query(
      'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );
    
    if (stateResult.rows.length === 0) {
      throw new Error('플레이어를 찾을 수 없습니다');
    }
    
    const playerStateId = stateResult.rows[0].id;
    
    // 돈 업데이트
    await client.query(
      'UPDATE player_states SET money = money + $1 WHERE id = $2',
      [moneyChange, playerStateId]
    );
    
    // 업데이트 후 금액 확인
    const verifyResult = await client.query(
      'SELECT money FROM player_states WHERE id = $1',
      [playerStateId]
    );
    
    console.log(`✅ 돈 업데이트 완료: ${moneyChange > 0 ? '+' : ''}${moneyChange}TC, 현재 잔액: ${verifyResult.rows[0].money}TC`);

    return { 
      type: 'money', 
      amount: moneyChange, 
      cardName: card.name,
      message: `${card.name}: ${moneyChange > 0 ? '+' : ''}${moneyChange}TC`
    };
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
    
    // AI 플레이어 자동 응답 체크
    const isRequesterAI = await this.isAIPlayer(requesterId);
    
    if (isRequesterAI) {
      // AI가 요청자인 경우: 랜덤 플레이어 선택 (자신 제외)
      const targetId = await this.selectRandomPlayer(gameId, requesterId);
      
      // 대상이 AI면 자동 수락
      const isTargetAI = await this.isAIPlayer(targetId);
      if (isTargetAI) {
        return await this.executeSharedHouse(gameId, requesterId, targetId, true);
      }
      
      // 대상이 사람이면 요청 전송
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(async () => {
          this.pendingInteractions.delete(interactionId);
          reject(new Error('응답 시간 초과'));
        }, 30000);

        this.pendingInteractions.set(interactionId, {
          gameId,
          requesterId,
          targetId,
          chanceCode: 'CH8',
          timeout,
          resolve,
          reject
        });

        this.io?.to(gameId).emit('chance-request', {
          interactionId,
          type: 'shared_house',
          requesterId,
          targetId,
          message: '함께 집안일을 할 플레이어를 선택하세요'
        });
      });
    }
    
    // 사람이 요청자인 경우: 기존 로직
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(async () => {
        this.pendingInteractions.delete(interactionId);
        reject(new Error('응답 시간 초과'));
      }, 30000);

      this.pendingInteractions.set(interactionId, {
        gameId,
        requesterId,
        chanceCode: 'CH8',
        timeout,
        resolve,
        reject
      });

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
    
    // AI 플레이어 자동 응답 체크
    const isRequesterAI = await this.isAIPlayer(requesterId);
    
    if (isRequesterAI) {
      // AI가 요청자인 경우: 랜덤 플레이어 선택 (자신 제외)
      const targetId = await this.selectRandomPlayer(gameId, requesterId);
      
      // 대상이 AI면 자동 수락
      const isTargetAI = await this.isAIPlayer(targetId);
      if (isTargetAI) {
        return await this.executeSharedInvest(gameId, requesterId, targetId, true);
      }
      
      // 대상이 사람이면 요청 전송
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingInteractions.delete(interactionId);
          reject(new Error('응답 시간 초과'));
        }, 30000);

        this.pendingInteractions.set(interactionId, {
          gameId,
          requesterId,
          targetId,
          chanceCode: 'CH9',
          timeout,
          resolve,
          reject
        });

        this.io?.to(gameId).emit('chance-request', {
          interactionId,
          type: 'shared_invest',
          requesterId,
          targetId,
          message: '함께 투자할 플레이어를 선택하세요'
        });
      });
    }
    
    // 사람이 요청자인 경우: 기존 로직
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
        const catchupResult = await this.drawPlanForLowest(client, gameId);
        return {
          type: 'draw',
          action: 'catchup_plan',
          cardId: (catchupResult as any).cardId,
          message: (catchupResult as any).cardId 
            ? `계획 카드가 가장 적은 플레이어에게 카드를 지급했습니다!`
            : '계획 카드를 지급할 수 없습니다'
        };
      
      case 'draw_plan':
        // CH15: 계획 1장 드로우
        const drawResult = await this.drawPlan(client, gameId, playerId);
        return {
          type: 'draw',
          action: 'draw_plan',
          cardId: (drawResult as any).cardId,
          message: (drawResult as any).cardId 
            ? `계획 카드 1장을 획득했습니다!`
            : '더 이상 뽑을 카드가 없습니다'
        };
      
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

  // CH16: 버린만큼 뽑기 - 사용자가 버릴 카드 선택
  private async handleDrawDiscarded(client: any, gameId: string, playerId: string) {
    // 플레이어 상태 ID 조회
    const stateResult = await client.query(
      'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );
    const playerStateId = stateResult.rows[0].id;

    // 손패 조회 (무료계획 + 계획 카드)
    const handResult = await client.query(
      `SELECT h.id as hand_id, h.card_id, c.name, c.type, c.code
       FROM hands h
       JOIN cards c ON h.card_id = c.id
       WHERE h.player_state_id = $1 AND c.type IN ('plan', 'freeplan')
       ORDER BY h.seq`,
      [playerStateId]
    );

    if (handResult.rows.length === 0) {
      return {
        type: 'special',
        action: 'select_discard',
        requiresSelection: false,
        handCards: [],
        message: '버릴 수 있는 카드가 없습니다'
      };
    }

    // 프론트엔드에서 선택하도록 손패 정보 반환
    return {
      type: 'special',
      action: 'select_discard',
      requiresSelection: true,
      handCards: handResult.rows,
      message: '버릴 카드를 선택하세요 (버린 만큼 계획 카드를 뽑습니다)'
    };
  }

  // CH16 실행: 선택한 카드 버리고 계획 카드 드로우
  async executeDiscardAndDraw(gameId: string, playerId: string, cardIds: string[]): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const stateResult = await client.query(
        'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      const playerStateId = stateResult.rows[0].id;

      // 선택한 카드들을 버림
      for (const cardId of cardIds) {
        // 손패에서 제거
        await client.query(
          'DELETE FROM hands WHERE player_state_id = $1 AND card_id = $2',
          [playerStateId, cardId]
        );

        // 버린 카드 테이블에 추가
        await client.query(
          'INSERT INTO discarded_cards (game_id, player_state_id, card_id) VALUES ($1, $2, $3)',
          [gameId, playerStateId, cardId]
        );
      }

      // 버린 카드 수만큼 계획 카드 드로우
      const drawnCards = [];
      for (let i = 0; i < cardIds.length; i++) {
        const result = await this.drawPlan(client, gameId, playerId);
        if (result.cardId) {
          drawnCards.push(result.cardId);
        }
      }

      await client.query('COMMIT');

      console.log(`🎴 CH16: ${cardIds.length}장 버리고 ${drawnCards.length}장 드로우`);

      return {
        type: 'special',
        action: 'draw_discarded',
        discardedCount: cardIds.length,
        drawnCount: drawnCards.length,
        cards: drawnCards,
        message: `${cardIds.length}장을 버리고 계획 카드 ${drawnCards.length}장을 획득했습니다!`
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
    // 플레이어 상태 ID 조회
    const stateResult = await client.query(
      'SELECT id, money FROM player_states WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );
    
    if (stateResult.rows.length === 0) {
      throw new Error('플레이어를 찾을 수 없습니다');
    }
    
    const playerStateId = stateResult.rows[0].id;
    const currentMoney = stateResult.rows[0].money;
    
    // 돈이 부족한 경우 체크
    if (currentMoney < 3000) {
      return {
        type: 'special',
        action: 'joint_plan_support',
        amount: 0,
        message: '공동 목표 지원에 필요한 돈이 부족합니다 (3,000TC 필요)'
      };
    }
    
    // 플레이어 돈 차감
    await client.query(
      'UPDATE player_states SET money = money - 3000 WHERE id = $1',
      [playerStateId]
    );
    
    // 공동 목표 기여 테이블에 3,000TC 추가
    await client.query(
      'INSERT INTO joint_plan_contributions (game_id, player_state_id, amount) VALUES ($1, $2, 3000)',
      [gameId, playerStateId]
    );
    
    console.log(`✅ 공동 목표 지원: playerId=${playerId}, 3,000TC 기여`);

    return {
      type: 'special',
      action: 'joint_plan_support',
      amount: 3000,
      message: '공동 목표에 3,000TC를 기여했습니다! (잔액에서 차감됨)'
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

  // 기존 respondToInteraction, executeSharedHouse, executeSharedInvest는 하단의 새 버전으로 대체됨

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

  // 위치 교환 실행 (기존 버전 - 하단의 새 버전으로 대체됨)

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

  // AI 플레이어 확인
  private async isAIPlayer(playerId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT p.is_ai FROM players p WHERE p.id = $1`,
      [playerId]
    );
    return result.rows[0]?.is_ai || false;
  }

  // 랜덤 플레이어 선택 (자신 제외)
  private async selectRandomPlayer(gameId: string, excludePlayerId: string): Promise<string> {
    const result = await pool.query(
      `SELECT ps.player_id 
       FROM player_states ps 
       WHERE ps.game_id = $1 AND ps.player_id != $2`,
      [gameId, excludePlayerId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('선택 가능한 플레이어가 없습니다');
    }
    
    const randomIndex = Math.floor(Math.random() * result.rows.length);
    return result.rows[randomIndex].player_id;
  }

  // CH8 실행: 친구랑 같이 집안일
  private async executeSharedHouse(gameId: string, requesterId: string, targetId: string, accepted: boolean): Promise<any> {
    if (!accepted) {
      return { type: 'interaction', action: 'shared_house', accepted: false };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 집안일 카드 드로우 (요청자)
      const requesterCard = await this.drawHouseCard(client, gameId, requesterId);
      
      // 집안일 카드 드로우 (대상자)
      const targetCard = await this.drawHouseCard(client, gameId, targetId);

      await client.query('COMMIT');

      return {
        type: 'interaction',
        action: 'shared_house',
        accepted: true,
        requesterCard,
        targetCard
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // CH9 실행: 공동 투자
  private async executeSharedInvest(gameId: string, requesterId: string, targetId: string, accepted: boolean): Promise<any> {
    if (!accepted) {
      return { type: 'interaction', action: 'shared_invest', accepted: false };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 각자 1,000TC 지불
      await client.query(
        `UPDATE player_states 
         SET money = money - 1000 
         WHERE game_id = $1 AND player_id IN ($2, $3)`,
        [gameId, requesterId, targetId]
      );

      // 계획 카드 1장씩 드로우
      const requesterCard = await this.drawPlan(client, gameId, requesterId);
      const targetCard = await this.drawPlan(client, gameId, targetId);

      await client.query('COMMIT');

      return {
        type: 'interaction',
        action: 'shared_invest',
        accepted: true,
        requesterCard,
        targetCard
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 집안일 카드 드로우
  private async drawHouseCard(client: any, gameId: string, playerId: string): Promise<any> {
    // 덱에서 카드 드로우
    const deckResult = await client.query(
      'SELECT card_order FROM decks WHERE game_id = $1 AND type = $2',
      [gameId, 'house']
    );

    if (deckResult.rows.length === 0) {
      throw new Error('집안일 덱을 찾을 수 없습니다');
    }

    let cardOrder = deckResult.rows[0].card_order;
    if (typeof cardOrder === 'string') {
      cardOrder = JSON.parse(cardOrder);
    }

    if (cardOrder.length === 0) {
      throw new Error('집안일 카드가 부족합니다');
    }

    const cardId = cardOrder.shift();

    // 덱 업데이트
    await client.query(
      'UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3',
      [JSON.stringify(cardOrder), gameId, 'house']
    );

    // 카드 정보 조회
    const cardResult = await client.query('SELECT * FROM cards WHERE id = $1', [cardId]);
    const card = cardResult.rows[0];

    // 효과 적용 (돈, 추억)
    let effects = card.effects;
    if (typeof effects === 'string') {
      effects = JSON.parse(effects);
    }

    if (effects.money) {
      await client.query(
        `UPDATE player_states 
         SET money = money + $1 
         WHERE game_id = $2 AND player_id = $3`,
        [effects.money, gameId, playerId]
      );
    }

    if (effects.memory) {
      await client.query(
        `UPDATE player_states 
         SET traits = jsonb_set(traits, '{memory}', to_jsonb((COALESCE((traits->>'memory')::int, 0) + $1)::int))
         WHERE game_id = $2 AND player_id = $3`,
        [effects.memory, gameId, playerId]
      );
    }

    return card;
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
    switch (interaction.chanceCode) {
      case 'CH8':
        const ch8Result = await this.executeSharedHouse(
          interaction.gameId,
          interaction.requesterId,
          response.targetId,
          response.accepted
        );
        interaction.resolve(ch8Result);
        break;

      case 'CH9':
        const ch9Result = await this.executeSharedInvest(
          interaction.gameId,
          interaction.requesterId,
          response.targetId,
          response.accepted
        );
        interaction.resolve(ch9Result);
        break;

      case 'CH10':
        // 계획 구매 요청 처리
        interaction.resolve({ accepted: response.accepted, cardId: response.cardId });
        break;

      case 'CH11':
        // 계획 교환 처리
        interaction.resolve({ accepted: response.accepted, cardId: response.cardId });
        break;

      case 'CH13':
        // 위치 교환 처리
        const swapResult = await this.executeSwapPosition(interaction.gameId, interaction.requesterId, response.targetId);
        interaction.resolve(swapResult);
        break;

      default:
        interaction.reject(new Error('알 수 없는 상호작용입니다'));
    }

    // 완료 알림
    if (this.io) {
      this.io.to(interaction.gameId).emit('chance-resolved', {
        interactionId,
        chanceCode: interaction.chanceCode,
        response
      });
    }
  }

  // CH13 실행: 위치 교환 + 추가 행동
  private async executeSwapPosition(gameId: string, requesterId: string, targetId: string): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 두 플레이어의 위치 조회
      const positionsResult = await client.query(
        `SELECT player_id, position 
         FROM player_states 
         WHERE game_id = $1 AND player_id IN ($2, $3)`,
        [gameId, requesterId, targetId]
      );

      const requesterPos = positionsResult.rows.find((r: any) => r.player_id === requesterId)?.position;
      const targetPos = positionsResult.rows.find((r: any) => r.player_id === targetId)?.position;

      // 위치 교환
      await client.query(
        'UPDATE player_states SET position = $1 WHERE game_id = $2 AND player_id = $3',
        [targetPos, gameId, requesterId]
      );

      await client.query(
        'UPDATE player_states SET position = $1 WHERE game_id = $2 AND player_id = $3',
        [requesterPos, gameId, targetId]
      );

      await client.query('COMMIT');

      console.log(`🔄 CH13: 위치 교환 완료 - ${requesterId}(${requesterPos}→${targetPos}), ${targetId}(${targetPos}→${requesterPos})`);

      return {
        type: 'interaction',
        action: 'swap_position',
        requesterOldPos: requesterPos,
        requesterNewPos: targetPos,
        targetOldPos: targetPos,
        targetNewPos: requesterPos,
        extraAction: true, // 추가 행동 가능 플래그
        message: `위치를 교환했습니다! ${targetPos}번 칸에서 행동을 1회 더 수행할 수 있습니다.`
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const chanceService = new ChanceService();
