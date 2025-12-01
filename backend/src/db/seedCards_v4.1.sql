-- 열네 밤의 꿈 v4.1 카드 데이터 시드

-- 기존 카드 삭제 (재시드)
DELETE FROM cards WHERE type IN ('house', 'support', 'chance');

-- ========================================
-- 집안일 카드 (13장) - 수익 1,500~2,000TC로 통일
-- ========================================
INSERT INTO cards (type, code, name, cost, effects, metadata) VALUES
('house', 'J1', '청소 돕기', 0, '{"money": 1500}', '{"description": "집안 청소를 도와드렸다"}'),
('house', 'J2', '설거지', 0, '{"money": 1500}', '{"description": "식사 후 설거지를 했다"}'),
('house', 'J3', '방 정리', 0, '{"money": 1500}', '{"description": "내 방을 깨끗이 정리했다"}'),
('house', 'J4', '장난감 정리', 0, '{"money": 1500}', '{"description": "동생 장난감을 정리했다"}'),
('house', 'J5', '세탁물 개기', 0, '{"money": 1500}', '{"description": "빨래를 개서 정리했다"}'),
('house', 'J6', '분리수거', 0, '{"money": 1500}', '{"description": "쓰레기를 분리수거했다"}'),
('house', 'J7', '동생 숙제 도와주기', 0, '{"money": 2000}', '{"description": "동생 숙제를 도와줬다"}'),
('house', 'J8', '쓰레기 버리기', 0, '{"money": 1500}', '{"description": "쓰레기를 버리러 갔다"}'),
('house', 'J9', '책상 정리', 0, '{"money": 1500}', '{"description": "책상을 깔끔하게 정리했다"}'),
('house', 'J10', '방 걸레질', 0, '{"money": 2000}', '{"description": "방 바닥을 걸레질했다"}'),
('house', 'J11', '빨래 널기', 0, '{"money": 1500}', '{"description": "빨래를 널었다"}'),
('house', 'J12', '옷장 정리', 0, '{"money": 2000}', '{"description": "옷장을 정리했다"}'),
('house', 'J13', '가족 저녁상 차리기', 0, '{"money": 2000}', '{"description": "저녁 식사 준비를 도왔다"}');

-- ========================================
-- 여행 지원 카드 (16장) - 구 투자 카드 리스킨
-- ========================================

-- 수익 카드 (8장)
INSERT INTO cards (type, code, name, cost, effects, metadata) VALUES
('support', 'Y1', '엄마의 비밀 용돈통', 0, '{"money": 2500}', '{"description": "여행 간다니까 몰래 챙겨주셨어.", "story": true}'),
('support', 'Y2', '아빠의 여행 보너스', 0, '{"money": 3000}', '{"description": "열심히 준비하는 모습에 감동!", "story": true}'),
('support', 'Y3', '할머니 봉투', 0, '{"money": 3500}', '{"description": "예쁘게 놀다 오라며 작은 봉투를…", "story": true}'),
('support', 'Y4', '부모님 특별 지원', 0, '{"money": 4000}', '{"description": "이번 여행만큼은 특별히 더!", "story": true}'),
('support', 'Y5', '여행 공모전 상금', 0, '{"money": 2500}', '{"description": "계획서를 냈더니 상을 받았다.", "story": true}'),
('support', 'Y6', '알바 팁 대박', 0, '{"money": 3000}', '{"description": "단골 손님이 여행 잘 다녀오라며.", "story": true}'),
('support', 'Y7', '주식 초보 성공!', 0, '{"money": 3500}', '{"description": "1주 사놨는데… 어? 올랐어?", "story": true}'),
('support', 'Y8', '용돈 미션 성공', 0, '{"money": 4000}', '{"description": "미션을 완수해 보상을 받았다.", "story": true}');

-- 지출 카드 (8장)
INSERT INTO cards (type, code, name, cost, effects, metadata) VALUES
('support', 'Y9', '여권 사진 다시 찍기', 0, '{"money": -1000}', '{"description": "눈 감아버렸다…", "story": true}'),
('support', 'Y10', '간식 포장지 대참사', 0, '{"money": -1000}', '{"description": "흘려서 새로 샀다…", "story": true}'),
('support', 'Y11', '수영복 사이즈 실수', 0, '{"money": -1500}', '{"description": "이건 안 맞는다.", "story": true}'),
('support', 'Y12', '충전기 잃어버림', 0, '{"money": -2000}', '{"description": "여행 전에 사고…", "story": true}'),
('support', 'Y13', '기념품 욕심', 0, '{"money": -1000}', '{"description": "너무 귀여워 참지 못했다.", "story": true}'),
('support', 'Y14', '옷 수선 비용', 0, '{"money": -1500}', '{"description": "정리하다 찢어진 걸 발견했다.", "story": true}'),
('support', 'Y15', '교통카드 중복 충전', 0, '{"money": -1500}', '{"description": "두 번 찍어버렸다!", "story": true}'),
('support', 'Y16', '급배송비 폭탄', 0, '{"money": -2000}', '{"description": "급하게 시켜서…", "story": true}');

-- ========================================
-- 찬스 카드 업데이트
-- ========================================

-- CH19 추가 (반전의 기회)
INSERT INTO cards (type, code, name, cost, effects, metadata) VALUES
('chance', 'CH19', '반전의 기회', 0, '{}', '{"type": "special", "action": "repeat_current", "description": "이동 없이 현재 칸 행동 1회 추가"}');

-- 기존 찬스 카드에 2인 전용 금지 플래그 추가
UPDATE cards SET metadata = jsonb_set(metadata, '{forbidden_2p}', 'true') 
WHERE code IN ('CH11', 'CH12', 'CH13');

-- CH11, CH12, CH13에 설명 추가
UPDATE cards SET metadata = jsonb_set(metadata, '{note}', '"2인 플레이에서는 사용할 수 없습니다"') 
WHERE code IN ('CH11', 'CH12', 'CH13');

-- ========================================
-- 카드 타입 변경 확인용 뷰
-- ========================================
CREATE OR REPLACE VIEW v_card_summary AS
SELECT 
  type,
  COUNT(*) as count,
  MIN(COALESCE((effects->>'money')::int, 0)) as min_money,
  MAX(COALESCE((effects->>'money')::int, 0)) as max_money
FROM cards
GROUP BY type
ORDER BY type;

-- 확인 쿼리
-- SELECT * FROM v_card_summary;
