# AI 턴 자동 실행 수정 완료

## 문제
- 플레이어 턴 종료 후 AI 플레이어(#2)의 턴으로 넘어갔지만
- 로그에 찍히지 않고 AI가 행동을 시작하지 않음

## 원인
1. **AIScheduler가 AI 플레이어를 찾지 못함**
   - 정규식 패턴 매칭(`u.nickname ~ '로봇|AI|봇...'`)이 불안정
   - `players` 테이블에 `is_ai` 컬럼이 없어서 명확한 구분 불가

2. **디버깅 로그 부족**
   - AI 턴 감지 여부를 확인할 로그가 없음

## 수정 사항

### 1. 데이터베이스 스키마 추가
**파일**: `backend/src/db/add_is_ai_column.sql`
```sql
-- players 테이블에 is_ai 컬럼 추가
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT FALSE;

-- 기존 AI 플레이어 업데이트 (닉네임 기반)
UPDATE players p
SET is_ai = TRUE
FROM users u
WHERE p.user_id = u.id
AND (
  u.nickname LIKE '%로봇%' 
  OR u.nickname LIKE '%AI%' 
  OR u.nickname LIKE '%봇%'
  OR u.nickname LIKE '%컴퓨터%'
  OR u.nickname LIKE '%기계%'
  OR u.nickname LIKE '%알고리즘%'
);

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_players_is_ai ON players(is_ai) WHERE is_ai = TRUE;
```

### 2. AIScheduler 쿼리 개선
**파일**: `backend/src/services/AIScheduler.ts`

**변경 전**:
```typescript
WHERE g.status = 'running'
AND (u.nickname ~ '로봇|AI|봇|컴퓨터|기계|알고리즘')
```

**변경 후**:
```typescript
WHERE g.status = 'running'
AND p.is_ai = true
```

### 3. 디버깅 로그 추가
```typescript
console.log(`🔍 AI 턴 체크: ${result.rows.length}개 발견`);

if (result.rows.length > 0) {
  console.log(`🎯 AI 턴 발견:`, result.rows.map(r => `${r.nickname} (게임 ${r.game_id})`));
}

console.log(`🤖 AI 턴 실행 시작: ${row.nickname} (게임 ${row.game_id}, 플레이어 ${row.player_id})`);
console.log(`✅ AI 턴 실행 완료: ${row.nickname}`);
```

### 4. RoomService AI 플레이어 생성 수정
**파일**: `backend/src/services/RoomService.ts`

AI 플레이어 생성 시 `is_ai = true` 플래그 설정:
```typescript
await client.query(
  'INSERT INTO players (user_id, room_id, is_ai) VALUES ($1, $2, $3)',
  [userId, roomId, true]
);
```

## 실행 방법

### 1. Supabase SQL Editor에서 마이그레이션 실행
1. Supabase 대시보드 접속
2. SQL Editor 열기
3. `backend/src/db/add_is_ai_column.sql` 내용 복사
4. 실행

### 2. 백엔드 서버 재시작
```bash
cd backend
npm run dev
```

### 3. 확인
- 백엔드 로그에서 다음 메시지 확인:
  - `🤖 AI Scheduler started`
  - `🔍 AI 턴 체크: X개 발견`
  - `🎯 AI 턴 발견: ...`
  - `🤖 AI 턴 실행 시작: ...`
  - `✅ AI 턴 실행 완료: ...`

## 테스트 시나리오
1. 게임 시작
2. 플레이어 #1 턴 진행 및 종료
3. **5초 이내에 AI 플레이어 #2가 자동으로 행동 시작**
4. 백엔드 로그에 AI 행동 로그 출력 확인

## 예상 로그
```
🔍 AI 턴 체크: 1개 발견
🎯 AI 턴 발견: [ '똑똑한 로봇 (게임 xxx-xxx-xxx)' ]
🤖 AI 턴 실행 시작: 똑똑한 로봇 (게임 xxx-xxx-xxx, 플레이어 yyy-yyy-yyy)
=== TurnService.move 호출 ===
🤖 AI 이동 결정: 1 → 2
🤖 AI 행동 결정: 2번 (위치 2)
✅ AI 턴 실행 완료: 똑똑한 로봇
```

## 주의사항
- **기존 게임의 AI 플레이어는 마이그레이션 SQL로 자동 업데이트됨**
- **새로 생성되는 AI 플레이어는 자동으로 `is_ai = true` 설정됨**
- AIScheduler는 5초마다 체크하므로 최대 5초 지연 가능
