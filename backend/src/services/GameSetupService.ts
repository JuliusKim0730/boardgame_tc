import { pool } from '../db/pool';
import { Card } from '../types';

export class GameSetupService {
  // 게임 초기화
  async setupGame(roomId: string): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 방 상태 확인
      const roomResult = await client.query(
        'SELECT status FROM rooms WHERE id = $1',
        [roomId]
      );
      
      if (roomResult.rows[0].status !== 'waiting') {
        throw new Error('이미 진행 중인 게임입니다');
      }
      
      // 게임 생성
      const gameResult = await client.query(
        'INSERT INTO games (room_id, status, day) VALUES ($1, $2, $3) RETURNING id',
        [roomId, 'setting', 1]
      );
      const gameId = gameResult.rows[0].id;
      
      // 플레이어 목록 조회 (슬롯 순서대로 = created_at 순서)
      const playersResult = await client.query(
        `SELECT p.id, p.user_id, u.nickname, p.created_at
         FROM players p 
         JOIN users u ON p.user_id = u.id
         WHERE p.room_id = $1 
         ORDER BY p.created_at ASC`,
        [roomId]
      );
      const players = playersResult.rows;
      const playerCount = players.length;
      
      console.log('=== 게임 설정 시작 ===');
      console.log('플레이어 목록:', players.map((p, i) => ({
        index: i,
        player_id: p.id,
        user_id: p.user_id,
        nickname: p.nickname,
        created_at: p.created_at,
        turn_order: i
      })));
      
      // 슬롯 순서대로 턴 순서 결정 (랜덤 섞기 제거)
      const orderedPlayers = players;
      
      // 여행지 카드 준비 (각 플레이어에게 1장씩 배분)
      const travelCards = await this.getCardsByType('travel');
      const shuffledTravelCards = [...travelCards].sort(() => Math.random() - 0.5);
      
      // 플레이어 상태 초기화 (초기 자금 3,000TC, 결심 토큰 1개)
      for (let i = 0; i < orderedPlayers.length; i++) {
        const playerStateResult = await client.query(
          `INSERT INTO player_states 
           (game_id, player_id, money, position, resolve_token, turn_order) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [gameId, orderedPlayers[i].id, 3000, 1, 1, i]
        );
        
        const playerStateId = playerStateResult.rows[0].id;
        
        // 여행지 카드 1장 배분 (공개)
        const travelCard = shuffledTravelCards[i % shuffledTravelCards.length];
        await client.query(
          'INSERT INTO purchased (player_state_id, card_id, price_paid) VALUES ($1, $2, $3)',
          [playerStateId, travelCard.id, 0]
        );
        
        // 초기 일반 계획 카드 1장 드로우
        const planCards = await this.getCardsByType('plan');
        const randomCard = planCards[Math.floor(Math.random() * planCards.length)];
        
        await client.query(
          'INSERT INTO hands (player_state_id, card_id, seq) VALUES ($1, $2, $3)',
          [playerStateId, randomCard.id, 0]
        );
      }
      
      // 덱 초기화 (6종 - invest → support로 변경)
      await this.initializeDeck(client, gameId, 'plan');
      await this.initializeDeck(client, gameId, 'freeplan');
      await this.initializeDeck(client, gameId, 'house');
      await this.initializeDeck(client, gameId, 'support'); // 여행 지원 카드
      await this.initializeDeck(client, gameId, 'joint');
      await this.initializeDeck(client, gameId, 'travel');
      
      // 2인 전용: 찬스 덱에서 CH11/CH12/CH13 제거
      if (playerCount === 2) {
        await this.initializeChanceDeckFor2Players(client, gameId);
      } else {
        await this.initializeDeck(client, gameId, 'chance');
      }
      
      // 공동 목표 카드 1장 오픈
      const jointCards = await this.getCardsByType('joint');
      const jointCard = jointCards[Math.floor(Math.random() * jointCards.length)];
      
      // 첫 번째 플레이어 = 선 플레이어 (방장)
      const firstPlayer = orderedPlayers[0];
      
      console.log('선 플레이어:', {
        player_id: firstPlayer.id,
        user_id: firstPlayer.user_id,
        nickname: firstPlayer.nickname,
        turn_order: 0
      });
      
      await client.query(
        'UPDATE games SET joint_plan_card_id = $1, status = $2, current_turn_player_id = $3 WHERE id = $4',
        [jointCard.id, 'running', firstPlayer.id, gameId]
      );
      
      // 방 상태 업데이트
      await client.query(
        'UPDATE rooms SET status = $1 WHERE id = $2',
        ['in_progress', roomId]
      );
      
      // 첫 턴 시작 (선플레이어 = 1번 슬롯 = 방장)
      const firstPlayerStateResult = await client.query(
        'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, firstPlayer.id]
      );
      
      await client.query(
        'INSERT INTO turns (game_id, day, player_state_id, started_at) VALUES ($1, $2, $3, NOW())',
        [gameId, 1, firstPlayerStateResult.rows[0].id]
      );
      
      console.log('게임 설정 완료:', {
        gameId,
        firstPlayerId: firstPlayer.id,
        firstPlayerNickname: firstPlayer.nickname,
        playerCount
      });
      
      await client.query('COMMIT');
      
      // 턴 락 설정 (COMMIT 후에 설정)
      const { turnManager } = await import('./TurnManager');
      turnManager.lockTurn(gameId, firstPlayer.id);
      console.log('첫 턴 락 설정 완료:', { gameId, playerId: firstPlayer.id });
      
      return gameId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async initializeDeck(client: any, gameId: string, type: string) {
    const cards = await this.getCardsByType(type);
    const shuffled = cards.sort(() => Math.random() - 0.5);
    const cardIds = shuffled.map(c => c.id);
    
    await client.query(
      'INSERT INTO decks (game_id, type, card_order) VALUES ($1, $2, $3)',
      [gameId, type, JSON.stringify(cardIds)]
    );
  }

  private async initializeChanceDeckFor2Players(client: any, gameId: string) {
    const cards = await this.getCardsByType('chance');
    // CH11, CH12, CH13 제거
    const filtered = cards.filter(c => !['CH11', 'CH12', 'CH13'].includes(c.code));
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    const cardIds = shuffled.map(c => c.id);
    
    await client.query(
      'INSERT INTO decks (game_id, type, card_order) VALUES ($1, $2, $3)',
      [gameId, 'chance', JSON.stringify(cardIds)]
    );
  }

  private async getCardsByType(type: string): Promise<Card[]> {
    const result = await pool.query(
      'SELECT * FROM cards WHERE type = $1',
      [type]
    );
    return result.rows;
  }
}
