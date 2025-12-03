# Supabase에서 AI 수정 SQL 실행하기

## 1단계: Supabase 대시보드 접속
1. https://supabase.com 접속
2. 로그인
3. 프로젝트 선택

## 2단계: SQL Editor 열기
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭

## 3단계: SQL 복사 & 실행
**`backend/src/db/EXECUTE_THIS_IN_SUPABASE.sql`** 파일을 열어서 내용을 복사한 후 붙여넣고 **Run** 버튼 클릭

또는 아래 SQL을 복사:

```sql
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
```

## 4단계: 결과 확인
- 마지막 SELECT 쿼리 결과에서 AI 플레이어의 `is_ai` 컬럼이 `true`로 표시되는지 확인
- 예시:
  ```
  id                                   | nickname      | is_ai
  -------------------------------------|---------------|-------
  xxx-xxx-xxx                          | 플레이어1     | false
  yyy-yyy-yyy                          | 똑똑한 로봇   | true
  ```

## 5단계: 백엔드 서버 재배포
Render 대시보드에서 백엔드 서비스 재배포 또는 자동 배포 대기

## 완료!
이제 AI 플레이어의 턴이 되면 자동으로 행동을 시작합니다.
