# 🔴 구현되지 않은 항목 정리

## 📊 현재 상태 분석 결과

### ✅ 이미 구현된 항목
- 기본 게임 초기화 (초기 자금 3,000TC 적용됨)
- 턴 관리 및 이동/행동 시스템
- 찬스 카드 시스템 (CH8~CH15 대부분 구현)
- 공동 계획 기여 및 정산
- 최종 구매 및 점수 계산
- 결과 창 닫기 신호 수집

---

## 🔴 HIGH PRIORITY - 즉시 구현 필요

### 1. 데이터베이스 관련 ⚠️

#### 1.1 스키마 수정
```sql
-- resolve_token 타입 변경 필요
-- 현재: BOOLEAN (TRUE/FALSE)
-- 필요: INT (0~2)
ALTER TABLE player_states 
ALTER COLUMN resolve_token TYPE INT USING (CASE WHEN resolve_token THEN 1 ELSE 0 END);

ALTER TABLE player_states 
ALTER COLUMN resolve_token SET DEFAULT 1;
```

#### 1.2 카드 데이터 시드 업데이트
- [ ] **집안일 카드 (J1~J13)**: 수익을 1,500~2,000TC로 조정
- [ ] **여행 지원 카드 (Y1~Y16)**: 새로운 카드 타입 추가
  - Y1~Y8: 수익 카드 (2,500~4,000TC)
  - Y9~Y16: 지출 카드 (-1,000~-2,000TC)
- [ ] **찬스 카드 CH19**: "반전의 기회" 추가
- [ ] **카드 타입**: "invest" → "support"로 변경

---

### 2. 백엔드 서비스 업데이트 🔧

#### 2.1 ChanceService.ts
- [ ] **CH19 "반전의 기회"** 로직 추가
  ```typescript
  // 이동 없이 현재 칸 행동 1회 추가
  case 'CH19':
    return await this.handleRepeatAction(gameId, playerId);
  ```

- [ ] **2인 전용 CH11/12/13 차단** 강화
  ```typescript
  async executeChance(gameId: string, playerId: string, cardCode: string) {
    // 2인 플레이 체크
    const playerCount = await this.getPlayerCount(gameId);
    if (playerCount === 2 && ['CH11', 'CH12', 'CH13'].includes(cardCode)) {
      throw new Error('2인 플레이에서는 사용할 수 없는 카드입니다');
    }
    // ...
  }
  ```

#### 2.2 JointPlanService.ts
- [ ] **finalizeJointPlan 메서드 시그니처 수정**
  ```typescript
  // 현재
  async finalizeJointPlan(gameId: string): Promise<any>
  
  // 수정 필요
  async finalizeJointPlan(gameId: string, is2Player: boolean = false): Promise<any>
  ```

#### 2.3 TurnService.ts
- [ ] **결심 토큰 사용 로그 기록**
  ```typescript
  // 결심 토큰 사용 시
  await client.query(
    'INSERT INTO event_logs (game_id, event_type, data) VALUES ($1, $2, $3)',
    [gameId, 'resolve_token_used', JSON.stringify({ playerId, day })]
  );
  ```

- [ ] **14일차 체크 로직**
  ```typescript
  // 14일차 종료 시 자동으로 최종 정산 트리거
  if (currentDay === 14 && allPlayersFinished) {
    await this.triggerFinalization(gameId);
  }
  ```

---

### 3. API 엔드포인트 추가 🌐

#### 3.1 gameRoutes.ts에 추가 필요
```typescript
// 비주류 특성 변환
router.post('/games/:gameId/convert-traits', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, conversions } = req.body;
    await gameFinalizationService.convertMinorTraits(gameId, playerId, conversions);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 2인 전용 찬스 칸 선택
router.post('/games/:gameId/chance-option', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, option } = req.body; // 'card' or 'money'
    
    if (option === 'money') {
      // 500TC 지급
      await turnService.applyMoneyBonus(gameId, playerId, 500);
    } else {
      // 찬스 카드 드로우
      await turnService.drawChanceCard(gameId, playerId);
    }
    
    res.json({ success: true, option });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 결심 토큰 회복 체크 (7일차 시작 시 자동 호출)
router.post('/games/:gameId/check-resolve-recovery', async (req, res) => {
  try {
    const { gameId } = req.params;
    await turnService.checkResolveTokenRecovery(gameId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
```

---

### 4. 프론트엔드 통합 🎨

#### 4.1 GameScreen.tsx 수정
- [ ] **2인 플레이 감지**
  ```typescript
  const [is2Player, setIs2Player] = useState(false);
  
  useEffect(() => {
    // 플레이어 수 확인
    if (players.length === 2) {
      setIs2Player(true);
    }
  }, [players]);
  ```

