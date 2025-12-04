# 🚀 Render.com 백엔드 배포 가이드

## 📋 개요
Vercel은 프론트엔드만 호스팅하고, 백엔드는 Render.com에 무료로 배포합니다.

---

## 🎯 배포 아키텍처

```
┌─────────────────┐
│  Vercel         │
│  (Frontend)     │
│  React + Vite   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Render.com     │
│  (Backend)      │
│  Express +      │
│  Socket.io      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │
│  (Database)     │
└─────────────────┘
```

---

## 🚀 Render.com 배포 단계

### 1단계: Render.com 계정 생성
1. [render.com](https://render.com) 접속
2. GitHub 계정으로 가입
3. Free Plan 선택

### 2단계: 새 Web Service 생성
1. Dashboard → "New +" → "Web Service"
2. GitHub 저장소 연결
3. `boardgame_tc` 저장소 선택

### 3단계: 서비스 설정
```
Name: boardgame-backend
Region: Oregon (US West) 또는 가까운 지역
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```

### 4단계: 환경 변수 설정
```
NODE_ENV=production
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3000
```

### 5단계: 배포
"Create Web Service" 클릭!

---

## 🔧 프론트엔드 환경 변수 업데이트

### Vercel Dashboard에서 환경 변수 추가
```
VITE_API_URL=https://your-backend.onrender.com
```

---

## 📝 코드 수정

### 1. 프론트엔드 API URL 수정

`frontend/src/services/api.ts`:
```typescript
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.PROD 
    ? '/api'
    : 'http://localhost:3000/api';
```

### 2. Socket URL 수정

`frontend/src/services/socket.ts`:
```typescript
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : import.meta.env.PROD
    ? window.location.origin
    : 'http://localhost:3000';
```

---

## ⚡ 빠른 배포 (5분)

### 방법 1: Render Dashboard (추천)

1. **[dashboard.render.com/select-repo](https://dashboard.render.com/select-repo)** 접속
2. **boardgame_tc** 저장소 선택
3. 위 설정 입력
4. **Create Web Service** 클릭
5. 배포 완료 대기 (3-5분)

### 방법 2: render.yaml 사용

프로젝트 루트에 `render.yaml` 생성:
```yaml
services:
  - type: web
    name: boardgame-backend
    env: node
    region: oregon
    plan: free
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
```

---

## 🐛 문제 해결

### 문제 1: 빌드 실패
**증상**: "Build failed"

**해결**:
```bash
# 로컬에서 테스트
cd backend
npm install
npm run build
npm start
```

### 문제 2: 데이터베이스 연결 실패
**증상**: "Connection refused"

**해결**:
1. Supabase 자격증명 확인
2. DATABASE_URL 형식 확인
3. Supabase 방화벽 설정 (모든 IP 허용)

### 문제 3: 서비스 Sleep
**증상**: 첫 요청이 느림

**설명**: 
- Render Free Plan은 15분 비활성 후 Sleep
- 첫 요청 시 30초 정도 소요
- 이후 정상 속도

**해결**: 
- Paid Plan 사용 ($7/월)
- 또는 주기적 ping 설정

---

## 📊 무료 플랜 제한

### Render Free Plan
- **메모리**: 512MB
- **CPU**: 공유
- **대역폭**: 100GB/월
- **빌드 시간**: 500시간/월
- **Sleep**: 15분 비활성 후
- **제한**: 월 750시간 실행

### 충분한 경우
- 소규모 프로젝트
- 테스트/데모
- 친구들과 플레이

---

## ✅ 배포 확인

### 1. 백엔드 Health Check
```bash
curl https://your-backend.onrender.com/api/health
```

예상 응답:
```json
{
  "status": "ok",
  "version": "4.1.0"
}
```

### 2. 프론트엔드 연결 확인
1. Vercel 사이트 접속
2. 방 만들기 클릭
3. 정상 작동 확인

---

## 🔄 업데이트 배포

### 자동 배포
```bash
git push origin main
```
→ Render가 자동으로 재배포!

### 수동 배포
Render Dashboard → Deploy → "Deploy latest commit"

---

## 💰 비용 비교

| 서비스 | 프론트엔드 | 백엔드 | 데이터베이스 | 총 비용 |
|--------|-----------|--------|-------------|---------|
| Vercel | 무료 | - | - | $0 |
| Render | - | 무료 | - | $0 |
| Supabase | - | - | 무료 | $0 |
| **합계** | | | | **$0/월** |

---

## 🎉 완료!

이제 완전히 무료로 온라인 게임 서비스를 운영할 수 있습니다!

**프론트엔드**: https://your-project.vercel.app  
**백엔드**: https://your-backend.onrender.com

---

**문서 버전**: 1.0  
**최종 수정**: 2024년 12월 1일
