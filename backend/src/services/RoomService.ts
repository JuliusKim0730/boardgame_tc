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
       WHERE p.room_id = $1
       ORDER BY p.created_at`,
      [roomId]
    );
    
    // 슬롯 정보 조회 (room_slots 테이블이 있다면)
    let slots = null;
    try {
      const slotsResult = await pool.query(
        'SELECT * FROM room_slots WHERE room_id = $1 ORDER BY slot_index',
        [roomId]
      );
      if (slotsResult.rows.length > 0) {
        slots = slotsResult.rows;
      }
    } catch (error) {
      // room_slots 테이블이 없으면 무시
    }
    
    return {
      room: roomResult.rows[0],
      players: playersResult.rows,
      slots
    };
  }

  // 슬롯 업데이트
  async updateSlot(roomId: string, slotIndex: number, action: 'user' | 'ai' | 'ban') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // room_slots 테이블 확인 및 생성
      await this.ensureRoomSlotsTable(client);

      if (action === 'ai') {
        // AI 봇 추가
        const aiNickname = this.generateAINickname();
        
        // AI 유저 생성
        const userResult = await client.query(
          'INSERT INTO users (nickname) VALUES ($1) RETURNING id',
          [aiNickname]
        );
        const userId = userResult.rows[0].id;
        
        // AI 플레이어 추가
        await client.query(
          'INSERT INTO players (user_id, room_id) VALUES ($1, $2)',
          [userId, roomId]
        );

        // 슬롯 정보 저장
        await client.query(
          `INSERT INTO room_slots (room_id, slot_index, status, player_id) 
           VALUES ($1, $2, $3, (SELECT id FROM players WHERE user_id = $4 AND room_id = $1))
           ON CONFLICT (room_id, slot_index) 
           DO UPDATE SET status = $3, player_id = (SELECT id FROM players WHERE user_id = $4 AND room_id = $1)`,
          [roomId, slotIndex, 'ai', userId]
        );
      } else if (action === 'ban') {
        // 해당 슬롯의 플레이어 제거
        const slotResult = await client.query(
          'SELECT player_id FROM room_slots WHERE room_id = $1 AND slot_index = $2',
          [roomId, slotIndex]
        );

        if (slotResult.rows.length > 0 && slotResult.rows[0].player_id) {
          const playerId = slotResult.rows[0].player_id;
          await client.query('DELETE FROM players WHERE id = $1', [playerId]);
        }

        // 슬롯을 ban 상태로 변경
        await client.query(
          `INSERT INTO room_slots (room_id, slot_index, status) 
           VALUES ($1, $2, $3)
           ON CONFLICT (room_id, slot_index) 
           DO UPDATE SET status = $3, player_id = NULL`,
          [roomId, slotIndex, 'ban']
        );
      } else {
        // user 상태로 변경 (기존 플레이어 제거)
        const slotResult = await client.query(
          'SELECT player_id FROM room_slots WHERE room_id = $1 AND slot_index = $2',
          [roomId, slotIndex]
        );

        if (slotResult.rows.length > 0 && slotResult.rows[0].player_id) {
          const playerId = slotResult.rows[0].player_id;
          await client.query('DELETE FROM players WHERE id = $1', [playerId]);
        }

        await client.query(
          `INSERT INTO room_slots (room_id, slot_index, status) 
           VALUES ($1, $2, $3)
           ON CONFLICT (room_id, slot_index) 
           DO UPDATE SET status = $3, player_id = NULL`,
          [roomId, slotIndex, 'user']
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 플레이어 강퇴
  async kickPlayer(roomId: string, playerId: string) {
    await pool.query(
      'DELETE FROM players WHERE id = $1 AND room_id = $2',
      [playerId, roomId]
    );
  }

  // AI 닉네임 생성
  private generateAINickname(): string {
    const prefixes = ['똑똑한', '용감한', '재빠른', '신중한', '명랑한', '차분한'];
    const names = ['로봇', 'AI', '봇', '컴퓨터', '기계', '알고리즘'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    const number = Math.floor(Math.random() * 100);
    return `${prefix}${name}${number}`;
  }

  // room_slots 테이블 확인 및 생성
  private async ensureRoomSlotsTable(client: any) {
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS room_slots (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
          slot_index INT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('user', 'ai', 'ban')),
          player_id UUID REFERENCES players(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(room_id, slot_index)
        )
      `);
    } catch (error) {
      // 테이블이 이미 존재하면 무시
    }
  }
}
