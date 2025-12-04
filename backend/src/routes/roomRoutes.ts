import { Router } from 'express';
import { RoomService } from '../services/RoomService';
import { GameSetupService } from '../services/GameSetupService';
import { Server } from 'socket.io';
import { pool } from '../db/pool';

const router = Router();
const roomService = new RoomService();
const setupService = new GameSetupService();

let io: Server;

export function setSocketIO(socketIO: Server) {
  io = socketIO;
}

// 방 생성
router.post('/rooms', async (req, res) => {
  try {
    console.log('방 생성 요청:', req.body);
    const { nickname } = req.body;
    
    if (!nickname || nickname.trim() === '') {
      return res.status(400).json({ error: '닉네임을 입력하세요' });
    }
    
    const result = await roomService.createRoom(nickname);
    console.log('방 생성 성공:', result);
    res.json(result);
  } catch (error: any) {
    console.error('방 생성 에러:', error);
    res.status(400).json({ error: error.message || '방 생성 실패' });
  }
});

// 방 참여
router.post('/rooms/:code/join', async (req, res) => {
  try {
    const { code } = req.params;
    const { nickname } = req.body;
    const result = await roomService.joinRoom(code, nickname);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 방 상태 조회
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const result = await roomService.getRoomState(roomId);
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// 게임 시작
router.post('/rooms/:roomId/start', async (req, res) => {
  try {
    const { roomId } = req.params;
    const gameId = await setupService.setupGame(roomId);
    
    // 게임 상태 조회
    const client = await pool.connect();
    try {
      const gameResult = await client.query(
        `SELECT g.current_turn_player_id, p.is_ai
         FROM games g
         JOIN players p ON p.id = g.current_turn_player_id
         WHERE g.id = $1`,
        [gameId]
      );
      
      const firstPlayerId = gameResult.rows[0].current_turn_player_id;
      const isFirstPlayerAI = gameResult.rows[0].is_ai;
      
      // WebSocket으로 게임 시작 및 첫 턴 알림
      if (io) {
        io.to(roomId).emit('game-started', { gameId });
        io.to(roomId).emit('turn-started', { 
          playerId: firstPlayerId,
          day: 1
        });
      }
      
      // 첫 플레이어가 AI인 경우 즉시 턴 실행
      if (isFirstPlayerAI) {
        console.log('🤖 첫 플레이어가 AI, 즉시 턴 실행 예약');
        const { aiScheduler } = await import('../services/AIScheduler');
        aiScheduler.markGameAsExecuting(gameId);
        
        // 비동기로 AI 턴 실행 (응답 지연 방지)
        setImmediate(async () => {
          try {
            const { aiPlayerService } = await import('../services/AIPlayerService');
            console.log('🤖 첫 AI 턴 실행 시작');
            await aiPlayerService.executeTurn(gameId, firstPlayerId);
            console.log('✅ 첫 AI 턴 실행 완료');
          } catch (error) {
            console.error('❌ 첫 AI 턴 실행 실패:', error);
          } finally {
            aiScheduler.unmarkGameAsExecuting(gameId);
          }
        });
      }
    } finally {
      client.release();
    }
    
    res.json({ gameId });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 소프트 리셋
router.post('/rooms/:roomId/soft-reset', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { gameFinalizationService } = await import('../services/GameFinalizationService');
    await gameFinalizationService.softReset(roomId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 슬롯 업데이트
router.post('/rooms/:roomId/slots/:slotIndex', async (req, res) => {
  try {
    const { roomId, slotIndex } = req.params;
    const { action } = req.body; // 'user' | 'ai' | 'ban'
    
    const index = parseInt(slotIndex);
    if (isNaN(index) || index < 0 || index > 4) {
      return res.status(400).json({ error: '잘못된 슬롯 인덱스입니다' });
    }

    await roomService.updateSlot(roomId, index, action);
    
    // WebSocket으로 슬롯 업데이트 알림
    if (io) {
      io.to(roomId).emit('slot-updated', { slotIndex: index, action });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 플레이어 강퇴
router.post('/rooms/:roomId/kick', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { playerId } = req.body;
    
    await roomService.kickPlayer(roomId, playerId);
    
    // WebSocket으로 강퇴 알림
    if (io) {
      io.to(roomId).emit('player-kicked', { playerId });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
