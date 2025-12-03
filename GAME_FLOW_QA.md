# 게임 플로우 Q&A

## 1) 방을 만들고 AI 봇 참가자 2인을 포함 3인이 플레이할 때, 방 시작 후 첫턴은 누가 가져가지?

### 답변: **방장 (1번 슬롯)**

### 근거:
```typescript
// GameSetupService.ts
const playersResult = await client.query(
  `SELECT p.id, p.user_id, u.nickname, p.created_at
   FROM players p 
   JOIN users u ON p.user_id = u.id
   WHERE p.room_id = $1 
   ORDER BY p.created_at ASC`,  // ← created_at 순서로 조회
  [roomId]
);

// 첫 번째 플레이어 = 선 플레이어 (방장)
const firstPlayer = orderedPlayers[0];

await client.query(
  'UPDATE games SET current_turn_player_id = $1, status = $2 WHERE id = $3',
  [firstPlayer.id, 'running', gameId]  // ← 방장의 player_id
);
```

### 슬롯 순서:
```
슬롯 1: 방장 (created_at이 가장 빠름) → turn_order: 0 → 첫 턴
슬롯 2: AI 봇 1 → turn_order: 1
슬롯 3: AI 봇 2 → turn_order: 2
```

---

## 2) 첫 턴인 사람이 행동할 수 있는건 뭐지?

### 답변: **① 이동 → ② 행동 선택**

### 근거:
```typescript
// workflow_guide/guide_01.md
턴 진행 순서:
① 이동 (필수) - 인접한 칸으로 이동
② 행동 (필수) - 1~6번 중 선택하여 행동 수행
③ 추가 행동 (선택) - 결심 토큰 사용
```

### 첫 턴 시작 시:
```
- 현재 위치: 1번 칸 (무료 계획)
- 인접한 칸: 2번 칸 (조사하기)
- 할 수 있는 행동:
  1. 2번 칸으로 이동
  2. 이동 후 1~6번 행동 중 선택
```

### 인접 칸 규칙:
```typescript
// GameBoard.tsx
const adjacency: { [key: number]: number[] } = {
  1: [2],           // 1번 → 2번만 이동 가능
  2: [1, 3, 4],     // 2번 → 1, 3, 4번 이동 가능
  3: [2, 5],        // 3번 → 2, 5번 이동 가능
  4: [2, 6],        // 4번 → 2, 6번 이동 가능
  5: [3, 6],        // 5번 → 3, 6번 이동 가능
  6: [4, 5],        // 6번 → 4, 5번 이동 가능
};
```

---

## 3) 행동을 할 때 만약 2번 칸이라면 어떤 행동을 할 수 있지?

### 답변: **1~6번 행동 중 선택 가능 (위치와 무관)**

### 근거:
현재 구현에서는 **이동한 칸과 무관하게** 1~6번 행동을 선택할 수 있습니다.

```typescript
// GameScreen.tsx
{isMyTurn && hasMoved && !hasActed && (
  <div className="action-selection">
    <h3>행동 선택</h3>
    <div className="action-buttons">
      {[1, 2, 3, 4, 5, 6].map((action) => (
        <button onClick={() => handleAction(action)}>
          {action}. {getActionName(action)}
        </button>
      ))}
    </div>
  </div>
)}
```

### 행동 칸 설명:
```
1번: 무료 계획 - 무료 계획 카드 1장 획득
2번: 조사하기 - 일반 계획 카드 1장 획득 (손패)
3번: 집안일 - 1,500~2,000TC 획득
4번: 여행 지원 - TC 변동 (±1,000~4,000TC)
5번: 찬스 - 찬스 카드 1장 획득
6번: 자유 행동 - 1~5번 중 선택
```

### ⚠️ 주의:
원래 게임 규칙에서는 **도착한 칸의 행동을 수행**해야 하지만, 현재 구현에서는 자유롭게 선택 가능합니다.

**올바른 규칙 (guide_01.md):**
```
행동 (② 행동):
- 도착한 칸(player_data.location)의 행동 칸 설명에 따른 효과를 1회 적용합니다.
- 예시 (3번 집안일): draw_card('J_DECK') → 카드 효과 (+1,500/2,000TC) 즉시 적용.
```

---

