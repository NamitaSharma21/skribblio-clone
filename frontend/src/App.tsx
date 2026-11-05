import React, { useState, useEffect, useCallback } from 'react';
import { getSocket } from './services/socket.js';
import { soundService } from './services/sound.js';
import {
  ChatMessage,
  DrawStroke,
  GameOverPayload,
  GameStatePayload,
  PlayerPublic,
  RoomSettings,
  RoundEndPayload,
  WordChoice
} from './types.js';

import { Header } from './components/Header.js';
import { HomeView } from './components/HomeView.js';
import { LobbyView } from './components/LobbyView.js';
import { PlayerList } from './components/PlayerList.js';
import { DrawingCanvas } from './components/DrawingCanvas.js';
import { ChatBox } from './components/ChatBox.js';
import { WordSelectorModal } from './components/WordSelectorModal.js';
import { RoundEndOverlay } from './components/RoundEndOverlay.js';
import { GameOverModal } from './components/GameOverModal.js';
import { RoomSettingsModal } from './components/RoomSettingsModal.js';

export const App: React.FC = () => {
  const socket = getSocket();

  // Navigation / Room State
  const [inRoom, setInRoom] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>('');
  const [currentPlayer, setCurrentPlayer] = useState<PlayerPublic | null>(null);
  const [players, setPlayers] = useState<PlayerPublic[]>([]);
  const [hostId, setHostId] = useState<string>('');
  const [settings, setSettings] = useState<RoomSettings>({
    maxPlayers: 8,
    rounds: 3,
    drawTime: 80,
    wordCount: 3,
    hints: 2,
    customWords: []
  });

  // Game Engine State
  const [phase, setPhase] = useState<GameStatePayload['phase']>('LOBBY');
  const [round, setRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(3);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerName, setDrawerName] = useState<string>('');
  const [secretWord, setSecretWord] = useState<string | null>(null);
  const [wordLength, setWordLength] = useState<number>(0);
  const [hints, setHints] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [wordChoices, setWordChoices] = useState<WordChoice[]>([]);

  // Canvas / Chat / Modals
  const [drawHistory, setDrawHistory] = useState<DrawStroke[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roundEndData, setRoundEndData] = useState<RoundEndPayload | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverPayload | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Read invite links (e.g., ?room=ABCD12) before rendering the home view.
  const [urlRoomCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.trim().toUpperCase() || '';
  });

  // Socket Event Listeners
  useEffect(() => {
    // 1. Timer Tick
    socket.on('timer_tick', (data: { timeLeft: number }) => {
      setTimeLeft(data.timeLeft);
      if (data.timeLeft <= 5 && data.timeLeft > 0) {
        soundService.playTick();
      }
    });

    // 2. Game State Broadcast
    socket.on('game_state', (data: any) => {
      setPhase(data.phase);
      setRound(data.round || 1);
      setTotalRounds(data.totalRounds || 3);
      setDrawerId(data.drawerId || null);
      setDrawerName(data.drawerName || '');
      setSecretWord(data.word || null);
      setWordLength(data.wordLength || 0);
      setHints(data.hints || []);
      setTimeLeft(data.timeLeft || 0);

      if (data.wordChoices) {
        setWordChoices(data.wordChoices);
      }

      if (data.phase === 'SELECTING_WORD' || data.phase === 'DRAWING') {
        setRoundEndData(null);
        setGameOverData(null);
      }

      if (data.phase === 'DRAWING') {
        soundService.playStart();
      }
    });

    // 3. Hint Revealed
    socket.on('hint_revealed', (data: { hints: string[] }) => {
      setHints(data.hints);
      soundService.playClose();
    });

    // 4. Guess Result
    socket.on('guess_result', (data: { correct?: boolean; close?: boolean; playerId?: string; playerName?: string; points?: number }) => {
      if (data.correct) {
        soundService.playCorrect();
        if (currentPlayer && data.playerId === currentPlayer.id) {
          setCurrentPlayer((prev) => (prev ? { ...prev, hasGuessed: true } : null));
        }
      } else if (data.close) {
        soundService.playClose();
      }
    });

    // 5. Round End
    socket.on('round_end', (data: RoundEndPayload) => {
      setPhase('ROUND_END');
      setRoundEndData(data);
      setTimeLeft(data.countdown || 5);
    });

    // 6. Game Over
    socket.on('game_over', (data: GameOverPayload) => {
      setPhase('GAME_OVER');
      setGameOverData(data);
    });

    // 7. Players Updated
    socket.on('players_updated', (data: { players: PlayerPublic[]; hostId: string }) => {
      setPlayers(data.players || []);
      setHostId(data.hostId);

      // Refresh current player reference
      if (currentPlayer) {
        const found = data.players.find((p) => p.id === currentPlayer.id);
        if (found) {
          setCurrentPlayer(found);
        }
      }
    });

    // 8. Chat Message
    socket.on('chat_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    // 9. Room Settings Updated
    socket.on('room_settings_updated', (newSettings: RoomSettings) => {
      setSettings(newSettings);
    });

    return () => {
      socket.off('timer_tick');
      socket.off('game_state');
      socket.off('hint_revealed');
      socket.off('guess_result');
      socket.off('round_end');
      socket.off('game_over');
      socket.off('players_updated');
      socket.off('chat_message');
      socket.off('room_settings_updated');
    };
  }, [socket, currentPlayer]);

  // Handler when joining or creating a room
  const handleRoomJoined = useCallback((res: any) => {
    setInRoom(true);
    setRoomId(res.roomId);
    setCurrentPlayer(res.player);
    setPlayers(res.players || [res.player]);
    setHostId(res.player.isHost ? res.player.id : res.hostId || '');
    if (res.settings) setSettings(res.settings);
    if (res.gameState) {
      setPhase(res.gameState.phase);
      setRound(res.gameState.round || 1);
      setTotalRounds(res.gameState.totalRounds || 3);
      setDrawerId(res.gameState.drawerId || null);
      setSecretWord(res.gameState.word || null);
      setWordLength(res.gameState.wordLength || 0);
      setHints(res.gameState.hints || []);
      setTimeLeft(res.gameState.timeLeft || 0);
    }
    if (res.drawHistory) setDrawHistory(res.drawHistory);
    if (res.chatMessages) setMessages(res.chatMessages);

    // Update browser URL query param without full refresh
    const newUrl = `${window.location.pathname}?room=${res.roomId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  }, []);

  // Handler to leave current room
  const handleLeaveRoom = () => {
    socket.emit('leave_room');
    setInRoom(false);
    setRoomId('');
    setCurrentPlayer(null);
    setPlayers([]);
    setPhase('LOBBY');
    setRoundEndData(null);
    setGameOverData(null);
    setMessages([]);

    // Clear URL search params
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const isCurrentDrawer = Boolean(currentPlayer && drawerId && currentPlayer.id === drawerId);

  return (
    <div className="skribbl-app">
      {/* Top Header */}
      <Header
        phase={phase}
        round={round}
        totalRounds={totalRounds}
        timeLeft={timeLeft}
        drawTime={settings.drawTime}
        isDrawer={isCurrentDrawer}
        word={secretWord}
        hints={hints}
        wordLength={wordLength}
        roomId={inRoom ? roomId : ''}
        onLeave={handleLeaveRoom}
      />

      {/* Main Content View */}
      <main className="app-main-content">
        {!inRoom ? (
          <HomeView
            socket={socket}
            onRoomJoined={handleRoomJoined}
            initialRoomCode={urlRoomCode}
          />
        ) : phase === 'LOBBY' ? (
          <LobbyView
            socket={socket}
            roomId={roomId}
            players={players}
            currentPlayer={currentPlayer}
            settings={settings}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        ) : (
          /* Active Gameplay Screen: 3-column layout (Players | Canvas | Chat) */
          <div className="gameplay-grid">
            {/* Left Column: Player Leaderboard */}
            <aside className="gameplay-left-col">
              <PlayerList
                players={players}
                currentUserId={currentPlayer?.id}
                drawerId={drawerId}
              />
            </aside>

            {/* Middle Column: Interactive Canvas & Overlays */}
            <section className="gameplay-center-col">
              <DrawingCanvas
                socket={socket}
                isDrawer={isCurrentDrawer && phase === 'DRAWING'}
                initialStrokes={drawHistory}
              />

              {/* Word Choice Modal Overlay */}
              {phase === 'SELECTING_WORD' && (
                <WordSelectorModal
                  socket={socket}
                  isDrawer={isCurrentDrawer}
                  drawerName={drawerName}
                  wordChoices={wordChoices}
                  timeLeft={timeLeft}
                />
              )}

              {/* Round Over Overlay */}
              {phase === 'ROUND_END' && roundEndData && (
                <RoundEndOverlay
                  payload={roundEndData}
                  players={players}
                  timeLeft={timeLeft}
                />
              )}

              {/* Game Over Modal */}
              {phase === 'GAME_OVER' && gameOverData && (
                <GameOverModal
                  socket={socket}
                  payload={gameOverData}
                  currentPlayer={currentPlayer}
                  onExit={handleLeaveRoom}
                />
              )}
            </section>

            {/* Right Column: Chat & Guessing */}
            <aside className="gameplay-right-col">
              <ChatBox
                socket={socket}
                messages={messages}
                currentPlayer={currentPlayer}
                isDrawer={isCurrentDrawer}
                hasGuessed={Boolean(currentPlayer?.hasGuessed)}
                gamePhase={phase}
              />
            </aside>
          </div>
        )}
      </main>

      {/* Room Settings Modal */}
      {isSettingsOpen && (
        <RoomSettingsModal
          socket={socket}
          settings={settings}
          isHost={Boolean(currentPlayer?.isHost)}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};
