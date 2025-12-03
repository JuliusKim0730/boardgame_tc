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
  money INT DEFAULT 3000,
  position INT DEFAULT 1,
  resolve_token INT DEFAULT 1,
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
