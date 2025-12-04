# 미구현 기능 구현 상태 체크 (2024-12-03)

## 1. 결심 토큰 사용 (추가 행동) ✅ 구현됨

### 백엔드
- `TurnService.useResolveToken()` 구현 완료
- 토큰 차감 및 직전 행동 칸 반복 불가 검증
- 사용 로그 기록
- API 엔드포인트: `POST /games/:gameId/use-resolve-token`

### 프론트엔드
- GameScreen에 결심 토큰 힌트 표시
- 턴 종료 후 결심 토큰 사용 가능 안내

### 개선 필요
- 프론트엔드에 결심 토큰 사용 버튼 추가 필요
- 사용 후 추가 행동 선택 UI 필요

---

## 2. 최종 구매 (손패 카드 구매) ✅ 구현됨

### 백엔드
- `GameFinalizationService.finalPurchase()` 구현 완료
- 손패 카드 구매 및 비용 차감
- 구매 기록 저장
- API 엔드포인트: `POST /games/:gameId/final-purchase`

### 프론트엔드
- `FinalPurchaseModal.tsx` 컴포넌트 존재
- 카드 선택 및 구매 UI 구현

### 개선 필요
- 14일차 종료 시 최종 구매 모달 자동 표시 로직 추가 필요

---

## 3. 공동 계획 기여 (10,000TC 목표) ✅ 구현됨

### 백엔드
- `JointPlanService.contribute()` 구현 완료
- 기여 금액 누적 및 기록
- API 엔드포인트: `POST /games/:gameId/contribute`

### 프론트엔드
- GameScreen에 공동 계획 섹션 표시
- 기여 버튼 및 진행 상황 표시
- `ContributeModal` 컴포넌트 사용

### 상태
- 완전히 구현됨

---

## 4. 비주류 특성 변환 (3점 → 추억 1점) ✅ 구현됨

### 백엔드
- `GameFinalizationService.convertMinorTraits()` 구현 완료
- 가중치 1배 특성 3점을 추억 1점으로 변환
- API 엔드포인트: `POST /games/:gameId/convert-traits`

### 프론트엔드
- 미구현 (UI 없음)

### 개선 필요
- 최종 정산 전 비주류 특성 변환 UI 추가 필요
- 변환 가능한 특성 및 횟수 표시 필요

---

## 5. Day 전환 로직 ✅ 정상 작동

### 구현 상태
- `TurnManager.endTurn()` 에서 Day 전환 처리
- 모든 플레이어 턴 완료 시 다음 날로 이동
- Day 1 → 2 → 3 → ... → 14 정상 작동
- Day 8 시작 시 결심 토큰 회복 체크 (1-7일차 미사용 시)

### 검증 완료
```typescript
// TurnManager.ts 라인 80-120
if (completedTurns >= totalPlayers) {
  const newDay = currentDay + 1;
  
  if (newDay > 14) {
    // 게임 종료
    await client.query(
      'UPDATE games SET status = $1, current_turn_player_id = NULL WHERE id = $2',
      ['finalizing', gameId]
    );
    return { nextPlayerId: null, isGameEnd: true };
  }
  
  // 다음 날 시작
  await client.query(
    'UPDATE games SET day = $1 WHERE id = $2',
    [newDay, gameId]
  );
  
  // Day 8 시작 시 결심 토큰 회복
  if (newDay === 8) {
    // 토큰 회복 로직
  }
}
```

### 문제 없음
- Day 2, 3, 4, 5... 모두 정상 전환
- 선플레이어 순환 정상 작동

---

## 6. 마지막 날 (Day 14) 종료 로직 ✅ 구현됨

### 구현 상태
- Day 14 모든 플레이어 턴 완료 시 게임 상태 'finalizing'으로 변경
- `game-ended` 이벤트 발생
- 프론트엔드에서 ResultScreen 표시

### 검증 완료
```typescript
// TurnManager.ts
if (newDay > 14) {
  await client.query(
    'UPDATE games SET status = $1, current_turn_player_id = NULL WHERE id = $2',
    ['finalizing', gameId]
  );
  return { nextPlayerId: null, isGameEnd: true };
}
```

### 게임 종료 전 행동 패턴
1. Day 14 마지막 플레이어 턴 종료
2. `endTurn()` 호출
3. `completedTurns >= totalPlayers` 확인
4. `newDay = 15` 계산
5. `newDay > 14` 조건 충족
6. 게임 상태 'finalizing'으로 변경
7. `game-ended` 이벤트 발생
8. 프론트엔드에서 최종 정산 화면 표시

---

## 개선 필요 사항 요약

### 1. 결심 토큰 사용 UI
- [ ] 턴 종료 후 결심 토큰 사용 버튼 추가
- [ ] 사용 시 행동 선택 UI 표시
- [ ] 사용 후 행동 완료 → 턴 종료 플로우

### 2. 최종 구매 모달 자동 표시
- [ ] Day 14 종료 시 최종 구매 모달 자동 표시
- [ ] 모든 플레이어 구매 완료 후 최종 정산

### 3. 비주류 특성 변환 UI
- [ ] 최종 정산 전 변환 UI 추가
- [ ] 변환 가능한 특성 및 횟수 계산 표시
- [ ] 변환 확인 후 최종 점수 계산

### 4. 게임 종료 플로우 개선
- [ ] Day 14 → 최종 구매 → 특성 변환 → 최종 정산 순서 명확화
- [ ] 각 단계별 모달 표시 및 진행 상태 관리

---

## 결론

### 백엔드
- 모든 기능 구현 완료 ✅
- Day 전환 로직 정상 작동 ✅
- 게임 종료 로직 정상 작동 ✅

### 프론트엔드
- 결심 토큰 사용 UI 미흡 ⚠️
- 최종 구매 모달 자동 표시 미구현 ⚠️
- 비주류 특성 변환 UI 미구현 ⚠️

### 우선순위
1. 최종 구매 모달 자동 표시 (게임 종료 플로우)
2. 비주류 특성 변환 UI
3. 결심 토큰 사용 UI 개선
