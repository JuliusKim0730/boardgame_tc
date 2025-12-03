# JSON 파싱 안전성 업데이트

## 📅 업데이트 날짜
2024-12-03

## 🎯 목적

모든 카드 효과(effects) 파싱에서 JSON 파싱 에러를 방지하고 안전하게 처리합니다.

## 🔧 추가된 기능

### 안전한 JSON 파싱 헬퍼 함수

```typescript
// 안전한 JSON 파싱 헬퍼 함수
private safeParseJSON(data: any, fieldName: string = 'data'): any {
  if (!data) {
    console.log(`${fieldName}이(가) null 또는 undefined입니다`);
    return {};
  }

  if (typeof data === 'object') {
    console.log(`${fieldName}은(는) 이미 객체입니다`);
    return data;
  }

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      console.log(`${fieldName} 파싱 성공`);
      return parsed;
    } catch (error) {
      console.error(`${fieldName} 파싱 실패:`, error);
      console.error(`원본 데이터:`, data);
      return {};
    }
  }

  console.warn(`${fieldName}의 타입이 예상과 다릅니다:`, typeof data);
  return {};
}
```

### 기능 설명

1. **null/undefined 체크**: 데이터가 없으면 빈 객체 반환
2. **타입 체크**: 이미 객체면 그대로 반환
3. **문자열 파싱**: JSON.parse 시도, 실패 시 빈 객체 반환
4. **에러 로깅**: 파싱 실패 시 상세 로그 출력
5. **기본값 반환**: 모든 경우에 안전한 기본값 제공

## 📊 적용된 카드 타입

### 1. 집안일 카드 (house)

**수정 전:**
```typescript
const houseEffects = typeof result.card.effects === 'string' 
  ? JSON.parse(result.card.effects) 
  : result.card.effects;
```

**수정 후:**
```typescript
const houseEffects = this.safeParseJSON(result.card.effects, 'house.effects');

const houseMoney = houseEffects.money || 0;
const houseMemory = houseEffects.memory || 0;

console.log('집안일 효과:', { money: houseMoney, memory: houseMemory });
```

**효과:**
- 돈 획득 (money)
- 추억 점수 획득 (memory)

### 2. 여행 지원 카드 (support)

**수정 전:**
```typescript
const supportEffects = typeof result.card.effects === 'string' 
  ? JSON.parse(result.card.effects) 
  : result.card.effects;
```

**수정 후:**
```typescript
const supportEffects = this.safeParseJSON(result.card.effects, 'support.effects');

const supportMoney = supportEffects.money || 0;

console.log('여행 지원 효과:', { money: supportMoney });
```

**효과:**
- 돈 증감 (money: 양수 또는 음수)

### 3. 무료 계획 카드 (freeplan)

- effects 파싱 불필요 (손패에만 추가)

### 4. 조사하기 카드 (plan)

- effects 파싱 불필요 (손패에만 추가)

### 5. 찬스 카드 (chance)

- effects 파싱은 ChanceService에서 처리
- TurnService에서는 카드 뽑기만 수행

### 6. 공동 계획 카드 (joint)

- 프론트엔드에서 안전하게 파싱 (이미 적용됨)

## 🔍 에러 처리 흐름

### 정상 케이스
```
카드 뽑기
  ↓
effects 필드 확인
  ↓
safeParseJSON 호출
  ↓
타입 체크 (객체/문자열)
  ↓
파싱 성공
  ↓
효과 적용
```

### 에러 케이스
```
카드 뽑기
  ↓
effects 필드 확인
  ↓
safeParseJSON 호출
  ↓
파싱 실패 (JSON 형식 오류)
  ↓
에러 로그 출력
  ↓
빈 객체 {} 반환
  ↓
기본값 사용 (money: 0, memory: 0)
  ↓
게임 계속 진행
```

## 📝 로그 출력 예시

