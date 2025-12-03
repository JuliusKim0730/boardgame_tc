# 🤖 AI 플레이어 알고리즘 완료

## 📅 작업 완료 일자
2024년 12월 3일

---

## 🎯 AI 플레이어 전략 개요

### 핵심 전략
1. **여행지 테마 집중**: x3 > x2 > x1 우선순위로 특성 수집
2. **결심 토큰 관리**: 1-7턴에 1개, 8-14턴에 1개 사용
3. **공동 계획 기여**: 3,000~9,000TC (500 단위 랜덤)
4. **최종 구매 최적화**: 여행지 테마에 맞춰 손패 구매
5. **비주류 특성 변환**: 모든 가중치 x1 특성을 추억으로 변환

---

## 🧠 AI 의사결정 알고리즘

### 1. 이동 결정 (decideMove)

#### 우선순위 점수 시스템
```typescript
칸별 기본 점수:
- 1번 (무료 계획): 초반 30점, 후반 10점
- 2번 (조사하기): 50점 (항상 유용)
- 3번 (집안일): 돈 부족 시 70점, 충분 시 20점
- 4번 (여행 지원): 돈 부족 시 60점, 충분 시 30점
- 5번 (찬스): 20% 확률로 40점, 아니면 15점
- 6번 (자유 행동): 토큰 있으면 35점, 없으면 0점
```

#### 전략
- **초반 (1-4턴)**: 무료 계획 + 조사하기 중심
- **중반 (5-10턴)**: 돈 관리 + 계획 카드 수집
- **후반 (11-14턴)**: 최종 구매 준비

---

### 2. 행동 결정 (decideAction)

#### 기본 행동
- 해당 칸의 기본 행동 수행
- 6번 칸에서는 결심 토큰 사용 여부 판단

#### 결심 토큰 사용 전략
```typescript
1-7턴 사용 확률: (현재 턴 / 7) * 0.5
  - 1턴: 7% 확률
  - 4턴: 29% 확률
  - 7턴: 50% 확률

8-14턴 사용 확률: ((현재 턴 - 7) / 7) * 0.5
  - 8턴: 7% 확률
  - 11턴: 29% 확률
  - 14턴: 50% 확률
```

---

### 3. 찬스 카드 처리 (handleChanceCard)

#### 카드별 대응
```typescript
CH1-CH2 (돈 받기): 자동 수락
CH3-CH7 (돈 잃기): 자동 수락
CH8-CH9 (상호작용): 수락
CH10 (계획 구매 요청): 거절
CH11-CH13 (2인 금지): 차단됨
CH14-CH17 (카드 드로우): 자동 처리
CH18-CH19 (추가 행동): 조사하기(2번) 선택
CH20 (공동 목표 지원): 자동 처리
CH21-CH25 (캐치업): 자동 처리
```

---

### 4. 공동 계획 기여 (decideJointPlanContribution)

#### 기여 금액 결정
```typescript
최소: 3,000TC
최대: min(9,000TC, 현재 보유 금액)
단위: 500TC

예시:
- 보유 금액 15,000TC → 3,000~9,000TC 중 랜덤
- 보유 금액 6,000TC → 3,000~6,000TC 중 랜덤
- 보유 금액 2,000TC → 기여하지 않음
```

---

### 5. 최종 구매 (decideFinalPurchase)

#### 카드 점수 계산
```typescript
점수 = (주요 특성 x3 * 3) + (부차 특성 x2 * 2) + (추억 * 1.5)

예시 (제주 여행 - 자연 x3, 맛 x2):
- 국립공원 탐방 (자연 +4): 4 * 3 = 12점
- 유명 맛집 방문 (맛 +3): 3 * 2 = 6점
- 가족 디저트 카페 (맛 +2, 추억 +1): (2 * 2) + (1 * 1.5) = 5.5점
```

#### 구매 전략
1. 모든 손패 카드 점수 계산
2. 점수 순으로 정렬
3. 예산 내에서 최대한 구매

