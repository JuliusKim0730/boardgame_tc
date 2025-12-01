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

// CORS 설정 (모든 Vercel 도메인 허용)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://boardgame-tc-frontend-javl8lp8g-juliuskim0730s-projects.vercel.app',
  process.env.CLIENT_URL || '',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  process.env.FRONTEND_URL || ''
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Vercel 도메인 또는 허용된 origin
    if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // 개발 중에는 모두 허용
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Socket.IO 설정
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

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

// 서버 시작
const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Vercel Serverless Function Export
export default httpServer;
