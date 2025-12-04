# 🌙 열네 밤의 꿈 - Vercel 배포 완료

## 🎮 프로젝트 소개
여름 방학 14일 동안 꿈에 그리던 여행을 준비하는 전략·감성 보드게임

**버전**: v4.1  
**플레이어**: 2-5인  
**플레이 시간**: 40-60분

---

## 🚀 빠른 시작

### 로컬 개발
```bash
# 의존성 설치
npm run install:all

# 백엔드 시작
cd backend
npm run dev

# 프론트엔드 시작 (새 터미널)
cd frontend
npm run dev
```

### Vercel 배포
```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 배포
vercel --prod
```

📖 **상세 가이드**: `QUICK_DEPLOY_VERCEL.md`

---

## 📁 프로젝트 구조

```
boardgame_01/
├── frontend/              # React + Vite 프론트엔드
│   ├── src/
│   │   ├── components/   # UI 컴포넌트
│   │   ├── services/     # API & Socket 서비스
│   │   └── App.tsx       # 메인 앱
│   └── package.json
│
├── backend/              # Express + Socket.io 백엔드
│   ├── src/
│   │   ├── routes/      # API 라우트
│   │   ├── services/    # 비즈니스 로직
│   │   ├── ws/          # WebSocket 핸들러
│   │   └── server.ts    # 서버 엔트리
│   └── package.json
│
├── vercel.json          # Vercel 설정
├── package.json         # 루트 설정
└── README_DEPLOYMENT.md # 이 파일
```

---

## 🔧 기술 스택

### 프론트엔드
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **Socket.io Client** - 실시간 통신
- **Axios** - HTTP 클라이언트

### 백엔드
- **Node.js + Express** - 서버 프레임워크
- **TypeScript** - 타입 안정성
- **Socket.io** - WebSocket 서버
- **PostgreSQL** - 데이터베이스 (Supabase)

### 배포
- **Vercel** - 호스팅 (무료)
- **Supabase** - 데이터베이스 (무료)

---

## 🌐 배포 아키텍처

```
┌─────────────────────────────────────────┐
│         Vercel (무료 호스팅)              │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │  Frontend    │  │  Backend API    │ │
│  │  (Static)    │  │  (Serverless)   │ │
│  │              │  │                 │ │
│  │  React       │  │  Express        │ │
│  │  Vite        │  │  Socket.io      │ │
│  └──────────────┘  └─────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │    Supabase     │
         │   PostgreSQL    │
         │   (무료 DB)      │
         └─────────────────┘
```

---

## 📚 배포 문서

### 필수 문서
1. **QUICK_DEPLOY_VERCEL.md** - 5분 빠른 배포
2. **VERCEL_DEPLOYMENT_GUIDE.md** - 완전한 배포 가이드
3. **VERCEL_DEPLOYMENT_CHECKLIST.md** - 배포 체크리스트

### 개발 문서
4. **DATABASE_MIGRATION_GUIDE.md** - DB 마이그레이션
5. **TEST_SCENARIOS_V4.1.md** - 테스트 시나리오
6. **WORKFLOW_UPDATE_SUMMARY.md** - v4.1 변경사항

---

## 🎯 v4.1 주요 기능

### 기본 규칙
- ✅ 초기 자금: **3,000TC**
- ✅ 집안일 수익: **1,500~2,000TC**
- ✅ 여행 지원 카드 (구 투자 카드)
- ✅ 결심 토큰: **0~2개 관리**

### 2인 전용 규칙
- ✅ 찬스 칸: 카드 OR 500TC 선택
- ✅ 집안일 첫 방문: +500TC
- ✅ 공동 목표 패널티 면제
- ✅ 특정 카드 사용 제한

### 신규 기능
- ✅ 비주류 특성 변환 (3점 → 추억 +1)
- ✅ 결심 토큰 주간 회복
- ✅ CH19 "반전의 기회" 카드
- ✅ 동률 규정 (추억 → TC)

---

## 🔐 환경 변수

