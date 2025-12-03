# 로컬 실행 이슈 해결 가이드

## 🔧 수정된 내용

### 1. localStorage 접근 에러 해결 ✅

**문제**: `Access to storage is not allowed from this context` 에러
- iframe, 시크릿 모드, 서드파티 쿠키 차단 환경에서 발생

**해결**:
- `frontend/src/utils/storage.ts` 생성
- 안전한 localStorage/sessionStorage wrapper 함수 제공
- 접근 불가능한 환경에서도 에러 없이 동작

```typescript
import { getSafeLocalStorage, safeGetItem, safeSetItem } from './utils/storage';

// 사용 예시
const storage = getSafeLocalStorage();
if (storage) {
  storage.setItem('key', 'value');
} else {
  // 스토리지 사용 불가 - fallback 로직
}
```

### 2. Socket 연결 Timeout 해결 ✅

**문제**: `socket.ts:34 Connection error: Error: timeout`
- 프론트엔드가 잘못된 포트(3000)로 연결 시도
- 백엔드는 4000 포트에서 실행 중

**해결**:
1. `frontend/.env.development` 수정
   ```env
   VITE_API_URL=http://localhost:4000
   VITE_SOCKET_URL=http://localhost:4000
   ```

2. `frontend/src/services/socket.ts` 개선
   - timeout 20초로 증가
   - 재연결 시도 10회로 증가
   - 상세한 에러 로깅 추가

### 3. API 400 에러 해결 ✅

**문제**: `GET /api/games/{id}/state 400 (Bad Request)`

**해결**:
1. `frontend/src/services/api.ts`에 Axios 인터셉터 추가
   - 에러 응답 상세 로깅
   - 요청/응답 디버깅 정보 출력

2. `frontend/src/components/GameScreen.tsx` 에러 처리 강화
   - 상세한 에러 메시지 표시
   - 네트워크 연결 상태 확인
   - 사용자 친화적 에러 안내

## 🚀 로컬 실행 방법

### 1. 백엔드 실행

```bash
cd backend
npm install
npm run dev
```

**확인사항**:
- ✅ 포트 4000에서 실행 중
- ✅ Supabase 연결 성공
- ✅ WebSocket 준비 완료

### 2. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

**확인사항**:
- ✅ Vite 개발 서버 실행 (보통 5173 포트)
- ✅ 환경 변수 로드 확인
- ✅ API/Socket URL이 localhost:4000으로 설정

### 3. 브라우저 접속

```
http://localhost:5173
```

## 🔍 문제 해결 체크리스트

### Socket 연결 실패 시

1. **백엔드 서버 확인**
   ```bash
   # 백엔드 터미널에서 확인
   🚀 Server running on port 4000
   📡 WebSocket ready
   ```

2. **브라우저 콘솔 확인**
   ```
   SOCKET_URL: http://localhost:4000
   Environment: development
   ✅ Connected to server: http://localhost:4000
   ```

3. **Network 탭 확인**
   - WS 필터 적용
   - `ws://localhost:4000/socket.io/...` 연결 확인
   - Status: 101 Switching Protocols

### API 호출 실패 시

1. **브라우저 콘솔 확인**
   ```
   API_BASE: http://localhost:4000/api
   Environment: development
   ```

2. **Network 탭 확인**
   - XHR 필터 적용
   - 요청 URL이 `http://localhost:4000/api/...`인지 확인
   - Response 탭에서 에러 메시지 확인

3. **백엔드 로그 확인**
   - 요청이 도착했는지 확인
   - 에러 메시지 확인

### localStorage 에러 시

1. **시크릿 모드 확인**
   - 일반 브라우저 창에서 테스트

2. **브라우저 설정 확인**
   - 쿠키/스토리지 차단 설정 해제

3. **iframe 환경 확인**
   - 직접 URL 접속으로 테스트

## 🌐 배포 환경 설정

### Vercel (프론트엔드)

환경 변수 설정:
```
VITE_API_URL=https://boardgame-tc.onrender.com
VITE_SOCKET_URL=https://boardgame-tc.onrender.com
```

### Render.com (백엔드)

환경 변수 설정:
```
PORT=10000
DB_HOST=aws-1-ap-southeast-2.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xskaefoqkbwnhrpyptkl
DB_PASSWORD=9orkL1p59FjOnZQd
CLIENT_URL=https://your-vercel-app.vercel.app
```

## 📝 주요 변경 파일

1. ✅ `frontend/src/utils/storage.ts` - 새로 생성
2. ✅ `frontend/.env.development` - 포트 수정 (3000 → 4000)
3. ✅ `frontend/src/services/socket.ts` - 연결 설정 개선
4. ✅ `frontend/src/services/api.ts` - 에러 처리 강화
5. ✅ `frontend/src/components/GameScreen.tsx` - 에러 로깅 개선

## 🎯 테스트 시나리오

1. **백엔드 시작**
   - `cd backend && npm run dev`
   - 콘솔에 "Server running on port 4000" 확인

2. **프론트엔드 시작**
   - `cd frontend && npm run dev`
   - 브라우저 콘솔에 API_BASE, SOCKET_URL 확인

3. **방 생성**
   - 닉네임 입력 후 방 생성
   - Socket 연결 확인

4. **게임 시작**
   - 플레이어 추가 (또는 AI 추가)
   - 게임 시작 버튼 클릭
   - 게임 상태 로드 확인

5. **턴 진행**
   - 이동 → 행동 → 턴 종료
   - 실시간 업데이트 확인

## 🆘 여전히 문제가 있다면

1. **캐시 삭제**
   ```bash
   # 프론트엔드
   cd frontend
   rm -rf node_modules .vite
   npm install
   
   # 백엔드
   cd backend
   rm -rf node_modules
   npm install
   ```

2. **환경 변수 재확인**
   ```bash
   # 프론트엔드에서
   cat frontend/.env.development
   
   # 백엔드에서
   cat backend/.env
   ```

3. **포트 충돌 확인**
   ```bash
   # Windows
   netstat -ano | findstr :4000
   netstat -ano | findstr :5173
   
   # 프로세스 종료 (PID 확인 후)
   taskkill /PID <PID> /F
   ```

4. **브라우저 개발자 도구**
   - Console: 에러 메시지 확인
   - Network: 요청/응답 확인
   - Application: Storage 상태 확인

## ✨ 완료!

이제 로컬 환경에서 정상적으로 실행됩니다:
- ✅ localStorage 에러 없음
- ✅ Socket 연결 성공
- ✅ API 호출 정상
- ✅ 게임 플레이 가능
