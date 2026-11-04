import React from 'react';
import { WordChoice } from '../types.js';
import { Socket } from 'socket.io-client';
import { Sparkles, Clock } from 'lucide-react';

interface WordSelectorModalProps {
  socket: Socket;
  isDrawer: boolean;
  drawerName: string;
  wordChoices?: WordChoice[];
  timeLeft: number;
}

export const WordSelectorModal: React.FC<WordSelectorModalProps> = ({
  socket,
  isDrawer,
  drawerName,
  wordChoices = [],
  timeLeft
}) => {
  const handleSelectWord = (word: string) => {
    socket.emit('word_chosen', { word });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#10b981'; // Green
      case 'hard':
        return '#ef4444'; // Red
      case 'medium':
      default:
        return '#f59e0b'; // Amber
    }
  };

  return (
    <div className="word-selector-overlay">
      <div className="word-selector-card">
        <div className="modal-timer-badge">
          <Clock size={18} />
          <span>{timeLeft}s</span>
        </div>

        {isDrawer ? (
          <>
            <h2 className="modal-title">
              <Sparkles size={24} className="title-icon" /> Choose a Word to Draw
            </h2>
            <p className="modal-subtitle">Pick one of the options before the timer runs out!</p>

            <div className="word-cards-grid">
              {wordChoices.map((choice) => (
                <button
                  key={choice.word}
                  type="button"
                  className="word-choice-btn"
                  onClick={() => handleSelectWord(choice.word)}
                >
                  <span className="choice-word">{choice.word}</span>
                  <div className="choice-meta">
                    <span className="choice-category">{choice.category}</span>
                    <span
                      className="choice-difficulty"
                      style={{ color: getDifficultyColor(choice.difficulty) }}
                    >
                      {choice.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="waiting-drawer-message">
            <h2 className="modal-title">Waiting for Word</h2>
            <p className="modal-subtitle">
              <strong>{drawerName || 'The drawer'}</strong> is choosing a word to draw...
            </p>
            <div className="bouncing-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
