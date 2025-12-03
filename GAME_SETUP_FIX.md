# 게임 초기 설정 수정 완료

## 문제 상황
1. ❌ 게임 시작 후 할 수 있는 행동이 없음
2. ❌ 턴 순서가 정해지지 않음
3. ❌ 여행지 카드가 각 플레이어에게 배분되지 않음
4. ❌ 게임 최초 시작 시 필요한 설정들이 누락됨

## 룰북 확인 결과

### 게임 준비 단계 (rulebook/game_rule_v4.1.md)
1. ✅ 각 플레이어 말을 1번 칸에 배치
2. ✅ 초기 자금 3,000TC 분배
3. ✅ 결심 토큰 1개 분배
4. ❌ **여행지 카드 1장 배분** (각 플레이어에게 공개)
5. ✅ 일반 계획 카드 1장 배분
6. ✅ 공동 목표 카드 1장 공개
7. ✅ 선 플레이어 결정 (랜덤)

## 수정 내용

### 1. GameSetupService.ts

#### 여행지 카드 배분 추가
```typescript
// 여행지 카드 준비 (각 플레이어에게 1장씩 배분)
const travelCards = await this.getCardsByType('travel');
const shuffledTravelCards = [...travelCards].sort(() => Math.random() - 0.5);

// 각 플레이어에게 여행지 카드 1장 배분 (공개)
const travelCard = shuffledTravelCards[i % shuffledTravelCards.length];
await client.query(
  'INSERT INTO purchased (player_state_id, card_id, price_paid) VALUES ($1, $2, $3)',
  [playerStateId, travelCard.id, 0]
);
```

#### 턴 순서 설정
- 플레이어를 랜덤으로 섞어서 `turn_order` 설정
- 첫 번째 플레이어를 `current_turn_player_id`로 설정
- 첫 턴 레코드 생성

### 2. gameRoutes.ts (게임 상태 API)

#### 플레이어 정보에 여행지 카드 추가
```typescript
// 각 플레이어의 여행지 카드 조회
const playersWithTravelCards = await Promise.all(
  playersResult.rows.map(async (player) => {
    const travelCardResult = await client.query(
      `SELECT c.* FROM purchased pu
       JOIN cards c ON pu.card_id = c.id
       WHERE pu.player_state_id = $1 AND c.type = 'travel'
       LIMIT 1`,
      [player.id]
    );
    
    return {
      ...player,
      travelCard: travelCardResult.rows[0] || null
    };
  })
);
```

### 3. GameScreen.tsx (프론트엔드)

#### 여행지 카드 표시
- 내 여행지 카드를 왼쪽 패널에 표시
- 다른 플레이어의 여행지 카드도 표시
- 가중치 정보 (x3, x2, x1) 시각화

```tsx
{/* 내 여행지 카드 */}
{allPlayers.find(p => p.player_id === playerId)?.travelCard && (
  <div className="my-travel-card">
    <h3>🎯 내 여행지</h3>
    <div className="travel-card-display">
      <div className="travel-card-name">
        {allPlayers.find(p => p.player_id === playerId)?.travelCard.name}
      </div>
      <div className="travel-card-effects">
        {/* 가중치 표시 */}
      </div>
    </div>
  </div>
)}
```

### 4. GameScreen.css

#### 여행지 카드 스타일링
- 그라데이션 배경
- 가중치 배지 (x3: 주황색, x2: 파란색, x1: 회색)
- 반응형 레이아웃

## 게임 흐름

### 1. 게임 시작 (대기실 → 게임 시작)
```
1. 방장이 "게임 시작" 버튼 클릭
2. GameSetupService.setupGame() 실행
   - 게임 생성 (status: 'setting' → 'running')
   - 플레이어 랜덤 섞기
   - 각 플레이어 초기화:
     * 3,000TC
     * 결심 토큰 1개
     * 여행지 카드 1장 (공개)
     * 일반 계획 카드 1장 (손패)
   - 공동 목표 카드 1장 공개
   - 선 플레이어 결정
   - 첫 턴 시작
3. 모든 플레이어가 GameScreen으로 이동
```

### 2. 턴 진행
```
선 플레이어 턴:
1. 이동 (필수) - 인접한 칸으로 이동
2. 행동 (필수) - 도착한 칸의 행동 수행
3. 턴 종료 - 다음 플레이어에게 턴 넘김

다음 플레이어 턴:
1. 이동 (필수)
2. 행동 (필수)
3. 턴 종료

... (모든 플레이어가 턴을 마치면 다음 날로)
```

### 3. 14일차 종료 후
```
1. 최종 결산 단계
   - 일반 계획 카드 구매
   - 공동 목표 기여
   - 비주류 특성 변환
2. 최종 점수 계산
3. 결과 화면 표시
```

## 여행지 카드 정보

### 카드 구조
```json
{
  "id": "uuid",
  "type": "travel",
  "code": "TR1",
  "name": "제주",
  "effects": {
    "weights": {
      "자연": 3,
      "맛": 2,
      "물놀이": 1
    }
  },
  "metadata": {
    "description": "바람 냄새가 좋다. 가족과 걷는 올레길의 아침."
  }
}
```

### 10개 여행지
1. TR1: 제주 (자연 x3, 맛 x2, 물놀이 x1)
2. TR2: 경주 (역사 x3, 문화 x2, 맛 x1)
3. TR3: 부산 (물놀이 x3, 맛 x2, 레저 x1)
4. TR4: 도쿄 (문화 x3, 맛 x2, 역사 x1)
5. TR5: 타이페이 (맛 x3, 문화 x2, 자연 x1)
6. TR6: 방콕 (맛 x3, 역사 x2, 물놀이 x1)
7. TR7: 발리 (물놀이 x3, 자연 x2, 레저 x1)
8. TR8: 싱가포르 (문화 x3, 맛 x2, 자연 x1)
9. TR9: 시드니 (자연 x3, 레저 x2, 문화 x1)
10. TR10: 하와이 (물놀이 x3, 자연 x2, 맛 x1)

## 테스트 시나리오

### 시나리오 1: 게임 시작
1. ✅ 대기실에서 "게임 시작" 클릭
2. ✅ 모든 플레이어가 GameScreen으로 이동
3. ✅ 각 플레이어에게 여행지 카드 표시
4. ✅ 선 플레이어에게 "🎯 이동 필요" 메시지 표시
5. ✅ 다른 플레이어는 대기 상태

### 시나리오 2: 첫 턴 진행
1. ✅ 선 플레이어가 인접한 칸으로 이동
2. ✅ "⚡ 행동 필요" 메시지 표시
3. ✅ 행동 버튼 활성화
4. ✅ 행동 수행 후 "✅ 완료" 표시
5. ✅ 자동으로 턴 종료
6. ✅ 다음 플레이어에게 턴 넘김

### 시나리오 3: 여행지 카드 확인
1. ✅ 내 여행지 카드가 왼쪽 패널에 표시
2. ✅ 가중치 정보 (x3, x2, x1) 표시
3. ✅ 다른 플레이어의 여행지도 확인 가능

## 다음 단계

✅ 게임 초기 설정 완료
✅ 여행지 카드 배분 완료
✅ 턴 순서 설정 완료
✅ 프론트엔드 표시 완료
⏳ 로컬 테스트 진행
⏳ 게임 플레이 테스트
⏳ 14일차 종료 및 결산 테스트
