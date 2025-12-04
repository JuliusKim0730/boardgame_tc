# 게임 플로우 전체 점검 보고서 (3인 플레이 기준)

## 점검 일시
2024-12-04

## 점검 범위
- 게임 시작 → Day 14 종료 → 최종 점수 산정 → 순위 표시
- 3인 플레이 기준 전체 플로우

---

## ✅ 정상 작동 확인 항목

### 1. 게임 초기화 (GameSetupService)
- ✅ 플레이어 3명 슬롯 순서대로 턴 순서 배정
- ✅ 초기 자금 3,000TC 지급
- ✅ 초기 결심 토큰 1개 지급
- ✅ 여행지 카드 1장씩 배분 (공개)
- ✅ 초기 일반 계획 카드 1장 드로우
- ✅ 6종 덱 초기화 (plan, freeplan, house, support, joint, travel)
- ✅ 찬스 덱 초기화 (3인: 전체 26장, 2인: CH11/12/13 제외)
- ✅ 공동 목표 카드 1장 오픈
- ✅ 선 플레이어(방장) 턴 시작

### 2. 턴 시스템 (TurnManager, TurnService)
- ✅ 턴 락 시스템 (중복 턴 방지)
- ✅ 이동 처리 (인접 칸 검증, 연속 사용 금지)
- ✅ 행동 처리 (1~6번 칸)
  - ✅ 1번: 무료 계획 카드 드로우
  - ✅ 2번: 일반 계획 카드 드로우
  - ✅ 3번: 집안일 (1,500~2,000TC + 추억)
  - ✅ 4번: 여행 지원 (±TC)
  - ✅ 5번: 찬스 카드 (3인: 카드, 2인: 선택)
  - ✅ 6번: 자유 행동 (1~5 선택)
- ✅ 결심 토큰 사용 (추가 행동)
- ✅ 턴 종료 및 다음 플레이어 전환

### 3. 날짜 전환 (TurnManager)
- ✅ 모든 플레이어 턴 완료 시 다음 날로 전환
- ✅ 선플레이어 순환 (0번 → 마지막, 1번 → 0번)
- ✅ Day 8 시작 시 결심 토큰 회복 체크 (1-7일차 미사용 시 +1)
- ✅ Day 14 완료 시 게임 종료 (finalizing 상태)

### 4. 카드 데이터 (seedCards_FULL.sql)
- ✅ 여행지 카드: 10장
- ✅ 무료 계획 카드: 8장
- ✅ 일반 계획 카드: 40장
- ✅ 집안일 카드: 13장
- ✅ 여행 지원 카드: 16장
- ✅ 찬스 카드: 26장
- ✅ 공동 계획 카드: 10장
- ✅ **총 123장** (모두 정상)

### 5. 찬스 카드 시스템 (ChanceService)
- ✅ 돈 카드 (CH1-7)
- ✅ 상호작용 카드 (CH8-13, 2인 금지 포함)
- ✅ 드로우 카드 (CH14-17)
- ✅ 특수 행동 카드 (CH18-20)
- ✅ 캐치업 카드 (CH21-25)
- ✅ 2인 전용 금지 카드 체크 (CH11/12/13)

### 6. 공동 계획 시스템 (JointPlanService)
- ✅ 기여 시스템
- ✅ 최종 정산 (성공/실패)
- ✅ 최다 기여자 보너스
- ✅ 2인 전용: 실패 시 패널티 없음

### 7. 최종 점수 산정 (GameFinalizationService)
- ✅ 특성 점수 × 여행지 배수
- ✅ 추억 점수 (1:1)
- ✅ 공동 계획 정산
- ✅ 비주류 특성 변환 (3점 → 추억 +1)
- ✅ 순위 정렬 (동률: 1순위 추억, 2순위 TC)
- ✅ 중복 실행 방지 (finished 상태 체크)

---

## ⚠️ 발견된 이슈

### 이슈 1: CH16 "버린만큼 뽑기" 메타데이터 오류
**위치**: `backend/src/db/seedCards_FULL.sql` Line 149
**문제**: `"action":"discard_draw"` → 실제 코드는 `"draw_discarded"` 사용
**영향**: CH16 카드 효과 미작동
**수정 필요**: metadata의 action 값 통일

### 이슈 2: CH17 "여행 팜플렛" 메타데이터 오류
**위치**: `backend/src/db/seedCards_FULL.sql` Line 150
**문제**: `"action":"replace_joint"` → 실제 코드는 `"select_joint_plan"` 사용
**영향**: CH17 카드 효과 미작동
**수정 필요**: metadata의 action 값 통일

### 이슈 3: CH20 "공동 목표 지원" 메타데이터 오류
**위치**: `backend/src/db/seedCards_FULL.sql` Line 153
**문제**: `"action":"joint_contribution"` → 실제 코드는 `"joint_plan_support"` 사용
**영향**: CH20 카드 효과 미작동
**수정 필요**: metadata의 action 값 통일

### 이슈 4: CH21 "엄마의 응원" 메타데이터 오류
**위치**: `backend/src/db/seedCards_FULL.sql` Line 155
**문제**: `"action":"money_catchup"` → 실제 코드는 `"catchup_money"` 사용
**영향**: CH21 카드 효과 미작동
**수정 필요**: metadata의 action 값 통일

### 이슈 5: CH22 "여행 선생님의 조언" 메타데이터 오류
**위치**: `backend/src/db/seedCards_FULL.sql` Line 156
**문제**: `"action":"plan_catchup"` → 실제 코드는 `"catchup_plan"` 사용
**영향**: CH22 카드 효과 미작동
**수정 필요**: metadata의 action 값 통일

### 이슈 6: CH23, CH24 메타데이터 오류
**위치**: `backend/src/db/seedCards_FULL.sql` Line 157-158
**문제**: `"action":"memory_catchup"` → 실제 코드는 `"catchup_memory"` 사용
**영향**: CH23, CH24 카드 효과 미작동
**수정 필요**: metadata의 action 값 통일

### 이슈 7: AI 최종 구매 자동 실행 누락
**위치**: `backend/src/services/TurnManager.ts` Line 195
**문제**: AI 플레이어 최종 구매 자동 실행 코드 있으나, AIScheduler에 해당 메서드 미구현
**영향**: AI 플레이어가 최종 구매를 하지 않음
**수정 필요**: AIScheduler에 `executeAIFinalPurchases` 메서드 구현

---

## 🔧 수정 계획

1. **찬스 카드 메타데이터 통일** (seedCards_FULL.sql)
   - CH16, CH17, CH20, CH21, CH22, CH23, CH24 action 값 수정

2. **AI 최종 구매 로직 구현** (AIScheduler.ts)
   - `executeAIFinalPurchases` 메서드 추가
   - 모든 AI 플레이어의 손패 카드 자동 구매 처리

---

## 📊 전체 평가

### 완성도: 95%
- 핵심 게임 플로우: ✅ 완벽
- 턴 시스템: ✅ 완벽
- 카드 시스템: ⚠️ 찬스 카드 7장 메타데이터 오류
- 점수 산정: ✅ 완벽
- AI 시스템: ⚠️ 최종 구매 미구현

### 우선순위
1. **긴급**: 찬스 카드 메타데이터 수정 (게임 플레이 영향)
2. **중요**: AI 최종 구매 로직 구현 (AI 플레이 완성도)

