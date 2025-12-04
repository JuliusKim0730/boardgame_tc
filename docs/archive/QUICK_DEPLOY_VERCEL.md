# ⚡ Vercel 빠른 배포 가이드

## 🚀 5분 안에 배포하기

### 1단계: GitHub에 푸시 (2분)
```bash
git add .
git commit -m "Ready for Vercel deployment v4.1"
git push origin main
```

### 2단계: Vercel 배포 (3분)

#### 옵션 A: Vercel CLI (추천)
```bash
# CLI 설치
npm install -g vercel

# 로그인
vercel login

# 배포
vercel

# 환경 변수 설정
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add DATABASE_URL

# 프로덕션 배포
vercel --prod
```

#### 옵션 B: Vercel Dashboard
1. [vercel.com/new](https://vercel.com/new) 접속
2. GitHub 저장소 선택
3. 환경 변수 입력:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `DATABASE_URL`
4. "Deploy" 클릭!

---

## ✅ 배포 완료 확인

### 1. URL 확인
```
https://your-project.vercel.app
```

### 2. Health Check
```bash
curl https://your-project.vercel.app/api/health
```

### 3. 게임 테스트
1. 브라우저에서 접속
2. 방 생성
3. 게임 시작
4. 초기 자금 3,000TC 확인

---

## 🐛 문제 해결

### 빌드 실패
```bash
# 로컬에서 테스트
cd frontend
npm run build
```

### API 연결 실패
- Vercel Dashboard → Settings → Environment Variables 확인
- Supabase URL 확인

### WebSocket 연결 실패
- 브라우저 콘솔 확인
- Vercel Logs 확인

---

## 📱 공유하기

배포 완료 후 친구들과 공유:
```
https://your-project.vercel.app
```

**축하합니다! 🎉**

상세 가이드: `VERCEL_DEPLOYMENT_GUIDE.md`
