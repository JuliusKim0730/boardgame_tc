# Google AI Studio 참고 가이드

## 📚 종합 문서 완성

Google AI Studio로 프로젝트를 옮겨서 추가 개발할 수 있도록 **7개의 종합 문서**를 작성했습니다.

## 📂 문서 위치

```
AI_STUDIO_DOCS/
├── README.md                    # 📖 문서 인덱스 및 사용 가이드
├── 00_프로젝트_개요.md          # 🎯 프로젝트 전체 개요
├── 01_데이터베이스_구조.md      # 🗄️ DB 스키마 상세
├── 02_백엔드_아키텍처.md        # ⚙️ 백엔드 서비스 구조
├── 03_프론트엔드_구조.md        # 🎨 프론트엔드 컴포넌트
├── 04_게임_플로우.md            # 🎮 게임 진행 흐름
├── 05_API_명세.md               # 🔌 REST API & WebSocket
├── 06_카드_시스템.md            # 🃏 카드 시스템 상세
└── 07_개발_가이드.md            # 🛠️ 개발 환경 및 가이드
```

## 🚀 빠른 시작

### 1단계: 프로젝트 이해
```
AI_STUDIO_DOCS/README.md 읽기
↓
00_프로젝트_개요.md 읽기
↓
04_게임_플로우.md 읽기
```

### 2단계: 개발 환경 설정
```
07_개발_가이드.md의 "로컬 개발 환경 설정" 따라하기
```

### 3단계: 기능 개발
```
필요한 문서 참고:
- 백엔드: 02_백엔드_아키텍처.md + 05_API_명세.md
- 프론트엔드: 03_프론트엔드_구조.md
- 카드: 06_카드_시스템.md
- DB: 01_데이터베이스_구조.md
```

## 📖 각 문서 요약

### 00_프로젝트_개요.md
- 프로젝트 정보 (이름, 버전, 타입)
- 게임 컨셉 및 메커니즘
- 기술 스택 (Backend, Frontend, Database)
- 프로젝트 구조 (폴더 구조)
- 개발 현황 (완료/미완성 기능)
- 배포 환경 (Production, Development)
- 주요 문서 링크

### 01_데이터베이스_구조.md
- 13개 주요 테이블 상세
  - users, rooms, games, players, player_states
  - cards, decks, hands, purchased
  - turns, joint_plan_contributions
  - game_results, event_logs
- JSONB 필드 구조 (traits, effects, metadata)
- 테이블 간 관계 및 외래키
- 인덱스 정보
- 데이터 흐름 (게임 시작 → 턴 진행 → 최종 정산)
- 마이그레이션 가이드

### 02_백엔드_아키텍처.md
- 9개 주요 서비스 상세
  1. RoomService - 방 생성/참여
  2. GameSetupService - 게임 초기화
  3. TurnService - 턴 행동 처리
  4. TurnManager - 턴 관리 & 락
  5. ChanceService - 찬스 카드
  6. JointPlanService - 공동 계획
  7. GameFinalizationService - 최종 정산
  8. AIPlayerService - AI 플레이어
  9. AIScheduler - AI 스케줄러
- 각 서비스의 책임과 주요 메서드
- WebSocket 이벤트 (클라이언트 ↔ 서버)
- 에러 처리 및 트랜잭션
- 환경 변수 설정
- 배포 설정 (Render.com)

### 03_프론트엔드_구조.md
- React 컴포넌트 상세
  - LobbyScreen, WaitingRoom, GameScreen
  - GameBoard, PlayerInfo, HandCards
  - ResultScreen, 각종 모달
- API 서비스 (api.ts)
- WebSocket 서비스 (socket.ts)
- 스타일링 (CSS 구조, 색상)
- 환경 변수 설정
- 빌드 & 배포 (Vercel)

### 04_게임_플로우.md
- 전체 흐름 (로비 → 대기실 → 게임 → 결과)
- 턴 시작/이동/행동/종료 상세
- 특수 이벤트
  - 7일차 결심 토큰 회복
  - 2인 전용 규칙 (찬스 칸, 집안일 보너스)
- 최종 정산 프로세스
  - 최종 구매 → 특성 변환 → 점수 계산
- AI 플레이어 흐름
- 에러 처리 및 동시성 제어

### 05_API_명세.md
- 22개 REST API 엔드포인트
  - 방 관리 (5개)
  - 게임 플레이 (9개)
  - 최종 정산 (4개)
  - 찬스 카드 (2개)
  - 기타 (2개)
- 요청/응답 예시 (JSON)
- WebSocket 이벤트 목록
  - 클라이언트 → 서버 (3개)
  - 서버 → 클라이언트 (11개)
- 에러 응답 (400, 404, 500)
- CORS 설정

### 06_카드_시스템.md
- 7가지 카드 타입 (총 107장)
  1. 계획 카드 (40장)
  2. 무료 계획 카드 (10장)
  3. 집안일 카드 (10장)
  4. 여행 지원 카드 (10장)
  5. 찬스 카드 (25장)
  6. 여행지 카드 (10장)
  7. 공동 계획 카드 (2장)
