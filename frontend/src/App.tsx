import { useEffect, useState } from 'react';
import { loadSession, saveSession } from './utils/storage';
import LobbyScreen from './components/LobbyScreen';
import WaitingRoom from './components/WaitingRoom';
import GameScreen from './components/GameScreen';
import Header from './components/Header';
import './App.css';

function App() {
  // 새로고침 시 이 탭에서 진행하던 방/게임으로 복귀
  const saved = loadSession();
  const [gameState, setGameState] = useState<'lobby' | 'waiting' | 'game'>(saved?.screen || 'lobby');
  const [roomId, setRoomId] = useState<string>(saved?.roomId || '');
  const [roomCode, setRoomCode] = useState<string>(saved?.roomCode || '');
  const [gameId, setGameId] = useState<string>(saved?.gameId || '');
  const [playerId, setPlayerId] = useState<string>(saved?.playerId || '');
  const [userId, setUserId] = useState<string>(saved?.userId || '');
  const [isHost, setIsHost] = useState<boolean>(saved?.isHost || false);

  useEffect(() => {
    saveSession(gameState === 'lobby' ? null : { screen: gameState, roomId, roomCode, gameId, playerId, userId, isHost });
  }, [gameState, roomId, roomCode, gameId, playerId, userId, isHost]);

  const handleRoomCreated = (roomId: string, roomCode: string, userId: string, playerId: string, isHost: boolean) => {
    console.log('=== 방 생성/참가 ===');
    console.log('roomId:', roomId);
    console.log('userId:', userId);
    console.log('playerId:', playerId);
    console.log('isHost:', isHost);
    
    setRoomId(roomId);
    setRoomCode(roomCode);
    setUserId(userId);
    setPlayerId(playerId);  // ← 이제 올바른 playerId 설정
    setIsHost(isHost);
    setGameState('waiting');
  };

  const handleGameStart = (gameId: string) => {
    setGameId(gameId);
    setGameState('game');
  };

  const handleBackToLobby = () => {
    setGameState('lobby');
    setRoomId('');
    setRoomCode('');
    setGameId('');
    setPlayerId('');
    setUserId('');
    setIsHost(false);
  };

  return (
    <div className="app">
      <Header showHeader={true} />
      
      {gameState === 'lobby' && (
        <LobbyScreen onRoomCreated={handleRoomCreated} />
      )}
      
      {gameState === 'waiting' && (
        <WaitingRoom
          roomId={roomId}
          roomCode={roomCode}
          userId={userId}
          isHost={isHost}
          onGameStart={handleGameStart}
          onBack={handleBackToLobby}
        />
      )}
      
      {gameState === 'game' && (
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
