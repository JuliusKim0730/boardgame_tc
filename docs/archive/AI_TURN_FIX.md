# AI 턴 실행 수정 완료

## 문제 상황
AI 플레이어가 자기 턴에 행동을 하지 않았습니다.

## 원인 분석

### 1. TurnManager 검증 충돌
```
AI 턴 실행 실패: Error: 현재 당신의 턴이 아닙니다
```
- AI가 `TurnService.performAction()`을 호출
- TurnService는 `TurnManager.validateTurn()` 검증을 거침
- AI는 자체 트랜잭션 내에서 실행하므로 검증 실패

### 2. JSON 파싱 에러
```
SyntaxError: Unexpected non-whitespace character after JSON at position 1
```
- `card_order`가 이미 배열 타입인데 `JSON.parse()` 시도
- PostgreSQL JSONB 타입은 자동으로 파싱됨

## 수정 내용

### AIPlayerService.ts

#### 1. move() 메서드 - 직접 DB 조작
```typescript
private async move(client: any, gameId: string, playerId: string, position: number) {
  // 현재 위치 조회
  const stateResult = await client.query(...);
  const currentPosition = stateResult.rows[0].position;
  
  // 위치 업데이트 (last_position 포함)
  await client.query(
    'UPDATE player_states SET position = $1, last_position = $2 ...',
    [position, currentPosition, gameId, playerId]
  );
  
  // 이벤트 로그
  await client.query('INSERT INTO event_logs ...');
}
```

#### 2. performAction() 메서드 - 직접 카드 드로우
```typescript
private async performAction(client: any, gameId: string, playerId: string, action: number) {
  // 덱 타입 결정
  let deckType = '';
  switch (action) {
    case 1: deckType = 'freeplan'; break;
    case 2: deckType = 'plan'; break;
    case 3: deckType = 'house'; break;
    case 4: deckType = 'support'; break;
    case 5: deckType = 'chance'; break;
  }
  
  // 덱에서 카드 드로우
  const deckResult = await client.query(...);
  let cardOrder = deckResult.rows[0].card_order;
  
  // JSON 파싱 (필요시)
  if (typeof cardOrder === 'string') {
    cardOrder = JSON.parse(cardOrder);
  }
  
  const cardId = cardOrder.shift();
  
  // 덱 업데이트
  await client.query('UPDATE decks SET card_order = $1 ...', [JSON.stringify(cardOrder), ...]);
  
  // 손패에 추가 (plan, freeplan만)
  if (['plan', 'freeplan'].includes(deckType)) {
    await client.query('INSERT INTO hands ...');
  }
  
  // TC 효과 적용 (house, support)
  if (card.effects && card.effects.money) {
    await client.query('UPDATE player_states SET money = money + $1 ...');
  }
  
  // 행동 로그
  await client.query('INSERT INTO event_logs ...');
}
```

#### 3. endTurn() 메서드 - 직접 턴 관리
```typescript
private async endTurn(client: any, gameId: string, playerId: string) {
  // 현재 턴 종료
  await client.query('UPDATE turns SET ended_at = NOW() ...');
  
  // 다음 플레이어 결정
  const players = await client.query('SELECT ... ORDER BY turn_order');
  const currentPlayerIndex = players.findIndex(p => p.player_id === playerId);
  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const nextPlayer = players[nextPlayerIndex];
  
  // 모든 플레이어가 턴을 마쳤으면 다음 날로
  const completedCount = await client.query('SELECT COUNT(DISTINCT ps.player_id) ...');
  let newDay = currentDay;
  if (completedCount >= totalPlayers) {
    newDay = currentDay + 1;
    
    // 14일차 종료 체크
    if (newDay > 14) {
      await client.query('UPDATE games SET status = $1 ...', ['finalizing', gameId]);
      return;
    }
  }
  
  // 게임 상태 업데이트
  await client.query(
    'UPDATE games SET current_turn_player_id = $1, day = $2 ...',
    [nextPlayer.player_id, newDay, gameId]
  );
  
  // 다음 턴 레코드 생성
  await client.query('INSERT INTO turns ...');
}
```

## 동작 방식

### AI 턴 실행 플로우
```
1. AIScheduler (5초마다)
   ↓
2. AI 플레이어 감지
   ↓
3. AIPlayerService.executeTurn()
   ├─ BEGIN TRANSACTION
   ├─ getGameState() - 게임 상태 조회
   ├─ decideMove() - 이동 결정
   ├─ move() - 이동 실행 (직접 DB 조작)
   ├─ decideAction() - 행동 결정
   ├─ performAction() - 행동 실행 (직접 카드 드로우)
   ├─ endTurn() - 턴 종료 (직접 턴 관리)
   └─ COMMIT TRANSACTION
```

### 장점
- TurnManager 검증 우회 (AI는 자체 트랜잭션 내에서 실행)
- 원자성 보장 (모든 작업이 하나의 트랜잭션)
- 에러 발생 시 자동 롤백

## 테스트 방법

### 1. 게임 시작
1. 방 생성
2. AI 추가 (3번 슬롯)
3. 게임 시작

### 2. AI 턴 확인
1. 사용자 턴 진행 (이동 → 행동 → 턴 종료)
2. AI 턴 시작 (5초 이내)
3. **체크포인트**: AI가 자동으로 이동하는가?
4. **체크포인트**: AI가 자동으로 행동을 수행하는가?
5. **체크포인트**: AI의 턴이 자동으로 종료되는가?
6. **체크포인트**: 다음 플레이어로 턴이 넘어가는가?

### 3. 백엔드 로그 확인
```
🤖 AI 턴 실행: 똑똑한AI71 (게임 ...)
✅ AI 턴 완료: 똑똑한AI71
```

**에러가 없어야 합니다!**

## 예상 결과

### 정상 동작
```
Day 1:
- 플레이어A 턴 (수동)
- 플레이어B 턴 (수동)
- 똑똑한AI71 턴 (자동, 5초 이내)
  → 이동: 1번 → 2번
  → 행동: 조사하기 (일반 계획 카드 획득)
  → 턴 종료
- 플레이어A 턴 (수동)
...
```

### 에러 발생 시
백엔드 로그에서 에러 메시지 확인:
- "현재 당신의 턴이 아닙니다" → 수정 완료
- "JSON parse error" → 수정 완료
- "column ... does not exist" → 데이터베이스 마이그레이션 필요

## 다음 단계

1. ✅ AI 턴 실행 수정 완료
2. ⏳ 로컬 테스트 진행
3. ⏳ AI 전략 알고리즘 검증
4. ⏳ 14일차 종료 및 결산 테스트