## 4) 이 때 사용하는 데이터는 뭘 쓰지?

### 답변: **여러 테이블의 데이터를 사용**

### 사용하는 데이터:

#### A. 플레이어 상태 (player_states 테이블)
```sql
SELECT 
  ps.id,              -- player_state_id
  ps.player_id,       -- players.id 참조
  ps.money,           -- 현재 TC
  ps.position,        -- 현재 위치 (1~6)
  ps.resolve_token,   -- 결심 토큰 개수
  ps.traits,          -- 특성 점수 (JSONB)
  ps.turn_order       -- 턴 순서
FROM player_states ps
WHERE ps.game_id = $1 AND ps.player_id = $2;
```

#### B. 게임 상태 (games 테이블)
```sql
SELECT 
  g.id,                        -- game_id
  g.day,                       -- 현재 날짜 (1~14)
  g.current_turn_player_id,   -- 현재 턴 플레이어
  g.status,                    -- 게임 상태
  g.joint_plan_card_id         -- 공동 목표 카드
FROM games g
WHERE g.id = $1;
```

#### C. 카드 덱 (decks 테이블)
```sql
SELECT 
  d.type,          -- 덱 타입 (plan, freeplan, house, support, chance)
  d.card_order     -- 카드 순서 (JSONB 배열)
FROM decks d
WHERE d.game_id = $1 AND d.type = $2;
```

#### D. 손패 (hands 테이블)
```sql
SELECT 
  h.id,
  h.card_id,
  h.seq,
  c.name,
  c.cost,
  c.effects
FROM hands h
JOIN cards c ON h.card_id = c.id
WHERE h.player_state_id = $1
ORDER BY h.seq;
```

#### E. 카드 마스터 데이터 (cards 테이블)
```sql
SELECT 
  c.id,
  c.type,          -- 카드 타입
  c.code,          -- 카드 코드 (F1, T1, J1, ...)
  c.name,          -- 카드 이름
  c.cost,          -- 비용
  c.effects,       -- 효과 (JSONB)
  c.metadata       -- 메타데이터 (JSONB)
FROM cards c
WHERE c.id = $1;
```

### 행동 수행 시 데이터 흐름:
```typescript
// TurnService.performAction()
1. player_states에서 플레이어 상태 조회
2. decks에서 해당 타입 덱 조회
3. card_order에서 첫 번째 카드 ID 추출
4. cards에서 카드 정보 조회
5. 카드 효과 적용:
   - hands에 카드 추가 (plan, freeplan)
   - player_states.money 업데이트 (house, support)
6. event_logs에 행동 기록
```

---

## 5) 턴이 종료되면 다음 턴은 누구지?

### 답변: **turn_order 순서대로 다음 플레이어**

### 근거:
```typescript
// AIPlayerService.endTurn() (TurnManager도 동일)
const playersResult = await client.query(
  `SELECT ps.id, ps.player_id, ps.turn_order 
   FROM player_states ps
   WHERE ps.game_id = $1
   ORDER BY ps.turn_order`,  // ← turn_order 순서로 조회
  [gameId]
);

const players = playersResult.rows;
const currentPlayerIndex = players.findIndex((p: any) => p.player_id === playerId);
const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;  // ← 순환
const nextPlayer = players[nextPlayerIndex];

// 다음 플레이어로 턴 넘김
await client.query(
  'UPDATE games SET current_turn_player_id = $1 WHERE id = $2',
  [nextPlayer.player_id, gameId]
);
```

### 턴 순서 예시:
```
3인 플레이 (방장, AI1, AI2):

Day 1:
1. 방장 (turn_order: 0)
2. AI1 (turn_order: 1)
3. AI2 (turn_order: 2)
→ 모든 플레이어 턴 완료 → Day 2

Day 2:
1. 방장 (turn_order: 0)
2. AI1 (turn_order: 1)
3. AI2 (turn_order: 2)
→ 모든 플레이어 턴 완료 → Day 3

...

Day 14:
1. 방장 (turn_order: 0)
2. AI1 (turn_order: 1)
3. AI2 (turn_order: 2)
→ 모든 플레이어 턴 완료 → 게임 종료
```

