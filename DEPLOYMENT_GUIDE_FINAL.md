# 🚀 최종 배포 가이드 (Vercel + Render.com)

## 📋 배포 아키텍처

```
┌─────────────────────────────────────────┐
│         사용자 브라우저                  │
└─────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│   Vercel (프론트엔드)                    │
│   - React + Vite                        │
│   - Static Build                        │
│   - CDN 배포                            │
└─────────────────────────────────────────┘
                 │
                 ↓ API/WebSocket
┌─────────────────────────────────────────┐
│   Render.com (백엔드)                    │
│   - Node.js + Express                   │
│   - Socket.IO                           │
│   - AI Scheduler                        │
└─────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│   Supabase (데이터베이스)                │
│   - PostgreSQL                          │
│   - 무료 티어                           │
└─────────────────────────────────────────┘
```

---

## 🎯 1단계: Supabase 설정

### 1.1 데이터베이스 마이그레이션

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard

2. **SQL Editor 열기**
   - 좌측 메뉴 → SQL Editor

3. **마이그레이션 실행**
   ```sql
   -- 1. migration_v4.1.sql 실행
   -- 2. seedCards_FULL.sql 실행
   ```

### 1.2 환경 변수 확인

```bash
# Supabase 프로젝트 설정에서 확인
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-ID].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

---

## 🎯 2단계: Render.com 백엔드 배포

### 2.1 Render.com 설정

1. **New Web Service 생성**
   - https://dashboard.render.com/
   - "New +" → "Web Service"

2. **GitHub 연동**
   - Repository 선택
   - Branch: `main`

3. **서비스 설정**
   ```
   Name: boardgame-backend
   Region: Singapore (또는 가까운 지역)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

4. **환경 변수 설정**
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=[Supabase DATABASE_URL]
   FRONTEND_URL=https://[your-project].vercel.app
   CLIENT_URL=https://[your-project].vercel.app
   ```

### 2.2 Render.com 특수 설정

**중요**: Render.com은 무료 플랜에서 15분 비활성 시 슬립 모드로 전환됩니다.

#### 해결 방법 1: Keep-Alive 엔드포인트
```typescript
// backend/src/server.ts에 이미 구현됨
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

#### 해결 방법 2: 외부 Ping 서비스
- UptimeRobot (https://uptimerobot.com/)
- 5분마다 `/api/health` 호출

---

## 🎯 3단계: Vercel 프론트엔드 배포

### 3.1 Vercel 프로젝트 생성

1. **Vercel 대시보드**
   - https://vercel.com/dashboard
   - "Add New..." → "Project"

2. **GitHub 연동**
   - Repository 선택
   - Import

3. **프로젝트 설정**
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

### 3.2 환경 변수 설정

**Vercel Dashboard → Settings → Environment Variables**

```bash
# Render.com 백엔드 URL
VITE_API_URL=https://boardgame-backend.onrender.com
VITE_SOCKET_URL=https://boardgame-backend.onrender.com

# 또는 커스텀 도메인 사용 시
VITE_API_URL=https://api.yourdomain.com
VITE_SOCKET_URL=https://api.yourdomain.com
```

### 3.3 배포 실행

```bash
# 자동 배포 (GitHub push 시)
git push origin main

# 또는 Vercel CLI
npm install -g vercel
vercel --prod
```

---

## 🔧 4단계: 코드 수정 사항

### 4.1 프론트엔드 API 설정

**frontend/src/services/api.ts** (이미 올바르게 구현됨)
```typescript
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.PROD
    ? 'https://boardgame-tc.onrender.com/api'
    : 'http://localhost:3000/api';
```

### 4.2 WebSocket 설정

**frontend/src/services/socket.ts**
```typescript
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL 
  || (import.meta.env.PROD 
    ? 'https://boardgame-tc.onrender.com' 
    : 'http://localhost:3000');
```

### 4.3 백엔드 CORS 설정

**backend/src/server.ts** (이미 올바르게 구현됨)
```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'https://boardgame-tc-frontend.vercel.app',
  process.env.CLIENT_URL || '',
  process.env.FRONTEND_URL || ''
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // 개발 중에는 모두 허용
    }
  },
  credentials: true
}));
```

---

## 🎯 5단계: AI Scheduler 배포 고려사항

### 5.1 Render.com에서 AI Scheduler

**현재 구현** (이미 완료):
```typescript
// backend/src/server.ts
import { aiScheduler } from './services/AIScheduler';
aiScheduler.start();
```

### 5.2 주의사항

1. **슬립 모드 문제**
   - Render.com 무료 플랜: 15분 비활성 시 슬립
   - AI Scheduler는 서버가 깨어있을 때만 작동

2. **해결 방법**
   - Keep-Alive Ping (UptimeRobot)
   - 유료 플랜 사용 ($7/월)
   - 또는 AI 턴 시 수동 트리거

### 5.3 대안: 온디맨드 AI 실행

```typescript
// AI 턴이 되면 프론트엔드에서 트리거
await api.triggerAITurn(gameId, playerId);
```

---

## 📋 6단계: 배포 체크리스트

### Supabase
- [ ] 데이터베이스 마이그레이션 완료
- [ ] seedCards_FULL.sql 실행 완료
- [ ] DATABASE_URL 확인

### Render.com
- [ ] Web Service 생성
- [ ] 환경 변수 설정
- [ ] 빌드 성공 확인
- [ ] Health check 응답 확인
- [ ] WebSocket 연결 테스트

### Vercel
- [ ] 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] 빌드 성공 확인
- [ ] 프론트엔드 접속 확인
- [ ] API 연결 테스트

