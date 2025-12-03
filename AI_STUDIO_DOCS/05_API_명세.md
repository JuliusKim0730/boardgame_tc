# API 명세

## Base URL

- Development: `http://localhost:4000/api`
- Production: `https://your-backend.onrender.com/api`

## REST API

### 방 관리

#### 1. 방 생성
```http
POST /rooms
Content-Type: application/json

{
  "nickname": "플레이어1"
}
```

**응답**:
```json
{
  "room": {
    "id": "uuid",
    "code": "ABCD",
    "status": "waiting"
  },
  "user": {
    "id": "uuid",
    "nickname": "플레이어1"
  },
  "player": {
    "id": "uuid"
  }
}
```

#### 2. 방 참여
```http
POST /rooms/:code/join
Content-Type: application/json

{
  "nickname": "플레이어2"
}
```

**응답**:
```json
{
  "room": {
    "id": "uuid",
    "code": "ABCD",
    "status": "waiting"
  },
  "user": {
    "id": "uuid",
    "nickname": "플레이어2"
  },
  "player": {
    "id": "uuid"
  }
}
```

#### 3. 방 조회
```http
GET /rooms/:roomId
```

**응답**:
```json
{
  "id": "uuid",
  "code": "ABCD",
  "status": "waiting",
  "players": [
    {
      "id": "uuid",
      "nickname": "플레이어1",
      "isHost": true
    },
    {
      "id": "uuid",
      "nickname": "플레이어2",
      "isHost": false
    }
  ]
}
```

#### 4. 게임 시작
```http
POST /rooms/:roomId/start
```

**응답**:
```json
{
  "gameId": "uuid",
  "message": "게임이 시작되었습니다"
}
```

#### 5. 소프트 리셋
```http
POST /rooms/:roomId/soft-reset
```

**응답**:
```json
{
  "success": true,
  "message": "방이 초기화되었습니다"
}
```

### 게임 플레이

#### 6. 게임 상태 조회
```http
GET /games/:gameId/state
```

**응답**:
```json
{
  "game": {
    "id": "uuid",
    "day": 1,
    "status": "running",
    "currentTurnPlayerId": "uuid",
    "travelTheme": "T1",
    "jointPlanCardId": "uuid"
  },
  "players": [
    {
      "id": "uuid",
      "player_id": "uuid",
      "nickname": "플레이어1",
      "money": 3000,
      "position": 1,
      "resolve_token": 1,
      "traits": {
        "taste": 0,
        "history": 0,
        "nature": 0,
        "culture": 0,
        "leisure": 0,
        "water": 0,
        "memory": 0
      },
      "turn_order": 0,
      "hand_cards": [
        {
          "id": "uuid",
          "code": "P1",
          "name": "맛집 탐방",
          "cost": 2000,
          "effects": { "taste": 2, "memory": 1 }
        }
      ],
      "travelCard": {
        "id": "uuid",
        "code": "T1",
        "name": "제주도",
        "effects": { "nature": 3, "water": 2, "leisure": 1 }
      }
    }
  ],
  "jointPlan": {
    "card": {
      "id": "uuid",
      "code": "J1",
      "name": "단체 여행",
      "cost": 10000,
      "effects": { "memory": 2 }
    },
    "total": 5000,
    "target": 10000
  }
}
```

#### 7. 이동
```http
POST /games/:gameId/move
Content-Type: application/json

{
  "playerId": "uuid",
  "position": 2
}
```

**응답**:
```json
{
  "success": true
}
```

#### 8. 행동
```http
POST /games/:gameId/action
Content-Type: application/json

{
  "playerId": "uuid",
  "actionType": 2
}
```

**응답**:
```json
{
  "success": true,
  "card": {
    "id": "uuid",
    "code": "P5",
    "name": "역사 탐방",
    "cost": 3000,
    "effects": { "history": 2, "culture": 1 }
  },
  "message": "계획 카드 '역사 탐방'를 획득했습니다!"
}
```

#### 9. 턴 종료
```http
POST /games/:gameId/end-turn
Content-Type: application/json

{
  "playerId": "uuid"
}
```

**응답**:
```json
{
  "success": true,
  "nextPlayerId": "uuid",
  "isGameEnd": false
}
```

#### 10. 공동 계획 기여
```http
POST /games/:gameId/contribute
Content-Type: application/json

{
  "playerId": "uuid",
  "amount": 2000
}
```

**응답**:
```json
{
  "success": true
}
```

#### 11. 공동 계획 현황
```http
GET /games/:gameId/joint-plan
```

**응답**:
```json
{
  "total": 7000,
  "target": 10000,
  "achieved": false,
  "contributions": [
    {
      "playerId": "uuid",
      "nickname": "플레이어1",
      "amount": 4000
    },
    {
      "playerId": "uuid",
      "nickname": "플레이어2",
      "amount": 3000
    }
  ]
}
```

#### 12. 2인 전용: 찬스 칸 선택
```http
POST /games/:gameId/chance-option
Content-Type: application/json

{
  "playerId": "uuid",
  "option": "card"  // "card" or "money"
}
```

**응답 (카드 선택)**:
```json
{
  "success": true,
  "option": "card",
  "card": {
    "id": "uuid",
    "code": "CH5",
    "name": "행운의 카드"
  }
}
```

**응답 (돈 선택)**:
```json
{
  "success": true,
  "option": "money",
  "amount": 500
}
```

