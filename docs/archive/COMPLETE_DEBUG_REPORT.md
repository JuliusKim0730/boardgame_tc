# 완전 디버그 리포트

## 현재 서버 상태

### ✅ 백엔드
- 포트: 4000
- 상태: 정상 실행 중
- WebSocket: 활성화
- AI Scheduler: 활성화

### ⚠️ 프론트엔드
- 포트: 3001 (3000이 사용 중이어서 자동 변경됨)
- 상태: 정상 실행 중
- **주의**: API 요청이 localhost:3000으로 가고 있을 수 있음

## 문제 진단

### 1. API 연결 문제
프론트엔드가 3001 포트에서 실행되는데, API 요청은 3000 포트로 가고 있을 가능성이 있습니다.

#### 확인 방법:
```typescript
// frontend/src/services/api.ts
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.PROD
    ? 'https://boardgame-tc.onrender.com/api'
    : 'http://localhost:3000/api';  // ← 여기가 문제!
```

**문제**: 백엔드는 4000 포트인데 API_BASE가 3000으로 설정됨

#### 해결:
```typescript
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.PROD
    ? 'https://boardgame-tc.onrender.com/api'
    : 'http://localhost:4000/api';  // ← 4000으로 수정
```

### 2. 포트 3000 점유 문제
다른 프로세스가 3000 포트를 사용하고 있습니다.

#### 확인:
```powershell
netstat -ano | findstr :3000
```

#### 해결:
```powershell
# 프로세스 ID 확인 후 종료
taskkill /PID [프로세스ID] /F
```

### 3. 턴 순서 문제
현재 구현 상태를 체크합니다.

#### 체크리스트:
- [x] RoomService: playerId 반환
- [x] LobbyScreen: playerId 전달
- [x] App.tsx: playerId 설정
- [x] GameSetupService: 슬롯 순서대로 턴 설정
- [x] GameScreen: isMyTurn 계산
- [ ] 실제 동작 확인 필요

## 디버그 로그 체크

### 백엔드 로그 확인
```bash
# 게임 시작 시 다음 로그가 출력되어야 함:
=== 게임 설정 시작 ===
플레이어 목록: [
  { index: 0, player_id: '...', nickname: '123123', turn_order: 0 },
  { index: 1, player_id: '...', nickname: 'AI봇1', turn_order: 1 },
  { index: 2, player_id: '...', nickname: 'AI봇2', turn_order: 2 }
]
선 플레이어: { player_id: '...', nickname: '123123', turn_order: 0 }
게임 설정 완료: { gameId: '...', firstPlayerId: '...', firstPlayerNickname: '123123' }
```

### 프론트엔드 로그 확인 (브라우저 콘솔)
```javascript
// 방 생성/참가 시:
=== 방 생성/참가 ===
roomId: ...
userId: ...
playerId: ...  // ← 이 값이 중요!
isHost: true

// 게임 상태 로드 시:
=== 게임 상태 로드 ===
내 playerId: ...
현재 턴 playerId: ...
isMyTurn: true  // ← 이게 true여야 함!
플레이어 목록: [
  { player_id: '...', nickname: '123123', turn_order: 0, isCurrentTurn: true },
  { player_id: '...', nickname: 'AI봇1', turn_order: 1, isCurrentTurn: false },
  { player_id: '...', nickname: 'AI봇2', turn_order: 2, isCurrentTurn: false }
]

// GameBoard 렌더링 시:
GameBoard 렌더링: {
  currentPosition: 1,
  adjacent: [2],
  disabled: false,  // ← 이게 false여야 함!
  canClickAny: true
}
```

## 즉시 수정 사항

### 1. API_BASE 포트 수정
```typescript
// frontend/src/services/api.ts
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.PROD
    ? 'https://boardgame-tc.onrender.com/api'
    : 'http://localhost:4000/api';  // ← 3000 → 4000
```

### 2. 환경 변수 설정
```bash
# frontend/.env.local 생성
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

### 3. 포트 3000 정리
```powershell
# 포트 3000 사용 프로세스 확인
netstat -ano | findstr :3000

# 프로세스 종료
taskkill /PID [프로세스ID] /F
```

## 테스트 절차

### 1단계: 환경 정리
```sql
-- Supabase SQL Editor
DELETE FROM turns;
DELETE FROM player_states;
DELETE FROM games;
DELETE FROM players;
DELETE FROM rooms;
```

### 2단계: 서버 재시작
```bash
# 백엔드 (이미 실행 중)
cd backend
npm run dev

# 프론트엔드 (포트 3000으로 실행되도록)
cd frontend
npm run dev
```

### 3단계: 브라우저 테스트
1. http://localhost:3001 접속 (현재 포트)
2. F12 콘솔 열기
3. 방 생성
4. 콘솔에서 "=== 방 생성/참가 ===" 로그 확인
5. playerId 값 확인

### 4단계: 게임 시작
1. AI 2개 추가
2. 게임 시작
3. 콘솔에서 "=== 게임 상태 로드 ===" 로그 확인
4. isMyTurn 값 확인
5. GameBoard 렌더링 로그 확인

### 5단계: 턴 진행
1. 인접한 칸 클릭 시도
2. 이동 성공 여부 확인
3. 행동 선택 버튼 표시 확인
4. 행동 수행 확인
5. 행동 로그 표시 확인

## 예상 문제 및 해결

### 문제 1: API 요청 실패 (404)
**원인**: API_BASE가 잘못된 포트로 설정됨
**해결**: api.ts에서 포트를 4000으로 수정

### 문제 2: isMyTurn이 false
**원인**: playerId 불일치
**해결**: 
- 브라우저 콘솔에서 playerId 값 확인
- 백엔드 로그에서 firstPlayerId 값 확인
- 두 값이 일치하는지 확인

### 문제 3: 인접 칸 클릭 불가
**원인**: disabled가 true
**해결**:
- GameBoard 렌더링 로그 확인
- disabled 값이 false인지 확인
- isMyTurn이 true인지 확인

### 문제 4: AI가 턴을 진행하지 않음
**원인**: AI 감지 실패 또는 턴 실행 에러
**해결**:
- 백엔드 로그에서 "🤖 AI 턴 실행" 메시지 확인
- 에러 메시지 확인
- AIScheduler가 정상 작동하는지 확인

## 다음 단계

1. API_BASE 포트 수정 (3000 → 4000)
2. 프론트엔드 재시작
3. 브라우저 콘솔에서 로그 확인
4. 문제 발생 시 로그 캡처하여 공유
