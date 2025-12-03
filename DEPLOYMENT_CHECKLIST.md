# ✅ 배포 체크리스트

## 📋 배포 전 준비

### Supabase 설정
- [ ] Supabase 프로젝트 생성 완료
- [ ] `migration_v4.1.sql` 실행 완료
- [ ] `seedCards_FULL.sql` 실행 완료
- [ ] DATABASE_URL 복사 완료
- [ ] SUPABASE_URL 복사 완료
- [ ] SUPABASE_ANON_KEY 복사 완료

### GitHub 준비
- [ ] 코드 최신 상태로 커밋
- [ ] main 브랜치에 푸시 완료
- [ ] .gitignore 확인 (.env 파일 제외됨)

---

## 🎯 Render.com 배포

### 1. 서비스 생성
- [ ] https://dashboard.render.com/ 접속
- [ ] "New +" → "Web Service" 클릭
- [ ] GitHub 연동 완료
- [ ] Repository 선택

### 2. 서비스 설정
```
Name: boardgame-backend
Region: Singapore
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```
- [ ] 위 설정 입력 완료

### 3. 환경 변수 설정
```
NODE_ENV=production
PORT=10000
DATABASE_URL=[Supabase DATABASE_URL]
FRONTEND_URL=https://[your-project].vercel.app
CLIENT_URL=https://[your-project].vercel.app
```
- [ ] 모든 환경 변수 입력 완료
- [ ] DATABASE_URL 정확히 입력 (비밀번호 포함)

### 4. 배포 실행
- [ ] "Create Web Service" 클릭
- [ ] 빌드 진행 확인 (5-10분 소요)
- [ ] 빌드 성공 확인
- [ ] Health Check 응답 확인
  ```bash
  curl https://boardgame-tc.onrender.com/api/health
  ```

### 5. URL 확인
- [ ] Render.com URL 복사
  - 예: `https://boardgame-tc.onrender.com`

---

## 🎯 Vercel 배포

### 1. 프로젝트 생성
- [ ] https://vercel.com/dashboard 접속
- [ ] "Add New..." → "Project" 클릭
- [ ] GitHub 연동 완료
- [ ] Repository 선택

### 2. 프로젝트 설정
```
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```
- [ ] 위 설정 확인 (자동 감지됨)

### 3. 환경 변수 설정
```
VITE_API_URL=https://boardgame-tc.onrender.com
VITE_SOCKET_URL=https://boardgame-tc.onrender.com
```
- [ ] Settings → Environment Variables 이동
- [ ] 모든 환경 변수 입력 완료
- [ ] Production, Preview, Development 모두 체크

### 4. 배포 실행
- [ ] "Deploy" 클릭
- [ ] 빌드 진행 확인 (2-3분 소요)
- [ ] 빌드 성공 확인
- [ ] 프론트엔드 접속 확인

### 5. URL 확인
- [ ] Vercel URL 복사
  - 예: `https://your-project.vercel.app`

---

## 🔄 환경 변수 업데이트

### Render.com 재설정
- [ ] Render.com Dashboard 이동
- [ ] boardgame-backend 서비스 선택
- [ ] Environment 탭 이동
- [ ] `FRONTEND_URL` 업데이트
  ```
  FRONTEND_URL=https://[실제-vercel-url].vercel.app
  ```
- [ ] `CLIENT_URL` 업데이트
  ```
  CLIENT_URL=https://[실제-vercel-url].vercel.app
  ```
- [ ] "Save Changes" 클릭
- [ ] 자동 재배포 대기 (2-3분)

---

## 🧪 통합 테스트

### 기본 기능 테스트
- [ ] 프론트엔드 접속 성공
- [ ] 방 생성 성공
- [ ] 방 코드 표시 확인
- [ ] 방 참여 성공 (다른 브라우저/시크릿 모드)

### AI 봇 테스트
- [ ] 슬롯에 AI 추가 성공
- [ ] AI 닉네임 생성 확인
- [ ] 게임 시작 성공

### 게임 플레이 테스트
- [ ] 턴 시작 알림 확인
- [ ] 이동 및 행동 성공
- [ ] AI 자동 플레이 확인 (5초 후)
- [ ] WebSocket 실시간 동기화 확인
- [ ] 게임 종료 및 결과 화면 확인

### 성능 테스트
- [ ] 페이지 로딩 속도 확인 (< 3초)
- [ ] API 응답 속도 확인 (< 1초)
- [ ] WebSocket 지연 확인 (< 500ms)

---

## 🔍 문제 해결

### CORS 에러 발생 시
- [ ] Render.com 환경 변수 확인
- [ ] FRONTEND_URL이 정확한지 확인
- [ ] 백엔드 재배포

### WebSocket 연결 실패 시
- [ ] Vercel 환경 변수 확인
- [ ] VITE_SOCKET_URL이 정확한지 확인
- [ ] 프론트엔드 재배포

### 데이터베이스 연결 실패 시
- [ ] Supabase 프로젝트 활성 상태 확인
- [ ] DATABASE_URL 정확성 확인
- [ ] 비밀번호 특수문자 URL 인코딩 확인

### AI Scheduler 작동 안 함
- [ ] Render.com 로그 확인
- [ ] 서버 슬립 모드 확인
- [ ] UptimeRobot 설정 (Keep-Alive)

---

## 📊 모니터링 설정

### UptimeRobot (선택사항)
- [ ] https://uptimerobot.com/ 가입
- [ ] New Monitor 생성
- [ ] URL: `https://boardgame-tc.onrender.com/api/health`
- [ ] Interval: 5분
- [ ] 알림 설정 (이메일)

### Render.com 로그
- [ ] Dashboard → boardgame-backend → Logs
- [ ] 실시간 로그 확인
- [ ] 에러 로그 모니터링

### Vercel 로그
- [ ] Dashboard → Deployments → [최신 배포]
- [ ] Build Logs 확인
- [ ] Runtime Logs 확인

---

## 🎉 배포 완료!

### 최종 확인
- [ ] 프론트엔드 URL 작동: https://[your-project].vercel.app
- [ ] 백엔드 URL 작동: https://boardgame-tc.onrender.com
- [ ] Health Check 응답: https://boardgame-tc.onrender.com/api/health
- [ ] 전체 게임 플로우 테스트 완료

### 문서 업데이트
- [ ] README.md에 배포 URL 추가
- [ ] 팀원들에게 URL 공유
- [ ] 사용자 가이드 작성 (선택사항)

---

## 📝 배포 정보 기록

```
배포 일자: _______________
프론트엔드 URL: _______________
백엔드 URL: _______________
Supabase 프로젝트: _______________
배포자: _______________
```

---

**모든 체크리스트 완료 시 배포 성공!** 🚀✨

문제 발생 시:
1. 로그 확인
2. 환경 변수 재확인
3. 재배포 시도
4. 문서 참조: DEPLOYMENT_GUIDE_FINAL.md
