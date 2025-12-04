# 🔍 프론트엔드 디버그 단계

## 현재 상황
- 백엔드: ✅ 정상 작동
- 프론트엔드: ❌ localhost:3000 접속 안 됨

---

## 🚀 단계별 디버그

### 1단계: 최소 버전 테스트

**App.tsx를 최소 버전으로 변경했습니다.**

```bash
# 프론트엔드 터미널에서 Ctrl+C로 중단 후
cd frontend
npm run dev
```

**확인:**
1. 터미널에 "ready in XXX ms" 메시지 확인
2. http://localhost:3000 접속
3. "열네 밤의 꿈" 제목과 테스트 버튼 표시되는지 확인

**결과:**
- ✅ 표시됨 → 2단계로
- ❌ 여전히 안 됨 → 아래 "포트 문제" 섹션으로

---

### 2단계: 컴포넌트 하나씩 추가

**LobbyScreen만 테스트:**

`frontend/src/App.tsx` 수정:
```typescript
import './App.css';
import LobbyScreen from './components/LobbyScreen';

function App() {
  return (
    <div className="app">
      <LobbyScreen onGameStart={(r, g, p, u) => console.log('Game start', r, g, p, u)} />
    </div>
  );
}

export default App;
```

**확인:**
- ✅ 로비 화면 표시 → 3단계로
- ❌ 에러 발생 → LobbyScreen 문제

---

### 3단계: 전체 복원

**원래 App.tsx 복원:**

```bash
# App_backup.tsx 내용을 App.tsx로 복사
```

또는 수동으로:
```typescript
import { useState } from 'react';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<'lobby' | 'game'>('lobby');
  const [roomId, setRoomId] = useState<string>('');
  const [gameId, setGameId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  const handleGameStart = (roomId: string, gameId: string, playerId: string, userId: string) => {
    setRoomId(roomId);
    setGameId(gameId);
    setPlayerId(playerId);
    setUserId(userId);
    setGameState('game');
  };

  const handleBackToLobby = () => {
    setGameState('lobby');
    setRoomId('');
    setGameId('');
    setPlayerId('');
  };

  return (
    <div className="app">
      {gameState === 'lobby' ? (
        <LobbyScreen onGameStart={handleGameStart} />
      ) : (
        <GameScreen
          roomId={roomId}
          gameId={gameId}
          playerId={playerId}
          userId={userId}
          onBackToLobby={handleBackToLobby}
        />
      )}
    </div>
  );
}

export default App;
```

---

## 🔧 포트 문제 해결

### 포트 3000이 이미 사용 중인 경우

**확인:**
```bash
# Windows
netstat -ano | findstr :3000

# 프로세스 종료
taskkill /PID [PID번호] /F
```

**또는 다른 포트 사용:**

`frontend/vite.config.ts` 수정:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001, // 포트 변경
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 🐛 일반적인 에러 해결

### "Cannot find module"
```bash
cd frontend
npm install
```

### "Failed to resolve import"
**원인**: 파일 경로 문제

**확인:**
- `import LobbyScreen from './components/LobbyScreen'` (확장자 없이)
- 파일명 대소문자 정확히 일치

### "Unexpected token"
**원인**: TypeScript 설정 문제

**해결:**
```bash
cd frontend
npx tsc --noEmit
# 에러 확인 후 수정
```

---

## 📊 체크리스트

### 환경 확인
- [ ] Node.js 20 이상: `node --version`
- [ ] npm 설치됨: `npm --version`
- [ ] 백엔드 실행 중: `curl http://localhost:4000/health`

### 파일 확인
- [ ] `frontend/index.html` 존재
- [ ] `frontend/src/main.tsx` 존재
- [ ] `frontend/src/App.tsx` 존재
- [ ] `frontend/vite.config.ts` 존재
- [ ] `frontend/package.json` 존재

### 설치 확인
- [ ] `frontend/node_modules` 폴더 존재
- [ ] `npm install` 에러 없이 완료

### 실행 확인
- [ ] `npm run dev` 실행
- [ ] "ready in XXX ms" 메시지 표시
- [ ] "Local: http://localhost:3000" 표시
- [ ] 에러 메시지 없음

---

## 🔍 상세 로그 확인

### Vite 디버그 모드
```bash
cd frontend
DEBUG=vite:* npm run dev
```

### TypeScript 컴파일 확인
```bash
cd frontend
npx tsc --noEmit
```

### 브라우저 개발자 도구
1. F12 열기
2. Console 탭 확인
3. Network 탭 확인
4. 에러 메시지 복사

---

## 💡 완전 초기화

모든 방법이 실패하면:

```bash
cd frontend

# 1. 모두 삭제
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# 2. 재설치
npm install

# 3. 캐시 삭제
npm cache clean --force

# 4. 다시 설치
npm install

# 5. 실행
npm run dev
```

---

## 🎯 현재 해야 할 일

1. **프론트엔드 재시작**
   ```bash
   cd frontend
   npm run dev
   ```

2. **브라우저 접속**
   - http://localhost:3000

3. **결과 확인**
   - ✅ "열네 밤의 꿈" 제목 표시 → 성공!
   - ❌ 여전히 안 됨 → 터미널 전체 에러 메시지 복사

4. **에러 메시지 공유**
   - 터미널의 전체 출력
   - 브라우저 콘솔의 에러 (F12)

---

## 📞 추가 정보 필요

다음 정보를 공유해주세요:

1. **터미널 출력**
   ```
   npm run dev 실행 후 전체 메시지
   ```

2. **브라우저 상태**
   - 접속 시도 시 어떤 화면이 나오나요?
   - "연결할 수 없음" / "빈 화면" / "에러 메시지"

3. **포트 확인**
   ```bash
   netstat -ano | findstr :3000
   ```

4. **Node.js 버전**
   ```bash
   node --version
   npm --version
   ```
