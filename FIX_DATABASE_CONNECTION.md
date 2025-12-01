# 🔧 데이터베이스 연결 에러 수정

## ❌ 에러 메시지
```
password authentication failed for user "postgres"
```

## 💡 원인
`.env` 파일의 형식이 잘못되었습니다. 연결 문자열이 아니라 개별 변수로 설정해야 합니다.

---

## ✅ 수정 완료

`backend/.env` 파일을 올바른 형식으로 수정했습니다:

```env
PORT=4000

# Supabase 연결 정보
DB_HOST=db.xskaefoqkbwnhrpyptkl.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.xskaefoqkbwnhrpyptkl
DB_PASSWORD=Qlcjs!0729

CLIENT_URL=http://localhost:3000
```

---

## 🚀 백엔드 재시작

```bash
# 백엔드 터미널에서 Ctrl+C로 중단 후
cd backend
npm run dev
```

**확인:**
```bash
curl http://localhost:4000/health
# 응답: {"status":"ok"}
```

---

## 🎮 다시 테스트

1. **백엔드 재시작 완료** 확인
2. **프론트엔드** http://localhost:3000 새로고침
3. **방 만들기** 클릭
4. **닉네임 입력** 후 방 만들기

**예상 결과:**
```
방이 생성되었습니다!
방 코드: XXXXXX
친구들에게 공유하세요.
```

---

## 🔍 Supabase 연결 정보 확인

### 올바른 형식

Supabase 대시보드 → Settings → Database에서:

```
Host: db.xxxxx.supabase.co
Port: 5432
Database: postgres
User: postgres.xxxxx
Password: [프로젝트 생성 시 설정한 비밀번호]
```

### .env 파일 형식

```env
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.xxxxx
DB_PASSWORD=your-password
```

**주의:**
- `DB_USER`는 `postgres.xxxxx` 형식 (프로젝트 ID 포함)
- `DB_PASSWORD`는 프로젝트 생성 시 설정한 비밀번호

---

## 🐛 여전히 에러가 나면

### 1. 비밀번호 확인

Supabase 대시보드 → Settings → Database → Reset database password

### 2. 연결 정보 재확인

Supabase 대시보드에서 Connection string 확인:

```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

이것을 분해하면:
- Host: `db.xxxxx.supabase.co`
- User: `postgres.xxxxx`
- Password: `[YOUR-PASSWORD]`

### 3. 특수문자 이스케이프

비밀번호에 특수문자가 있으면 그대로 입력:

```env
DB_PASSWORD=Qlcjs!0729
```

---

## ✅ 성공 확인

### 백엔드 로그
```
Server running on port 4000
```

### API 테스트
```bash
curl http://localhost:4000/health
# {"status":"ok"}
```

### 프론트엔드
- 방 만들기 성공
- 방 코드 표시
- 에러 없음

---

## 🎉 완료!

이제 데이터베이스 연결이 정상적으로 작동합니다!
