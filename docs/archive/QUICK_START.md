# 🚀 빠른 시작 가이드

## ✅ 사전 준비

1. **Node.js 20** 이상 설치
2. **PostgreSQL** 설치 및 실행
3. **Git** (선택사항)

---

## 📦 1단계: 데이터베이스 설정

### PostgreSQL 데이터베이스 생성
```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE boardgame;

# 종료
\q
```

### 스키마 및 데이터 시드
```bash
# 스키마 생성
psql -U postgres -d boardgame -f backend/src/db/schema.sql

# 카드 데이터 시드 (107장)
psql -U postgres -d boardgame -f backend/src/db/seedCards.sql
```

---

## 🔧 2단계: 백엔드 설정 및 실행

### 패키지 설치
```bash
cd backend
npm install
```

### 환경 변수 설정
```bash
# .env 파일 생성
copy .env.example .env

# .env 파일 내용 (필요시 수정)
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=boardgame
DB_USER=postgres
DB_PASSWORD=postgres
CLIENT_URL=http://localhost:3000
```

### 서버 실행
```bash
npm run dev
```

✅ 서버가 http://localhost:4000 에서 실행됩니다.

---

## 🎨 3단계: 프론트엔드 설정 및 실행

**새 터미널을 열어주세요!**

### 패키지 설치
```bash
cd frontend
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

✅ 클라이언트가 http://localhost:3000 에서 실행됩니다.

---

## 🎮 4단계: 게임 플레이

### 브라우저에서 접속
1. http://localhost:3000 접속
2. **방 만들기** 클릭
3. 닉네임 입력 후 방 생성
4. 방 코드를 친구에게 공유 (또는 다른 브라우저 탭에서 참여)

### 게임 진행
1. 방장이 **시작하기** 버튼 클릭
2. 게임 보드에서 인접한 칸 클릭하여 이동
3. 행동 버튼 (1~6번) 클릭하여 행동 수행
4. 턴이 자동으로 다음 플레이어에게 넘어감
5. 14일차까지 반복

---

## 🔍 문제 해결

### 백엔드가 시작되지 않는 경우

**PostgreSQL 연결 오류**
```bash
# PostgreSQL 서비스 확인
# Windows: 서비스 관리자에서 PostgreSQL 확인
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# 데이터베이스 존재 확인
psql -U postgres -l
```

**포트 충돌**
```bash
# 4000번 포트 사용 중인 프로세스 확인
# Windows
netstat -ano | findstr :4000

# Mac/Linux
lsof -i :4000
```

### 프론트엔드가 시작되지 않는 경우

**포트 충돌**
```bash
# 3000번 포트 사용 중인 프로세스 확인
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```

**API 연결 오류**
- 백엔드가 먼저 실행되어 있는지 확인
- http://localhost:4000/health 접속하여 서버 상태 확인

### 컴파일 에러

**백엔드 타입 에러**
```bash
cd backend
npx tsc --noEmit
```

**프론트엔드 타입 에러**
```bash
cd frontend
npx tsc --noEmit
```

---

## 📊 헬스체크

### 백엔드 상태 확인
```bash
curl http://localhost:4000/health
# 응답: {"status":"ok"}
```

### 데이터베이스 연결 확인
```bash
psql -U postgres -d boardgame -c "SELECT COUNT(*) FROM cards;"
# 응답: 107 (카드 개수)
```

---

## 🎯 다음 단계

### 멀티플레이 테스트
1. 브라우저 2개 탭 열기
2. 첫 번째 탭: 방 만들기
3. 두 번째 탭: 방 참여하기 (방 코드 입력)
4. 첫 번째 탭에서 게임 시작

### 개발 모드
- 백엔드: 파일 수정 시 자동 재시작 (ts-node-dev)
- 프론트엔드: 파일 수정 시 자동 새로고침 (Vite HMR)

---

## 📝 주요 API 엔드포인트

### 테스트용 cURL 명령어

**방 생성**
```bash
curl -X POST http://localhost:4000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"nickname":"테스터"}'
```

**방 상태 조회**
```bash
curl http://localhost:4000/api/rooms/{roomId}
```

**게임 시작**
```bash
curl -X POST http://localhost:4000/api/rooms/{roomId}/start
```

---

## 🐛 디버깅 팁

### 백엔드 로그 확인
- 콘솔에 모든 요청/응답 로그 출력
- WebSocket 연결/해제 로그 확인

### 프론트엔드 개발자 도구
- F12 → Console 탭: 에러 메시지 확인
- Network 탭: API 요청/응답 확인
- WebSocket 프레임 확인

### 데이터베이스 직접 확인
```bash
psql -U postgres -d boardgame

# 방 목록
SELECT * FROM rooms;

# 게임 목록
SELECT * FROM games;

# 플레이어 상태
SELECT * FROM player_states;

# 카드 목록
SELECT * FROM cards LIMIT 10;
```

---

## 🎉 성공!

모든 단계가 완료되면 게임을 플레이할 수 있습니다!

문제가 발생하면:
1. 백엔드 콘솔 로그 확인
2. 프론트엔드 브라우저 콘솔 확인
3. 데이터베이스 연결 상태 확인
4. 포트 충돌 확인

즐거운 게임 되세요! 🌙✨
