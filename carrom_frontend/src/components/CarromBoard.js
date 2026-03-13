/**
 * CarromBoard.js
 * Main canvas component that renders the carrom board and handles
 * mouse/touch interactions for striker placement, aiming, and shooting.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { renderBoard } from '../engine/renderer';
import {
  BOARD_SIZE,
  BOARD_PADDING,
  physicsStep,
  launchStriker,
  createStriker,
} from '../engine/physics';
import { playStrikerSound } from '../engine/sound';
import { computeAIMove } from '../engine/ai';

/** Striker baseline constraints */
const BASELINE_MIN_X = BOARD_PADDING + 80;
const BASELINE_MAX_X = BOARD_SIZE - BOARD_PADDING - 80;

// PUBLIC_INTERFACE
/**
 * CarromBoard canvas component.
 * Handles rendering, user input for striker aiming/shooting, physics simulation loop.
 * @param {object} props
 * @param {Array<object>} props.pieces - Game pieces
 * @param {object|null} props.striker - Striker piece
 * @param {number} props.currentPlayer - Current player (1 or 2)
 * @param {string} props.gameMode - 'local' | 'ai'
 * @param {string} props.difficulty - AI difficulty
 * @param {string} props.gameStatus - 'menu' | 'playing' | 'gameover'
 * @param {boolean} props.isSimulating - Whether physics is running
 * @param {function} props.onPiecesUpdate - Callback with updated pieces
 * @param {function} props.onStrikerUpdate - Callback with updated striker
 * @param {function} props.onSimulationStart - Callback when simulation starts
 * @param {function} props.onTurnComplete - Callback with turn result
 * @param {function} props.getStrikerY - Function to get striker Y for a player
 * @returns {JSX.Element}
 */
