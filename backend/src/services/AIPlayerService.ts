import { pool } from '../db/pool';
import { Server } from 'socket.io';

/**
 * AI 플레이어 게임플레이 알고리즘
 * 
 * 전략:
 * 1. 여행지 테마에 맞춰 특성 집중 (x3 > x2 > x1 우선순위)
 * 2. 1-7턴: 결심 토큰 1개 사용
 * 3. 8-14턴: 결심 토큰 1개 사용
 * 4. 공동 계획: 3,000~9,000TC 기여 (500 단위)
 * 5. 찬스 카드: 상황에 맞게 대응
 */
export class AIPlayerService {
  private io: Server | null = null;

  setSocketIO(io: Server) {
    this.io = io;
  }
  
  /**
   * AI 턴 실행
   */
  async executeTurn(gameId: string, playerId: string): Promise<void> {
    try {
      // 1. 게임 상태 조회 (읽기 전용)
      const client = await pool.connect();
      let gameState;
      try {
        gameState = await this.getGameState(client, gameId, playerId);
      } finally {
        client.release();
      }
      
      // 2. 이동 결정
      const targetPosition = await this.decideMove(gameState);
      console.log(`🤖 AI 이동 결정: ${gameState.playerState.position} → ${targetPosition}`);
      
      // 3. 이동 실행 (짧은 트랜잭션)
      await this.moveWithTransaction(gameId, playerId, targetPosition);

      // 4. 행동 결정 및 실행 (짧은 트랜잭션)
      const action = targetPosition;
      console.log(`🤖 AI 행동 결정: ${action}번 (위치 ${targetPosition})`);
      await this.performActionWithTransaction(gameId, playerId, action);

      console.log(`✅ AI 행동 완료`);
      
      // WebSocket으로 상태 업데이트 알림
      await this.broadcastGameState(gameId);

      // 5. 결심 토큰 사용 결정
      const shouldUseToken = await this.shouldUseResolveTokenNow(gameId, playerId);
      
      if (shouldUseToken) {
        console.log(`🔥 AI 결심 토큰 사용 결정`);
        await this.useResolveToken(gameId, playerId);
      }

      // 6. 턴 종료
      console.log(`🤖 AI 턴 종료 중...`);
      const { turnManager } = await import('./TurnManager');
      await turnManager.endTurn(gameId, playerId);
      console.log(`✅ AI 턴 완료`);
      
    } catch (error: any) {
      console.error('❌ AI 턴 실행 중 에러:', error);
      throw error;
    }
  }

  /**
   * 게임 상태 브로드캐스트
   */
  private async broadcastGameState(gameId: string): Promise<void> {
    if (!this.io) return;

    const client = await pool.connect();
    try {
      // 룸 ID 조회
      const roomResult = await client.query(
        'SELECT room_id FROM games WHERE id = $1',
        [gameId]
      );
      
      if (roomResult.rows.length === 0) return;
      
      const roomId = roomResult.rows[0].room_id;
      
      // 게임 상태 업데이트 이벤트 발송
      this.io.to(roomId).emit('game-state-updated', {
        gameId,
        timestamp: new Date()
      });
      
      console.log(`📡 게임 상태 업데이트 브로드캐스트: ${roomId}`);
    } finally {
      client.release();
    }
  }

  /**
   * 게임 상태 조회
   */
  private async getGameState(client: any, gameId: string, playerId: string) {
    // 게임 정보
    const gameResult = await client.query(
      'SELECT day, travel_theme FROM games WHERE id = $1',
      [gameId]
    );
    const game = gameResult.rows[0];

    // 플레이어 상태
    const playerResult = await client.query(
      `SELECT ps.*, 
       (SELECT json_agg(json_build_object('id', c.id, 'code', c.code, 'name', c.name, 'cost', c.cost, 'effects', c.effects))
        FROM hands h
        JOIN cards c ON h.card_id = c.id
        WHERE h.player_state_id = ps.id) as hand_cards
       FROM player_states ps
       WHERE ps.game_id = $1 AND ps.player_id = $2`,
      [gameId, playerId]
    );
    const playerState = playerResult.rows[0];

    // 여행지 가중치 조회
    const travelResult = await client.query(
      'SELECT effects FROM cards WHERE type = $1 AND code = $2',
      ['travel', game.travel_theme]
    );
    const travelMultipliers = travelResult.rows[0]?.effects || {};

    // 결심 토큰 사용 이력
    const tokenUsedResult = await client.query(
      `SELECT COUNT(*) as count FROM event_logs 
       WHERE game_id = $1 
       AND event_type = 'resolve_token_used' 
       AND data->>'playerId' = $2`,
      [gameId, playerId]
    );
    const tokenUsedCount = parseInt(tokenUsedResult.rows[0].count);

    return {
      gameId,
      playerId,
      day: game.day,
      travelTheme: game.travel_theme,
      travelMultipliers,
      playerState,
      handCards: playerState.hand_cards || [],
      tokenUsedCount
    };
  }

