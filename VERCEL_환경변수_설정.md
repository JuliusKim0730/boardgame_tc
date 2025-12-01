# 🔧 Vercel 환경 변수 설정 - 긴급 수정

## 🚨 현재 문제

프론트엔드가 `localhost:3000`을 호출하고 있습니다.
→ `VITE_API_URL` 환경 변수가 설정되지 않았기 때문!

---

## ✅ 해결 방법 (2가지 옵션)

### 옵션 1: 임시 - 하드코딩 (5분)

프론트엔드 코드를 수정하여 Render URL을 직접 사용

### 옵션 2: 영구 - Render 배포 + Vercel 환경 변수 (15분)

1. Render에 백엔드 배포
2. Vercel에 환경 변수 추가
3. 재배포

---

## 🚀 옵션 1: 임시 해결 (지금 바로)

### 1단계: API URL 하드코딩

`frontend/src/services/api.ts` 수정:
```typescript
// 임시: Render URL 직접 사용
const API_BASE = 'https://boardgame-backend.onrender.com/api';
```

`frontend/src/services/socket.ts` 수정:
```typescript
// 임시: Render URL 직접 사용
const SOCKET_URL = 'https://boardgame-backend.onrender.com';
```

### 2단계: Git 푸시
```bash
git add .
git commit -m "임시: API URL 하드코딩"
git push origin main
```

### 3단계: Vercel 자동 재배포 대기 (2분)

---

## 🎯 옵션 2: 영구 해결 (권장)

### A. Render 백엔드 배포

#### 1. Render.com 접속
https://render.com → GitHub 가입

#### 2. Web Service 생성
- Name: `boardgame-backend`
- Repository: `JuliusKim0730/boardgame_tc`
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

#### 3. 환경 변수 추가
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

#### 4. 배포 시작
"Create Web Service" 클릭 → 5-10분 대기

#### 5. URL 복사
예: `https://boardgame-backend.onrender.com`

---

### B. Vercel 환경 변수 설정

#### 1. Vercel Dashboard 접속
https://vercel.com/dashboard

#### 2. 프로젝트 선택
`boardgame-tc-frontend-...` 클릭

#### 3. Settings → Environment Variables

#### 4. 환경 변수 추가
```
Name: VITE_API_URL
Value: https://boardgame-backend.onrender.com
Environment: Production, Preview, Development (모두 체크)
```

#### 5. Save 클릭

---

### C. Vercel 재배포

#### 방법 1: 자동 (권장)
Deployments → 최신 배포 → "Redeploy"

#### 방법 2: Git 푸시
```bash
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

## ✅ 확인 방법

### 1. 백엔드 Health Check
```
https://boardgame-backend.onrender.com/api/health
```

예상 응답:
```json
{
  "status": "ok",
  "version": "4.1.0"
}
```

### 2. 프론트엔드 테스트
1. Vercel URL 접속
2. 브라우저 콘솔 열기 (F12)
3. Network 탭 확인
4. 방 생성 시도
5. ✅ `boardgame-backend.onrender.com` 호출 확인

---

## 🐛 여전히 localhost 호출 시

### 원인
- Vercel 환경 변수가 적용되지 않음
- 빌드 캐시 문제

### 해결
1. Vercel → Settings → Environment Variables 재확인
2. Deployments → "Redeploy" (캐시 없이)
3. 브라우저 캐시 삭제 (Ctrl + Shift + Delete)

---

## 📊 권장 순서

### 지금 당장 (옵션 1)
1. ✅ API URL 하드코딩
2. ✅ Git 푸시
3. ✅ 2분 대기
4. ✅ 테스트

### 나중에 (옵션 2)
1. ⏳ Render 배포
2. ⏳ Vercel 환경 변수
3. ⏳ 하드코딩 제거

---

## 🎯 최종 목표

```
사용자
  ↓
Vercel (프론트엔드)
  ↓
Render (백엔드)
  ↓
Supabase (DB)
```

**모두 온라인, 24/7 작동!** 🚀

---

**지금 바로 옵션 1을 실행하시겠습니까?**
