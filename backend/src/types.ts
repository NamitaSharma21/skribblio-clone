export type GamePhase = 'LOBBY' | 'SELECTING_WORD' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER';

export interface PlayerAvatar {
  color: string;
  eyes: number;
  mouth: number;
}

export interface PlayerPublic {
  id: string;
  name: string;
  avatar: PlayerAvatar;
  score: number;
  isHost: boolean;
  hasGuessed: boolean;
  isDrawing: boolean;
  connected: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  customWords: string[];
}

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  tool: 'brush' | 'eraser' | 'fill';
  color: string;
  size: number;
  points: DrawPoint[];
  fillPoint?: DrawPoint;
}

export interface WordChoice {
  word: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  text: string;
  type: 'chat' | 'system' | 'guess_correct' | 'guess_close' | 'info';
  timestamp: number;
}

export interface GameStatePayload {
  phase: GamePhase;
  round: number;
  totalRounds: number;
  drawerId: string | null;
  drawerName: string | null;
  word?: string | null; // Only populated for drawer
  wordLength: number;
  hints: string[];
  timeLeft: number;
  drawTime: number;
  scores: Record<string, number>;
}

export interface RoundEndPayload {
  word: string;
  scores: Record<string, number>;
  roundScores: Record<string, number>;
  nextDrawerId: string | null;
  nextDrawerName: string | null;
  countdown: number;
}

export interface GameOverPayload {
  winner: PlayerPublic;
  leaderboard: PlayerPublic[];
}

export interface PublicRoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  phase: GamePhase;
  round: number;
  totalRounds: number;
}
