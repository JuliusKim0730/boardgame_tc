-- players 테이블에 is_ai 컬럼 추가
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT FALSE;

-- 기존 AI 플레이어 업데이트 (닉네임 기반)
UPDATE players p
SET is_ai = TRUE
FROM users u
WHERE p.user_id = u.id
AND (
  u.nickname LIKE '%로봇%' 
  OR u.nickname LIKE '%AI%' 
  OR u.nickname LIKE '%봇%'
  OR u.nickname LIKE '%컴퓨터%'
  OR u.nickname LIKE '%기계%'
  OR u.nickname LIKE '%알고리즘%'
);

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_players_is_ai ON players(is_ai) WHERE is_ai = TRUE;

-- 확인
SELECT p.id, u.nickname, p.is_ai
FROM players p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at;
