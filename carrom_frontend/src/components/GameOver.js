/**
 * GameOver.js
 * Game over overlay displaying winner, scores, and replay options.
 */

import React from 'react';

// PUBLIC_INTERFACE
/**
 * GameOver component showing the final game result and replay options.
 * @param {object} props
 * @param {number|null} props.winner - Winning player number (1 or 2)
 * @param {object} props.scores - { 1: number, 2: number }
 * @param {string} props.gameMode - 'local' | 'ai'
 * @param {function} props.onPlayAgain - Callback to restart with same mode
 * @param {function} props.onReturnToMenu - Callback to return to menu
 * @returns {JSX.Element}
 */
function GameOver({ winner, scores, gameMode, onPlayAgain, onReturnToMenu }) {
  const isAI = gameMode === 'ai';
  const winnerName = winner === 1
    ? 'Player 1'
    : (isAI ? 'AI' : 'Player 2');

  const winnerEmoji = winner === 1 ? '🏆' : (isAI ? '🤖' : '🏆');

  return (
    <div className="game-over-overlay" role="dialog" aria-label="Game Over">
      <div className="game-over-card">
        <div className="game-over-emoji">{winnerEmoji}</div>
        <h2 className="game-over-title">Game Over!</h2>
        <p className="game-over-winner">{winnerName} Wins!</p>

        <div className="game-over-scores">
          <div className="final-score">
            <span className="final-score-label">Player 1</span>
            <span className="final-score-value">{scores[1]}</span>
          </div>
          <div className="final-score-divider">vs</div>
          <div className="final-score">
            <span className="final-score-label">
              {isAI ? '🤖 AI' : 'Player 2'}
            </span>
            <span className="final-score-value">{scores[2]}</span>
          </div>
        </div>

        <div className="game-over-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={onPlayAgain}
            aria-label="Play again"
          >
            🔄 Play Again
          </button>
          <button
            className="btn btn-secondary"
            onClick={onReturnToMenu}
            aria-label="Return to menu"
          >
            ← Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameOver;
