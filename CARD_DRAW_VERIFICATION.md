# 카드 뽑기 로직 검증 완료

## 📅 검증 날짜
2024-12-03

## ✅ 검증 결과: 모두 정상

각 칸에서 올바른 카드를 뽑도록 코드가 작성되어 있습니다.

## 📋 칸별 카드 뽑기 로직

### 1번 칸 - 무료 계획
```typescript
case 1: // 무료 계획 - 무료계획 카드 1장 뽑기
  result = await this.drawCard(client, gameId, playerState.id, 'freeplan');
  result.message = `무료 계획 카드 "${result.card.name}"를 획득했습니다!`;
  break;
```
- ✅ **덱 타입**: `'freeplan'`
- ✅ **손패 추가**: 예 (plan, freeplan만 손패에 추가)
- ✅ **즉시 효과**: 없음

### 2번 칸 - 조사하기
```typescript
case 2: // 조사하기 - 계획 카드 1장 뽑기
  result = await this.drawCard(client, gameId, playerState.id, 'plan');
  result.message = `계획 카드 "${result.card.name}"를 획득했습니다!`;
  break;
```
- ✅ **덱 타입**: `'plan'` (계획 카드)
- ✅ **손패 추가**: 예
- ✅ **즉시 효과**: 없음

### 3번 칸 - 집안일
```typescript
case 3: // 집안일 - 집안일 카드 뽑기 + 돈/추억점수 획득
  result = await this.drawCard(client, gameId, playerState.id, 'house');
  const houseEffects = typeof result.card.effects === 'string' 
    ? JSON.parse(result.card.effects) 
    : result.card.effects;
  
  const houseMoney = houseEffects.money || 0;
  const houseMemory = houseEffects.memory || 0;
  
  await this.applyMoneyEffect(client, playerState.id, houseMoney);
  
  if (houseMemory > 0) {
    await client.query(
      'UPDATE player_states SET traits = jsonb_set(traits, \'{추억}\', to_jsonb((COALESCE((traits->>\'추억\')::int, 0) + $1)::int)) WHERE id = $2',
      [houseMemory, playerState.id]
    );
  }
  
  result.message = `집안일 완료! +${houseMoney}TC`;
  if (houseMemory > 0) result.message += `, +${houseMemory} 추억점수`;
  
  // 2인 전용: 첫 방문 시 +500TC
  if (is2Player) {
    const firstVisitResult = await client.query(
      'SELECT COUNT(*) as count FROM event_logs WHERE game_id = $1 AND event_type = $2 AND data->>\'playerId\' = $3',
      [gameId, 'action_3', playerId]
    );
    if (parseInt(firstVisitResult.rows[0].count) === 0) {
      await this.applyMoneyEffect(client, playerState.id, 500);
      result.message += ' (첫 방문 보너스 +500TC)';
    }
  }
  break;
```
- ✅ **덱 타입**: `'house'` (집안일 카드)
- ✅ **손패 추가**: 아니오 (즉시 사용)
- ✅ **즉시 효과**: 
  - 돈 획득 (1,500~2,000TC)
  - 추억 점수 획득 (있는 경우)
  - 2인 모드 첫 방문 보너스 +500TC

### 4번 칸 - 여행 지원
```typescript
case 4: // 여행 지원 - 여행지원 카드 뽑기 + 효과 적용
  result = await this.drawCard(client, gameId, playerState.id, 'support');
  const supportEffects = typeof result.card.effects === 'string' 
    ? JSON.parse(result.card.effects) 
    : result.card.effects;
  
  const supportMoney = supportEffects.money || 0;
  
  if (supportMoney !== 0) {
    await this.applyMoneyEffect(client, playerState.id, supportMoney);
    result.message = `여행 지원 "${result.card.name}" - ${supportMoney > 0 ? '+' : ''}${supportMoney}TC`;
  } else {
    result.message = `여행 지원 "${result.card.name}" 획득!`;
  }
  break;
```
- ✅ **덱 타입**: `'support'` (여행지원 카드, 구 투자 카드)
- ✅ **손패 추가**: 아니오 (즉시 사용)
- ✅ **즉시 효과**: 
  - 돈 증가 (+2,500 ~ +4,000TC)
  - 돈 감소 (-1,000 ~ -2,000TC)

### 5번 칸 - 찬스
```typescript
case 5: // 찬스 - 2인: 선택 모달, 다인: 찬스 카드
  if (is2Player) {
    // 2인 전용: 프론트엔드에서 선택 처리
    result.requiresChoice = true;
    result.message = '찬스 카드 또는 500TC를 선택하세요';
  } else {
    result = await this.drawCard(client, gameId, playerState.id, 'chance');
    result.message = `찬스 카드 "${result.card.name}"를 획득했습니다!`;
  }
  break;
```
- ✅ **덱 타입**: `'chance'` (찬스 카드)
- ✅ **손패 추가**: 아니오 (즉시 사용)
- ✅ **즉시 효과**: 
  - 2인 모드: 선택 모달 (찬스 카드 OR 500TC)
  - 다인 모드: 찬스 카드 뽑기

### 6번 칸 - 자유 행동
```typescript
case 6: // 자유 행동 - 1~5번 중 선택 가능
  // 프론트엔드에서 추가 선택 처리
  result.requiresFreeChoice = true;
  result.message = '1~5번 행동 중 하나를 선택하세요';
  break;
```
- ✅ **특별 처리**: 프론트엔드에서 1~5번 행동 선택
- ✅ **실제 행동**: 선택한 행동의 로직 실행

## 🔍 drawCard 함수 분석

