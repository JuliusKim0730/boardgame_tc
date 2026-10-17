# 찬스 카드 전체 리스트 (26장)

## 📊 카테고리별 분류

### 💰 큰돈 (2장)
| 코드 | 이름 | 효과 | 타입 |
|------|------|------|------|
| **CH1** | 아빠가 기분 좋아서! | +3,000TC | money |
| **CH2** | 여행 지원금 당첨! | +4,000TC | money |

---

### 💸 돈 조금 잃기 (5장)
| 코드 | 이름 | 효과 | 타입 |
|------|------|------|------|
| **CH3** | 준비물 구매 | -1,000TC | money |
| **CH4** | 간식 충동구매 | -1,000TC | money |
| **CH5** | 우산 잃어버림 | -1,000TC | money |
| **CH6** | 충전기 구매 | -1,000TC | money |
| **CH7** | 버스카드 충전 | -1,000TC | money |

---

### 🤝 상호작용/방해 카드 (6장)
| 코드 | 이름 | 효과 | 타입 | 2인 금지 | AI 대응 |
|------|------|------|------|---------|---------|
| **CH8** | 친구와 집안일 | 대상 선택 → 집안일 카드 2장 드로우 | interaction | ❌ | ✅ 자동 |
| **CH9** | 공동 지원 이벤트 | 대상 선택 → 각자 1,000TC 지불 후 계획 카드 2장 드로우 | interaction | ❌ | ✅ 자동 |
| **CH10** | 계획 구매 요청 | 대상 선택 → 1,000TC에 계획 카드 구매 요청 | interaction | ❌ | ✅ 자동 거절 |
| **CH11** | 계획 교환 | 대상 선택 → 계획 카드 교환 | interaction | ⛔ | ✅ 자동 거절 |
| **CH12** | 모두 내 자리로 | 모든 플레이어를 자신의 위치로 이동 | interaction | ⛔ | - |
| **CH13** | 자리 바꾸기 | 대상 선택 → 위치 교환 | interaction | ⛔ | ✅ 자동 |

---

### 🎴 새 카드 드로우 (4장)
| 코드 | 이름 | 효과 | 타입 |
|------|------|------|------|
| **CH14** | 여행 이야기 듣기 | 계획 카드가 가장 적은 플레이어에게 계획 카드 1장 지급 | draw (catchup) |
| **CH15** | 좋은 정보 발견 | 계획 카드 1장 드로우 | draw |
| **CH16** | 버린만큼 뽑기 | 버린 카드 수만큼 계획 카드 드로우 | special |
| **CH17** | 여행 팜플렛 | 공동 목표 카드 선택 | special |

---

### ⚡ 특수 행동 카드 (3장)
| 코드 | 이름 | 효과 | 타입 |
|------|------|------|------|
| **CH18** | 체력이 넘친다! | 이동 없이 행동 1회 수행 (1~6번 중 선택) | special |
| **CH19** | 반전의 기회 | 현재 칸에서 행동 1회 더 수행 | special |
| **CH20** | 공동 목표 지원 | 공동 목표에 1,000TC 자동 기여 | special |

---

### 🎯 캐치업 카드 (5장)
| 코드 | 이름 | 효과 | 타입 |
|------|------|------|------|
| **CH21** | 엄마의 응원 | TC가 가장 적은 플레이어에게 +2,000TC | catchup |
| **CH22** | 여행 선생님의 조언 | 일반 계획 카드가 가장 적은 플레이어에게 계획 카드 1장 | catchup |
| **CH23** | 가족 사진 대작전 | 추억 점수가 가장 낮은 플레이어에게 추억 +2 | catchup |
| **CH24** | 엄마의 응원 메시지 | 추억 점수가 가장 낮은 플레이어에게 추억 +2 | catchup |
| **CH25** | 동행 버디 | 본인 행동 1회 + 지목한 플레이어 행동 1회 | catchup |

---

## 🤖 AI 자동 대응 구현 현황

### ✅ 구현 완료
- **CH8 (친구와 집안일)**: AI가 랜덤 플레이어 선택 및 자동 수락
- **CH9 (공동 지원 이벤트)**: AI가 랜덤 플레이어 선택 및 자동 수락
- **CH10 (계획 구매 요청)**: AI가 자동 거절
- **CH11 (계획 교환)**: AI가 자동 거절
- **CH13 (자리 바꾸기)**: AI가 랜덤 플레이어 선택

### 📝 구현 방식
```typescript
// AI 플레이어 확인
private async isAIPlayer(playerId: string): Promise<boolean>

// 랜덤 플레이어 선택 (자신 제외)
private async selectRandomPlayer(gameId: string, excludePlayerId: string): Promise<string>

// CH8 실행: 친구랑 같이 집안일
private async executeSharedHouse(gameId: string, requesterId: string, targetId: string, accepted: boolean)

// CH9 실행: 공동 투자
private async executeSharedInvest(gameId: string, requesterId: string, targetId: string, accepted: boolean)

// 상호작용 응답 처리
async respondToInteraction(interactionId: string, response: any): Promise<void>
```

---

## 📋 카드 타입별 처리 로직

### 1. money (7장)
- 즉시 TC 증감
- 별도 상호작용 없음

### 2. interaction (6장)
- 대상 선택 필요
- AI는 자동으로 대상 선택 및 응답
- 2인 금지 카드 있음 (CH11, CH12, CH13)

### 3. draw (2장)
- 카드 드로우
- 즉시 실행

### 4. special (5장)
- 특수 효과
- 일부는 모달 선택 필요 (CH16, CH17, CH18, CH19)

### 5. catchup (5장)
- 뒤처진 플레이어 지원
- 자동 실행

---

## 🎮 게임 플레이 팁

### 초반 (1~5일차)
- **CH1, CH2**: 큰돈 획득 시 계획 카드 구매에 투자
- **CH8, CH9**: 상호작용으로 추가 자원 확보
- **CH15**: 계획 카드 드로우로 손패 확보

### 중반 (6~10일차)
- **CH18, CH19**: 추가 행동으로 특성 점수 확보
- **CH14, CH22**: 캐치업 카드로 뒤처진 부분 보완
- **CH17**: 공동 목표 카드 선택 (유리한 카드 선택)

### 후반 (11~14일차)
- **CH16**: 버린 카드 수만큼 드로우 (최종 구매 준비)
- **CH20**: 공동 목표 지원으로 보상 확보
- **CH21, CH23, CH24**: 캐치업으로 최종 점수 확보

---

## 🔧 개발자 참고사항

### 데이터베이스 구조
```sql
INSERT INTO cards (type, code, name, cost, effects, metadata) VALUES
('chance', 'CH1', '아빠가 기분 좋아서!', 0, '{"money":3000}', '{"type":"money"}');
```

### metadata 필드
- `type`: 카드 타입 (money, interaction, draw, special, catchup)
- `action`: 세부 액션 (shared_house, shared_invest, etc.)
- `forbidden_2p`: 2인 플레이 금지 여부 (true/false)

### effects 필드
- `money`: TC 증감
- `taste`, `history`, `nature`, `culture`, `leisure`, `water`: 특성 점수
- `memory`: 추억 점수

---

## 📊 통계

- **총 카드 수**: 26장
- **긍정 효과**: 2장 (큰돈)
- **부정 효과**: 5장 (돈 잃기)
- **상호작용**: 6장
- **드로우**: 4장
- **특수**: 3장
- **캐치업**: 5장
- **2인 금지**: 3장 (CH11, CH12, CH13)

---

**마지막 업데이트**: 2024-12-07
**버전**: v4.1
