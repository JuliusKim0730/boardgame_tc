# 🚀 서버 시작 가이드

## v4.1 업데이트 후 서버 재시작

### 백엔드 서버 시작

```bash
cd backend
npm run dev
```

**확인사항**:
- ✅ 포트 3000 (또는 설정된 포트)에서 실행 중
- ✅ 데이터베이스 연결 성공
- ✅ "Server is running" 메시지 확인
- ✅ 에러 로그 없음

### 프론트엔드 서버 시작

```bash
cd frontend
npm run dev
```

**확인사항**:
- ✅ 포트 5173 (Vite 기본)에서 실행 중
- ✅ 브라우저 자동 열림
- ✅ 컴파일 에러 없음
- ✅ 콘솔 에러 없음

---

## 🧪 빠른 테스트

### 1. 방 생성 테스트
1. 브라우저에서 `http://localhost:5173` 접속
2. 닉네임 입력 후 "방 만들기"
3. 방 코드 생성 확인

### 2. 초기 자금 확인
1. 다른 브라우저/시크릿 모드로 방 참여
2. 게임 시작
3. **초기 자금 3,000TC 확인** ✅

### 3. 결심 토큰 표시 확인
1. 플레이어 정보 패널 확인
2. **🔥 1/2 표시 확인** ✅

### 4. 여행 지원 카드 확인
1. 4번 칸으로 이동
2. 행동 선택
3. **"여행 지원" 명칭 확인** ✅

---

## 🐛 문제 해결

### 백엔드 에러
**증상**: "Cannot find module" 또는 타입 에러

**해결**:
```bash
cd backend
rm -rf node_modules
npm install
npm run dev
```

### 프론트엔드 에러
**증상**: 컴파일 에러 또는 모듈 없음

**해결**:
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### 데이터베이스 연결 에러
**증상**: "Connection refused" 또는 "Authentication failed"

**해결**:
1. `.env` 파일 확인
2. Supabase 자격증명 확인
3. 네트워크 연결 확인

### 포트 충돌
**증상**: "Port already in use"

**해결**:
```bash
# 포트 사용 중인 프로세스 종료
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

---

## ✅ 시작 완료 체크리스트

- [ ] 백엔드 서버 실행 중
- [ ] 프론트엔드 서버 실행 중
- [ ] 데이터베이스 연결 성공
- [ ] 브라우저에서 접속 가능
- [ ] 초기 자금 3,000TC 확인
- [ ] 결심 토큰 표시 확인
- [ ] 여행 지원 카드 명칭 확인

**모두 체크되면 테스트 시작 준비 완료!** 🎮

---

## 📝 다음 단계

테스트 시나리오 실행:
```
TEST_SCENARIOS_V4.1.md 참조
```

**Happy Gaming! 🌙✨**
