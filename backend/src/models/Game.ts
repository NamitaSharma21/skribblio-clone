import { DrawStroke, GamePhase, GameStatePayload, RoundEndPayload, GameOverPayload, RoomSettings, WordChoice } from '../types.js';
import { Player } from './Player.js';
import { WordManager } from '../services/WordManager.js';

export interface GameCallbacks {
  onTick: (timeLeft: number) => void;
  onPhaseChange: (phase: GamePhase, data?: any) => void;
  onHintRevealed: (hints: string[]) => void;
  onRoundEnd: (payload: RoundEndPayload) => void;
  onGameOver: (payload: GameOverPayload) => void;
}

export class Game {
  public phase: GamePhase = 'LOBBY';
  public currentRound: number = 0;
  public totalRounds: number = 3;
  public drawTime: number = 80;
  public timeLeft: number = 0;

  public turnOrder: string[] = [];
  public currentDrawerIndex: number = -1;
  public currentDrawerId: string | null = null;
  public currentWord: string | null = null;
  public wordChoices: WordChoice[] = [];

  public strokes: DrawStroke[] = [];
  public revealedIndices: Set<number> = new Set();
  public hints: string[] = [];
  public correctGuessCount: number = 0;

  private wordManager: WordManager;
  private settings: RoomSettings;
  private timerInterval: NodeJS.Timeout | null = null;
  private callbacks: GameCallbacks;

  constructor(settings: RoomSettings, callbacks: GameCallbacks) {
    this.settings = settings;
    this.totalRounds = settings.rounds;
    this.drawTime = settings.drawTime;
    this.wordManager = new WordManager(settings.customWords);
    this.callbacks = callbacks;
  }

  public updateSettings(settings: RoomSettings): void {
    this.settings = settings;
    this.totalRounds = settings.rounds;
    this.drawTime = settings.drawTime;
    this.wordManager = new WordManager(settings.customWords);
  }

  public startGame(players: Player[]): boolean {
    const activePlayers = players.filter(p => p.connected);
    if (activePlayers.length < 2) {
      return false;
    }

    // Reset scores & game stats
    players.forEach(p => p.resetGameState());
    this.wordManager.resetUsedWords();

    this.currentRound = 1;
    this.turnOrder = activePlayers.map(p => p.id);
    this.currentDrawerIndex = 0;

    this.startWordSelection(players);
    return true;
  }

  public startWordSelection(players: Player[]): void {
    this.stopTimer();
    this.phase = 'SELECTING_WORD';
    this.strokes = [];
    this.revealedIndices.clear();
    this.correctGuessCount = 0;

    // Reset turn flags on players
    players.forEach(p => p.resetTurnState());

    // Validate current drawer
    if (this.currentDrawerIndex >= this.turnOrder.length) {
      this.currentDrawerIndex = 0;
      this.currentRound++;
    }

    if (this.currentRound > this.totalRounds) {
      this.endGame(players);
      return;
    }

    this.currentDrawerId = this.turnOrder[this.currentDrawerIndex];
    const drawer = players.find(p => p.id === this.currentDrawerId);

    if (!drawer || !drawer.connected) {
      // If drawer left or disconnected, skip to next turn
      this.nextTurn(players);
      return;
    }

    drawer.isDrawing = true;
    this.wordChoices = this.wordManager.getWordChoices(this.settings.wordCount || 3);
    this.currentWord = null;
    this.hints = [];

    this.timeLeft = 15; // 15 seconds to choose a word
    this.callbacks.onPhaseChange('SELECTING_WORD', {
      drawerId: drawer.id,
      drawerName: drawer.name,
      wordChoices: this.wordChoices,
      timeLeft: this.timeLeft
    });

    this.startTimer(() => {
      // Auto-pick first word if time runs out
      if (this.wordChoices.length > 0) {
        this.selectWord(this.wordChoices[0].word, players);
      }
    });
  }

