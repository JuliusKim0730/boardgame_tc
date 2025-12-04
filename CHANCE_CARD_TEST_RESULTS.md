# 찬스 카드 테스트 결과

## 테스트 환경
- 백엔드: Node.js + Express + PostgreSQL
- 프론트엔드: React + TypeScript
- 테스트 방법: 실제 게임 플레이 시뮬레이션

---

## 구현 완료 사항

### ✅ 1. 돈 카드 (7장) - 완전 구현
**구현 위치**: `ChanceService.ts` → `handleMoneyCard()`

**로직**:
```typescript
// 플레이어 상태 ID 조회
const stateResult = await client.query(
  'SELECT id FROM player_states WHERE game_id = $1 AND player_id = $2',
  [gameId, playerId]
);

// 돈 업데이트
await client.query(
  'UPDATE player_states SET money = money + $1 WHERE id = $2',
  [moneyChange, playerStateId]
);
```

**테스트 필요**:
- [ ] CH1: +3,000TC 증가 확인
- [ ] CH2: +4,000TC 증가 확인
- [ ] CH3-CH7: -1,000TC 감소 확인
- [ ] 음수 방지 (0 이하로 떨어지지 않는지)

---

### ✅ 2. 상호작용 카드 (6장) - 완전 구현

#### CH8: 친구와 집안일
**구현 위치**: `ChanceService.ts` → `handleSharedHouse()`, `executeSharedHouse()`

**로직**:
1. 대상 선택 요청 → 프론트엔드 모달
2. 집안일 덱에서 카드 1장 드로우
3. 두 플레이어 모두에게 수익 지급

**테스트 필요**:
- [ ] 대상 선택 모달 표시
- [ ] 집안일 카드 드로우
- [ ] 두 플레이어 모두 돈 증가

#### CH9: 공동 지원 이벤트
**구현 위치**: `ChanceService.ts` → `handleSharedInvest()`, `executeSharedInvest()`

**로직**:
1. 대상 선택 요청
2. 여행지원 덱에서 카드 1장 드로우
3. 두 플레이어 모두에게 효과 적용

**테스트 필요**:
- [ ] 대상 선택 모달 표시
- [ ] 여행지원 카드 드로우
- [ ] 두 플레이어 모두 효과 적용

#### CH10: 계획 구매 요청
**구현 위치**: `ChanceService.ts` → `handlePurchaseRequest()`, `executePurchase()`

**로직**:
1. 대상 선택 및 카드 선택
2. 1,000TC에 구매 제안
3. 수락 시: 구매자 -1,000TC, 판매자 +1,000TC, 카드 소유권 이전

**테스트 필요**:
- [ ] 대상 및 카드 선택 모달
- [ ] 수락/거절 처리
- [ ] 돈 이동 및 카드 소유권 이전

#### CH11: 계획 교환 (2인 금지)
**구현 위치**: `ChanceService.ts` → `handleCardExchange()`, `executeCardExchange()`

**로직**:
1. 2인 플레이 체크 → 금지
2. 대상 선택 및 서로 카드 선택
3. 카드 소유권 교환

**테스트 필요**:
- [ ] 2인 플레이 시 사용 불가 확인
- [ ] 카드 교환 모달
- [ ] 카드 소유권 교환

#### CH12: 모두 내 자리로 (2인 금지)
**구현 위치**: `ChanceService.ts` → `handleSummonAll()`

**로직**:
1. 2인 플레이 체크 → 금지
2. 요청자의 현재 위치 조회
3. 모든 플레이어를 해당 위치로 이동
4. `forced_move` 플래그 설정

**테스트 필요**:
- [ ] 2인 플레이 시 사용 불가 확인
- [ ] 모든 플레이어 위치 변경
- [ ] forced_move 플래그 설정

#### CH13: 자리 바꾸기 (2인 금지)
**구현 위치**: `ChanceService.ts` → `handleSwapPosition()`, `executeSwapPosition()`

**로직**:
1. 2인 플레이 체크 → 금지
2. 대상 선택
3. 두 플레이어 위치 교환
4. `forced_move` 플래그 설정

**테스트 필요**:
- [ ] 2인 플레이 시 사용 불가 확인
- [ ] 위치 교환
- [ ] forced_move 플래그 설정

---

### ✅ 3. 드로우 카드 (3장) - 완전 구현

