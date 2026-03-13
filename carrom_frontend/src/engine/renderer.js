/**
 * renderer.js
 * Canvas rendering for the carrom board, pieces, pockets, aim line, and decorations.
 */

import {
  BOARD_SIZE,
  BOARD_PADDING,
  POCKET_RADIUS,
  getPockets,
} from './physics';

// Colors
const BOARD_BG = '#F5DEB3'; // wheat / carrom board wood
const BOARD_BORDER = '#5D3A1A'; // dark wood border
const LINE_COLOR = '#8B6914';
const POCKET_COLOR = '#1a1a1a';
const WHITE_PIECE = '#FAFAFA';
const BLACK_PIECE = '#222222';
const QUEEN_COLOR = '#DC2626';
const STRIKER_COLOR = '#3b82f6';
const AIM_COLOR = 'rgba(59, 130, 246, 0.6)';
const POWER_BG = 'rgba(0,0,0,0.15)';

// PUBLIC_INTERFACE
/**
 * Renders the complete carrom board scene onto the provided canvas context.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} canvasSize - Actual pixel size of the canvas
 * @param {Array<object>} pieces - Array of piece objects to draw
 * @param {object|null} striker - Striker piece (null if not on board)
 * @param {object|null} aimState - { angle, power } for aiming guide, or null
 * @param {number|null} strikerX - X position of striker during placement
 * @param {boolean} isAiming - Whether player is currently aiming
 */
