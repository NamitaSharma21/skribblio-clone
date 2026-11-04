import React, { useEffect } from 'react';
import { GameOverPayload, PlayerPublic } from '../types.js';
import { Socket } from 'socket.io-client';
import { Avatar } from './Avatar.js';
import confetti from 'canvas-confetti';
import { Trophy, Medal, RotateCcw, Home } from 'lucide-react';
import { soundService } from '../services/sound.js';

interface GameOverModalProps {
  socket: Socket;
  payload: GameOverPayload;
  currentPlayer: PlayerPublic | null;
  onExit: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  socket,
  payload,
  currentPlayer,
  onExit
}) => {
  const { leaderboard = [] } = payload;
  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];

  useEffect(() => {
    soundService.playGameOver();

    // Trigger celebratory confetti cannon
    const end = Date.now() + 3000;
    const interval: any = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() * 0.4 }
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handlePlayAgain = () => {
    socket.emit('restart_game');
  };

  const isHost = currentPlayer?.isHost;

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <div className="game-over-header">
          <Trophy size={40} className="trophy-icon" />
          <h1 className="game-over-title">Game Over!</h1>
          <p className="winner-declaration">
            🎉 Congratulations to <strong>{first ? first.name : 'the winner'}</strong>!
          </p>
        </div>

        {/* Podium Area (Top 3) */}
        <div className="podium-container">
          {/* 2nd Place */}
          {second && (
            <div className="podium-step step-2">
              <div className="podium-player">
                <Avatar avatar={second.avatar} size={56} />
                <span className="player-name">{second.name}</span>
                <span className="player-score">{second.score} pts</span>
              </div>
              <div className="podium-pedestal silver">
                <Medal size={24} />
                <span>#2</span>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {first && (
            <div className="podium-step step-1">
              <div className="podium-crown">👑</div>
              <div className="podium-player">
                <Avatar avatar={first.avatar} size={72} />
                <span className="player-name">{first.name}</span>
                <span className="player-score">{first.score} pts</span>
              </div>
              <div className="podium-pedestal gold">
                <Trophy size={28} />
                <span>#1</span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {third && (
            <div className="podium-step step-3">
              <div className="podium-player">
                <Avatar avatar={third.avatar} size={50} />
                <span className="player-name">{third.name}</span>
                <span className="player-score">{third.score} pts</span>
              </div>
              <div className="podium-pedestal bronze">
                <Medal size={22} />
                <span>#3</span>
              </div>
            </div>
          )}
        </div>

        {/* Full Leaderboard */}
        <div className="leaderboard-table">
          <h3>Full Leaderboard</h3>
          <div className="table-rows">
            {leaderboard.map((player, idx) => (
              <div key={player.id} className="table-row">
                <span className="table-rank">#{idx + 1}</span>
                <div className="table-player-info">
                  <Avatar avatar={player.avatar} size={28} />
                  <span>{player.name}</span>
                </div>
                <span className="table-score">{player.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="game-over-actions">
          {isHost ? (
            <button
              type="button"
              className="btn-primary btn-play-again"
              onClick={handlePlayAgain}
            >
              <RotateCcw size={18} />
              <span>Play Again</span>
            </button>
          ) : (
            <p className="waiting-host-restart">Waiting for host to restart game...</p>
          )}

          <button
            type="button"
            className="btn-secondary btn-exit"
            onClick={onExit}
          >
            <Home size={18} />
            <span>Leave Room</span>
          </button>
        </div>
      </div>
    </div>
  );
};
