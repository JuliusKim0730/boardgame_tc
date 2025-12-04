# AI 턴 중복 실행 및 타임아웃 문제 수정

## 🔍 문제 분석

### 발견된 문제들
1. **중복 AI 턴 실행**: 같은 AI가 여러 경로로 동시에 실행됨
   - gameRoutes의 즉시 실행
   - AIPlayerService의 연속 실행
   - AIScheduler의 스케줄 실행
   
2. **Day 전환 시 턴 카운트 오류**: `4/3` - 3명인데 4번 턴 실행
   
3. **Database Statement Timeout**: 여러 AI 턴이 동시에 같은 레코드 업데이트 시도
   ```
   error: canceling statement due to statement timeout
   while updating tuple (0,113) in relation "turns"
   ```

4. **턴 락이 제대로 작동하지 않음**: 락 해제 전에 다음 턴 시작

## ✅ 수정 사항

### 1. 중복 실행 방지 시스템 추가

#### AIScheduler.ts
```typescript
// 게임 실행 중 여부 확인 메서드 추가
isGameExecuting(gameId: string): boolean {
  return this.executingGames.has(gameId);
}
```

#### gameRoutes.ts
```typescript
// 이미 실행 중인 게임은 스킵
if (aiScheduler.isGameExecuting(gameId)) {
  console.log(`⚠️ AI 턴 이미 실행 중, 스킵: gameId=${gameId}`);
} else {
  aiScheduler.markGameAsExecuting(gameId);
  // AI 턴 실행...
}
```

#### AIPlayerService.ts
```typescript
// 연속 실행 시에도 중복 체크
if (aiScheduler.isGameExecuting(gameId)) {
  console.log(`⚠️ 다음 AI 턴 이미 실행 중, 연속 실행 스킵`);
} else {
  // 연속 실행...
}
```

### 2. 턴 카운트 검증 추가

#### TurnManager.ts
```typescript
// 중복 턴 방지: 이미 모든 플레이어가 턴을 마쳤으면 에러
if (completedTurns > totalPlayers) {
  console.error(`❌ 턴 카운트 오류: ${completedTurns}/${totalPlayers} - 중복 턴 감지`);
  throw new Error('턴 카운트 오류: 중복 턴이 감지되었습니다');
}
```

### 3. 데이터베이스 타임아웃 증가

#### pool.ts
```typescript
max: 10,  // 연결 수 증가 (5 → 10)
min: 2,   // 최소 연결 유지 (1 → 2)
idleTimeoutMillis: 120000,  // 120초 (60초 → 120초)
connectionTimeoutMillis: 20000,  // 20초 (15초 → 20초)
statement_timeout: 60000,  // 60초 (30초 → 60초)
query_timeout: 60000,  // 60초 (30초 → 60초)
```

#### TurnManager.ts & AIPlayerService.ts
```typescript
// 모든 트랜잭션에서 타임아웃 60초로 증가
await client.query('SET statement_timeout = 60000');
```

### 4. 플레이어 위치 시각화 추가

#### GameBoard.tsx
```typescript
interface PlayerPosition {
  playerId: string;
  nickname: string;
  position: number;
  color: string;
}

// 각 칸에 플레이어 닉네임 표시
{playersAtPosition.map((player, index) => (
  <g key={player.playerId}>
    <rect
      x={coords.x - 40}
      y={coords.y + offsetY - 15}
      width="80"
      height="20"
      rx="10"
      fill={player.color}
      opacity="0.9"
    />
    <text
      x={coords.x}
      y={coords.y + offsetY}
      textAnchor="middle"
      fontSize="11"
      fontWeight="bold"
      fill="#fff"
    >
      {player.nickname}
    </text>
  </g>
))}
```

#### GameScreen.tsx
```typescript
// 플레이어 색상 매핑
const getPlayerColor = (index: number): string => {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
  return colors[index % colors.length];
};

// GameBoard에 플레이어 위치 정보 전달
<GameBoard
  currentPosition={playerState?.position || 1}
  onPositionClick={handleMove}
  disabled={!isMyTurn || hasMoved}
  allPlayers={allPlayers.map((p, index) => ({
    playerId: p.player_id,
    nickname: p.nickname || `플레이어 ${p.turn_order + 1}`,
    position: p.position,
    color: getPlayerColor(index)
  }))}
/>
```

## 🎯 기대 효과

1. **중복 실행 방지**: 같은 게임에서 AI 턴이 동시에 여러 번 실행되지 않음
2. **타임아웃 해결**: 충분한 시간으로 데이터베이스 작업 완료
3. **턴 카운트 정확성**: Day 전환 시 정확한 턴 수 검증
4. **시각적 피드백**: 플레이어가 게임 보드에서 각 플레이어의 위치를 실시간으로 확인 가능
5. **안정성 향상**: 데이터베이스 연결 풀 최적화로 동시 처리 능력 향상

## 📝 테스트 체크리스트

