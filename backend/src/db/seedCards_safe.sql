-- 카드 데이터 시드 (안전 버전 - 중복 시 업데이트)

-- 기존 카드 데이터 삭제 (선택사항)
-- DELETE FROM cards;

-- 또는 TRUNCATE 사용 (더 빠름)
TRUNCATE TABLE cards CASCADE;

-- 여행지 카드 (10장)
INSERT INTO cards (type, code, name, effects, metadata) VALUES
('travel', 'T_JEJU', '제주', '{"main":"nature","normal":"taste","sub":"water"}', '{"multipliers":{"nature":3,"taste":2,"water":1}}'),
('travel', 'T_GYEONGJU', '경주', '{"main":"history","normal":"culture","sub":"taste"}', '{"multipliers":{"history":3,"culture":2,"taste":1}}'),
('travel', 'T_BUSAN', '부산', '{"main":"water","normal":"taste","sub":"leisure"}', '{"multipliers":{"water":3,"taste":2,"leisure":1}}'),
('travel', 'T_TOKYO', '도쿄', '{"main":"culture","normal":"taste","sub":"history"}', '{"multipliers":{"culture":3,"taste":2,"history":1}}'),
('travel', 'T_TAIPEI', '타이페이', '{"main":"taste","normal":"culture","sub":"nature"}', '{"multipliers":{"taste":3,"culture":2,"nature":1}}'),
('travel', 'T_BANGKOK', '방콕', '{"main":"taste","normal":"history","sub":"water"}', '{"multipliers":{"taste":3,"history":2,"water":1}}'),
('travel', 'T_BALI', '발리', '{"main":"water","normal":"nature","sub":"leisure"}', '{"multipliers":{"water":3,"nature":2,"leisure":1}}'),
('travel', 'T_SINGAPORE', '싱가포르', '{"main":"culture","normal":"taste","sub":"nature"}', '{"multipliers":{"culture":3,"taste":2,"nature":1}}'),
('travel', 'T_SYDNEY', '시드니', '{"main":"nature","normal":"leisure","sub":"culture"}', '{"multipliers":{"nature":3,"leisure":2,"culture":1}}'),
('travel', 'T_HAWAII', '하와이', '{"main":"water","normal":"nature","sub":"taste"}', '{"multipliers":{"water":3,"nature":2,"taste":1}}');

-- 무료 계획 카드 (8장)
INSERT INTO cards (type, code, name, cost, effects) VALUES
('freeplan', 'F1', '편의점 라면 끓여먹기', 0, '{"taste":1,"memory":2}'),
('freeplan', 'F2', '마을 산책하기', 0, '{"nature":1,"memory":2}'),
('freeplan', 'F3', '여행 브이로그 찍기', 0, '{"culture":1,"memory":2}'),
('freeplan', 'F4', '부모님과 아침 조깅', 0, '{"leisure":1,"memory":2}'),
('freeplan', 'F5', '친구랑 놀기', 0, '{"memory":3}'),
('freeplan', 'F6', '바닷가 돌멩이 던지기', 0, '{"water":1,"memory":2}'),
('freeplan', 'F7', '작은 박물관 구경', 0, '{"history":1,"memory":2}'),
('freeplan', 'F8', '공원에서 배드민턴', 0, '{"leisure":1,"memory":1}');

