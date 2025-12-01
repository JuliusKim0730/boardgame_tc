# 🔧 Supabase 중복 에러 해결

## ❌ 에러 메시지
```
ERROR: 23505: duplicate key value violates unique constraint "cards_code_key"
DETAIL: Key (code)=(C1) already exists.
```

## 💡 원인
이미 카드 데이터가 존재하는 상태에서 다시 INSERT를 시도했기 때문입니다.

---

## ✅ 해결 방법 (3가지)

### 방법 1: 기존 데이터 삭제 후 재입력 (추천)

**Supabase SQL Editor에서 실행:**

```sql
-- 1단계: 기존 카드 데이터 삭제
TRUNCATE TABLE cards CASCADE;

-- 2단계: 카드 데이터 다시 입력
-- backend/src/db/seedCards.sql 내용 복사 → 붙여넣기 → Run
```

---

### 방법 2: 안전 버전 SQL 사용

**`backend/src/db/seedCards_safe.sql` 파일 사용:**

1. Supabase SQL Editor 열기
2. `backend/src/db/seedCards_safe.sql` 파일 내용 복사
3. 붙여넣기 후 **Run** 클릭

이 파일은 자동으로 기존 데이터를 삭제하고 새로 입력합니다.

---

### 방법 3: Table Editor에서 수동 삭제

1. Supabase 대시보드 → **Table Editor**
2. **cards** 테이블 선택
3. 모든 행 선택 → **Delete** 클릭
4. 확인 후 `backend/src/db/seedCards.sql` 다시 실행

---

## 🎯 권장 순서

### 1단계: 데이터 삭제
```sql
TRUNCATE TABLE cards CASCADE;
```

### 2단계: 확인
```sql
SELECT COUNT(*) FROM cards;
-- 결과: 0
```

### 3단계: 데이터 재입력
- `backend/src/db/seedCards.sql` 내용 복사
- SQL Editor에 붙여넣기
- **Run** 클릭

### 4단계: 확인
```sql
SELECT COUNT(*) FROM cards;
-- 결과: 107

SELECT type, COUNT(*) as count 
FROM cards 
GROUP BY type 
ORDER BY type;
```

**예상 결과:**
```
chance    | 20
freeplan  | 8
house     | 13
invest    | 16
joint     | 10
plan      | 40
travel    | 10
```

---

## 🔍 추가 확인 쿼리

### 카드 타입별 개수
```sql
SELECT 
  type,
  COUNT(*) as count
FROM cards
GROUP BY type
ORDER BY type;
```

### 특정 카드 확인
```sql
-- 찬스 카드 목록
SELECT code, name FROM cards WHERE type = 'chance' ORDER BY code;

-- 여행지 카드 목록
SELECT code, name FROM cards WHERE type = 'travel' ORDER BY code;
```

### 중복 코드 확인
```sql
SELECT code, COUNT(*) as count
FROM cards
GROUP BY code
HAVING COUNT(*) > 1;
-- 결과가 없어야 정상
```

---

## 💡 앞으로 중복 방지하기

### seedCards.sql 파일 수정됨
이제 `backend/src/db/seedCards.sql` 파일 시작 부분에 다음이 추가되었습니다:

```sql
-- 기존 카드 데이터 삭제 (중복 방지)
DELETE FROM cards;
```

다음부터는 그냥 실행하면 자동으로 기존 데이터를 삭제하고 새로 입력합니다.

---

## 🚨 주의사항

### CASCADE 옵션
```sql
TRUNCATE TABLE cards CASCADE;
```

이 명령은 `cards` 테이블과 관련된 모든 데이터를 삭제합니다:
- hands (손패)
- purchased (구매한 카드)
- decks (덱)

**개발 중에는 괜찮지만, 실제 게임 데이터가 있을 때는 주의하세요!**

### 안전한 삭제 (게임 데이터 보존)
게임 데이터를 보존하면서 카드만 업데이트하려면:

```sql
-- 1. 현재 게임이 없는지 확인
SELECT COUNT(*) FROM games WHERE status IN ('running', 'setting');
-- 결과가 0이어야 안전

-- 2. 카드만 삭제
DELETE FROM cards;

-- 3. 새 카드 데이터 입력
-- (seedCards.sql 실행)
```

---

## ✅ 완료 확인

모든 작업 후 다음 쿼리로 확인:

```sql
-- 총 카드 개수
SELECT COUNT(*) FROM cards;
-- 예상: 107

-- 타입별 개수
SELECT type, COUNT(*) 
FROM cards 
GROUP BY type 
ORDER BY type;

-- 중복 확인
SELECT code, COUNT(*) 
FROM cards 
GROUP BY code 
HAVING COUNT(*) > 1;
-- 결과 없음 = 정상
```

---

## 🎉 해결 완료!

이제 중복 에러 없이 카드 데이터가 정상적으로 입력되었습니다!

백엔드를 실행하고 게임을 시작하세요:

```bash
cd backend
npm run dev
```
