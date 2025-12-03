-- 버린 카드 추적 테이블
CREATE TABLE IF NOT EXISTS discarded_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_state_id UUID NOT NULL REFERENCES player_states(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id),
  discarded_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_game FOREIGN KEY (game_id) REFERENCES games(id),
  CONSTRAINT fk_player_state FOREIGN KEY (player_state_id) REFERENCES player_states(id),
  CONSTRAINT fk_card FOREIGN KEY (card_id) REFERENCES cards(id)
);

CREATE INDEX IF NOT EXISTS idx_discarded_cards_game ON discarded_cards(game_id);
CREATE INDEX IF NOT EXISTS idx_discarded_cards_player ON discarded_cards(player_state_id);

COMMENT ON TABLE discarded_cards IS '버린 카드 추적 (CH16: 버린만큼 뽑기 구현용)';
