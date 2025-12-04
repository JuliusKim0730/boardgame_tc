-- 열네 밤의 꿈 v4.1 - 완전한 카드 데이터 시드
-- 총 123장 (여행 10 + 무료계획 8 + 일반계획 40 + 집안일 13 + 여행지원 16 + 찬스 26 + 공동계획 10)

-- 기존 카드 모두 삭제
DELETE FROM cards;

-- ========================================
-- 여행지 카드 (10장)
-- ========================================
INSERT INTO cards (type, code, name, effects, metadata) VALUES
('travel', 'TR1', '제주', '{"main":"nature","normal":"taste","sub":"water"}', '{"multipliers":{"nature":3,"taste":2,"water":1}}'),
('travel', 'TR2', '경주', '{"main":"history","normal":"culture","sub":"taste"}', '{"multipliers":{"history":3,"culture":2,"taste":1}}'),
('travel', 'TR3', '부산', '{"main":"water","normal":"taste","sub":"leisure"}', '{"multipliers":{"water":3,"taste":2,"leisure":1}}'),
('travel', 'TR4', '도쿄', '{"main":"culture","normal":"taste","sub":"history"}', '{"multipliers":{"culture":3,"taste":2,"history":1}}'),
('travel', 'TR5', '타이페이', '{"main":"taste","normal":"culture","sub":"nature"}', '{"multipliers":{"taste":3,"culture":2,"nature":1}}'),
('travel', 'TR6', '방콕', '{"main":"taste","normal":"history","sub":"water"}', '{"multipliers":{"taste":3,"history":2,"water":1}}'),
('travel', 'TR7', '발리', '{"main":"water","normal":"nature","sub":"leisure"}', '{"multipliers":{"water":3,"nature":2,"leisure":1}}'),
('travel', 'TR8', '싱가포르', '{"main":"culture","normal":"taste","sub":"nature"}', '{"multipliers":{"culture":3,"taste":2,"nature":1}}'),
('travel', 'TR9', '시드니', '{"main":"nature","normal":"leisure","sub":"culture"}', '{"multipliers":{"nature":3,"leisure":2,"culture":1}}'),
('travel', 'TR10', '하와이', '{"main":"water","normal":"nature","sub":"taste"}', '{"multipliers":{"water":3,"nature":2,"taste":1}}');

-- ========================================
-- 무료 계획 카드 (8장)
-- ========================================
INSERT INTO cards (type, code, name, cost, effects) VALUES
('freeplan', 'F1', '편의점 라면 끓여먹기', 0, '{"taste":1,"memory":2}'),
('freeplan', 'F2', '마을 산책하기', 0, '{"nature":1,"memory":2}'),
('freeplan', 'F3', '여행 브이로그 찍기', 0, '{"culture":1,"memory":2}'),
('freeplan', 'F4', '부모님과 아침 조깅', 0, '{"leisure":1,"memory":2}'),
('freeplan', 'F5', '친구랑 놀기', 0, '{"memory":3}'),
('freeplan', 'F6', '바닷가 돌멩이 던지기', 0, '{"water":1,"memory":2}'),
('freeplan', 'F7', '작은 박물관 구경', 0, '{"history":1,"memory":2}'),
('freeplan', 'F8', '공원에서 배드민턴', 0, '{"leisure":1,"memory":1}');

-- ========================================
-- 일반 계획 카드 (40장)
-- ========================================
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

-- ========================================
-- 집안일 카드 (13장) - v4.1: 수익 1,500~2,000TC로 통일
-- ========================================
INSERT INTO cards (type, code, name, cost, effects) VALUES
('house', 'J1', '청소 돕기', 0, '{"money":1500}'),
('house', 'J2', '설거지', 0, '{"money":1500}'),
('house', 'J3', '방 정리', 0, '{"money":1500}'),
('house', 'J4', '장난감 정리', 0, '{"money":1500}'),
('house', 'J5', '세탁물 개기', 0, '{"money":1500}'),
('house', 'J6', '분리수거', 0, '{"money":1500}'),
('house', 'J7', '동생 숙제 도와주기', 0, '{"money":2000}'),
('house', 'J8', '쓰레기 버리기', 0, '{"money":1500}'),
('house', 'J9', '책상 정리', 0, '{"money":1500}'),
('house', 'J10', '방 걸레질', 0, '{"money":2000}'),
('house', 'J11', '빨래 널기', 0, '{"money":1500}'),
('house', 'J12', '옷장 정리', 0, '{"money":2000}'),
('house', 'J13', '가족 저녁상 차리기', 0, '{"money":2000}');

