import { Server, Socket } from 'socket.io';
import { DrawPoint, DrawStroke, PlayerAvatar, RoomSettings } from '../types.js';
import { Player } from '../models/Player.js';
import { Room } from '../models/Room.js';

export class SocketHandler {
  private io: Server;
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private socketToPlayer: Map<string, string> = new Map();
  private activeStrokes: Map<string, DrawStroke> = new Map(); // Key: roomId

  constructor(io: Server) {
    this.io = io;
  }

  public register(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  private handleConnection(socket: Socket): void {
    // 1. Create Room
    socket.on('create_room', (data: {
      hostName: string;
      avatar: PlayerAvatar;
      isPrivate?: boolean;
      settings?: Partial<RoomSettings>;
    }, callback?: (res: any) => void) => {
      try {
        const { hostName, avatar, isPrivate = false, settings = {} } = data;
        const roomId = this.generateRoomCode();
        const playerId = `p_${socket.id.substring(0, 8)}`;
        const hostPlayer = new Player(playerId, socket.id, hostName, avatar, true);

        const room = new Room(roomId, hostPlayer, isPrivate, settings, this.io);
        this.rooms.set(roomId, room);

        socket.join(roomId);
        this.socketToRoom.set(socket.id, roomId);
        this.socketToPlayer.set(socket.id, playerId);

        const response = {
          success: true,
          roomId,
          player: hostPlayer.toPublic(),
          settings: room.settings,
          players: room.getPublicPlayers(),
          gameState: room.game.getGameState(playerId)
        };

        if (callback) callback(response);
        else socket.emit('room_created', response);

        room.addSystemMessage(`${hostPlayer.name} created the room.`);
      } catch (err: any) {
        const errRes = { success: false, error: err.message || 'Failed to create room' };
        if (callback) callback(errRes);
        else socket.emit('error', errRes);
      }
    });

    // 2. Join Room
    socket.on('join_room', (data: {
      roomId: string;
      playerName: string;
      avatar: PlayerAvatar;
    }, callback?: (res: any) => void) => {
      try {
        const roomId = data.roomId?.trim().toUpperCase();
        const room = this.rooms.get(roomId);

        if (!room) {
          const res = { success: false, error: 'Room not found. Please check the room code.' };
          if (callback) callback(res);
          else socket.emit('error', res);
          return;
        }

        if (room.players.size >= room.settings.maxPlayers) {
          const res = { success: false, error: 'Room is full! Maximum players reached.' };
          if (callback) callback(res);
          else socket.emit('error', res);
          return;
        }

        const playerId = `p_${socket.id.substring(0, 8)}`;
        const newPlayer = new Player(playerId, socket.id, data.playerName, data.avatar, false);

        if (!room.addPlayer(newPlayer)) {
          const res = { success: false, error: 'Could not join room.' };
          if (callback) callback(res);
          else socket.emit('error', res);
          return;
        }

        socket.join(roomId);
        this.socketToRoom.set(socket.id, roomId);
        this.socketToPlayer.set(socket.id, playerId);

        // Notify other players
        socket.to(roomId).emit('player_joined', {
          player: newPlayer.toPublic(),
          players: room.getPublicPlayers()
        });

        const response = {
          success: true,
          roomId,
          player: newPlayer.toPublic(),
          settings: room.settings,
          players: room.getPublicPlayers(),
          hostId: room.hostId,
          gameState: room.game.getGameState(playerId),
          drawHistory: room.game.strokes,
          chatMessages: room.chatMessages
        };

        if (callback) callback(response);
        else socket.emit('room_joined', response);

        room.addSystemMessage(`${newPlayer.name} joined the room.`);
        room.broadcastPlayers();
      } catch (err: any) {
        const errRes = { success: false, error: err.message || 'Failed to join room' };
        if (callback) callback(errRes);
        else socket.emit('error', errRes);
      }
    });

    // 3. Get Public Rooms
    socket.on('get_public_rooms', (callback?: (rooms: any[]) => void) => {
      const publicList = Array.from(this.rooms.values())
        .filter(r => !r.isPrivate && r.players.size < r.settings.maxPlayers)
        .map(r => r.getPublicInfo());

      if (callback) callback(publicList);
      else socket.emit('public_rooms', publicList);
    });

    // 4. Update Room Settings (Host only)
    socket.on('update_settings', (newSettings: Partial<RoomSettings>) => {
      const room = this.getRoomForSocket(socket);
      const player = this.getPlayerForSocket(socket);
      if (!room || !player || player.id !== room.hostId) return;

      room.updateSettings(newSettings);
      room.addSystemMessage('Room settings have been updated.');
    });

    // 5. Start Game (Host only)
    socket.on('start_game', (callback?: (res: any) => void) => {
      const room = this.getRoomForSocket(socket);
      const player = this.getPlayerForSocket(socket);

      if (!room || !player || player.id !== room.hostId) {
        const err = { success: false, error: 'Only the room host can start the game.' };
        if (callback) callback(err);
        return;
      }

      if (room.players.size < 2) {
        const err = { success: false, error: 'At least 2 players are required to start.' };
        if (callback) callback(err);
        return;
      }

      const started = room.game.startGame(room.getAllPlayers());
      if (started) {
        room.addSystemMessage('The game has started!');
        room.broadcastPlayers();
        if (callback) callback({ success: true });
      } else {
        if (callback) callback({ success: false, error: 'Failed to start game.' });
      }
    });

    // 6. Restart Game (Host only)
    socket.on('restart_game', () => {
      const room = this.getRoomForSocket(socket);
      const player = this.getPlayerForSocket(socket);
      if (!room || !player || player.id !== room.hostId) return;

      room.game.restartGame(room.getAllPlayers());
      room.addSystemMessage('Game restarted to lobby.');
      room.broadcastPlayers();
    });

    // 7. Word Chosen by Drawer
    socket.on('word_chosen', (data: { word: string }) => {
      const room = this.getRoomForSocket(socket);
      const player = this.getPlayerForSocket(socket);
      if (!room || !player) return;

      if (room.game.currentDrawerId === player.id && room.game.phase === 'SELECTING_WORD') {
        room.game.selectWord(data.word, room.getAllPlayers());
        room.broadcastPlayers();
      }
    });

    // 8. Drawing: draw_start
    socket.on('draw_start', (data: { x: number; y: number; color: string; size: number; tool: 'brush' | 'eraser' | 'fill' }) => {
      const room = this.getRoomForSocket(socket);
      const player = this.getPlayerForSocket(socket);
      if (!room || !player) return;

      // Ensure player is drawer and phase is DRAWING
      if (room.game.currentDrawerId !== player.id || room.game.phase !== 'DRAWING') return;

      const stroke: DrawStroke = {
        id: Math.random().toString(36).substring(2, 9),
        tool: data.tool || 'brush',
        color: data.color || '#000000',
        size: data.size || 4,
        points: [{ x: data.x, y: data.y }]
      };

      this.activeStrokes.set(room.id, stroke);

      // Broadcast to other clients
      socket.to(room.id).emit('draw_start', {
        x: data.x,
        y: data.y,
        color: data.color,
        size: data.size,
        tool: data.tool
      });
    });

    // 9. Drawing: draw_move
    socket.on('draw_move', (data: { x: number; y: number }) => {
      const room = this.getRoomForSocket(socket);
      const player = this.getPlayerForSocket(socket);
      if (!room || !player) return;
      if (room.game.currentDrawerId !== player.id || room.game.phase !== 'DRAWING') return;

      const stroke = this.activeStrokes.get(room.id);
      if (stroke) {
        stroke.points.push({ x: data.x, y: data.y });
      }

      socket.to(room.id).emit('draw_move', { x: data.x, y: data.y });
    });

    // 10. Drawing: draw_end
    socket.on('draw_end', () => {
      const room = this.getRoomForSocket(socket);
      const player = this.getPlayerForSocket(socket);
      if (!room || !player) return;
      if (room.game.currentDrawerId !== player.id || room.game.phase !== 'DRAWING') return;

      const stroke = this.activeStrokes.get(room.id);
      if (stroke) {
        room.game.addStroke(stroke);
        this.activeStrokes.delete(room.id);
      }

      socket.to(room.id).emit('draw_end');
    });

    // 11. Drawing: draw_fill (Flood fill)
    socket.on('draw_fill', (data: { x: number; y: number; color: string }) => {
      const room = this.getRoomForSocket(socket);
      const player = this.getPlayerForSocket(socket);
      if (!room || !player) return;
      if (room.game.currentDrawerId !== player.id || room.game.phase !== 'DRAWING') return;

      const fillStroke: DrawStroke = {
        id: Math.random().toString(36).substring(2, 9),
        tool: 'fill',
        color: data.color,
        size: 0,
        points: [],
        fillPoint: { x: data.x, y: data.y }
      };

      room.game.addStroke(fillStroke);
      socket.to(room.id).emit('draw_fill', data);
    });

    // 12. Drawing: draw_undo
    socket.on('draw_undo', () => {
      const room = this.getRoomForSocket(socket);
      const player = this.getPlayerForSocket(socket);
      if (!room || !player) return;
      if (room.game.currentDrawerId !== player.id || room.game.phase !== 'DRAWING') return;

      room.game.undoStroke();
      this.io.to(room.id).emit('draw_undo');
    });

    // 13. Drawing: canvas_clear
    socket.on('canvas_clear', () => {
      const room = this.getRoomForSocket(socket);
      const player = this.getPlayerForSocket(socket);
      if (!room || !player) return;
      if (room.game.currentDrawerId !== player.id || room.game.phase !== 'DRAWING') return;

      room.game.clearCanvas();
      this.io.to(room.id).emit('canvas_clear');
    });

    // 14. Request Canvas History (e.g. for re-sync or late joiner)
    socket.on('request_canvas_history', () => {
      const room = this.getRoomForSocket(socket);
      if (!room) return;
      socket.emit('canvas_history', { strokes: room.game.strokes });
    });

    // 15. Chat and Guessing
    socket.on('send_message', (data: { text: string }) => {
      const room = this.getRoomForSocket(socket);
      const player = this.getPlayerForSocket(socket);
      if (!room || !player) return;

      const trimmedText = data.text?.trim();
      if (!trimmedText) return;

      // In drawing phase, check guess
      if (room.game.phase === 'DRAWING') {
        const isDrawer = player.id === room.game.currentDrawerId;

        // Drawer cannot guess
        if (isDrawer) {
          // Drawer chat is allowed or blocked depending on whether it contains the word
          if (room.game.currentWord && trimmedText.toLowerCase().includes(room.game.currentWord.toLowerCase())) {
            socket.emit('chat_message', {
              id: Math.random().toString(36).substring(2, 9),
              senderName: 'System',
              text: "You cannot say the secret word in chat!",
              type: 'system',
              timestamp: Date.now()
            });
            return;
          }

          room.addChatMessage({
            id: Math.random().toString(36).substring(2, 9),
            senderId: player.id,
            senderName: player.name,
            text: trimmedText,
            type: 'chat',
            timestamp: Date.now()
          });
          return;
        }

        // If player already guessed, messages are routed only to drawer and other players who also guessed
        if (player.hasGuessed) {
          const guessedMsg = {
            id: Math.random().toString(36).substring(2, 9),
            senderId: player.id,
            senderName: player.name,
            text: trimmedText,
            type: 'chat' as const,
            timestamp: Date.now()
          };

          for (const p of room.players.values()) {
            if (p.hasGuessed || p.id === room.game.currentDrawerId) {
              this.io.to(p.socketId).emit('chat_message', guessedMsg);
            }
          }
          return;
        }

        // Test guess!
        const result = room.game.handleGuess(player, trimmedText, room.getAllPlayers());

        if (result.isCorrect) {
          // Send success notification to room without revealing the word
          this.io.to(room.id).emit('guess_result', {
            correct: true,
            playerId: player.id,
            playerName: player.name,
            points: result.points
          });

          room.addChatMessage({
            id: Math.random().toString(36).substring(2, 9),
            senderId: player.id,
            senderName: 'System',
            text: `${player.name} guessed the word! (+${result.points} pts)`,
            type: 'guess_correct',
            timestamp: Date.now()
          });

          room.broadcastPlayers();
          return;
        }

        if (result.isClose) {
          // Whisper to sender only
          socket.emit('guess_result', {
            close: true,
            text: `'${trimmedText}' is very close!`
          });

          socket.emit('chat_message', {
            id: Math.random().toString(36).substring(2, 9),
            senderName: 'System',
            text: `'${trimmedText}' is very close!`,
            type: 'guess_close',
            timestamp: Date.now()
          });
          return;
        }

        // Regular incorrect guess: broadcast as standard chat message
        room.addChatMessage({
          id: Math.random().toString(36).substring(2, 9),
          senderId: player.id,
          senderName: player.name,
          text: trimmedText,
          type: 'chat',
          timestamp: Date.now()
        });
        return;
      }

      // Non-drawing phase (Lobby, Selecting Word, Round End, Game Over): standard chat
      room.addChatMessage({
        id: Math.random().toString(36).substring(2, 9),
        senderId: player.id,
        senderName: player.name,
        text: trimmedText,
        type: 'chat',
        timestamp: Date.now()
      });
    });

    // 16. Leave Room / Disconnect
    socket.on('leave_room', () => {
      this.handleLeave(socket);
    });

    socket.on('disconnect', () => {
      this.handleLeave(socket);
    });
  }

  private handleLeave(socket: Socket): void {
    const roomId = this.socketToRoom.get(socket.id);
    const playerId = this.socketToPlayer.get(socket.id);

    if (roomId && playerId) {
      const room = this.rooms.get(roomId);
      if (room) {
        const player = room.getPlayerById(playerId);
        const playerName = player ? player.name : 'A player';

        room.removePlayer(playerId);
        socket.to(roomId).emit('player_left', {
          playerId,
          players: room.getPublicPlayers()
        });
        room.addSystemMessage(`${playerName} left the room.`);

        // Clean up empty room
        if (room.players.size === 0) {
          room.cleanup();
          this.rooms.delete(roomId);
        }
      }
    }

    this.socketToRoom.delete(socket.id);
    this.socketToPlayer.delete(socket.id);
  }

  private getRoomForSocket(socket: Socket): Room | undefined {
    const roomId = this.socketToRoom.get(socket.id);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  private getPlayerForSocket(socket: Socket): Player | undefined {
    const roomId = this.socketToRoom.get(socket.id);
    const playerId = this.socketToPlayer.get(socket.id);
    if (!roomId || !playerId) return undefined;
    const room = this.rooms.get(roomId);
    return room ? room.getPlayerById(playerId) : undefined;
  }
}
