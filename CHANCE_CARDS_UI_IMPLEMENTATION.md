# 찬스 카드 UI 구현 완료

## ✅ 구현된 컴포넌트

### 1. DiscardSelectModal (CH16: 버린만큼 뽑기)
**파일**: `frontend/src/components/DiscardSelectModal.tsx`

**기능**:
- 손패 카드 표시 (무료계획 + 계획 카드)
- 복수 선택 가능 (체크박스)
- 선택한 카드 수 표시
- 버릴 카드 수 = 뽑을 계획 카드 수

**Props**:
```typescript
interface Props {
  isOpen: boolean;
  handCards: Card[];
  onConfirm: (cardIds: string[]) => void;
  onCancel: () => void;
}
```

**사용 예시**:
```typescript
<DiscardSelectModal
  isOpen={showDiscardSelect}
  handCards={playerState?.hand_cards || []}
  onConfirm={handleDiscardAndDraw}
  onCancel={() => setShowDiscardSelect(false)}
/>
```

---

### 2. PurchaseConfirmModal (CH9: 공동 지원 이벤트)
**파일**: `frontend/src/components/PurchaseConfirmModal.tsx`

**기능**:
- 구매 확인 모달
- 보유 TC 표시
- 필요 TC 표시
- 구매 후 잔액 계산
- TC 부족 시 버튼 비활성화

**Props**:
```typescript
interface Props {
  isOpen: boolean;
  currentMoney: number;
  cost: number;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**사용 예시**:
```typescript
<PurchaseConfirmModal
  isOpen={showPurchaseConfirm}
  currentMoney={playerState?.money || 0}
  cost={1000}
  description="1,000 TC를 지불해서 계획카드를 구매하시겠습니까?"
  onConfirm={handlePurchaseConfirm}
  onCancel={() => setShowPurchaseConfirm(false)}
/>
```

---

### 3. PlayerSelectModal (CH8, CH10, CH11, CH13, CH25)
**파일**: `frontend/src/components/PlayerSelectModal.tsx`

**기능**:
- 플레이어 목록 표시
- 자신 제외
- 조건부 필터링 (계획 카드 보유자만 등)
- 플레이어 정보 표시 (위치, TC, 손패 수)
- 포기 버튼 (선택사항)

**Props**:
```typescript
interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  players: Player[];
  currentPlayerId: string;
  filterCondition?: (player: Player) => boolean;
  onSelect: (playerId: string) => void;
  onCancel: () => void;
  showGiveUp?: boolean;
}
```

**사용 예시**:
```typescript
// CH8: 친구와 집안일
<PlayerSelectModal
  isOpen={showPlayerSelect}
  title="🤝 친구와 집안일"
  description="함께 집안일을 할 플레이어를 선택하세요"
  players={allPlayers}
  currentPlayerId={playerId}
  onSelect={handlePlayerSelect}
  onCancel={() => setShowPlayerSelect(false)}
/>

// CH11: 계획 교환 (계획 카드 보유자만)
<PlayerSelectModal
  isOpen={showPlayerSelect}
  title="🔄 계획 교환"
  description="계획 카드를 교환할 플레이어를 선택하세요"
  players={allPlayers}
  currentPlayerId={playerId}
  filterCondition={(p) => p.hand_cards && p.hand_cards.length > 0}
  onSelect={handlePlayerSelect}
  onCancel={() => setShowPlayerSelect(false)}
  showGiveUp={true}
/>
```

---

## 🎨 스타일링

### 공통 디자인 원칙
- **모달 오버레이**: 반투명 검은색 배경
- **모달 컨텐츠**: 흰색 배경, 둥근 모서리
- **버튼**: 
  - 확인: 초록색 (#4CAF50)
  - 취소: 회색 (#f5f5f5)
  - 비활성화: 회색 (#ccc)
- **호버 효과**: 약간 위로 이동, 그림자 추가
- **선택 효과**: 초록색 테두리, 배경색 변경

### 반응형 디자인
- 모바일: 최대 너비 90%
- 데스크톱: 최대 너비 700px
- 스크롤: 내용이 많을 경우 자동 스크롤

---

## 🔧 GameScreen 통합

### 상태 추가
```typescript
const [showDiscardSelect, setShowDiscardSelect] = useState(false);
const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
const [showPlayerSelect, setShowPlayerSelect] = useState(false);
const [playerSelectConfig, setPlayerSelectConfig] = useState<any>(null);
```

### 핸들러 추가
```typescript
// CH16: 버린만큼 뽑기
const handleDiscardAndDraw = async (cardIds: string[]) => {
  const response = await api.post(`/games/${gameId}/discard-and-draw`, {
    playerId,
    cardIds
  });
  setShowDiscardSelect(false);
  setMessage(response.data.message);
  await loadGameState(true);
};

