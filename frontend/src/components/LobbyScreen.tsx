import { useState } from 'react';
import { api } from '../services/api';
import './LobbyScreen.css';

interface Props {
  onRoomCreated: (roomId: string, roomCode: string, userId: string, isHost: boolean) => void;
}

function LobbyScreen({ onRoomCreated }: Props) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setError('닉네임을 입력하세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.createRoom(nickname);
      const { roomId, code, userId } = response.data;
      
      // 대기실로 이동
      onRoomCreated(roomId, code, userId, true);
    } catch (err: any) {
      setError(err.response?.data?.error || '방 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!nickname.trim() || !roomCode.trim()) {
      setError('닉네임과 방 코드를 입력하세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.joinRoom(roomCode, nickname);
      const { roomId, userId } = response.data;
      
      // 대기실로 이동
      onRoomCreated(roomId, roomCode, userId, false);
    } catch (err: any) {
      setError(err.response?.data?.error || '방 참여 실패');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'menu') {
    return (
      <div className="lobby-container">
        <div className="card lobby-card">
          <h1 className="title">🌙 열네 밤의 꿈</h1>
          <p className="subtitle">14일간의 여행 준비 보드게임</p>
          
          <div className="menu-buttons">
            <button
              className="btn btn-primary"
              onClick={() => setMode('create')}
            >
              방 만들기
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setMode('join')}
            >
              방 참여하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="lobby-container">
        <div className="card lobby-card">
          <h2 className="title">방 만들기</h2>
          
          <div className="form">
            <input
              type="text"
              placeholder="닉네임 입력"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />
            
            {error && <p className="error">{error}</p>}
            
            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={handleCreateRoom}
                disabled={loading}
              >
                {loading ? '생성 중...' : '방 만들기'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setMode('menu')}
                disabled={loading}
              >
                뒤로
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <div className="card lobby-card">
        <h2 className="title">방 참여하기</h2>
        
        <div className="form">
          <input
            type="text"
            placeholder="닉네임 입력"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />
          <input
            type="text"
            placeholder="방 코드 입력"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          
          {error && <p className="error">{error}</p>}
          
          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={handleJoinRoom}
              disabled={loading}
            >
              {loading ? '참여 중...' : '참여하기'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setMode('menu')}
              disabled={loading}
            >
              뒤로
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LobbyScreen;
