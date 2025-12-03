# 공동 계획 카드 효과 표시 추가

## 📅 업데이트 날짜
2024-12-03

## ✨ 추가된 기능

공동 계획 카드 하단에 **달성 시 효과** 정보를 표시합니다.

## 🎨 UI 구성

### 공동 계획 섹션
```
┌─────────────────────────┐
│      공동 계획          │
├─────────────────────────┤
│  [카드 이름]            │
│  [카드 설명]            │
│  ─────────────────      │
│  달성 시 효과           │
│  💰 +2,000TC           │
│  ✨ 추억 +3            │
│  🎁 특별 보너스        │
├─────────────────────────┤
│  현재 기여액: 2,500TC   │
│  [프로그레스 바]        │
│  목표: 10,000TC         │
│  [기여하기 버튼]        │
└─────────────────────────┘
```

## 💻 구현 코드

### Frontend (GameScreen.tsx)

```typescript
{jointPlanCard && (
  <div className="joint-plan-card">
    <div className="joint-card-name">{jointPlanCard.name}</div>
    <div className="joint-card-description">
      {jointPlanCard.description || '함께 달성할 목표입니다'}
    </div>
    
    {/* 효과 정보 표시 */}
    {(() => {
      const effects = typeof jointPlanCard.effects === 'string'
        ? JSON.parse(jointPlanCard.effects)
        : jointPlanCard.effects;
      
      if (effects && Object.keys(effects).length > 0) {
        return (
          <div className="joint-card-effects">
            <div className="effects-title">달성 시 효과</div>
            <div className="effects-list">
              {/* 돈 효과 */}
              {effects.money && (
                <div className="effect-item">
                  💰 {effects.money > 0 ? '+' : ''}{effects.money.toLocaleString()}TC
                </div>
              )}
              
              {/* 특성 효과 */}
              {effects.traits && Object.entries(effects.traits).map(([trait, value]: [string, any]) => (
                <div key={trait} className="effect-item">
                  ✨ {trait} +{value}
                </div>
              ))}
              
              {/* 보너스 효과 */}
              {effects.bonus && (
                <div className="effect-item">
                  🎁 {effects.bonus}
                </div>
              )}
            </div>
          </div>
        );
      }
      return null;
    })()}
  </div>
)}
```

### CSS (GameScreen.css)

```css
.joint-card-description {
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.95;
  text-align: center;
  margin-bottom: 12px;
}

.joint-card-effects {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 12px;
  margin-top: 12px;
}

.effects-title {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.9;
  margin-bottom: 8px;
  text-align: center;
}

.effects-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.effect-item {
  font-size: 13px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
}
```

## 📊 지원하는 효과 타입

### 1. 돈 효과 (money)
```json
{
  "effects": {
    "money": 2000
  }
}
```
표시: `💰 +2,000TC`

### 2. 특성 효과 (traits)
```json
{
  "effects": {
    "traits": {
      "추억": 3,
      "모험": 2
    }
  }
}
```
표시:
- `✨ 추억 +3`
- `✨ 모험 +2`

### 3. 보너스 효과 (bonus)
```json
{
  "effects": {
    "bonus": "특별 보상 카드 1장"
  }
}
```
표시: `🎁 특별 보상 카드 1장`

### 4. 복합 효과
```json
{
  "effects": {
    "money": 2000,
    "traits": {
      "추억": 3
    },
    "bonus": "추가 턴 1회"
  }
}
```
표시:
- `💰 +2,000TC`
- `✨ 추억 +3`
- `🎁 추가 턴 1회`

## 🎯 효과 정보 파싱

### effects 필드 구조
```typescript
// 문자열로 저장된 경우
const effects = typeof jointPlanCard.effects === 'string'
  ? JSON.parse(jointPlanCard.effects)
  : jointPlanCard.effects;

// 객체로 저장된 경우 (이미 파싱됨)
// effects는 그대로 사용
```

### 조건부 렌더링
```typescript
if (effects && Object.keys(effects).length > 0) {
  // 효과가 있는 경우에만 표시
}
```

## 🎨 디자인 특징

### 1. 구분선
- 카드 설명과 효과 사이에 반투명 구분선
- `border-top: 1px solid rgba(255, 255, 255, 0.2)`

### 2. 배경
- 각 효과 항목에 반투명 배경
- `background: rgba(255, 255, 255, 0.15)`

### 3. 아이콘
- 💰 돈 효과
- ✨ 특성 효과
- 🎁 보너스 효과

### 4. 정렬
- 모든 텍스트 중앙 정렬
- 세로 방향 flex 레이아웃

## 🧪 테스트 시나리오

### 1. 효과가 있는 카드
1. 게임 시작
2. 공동 계획 섹션 확인
3. "달성 시 효과" 표시 확인
4. 각 효과 항목 확인

### 2. 효과가 없는 카드
1. effects가 빈 객체인 카드
2. 효과 섹션이 표시되지 않음
3. 카드 이름과 설명만 표시

### 3. 다양한 효과 조합
1. 돈만 있는 카드
2. 특성만 있는 카드
3. 보너스만 있는 카드
4. 모든 효과가 있는 카드

## 📝 데이터베이스 예시

### 공동 계획 카드 데이터
```sql
INSERT INTO cards (type, code, name, description, effects) VALUES
('joint', 'JP1', '제주도 여행', '함께 제주도로 떠나요!', 
 '{"money": 2000, "traits": {"추억": 3, "자연": 2}}'),
 
('joint', 'JP2', '유럽 배낭여행', '유럽을 함께 여행해요!',
 '{"money": 3000, "traits": {"문화": 3, "모험": 2}, "bonus": "특별 기념품"}'),
 
('joint', 'JP3', '온천 여행', '힐링 온천 여행',
 '{"money": 1500, "traits": {"휴식": 3}}');
```

## ✅ 완료 사항

- [x] effects 필드 파싱
- [x] 돈 효과 표시
- [x] 특성 효과 표시
- [x] 보너스 효과 표시
- [x] 조건부 렌더링
- [x] CSS 스타일링
- [x] 아이콘 추가
- [x] 반응형 레이아웃

## 🎯 결론

공동 계획 카드에 달성 시 효과 정보를 표시하여 플레이어들이 목표 달성의 보상을 명확히 알 수 있게 되었습니다.
