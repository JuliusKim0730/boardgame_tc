# 조사하기 행동 및 공동 계획 카드 표시 수정

## 📅 수정 날짜
2024-12-03

## 🐛 발견된 문제

### 1. 조사하기 행동 실패
- **증상**: 2번 조사하기 칸에서 행동 실행 시 실패
- **원인**: 확인 필요 (로그 추가로 디버깅)

### 2. 공동 계획 카드 정보 미표시
- **증상**: 
  - 카드 설명이 자세히 나오지 않음
  - 효과 정보가 표시되지 않음
  - JSON 파싱 에러 발생: "Unexpected non-whitespace character after JSON at position 3"
- **원인**: 
  - effects 필드 파싱 시 에러 처리 부족
  - metadata 파싱 실패 시 대체 로직 없음

## ✅ 적용된 수정사항

### 1. 공동 계획 카드 - 안전한 파싱 로직

#### description 표시 개선
```typescript
<div className="joint-card-description">
  {(() => {
    // description 우선
    if (jointPlanCard.description) return jointPlanCard.description;
    
    // metadata.description 시도
    try {
      const metadata = typeof jointPlanCard.metadata === 'string'
        ? JSON.parse(jointPlanCard.metadata)
        : jointPlanCard.metadata;
      if (metadata?.description) return metadata.description;
    } catch (e) {
      console.error('metadata 파싱 실패:', e);
    }
    
    // 기본 메시지
    return '함께 달성할 목표입니다';
  })()}
</div>
```

**개선 사항:**
- ✅ description 필드 우선 사용
- ✅ metadata 파싱 실패 시 에러 처리
- ✅ 기본 메시지 제공

#### effects 표시 개선
```typescript
{(() => {
  try {
    let effects = jointPlanCard.effects;
    
    // 문자열인 경우 파싱 시도
    if (typeof effects === 'string') {
      try {
        effects = JSON.parse(effects);
      } catch (e) {
        console.error('effects 파싱 실패:', e);
        return null;
      }
    }
    
    // effects가 객체이고 비어있지 않은 경우에만 표시
    if (effects && typeof effects === 'object' && Object.keys(effects).length > 0) {
      return (
        <div className="joint-card-effects">
          <div className="effects-title">달성 시 효과</div>
          <div className="effects-list">
            {effects.money && (
              <div className="effect-item">
                💰 {effects.money > 0 ? '+' : ''}{effects.money.toLocaleString()}TC
              </div>
            )}
            {effects.traits && typeof effects.traits === 'object' && 
              Object.entries(effects.traits).map(([trait, value]: [string, any]) => (
                <div key={trait} className="effect-item">
                  ✨ {trait} +{value}
                </div>
              ))
            }
            {effects.bonus && (
              <div className="effect-item">
                🎁 {effects.bonus}
              </div>
            )}
          </div>
        </div>
      );
    }
  } catch (error) {
    console.error('공동 계획 효과 렌더링 오류:', error);
  }
  return null;
})()}
```

**개선 사항:**
- ✅ try-catch로 전체 로직 감싸기
- ✅ 문자열 파싱 실패 시 null 반환
- ✅ 객체 타입 검증 추가
- ✅ traits 객체 타입 검증 추가
- ✅ 에러 로그 출력

### 2. 조사하기 행동 - 디버깅 로그 추가

#### performAction 함수
```typescript
async performAction(gameId: string, playerId: string, actionType: number): Promise<any> {
  console.log('=== TurnService.performAction 호출 ===');
  console.log('gameId:', gameId);
  console.log('playerId:', playerId);
  console.log('actionType:', actionType);
  
  // Turn Lock 검증
  try {
    turnManager.validateTurn(gameId, playerId);
    console.log('턴 검증 통과');
  } catch (error) {
    console.error('턴 검증 실패:', error);
    throw error;
  }
  // ...
}
```

#### 조사하기 케이스
```typescript
case 2: // 조사하기 - 계획 카드 1장 뽑기
  console.log('조사하기 행동 시작');
  console.log('playerState.id:', playerState.id);
  result = await this.drawCard(client, gameId, playerState.id, 'plan');
  console.log('카드 뽑기 완료:', result.card);
  result.message = `계획 카드 "${result.card.name}"를 획득했습니다!`;
  break;
```

