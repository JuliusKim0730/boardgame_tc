# 완료된 게임 자동 정리 시스템

## 🎯 목적

완료된 게임 기록을 자동으로 삭제하여 데이터베이스 용량 관리 및 성능 유지

## 📊 정리 대상

### 게임 상태별 처리

1. **'finished'**: 게임 완료 (결과 확인 완료)
   - 1시간 후 자동 삭제 ✅

2. **'finalizing'**: 게임 종료 (최종 정산 중)
   - 1시간 후 자동 삭제 ✅

3. **'running'**: 게임 진행 중
   - 삭제 안 함 ❌

4. **'waiting'**: 대기실
   - 삭제 안 함 ❌

## ✅ 구현된 기능

### 1. 자동 정리 스케줄러

```typescript
// 10분마다 완료된 게임 정리
this.cleanupInterval = setInterval(async () => {
  try {
    await this.cleanupFinishedGames();
  } catch (error) {
    console.error('게임 정리 에러:', error);
  }
}, 600000); // 10분 = 600,000ms

// 시작 시 한 번 정리 실행
this.cleanupFinishedGames().catch(console.error);
```

### 2. 정리 로직

```typescript
async cleanupFinishedGames() {
  // 1시간 이상 지난 finished/finalizing 게임 찾기
  const result = await client.query(`
    SELECT g.id, g.room_id, g.status, g.updated_at
    FROM games g
    WHERE g.status IN ('finished', 'finalizing')
    AND g.updated_at < NOW() - INTERVAL '1 hour'
  `);

  for (const game of result.rows) {
    // 게임 삭제 (CASCADE로 관련 데이터 자동 삭제)
    await client.query('DELETE FROM games WHERE id = $1', [game.id]);
    
    // 방도 삭제 (players는 CASCADE로 자동 삭제)
    await client.query('DELETE FROM rooms WHERE id = $1', [game.room_id]);
    
    // 메모리에서도 제거
    this.stoppedGames.delete(game.id);
    this.executingGames.delete(game.id);
  }
}
```

## 🗑️ CASCADE 삭제 구조

### games 테이블 삭제 시 자동 삭제되는 데이터

```sql
games (게임)
├── player_states (플레이어 상태)
│   ├── hands (손패)
│   ├── purchased (구매한 카드)
│   └── joint_plan_contributions (공동 계획 기여)
├── turns (턴 기록)
│   └── actions (행동 기록)
├── decks (덱)
├── event_logs (이벤트 로그)
└── game_results (게임 결과)
```

### rooms 테이블 삭제 시 자동 삭제되는 데이터

```sql
rooms (방)
└── players (플레이어)
```

### 전체 삭제 흐름

```
1. DELETE FROM games WHERE id = 'xxx'
   ↓ CASCADE
   - player_states 삭제
     ↓ CASCADE
     - hands 삭제
     - purchased 삭제
     - joint_plan_contributions 삭제
   - turns 삭제
     ↓ CASCADE
     - actions 삭제
   - decks 삭제
   - event_logs 삭제
   - game_results 삭제

2. DELETE FROM rooms WHERE id = 'xxx'
   ↓ CASCADE
   - players 삭제
```

## 📈 정리 주기

### 타임라인

```
게임 종료 (status='finished')
  ↓
[1시간 대기]
  ↓
정리 스케줄러 체크 (10분마다)
  ↓
조건 충족 시 삭제
  ↓
데이터베이스에서 완전 삭제
```

### 예시

```
14:00 - 게임 종료 (status='finished')
14:10 - 체크 (아직 1시간 안 됨, 스킵)
14:20 - 체크 (아직 1시간 안 됨, 스킵)
...
15:00 - 체크 (1시간 경과, 삭제 실행) ✅
```

## 🔧 설정 가능 항목

### 1. 정리 주기 변경

```typescript
// 현재: 10분마다
setInterval(async () => {
  await this.cleanupFinishedGames();
}, 600000);

// 변경 예시: 30분마다
setInterval(async () => {
  await this.cleanupFinishedGames();
}, 1800000);
```

### 2. 보관 기간 변경

```typescript
// 현재: 1시간
WHERE g.updated_at < NOW() - INTERVAL '1 hour'

// 변경 예시: 24시간
WHERE g.updated_at < NOW() - INTERVAL '24 hours'

// 변경 예시: 7일
WHERE g.updated_at < NOW() - INTERVAL '7 days'
```

## 📊 로그 출력

### 정상 동작 시

```
🧹 완료된 게임 정리 시작: 3개
✅ 게임 삭제 완료: abc-123 (finished)
✅ 게임 삭제 완료: def-456 (finished)
✅ 게임 삭제 완료: ghi-789 (finalizing)
🧹 게임 정리 완료: 3개 삭제
```

### 정리할 게임이 없을 때

```
(로그 없음 - 조용히 리턴)
```

### 에러 발생 시

```
❌ 게임 삭제 실패: abc-123 Error: ...
게임 정리 중 에러: Error: ...
```

