/**
 * App.js
 * Root application component for Carrom Master Pro.
 * Integrates the game board, menus, score panel, and settings.
 */

import React, { useState, useCallback } from 'react';
import './App.css';
import TopBar from './components/TopBar';
import MainMenu from './components/MainMenu';
import CarromBoard from './components/CarromBoard';
import ScorePanel from './components/ScorePanel';
import GameOver from './components/GameOver';
import useGameState from './hooks/useGameState';
import { setSoundEnabled } from './engine/sound';

// PUBLIC_INTERFACE
/**
 * Main application component for Carrom Master Pro.
 * Manages top-level layout, routing between menu/game/gameover screens,
 * and coordinates game state with UI components.
 * @returns {JSX.Element}
 */
function App() {
  const [soundOn, setSoundOn] = useState(true);

  const gameState = useGameState();
  const {
    gameMode,
    difficulty,
    gameStatus,
    pieces,
    striker,
    currentPlayer,
    scores,
    turnMessage,
    winner,
    isSimulating,
    setDifficulty,
    setStriker,
    setIsSimulating,
    startGame,
    returnToMenu,
    processTurnResult,
    getStrikerY,
  } = gameState;

  // PUBLIC_INTERFACE
  /** Toggles sound on/off globally. */
  const handleSoundToggle = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      return next;
    });
  }, []);

  // PUBLIC_INTERFACE
  /** Handles simulation start from the board component. */
  const handleSimulationStart = useCallback(() => {
    setIsSimulating(true);
  }, [setIsSimulating]);

  // PUBLIC_INTERFACE
  /** Handles turn completion after physics simulation ends. */
  const handleTurnComplete = useCallback(
    (pocketedThisTurn, strikerPocketed, updatedPieces) => {
      processTurnResult(pocketedThisTurn, strikerPocketed, updatedPieces);
    },
    [processTurnResult]
  );

  // PUBLIC_INTERFACE
  /** Starts a new game with the same mode (play again). */
  const handlePlayAgain = useCallback(() => {
    if (gameMode) {
      startGame(gameMode);
    }
  }, [gameMode, startGame]);

  return (
    <div className="App">
      <TopBar
        soundOn={soundOn}
        onSoundToggle={handleSoundToggle}
        gameStatus={gameStatus}
        onReturnToMenu={returnToMenu}
      />

      {gameStatus === 'menu' && (
        <MainMenu
          onStartGame={startGame}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
        />
      )}

      {(gameStatus === 'playing' || gameStatus === 'gameover') && (
        <div className="game-layout">
          <div className="game-board-area">
            <CarromBoard
              pieces={pieces}
              striker={striker}
              currentPlayer={currentPlayer}
              gameMode={gameMode}
              difficulty={difficulty}
              gameStatus={gameStatus}
              isSimulating={isSimulating}
              onPiecesUpdate={() => {}}
              onStrikerUpdate={setStriker}
              onSimulationStart={handleSimulationStart}
              onTurnComplete={handleTurnComplete}
              getStrikerY={getStrikerY}
            />
          </div>
          <div className="game-side-panel">
            <ScorePanel
              currentPlayer={currentPlayer}
              scores={scores}
              turnMessage={turnMessage}
              gameMode={gameMode}
              pieces={pieces}
            />
          </div>
        </div>
      )}

      {gameStatus === 'gameover' && (
        <GameOver
          winner={winner}
          scores={scores}
          gameMode={gameMode}
          onPlayAgain={handlePlayAgain}
          onReturnToMenu={returnToMenu}
        />
      )}
    </div>
  );
}

export default App;
