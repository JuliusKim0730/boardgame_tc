# 열네 밤의 꿈 ERD

다음 ERD는 룰북과 워크플로우를 기반으로 한 논리 설계입니다. 구현 DB는 PostgreSQL 가정.

## ER 다이어그램(Mermaid)

```mermaid
erDiagram
  USER ||--o{ PLAYER : has
  ROOM ||--o{ GAME : hosts
  GAME ||--o{ PLAYERSTATE : includes
  GAME ||--o{ TURN : has
  TURN ||--o{ ACTION : has
  GAME ||--o{ DECK : has
  DECK ||--o{ CARD : contains
  PLAYERSTATE ||--o{ HAND : holds
  PLAYERSTATE ||--o{ PURCHASED : buys
  GAME ||--o{ JOINTPLANCONTRIBUTION : accumulates
  GAME ||--o{ GAMERESULT : yields
  GAME ||--o{ EVENTLOG : records

  USER {
    uuid id PK
    text nickname
    timestamptz created_at
  }

  ROOM {
    uuid id PK
    text code UNIQUE
    text status  // waiting|in_progress
    timestamptz created_at
  }

  GAME {
    uuid id PK
    uuid room_id FK
    int day // 1..14
    uuid current_turn_player_id
    text travel_theme // opened travel card id/ref
    uuid joint_plan_card_id
    text status // setting|running|finalizing|finished
    timestamptz created_at
  }

  PLAYER {
    uuid id PK
    uuid user_id FK
  }

  PLAYERSTATE {
    uuid id PK
    uuid game_id FK
    uuid player_id FK
    int money
    int position // 1..6
    boolean resolve_token // 결심 토큰 보유
    jsonb traits // 맛/역사/자연/문화/레저/물놀이/추억
    int turn_order
    text status // active|afk|left|bot
  }

  DECK {
    uuid id PK
    uuid game_id FK
    text type // plan|freeplan|house|invest|chance|joint|travel
    jsonb order // card ids in order (top->bottom)
  }

  CARD {
    uuid id PK
    text type
    text code // e.g., T1, H3, C10...
    text name
    int cost // nullable for free/house/invest
    jsonb effects // {taste:.., memory:.., etc}
    jsonb metadata
  }

  HAND {
    uuid id PK
    uuid player_state_id FK
    uuid card_id FK
    int seq
  }

  PURCHASED {
    uuid id PK
    uuid player_state_id FK
    uuid card_id FK
    int price_paid
    timestamptz purchased_at
  }

  ACTION {
    uuid id PK
    uuid turn_id FK
    text kind // move|draw|chance|free_action|invest|house|contribute|custom
    jsonb payload
    timestamptz created_at
  }

  TURN {
    uuid id PK
    uuid game_id FK
    int day
    uuid player_state_id
    timestamptz started_at
    timestamptz ended_at
  }

  JOINTPLANCONTRIBUTION {
    uuid id PK
    uuid game_id FK
    uuid player_state_id FK
    int amount
    timestamptz created_at
  }

  GAMERESULT {
    uuid id PK
    uuid game_id FK
    uuid player_state_id FK
    int total_score
    jsonb breakdown // traits*multipliers, memory, joint, bonus...
  }

  EVENTLOG {
    uuid id PK
    uuid game_id FK
    text event_type
    jsonb data
    timestamptz created_at
  }
```

## 인덱스/트랜잭션 가이드
- 빈번 조회: `PLAYERSTATE(game_id, player_id)`, `TURN(game_id, day)`, `HAND(player_state_id)`, `JOINTPLANCONTRIBUTION(game_id)`.
- 원자성 보장:
  - 공동 계획 기여 합산 + 돈 차감: 단일 트랜잭션.
  - 찬스 C10/C11(구매/교환): 카드 소유권 이동/자금 이동 + 이벤트 기록까지 트랜잭션.
- 이벤트 소싱 보강: `EVENTLOG`에 모든 상태 변화를 기록하여 리플레이/디버깅 지원.

## 데이터 유효성
- 위치(position) 1..6, 연속 사용 금지 규칙은 서버 로직에서 검증.
- 결심 토큰 사용 시 연속 금지 규칙 무시 불가(룰 강제).
- 2인 전용 공동 계획 패널티 예외는 결과 산출 시 분기 처리.









