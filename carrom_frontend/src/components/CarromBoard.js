/**
 * CarromBoard.js
 * Main canvas component that renders the carrom board and handles
 * mouse/touch interactions for striker placement, aiming, and shooting.
 * Enhanced with smoother physics sub-stepping, interpolated rendering,
 * and polished visual feedback.
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

/** Number of physics sub-steps per animation frame for smoother movement */
const PHYSICS_SUB_STEPS = 3;

/** Maximum simulation frames before force-stop (safety limit) */
const MAX_SIM_FRAMES = 800;

// PUBLIC_INTERFACE
/**
 * CarromBoard canvas component.
 * Handles rendering, user input for striker aiming/shooting, physics simulation loop.
 * Uses sub-stepping for smoother coin/piece movement and interpolated rendering.
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
  const [aimState, setAimState] = useState(null);
  const dragStartRef = useRef(null);

  // Animation frame reference
  const animFrameRef = useRef(null);
  const simulatingRef = useRef(false);
  const pocketedThisTurnRef = useRef([]);

  // Responsive canvas sizing with smooth transition
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

  // Render loop — re-renders whenever pieces, striker, or aim changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    renderBoard(ctx, canvasSize, pieces, striker, aimState, null, isAiming);
  }, [pieces, striker, aimState, canvasSize, isAiming]);

  // Physics simulation loop with sub-stepping for smoother coin movement
  const runSimulation = useCallback(() => {
    simulatingRef.current = true;
    pocketedThisTurnRef.current = [];

    // Deep copy pieces for simulation so we don't mutate props
    const allPieces = pieces.map(function(p) {
      return { x: p.x, y: p.y, vx: p.vx, vy: p.vy, radius: p.radius, type: p.type, pocketed: p.pocketed, mass: p.mass };
    });
    var simStriker = striker ? { x: striker.x, y: striker.y, vx: striker.vx, vy: striker.vy, radius: striker.radius, type: striker.type, pocketed: striker.pocketed, mass: striker.mass } : null;
    var simPiecesWithStriker = simStriker ? allPieces.concat([simStriker]) : allPieces.slice();

    var frameCount = 0;

    function step() {
      if (frameCount > MAX_SIM_FRAMES) {
        finishSimulation(simPiecesWithStriker, simStriker);
        return;
      }
      frameCount++;

      // Run multiple physics sub-steps per frame for smoother motion
      var stillMoving = false;
      for (var s = 0; s < PHYSICS_SUB_STEPS; s++) {
        var result = physicsStep(simPiecesWithStriker);

        // Track newly pocketed pieces
        if (result.newlyPocketed.length > 0) {
          for (var p = 0; p < result.newlyPocketed.length; p++) {
            pocketedThisTurnRef.current.push(result.newlyPocketed[p]);
          }
        }

        if (result.moving) {
          stillMoving = true;
        }
      }

      // Update canvas with interpolated positions
      var canvas = canvasRef.current;
      if (canvas) {
        var ctx = canvas.getContext('2d');
        var justPieces = simPiecesWithStriker.filter(function(pc) { return pc.type !== 'striker'; });
        var currentStriker = simPiecesWithStriker.find(function(pc) { return pc.type === 'striker'; });
        renderBoard(ctx, canvasSize, justPieces, currentStriker, null, null, false);
      }

      if (stillMoving) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        finishSimulation(simPiecesWithStriker, simStriker);
      }
    }

    function finishSimulation(allPcs, str) {
      simulatingRef.current = false;
      var justPieces = allPcs.filter(function(pc) { return pc.type !== 'striker'; });
      var strikerPocketed = str ? str.pocketed : false;
      var pocketed = pocketedThisTurnRef.current.filter(function(pc) { return pc.type !== 'striker'; });

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
      var aiTimer = setTimeout(function() {
        var move = computeAIMove(pieces, striker, difficulty);

        // Position striker
        var newStriker = createStriker(move.strikerX, getStrikerY(2));
        launchStriker(newStriker, move.angle, move.power);
        playStrikerSound();

        onStrikerUpdate(newStriker);
        onSimulationStart();
      }, 800);

      return function() { clearTimeout(aiTimer); };
    }
  }, [gameMode, currentPlayer, gameStatus, isSimulating, striker, pieces, difficulty, getStrikerY, onStrikerUpdate, onSimulationStart]);

  // Convert mouse/touch coordinates to board coordinates
  var getCanvasCoords = useCallback(function(e) {
    var canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    var rect = canvas.getBoundingClientRect();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    var scale = BOARD_SIZE / canvasSize;
    return {
      x: (clientX - rect.left) * scale,
      y: (clientY - rect.top) * scale,
    };
  }, [canvasSize]);

  // Check if it's human's turn
  var isHumanTurn = gameStatus === 'playing' && !isSimulating &&
    (gameMode === 'local' || currentPlayer === 1);

  // Mouse/Touch handlers
  var handlePointerDown = useCallback(function(e) {
    if (!isHumanTurn || !striker) return;
    e.preventDefault();

    var coords = getCanvasCoords(e);
    var dx = coords.x - striker.x;
    var dy = coords.y - striker.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < striker.radius * 3) {
      // Start aiming from striker
      setIsAiming(true);
      dragStartRef.current = { x: coords.x, y: coords.y };
    } else {
      // Move striker along baseline
      var newX = Math.max(BASELINE_MIN_X, Math.min(BASELINE_MAX_X, coords.x));
      var newStriker = createStriker(newX, getStrikerY(currentPlayer));
      onStrikerUpdate(newStriker);
      setIsDragging(true);
    }
  }, [isHumanTurn, striker, getCanvasCoords, currentPlayer, getStrikerY, onStrikerUpdate]);

  var handlePointerMove = useCallback(function(e) {
    if (!striker) return;
    e.preventDefault();

    var coords = getCanvasCoords(e);

    if (isDragging) {
      var newX = Math.max(BASELINE_MIN_X, Math.min(BASELINE_MAX_X, coords.x));
      var newStriker = createStriker(newX, getStrikerY(currentPlayer));
      onStrikerUpdate(newStriker);
    }

    if (isAiming && dragStartRef.current) {
      var dx = coords.x - striker.x;
      var dy = coords.y - striker.y;
      var angle = Math.atan2(dy, dx);

      // Power based on drag distance from start
      var dragDx = coords.x - dragStartRef.current.x;
      var dragDy = coords.y - dragStartRef.current.y;
      var dragDist = Math.sqrt(dragDx * dragDx + dragDy * dragDy);
      var power = Math.min(1, dragDist / 150);

      setAimState({ angle: angle, power: power });
    }
  }, [isDragging, isAiming, striker, getCanvasCoords, currentPlayer, getStrikerY, onStrikerUpdate]);

  var handlePointerUp = useCallback(function(_e) {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (isAiming && aimState && striker) {
      // Launch striker
      var launchedStriker = {
        x: striker.x, y: striker.y, vx: striker.vx, vy: striker.vy,
        radius: striker.radius, type: striker.type, pocketed: striker.pocketed, mass: striker.mass
      };
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
  var handleContextMenu = useCallback(function(e) { e.preventDefault(); }, []);

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
          <span className="hint-icon">🎯</span> Click near the striker to aim · Click elsewhere to reposition
        </div>
      )}
      {isAiming && aimState && (
        <div className="board-hint aiming">
          <span className="hint-icon">💪</span> Power: {Math.round((aimState.power || 0) * 100)}% · Release to shoot
        </div>
      )}
      {isSimulating && (
        <div className="board-hint simulating">
          <span className="hint-icon">⏳</span> Simulating...
        </div>
      )}
    </div>
  );
}

export default CarromBoard;
