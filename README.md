# 🌙 열네 밤의 꿈 — 실시간 웹 보드게임

> 여름 방학 14일 동안 꿈꾸던 가족 여행을 준비하며 **가장 높은 '행복 점수'** 를 노리는 2~5인 전략 보드게임.
> 팀 에보개의 보드게임 룰북 v4.1을 실시간 멀티플레이 웹 게임 + AI 플레이어로 구현했습니다.

| 항목 | 내용 |
| --- | --- |
| 플레이 | https://boardgame-tc-frontend.vercel.app (방 만들기 → 슬롯에 🤖 AI 추가 → 시작) |
| 인원 | 2~5인 (사람 + AI 자유 조합, 혼자서도 AI와 대전 가능) |
| 스택 | React 18 + TypeScript + Vite / Node.js + Express + Socket.IO / PostgreSQL(Supabase) |
| 배포 | Frontend: Vercel · Backend: Render · DB: Supabase |

---

## 게임 한눈에 보기

1. 각자 **여행지 카드**(예: 제주 = 자연×3, 맛×2, 물놀이×1)를 받고 3,000TC로 시작합니다.
2. 매일(14라운드) **이동 → 행동**: 6칸짜리 보드에서 인접 칸으로 이동해 그 칸의 행동을 합니다.
   `1 무료 계획` `2 조사하기(계획 카드)` `3 집안일(TC)` `4 여행 지원(TC±)` `5 찬스` `6 자유 행동`
3. 14일 뒤 **최종 결산**: 모은 계획 카드를 TC로 구매하고, 공동 목표에 비공개로 기여합니다.
4. **최종 행복 점수 = Σ(특성 × 여행지 가중치) + 추억 + 공동 목표 보너스**, 동점이면 추억 → 남은 TC 순.

규칙 원문: [`rulebook/game_rule_v4.1.md`](rulebook/game_rule_v4.1.md) · 카드 목록: [`rulebook/game_card_v4.1.md`](rulebook/game_card_v4.1.md)

---

## 아키텍처

```
frontend (Vercel)                     backend (Render)                          Supabase
┌──────────────────────┐  REST   ┌──────────────────────────────────────┐   ┌──────────────┐
│ React + Vite         │ ──────▶ │ routes/  gameRoutes, roomRoutes      │   │ PostgreSQL   │
│  GameScreen          │         │ services/                            │──▶│ games, turns │
│  FinalPurchaseModal  │ ◀────── │  TurnService   이동·행동·추가행동 검증 │   │ actions,     │
│  ResultScreen        │ Socket  │  TurnManager   턴/일차 전환, 턴 락    │   │ decks, hands │
│  utils/scoring.ts    │  .IO    │  ChanceService 찬스 카드 25종        │   │ event_logs … │
└──────────────────────┘         │  DeckService   드로우·덱 재충전       │   └──────────────┘
                                 │  GameFinalizationService 최종 결산   │
                                 │  AIPlayerService / AIScheduler (NPC) │
                                 │ game/rules.ts  ← 순수 규칙 함수 + 테스트│
                                 └──────────────────────────────────────┘
```

**설계 포인트**

- **서버 권위(Server-authoritative) 턴 규칙**: 이번 턴의 이동/주 행동/추가 행동 권한을 `actions` 테이블에 기록하고
  매 요청마다 다시 읽어 검증합니다. 클라이언트가 조작해도 "이동 없이 행동", "같은 칸 반복", "행동 없이 턴 종료"가 불가능하고,
  새로고침해도 턴 진행 상태가 그대로 복원됩니다.
- **규칙 로직 분리**: 점수 계산·동률 순위·이동 제한·결심 토큰 회복·배낭 최적화를 `backend/src/game/rules.ts`의
  순수 함수로 분리하고 단위 테스트로 고정했습니다 (`npm test`).
- **사람과 AI가 같은 코드 경로**: AI도 `TurnService`의 같은 API로 이동·행동하므로 AI용 예외 규칙이 없습니다.
- **트랜잭션 + 행 잠금**: 덱 드로우는 `SELECT … FOR UPDATE`로 직렬화하고, 최종 점수 확정은
  `UPDATE … WHERE status='finalizing'` 한 번만 성공하도록 해 중복 계산을 막았습니다.
