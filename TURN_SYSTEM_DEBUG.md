# 턴 시스템 디버그 가이드

## 문제 상황
1. 내 턴인데 "다른 사람 턴 대기중"이라고 표시됨
2. 이동할 수 없음 (인접 칸 클릭 불가)
3. 할 수 있는 행동이 없음

## 디버그 정보 추가

### 1. GameScreen.tsx
```typescript
// 게임 상태 로드 시 콘솔 로그 추가
console.log('게임 상태 로드:', { 
  currentTurnPlayerId: game.currentTurnPlayerId, 
  myPlayerId: playerId,
  isMyTurn: game.currentTurnPlayerId === playerId 
});
```

### 2. GameBoard.tsx
```typescript
// 보드 렌더링 시 콘솔 로그 추가
console.log('GameBoard 렌더링:', { 
  currentPosition, 
  adjacent, 
  disabled,
  canClickAny: !disabled && adjacent.length > 0
});
```

## 확인 사항

### 브라우저 콘솔 (F12)에서 확인
1. **게임 상태 로드 로그**
   ```
   게임 상태 로드: {
     currentTurnPlayerId: "abc-123",
     myPlayerId: "abc-123",
     isMyTurn: true
   }
   ```
   - `currentTurnPlayerId`와 `myPlayerId`가 같은지 확인
   - `isMyTurn`이 `true`인지 확인

2. **GameBoard 렌더링 로그**
   ```
   GameBoard 렌더링: {
     currentPosition: 1,
     adjacent: [2],
     disabled: false,
     canClickAny: true
   }
   ```
   - `adjacent` 배열에 인접 칸이 있는지 확인
   - `disabled`가 `false`인지 확인
   - `canClickAny`가 `true`인지 확인

### 백엔드 로그에서 확인
```bash
# 터미널에서 백엔드 로그 확인
# 게임 시작 시:
✅ 게임 생성 완료
✅ 선 플레이어: [playerId]
✅ 첫 턴 시작

# 턴 진행 시:
✅ 이동: [playerId] 1번 → 2번
✅ 행동: [playerId] 조사하기
✅ 턴 종료: [playerId]
✅ 다음 턴: [nextPlayerId]
```

## 가능한 원인

### 1. playerId 불일치
**증상**: `currentTurnPlayerId`와 `myPlayerId`가 다름

**원인**:
- 게임 시작 시 `playerId`가 잘못 전달됨
- WebSocket 이벤트에서 `playerId` 업데이트 누락

**해결**:
```typescript
// App.tsx에서 playerId 전달 확인
<GameScreen 
  playerId={playerId}  // ← 이 값이 올바른지 확인
  userId={userId}
  ...
/>
```

### 2. 게임 상태 동기화 실패
**증상**: 게임 상태가 로드되지 않음

**원인**:
- API 요청 실패
- WebSocket 연결 끊김

**해결**:
```typescript
// GameScreen.tsx에서 에러 처리 확인
try {
  const response = await api.getGameState(gameId);
  console.log('API 응답:', response.data);
} catch (error) {
  console.error('API 에러:', error);
}
```

### 3. 초기 턴 설정 누락
**증상**: `currentTurnPlayerId`가 `null`

**원인**:
- GameSetupService에서 첫 턴 설정 누락
- 데이터베이스에 턴 레코드 없음

**해결**:
```sql
-- Supabase SQL Editor에서 확인
SELECT 
  g.id as game_id,
  g.current_turn_player_id,
  g.day,
  g.status
FROM games g
WHERE g.id = '[gameId]';

-- 턴 레코드 확인
SELECT 
  t.id,
  t.day,
  ps.player_id,
  t.started_at,
  t.ended_at
FROM turns t
JOIN player_states ps ON t.player_state_id = ps.id
WHERE ps.game_id = '[gameId]'
ORDER BY t.started_at DESC;
```

### 4. WebSocket 이벤트 누락
**증상**: 턴이 넘어가도 화면이 업데이트되지 않음

**원인**:
- WebSocket 연결 실패
- 이벤트 리스너 등록 누락

**해결**:
```typescript
// 브라우저 콘솔에서 확인
socket.on('turn-started', (data) => {
  console.log('턴 시작 이벤트:', data);
});
```

## 임시 해결 방법

### 1. 페이지 새로고침
- F5 또는 Ctrl+R로 페이지 새로고침
- 게임 상태가 다시 로드됨

### 2. 게임 재시작
- 대기실로 돌아가기
- 게임 다시 시작

### 3. 데이터베이스 초기화
```sql
-- Supabase SQL Editor
DELETE FROM games WHERE status != 'finished';
DELETE FROM rooms WHERE status = 'waiting';
```

## 근본 해결 방법

### 1. 게임 시작 시 턴 설정 확인
```typescript
// GameSetupService.ts
await client.query(
  'UPDATE games SET current_turn_player_id = $1, status = $2 WHERE id = $3',
  [shuffledPlayers[0].id, 'running', gameId]  // ← 첫 번째 플레이어 ID
);

// 첫 턴 레코드 생성
await client.query(
  'INSERT INTO turns (game_id, day, player_state_id, started_at) VALUES ($1, $2, $3, NOW())',
  [gameId, 1, firstPlayerStateId]
);
```

### 2. WebSocket 이벤트 발송 확인
```typescript
// roomRoutes.ts - 게임 시작 시
if (io) {
  io.to(roomId).emit('game-started', { gameId });
  io.to(roomId).emit('turn-started', { 
    playerId: firstPlayerId,  // ← player_id (not player_state_id)
    day: 1
  });
}
```

### 3. 프론트엔드 상태 관리 개선
```typescript
// GameScreen.tsx
useEffect(() => {
  loadGameState();
  
  const socket = socketService.connect(roomId);
  
  socket.on('turn-started', (data) => {
    console.log('턴 시작:', data);
    setGameState(prev => ({ 
      ...prev, 
      currentTurnPlayerId: data.playerId,  // ← 정확한 playerId
      day: data.day 
    }));
    setHasMoved(false);
    setHasActed(false);
  });
  
  return () => {
    socketService.disconnect();
  };
}, [roomId, playerId, gameId]);
```

## 테스트 체크리스트

### 게임 시작 후
- [ ] 브라우저 콘솔에 "게임 상태 로드" 로그가 표시되는가?
- [ ] `currentTurnPlayerId`와 `myPlayerId`가 일치하는가?
- [ ] `isMyTurn`이 `true`인가?
- [ ] "당신의 턴입니다!" 메시지가 표시되는가?

### 보드 확인
- [ ] 브라우저 콘솔에 "GameBoard 렌더링" 로그가 표시되는가?
- [ ] `adjacent` 배열에 인접 칸이 있는가?
- [ ] `disabled`가 `false`인가?
- [ ] 인접 칸이 밝게 표시되는가?
- [ ] 인접 칸을 클릭할 수 있는가?

### 턴 진행
- [ ] 인접 칸 클릭 시 이동하는가?
- [ ] 이동 후 자동으로 행동이 수행되는가?
- [ ] 행동 후 자동으로 턴이 종료되는가?
- [ ] 다음 플레이어로 턴이 넘어가는가?

## 다음 단계

1. 브라우저 콘솔에서 로그 확인
2. 문제 원인 파악
3. 해당 섹션의 해결 방법 적용
4. 재테스트