### 필수 환경 변수
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://...
```

### Vercel 설정
1. Vercel Dashboard → Settings → Environment Variables
2. 위 3개 변수 추가
3. Production, Preview, Development 모두 체크

📖 **예제**: `.env.example` 참조

---

## 🧪 테스트

### 로컬 테스트
```bash
# 프론트엔드 빌드 테스트
cd frontend
npm run build

# 백엔드 빌드 테스트
cd backend
npm run build
```

### 배포 후 테스트
1. Health Check: `https://your-project.vercel.app/api/health`
2. 프론트엔드 접속
3. 게임 플레이 테스트

📖 **시나리오**: `TEST_SCENARIOS_V4.1.md`

---

## 🐛 문제 해결

### 빌드 실패
```bash
# 로컬에서 빌드 테스트
npm run build

# 에러 확인 및 수정
```

### API 연결 실패
- 환경 변수 확인
- CORS 설정 확인
- Supabase 연결 확인

### WebSocket 연결 실패
- Socket.io 설정 확인
- Transports 설정 확인
- 브라우저 콘솔 확인

📖 **상세 가이드**: `VERCEL_DEPLOYMENT_GUIDE.md`

---

## 📊 무료 플랜 제한

### Vercel Hobby Plan
- 대역폭: **100GB/월**
- 빌드 시간: **6,000분/월**
- Serverless: **100GB-시간/월**
- 동시 빌드: **1개**

### Supabase Free Tier
- 데이터베이스: **500MB**
- API 요청: **무제한**
- 대역폭: **2GB/월**
- 동시 연결: **60개**

💡 **팁**: 대부분의 소규모 프로젝트에 충분합니다!

---

## 🔄 업데이트 배포

### 자동 배포 (GitHub 연동)
```bash
git add .
git commit -m "Update feature"
git push origin main
```
→ Vercel이 자동으로 배포!

### 수동 배포
```bash
vercel --prod
```

---

## 📱 공유하기

### 배포 URL
```
https://your-project.vercel.app
```

### QR 코드 생성
1. [qr-code-generator.com](https://www.qr-code-generator.com/) 접속
2. URL 입력
3. QR 코드 다운로드
4. 친구들과 공유!

---

## 🎉 다음 단계

### 즉시
1. ✅ Vercel 배포 완료
2. ✅ 기능 테스트
3. ✅ 친구들과 플레이

### 단기 (1주일)
- [ ] 사용자 피드백 수집
- [ ] 버그 수정
- [ ] UI/UX 개선

### 중기 (1개월)
- [ ] 새로운 카드 추가
- [ ] 게임 모드 확장
- [ ] 성능 최적화

### 장기 (3개월)
- [ ] v4.2 기획
- [ ] 모바일 앱 개발
- [ ] 멀티플레이어 확장

---

## 📞 지원 및 문의

### 문서
- 배포: `VERCEL_DEPLOYMENT_GUIDE.md`
- 테스트: `TEST_SCENARIOS_V4.1.md`
- 개발: `DEVELOPMENT_PROGRESS_V4.1.md`

### 링크
- [Vercel 문서](https://vercel.com/docs)
- [Supabase 문서](https://supabase.com/docs)
- [Socket.io 문서](https://socket.io/docs/)

---

## 🏆 크레딧

**개발**: 팀 에보개  
**버전**: v4.1  
**배포**: Vercel + Supabase  
**라이선스**: MIT

---

## 🎮 게임 시작!

```
 _____ _             _   _                       _      _   _             
|_   _| |__   ___   | \ | | ___  __ _ _ __ ___  | |    (_) | |_ ___  ___ 
  | | | '_ \ / _ \  |  \| |/ _ \/ _` | '_ ` _ \ | |    | | | __/ _ \/ __|
  | | | | | |  __/  | |\  |  __/ (_| | | | | | || |___ | | | ||  __/\__ \
  |_| |_| |_|\___|  |_| \_|\___|\__,_|_| |_| |_||_____||_|  \__\___||___/
                                                                           
              열네 밤의 꿈 v4.1 - 온라인 배포 완료! 🌙✨
```

**배포 URL**: `https://your-project.vercel.app`

**Happy Gaming! 🎮🎉**

---

**문서 버전**: 1.0  
**최종 수정**: 2024년 12월 1일  
**상태**: ✅ 배포 준비 완료
