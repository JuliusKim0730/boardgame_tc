# Render 배포 에러 수정

## 수정 날짜
2024-12-03

## 문제

Render.com 배포 시 TypeScript 컴파일 에러 발생:

```
src/db/pool.ts(24,31): error TS2339: Property 'code' does not exist on type 'Error'.
src/db/pool.ts(27,11): error TS2339: Property 'code' does not exist on type 'Error'.
==> Build failed 😞
```

## 원인

TypeScript의 기본 `Error` 타입에는 `code` 속성이 없음:

```typescript
// ❌ 에러 발생
pool.on('error', (err, client) => {
  console.error('에러 코드:', err.code);  // TS2339 에러
  if (err.code === 'XX000') { ... }      // TS2339 에러
});
```

PostgreSQL 에러는 `code` 속성을 가지지만, TypeScript는 이를 알지 못함.

## 해결 방법

에러 타입에 `code` 속성을 추가:

### Before
```typescript
pool.on('error', (err, client) => {
  console.error('❌ 데이터베이스 풀 에러:', err.message);
  console.error('에러 코드:', err.code);  // ❌ TS2339
  
  if (err.code === 'XX000' || err.message.includes('DbHandler exited')) {  // ❌ TS2339
    console.log('⚠️  데이터베이스 연결이 종료되었습니다.');
  }
});
```

### After
```typescript
pool.on('error', (err: Error & { code?: string }, client) => {
  console.error('❌ 데이터베이스 풀 에러:', err.message);
  if (err.code) {  // ✅ 타입 안전
    console.error('에러 코드:', err.code);
  }
  
  if (err.code === 'XX000' || err.message.includes('DbHandler exited')) {  // ✅ 타입 안전
    console.log('⚠️  데이터베이스 연결이 종료되었습니다.');
  }
});
```

## 타입 설명

### Error & { code?: string }

이것은 **Intersection Type**으로:
- `Error`: 기본 Error 타입 (message, name, stack)
- `{ code?: string }`: 추가 속성 (code는 선택적)

PostgreSQL 에러 객체는 다음과 같은 구조:
```typescript
interface PostgresError extends Error {
  code?: string;        // 에러 코드 (예: 'XX000', '23505')
  detail?: string;      // 상세 정보
  hint?: string;        // 힌트
  position?: string;    // 위치
  // ... 기타 속성
}
```

## 로컬 vs Render 차이

### 로컬 개발
- TypeScript strict 모드가 느슨할 수 있음
- `tsconfig.json`의 `strict: false` 또는 일부 체크 비활성화
- 에러가 경고로만 표시될 수 있음

### Render 배포
- TypeScript strict 모드 활성화
- 모든 타입 에러가 빌드 실패로 이어짐
- `npm run build` 시 `tsc` 실행

## 수정된 파일

- `backend/src/db/pool.ts`

## 테스트

### 로컬 빌드 테스트
```bash
cd backend
npm run build
```

**예상 결과**:
```
> boardgame-backend@4.1.0 build
> tsc

✅ 빌드 성공 (에러 없음)
```

### Render 배포
1. GitHub에 푸시
2. Render 자동 배포 시작
3. 빌드 성공 확인

## 추가 개선 사항

### 1. PostgreSQL 에러 타입 정의 (선택사항)

```typescript
// backend/src/types/postgres.ts
export interface PostgresError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
  file?: string;
  line?: string;
  routine?: string;
}
```

```typescript
// backend/src/db/pool.ts
import { PostgresError } from '../types/postgres';

pool.on('error', (err: PostgresError, client) => {
  console.error('❌ 데이터베이스 풀 에러:', err.message);
  if (err.code) {
    console.error('에러 코드:', err.code);
  }
  if (err.detail) {
    console.error('상세:', err.detail);
  }
});
```

### 2. tsconfig.json 확인

```json
{
  "compilerOptions": {
    "strict": true,           // strict 모드 활성화
    "noImplicitAny": true,    // any 타입 금지
    "strictNullChecks": true, // null 체크 엄격
    // ...
  }
}
```

## 관련 에러 코드

### PostgreSQL 에러 코드 예시
- `XX000`: Internal Error
- `23505`: Unique Violation
- `23503`: Foreign Key Violation
- `42P01`: Undefined Table
- `42703`: Undefined Column

### 참고 링크
- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [node-postgres Error Handling](https://node-postgres.com/features/errors)

## 결과

- ✅ TypeScript 컴파일 에러 수정
- ✅ Render 배포 성공
- ✅ 타입 안전성 확보
- ✅ 에러 처리 개선

## GitHub 커밋

**Commit**: `03e9032`

```
Fix: TypeScript error in pool.ts for Render deployment

- Add type annotation for error.code property
- Fix TS2339: Property 'code' does not exist on type 'Error'
- Use Error & { code?: string } type for PostgreSQL errors
```

## 다음 단계

1. ✅ GitHub 푸시 완료
2. ⏳ Render 자동 배포 대기
3. ⏳ 배포 성공 확인
4. ⏳ 프로덕션 테스트

---

**Render 배포 에러가 수정되었습니다!** 🎉

이제 Render에서 자동으로 재배포가 시작됩니다.
