# 🔥 Supabase 무료 설정 가이드

## 📋 단계별 진행

### 1단계: Supabase 계정 생성 (2분)

1. **https://supabase.com** 접속
2. **"Start your project"** 클릭
3. GitHub 계정으로 로그인 (또는 이메일)
4. 로그인 완료

---

### 2단계: 새 프로젝트 생성 (3분)

1. **"New Project"** 클릭
2. 다음 정보 입력:
   - **Name**: `boardgame-01` (원하는 이름)
   - **Database Password**: 강력한 비밀번호 생성 (저장 필수!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 서버)
   - **Pricing Plan**: `Free` (무료) 선택

3. **"Create new project"** 클릭
4. 프로젝트 생성 대기 (1-2분)

---

### 3단계: 데이터베이스 스키마 생성 (2분)

1. 왼쪽 메뉴에서 **"SQL Editor"** 클릭
2. **"New query"** 클릭
3. 아래 내용을 복사하여 붙여넣기:

```sql
-- 열네 밤의 꿈 데이터베이스 스키마

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USER 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROOM 테이블
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'in_progress')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GAME 테이블
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  day INT DEFAULT 1,
  current_turn_player_id UUID,
  travel_theme TEXT,
  joint_plan_card_id UUID,
  status TEXT NOT NULL CHECK (status IN ('setting', 'running', 'finalizing', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLAYER 테이블
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE
);

-- PLAYERSTATE 테이블
CREATE TABLE player_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  money INT DEFAULT 2000,
  position INT DEFAULT 1,
  resolve_token BOOLEAN DEFAULT TRUE,
  traits JSONB DEFAULT '{"taste":0,"history":0,"nature":0,"culture":0,"leisure":0,"water":0,"memory":0}',
  turn_order INT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'afk', 'left', 'bot')),
  last_position INT
);

-- CARD 테이블 (게임 카드 마스터 데이터)
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cost INT,
  effects JSONB NOT NULL,
  metadata JSONB
);

-- DECK 테이블
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  card_order JSONB NOT NULL
);

-- HAND 테이블
CREATE TABLE hands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_state_id UUID REFERENCES player_states(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id),
  seq INT NOT NULL
);

-- PURCHASED 테이블
CREATE TABLE purchased (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_state_id UUID REFERENCES player_states(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id),
  price_paid INT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- TURN 테이블
CREATE TABLE turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  day INT NOT NULL,
  player_state_id UUID REFERENCES player_states(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ACTION 테이블
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turn_id UUID REFERENCES turns(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- JOINTPLANCONTRIBUTION 테이블
CREATE TABLE joint_plan_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_state_id UUID REFERENCES player_states(id),
  amount INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GAMERESULT 테이블
CREATE TABLE game_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_state_id UUID REFERENCES player_states(id),
  total_score INT NOT NULL,
  breakdown JSONB NOT NULL
);

-- EVENTLOG 테이블
CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_player_states_game ON player_states(game_id);
CREATE INDEX idx_turns_game_day ON turns(game_id, day);
CREATE INDEX idx_hands_player_state ON hands(player_state_id);
CREATE INDEX idx_joint_contributions_game ON joint_plan_contributions(game_id);
```

4. **"Run"** 버튼 클릭 (또는 Ctrl+Enter)
5. 성공 메시지 확인: "Success. No rows returned"

---

### 4단계: 카드 데이터 시드 (2분)

1. SQL Editor에서 **"New query"** 클릭
2. 아래 카드 데이터를 복사하여 붙여넣기 (107장)
3. **"Run"** 클릭

**참고**: 카드 데이터는 `backend/src/db/seedCards.sql` 파일 내용을 그대로 복사하세요.

---

### 5단계: 연결 정보 가져오기 (1분)

1. 왼쪽 메뉴에서 **"Settings"** 클릭
2. **"Database"** 클릭
3. **"Connection string"** 섹션에서 **"URI"** 복사