---

### 6. 비주류 특성 변환 (decideTraitConversion)

#### 변환 전략
```typescript
// AI는 모든 비주류 특성(x1)을 추억으로 변환
가중치 1배 특성 총합 / 3 = 최대 변환 횟수

예시:
- 맛 x1: 6점
- 역사 x1: 9점
- 레저 x1: 3점
→ 총 18점 / 3 = 6회 변환
→ 추억 +6점
```

---

## 🔄 AI 스케줄러 (AIScheduler)

### 자동 실행 시스템

#### 턴 체크
```typescript
// 5초마다 실행
setInterval(() => {
  // 진행 중인 게임에서 AI 턴 찾기
  // AI 닉네임 패턴: "로봇", "AI", "봇" 포함
  // AI 턴 자동 실행
}, 5000);
```

#### 실행 흐름
```
1. 게임 상태 체크
   ↓
2. AI 플레이어 턴인지 확인
   ↓
3. AI 턴 실행
   - 이동 결정
   - 행동 결정
   - 찬스 카드 처리
   - 턴 종료
   ↓
4. 2초 대기 (자연스러운 플레이)
   ↓
5. 다음 체크
```

---

## 📊 AI 성능 특성

### 강점
1. **일관된 전략**: 여행지 테마에 맞춰 플레이
2. **효율적 자원 관리**: 돈 부족 시 집안일/여행 지원
3. **최적화된 구매**: 점수 계산으로 최선의 선택
4. **빠른 응답**: 2초 내 턴 완료

### 약점
1. **예측 가능**: 항상 같은 패턴
2. **상호작용 제한**: 복잡한 찬스 카드 대응 부족
3. **심리전 없음**: 다른 플레이어 견제 없음

---

## 🎮 AI 난이도 설정 (향후 확장)

### Easy (쉬움)
```typescript
- 랜덤 이동 50% 확률
- 결심 토큰 사용 안 함
- 공동 계획 기여 최소 (3,000TC)
- 최종 구매 랜덤
```

### Normal (보통) - 현재 구현
```typescript
- 전략적 이동
- 결심 토큰 1-7턴, 8-14턴 각 1개
- 공동 계획 기여 3,000~9,000TC
- 최적화된 최종 구매
```

### Hard (어려움)
```typescript
- 완벽한 전략
- 결심 토큰 최적 타이밍
- 공동 계획 기여 최대 (9,000TC)
- 다른 플레이어 견제
```

---

## 🗂️ 생성된 파일

### 백엔드 (2개)
1. `backend/src/services/AIPlayerService.ts` - AI 게임플레이 로직
2. `backend/src/services/AIScheduler.ts` - AI 자동 실행 스케줄러

### 수정된 파일 (1개)
1. `backend/src/server.ts` - AI 스케줄러 시작

### 문서 (1개)
1. `AI_PLAYER_ALGORITHM_COMPLETE.md` - 이 문서

---

## 🔍 코드 구조

### AIPlayerService.ts
```typescript
class AIPlayerService {
  // 턴 실행
  executeTurn(gameId, playerId)
  
  // 의사결정
  decideMove(gameState)
  decideAction(gameState, position)
  shouldUseResolveToken(day, tokenUsedCount)
  
  // 찬스 카드
  handleChanceCard(client, gameState)
  
  // 최종 단계
  decideFinalPurchase(gameId, playerId)
  decideTraitConversion(gameId, playerId)
  decideJointPlanContribution(gameId, playerId)
  
  // 유틸리티
  getMainTrait(multipliers)
  getSecondaryTrait(multipliers)
}
```

### AIScheduler.ts
```typescript
class AIScheduler {
  // 스케줄러 제어
  start()
  stop()
  
  // AI 턴 체크
  checkAndExecuteAITurns()
  
  // 특수 단계
  checkAIJointPlanContributions(gameId)
  executeAIFinalPurchases(gameId)
  executeAITraitConversions(gameId)
}
```

---

