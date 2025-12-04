import axios, { AxiosError } from 'axios';

// API URL 설정
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.PROD
    ? 'https://boardgame-tc.onrender.com/api'  // 프로덕션: Render 백엔드
    : 'http://localhost:4000/api';  // 개발: 로컬 백엔드 (포트 4000)

console.log('API_BASE:', API_BASE);  // 디버깅용
console.log('Environment:', import.meta.env.MODE);

// Axios 인터셉터 - 에러 로깅 강화
axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method
      });
    } else if (error.request) {
      // 요청은 보냈지만 응답이 없음
      console.error('API No Response:', {
        url: error.config?.url,
        message: error.message
      });
    } else {
      // 요청 설정 중 에러
      console.error('API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

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

  respondToChanceInteraction: (interactionId: string, response: any) =>
    axios.post(`${API_BASE}/chance/respond`, { interactionId, response }),

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

  getGameState: (gameId: string) =>
    axios.get(`${API_BASE}/games/${gameId}/state`),

  getPlayerState: (gameId: string, playerId: string) =>
    axios.get(`${API_BASE}/games/${gameId}/players/${playerId}`),

  // 슬롯 관리
  updateSlot: (roomId: string, slotIndex: number, action: 'user' | 'ai' | 'ban') =>
    axios.post(`${API_BASE}/rooms/${roomId}/slots/${slotIndex}`, { action }),

  kickPlayer: (roomId: string, playerId: string) =>
    axios.post(`${API_BASE}/rooms/${roomId}/kick`, { playerId }),

  // 이벤트 로그
  getEventLogs: (gameId: string) =>
    axios.get(`${API_BASE}/games/${gameId}/logs`),

  // 찬스 카드 특수 효과
  extraAction: (gameId: string, playerId: string, actionType: number, skipMove: boolean = true) =>
    axios.post(`${API_BASE}/games/${gameId}/extra-action`, { playerId, actionType, skipMove }),

  selectJointPlan: (gameId: string, cardId: string) =>
    axios.post(`${API_BASE}/games/${gameId}/select-joint-plan`, { cardId }),

  // 공동 계획 카드 목록 조회
  getJointPlanCards: () =>
    axios.get(`${API_BASE}/cards/joint-plan`),

  // Axios 인스턴스 직접 노출 (커스텀 요청용)
  post: (url: string, data?: any) => axios.post(`${API_BASE}${url}`, data),
  get: (url: string) => axios.get(`${API_BASE}${url}`),
};