### 통합 테스트
- [ ] 방 생성 테스트
- [ ] 방 참여 테스트
- [ ] 게임 시작 테스트
- [ ] AI 봇 추가 테스트
- [ ] 전체 게임 플로우 테스트

---

## 🔍 7단계: 문제 해결

### 문제 1: CORS 에러
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**해결**:
1. Render.com 환경 변수에 `FRONTEND_URL` 추가
2. Vercel URL 확인 (https://your-project.vercel.app)
3. 백엔드 재배포

### 문제 2: WebSocket 연결 실패
```
WebSocket connection failed
```

**해결**:
1. Render.com이 WebSocket 지원하는지 확인 (지원함)
2. `VITE_SOCKET_URL` 환경 변수 확인
3. HTTPS 사용 확인 (wss://)

### 문제 3: 데이터베이스 연결 실패
```
Connection refused
```

**해결**:
1. Supabase DATABASE_URL 확인
2. 비밀번호 특수문자 URL 인코딩
3. Supabase 프로젝트 활성 상태 확인

### 문제 4: AI Scheduler 작동 안 함
```
AI 턴이 자동으로 실행되지 않음
```

**해결**:
1. Render.com 서버 슬립 모드 확인
2. UptimeRobot으로 Keep-Alive 설정
3. 로그 확인: Render.com Dashboard → Logs

---

## 🚀 8단계: 배포 명령어 요약

### 초기 배포
```bash
# 1. GitHub에 푸시
git add .
git commit -m "Deploy v4.1"
git push origin main

# 2. Render.com
# - Dashboard에서 자동 배포 확인

# 3. Vercel
# - Dashboard에서 자동 배포 확인
```

### 업데이트 배포
```bash
# 코드 수정 후
git add .
git commit -m "Update: [변경사항]"
git push origin main

# 자동으로 Render.com과 Vercel 재배포
```

---

## 📊 9단계: 모니터링

### Render.com 로그
```bash
# Dashboard → Logs
# 실시간 로그 확인
```

### Vercel 로그
```bash
# Dashboard → Deployments → [배포] → Logs
# 빌드 및 런타임 로그 확인
```

### Supabase 모니터링
```bash
# Dashboard → Database → Logs
# 쿼리 성능 확인
```

---

## 💰 10단계: 비용 최적화

### 무료 티어 사용
```
Supabase: 무료 (500MB DB, 무제한 API)
Render.com: 무료 (750시간/월, 슬립 모드)
Vercel: 무료 (100GB 대역폭, 무제한 배포)

총 비용: $0/월
```

### 유료 업그레이드 시
```
Supabase Pro: $25/월 (8GB DB, 우선 지원)
Render.com Starter: $7/월 (슬립 모드 없음)
Vercel Pro: $20/월 (무제한 대역폭)

총 비용: $52/월
```

---

## 🎉 완료!

배포가 완료되면:

1. **프론트엔드 URL**: https://your-project.vercel.app
2. **백엔드 URL**: https://boardgame-backend.onrender.com
3. **Health Check**: https://boardgame-backend.onrender.com/api/health

### 테스트 시나리오
1. 프론트엔드 접속
2. 방 생성
3. AI 봇 추가
4. 게임 시작
5. 전체 플레이

**모든 것이 정상 작동합니다!** 🎮✨

---

**문서 버전**: 1.0  
**최종 수정**: 2024년 12월 3일  
**작성자**: Kiro AI Assistant