-- ========================================
-- 여행 지원 카드 (16장) - v4.1: 구 투자 카드 리스킨
-- ========================================
INSERT INTO cards (type, code, name, cost, effects, metadata) VALUES
-- 수익 카드 (8장)
('support', 'Y1', '엄마의 비밀 용돈통', 0, '{"money":2500}', '{"description":"여행 간다니까 몰래 챙겨주셨어.","story":true}'),
('support', 'Y2', '아빠의 여행 보너스', 0, '{"money":3000}', '{"description":"열심히 준비하는 모습에 감동!","story":true}'),
('support', 'Y3', '할머니 봉투', 0, '{"money":3500}', '{"description":"예쁘게 놀다 오라며 작은 봉투를…","story":true}'),
('support', 'Y4', '부모님 특별 지원', 0, '{"money":4000}', '{"description":"이번 여행만큼은 특별히 더!","story":true}'),
('support', 'Y5', '여행 공모전 상금', 0, '{"money":2500}', '{"description":"계획서를 냈더니 상을 받았다.","story":true}'),
('support', 'Y6', '알바 팁 대박', 0, '{"money":3000}', '{"description":"단골 손님이 여행 잘 다녀오라며.","story":true}'),
('support', 'Y7', '주식 초보 성공!', 0, '{"money":3500}', '{"description":"1주 사놨는데… 어? 올랐어?","story":true}'),
('support', 'Y8', '용돈 미션 성공', 0, '{"money":4000}', '{"description":"미션을 완수해 보상을 받았다.","story":true}'),
-- 지출 카드 (8장)
('support', 'Y9', '여권 사진 다시 찍기', 0, '{"money":-1000}', '{"description":"눈 감아버렸다…","story":true}'),
('support', 'Y10', '간식 포장지 대참사', 0, '{"money":-1000}', '{"description":"흘려서 새로 샀다…","story":true}'),
('support', 'Y11', '수영복 사이즈 실수', 0, '{"money":-1500}', '{"description":"이건 안 맞는다.","story":true}'),
('support', 'Y12', '충전기 잃어버림', 0, '{"money":-2000}', '{"description":"여행 전에 사고…","story":true}'),
('support', 'Y13', '기념품 욕심', 0, '{"money":-1000}', '{"description":"너무 귀여워 참지 못했다.","story":true}'),
('support', 'Y14', '옷 수선 비용', 0, '{"money":-1500}', '{"description":"정리하다 찢어진 걸 발견했다.","story":true}'),
('support', 'Y15', '교통카드 중복 충전', 0, '{"money":-1500}', '{"description":"두 번 찍어버렸다!","story":true}'),
('support', 'Y16', '급배송비 폭탄', 0, '{"money":-2000}', '{"description":"급하게 시켜서…","story":true}');

-- ========================================
-- 찬스 카드 (26장)
-- ========================================
INSERT INTO cards (type, code, name, cost, effects, metadata) VALUES
-- 큰돈 (2장)
('chance', 'CH1', '아빠가 기분 좋아서!', 0, '{"money":3000}', '{"type":"money"}'),
('chance', 'CH2', '여행 지원금 당첨!', 0, '{"money":4000}', '{"type":"money"}'),
-- 돈 조금 잃기 (5장)
('chance', 'CH3', '준비물 구매', 0, '{"money":-1000}', '{"type":"money"}'),
('chance', 'CH4', '간식 충동구매', 0, '{"money":-1000}', '{"type":"money"}'),
('chance', 'CH5', '우산 잃어버림', 0, '{"money":-1000}', '{"type":"money"}'),
('chance', 'CH6', '충전기 구매', 0, '{"money":-1000}', '{"type":"money"}'),
('chance', 'CH7', '버스카드 충전', 0, '{"money":-1000}', '{"type":"money"}'),
-- 상호작용/방해 카드 (6장) - CH11,12,13은 2인 금지
('chance', 'CH8', '친구와 집안일', 0, '{}', '{"type":"interaction","action":"shared_house"}'),
('chance', 'CH9', '공동 지원 이벤트', 0, '{}', '{"type":"interaction","action":"shared_invest"}'),
('chance', 'CH10', '계획 구매 요청', 0, '{}', '{"type":"interaction","action":"purchase_request"}'),
('chance', 'CH11', '계획 교환', 0, '{}', '{"type":"interaction","action":"card_exchange","forbidden_2p":true}'),
('chance', 'CH12', '모두 내 자리로', 0, '{}', '{"type":"interaction","action":"summon_all","forbidden_2p":true}'),
('chance', 'CH13', '자리 바꾸기', 0, '{}', '{"type":"interaction","action":"swap_position","forbidden_2p":true}'),
-- 새 카드 드로우 (4장)
('chance', 'CH14', '여행 이야기 듣기', 0, '{}', '{"type":"draw","action":"catchup_plan"}'),
('chance', 'CH15', '좋은 정보 발견', 0, '{}', '{"type":"draw","action":"draw_plan"}'),
('chance', 'CH16', '버린만큼 뽑기', 0, '{}', '{"type":"special","action":"draw_discarded"}'),
('chance', 'CH17', '여행 팜플렛', 0, '{}', '{"type":"special","action":"select_joint_plan"}'),
-- 특수 행동 카드 (3장)
('chance', 'CH18', '체력이 넘친다!', 0, '{}', '{"type":"special","action":"extra_action"}'),
('chance', 'CH19', '반전의 기회', 0, '{}', '{"type":"special","action":"repeat_current"}'),
('chance', 'CH20', '공동 목표 지원', 0, '{}', '{"type":"special","action":"joint_plan_support"}'),
-- 캐치업 카드 (5장)
('chance', 'CH21', '엄마의 응원', 0, '{}', '{"type":"catchup","action":"catchup_money"}'),
('chance', 'CH22', '여행 선생님의 조언', 0, '{}', '{"type":"catchup","action":"catchup_plan"}'),
('chance', 'CH23', '가족 사진 대작전', 0, '{}', '{"type":"catchup","action":"catchup_memory"}'),
('chance', 'CH24', '엄마의 응원 메시지', 0, '{}', '{"type":"catchup","action":"catchup_memory"}'),
('chance', 'CH25', '동행 버디', 0, '{}', '{"type":"catchup","action":"buddy_action"}');

-- ========================================
-- 공동 계획 카드 (10장)
-- ========================================
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
SELECT type, COUNT(*) as count 
FROM cards 
GROUP BY type 
ORDER BY type;
