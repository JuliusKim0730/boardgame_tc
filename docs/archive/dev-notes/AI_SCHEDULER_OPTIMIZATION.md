# AI 스케줄러 최적화

## 🎯 목적

게임 시작 전(대기실)에는 AI 스케줄러가 불필요한 체크를 하지 않도록 최적화

## 📊 게임 상태별 처리

### 게임 상태 (status)

1. **'waiting'**: 대기실 (게임 시작 전)
   - AI 스케줄러 체크 **안 함** ✅
   - 플레이어들이 준비 중

2. **'running'**: 게임 진행 중
   - AI 스케줄러 체크 **함** ✅
   - AI 턴 자동 실행

3. **'finalizing'**: 게임 종료 (최종 정산)
   - AI 스케줄러 체크 **안 함** ✅
   - 게임 중지됨

4. **'finished'**: 게임 완료
   - AI 스케줄러 체크 **안 함** ✅
   - 결과 확인 중

## ✅ 구현된 최적화

### 1. 빠른 사전 체크

```typescript
// 먼저 진행 중인 게임이 있는지 빠르게 체크
const runningGamesResult = await client.query(
  `SELECT COUNT(*) as count FROM games WHERE status = 'running'`
);
const runningGamesCount = parseInt(runningGamesResult.rows[0].count);

// 진행 중인 게임이 없으면 스킵
if (runningGamesCount === 0) {
  client.release();
  return;
}
```

**효과:**
- 대기실만 있고 진행 중인 게임이 없으면 즉시 리턴
- 불필요한 JOIN 쿼리 실행 안 함
- 데이터베이스 부하 감소

### 2. 상태 필터링

```sql
WHERE g.status = 'running'  -- 게임 진행 중인 것만
AND p.is_ai = true          -- AI 플레이어만
AND t.ended_at IS NULL      -- 턴이 끝나지 않은 것만
AND t.started_at > NOW() - INTERVAL '5 minutes'  -- 최근 5분 이내
```

### 3. 중지된 게임 스킵

```typescript
// 중지된 게임은 스킵
if (this.stoppedGames.has(row.game_id)) {
  console.log(`🛑 게임 ${row.game_id}는 중지됨, 스킵`);
  continue;
}
```

### 4. 로그 최적화

```typescript
// AI 턴이 있을 때만 로그 출력
if (result.rows.length > 0) {
  console.log(`🔍 AI 스케줄러 체크: ${result.rows.length}개 발견`);
  console.log(`🎯 AI 턴 발견 (스케줄러):`, ...);
}
```

**효과:**
- 불필요한 로그 출력 감소
- 콘솔 가독성 향상

## 📈 성능 개선

### Before (최적화 전)
```
매 5초마다:
  1. 복잡한 JOIN 쿼리 실행 (모든 게임 체크)
  2. 대기실 게임도 체크
  3. 매번 로그 출력
```

### After (최적화 후)
```
매 5초마다:
  1. 빠른 COUNT 쿼리 (running 게임만)
  2. running 게임이 없으면 즉시 리턴
  3. running 게임이 있을 때만 상세 체크
  4. AI 턴이 있을 때만 로그 출력
```

## 🎯 시나리오별 동작

### 시나리오 1: 대기실만 있는 경우
```
[5초 후]
- COUNT 쿼리: 0개
- 즉시 리턴 ✅
- 로그 없음 ✅

[10초 후]
- COUNT 쿼리: 0개
- 즉시 리턴 ✅
- 로그 없음 ✅
```

### 시나리오 2: 게임 진행 중 (AI 턴)
```
[5초 후]
- COUNT 쿼리: 1개
- 상세 체크 실행
- AI 턴 발견: 1개
- 로그 출력: "🔍 AI 스케줄러 체크: 1개 발견"
- AI 턴 실행 ✅
```

### 시나리오 3: 게임 진행 중 (사람 턴)
```
[5초 후]
- COUNT 쿼리: 1개
- 상세 체크 실행
- AI 턴 발견: 0개
- 로그 없음 ✅
```

### 시나리오 4: 게임 종료
```
[5초 후]
- COUNT 쿼리: 0개 (status='finalizing')
- 즉시 리턴 ✅
- 로그 없음 ✅
```

## 📊 예상 효과

1. **데이터베이스 부하 감소**: 대기실만 있을 때 복잡한 쿼리 실행 안 함
2. **로그 정리**: 불필요한 로그 출력 감소
3. **성능 향상**: 빠른 사전 체크로 즉시 리턴
4. **명확성**: 게임 상태별 처리 로직 명확화

## 🔧 추가 최적화 가능 사항

### 1. 스케줄러 간격 동적 조정
```typescript
// 진행 중인 게임이 없으면 간격 늘리기
if (runningGamesCount === 0) {
  // 30초로 늘림
} else {
  // 5초 유지
}
```

### 2. 게임 시작/종료 이벤트 기반
```typescript
// 게임 시작 시 스케줄러 활성화
socket.on('game-started', () => {
  aiScheduler.activate();
});

// 게임 종료 시 스케줄러 비활성화
socket.on('game-ended', () => {
  aiScheduler.deactivate();
});
```

## ✅ 결론

현재 구현으로 게임 시작 전(대기실)에는 AI 스케줄러가 효율적으로 동작합니다:
- ✅ 빠른 사전 체크로 불필요한 쿼리 방지
- ✅ 'running' 상태 게임만 체크
- ✅ 로그 출력 최소화
- ✅ 중지된 게임 자동 스킵
