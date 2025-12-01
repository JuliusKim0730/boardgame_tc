# 🗄️ 데이터베이스 마이그레이션 가이드 v4.1

## 📋 개요
이 가이드는 v4.1 업데이트를 위한 데이터베이스 마이그레이션 절차를 안내합니다.

---

## ⚠️ 주의사항

### 백업 필수!
마이그레이션 전에 **반드시 데이터베이스를 백업**하세요.

```sql
-- Supabase Dashboard에서 백업 생성
-- Settings > Database > Backups > Create Backup
```

---

## 🚀 마이그레이션 순서

### Step 1: 스키마 마이그레이션 실행

**Supabase Dashboard → SQL Editor**

```sql
-- 1. resolve_token 타입 변경 (BOOLEAN → INT)
ALTER TABLE player_states 
ALTER COLUMN resolve_token TYPE INT 
USING (CASE WHEN resolve_token THEN 1 ELSE 0 END);

ALTER TABLE player_states 
ALTER COLUMN resolve_token SET DEFAULT 1;

-- 2. 초기 자금 기본값 변경 (2000 → 3000)
ALTER TABLE player_states 
ALTER COLUMN money SET DEFAULT 3000;

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_game_type ON event_logs(game_id, event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created ON event_logs(created_at);

-- 4. 컬럼 설명 추가
COMMENT ON COLUMN player_states.resolve_token IS '결심 토큰 개수 (0~2)';
COMMENT ON COLUMN player_states.money IS '초기 자금 3,000TC';
```

**실행 결과 확인:**
```sql
-- resolve_token 타입 확인
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'player_states' 
AND column_name IN ('resolve_token', 'money');

-- 예상 결과:
-- resolve_token | integer | 1
-- money         | integer | 3000
```

---

### Step 2: 카드 데이터 시드

**Supabase Dashboard → SQL Editor**

#### 2.1 기존 카드 삭제 (선택적)
```sql
-- 주의: 진행 중인 게임이 있다면 실행하지 마세요!
DELETE FROM cards WHERE type IN ('house', 'support', 'chance');
```

#### 2.2 집안일 카드 업데이트 (13장)
```sql
-- 집안일 카드 수익 1,500~2,000TC로 조정
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
('house', 'J13', '가족 저녁상 차리기', 0, '{"money": 2000}', '{"description": "저녁 식사 준비를 도왔다"}')
ON CONFLICT (code) DO UPDATE SET
  effects = EXCLUDED.effects,
  metadata = EXCLUDED.metadata;
```

#### 2.3 여행 지원 카드 추가 (16장)
```sql
-- 수익 카드 (8장)
INSERT INTO cards (type, code, name, cost, effects, metadata) VALUES
('support', 'Y1', '엄마의 비밀 용돈통', 0, '{"money": 2500}', '{"description": "여행 간다니까 몰래 챙겨주셨어.", "story": true}'),
('support', 'Y2', '아빠의 여행 보너스', 0, '{"money": 3000}', '{"description": "열심히 준비하는 모습에 감동!", "story": true}'),
('support', 'Y3', '할머니 봉투', 0, '{"money": 3500}', '{"description": "예쁘게 놀다 오라며 작은 봉투를…", "story": true}'),
('support', 'Y4', '부모님 특별 지원', 0, '{"money": 4000}', '{"description": "이번 여행만큼은 특별히 더!", "story": true}'),
('support', 'Y5', '여행 공모전 상금', 0, '{"money": 2500}', '{"description": "계획서를 냈더니 상을 받았다.", "story": true}'),
('support', 'Y6', '알바 팁 대박', 0, '{"money": 3000}', '{"description": "단골 손님이 여행 잘 다녀오라며.", "story": true}'),
('support', 'Y7', '주식 초보 성공!', 0, '{"money": 3500}', '{"description": "1주 사놨는데… 어? 올랐어?", "story": true}'),
('support', 'Y8', '용돈 미션 성공', 0, '{"money": 4000}', '{"description": "미션을 완수해 보상을 받았다.", "story": true}')
ON CONFLICT (code) DO NOTHING;

-- 지출 카드 (8장)
INSERT INTO cards (type, code, name, cost, effects, metadata) VALUES
('support', 'Y9', '여권 사진 다시 찍기', 0, '{"money": -1000}', '{"description": "눈 감아버렸다…", "story": true}'),
('support', 'Y10', '간식 포장지 대참사', 0, '{"money": -1000}', '{"description": "흘려서 새로 샀다…", "story": true}'),
('support', 'Y11', '수영복 사이즈 실수', 0, '{"money": -1500}', '{"description": "이건 안 맞는다.", "story": true}'),
('support', 'Y12', '충전기 잃어버림', 0, '{"money": -2000}', '{"description": "여행 전에 사고…", "story": true}'),
('support', 'Y13', '기념품 욕심', 0, '{"money": -1000}', '{"description": "너무 귀여워 참지 못했다.", "story": true}'),
('support', 'Y14', '옷 수선 비용', 0, '{"money": -1500}', '{"description": "정리하다 찢어진 걸 발견했다.", "story": true}'),
('support', 'Y15', '교통카드 중복 충전', 0, '{"money": -1500}', '{"description": "두 번 찍어버렸다!", "story": true}'),
('support', 'Y16', '급배송비 폭탄', 0, '{"money": -2000}', '{"description": "급하게 시켜서…", "story": true}')
ON CONFLICT (code) DO NOTHING;
```

