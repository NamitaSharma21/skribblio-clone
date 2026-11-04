import React, { useState } from 'react';
import { GamePhase } from '../types.js';
import { Volume2, VolumeX, Copy, Check, Clock, LogOut } from 'lucide-react';
import { soundService } from '../services/sound.js';

interface HeaderProps {
  phase: GamePhase;
  round: number;
  totalRounds: number;
  timeLeft: number;
  drawTime: number;
  isDrawer: boolean;
  word?: string | null;
  hints: string[];
  wordLength: number;
  roomId: string;
  onLeave: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  phase,
  round,
  totalRounds,
  timeLeft,
  drawTime,
  isDrawer,
  word,
  hints,
  wordLength,
  roomId,
  onLeave
}) => {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(soundService.isMuted());

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleToggleMute = () => {
    const isNowMuted = soundService.toggleMute();
    setMuted(isNowMuted);
  };

  const isWarningTime = phase === 'DRAWING' && timeLeft <= 10;

  return (
    <header className="game-header">
      {/* Brand & Room Info */}
      <div className="header-left">
        <div className="game-brand">
          <span className="brand-logo">🎨</span>
          <span className="brand-text">skribbl<span className="brand-accent">.io</span></span>
        </div>

        {roomId && (
          <button
            type="button"
            className="room-code-badge"
            onClick={handleCopyCode}
            title="Click to copy Room Code"
          >
            <span className="code-label">ROOM:</span>
            <span className="code-value">{roomId}</span>
            {copied ? <Check size={14} className="copy-icon success" /> : <Copy size={14} className="copy-icon" />}
          </button>
        )}
      </div>

      {/* Middle Game Info (Rounds, Timer, Word/Blanks) */}
      {phase !== 'LOBBY' && (
        <div className="header-center">
          {/* Round Indicator */}
          <div className="round-badge">
            Round {round} / {totalRounds}
          </div>

          {/* Turn Timer */}
          {(phase === 'DRAWING' || phase === 'SELECTING_WORD' || phase === 'ROUND_END') && (
            <div className={`timer-badge ${isWarningTime ? 'timer-urgent' : ''}`}>
              <Clock size={16} />
              <span className="timer-number">{timeLeft}</span>
            </div>
          )}

          {/* Word / Hints Area */}
          {phase === 'DRAWING' && (
            <div className="word-hint-container">
              {isDrawer ? (
                <div className="drawer-word-reveal">
                  <span className="drawer-label">DRAW:</span>
                  <span className="drawer-word">{word}</span>
                </div>
              ) : (
                <div className="guesser-blanks-row">
                  <div className="blanks-list">
                    {hints.map((char, idx) => (
                      <span key={idx} className={`word-char ${char ? 'char-revealed' : 'char-blank'}`}>
                        {char || '_'}
                      </span>
                    ))}
                  </div>
                  {wordLength > 0 && <span className="word-length-pill">({wordLength})</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Right Controls (Sound, Leave) */}
      <div className="header-right">
        <button
          type="button"
          onClick={handleToggleMute}
          className="header-icon-btn"
          title={muted ? 'Unmute Audio' : 'Mute Audio'}
          aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {roomId && (
          <button
            type="button"
            onClick={onLeave}
            className="header-icon-btn btn-leave"
            title="Leave Game"
            aria-label="Leave Game"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </header>
  );
};
