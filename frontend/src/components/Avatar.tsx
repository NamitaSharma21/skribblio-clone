import React from 'react';
import { PlayerAvatar } from '../types.js';

interface AvatarProps {
  avatar: PlayerAvatar;
  size?: number;
  className?: string;
}

export const AVATAR_COLORS = [
  '#f59e0b', // Yellow/Gold
  '#3b82f6', // Blue
  '#10b981', // Green
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#6366f1'  // Indigo
];

export const TOTAL_EYES = 6;
export const TOTAL_MOUTHS = 6;

export const Avatar: React.FC<AvatarProps> = ({ avatar, size = 48, className = '' }) => {
  const { color = '#f59e0b', eyes = 0, mouth = 0 } = avatar;

  const renderEyes = () => {
    switch (eyes % TOTAL_EYES) {
      case 1: // Happy curved arches
        return (
          <g stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M 32 46 Q 38 38 44 46" />
            <path d="M 56 46 Q 62 38 68 46" />
          </g>
        );
      case 2: // Wink (left eye dot, right eye wink)
        return (
          <g>
            <circle cx="38" cy="44" r="4.5" fill="#1e293b" />
            <path d="M 56 45 Q 62 39 68 45" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </g>
        );
      case 3: // Cool Sunglasses
        return (
          <g fill="#0f172a">
            <path d="M 28 38 L 48 38 L 46 48 L 30 48 Z" rx="3" />
            <path d="M 52 38 L 72 38 L 70 48 L 54 48 Z" rx="3" />
            <line x1="46" y1="41" x2="54" y2="41" stroke="#0f172a" strokeWidth="3" />
            <path d="M 31 40 L 45 40" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 55 40 L 69 40" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        );
      case 4: // Surprised wide eyes
        return (
          <g>
            <circle cx="37" cy="42" r="7" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
            <circle cx="63" cy="42" r="7" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
            <circle cx="37" cy="42" r="3.5" fill="#1e293b" />
            <circle cx="63" cy="42" r="3.5" fill="#1e293b" />
          </g>
        );
      case 5: // Sleepy eyes
        return (
          <g stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round">
            <line x1="30" y1="44" x2="44" y2="44" />
            <line x1="56" y1="44" x2="70" y2="44" />
          </g>
        );
      case 0: // Classic dots
      default:
        return (
          <g fill="#1e293b">
            <circle cx="38" cy="43" r="4.5" />
            <circle cx="62" cy="43" r="4.5" />
            <circle cx="39.5" cy="41.5" r="1.5" fill="#ffffff" />
            <circle cx="63.5" cy="41.5" r="1.5" fill="#ffffff" />
          </g>
        );
    }
  };

  const renderMouth = () => {
    switch (mouth % TOTAL_MOUTHS) {
      case 1: // Big toothy grin
        return (
          <g>
            <path d="M 34 60 Q 50 78 66 60 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
            <line x1="50" y1="60" x2="50" y2="69" stroke="#1e293b" strokeWidth="2" />
          </g>
        );
      case 2: // Tongue out
        return (
          <g>
            <path d="M 36 60 Q 50 74 64 60" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 46 64 C 46 73 54 73 54 64 Z" fill="#f43f5e" stroke="#1e293b" strokeWidth="2" />
          </g>
        );
      case 3: // Shocked "O"
        return (
          <ellipse cx="50" cy="65" rx="6" ry="8" fill="#1e293b" />
        );
      case 4: // Smirk / Side smile
        return (
          <path d="M 38 64 Q 56 68 64 57" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        );
      case 5: // Straight neutral line
        return (
          <line x1="38" y1="63" x2="62" y2="63" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
        );
      case 0: // Classic wide smile
      default:
        return (
          <path d="M 34 58 Q 50 74 66 58" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        );
    }
  };

  return (
    <div
      className={`avatar-wrapper ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
      >
        {/* Head Base */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill={color}
          stroke="#1e293b"
          strokeWidth="4"
        />

        {/* Subtle highlight */}
        <ellipse
          cx="42"
          cy="26"
          rx="18"
          ry="8"
          fill="#ffffff"
          opacity="0.3"
          transform="rotate(-15 42 26)"
        />

        {/* Cheeks blush */}
        <circle cx="28" cy="54" r="5" fill="#f43f5e" opacity="0.3" />
        <circle cx="72" cy="54" r="5" fill="#f43f5e" opacity="0.3" />

        {/* Eyes & Mouth */}
        {renderEyes()}
        {renderMouth()}
      </svg>
    </div>
  );
};