-- 일반 계획 카드 (40장)
INSERT INTO cards (type, code, name, cost, effects) VALUES
-- 맛 (6장)
('plan', 'T1', '유명 맛집 방문', 5000, '{"taste":3}'),
('plan', 'T2', '가족 디저트 카페', 4000, '{"taste":2,"memory":1}'),
('plan', 'T3', '푸드 코트 투어', 3000, '{"taste":1,"culture":1}'),
('plan', 'T4', '현지 간식 만들기 체험', 6000, '{"taste":2,"culture":1,"memory":1}'),
('plan', 'T5', '야시장 먹방', 7000, '{"taste":3,"memory":1}'),
('plan', 'T6', '지역 특산물 세트 먹기', 8000, '{"taste":4}'),
-- 역사 (6장)
('plan', 'H1', '유적지 투어', 6000, '{"history":3}'),
('plan', 'H2', '부모님과 역사 박물관', 4000, '{"history":2,"memory":1}'),
('plan', 'H3', '성/고궁 가이드 체험', 5000, '{"history":2,"culture":1}'),
('plan', 'H4', '전통 옷 체험', 6000, '{"history":2,"culture":1,"memory":1}'),
('plan', 'H5', '역사 보드게임 카페', 3000, '{"history":1,"culture":1}'),
('plan', 'H6', '역사 문화 공연 관람', 8000, '{"history":3,"memory":1}'),
-- 자연 (6장)
('plan', 'N1', '국립공원 탐방', 7000, '{"nature":4}'),
('plan', 'N2', '폭포/계곡 산책', 4000, '{"nature":2,"memory":1}'),
('plan', 'N3', '전망대 오르기', 3000, '{"nature":1,"culture":1}'),
('plan', 'N4', '석양 감상 포인트', 5000, '{"nature":2,"memory":1}'),
('plan', 'N5', '식물원/정원 투어', 6000, '{"nature":2,"culture":1}'),
('plan', 'N6', '하늘정원 트래킹', 9000, '{"nature":3,"leisure":1}'),
-- 문화 (6장)
('plan', 'C1', '테마파크 퍼레이드', 7000, '{"culture":3}'),
('plan', 'C2', '예술 전시 관람', 4000, '{"culture":2,"memory":1}'),
('plan', 'C3', '지역 공연 감상', 6000, '{"culture":2,"history":1}'),
('plan', 'C4', '스트릿 퍼포먼스 투어', 3000, '{"culture":1,"leisure":1}'),
('plan', 'C5', '가족 체험 공방', 5000, '{"culture":1,"memory":1,"taste":1}'),
('plan', 'C6', '야경 페스티벌', 8000, '{"culture":3,"memory":1}'),
-- 레저 (6장)
('plan', 'L1', '숲 속 미니어쳐 골프', 4000, '{"leisure":2}'),
('plan', 'L2', '가족 트램펄린', 5000, '{"leisure":2,"memory":1}'),
('plan', 'L3', '패밀리 자전거', 3000, '{"leisure":1,"nature":1}'),
('plan', 'L4', '승마 체험', 7000, '{"leisure":3}'),
('plan', 'L5', '가족 요트 체험', 8000, '{"leisure":3,"memory":1}'),
('plan', 'L6', '스카이 자전거 체험', 9000, '{"leisure":4}'),
-- 물놀이 (6장)
('plan', 'W1', '호텔 수영장', 4000, '{"water":2}'),
('plan', 'W2', '가족 스파', 5000, '{"water":2,"memory":1}'),
('plan', 'W3', '튜브 물놀이', 3000, '{"water":1,"leisure":1}'),
('plan', 'W4', '간단한 스노클링', 6000, '{"water":2,"nature":1}'),
('plan', 'W5', '아름다운 해변 산책', 3000, '{"water":1,"memory":1}'),
('plan', 'W6', '비치 핸드볼', 7000, '{"water":3}'),
-- 복합 (4장)
('plan', 'M1', '가족 사진 촬영', 4000, '{"culture":1,"memory":2}'),
('plan', 'M2', '현지 시장 구경', 3000, '{"taste":1,"culture":1}'),
('plan', 'M3', '케이블카 타기', 5000, '{"nature":2,"leisure":1}'),
('plan', 'M4', '동물원 방문', 6000, '{"nature":2,"culture":1,"memory":1}');

-- 집안일 카드 (13장)
INSERT INTO cards (type, code, name, effects) VALUES
('house', 'J1', '청소 돕기', '{"money":1000}'),
('house', 'J2', '설거지 하기', '{"money":1500}'),
('house', 'J3', '방 정리', '{"money":1000}'),
('house', 'J4', '장난감 정리', '{"money":1000}'),
('house', 'J5', '세탁 개기', '{"money":1500}'),
('house', 'J6', '분리수거', '{"money":1000}'),
('house', 'J7', '동생 숙제 도와주기', '{"money":2000}'),
('house', 'J8', '쓰레기 버리기', '{"money":1000}'),
('house', 'J9', '책상 정리', '{"money":1500}'),
('house', 'J10', '방 걸레질', '{"money":2000}'),
('house', 'J11', '빨래 널기', '{"money":1500}'),
('house', 'J12', '옷장 정리', '{"money":2000}'),
('house', 'J13', '가족 저녁상 차리기', '{"money":2500}');

-- 투자 카드 (16장)
INSERT INTO cards (type, code, name, effects) VALUES
('invest', 'I1', '부모님과 저축 상품 가입', '{"money":2500}'),
('invest', 'I2', '부모님과 재테크 공부 후 투자', '{"money":3000}'),
('invest', 'I3', '부모님 추천 주식 소액 매수', '{"money":3500}'),
('invest', 'I4', '부모님 회사 적금 우대', '{"money":4000}'),
('invest', 'I5', '부모님과 간식가게 재고 투자', '{"money":2500}'),
('invest', 'I6', '부모님과 동네 기업 투자', '{"money":3000}'),
('invest', 'I7', '부모님과 ETF 투자', '{"money":3500}'),
('invest', 'I8', '부모님과 달러 예금', '{"money":4000}'),
('invest', 'I9', '부모님과 조언 듣고 투자 실패', '{"money":-500}'),
('invest', 'I10', '뉴스만 보고 투자… 실패', '{"money":-1000}'),
('invest', 'I11', '너무 급하게 투자해서…', '{"money":-1500}'),
('invest', 'I12', '친구말 믿고 투자했다가…', '{"money":-2000}'),
('invest', 'I13', '부모님과 코인 시뮬레이션', '{"money":-500}'),
('invest', 'I14', '부모님과 부동산 공부', '{"money":-1000}'),
('invest', 'I15', '부모님과 팬덤 굿즈 재판매 실패', '{"money":-1500}'),
('invest', 'I16', '부모님과 소액펀드 실패', '{"money":-2000}');

