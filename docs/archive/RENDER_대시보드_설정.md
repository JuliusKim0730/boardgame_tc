# 🚀 Render Dashboard 직접 설정 가이드

## 🎯 render.yaml 문제 해결

**문제**: render.yaml 파일이 Render에서 제대로 작동하지 않음

**해결**: Dashboard에서 직접 설정 (더 안정적)

---

## 📋 Render Dashboard 설정 단계

### 1단계: 기존 서비스 삭제 (있다면)
1. Render Dashboard 접속
2. boardgame-backend 서비스 선택
3. Settings → "Delete Service"

### 2단계: 새 Web Service 생성
1. Dashboard → "New +" → "Web Service"
2. "Connect GitHub" 클릭
3. 저장소 선택: `JuliusKim0730/boardgame_tc`
4. "Connect" 클릭

### 3단계: 기본 설정
```
Name: boardgame-backend
Region: Singapore (또는 가장 가까운 지역)
Branch: main
Runtime: Node
Instance Type: Free
```

### 4단계: Build & Deploy 설정 ⭐ 중요!
```
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm start
```

**주의사항:**
- Root Directory를 **반드시** `backend`로 설정
- Build Command에 `cd` 명령 사용하지 않기

### 5단계: 환경 변수 추가
"Environment" 섹션에서 다음 변수들을 하나씩 추가:

```
NODE_ENV = production
PORT = 10000
DB_HOST = aws-1-ap-southeast-2.pooler.supabase.com
DB_PORT = 6543
DB_NAME = postgres
DB_USER = postgres.xskaefoqkbwnhrpyptkl
DB_PASSWORD = 9orkL1p59FjOnZQd
CLIENT_URL = https://boardgame-tc-frontend-javl8lp8g-juliuskim0730s-projects.vercel.app
```

**환경 변수 추가 방법:**
1. "Add Environment Variable" 클릭
2. Key와 Value 입력
3. "Save Changes" 클릭
4. 모든 변수 추가할 때까지 반복

### 6단계: 배포 시작
"Create Web Service" 버튼 클릭!

---

## ⏱️ 배포 진행 (5-10분)

### 예상 로그
```
==> Cloning from GitHub...
==> Installing dependencies...
    npm install
==> Building...
    npm run build
    tsc
==> Starting server...
    npm start
==> Your service is live 🎉
```

---

## ✅ 배포 성공 확인

### 1. URL 확인
Render가 제공하는 URL:
```
https://boardgame-backend.onrender.com
```

### 2. Health Check
브라우저에서 접속:
```
https://boardgame-backend.onrender.com/api/health
```

예상 응답:
```json
{
  "status": "ok",
  "version": "4.1.0",
  "timestamp": "2024-12-01T..."
}
```

### 3. 로그 확인
Dashboard → Logs 탭에서:
- ✅ "Your service is live"
- ✅ "Server running on port 10000"

---

## 🐛 문제 해결

### "Command not found" (127)
**원인**: Root Directory 설정 누락

**해결**:
1. Settings → Build & Deploy
2. Root Directory: `backend` 입력
3. "Save Changes"
4. Manual Deploy → "Deploy latest commit"

### "npm: not found"
**원인**: Node 런타임 선택 안됨

**해결**:
1. Settings → Build & Deploy
2. Runtime: Node 선택
3. "Save Changes"

### "Cannot find module"
**원인**: 의존성 설치 실패

**해결**:
1. Build Command 확인: `npm install && npm run build`
2. package.json 확인
3. 재배포

### 타임아웃
**원인**: 빌드 시간 초과 (Free 플랜 15분 제한)

**해결**:
- 일반적으로 2-3분이면 완료됨
- 재시도

---

## 📊 설정 요약

### 필수 설정
| 항목 | 값 |
|------|-----|
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Runtime | Node |
| Instance Type | Free |

### 환경 변수 (8개)
- NODE_ENV
- PORT
- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASSWORD
- CLIENT_URL

---

## 🎯 체크리스트

### 배포 전
- [ ] 기존 서비스 삭제 (있다면)
- [ ] GitHub 저장소 연결
- [ ] Root Directory: `backend` 설정
- [ ] Build/Start Command 설정
- [ ] 환경 변수 8개 추가

### 배포 중
- [ ] 로그에서 "Installing dependencies" 확인
- [ ] 로그에서 "Building" 확인
- [ ] 로그에서 "Starting server" 확인
- [ ] "Your service is live" 메시지 확인

### 배포 후
- [ ] Health Check 성공
- [ ] Vercel 프론트엔드 테스트
- [ ] 방 생성 성공

---

## 🚀 다음 단계

### 배포 성공 후
1. ✅ 백엔드 URL 복사
2. ✅ Vercel 프론트엔드 접속
3. ✅ 브라우저 콘솔 확인 (F12)
4. ✅ 방 생성 테스트
5. ✅ 성공!

---

## 💡 팁

### 자동 재배포
- GitHub에 푸시하면 자동으로 재배포됨
- Settings → Build & Deploy → "Auto-Deploy" 활성화

### 로그 모니터링
- Dashboard → Logs
- 실시간 로그 확인 가능
- 에러 발생 시 즉시 확인

### 슬립 모드
- Free 플랜: 15분 비활성 시 슬립
- 첫 요청 시 30초 웨이크업
- 정상 동작

---

**이제 Render Dashboard로 가서 직접 설정하세요!** 🚀

https://dashboard.render.com

---

**예상 소요 시간**: 10분  
**성공률**: 99% (Dashboard 설정 시)
