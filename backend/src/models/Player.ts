import { PlayerAvatar, PlayerPublic } from '../types.js';

export class Player {
  public id: string;
  public socketId: string;
  public name: string;
  public avatar: PlayerAvatar;
  public score: number = 0;
  public roundScore: number = 0;
  public hasGuessed: boolean = false;
  public isDrawing: boolean = false;
  public isHost: boolean = false;
  public connected: boolean = true;
  public disconnectTimeout: NodeJS.Timeout | null = null;

  constructor(id: string, socketId: string, name: string, avatar: PlayerAvatar, isHost: boolean = false) {
    this.id = id;
    this.socketId = socketId;
    this.name = name.trim().slice(0, 20) || 'Anonymous';
    this.avatar = avatar;
    this.isHost = isHost;
  }

  public addScore(points: number): void {
    this.score += points;
    this.roundScore += points;
  }

  public resetTurnState(): void {
    this.hasGuessed = false;
    this.isDrawing = false;
    this.roundScore = 0;
  }

  public resetGameState(): void {
    this.score = 0;
    this.roundScore = 0;
    this.hasGuessed = false;
    this.isDrawing = false;
  }

  public toPublic(): PlayerPublic {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      score: this.score,
      isHost: this.isHost,
      hasGuessed: this.hasGuessed,
      isDrawing: this.isDrawing,
      connected: this.connected
    };
  }
}