  /**
   * 이동 결정 알고리즘
   * 
   * 우선순위:
   * 1. 여행지 테마 x3 특성 → 조사하기(2번) 또는 일반 계획(손패 구매)
   * 2. 돈이 부족하면 → 집안일(3번) 또는 여행 지원(4번)
   * 3. 찬스(5번)는 가끔 (20% 확률)
   * 4. 무료 계획(1번)은 초반에만
   */
  private async decideMove(gameState: any): Promise<number> {
    const { day, playerState, travelMultipliers } = gameState;
    const currentPosition = playerState.position;
    const money = playerState.money;

    // 인접 칸 계산 (1~6 순환)
    const adjacentPositions = [
      currentPosition === 1 ? 6 : currentPosition - 1,
      currentPosition === 6 ? 1 : currentPosition + 1
    ];

    // 전략 결정
    const mainTrait = this.getMainTrait(travelMultipliers); // x3 특성
    const needMoney = money < 5000;
    const isEarlyGame = day <= 4;

    // 우선순위 점수 계산
    const scores: { [key: number]: number } = {};
    
    for (const pos of adjacentPositions) {
      let score = 0;

      switch (pos) {
        case 1: // 무료 계획
          score = isEarlyGame ? 30 : 10;
          break;
        case 2: // 조사하기 (계획 카드 드로우)
          score = 50; // 항상 유용
          break;
        case 3: // 집안일
          score = needMoney ? 70 : 20;
          break;
        case 4: // 여행 지원
          score = needMoney ? 60 : 30;
          break;
        case 5: // 찬스
          score = Math.random() < 0.2 ? 40 : 15;
          break;
        case 6: // 자유 행동 (결심 토큰 필요)
          score = playerState.resolve_token > 0 ? 35 : 0;
          break;
      }

      scores[pos] = score;
    }

    // 가장 높은 점수의 위치 선택
    const targetPosition = adjacentPositions.reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );

