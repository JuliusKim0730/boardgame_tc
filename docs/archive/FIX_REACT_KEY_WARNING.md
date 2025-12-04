# React Key Warning 수정

## 수정 날짜
2024-12-03

## 문제

콘솔에 React key 중복 경고 발생:
```
Warning: Encountered two children with the same key, 
`e5292caf-8c85-45be-9b4d-14acDcfc6cDb`. Keys should be unique so that 
components maintain their identity across updates.
```

## 원인 분석

1. **HandCards 컴포넌트**: `renderEffects` 함수에서 `key={key}` 사용
   - 여러 카드가 같은 특성(예: "taste")을 가질 경우 key 중복
   - 카드 목록과 모달에서 같은 함수 사용 시 key 충돌

2. **중복 카드 가능성**: 같은 카드 ID가 배열에 여러 번 포함될 수 있음

## 수정 내용

### 1. HandCards.tsx - renderEffects 함수 개선

**Before**:
```typescript
const renderEffects = (effects: any) => {
  return Object.entries(effects).map(([key, value]) => {
    return <span key={key}>...</span>;  // key 중복 가능
  });
};
```

**After**:
```typescript
const renderEffects = (effects: any, cardId?: string) => {
  return Object.entries(effects).map(([key, value]) => {
    const uniqueKey = cardId ? `${cardId}-${key}` : key;  // 고유 key 생성
    return <span key={uniqueKey}>...</span>;
  });
};
```

### 2. 중복 카드 감지 로직 추가

```typescript
// 중복 카드 ID 체크
const cardIds = cards.map(c => c.id);
const uniqueCardIds = new Set(cardIds);
if (cardIds.length !== uniqueCardIds.size) {
  console.warn('⚠️ 중복된 카드 ID 발견:', cards);
  const duplicates = cardIds.filter((id, index) => cardIds.indexOf(id) !== index);
  console.warn('중복 ID:', duplicates);
}
```

### 3. renderEffects 호출 시 cardId 전달

**카드 목록**:
```typescript
<div className="card-effects-preview">
  {renderEffects(card.effects, card.id)}
</div>
```

**카드 상세 모달**:
```typescript
<div className="effects-grid">
  {renderEffects(selectedCard.effects, `modal-${selectedCard.id}`)}
</div>
```

## 수정된 파일

- `frontend/src/components/HandCards.tsx`

## 테스트 방법

1. 게임 시작
2. 카드 여러 장 획득
3. 브라우저 콘솔 확인
   - React key warning 없어야 함
   - 중복 카드 ID 경고 확인

## 추가 확인 사항

### 중복 카드 발생 원인 조사

만약 중복 카드 경고가 발생한다면:

1. **백엔드 카드 드로우 로직 확인**
   - `TurnService.drawCard()` 함수
   - 같은 카드를 여러 번 추가하는지 확인

2. **프론트엔드 상태 업데이트 확인**
   - `loadGameState()` 함수
   - 손패 업데이트 시 중복 추가 여부 확인

3. **WebSocket 이벤트 중복 확인**
   - `action-completed` 이벤트가 여러 번 발생하는지 확인

## 예방 조치

### 백엔드에서 중복 방지

```typescript
// hands 테이블에 UNIQUE 제약 조건 추가
ALTER TABLE hands 
ADD CONSTRAINT unique_player_card 
UNIQUE (player_state_id, card_id);
```

### 프론트엔드에서 중복 제거

```typescript
// 손패 업데이트 시 중복 제거
const uniqueCards = cards.filter((card, index, self) => 
  index === self.findIndex(c => c.id === card.id)
);
```

## 결과

- ✅ React key warning 해결
- ✅ 고유 key 생성 로직 추가
- ✅ 중복 카드 감지 로직 추가
- ⏳ 중복 카드 발생 원인 조사 필요 (경고 발생 시)

## 참고

- React 공식 문서: [Lists and Keys](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- key는 형제 요소 간에만 고유하면 됨
- 전역적으로 고유할 필요는 없음
- 하지만 같은 부모 아래에서는 반드시 고유해야 함
