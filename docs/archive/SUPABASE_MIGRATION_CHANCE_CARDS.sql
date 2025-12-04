-- ========================================
-- 찬스 카드 기능 마이그레이션
-- 실행 날짜: 2024-12-03
-- ========================================

-- 1. 강제 이동 플래그 추가
-- 찬스 카드로 강제 이동된 경우 "직전 턴 행동 칸 불가" 규칙 예외 적용
ALTER TABLE player_states 
ADD COLUMN IF NOT EXISTS forced_move BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN player_states.forced_move IS '찬스 카드로 강제 이동되었는지 여부 (true면 직전 행동 칸 규칙 예외)';

-- 2. 버린 카드 추적 테이블 생성
-- CH16: 버린만큼 뽑기 구현용
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

-- ========================================
-- 마이그레이션 완료
-- ========================================

-- 확인 쿼리
SELECT 
  'forced_move 컬럼 추가됨' as status,
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'player_states' 
    AND column_name = 'forced_move'
  ) as column_exists;

SELECT 
  'discarded_cards 테이블 생성됨' as status,
  EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'discarded_cards'
  ) as table_exists;
