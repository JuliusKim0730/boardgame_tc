# ⚡ 빠른 배포 가이드

## 🎯 한 번에 배포하기

### 1단계: 환경 변수 설정

#### Render.com (백엔드)
```bash
NODE_ENV=production
PORT=10000
DATABASE_URL=[Supabase DATABASE_URL]
FRONTEND_URL=https://[your-project].vercel.app
CLIENT_URL=https://[your-project].vercel.app
```

#### Vercel (프론트엔드)
```bash
VITE_API_URL=https://boardgame-tc.onrender.com
VITE_SOCKET_URL=https://boardgame-tc.onrender.com
```

---

### 2단계: 배포 실행

```bash
# 배포 스크립트 실행
chmod +x deploy.sh
./deploy.sh

# 또는 수동으로
git add .
git commit -m "Deploy v4.1"
git push origin main
```

---

### 3단계: 확인

1. **Render.com 확인**
   - https://dashboard.render.com/
   - Logs 확인
   - Health Check: https://boardgame-tc.onrender.com/api/health

2. **Vercel 확인**
   - https://vercel.com/dashboard
   - Deployments 확인
   - 프론트엔드 접속

3. **통합 테스트**
   - 방 생성
   - AI 봇 추가
   - 게임 플레이

---

## 🔧 문제 해결

### CORS 에러
```bash
# Render.com 환경 변수 확인
FRONTEND_URL=https://[정확한-vercel-url].vercel.app
```

### WebSocket 연결 실패
```bash
# Vercel 환경 변수 확인
VITE_SOCKET_URL=https://boardgame-tc.onrender.com
```

### 데이터베이스 연결 실패
```bash
# Supabase DATABASE_URL 확인
# 비밀번호 특수문자 URL 인코딩
```

---

## 📊 배포 상태 확인

```bash
# 백엔드 Health Check
curl https://boardgame-tc.onrender.com/api/health

# 응답 예시
{
  "status": "ok",
  "version": "4.1.0",
  "timestamp": "2024-12-03T..."
}
```

---

## 🎉 완료!

배포가 완료되면:
- 프론트엔드: https://[your-project].vercel.app
- 백엔드: https://boardgame-tc.onrender.com

**게임을 즐기세요!** 🎮✨