#### 2.4 찬스 카드 업데이트
```sql
-- CH19 추가
INSERT INTO cards (type, code, name, cost, effects, metadata) VALUES
('chance', 'CH19', '반전의 기회', 0, '{}', '{"type": "special", "action": "repeat_current", "description": "이동 없이 현재 칸 행동 1회 추가"}')
ON CONFLICT (code) DO NOTHING;

-- 2인 전용 금지 플래그 추가
UPDATE cards 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb), 
  '{forbidden_2p}', 
  'true'::jsonb
) 
WHERE code IN ('CH11', 'CH12', 'CH13');

-- 설명 추가
UPDATE cards 
SET metadata = jsonb_set(
  metadata, 
  '{note}', 
  '"2인 플레이에서는 사용할 수 없습니다"'::jsonb
) 
WHERE code IN ('CH11', 'CH12', 'CH13');
```

---

### Step 3: 데이터 검증

```sql
-- 1. 카드 타입별 개수 확인
SELECT type, COUNT(*) as count
FROM cards
GROUP BY type
ORDER BY type;

-- 예상 결과:
-- house    | 13
-- support  | 16
-- chance   | 26 (기존 25 + CH19)

-- 2. 집안일 카드 수익 범위 확인
SELECT code, name, effects->>'money' as money
FROM cards
WHERE type = 'house'
ORDER BY code;

-- 예상: 모두 1500 또는 2000

-- 3. 여행 지원 카드 확인
SELECT code, name, effects->>'money' as money
FROM cards
WHERE type = 'support'
ORDER BY code;

-- 예상: Y1~Y8 양수, Y9~Y16 음수

-- 4. 2인 금지 카드 확인
SELECT code, name, metadata->>'forbidden_2p' as forbidden
FROM cards
WHERE metadata->>'forbidden_2p' = 'true';

-- 예상: CH11, CH12, CH13

-- 5. resolve_token 타입 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'player_states'
AND column_name = 'resolve_token';

-- 예상: integer | 1
```

---

## 🔄 롤백 절차 (문제 발생 시)

### 스키마 롤백
```sql
-- resolve_token을 BOOLEAN으로 되돌리기
ALTER TABLE player_states 
ALTER COLUMN resolve_token TYPE BOOLEAN 
USING (resolve_token > 0);

ALTER TABLE player_states 
ALTER COLUMN resolve_token SET DEFAULT TRUE;

-- money 기본값 되돌리기
ALTER TABLE player_states 
ALTER COLUMN money SET DEFAULT 2000;

-- 인덱스 삭제
DROP INDEX IF EXISTS idx_event_logs_game_type;
DROP INDEX IF EXISTS idx_event_logs_created;
```

### 카드 데이터 롤백
```sql
-- 새로 추가된 카드 삭제
DELETE FROM cards WHERE code IN ('Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8',
                                  'Y9', 'Y10', 'Y11', 'Y12', 'Y13', 'Y14', 'Y15', 'Y16',
                                  'CH19');

-- 2인 금지 플래그 제거
UPDATE cards 
SET metadata = metadata - 'forbidden_2p' - 'note'
WHERE code IN ('CH11', 'CH12', 'CH13');
```

---

## ✅ 마이그레이션 체크리스트

### 사전 준비
- [ ] 데이터베이스 백업 완료
- [ ] 진행 중인 게임 없음 확인
- [ ] Supabase Dashboard 접속 확인

### 마이그레이션 실행
- [ ] Step 1: 스키마 마이그레이션 실행
- [ ] Step 2.1: 기존 카드 삭제 (선택)
- [ ] Step 2.2: 집안일 카드 업데이트
- [ ] Step 2.3: 여행 지원 카드 추가
- [ ] Step 2.4: 찬스 카드 업데이트
- [ ] Step 3: 데이터 검증

### 사후 확인
- [ ] 백엔드 재시작
- [ ] 프론트엔드 재시작
- [ ] 테스트 게임 생성
- [ ] 초기 자금 3,000TC 확인
- [ ] 카드 드로우 정상 작동 확인

---

## 🐛 문제 해결

### 문제 1: resolve_token 타입 변경 실패
**증상**: "cannot cast type boolean to integer"

**해결**:
```sql
-- 명시적 변환 사용
ALTER TABLE player_states 
ALTER COLUMN resolve_token TYPE INT 
USING (CASE WHEN resolve_token = TRUE THEN 1 ELSE 0 END);
```

### 문제 2: 카드 중복 키 오류
**증상**: "duplicate key value violates unique constraint"

**해결**:
```sql
-- ON CONFLICT 사용
INSERT INTO cards (...) VALUES (...)
ON CONFLICT (code) DO UPDATE SET
  effects = EXCLUDED.effects,
  metadata = EXCLUDED.metadata;
```

### 문제 3: 기존 게임 데이터 충돌
**증상**: 진행 중인 게임에서 오류 발생

**해결**:
1. 모든 게임 종료 대기
2. 또는 기존 게임 데이터 마이그레이션:
```sql
-- 기존 player_states의 resolve_token 업데이트
UPDATE player_states 
SET resolve_token = 1 
WHERE resolve_token IS NULL OR resolve_token = 0;
```

---

## 📞 지원

문제가 지속되면:
1. 롤백 절차 실행
2. 백업에서 복원
3. 개발 로그 확인
4. 이슈 리포트 작성

---

## 🎉 마이그레이션 완료 후

다음 명령어로 서버를 재시작하세요:

```bash
# 백엔드
cd backend
npm run dev

# 프론트엔드
cd frontend
npm run dev
```

**축하합니다! v4.1 마이그레이션이 완료되었습니다! 🎮**
