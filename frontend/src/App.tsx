import { useState } from 'react';
import LobbyScreen from './components/LobbyScreen';
import WaitingRoom from './components/WaitingRoom';
import GameScreen from './components/GameScreen';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<'lobby' | 'waiting' | 'game'>('lobby');
  const [roomId, setRoomId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [gameId, setGameId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);

  const handleRoomCreated = (roomId: string, roomCode: string, userId: string, isHost: boolean) => {
    setRoomId(roomId);
    setRoomCode(roomCode);
    setUserId(userId);
    setPlayerId(userId);
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
