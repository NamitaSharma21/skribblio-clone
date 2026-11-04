import React, { useState, useEffect } from 'react';
import { PlayerAvatar, PublicRoomInfo, RoomSettings } from '../types.js';
import { Socket } from 'socket.io-client';
import { AvatarCustomizer } from './AvatarCustomizer.js';
import { Play, PlusCircle, LogIn, Globe, Lock, RefreshCw, AlertCircle } from 'lucide-react';

interface HomeViewProps {
  socket: Socket;
  onRoomJoined: (data: any) => void;
  initialRoomCode?: string;
}

export const HomeView: React.FC<HomeViewProps> = ({
  socket,
  onRoomJoined,
  initialRoomCode = ''
}) => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('skribbl_player_name') || `Player_${Math.floor(100 + Math.random() * 900)}`;
  });

  const [avatar, setAvatar] = useState<PlayerAvatar>(() => {
    const saved = localStorage.getItem('skribbl_avatar');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      color: '#f59e0b',
      eyes: 0,
      mouth: 0
    };
  });

  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [isPrivate, setIsPrivate] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Persist name and avatar to localStorage
  useEffect(() => {
    localStorage.setItem('skribbl_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem('skribbl_avatar', JSON.stringify(avatar));
  }, [avatar]);

  // Fetch public rooms
  const refreshPublicRooms = () => {
    socket.emit('get_public_rooms', (rooms: PublicRoomInfo[]) => {
      setPublicRooms(rooms || []);
    });
  };

  useEffect(() => {
    refreshPublicRooms();
    const interval = setInterval(refreshPublicRooms, 5000);
    return () => clearInterval(interval);
  }, [socket]);

  // Handle Create Room
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    socket.emit('create_room', {
      hostName: playerName.trim(),
      avatar,
      isPrivate
    }, (res: any) => {
      setLoading(false);
      if (res && res.success) {
        onRoomJoined(res);
      } else {
        setErrorMessage(res?.error || 'Failed to create room.');
      }
    });
  };

  // Handle Join Room
  const handleJoinRoom = (targetRoomId?: string) => {
    const code = (targetRoomId || roomCodeInput).trim().toUpperCase();
    if (!playerName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (!code) {
      setErrorMessage('Please enter a room code.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    socket.emit('join_room', {
      roomId: code,
      playerName: playerName.trim(),
      avatar
    }, (res: any) => {
      setLoading(false);
      if (res && res.success) {
        onRoomJoined(res);
      } else {
        setErrorMessage(res?.error || 'Failed to join room.');
      }
    });
  };

  // Quick Play (joins first open public room, or creates one)
  const handleQuickPlay = () => {
    if (publicRooms.length > 0) {
      handleJoinRoom(publicRooms[0].id);
    } else {
      setIsPrivate(false);
      handleCreateRoom({ preventDefault: () => {} } as any);
    }
  };

  return (
    <div className="home-container">
      {/* Skribbl Hero Title */}
      <div className="home-hero">
        <h1 className="hero-title">
          <span className="brand-char c-blue">s</span>
          <span className="brand-char c-red">k</span>
          <span className="brand-char c-yellow">r</span>
          <span className="brand-char c-green">i</span>
          <span className="brand-char c-purple">b</span>
          <span className="brand-char c-orange">b</span>
          <span className="brand-char c-blue">l</span>
          <span className="brand-char c-pink">.</span>
          <span className="brand-char c-cyan">i</span>
          <span className="brand-char c-yellow">o</span>
        </h1>
        <p className="hero-subtitle">The Free Multiplayer Drawing & Guessing Game</p>
      </div>

      {errorMessage && (
        <div className="home-error-banner">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form Box */}
      <div className="home-card-grid">
        {/* Left: Player Profile & Avatar */}
        <div className="card-box profile-box">
          <h2 className="box-title">Choose Your Character</h2>

          <div className="name-input-group">
            <label htmlFor="player-name">Your Nickname</label>
            <input
              id="player-name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              placeholder="Enter your name..."
              className="player-name-input"
            />
          </div>

          <AvatarCustomizer avatar={avatar} onChange={setAvatar} />

          {/* Quick Play Button */}
          <button
            type="button"
            className="btn-primary btn-quick-play"
            onClick={handleQuickPlay}
            disabled={loading}
          >
            <Play size={20} />
            <span>Play Now (Quick Match)</span>
          </button>
        </div>

        {/* Right: Join / Create Actions */}
        <div className="card-box actions-box">
          {/* Join Room by Code */}
          <div className="action-section">
            <h3 className="section-heading">Join a Room</h3>
            <div className="join-input-row">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="ENTER ROOM CODE (e.g. ABC123)"
                maxLength={6}
                className="room-code-input"
              />
              <button
                type="button"
                className="btn-accent btn-join"
                onClick={() => handleJoinRoom()}
                disabled={loading || !roomCodeInput.trim()}
              >
                <LogIn size={18} />
                <span>Join</span>
              </button>
            </div>
          </div>

          <div className="home-divider">
            <span>OR</span>
          </div>

          {/* Create Room */}
          <div className="action-section">
            <h3 className="section-heading">Create a Custom Room</h3>
            <div className="privacy-toggle-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <span className="checkbox-custom" />
                <span className="toggle-text">
                  {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
                  {isPrivate ? 'Private Room (Invite Link Only)' : 'Public Room (Visible to everyone)'}
                </span>
              </label>
            </div>

            <button
              type="button"
              className="btn-secondary btn-create"
              onClick={handleCreateRoom}
              disabled={loading}
            >
              <PlusCircle size={18} />
              <span>Create New Room</span>
            </button>
          </div>

          <div className="home-divider">
            <span>PUBLIC ROOMS</span>
          </div>

          {/* Public Rooms List */}
          <div className="public-rooms-section">
            <div className="public-rooms-header">
              <span>Open Public Rooms ({publicRooms.length})</span>
              <button
                type="button"
                onClick={refreshPublicRooms}
                className="btn-refresh"
                title="Refresh room list"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="public-rooms-list">
              {publicRooms.length === 0 ? (
                <div className="no-rooms-message">No public rooms currently open. Create one!</div>
              ) : (
                publicRooms.map((room) => (
                  <div key={room.id} className="public-room-item">
                    <div className="room-meta">
                      <span className="room-name">{room.name}</span>
                      <span className="room-tag">
                        Round {room.round}/{room.totalRounds} • {room.phase}
                      </span>
                    </div>
                    <div className="room-action">
                      <span className="room-players-count">
                        {room.playerCount}/{room.maxPlayers}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleJoinRoom(room.id)}
                        className="btn-join-room-small"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