## 🎯 장점

1. **자동화**: 수동 관리 불필요
2. **데이터베이스 용량 관리**: 오래된 게임 기록 자동 삭제
3. **성능 유지**: 불필요한 데이터 제거로 쿼리 성능 향상
4. **메모리 정리**: stoppedGames, executingGames Set에서도 제거
5. **안전성**: 트랜잭션으로 안전하게 삭제
6. **CASCADE**: 관련 데이터 자동 정리

## ⚠️ 주의사항

1. **복구 불가**: 삭제된 게임은 복구할 수 없음
2. **보관 필요 시**: 보관 기간을 늘리거나 별도 백업 필요
3. **통계 데이터**: 장기 통계가 필요하면 별도 테이블로 집계 후 저장

## 🚀 향후 개선 가능 사항

### 1. 선택적 보관

```typescript
// VIP 게임은 보관
WHERE g.status IN ('finished', 'finalizing')
AND g.updated_at < NOW() - INTERVAL '1 hour'
AND g.is_vip = false  -- VIP 게임 제외
```

### 2. 아카이브 시스템

```typescript
// 삭제 전 아카이브 테이블로 이동
INSERT INTO archived_games SELECT * FROM games WHERE id = $1;
DELETE FROM games WHERE id = $1;
```

### 3. 통계 집계

```typescript
// 삭제 전 통계 데이터 저장
INSERT INTO game_statistics (date, total_games, avg_score, ...)
SELECT DATE(created_at), COUNT(*), AVG(score), ...
FROM games WHERE status = 'finished'
GROUP BY DATE(created_at);
```

## 🔧 서버 시작 시 정리

### 자동 정리 로직

```typescript
async function cleanupOldGames() {
  // 1. 오래된 게임 정리 (1시간 이상)
  const oldGamesResult = await client.query(`
    SELECT id, room_id, status, created_at 
    FROM games 
    WHERE created_at < NOW() - INTERVAL '1 hour'
    AND status NOT IN ('finished', 'finalizing')
  `);
  
  for (const game of oldGamesResult.rows) {
    // 게임 상태를 finished로 변경
    await client.query(
      'UPDATE games SET status = $1, current_turn_player_id = NULL WHERE id = $2',
      ['finished', game.id]
    );
  }
  
  // 2. 완료된 게임의 턴 락 제거 및 AI 스케줄러에서 제외
  const finishedGames = await client.query(`
    SELECT id FROM games WHERE status IN ('finished', 'finalizing')
  `);
  
  for (const game of finishedGames.rows) {
    turnManager.unlockTurn(game.id);
    aiScheduler.stopGame(game.id); // ✅ AI 스케줄러에서 제외
  }
}
```

### 실행 시점

```typescript
httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // 서버 시작 시 자동 정리
  await cleanupOldGames();
});
```

## 🛡️ AI 스케줄러 중복 실행 방지

### SQL 쿼리에 중지된 게임 제외

```typescript
// 중지된 게임 ID 목록
const stoppedGameIds = Array.from(this.stoppedGames);

// SQL 조건 추가
const stoppedGamesCondition = stoppedGameIds.length > 0 
  ? `AND g.id NOT IN (${stoppedGameIds.map((_, i) => `$${i + 1}`).join(', ')})`
  : '';

// 쿼리 실행
const result = await client.query(`
  SELECT ...
  FROM games g
  WHERE g.status = 'running'
  AND p.is_ai = true
  ${stoppedGamesCondition}  -- ✅ 중지된 게임 제외
`, stoppedGameIds);
```

### 이중 체크

```typescript
for (const row of result.rows) {
  // 1차: SQL에서 제외
  // 2차: 메모리에서 체크
  if (this.stoppedGames.has(row.game_id)) {
    console.log(`🛑 게임 ${row.game_id}는 중지됨, 스킵`);
    continue;
  }
  
  // AI 턴 실행...
}
```

## 🐛 버그 수정

### 1. updated_at 컬럼 오류

**문제:**
```sql
WHERE g.updated_at < NOW() - INTERVAL '1 hour'
-- ❌ ERROR: column g.updated_at does not exist
```

**수정:**
```sql
WHERE g.created_at < NOW() - INTERVAL '1 hour'
-- ✅ created_at 사용
```

### 2. 중지된 게임 계속 실행

**문제:**
- 게임이 중지되었는데도 AI 스케줄러가 계속 체크
- 로그: "🛑 게임 xxx는 중지됨, 스킵" 반복

**수정:**
- SQL 쿼리에서 중지된 게임 제외
- 서버 시작 시 완료된 게임 자동 중지

## ✅ 결론

완료된 게임이 자동으로 정리되어:
- ✅ 데이터베이스 용량 관리
- ✅ 쿼리 성능 유지
- ✅ 메모리 효율성 향상
- ✅ 자동화된 관리
- ✅ 서버 재시작 시 자동 정리
- ✅ AI 스케줄러 중복 실행 방지
- ✅ 불필요한 로그 제거
