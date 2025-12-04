# 이동 실패 에러 디버깅 가이드

## 📅 작성 날짜
2024-12-03

## 🐛 문제 증상
- 게임판에서 칸을 클릭했을 때 "이동 실패" 메시지 표시
- 플레이어가 이동할 수 없어 게임 진행 불가

## 🔍 추가된 디버깅 로그

### 1. 프론트엔드 (GameScreen.tsx)

#### handleMove 함수
```typescript
console.log('=== handleMove 호출 ===');
console.log('position:', position);
console.log('isMyTurn:', gameState.currentTurnPlayerId === playerId);
console.log('hasMoved:', hasMoved);
console.log('API 파라미터:', { gameId, playerId, position });
console.log('이동 API 응답:', response);
```

#### 에러 처리
```typescript
console.error('=== 이동 실패 상세 ===');
console.error('에러 객체:', error);
console.error('에러 응답:', error.response);
console.error('에러 데이터:', error.response?.data);
console.error('표시할 에러 메시지:', errorMessage);
```

### 2. 프론트엔드 (GameBoard.tsx)

#### 칸 클릭 이벤트
```typescript
console.log('=== 칸 클릭 ===');
console.log('클릭한 칸:', pos.id, pos.name);
console.log('클릭 가능 여부:', canClick);
console.log('disabled:', disabled);
console.log('isAdjacent:', isAdjacent);
```

### 3. 백엔드 (TurnService.ts)

#### move 함수
```typescript
console.log('=== TurnService.move 호출 ===');
console.log('gameId:', gameId);
console.log('playerId:', playerId);
console.log('targetPosition:', targetPosition);
console.log('현재 위치:', currentPosition);
console.log('이전 위치:', lastPosition);
console.log('목표 위치:', targetPosition);
console.log('인접 칸 목록:', adjacentPositions);
```

## 🔧 디버깅 절차

### 1단계: 브라우저 콘솔 확인

게임판에서 칸을 클릭했을 때 다음 로그를 확인하세요:

```
=== 칸 클릭 ===
클릭한 칸: 2 조사하기
클릭 가능 여부: true
disabled: false
isAdjacent: true
onPositionClick 호출: 2

=== handleMove 호출 ===
position: 2
isMyTurn: true
hasMoved: false
이동 API 호출 중...
API 파라미터: { gameId: "...", playerId: "...", position: 2 }
```

### 2단계: 백엔드 로그 확인

터미널에서 백엔드 로그를 확인하세요:

```
=== TurnService.move 호출 ===
gameId: ...
playerId: ...
targetPosition: 2
턴 검증 통과
현재 위치: 1
이전 위치: null
목표 위치: 2
인접 칸 목록: [ 2, 3 ]
위치 업데이트 완료
이동 처리 완료
```

### 3단계: 에러 발생 시 확인 사항

#### 에러 유형별 원인

1. **"당신의 턴이 아닙니다"**
   - 원인: `gameState.currentTurnPlayerId !== playerId`
   - 확인: 콘솔에서 `isMyTurn` 값 확인
   - 해결: 턴 순서 확인, 게임 상태 새로고침

2. **"이미 이동했습니다"**
   - 원인: `hasMoved === true`
   - 확인: 콘솔에서 `hasMoved` 값 확인
   - 해결: 행동 완료 후 턴 종료 대기

3. **"같은 칸을 연속으로 사용할 수 없습니다"**
   - 원인: `targetPosition === lastPosition`
   - 확인: 백엔드 로그에서 `이전 위치` 확인
   - 해결: 다른 칸 선택

4. **"인접한 칸으로만 이동할 수 있습니다"**
   - 원인: `!adjacentPositions.includes(targetPosition)`
   - 확인: 백엔드 로그에서 `인접 칸 목록` 확인
   - 해결: 인접한 칸만 선택

5. **"플레이어 상태를 찾을 수 없습니다"**
   - 원인: 데이터베이스에 플레이어 상태 없음
   - 확인: 백엔드 로그 확인
   - 해결: 게임 재시작 또는 데이터베이스 확인

6. **턴 검증 실패**
   - 원인: `turnManager.validateTurn()` 실패
   - 확인: 백엔드 로그에서 "턴 검증 실패" 메시지
   - 해결: 턴 매니저 상태 확인

## 📊 정상 동작 시 로그 흐름

