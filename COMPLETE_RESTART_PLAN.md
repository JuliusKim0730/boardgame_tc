# 완전 재구성 계획

## 핵심 문제
1. #1 플레이어(방장)가 턴을 시작해야 하는데 AI가 시작함
2. 플레이어 ID와 턴 순서가 일치하지 않음
3. 프론트엔드와 백엔드의 플레이어 식별이 불일치

## 근본 원인

### 데이터 구조 문제
```
players 테이블:
- id: player_id (UUID)
- user_id: user의 id
- room_id: 방 ID
- created_at: 생성 시간

player_states 테이블:
- id: player_state_id (UUID)
- player_id: players.id 참조
- turn_order: 턴 순서 (0, 1, 2, ...)

games 테이블:
- current_turn_player_id: 현재 턴의 player_id
```

**문제**: 
- `current_turn_player_id`가 `players.id`를 가리킴
- 하지만 턴 순서는 `player_states.turn_order`로 관리
- 두 개념이 혼재되어 있음

## 해결 방안

### 1단계: 데이터베이스 확인
```sql
-- 현재 게임 상태 확인
SELECT 
  g.id as game_id,
  g.current_turn_player_id,
  g.day,
  ps.turn_order,
  p.id as player_id,
  u.nickname
FROM games g
JOIN player_states ps ON ps.game_id = g.id
JOIN players p ON ps.player_id = p.id
JOIN users u ON p.user_id = u.id
WHERE g.status = 'running'
ORDER BY ps.turn_order;
```

### 2단계: GameSetupService 완전 재작성
**목표**: 슬롯 순서 = 턴 순서 = created_at 순서

```typescript
// 1. 플레이어 조회 (created_at 순서)
const playersResult = await client.query(
  `SELECT p.id, p.user_id, u.nickname
   FROM players p
   JOIN users u ON p.user_id = u.id
   WHERE p.room_id = $1
   ORDER BY p.created_at ASC`,  // ← 가장 중요!
  [roomId]
);

// 2. 플레이어 상태 생성 (순서대로)
for (let i = 0; i < players.length; i++) {
  await client.query(
    `INSERT INTO player_states 
     (game_id, player_id, money, position, resolve_token, turn_order) 
     VALUES ($1, $2, 3000, 1, 1, $3)`,
    [gameId, players[i].id, i]  // ← turn_order = i
  );
}

// 3. 첫 번째 플레이어 = 선 플레이어
const firstPlayer = players[0];  // ← created_at이 가장 빠른 플레이어 = 방장

// 4. 게임 상태 업데이트
await client.query(
  'UPDATE games SET current_turn_player_id = $1, status = $2 WHERE id = $3',
  [firstPlayer.id, 'running', gameId]  // ← players.id
);

// 5. 첫 턴 레코드 생성
const firstPlayerState = await client.query(
  'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
  [gameId, firstPlayer.id]
);

await client.query(
  'INSERT INTO turns (game_id, day, player_state_id, started_at) VALUES ($1, 1, $2, NOW())',
  [gameId, firstPlayerState.rows[0].id]
);
```

### 3단계: 프론트엔드 확인
```typescript
// GameScreen.tsx
const isMyTurn = gameState.currentTurnPlayerId === playerId;

// playerId는 App.tsx에서 전달받은 players.id
// gameState.currentTurnPlayerId는 games.current_turn_player_id
```

**확인 필요**: 
- App.tsx에서 전달하는 `playerId`가 `players.id`인지 확인
- `userId`와 `playerId`를 혼동하지 않았는지 확인

### 4단계: WebSocket 이벤트 확인
```typescript
// roomRoutes.ts - 게임 시작 시
io.to(roomId).emit('game-started', { gameId });
io.to(roomId).emit('turn-started', { 
  playerId: firstPlayer.id,  // ← players.id (not user_id)
  day: 1
});
```

## 완전 재구성 순서

### 1. 데이터베이스 초기화
```sql
-- 모든 게임 데이터 삭제
DELETE FROM turns;
DELETE FROM player_states;
DELETE FROM games;
DELETE FROM players;
DELETE FROM rooms;
```

### 2. GameSetupService.ts 재작성
- [ ] 플레이어 조회 시 ORDER BY created_at
- [ ] 랜덤 섞기 완전 제거
- [ ] turn_order를 순서대로 0, 1, 2, ... 설정
- [ ] current_turn_player_id를 첫 번째 플레이어로 설정
- [ ] 첫 턴 레코드 생성

### 3. App.tsx 확인
- [ ] playerId가 players.id인지 확인
- [ ] userId와 playerId를 구분하는지 확인

### 4. GameScreen.tsx 확인
- [ ] isMyTurn 계산이 올바른지 확인
- [ ] playerId 비교가 정확한지 확인

### 5. 테스트
- [ ] 새 방 생성
- [ ] 방장 닉네임 확인
- [ ] AI 추가
- [ ] 게임 시작
- [ ] 방장이 #1로 표시되는지 확인
- [ ] "당신의 턴입니다" 메시지 확인
- [ ] 인접 칸 클릭 가능 확인

## 디버그 로그 추가

### GameSetupService.ts
```typescript
console.log('=== 게임 설정 시작 ===');
console.log('플레이어 목록:', players.map((p, i) => ({
  index: i,
  id: p.id,
  nickname: p.nickname,
  turn_order: i
})));
console.log('선 플레이어:', {
  id: firstPlayer.id,
  nickname: firstPlayer.nickname,
  turn_order: 0
});
```

### GameScreen.tsx
```typescript
console.log('=== 게임 상태 ===');
console.log('내 playerId:', playerId);
console.log('현재 턴 playerId:', gameState.currentTurnPlayerId);
console.log('isMyTurn:', isMyTurn);
console.log('플레이어 목록:', allPlayers.map(p => ({
  id: p.player_id,
  nickname: p.nickname,
  turn_order: p.turn_order,
  isCurrentTurn: p.player_id === gameState.currentTurnPlayerId
})));
```

## 예상 결과

### 백엔드 로그
```
=== 게임 설정 시작 ===
플레이어 목록: [
  { index: 0, id: 'abc-123', nickname: '123123', turn_order: 0 },
  { index: 1, id: 'def-456', nickname: '신중한봇62', turn_order: 1 },
  { index: 2, id: 'ghi-789', nickname: '똑똑한봇54', turn_order: 2 }
]
선 플레이어: { id: 'abc-123', nickname: '123123', turn_order: 0 }
```

### 프론트엔드 로그
```
=== 게임 상태 ===
내 playerId: abc-123
현재 턴 playerId: abc-123
isMyTurn: true
플레이어 목록: [
  { id: 'abc-123', nickname: '123123', turn_order: 0, isCurrentTurn: true },
  { id: 'def-456', nickname: '신중한봇62', turn_order: 1, isCurrentTurn: false },
  { id: 'ghi-789', nickname: '똑똑한봇54', turn_order: 2, isCurrentTurn: false }
]
```

### UI 표시
```
플레이어 목록:
🎯 123123 (나) #1 [노란색 강조]
신중한봇62 #2
똑똑한봇54 #3

메시지: "당신의 턴입니다! 이동할 칸을 선택하세요."
```