    return targetPosition;
  }



  /**
   * 결심 토큰 사용 전략 (턴 종료 전 결정)
   * - 2-5일 중 랜덤하게 1번 사용
   * - 10-12일 중 랜덤하게 1번 사용
   */
  private async shouldUseResolveTokenNow(gameId: string, playerId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      // 게임 상태 조회
      const gameResult = await client.query(
        'SELECT day FROM games WHERE id = $1',
        [gameId]
      );
      const day = gameResult.rows[0].day;

      // 플레이어 상태 조회
      const playerResult = await client.query(
        'SELECT resolve_token FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      const resolveToken = playerResult.rows[0].resolve_token;

      // 토큰이 없으면 사용 불가
      if (resolveToken <= 0) {
        return false;
      }

      // 결심 토큰 사용 이력 조회
      const tokenUsedResult = await client.query(
        `SELECT data->>'day' as used_day FROM event_logs 
         WHERE game_id = $1 
         AND event_type = 'resolve_token_used' 
         AND data->>'playerId' = $2
         ORDER BY created_at`,
        [gameId, playerId]
      );

      const usedDays = tokenUsedResult.rows.map(row => parseInt(row.used_day));

      // 2-5일 중 사용 여부 확인
      const usedInEarlyPhase = usedDays.some(d => d >= 2 && d <= 5);
      
      // 10-12일 중 사용 여부 확인
      const usedInLatePhase = usedDays.some(d => d >= 10 && d <= 12);

      // 2-5일 구간: 아직 사용하지 않았고 현재 2-5일이면 확률적으로 사용
      if (!usedInEarlyPhase && day >= 2 && day <= 5) {
        // Day 2: 25%, Day 3: 33%, Day 4: 50%, Day 5: 100%
        const probability = day === 5 ? 1.0 : 1.0 / (6 - day);
        return Math.random() < probability;
      }

      // 10-12일 구간: 아직 사용하지 않았고 현재 10-12일이면 확률적으로 사용
      if (!usedInLatePhase && day >= 10 && day <= 12) {
        // Day 10: 33%, Day 11: 50%, Day 12: 100%
        const probability = day === 12 ? 1.0 : 1.0 / (13 - day);
        return Math.random() < probability;
      }

      return false;
    } finally {
      client.release();
    }
  }

  /**
   * 결심 토큰 사용 실행
   */
  private async useResolveToken(gameId: string, playerId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 플레이어 상태 조회
      const stateResult = await client.query(
        'SELECT id, resolve_token, position, last_position FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      const playerState = stateResult.rows[0];

      if (playerState.resolve_token <= 0) {
        throw new Error('결심 토큰이 부족합니다');
      }

      // 토큰 차감
      await client.query(
        'UPDATE player_states SET resolve_token = resolve_token - 1 WHERE id = $1',
        [playerState.id]
      );

      // 사용 로그 기록
      const gameResult = await client.query('SELECT day FROM games WHERE id = $1', [gameId]);
      const currentDay = gameResult.rows[0].day;

      await client.query(
        'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
        [gameId, 'resolve_token_used', JSON.stringify({ playerId, day: currentDay })]
      );

      // 추가 행동 선택 (직전 행동 제외)
      const availableActions = [1, 2, 3, 4, 5, 6].filter(a => a !== playerState.last_position);
      
      // 우선순위: 2번(조사하기) > 3번(집안일) > 4번(여행지원) > 1번(무료계획)
      let selectedAction = 2; // 기본값: 조사하기
      
      if (availableActions.includes(2)) {
        selectedAction = 2; // 조사하기
      } else if (availableActions.includes(3)) {
        selectedAction = 3; // 집안일
      } else if (availableActions.includes(4)) {
        selectedAction = 4; // 여행지원
      } else if (availableActions.includes(1)) {
        selectedAction = 1; // 무료계획
      } else {
        selectedAction = availableActions[0]; // 남은 것 중 첫 번째
      }

      console.log(`🔥 AI 결심 토큰 사용: ${selectedAction}번 행동 수행`);

      // 추가 행동 수행
      await this.performAction(client, gameId, playerId, selectedAction);

      await client.query('COMMIT');
      console.log(`✅ AI 결심 토큰 사용 완료`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 공동 계획 기여 결정
   * 3,000 ~ 9,000TC (500 단위)
   */
  async decideJointPlanContribution(gameId: string, playerId: string): Promise<number> {
    const client = await pool.connect();
    try {
      // 플레이어 돈 확인
      const result = await client.query(
        'SELECT money FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      const money = result.rows[0].money;

      // 기여 가능 범위
      const minContribution = 3000;
      const maxContribution = Math.min(9000, money);

      if (maxContribution < minContribution) {
        return 0; // 돈이 부족하면 기여하지 않음
      }

      // 500 단위로 랜덤 선택
      const steps = Math.floor((maxContribution - minContribution) / 500) + 1;
      const randomStep = Math.floor(Math.random() * steps);
      const contribution = minContribution + (randomStep * 500);

      return contribution;
    } finally {
      client.release();
    }
  }

  /**
   * 찬스 카드 처리
   */
  private async handleChanceCard(client: any, gameState: any): Promise<void> {
    // 찬스 카드 드로우
    const chanceResult = await client.query(
      `SELECT c.* FROM decks d
       JOIN cards c ON c.id = ANY(string_to_array(d.card_order::text, ',')::uuid[])
       WHERE d.game_id = $1 AND d.type = 'chance'
       LIMIT 1`,
      [gameState.gameId]
    );

    if (chanceResult.rows.length === 0) return;

    const chanceCard = chanceResult.rows[0];

    // 찬스 카드 타입별 처리
    switch (chanceCard.code) {
      case 'CH1':
      case 'CH2':
        // 돈 받기 - 자동 처리
        break;
      
      case 'CH3':
      case 'CH4':
      case 'CH5':
      case 'CH6':
      case 'CH7':
        // 돈 잃기 - 자동 처리
        break;

      case 'CH8':
      case 'CH9':
        // 상호작용 - AI는 수락
        break;

      case 'CH10':
        // 계획 구매 요청 - AI는 거절
        break;

      case 'CH14':
      case 'CH15':
      case 'CH16':
      case 'CH17':
        // 카드 드로우 - 자동 처리
        break;

      case 'CH18':
      case 'CH19':
        // 추가 행동 - 조사하기(2번) 선택
        break;

      case 'CH20':
        // 공동 목표 지원 - 자동 처리
        break;

      case 'CH21':
      case 'CH22':
      case 'CH23':
      case 'CH24':
      case 'CH25':
        // 캐치업 - 자동 처리
        break;
    }
  }

  /**
   * 최종 구매 결정
   * 여행지 테마에 맞춰 손패 카드 구매
   */
  async decideFinalPurchase(gameId: string, playerId: string): Promise<string[]> {
    const client = await pool.connect();
    try {
      const gameState = await this.getGameState(client, gameId, playerId);
      const { handCards, playerState, travelMultipliers } = gameState;

      // 구매 가능한 카드 필터링
      const affordableCards = handCards.filter((card: any) => 
        card.cost && card.cost <= playerState.money
      );

      // 여행지 테마에 맞는 카드 우선순위
      const mainTrait = this.getMainTrait(travelMultipliers);
      const secondaryTrait = this.getSecondaryTrait(travelMultipliers);

      // 점수 계산
      const scoredCards = affordableCards.map((card: any) => {
        let score = 0;
        const effects = card.effects;

        // 주요 특성 (x3)
        if (effects[mainTrait]) {
          score += effects[mainTrait] * 3;
        }

        // 부차 특성 (x2)
        if (effects[secondaryTrait]) {
          score += effects[secondaryTrait] * 2;
        }

        // 추억 보너스
        if (effects.memory) {
          score += effects.memory * 1.5;
        }

        return { card, score };
      });

      // 점수 순으로 정렬
      scoredCards.sort((a: { card: any; score: number }, b: { card: any; score: number }) => b.score - a.score);

      // 예산 내에서 최대한 구매
      const purchaseCards: string[] = [];
      let remainingMoney = playerState.money;

      for (const { card } of scoredCards) {
        if (card.cost <= remainingMoney) {
          purchaseCards.push(card.id);
          remainingMoney -= card.cost;
        }
      }

      return purchaseCards;
    } finally {
      client.release();
    }
  }

  /**
   * 비주류 특성 변환 결정
   */
  async decideTraitConversion(gameId: string, playerId: string): Promise<number> {
    const client = await pool.connect();
    try {
      const gameState = await this.getGameState(client, gameId, playerId);
      const { playerState, travelMultipliers } = gameState;
      const traits = playerState.traits;

      // 가중치 1배 특성 찾기
      const minorTraits: { [key: string]: number } = {};
      let totalMinorPoints = 0;

      for (const [trait, value] of Object.entries(traits)) {
        if (trait === 'memory') continue;
        
        const multiplier = travelMultipliers[trait] || 1;
        if (multiplier === 1 && typeof value === 'number') {
          minorTraits[trait] = value;
          totalMinorPoints += value;
        }
      }

      // 최대 변환 횟수
      const maxConversions = Math.floor(totalMinorPoints / 3);

      // AI는 모든 비주류 특성을 변환
      return maxConversions;
    } finally {
      client.release();
    }
  }

  /**
   * 주요 특성 추출 (x3)
   */
  private getMainTrait(multipliers: any): string {
    for (const [trait, mult] of Object.entries(multipliers)) {
      if (mult === 3) return trait;
    }
    return 'taste'; // 기본값
  }

  /**
   * 부차 특성 추출 (x2)
   */
  private getSecondaryTrait(multipliers: any): string {
    for (const [trait, mult] of Object.entries(multipliers)) {
      if (mult === 2) return trait;
    }
    return 'culture'; // 기본값
  }

  /**
   * 이동 실행 (트랜잭션 포함, 재시도 로직)
   */
  private async moveWithTransaction(gameId: string, playerId: string, position: number, retryCount = 0): Promise<void> {
    const maxRetries = 3;
    const client = await pool.connect();
    
    try {
      // 타임아웃 설정 (10초)
      await client.query('SET statement_timeout = 10000');
      await client.query('BEGIN');
      
      // 현재 위치 조회
      const stateResult = await client.query(
        'SELECT position FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      
      if (stateResult.rows.length === 0) {
        throw new Error('플레이어 상태를 찾을 수 없습니다');
      }
      
      const currentPosition = stateResult.rows[0].position;
      
      // 위치 업데이트
      await client.query(
        'UPDATE player_states SET position = $1, last_position = $2 WHERE game_id = $3 AND player_id = $4',
        [position, currentPosition, gameId, playerId]
      );
      
      // 이벤트 로그
      await client.query(
        'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
        [gameId, 'move', JSON.stringify({ playerId, from: currentPosition, to: position })]
      );
      
      await client.query('COMMIT');
      console.log(`✅ AI 이동 완료: ${currentPosition} → ${position}`);
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // 타임아웃 에러이고 재시도 가능하면 재시도
      if (error.code === '57014' && retryCount < maxRetries) {
        console.log(`⚠️ 이동 타임아웃, 재시도 ${retryCount + 1}/${maxRetries}`);
        client.release();
        
        // 잠시 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.moveWithTransaction(gameId, playerId, position, retryCount + 1);
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 행동 실행 (트랜잭션 포함, 재시도 로직)
   */
  private async performActionWithTransaction(gameId: string, playerId: string, action: number, retryCount = 0): Promise<void> {
    const maxRetries = 3;
    const client = await pool.connect();
    
    try {
      // 타임아웃 설정 (10초)
      await client.query('SET statement_timeout = 10000');
      await client.query('BEGIN');
      
      const stateResult = await client.query(
        'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      const playerStateId = stateResult.rows[0].id;
      
      let deckType = '';
      switch (action) {
        case 1: deckType = 'freeplan'; break;
        case 2: deckType = 'plan'; break;
        case 3: deckType = 'house'; break;
        case 4: deckType = 'support'; break;
        case 5: deckType = 'chance'; break;
        default: 
          await client.query('COMMIT');
          return;
      }
      
      // 덱에서 카드 드로우
      const deckResult = await client.query(
        'SELECT card_order FROM decks WHERE game_id = $1 AND type = $2',
        [gameId, deckType]
      );
      
      if (deckResult.rows.length === 0) {
        await client.query('COMMIT');
        return;
      }
      
      let cardOrder = deckResult.rows[0].card_order;
      if (typeof cardOrder === 'string') {
        cardOrder = JSON.parse(cardOrder);
      }
      if (cardOrder.length === 0) {
        await client.query('COMMIT');
        return;
      }
      
      const cardId = cardOrder.shift();
      
      // 덱 업데이트
      await client.query(
        'UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3',
        [JSON.stringify(cardOrder), gameId, deckType]
      );
      
      // 카드 정보 조회
      const cardResult = await client.query('SELECT * FROM cards WHERE id = $1', [cardId]);
      const card = cardResult.rows[0];
      
      // 손패에 추가 (plan, freeplan만)
      if (['plan', 'freeplan'].includes(deckType)) {
        const seqResult = await client.query(
          'SELECT COALESCE(MAX(seq), -1) + 1 as next_seq FROM hands WHERE player_state_id = $1',
          [playerStateId]
        );
        
        await client.query(
          'INSERT INTO hands (player_state_id, card_id, seq) VALUES ($1, $2, $3)',
          [playerStateId, cardId, seqResult.rows[0].next_seq]
        );
      }
      
      // TC 효과 적용 (house, support)
      if (card.effects && card.effects.money) {
        await client.query(
          'UPDATE player_states SET money = money + $1 WHERE id = $2',
          [card.effects.money, playerStateId]
        );
      }
      
      // 행동 로그
      await client.query(
        'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
        [gameId, `action_${action}`, JSON.stringify({ playerId, action, cardId })]
      );
      
      await client.query('COMMIT');
      console.log(`✅ AI 행동 완료: ${action}번`);
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // 타임아웃 에러이고 재시도 가능하면 재시도
      if (error.code === '57014' && retryCount < maxRetries) {
        console.log(`⚠️ 행동 타임아웃, 재시도 ${retryCount + 1}/${maxRetries}`);
        client.release();
        
        // 잠시 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.performActionWithTransaction(gameId, playerId, action, retryCount + 1);
      }
      
      throw error;
    } finally {
      client.release();
    }
  }


}

export const aiPlayerService = new AIPlayerService();
