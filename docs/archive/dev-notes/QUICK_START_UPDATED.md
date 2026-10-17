# 🚀 빠른 시작 가이드 (업데이트)

## ⚠️ 중요 공지

**로컬 실행 시 이슈가 발생하면 `LOCAL_ISSUE_FIX_GUIDE.md`를 먼저 확인하세요!**

주요 수정사항:
- ✅ localStorage 접근 에러 해결
- ✅ Socket 연결 timeout 해결 (포트 수정)
- ✅ API 400 에러 처리 개선

---

## ✅ 사전 준비

1. **Node.js 20** 이상 설치
2. **Supabase 계정** (또는 로컬 PostgreSQL)
3. **Git** (선택사항)

---

## 📦 1단계: 데이터베이스 설정

### Supabase 사용 (권장)

1. Supabase 프로젝트 생성
2. SQL Editor에서 `backend/src/db/migration_v4.1.sql` 실행
3. Connection Pooler 정보 확인 (IPv4 지원)

### 로컬 PostgreSQL 사용

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE boardgame;

# 스키마 생성
psql -U postgres -d boardgame -f backend/src/db/migration_v4.1.sql
```

---

## 🔧 2단계: 백엔드 설정 및 실행

### 패키지 설치
```bash
cd backend
npm install
```

### 환경 변수 설정

`backend/.env` 파일 확인/수정:

```env
PORT=4000

# Supabase Connection Pooler (IPv4)
DB_HOST=aws-1-ap-southeast-2.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xskaefoqkbwnhrpyptkl
DB_PASSWORD=your-password

CLIENT_URL=http://localhost:5173
```

**중요**: 포트는 반드시 **4000**이어야 합니다!

### 서버 실행
```bash
npm run dev
```

**확인사항**:
```
🚀 Server running on port 4000
📡 WebSocket ready
🤖 AI Scheduler started
🌐 Environment: development
```

---

## 🎨 3단계: 프론트엔드 설정 및 실행

**새 터미널을 열어주세요!**

### 패키지 설치
```bash
cd frontend
npm install
```

### 환경 변수 확인

`frontend/.env.development` 파일 확인:

```env
# 로컬 개발 환경
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

**중요**: 포트가 **4000**으로 설정되어 있어야 합니다!

### 개발 서버 실행
```bash
npm run dev
```

**확인사항**:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 🎮 4단계: 게임 플레이

### 브라우저에서 접속

```
http://localhost:5173
```

**브라우저 콘솔 확인** (F12):
```
API_BASE: http://localhost:4000/api
SOCKET_URL: http://localhost:4000
Environment: development
```

### 게임 시작

1. **방 만들기** 클릭
2. 닉네임 입력 후 방 생성
3. 슬롯에 플레이어 추가 (또는 AI 추가)
4. **게임 시작** 버튼 클릭

### 게임 진행

1. 게임 보드에서 인접한 칸 클릭하여 이동
2. 행동 버튼 (1~6번) 클릭하여 행동 수행
3. 턴이 자동으로 다음 플레이어에게 넘어감
4. 14일차까지 반복

---

## 🔍 문제 해결

### 1. Socket 연결 실패 (timeout)

**증상**:
```
Connection error: Error: timeout
```

**해결**:
1. 백엔드가 4000 포트에서 실행 중인지 확인
2. `frontend/.env.development` 파일 확인
   ```env
   VITE_API_URL=http://localhost:4000
   VITE_SOCKET_URL=http://localhost:4000
   ```
3. 프론트엔드 재시작 (Ctrl+C 후 `npm run dev`)

### 2. API 400 에러

**증상**:
```
GET /api/games/{id}/state 400 (Bad Request)
```

**해결**:
1. 브라우저 Network 탭에서 Response 확인
2. 백엔드 콘솔에서 에러 로그 확인
3. 게임 ID가 유효한지 확인

### 3. localStorage 에러

**증상**:
```
Access to storage is not allowed from this context
```

**해결**:
1. 시크릿 모드가 아닌 일반 브라우저 창 사용
2. 브라우저 쿠키/스토리지 설정 확인
3. 이미 수정된 코드에서는 자동으로 처리됨

