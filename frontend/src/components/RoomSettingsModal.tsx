import React, { useState } from 'react';
import { RoomSettings } from '../types.js';
import { Socket } from 'socket.io-client';
import { Settings, X, Check } from 'lucide-react';

interface RoomSettingsModalProps {
  socket: Socket;
  settings: RoomSettings;
  isHost: boolean;
  onClose: () => void;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  socket,
  settings,
  isHost,
  onClose
}) => {
  const [maxPlayers, setMaxPlayers] = useState(settings.maxPlayers || 8);
  const [rounds, setRounds] = useState(settings.rounds || 3);
  const [drawTime, setDrawTime] = useState(settings.drawTime || 80);
  const [wordCount, setWordCount] = useState(settings.wordCount || 3);
  const [hints, setHints] = useState(settings.hints ?? 2);
  const [customWordsText, setCustomWordsText] = useState((settings.customWords || []).join(', '));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHost) return;

    const customWords = customWordsText
      .split(/[,\n]/)
      .map(w => w.trim())
      .filter(w => w.length > 1);

    const updated: Partial<RoomSettings> = {
      maxPlayers,
      rounds,
      drawTime,
      wordCount,
      hints,
      customWords
    };

    socket.emit('update_settings', updated);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="settings-modal-card">
        <div className="modal-header">
          <div className="modal-title-row">
            <Settings size={22} className="modal-icon" />
            <h2>Room Settings</h2>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="settings-form">
          {/* Max Players */}
          <div className="form-group">
            <div className="form-label-row">
              <label>Max Players</label>
              <span className="form-value-pill">{maxPlayers}</span>
            </div>
            <input
              type="range"
              min={2}
              max={20}
              value={maxPlayers}
              disabled={!isHost}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          {/* Rounds */}
          <div className="form-group">
            <div className="form-label-row">
              <label>Rounds</label>
              <span className="form-value-pill">{rounds}</span>
            </div>
            <input
              type="range"
              min={2}
              max={10}
              value={rounds}
              disabled={!isHost}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          {/* Draw Time */}
          <div className="form-group">
            <div className="form-label-row">
              <label>Draw Time (seconds)</label>
              <span className="form-value-pill">{drawTime}s</span>
            </div>
            <select
              value={drawTime}
              disabled={!isHost}
              onChange={(e) => setDrawTime(Number(e.target.value))}
              className="form-select"
            >
              <option value={30}>30 seconds (Fast)</option>
              <option value={45}>45 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={80}>80 seconds (Default)</option>
              <option value={100}>100 seconds</option>
              <option value={120}>120 seconds</option>
              <option value={180}>180 seconds</option>
              <option value={240}>240 seconds (Relaxed)</option>
            </select>
          </div>

          {/* Word Choices Count */}
          <div className="form-group">
            <div className="form-label-row">
              <label>Word Choices</label>
              <span className="form-value-pill">{wordCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={wordCount}
              disabled={!isHost}
              onChange={(e) => setWordCount(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          {/* Hints */}
          <div className="form-group">
            <div className="form-label-row">
              <label>Hints (revealed letters)</label>
              <span className="form-value-pill">{hints === 0 ? 'Disabled' : `${hints} hints`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              value={hints}
              disabled={!isHost}
              onChange={(e) => setHints(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          {/* Custom Words */}
          <div className="form-group">
            <label>Custom Words (Optional)</label>
            <textarea
              rows={3}
              value={customWordsText}
              disabled={!isHost}
              onChange={(e) => setCustomWordsText(e.target.value)}
              placeholder="e.g. Hogwarts, Pikachu, Minecraft, Avengers (comma separated)"
              className="form-textarea"
            />
            <span className="form-hint">Separate custom words with commas or new lines.</span>
          </div>

          {isHost ? (
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-cancel">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <Check size={18} />
                <span>Save Settings</span>
              </button>
            </div>
          ) : (
            <p className="host-only-note">Only the room host can modify these settings.</p>
          )}
        </form>
      </div>
    </div>
  );
};