  public selectWord(word: string, players: Player[]): boolean {
    if (this.phase !== 'SELECTING_WORD') return false;

    this.stopTimer();
    this.currentWord = word;
    this.wordManager.markWordUsed(word);
    this.revealedIndices.clear();
    this.hints = WordManager.generateHints(this.currentWord, this.revealedIndices);
    this.phase = 'DRAWING';
    this.timeLeft = this.drawTime;

    const drawer = players.find(p => p.id === this.currentDrawerId);

    this.callbacks.onPhaseChange('DRAWING', {
      drawerId: this.currentDrawerId,
      drawerName: drawer?.name || '',
      wordLength: this.currentWord.length,
      hints: this.hints,
      drawTime: this.drawTime,
      timeLeft: this.timeLeft
    });

    // Calculate when hints will be revealed (e.g., at 60% and 30% time remaining)
    const hintCount = Math.min(this.settings.hints, Math.max(0, this.currentWord.length - 2));
    const hintThresholds: number[] = [];
    if (hintCount > 0) {
      for (let i = 1; i <= hintCount; i++) {
        hintThresholds.push(Math.round((this.drawTime * (hintCount - i + 1)) / (hintCount + 1)));
      }
    }

    this.startTimer(() => {
      // Turn time is up!
      this.endTurn(players, 'Time ran out!');
    }, (remaining) => {
      // Check if we should reveal a hint at this second
      if (hintThresholds.includes(remaining) && this.currentWord) {
        this.revealHint();
      }
    });

    return true;
  }

  public revealHint(): void {
    if (!this.currentWord) return;

    const eligible = WordManager.getEligibleHintIndices(this.currentWord, this.revealedIndices);
    if (eligible.length <= 1) return; // Leave at least 1 letter hidden

    const randomIndex = eligible[Math.floor(Math.random() * eligible.length)];
    this.revealedIndices.add(randomIndex);
    this.hints = WordManager.generateHints(this.currentWord, this.revealedIndices);
    this.callbacks.onHintRevealed(this.hints);
  }

  public handleGuess(player: Player, guessText: string, allPlayers: Player[]): {
    isCorrect: boolean;
    isClose: boolean;
    points: number;
    drawerPoints: number;
  } {
    if (this.phase !== 'DRAWING' || !this.currentWord || player.hasGuessed || player.isDrawing) {
      return { isCorrect: false, isClose: false, points: 0, drawerPoints: 0 };
    }

    if (WordManager.isCorrectGuess(guessText, this.currentWord)) {
      player.hasGuessed = true;
      this.correctGuessCount++;

      // Points calculation based on time left
      const timeFraction = Math.max(0.1, this.timeLeft / this.drawTime);
      const basePoints = Math.round(150 + timeFraction * 350); // 185 to 500 points
      const firstBonus = this.correctGuessCount === 1 ? 75 : 0; // Bonus for 1st guesser
      const points = basePoints + firstBonus;

      player.addScore(points);

      // Drawer also earns points
      const drawer = allPlayers.find(p => p.id === this.currentDrawerId);
      const drawerPoints = Math.round(basePoints * 0.4);
      if (drawer) {
        drawer.addScore(drawerPoints);
      }

      // Check if all non-drawing active players have guessed
      const guessers = allPlayers.filter(p => p.connected && !p.isDrawing);
      const allGuessed = guessers.every(p => p.hasGuessed);

      if (allGuessed && guessers.length > 0) {
        // Fast-forward to round end after short delay
        setTimeout(() => {
          this.endTurn(allPlayers, 'All players guessed correctly!');
        }, 800);
      }

      return { isCorrect: true, isClose: false, points, drawerPoints };
    }

    const isClose = WordManager.isCloseGuess(guessText, this.currentWord);
    return { isCorrect: false, isClose, points: 0, drawerPoints: 0 };
  }

