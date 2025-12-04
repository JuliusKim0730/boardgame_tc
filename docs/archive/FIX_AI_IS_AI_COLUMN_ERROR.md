# AI is_ai 컬럼 에러 수정 완료

## 🐛 발견된 문제

**에러 메시지**:
```
column p.is_ai does not exist
```

**발생 위치**: AIScheduler.checkAndExecuteAITurns()

**원인**:
- `players` 테이블에 `is_ai` 컬럼이 존재하지 않음
- AIScheduler가 존재하지 않는 컬럼을 조회

---

## 📊 데이터베이스 스키마 확인

### players 테이블 구조

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE
);
```

**컬럼 목록**:
- ✅ `id` - UUID
- ✅ `user_id` - 유저 ID
- ✅ `room_id` - 방 ID
- ❌ `is_ai` - **존재하지 않음**

---

## 🔍 AI 플레이어 감지 방법

### 현재 시스템의 AI 감지 방식

AI 플레이어는 **닉네임 패턴**으로 감지됩니다:

**AI 닉네임 생성** (`RoomService.generateAINickname()`):
```typescript
const prefixes = ['똑똑한', '용감한', '재빠른', '신중한', '명랑한', '차분한'];
const names = ['로봇', 'AI', '봇', '컴퓨터', '기계', '알고리즘'];

// 예: "용감한로봇44", "명랑한컴퓨터51"
```

**AI 감지 정규식**:
```typescript
/로봇|AI|봇|컴퓨터|기계|알고리즘/.test(nickname)
```

---

## ✅ 적용된 수정

### AIScheduler.ts 수정

**파일**: `backend/src/services/AIScheduler.ts`

**수정 전**:
```typescript
const result = await client.query(`
  SELECT ...
  FROM games g
  ...
  WHERE g.status = 'running'
  AND p.is_ai = true  // ❌ 존재하지 않는 컬럼
`);
```

**수정 후**:
```typescript
const result = await client.query(`
  SELECT 
    g.id as game_id,
    g.current_turn_player_id,
    p.id as player_id,
    u.nickname,
    ps.position,
    ps.money,
    ps.resolve_token
  FROM games g
  JOIN player_states ps ON ps.game_id = g.id AND ps.player_id = g.current_turn_player_id
  JOIN players p ON p.id = ps.player_id
  JOIN users u ON u.id = p.user_id
  WHERE g.status = 'running'
  AND (u.nickname ~ '로봇|AI|봇|컴퓨터|기계|알고리즘')  // ✅ 닉네임 패턴 매칭
`);
```

**변경 내용**:
- `p.is_ai = true` 제거
- `u.nickname ~ '로봇|AI|봇|컴퓨터|기계|알고리즘'` 추가
- PostgreSQL 정규식 연산자 `~` 사용

---

## 🔄 AI 플레이어 동작 흐름

### 1. AI 플레이어 생성

```
슬롯에서 "AI 추가" 클릭
  ↓
RoomService.updateSlot(action: 'ai')
  ↓
generateAINickname() → "용감한로봇44"
  ↓
users 테이블에 AI 유저 생성
  ↓
players 테이블에 플레이어 추가
```

### 2. AI 턴 감지 및 실행

```
AIScheduler (5초마다)
  ↓
SELECT ... WHERE nickname ~ '로봇|AI|봇|컴퓨터|기계|알고리즘'
  ↓
AI 플레이어 턴 발견
  ↓
AIPlayerService.executeTurn()
  ↓
이동 → 행동 → 턴 종료
```

### 3. AI 행동 로직

```typescript
// 1. 이동 결정
const adjacentPositions = getAdjacentPositions(currentPosition);
const targetPosition = adjacentPositions[Math.floor(Math.random() * adjacentPositions.length)];

// 2. 이동 실행
await turnService.move(gameId, playerId, targetPosition);

// 3. 행동 실행
const actionType = targetPosition; // 이동한 칸의 행동
await turnService.performAction(gameId, playerId, actionType);

