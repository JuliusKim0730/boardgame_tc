# 슬롯 시스템 수정 가이드

## 문제 상황
1. ❌ "column p.created_at does not exist" 에러
2. ❌ 방장이 1번 슬롯에 표시되지 않음
3. ❌ 새 참가자가 2번 슬롯에 추가되지 않음
4. ❌ AI 추가 시 400 에러

## 해결 방법

### 1단계: 데이터베이스 마이그레이션

Supabase SQL Editor에서 다음 쿼리를 실행하세요:

```sql
-- players 테이블에 created_at 컬럼 추가
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 기존 데이터에 created_at 설정
UPDATE players 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_players_room_created ON players(room_id, created_at);

-- 확인
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'players' 
AND column_name = 'created_at';
```

### 2단계: 백엔드 재시작

```bash
cd backend
npm run dev
```

### 3단계: 프론트엔드 재시작

```bash
cd frontend
npm run dev
```

### 4단계: 테스트

1. 브라우저에서 `localhost:3000` 접속
2. 방 생성 → 방장이 1번 슬롯에 표시되는지 확인
3. 다른 브라우저/시크릿 모드로 방 참가 → 2번 슬롯에 표시되는지 확인
4. 방장이 3번 슬롯에 AI 추가 → 정상 작동하는지 확인

## 수정된 코드

### RoomService.ts
- `getRoomState()`: created_at 컬럼 존재 여부 확인 후 동적으로 ORDER BY 설정
- `updateSlot()`: created_at 컬럼 존재 여부 확인 후 동적으로 INSERT 쿼리 실행
- Fallback 로직 추가: created_at이 없으면 id 기준으로 정렬

### 주요 변경사항
```typescript
// created_at 컬럼 존재 여부 확인
const columnCheck = await pool.query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'players' AND column_name = 'created_at'
`);

const hasCreatedAt = columnCheck.rows.length > 0;
const orderBy = hasCreatedAt ? 'p.created_at' : 'p.id';

// 동적 ORDER BY
ORDER BY ${orderBy}
```

## 예상 결과

### 방 생성 후
```
슬롯 1: 👑 플레이어A (방장)
슬롯 2: ➕ 빈 슬롯
슬롯 3: ➕ 빈 슬롯
슬롯 4: ➕ 빈 슬롯
슬롯 5: ➕ 빈 슬롯
```

### 참가자 입장 후
```
슬롯 1: 👑 플레이어A (방장)
슬롯 2: 👤 플레이어B
슬롯 3: ➕ 빈 슬롯
슬롯 4: ➕ 빈 슬롯
슬롯 5: ➕ 빈 슬롯
```

### AI 추가 후
```
슬롯 1: 👑 플레이어A (방장)
슬롯 2: 👤 플레이어B
슬롯 3: 🤖 똑똑한로봇42
슬롯 4: ➕ 빈 슬롯
슬롯 5: ➕ 빈 슬롯
```

## 문제 해결

### 여전히 에러가 발생하면?

1. **데이터베이스 연결 확인**
   ```bash
   # backend/.env 파일 확인
   DATABASE_URL=postgresql://...
   ```

2. **기존 방 삭제**
   ```sql
   -- Supabase SQL Editor
   DELETE FROM rooms WHERE status = 'waiting';
   ```

3. **캐시 클리어**
   - 브라우저 개발자 도구 → Application → Clear storage
   - 백엔드/프론트엔드 재시작

4. **로그 확인**
   - 백엔드 터미널에서 에러 메시지 확인
   - 브라우저 콘솔에서 에러 메시지 확인

## 다음 단계

✅ 데이터베이스 마이그레이션 완료
✅ 백엔드 코드 수정 완료
✅ 프론트엔드 코드 수정 완료
⏳ 로컬 테스트 진행
⏳ 배포 환경 업데이트
