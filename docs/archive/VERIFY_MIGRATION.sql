-- v4.1 마이그레이션 검증 쿼리

-- 1. resolve_token 타입 확인
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'player_states' 
AND column_name IN ('resolve_token', 'money');

-- 예상 결과:
-- resolve_token | integer | 1        | YES
-- money         | integer | 3000     | YES

-- 2. 카드 타입별 개수 확인
SELECT 
  type, 
  COUNT(*) as count
FROM cards
GROUP BY type
ORDER BY type;

-- 예상 결과:
-- chance   | 26 (기존 25 + CH19)
-- house    | 13
-- support  | 16
-- 기타...

-- 3. 집안일 카드 수익 범위 확인
SELECT 
  code, 
  name, 
  (effects->>'money')::int as money
FROM cards
WHERE type = 'house'
ORDER BY code;

-- 예상: 모두 1500 또는 2000

-- 4. 여행 지원 카드 확인
SELECT 
  code, 
  name, 
  (effects->>'money')::int as money
FROM cards
WHERE type = 'support'
ORDER BY code;

-- 예상: Y1~Y8 양수, Y9~Y16 음수

-- 5. 2인 금지 카드 확인
SELECT 
  code, 
  name, 
  metadata->>'forbidden_2p' as forbidden,
  metadata->>'note' as note
FROM cards
WHERE metadata->>'forbidden_2p' = 'true';

-- 예상: CH11, CH12, CH13

-- 6. CH19 카드 확인
SELECT 
  code, 
  name, 
  metadata->>'type' as type,
  metadata->>'action' as action,
  metadata->>'description' as description
FROM cards
WHERE code = 'CH19';

-- 예상: 반전의 기회, special, repeat_current

-- 7. 인덱스 확인
SELECT 
  indexname, 
  tablename, 
  indexdef
FROM pg_indexes
WHERE tablename IN ('player_states', 'event_logs')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 예상: idx_event_logs_game_type, idx_event_logs_created 등

-- ✅ 모든 검증이 통과하면 마이그레이션 성공!