-- 찬스 카드 (20장)
INSERT INTO cards (type, code, name, effects, metadata) VALUES
-- 큰돈 (2장)
('chance', 'CH1', '아빠가 기분 좋아 용돈!', '{"money":3000}', '{"type":"money"}'),
('chance', 'CH2', '여행 지원금 이벤트 당첨!', '{"money":4000}', '{"type":"money"}'),
-- 돈 조금 잃기 (5장)
('chance', 'CH3', '준비물을 잊어버렸다', '{"money":-1000}', '{"type":"money"}'),
('chance', 'CH4', '급하게 간식 사먹음', '{"money":-500}', '{"type":"money"}'),
('chance', 'CH5', '우산을 잃어버렸다', '{"money":-1000}', '{"type":"money"}'),
('chance', 'CH6', '핸드폰 충전기 구매', '{"money":-1000}', '{"type":"money"}'),
('chance', 'CH7', '버스카드 충전', '{"money":-500}', '{"type":"money"}'),
-- 상호작용/방해 카드 (6장)
('chance', 'CH8', '친구랑 같이 집안일', '{}', '{"type":"interaction","action":"shared_house"}'),
('chance', 'CH9', '공동 투자', '{}', '{"type":"interaction","action":"shared_invest"}'),
('chance', 'CH10', '계획 구매 요청', '{}', '{"type":"interaction","action":"purchase_request"}'),
('chance', 'CH11', '계획 교환', '{}', '{"type":"interaction","action":"card_exchange"}'),
('chance', 'CH12', '모두 내 자리로', '{}', '{"type":"interaction","action":"summon_all"}'),
('chance', 'CH13', '자릿수 바꾸기', '{}', '{"type":"interaction","action":"swap_position"}'),
-- 새 카드 드로우 (4장)
('chance', 'CH14', '선생님이 여행 이야기를 들려줌', '{}', '{"type":"draw","action":"catchup_plan"}'),
('chance', 'CH15', '우연히 좋은 정보 획득', '{}', '{"type":"draw","action":"draw_plan"}'),
('chance', 'CH16', '버린 만큼 보상', '{}', '{"type":"draw","action":"discard_draw"}'),
('chance', 'CH17', '여행 팜플렛 발견', '{}', '{"type":"draw","action":"replace_joint"}'),
-- 특수 행동 카드 (3장)
('chance', 'CH18', '체력이 넘친다!', '{}', '{"type":"special","action":"extra_action"}'),
('chance', 'CH19', '잠깐 쉬어!', '{}', '{"type":"special","action":"skip_turn"}'),
('chance', 'CH20', '공동 계획 반값 쿠폰', '{}', '{"type":"special","action":"joint_discount"}');

-- 공동 계획 카드 (10장)
INSERT INTO cards (type, code, name, cost, effects, metadata) VALUES
('joint', 'JP1', '가족 단체 사진 촬영', 8000, '{"culture":2,"memory":3}', '{"bonus":"memory+1"}'),
('joint', 'JP2', '특별한 레스토랑 예약', 10000, '{"taste":3,"culture":2}', '{"bonus":"taste+1"}'),
('joint', 'JP3', '프라이빗 투어 예약', 12000, '{"history":3,"culture":2,"memory":1}', '{"bonus":"history+1"}'),
('joint', 'JP4', '가족 스파 패키지', 9000, '{"water":2,"leisure":2,"memory":2}', '{"bonus":"water+1"}'),
('joint', 'JP5', '산악 트래킹 투어', 11000, '{"nature":3,"leisure":2,"memory":1}', '{"bonus":"nature+1"}'),
('joint', 'JP6', '전통 문화 체험 패키지', 10000, '{"history":2,"culture":3,"memory":1}', '{"bonus":"culture+1"}'),
('joint', 'JP7', '가족 요트 크루즈', 14000, '{"water":3,"leisure":2,"memory":2}', '{"bonus":"leisure+1"}'),
('joint', 'JP8', '미식 투어 패키지', 12000, '{"taste":4,"culture":1,"memory":1}', '{"bonus":"taste+1"}'),
('joint', 'JP9', '테마파크 VIP 패스', 13000, '{"culture":3,"leisure":2,"memory":2}', '{"bonus":"memory+1"}'),
('joint', 'JP10', '자연 생태 탐험', 11000, '{"nature":4,"history":1,"memory":1}', '{"bonus":"nature+1"}');

-- 카드 개수 확인
SELECT 
  type,
  COUNT(*) as count
FROM cards
GROUP BY type
ORDER BY type;

-- 총 카드 개수
SELECT COUNT(*) as total_cards FROM cards;
