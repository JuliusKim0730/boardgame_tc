import { pool } from '../db/pool';
import { turnManager } from './TurnManager';
import { Server } from 'socket.io';

export class TurnService {
  private io: Server | null = null;

  setSocketIO(io: Server) {
    this.io = io;
  }

  // 안전한 JSON 파싱 헬퍼 함수
  private safeParseJSON(data: any, fieldName: string = 'data'): any {
    if (!data) {
      console.log(`${fieldName}이(가) null 또는 undefined입니다`);
      return {};
    }

    if (typeof data === 'object') {
      console.log(`${fieldName}은(는) 이미 객체입니다`);
      return data;
    }

    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        console.log(`${fieldName} 파싱 성공`);
        return parsed;
      } catch (error) {
        console.error(`${fieldName} 파싱 실패:`, error);
        console.error(`원본 데이터:`, data);
        return {};
      }
    }

    console.warn(`${fieldName}의 타입이 예상과 다릅니다:`, typeof data);
    return {};
  }
  // 결심 토큰 회복 체크 (7일차 시작 시)
  async checkResolveTokenRecovery(gameId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 현재 날짜 확인
      const gameResult = await client.query(
        'SELECT day FROM games WHERE id = $1',
        [gameId]
      );
      const currentDay = gameResult.rows[0].day;
      
      if (currentDay === 7) {
        // 1~6일차 동안 결심 토큰 사용 여부 확인
        const playersResult = await client.query(
          'SELECT id, player_id FROM player_states WHERE game_id = $1',
          [gameId]
        );
        
        for (const player of playersResult.rows) {
          const usageResult = await client.query(
            `SELECT COUNT(*) as count FROM event_logs 
             WHERE game_id = $1 
             AND event_type = 'resolve_token_used' 
             AND data->>\'playerId\' = $2`,
            [gameId, player.player_id]
          );
          
          const usageCount = parseInt(usageResult.rows[0].count);
          
          // 1~6일차 동안 미사용 시 토큰 1개 회복 (최대 2개)
          if (usageCount === 0) {
            await client.query(
              `UPDATE player_states 
               SET resolve_token = LEAST(resolve_token + 1, 2) 
               WHERE id = $1`,
              [player.id]
            );
          }
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  // 이동 처리
  async move(gameId: string, playerId: string, targetPosition: number): Promise<void> {
    console.log('=== TurnService.move 호출 ===');
    console.log('gameId:', gameId);
    console.log('playerId:', playerId);
    console.log('targetPosition:', targetPosition);
    
    // Turn Lock 검증
    try {
      turnManager.validateTurn(gameId, playerId);
      console.log('턴 검증 통과');
    } catch (error) {
      console.error('턴 검증 실패:', error);
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 플레이어 상태 조회
      const stateResult = await client.query(
        'SELECT position, last_position FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      
      if (stateResult.rows.length === 0) {
        throw new Error('플레이어 상태를 찾을 수 없습니다');
      }
      
      const currentPosition = stateResult.rows[0].position;
      const lastPosition = stateResult.rows[0].last_position;
      
      console.log('현재 위치:', currentPosition);
      console.log('이전 위치:', lastPosition);
      console.log('목표 위치:', targetPosition);
      
      // 연속 사용 금지 검증
      if (targetPosition === lastPosition) {
        console.error('연속 사용 금지 위반');
        throw new Error('같은 칸을 연속으로 사용할 수 없습니다');
      }
      
      // 인접 칸 검증
      const adjacentPositions = this.getAdjacentPositions(currentPosition);
      console.log('인접 칸 목록:', adjacentPositions);
      
      if (!adjacentPositions.includes(targetPosition)) {
        console.error('인접 칸 검증 실패');
        throw new Error(`인접한 칸으로만 이동할 수 있습니다. 현재 위치: ${currentPosition}, 인접 칸: ${adjacentPositions.join(', ')}`);
      }
      
      // 위치 업데이트
      await client.query(
        'UPDATE player_states SET position = $1, last_position = $2 WHERE game_id = $3 AND player_id = $4',
        [targetPosition, currentPosition, gameId, playerId]
      );
      
      console.log('위치 업데이트 완료');
      
      // 이벤트 로그
      await client.query(
        'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
        [gameId, 'move', JSON.stringify({ playerId, from: currentPosition, to: targetPosition })]
      );
      
      await client.query('COMMIT');
      console.log('이동 처리 완료');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('이동 처리 중 에러:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // 행동 처리 (1~6번)
  async performAction(gameId: string, playerId: string, actionType: number): Promise<any> {
    console.log('=== TurnService.performAction 호출 ===');
    console.log('gameId:', gameId);
    console.log('playerId:', playerId);
    console.log('actionType:', actionType);
    
    // Turn Lock 검증
    try {
      turnManager.validateTurn(gameId, playerId);
      console.log('턴 검증 통과');
    } catch (error) {
      console.error('턴 검증 실패:', error);
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const stateResult = await client.query(
        'SELECT * FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      const playerState = stateResult.rows[0];
      
      // 2인 플레이 여부 확인
      const playerCountResult = await client.query(
        'SELECT COUNT(*) as count FROM player_states WHERE game_id = $1',
        [gameId]
      );
      const playerCount = parseInt(playerCountResult.rows[0].count);
      const is2Player = playerCount === 2;

      let result: any = { success: true };
      
      switch (actionType) {
        case 1: // 무료 계획 - 무료계획 카드 1장 뽑기
          result = await this.drawCard(client, gameId, playerState.id, 'freeplan');
          result.message = `무료 계획 카드 "${result.card.name}"를 획득했습니다!`;
          break;
          
        case 2: // 조사하기 - 계획 카드 1장 뽑기
          console.log('조사하기 행동 시작');
          console.log('playerState.id:', playerState.id);
          result = await this.drawCard(client, gameId, playerState.id, 'plan');
          console.log('카드 뽑기 완료:', result.card);
          result.message = `계획 카드 "${result.card.name}"를 획득했습니다!`;
          break;
          
        case 3: // 집안일 - 집안일 카드 뽑기 + 돈/추억점수 획득
          result = await this.drawCard(client, gameId, playerState.id, 'house');
          const houseEffects = this.safeParseJSON(result.card.effects, 'house.effects');
          
          const houseMoney = houseEffects.money || 0;
          const houseMemory = houseEffects.memory || 0;
          
          console.log('집안일 효과:', { money: houseMoney, memory: houseMemory });
          
          await this.applyMoneyEffect(client, playerState.id, houseMoney);
          
          if (houseMemory > 0) {
            await client.query(
              'UPDATE player_states SET traits = jsonb_set(traits, \'{추억}\', to_jsonb((COALESCE((traits->>\'추억\')::int, 0) + $1)::int)) WHERE id = $2',
              [houseMemory, playerState.id]
            );
          }
          
          result.message = `집안일 완료! +${houseMoney}TC`;
          if (houseMemory > 0) result.message += `, +${houseMemory} 추억점수`;
          
          // 2인 전용: 첫 방문 시 +500TC
          if (is2Player) {
            const firstVisitResult = await client.query(
              'SELECT COUNT(*) as count FROM event_logs WHERE game_id = $1 AND event_type = $2 AND data->>\'playerId\' = $3',
              [gameId, 'action_3', playerId]
            );
            if (parseInt(firstVisitResult.rows[0].count) === 0) {
              await this.applyMoneyEffect(client, playerState.id, 500);
              result.message += ' (첫 방문 보너스 +500TC)';
            }
          }
          break;
          
        case 4: // 여행 지원 - 여행지원 카드 뽑기 + 효과 적용
          result = await this.drawCard(client, gameId, playerState.id, 'support');
          const supportEffects = this.safeParseJSON(result.card.effects, 'support.effects');
          
          const supportMoney = supportEffects.money || 0;
          
          console.log('여행 지원 효과:', { money: supportMoney });
          
          if (supportMoney !== 0) {
            await this.applyMoneyEffect(client, playerState.id, supportMoney);
            result.message = `여행 지원 "${result.card.name}" - ${supportMoney > 0 ? '+' : ''}${supportMoney}TC`;
          } else {
            result.message = `여행 지원 "${result.card.name}" 획득!`;
          }
          break;
          
        case 5: // 찬스 - 2인: 선택 모달, 다인: 찬스 카드
          if (is2Player) {
            // 2인 전용: 프론트엔드에서 선택 처리
            result.requiresChoice = true;
            result.message = '찬스 카드 또는 500TC를 선택하세요';
          } else {
            result = await this.drawCard(client, gameId, playerState.id, 'chance');
            result.message = `찬스 카드 "${result.card.name}"를 획득했습니다!`;
          }
          break;
          
        case 6: // 자유 행동 - 1~5번 중 선택 가능
          // 프론트엔드에서 추가 선택 처리
          result.requiresFreeChoice = true;
          result.message = '1~5번 행동 중 하나를 선택하세요';
          break;
      }
      
      // 행동 로그 기록
      await client.query(
        'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
        [gameId, `action_${actionType}`, JSON.stringify({ playerId, actionType, result })]
      );
      
      await client.query('COMMIT');
      
      // 상태 업데이트 브로드캐스트
      if (this.io) {
        const roomResult = await client.query(
          'SELECT room_id FROM games WHERE id = $1',
          [gameId]
        );
        const roomId = roomResult.rows[0].room_id;
        
        this.io.to(roomId).emit('action-completed', {
          playerId,
          actionType,
          result
        });
      }
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async drawCard(client: any, gameId: string, playerStateId: string, deckType: string) {
    console.log('=== drawCard 호출 ===');
    console.log('gameId:', gameId);
    console.log('playerStateId:', playerStateId);
    console.log('deckType:', deckType);
    
    // 덱에서 카드 드로우
    const deckResult = await client.query(
      'SELECT card_order FROM decks WHERE game_id = $1 AND type = $2',
      [gameId, deckType]
    );
    
    if (deckResult.rows.length === 0) {
      console.error(`${deckType} 덱을 찾을 수 없습니다`);
      throw new Error(`${deckType} 덱을 찾을 수 없습니다`);
    }
    
    let cardOrder;
    try {
      const rawCardOrder = deckResult.rows[0].card_order;
      console.log('원본 card_order 타입:', typeof rawCardOrder);
      console.log('원본 card_order 값:', rawCardOrder);
      
      if (typeof rawCardOrder === 'string') {
        cardOrder = JSON.parse(rawCardOrder);
      } else if (Array.isArray(rawCardOrder)) {
        cardOrder = rawCardOrder;
      } else {
        console.error('card_order가 예상치 못한 타입입니다:', typeof rawCardOrder);
        throw new Error('덱 데이터 형식 오류');
      }
    } catch (error) {
      console.error('card_order 파싱 실패:', error);
      throw new Error('덱 데이터 파싱 실패');
    }
    
    console.log('파싱된 덱 카드 수:', cardOrder.length);
    console.log('덱 카드 ID 목록:', cardOrder);
    
    // 덱이 비었으면 재충전 시도
    if (cardOrder.length === 0) {
      console.log(`⚠️ ${deckType} 덱이 비었습니다. 재충전 시도...`);
      cardOrder = await this.refillDeck(client, gameId, deckType);
      
      if (cardOrder.length === 0) {
        console.error(`❌ ${deckType} 덱 완전 소진`);
        throw new Error(`${deckType} 덱에 더 이상 카드가 없습니다`);
      }
    }
    
    const cardId = cardOrder.shift();
    console.log('뽑은 카드 ID:', cardId);
    console.log('남은 카드 ID 목록:', cardOrder);
    
    // 덱 업데이트
    await client.query(
      'UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3',
      [JSON.stringify(cardOrder), gameId, deckType]
    );
    console.log('덱 업데이트 완료, 남은 카드:', cardOrder.length);
    
    // 카드 정보 조회
    const cardResult = await client.query('SELECT * FROM cards WHERE id = $1', [cardId]);
    if (cardResult.rows.length === 0) {
      console.error(`카드 ID ${cardId}를 찾을 수 없습니다`);
      throw new Error(`카드 ID ${cardId}를 찾을 수 없습니다`);
    }
    
    const card = cardResult.rows[0];
    console.log('카드 정보:', { id: card.id, name: card.name, type: card.type, code: card.code });
    
    // 손패에 추가 (plan, freeplan만)
    if (['plan', 'freeplan'].includes(deckType)) {
      console.log('손패에 추가 중...');
      console.log('playerStateId:', playerStateId);
      console.log('cardId:', cardId);
      
      const seqResult = await client.query(
        'SELECT COALESCE(MAX(seq), -1) + 1 as next_seq FROM hands WHERE player_state_id = $1',
        [playerStateId]
      );
      
      const nextSeq = seqResult.rows[0].next_seq;
      console.log('다음 seq:', nextSeq);
      
      try {
        const insertResult = await client.query(
          'INSERT INTO hands (player_state_id, card_id, seq) VALUES ($1, $2, $3) RETURNING *',
          [playerStateId, cardId, nextSeq]
        );
        console.log('✅ 손패 추가 완료:', insertResult.rows[0]);
        
        // 손패 확인
        const verifyResult = await client.query(
          'SELECT COUNT(*) as count FROM hands WHERE player_state_id = $1',
          [playerStateId]
        );
        console.log('✅ 현재 손패 카드 수:', verifyResult.rows[0].count);
        
        // 추가된 카드 상세 확인
        const cardCheckResult = await client.query(
          `SELECT h.id, h.seq, c.name, c.code 
           FROM hands h 
           JOIN cards c ON h.card_id = c.id 
           WHERE h.player_state_id = $1 
           ORDER BY h.seq`,
          [playerStateId]
        );
        console.log('✅ 손패 카드 목록:', cardCheckResult.rows);
      } catch (error) {
        console.error('❌ 손패 추가 실패:', error);
        throw error;
      }
    } else {
      console.log('즉시 사용 카드, 손패에 추가하지 않음');
    }
    
    return { card };
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

  private async applyMoneyEffect(client: any, playerStateId: string, amount: number) {
    await client.query(
      'UPDATE player_states SET money = money + $1 WHERE id = $2',
      [amount, playerStateId]
    );
  }

  private getAdjacentPositions(position: number): number[] {
    const adjacency: { [key: number]: number[] } = {
      1: [2, 3],      // 무료계획 → 조사하기, 집안일
      2: [1, 4],      // 조사하기 → 무료계획, 여행지원
      3: [1, 5],      // 집안일 → 무료계획, 찬스
      4: [2, 5, 6],   // 여행지원 → 조사하기, 찬스, 자유행동
      5: [3, 4, 6],   // 찬스 → 집안일, 여행지원, 자유행동
      6: [4, 5]       // 자유행동 → 여행지원, 찬스
    };
    return adjacency[position] || [];
  }

  // 결심 토큰 사용 (추가 행동)
  async useResolveToken(gameId: string, playerId: string, actionType: number): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const stateResult = await client.query(
        'SELECT id, resolve_token, last_position FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      
      const playerState = stateResult.rows[0];
      
      if (playerState.resolve_token <= 0) {
        throw new Error('결심 토큰이 부족합니다');
      }
      
      // 직전 행동 칸 반복 불가 검증
      if (actionType === playerState.last_position) {
        throw new Error('직전에 행동한 칸은 반복할 수 없습니다');
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
      
      await client.query('COMMIT');
      
      return { success: true, remainingTokens: playerState.resolve_token - 1 };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 2인 전용 찬스 칸 500TC 지급
  async applyMoneyBonus(gameId: string, playerId: string, amount: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const stateResult = await client.query(
        'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, playerId]
      );
      
      await client.query(
        'UPDATE player_states SET money = money + $1 WHERE id = $2',
        [amount, stateResult.rows[0].id]
      );
      
      await client.query(
        'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
        [gameId, 'chance_money_bonus', JSON.stringify({ playerId, amount })]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 찬스 카드 드로우
  async drawChanceCard(gameId: string, playerId: string): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const result = await this.drawCard(client, gameId, playerId, 'chance');
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 현재 게임 날짜 조회
  async getCurrentDay(gameId: string): Promise<number> {
    const result = await pool.query('SELECT day FROM games WHERE id = $1', [gameId]);
    return result.rows[0]?.day || 1;
  }
}