- 카드 효과 및 메타데이터 구조
- 덱 시스템 (생성, 셔플, 드로우)
- 손패 관리 (추가, 조회, 제거)
- 구매 시스템
- 점수 계산 공식
- 특성 변환 (비주류 → 추억)
- 카드 추가 가이드

### 07_개발_가이드.md
- 로컬 개발 환경 설정
  - Node.js, PostgreSQL 설치
  - 프로젝트 클론
  - 데이터베이스 설정 (Supabase/로컬)
  - 백엔드/프론트엔드 실행
- 개발 워크플로우
  - 기능 추가 (백엔드/프론트엔드)
  - 데이터베이스 변경 (마이그레이션)
  - 카드 추가
  - WebSocket 이벤트 추가
- 디버깅 방법
- 테스트 시나리오 (수동 테스트)
- 배포 가이드 (Render, Vercel)
- 트러블슈팅
- 코드 스타일
- 추가 개발 아이디어

## 💡 Google AI Studio 사용 팁

### 1. 컨텍스트 제공
```
"AI_STUDIO_DOCS/02_백엔드_아키텍처.md를 참고하여 
새로운 서비스를 추가해줘"
```

### 2. 구체적인 요청
```
❌ "게임 기능을 추가해줘"
✅ "04_게임_플로우.md를 참고하여 
결심 토큰 사용 로직을 수정해줘"
```

### 3. 단계별 진행
```
1단계: "01_데이터베이스_구조.md를 참고하여 
새 테이블 스키마를 작성해줘"

2단계: "02_백엔드_아키텍처.md를 참고하여 
서비스 로직을 작성해줘"

3단계: "05_API_명세.md를 참고하여 
API 엔드포인트를 추가해줘"
```

### 4. 코드 검증
```
"작성한 코드가 기존 구조와 호환되는지 확인해줘"
"07_개발_가이드.md의 코드 스타일을 따르는지 확인해줘"
```

## 🎯 주요 개념 요약

### 게임 메커니즘
- **14일 턴제**: 각 플레이어가 14턴 진행
- **6칸 보드**: 1~6번 칸을 순환하며 이동
- **카드 수집**: 손패에 카드를 모아 최종 구매
- **특성 시스템**: 6가지 특성 + 추억
- **여행지 테마**: 특성 가중치 (x1, x2, x3)
- **공동 계획**: 10,000TC 목표 달성

### 기술 스택
- **Backend**: Node.js + Express + TypeScript + Socket.io
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Render (Backend) + Vercel (Frontend)

### 핵심 서비스
1. RoomService - 방 생성/참여
2. GameSetupService - 게임 초기화
3. TurnService - 턴 행동 처리
4. TurnManager - 턴 관리 & 락
5. ChanceService - 찬스 카드
6. JointPlanService - 공동 계획
7. GameFinalizationService - 최종 정산
8. AIPlayerService - AI 플레이어
9. AIScheduler - AI 스케줄러

## 📊 프로젝트 통계

- **총 코드 라인**: ~15,000 라인
- **백엔드 파일**: ~30개
- **프론트엔드 파일**: ~25개
- **데이터베이스 테이블**: 13개
- **카드 종류**: 7가지 (107장)
- **API 엔드포인트**: 22개
- **WebSocket 이벤트**: 14개
- **개발 기간**: 2024년 11월 ~ 12월
- **버전**: 4.1.0
- **완성도**: 95%

## 🔗 추가 리소스

### 프로젝트 루트 문서
- `README.md` - 프로젝트 개요
- `QUICK_START_UPDATED.md` - 빠른 시작
- `LOCAL_ISSUE_FIX_GUIDE.md` - 로컬 이슈 해결
- `CARD_CODES.md` - 카드 코드 목록

### 워크플로우 문서
- `workflows/1.00_로비_방관리.md`
- `workflows/2.00_게임세팅_초기화.md`
- `workflows/3.00_턴루프_카드행동.md`
- `workflows/4.00_최종정산_리플레이.md`
- `workflows/5.00_동시성_예외복구.md`

### 구현 완료 보고서
- `FINAL_COMPLETION_REPORT_V4.1.md`
- `IMPLEMENTATION_COMPLETE_V4.1.md`
- `AI_PLAYER_ALGORITHM_COMPLETE.md`
- `HAND_CARDS_AND_AI_FIX.md`

## ✅ 다음 단계

1. **AI_STUDIO_DOCS/README.md** 읽기
2. **00_프로젝트_개요.md** 읽기
3. **필요한 문서** 선택적으로 읽기
4. **Google AI Studio**에 문서 업로드
5. **추가 개발** 시작!

## 📝 문서 업데이트

이 문서는 **2024년 12월 3일** 기준으로 작성되었습니다.

프로젝트가 업데이트되면 이 문서도 함께 업데이트해야 합니다.

## 🎉 완료!

Google AI Studio로 프로젝트를 옮겨서 추가 개발할 준비가 완료되었습니다!

**AI_STUDIO_DOCS** 폴더의 문서들을 참고하여 개발을 진행하세요.