### 성공 케이스
```
집안일 행동 시작
playerState.id: abc-123
=== drawCard 호출 ===
deckType: house
덱 카드 수: 10
뽑은 카드 ID: card-456
카드 정보: { id: 'card-456', name: '청소 돕기', type: 'house' }
house.effects은(는) 이미 객체입니다
집안일 효과: { money: 1500, memory: 0 }
```

### 파싱 실패 케이스
```
집안일 행동 시작
playerState.id: abc-123
=== drawCard 호출 ===
deckType: house
뽑은 카드 ID: card-456
house.effects 파싱 실패: SyntaxError: Unexpected token
원본 데이터: {invalid json}
집안일 효과: { money: 0, memory: 0 }
집안일 완료! +0TC
```

## ✅ 안전성 보장

### 1. 파싱 실패 시에도 게임 진행
- 빈 객체 반환으로 기본값 사용
- 게임이 중단되지 않음

### 2. 상세한 에러 로깅
- 어떤 필드에서 실패했는지 명확히 표시
- 원본 데이터 출력으로 디버깅 용이

### 3. 타입 안전성
- 모든 경우에 객체 반환 보장
- undefined/null 체크

### 4. 기본값 제공
```typescript
const money = effects.money || 0;
const memory = effects.memory || 0;
```

## 🧪 테스트 시나리오

### 1. 정상 데이터
```json
{
  "money": 1500,
  "memory": 2
}
```
**결과**: 정상 파싱 및 효과 적용

### 2. 문자열 데이터
```json
"{\"money\": 1500, \"memory\": 2}"
```
**결과**: JSON.parse 후 정상 적용

### 3. 잘못된 JSON
```
{invalid json}
```
**결과**: 빈 객체 반환, 기본값 사용

### 4. null/undefined
```
null
```
**결과**: 빈 객체 반환, 기본값 사용

### 5. 빈 객체
```json
{}
```
**결과**: 그대로 사용, 기본값 적용

## 📊 프론트엔드 안전성

### GameScreen.tsx - 공동 계획 카드

```typescript
{(() => {
  try {
    let effects = jointPlanCard.effects;
    
    // 문자열인 경우 파싱 시도
    if (typeof effects === 'string') {
      try {
        effects = JSON.parse(effects);
      } catch (e) {
        console.error('effects 파싱 실패:', e);
        return null;
      }
    }
    
    // effects가 객체이고 비어있지 않은 경우에만 표시
    if (effects && typeof effects === 'object' && Object.keys(effects).length > 0) {
      return (
        <div className="joint-card-effects">
          {/* 효과 표시 */}
        </div>
      );
    }
  } catch (error) {
    console.error('공동 계획 효과 렌더링 오류:', error);
  }
  return null;
})()}
```

**특징:**
- 이중 try-catch 구조
- 타입 검증
- 파싱 실패 시 null 반환 (UI 미표시)

## 🎯 결론

### 적용 범위
- ✅ 백엔드: TurnService의 모든 카드 효과 파싱
- ✅ 프론트엔드: 공동 계획 카드 효과 표시
- ✅ 에러 처리: 모든 파싱 지점에 안전장치

### 효과
- 🛡️ JSON 파싱 에러로 인한 게임 중단 방지
- 📊 상세한 에러 로깅으로 디버깅 용이
- 🎮 사용자 경험 개선 (에러 시에도 게임 계속)
- 🔧 유지보수성 향상 (일관된 에러 처리)

### 다음 단계
1. 실제 게임 플레이 테스트
2. 에러 로그 모니터링
3. 필요시 추가 안전장치 적용
4. 프로덕션 배포 전 로그 레벨 조정

## 📝 참고사항

- 모든 카드 효과 파싱은 `safeParseJSON` 함수 사용
- 파싱 실패 시 빈 객체 반환으로 기본값 사용
- 에러 발생 시에도 게임 진행 보장
- 상세한 로그로 문제 추적 가능
