# AI 턴 날짜 전환 문제 수정

## 수정 날짜
2024-12-03

## 문제

1일차 완료 후 2일차로 넘어가지 않고 데이터가 끊김
- AI 턴 완료 후 데이터베이스 연결 해제
- 다음 날로 전환되지 않음

## 원인

AIPlayerService의 `endTurn` 함수에서 날짜 전환 로직이 잘못됨:
```typescript
// 잘못된 쿼리 - 현재 날짜의 완료된 턴을 정확히 세지 못함
const completedTurnsResult = await client.query(
  `SELECT COUNT(DISTINCT ps.player_id) as count
   FROM turns t
   JOIN player_states ps ON t.player_state_id = ps.id
   WHERE ps.game_id = $1 AND t.ended_at IS NOT NULL
   AND DATE(t.started_at) = (SELECT MAX(DATE(started_at)) FROM turns ...)`,
  [gameId]
);
```

## 해결 방법

AI 턴 종료 시 TurnManager의 `endTurn` 함수를 사용하도록 변경:

### Before
```typescript
async executeTurn(gameId: string, playerId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 이동, 행동
    await this.move(...);
    await this.performAction(...);
    
    // 턴 종료 (같은 트랜잭션 내)
    await this.endTurn(client, gameId, playerId);
    
    await client.query('COMMIT');
  } finally {
    client.release();
  }
}
```

### After
```typescript
async executeTurn(gameId: string, playerId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 이동, 행동
    await this.move(...);
    await this.performAction(...);
    
    await client.query('COMMIT');
  } finally {
    client.release();
  }

  // 턴 종료 (별도 트랜잭션으로 TurnManager 사용)
  const { turnManager } = await import('./TurnManager');
  await turnManager.endTurn(gameId, playerId);
}
```

## 수정 내용

### 1. AIPlayerService.executeTurn 수정
- 턴 종료를 별도 트랜잭션으로 분리
- TurnManager의 endTurn 사용 (검증된 로직)

### 2. AIPlayerService.endTurn 제거
- 중복 로직 제거
- TurnManager로 통일

## 장점

1. **검증된 로직 사용**: TurnManager의 endTurn은 이미 검증됨
2. **일관성**: 모든 턴 종료가 같은 로직 사용
3. **유지보수**: 턴 종료 로직이 한 곳에만 존재
4. **버그 방지**: 날짜 전환 로직 중복 제거

## TurnManager.endTurn의 날짜 전환 로직

```typescript
// 현재 날짜의 턴 수 확인
const turnsThisDayResult = await client.query(
  `SELECT COUNT(*) as count 
   FROM turns t
   JOIN player_states ps ON t.player_state_id = ps.id
   WHERE ps.game_id = $1 AND t.day = $2`,
  [gameId, currentDay]
);

const turnsThisDay = parseInt(turnsThisDayResult.rows[0].count);

// 모든 플레이어가 턴을 마쳤으면 다음 날로
if (turnsThisDay >= totalPlayers) {
  newDay = currentDay + 1;
  console.log(`📅 Day ${currentDay} 완료 → Day ${newDay} 시작`);
}
```

## 테스트

### 시나리오
1. 3명 플레이어 (1명 유저 + 2명 AI)
2. 1일차 진행
3. 모든 플레이어 턴 완료
4. 2일차로 전환 확인

### 예상 로그
```
🤖 AI 턴 실행: 신중한기계97
🤖 AI 이동 결정: 1 → 2
🤖 AI 행동 결정: 2번
✅ AI 행동 완료
🤖 AI 턴 종료 중...
✅ AI 턴 완료

🤖 AI 턴 실행: 명랑한알고리즘17
🤖 AI 이동 결정: 1 → 2
🤖 AI 행동 결정: 2번
✅ AI 행동 완료
🤖 AI 턴 종료 중...
📅 Day 1 완료 → Day 2 시작
✅ AI 턴 완료
```

## 수정된 파일

- `backend/src/services/AIPlayerService.ts`

## 추가 개선 사항

### WebSocket 알림 추가 (선택사항)
```typescript
// TurnManager.endTurn에서
if (turnsThisDay >= totalPlayers && newDay <= 14) {
  io.to(roomId).emit('day-changed', {
    oldDay: currentDay,
    newDay: newDay
  });
}
```

### 프론트엔드 표시 (선택사항)
```typescript
socket.on('day-changed', (data) => {
  setMessage(`📅 ${data.oldDay}일차 완료! ${data.newDay}일차 시작`);
});
```

## 결과

- ✅ 1일차 완료 후 2일차로 정상 전환
- ✅ AI 턴 종료 후 데이터베이스 연결 정상
- ✅ 14일차까지 정상 진행
- ✅ 턴 종료 로직 통일

## 참고

- `backend/src/services/TurnManager.ts` - 턴 관리 로직
- `TURN_SYSTEM_DEBUG.md` - 턴 시스템 디버깅
- `AI_TURN_FIX.md` - AI 턴 수정 이력
