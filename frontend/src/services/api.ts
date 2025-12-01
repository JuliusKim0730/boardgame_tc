import axios from 'axios';

// Vercel 배포 시 자동으로 올바른 URL 사용
const API_BASE = import.meta.env.PROD 
  ? '/api'  // 프로덕션: 같은 도메인
  : 'http://localhost:3000/api';  // 개발: 로컬 백엔드

export const api = {
  // 방 관리
  createRoom: (nickname: string) =>
    axios.post(`${API_BASE}/rooms`, { nickname }),

  joinRoom: (code: string, nickname: string) =>
    axios.post(`${API_BASE}/rooms/${code}/join`, { nickname }),

  getRoomState: (roomId: string) =>
    axios.get(`${API_BASE}/rooms/${roomId}`),

  startGame: (roomId: string) =>
    axios.post(`${API_BASE}/rooms/${roomId}/start`),

  softReset: (roomId: string) =>
    axios.post(`${API_BASE}/rooms/${roomId}/soft-reset`),

  // 게임 플레이
  move: (gameId: string, playerId: string, position: number) =>
    axios.post(`${API_BASE}/games/${gameId}/move`, { playerId, position }),

  performAction: (gameId: string, playerId: string, actionType: number) =>
    axios.post(`${API_BASE}/games/${gameId}/action`, { playerId, actionType }),

  endTurn: (gameId: string, playerId: string) =>
    axios.post(`${API_BASE}/games/${gameId}/end-turn`, { playerId }),

  executeChance: (gameId: string, playerId: string, cardCode: string) =>
    axios.post(`${API_BASE}/games/${gameId}/chance/${cardCode}`, { playerId }),

  respondToChance: (gameId: string, interactionId: string, response: any) =>
    axios.post(`${API_BASE}/games/${gameId}/chance-response`, { interactionId, response }),

  contribute: (gameId: string, playerId: string, amount: number) =>
    axios.post(`${API_BASE}/games/${gameId}/contribute`, { playerId, amount }),

  getJointPlanStatus: (gameId: string) =>
    axios.get(`${API_BASE}/games/${gameId}/joint-plan`),

  finalPurchase: (gameId: string, playerId: string, cardIds: string[]) =>
    axios.post(`${API_BASE}/games/${gameId}/final-purchase`, { playerId, cardIds }),

  finalize: (gameId: string) =>
    axios.post(`${API_BASE}/games/${gameId}/finalize`),

  resultClosed: (gameId: string, playerId: string) =>
    axios.post(`${API_BASE}/games/${gameId}/result-closed`, { playerId }),

  // v4.1 신규 엔드포인트
  convertTraits: (gameId: string, playerId: string, conversions: number) =>
    axios.post(`${API_BASE}/games/${gameId}/convert-traits`, { playerId, conversions }),

  selectChanceOption: (gameId: string, playerId: string, option: 'card' | 'money') =>
    axios.post(`${API_BASE}/games/${gameId}/chance-option`, { playerId, option }),

  checkResolveRecovery: (gameId: string) =>
    axios.post(`${API_BASE}/games/${gameId}/check-resolve-recovery`),

  useResolveToken: (gameId: string, playerId: string, actionType: number) =>
    axios.post(`${API_BASE}/games/${gameId}/use-resolve-token`, { playerId, actionType }),

  getRoom: (roomId: string) =>
    axios.get(`${API_BASE}/rooms/${roomId}`),
};
