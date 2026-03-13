/**
 * TopBar.js
 * Top navigation bar with game title, settings controls, and sound toggle.
 */

import React from 'react';

// PUBLIC_INTERFACE
/**
 * TopBar component displaying game title, sound toggle, and settings.
 * @param {object} props
 * @param {boolean} props.soundOn - Whether sound is enabled
 * @param {function} props.onSoundToggle - Callback to toggle sound
 * @param {string} props.gameStatus - Current game status ('menu'|'playing'|'gameover')
 * @param {function} props.onReturnToMenu - Callback to return to menu
 * @returns {JSX.Element}
 */
function TopBar({ soundOn, onSoundToggle, gameStatus, onReturnToMenu }) {
  return (
    <div className="top-bar">
      <div className="top-bar-left">
        {gameStatus !== 'menu' && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onReturnToMenu}
            aria-label="Return to main menu"
          >
            ← Menu
          </button>
        )}
        <h1 className="top-bar-title">🎯 Carrom Master Pro</h1>
      </div>
      <div className="top-bar-right">
        <button
          className="btn btn-icon"
          onClick={onSoundToggle}
          aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
          title={soundOn ? 'Sound On' : 'Sound Off'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </div>
  );
}

export default TopBar;