- [ ] **ChanceOptionModal 통합**
  ```typescript
  const [showChanceOption, setShowChanceOption] = useState(false);
  
  const handleChanceAction = () => {
    if (is2Player && currentPosition === 5) {
      setShowChanceOption(true);
    } else {
      // 기존 찬스 로직
    }
  };
  
  <ChanceOptionModal
    isOpen={showChanceOption}
    onSelect={handleChanceOptionSelect}
  />
  ```

- [ ] **집안일 첫 방문 보너스 알림**
  ```typescript
  // 집안일 행동 후
  if (is2Player && isFirstHouseVisit) {
    showNotification('첫 방문 보너스 +500TC!');
  }
  ```

#### 4.2 ResultScreen.tsx 수정
- [ ] **비주류 특성 변환 단계 추가**
  ```typescript
  const [showTraitConversion, setShowTraitConversion] = useState(true);
  const [conversionComplete, setConversionComplete] = useState(false);
  
  // 최종 구매 후 → 비주류 특성 변환 → 결과 표시
  
  <TraitConversionModal
    isOpen={showTraitConversion && !conversionComplete}
    minorTraits={getMinorTraits()}
    multipliers={travelMultipliers}
    onConfirm={handleTraitConversion}
    onCancel={() => setConversionComplete(true)}
  />
  ```

- [ ] **동률 규정 표시**
  ```typescript
  // 동점자 표시 시
  if (rank1Players.length > 1) {
    return (
      <div className="tie-info">
        동점! 추억 점수: {memoryScore}, 남은 TC: {money}
      </div>
    );
  }
  ```

#### 4.3 PlayerInfo.tsx 수정
- [ ] **결심 토큰 표시 개선**
  ```typescript
  // 현재: boolean (있음/없음)
  // 수정: number (0~2개)
  <div className="resolve-tokens">
    {Array.from({ length: resolveTokens }).map((_, i) => (
      <span key={i} className="token">🔥</span>
    ))}
    <span className="token-count">{resolveTokens}/2</span>
  </div>
  ```

---

## 🟡 MEDIUM PRIORITY - 중요하지만 나중에 가능

### 5. WebSocket 이벤트 추가 📡

#### 5.1 gameSocket.ts에 추가
```typescript
// 2인 찬스 선택 요청
socket.on('chance-option-request', async (data) => {
  io.to(data.gameId).emit('chance-option-request', {
    playerId: data.playerId,
    options: ['card', 'money']
  });
});

// 비주류 특성 변환 요청
socket.on('trait-conversion-request', async (data) => {
  io.to(data.gameId).emit('trait-conversion-request', {
    playerId: data.playerId,
    minorTraits: data.minorTraits
  });
});

// 결심 토큰 회복 알림
socket.on('resolve-token-recovered', async (data) => {
  io.to(data.gameId).emit('resolve-token-recovered', {
    playerId: data.playerId,
    newCount: data.newCount
  });
});

// 집안일 첫 방문 보너스 알림
socket.on('house-first-visit-bonus', async (data) => {
  io.to(data.gameId).emit('house-first-visit-bonus', {
    playerId: data.playerId,
    bonus: 500
  });
});
```

---

### 6. UI/UX 개선 🎯

#### 6.1 2인 전용 규칙 안내
- [ ] WaitingRoom에 2인 플레이 시 규칙 안내 툴팁
- [ ] GameBoard에 2인 전용 칸 표시 (찬스, 집안일)

#### 6.2 알림 시스템
- [ ] 집안일 첫 방문 보너스 토스트
- [ ] 결심 토큰 회복 알림
- [ ] 비주류 특성 변환 가능 알림

#### 6.3 가이드 모달
- [ ] 비주류 특성 변환 설명 모달
- [ ] 2인 전용 규칙 설명 모달

---

### 7. 에러 처리 강화 ⚠️

#### 7.1 2인 플레이 차단 에러
```typescript
// ChanceService.ts
if (playerCount === 2 && ['CH11', 'CH12', 'CH13'].includes(cardCode)) {
  throw new Error('이 카드는 2인 플레이에서 사용할 수 없습니다. 다른 카드를 선택해주세요.');
}
```

#### 7.2 비주류 특성 부족 에러
```typescript
// GameFinalizationService.ts
if (conversions > maxConversions) {
  throw new Error(`변환 가능한 최대 횟수는 ${maxConversions}회입니다.`);
}
```

#### 7.3 결심 토큰 부족 에러
```typescript
// TurnService.ts
if (resolveTokens <= 0) {
  throw new Error('결심 토큰이 부족합니다. (현재: 0개)');
}
```

---

## 🟢 LOW PRIORITY - 개선 사항

### 8. 로깅 및 모니터링 📊

