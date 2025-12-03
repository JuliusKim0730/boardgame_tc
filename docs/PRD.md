# 열네 밤의 꿈 웹 보드게임 PRD (Product Requirements Document)

## 1. 개요 (Vision)
- 가족/친구가 함께 14일(14라운드) 동안 여행 준비를 하며 가장 높은 “행복 점수”를 목표로 하는 웹 보드게임.
- 핵심 가치는 실시간 상호작용(WebSocket), 간결한 턴 진행, 룰북 준수, 재시작/리플레이 용이성.
- 참조 문서:
  - `workflow_guide/game_01_workflow.md`
  - `rulebook/game_01_rule.md`

## 2. 사용자 및 페르소나 (Personas)
- 플레이어(초등~성인): 모바일/PC 브라우저로 입장, 방 생성/참여, 실시간으로 게임 진행.
- 방장(Host): 게임 시작/재시작 권한, 간단한 방 설정 권한.
- 관전자(Optional): 실시간 상태 열람(행동 불가).

## 3. 범위 (Scope)
- In
  - 로비/방 관리, 실시간 플레이어 동기화, 게임 세팅(덱 셔플/초기화), 14일 턴 루프(이동→행동), 찬스 카드 특수 상호작용, 공동 계획 기여, 최종 정산/결과, 소프트 리셋 후 재시작.
- Out
  - 랭킹 보드/소셜 로그인(초기 버전), 고급 매치메이킹, 외부 결제.

## 4. 핵심 워크플로우(번호체계)
- 1.00 로비/방 관리(Room Management) → `../workflows/1.00_로비_방관리.md`
- 2.00 게임 세팅/초기화(Rule Setup) → `../workflows/2.00_게임세팅_초기화.md`
- 3.00 턴 루프/카드 행동(Turn & Card Action) → `../workflows/3.00_턴루프_카드행동.md`
- 4.00 최종 정산/리플레이(End Game & Replay) → `../workflows/4.00_최종정산_리플레이.md`
- 5.00 동시성/예외/복구(Advanced) → `../workflows/5.00_동시성_예외복구.md`

## 5. 기능 요구사항 (FR)
- FR1 방 생성/참여/퇴장 및 실시간 인원 동기화(WebSocket).
- FR2 방장이 게임 시작 시, 룰북 기반 초기화(덱 셔플/여행지/공동계획 오픈/초기 자원 지급/선플레이어 확정).
- FR3 매 일차: 선플레이어 알림, 이동(인접/연속금지 검증), 행동(1~6), 결심 토큰 로직, 상태 업데이트 및 브로드캐스트.
- FR4 찬스 카드 특수 상호작용 처리(C8, C10, C11, C12, C13 등): 대상자 응답/타임아웃, 강제 이동/교환, 동기화.
- FR5 공동 계획 기여: 비턴 중에도 요청 허용, 원자적 트랜잭션, 목표 달성 여부 집계.
- FR6 14일차 최종 구매 → 점수 계산(여행지 배수/추억/공동 계획/보너스) → 결과 전달/표시.
- FR7 소프트 리셋: 동일 방 유지, 모든 게임 데이터 초기화, 대기 상태 전환 후 재시작 가능.
- FR8 접속 끊김/AFK/이탈 처리: 대기/자동행동(Bot) 폴백 옵션.

## 6. 비기능 요구사항 (NFR)
- NFR1 실시간성: 상호작용 액션 왕복 지연 p95 ≤ 300ms(같은 리전).
- NFR2 동시성/원자성: 공동 계획 기여, 카드 교환/구매 로직 트랜잭션 보장.
- NFR3 내구성: 게임 이벤트 `EventLog` 영속화, 리플레이 가능 메타데이터 보존.
- NFR4 보안: 방 토큰 기반 권한, 액션 권한 검증(턴/상태), 입력 유효성 검증.
- NFR5 확장성: 100 동시 방(4인 기준)에서 안정 동작. 수평 확장 가능.
- NFR6 관측성: 액션 처리율, 지연, 실패율, WebSocket 연결 수/에러 모니터링.

## 7. 데이터 모델 개요
- 상세 ERD는 `../docs/ERD.md` 참조.
- 핵심 엔티티: `GameRoom`, `Game`, `Player`, `PlayerState`, `Deck`, `Card`, `Hand`, `Turn`, `Action`, `JointPlanContribution`, `GameResult`, `EventLog`.

## 8. API 개요(초안)
- REST
  - POST `/rooms` 방 생성
  - POST `/rooms/{roomId}/join` 참여
  - POST `/rooms/{roomId}/start` 시작(세팅/초기화 트리거)
  - POST `/games/{gameId}/move` 이동
  - POST `/games/{gameId}/action` 행동(1~6)
  - POST `/games/{gameId}/chance/{code}` 찬스 카드 액션
  - POST `/games/{gameId}/contribute` 공동 계획 기여
  - POST `/games/{gameId}/finalize` 최종 구매/정산
  - POST `/rooms/{roomId}/soft-reset` 소프트 리셋
- WebSocket 채널
  - `/ws/rooms/{roomId}` 참여자/상태/이벤트 브로드캐스트

## 9. 수용 기준 (Acceptance)
- 방 생성/참여/시작/재시작 플로우가 단일 방에서 4인 동시 정상 동작.
- 14일차까지 모든 카드 액션/찬스 상호작용이 룰북과 일치.
- 공동 계획 집계/패널티/보상 규칙이 문서와 일치(2인 예외 포함).
- 결과 화면에 점수 세부내역, 순위, 자원, 구매 카드가 표시.

## 10. 장애/롤백
- 찬스 상호작용 타임아웃 시 안전 거절 처리 후 진행 유지.
- WS 단절 시 5분 AFK 유지 → 초과 시 Bot/강제 종료 정책 적용.
- 소프트 리셋 실패 시 방 강제 재시작 버튼 및 자동 리셋 폴백(1분).

## 11. 모니터링/지표
- 지연 p50/p95/p99, 에러율, WS 연결/이탈 수, 액션 처리율, 타임아웃 건수.
- 이벤트 스트림을 기반으로 세션 재구성 가능성 확인(샘플링).

## 12. 보안
- Room 스코프 토큰, 사용자 인증(초기 버전은 임시 닉네임+세션 토큰).
- 서버측 권한 검증: 턴/상태/대상자 유효성, Rate Limiting.

## 13. MLOps/운영 파이프라인 연계 가이드
- 목적: 각 워크플로우 MD에 기술된 정의를 독립 Job으로 배포/검증 가능하도록 구조화.
- 권장 구조(AWS 예시 — 영어 명세):
  - Runtime: Node.js 20, PostgreSQL (Amazon RDS), Redis (ElastiCache), WebSocket on ALB/NGINX, S3 for assets.
  - CI/CD: GitHub Actions → ECR build/push → EKS deploy (Blue/Green).
  - Observability: CloudWatch + OpenTelemetry, S3 로그 보존(30d).
- 공통 Artifact 명명 규칙
  - Image: `bg01-webapp:{git_sha}`
  - Infra: `bg01-iac:{version}`
  - Workflow Spec: `bg01-wf-{id}-{name}:{version}`
- 각 워크플로우의 MLOps 적용 항목은 해당 MD의 “MLOps 적용” 절을 참조.





