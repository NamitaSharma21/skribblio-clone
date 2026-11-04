import { Server } from 'socket.io';
import { ChatMessage, PlayerPublic, PublicRoomInfo, RoomSettings } from '../types.js';
import { Player } from './Player.js';
import { Game } from './Game.js';

export class Room {
  public id: string;
  public name: string;
  public isPrivate: boolean;
  public hostId: string;
  public players: Map<string, Player> = new Map();
  public settings: RoomSettings;
  public game: Game;
  public chatMessages: ChatMessage[] = [];
  private io: Server;

  constructor(id: string, hostPlayer: Player, isPrivate: boolean, settings: Partial<RoomSettings>, io: Server) {
    this.id = id;
    this.name = `${hostPlayer.name}'s Room`;
    this.isPrivate = isPrivate;
    this.hostId = hostPlayer.id;
    this.io = io;

    this.settings = {
      maxPlayers: Math.min(20, Math.max(2, settings.maxPlayers || 8)),
      rounds: Math.min(10, Math.max(2, settings.rounds || 3)),
      drawTime: Math.min(240, Math.max(15, settings.drawTime || 80)),
      wordCount: Math.min(5, Math.max(1, settings.wordCount || 3)),
      hints: Math.min(5, Math.max(0, settings.hints ?? 2)),
      customWords: settings.customWords || []
    };

    // Initialize Game with event callbacks
    this.game = new Game(this.settings, {
      onTick: (timeLeft) => {
        this.io.to(this.id).emit('timer_tick', { timeLeft });
      },
      onPhaseChange: (phase, data) => {
        // Send state payload customized for each player (drawer sees word, others do not)
        this.broadcastGameState(phase, data);
      },
      onHintRevealed: (hints) => {
        this.io.to(this.id).emit('hint_revealed', { hints });
      },
      onRoundEnd: (payload) => {
        this.io.to(this.id).emit('round_end', payload);
        this.broadcastPlayers();
      },
      onGameOver: (payload) => {
        this.io.to(this.id).emit('game_over', payload);
        this.broadcastPlayers();
      }
    });

    this.addPlayer(hostPlayer);
  }

  public updateSettings(newSettings: Partial<RoomSettings>): RoomSettings {
    if (this.game.phase !== 'LOBBY') {
      return this.settings;
    }

    this.settings = {
      maxPlayers: Math.min(20, Math.max(2, newSettings.maxPlayers ?? this.settings.maxPlayers)),
      rounds: Math.min(10, Math.max(2, newSettings.rounds ?? this.settings.rounds)),
      drawTime: Math.min(240, Math.max(15, newSettings.drawTime ?? this.settings.drawTime)),
      wordCount: Math.min(5, Math.max(1, newSettings.wordCount ?? this.settings.wordCount)),
      hints: Math.min(5, Math.max(0, newSettings.hints ?? this.settings.hints)),
      customWords: newSettings.customWords ?? this.settings.customWords
    };

    this.game.updateSettings(this.settings);
    this.io.to(this.id).emit('room_settings_updated', this.settings);
    return this.settings;
  }

  public addPlayer(player: Player): boolean {
    if (this.players.size >= this.settings.maxPlayers) {
      return false;
    }

    // If room has no host, make this player host
    if (this.players.size === 0) {
      this.hostId = player.id;
      player.isHost = true;
    }

    this.players.set(player.id, player);
    return true;
  }

  public removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    this.players.delete(playerId);
    this.game.handlePlayerDisconnect(playerId, this.getAllPlayers());

    // Host migration if host left
    if (this.hostId === playerId && this.players.size > 0) {
      const nextHost = this.players.values().next().value;
      if (nextHost) {
        this.hostId = nextHost.id;
        nextHost.isHost = true;
        this.addSystemMessage(`${nextHost.name} is now the room host.`);
      }
    }

    this.broadcastPlayers();

    // Check if remaining players can continue game
    const activePlayers = this.getAllPlayers().filter(p => p.connected);
    if (activePlayers.length < 2 && this.game.phase !== 'LOBBY' && this.game.phase !== 'GAME_OVER') {
      this.addSystemMessage('Not enough players to continue. Returning to lobby.');
      this.game.restartGame(this.getAllPlayers());
    }
  }

  public getPlayerById(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  public getPlayerBySocketId(socketId: string): Player | undefined {
    for (const player of this.players.values()) {
      if (player.socketId === socketId) {
        return player;
      }
    }
    return undefined;
  }

  public getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  public getPublicPlayers(): PlayerPublic[] {
    return this.getAllPlayers().map(p => p.toPublic());
  }

  public broadcastPlayers(): void {
    this.io.to(this.id).emit('players_updated', {
      players: this.getPublicPlayers(),
      hostId: this.hostId
    });
  }

  public broadcastGameState(phase: string, extraData?: any): void {
    const scores: Record<string, number> = {};
    this.getAllPlayers().forEach(p => {
      scores[p.id] = p.score;
    });

    const { wordChoices: _extraChoices, word: _extraWord, ...safeExtraData } = extraData || {};

    for (const player of this.players.values()) {
      const isDrawer = player.id === this.game.currentDrawerId;
      const payload = {
        ...safeExtraData,
        phase: this.game.phase,
        round: this.game.currentRound,
        totalRounds: this.game.totalRounds,
        drawerId: this.game.currentDrawerId,
        drawerName: this.players.get(this.game.currentDrawerId || '')?.name || null,
        word: isDrawer ? this.game.currentWord : null,
        wordLength: this.game.currentWord?.length || 0,
        hints: this.game.hints,
        timeLeft: this.game.timeLeft,
        drawTime: this.game.drawTime,
        scores,
        wordChoices: isDrawer ? this.game.wordChoices : undefined
      };
      this.io.to(player.socketId).emit('game_state', payload);
    }
  }

  public addChatMessage(message: ChatMessage): void {
    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }
    this.io.to(this.id).emit('chat_message', message);
  }

  public addSystemMessage(text: string): void {
    const sysMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderName: 'System',
      text,
      type: 'system',
      timestamp: Date.now()
    };
    this.addChatMessage(sysMsg);
  }

  public getPublicInfo(): PublicRoomInfo {
    return {
      id: this.id,
      name: this.name,
      playerCount: this.players.size,
      maxPlayers: this.settings.maxPlayers,
      phase: this.game.phase,
      round: this.game.currentRound,
      totalRounds: this.settings.rounds
    };
  }

  public cleanup(): void {
    this.game.stopTimer();
  }
}