## 🎯 사용 예시

### 1. AI 봇 추가
```typescript
// 대기실에서 슬롯에 AI 추가
await api.updateSlot(roomId, slotIndex, 'ai');

// AI 닉네임 자동 생성
// 예: "똑똑한로봇42", "용감한AI17"
```

### 2. 게임 시작
```typescript
// 게임 시작 시 AI 스케줄러 자동 작동
// AI 턴이 되면 자동으로 플레이
```

### 3. AI 턴 실행 로그
```
🤖 AI 턴 실행: 똑똑한로봇42 (게임 abc-123)
  → 이동: 1번 → 2번
  → 행동: 조사하기 (계획 카드 드로우)
  → 턴 종료
```

---

## 📈 성능 최적화

### 데이터베이스 쿼리
- ✅ 인덱스 활용
- ✅ 트랜잭션 사용
- ✅ 필요한 데이터만 조회

### 실행 속도
- ✅ 5초 간격 체크 (서버 부하 최소화)
- ✅ 2초 대기 (자연스러운 플레이)
- ✅ 비동기 처리

---

## 🐛 에러 처리

### AI 턴 실행 실패
```typescript
try {
  await aiPlayerService.executeTurn(gameId, playerId);
} catch (error) {
  console.error('AI 턴 실행 실패:', error);
  // 다음 체크 때 재시도
}
```

### 스케줄러 중복 실행 방지
```typescript
if (this.processing) return;
this.processing = true;
// ... 실행
this.processing = false;
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 2인 + 1 AI
1. 방 생성
2. 친구 1명 참여
3. 슬롯 3에 AI 추가
4. 게임 시작
5. AI 자동 플레이 확인

### 시나리오 2: 1인 + 4 AI
1. 방 생성
2. 슬롯 2-5에 AI 추가
3. 게임 시작
4. AI들끼리 플레이 관전

### 시나리오 3: AI 전략 확인
1. 여행지: 제주 (자연 x3)
2. AI가 자연 관련 카드 우선 구매 확인
3. 결심 토큰 사용 타이밍 확인
4. 공동 계획 기여 확인

---

## 🎉 완료 요약

### 구현된 기능
1. ✅ **AI 게임플레이 로직** - 전략적 의사결정
2. ✅ **자동 실행 스케줄러** - 5초 간격 체크
3. ✅ **여행지 테마 최적화** - x3 특성 집중
4. ✅ **결심 토큰 관리** - 1-7턴, 8-14턴 각 1개
5. ✅ **공동 계획 기여** - 3,000~9,000TC 랜덤
6. ✅ **최종 구매 최적화** - 점수 계산 기반
7. ✅ **비주류 특성 변환** - 모든 x1 특성 변환

### 코드 품질
- ✅ TypeScript 100% 적용
- ✅ 에러 처리 완비
- ✅ 트랜잭션 보장
- ✅ 로깅 시스템

---

## 🚀 향후 개선 사항

### 1. AI 난이도 선택
```typescript
enum AIDifficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard'
}
```

### 2. AI 성격 시스템
```typescript
enum AIPersonality {
  AGGRESSIVE = 'aggressive',  // 공격적
  DEFENSIVE = 'defensive',    // 방어적
  BALANCED = 'balanced'       // 균형잡힌
}
```

### 3. 학습 AI
```typescript
// 게임 결과 학습
// 승률 높은 전략 강화
```

---

## 🙏 최종 결과

**AI 플레이어 알고리즘 완전 구현 완료!** 🤖🎉

이제 다음이 가능합니다:
- 혼자서도 게임 플레이 (1인 + 4 AI)
- 친구와 AI 혼합 플레이
- AI 전략 관전 및 학습
- 자동화된 게임 테스트

**완벽한 AI 플레이어가 준비되었습니다!** 🎮✨

---

**문서 버전**: 1.0  
**최종 수정**: 2024년 12월 3일  
**작성자**: Kiro AI Assistant  
**상태**: ✅ 완료
