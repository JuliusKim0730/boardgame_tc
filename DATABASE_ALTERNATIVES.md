# 데이터베이스 대안 가이드

## 🎯 추천 순위

### ⭐⭐⭐ 1순위: Supabase (강력 추천)
**PostgreSQL 기반 + Firebase 같은 편의성**

#### 장점
- ✅ PostgreSQL 그대로 사용 (코드 수정 최소)
- ✅ 무료 티어 제공 (500MB DB, 2GB 파일 저장)
- ✅ 실시간 구독 기능 (WebSocket 대체 가능)
- ✅ 자동 백업
- ✅ REST API 자동 생성
- ✅ 인증 기능 내장

#### 설정 방법
```bash
# 1. Supabase 가입 (https://supabase.com)
# 2. 새 프로젝트 생성
# 3. SQL Editor에서 스키마 실행

# backend/.env 수정
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password
```

#### 코드 수정
**거의 없음!** 현재 PostgreSQL 코드 그대로 사용 가능

---

### ⭐⭐ 2순위: Railway / Render (PostgreSQL 호스팅)
**무료 PostgreSQL 호스팅**

#### Railway
- ✅ 무료 티어: $5 크레딧/월
- ✅ PostgreSQL 원클릭 배포
- ✅ 자동 백업
- ✅ 간단한 설정

```bash
# 1. Railway 가입 (https://railway.app)
# 2. New Project → PostgreSQL
# 3. 연결 정보 복사

# backend/.env
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=6543
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=xxx
```

#### Render
- ✅ 무료 티어: 90일 후 삭제
- ✅ PostgreSQL 제공
- ✅ 자동 SSL

---

### ⭐ 3순위: ElephantSQL (PostgreSQL 전용)
**PostgreSQL 무료 호스팅**

- ✅ 무료 티어: 20MB (작은 프로젝트용)
- ✅ 설정 간단
- ❌ 용량 제한 작음

---

### 4순위: Firebase Firestore (비추천)
**NoSQL - 대규모 코드 수정 필요**

#### 필요한 변경사항
1. **모든 SQL 쿼리 재작성** (80% 코드)
2. **JOIN 로직을 애플리케이션 레벨로 이동**
3. **트랜잭션 로직 재설계**
4. **점수 계산 로직 재구현**

#### 예상 작업량
- 20-30시간 추가 개발
- 복잡도 증가
- 성능 저하 가능성

---

## 🚀 가장 빠른 방법: Supabase

### 1단계: Supabase 프로젝트 생성
1. https://supabase.com 접속
2. "Start your project" 클릭
3. 프로젝트 이름 입력
4. 데이터베이스 비밀번호 설정
5. 리전 선택 (Northeast Asia - Seoul 추천)

### 2단계: 스키마 생성
1. Supabase 대시보드 → SQL Editor
2. `backend/src/db/schema.sql` 내용 복사
3. "Run" 클릭

### 3단계: 카드 데이터 시드
1. SQL Editor에서 새 쿼리
2. `backend/src/db/seedCards.sql` 내용 복사
3. "Run" 클릭

### 4단계: 연결 정보 설정
1. Settings → Database
2. Connection string 복사
3. `backend/.env` 수정

```env
# Supabase 연결 정보
DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password-here
```

### 5단계: 실행
```bash
cd backend
npm run dev
```

**완료!** 코드 수정 없이 바로 작동합니다.

---

## 💰 비용 비교

| 서비스 | 무료 티어 | 제한 | 추천도 |
|--------|----------|------|--------|
| **Supabase** | 500MB DB, 무제한 API | 2개 프로젝트 | ⭐⭐⭐⭐⭐ |
| **Railway** | $5/월 크레딧 | 사용량 기반 | ⭐⭐⭐⭐ |
| **Render** | 90일 무료 | 이후 삭제 | ⭐⭐⭐ |
| **ElephantSQL** | 20MB | 용량 작음 | ⭐⭐ |
| **Firebase** | 1GB 저장 | 코드 재작성 | ⭐ |

---

## 🔧 Supabase 추가 기능 활용

### 실시간 구독 (WebSocket 대체)
```typescript
// 현재: Socket.io
socket.on('turn-started', callback);

// Supabase로 변경 가능
supabase
  .channel('game-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'games'
  }, callback)
  .subscribe();
```

### 인증 추가
```typescript
// 간단한 이메일 인증
const { user } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
});
```

### 파일 저장 (프로필 이미지 등)
```typescript
const { data } = await supabase.storage
  .from('avatars')
  .upload('public/avatar.png', file);
```

---

## 📊 권장 사항

### 개발/테스트 단계
**로컬 PostgreSQL** (현재 방식)
- 빠른 개발
- 무료
- 완전한 제어

### 배포/프로덕션 단계
**Supabase** (강력 추천)
- 무료 시작
- 자동 확장
- 관리 편의성
- 추가 기능 (인증, 저장소, 실시간)

---

## 🎯 결론

**Firebase Firestore는 비추천합니다.**

대신 다음 순서로 고려하세요:

1. **개발 중**: 로컬 PostgreSQL (현재)
2. **배포 시**: Supabase (무료 + PostgreSQL)
3. **대안**: Railway, Render

**Supabase를 사용하면:**
- ✅ 코드 수정 0%
- ✅ 5분 안에 설정 완료
- ✅ 무료로 시작
- ✅ 나중에 확장 가능

---

## 🚀 지금 바로 시작하기

### Option 1: 로컬 PostgreSQL (추천 - 개발용)
```bash
# Windows
# PostgreSQL 설치: https://www.postgresql.org/download/windows/

# Mac
brew install postgresql
brew services start postgresql

# 데이터베이스 생성
createdb boardgame
psql -d boardgame -f backend/src/db/schema.sql
psql -d boardgame -f backend/src/db/seedCards.sql
```

### Option 2: Supabase (추천 - 배포용)
1. https://supabase.com 가입
2. 프로젝트 생성 (2분)
3. SQL 실행 (1분)
4. .env 수정 (1분)
5. 완료!

---

## ❓ FAQ

**Q: Firebase를 꼭 써야 하나요?**
A: 아니요. PostgreSQL이 이 프로젝트에 훨씬 적합합니다.

**Q: Supabase는 안전한가요?**
A: 네. 수백만 개의 프로젝트가 사용 중이며, PostgreSQL 기반이라 안정적입니다.

**Q: 나중에 변경할 수 있나요?**
A: 네. PostgreSQL 기반이라 언제든 다른 PostgreSQL 호스팅으로 이동 가능합니다.

**Q: 비용이 얼마나 드나요?**
A: 무료 티어로 충분합니다. 사용자가 많아지면 월 $25부터 시작.

**Q: 로컬 개발은 어떻게 하나요?**
A: 로컬 PostgreSQL 사용 (무료) 또는 Supabase 개발 프로젝트 사용.
