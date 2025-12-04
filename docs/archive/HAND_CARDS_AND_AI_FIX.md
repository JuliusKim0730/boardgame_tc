# 손패 카드 및 AI 턴 수정 완료

## 수정 날짜
2024-12-03

## 수정된 문제들

### 1. ✅ 게임 시작 시 손패 표시
**문제**: 게임 시작 시 내가 가진 손패가 무엇인지 알려주지 않음

**수정 내용**:
- `GameScreen.tsx`의 `useEffect`에서 초기 로드 시 손패 확인 메시지 추가
- 게임 시작 시 3초간 "🎴 시작 손패: [카드 이름들]" 메시지 표시
- 이후 턴 메시지로 자동 전환

```typescript
// 게임 시작 시 손패 확인 메시지
const myState = response.data.players.find((p: any) => p.player_id === playerId);
if (myState?.hand_cards && myState.hand_cards.length > 0) {
  const cardNames = myState.hand_cards.map((c: any) => c.name).join(', ');
  setMessage(`🎴 시작 손패: ${cardNames}`);
  setTimeout(() => {
    // 3초 후 턴 메시지로 전환
  }, 3000);
}
```

### 2. ✅ 우측 상단 카드 보관함
**문제**: 우측 상단에 내가 가진 카드를 보여주고, 클릭 시 카드 정보 표시 필요

**현재 상태**:
- `HandCards` 컴포넌트가 이미 우측 패널에 배치되어 있음
- 카드 클릭 시 상세 모달이 표시됨
- 카드 정보 (이름, 비용, 효과) 모두 표시됨

**추가 개선**:
- 손패 카드 수 표시: "내 카드 (X장)"
- 카드 클릭 시 상세 정보 모달 (이름, 코드, 타입, 비용, 효과)
- 효과 아이콘 및 색상 구분

### 3. ✅ 카드 뽑은 후 손패 추가 안 됨
**문제**: 조사하기로 카드를 받고 연출까지 나오는데, 내 카드 보관함에 추가되지 않음

**원인 분석**:
- 로그 상으로는 카드를 받고 있음
- 하지만 프론트엔드 상태가 업데이트되지 않음

**수정 내용**:

#### A. TurnService.ts - 손패 추가 로직 강화
```typescript
// 손패 추가 시 상세 로그 및 검증 추가
console.log('✅ 손패 추가 완료:', insertResult.rows[0]);
console.log('✅ 현재 손패 카드 수:', verifyResult.rows[0].count);
console.log('✅ 손패 카드 목록:', cardCheckResult.rows);
```

#### B. gameRoutes.ts - 게임 상태 API 수정
```typescript
// 각 플레이어의 손패 조회 추가
const handCardsResult = await client.query(
  `SELECT c.id, c.code, c.name, c.type, c.cost, c.effects, c.metadata
   FROM hands h
   JOIN cards c ON h.card_id = c.id
   WHERE h.player_state_id = $1
   ORDER BY h.seq`,
  [player.id]
);

const handCards = handCardsResult.rows.map(card => ({
  ...card,
  effects: safeParseJSON(card.effects, 'handCard.effects'),
  metadata: safeParseJSON(card.metadata, 'handCard.metadata')
}));
```

#### C. GameScreen.tsx - 상태 업데이트 개선
```typescript
// action-completed 이벤트 후 500ms 대기 후 상태 새로고침
socket.on('action-completed', (data: any) => {
  if (data.playerId === playerId) {
    setHasActed(true);
    
    if (data.result?.card) {
      setDrawnCard(data.result.card);
      setShowCardDrawModal(true);
    }
  }
  // 손패 업데이트를 위해 잠시 대기 후 상태 로드
  setTimeout(() => loadGameState(true), 500);
});

// 행동 완료 후에도 500ms 대기
setTimeout(async () => {
  await loadGameState(true);
}, 500);
```

### 4. ✅ AI 턴 자동 진행 안 됨
**문제**: AI가 턴을 실행하려고 할 때 데이터베이스 풀 에러 발생

