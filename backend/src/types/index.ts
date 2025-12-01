// 공통 타입 정의
export type RoomStatus = 'waiting' | 'in_progress';
export type GameStatus = 'setting' | 'running' | 'finalizing' | 'finished';
export type PlayerStatus = 'active' | 'afk' | 'left' | 'bot';
export type DeckType = 'plan' | 'freeplan' | 'house' | 'invest' | 'chance' | 'joint' | 'travel' | 'support';
export type CardType = 'plan' | 'freeplan' | 'house' | 'invest' | 'chance' | 'joint' | 'travel' | 'support';
export type ActionKind = 'move' | 'draw' | 'chance' | 'free_action' | 'invest' | 'house' | 'contribute';

export interface Traits {
  taste: number;      // 맛
  history: number;    // 역사
  nature: number;     // 자연
  culture: number;    // 문화
  leisure: number;    // 레저
  water: number;      // 물놀이
  memory: number;     // 추억
}

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  createdAt: Date;
}

export interface Game {
  id: string;
  roomId: string;
  day: number;
  currentTurnPlayerId: string | null;
  travelTheme: string | null;
  jointPlanCardId: string | null;
  status: GameStatus;
  createdAt: Date;
}

export interface Player {
  id: string;
  userId: string;
  nickname: string;
}

export interface PlayerState {
  id: string;
  gameId: string;
  playerId: string;
  money: number;
  position: number;
  resolveToken: boolean;
  traits: Traits;
  turnOrder: number;
  status: PlayerStatus;
  lastPosition?: number;
}

export interface Card {
  id: string;
  type: CardType;
  code: string;
  name: string;
  cost?: number;
  effects: Partial<Traits>;
  metadata?: any;
}
