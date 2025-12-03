-- 강제 이동 플래그 추가
-- 찬스 카드로 강제 이동된 경우 "직전 턴 행동 칸 불가" 규칙 예외 적용

ALTER TABLE player_states 
ADD COLUMN IF NOT EXISTS forced_move BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN player_states.forced_move IS '찬스 카드로 강제 이동되었는지 여부 (true면 직전 행동 칸 규칙 예외)';