  public endTurn(players: Player[], reason: string = ''): void {
    this.stopTimer();
    this.phase = 'ROUND_END';

    const roundScores: Record<string, number> = {};
    const totalScores: Record<string, number> = {};
    players.forEach(p => {
      roundScores[p.id] = p.roundScore;
      totalScores[p.id] = p.score;
    });

    const nextIndex = this.currentDrawerIndex + 1;
    let nextDrawerId: string | null = null;
    let nextDrawerName: string | null = null;

    if (nextIndex < this.turnOrder.length) {
      nextDrawerId = this.turnOrder[nextIndex];
      const nextDrawer = players.find(p => p.id === nextDrawerId);
      nextDrawerName = nextDrawer?.name || null;
    } else if (this.currentRound + 1 <= this.totalRounds) {
      nextDrawerId = this.turnOrder[0];
      const nextDrawer = players.find(p => p.id === nextDrawerId);
      nextDrawerName = nextDrawer?.name || null;
    }

    const payload: RoundEndPayload = {
      word: this.currentWord || '',
      scores: totalScores,
      roundScores,
      nextDrawerId,
      nextDrawerName,
      countdown: 5
    };

    this.callbacks.onRoundEnd(payload);

    this.timeLeft = 5;
    this.startTimer(() => {
      this.nextTurn(players);
    });
  }

  public nextTurn(players: Player[]): void {
    this.currentDrawerIndex++;

    if (this.currentDrawerIndex >= this.turnOrder.length) {
      this.currentDrawerIndex = 0;
      this.currentRound++;
    }

    if (this.currentRound > this.totalRounds) {
      this.endGame(players);
    } else {
      this.startWordSelection(players);
    }
  }

  public endGame(players: Player[]): void {
    this.stopTimer();
    this.phase = 'GAME_OVER';

    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0] ? sortedPlayers[0].toPublic() : ({} as any);

    const payload: GameOverPayload = {
      winner,
      leaderboard: sortedPlayers.map(p => p.toPublic())
    };

    this.callbacks.onGameOver(payload);
  }

  public restartGame(players: Player[]): void {
    this.stopTimer();
    this.phase = 'LOBBY';
    this.currentRound = 0;
    this.currentDrawerIndex = -1;
    this.currentDrawerId = null;
    this.currentWord = null;
    this.strokes = [];
    this.revealedIndices.clear();
    this.hints = [];
    players.forEach(p => p.resetGameState());

    this.callbacks.onPhaseChange('LOBBY');
  }

  public addStroke(stroke: DrawStroke): void {
    this.strokes.push(stroke);
  }

  public undoStroke(): DrawStroke | null {
    return this.strokes.pop() || null;
  }

  public clearCanvas(): void {
    this.strokes = [];
  }

  public getGameState(forPlayerId?: string): GameStatePayload {
    const scores: Record<string, number> = {};
    return {
      phase: this.phase,
      round: this.currentRound,
      totalRounds: this.totalRounds,
      drawerId: this.currentDrawerId,
      drawerName: null,
      word: forPlayerId === this.currentDrawerId ? this.currentWord : null,
      wordLength: this.currentWord?.length || 0,
      hints: this.hints,
      timeLeft: this.timeLeft,
      drawTime: this.drawTime,
      scores
    };
  }

  public handlePlayerDisconnect(playerId: string, players: Player[]): void {
    // If the disconnected player was the drawer during word selection or drawing
    if (this.currentDrawerId === playerId && (this.phase === 'DRAWING' || this.phase === 'SELECTING_WORD')) {
      this.endTurn(players, 'The drawer left the game!');
    } else {
      // Remove from turn order if not yet drawn this round
      const orderIdx = this.turnOrder.indexOf(playerId);
      if (orderIdx > this.currentDrawerIndex) {
        this.turnOrder.splice(orderIdx, 1);
      }
    }
  }

  private startTimer(onComplete: () => void, onSecondTick?: (remaining: number) => void): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.callbacks.onTick(this.timeLeft);
      if (onSecondTick) {
        onSecondTick(this.timeLeft);
      }

      if (this.timeLeft <= 0) {
        this.stopTimer();
        onComplete();
      }
    }, 1000);
  }

  public stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
