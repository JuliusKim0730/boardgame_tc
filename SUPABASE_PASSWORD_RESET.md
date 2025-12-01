# 🔐 Supabase 비밀번호 문제 해결

## ❌ 여전히 에러 발생
```
password authentication failed for user "postgres"
```

## 💡 가능한 원인

1. **비밀번호가 틀림**
2. **특수문자 문제**
3. **Supabase 프로젝트가 일시 중지됨**
4. **연결 풀링 설정 문제**

---

## ✅ 해결 방법

### 1단계: Supabase 비밀번호 재설정

1. **Supabase 대시보드** 접속: https://supabase.com
2. 프로젝트 선택
3. **Settings** → **Database**
4. **"Reset database password"** 클릭
5. 새 비밀번호 생성 (특수문자 없이 간단하게)
   - 예: `MyPassword123`
6. 비밀번호 복사

### 2단계: .env 파일 업데이트

`backend/.env`:
```env
PORT=4000

# Supabase 연결 정보
DB_HOST=db.xskaefoqkbwnhrpyptkl.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.xskaefoqkbwnhrpyptkl
DB_PASSWORD=새로운비밀번호여기

CLIENT_URL=http://localhost:3000
```

### 3단계: 백엔드 재시작

```bash
# 백엔드 터미널에서 Ctrl+C로 완전히 중단
cd backend
npm run dev
```

---

## 🔍 연결 정보 확인

### Supabase에서 정확한 정보 가져오기

1. **Settings** → **Database**
2. **Connection string** 섹션
3. **URI** 탭 선택
4. 다음과 같은 형식의 문자열 확인:

```
postgresql://postgres.xskaefoqkbwnhrpyptkl:[YOUR-PASSWORD]@db.xskaefoqkbwnhrpyptkl.supabase.co:5432/postgres
```

### 정보 분해

```
Host: db.xskaefoqkbwnhrpyptkl.supabase.co
Port: 5432
Database: postgres
User: postgres.xskaefoqkbwnhrpyptkl
Password: [YOUR-PASSWORD]
```

---

## 🔧 대안: Connection Pooler 사용

Supabase는 두 가지 연결 방식을 제공합니다:

### 방법 1: Direct Connection (현재)
```env
DB_HOST=db.xskaefoqkbwnhrpyptkl.supabase.co
DB_PORT=5432
```

### 방법 2: Connection Pooler (추천)
```env
DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
DB_PORT=6543
```

**Connection Pooler 사용 시:**

1. Supabase → Settings → Database
2. **Connection Pooler** 섹션 찾기
3. **Transaction mode** 선택
4. Host와 Port 복사

`backend/.env`:
```env
PORT=4000

# Supabase 연결 정보 (Connection Pooler)
DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xskaefoqkbwnhrpyptkl
DB_PASSWORD=새로운비밀번호

CLIENT_URL=http://localhost:3000
```

---

## 🧪 연결 테스트

### 방법 1: psql 명령어 (PostgreSQL 설치 시)

```bash
psql "postgresql://postgres.xskaefoqkbwnhrpyptkl:새로운비밀번호@db.xskaefoqkbwnhrpyptkl.supabase.co:5432/postgres"
```

### 방법 2: Node.js 스크립트

`backend/test-db.js` 생성:
```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ 연결 실패:', err.message);
  } else {
    console.log('✅ 연결 성공:', res.rows[0]);
  }
  pool.end();
});
```

실행:
```bash
cd backend
node test-db.js
```

---

## 📋 체크리스트

- [ ] Supabase 프로젝트가 활성화되어 있음
- [ ] 비밀번호를 재설정함
- [ ] 새 비밀번호를 `.env`에 정확히 입력함
- [ ] 백엔드를 완전히 재시작함 (Ctrl+C 후 다시 실행)
- [ ] 특수문자 없는 간단한 비밀번호 사용
- [ ] Connection Pooler 사용 시도

---

## 🎯 빠른 해결 단계

### 1. 비밀번호 재설정
Supabase → Settings → Database → Reset database password

### 2. 간단한 비밀번호 사용
예: `Password123` (특수문자 없이)

### 3. .env 업데이트
```env
DB_PASSWORD=Password123
```

### 4. 백엔드 완전 재시작
```bash
# Ctrl+C로 중단
cd backend
npm run dev
```

### 5. 테스트
```bash
curl http://localhost:4000/health
```

---

## 🆘 여전히 안 되면

다음 정보를 확인해주세요:

1. **Supabase 프로젝트 상태**
   - 대시보드에서 "Paused" 상태가 아닌지 확인
   - 무료 티어 제한 초과 여부 확인

2. **백엔드 로그**
   - 터미널의 전체 에러 메시지
   - 정확한 에러 내용

3. **연결 정보**
   - Supabase에서 복사한 정확한 Host
   - User 이름 (postgres.xxxxx 형식)
   - 새로 설정한 비밀번호

---

## 💡 임시 해결책

Supabase 연결이 계속 안 되면, 로컬 PostgreSQL을 사용하세요:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=boardgame
DB_USER=postgres
DB_PASSWORD=postgres
```

로컬 PostgreSQL 설치 및 설정:
```bash
# 데이터베이스 생성
createdb boardgame

# 스키마 생성
psql -d boardgame -f backend/src/db/schema.sql

# 카드 데이터 시드
psql -d boardgame -f backend/src/db/seedCards.sql
```