#### CH14: 여행 이야기 듣기
**구현 위치**: `ChanceService.ts` → `drawPlanForLowest()`

**로직**:
```sql
SELECT ps.id, ps.player_id, COUNT(h.id) as card_count
FROM player_states ps
LEFT JOIN hands h ON ps.id = h.player_state_id
WHERE ps.game_id = $1
GROUP BY ps.id, ps.player_id
ORDER BY card_count ASC
LIMIT 1
```

**테스트 필요**:
- [ ] 계획 카드 최저 플레이어 찾기
- [ ] 해당 플레이어에게 카드 지급
- [ ] 메시지 표시

#### CH15: 좋은 정보 발견
**구현 위치**: `ChanceService.ts` → `drawPlan()`

**로직**:
1. plan 덱에서 카드 1장 드로우
2. 손패에 추가

**테스트 필요**:
- [ ] 계획 카드 1장 획득
- [ ] 손패에 추가

#### CH16: 버린만큼 뽑기
**구현 위치**: `ChanceService.ts` → `handleDrawDiscarded()`

**로직**:
```sql
SELECT COUNT(*) as count 
FROM discarded_cards 
WHERE game_id = $1 AND player_state_id = $2
```

**테스트 필요**:
- [ ] 버린 카드 수 계산
- [ ] 해당 수만큼 계획 카드 드로우
- [ ] 손패에 추가

---

### ⚠️ 4. 특수 행동 카드 (4장) - 부분 구현

#### CH17: 여행 팜플렛
**구현 위치**: `ChanceService.ts` → `handleSelectJointPlan()`

**현재 상태**: 백엔드 구현 완료, 프론트엔드 모달 필요

**로직**:
1. 상호작용 요청 생성
2. 프론트엔드에 `chance-request` 이벤트 발송
3. 공동 목표 카드 선택 대기

**필요 작업**:
- [ ] 프론트엔드: 공동 목표 카드 선택 모달 구현
- [ ] 선택한 카드를 공동 목표로 설정하는 API 구현

#### CH18: 체력이 넘친다!
**구현 위치**: `ChanceService.ts` → `handleSpecialCard()`

**현재 상태**: 메시지만 반환

**로직**:
```typescript
return { 
  type: 'special', 
  action: 'extra_action', 
  message: '이동 없이 행동 1회를 수행할 수 있습니다' 
};
```

**필요 작업**:
- [ ] 프론트엔드: 추가 행동 처리 로직 구현
- [ ] 이동 없이 행동 가능하도록 상태 관리

#### CH19: 반전의 기회
**구현 위치**: `ChanceService.ts` → `handleRepeatCurrentAction()`

**현재 상태**: 현재 위치 반환

**로직**:
```typescript
return { 
  type: 'special', 
  action: 'repeat_current', 
  position: currentPosition,
  message: `현재 위치(${currentPosition}번)에서 행동을 1회 더 수행할 수 있습니다`
};
```

**필요 작업**:
- [ ] 프론트엔드: 현재 위치에서 추가 행동 처리

#### ✅ CH20: 공동 목표 지원 (수정 완료)
**구현 위치**: `ChanceService.ts` → `handleJointPlanSupport()`

**수정 내용**:
```typescript
// 플레이어 돈 차감
await client.query(
  'UPDATE player_states SET money = money - 3000 WHERE id = $1',
  [playerStateId]
);

// 공동 목표 기여
await client.query(
  'INSERT INTO joint_plan_contributions (game_id, player_state_id, amount) VALUES ($1, $2, 3000)',
  [gameId, playerStateId]
);
```

**테스트 필요**:
- [ ] 플레이어 돈 3,000TC 차감
- [ ] 공동 목표 기여 테이블에 3,000TC 추가
- [ ] 돈이 부족한 경우 처리

---

### ✅ 5. 캐치업 카드 (5장) - 완전 구현

#### CH21: 엄마의 응원
**구현 위치**: `ChanceService.ts` → `catchupMoney()`

**로직**:
```sql
SELECT player_id, money
FROM player_states
WHERE game_id = $1
ORDER BY money ASC
LIMIT 1
```

**테스트 필요**:
- [ ] TC 최저 플레이어 찾기
- [ ] 2,000TC 지급
- [ ] 메시지 표시

