-- 열네 밤의 꿈 v4.1 마이그레이션

-- 1. resolve_token 타입 변경 (BOOLEAN → INT)
-- 먼저 기본값 제거
ALTER TABLE player_states 
ALTER COLUMN resolve_token DROP DEFAULT;

-- 타입 변경
ALTER TABLE player_states 
ALTER COLUMN resolve_token TYPE INT 
USING (CASE WHEN resolve_token THEN 1 ELSE 0 END);

-- 새로운 기본값 설정
ALTER TABLE player_states 
ALTER COLUMN resolve_token SET DEFAULT 1;

-- 2. 초기 자금 기본값 변경 (2000 → 3000)
ALTER TABLE player_states 
ALTER COLUMN money SET DEFAULT 3000;

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_game_type ON event_logs(game_id, event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created ON event_logs(created_at);

-- 4. 기존 데이터 마이그레이션 (필요 시)
-- UPDATE player_states SET resolve_token = 1 WHERE resolve_token IS NULL;

COMMENT ON COLUMN player_states.resolve_token IS '결심 토큰 개수 (0~2)';
COMMENT ON COLUMN player_states.money IS '초기 자금 3,000TC';
