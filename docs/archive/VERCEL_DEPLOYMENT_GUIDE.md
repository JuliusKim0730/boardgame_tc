# 🚀 Vercel 배포 가이드

## 📋 개요
열네 밤의 꿈 v4.1을 Vercel에 무료로 배포하는 완전한 가이드입니다.

---

## 🎯 배포 아키텍처

### 서비스 구성
- **프론트엔드**: Vercel Static Hosting (무료)
- **백엔드 API**: Vercel Serverless Functions (무료)
- **데이터베이스**: Supabase PostgreSQL (무료)
- **WebSocket**: Socket.io (Vercel 지원)

### 무료 플랜 제한
- **Vercel Hobby Plan**:
  - 대역폭: 100GB/월
  - 빌드 시간: 6,000분/월
  - Serverless Functions: 100GB-시간/월
  - 동시 빌드: 1개
  - 도메인: 무제한 (커스텀 도메인 가능)

---

## 📦 사전 준비

### 1. Vercel 계정 생성
1. [vercel.com](https://vercel.com) 접속
2. GitHub 계정으로 가입 (권장)
3. Hobby Plan 선택 (무료)

### 2. GitHub 저장소 준비
```bash
# Git 초기화 (아직 안했다면)
git init
git add .
git commit -m "Initial commit - v4.1"

# GitHub에 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/boardgame.git
git branch -M main
git push -u origin main
```

### 3. 환경 변수 준비
Supabase 자격증명을 준비하세요:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DATABASE_URL` (PostgreSQL 연결 문자열)

---

## 🔧 프로젝트 설정

### 1. 루트 package.json 생성
```bash
# 프로젝트 루트에서
npm init -y
```

루트 `package.json` 수정:
```json
{
  "name": "boardgame-fourteen-nights",
  "version": "4.1.0",
  "private": true,
  "scripts": {
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install",
    "build": "cd frontend && npm run build",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "vercel-build": "cd frontend && npm install && npm run build"
  },
  "workspaces": [
    "frontend",
    "backend"
  ]
}
```

### 2. Backend 서버 수정 (Vercel 호환)

`backend/src/server.ts` 수정:
```typescript
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

// CORS 설정 (Vercel 배포용)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  process.env.FRONTEND_URL || ''
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Socket.IO 설정
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// ChanceService에 Socket.IO 인스턴스 전달
chanceService.setSocketIO(io);

// WebSocket 설정
setupGameSocket(io);

// API 라우트
app.use('/api', roomRoutes);
app.use('/api', gameRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '4.1.0' });
});

// Vercel Serverless Function Export
export default httpServer;

// 로컬 개발용
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}
```

### 3. Frontend API 설정 수정

`frontend/src/services/api.ts` 수정:
```typescript
import axios from 'axios';

// Vercel 배포 시 자동으로 올바른 URL 사용
const API_BASE = import.meta.env.PROD 
  ? '/api'  // 프로덕션: 같은 도메인
  : 'http://localhost:3000/api';  // 개발: 로컬 백엔드

export const api = {
  // ... 기존 코드 유지
};
```

`frontend/src/services/socket.ts` 수정:
```typescript
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD
  ? window.location.origin  // 프로덕션: 같은 도메인
  : 'http://localhost:3000';  // 개발: 로컬 백엔드

class SocketService {
  private socket: Socket | null = null;

