/**
 * useGameState.js
 * Custom React hook managing carrom game state: turns, scoring, mode, and game flow.
 */

import { useState, useCallback, useRef } from 'react';
import {
  createInitialPieces,
  createStriker,
  BOARD_SIZE,
  BOARD_PADDING,
} from '../engine/physics';
import {
  playPocketSound,
  playFoulSound,
  playTurnSound,
  playGameOverSound,
} from '../engine/sound';

/** Striker baseline Y positions for bottom and top players */
const STRIKER_Y_BOTTOM = BOARD_SIZE - BOARD_PADDING - 60;
const STRIKER_Y_TOP = BOARD_PADDING + 60;

// PUBLIC_INTERFACE
/**
 * React hook for managing carrom game state.
 * Handles game modes, turns, scoring, fouls, and win conditions.
 * @returns {object} Game state and control functions
 */
export default function useGameState() {
  // Game configuration
  const [gameMode, setGameMode] = useState(null); // 'local' | 'ai'
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [gameStatus, setGameStatus] = useState('menu'); // 'menu' | 'playing' | 'gameover'

  // Game pieces
  const [pieces, setPieces] = useState([]);
  const [striker, setStriker] = useState(null);

  // Turn / scoring
  const [currentPlayer, setCurrentPlayer] = useState(1); // 1 or 2
  const [scores, setScores] = useState({ 1: 0, 2: 0 });
  const [queenClaimed, setQueenClaimed] = useState(false);
  const [queenClaimedBy, setQueenClaimedBy] = useState(null);
  const [pendingQueenCover, setPendingQueenCover] = useState(false);
  const [turnMessage, setTurnMessage] = useState('');
  const [winner, setWinner] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Foul tracking
  const consecutiveFouls = useRef({ 1: 0, 2: 0 });

  // PUBLIC_INTERFACE
  /**
   * Starts a new game with the given mode.
   * @param {'local'|'ai'} mode - Game mode
   */
  const startGame = useCallback((mode) => {
    setGameMode(mode);
    setGameStatus('playing');
    setCurrentPlayer(1);
    setScores({ 1: 0, 2: 0 });
    setQueenClaimed(false);
    setQueenClaimedBy(null);
    setPendingQueenCover(false);
    setWinner(null);
    setTurnMessage('Player 1\'s turn');
    consecutiveFouls.current = { 1: 0, 2: 0 };

    const initialPieces = createInitialPieces();
    setPieces(initialPieces);

    const newStriker = createStriker(BOARD_SIZE / 2, STRIKER_Y_BOTTOM);
    setStriker(newStriker);
    setIsSimulating(false);
  }, []);

  // PUBLIC_INTERFACE
  /**
   * Returns to the main menu.
   */
  const returnToMenu = useCallback(() => {
    setGameStatus('menu');
    setGameMode(null);
    setPieces([]);
    setStriker(null);
    setWinner(null);
  }, []);

  /**
   * Gets the striker Y position for a given player.
   * @param {number} player - Player number (1 or 2)
   * @returns {number} Y position
   */
  const getStrikerY = useCallback((player) => {
    return player === 1 ? STRIKER_Y_BOTTOM : STRIKER_Y_TOP;
  }, []);

  // PUBLIC_INTERFACE
  /**
   * Processes the result after a turn's simulation completes.
   * Handles scoring, fouls, queen logic, and turn switching.
   * @param {Array<object>} pocketedThisTurn - Pieces pocketed during the turn
   * @param {boolean} strikerPocketed - Whether the striker was pocketed
   * @param {Array<object>} updatedPieces - Updated pieces array after simulation
   */
  const processTurnResult = useCallback((pocketedThisTurn, strikerPocketed, updatedPieces) => {
    const player = currentPlayer;
    let newScores = { ...scores };
    let isFoul = strikerPocketed;
    let message = '';
    let queenPocketed = pocketedThisTurn.some(p => p.type === 'queen');
    let ownPiecesPocketed = pocketedThisTurn.filter(p => {
      if (player === 1) return p.type === 'white';
      return p.type === 'black';
    });
    let opponentPiecesPocketed = pocketedThisTurn.filter(p => {
      if (player === 1) return p.type === 'black';
      return p.type === 'white';
    });

    // Handle foul: striker pocketed
    if (isFoul) {
      playFoulSound();
      consecutiveFouls.current[player]++;
      newScores[player] = Math.max(0, newScores[player] - 1);
      message = `Foul! Player ${player} loses 1 point.`;

      // Return a pocketed piece for penalty
      const returnPiece = updatedPieces.find(p => p.pocketed && p.type !== 'striker' && p.type !== 'queen');
      if (returnPiece) {
        returnPiece.pocketed = false;
        returnPiece.x = BOARD_SIZE / 2;
        returnPiece.y = BOARD_SIZE / 2;
        returnPiece.vx = 0;
        returnPiece.vy = 0;
      }

      // 3 consecutive fouls: extra penalty
      if (consecutiveFouls.current[player] >= 3) {
        newScores[player] = Math.max(0, newScores[player] - 2);
        consecutiveFouls.current[player] = 0;
        message += ' 3 consecutive fouls! Extra penalty.';
      }

      // If queen was claimed by this player but pending cover, lose queen claim
      if (pendingQueenCover && queenClaimedBy === player) {
        setPendingQueenCover(false);
        setQueenClaimedBy(null);
        // Return queen to center
        const queen = updatedPieces.find(p => p.type === 'queen');
        if (queen) {
          queen.pocketed = false;
          queen.x = BOARD_SIZE / 2;
          queen.y = BOARD_SIZE / 2;
          queen.vx = 0;
          queen.vy = 0;
        }
      }
    } else {
      // No foul
      consecutiveFouls.current[player] = 0;

      // Score own pieces
      newScores[player] += ownPiecesPocketed.length;

      // Opponent pieces pocketed count as a gift to opponent
      const otherPlayer = player === 1 ? 2 : 1;
      newScores[otherPlayer] += opponentPiecesPocketed.length;

      // Queen logic
      if (queenPocketed && !queenClaimed) {
        setQueenClaimedBy(player);
        setPendingQueenCover(true);
        message = `Player ${player} pocketed the Queen! Must cover with own piece.`;
      }

      // Check if pending queen cover is satisfied
      if (pendingQueenCover && queenClaimedBy === player && ownPiecesPocketed.length > 0) {
        setQueenClaimed(true);
        setPendingQueenCover(false);
        newScores[player] += 3; // Queen bonus
        if (!message) message = `Player ${player} covered the Queen! +3 bonus.`;
        else message += ' Queen covered! +3 bonus.';
        playPocketSound();
      } else if (pendingQueenCover && queenClaimedBy === player && ownPiecesPocketed.length === 0 && !queenPocketed) {
        // Failed to cover queen
        setPendingQueenCover(false);
        setQueenClaimedBy(null);
        const queen = updatedPieces.find(p => p.type === 'queen');
        if (queen) {
          queen.pocketed = false;
          queen.x = BOARD_SIZE / 2;
          queen.y = BOARD_SIZE / 2;
        }
        message = 'Failed to cover Queen. Queen returned to center.';
      }

      if (pocketedThisTurn.length > 0 && !isFoul) {
        playPocketSound();
        if (!message) message = `Player ${player} pocketed ${pocketedThisTurn.length} piece(s)!`;
      }
    }

    setScores(newScores);

    // Check win condition: all own pieces pocketed
    const player1Remaining = updatedPieces.filter(p => p.type === 'white' && !p.pocketed).length;
    const player2Remaining = updatedPieces.filter(p => p.type === 'black' && !p.pocketed).length;
    const queenRemaining = updatedPieces.filter(p => p.type === 'queen' && !p.pocketed).length;

    if (player1Remaining === 0 && (queenRemaining === 0 || queenClaimed)) {
      setWinner(1);
      setGameStatus('gameover');
      playGameOverSound();
      setTurnMessage('Player 1 wins!');
      setPieces([...updatedPieces]);
      return;
    }
    if (player2Remaining === 0 && (queenRemaining === 0 || queenClaimed)) {
      setWinner(2);
      setGameStatus('gameover');
      playGameOverSound();
      setTurnMessage('Player 2 wins!');
      setPieces([...updatedPieces]);
      return;
    }

    // Switch turn (stay if pocketed own piece and no foul)
    let nextPlayer;
    if (!isFoul && ownPiecesPocketed.length > 0) {
      nextPlayer = player; // Extra turn
      if (!message) message = `Player ${player} gets another turn!`;
    } else {
      nextPlayer = player === 1 ? 2 : 1;
      playTurnSound();
    }

    if (!message) message = `Player ${nextPlayer}'s turn`;
    setTurnMessage(message);
    setCurrentPlayer(nextPlayer);
    setPieces([...updatedPieces]);

    // Reset striker for next turn
    const newStriker = createStriker(BOARD_SIZE / 2, getStrikerY(nextPlayer));
    setStriker(newStriker);
    setIsSimulating(false);
  }, [currentPlayer, scores, queenClaimed, queenClaimedBy, pendingQueenCover, getStrikerY]);

  return {
    // State
    gameMode,
    difficulty,
    gameStatus,
    pieces,
    striker,
    currentPlayer,
    scores,
    queenClaimed,
    turnMessage,
    winner,
    isSimulating,
    // Setters
    setDifficulty,
    setPieces,
    setStriker,
    setIsSimulating,
    setTurnMessage,
    // Actions
    startGame,
    returnToMenu,
    processTurnResult,
    getStrikerY,
  };
}