### Day 변경 로직:
```typescript
// 모든 플레이어가 턴을 마쳤는지 확인
const completedTurnsResult = await client.query(
  `SELECT COUNT(DISTINCT ps.player_id) as count
   FROM turns t
   JOIN player_states ps ON t.player_state_id = ps.id
   WHERE ps.game_id = $1 AND t.ended_at IS NOT NULL
   AND DATE(t.started_at) = (SELECT MAX(DATE(started_at)) FROM turns ...)`,
  [gameId]
);

const completedCount = parseInt(completedTurnsResult.rows[0].count);
const totalPlayers = players.length;

let newDay = currentDay;
if (completedCount >= totalPlayers) {
  newDay = currentDay + 1;  // ← 다음 날로
  
  // 14일차 종료 체크
  if (newDay > 14) {
    await client.query(
      'UPDATE games SET status = $1 WHERE id = $2',
      ['finalizing', gameId]
    );
    return;
  }
}
```

---

## 6) 각 턴 플레이어들의 행동 로그는 어디에 남지?

### 답변: **event_logs 테이블과 turns 테이블**

### A. event_logs 테이블 (상세 행동 로그)
```sql
CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 이벤트 타입
  data JSONB,                -- 이벤트 데이터
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 기록되는 이벤트:
```typescript
// 이동
await client.query(
  'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
  [gameId, 'move', JSON.stringify({ 
    playerId, 
    from: currentPosition, 
    to: targetPosition 
  })]
);

// 행동
await client.query(
  'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
  [gameId, `action_${actionType}`, JSON.stringify({ 
    playerId, 
    actionType,
    cardId 
  })]
);

// 결심 토큰 사용
await client.query(
  'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
  [gameId, 'resolve_token_used', JSON.stringify({ 
    playerId, 
    day: currentDay 
  })]
);
```

### B. turns 테이블 (턴 단위 로그)
```sql
CREATE TABLE turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  day INT NOT NULL,                    -- 날짜
  player_state_id UUID REFERENCES player_states(id),  -- 플레이어
  started_at TIMESTAMPTZ DEFAULT NOW(),  -- 턴 시작 시간
  ended_at TIMESTAMPTZ                   -- 턴 종료 시간
);
```

#### 턴 레코드 생성:
```typescript
// 턴 시작
await client.query(
  'INSERT INTO turns (game_id, day, player_state_id, started_at) VALUES ($1, $2, $3, NOW())',
  [gameId, currentDay, playerStateId]
);

// 턴 종료
await client.query(
  'UPDATE turns SET ended_at = NOW() WHERE id = $1',
  [turnId]
);
```

### C. actions 테이블 (턴 내 행동 로그)
```sql
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turn_id UUID REFERENCES turns(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,  -- 행동 종류
  payload JSONB,       -- 행동 데이터
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 로그 조회 예시:
```sql
-- 특정 게임의 모든 이벤트 로그
SELECT 
  el.event_type,
  el.data,
  el.created_at,
  u.nickname
FROM event_logs el
JOIN player_states ps ON (el.data->>'playerId')::uuid = ps.player_id
JOIN players p ON ps.player_id = p.id
JOIN users u ON p.user_id = u.id
WHERE el.game_id = '[gameId]'
ORDER BY el.created_at;

-- 특정 플레이어의 턴 기록
SELECT 
  t.day,
  t.started_at,
  t.ended_at,
  EXTRACT(EPOCH FROM (t.ended_at - t.started_at)) as duration_seconds,
  u.nickname
FROM turns t
JOIN player_states ps ON t.player_state_id = ps.id
JOIN players p ON ps.player_id = p.id
JOIN users u ON p.user_id = u.id
WHERE t.game_id = '[gameId]'
ORDER BY t.started_at;
```

---

## 요약

1. **첫 턴**: 방장 (1번 슬롯, turn_order: 0)
2. **행동**: ① 이동 (인접 칸) → ② 행동 선택 (1~6번)
3. **2번 칸 행동**: 1~6번 중 선택 가능 (현재 구현)
4. **사용 데이터**: player_states, games, decks, cards, hands
5. **다음 턴**: turn_order 순서대로 순환 (0 → 1 → 2 → 0 → ...)
6. **행동 로그**: event_logs (상세), turns (턴 단위), actions (행동 단위)