- **재시작 복구**: Render 무료 플랜처럼 서버가 잠들었다 깨어나도 진행 중 게임의 턴 락과 멈춘 AI 턴을 DB에서 복원합니다.

---

## NPC(AI) 전략

`backend/src/services/AIPlayerService.ts` — 행동마다 **기대 점수**를 계산해 가장 좋은 칸으로 이동합니다.

| 요소 | 방식 |
| --- | --- |
| 카드 가치 | 효과 × **내 여행지 가중치** (+추억) |
| TC의 가치 λ | 예산이 모자라 못 사는 손패 카드의 `점수/TC` 효율. 돈이 부족하면 집안일·지원, 넉넉하면 계획 수집 쪽으로 기울어짐 |
| 덱 기대값 | 남은 덱 카드 구성으로 평균 효과 계산 (카드 카운팅) |
| 이동 | 이번 칸 가치 + 0.35 × 다음 턴 최선의 칸 가치 (1수 앞 탐색) |
| 결심 토큰 | 1~6일차엔 아껴 7일차 회복(+1)을 받고, 이후 가치가 큰 턴에 사용 |
| 찬스 대상 | 함께 이득 보는 카드는 최하위 상대와, 교환/구매는 내 점수 이득이 최대인 카드 |
| 최종 구매 | 0/1 배낭 DP로 예산 내 최대 점수 조합, 남는 TC는 공동 목표에 기여 (3인 이상은 최소 기여 패널티 회피) |

시뮬레이터로 18판(2·3·4인 각 6판)을 돌린 결과, AI가 **16판에서 1위**, 평균 22~32점 (무작위 플레이어 13~16점).

---

## 로컬 실행

필요: Node.js 20+, PostgreSQL 14+ (또는 Supabase 프로젝트)

```bash
# 1) DB 생성 + 스키마/카드 데이터 적용
createdb boardgame
cd backend && npm install
PGDATABASE=boardgame npm run db:init          # 또는 DATABASE_URL=postgres://... npm run db:init

# 2) 백엔드 (http://localhost:4000)
cp .env.example .env                          # DB_HOST/DB_NAME/DB_USER/DB_PASSWORD 수정
npm run dev

# 3) 프런트엔드 (http://localhost:3000)
cd ../frontend && npm install && npm run dev
```

브라우저 탭을 여러 개 열면 탭마다 다른 플레이어로 참가할 수 있습니다 (세션은 탭별 저장).

### 테스트

```bash
cd backend
npm test                       # 규칙 단위 테스트 (점수/동률/이동/토큰/변환/배낭)
npm run simulate -- 4          # 서버 실행 중: 무작위 플레이어 1 + AI 3이 14일을 끝까지 플레이
```

---

## 배포

| 대상 | 설정 |
| --- | --- |
| Vercel (`frontend/`) | Build `npm run build`, Output `dist`, 환경변수 `VITE_API_URL`, `VITE_SOCKET_URL` = Render 주소 |
| Render (`backend/`) | Build `npm install && npm run build`, Start `npm start`, 환경변수 `DB_*`, `CLIENT_URL` |
| Supabase | `backend/scripts/init-db.sh`로 스키마·카드 적용 (서버 시작 시 누락 컬럼은 자동 보정) |

Render 무료 플랜은 15분 동안 요청이 없으면 잠들어 첫 접속에 30초~1분이 걸립니다. 시연 전에 `/api/health`를 한 번 열어 두세요.
Supabase 무료 프로젝트는 일정 기간 사용하지 않으면 일시 정지되므로 대시보드에서 상태를 확인하세요.

---

## 폴더 구조

```
backend/
  src/game/rules.ts          순수 규칙 함수 (+ rules.test.ts)
  src/services/              턴·찬스·덱·결산·AI 서비스
  src/routes/                REST API
  src/db/                    스키마, 마이그레이션, 카드 시드, ensureSchema
  scripts/                   init-db.sh, simulate-game.mjs
frontend/
  src/components/            GameScreen, FinalPurchaseModal, ResultScreen, 각종 모달
  src/utils/scoring.ts       점수 미리보기·최적 구매 추천
rulebook/                    룰북 v4.1, 카드 리스트
docs/                        PRD, ERD, QA 리포트, 과거 작업 노트(archive)
```

자세한 점검·수정 내역은 [`docs/QA_REPORT.md`](docs/QA_REPORT.md)를 참고하세요.