**에러 메시지**:
```
❌ 데이터베이스 풀 에러: DbHandler exited. Check logs for more information.
에러 코드: XX000
⚠️  데이터베이스 연결이 종료되었습니다.
```

**원인**:
- AI 스케줄러가 5초마다 체크하면서 연결을 너무 자주 생성/해제
- 트랜잭션 중첩 및 연결 누수 가능성

**수정 내용**:

#### A. AIScheduler.ts - 연결 관리 개선
```typescript
// 클라이언트를 먼저 해제하고 AI 턴 실행
const result = await client.query(...);
client.release();
client = null;

for (const row of result.rows) {
  // AI 턴 실행 (새로운 연결 사용)
  await aiPlayerService.executeTurn(row.game_id, row.player_id);
}

// 에러 처리 강화
catch (error: any) {
  if (error?.code === 'XX000' || error?.message?.includes('DbHandler exited')) {
    console.error('⚠️  데이터베이스 연결 문제 감지, 다음 체크에서 재시도');
    return;
  }
}
```

#### B. AIPlayerService.ts - 로깅 강화
```typescript
console.log(`🤖 AI 이동 결정: ${gameState.playerState.position} → ${targetPosition}`);
console.log(`🤖 AI 행동 결정: ${action}번`);
console.log(`🤖 AI 턴 종료 중...`);
console.log(`✅ AI 턴 완료`);

// 에러 처리
catch (error: any) {
  console.error('❌ AI 턴 실행 중 에러:', error);
  throw error;
}
```

## 테스트 체크리스트

### 손패 표시
- [ ] 게임 시작 시 "🎴 시작 손패: [카드 이름들]" 메시지 표시
- [ ] 3초 후 턴 메시지로 자동 전환
- [ ] 우측 패널에 "내 카드 (X장)" 표시

### 카드 보관함
- [ ] 우측 상단에 손패 카드 목록 표시
- [ ] 카드 클릭 시 상세 모달 표시
- [ ] 모달에 카드 이름, 코드, 비용, 효과 표시
- [ ] 효과 아이콘 및 색상 구분

### 카드 뽑기
- [ ] 조사하기(2번) 행동 시 카드 드로우
- [ ] 카드 드로우 모달 표시
- [ ] 모달 닫은 후 손패에 카드 추가 확인
- [ ] 손패 카드 수 증가 확인
- [ ] 로그에 "✅ 손패 추가 완료" 메시지 확인

### AI 턴
- [ ] AI 플레이어 턴 시 자동 실행
- [ ] 로그에 "🤖 AI 턴 실행" 메시지 확인
- [ ] 로그에 "✅ AI 턴 완료" 메시지 확인
- [ ] 데이터베이스 풀 에러 없음
- [ ] AI 이동 및 행동 정상 실행
- [ ] 다음 플레이어로 턴 전환

## 실행 방법

### 백엔드 재시작
```bash
cd backend
npm run dev
```

### 프론트엔드 재시작
```bash
cd frontend
npm run dev
```

### 로그 확인
- 백엔드 콘솔에서 AI 턴 실행 로그 확인
- 프론트엔드 콘솔에서 손패 업데이트 로그 확인
- 브라우저 개발자 도구에서 네트워크 요청 확인

## 주의사항

1. **손패 업데이트 타이밍**: 카드 드로우 후 500ms 대기 후 상태 새로고침
2. **AI 턴 간격**: 5초마다 체크, 각 AI 턴 사이 2초 대기
3. **데이터베이스 연결**: 각 작업마다 새로운 연결 사용, 작업 완료 후 즉시 해제
4. **에러 처리**: 데이터베이스 풀 에러 발생 시 조용히 재시도

## 다음 단계

1. 실제 게임 플레이 테스트
2. 여러 플레이어 동시 접속 테스트
3. AI 플레이어 2~3명 동시 테스트
4. 14일차까지 완주 테스트
5. 최종 정산 및 결과 화면 테스트