#### 8.1 이벤트 로그 추가
- [ ] 2인 전용 규칙 사용 통계
- [ ] 비주류 특성 변환 빈도
- [ ] 결심 토큰 회복 횟수
- [ ] 집안일 첫 방문 보너스 지급 횟수

#### 8.2 성능 모니터링
- [ ] 최종 정산 소요 시간
- [ ] 비주류 특성 변환 계산 시간
- [ ] WebSocket 이벤트 지연 시간

---

### 9. 테스트 작성 🧪

#### 9.1 단위 테스트
```typescript
// GameSetupService.test.ts
describe('2인 플레이 초기화', () => {
  it('찬스 덱에서 CH11/12/13 제거', async () => {
    const gameId = await setupService.setupGame(roomId);
    const deck = await getDeck(gameId, 'chance');
    expect(deck).not.toContain('CH11');
    expect(deck).not.toContain('CH12');
    expect(deck).not.toContain('CH13');
  });
});

// TurnService.test.ts
describe('결심 토큰 회복', () => {
  it('7일차 시작 시 미사용자 토큰 회복', async () => {
    // 1~6일차 미사용 시나리오
    const result = await turnService.checkResolveTokenRecovery(gameId);
    expect(result.recoveredPlayers).toHaveLength(2);
  });
});

// GameFinalizationService.test.ts
describe('비주류 특성 변환', () => {
  it('가중치 1배 특성 3점 → 추억 +1', async () => {
    await finalizationService.convertMinorTraits(gameId, playerId, 2);
    const traits = await getPlayerTraits(gameId, playerId);
    expect(traits.memory).toBe(originalMemory + 2);
  });
});
```

#### 9.2 통합 테스트
- [ ] 2인 플레이 전체 플로우
- [ ] 3~5인 플레이 기존 기능 유지
- [ ] 찬스 카드 상호작용 시나리오

#### 9.3 E2E 테스트
- [ ] 2인 게임 시나리오 (초기화 → 찬스 선택 → 최종 정산)
- [ ] 4인 게임 시나리오 (공동 목표 패널티 확인)

---

## 📋 작업 우선순위 요약

### 🔴 즉시 (이번 주)
1. ✅ 데이터베이스 스키마 수정 (resolve_token INT)
2. ✅ 카드 데이터 시드 업데이트 (집안일, 여행 지원, CH19)
3. ✅ API 엔드포인트 3개 추가
4. ✅ ChanceService CH19 추가 및 2인 차단

### 🟡 중요 (다음 주)
5. ⏳ 프론트엔드 통합 (GameScreen, ResultScreen)
6. ⏳ WebSocket 이벤트 4개 추가
7. ⏳ UI/UX 개선 (알림, 가이드)

### 🟢 개선 (여유 있을 때)
8. ⏳ 에러 처리 강화
9. ⏳ 로깅 및 모니터링
10. ⏳ 테스트 작성

---

## 🎯 예상 소요 시간

| 작업 | 예상 시간 | 난이도 |
|------|----------|--------|
| DB 스키마 수정 | 30분 | ⭐ |
| 카드 데이터 시드 | 1시간 | ⭐⭐ |
| API 엔드포인트 추가 | 1시간 | ⭐⭐ |
| ChanceService 업데이트 | 1시간 | ⭐⭐ |
| 프론트엔드 통합 | 3시간 | ⭐⭐⭐ |
| WebSocket 이벤트 | 2시간 | ⭐⭐⭐ |
| UI/UX 개선 | 2시간 | ⭐⭐ |
| 테스트 작성 | 4시간 | ⭐⭐⭐ |
| **총 예상 시간** | **14.5시간** | |

---

## 📝 체크리스트

### Phase 1: 백엔드 핵심 (4시간)
- [ ] resolve_token 타입 INT로 변경
- [ ] 카드 데이터 시드 업데이트
- [ ] API 엔드포인트 3개 추가
- [ ] ChanceService CH19 + 2인 차단
- [ ] JointPlanService 파라미터 추가

### Phase 2: 프론트엔드 통합 (5시간)
- [ ] GameScreen 2인 플레이 감지
- [ ] ChanceOptionModal 연동
- [ ] TraitConversionModal 연동
- [ ] ResultScreen 비주류 특성 변환
- [ ] PlayerInfo 결심 토큰 표시

### Phase 3: 통신 및 UX (4시간)
- [ ] WebSocket 이벤트 4개
- [ ] 알림 시스템 구현
- [ ] 가이드 모달 추가
- [ ] 에러 메시지 개선

### Phase 4: 테스트 및 검증 (1.5시간)
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 실행
- [ ] 2인/4인 플레이 테스트
- [ ] 버그 수정

---

## 🚀 다음 단계

**지금 바로 시작할 작업:**
1. 데이터베이스 스키마 수정
2. 카드 데이터 시드 파일 생성
3. API 엔드포인트 추가

이 작업들을 진행할까요?
