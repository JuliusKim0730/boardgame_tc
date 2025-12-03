-- 열네 밤의 꿈 v4.1 마이그레이션

-- 1. resolve_token 타입 확인 및 변경 (BOOLEAN → INT)
DO $$ 
BEGIN
  -- 현재 타입 확인
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'player_states' 
    AND column_name = 'resolve_token' 
    AND data_type = 'boolean'
  ) THEN
    -- BOOLEAN인 경우 INT로 변경
    ALTER TABLE player_states 
    ALTER COLUMN resolve_token DROP DEFAULT;
    
    ALTER TABLE player_states 
    ALTER COLUMN resolve_token TYPE INT 
    USING (CASE WHEN resolve_token = true THEN 1 ELSE 0 END);
    
    ALTER TABLE player_states 
    ALTER COLUMN resolve_token SET DEFAULT 1;
    
    RAISE NOTICE 'resolve_token 타입을 BOOLEAN에서 INT로 변경했습니다.';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'player_states' 
    AND column_name = 'resolve_token' 
    AND data_type = 'integer'
  ) THEN
    -- 이미 INT인 경우 기본값만 확인
    ALTER TABLE player_states 
    ALTER COLUMN resolve_token SET DEFAULT 1;
    
    RAISE NOTICE 'resolve_token은 이미 INT 타입입니다. 기본값만 설정했습니다.';
  END IF;
END $$;

-- 2. 초기 자금 기본값 변경 (2000 → 3000)
ALTER TABLE player_states 
ALTER COLUMN money SET DEFAULT 3000;

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_game_type ON event_logs(game_id, event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created ON event_logs(created_at);

-- 4. 기존 데이터 마이그레이션 (필요 시)
-- 기존 게임이 있다면 resolve_token을 1로 설정
UPDATE player_states SET resolve_token = 1 WHERE resolve_token IS NULL OR resolve_token = 0;

-- 5. 코멘트 추가
COMMENT ON COLUMN player_states.resolve_token IS '결심 토큰 개수 (0~2)';
COMMENT ON COLUMN player_states.money IS '초기 자금 3,000TC';

-- 마이그레이션 완료 확인
SELECT 
  column_name, 
  data_type, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'player_states' 
AND column_name IN ('resolve_token', 'money');
