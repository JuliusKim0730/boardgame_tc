# 열네 밤의 꿈 웹 보드게임

14일 동안 여행 준비를 하며 가장 높은 행복 점수를 목표로 하는 실시간 웹 보드게임

## ⚠️ 로컬 실행 시 주의사항

**문제가 발생하면 다음 문서를 확인하세요:**
- 📘 `LOCAL_ISSUE_FIX_GUIDE.md` - 로컬 실행 이슈 해결
- 🚀 `QUICK_START_UPDATED.md` - 최신 시작 가이드
- 🔍 `node check-local-setup.js` - 환경 설정 진단

**주요 수정사항 (2024-12-03)**:
- ✅ localStorage 접근 에러 해결
- ✅ Socket 연결 timeout 해결 (포트 4000으로 통일)
- ✅ API 400 에러 처리 개선

## 프로젝트 구조

```
/
├── backend/          # Node.js + Express + TypeScript 서버
├── frontend/         # React + TypeScript 클라이언트 (추후 구현)
├── shared/           # 공통 타입 정의
├── docs/             # 프로젝트 문서
├── workflows/        # 워크플로우 상세 문서
└── rulebook/         # 게임 룰북
```

## 기술 스택

- **Backend**: Node.js 20, Express, TypeScript, Socket.io
- **Database**: PostgreSQL
- **WebSocket**: Socket.io (실시간 동기화)
- **Frontend**: React, TypeScript (예정)

## 시작하기

### 1. 데이터베이스 설정 (Supabase - 무료)

**5분 안에 완료!** 상세 가이드: `SUPABASE_QUICK_START.md`

1. **https://supabase.com** 가입
2. 새 프로젝트 생성 (이름: `boardgame-01`, 리전: Seoul)
3. SQL Editor에서 스키마 실행 (`backend/src/db/schema.sql`)
4. 카드 데이터 시드 (`backend/src/db/seedCards.sql`)
5. 연결 정보를 `backend/.env`에 입력

```env
DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.xxxxx
DB_PASSWORD=your-password
```

**또는 로컬 PostgreSQL 사용:**
```bash
createdb boardgame
psql -d boardgame -f backend/src/db/schema.sql
psql -d boardgame -f backend/src/db/seedCards.sql
```

### 2. 백엔드 실행

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

서버가 http://localhost:4000 에서 실행됩니다.

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

클라이언트가 http://localhost:3000 에서 실행됩니다.

## API 엔드포인트

### REST API

**방 관리**
- `POST /api/rooms` - 방 생성
- `POST /api/rooms/:code/join` - 방 참여
- `GET /api/rooms/:roomId` - 방 상태 조회
- `POST /api/rooms/:roomId/start` - 게임 시작
- `POST /api/rooms/:roomId/soft-reset` - 소프트 리셋

**게임 플레이**
- `POST /api/games/:gameId/move` - 이동
- `POST /api/games/:gameId/action` - 행동 (1~6번)
- `POST /api/games/:gameId/end-turn` - 턴 종료
- `POST /api/games/:gameId/chance/:cardCode` - 찬스 카드 실행
- `POST /api/games/:gameId/chance-response` - 찬스 상호작용 응답
- `POST /api/games/:gameId/contribute` - 공동 계획 기여
- `GET /api/games/:gameId/joint-plan` - 공동 계획 현황 조회

**게임 종료**
- `POST /api/games/:gameId/final-purchase` - 최종 구매
- `POST /api/games/:gameId/finalize` - 최종 정산
- `POST /api/games/:gameId/result-closed` - 결과 창 닫기

### WebSocket 이벤트

- `join-room` - 방 참여
- `leave-room` - 방 나가기
- `turn-started` - 턴 시작 알림
- `state-updated` - 게임 상태 업데이트
- `chance-request` - 찬스 카드 상호작용 요청
- `chance-resolved` - 찬스 카드 응답

## 워크플로우

1. **로비/방 관리** (`workflows/1.00_로비_방관리.md`)
2. **게임 세팅/초기화** (`workflows/2.00_게임세팅_초기화.md`)
3. **턴 루프/카드 행동** (`workflows/3.00_턴루프_카드행동.md`)
4. **최종 정산/리플레이** (`workflows/4.00_최종정산_리플레이.md`)
5. **동시성/예외/복구** (`workflows/5.00_동시성_예외복구.md`)

## 개발 상태

**백엔드 (95%)**
- [x] 프로젝트 구조 설정
- [x] 데이터베이스 스키마
- [x] 방 생성/참여 API
- [x] 게임 초기화 로직
- [x] 턴 이동/행동 기본 구조
- [x] WebSocket 실시간 동기화
- [x] Turn Lock & 턴 관리 시스템
- [x] 찬스 카드 상호작용 구현 (CH8-CH13)
- [x] 공동 계획 기여 시스템
- [x] 최종 정산 로직
- [x] 소프트 리셋 기능
- [x] 전체 카드 데이터 시드 (107장)
- [ ] AFK/접속 끊김 처리 (선택사항)

**프론트엔드 (95%)**
- [x] 로비 화면 (방 생성/참여)
- [x] 대기실 (플레이어 목록, 방장 시작) ⭐
- [x] 게임 보드 UI
- [x] 플레이어 정보 패널
- [x] 손패 카드 UI
- [x] 행동 버튼
- [x] WebSocket 연동
- [x] 찬스 카드 상호작용 모달 ⭐
- [x] 결과 화면 (순위, 점수 세부) ⭐
- [x] 공동 계획 기여 모달 ⭐

**테스트 (0%)**
- [ ] 단위 테스트 (선택사항)
- [ ] 통합 테스트 (선택사항)
- [ ] E2E 테스트 (선택사항)
