# 게임 행동 버그 수정 완료

## 📅 수정 날짜
2024-12-03

## 🐛 발견된 문제

### 1. 이동 후 행동 버튼이 표시되지 않음
- **증상**: 칸으로 이동한 후 행동 선택 버튼이 나타나지 않음
- **원인**: `loadGameState()` 호출 시 `hasMoved` 상태가 초기화되지 않아야 하는데, 상태 관리 문제 발생
- **영향**: 플레이어가 행동을 수행할 수 없어 게임 진행 불가

### 2. 여행지 카드 상세정보 미표시
- **증상**: 도쿄 카드 등 여행지 카드 클릭 시 특성 이름이 표시되지 않음
- **원인**: 
  - 데이터베이스 구조: `effects`에 main/normal/sub, `metadata`에 multipliers 저장
  - 프론트엔드: `effects.weights`를 찾으려 했으나 실제로는 `metadata.multipliers`에 있음
- **영향**: 사용자가 여행지 카드의 특성 가중치를 확인할 수 없음

## ✅ 적용된 수정사항

### 1. 행동 상태 보존 로직 추가

#### `loadGameState` 함수 개선
```typescript
const loadGameState = async (preserveActionState = false) => {
  // preserveActionState가 true일 때 메시지 업데이트 건너뛰기
  if (!preserveActionState) {
    // 메시지 업데이트
  }
}
```

#### 이동 후 상태 보존
```typescript
await api.move(gameId, playerId, position);
setHasMoved(true);
await loadGameState(true); // 행동 상태 보존
```

#### 행동 후 상태 보존
```typescript
await api.performAction(gameId, playerId, actionType);
setHasActed(true);
await loadGameState(true); // 행동 상태 보존
```

### 2. 여행지 카드 데이터 구조 수정

#### 데이터베이스 구조 이해
```sql
-- 여행지 카드 예시 (도쿄)
INSERT INTO cards (type, code, name, effects, metadata) VALUES
('travel', 'T_TOKYO', '도쿄', 
  '{"main":"culture","normal":"taste","sub":"history"}',  -- effects
  '{"multipliers":{"culture":3,"taste":2,"history":1}}'   -- metadata
);
```

#### 프론트엔드 파싱 수정
```typescript
// metadata에서 multipliers 가져오기
const metadata = typeof travelCard.metadata === 'string'
  ? JSON.parse(travelCard.metadata)
  : travelCard.metadata;

const multipliers = metadata?.multipliers || {};

// 특성 이름 한글 매핑
const traitNames: { [key: string]: string } = {
  nature: '자연',
  history: '역사',
  culture: '문화',
  taste: '맛',
  water: '물',
  leisure: '여가'
};

// 가중치 표시
Object.entries(multipliers)
  .sort(([, a]: any, [, b]: any) => b - a)
  .map(([trait, weight]: [string, any]) => (
    <div key={trait} className="weight-item">
      <span className="trait-name">{traitNames[trait] || trait}</span>
      <span className={`weight-value weight-${weight}`}>×{weight}</span>
    </div>
  ))
```

### 3. 디버깅 로그 추가

#### 이동 로그
```typescript
console.log('=== handleMove 호출 ===');
console.log('position:', position);
console.log('isMyTurn:', gameState.currentTurnPlayerId === playerId);
console.log('hasMoved:', hasMoved);
```

#### 행동 버튼 렌더링 로그
```typescript
console.log('=== 행동 버튼 렌더링 조건 ===');
console.log('isMyTurn:', isMyTurn);
console.log('hasMoved:', hasMoved);
console.log('hasActed:', hasActed);
console.log('조건 충족:', isMyTurn && hasMoved && !hasActed);
```

#### 게임 상태 로드 로그
```typescript
console.log('=== 게임 상태 로드 ===');
console.log('preserveActionState:', preserveActionState);
console.log('내 상태 업데이트:', {
  position: myState.position,
  money: myState.money
});
```

## 🎯 수정 결과

