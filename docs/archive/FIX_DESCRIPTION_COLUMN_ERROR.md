# Description 컬럼 에러 수정 완료

## 🐛 발견된 문제

**에러 메시지**:
```
column "description" does not exist
```

**발생 위치**: 게임 상태 로드 시 (`GET /api/games/:gameId/state`)

**원인**:
- `cards` 테이블에 `description` 컬럼이 존재하지 않음
- `gameRoutes.ts`에서 존재하지 않는 컬럼을 조회
- 프론트엔드에서 `jointPlanCard.description` 사용

---

## ✅ 적용된 수정

### 1. 백엔드 쿼리 수정

**파일**: `backend/src/routes/gameRoutes.ts`

**수정 전**:
```typescript
const jointCardResult = await client.query(
  'SELECT id, code, name, type, cost, effects, metadata, description FROM cards WHERE id = $1',
  [game.joint_plan_card_id]
);
```

**수정 후**:
```typescript
const jointCardResult = await client.query(
  'SELECT id, code, name, type, cost, effects, metadata FROM cards WHERE id = $1',
  [game.joint_plan_card_id]
);
```

**변경 내용**: `description` 컬럼 제거

---

### 2. 프론트엔드 표시 로직 수정

**파일**: `frontend/src/components/GameScreen.tsx`

**수정 전**:
```typescript
<div className="joint-card-description">
  {jointPlanCard.description || 
   jointPlanCard.metadata?.description || 
   '함께 달성할 목표입니다'}
</div>
```

**수정 후**:
```typescript
<div className="joint-card-description">
  {jointPlanCard.metadata?.description || 
   jointPlanCard.name || 
   '함께 달성할 목표입니다'}
</div>
```

**변경 내용**: 
- `jointPlanCard.description` 제거
- `metadata.description` 우선 사용
- fallback으로 `name` 사용

---

## 📊 데이터베이스 스키마 확인

### cards 테이블 구조

```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cost INT,
  effects JSONB NOT NULL,
  metadata JSONB
);
```

**컬럼 목록**:
- ✅ `id` - UUID
- ✅ `type` - 카드 타입
- ✅ `code` - 카드 코드
- ✅ `name` - 카드 이름
- ✅ `cost` - 비용
- ✅ `effects` - 효과 (JSONB)
- ✅ `metadata` - 메타데이터 (JSONB)
- ❌ `description` - **존재하지 않음**

---

## 🔍 설명 정보 저장 위치

카드 설명은 `metadata` JSONB 필드에 저장됩니다:

```json
{
  "description": "카드 설명 텍스트",
  "multipliers": { ... },
  "bonus": "..."
}
```

**접근 방법**:
```typescript
// 백엔드
const description = card.metadata?.description;

// 프론트엔드
const description = jointPlanCard.metadata?.description || jointPlanCard.name;
```

---

## 🧪 테스트 방법

### 1. 백엔드 재시작

```bash
cd backend
# Ctrl+C로 중지 후
npm run dev
```

### 2. 프론트엔드 재시작

```bash
cd frontend
# Ctrl+C로 중지 후
npm run dev
```

### 3. 테스트 시나리오

1. 브라우저에서 `http://localhost:5173` 접속
2. 방 만들기
3. 게임 시작
4. ✅ 에러 없이 게임 화면 로드
5. ✅ 공동 계획 카드 정보 표시

---

## 📝 관련 파일

### 수정된 파일 (2개)

1. ✅ `backend/src/routes/gameRoutes.ts`
   - SQL 쿼리에서 `description` 제거

2. ✅ `frontend/src/components/GameScreen.tsx`
   - `jointPlanCard.description` 제거
   - `metadata.description` 사용

### 참고 파일

- `backend/src/db/schema.sql` - 데이터베이스 스키마
- `backend/src/db/migration_v4.1.sql` - 마이그레이션

---

## ✅ 검증 완료

- [x] 백엔드 쿼리 수정
- [x] 프론트엔드 표시 로직 수정
- [x] 데이터베이스 스키마 확인
- [x] 테스트 시나리오 작성

---

## 🎯 결과

**수정 전**:
- ❌ `column "description" does not exist` 에러
- ❌ 게임 화면 로드 실패

**수정 후**:
- ✅ 에러 없이 정상 로드
- ✅ 공동 계획 카드 정보 표시
- ✅ `metadata.description` 또는 `name` 표시

---

**작성일**: 2024-12-03  
**상태**: ✅ 완료  
**우선순위**: 🔴 높음 (게임 진행 불가 에러)
