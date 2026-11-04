import React, { useState } from 'react';
import { PlayerPublic, RoomSettings } from '../types.js';
import { Socket } from 'socket.io-client';
import { Avatar } from './Avatar.js';
import { Crown, Play, Settings, Copy, Check, Users, Clock, ShieldCheck, Share2 } from 'lucide-react';

interface LobbyViewProps {
  socket: Socket;
  roomId: string;
  players: PlayerPublic[];
  currentPlayer: PlayerPublic | null;
  settings: RoomSettings;
  onOpenSettings: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  socket,
  roomId,
  players,
  currentPlayer,
  settings,
  onOpenSettings
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isHost = currentPlayer?.isHost;
  const canStart = players.length >= 2;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleStartGame = () => {
    setErrorMessage('');
    socket.emit('start_game', (res: any) => {
      if (res && !res.success) {
        setErrorMessage(res.error || 'Failed to start game');
      }
    });
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        {/* Lobby Header */}
        <div className="lobby-header-section">
          <h2 className="lobby-title">Game Lobby</h2>
          <p className="lobby-desc">Waiting for the host to start the match...</p>

          <div className="invite-actions-row">
            <button type="button" onClick={handleCopyCode} className="btn-code-copy">
              <span>Code: <strong>{roomId}</strong></span>
              {copiedCode ? <Check size={16} className="text-green" /> : <Copy size={16} />}
            </button>

            <button type="button" onClick={handleCopyInviteLink} className="btn-invite-copy">
              <Share2 size={16} />
              <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
            </button>
          </div>
        </div>

        {/* Players Grid */}
        <div className="lobby-players-section">
          <div className="section-title-row">
            <Users size={18} />
            <h3>Players ({players.length} / {settings.maxPlayers})</h3>
          </div>

          <div className="lobby-players-grid">
            {players.map((p) => {
              const isMe = p.id === currentPlayer?.id;
              return (
                <div key={p.id} className={`lobby-player-box ${isMe ? 'player-box-me' : ''}`}>
                  <div className="lobby-avatar-wrap">
                    <Avatar avatar={p.avatar} size={64} />
                    {p.isHost && (
                      <span className="lobby-host-crown" title="Room Host">
                        <Crown size={16} />
                      </span>
                    )}
                  </div>
                  <span className="lobby-player-name">{p.name} {isMe ? '(You)' : ''}</span>
                </div>
              );
            })}

            {/* Empty slots placeholders */}
            {Array.from({ length: Math.max(0, Math.min(6, settings.maxPlayers - players.length)) }).map((_, i) => (
              <div key={`empty-${i}`} className="lobby-empty-slot">
                <span className="empty-slot-plus">+</span>
                <span className="empty-slot-text">Waiting...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Room Settings Overview */}
        <div className="lobby-settings-summary">
          <div className="summary-item">
            <Clock size={16} />
            <span>Draw Time: <strong>{settings.drawTime}s</strong></span>
          </div>
          <div className="summary-item">
            <ShieldCheck size={16} />
            <span>Rounds: <strong>{settings.rounds}</strong></span>
          </div>
          <div className="summary-item">
            <span>Hints: <strong>{settings.hints}</strong></span>
          </div>
          <div className="summary-item">
            <span>Words: <strong>{settings.wordCount}</strong> choices</span>
          </div>
        </div>

        {errorMessage && (
          <div className="lobby-error-banner">{errorMessage}</div>
        )}

        {/* Host Actions */}
        <div className="lobby-actions-footer">
          {isHost ? (
            <div className="host-buttons-row">
              <button
                type="button"
                className="btn-secondary btn-settings"
                onClick={onOpenSettings}
              >
                <Settings size={18} />
                <span>Room Settings</span>
              </button>

              <button
                type="button"
                className="btn-primary btn-start-game"
                disabled={!canStart}
                onClick={handleStartGame}
              >
                <Play size={18} />
                <span>{canStart ? 'Start Game' : 'Waiting for Players (min 2)'}</span>
              </button>
            </div>
          ) : (
            <div className="waiting-host-box">
              <span className="pulse-indicator" />
              <span>Waiting for <strong>{players.find(p => p.isHost)?.name || 'the host'}</strong> to start the game...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
