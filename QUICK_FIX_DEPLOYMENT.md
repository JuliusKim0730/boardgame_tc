# ⚡ 빠른 배포 수정 가이드

## 🎯 문제
Vercel은 백엔드 API를 지원하지 않아 "방 만들기" 시 에러 발생

## ✅ 해결책
백엔드를 Render.com에 무료 배포

---

## 🚀 5분 안에 해결하기

### 1단계: Render.com 가입 (1분)
1. [render.com](https://render.com) 접속
2. "Get Started for Free" 클릭
3. GitHub 계정으로 가입

### 2단계: 백엔드 배포 (2분)
1. Dashboard → "New +" → "Web Service"
2. GitHub 저장소 `boardgame_tc` 선택
3. 다음 설정 입력:

```
Name: boardgame-backend
Region: Oregon (US West)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```

4. "Advanced" → Environment Variables 추가:
```
NODE_ENV=production
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. "Create Web Service" 클릭!

### 3단계: 프론트엔드 환경 변수 설정 (1분)
1. [vercel.com/dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 → Settings → Environment Variables
3. 추가:
```
VITE_API_URL=https://boardgame-backend.onrender.com
```
(Render에서 받은 URL 사용)

4. "Save" 클릭

### 4단계: 재배포 (1분)
Vercel Dashboard → Deployments → "Redeploy"

---

## ✅ 완료!

5분 후 게임이 정상 작동합니다!

**프론트엔드**: https://your-project.vercel.app  
**백엔드**: https://boardgame-backend.onrender.com

---

## 🐛 문제 해결

### Render 배포 실패 시
1. Render Dashboard → Logs 확인
2. 환경 변수 확인
3. Build Command 확인

### Vercel 연결 실패 시
1. VITE_API_URL 확인
2. Render 백엔드 URL 확인
3. 브라우저 콘솔 확인

---

**상세 가이드**: `RENDER_BACKEND_DEPLOYMENT.md`