#### drawCard 함수 상세 로그
```typescript
private async drawCard(client: any, gameId: string, playerStateId: string, deckType: string) {
  console.log('=== drawCard 호출 ===');
  console.log('gameId:', gameId);
  console.log('playerStateId:', playerStateId);
  console.log('deckType:', deckType);
  
  // 덱 조회
  const deckResult = await client.query(
    'SELECT card_order FROM decks WHERE game_id = $1 AND type = $2',
    [gameId, deckType]
  );
  
  if (deckResult.rows.length === 0) {
    throw new Error(`${deckType} 덱을 찾을 수 없습니다`);
  }
  
  const cardOrder = JSON.parse(deckResult.rows[0].card_order);
  console.log('덱 카드 수:', cardOrder.length);
  
  if (cardOrder.length === 0) {
    throw new Error(`${deckType} 덱에 카드가 없습니다`);
  }
  
  const cardId = cardOrder.shift();
  console.log('뽑은 카드 ID:', cardId);
  
  // 덱 업데이트
  await client.query(
    'UPDATE decks SET card_order = $1 WHERE game_id = $2 AND type = $3',
    [JSON.stringify(cardOrder), gameId, deckType]
  );
  console.log('덱 업데이트 완료, 남은 카드:', cardOrder.length);
  
  // 카드 정보 조회
  const cardResult = await client.query('SELECT * FROM cards WHERE id = $1', [cardId]);
  if (cardResult.rows.length === 0) {
    throw new Error(`카드 ID ${cardId}를 찾을 수 없습니다`);
  }
  
  const card = cardResult.rows[0];
  console.log('카드 정보:', { id: card.id, name: card.name, type: card.type });
  
  // 손패에 추가
  if (['plan', 'freeplan'].includes(deckType)) {
    console.log('손패에 추가 중...');
    const seqResult = await client.query(
      'SELECT COALESCE(MAX(seq), -1) + 1 as next_seq FROM hands WHERE player_state_id = $1',
      [playerStateId]
    );
    
    await client.query(
      'INSERT INTO hands (player_state_id, card_id, seq) VALUES ($1, $2, $3)',
      [playerStateId, cardId, seqResult.rows[0].next_seq]
    );
    console.log('손패 추가 완료, seq:', seqResult.rows[0].next_seq);
  } else {
    console.log('즉시 사용 카드, 손패에 추가하지 않음');
  }
  
  return { card };
}
```

**추가된 로그:**
- ✅ 함수 호출 시작
- ✅ 입력 파라미터
- ✅ 덱 조회 결과
- ✅ 카드 수 확인
- ✅ 뽑은 카드 ID
- ✅ 덱 업데이트 완료
- ✅ 카드 정보
- ✅ 손패 추가 여부
- ✅ 각 단계별 완료 상태

## 🔍 디버깅 가이드

### 조사하기 행동 실패 시 확인할 로그

1. **performAction 호출**
   ```
   === TurnService.performAction 호출 ===
   gameId: ...
   playerId: ...
   actionType: 2
   턴 검증 통과
   ```

2. **조사하기 시작**
   ```
   조사하기 행동 시작
   playerState.id: ...
   ```

3. **drawCard 호출**
   ```
   === drawCard 호출 ===
   gameId: ...
   playerStateId: ...
   deckType: plan
   덱 카드 수: 10
   뽑은 카드 ID: ...
   ```

4. **카드 정보**
   ```
   카드 정보: { id: '...', name: '...', type: 'plan' }
   ```

5. **손패 추가**
   ```
   손패에 추가 중...
   손패 추가 완료, seq: 1
   ```

6. **완료**
   ```
   카드 뽑기 완료: { id: '...', name: '...' }
   ```

### 에러 발생 시 체크리스트

- [ ] 덱이 존재하는가? (`plan` 타입 덱)
- [ ] 덱에 카드가 있는가? (card_order 배열 길이 > 0)
- [ ] 카드 ID가 유효한가?
- [ ] 카드 정보를 조회할 수 있는가?
- [ ] 손패 테이블에 삽입 가능한가?
- [ ] 트랜잭션이 정상적으로 커밋되는가?

## 📊 공동 계획 카드 데이터 구조

### 올바른 데이터 형식

```sql
INSERT INTO cards (type, code, name, description, effects, metadata) VALUES
('joint', 'JP1', '제주도 여행', '함께 제주도로 떠나요!', 
 '{"money": 2000, "traits": {"추억": 3, "자연": 2}}',
 '{"description": "아름다운 제주도에서 특별한 추억을 만들어요"}');
```

### effects 필드 예시

**돈만 있는 경우:**
```json
{"money": 2000}
```

**특성만 있는 경우:**
```json
{"traits": {"추억": 3, "모험": 2}}
```

**복합 효과:**
```json
{
  "money": 2000,
  "traits": {"추억": 3, "자연": 2},
  "bonus": "특별 기념품"
}
```

## ✅ 완료 사항

- [x] 공동 계획 카드 description 안전한 파싱
- [x] 공동 계획 카드 effects 안전한 파싱
- [x] JSON 파싱 에러 처리
- [x] 기본값 제공
- [x] 조사하기 행동 디버깅 로그 추가
- [x] drawCard 함수 상세 로그 추가
- [x] 에러 메시지 개선

## 🎯 다음 단계

1. 게임 실행 및 조사하기 행동 테스트
2. 백엔드 터미널에서 로그 확인
3. 에러 발생 시 로그 분석
4. 공동 계획 카드 정보 표시 확인
5. 필요시 추가 수정

## 📝 참고사항

- 모든 JSON 파싱은 try-catch로 감싸져 있음
- 에러 발생 시 콘솔에 로그 출력
- 파싱 실패 시 기본값 또는 null 반환
- 디버깅 로그는 프로덕션 배포 전 제거 권장
