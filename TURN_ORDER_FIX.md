# 턴 순서 수정 완료

## 문제 상황
1. UI에서는 "123123"이 내 턴이라고 표시
2. 실제로는 "신중한봇62"의 턴
3. 플레이어 목록에서 "신중한봇62"가 #1, "123123"이 #2로 표시
4. 방장(1번 슬롯)부터 시작해야 하는데 AI부터 시작됨

## 원인 분석

### GameSetupService.ts
```typescript
// 문제 코드
const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

// 플레이어를 랜덤으로 섞어서 턴 순서 결정
for (let i = 0; i < shuffledPlayers.length; i++) {
  await client.query(
    'INSERT INTO player_states (game_id, player_id, turn_order) VALUES ($1, $2, $3)',
    [gameId, shuffledPlayers[i].id, i]  // ← 랜덤 순서로 turn_order 설정
  );
}

// 선 플레이어 = 랜덤으로 섞인 첫 번째 플레이어
const firstPlayerId = shuffledPlayers[0].id;
```

**문제**: 
- 플레이어를 랜덤으로 섞어서 턴 순서를 결정
- 슬롯 순서(방장 → 참가자 순)를 무시함

## 수정 내용

### GameSetupService.ts

#### 1. 플레이어 조회 시 순서 보장
```typescript
// 수정 전
const playersResult = await client.query(
  'SELECT id FROM players WHERE room_id = $1',
  [roomId]
);

// 수정 후
const playersResult = await client.query(
  `SELECT p.id FROM players p 
   WHERE p.room_id = $1 
   ORDER BY p.created_at`,  // ← created_at 순서로 조회
  [roomId]
);
```

#### 2. 랜덤 섞기 제거
```typescript
// 수정 전
const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

// 수정 후
const orderedPlayers = players;  // ← 랜덤 섞기 제거, 슬롯 순서 유지
```

#### 3. 턴 순서 설정
```typescript
// 슬롯 순서대로 turn_order 설정
for (let i = 0; i < orderedPlayers.length; i++) {
  await client.query(
    'INSERT INTO player_states (game_id, player_id, turn_order) VALUES ($1, $2, $3)',
    [gameId, orderedPlayers[i].id, i]  // ← 슬롯 순서대로 0, 1, 2, ...
  );
}
```

#### 4. 선 플레이어 = 1번 슬롯 (방장)
```typescript
// 수정 전
const firstPlayerId = shuffledPlayers[0].id;  // ← 랜덤

// 수정 후
const firstPlayerId = orderedPlayers[0].id;  // ← 항상 1번 슬롯 (방장)
```

## 턴 순서 규칙

### 슬롯 순서 = 턴 순서
```
슬롯 1 (방장) → turn_order: 0 → 선 플레이어
슬롯 2        → turn_order: 1
슬롯 3        → turn_order: 2
슬롯 4        → turn_order: 3
슬롯 5        → turn_order: 4
```

### Day별 선 플레이어
```
Day 1: 슬롯 1 (turn_order: 0)
Day 2: 슬롯 2 (turn_order: 1)
Day 3: 슬롯 3 (turn_order: 2)
...
```

## 예상 결과

### 게임 시작 시
```
대기실:
슬롯 1: 👑 123123 (방장)
슬롯 2: 🤖 신중한봇62
슬롯 3: 🤖 똑똑한봇54

게임 시작 후:
플레이어 목록:
🎯 123123 (나) #1 [현재 턴 - 노란색]
신중한봇62 #2
똑똑한봇54 #3

메시지: "당신의 턴입니다! 이동할 칸을 선택하세요."
```

### 턴 진행
```
Day 1:
1. 123123 턴 (방장)
2. 신중한봇62 턴
3. 똑똑한봇54 턴

Day 2:
1. 신중한봇62 턴 (선 플레이어)
2. 똑똑한봇54 턴
3. 123123 턴

Day 3:
1. 똑똑한봇54 턴 (선 플레이어)
2. 123123 턴
3. 신중한봇62 턴
```

## 테스트 방법

### 1. 기존 게임 데이터 삭제
```sql
-- Supabase SQL Editor
DELETE FROM games;
DELETE FROM rooms WHERE status = 'waiting';
```

### 2. 새 게임 시작
1. 방 생성 (닉네임: 123123)
2. AI 추가 (2개)
3. 게임 시작

### 3. 확인 사항
- [ ] 플레이어 목록에서 "123123"이 #1로 표시되는가?
- [ ] "당신의 턴입니다!" 메시지가 표시되는가?
- [ ] 인접한 칸이 밝게 표시되는가?
- [ ] 이동 후 행동 선택 버튼이 표시되는가?

### 4. 백엔드 로그 확인
```
✅ 게임 생성 완료
✅ 선 플레이어: [123123의 player_id]
✅ 첫 턴 시작
```

## 주의사항

### created_at 컬럼 필수
players 테이블에 created_at 컬럼이 있어야 합니다.

```sql
-- Supabase SQL Editor
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE players 
SET created_at = NOW() 
WHERE created_at IS NULL;
```

### 슬롯 순서 보장
- 방장이 먼저 방을 생성 → created_at이 가장 빠름
- 참가자가 순서대로 입장 → created_at 순서대로 정렬
- 게임 시작 시 이 순서를 유지

## 다음 단계

1. ✅ 턴 순서 수정 완료
2. ✅ 백엔드 재시작
3. ✅ 프론트엔드 재시작
4. ⏳ 새 게임으로 테스트
5. ⏳ 턴 진행 확인
6. ⏳ AI 자동 턴 확인
