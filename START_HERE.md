# 🌙 열네 밤의 꿈 - 시작 가이드

## 🎯 지금 바로 시작하기 (10분)

### ✅ 준비물
- Node.js 20 이상
- 인터넷 연결 (Supabase 사용)

---

## 📋 3단계로 시작하기

### 1️⃣ Supabase 설정 (5분)

1. **https://supabase.com** 접속 → 가입
2. **New Project** 클릭
   - Name: `boardgame-01`
   - Password: 강력한 비밀번호 (저장!)
   - Region: **Northeast Asia (Seoul)**
   - Plan: **Free**
3. **SQL Editor** → **New query**
4. `backend/src/db/schema.sql` 내용 복사 → 붙여넣기 → **Run**
5. **New query** → `backend/src/db/seedCards.sql` 내용 복사 → **Run**
6. **Settings** → **Database** → 연결 정보 복사

---

### 2️⃣ 백엔드 설정 (2분)

```bash
cd backend
npm install
```

`backend/.env` 파일 수정:
```env
PORT=4000

DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.xxxxxxxxxxxxx
DB_PASSWORD=your-password-here

CLIENT_URL=http://localhost:3000
```

실행:
```bash
npm run dev
```

✅ "Server running on port 4000" 확인

---

### 3️⃣ 프론트엔드 설정 (2분)

**새 터미널 열기**

```bash
cd frontend
npm install
npm run dev
```

✅ "Local: http://localhost:3000" 확인

---

## 🎮 게임 플레이

1. **http://localhost:3000** 접속
2. **방 만들기** 클릭
3. 닉네임 입력 → 방 생성
4. 방 코드를 친구에게 공유
5. **시작하기** 클릭
6. 게임 시작!

---

## 📚 상세 가이드

- **빠른 시작**: `SUPABASE_QUICK_START.md`
- **상세 설정**: `SUPABASE_SETUP.md`
- **문제 해결**: `DATABASE_ALTERNATIVES.md`
- **프론트엔드**: `FRONTEND_GUIDE.md`
- **개발 상태**: `DEVELOPMENT_STATUS.md`

---

## 🐛 문제 해결

### 백엔드가 시작되지 않음
```bash
# 연결 테스트
curl http://localhost:4000/health

# 에러 확인
# .env 파일의 DB 정보 재확인
```

### 프론트엔드가 시작되지 않음
```bash
# 포트 확인
netstat -ano | findstr :3000

# 백엔드 먼저 실행되었는지 확인
```

### Supabase 연결 오류
1. Supabase 대시보드에서 프로젝트 활성화 확인
2. 연결 정보 재확인
3. 비밀번호 정확히 입력

---

## 💡 팁

### 멀티플레이 테스트
- 브라우저 2개 탭 열기
- 첫 번째: 방 만들기
- 두 번째: 방 참여하기

### 개발 모드
- 파일 수정 시 자동 재시작
- 브라우저 자동 새로고침

### Supabase 대시보드
- **Table Editor**: 데이터 확인
- **SQL Editor**: 쿼리 실행
- **Logs**: 실시간 로그

---

## 🎯 완료!

모든 설정이 완료되었습니다!

**즐거운 게임 되세요!** 🌙✨

---

## 📞 도움말

- Supabase 문서: https://supabase.com/docs
- 프로젝트 이슈: GitHub Issues
- Discord: https://discord.supabase.com
