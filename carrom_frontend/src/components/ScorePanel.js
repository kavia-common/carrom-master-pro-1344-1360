/**
 * ScorePanel.js
 * Side panel displaying player scores, turn indicator, and pocketed pieces.
 */

import React from 'react';

// PUBLIC_INTERFACE
/**
 * ScorePanel component showing scores, turn indicator, and game info.
 * @param {object} props
 * @param {number} props.currentPlayer - Current player number (1 or 2)
 * @param {object} props.scores - { 1: number, 2: number }
 * @param {string} props.turnMessage - Current status message
 * @param {string} props.gameMode - 'local' | 'ai'
 * @param {Array<object>} props.pieces - All game pieces for counting pocketed
 * @returns {JSX.Element}
 */
function ScorePanel({ currentPlayer, scores, turnMessage, gameMode, pieces }) {
  const whitePocketed = pieces.filter(p => p.type === 'white' && p.pocketed).length;
  const blackPocketed = pieces.filter(p => p.type === 'black' && p.pocketed).length;
  const queenPocketed = pieces.find(p => p.type === 'queen' && p.pocketed);

  return (
    <div className="score-panel">
      <h2 className="panel-title">Score Board</h2>

      {/* Player 1 */}
      <div className={`player-card ${currentPlayer === 1 ? 'active' : ''}`}>
        <div className="player-header">
          <span className="player-dot player-dot-white"></span>
          <span className="player-name">Player 1</span>
          {currentPlayer === 1 && <span className="turn-badge">YOUR TURN</span>}
        </div>
        <div className="player-score">{scores[1]}</div>
        <div className="pocketed-info">
          ⚪ Pocketed: {whitePocketed}/9
        </div>
      </div>

      {/* Player 2 */}
      <div className={`player-card ${currentPlayer === 2 ? 'active' : ''}`}>
        <div className="player-header">
          <span className="player-dot player-dot-black"></span>
          <span className="player-name">
            {gameMode === 'ai' ? '🤖 AI' : 'Player 2'}
          </span>
          {currentPlayer === 2 && <span className="turn-badge">
            {gameMode === 'ai' ? 'AI TURN' : 'YOUR TURN'}
          </span>}
        </div>
        <div className="player-score">{scores[2]}</div>
        <div className="pocketed-info">
          ⚫ Pocketed: {blackPocketed}/9
        </div>
      </div>

      {/* Queen status */}
      <div className="queen-status">
        <span className="queen-icon">👑</span>
        <span>{queenPocketed ? 'Queen Pocketed' : 'Queen in Play'}</span>
      </div>

      {/* Turn message */}
      {turnMessage && (
        <div className="turn-message">{turnMessage}</div>
      )}
    </div>
  );
}

export default ScorePanel;
