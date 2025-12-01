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
      
      // 플레이어 목록 조회
      const playersResult = await client.query(
        'SELECT id FROM players WHERE room_id = $1',
        [roomId]
      );
      const players = playersResult.rows;
      const playerCount = players.length;
      
      // 선플레이어 랜덤 결정
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      
      // 플레이어 상태 초기화 (초기 자금 3,000TC로 변경)
      for (let i = 0; i < shuffledPlayers.length; i++) {
        const playerStateResult = await client.query(
          `INSERT INTO player_states 
           (game_id, player_id, money, position, resolve_token, turn_order) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [gameId, shuffledPlayers[i].id, 3000, 1, true, i]
        );
        
        // 초기 계획 카드 1장 드로우
        const planCards = await this.getCardsByType('plan');
        const randomCard = planCards[Math.floor(Math.random() * planCards.length)];
        
        await client.query(
          'INSERT INTO hands (player_state_id, card_id, seq) VALUES ($1, $2, $3)',
          [playerStateResult.rows[0].id, randomCard.id, 0]
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
      
      // 여행지 카드 1장 오픈
      const travelCards = await this.getCardsByType('travel');
      const travelCard = travelCards[Math.floor(Math.random() * travelCards.length)];
      
      // 공동 계획 카드 1장 오픈
      const jointCards = await this.getCardsByType('joint');
      const jointCard = jointCards[Math.floor(Math.random() * jointCards.length)];
      
      await client.query(
        'UPDATE games SET travel_theme = $1, joint_plan_card_id = $2, status = $3, current_turn_player_id = $4 WHERE id = $5',
        [travelCard.code, jointCard.id, 'running', shuffledPlayers[0].id, gameId]
      );
      
      // 방 상태 업데이트
      await client.query(
        'UPDATE rooms SET status = $1 WHERE id = $2',
        ['in_progress', roomId]
      );
      
      // 첫 턴 시작 (선플레이어)
      const firstPlayerId = shuffledPlayers[0].id;
      const firstPlayerStateResult = await client.query(
        'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
        [gameId, firstPlayerId]
      );
      
      await client.query(
        'INSERT INTO turns (game_id, day, player_state_id, started_at) VALUES ($1, $2, $3, NOW())',
        [gameId, 1, firstPlayerStateResult.rows[0].id]
      );
      
      await client.query('COMMIT');
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
