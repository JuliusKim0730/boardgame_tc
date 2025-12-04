import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomRoutes from './routes/roomRoutes';
import gameRoutes from './routes/gameRoutes';
import { setupGameSocket } from './ws/gameSocket';
import { chanceService } from './services/ChanceService';

const app = express();
const httpServer = createServer(app);

// CORS 설정 (로컬 + Vercel 도메인 허용)
const allowedOrigins = [
  'http://localhost:5173',  // Vite 기본 포트
  'http://localhost:3000',  // 대체 포트
  'http://localhost:4173',  // Vite preview 포트
  'https://boardgame-tc-frontend-javl8lp8g-juliuskim0730s-projects.vercel.app',
  process.env.CLIENT_URL || '',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  process.env.FRONTEND_URL || ''
].filter(Boolean);

console.log('🌐 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // origin이 없는 경우 (Postman, curl 등) 또는 허용된 origin
    if (!origin) {
      return callback(null, true);
    }
    
    // 허용된 origin 목록에 있거나 vercel.app 도메인인 경우
    if (allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    // 개발 환경에서는 localhost 모두 허용
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    console.warn('⚠️ CORS blocked origin:', origin);
    callback(null, true); // 개발 중에는 경고만 하고 허용
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Socket.IO 설정
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        return callback(null, true);
      }
      console.warn('⚠️ Socket CORS blocked origin:', origin);
      callback(null, true); // 개발 중에는 경고만 하고 허용
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

console.log('📡 Socket.IO configured with CORS');

// ChanceService에 Socket.IO 인스턴스 전달
chanceService.setSocketIO(io);

// WebSocket 설정
setupGameSocket(io);

// 라우트에 Socket.IO 전달
import { setSocketIO as setRoomSocketIO } from './routes/roomRoutes';
import { setSocketIO as setGameSocketIO } from './routes/gameRoutes';
setRoomSocketIO(io);
setGameSocketIO(io);

// API 라우트
app.use('/api', roomRoutes);
app.use('/api', gameRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '4.1.0',
    timestamp: new Date().toISOString()
  });
});

// 루트 경로
app.get('/', (req, res) => {
  res.json({ 
    message: '열네 밤의 꿈 API Server',
    version: '4.1.0'
  });
});

// AI 스케줄러 시작
import { aiScheduler } from './services/AIScheduler';
import { aiPlayerService } from './services/AIPlayerService';
import { turnManager } from './services/TurnManager';

// AIPlayerService와 TurnManager에 Socket.IO 전달
aiPlayerService.setSocketIO(io);
turnManager.setSocketIO(io);

aiScheduler.start();

// 오래된 게임 정리 함수
async function cleanupOldGames() {
  const { pool } = await import('./db/pool');
  const client = await pool.connect();
  
  try {
    console.log('🧹 오래된 게임 데이터 정리 시작...');
    
    // 1시간 이상 지난 게임 중 종료되지 않은 게임 찾기
    const oldGamesResult = await client.query(`
      SELECT id, room_id, status, created_at 
      FROM games 
      WHERE created_at < NOW() - INTERVAL '1 hour'
      AND status NOT IN ('finished', 'finalizing')
    `);
    
    if (oldGamesResult.rows.length > 0) {
      console.log(`📋 ${oldGamesResult.rows.length}개의 오래된 게임 발견`);
      
      for (const game of oldGamesResult.rows) {
        console.log(`  - 게임 ${game.id} (${game.status}, ${game.created_at})`);
        
        // 게임 상태를 finished로 변경
        await client.query(
          'UPDATE games SET status = $1, current_turn_player_id = NULL WHERE id = $2',
          ['finished', game.id]
        );
        
        // 관련 방도 in_progress로 유지 (재사용 가능)
        // 또는 삭제하지 않고 그대로 둠
      }
      
      console.log(`✅ ${oldGamesResult.rows.length}개의 오래된 게임 정리 완료`);
    } else {
      console.log('✅ 정리할 오래된 게임 없음');
    }
    
    // 완료된 게임의 턴 락 제거 및 AI 스케줄러에서 제외
    console.log('🧹 완료된 게임의 턴 락 정리...');
    const finishedGames = await client.query(`
      SELECT id FROM games WHERE status IN ('finished', 'finalizing')
    `);
    
    for (const game of finishedGames.rows) {
      turnManager.unlockTurn(game.id);
      aiScheduler.stopGame(game.id); // AI 스케줄러에서 제외
    }
    
    console.log(`✅ ${finishedGames.rows.length}개의 턴 락 정리 완료`);
    
    console.log('✅ 게임 데이터 정리 완료');
  } catch (error) {
    console.error('❌ 게임 데이터 정리 실패:', error);
  } finally {
    client.release();
  }
}

// 서버 시작
const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🤖 AI Scheduler started`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // 오래된 게임 정리 (턴 락 복원 대신)
  await cleanupOldGames();
});

// Vercel Serverless Function Export
export default httpServer;
