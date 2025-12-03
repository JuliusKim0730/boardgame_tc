import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';

export class RoomService {
  // 방 생성
  async createRoom(hostNickname: string): Promise<{ roomId: string; code: string; userId: string; playerId: string }> {
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
      const playerResult = await client.query(
        'INSERT INTO players (user_id, room_id) VALUES ($1, $2) RETURNING id',
        [userId, roomId]
      );
      const playerId = playerResult.rows[0].id;
      
      await client.query('COMMIT');
      return { roomId, code, userId, playerId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 방 참여
  async joinRoom(code: string, nickname: string): Promise<{ roomId: string; userId: string; playerId: string }> {
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
      
      // 현재 플레이어 수 확인 (최대 5명)
      const playerCountResult = await client.query(
        'SELECT COUNT(*) as count FROM players WHERE room_id = $1',
        [room.id]
      );
      
      const currentPlayerCount = parseInt(playerCountResult.rows[0].count);
      if (currentPlayerCount >= 5) {
        throw new Error('방이 가득 찼습니다 (최대 5명)');
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
      const playerResult = await client.query(
        'INSERT INTO players (user_id, room_id) VALUES ($1, $2) RETURNING id',
        [userId, room.id]
      );
      const playerId = playerResult.rows[0].id;
      
      await client.query('COMMIT');
      return { roomId: room.id, userId, playerId };
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
    
    // created_at 컬럼 존재 여부 확인
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'players' AND column_name = 'created_at'
    `);
    
    const hasCreatedAt = columnCheck.rows.length > 0;
    
    // 플레이어 조회 (생성 순서대로 = 첫 번째가 방장)
    const orderBy = hasCreatedAt ? 'p.created_at' : 'p.id';
    const playersResult = await pool.query(
      `SELECT p.id, p.user_id, u.nickname FROM players p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.room_id = $1
       ORDER BY ${orderBy}`,
      [roomId]
    );
    
    const players = playersResult.rows;
    
    // 슬롯 정보 생성 (5개 슬롯)
    const slots = [];
    
    for (let i = 0; i < 5; i++) {
      const player = players[i];
      
      if (player) {
        // AI 플레이어 확인 (닉네임에 '로봇', 'AI', '봇' 등이 포함되어 있으면 AI)
        const isAI = /로봇|AI|봇|컴퓨터|기계|알고리즘/.test(player.nickname);
        
        slots.push({
          index: i,
          status: isAI ? 'ai' : 'user',
          player: {
            id: player.id,
            userId: player.user_id,
            nickname: player.nickname,
            isHost: i === 0 // 첫 번째 플레이어가 방장
          }
        });
      } else {
        // 빈 슬롯
        slots.push({
          index: i,
          status: 'user'
        });
      }
    }
    
    return {
      room: roomResult.rows[0],
      players: players.map((p, idx) => ({
        id: p.id,
        userId: p.user_id,
        nickname: p.nickname,
        isHost: idx === 0,
        isAI: /로봇|AI|봇|컴퓨터|기계|알고리즘/.test(p.nickname)
      })),
      slots
    };
  }

  // 슬롯 업데이트
  async updateSlot(roomId: string, slotIndex: number, action: 'user' | 'ai' | 'ban') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // created_at 컬럼 존재 여부 확인
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'players' AND column_name = 'created_at'
      `);
      
      const hasCreatedAt = columnCheck.rows.length > 0;
      const orderBy = hasCreatedAt ? 'p.created_at' : 'p.id';

      // 현재 슬롯의 플레이어 확인
      const playersResult = await client.query(
        `SELECT p.id, p.user_id FROM players p 
         WHERE p.room_id = $1
         ORDER BY ${orderBy}`,
        [roomId]
      );
      
      const players = playersResult.rows;
      const targetPlayer = players[slotIndex];

      if (action === 'ai') {
        // 해당 슬롯에 이미 플레이어가 있으면 제거
        if (targetPlayer) {
          await client.query('DELETE FROM players WHERE id = $1', [targetPlayer.id]);
        }
        
        // AI 봇 추가
        const aiNickname = this.generateAINickname();
        
        // AI 유저 생성
        const userResult = await client.query(
          'INSERT INTO users (nickname) VALUES ($1) RETURNING id',
          [aiNickname]
        );
        const userId = userResult.rows[0].id;
        
        // 해당 슬롯 위치에 AI 플레이어 추가
        if (hasCreatedAt) {
          // created_at이 있으면 시간 조정하여 순서 유지
          const targetTime = new Date();
          targetTime.setSeconds(targetTime.getSeconds() + slotIndex);
          
          await client.query(
            'INSERT INTO players (user_id, room_id, is_ai, created_at) VALUES ($1, $2, $3, $4)',
            [userId, roomId, true, targetTime]
          );
        } else {
          // created_at이 없으면 그냥 추가
          await client.query(
            'INSERT INTO players (user_id, room_id, is_ai) VALUES ($1, $2, $3)',
            [userId, roomId, true]
          );
        }
      } else if (action === 'ban') {
        // 해당 슬롯의 플레이어 제거
        if (targetPlayer) {
          await client.query('DELETE FROM players WHERE id = $1', [targetPlayer.id]);
        }
      } else {
        // user 상태로 변경 (AI 플레이어만 제거)
        if (targetPlayer) {
          const userResult = await client.query(
            'SELECT nickname FROM users WHERE id = $1',
            [targetPlayer.user_id]
          );
          
          const isAI = /로봇|AI|봇|컴퓨터|기계|알고리즘/.test(userResult.rows[0].nickname);
          
          if (isAI) {
            await client.query('DELETE FROM players WHERE id = $1', [targetPlayer.id]);
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
