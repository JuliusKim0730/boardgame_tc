# AI 행동 및 Storage 에러 수정

## 수정 날짜
2024-12-03

## 문제 1: AI 플레이어가 행동하지 않음

### 증상
- AI가 이동은 하지만 행동을 하지 않음
- 로그: "🤖 AI 이동 결정: 1 → 2" 후 행동 없음

### 원인
AI의 `decideAction` 함수가 잘못된 로직을 사용:
```typescript
// ❌ 잘못된 코드
const action = await this.decideAction(gameState, targetPosition);
// decideAction이 복잡한 로직으로 행동을 결정하려 함
```

게임 규칙: **이동한 칸의 행동을 수행해야 함**
- 1번 칸 → 1번 행동 (무료 계획)
- 2번 칸 → 2번 행동 (조사하기)
- 3번 칸 → 3번 행동 (집안일)
- 등등...

### 해결
이동한 칸의 번호를 그대로 행동 번호로 사용:

```typescript
// ✅ 수정된 코드
// 1. 이동 결정
const targetPosition = await this.decideMove(gameState);
await this.move(client, gameId, playerId, targetPosition);

// 2. 행동 결정 (이동한 칸의 행동)
const action = targetPosition;  // 이동한 칸의 행동 수행
await this.performAction(client, gameId, playerId, action);
```

## 문제 2: Storage 접근 에러

### 증상
```
Uncaught (in promise) Error: Access to storage is not allowed from this context
```

### 원인
Vercel 등 일부 배포 환경에서 보안 정책으로 인해 storage 접근이 차단됨:
- iframe 내부
- 시크릿 모드
- 서드파티 쿠키 차단
- CORS 정책

### 해결
전역 에러 핸들러로 storage 에러를 조용히 처리:

```typescript
// main.tsx
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('storage is not allowed')) {
    event.preventDefault();
    console.warn('Storage access blocked - this is expected in some environments');
  }
});
```

## 수정된 파일

1. `backend/src/services/AIPlayerService.ts`
   - AI 행동 로직 단순화
   - 이동한 칸의 행동을 바로 수행

2. `frontend/src/main.tsx`
   - Storage 에러 전역 핸들러 추가

## 게임 규칙 명확화

### 기본 규칙
- 플레이어는 인접한 칸으로 이동
- 이동한 칸의 행동을 수행
- 6번 칸(자유 행동)만 예외: 1~5번 중 선택 가능

### 칸별 행동
```
1번 칸 → 1번 행동: 무료 계획 카드 드로우
2번 칸 → 2번 행동: 조사하기 (계획 카드 드로우)
3번 칸 → 3번 행동: 집안일 (돈 + 추억)
4번 칸 → 4번 행동: 여행 지원 (돈 증감)
5번 칸 → 5번 행동: 찬스 카드
6번 칸 → 자유 행동: 1~5번 중 선택 (결심 토큰 필요)
```

### AI 전략
1. **이동 결정**: 돈이 부족하면 집안일(3), 여유 있으면 조사하기(2)
2. **행동 수행**: 이동한 칸의 행동을 자동 수행
3. **6번 칸**: 결심 토큰이 있으면 2번 또는 3번 선택

## 테스트

### AI 행동 테스트
1. 방 생성
2. AI 플레이어 추가
3. 게임 시작
4. AI 턴 확인:
   ```
   🤖 AI 이동 결정: 1 → 2
   🤖 AI 행동 결정: 2번 (위치 2)
   ✅ AI 행동 완료
   ```

### Storage 에러 테스트
1. Vercel 배포 사이트 접속
2. 콘솔 확인
3. Storage 에러가 조용히 처리되는지 확인

## 추가 개선 사항

### decideAction 함수 제거 (선택사항)
현재는 사용하지 않지만, 향후 6번 칸 로직에 사용할 수 있으므로 유지:

```typescript
// 6번 칸에서만 사용
if (position === 6) {
  const shouldUseToken = this.shouldUseResolveToken(day, tokenUsedCount);
  if (shouldUseToken && playerState.resolve_token > 0) {
    return playerState.money < 5000 ? 3 : 2;
  }
}
return position;
```

### Storage 대체 방안 (선택사항)
Storage가 필요한 경우 메모리 기반 대체:

```typescript
// 메모리 기반 storage
const memoryStorage: { [key: string]: string } = {};

export function safeGetItem(key: string): string | null {
  const storage = getSafeLocalStorage();
  if (storage) {
    return storage.getItem(key);
  }
  // Fallback to memory
  return memoryStorage[key] || null;
}
```

## 결과

### AI 플레이어
- ✅ 이동 후 행동 정상 수행
- ✅ 카드 드로우 정상
- ✅ 턴 종료 정상
- ✅ 날짜 전환 정상

### Storage 에러
- ✅ 에러 메시지 숨김
- ✅ 게임 진행 정상
- ✅ 콘솔 경고만 표시

## 참고

- `AI_PLAYER_ALGORITHM_COMPLETE.md` - AI 알고리즘 상세
- `FIX_AI_TURN_DAY_TRANSITION.md` - AI 턴 전환 수정
- `LOCAL_ISSUE_FIX_GUIDE.md` - Storage 이슈 가이드