### 행동 흐름
1. **이동**: 칸 클릭 → API 호출 → `hasMoved = true` → 상태 보존하며 로드
2. **행동 버튼 표시**: `isMyTurn && hasMoved && !hasActed` 조건 충족
3. **행동 실행**: 버튼 클릭 → API 호출 → `hasActed = true` → 상태 보존하며 로드
4. **턴 종료**: 2초 후 자동 턴 종료 → 상태 초기화

### 여행지 카드 표시
```
🎯 내 여행지
도쿄 ▶

[클릭 시 확장]

도쿄에서 특별한 추억을 만들어보세요!

특성 가중치
문화 ×3
맛 ×2
역사 ×1
```

## 📁 수정된 파일

### Frontend
1. `frontend/src/components/GameScreen.tsx`
   - `loadGameState(preserveActionState)` 파라미터 추가
   - 여행지 카드 데이터 파싱 로직 수정
   - 디버깅 로그 추가
   - 행동 상태 보존 로직 적용

## 🧪 테스트 시나리오

### 1. 이동 후 행동 버튼 표시
1. 게임 시작
2. 내 턴에 인접 칸 클릭
3. "행동 선택" 섹션이 표시되는지 확인
4. 해당 칸의 행동 버튼이 표시되는지 확인

### 2. 행동 실행
1. 행동 버튼 클릭
2. 카드 획득 또는 효과 적용 메시지 확인
3. 2초 후 자동 턴 종료 확인
4. 다음 플레이어 턴으로 전환 확인

### 3. 여행지 카드 상세정보
1. 좌측 패널 상단의 "내 여행지" 카드 클릭
2. 상세정보 확장 확인
3. 특성 가중치가 한글로 표시되는지 확인
   - 예: 문화 ×3, 맛 ×2, 역사 ×1
4. 다시 클릭하여 축소 확인

### 4. 자유행동 칸
1. 6번 칸으로 이동
2. 1~5번 행동 버튼 5개 표시 확인
3. 원하는 행동 선택
4. 해당 행동 실행 확인

## 🔍 디버깅 가이드

### 브라우저 콘솔에서 확인할 로그

#### 이동 시
```
=== handleMove 호출 ===
position: 2
isMyTurn: true
hasMoved: false
이동 API 호출 중...
이동 완료, hasMoved를 true로 설정
=== 게임 상태 로드 ===
preserveActionState: true
```

#### 행동 버튼 렌더링 시
```
=== 행동 버튼 렌더링 조건 ===
isMyTurn: true
hasMoved: true
hasActed: false
조건 충족: true
```

#### 행동 실행 시
```
=== 게임 상태 로드 ===
preserveActionState: true
내 상태 업데이트: { position: 2, money: 3500 }
```

### 문제 발생 시 체크리스트

1. **행동 버튼이 표시되지 않는 경우**
   - 콘솔에서 "행동 버튼 렌더링 조건" 로그 확인
   - `hasMoved` 값이 `true`인지 확인
   - `isMyTurn` 값이 `true`인지 확인

2. **여행지 카드 특성이 표시되지 않는 경우**
   - 콘솔에서 `travelCard` 객체 확인
   - `metadata.multipliers` 존재 여부 확인
   - 데이터베이스에 여행지 카드가 올바르게 저장되어 있는지 확인

3. **행동 실행 후 상태가 업데이트되지 않는 경우**
   - 콘솔에서 "게임 상태 로드" 로그 확인
   - `preserveActionState: true` 확인
   - API 응답 확인

## 🚀 다음 단계

1. 실제 게임 플레이 테스트
2. 모든 칸(1~6번)에서 행동 실행 테스트
3. 2인/다인 모드 차이점 검증
4. 디버깅 로그 제거 (프로덕션 배포 전)

## 📝 참고사항

- 디버깅 로그는 개발 중에만 사용하며, 프로덕션 배포 전 제거 필요
- `preserveActionState` 파라미터는 행동 흐름 중에만 `true`로 설정
- 여행지 카드 데이터 구조는 데이터베이스 시드 파일 참조
