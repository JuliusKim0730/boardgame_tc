import { pool } from '../db/pool';

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
  
  /**
   * AI 턴 실행
   */
  async executeTurn(gameId: string, playerId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 게임 상태 조회
      const gameState = await this.getGameState(client, gameId, playerId);
      
      // 1. 이동 결정
      const targetPosition = await this.decideMove(gameState);
      await this.move(client, gameId, playerId, targetPosition);

      // 2. 행동 결정
      const action = await this.decideAction(gameState, targetPosition);
      await this.performAction(client, gameId, playerId, action);

      // 3. 찬스 카드 처리 (필요 시)
      if (action === 5) {
        await this.handleChanceCard(client, gameState);
      }

      // 4. 턴 종료
      await this.endTurn(client, gameId, playerId);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
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
   * 행동 결정
   */
  private async decideAction(gameState: any, position: number): Promise<number> {
    const { day, playerState, tokenUsedCount } = gameState;

    // 6번 칸 (자유 행동)인 경우
    if (position === 6) {
      // 결심 토큰 사용 전략
      const shouldUseToken = this.shouldUseResolveToken(day, tokenUsedCount);
      
      if (shouldUseToken && playerState.resolve_token > 0) {
        // 가장 유용한 행동 선택 (2번 조사하기 또는 3번 집안일)
        return playerState.money < 5000 ? 3 : 2;
      }
    }

    // 해당 칸의 기본 행동
    return position;
  }

  /**
   * 결심 토큰 사용 전략
   * 1-7턴: 1개 사용
   * 8-14턴: 1개 사용
   */
  private shouldUseResolveToken(day: number, tokenUsedCount: number): boolean {
    if (day <= 7 && tokenUsedCount === 0) {
      // 1-7턴 중 랜덤하게 사용 (확률 증가)
      return Math.random() < (day / 7) * 0.5;
    }
    
    if (day > 7 && tokenUsedCount === 1) {
      // 8-14턴 중 랜덤하게 사용
      return Math.random() < ((day - 7) / 7) * 0.5;
    }

    return false;
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
   * 이동 실행
   */
  private async move(client: any, gameId: string, playerId: string, position: number): Promise<void> {
    await client.query(
      'UPDATE player_states SET position = $1 WHERE game_id = $2 AND player_id = $3',
      [position, gameId, playerId]
    );
  }

  /**
   * 행동 실행
   */
  private async performAction(client: any, gameId: string, playerId: string, action: number): Promise<void> {
    // TurnService의 performAction 호출
    const { TurnService } = await import('./TurnService');
    const turnService = new TurnService();
    await turnService.performAction(gameId, playerId, action);
  }

  /**
   * 턴 종료
   */
  private async endTurn(client: any, gameId: string, playerId: string): Promise<void> {
    // TurnManager의 endTurn 호출
    const { turnManager } = await import('./TurnManager');
    await turnManager.endTurn(gameId, playerId);
  }
}

export const aiPlayerService = new AIPlayerService();