- [ ] AI 3명 게임에서 Day 전환 시 정상 작동
- [ ] AI 턴이 중복 실행되지 않는지 확인
- [ ] 타임아웃 에러가 발생하지 않는지 확인
- [ ] 게임 보드에서 플레이어 위치가 정확히 표시되는지 확인
- [ ] AI 이동 시 위치 변경이 실시간으로 반영되는지 확인
- [ ] 여러 플레이어가 같은 칸에 있을 때 모두 표시되는지 확인

## 🛑 게임 중지 시스템 추가

### 5. AI 스케줄러 자동 중지

#### AIScheduler.ts
```typescript
private stoppedGames = new Set<string>(); // 중지된 게임 ID

// 게임 중지 메서드
stopGame(gameId: string): void {
  this.stoppedGames.add(gameId);
  this.executingGames.delete(gameId);
  console.log(`🛑 게임 ${gameId} AI 스케줄러 중지`);
}

// 중지된 게임은 스케줄러에서 스킵
if (this.stoppedGames.has(row.game_id)) {
  console.log(`🛑 게임 ${row.game_id}는 중지됨, 스킵`);
  continue;
}

// 치명적 에러 발생 시 자동 중지
if (error?.code === 'XX000' || 
    error?.message?.includes('DbHandler exited') ||
    error?.message?.includes('턴 카운트 오류') ||
    error?.code === '57014') {
  console.error(`🛑 게임 ${row.game_id} 중지: 치명적 에러 발생`);
  this.stopGame(row.game_id);
}
```

#### TurnManager.ts
```typescript
// 게임 종료 시 AI 스케줄러 중지
if (newDay > 14) {
  console.log('🏁 14일차 완료 - 게임 종료');
  await client.query(
    'UPDATE games SET status = $1, current_turn_player_id = NULL WHERE id = $2',
    ['finalizing', gameId]
  );
  await client.query('COMMIT');
  
  // AI 스케줄러 중지
  const { aiScheduler } = await import('./AIScheduler');
  aiScheduler.stopGame(gameId);
  
  return { nextPlayerId: null, isGameEnd: true, isAI: false };
}
```

#### gameRoutes.ts
```typescript
// 게임 종료 알림 시 AI 스케줄러 중지
if (result.isGameEnd && io) {
  const roomResult = await pool.query(
    'SELECT room_id FROM games WHERE id = $1',
    [gameId]
  );
  const roomId = roomResult.rows[0].room_id;
  
  io.to(roomId).emit('game-ended', { gameId });
  
  // AI 스케줄러 중지
  const { aiScheduler } = await import('../services/AIScheduler');
  aiScheduler.stopGame(gameId);
  console.log(`🛑 게임 종료로 AI 스케줄러 중지: ${gameId}`);
}
```

#### gameSocket.ts
```typescript
// 플레이어가 게임에서 나갈 때 AI 스케줄러 중지
socket.on('exit-game', async (data: { gameId: string; playerId: string }) => {
  console.log(`🚪 플레이어 ${data.playerId}가 게임 ${data.gameId}에서 나감`);
  
  // AI 스케줄러 중지
  const { aiScheduler } = await import('../services/AIScheduler');
  aiScheduler.stopGame(data.gameId);
  console.log(`🛑 게임 ${data.gameId} AI 스케줄러 중지 (플레이어 나가기)`);
});
```

#### GameScreen.tsx
```typescript
// 나가기 버튼 클릭 시 소켓 이벤트 발송
<button className="btn-exit" onClick={() => {
  // 게임 나가기 이벤트 발송
  socketService.emit('exit-game', { gameId, playerId });
  onBackToLobby();
}}>
  나가기
</button>
```

#### AIPlayerService.ts
```typescript
// 치명적 에러 발생 시 게임 자동 중지
const isCriticalError = 
  error?.code === 'XX000' || 
  error?.message?.includes('DbHandler exited') ||
  error?.message?.includes('턴 카운트 오류') ||
  error?.code === '57014' || // statement timeout
  error?.message?.includes('Query read timeout');

if (isCriticalError) {
  console.error(`🛑 치명적 에러 발생, 게임 ${gameId} 중지`);
  const { aiScheduler } = await import('./AIScheduler');
  aiScheduler.stopGame(gameId);
}
```

## 🎯 게임 중지 트리거

1. **게임 정상 종료**: Day 14 완료 시
2. **플레이어 나가기**: 나가기 버튼 클릭 시
3. **치명적 에러 발생**:
   - Database connection error (XX000)
   - Statement timeout (57014)
   - Query read timeout
   - 턴 카운트 오류
4. **게임 상태 변경**: status가 'running'이 아닐 때

## 🚀 다음 단계

1. 백엔드 재시작
2. 프론트엔드 재시작
3. 새 게임 생성하여 테스트
4. AI 3명으로 Day 전환 테스트
5. 로그 확인하여 중복 실행 여부 검증
6. **게임 나가기 테스트**: 나가기 버튼 클릭 후 AI 스케줄러 중지 확인
7. **에러 발생 테스트**: 에러 발생 시 AI 스케줄러 자동 중지 확인