### 프론트엔드
```
1. GameBoard 렌더링: { currentPosition: 1, adjacent: [2, 3], disabled: false }
2. 칸 클릭: 클릭한 칸: 2, 클릭 가능 여부: true
3. handleMove 호출: position: 2, isMyTurn: true, hasMoved: false
4. 이동 API 호출 중...
5. 이동 완료, hasMoved를 true로 설정
6. 게임 상태 로드: preserveActionState: true
7. 행동 버튼 렌더링 조건: isMyTurn: true, hasMoved: true, hasActed: false
```

### 백엔드
```
1. TurnService.move 호출
2. 턴 검증 통과
3. 현재 위치: 1, 목표 위치: 2
4. 인접 칸 목록: [2, 3]
5. 위치 업데이트 완료
6. 이동 처리 완료
```

## 🛠️ 문제 해결 방법

### 문제 1: 칸 클릭이 작동하지 않음
**증상**: 칸을 클릭해도 아무 반응 없음

**확인 사항**:
- 브라우저 콘솔에 "칸 클릭" 로그가 나타나는지 확인
- `클릭 가능 여부: false`인 경우 원인 확인
  - `disabled: true` → 내 턴이 아니거나 이미 이동함
  - `isAdjacent: false` → 인접하지 않은 칸

**해결 방법**:
1. 내 턴인지 확인 (메시지 바에 "당신의 턴입니다!" 표시)
2. 아직 이동하지 않았는지 확인 (턴 상태: "🎯 이동 필요")
3. 인접한 칸(밝게 표시된 칸)만 클릭

### 문제 2: API 호출은 되지만 에러 발생
**증상**: "이동 API 호출 중..." 로그 후 에러 메시지

**확인 사항**:
- 브라우저 콘솔에서 "이동 실패 상세" 로그 확인
- 백엔드 터미널에서 에러 로그 확인

**해결 방법**:
1. 에러 메시지 확인하여 원인 파악
2. 백엔드 로그에서 어느 단계에서 실패했는지 확인
3. 필요시 게임 상태 새로고침 (F5)

### 문제 3: 이동은 되지만 행동 버튼이 표시되지 않음
**증상**: 이동 완료 메시지는 나오지만 행동 선택 버튼 없음

**확인 사항**:
- 브라우저 콘솔에서 "행동 버튼 렌더링 조건" 로그 확인
- `hasMoved: true`, `hasActed: false` 확인

**해결 방법**:
1. `hasMoved`가 `false`인 경우: 상태 동기화 문제, 페이지 새로고침
2. `hasActed`가 `true`인 경우: 이미 행동 완료, 턴 종료 대기

## 📝 체크리스트

이동 실패 시 다음 항목을 순서대로 확인하세요:

- [ ] 브라우저 콘솔 열기 (F12)
- [ ] 백엔드 터미널 확인
- [ ] 내 턴인지 확인 (메시지 바)
- [ ] 아직 이동하지 않았는지 확인 (턴 상태)
- [ ] 인접한 칸을 클릭했는지 확인 (밝게 표시)
- [ ] 브라우저 콘솔에서 "칸 클릭" 로그 확인
- [ ] 브라우저 콘솔에서 "handleMove 호출" 로그 확인
- [ ] 백엔드 터미널에서 "TurnService.move 호출" 로그 확인
- [ ] 에러 메시지 확인 및 원인 파악
- [ ] 필요시 페이지 새로고침 (F5)

## 🚀 다음 단계

1. 실제 게임 플레이하면서 로그 확인
2. 발견된 에러 패턴 문서화
3. 자주 발생하는 에러에 대한 사용자 친화적 메시지 추가
4. 프로덕션 배포 전 디버깅 로그 제거 또는 조건부 활성화

## 💡 팁

- 개발 중에는 브라우저 콘솔과 백엔드 터미널을 항상 열어두세요
- 에러 발생 시 전체 로그를 캡처하여 분석하세요
- 게임 상태가 이상한 경우 페이지 새로고침으로 해결될 수 있습니다
- 데이터베이스 상태 확인이 필요한 경우 Supabase 대시보드 사용

## 🔗 관련 파일

- `frontend/src/components/GameScreen.tsx` - 이동 처리 로직
- `frontend/src/components/GameBoard.tsx` - 게임판 UI 및 클릭 이벤트
- `backend/src/services/TurnService.ts` - 이동 검증 및 처리
- `backend/src/services/TurnManager.ts` - 턴 관리