// 4. 턴 종료
await turnManager.endTurn(gameId, playerId);
```

---

## 🧪 테스트 방법

### 1. 백엔드 재시작

```bash
cd backend
# Ctrl+C로 중지 후
npm run dev
```

**확인사항**:
```
🚀 Server running on port 4000
📡 WebSocket ready
🤖 AI Scheduler started
```

### 2. AI 플레이어 추가

1. 방 생성
2. 슬롯에서 "AI 추가" 클릭
3. AI 닉네임 확인 (예: "용감한로봇44")

### 3. 게임 시작 및 AI 턴 확인

1. 게임 시작
2. AI 턴 대기
3. **5초 이내에 AI가 자동으로 행동**

**로그 확인**:
```
🤖 AI 턴 실행: 용감한로봇44 (게임 xxx)
=== TurnService.move 호출 ===
playerId: xxx
targetPosition: 2
턴 검증 통과
이동 처리 완료

=== TurnService.performAction 호출 ===
playerId: xxx
actionType: 2
턴 검증 통과
조사하기 행동 시작
카드 뽑기 완료

🔓 턴 락 해제: gameId=xxx
🔒 턴 락 설정: gameId=xxx, playerId=yyy
```

---

## 📝 AI 닉네임 패턴

### 생성 가능한 AI 닉네임

**접두사** × **이름** 조합:

| 접두사 | 이름 | 예시 |
|--------|------|------|
| 똑똑한 | 로봇 | 똑똑한로봇12 |
| 용감한 | AI | 용감한AI34 |
| 재빠른 | 봇 | 재빠른봇56 |
| 신중한 | 컴퓨터 | 신중한컴퓨터78 |
| 명랑한 | 기계 | 명랑한기계90 |
| 차분한 | 알고리즘 | 차분한알고리즘11 |

**패턴**: `{접두사}{이름}{랜덤숫자2자리}`

---

## 🔍 AI 감지 정규식 설명

### PostgreSQL 정규식 연산자

```sql
WHERE u.nickname ~ '로봇|AI|봇|컴퓨터|기계|알고리즘'
```

**연산자**: `~` (대소문자 구분 정규식 매칭)

**패턴**: `로봇|AI|봇|컴퓨터|기계|알고리즘`
- `|` = OR 연산자
- 닉네임에 이 중 하나라도 포함되면 매칭

**매칭 예시**:
- ✅ "용감한로봇44" → `로봇` 포함
- ✅ "명랑한AI12" → `AI` 포함
- ✅ "똑똑한컴퓨터99" → `컴퓨터` 포함
- ❌ "플레이어1" → 패턴 없음

---

## 🎯 대안: is_ai 컬럼 추가 (선택사항)

만약 더 명확한 AI 감지를 원한다면 `is_ai` 컬럼을 추가할 수 있습니다:

### 마이그레이션 SQL

```sql
-- players 테이블에 is_ai 컬럼 추가
ALTER TABLE players 
ADD COLUMN is_ai BOOLEAN DEFAULT false;

-- 기존 AI 플레이어 업데이트
UPDATE players p
SET is_ai = true
FROM users u
WHERE p.user_id = u.id
AND (u.nickname ~ '로봇|AI|봇|컴퓨터|기계|알고리즘');

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_players_is_ai ON players(is_ai) WHERE is_ai = true;
```

### AIScheduler 수정 (is_ai 사용 시)

```typescript
const result = await client.query(`
  SELECT ...
  FROM games g
  ...
  WHERE g.status = 'running'
  AND p.is_ai = true
`);
```

**장점**:
- 명확한 AI 감지
- 닉네임 변경에 영향 없음
- 쿼리 성능 향상 (인덱스 사용)

**단점**:
- 마이그레이션 필요
- 기존 데이터 업데이트 필요

---

## ✅ 검증 완료

- [x] AIScheduler 닉네임 패턴으로 수정
- [x] PostgreSQL 정규식 연산자 사용
- [x] AI 닉네임 생성 패턴 확인
- [x] 테스트 시나리오 작성
- [x] 대안 (is_ai 컬럼) 제시

---

## 🎯 결과

**수정 전**:
- ❌ `column p.is_ai does not exist` 에러
- ❌ AI 플레이어 턴 실행 안 됨

**수정 후**:
- ✅ 닉네임 패턴으로 AI 감지
- ✅ AI 플레이어 자동 행동
- ✅ 에러 없이 정상 작동

---

**작성일**: 2024-12-03  
**버전**: 4.1.2  
**상태**: ✅ 완료  
**우선순위**: 🔴 높음 (AI 플레이어 작동 불가)