예시:
```
postgresql://postgres.xxxxx:password@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

4. 또는 개별 정보 확인:
   - **Host**: `aws-0-ap-northeast-2.pooler.supabase.com`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres.xxxxx`
   - **Password**: (2단계에서 설정한 비밀번호)

---

### 6단계: 백엔드 환경 변수 설정 (1분)

`backend/.env` 파일을 다음과 같이 수정:

```env
PORT=4000

# Supabase 연결 정보
DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.xxxxxxxxxxxxx
DB_PASSWORD=your-database-password-here

CLIENT_URL=http://localhost:3000
```

**중요**: 
- `DB_HOST`: Supabase에서 복사한 호스트
- `DB_USER`: `postgres.xxxxx` 형식 (Supabase에서 확인)
- `DB_PASSWORD`: 2단계에서 설정한 비밀번호

---

### 7단계: 테스트 (1분)

```bash
cd backend
npm run dev
```

성공 메시지:
```
Server running on port 4000
```

테스트:
```bash
curl http://localhost:4000/health
# 응답: {"status":"ok"}
```

---

## ✅ 완료!

이제 Supabase를 사용하여 무료로 데이터베이스를 운영할 수 있습니다!

---

## 📊 Supabase 무료 티어 제한

- ✅ **500MB 데이터베이스**
- ✅ **무제한 API 요청**
- ✅ **2GB 파일 저장소**
- ✅ **50MB 파일 업로드**
- ✅ **2개 프로젝트**
- ✅ **7일 로그 보관**

**충분합니다!** 이 게임은 100MB도 안 씁니다.

---

## 🔍 Supabase 대시보드 활용

### 데이터 확인
1. **"Table Editor"** 클릭
2. 테이블 선택 (예: `cards`)
3. 데이터 확인 및 수정 가능

### SQL 쿼리 실행
1. **"SQL Editor"** 클릭
2. 쿼리 작성 및 실행

예시:
```sql
-- 카드 개수 확인
SELECT COUNT(*) FROM cards;

-- 방 목록 확인
SELECT * FROM rooms;
```

### 실시간 로그
1. **"Logs"** 클릭
2. 쿼리 실행 로그 확인

---

## 🐛 문제 해결

### 연결 오류
```
Error: connect ECONNREFUSED
```

**해결:**
1. `.env` 파일의 연결 정보 재확인
2. Supabase 프로젝트가 활성화되었는지 확인
3. 비밀번호에 특수문자가 있으면 URL 인코딩 필요

### 테이블이 없다는 오류
```
Error: relation "cards" does not exist
```

**해결:**
1. SQL Editor에서 스키마 다시 실행
2. 카드 데이터 시드 다시 실행

### 권한 오류
```
Error: permission denied
```

**해결:**
1. Supabase 대시보드 → Settings → Database
2. "Connection pooling" 사용 확인
3. 연결 문자열 재확인

---

## 🎯 다음 단계

1. ✅ Supabase 설정 완료
2. ✅ 백엔드 실행
3. ✅ 프론트엔드 실행
4. ✅ 게임 플레이!

---

## 💡 팁

### 개발 중 데이터 초기화
```sql
-- 모든 데이터 삭제 (테이블 구조는 유지)
TRUNCATE TABLE 
  event_logs, game_results, joint_plan_contributions, 
  actions, turns, purchased, hands, decks, 
  player_states, players, games, rooms, users, cards
CASCADE;

-- 카드 데이터 다시 시드
-- (seedCards.sql 내용 다시 실행)
```

### 백업
1. Settings → Database → Backups
2. 자동 백업 활성화 (무료 티어: 7일 보관)

### 모니터링
1. Dashboard에서 실시간 통계 확인
2. API 요청 수, 데이터베이스 크기 등

---

## 🎉 성공!

Supabase 설정이 완료되었습니다!

이제 로컬 PostgreSQL 없이도 개발할 수 있습니다.