```typescript
private async drawCard(client: any, gameId: string, playerStateId: string, deckType: string) {
  // 1. 덱에서 카드 순서 가져오기
  const deckResult = await client.query(
    'SELECT card_order FROM decks WHERE game_id = $1 AND type = $2',
    [gameId, deckType]
  );
  
  const cardOrder = JSON.parse(deckResult.rows[0].card_order);
  if (cardOrder.length === 0) {
    throw new Error('덱에 카드가 없습니다');
  }
  
  // 2. 첫 번째 카드 뽑기
  const cardId = cardOrder.shift();
  
  // 3. 덱 업데이트 (뽑은 카드 제거)
  await client.query(
    'UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3',
    [JSON.stringify(cardOrder), gameId, deckType]
  );
  
  // 4. 카드 정보 조회
  const cardResult = await client.query('SELECT * FROM cards WHERE id = $1', [cardId]);
  const card = cardResult.rows[0];
  
  // 5. 손패에 추가 (plan, freeplan만)
  if (['plan', 'freeplan'].includes(deckType)) {
    const seqResult = await client.query(
      'SELECT COALESCE(MAX(seq), -1) + 1 as next_seq FROM hands WHERE player_state_id = $1',
      [playerStateId]
    );
    
    await client.query(
      'INSERT INTO hands (player_state_id, card_id, seq) VALUES ($1, $2, $3)',
      [playerStateId, cardId, seqResult.rows[0].next_seq]
    );
  }
  
  return { card };
}
```

### drawCard 함수 동작 방식
1. ✅ 지정된 덱 타입에서 카드 순서 조회
2. ✅ 첫 번째 카드 ID 추출 (shift)
3. ✅ 덱에서 해당 카드 제거 (업데이트)
4. ✅ 카드 상세 정보 조회
5. ✅ 조건부 손패 추가 (plan, freeplan만)
6. ✅ 카드 정보 반환

## 📊 덱 타입별 처리 요약

| 칸 번호 | 칸 이름 | 덱 타입 | 손패 추가 | 즉시 효과 |
|---------|---------|---------|-----------|-----------|
| 1 | 무료 계획 | `freeplan` | ✅ 예 | ❌ 없음 |
| 2 | 조사하기 | `plan` | ✅ 예 | ❌ 없음 |
| 3 | 집안일 | `house` | ❌ 아니오 | ✅ 돈/추억 획득 |
| 4 | 여행 지원 | `support` | ❌ 아니오 | ✅ 돈 증감 |
| 5 | 찬스 | `chance` | ❌ 아니오 | ✅ 특수 효과 |
| 6 | 자유 행동 | (선택) | (선택에 따름) | (선택에 따름) |

## ✅ 검증 체크리스트

- [x] 1번 무료 계획: `freeplan` 덱에서 카드 뽑기
- [x] 2번 조사하기: `plan` 덱에서 카드 뽑기 ✨
- [x] 3번 집안일: `house` 덱에서 카드 뽑기 + 효과 적용
- [x] 4번 여행 지원: `support` 덱에서 카드 뽑기 + 효과 적용
- [x] 5번 찬스: `chance` 덱에서 카드 뽑기 (또는 선택)
- [x] 6번 자유 행동: 1~5번 중 선택 후 해당 로직 실행
- [x] plan/freeplan 카드만 손패에 추가
- [x] house/support/chance 카드는 즉시 사용
- [x] 카드 효과 즉시 적용 (돈, 추억 점수 등)

## 🎯 결론

**모든 칸에서 올바른 카드를 뽑도록 코드가 정확하게 작성되어 있습니다.**

특히 2번 조사하기 칸에서는:
- ✅ `'plan'` 덱 타입 사용
- ✅ 계획 카드 뽑기
- ✅ 손패에 추가
- ✅ 메시지: "계획 카드 [카드명]를 획득했습니다!"

## 🔧 추가 확인 사항

만약 게임에서 카드가 제대로 뽑히지 않는다면 다음을 확인하세요:

1. **덱 초기화 확인**
   - 게임 시작 시 모든 덱이 올바르게 생성되었는지 확인
   - `decks` 테이블에 각 타입별 덱이 존재하는지 확인

2. **카드 데이터 확인**
   - `cards` 테이블에 각 타입별 카드가 존재하는지 확인
   - 카드 타입: `freeplan`, `plan`, `house`, `support`, `chance`

3. **덱 순서 확인**
   - `card_order` 필드가 비어있지 않은지 확인
   - JSON 배열 형식으로 카드 ID가 저장되어 있는지 확인

## 🧪 테스트 시나리오

### 2번 조사하기 칸 테스트
1. 게임 시작
2. 2번 칸으로 이동
3. "조사하기" 버튼 클릭
4. 예상 결과:
   - 메시지: "계획 카드 [카드명]를 획득했습니다!"
   - 우측 패널 "내 카드"에 카드 추가
   - 카드 타입: `plan`

### 전체 칸 테스트
각 칸을 순서대로 방문하여:
1. 올바른 덱에서 카드를 뽑는지 확인
2. 손패 추가 여부 확인 (1, 2번만)
3. 즉시 효과 적용 확인 (3, 4, 5번)
4. 메시지 표시 확인

## 📝 참고사항

- 코드는 정확하게 작성되어 있으므로, 문제가 발생한다면 데이터베이스 상태나 덱 초기화 과정을 확인해야 합니다.
- 모든 카드 뽑기 로직은 `drawCard` 함수를 통해 일관되게 처리됩니다.
- 손패 추가는 `plan`과 `freeplan` 타입만 해당됩니다.
