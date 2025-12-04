# 🔧 Render 배포 에러 수정

## 🐛 발생한 문제

**에러**: "Exited with status 127 while building your code"

**원인**: render.yaml의 빌드 명령어 문제

---

## ✅ 수정 사항

### render.yaml 수정
```yaml
# 이전 (잘못됨)
buildCommand: cd backend && npm install && npm run build
startCommand: cd backend && npm start

# 수정 (올바름)
rootDir: backend
buildCommand: npm install && npm run build
startCommand: npm start
```

**변경 이유:**
- `rootDir: backend` 설정으로 작업 디렉토리 지정
- `cd backend` 명령 제거 (불필요)

---

## 🚀 Render 재배포 방법

### 방법 1: 자동 재배포 (권장)
1. Git 푸시 완료 → Render 자동 감지
2. Dashboard에서 재배포 시작 확인
3. 5-10분 대기

### 방법 2: 수동 재배포
1. Render Dashboard 접속
2. boardgame-backend 서비스 선택
3. "Manual Deploy" → "Deploy latest commit"

---

## 🎯 Render Dashboard 설정 (대안)

render.yaml 대신 Dashboard에서 직접 설정:

### Settings → Build & Deploy
```
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm start
```

### Environment Variables
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

---

## ✅ 배포 성공 확인

### 1. 로그 확인
Render Dashboard → Logs에서:
```
==> Installing dependencies...
==> Building...
==> Starting server...
==> Your service is live 🎉
```

### 2. Health Check
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

---

## 🐛 여전히 에러 발생 시

### 에러 127
- 명령어를 찾을 수 없음
- Root Directory 설정 확인

### 에러 1
- npm install 실패
- package.json 확인
- Node 버전 확인 (18 이상)

### 타임아웃
- 빌드 시간 초과
- Free 플랜 제한 (15분)

---

## 📝 최종 체크리스트

- [x] render.yaml 수정 완료
- [x] Git 푸시 완료
- [ ] Render 재배포 확인
- [ ] Health Check 성공
- [ ] Vercel 프론트엔드 테스트

---

**이제 Render가 자동으로 재배포를 시작합니다!** 🚀

Dashboard에서 로그를 확인하세요.
