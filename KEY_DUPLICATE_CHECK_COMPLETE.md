# React Key 중복 검사 완료

## 검사 날짜
2024-12-03

## 검사 범위
프론트엔드 모든 React 컴포넌트 (`.tsx` 파일)

## 검사 결과

### ✅ 수정 완료
1. **HandCards.tsx** - `renderEffects` 함수에 `cardId` 파라미터 추가
2. **CardDrawModal.tsx** - `renderEffects` 함수에 고유 key 생성 로직 추가

### ✅ 문제 없음 (올바른 key 사용)

#### 1. ActionLog.tsx
```typescript
logs.map((log) => (
  <div key={log.id}>  // ✅ 고유 ID 사용
))
```

#### 2. ChanceModal.tsx
```typescript
players.map((player) => (
  <button key={player.id}>  // ✅ 고유 ID 사용
))

cards.map((card) => (
  <button key={card.id}>  // ✅ 고유 ID 사용
))
```

#### 3. GameBoard.tsx
```typescript
positions.map((pos) => (
  <g key={pos.id}>  // ✅ 고유 ID 사용
))
```

#### 4. GameScreen.tsx
```typescript
// 플레이어 목록
allPlayers.map(p => (
  <div key={p.id}>  // ✅ 고유 ID 사용
))

// 여행지 가중치
Object.entries(multipliers).map(([trait, weight]) => (
  <div key={trait}>  // ✅ 특성 이름은 고유함
))

// 자유 행동 버튼
[1, 2, 3, 4, 5].map(num => (
  <button key={num}>  // ✅ 숫자는 고유함
))
```

#### 5. PlayerInfo.tsx
```typescript
Array.from({ length: resolveToken }).map((_, i) => (
  <span key={i}>  // ✅ 인덱스 사용 (배열 길이 고정, 순서 불변)
))
```
**참고**: 일반적으로 인덱스를 key로 사용하는 것은 권장되지 않지만, 
이 경우는 배열 길이가 변하지 않고 순서가 중요하지 않으므로 괜찮습니다.

#### 6. ResultScreen.tsx
```typescript
results.map((result) => (
  <div key={result.playerId}>  // ✅ 고유 ID 사용
))
```

#### 7. TraitConversionModal.tsx
```typescript
Object.entries(minorTraits).map(([trait, value]) => (
  <div key={trait}>  // ✅ 특성 이름은 고유함
))
```

#### 8. WaitingRoom.tsx
```typescript
slots.map((slot) => (
  <div key={slot.index}>  // ✅ 슬롯 인덱스는 고유함
))

getDropdownOptions(slot).map((option) => (
  <button key={option.value}>  // ✅ 옵션 값은 고유함
))
```

## 수정 상세

### 1. HandCards.tsx

**Before**:
```typescript
const renderEffects = (effects: any) => {
  return Object.entries(effects).map(([key, value]) => {
    return <span key={key}>...</span>;  // ❌ key 중복 가능
  });
};

// 사용
{renderEffects(card.effects)}
```

**After**:
```typescript
const renderEffects = (effects: any, cardId?: string) => {
  return Object.entries(effects).map(([key, value]) => {
    const uniqueKey = cardId ? `${cardId}-${key}` : key;
    return <span key={uniqueKey}>...</span>;  // ✅ 고유 key
  });
};

// 사용
{renderEffects(card.effects, card.id)}
{renderEffects(selectedCard.effects, `modal-${selectedCard.id}`)}
```

### 2. CardDrawModal.tsx

**Before**:
```typescript
const renderEffects = () => {
  return Object.entries(card.effects).map(([key, value]) => {
    return <div key={key}>...</div>;  // ❌ key 중복 가능
  });
};
```

**After**:
```typescript
const renderEffects = () => {
  return Object.entries(card.effects).map(([key, value]) => {
    const uniqueKey = `${card.id}-${key}`;
    return <div key={uniqueKey}>...</div>;  // ✅ 고유 key
  });
};
```

## 중복 카드 감지 로직

HandCards.tsx에 중복 카드 ID 감지 로직 추가:

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

## 테스트 방법

1. 브라우저 새로고침
2. 게임 시작 및 진행
3. 개발자 도구 콘솔 확인
   - React key warning 없어야 함
   - 중복 카드 ID 경고 확인

## 결론

### ✅ 모든 컴포넌트 검사 완료
- 총 10개 컴포넌트 검사
- 2개 컴포넌트 수정 (HandCards, CardDrawModal)
- 8개 컴포넌트 문제 없음

### 🎯 Key 사용 원칙 준수
1. **고유 ID 우선**: `key={item.id}`
2. **특성/이름 사용**: `key={trait}` (고유한 경우)
3. **조합 key**: `key={`${parentId}-${childKey}`}` (중복 방지)
4. **인덱스 최소화**: 배열이 고정되고 순서가 불변인 경우만

### 📝 추가 권장사항

#### 백엔드에서 중복 방지
```sql
-- hands 테이블에 UNIQUE 제약 조건 추가
ALTER TABLE hands 
ADD CONSTRAINT unique_player_card 
UNIQUE (player_state_id, card_id);
```

#### 프론트엔드에서 중복 제거
```typescript
// 손패 업데이트 시 중복 제거
const uniqueCards = cards.filter((card, index, self) => 
  index === self.findIndex(c => c.id === card.id)
);
```

## 수정된 파일

1. `frontend/src/components/HandCards.tsx`
2. `frontend/src/components/CardDrawModal.tsx`

## 참고 문서

- React 공식 문서: [Lists and Keys](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- `FIX_REACT_KEY_WARNING.md` - 이전 수정 내역
