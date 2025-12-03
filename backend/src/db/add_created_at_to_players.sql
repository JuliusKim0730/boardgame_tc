-- players 테이블에 created_at 컬럼 추가

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 기존 데이터에 created_at 설정 (없는 경우)
UPDATE players 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_players_room_created ON players(room_id, created_at);

-- 확인
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'players' 
AND column_name = 'created_at';
