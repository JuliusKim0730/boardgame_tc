# 공동 계획 카드 검증 및 구현 완료

## 📅 작성 날짜
2024-12-03

## ✅ 검증 결과

### 백엔드 - 게임 설정 시 공동 계획 카드 선택

**GameSetupService.ts - setupGame 함수**

```typescript
// 공동 목표 카드 1장 오픈
const jointCards = await this.getCardsByType('joint');
const jointCard = jointCards[Math.floor(Math.random() * jointCards.length)];

await client.query(
  'UPDATE games SET joint_plan_card_id = $1, status = $2, current_turn_player_id = $3 WHERE id = $4',
  [jointCard.id, 'running', firstPlayer.id, gameId]
);
```

✅ **확인 사항:**
- `joint` 타입 카드 중 랜덤하게 1장 선택
- 게임 테이블의 `joint_plan_card_id`에 저장
- 모든 플레이어가 같은 카드를 공유

### 백엔드 - 게임 상태 API에 공동 계획 카드 정보 추가

**gameRoutes.ts - GET /games/:gameId/state**

```typescript
// 공동 계획 카드 정보 조회
let jointPlanCard = null;
if (game.joint_plan_card_id) {
  const jointCardResult = await client.query(
    'SELECT * FROM cards WHERE id = $1',
    [game.joint_plan_card_id]
  );
  jointPlanCard = jointCardResult.rows[0] || null;
}

res.json({
  game: { ... },
  players: playersWithTravelCards,
  jointPlan: {
    card: jointPlanCard,           // 공동 계획 카드 정보
    total: parseInt(jointPlanResult.rows[0].total),  // 현재 기여액
    target: 10000                   // 목표 금액
  }
});
```

✅ **추가된 정보:**
- `jointPlan.card`: 공동 계획 카드 전체 정보
- `jointPlan.total`: 현재 기여 총액
- `jointPlan.target`: 목표 금액 (10,000TC)

### 프론트엔드 - 공동 계획 카드 표시

**GameScreen.tsx**

```typescript
// 상태 추가
const [jointPlanCard, setJointPlanCard] = useState<any>(null);
const [jointPlanTotal, setJointPlanTotal] = useState(0);

// 게임 상태 로드 시 공동 계획 정보 설정
const { game, players, jointPlan } = response.data;
if (jointPlan) {
  setJointPlanCard(jointPlan.card);
  setJointPlanTotal(jointPlan.total || 0);
}
```

**UI 구성:**
```tsx
<div className="joint-plan-section card">
  <h3>공동 계획</h3>
  
  {/* 공동 계획 카드 표시 */}
  {jointPlanCard && (
    <div className="joint-plan-card">
      <div className="joint-card-name">{jointPlanCard.name}</div>
      <div className="joint-card-description">
        {jointPlanCard.description || '함께 달성할 목표입니다'}
      </div>
    </div>
  )}
  
  {/* 진행 상황 */}
  <div className="joint-plan-progress">
    <div className="progress-label">
      <span>현재 기여액</span>
      <span className="progress-amount">{jointPlanTotal.toLocaleString()}TC</span>
    </div>
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${(jointPlanTotal / 10000) * 100}%` }} />
    </div>
    <div className="progress-target">목표: 10,000TC</div>
  </div>
  
  {/* 기여 버튼 */}
  <button className="btn-contribute" onClick={() => setShowContributeModal(true)}>
    기여하기
  </button>
</div>
```

## 🎨 UI 디자인

### 공동 계획 카드
- 그라데이션 배경 (보라색 계열)
- 카드 이름 (중앙 정렬, 굵게)
- 카드 설명 (중앙 정렬)

### 진행 상황 바
- 현재 기여액 표시 (녹색 강조)
- 프로그레스 바 (0~100%)
- 목표 금액 표시 (10,000TC)

### 기여 버튼
- 녹색 배경
- 호버 시 애니메이션
- 1,000TC 미만 시 비활성화

## 📊 데이터 흐름

```
게임 시작
  ↓
GameSetupService.setupGame()
  ↓
