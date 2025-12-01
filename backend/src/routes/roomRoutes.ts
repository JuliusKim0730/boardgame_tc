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
        'SELECT current_turn_player_id FROM games WHERE id = $1',
        [gameId]
      );
      
      const firstPlayerId = gameResult.rows[0].current_turn_player_id;
      
      // WebSocket으로 게임 시작 및 첫 턴 알림
      if (io) {
        io.to(roomId).emit('game-started', { gameId });
        io.to(roomId).emit('turn-started', { 
          playerId: firstPlayerId,
          day: 1
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

export default router;
