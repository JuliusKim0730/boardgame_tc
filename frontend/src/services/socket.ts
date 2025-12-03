import { io, Socket } from 'socket.io-client';

// Socket URL 설정
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL 
  || import.meta.env.VITE_API_URL
  || (import.meta.env.PROD
    ? 'https://boardgame-tc.onrender.com'  // 프로덕션: Render 백엔드
    : 'http://localhost:3000');  // 개발: 로컬 백엔드

console.log('SOCKET_URL:', SOCKET_URL);  // 디버깅용
console.log('Environment:', import.meta.env.MODE);  // 환경 확인

class SocketService {
  private socket: Socket | null = null;

  connect(roomId: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket?.emit('join-room', roomId);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }
}

export const socketService = new SocketService();