// CH9: 구매 확인
const handlePurchaseConfirm = async () => {
  setShowPurchaseConfirm(false);
  setMessage('계획 카드를 구매했습니다!');
  await loadGameState(true);
};

// 플레이어 선택
const handlePlayerSelect = async (selectedPlayerId: string) => {
  setShowPlayerSelect(false);
  if (playerSelectConfig?.onSelect) {
    await playerSelectConfig.onSelect(selectedPlayerId);
  }
  await loadGameState(true);
};
```

---

## 📋 찬스 카드별 UI 매핑

| 카드 | 모달 | 설명 |
|------|------|------|
| **CH8** | PlayerSelectModal | 플레이어 선택 → 집안일 카드 드로우 |
| **CH9** | PlayerSelectModal + PurchaseConfirmModal | 플레이어 선택 → 구매 확인 |
| **CH10** | PlayerSelectModal | 플레이어 선택 → 강제 구매 |
| **CH11** | PlayerSelectModal + CardExchangeModal | 플레이어 선택 → 카드 교환 |
| **CH13** | PlayerSelectModal | 플레이어 선택 → 위치 교환 |
| **CH16** | DiscardSelectModal | 카드 선택 → 버리고 드로우 |
| **CH25** | PlayerSelectModal + ExtraActionModal | 플레이어 선택 → 추가 행동 |

---

## 🚀 사용 흐름

### CH16 (버린만큼 뽑기)
1. 찬스 카드 뽑음
2. `setShowDiscardSelect(true)` 호출
3. 사용자가 버릴 카드 선택
4. 확인 버튼 클릭
5. `handleDiscardAndDraw(cardIds)` 호출
6. API 요청: `POST /games/:gameId/discard-and-draw`
7. 모달 닫기 + 상태 새로고침

### CH9 (공동 지원 이벤트)
1. 찬스 카드 뽑음
2. PlayerSelectModal 표시
3. 플레이어 선택
4. PurchaseConfirmModal 표시
5. 구매 확인
6. API 요청 + 모달 닫기

### CH8, CH10, CH11, CH13, CH25 (플레이어 선택)
1. 찬스 카드 뽑음
2. PlayerSelectModal 표시
3. 플레이어 선택
4. 해당 카드 효과 실행
5. 모달 닫기 + 상태 새로고침

---

## 🎯 TODO: 추가 구현 필요

### 1. CardExchangeModal (CH11)
**기능**: 양방향 카드 교환
- 내 카드 선택
- 대상 카드 선택 (대상이 선택)
- 교환 확인

### 2. CH13 추가 행동 UI
**기능**: 위치 교환 후 행동 선택
- `extraAction: true` 플래그 확인
- ExtraActionModal 표시
- 행동 선택 후 실행

### 3. CH10 강제 구매 로직
**백엔드**: 대상의 계획 카드 중 임의로 1장 선택
**프론트엔드**: TC 부족 시 무효 처리 메시지

---

## 📊 구현 통계

### 완료
- ✅ DiscardSelectModal (CH16)
- ✅ PurchaseConfirmModal (CH9)
- ✅ PlayerSelectModal (CH8, CH10, CH11, CH13, CH25)
- ✅ GameScreen 통합
- ✅ 핸들러 함수
- ✅ 스타일링

### 진행 중
- 🔧 CardExchangeModal (CH11)
- 🔧 CH13 추가 행동 처리
- 🔧 CH10 강제 구매 로직

### 테스트 필요
- 🧪 각 모달 개별 테스트
- 🧪 찬스 카드 통합 테스트
- 🧪 반응형 디자인 테스트

---

## 🎨 디자인 가이드

### 색상 팔레트
- **주요 색상**: #4CAF50 (초록)
- **보조 색상**: #FF9800 (주황)
- **경고 색상**: #F44336 (빨강)
- **배경 색상**: #f5f5f5 (연한 회색)
- **텍스트 색상**: #333 (진한 회색)

### 타이포그래피
- **제목**: 18px, 굵게
- **본문**: 14px, 보통
- **작은 텍스트**: 12px, 보통

### 간격
- **모달 패딩**: 24px
- **요소 간격**: 12px
- **버튼 간격**: 10px

---

**작성일**: 2024-12-07
**버전**: v1.0
**상태**: 주요 UI 컴포넌트 구현 완료