### 4. CORS 에러

**증상**:
```
Access to XMLHttpRequest blocked by CORS policy
```

**해결**:
1. 백엔드 재시작
2. 백엔드 콘솔에서 CORS 설정 확인
3. 프론트엔드 URL이 허용 목록에 있는지 확인

### 5. 포트 충돌

**Windows**:
```bash
# 4000번 포트 확인
netstat -ano | findstr :4000

# 프로세스 종료 (PID 확인 후)
taskkill /PID <PID> /F
```

**Mac/Linux**:
```bash
# 4000번 포트 확인
lsof -i :4000

# 프로세스 종료
kill -9 <PID>
```

---

## 📊 헬스체크

### 백엔드 상태 확인
```bash
curl http://localhost:4000/api/health
```

**응답**:
```json
{
  "status": "ok",
  "version": "4.1.0",
  "timestamp": "2024-12-03T..."
}
```

### Socket 연결 확인

브라우저 개발자 도구 → Network → WS 필터
- `ws://localhost:4000/socket.io/...` 연결 확인
- Status: 101 Switching Protocols

---

## 🎯 다음 단계

### 멀티플레이 테스트

1. 브라우저 2개 탭 열기
2. 첫 번째 탭: 방 만들기
3. 두 번째 탭: 방 참여하기 (방 코드 입력)
4. 첫 번째 탭에서 게임 시작

### AI 플레이어 테스트

1. 방 생성 후 슬롯에서 "AI 추가" 클릭
2. AI 플레이어가 자동으로 턴 진행
3. 2~4명 구성 가능 (사람 + AI 혼합)

---

## 🐛 디버깅 팁

### 백엔드 로그 확인
- 모든 API 요청/응답 로그 출력
- WebSocket 연결/해제 로그 확인
- CORS 차단 경고 확인

### 프론트엔드 개발자 도구
- **Console**: 에러 메시지, API/Socket URL 확인
- **Network**: 
  - XHR: API 요청/응답 확인
  - WS: WebSocket 연결 상태 확인
- **Application**: Storage 상태 확인

### 데이터베이스 직접 확인

Supabase SQL Editor 또는:
```bash
psql -U postgres -d boardgame

# 방 목록
SELECT * FROM rooms;

# 게임 목록
SELECT * FROM games;

# 플레이어 상태
SELECT * FROM player_states;
```

---

## 🌐 배포 환경

### Vercel (프론트엔드)

환경 변수:
```
VITE_API_URL=https://boardgame-tc.onrender.com
VITE_SOCKET_URL=https://boardgame-tc.onrender.com
```

### Render.com (백엔드)

환경 변수:
```
PORT=10000
DB_HOST=aws-1-ap-southeast-2.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xskaefoqkbwnhrpyptkl
DB_PASSWORD=your-password
CLIENT_URL=https://your-vercel-app.vercel.app
```

---

## 📝 주요 변경사항

### 수정된 파일

1. ✅ `frontend/src/utils/storage.ts` - 새로 생성
   - 안전한 localStorage wrapper

2. ✅ `frontend/.env.development` - 포트 수정
   - 3000 → 4000

3. ✅ `frontend/src/services/socket.ts` - 연결 개선
   - timeout 20초로 증가
   - 재연결 시도 10회로 증가
   - 상세한 에러 로깅

4. ✅ `frontend/src/services/api.ts` - 에러 처리 강화
   - Axios 인터셉터 추가
   - 상세한 에러 로깅

5. ✅ `backend/src/server.ts` - CORS 개선
   - localhost 자동 허용
   - 상세한 로깅

---

## 🎉 성공!

모든 단계가 완료되면 게임을 플레이할 수 있습니다!

**여전히 문제가 있다면**:
1. `LOCAL_ISSUE_FIX_GUIDE.md` 참고
2. 백엔드 콘솔 로그 확인
3. 브라우저 개발자 도구 확인
4. 캐시 삭제 후 재시도

즐거운 게임 되세요! 🌙✨
