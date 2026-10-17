# 🔐 Supabase 연결 정보 정확히 가져오기

## 📋 단계별 가이드

### 1단계: Supabase 대시보드 접속

1. **https://supabase.com** 접속
2. 로그인
3. 프로젝트 선택 (boardgame-01 또는 해당 프로젝트)

---

### 2단계: Database 설정 페이지

1. 왼쪽 메뉴에서 **⚙️ Settings** 클릭
2. **Database** 클릭

---

### 3단계: Connection String 확인

**Connection string** 섹션에서:

1. **URI** 탭 선택
2. 다음과 같은 문자열이 보입니다:

```
postgresql://postgres.xskaefoqkbwnhrpyptkl:[YOUR-PASSWORD]@db.xskaefoqkbwnhrpyptkl.supabase.co:5432/postgres
```

---

### 4단계: 비밀번호 재설정 (필수!)

**현재 비밀번호가 틀린 것 같으니 재설정합니다:**

1. 같은 페이지에서 아래로 스크롤
2. **"Reset database password"** 버튼 클릭
3. **새 비밀번호 생성**
   - 특수문자 없이: `MyNewPassword123`
   - 또는 자동 생성된 비밀번호 사용
4. **비밀번호 복사** (중요!)

---

### 5단계: Connection Pooler 정보 확인 (추천)

같은 페이지에서:

1. **Connection Pooler** 섹션 찾기
2. **Mode: Transaction** 선택
3. 다음 정보 확인:

```
Host: aws-0-ap-northeast-2.pooler.supabase.com
Port: 6543
Database: postgres
User: postgres.xskaefoqkbwnhrpyptkl
Password: [방금 재설정한 비밀번호]
```

---

### 6단계: .env 파일 업데이트

`backend/.env` 파일을 다음과 같이 수정:

```env
PORT=4000

# Supabase 연결 정보 (Connection Pooler 사용)
DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xskaefoqkbwnhrpyptkl
DB_PASSWORD=MyNewPassword123

CLIENT_URL=http://localhost:3000
```

**주의:**
- `DB_HOST`는 `pooler.supabase.com`으로 끝남
- `DB_PORT`는 `6543` (Direct는 5432)
- `DB_USER`는 `postgres.xxxxx` 형식
- `DB_PASSWORD`는 **방금 재설정한 비밀번호**

---

### 7단계: 백엔드 재시작

```bash
# 백엔드 터미널에서 Ctrl+C로 완전히 중단
cd backend
npm run dev
```

---

### 8단계: 테스트

```bash
curl http://localhost:4000/health
```

**성공:** `{"status":"ok"}`

---

## 🔍 정확한 정보 확인 방법

### Connection String에서 정보 추출

예시:
```
postgresql://postgres.abc123xyz:[YOUR-PASSWORD]@db.abc123xyz.supabase.co:5432/postgres
```

이것을 분해하면:

```env
# Direct Connection
DB_HOST=db.abc123xyz.supabase.co
DB_PORT=5432
DB_USER=postgres.abc123xyz
DB_PASSWORD=[YOUR-PASSWORD]
```

### Connection Pooler 정보

Supabase 대시보드에서 명시적으로 표시됩니다:

```
Host: aws-0-ap-northeast-2.pooler.supabase.com
Port: 6543
User: postgres.abc123xyz
```

---

## ⚠️ 흔한 실수

### 1. 비밀번호에 특수문자
```env
# 잘못된 예
DB_PASSWORD=Qlcjs!0729

# 특수문자가 문제를 일으킬 수 있음
# 간단한 비밀번호 사용 권장
DB_PASSWORD=MyPassword123
```

### 2. User 이름 형식
```env
# 잘못됨
DB_USER=postgres

# 올바름
DB_USER=postgres.xskaefoqkbwnhrpyptkl
```

### 3. Host 주소
```env
# Direct Connection
DB_HOST=db.xxxxx.supabase.co

# Connection Pooler (추천)
DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
```

---

## 📸 스크린샷 참고

Supabase 대시보드에서 다음을 확인:

1. **Settings → Database**
2. **Connection string** 섹션
3. **Connection Pooler** 섹션
4. **Reset database password** 버튼

---

## 🎯 체크리스트

- [ ] Supabase 대시보드 접속
- [ ] Settings → Database 페이지 열기
- [ ] 비밀번호 재설정 (Reset database password)
- [ ] 새 비밀번호 복사
- [ ] Connection Pooler 정보 확인
- [ ] .env 파일 업데이트
- [ ] 백엔드 완전 재시작
- [ ] curl 테스트 성공

---

## 💡 확실한 방법

### 1. 비밀번호를 간단하게
```
MyPassword123
```

### 2. Connection Pooler 사용
```env
DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
DB_PORT=6543
```

### 3. 정확한 User 이름
Supabase에서 복사한 그대로 사용

---

## 🆘 여전히 안 되면

다음 정보를 확인:

1. **Supabase 프로젝트 상태**
   - "Active" 상태인지 확인
   - "Paused" 상태면 재시작

2. **정확한 연결 정보**
   - Connection string 전체 복사
   - 여기에 붙여넣기

3. **비밀번호 재설정 확인**
   - 재설정 후 새 비밀번호 사용
   - 이전 비밀번호는 작동 안 함
