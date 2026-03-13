/**
 * MainMenu.js
 * Main menu screen with game mode selection and difficulty settings.
 */

import React from 'react';

// PUBLIC_INTERFACE
/**
 * MainMenu component for selecting game mode and configuring settings.
 * @param {object} props
 * @param {function} props.onStartGame - Callback with mode ('local'|'ai')
 * @param {string} props.difficulty - Current difficulty level
 * @param {function} props.onDifficultyChange - Callback to change difficulty
 * @returns {JSX.Element}
 */
function MainMenu({ onStartGame, difficulty, onDifficultyChange }) {
  return (
    <div className="main-menu">
      <div className="menu-card">
        <div className="menu-logo">🎯</div>
        <h1 className="menu-title">Carrom Master Pro</h1>
        <p className="menu-subtitle">
          Classic carrom board game with realistic physics
        </p>

        <div className="menu-section">
          <h3 className="menu-section-title">Choose Game Mode</h3>
          <div className="menu-buttons">
            <button
              className="btn btn-primary btn-large"
              onClick={() => onStartGame('local')}
              aria-label="Start local multiplayer game"
            >
              👥 Local Multiplayer
              <span className="btn-desc">Play with a friend on the same device</span>
            </button>
            <button
              className="btn btn-accent btn-large"
              onClick={() => onStartGame('ai')}
              aria-label="Start game against AI"
            >
              🤖 Play vs AI
              <span className="btn-desc">Challenge the computer opponent</span>
            </button>
          </div>
        </div>

        <div className="menu-section">
          <h3 className="menu-section-title">AI Difficulty</h3>
          <div className="difficulty-selector">
            {['easy', 'medium', 'hard'].map((level) => (
              <button
                key={level}
                className={`btn btn-diff ${difficulty === level ? 'btn-diff-active' : ''}`}
                onClick={() => onDifficultyChange(level)}
                aria-label={`Set difficulty to ${level}`}
              >
                {level === 'easy' ? '😊' : level === 'medium' ? '🤔' : '😈'}{' '}
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="menu-rules">
          <h3 className="menu-section-title">How to Play</h3>
          <ul className="rules-list">
            <li>Drag to position the striker along your baseline</li>
            <li>Click and drag to aim, release to shoot</li>
            <li>Pocket your assigned pieces (white or black)</li>
            <li>Pocket the Queen and cover it with your own piece</li>
            <li>First player to pocket all their pieces wins!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
