import { useEffect, useState } from 'react';
import { api, errorMessage } from '../services/api';
import './LobbyScreen.css';

interface Props {
  onRoomCreated: (roomId: string, roomCode: string, userId: string, playerId: string, isHost: boolean) => void;
}

function LobbyScreen({ onRoomCreated }: Props) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState<'waking' | 'ready' | 'down'>('waking');

  // 첫 화면에서 미리 서버를 깨워 둔다 (무료 서버 콜드 스타트 대비)
  useEffect(() => {
    api
      .health()
      .then(() => setServerStatus('ready'))
      .catch(() => setServerStatus('down'));
  }, []);

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setError('닉네임을 입력하세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.createRoom(nickname);
      const { roomId, code, userId, playerId } = response.data;
      
      // 대기실로 이동
      onRoomCreated(roomId, code, userId, playerId, true);
    } catch (err: any) {
      setError(errorMessage(err, '방 생성 실패'));
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
      const { roomId, userId, playerId } = response.data;
      
      console.log('방 참가 완료:', { roomId, userId, playerId });
      
      // 대기실로 이동
      onRoomCreated(roomId, roomCode, userId, playerId, false);
    } catch (err: any) {
      setError(errorMessage(err, '방 참여 실패'));
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
          <p className={`server-status server-${serverStatus}`}>
            {serverStatus === 'waking' && '⏳ 서버 연결 중... (첫 접속은 최대 1분)'}
            {serverStatus === 'ready' && '🟢 서버 준비 완료'}
            {serverStatus === 'down' && '🔴 서버 응답 없음 - 잠시 후 새로고침해 주세요'}
          </p>
          
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
