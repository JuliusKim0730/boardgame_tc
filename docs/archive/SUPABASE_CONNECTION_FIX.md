# 🔧 Supabase 연결 문제 해결

## 🎯 문제 원인

현재 `.env` 파일의 호스트 주소가 잘못되었습니다:
```
DB_HOST=db.xskaefoqkbwnhrpyptkl.supabase.co  ❌ 잘못됨
```

## ✅ 올바른 연결 정보 가져오기

### 1단계: Supabase 대시보드 접속
1. https://supabase.com 로그인
2. `boardgame-01` 프로젝트 선택

### 2단계: Database 설정 페이지
1. 왼쪽 메뉴에서 **⚙️ Settings** 클릭
2. **Database** 클릭

### 3단계: Connection String 확인
**"Connection string"** 섹션에서 **"URI"** 탭을 선택하면 다음과 같은 형식이 보입니다:

```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

또는 Direct connection:
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 4단계: 정확한 호스트 주소 확인

**Connection Pooler (권장):**
- Host: `aws-0-ap-northeast-2.pooler.supabase.com`
- Port: `6543`

**Direct Connection:**
- Host: `db.[PROJECT-REF].supabase.co`
- Port: `5432`

**중요:** `[PROJECT-REF]`는 프로젝트마다 다릅니다!

### 5단계: Database Password 확인/재설정

같은 페이지에서:
1. **"Database password"** 섹션 찾기
2. **"Reset Database Password"** 클릭
3. 새 비밀번호 생성 및 복사 (예: `MyNewPass123`)

---

## 📝 .env 파일 업데이트

`backend/.env` 파일을 다음과 같이 수정:

### 옵션 1: Connection Pooler (권장)
```env
PORT=4000

# Supabase Connection Pooler
DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xskaefoqkbwnhrpyptkl
DB_PASSWORD=[새로_재설정한_비밀번호]

CLIENT_URL=http://localhost:3000
```

### 옵션 2: Direct Connection
```env
PORT=4000

# Supabase Direct Connection
DB_HOST=db.xskaefoqkbwnhrpyptkl.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.xskaefoqkbwnhrpyptkl
DB_PASSWORD=[새로_재설정한_비밀번호]

CLIENT_URL=http://localhost:3000
```

---

## 🔍 정확한 정보 찾는 방법

### Supabase 대시보드에서:

1. **Settings → Database**
2. **Connection string** 섹션
3. **URI** 탭 선택
4. 전체 문자열 복사:

```
postgresql://postgres.xskaefoqkbwnhrpyptkl:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

이것을 분해하면:
- **User**: `postgres.xskaefoqkbwnhrpyptkl`
- **Host**: `aws-0-ap-northeast-2.pooler.supabase.com`
- **Port**: `6543`
- **Database**: `postgres`

---

## ⚠️ 주의사항

### 1. 프로젝트 상태 확인
- Supabase 대시보드에서 프로젝트가 **"Active"** 상태인지 확인
- **"Paused"** 상태면 재시작 필요

### 2. 비밀번호 특수문자
현재 비밀번호 `9orkL1p59FjOnZQd`는 괜찮지만, 연결 안 되면 간단한 비밀번호로 재설정:
```
MyPassword123
```

### 3. 지역(Region) 확인
Connection Pooler 호스트는 지역에 따라 다릅니다:
- 서울: `aws-0-ap-northeast-2.pooler.supabase.com`
- 싱가포르: `aws-0-ap-southeast-1.pooler.supabase.com`
- 미국: `aws-0-us-east-1.pooler.supabase.com`

---

## 🧪 테스트 방법

### 1. .env 파일 업데이트 후:
```bash
cd backend
node test-db-connection.js
```

### 2. 성공 메시지:
```
✅ 데이터베이스 연결 성공!
⏰ 서버 시간: 2024-12-01 ...
📋 테이블 목록:
  (테이블 없음 - 스키마 생성 필요)
```

### 3. 여전히 실패하면:
Supabase 대시보드에서 **Connection string** 전체를 복사해서 알려주세요.

---

## 📸 스크린샷 위치

Supabase 대시보드에서 확인할 위치:
1. **Settings** (왼쪽 메뉴 하단)
2. **Database** (설정 메뉴 중)
3. **Connection string** (페이지 상단)
4. **Connection pooler** (페이지 중간)

---

## 🎯 체크리스트

- [ ] Supabase 대시보드 → Settings → Database 접속
- [ ] Connection string (URI) 확인
- [ ] Connection Pooler 정보 확인
- [ ] Database password 재설정
- [ ] .env 파일 업데이트
- [ ] test-db-connection.js 실행
- [ ] 연결 성공 확인

---

**다음 단계:** 
Supabase 대시보드의 **Settings → Database** 페이지에서 **Connection string**을 복사해서 알려주시면 정확한 설정을 도와드리겠습니다!
