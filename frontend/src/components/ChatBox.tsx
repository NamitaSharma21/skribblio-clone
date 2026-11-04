import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, PlayerPublic } from '../types.js';
import { Socket } from 'socket.io-client';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { soundService } from '../services/sound.js';

interface ChatBoxProps {
  socket: Socket;
  messages: ChatMessage[];
  currentPlayer: PlayerPublic | null;
  isDrawer: boolean;
  hasGuessed: boolean;
  gamePhase: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  socket,
  messages,
  currentPlayer,
  isDrawer,
  hasGuessed,
  gamePhase
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on message list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    socket.emit('send_message', { text });
    setInputText('');
  };

  const getPlaceholder = () => {
    if (gamePhase === 'DRAWING') {
      if (isDrawer) return 'You are drawing! Chat here...';
      if (hasGuessed) return 'You guessed the word! Chat with other guessers...';
      return 'Type your guess here...';
    }
    return 'Send a message in chat...';
  };

  return (
    <div className="chatbox-container">
      <div className="chatbox-header">
        <h3>Game Chat & Guesses</h3>
      </div>

      <div className="chat-messages-scroll">
        {messages.map((msg) => {
          if (msg.type === 'guess_correct') {
            return (
              <div key={msg.id} className="chat-message guess-correct">
                <CheckCircle2 size={16} className="msg-icon" />
                <span className="msg-text">{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'guess_close') {
            return (
              <div key={msg.id} className="chat-message guess-close">
                <AlertCircle size={16} className="msg-icon" />
                <span className="msg-text">{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="chat-message system-msg">
                <span className="msg-text">{msg.text}</span>
              </div>
            );
          }

          const isMe = currentPlayer && msg.senderId === currentPlayer.id;

          return (
            <div key={msg.id} className={`chat-message standard-msg ${isMe ? 'is-me' : ''}`}>
              <strong className="sender-name">{msg.senderName}: </strong>
              <span className="msg-body">{msg.text}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={getPlaceholder()}
          maxLength={100}
          className={`chat-input ${hasGuessed ? 'input-guessed' : ''}`}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!inputText.trim()}
          title="Send"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
