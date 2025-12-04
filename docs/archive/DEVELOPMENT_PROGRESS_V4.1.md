# 개발 진행 상황 - v4.1 규칙 적용

## 📅 작업 일자
2024년 12월 1일

## 🎯 작업 목표
게임 룰북 v4.1과 카드 리스트 v4.1의 변경사항을 백엔드와 프론트엔드에 반영

---

## ✅ 완료된 작업

### 1. 문서 작업
- [x] `WORKFLOW_UPDATE_SUMMARY.md` 생성 - 모든 변경사항 상세 정리
- [x] Workflows 파일 5개 업데이트
  - [x] `2.00_게임세팅_초기화.md`
  - [x] `3.00_턴루프_카드행동.md`
  - [x] `4.00_최종정산_리플레이.md`
  - [x] `5.00_동시성_예외복구.md`

### 2. 백엔드 작업

#### 2.1. GameSetupService.ts
- [x] 초기 자금 2,000TC → **3,000TC** 변경
- [x] 덱 명칭 변경: "invest" → **"support"** (여행 지원)
- [x] 2인 전용 찬스 덱 초기화 메서드 추가
  - [x] `initializeChanceDeckFor2Players()` 구현
  - [x] CH11, CH12, CH13 카드 제거 로직

#### 2.2. TurnService.ts
- [x] 행동 4번 명칭 변경: "투자" → **"여행 지원"**
- [x] 집안일 카드 수익 범위 명시 (1,500~2,000TC)
- [x] 2인 전용 집안일 첫 방문 보너스 (+500TC) 구현
- [x] 2인 전용 찬스 칸 로직 준비 (프론트엔드 선택 대기)
- [x] 행동 로그 기록 추가
- [x] 결심 토큰 회복 체크 메서드 추가
  - [x] `checkResolveTokenRecovery()` 구현
  - [x] 7일차 시작 시 1~6일차 미사용자 토큰 회복

#### 2.3. GameFinalizationService.ts
- [x] 비주류 특성 변환 메서드 추가
  - [x] `convertMinorTraits()` 구현
  - [x] 가중치 1배 특성 3점 → 추억 +1 변환 로직
- [x] 최종 점수 계산 로직 업데이트
  - [x] 2인 전용 공동 목표 패널티 면제 플래그 추가
  - [x] 동률 규정 적용 (추억 → TC 순서)
  - [x] memoryScore 반환값 추가

### 3. 프론트엔드 작업

#### 3.1. GameBoard.tsx
- [x] 행동 칸 명칭 변경: "투자" → **"여행 지원"**

#### 3.2. 신규 컴포넌트 생성

**ChanceOptionModal** (2인 전용 찬스 칸 선택)
- [x] `ChanceOptionModal.tsx` 생성
- [x] `ChanceOptionModal.css` 생성
- [x] 찬스 카드 OR 500TC 선택 UI
- [x] 선택 확인 버튼 및 상태 관리

**TraitConversionModal** (비주류 특성 변환)
- [x] `TraitConversionModal.tsx` 생성
- [x] `TraitConversionModal.css` 생성
- [x] 비주류 특성 표시 및 변환 횟수 선택 UI
- [x] 변환 미리보기 기능
- [x] 최대 변환 횟수 자동 계산

---

## 🔄 진행 중인 작업

### 백엔드
- [ ] ChanceService.ts 업데이트
  - [ ] CH19 "반전의 기회" 카드 로직 추가
  - [ ] 2인 전용 CH11/12/13 차단 로직 강화
  
- [ ] JointPlanService.ts 업데이트
  - [ ] 2인 전용 패널티 면제 파라미터 추가

### 프론트엔드
- [ ] GameScreen.tsx 통합
  - [ ] ChanceOptionModal 연동
  - [ ] TraitConversionModal 연동
  - [ ] 2인 플레이 감지 로직
  
- [ ] ResultScreen.tsx 업데이트
  - [ ] 비주류 특성 변환 단계 추가
  - [ ] 동률 규정 표시 개선

### API 라우트
- [ ] gameRoutes.ts 엔드포인트 추가
  - [ ] `POST /games/:gameId/convert-traits` (비주류 특성 변환)
  - [ ] `POST /games/:gameId/chance-option` (2인 찬스 선택)

---

## 📋 남은 작업

### High Priority
1. [ ] 데이터베이스 스키마 확인 및 마이그레이션
   - [ ] `support` 타입 카드 데이터 확인
   - [ ] 결심 토큰 필드 타입 확인 (boolean → number)
   
