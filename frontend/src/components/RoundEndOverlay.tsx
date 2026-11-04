import React from 'react';
import { PlayerPublic, RoundEndPayload } from '../types.js';
import { Avatar } from './Avatar.js';
import { Trophy, Clock } from 'lucide-react';

interface RoundEndOverlayProps {
  payload: RoundEndPayload;
  players: PlayerPublic[];
  timeLeft: number;
}

export const RoundEndOverlay: React.FC<RoundEndOverlayProps> = ({
  payload,
  players,
  timeLeft
}) => {
  return (
    <div className="round-end-overlay">
      <div className="round-end-card">
        <span className="round-end-subtitle">ROUND OVER</span>
        <h2 className="revealed-word-title">
          The word was: <span className="highlight-word">{payload.word}</span>
        </h2>

        {/* Players Score Changes This Turn */}
        <div className="round-scores-list">
          <h3>Turn Results</h3>
          <div className="round-score-cards">
            {players.map((p) => {
              const gained = payload.roundScores[p.id] || 0;
              return (
                <div key={p.id} className="round-player-row">
                  <div className="player-meta">
                    <Avatar avatar={p.avatar} size={32} />
                    <span className="player-name">{p.name}</span>
                  </div>
                  <div className="player-points">
                    {gained > 0 ? (
                      <span className="points-gained">+{gained} pts</span>
                    ) : (
                      <span className="points-zero">0 pts</span>
                    )}
                    <span className="points-total">({p.score} total)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next Drawer Info & Countdown */}
        <div className="next-turn-footer">
          {payload.nextDrawerName && (
            <p className="next-drawer-text">
              Next drawer: <strong>{payload.nextDrawerName}</strong>
            </p>
          )}
          <div className="countdown-pill">
            <Clock size={16} />
            <span>Next turn in {timeLeft}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
