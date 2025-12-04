# 턴 락 버그 수정 완료

## 📅 수정 날짜
2024-12-03

## 🐛 문제 분석

### 에러 로그
```
=== TurnService.move 호출 ===
gameId: 025a76cd-4ba2-4f37-afe5-2dff9872c3aa
playerId: 7d7bc512-8104-4762-b5cb-2eb9bf08f5e2
targetPosition: 2
턴 검증 실패: Error: 현재 당신의 턴이 아닙니다
```

### 원인
게임 시작 시 `GameSetupService`에서:
1. ✅ 게임 생성
2. ✅ 플레이어 상태 초기화
3. ✅ 첫 턴 레코드 생성 (`turns` 테이블)
4. ✅ `games.current_turn_player_id` 설정
5. ❌ **TurnManager.lockTurn() 호출 누락** ← 문제!

`TurnManager`는 메모리 기반 턴 락을 사용하는데, 게임 시작 시 이를 설정하지 않아서 첫 플레이어가 이동하려고 할 때 "당신의 턴이 아닙니다" 에러 발생.

## ✅ 수정 내용

### GameSetupService.ts

**수정 전:**
```typescript
// 첫 턴 시작
await client.query(
  'INSERT INTO turns (game_id, day, player_state_id, started_at) VALUES ($1, $2, $3, NOW())',
  [gameId, 1, firstPlayerStateResult.rows[0].id]
);

await client.query('COMMIT');
return gameId;
```

**수정 후:**
```typescript
// 첫 턴 시작
await client.query(
  'INSERT INTO turns (game_id, day, player_state_id, started_at) VALUES ($1, $2, $3, NOW())',
  [gameId, 1, firstPlayerStateResult.rows[0].id]
);

await client.query('COMMIT');

// 턴 락 설정 (COMMIT 후에 설정)
const { turnManager } = await import('./TurnManager');
turnManager.lockTurn(gameId, firstPlayer.id);
console.log('첫 턴 락 설정 완료:', { gameId, playerId: firstPlayer.id });

return gameId;
```

### 수정 포인트
1. **COMMIT 후 턴 락 설정**: 트랜잭션 완료 후 메모리 상태 업데이트
2. **동적 import 사용**: 순환 참조 방지
3. **로그 추가**: 턴 락 설정 확인용

## 🔍 TurnManager 동작 방식

### 메모리 기반 턴 락
```typescript
export class TurnManager {
  private turnLocks: Map<string, string> = new Map(); // gameId -> playerId
  
  lockTurn(gameId: string, playerId: string): void {
    this.turnLocks.set(gameId, playerId);
  }
  
  isCurrentTurn(gameId: string, playerId: string): boolean {
    const lockedPlayer = this.turnLocks.get(gameId);
    return lockedPlayer === playerId;
  }
  
  validateTurn(gameId: string, playerId: string): void {
    if (!this.isCurrentTurn(gameId, playerId)) {
      throw new Error('현재 당신의 턴이 아닙니다');
    }
  }
}
```

### 턴 흐름
```
게임 시작
  ↓
GameSetupService.setupGame()
  ↓
turns 테이블에 첫 턴 레코드 생성
  ↓
games.current_turn_player_id 설정
  ↓
turnManager.lockTurn(gameId, firstPlayerId) ← 추가됨!
  ↓
플레이어 이동 시도
  ↓
turnManager.validateTurn() ← 통과!
  ↓
이동 처리
```

## 📊 수정 전후 비교

### 수정 전
```
게임 시작 → 턴 락 없음 → 이동 시도 → validateTurn() 실패 → 에러
```

### 수정 후
```
게임 시작 → 턴 락 설정 → 이동 시도 → validateTurn() 통과 → 이동 성공
```

## 🧪 테스트 시나리오

### 1. 게임 시작 및 첫 이동
1. 방 생성 및 플레이어 입장
2. 게임 시작
3. 백엔드 로그 확인:
   ```
   게임 설정 완료: { gameId: '...', firstPlayerId: '...', ... }
   첫 턴 락 설정 완료: { gameId: '...', playerId: '...' }
   ```
4. 첫 플레이어가 인접 칸 클릭
5. 이동 성공 확인

### 2. 턴 전환
1. 첫 플레이어 행동 완료
2. 턴 종료
3. 다음 플레이어로 턴 전환
4. 턴 락이 다음 플레이어로 변경되었는지 확인
5. 다음 플레이어 이동 가능 확인

### 3. 잘못된 턴 시도
1. 내 턴이 아닐 때 이동 시도
2. "당신의 턴이 아닙니다" 메시지 확인
3. 프론트엔드에서 사전 차단 확인

## 🔧 추가 개선 사항

### 1. 데이터베이스 기반 턴 락 (선택)
현재는 메모리 기반이므로 서버 재시작 시 턴 락이 사라집니다.
프로덕션 환경에서는 Redis 등을 사용한 영구 저장 고려.

### 2. 턴 타임아웃
일정 시간 내에 행동하지 않으면 자동으로 턴 종료.

### 3. 재연결 시 턴 락 복구
서버 재시작 후 진행 중인 게임의 턴 락 복구 로직.

## 📝 관련 파일

- `backend/src/services/GameSetupService.ts` - 게임 초기화 및 턴 락 설정
- `backend/src/services/TurnManager.ts` - 턴 관리 및 검증
- `backend/src/services/TurnService.ts` - 이동/행동 처리

## ✅ 검증 완료

- [x] 게임 시작 시 턴 락 설정
- [x] 첫 플레이어 이동 가능
- [x] 턴 검증 통과
- [x] 로그 출력 확인
- [x] 에러 없이 게임 진행

## 🎯 결론

게임 시작 시 `turnManager.lockTurn()`을 호출하여 첫 플레이어의 턴 락을 설정함으로써 "당신의 턴이 아닙니다" 에러를 해결했습니다.
