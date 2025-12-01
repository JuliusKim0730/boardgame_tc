import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';

export class RoomService {
  // 방 생성
  async createRoom(hostNickname: string): Promise<{ roomId: string; code: string; userId: string }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 고유 방 코드 생성 (6자리)
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // 방 생성
      const roomResult = await client.query(
        'INSERT INTO rooms (code, status) VALUES ($1, $2) RETURNING id',
        [code, 'waiting']
      );
      const roomId = roomResult.rows[0].id;
      
      // 유저 생성
      const userResult = await client.query(
        'INSERT INTO users (nickname) VALUES ($1) RETURNING id',
        [hostNickname]
      );
      const userId = userResult.rows[0].id;
      
      // 플레이어 추가
      await client.query(
        'INSERT INTO players (user_id, room_id) VALUES ($1, $2)',
        [userId, roomId]
      );
      
      await client.query('COMMIT');
      return { roomId, code, userId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 방 참여
  async joinRoom(code: string, nickname: string): Promise<{ roomId: string; userId: string }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 방 조회
      const roomResult = await client.query(
        'SELECT id, status FROM rooms WHERE code = $1',
        [code]
      );
      
      if (roomResult.rows.length === 0) {
        throw new Error('방을 찾을 수 없습니다');
      }
      
      const room = roomResult.rows[0];
      if (room.status !== 'waiting') {
        throw new Error('이미 진행 중인 게임입니다');
      }
      
      // 닉네임 중복 체크 및 suffix 부여
      const existingPlayers = await client.query(
        `SELECT u.nickname FROM players p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.room_id = $1`,
        [room.id]
      );
      
      let finalNickname = nickname;
      const existingNicknames = existingPlayers.rows.map(r => r.nickname);
      let suffix = 1;
      while (existingNicknames.includes(finalNickname)) {
        finalNickname = `${nickname}_${suffix}`;
        suffix++;
      }
      
      // 유저 생성
      const userResult = await client.query(
        'INSERT INTO users (nickname) VALUES ($1) RETURNING id',
        [finalNickname]
      );
      const userId = userResult.rows[0].id;
      
      // 플레이어 추가
      await client.query(
        'INSERT INTO players (user_id, room_id) VALUES ($1, $2)',
        [userId, room.id]
      );
      
      await client.query('COMMIT');
      return { roomId: room.id, userId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 방 상태 조회
  async getRoomState(roomId: string) {
    const roomResult = await pool.query(
      'SELECT * FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      throw new Error('방을 찾을 수 없습니다');
    }
    
    const playersResult = await pool.query(
      `SELECT p.id, u.nickname FROM players p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.room_id = $1`,
      [roomId]
    );
    
    return {
      room: roomResult.rows[0],
      players: playersResult.rows
    };
  }
}