#### 13. 결심 토큰 사용
```http
POST /games/:gameId/use-resolve-token
Content-Type: application/json

{
  "playerId": "uuid",
  "actionType": 2
}
```

**응답**:
```json
{
  "success": true,
  "remainingTokens": 0
}
```

#### 14. 결심 토큰 회복 체크
```http
POST /games/:gameId/check-resolve-recovery
```

**응답**:
```json
{
  "success": true
}
```

### 최종 정산

#### 15. 최종 구매
```http
POST /games/:gameId/final-purchase
Content-Type: application/json

{
  "playerId": "uuid",
  "cardIds": ["uuid1", "uuid2", "uuid3"]
}
```

**응답**:
```json
{
  "success": true
}
```

#### 16. 비주류 특성 변환
```http
POST /games/:gameId/convert-traits
Content-Type: application/json

{
  "playerId": "uuid",
  "conversions": 3
}
```

**응답**:
```json
{
  "success": true,
  "conversions": 3
}
```

#### 17. 최종 정산
```http
POST /games/:gameId/finalize
```

**응답**:
```json
{
  "results": [
    {
      "playerId": "uuid",
      "nickname": "플레이어1",
      "totalScore": 2500,
      "breakdown": {
        "baseScore": 1800,
        "memoryScore": 400,
        "jointPlanBonus": 300,
        "topContributorBonus": 0,
        "details": {
          "taste": { "points": 10, "multiplier": 3, "score": 3000 },
          "history": { "points": 5, "multiplier": 2, "score": 1000 },
          "nature": { "points": 3, "multiplier": 1, "score": 300 }
        }
      }
    }
  ]
}
```

#### 18. 결과 창 닫기
```http
POST /games/:gameId/result-closed
Content-Type: application/json

{
  "playerId": "uuid"
}
```

**응답**:
```json
{
  "allClosed": false
}
```

### 찬스 카드

#### 19. 찬스 카드 실행
```http
POST /games/:gameId/chance/:cardCode
Content-Type: application/json

{
  "playerId": "uuid"
}
```

**응답**:
```json
{
  "success": true,
  "effect": "돈 1000TC 획득"
}
```

#### 20. 찬스 상호작용 응답
```http
POST /games/:gameId/chance-response
Content-Type: application/json

{
  "interactionId": "uuid",
  "response": true
}
```

**응답**:
```json
{
  "success": true
}
```

### 기타

#### 21. 이벤트 로그 조회
```http
GET /games/:gameId/logs
```

**응답**:
```json
{
  "logs": [
    {
      "id": "uuid",
      "event_type": "move",
      "data": { "playerId": "uuid", "from": 1, "to": 2 },
      "created_at": "2024-12-03T10:00:00Z",
      "nickname": "플레이어1"
    }
  ]
}
```

#### 22. Health Check
```http
GET /api/health
```

**응답**:
```json
{
  "status": "ok",
  "version": "4.1.0",
  "timestamp": "2024-12-03T10:00:00Z"
}
```

## WebSocket 이벤트

### 클라이언트 → 서버

#### join-room
```typescript
socket.emit('join-room', roomId);
```

#### leave-room
```typescript
socket.emit('leave-room', roomId);
```

#### game-state-update
```typescript
socket.emit('game-state-update', {
  roomId: 'uuid',
  state: { ... }
});
```

### 서버 → 클라이언트

#### player-joined
```typescript
socket.on('player-joined', (data) => {
  // data: { socketId, timestamp }
});
```

#### player-left
```typescript
socket.on('player-left', (data) => {
  // data: { socketId, timestamp }
});
```

#### game-started
```typescript
socket.on('game-started', (data) => {
  // data: { gameId }
});
```

#### turn-started
```typescript
socket.on('turn-started', (data) => {
  // data: { playerId, day, timestamp }
});
```

#### state-updated
```typescript
socket.on('state-updated', (state) => {
  // state: 게임 상태 객체
});
```

#### action-completed
```typescript
socket.on('action-completed', (data) => {
  // data: { playerId, actionType, result }
});
```

#### chance-request
```typescript
socket.on('chance-request', (data) => {
  // data: { targetPlayerId, chanceData, timestamp }
});
```

#### chance-resolved
```typescript
socket.on('chance-resolved', (data) => {
  // data: { response, timestamp }
});
```

#### game-ended
```typescript
socket.on('game-ended', (data) => {
  // data: { gameId }
});
```

#### day-7-started
```typescript
socket.on('day-7-started', (data) => {
  // data: { message }
});
```

#### resolve-token-recovered
```typescript
socket.on('resolve-token-recovered', (data) => {
  // data: { playerId, newCount, timestamp }
});
```

#### house-first-visit-bonus
```typescript
socket.on('house-first-visit-bonus', (data) => {
  // data: { playerId, bonus, timestamp }
});
```

## 에러 응답

### 400 Bad Request
```json
{
  "error": "에러 메시지"
}
```

### 404 Not Found
```json
{
  "error": "리소스를 찾을 수 없습니다"
}
```

### 500 Internal Server Error
```json
{
  "error": "서버 에러가 발생했습니다"
}
```

## 인증

현재 버전에서는 인증 없음 (닉네임만 사용)

## Rate Limiting

현재 버전에서는 Rate Limiting 없음

## CORS

허용된 Origin:
- `http://localhost:3000`
- `http://localhost:5173`
- `*.vercel.app`
- 환경 변수 `CLIENT_URL`

## 버전

현재 버전: `4.1.0`

API 버전 관리는 향후 추가 예정
