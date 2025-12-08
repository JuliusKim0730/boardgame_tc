# 배포 가이드

## 📦 최신 업데이트 (2024-12-07)

### 구현된 기능
- ✅ 14일차 공동 계획 기여 시스템 (AI)
- ✅ 자동 턴 종료 (3초 타이머)
- ✅ AI 공동 계획 투자 로직
- ✅ 계획 교환 AI 대응 (CH8, CH9)
- ✅ 찬스 카드 시스템 (26장)
- ✅ 찬스 카드 UI 컴포넌트 (3개)

### 변경된 파일
- Backend: 6개 파일
- Frontend: 7개 파일 (3개 신규)
- 문서: 5개 신규

---

## 🚀 Vercel 배포 (프론트엔드)

### 자동 배포
GitHub에 푸시하면 Vercel이 자동으로 배포합니다.

```bash
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin main
```

### 배포 확인
1. Vercel 대시보드 접속: https://vercel.com
2. 프로젝트 선택
3. Deployments 탭에서 최신 배포 확인
4. 빌드 로그 확인

### 환경 변수 설정
Vercel 대시보드 → Settings → Environment Variables

```
VITE_API_URL=https://your-backend-url.onrender.com
```

---

## 🖥️ Render 배포 (백엔드)

### 자동 배포
GitHub에 푸시하면 Render가 자동으로 배포합니다.

### 배포 확인
1. Render 대시보드 접속: https://render.com
2. 서비스 선택
3. Events 탭에서 배포 상태 확인
4. Logs 탭에서 실행 로그 확인

### 환경 변수 설정
Render 대시보드 → Environment

```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:password@host:port/database
GOOGLE_API_KEY=your_google_api_key
```

---

## 🔧 로컬 빌드 테스트

### 프론트엔드 빌드
```bash
cd frontend
npm install
npm run build
```

빌드 결과: `frontend/dist/` 폴더

### 백엔드 빌드
```bash
cd backend
npm install
npm run build
```

빌드 결과: `backend/dist/` 폴더

### 전체 빌드
```bash
npm run install:all
npm run build
```

---

## 🐛 빌드 에러 해결

### 1. TypeScript 에러
```bash
# 프론트엔드
cd frontend
npx tsc --noEmit

# 백엔드
cd backend
npx tsc --noEmit
```

### 2. 의존성 에러
```bash
# 캐시 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### 3. 환경 변수 에러
- `.env.example` 파일 확인
- 필요한 환경 변수 설정 확인

---

## 📊 빌드 설정

### Vercel 설정 (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ]
}
```

### 프론트엔드 빌드 스크립트
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "vercel-build": "vite build",
    "preview": "vite preview"
  }
}
```

### 백엔드 빌드 스크립트
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

---

## 🔍 배포 후 확인 사항

### 프론트엔드
- [ ] 페이지 로딩 확인
- [ ] API 연결 확인
- [ ] WebSocket 연결 확인
- [ ] 새로운 UI 컴포넌트 표시 확인
  - [ ] DiscardSelectModal
  - [ ] PurchaseConfirmModal
  - [ ] PlayerSelectModal

### 백엔드
- [ ] 서버 시작 확인
- [ ] 데이터베이스 연결 확인
- [ ] API 엔드포인트 동작 확인
- [ ] 새로운 엔드포인트 확인
  - [ ] POST /games/:gameId/discard-and-draw

### 게임 기능
- [ ] 게임 시작
- [ ] 턴 진행
- [ ] 찬스 카드 드로우
- [ ] 자동 턴 종료 (3초)
- [ ] AI 플레이어 동작
- [ ] 14일차 공동 계획 기여

---

## 🚨 긴급 롤백

### Vercel 롤백
1. Vercel 대시보드 → Deployments
2. 이전 배포 선택
3. "Promote to Production" 클릭

### Render 롤백
1. Render 대시보드 → Events
2. 이전 배포 선택
3. "Redeploy" 클릭

### Git 롤백
```bash
# 이전 커밋으로 되돌리기
git log --oneline
git revert <commit-hash>
git push origin main
```

---

## 📝 배포 체크리스트

### 배포 전
- [ ] 로컬에서 빌드 테스트
- [ ] TypeScript 에러 확인
- [ ] 환경 변수 설정 확인
- [ ] Git 커밋 및 푸시

### 배포 중
- [ ] Vercel 빌드 로그 확인
- [ ] Render 빌드 로그 확인
- [ ] 에러 메시지 확인

### 배포 후
- [ ] 프론트엔드 접속 확인
- [ ] 백엔드 API 확인
- [ ] 게임 기능 테스트
- [ ] 에러 로그 모니터링

---

## 🔗 유용한 링크

### 배포 플랫폼
- Vercel: https://vercel.com
- Render: https://render.com

### 문서
- Vercel 문서: https://vercel.com/docs
- Render 문서: https://render.com/docs
- Vite 문서: https://vitejs.dev

### 모니터링
- Vercel Analytics: https://vercel.com/analytics
- Render Logs: Dashboard → Logs

---

## 💡 팁

### 빠른 배포
```bash
# 한 번에 커밋 및 푸시
git add . && git commit -m "update" && git push
```

### 빌드 캐시 삭제
```bash
# Vercel
vercel --force

# Render
Dashboard → Manual Deploy → Clear build cache
```

### 로그 확인
```bash
# Vercel CLI
vercel logs

# Render
Dashboard → Logs → Real-time
```

---

## 📞 문제 해결

### 빌드 실패
1. 로컬에서 빌드 테스트
2. 에러 메시지 확인
3. 의존성 버전 확인
4. 환경 변수 확인

### 런타임 에러
1. 배포 로그 확인
2. 브라우저 콘솔 확인
3. 네트워크 탭 확인
4. API 응답 확인

### 성능 문제
1. Lighthouse 점수 확인
2. 번들 크기 확인
3. API 응답 시간 확인
4. 데이터베이스 쿼리 최적화

---

**최종 업데이트**: 2024-12-07
**버전**: v4.1.0
**상태**: 배포 준비 완료 ✅
