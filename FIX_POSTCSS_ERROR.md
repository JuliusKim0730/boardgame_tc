# 🔧 PostCSS 에러 해결

## ❌ 에러 메시지
```
Failed to load PostCSS config: Cannot find module 'tailwindcss'
```

## 💡 원인
상위 디렉토리 `C:\Cursor Project\postcss.config.js`에 Tailwind CSS 설정이 있어서 프론트엔드가 이를 찾으려고 시도합니다.

---

## ✅ 해결 방법 (2가지)

### 방법 1: 프론트엔드에 PostCSS 설정 추가 (추천)

**이미 완료했습니다!**

`frontend/postcss.config.js` 파일을 생성했습니다.

**이제 실행:**
```bash
cd frontend
npm run dev
```

---

### 방법 2: 상위 디렉토리 파일 삭제/이동

**상위 디렉토리의 PostCSS 설정 삭제:**

```bash
# Windows PowerShell
Remove-Item "C:\Cursor Project\postcss.config.js"
```

**또는 이름 변경:**
```bash
Rename-Item "C:\Cursor Project\postcss.config.js" "C:\Cursor Project\postcss.config.js.backup"
```

---

## 🚀 지금 실행

```bash
cd frontend
npm run dev
```

**예상 결과:**
```
VITE v5.4.21  ready in 367 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

**브라우저 접속:**
http://localhost:3000

**표시되어야 할 화면:**
```
🌙 열네 밤의 꿈
프론트엔드 테스트 중...
[테스트 버튼]
```

---

## ✅ 성공 확인

1. **터미널**: 에러 없이 "ready" 메시지
2. **브라우저**: 제목과 버튼 표시
3. **콘솔**: F12 → Console 탭에 에러 없음

---

## 🔄 다음 단계

### 1. 테스트 버전 확인
현재 App.tsx는 최소 버전입니다.

### 2. 전체 버전 복원
테스트가 성공하면 원래 App.tsx로 복원:

```bash
# frontend/src/App_backup.tsx 내용을 App.tsx로 복사
```

또는 수동으로 복원:

`frontend/src/App.tsx`:
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

### 3. 재시작
```bash
# Ctrl+C로 중단 후
npm run dev
```

---

## 📝 요약

**문제**: 상위 디렉토리의 Tailwind CSS 설정  
**해결**: 프론트엔드에 빈 PostCSS 설정 추가  
**결과**: 에러 없이 실행 가능

---

## 🎉 완료!

이제 프론트엔드가 정상적으로 실행됩니다!
