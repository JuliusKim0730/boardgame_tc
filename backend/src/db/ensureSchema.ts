import { pool } from './pool';

/**
 * 서버가 기대하는 컬럼을 시작 시 보장한다 (모두 IF NOT EXISTS라 여러 번 실행해도 안전).
 * Supabase에 개별 마이그레이션 SQL을 빠뜨려도 게임이 깨지지 않도록 하기 위함.
 */
const STATEMENTS = [
  'ALTER TABLE players ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT FALSE',
  'ALTER TABLE players ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()',
  'ALTER TABLE player_states ADD COLUMN IF NOT EXISTS forced_move BOOLEAN DEFAULT FALSE',
  'ALTER TABLE player_states ALTER COLUMN money SET DEFAULT 3000',
  'CREATE INDEX IF NOT EXISTS idx_event_logs_game_type ON event_logs(game_id, event_type)',
  'CREATE INDEX IF NOT EXISTS idx_actions_turn ON actions(turn_id)',
];

export async function ensureSchema(): Promise<void> {
  for (const sql of STATEMENTS) {
    try {
      await pool.query(sql);
    } catch (error: any) {
      console.warn(`⚠️ 스키마 보정 실패 (${sql}): ${error.message}`);
    }
  }
}