  connect(roomId: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.emit('join-room', roomId);
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
```

---

## 🚀 Vercel 배포 단계

### 방법 1: Vercel CLI (권장)

#### 1. Vercel CLI 설치
```bash
npm install -g vercel
```

#### 2. 로그인
```bash
vercel login
```

#### 3. 프로젝트 배포
```bash
# 프로젝트 루트에서
vercel

# 프로덕션 배포
vercel --prod
```

#### 4. 환경 변수 설정
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add DATABASE_URL
vercel env add FRONTEND_URL
```

---

### 방법 2: Vercel Dashboard (간편)

#### 1. GitHub 연동
1. [vercel.com/dashboard](https://vercel.com/dashboard) 접속
2. "New Project" 클릭
3. GitHub 저장소 선택
4. "Import" 클릭

#### 2. 프로젝트 설정
- **Framework Preset**: Vite
- **Root Directory**: `./` (루트)
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm run install:all`

#### 3. 환경 변수 설정
Settings → Environment Variables에서 추가:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
DATABASE_URL=your_database_url
NODE_ENV=production
```

#### 4. 배포
"Deploy" 버튼 클릭!

---

## 🔍 배포 후 확인

### 1. 배포 URL 확인
```
https://your-project.vercel.app
```

### 2. Health Check
```bash
curl https://your-project.vercel.app/api/health
```

예상 응답:
```json
{
  "status": "ok",
  "version": "4.1.0"
}
```

### 3. 프론트엔드 접속
브라우저에서 `https://your-project.vercel.app` 접속

### 4. 기능 테스트
- [ ] 방 생성 가능
- [ ] 방 참여 가능
- [ ] 게임 시작 가능
- [ ] WebSocket 연결 확인
- [ ] 초기 자금 3,000TC 확인

---

## 🐛 문제 해결

### 문제 1: 빌드 실패
**증상**: "Build failed" 에러

**해결**:
```bash
# 로컬에서 빌드 테스트
cd frontend
npm run build

# 에러 확인 후 수정
```

### 문제 2: API 연결 실패
**증상**: "Network Error" 또는 CORS 에러

**해결**:
1. 환경 변수 확인
2. CORS 설정 확인
3. API 경로 확인 (`/api/...`)

### 문제 3: WebSocket 연결 실패
**증상**: "WebSocket connection failed"

**해결**:
1. Socket.io 설정 확인
2. Transports 설정: `['websocket', 'polling']`
3. Vercel 로그 확인

### 문제 4: 데이터베이스 연결 실패
**증상**: "Connection refused"

**해결**:
1. Supabase 자격증명 확인
2. DATABASE_URL 형식 확인
3. Supabase 방화벽 설정 확인

---

## 📊 성능 최적화

### 1. 프론트엔드 최적화
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'socket-vendor': ['socket.io-client'],
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### 2. 이미지 최적화
- WebP 형식 사용
- 적절한 크기로 리사이징
- Lazy loading 적용

### 3. 캐싱 설정
```json
// vercel.json에 추가
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 🔒 보안 설정

### 1. 환경 변수 보호
- `.env` 파일을 `.gitignore`에 추가
- Vercel Dashboard에서만 환경 변수 설정
- 민감한 정보는 절대 코드에 하드코딩하지 않기

### 2. CORS 설정
```typescript
// 프로덕션에서만 특정 도메인 허용
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:3000'];
```

### 3. Rate Limiting (선택)
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 100 요청
});

app.use('/api/', limiter);
```

---

## 🌐 커스텀 도메인 설정 (선택)

### 1. 도메인 구매
- Namecheap, GoDaddy 등에서 구매
- 또는 무료 도메인: Freenom

### 2. Vercel에 도메인 추가
1. Project Settings → Domains
2. 도메인 입력
3. DNS 레코드 설정

### 3. DNS 설정
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

---

## 📈 모니터링

### 1. Vercel Analytics (무료)
- Settings → Analytics 활성화
- 실시간 트래픽 모니터링
- 성능 메트릭 확인

### 2. 로그 확인
```bash
# Vercel CLI로 로그 확인
vercel logs
```

### 3. 에러 추적
- Vercel Dashboard → Deployments → Logs
- 실시간 에러 모니터링

---

## 🔄 지속적 배포 (CI/CD)

### GitHub Actions 설정 (선택)
`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm run install:all
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## ✅ 배포 체크리스트

### 배포 전
- [ ] 로컬에서 빌드 테스트
- [ ] 환경 변수 준비
- [ ] GitHub 저장소 생성
- [ ] Supabase 데이터베이스 준비

### 배포 중
- [ ] Vercel 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] 빌드 설정 확인
- [ ] 배포 실행

### 배포 후
- [ ] Health check 확인
- [ ] 프론트엔드 접속 확인
- [ ] API 동작 확인
- [ ] WebSocket 연결 확인
- [ ] 게임 플레이 테스트

---

## 🎉 배포 완료!

축하합니다! 이제 전 세계 어디서나 게임을 플레이할 수 있습니다!

**배포 URL**: `https://your-project.vercel.app`

### 다음 단계
1. 친구들과 테스트
2. 피드백 수집
3. 버그 수정
4. 기능 개선

**Happy Gaming! 🌙✨**

---

## 📞 지원

### 문제 발생 시
1. Vercel 로그 확인
2. 브라우저 콘솔 확인
3. Supabase 로그 확인
4. GitHub Issues 생성

### 유용한 링크
- [Vercel 문서](https://vercel.com/docs)
- [Supabase 문서](https://supabase.com/docs)
- [Socket.io 문서](https://socket.io/docs/)

---

**문서 버전**: 1.0  
**최종 수정**: 2024년 12월 1일  
**작성자**: Kiro AI Assistant
