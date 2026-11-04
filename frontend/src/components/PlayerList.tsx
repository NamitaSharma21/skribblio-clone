import React from 'react';
import { PlayerPublic } from '../types.js';
import { Avatar } from './Avatar.js';
import { Crown, Paintbrush, Check, WifiOff } from 'lucide-react';

interface PlayerListProps {
  players: PlayerPublic[];
  currentUserId?: string;
  drawerId?: string | null;
}

export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  currentUserId,
  drawerId
}) => {
  // Sort players by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="player-list-container">
      <div className="player-list-header">
        <h3>Players ({players.length})</h3>
      </div>

      <div className="player-cards-scroll">
        {sortedPlayers.map((player, index) => {
          const isDrawer = player.id === drawerId || player.isDrawing;
          const isMe = player.id === currentUserId;

          return (
            <div
              key={player.id}
              className={`player-card ${isMe ? 'player-is-me' : ''} ${player.hasGuessed ? 'player-has-guessed' : ''} ${isDrawer ? 'player-is-drawer' : ''}`}
            >
              {/* Rank Position */}
              <div className="player-rank">#{index + 1}</div>

              {/* Avatar */}
              <div className="player-avatar-cell">
                <Avatar avatar={player.avatar} size={42} />
                {player.isHost && (
                  <span className="host-badge" title="Room Host">
                    <Crown size={14} />
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="player-details">
                <div className="player-name-row">
                  <span className="player-name" title={player.name}>
                    {player.name}
                  </span>
                  {isMe && <span className="you-pill">You</span>}
                </div>
                <div className="player-score-row">
                  <span className="player-score">{player.score} pts</span>
                </div>
              </div>

              {/* Status Icons */}
              <div className="player-status-badge">
                {!player.connected && (
                  <span className="status-icon disconnected" title="Disconnected">
                    <WifiOff size={16} />
                  </span>
                )}
                {isDrawer && (
                  <span className="status-icon drawing" title="Drawing now">
                    <Paintbrush size={18} />
                  </span>
                )}
                {player.hasGuessed && !isDrawer && (
                  <span className="status-icon guessed" title="Guessed correctly!">
                    <Check size={18} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
