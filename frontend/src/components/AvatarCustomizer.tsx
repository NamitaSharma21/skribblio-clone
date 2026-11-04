import React from 'react';
import { PlayerAvatar } from '../types.js';
import { Avatar, AVATAR_COLORS, TOTAL_EYES, TOTAL_MOUTHS } from './Avatar.js';
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';

interface AvatarCustomizerProps {
  avatar: PlayerAvatar;
  onChange: (avatar: PlayerAvatar) => void;
}

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({ avatar, onChange }) => {
  const cycleColor = (direction: number) => {
    const currentIndex = AVATAR_COLORS.indexOf(avatar.color);
    const nextIndex = (currentIndex + direction + AVATAR_COLORS.length) % AVATAR_COLORS.length;
    onChange({ ...avatar, color: AVATAR_COLORS[nextIndex] });
  };

  const cycleEyes = (direction: number) => {
    const nextEyes = (avatar.eyes + direction + TOTAL_EYES) % TOTAL_EYES;
    onChange({ ...avatar, eyes: nextEyes });
  };

  const cycleMouth = (direction: number) => {
    const nextMouth = (avatar.mouth + direction + TOTAL_MOUTHS) % TOTAL_MOUTHS;
    onChange({ ...avatar, mouth: nextMouth });
  };

  const randomize = () => {
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const randomEyes = Math.floor(Math.random() * TOTAL_EYES);
    const randomMouth = Math.floor(Math.random() * TOTAL_MOUTHS);
    onChange({ color: randomColor, eyes: randomEyes, mouth: randomMouth });
  };

  return (
    <div className="avatar-customizer">
      <div className="avatar-preview-area">
        <Avatar avatar={avatar} size={110} />
        <button
          type="button"
          onClick={randomize}
          className="btn-randomize"
          title="Randomize Avatar"
          aria-label="Randomize Avatar"
        >
          <Shuffle size={16} />
        </button>
      </div>

      <div className="customizer-controls">
        {/* Color Selector */}
        <div className="control-row">
          <span className="control-label">Color</span>
          <div className="control-stepper">
            <button type="button" onClick={() => cycleColor(-1)} className="btn-step" aria-label="Previous Color">
              <ChevronLeft size={18} />
            </button>
            <div className="color-swatch-indicator" style={{ backgroundColor: avatar.color }} />
            <button type="button" onClick={() => cycleColor(1)} className="btn-step" aria-label="Next Color">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Eyes Selector */}
        <div className="control-row">
          <span className="control-label">Eyes</span>
          <div className="control-stepper">
            <button type="button" onClick={() => cycleEyes(-1)} className="btn-step" aria-label="Previous Eyes">
              <ChevronLeft size={18} />
            </button>
            <span className="step-count">{avatar.eyes + 1} / {TOTAL_EYES}</span>
            <button type="button" onClick={() => cycleEyes(1)} className="btn-step" aria-label="Next Eyes">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Mouth Selector */}
        <div className="control-row">
          <span className="control-label">Mouth</span>
          <div className="control-stepper">
            <button type="button" onClick={() => cycleMouth(-1)} className="btn-step" aria-label="Previous Mouth">
              <ChevronLeft size={18} />
            </button>
            <span className="step-count">{avatar.mouth + 1} / {TOTAL_MOUTHS}</span>
            <button type="button" onClick={() => cycleMouth(1)} className="btn-step" aria-label="Next Mouth">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Color Palette dots */}
      <div className="color-palette-dots">
        {AVATAR_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`color-dot ${avatar.color === c ? 'active' : ''}`}
            style={{ backgroundColor: c }}
            onClick={() => onChange({ ...avatar, color: c })}
            aria-label={`Select color ${c}`}
          />
        ))}
      </div>
    </div>
  );
};
