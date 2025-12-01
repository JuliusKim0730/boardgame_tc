import { Server, Socket } from 'socket.io';

export function setupGameSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // 방 참여
    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      
      // 방의 다른 참여자들에게 알림
      socket.to(roomId).emit('player-joined', {
        socketId: socket.id,
        timestamp: new Date()
      });
    });

    // 방 나가기
    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit('player-left', {
        socketId: socket.id,
        timestamp: new Date()
      });
    });

    // 게임 상태 브로드캐스트
    socket.on('game-state-update', (data: { roomId: string; state: any }) => {
      socket.to(data.roomId).emit('state-updated', data.state);
    });

    // 턴 시작 알림
    socket.on('turn-started', (data: { roomId: string; playerId: string }) => {
      io.to(data.roomId).emit('turn-started', {
        playerId: data.playerId,
        timestamp: new Date()
      });
    });

    // 찬스 카드 상호작용 요청
    socket.on('chance-request', (data: { roomId: string; targetPlayerId: string; chanceData: any }) => {
      io.to(data.roomId).emit('chance-request', {
        targetPlayerId: data.targetPlayerId,
        chanceData: data.chanceData,
        timestamp: new Date()
      });
    });

    // 찬스 카드 응답
    socket.on('chance-response', (data: { roomId: string; response: any }) => {
      io.to(data.roomId).emit('chance-resolved', {
        response: data.response,
        timestamp: new Date()
      });
    });

    // v4.1 신규 이벤트

    // 2인 전용 찬스 칸 선택 요청
    socket.on('chance-option-request', (data: { roomId: string; playerId: string }) => {
      io.to(data.roomId).emit('chance-option-request', {
        playerId: data.playerId,
        options: ['card', 'money'],
        timestamp: new Date()
      });
    });

    // 2인 전용 찬스 칸 선택 완료
    socket.on('chance-option-selected', (data: { roomId: string; playerId: string; option: string; result: any }) => {
      io.to(data.roomId).emit('chance-option-selected', {
        playerId: data.playerId,
        option: data.option,
        result: data.result,
        timestamp: new Date()
      });
    });

    // 비주류 특성 변환 요청
    socket.on('trait-conversion-request', (data: { roomId: string; playerId: string; minorTraits: any }) => {
      io.to(data.roomId).emit('trait-conversion-request', {
        playerId: data.playerId,
        minorTraits: data.minorTraits,
        timestamp: new Date()
      });
    });

    // 비주류 특성 변환 완료
    socket.on('trait-conversion-completed', (data: { roomId: string; playerId: string; conversions: number }) => {
      io.to(data.roomId).emit('trait-conversion-completed', {
        playerId: data.playerId,
        conversions: data.conversions,
        timestamp: new Date()
      });
    });

    // 결심 토큰 회복 알림
    socket.on('resolve-token-recovered', (data: { roomId: string; playerId: string; newCount: number }) => {
      io.to(data.roomId).emit('resolve-token-recovered', {
        playerId: data.playerId,
        newCount: data.newCount,
        timestamp: new Date()
      });
    });

    // 집안일 첫 방문 보너스 알림
    socket.on('house-first-visit-bonus', (data: { roomId: string; playerId: string; bonus: number }) => {
      io.to(data.roomId).emit('house-first-visit-bonus', {
        playerId: data.playerId,
        bonus: data.bonus,
        timestamp: new Date()
      });
    });

    // 14일차 종료 알림
    socket.on('day-14-completed', (data: { roomId: string }) => {
      io.to(data.roomId).emit('day-14-completed', {
        message: '14일차가 종료되었습니다. 최종 정산을 시작합니다.',
        timestamp: new Date()
      });
    });

    // 7일차 시작 알림 (결심 토큰 회복 체크)
    socket.on('day-7-started', (data: { roomId: string }) => {
      io.to(data.roomId).emit('day-7-started', {
        message: '7일차가 시작되었습니다. 결심 토큰 회복을 확인합니다.',
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