#### CH22: 여행 선생님의 조언
**구현 위치**: `ChanceService.ts` → `drawPlanForLowest()`

**로직**: CH14와 동일

**테스트 필요**:
- [ ] 계획 카드 최저 플레이어 찾기
- [ ] 계획 카드 1장 지급

#### CH23, CH24: 가족 사진 대작전, 엄마의 응원 메시지
**구현 위치**: `ChanceService.ts` → `catchupMemory()`

**로직**:
```sql
SELECT player_id, traits
FROM player_states
WHERE game_id = $1
ORDER BY (traits->>'memory')::int ASC NULLS FIRST
LIMIT 1
```

**테스트 필요**:
- [ ] 추억 최저 플레이어 찾기
- [ ] 추억 +2 적용
- [ ] 메시지 표시

#### CH25: 동행 버디
**구현 위치**: `ChanceService.ts` → `handleBuddyAction()`, `executeBuddyAction()`

**현재 상태**: 백엔드 구현 완료, 프론트엔드 처리 필요

**로직**:
1. 대상 선택 요청
2. 두 플레이어 모두 추가 행동 가능 상태로 설정

**필요 작업**:
- [ ] 프론트엔드: 두 플레이어 추가 행동 처리

---

## 수정 완료 사항

### ✅ CH20 공동 목표 지원 수정
**문제**: 기여만 하고 돈을 차감하지 않음

**수정 내용**:
- 플레이어 돈에서 3,000TC 차감
- 돈이 부족한 경우 에러 메시지 반환
- 공동 목표 기여 테이블에 3,000TC 추가

---

## 테스트 체크리스트

### 우선순위 1: 기본 효과 테스트
- [ ] CH1-CH7: 돈 증감 효과
- [ ] CH14, CH15: 카드 드로우
- [ ] CH20: 공동 목표 지원 (돈 차감 확인)
- [ ] CH21: TC 캐치업
- [ ] CH23, CH24: 추억 캐치업

### 우선순위 2: 상호작용 테스트
- [ ] CH8: 친구와 집안일
- [ ] CH9: 공동 지원 이벤트
- [ ] CH10: 계획 구매 요청

### 우선순위 3: 2인 금지 카드 테스트
- [ ] CH11: 계획 교환 (2인 금지)
- [ ] CH12: 모두 내 자리로 (2인 금지)
- [ ] CH13: 자리 바꾸기 (2인 금지)

### 우선순위 4: 특수 카드 테스트
- [ ] CH16: 버린만큼 뽑기
- [ ] CH17: 여행 팜플렛 (프론트엔드 구현 필요)
- [ ] CH18: 체력이 넘친다! (프론트엔드 구현 필요)
- [ ] CH19: 반전의 기회 (프론트엔드 구현 필요)
- [ ] CH25: 동행 버디 (프론트엔드 구현 필요)

---

## 알려진 이슈

### 1. 프론트엔드 모달 미구현
- CH17: 공동 목표 선택 모달
- CH11: 카드 교환 모달 (일부 구현됨)

### 2. 추가 행동 처리 미구현
- CH18: 이동 없이 행동 1회
- CH19: 현재 칸 행동 반복
- CH25: 동행 버디 추가 행동

### 3. 찬스 카드 효과 메시지
- 일부 카드의 효과 메시지가 명확하지 않음
- 프론트엔드에서 효과 결과를 더 명확하게 표시 필요

---

## 권장 테스트 순서

1. **돈 카드 테스트** (CH1-CH7)
   - 가장 간단하고 기본적인 효과
   - 돈 증감이 제대로 작동하는지 확인

2. **드로우 카드 테스트** (CH14, CH15)
   - 카드 드로우가 제대로 작동하는지 확인
   - 손패에 추가되는지 확인

3. **캐치업 카드 테스트** (CH21-CH24)
   - 최저 플레이어 찾기 로직 확인
   - 효과 적용 확인

4. **상호작용 카드 테스트** (CH8-CH10)
   - 대상 선택 모달 확인
   - 효과 적용 확인

5. **2인 금지 카드 테스트** (CH11-CH13)
   - 2인 플레이 시 사용 불가 확인
   - 3인 이상 플레이 시 정상 작동 확인

6. **특수 카드 테스트** (CH16-CH20, CH25)
   - 복잡한 로직 확인
   - 프론트엔드 구현 필요 사항 확인