export function renderBoard(ctx, canvasSize, pieces, striker, aimState, strikerX, isAiming) {
  const scale = canvasSize / BOARD_SIZE;
  ctx.save();
  ctx.scale(scale, scale);

  // Clear
  ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  // Draw border
  ctx.fillStyle = BOARD_BORDER;
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  // Draw inner playing surface
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(BOARD_PADDING, BOARD_PADDING, BOARD_SIZE - 2 * BOARD_PADDING, BOARD_SIZE - 2 * BOARD_PADDING);

  // Draw grid lines / circles on board
  drawBoardDecorations(ctx);

  // Draw pockets
  const pockets = getPockets();
  for (const pocket of pockets) {
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = POCKET_COLOR;
    ctx.fill();
    // Pocket rim
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw pieces
  for (const piece of pieces) {
    if (piece.pocketed) continue;
    drawPiece(ctx, piece);
  }

  // Draw striker
  if (striker && !striker.pocketed) {
    drawPiece(ctx, striker);
  }

  // Draw aim guide
  if (isAiming && aimState && striker && !striker.pocketed) {
    drawAimGuide(ctx, striker, aimState);
  }

  ctx.restore();
}

/**
 * Draws decorative lines on the carrom board (center circle, strike lines, etc.)
 * @param {CanvasRenderingContext2D} ctx
 */
function drawBoardDecorations(ctx) {
  const center = BOARD_SIZE / 2;

  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.5;

  // Center circle
  ctx.beginPath();
  ctx.arc(center, center, 30, 0, Math.PI * 2);
  ctx.stroke();

  // Outer center circle
  ctx.beginPath();
  ctx.arc(center, center, 75, 0, Math.PI * 2);
  ctx.stroke();

  // Strike lines (baselines for both players)
  const baseY1 = BOARD_SIZE - BOARD_PADDING - 60;
  const baseY2 = BOARD_PADDING + 60;
  const lineStart = BOARD_PADDING + 60;
  const lineEnd = BOARD_SIZE - BOARD_PADDING - 60;

  // Bottom baseline
  ctx.beginPath();
  ctx.moveTo(lineStart, baseY1);
  ctx.lineTo(lineEnd, baseY1);
  ctx.stroke();

  // Top baseline
  ctx.beginPath();
  ctx.moveTo(lineStart, baseY2);
  ctx.lineTo(lineEnd, baseY2);
  ctx.stroke();

  // Left baseline
  ctx.beginPath();
  ctx.moveTo(BOARD_PADDING + 60, lineStart);
  ctx.lineTo(BOARD_PADDING + 60, lineEnd);
  ctx.stroke();

  // Right baseline
  ctx.beginPath();
  ctx.moveTo(BOARD_SIZE - BOARD_PADDING - 60, lineStart);
  ctx.lineTo(BOARD_SIZE - BOARD_PADDING - 60, lineEnd);
  ctx.stroke();

  // Small circles at baseline ends (both sides)
  const endCircleRadius = 8;
  const positions = [
    { x: lineStart, y: baseY1 },
    { x: lineEnd, y: baseY1 },
    { x: lineStart, y: baseY2 },
    { x: lineEnd, y: baseY2 },
  ];
  for (const pos of positions) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, endCircleRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Arrow / direction markers at center of baselines
  const arrowSize = 5;
  // Bottom arrow
  ctx.beginPath();
  ctx.moveTo(center - arrowSize, baseY1 - arrowSize);
  ctx.lineTo(center, baseY1 + arrowSize);
  ctx.lineTo(center + arrowSize, baseY1 - arrowSize);
  ctx.closePath();
  ctx.fillStyle = LINE_COLOR;
  ctx.fill();

  // Top arrow
  ctx.beginPath();
  ctx.moveTo(center - arrowSize, baseY2 + arrowSize);
  ctx.lineTo(center, baseY2 - arrowSize);
  ctx.lineTo(center + arrowSize, baseY2 + arrowSize);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws a single piece on the board.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} piece - The piece to draw
 */
function drawPiece(ctx, piece) {
  ctx.beginPath();
  ctx.arc(piece.x, piece.y, piece.radius, 0, Math.PI * 2);

  // Fill color based on type
  switch (piece.type) {
    case 'white':
      ctx.fillStyle = WHITE_PIECE;
      break;
    case 'black':
      ctx.fillStyle = BLACK_PIECE;
      break;
    case 'queen':
      ctx.fillStyle = QUEEN_COLOR;
      break;
    case 'striker':
      ctx.fillStyle = STRIKER_COLOR;
      break;
    default:
      ctx.fillStyle = '#999';
  }
  ctx.fill();

  // Border
  ctx.strokeStyle = piece.type === 'white' ? '#bbb' : '#555';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner circle decoration for pieces
  if (piece.type !== 'striker') {
    ctx.beginPath();
    ctx.arc(piece.x, piece.y, piece.radius * 0.55, 0, Math.PI * 2);
    ctx.strokeStyle = piece.type === 'black' ? '#555' : (piece.type === 'queen' ? '#ff6666' : '#ddd');
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    // Striker cross-hair
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(piece.x, piece.y, piece.radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * Draws the aim guide line and power indicator.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} striker - Striker piece
 * @param {object} aimState - { angle, power }
 */
function drawAimGuide(ctx, striker, aimState) {
  const { angle, power } = aimState;
  const lineLength = 60 + power * 120;

  // Aim line
  ctx.beginPath();
  ctx.moveTo(striker.x, striker.y);
  ctx.lineTo(
    striker.x + Math.cos(angle) * lineLength,
    striker.y + Math.sin(angle) * lineLength
  );
  ctx.strokeStyle = AIM_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Aim dot at end
  ctx.beginPath();
  ctx.arc(
    striker.x + Math.cos(angle) * lineLength,
    striker.y + Math.sin(angle) * lineLength,
    4,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = AIM_COLOR;
  ctx.fill();

  // Power bar near striker
  const barWidth = 40;
  const barHeight = 6;
  const barX = striker.x - barWidth / 2;
  const barY = striker.y + striker.radius + 8;

  ctx.fillStyle = POWER_BG;
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Filled portion
  const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  gradient.addColorStop(0, '#06b6d4');
  gradient.addColorStop(1, '#EF4444');
  ctx.fillStyle = gradient;
  ctx.fillRect(barX, barY, barWidth * power, barHeight);

  ctx.strokeStyle = '#666';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
}
