# 열네 밤의 꿈 - 프로젝트 구조

## 📁 주요 디렉토리

```
boardgame_01/
├── backend/              # 백엔드 서버 (Node.js + TypeScript)
│   ├── src/
│   │   ├── db/          # 데이터베이스 설정 및 시드 데이터
│   │   ├── routes/      # API 라우트
│   │   ├── services/    # 비즈니스 로직
│   │   ├── ws/          # WebSocket 핸들러
│   │   └── server.ts    # 서버 진입점
│   └── package.json
│
├── frontend/            # 프론트엔드 (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/  # React 컴포넌트
│   │   ├── contexts/    # React Context
│   │   ├── hooks/       # Custom Hooks
│   │   └── App.tsx      # 앱 진입점
│   └── package.json
│
├── shared/              # 공유 타입 정의
│   └── types.ts
│
├── docs/                # 문서
│   ├── archive/         # 오래된 문서 보관
│   └── ...
│
└── rulebook/            # 게임 규칙서
```

## 📄 주요 문서

### 필수 문서
- **README.md** - 프로젝트 개요 및 시작 가이드
- **START_HERE.md** - 빠른 시작 가이드
- **DEPLOYMENT_GUIDE_FINAL.md** - 배포 가이드

### 개발 문서
- **GAME_FLOW_AUDIT_REPORT.md** - 게임 플로우 전체 점검 보고서
- **GAME_FLOW_FIX_COMPLETE.md** - 게임 플로우 수정 완료 보고서
- **AI_SCHEDULER_OPTIMIZATION.md** - AI 스케줄러 최적화
- **AI_TURN_DUPLICATE_FIX.md** - AI 턴 중복 실행 수정
- **DAY_TRANSITION_FIX.md** - 날짜 전환 시스템 수정
- **GAME_CLEANUP_SYSTEM.md** - 게임 정리 시스템

### 설정 가이드
- **SUPABASE_QUICK_START.md** - Supabase 빠른 시작
- **SUPABASE_SETUP.md** - Supabase 상세 설정
- **DATABASE_MIGRATION_GUIDE.md** - 데이터베이스 마이그레이션
- **GITHUB_PUSH_GUIDE.md** - GitHub 푸시 가이드
- **GOOGLE_AI_STUDIO_GUIDE.md** - Google AI Studio 설정
- **GET_SUPABASE_CREDENTIALS.md** - Supabase 인증 정보 가져오기

### 참고 문서
- **CARD_CODES.md** - 카드 코드 목록
- **CHECKLIST.md** - 개발 체크리스트
- **FRONTEND_GUIDE.md** - 프론트엔드 가이드
- **DATABASE_ALTERNATIVES.md** - 데이터베이스 대안

## 🗂️ 아카이브

개발 과정에서 생성된 오래된 문서들은 `docs/archive/` 폴더로 이동되었습니다.
참고용으로만 사용하세요.

## 🚀 빠른 시작

1. **환경 설정**
   ```bash
   # 백엔드
   cd backend
   npm install
   
   # 프론트엔드
   cd frontend
   npm install
   ```

2. **환경 변수 설정**
   - `.env.example` 파일을 참고하여 `.env` 파일 생성
   - Supabase 및 Google AI Studio 인증 정보 입력

3. **서버 실행**
   ```bash
   # 백엔드 (터미널 1)
   cd backend
   npm run dev
   
   # 프론트엔드 (터미널 2)
   cd frontend
   npm run dev
   ```

4. **데이터베이스 초기화**
   - Supabase Dashboard → SQL Editor
   - `backend/src/db/schema.sql` 실행
   - `backend/src/db/seedCards_FULL.sql` 실행

## 📝 개발 히스토리

모든 개발 히스토리는 Git 커밋 로그와 `docs/archive/` 폴더에서 확인할 수 있습니다.

