# ✅ Supabase 설정 체크리스트

## 📋 단계별 체크

### 1. Supabase 계정 & 프로젝트
- [ ] https://supabase.com 가입 완료
- [ ] 새 프로젝트 생성 완료
- [ ] 프로젝트 이름: `boardgame-01`
- [ ] 리전: Northeast Asia (Seoul)
- [ ] 데이터베이스 비밀번호 저장 완료
- [ ] 프로젝트 생성 완료 (1-2분 대기)

### 2. 데이터베이스 스키마
- [ ] SQL Editor 열기
- [ ] `backend/src/db/schema.sql` 내용 복사
- [ ] 붙여넣기 후 Run 클릭
- [ ] "Success" 메시지 확인
- [ ] 14개 테이블 생성 확인

### 3. 카드 데이터 시드
- [ ] SQL Editor에서 New query
- [ ] `backend/src/db/seedCards.sql` 내용 복사
- [ ] 붙여넣기 후 Run 클릭
- [ ] "Success" 메시지 확인
- [ ] 카드 개수 확인: `SELECT COUNT(*) FROM cards;` → 107

### 4. 연결 정보 설정
- [ ] Settings → Database 메뉴 열기
- [ ] Connection string 확인
- [ ] Host 복사: `aws-0-ap-northeast-2.pooler.supabase.com`
- [ ] User 복사: `postgres.xxxxxxxxxxxxx`
- [ ] Password 확인 (프로젝트 생성 시 설정한 것)
- [ ] `backend/.env` 파일 수정 완료

### 5. 백엔드 설정
- [ ] `cd backend` 이동
- [ ] `npm install` 실행 완료
- [ ] `.env` 파일 확인
- [ ] `npm run dev` 실행
- [ ] "Server running on port 4000" 메시지 확인
- [ ] `curl http://localhost:4000/health` 테스트 성공

### 6. 프론트엔드 설정
- [ ] 새 터미널 열기
- [ ] `cd frontend` 이동
- [ ] `npm install` 실행 완료
- [ ] `npm run dev` 실행
- [ ] "Local: http://localhost:3000" 메시지 확인
- [ ] 브라우저에서 접속 성공

### 7. 게임 테스트
- [ ] http://localhost:3000 접속
- [ ] 방 만들기 클릭
- [ ] 닉네임 입력 후 방 생성
- [ ] 방 코드 확인
- [ ] 게임 시작 성공

---

## 🎯 모두 체크되었나요?

**축하합니다!** 🎉

이제 게임을 플레이할 수 있습니다!

---

## ❌ 체크되지 않은 항목이 있나요?

### Supabase 관련
- `SUPABASE_SETUP.md` 참고
- `SUPABASE_QUICK_START.md` 참고

### 백엔드 관련
- `QUICK_START.md` 참고
- 콘솔 에러 메시지 확인

### 프론트엔드 관련
- `FRONTEND_GUIDE.md` 참고
- 브라우저 개발자 도구 확인

### 일반 문제
- `DATABASE_ALTERNATIVES.md` 문제 해결 섹션
- `START_HERE.md` 문제 해결 섹션

---

## 📞 여전히 문제가 있나요?

1. 백엔드 콘솔 로그 확인
2. 프론트엔드 브라우저 콘솔 확인
3. Supabase 대시보드에서 Logs 확인
4. `.env` 파일 정보 재확인
5. GitHub Issues에 문의

---

**화이팅!** 💪