joint 타입 카드 중 랜덤 1장 선택
  ↓
games.joint_plan_card_id에 저장
  ↓
모든 플레이어가 같은 카드 공유
  ↓
GET /games/:gameId/state
  ↓
jointPlan: { card, total, target } 반환
  ↓
프론트엔드에서 표시
```

## 🔍 공동 계획 카드 데이터 구조

### 데이터베이스 (cards 테이블)
```sql
SELECT * FROM cards WHERE type = 'joint';
```

**예시 카드:**
```json
{
  "id": "uuid",
  "type": "joint",
  "code": "J1",
  "name": "제주도 여행",
  "description": "함께 제주도로 떠나요!",
  "cost": 10000,
  "effects": { ... },
  "metadata": { ... }
}
```

### API 응답
```json
{
  "game": { ... },
  "players": [ ... ],
  "jointPlan": {
    "card": {
      "id": "uuid",
      "type": "joint",
      "code": "J1",
      "name": "제주도 여행",
      "description": "함께 제주도로 떠나요!",
      "cost": 10000,
      "effects": { ... },
      "metadata": { ... }
    },
    "total": 2500,
    "target": 10000
  }
}
```

## ✅ 검증 체크리스트

- [x] 게임 시작 시 `joint` 타입 카드 중 랜덤 1장 선택
- [x] 선택된 카드 ID를 `games.joint_plan_card_id`에 저장
- [x] 모든 플레이어가 같은 카드 공유
- [x] API에서 공동 계획 카드 정보 반환
- [x] 프론트엔드에서 카드 이름 표시
- [x] 프론트엔드에서 카드 설명 표시
- [x] 현재 기여액 표시
- [x] 진행 상황 바 표시
- [x] 목표 금액 표시 (10,000TC)
- [x] 기여 버튼 구현

## 🧪 테스트 시나리오

### 1. 게임 시작 시 공동 계획 카드 확인
1. 대기실에서 게임 시작
2. 게임 화면 우측 패널 확인
3. "공동 계획" 섹션에 카드 표시 확인
4. 카드 이름과 설명 확인

### 2. 진행 상황 확인
1. 초기 상태: 0TC / 10,000TC
2. 프로그레스 바: 0%
3. 기여 후 금액 증가 확인
4. 프로그레스 바 증가 확인

### 3. 기여 기능 테스트
1. "기여하기" 버튼 클릭
2. 기여 모달 표시 확인
3. 금액 입력 및 기여
4. 진행 상황 업데이트 확인

### 4. 다른 플레이어와 동일한 카드 확인
1. 여러 플레이어로 게임 시작
2. 각 플레이어 화면에서 공동 계획 카드 확인
3. 모두 같은 카드인지 확인

## 🎯 결론

**✅ 공동 계획 카드가 올바르게 구현되었습니다!**

- 게임 시작 시 `joint` 타입 카드 중 랜덤 1장 선택
- 모든 플레이어가 같은 카드를 공유
- 카드 정보가 API를 통해 프론트엔드로 전달
- 우측 패널에 카드 이름, 설명, 진행 상황 표시
- 기여 기능과 연동

## 📝 추가 개선 사항 (선택)

1. **카드 이미지 추가**
   - 각 공동 계획 카드에 대표 이미지 추가
   - 더 시각적으로 매력적인 UI

2. **기여 히스토리**
   - 누가 얼마를 기여했는지 표시
   - 기여 순위 표시

3. **달성 시 애니메이션**
   - 10,000TC 달성 시 축하 애니메이션
   - 보상 효과 표시

4. **카드 상세 정보 모달**
   - 카드 클릭 시 상세 정보 표시
   - 보상 내용 등 추가 정보

## 🔗 관련 파일

- `backend/src/services/GameSetupService.ts` - 게임 초기화 및 카드 선택
- `backend/src/routes/gameRoutes.ts` - 게임 상태 API
- `frontend/src/components/GameScreen.tsx` - 공동 계획 카드 표시
- `frontend/src/components/GameScreen.css` - 공동 계획 섹션 스타일
