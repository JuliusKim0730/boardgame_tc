# 🚀 Supabase 빠른 시작 (5분)

## 📋 체크리스트

- [ ] Supabase 계정 생성
- [ ] 프로젝트 생성
- [ ] 스키마 실행
- [ ] 카드 데이터 시드
- [ ] 연결 정보 설정
- [ ] 테스트

---

## 1️⃣ Supabase 계정 & 프로젝트 생성

### 1. 계정 생성
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인

### 2. 프로젝트 생성
1. "New Project" 클릭
2. 정보 입력:
   ```
   Name: boardgame-01
   Database Password: [강력한 비밀번호 - 저장 필수!]
   Region: Northeast Asia (Seoul)
   Plan: Free
   ```
3. "Create new project" 클릭
4. 1-2분 대기

---

## 2️⃣ 데이터베이스 설정

### 1. 스키마 생성
1. 왼쪽 메뉴 → **SQL Editor**
2. **New query** 클릭
3. `backend/src/db/schema.sql` 파일 내용 복사
4. 붙여넣기 후 **Run** 클릭
5. "Success" 확인

### 2. 카드 데이터 시드
1. **New query** 클릭
2. `backend/src/db/seedCards.sql` 파일 내용 복사
3. 붙여넣기 후 **Run** 클릭
4. "Success" 확인

### 3. 데이터 확인
```sql
SELECT COUNT(*) FROM cards;
-- 결과: 107
```

---

## 3️⃣ 연결 정보 설정

### 1. Supabase에서 정보 가져오기
1. 왼쪽 메뉴 → **Settings** → **Database**
2. "Connection string" 섹션 확인
3. 다음 정보 복사:
   - **Host**: `aws-0-ap-northeast-2.pooler.supabase.com`
   - **Database**: `postgres`
   - **User**: `postgres.xxxxxxxxxxxxx`
   - **Password**: (프로젝트 생성 시 설정한 비밀번호)

### 2. 백엔드 .env 파일 수정
`backend/.env` 파일을 열고 수정:

```env
PORT=4000

# Supabase 연결 정보
DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.xxxxxxxxxxxxx
DB_PASSWORD=your-password-here

CLIENT_URL=http://localhost:3000
```

**중요**: 실제 값으로 교체하세요!

---

## 4️⃣ 실행 및 테스트

### 1. 백엔드 실행
```bash
cd backend
npm install  # 처음 한 번만
npm run dev
```

### 2. 연결 테스트
```bash
curl http://localhost:4000/health
```

**성공 응답:**
```json
{"status":"ok"}
```

### 3. 프론트엔드 실행 (새 터미널)
```bash
cd frontend
npm install  # 처음 한 번만
npm run dev
```

### 4. 브라우저 접속
http://localhost:3000

---

## ✅ 완료!

이제 Supabase를 사용하여 게임을 플레이할 수 있습니다!

---

## 🐛 문제 해결

### "connect ECONNREFUSED" 오류
**원인**: 연결 정보가 잘못됨

**해결**:
1. `.env` 파일의 정보 재확인
2. Supabase 대시보드에서 정보 다시 복사
3. 비밀번호 정확히 입력

### "relation does not exist" 오류
**원인**: 스키마가 생성되지 않음

**해결**:
1. Supabase SQL Editor에서 스키마 다시 실행
2. 카드 데이터 다시 시드

### "password authentication failed" 오류
**원인**: 비밀번호가 틀림

**해결**:
1. Supabase 대시보드 → Settings → Database
2. "Reset database password" 클릭
3. 새 비밀번호로 `.env` 업데이트

---

## 💡 유용한 SQL 쿼리

### 데이터 확인
```sql
-- 카드 개수
SELECT COUNT(*) FROM cards;

-- 카드 목록 (처음 10개)
SELECT * FROM cards LIMIT 10;

-- 방 목록
SELECT * FROM rooms;

-- 게임 목록
SELECT * FROM games;
```

### 데이터 초기화 (개발 중)
```sql
-- 모든 게임 데이터 삭제 (카드는 유지)
TRUNCATE TABLE 
  event_logs, game_results, joint_plan_contributions, 
  actions, turns, purchased, hands, decks, 
  player_states, players, games, rooms, users
CASCADE;
```

---

## 📊 Supabase 대시보드 활용

### Table Editor
- 데이터 직접 확인 및 수정
- 테이블 구조 확인

### SQL Editor
- 쿼리 실행
- 스크립트 저장

### Logs
- 실시간 쿼리 로그
- 에러 확인

### Database
- 연결 정보
- 백업 설정
- 사용량 확인

---

## 🎯 다음 단계

1. ✅ Supabase 설정 완료
2. ✅ 백엔드 실행 성공
3. ✅ 프론트엔드 실행 성공
4. 🎮 게임 플레이!

---

## 📞 도움이 필요하면

1. Supabase 문서: https://supabase.com/docs
2. Discord: https://discord.supabase.com
3. GitHub Issues: 프로젝트 이슈 등록

---

**즐거운 게임 되세요!** 🌙✨
