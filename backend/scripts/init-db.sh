#!/usr/bin/env bash
# 로컬/신규 PostgreSQL(Supabase 포함)에 스키마 + 마이그레이션 + 카드 데이터를 한 번에 적용한다.
# 사용법: DATABASE_URL=postgres://user:pass@host:5432/db ./scripts/init-db.sh
#        (또는 PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE 환경변수)
set -euo pipefail
cd "$(dirname "$0")/../src/db"

PSQL=(psql -v ON_ERROR_STOP=1 -q)
if [[ -n "${DATABASE_URL:-}" ]]; then PSQL+=("$DATABASE_URL"); fi

for f in schema.sql migration_v4.1.sql add_is_ai_column.sql add_created_at_to_players.sql \
         add_forced_move_flag.sql add_discarded_cards_table.sql; do
  echo "▶ $f"
  "${PSQL[@]}" -f "$f"
done

echo "▶ seedCards_FULL.sql (카드 마스터 데이터)"
"${PSQL[@]}" -c "DELETE FROM cards WHERE NOT EXISTS (SELECT 1 FROM hands WHERE hands.card_id = cards.id) AND NOT EXISTS (SELECT 1 FROM purchased WHERE purchased.card_id = cards.id)" >/dev/null
"${PSQL[@]}" -f seedCards_FULL.sql
echo "✅ 완료"
