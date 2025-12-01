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