function CarromBoard({
  pieces,
  striker,
  currentPlayer,
  gameMode,
  difficulty,
  gameStatus,
  isSimulating,
  onPiecesUpdate,
  onStrikerUpdate,
  onSimulationStart,
  onTurnComplete,
  getStrikerY,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState(500);

  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [isAiming, setIsAiming] = useState(false);
  const [aimState, setAimState] = useState(null); // { angle, power }
  const dragStartRef = useRef(null);

  // Animation frame reference
  const animFrameRef = useRef(null);
  const simulatingRef = useRef(false);
  const pocketedThisTurnRef = useRef([]);

  // Responsive canvas sizing
  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const maxSize = Math.min(containerWidth - 16, 600, window.innerHeight - 200);
        setCanvasSize(Math.max(280, maxSize));
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    renderBoard(ctx, canvasSize, pieces, striker, aimState, null, isAiming);
  }, [pieces, striker, aimState, canvasSize, isAiming]);

  // Physics simulation loop
  const runSimulation = useCallback(() => {
    simulatingRef.current = true;
    pocketedThisTurnRef.current = [];

    const allPieces = [...pieces];
    const simStriker = striker ? { ...striker } : null;
    const simPiecesWithStriker = simStriker ? [...allPieces, simStriker] : [...allPieces];

    let frameCount = 0;
    const maxFrames = 600; // Safety limit

    function step() {
      if (frameCount > maxFrames) {
        finishSimulation(simPiecesWithStriker, simStriker);
        return;
      }
      frameCount++;

      const result = physicsStep(simPiecesWithStriker);

      // Track newly pocketed pieces
      if (result.newlyPocketed.length > 0) {
        pocketedThisTurnRef.current.push(...result.newlyPocketed);
      }

      // Update canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const justPieces = simPiecesWithStriker.filter(p => p.type !== 'striker');
        const currentStriker = simPiecesWithStriker.find(p => p.type === 'striker');
        renderBoard(ctx, canvasSize, justPieces, currentStriker, null, null, false);
      }

      if (result.moving) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        finishSimulation(simPiecesWithStriker, simStriker);
      }
    }

    function finishSimulation(allPcs, str) {
      simulatingRef.current = false;
      const justPieces = allPcs.filter(p => p.type !== 'striker');
      const strikerPocketed = str ? str.pocketed : false;
      const pocketed = pocketedThisTurnRef.current.filter(p => p.type !== 'striker');

      onTurnComplete(pocketed, strikerPocketed, justPieces);
    }

    animFrameRef.current = requestAnimationFrame(step);
  }, [pieces, striker, canvasSize, onTurnComplete]);

  // Start simulation when isSimulating becomes true
  useEffect(() => {
    if (isSimulating && !simulatingRef.current) {
      runSimulation();
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSimulating, runSimulation]);

  // AI turn handling
  useEffect(() => {
    if (
      gameMode === 'ai' &&
      currentPlayer === 2 &&
      gameStatus === 'playing' &&
      !isSimulating &&
      striker &&
      pieces.length > 0
    ) {
      const aiTimer = setTimeout(() => {
        const move = computeAIMove(pieces, striker, difficulty);

        // Position striker
        const newStriker = createStriker(move.strikerX, getStrikerY(2));
        launchStriker(newStriker, move.angle, move.power);
        playStrikerSound();

        onStrikerUpdate(newStriker);
        onSimulationStart();
      }, 800);

      return () => clearTimeout(aiTimer);
    }
  }, [gameMode, currentPlayer, gameStatus, isSimulating, striker, pieces, difficulty, getStrikerY, onStrikerUpdate, onSimulationStart]);

  // Convert mouse/touch coordinates to board coordinates
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scale = BOARD_SIZE / canvasSize;
    return {
      x: (clientX - rect.left) * scale,
      y: (clientY - rect.top) * scale,
    };
  }, [canvasSize]);

  // Check if it's human's turn
  const isHumanTurn = gameStatus === 'playing' && !isSimulating && 
    (gameMode === 'local' || currentPlayer === 1);

  // Mouse/Touch handlers
  const handlePointerDown = useCallback((e) => {
    if (!isHumanTurn || !striker) return;
    e.preventDefault();

    const coords = getCanvasCoords(e);
    const dx = coords.x - striker.x;
    const dy = coords.y - striker.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < striker.radius * 3) {
      // Start aiming from striker
      setIsAiming(true);
      dragStartRef.current = { x: coords.x, y: coords.y };
    } else {
      // Move striker along baseline
      const newX = Math.max(BASELINE_MIN_X, Math.min(BASELINE_MAX_X, coords.x));
      const newStriker = createStriker(newX, getStrikerY(currentPlayer));
      onStrikerUpdate(newStriker);
      setIsDragging(true);
    }
  }, [isHumanTurn, striker, getCanvasCoords, currentPlayer, getStrikerY, onStrikerUpdate]);

  const handlePointerMove = useCallback((e) => {
    if (!striker) return;
    e.preventDefault();

    const coords = getCanvasCoords(e);

    if (isDragging) {
      const newX = Math.max(BASELINE_MIN_X, Math.min(BASELINE_MAX_X, coords.x));
      const newStriker = createStriker(newX, getStrikerY(currentPlayer));
      onStrikerUpdate(newStriker);
    }

    if (isAiming && dragStartRef.current) {
      const dx = coords.x - striker.x;
      const dy = coords.y - striker.y;
      const angle = Math.atan2(dy, dx);

      // Power based on drag distance from start
      const dragDx = coords.x - dragStartRef.current.x;
      const dragDy = coords.y - dragStartRef.current.y;
      const dragDist = Math.sqrt(dragDx * dragDx + dragDy * dragDy);
      const power = Math.min(1, dragDist / 150);

      setAimState({ angle, power });
    }
  }, [isDragging, isAiming, striker, getCanvasCoords, currentPlayer, getStrikerY, onStrikerUpdate]);

  const handlePointerUp = useCallback((e) => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (isAiming && aimState && striker) {
      // Launch striker
      const launchedStriker = { ...striker };
      launchStriker(launchedStriker, aimState.angle, aimState.power);
      playStrikerSound();
      onStrikerUpdate(launchedStriker);
      onSimulationStart();

      setIsAiming(false);
      setAimState(null);
      dragStartRef.current = null;
    }
  }, [isDragging, isAiming, aimState, striker, onStrikerUpdate, onSimulationStart]);

  // Prevent context menu on canvas
  const handleContextMenu = useCallback((e) => e.preventDefault(), []);

  return (
    <div className="carrom-board-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="carrom-canvas"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onContextMenu={handleContextMenu}
        style={{ width: canvasSize, height: canvasSize }}
        aria-label="Carrom game board"
        role="img"
      />
      {isHumanTurn && !isAiming && !isSimulating && (
        <div className="board-hint">
          Click near the striker to aim • Click elsewhere to reposition
        </div>
      )}
      {isSimulating && (
        <div className="board-hint simulating">
          ⏳ Simulating...
        </div>
      )}
    </div>
  );
}

export default CarromBoard;