2. [ ] 카드 데이터 시드 업데이트
   - [ ] 집안일 카드 수익 1,500~2,000TC로 조정
   - [ ] 여행 지원 카드 데이터 추가 (Y1~Y16)
   - [ ] 찬스 카드 CH19 추가
   
3. [ ] API 통합 테스트
   - [ ] 초기화 시 3,000TC 확인
   - [ ] 2인 플레이 찬스 덱 확인
   - [ ] 결심 토큰 회복 타이밍 테스트

### Medium Priority
4. [ ] WebSocket 이벤트 추가
   - [ ] `chance.option.request` (2인 찬스 선택 요청)
   - [ ] `trait.conversion.request` (비주류 특성 변환 요청)
   - [ ] `resolve.token.recovered` (결심 토큰 회복 알림)

5. [ ] 프론트엔드 상태 관리
   - [ ] 2인 플레이 모드 전역 상태 추가
   - [ ] 결심 토큰 최대 보유량 표시

6. [ ] UI/UX 개선
   - [ ] 2인 전용 규칙 안내 툴팁
   - [ ] 집안일 첫 방문 보너스 알림
   - [ ] 비주류 특성 변환 가이드

### Low Priority
7. [ ] 에러 처리 강화
   - [ ] 2인 플레이 시 CH11/12/13 차단 에러 메시지
   - [ ] 비주류 특성 부족 시 안내
   
8. [ ] 로깅 및 모니터링
   - [ ] 2인 전용 규칙 사용 통계
   - [ ] 비주류 특성 변환 빈도 추적

---

## 🧪 테스트 계획

### 단위 테스트
- [ ] GameSetupService
  - [ ] 초기 자금 3,000TC 검증
  - [ ] 2인 찬스 덱 CH11/12/13 제거 확인
  
- [ ] TurnService
  - [ ] 집안일 첫 방문 보너스 (2인)
  - [ ] 결심 토큰 7일차 회복
  
- [ ] GameFinalizationService
  - [ ] 비주류 특성 변환 계산
  - [ ] 동률 규정 정렬

### 통합 테스트
- [ ] 2인 플레이 전체 플로우
  - [ ] 초기화 → 찬스 칸 선택 → 집안일 보너스 → 최종 정산
  
- [ ] 3~5인 플레이 기존 기능 유지 확인
  - [ ] 공동 목표 패널티 적용
  - [ ] 찬스 카드 CH11/12/13 정상 작동

### E2E 테스트
- [ ] 2인 게임 시나리오
  - [ ] 방 생성 → 2명 참여 → 게임 시작
  - [ ] 찬스 칸 500TC 선택
  - [ ] 집안일 첫 방문 보너스 확인
  - [ ] 비주류 특성 변환 → 최종 점수 확인
  
- [ ] 4인 게임 시나리오 (기존 기능)
  - [ ] 공동 목표 실패 시 패널티 확인
  - [ ] CH11/12/13 카드 정상 작동

---

## 📊 진행률

### 전체 진행률: **45%**

- 문서 작업: **100%** ✅
- 백엔드 핵심 로직: **70%** 🔄
- 프론트엔드 컴포넌트: **40%** 🔄
- API 통합: **20%** ⏳
- 테스트: **0%** ⏳

---

## 🚀 다음 단계

### 즉시 진행
1. 데이터베이스 스키마 확인 및 카드 데이터 업데이트
2. ChanceService 및 JointPlanService 업데이트
3. API 라우트 추가 및 프론트엔드 통합

### 이후 진행
4. WebSocket 이벤트 추가
5. 통합 테스트 작성 및 실행
6. UI/UX 개선 및 에러 처리

---

## 📝 참고사항

### 주요 변경 사항 요약
- 초기 자금: 2,000TC → **3,000TC**
- 투자 카드 → **여행 지원 카드**
- 집안일 수익: **1,500~2,000TC 통일**
- 2인 전용 규칙 3가지 추가
- 비주류 특성 변환 기능 추가
- 결심 토큰 주간 회복 로직 추가
- 동률 규정 명확화

### 기술 스택
- Backend: Node.js, TypeScript, PostgreSQL
- Frontend: React, TypeScript, Vite
- WebSocket: Socket.io
- Database: Supabase (PostgreSQL)

---

## 🔗 관련 문서
- [WORKFLOW_UPDATE_SUMMARY.md](./WORKFLOW_UPDATE_SUMMARY.md) - 상세 변경사항
- [rulebook/game_rule_v4.1.md](./rulebook/game_rule_v4.1.md) - 게임 룰북
- [rulebook/game_card_v4.1.md](./rulebook/game_card_v4.1.md) - 카드 리스트
- [workflows/](./workflows/) - 워크플로우 문서들
