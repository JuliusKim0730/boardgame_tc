# 🚀 Render.com 백엔드 배포 가이드

**문제**: Vercel 프론트엔드가 로컬 백엔드에 접근 불가 (CORS 에러)  
**해결**: 백엔드를 Render.com에 무료 배포

---

## 📊 현재 상황

### ✅ 완료
- 프론트엔드: Vercel 배포 완료
- 데이터베이스: Supabase 온라인

### ❌ 문제
- 백엔드: 로컬에서만 실행 중 (localhost:3000)
- CORS 에러: Vercel → localhost 접근 불가

### ✅ 해결책
- 백엔드를 Render.com에 배포 (무료)

---

## 🚀 Render.com 배포 단계

### 1단계: Render 계정 생성
1. https://render.com 접속
2. GitHub 계정으로 가입
3. "Free" 플랜 선택

### 2단계: 새 Web Service 생성
1. Dashboard → "New +" → "Web Service"
2. GitHub 저장소 연결: `JuliusKim0730/boardgame_tc`
3. "Connect" 클릭

### 3단계: 서비스 설정
```
Name: boardgame-backend
Region: Singapore (가장 가까운 지역)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
Plan: Free
```

### 4단계: 환경 변수 설정
"Environment" 탭에서 추가:

```
NODE_ENV=production
PORT=10000
DB_HOST=aws-1-ap-southeast-2.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xskaefoqkbwnhrpyptkl
DB_PASSWORD=9orkL1p59FjOnZQd
CLIENT_URL=https://boardgame-tc-frontend-javl8lp8g-juliuskim0730s-projects.vercel.app
```

### 5단계: 배포 시작
"Create Web Service" 클릭!

---

## ⏱️ 배포 시간

- 첫 배포: 약 5-10분
- 이후 배포: 약 2-3분

---

## 📝 배포 후 작업

### 1. 백엔드 URL 확인
Render가 제공하는 URL:
```
https://boardgame-backend.onrender.com
```

### 2. Vercel 환경 변수 업데이트
Vercel Dashboard → 프로젝트 → Settings → Environment Variables:

```
VITE_API_URL=https://boardgame-backend.onrender.com
```

### 3. Vercel 재배포
환경 변수 변경 후 자동으로 재배포됨

---

## ✅ 배포 확인

### Health Check
```bash
curl https://boardgame-backend.onrender.com/api/health
```

예상 응답:
```json
{
  "status": "ok",
  "version": "4.1.0",
  "timestamp": "2024-12-01T..."
}
```

### 프론트엔드 테스트
1. Vercel 프론트엔드 접속
2. 방 생성 시도
3. CORS 에러 없이 작동 확인

---

## 🎯 전체 아키텍처

```
사용자 브라우저
    ↓
Vercel (프론트엔드)
    ↓
Render (백엔드 API + WebSocket)
    ↓
Supabase (데이터베이스)
```

---

## 💰 무료 플랜 제한

### Render Free Plan
- 750시간/월 (충분함)
- 15분 비활성 시 슬립 모드
- 첫 요청 시 웨이크업 (약 30초)
- 메모리: 512MB
- 대역폭: 100GB/월

### 슬립 모드 해결
- 첫 접속 시 30초 대기
- 또는 Cron Job으로 주기적 핑 (선택사항)

---

## 🐛 문제 해결

### 빌드 실패
1. Render 로그 확인
2. `backend/package.json` 확인
3. TypeScript 컴파일 에러 확인

### 데이터베이스 연결 실패
1. 환경 변수 확인
2. Supabase 방화벽 설정 확인
3. Connection Pooler 사용 확인

### CORS 에러 지속
1. `backend/src/server.ts`의 `allowedOrigins` 확인
2. Vercel URL 정확히 추가했는지 확인
3. Render 재배포

---

## 📊 배포 체크리스트

### Render 배포
- [ ] Render 계정 생성
- [ ] Web Service 생성
- [ ] 환경 변수 설정
- [ ] 배포 시작
- [ ] Health check 확인

### Vercel 업데이트
- [ ] VITE_API_URL 환경 변수 추가
- [ ] 재배포 확인
- [ ] 프론트엔드 테스트

### 데이터베이스
- [ ] migration_v4.1.sql 실행
- [ ] seedCards_v4.1.sql 실행

---

## 🎉 완료 후

### 테스트
1. 방 생성
2. 방 참여
3. 게임 시작
4. 턴 진행
5. 게임 종료

### 모니터링
- Render Dashboard에서 로그 확인
- Vercel Analytics 확인
- Supabase 쿼리 모니터링

---

## 📞 지원

### Render 문서
- https://render.com/docs

### 문제 발생 시
1. Render 로그 확인
2. Vercel 로그 확인
3. 브라우저 콘솔 확인

---

**이제 백엔드를 Render에 배포하면 모든 것이 작동합니다!** 🚀

---

**문서 버전**: 1.0  
**최종 수정**: 2024년 12월 1일  
**작성자**: Kiro AI Assistant
