/**
 * renderer.js
 * Enhanced canvas rendering for the carrom board, pieces, pockets, aim line, and decorations.
 * Features: 3D gradient coins, drop shadows, wood grain texture, refined board lines,
 * smooth aim guides with animated dots, and polished pocket rendering.
 */

import {
  BOARD_SIZE,
  BOARD_PADDING,
  POCKET_RADIUS,
  getPockets,
} from './physics';

// ─── Color Palette ───
const BOARD_BG = '#F5DEB3';
const BOARD_BG_LIGHT = '#FAE8C8';
const BOARD_BORDER = '#5D3A1A';
const BOARD_BORDER_DARK = '#3E2510';
const LINE_COLOR = '#8B6914';
const LINE_COLOR_LIGHT = 'rgba(139, 105, 20, 0.4)';
const POCKET_COLOR = '#111111';
const POCKET_RIM = '#333333';
const POCKET_HIGHLIGHT = 'rgba(255,255,255,0.08)';

const WHITE_PIECE_TOP = '#FFFFFF';
const WHITE_PIECE_BOTTOM = '#D4D4D4';
const WHITE_PIECE_EDGE = '#BBBBBB';
const BLACK_PIECE_TOP = '#3A3A3A';
const BLACK_PIECE_BOTTOM = '#111111';
const BLACK_PIECE_EDGE = '#555555';
const QUEEN_TOP = '#FF3B3B';
const QUEEN_BOTTOM = '#A91B1B';
const QUEEN_EDGE = '#CC2222';
const STRIKER_TOP = '#60A5FA';
const STRIKER_BOTTOM = '#2563EB';
const STRIKER_EDGE = '#3B82F6';

const AIM_COLOR_PRIMARY = 'rgba(59, 130, 246, 0.7)';
const AIM_COLOR_SECONDARY = 'rgba(59, 130, 246, 0.3)';
const POWER_BAR_BG = 'rgba(0,0,0,0.18)';
const STAR_COLOR = 'rgba(139, 105, 20, 0.5)';

// PUBLIC_INTERFACE
/**
 * Renders the complete carrom board scene onto the provided canvas context.
 * Enhanced with gradients, shadows, wood texture, and polished piece rendering.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} canvasSize - Actual pixel size of the canvas
 * @param {Array<object>} pieces - Array of piece objects to draw
 * @param {object|null} striker - Striker piece (null if not on board)
 * @param {object|null} aimState - { angle, power } for aiming guide, or null
 * @param {number|null} _strikerX - X position of striker during placement (unused, kept for API compat)
 * @param {boolean} isAiming - Whether player is currently aiming
 */
export function renderBoard(ctx, canvasSize, pieces, striker, aimState, _strikerX, isAiming) {
  var scale = canvasSize / BOARD_SIZE;
  ctx.save();
  ctx.scale(scale, scale);

  ctx.imageSmoothingEnabled = true;
  if (ctx.imageSmoothingQuality !== undefined) {
    ctx.imageSmoothingQuality = 'high';
  }

  ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
  drawBoardFrame(ctx);
  drawPlayingSurface(ctx);
  drawBoardDecorations(ctx);
  drawPockets(ctx);

  for (var i = 0; i < pieces.length; i++) {
    if (pieces[i].pocketed) continue;
    drawPiece(ctx, pieces[i]);
  }

  if (striker && !striker.pocketed) {
    drawPiece(ctx, striker);
  }

  if (isAiming && aimState && striker && !striker.pocketed) {
    drawAimGuide(ctx, striker, aimState);
  }

  ctx.restore();
}

/**
 * Draws the outer board frame with a beveled wood effect.
 * @param {CanvasRenderingContext2D} ctx
 */
function drawBoardFrame(ctx) {
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  var borderGrad = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
  borderGrad.addColorStop(0, '#7A4A20');
  borderGrad.addColorStop(0.3, BOARD_BORDER);
  borderGrad.addColorStop(0.7, BOARD_BORDER_DARK);
  borderGrad.addColorStop(1, '#7A4A20');
  ctx.fillStyle = borderGrad;
  roundRect(ctx, 0, 0, BOARD_SIZE, BOARD_SIZE, 8);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = 'rgba(255, 220, 160, 0.15)';
  ctx.lineWidth = 1;
  roundRect(ctx, BOARD_PADDING - 2, BOARD_PADDING - 2,
    BOARD_SIZE - 2 * BOARD_PADDING + 4, BOARD_SIZE - 2 * BOARD_PADDING + 4, 3);
  ctx.stroke();
}

/**
 * Draws the inner playing surface with a subtle radial gradient for warmth.
 * @param {CanvasRenderingContext2D} ctx
 */
function drawPlayingSurface(ctx) {
  var center = BOARD_SIZE / 2;
  var surfaceSize = BOARD_SIZE - 2 * BOARD_PADDING;

  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(BOARD_PADDING, BOARD_PADDING, surfaceSize, surfaceSize);

  var glow = ctx.createRadialGradient(center, center, 0, center, center, surfaceSize * 0.7);
  glow.addColorStop(0, BOARD_BG_LIGHT);
  glow.addColorStop(0.6, 'rgba(245, 222, 179, 0)');
  glow.addColorStop(1, 'rgba(200, 170, 120, 0.12)');
  ctx.fillStyle = glow;
  ctx.fillRect(BOARD_PADDING, BOARD_PADDING, surfaceSize, surfaceSize);

  ctx.strokeStyle = 'rgba(139, 105, 20, 0.04)';
  ctx.lineWidth = 0.5;
  for (var y = BOARD_PADDING + 10; y < BOARD_SIZE - BOARD_PADDING; y += 8) {
    ctx.beginPath();
    ctx.moveTo(BOARD_PADDING, y + Math.sin(y * 0.05) * 2);
    ctx.lineTo(BOARD_SIZE - BOARD_PADDING, y + Math.sin(y * 0.05 + 1) * 2);
    ctx.stroke();
  }
}

/**
 * Draws decorative lines on the carrom board.
 * @param {CanvasRenderingContext2D} ctx
 */
function drawBoardDecorations(ctx) {
  var center = BOARD_SIZE / 2;

  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(center, center, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(139, 105, 20, 0.06)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(center, center, 75, 0, Math.PI * 2);
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(139, 105, 20, 0.03)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(center, center, 3, 0, Math.PI * 2);
  ctx.fillStyle = LINE_COLOR;
  ctx.fill();

  var baseY1 = BOARD_SIZE - BOARD_PADDING - 60;
  var baseY2 = BOARD_PADDING + 60;
  var lineStart = BOARD_PADDING + 60;
  var lineEnd = BOARD_SIZE - BOARD_PADDING - 60;

  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(lineStart, baseY1);
  ctx.lineTo(lineEnd, baseY1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(lineStart, baseY2);
  ctx.lineTo(lineEnd, baseY2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(BOARD_PADDING + 60, lineStart);
  ctx.lineTo(BOARD_PADDING + 60, lineEnd);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(BOARD_SIZE - BOARD_PADDING - 60, lineStart);
  ctx.lineTo(BOARD_SIZE - BOARD_PADDING - 60, lineEnd);
  ctx.stroke();

  var endCircleRadius = 8;
  var positions = [
    { x: lineStart, y: baseY1 },
    { x: lineEnd, y: baseY1 },
    { x: lineStart, y: baseY2 },
    { x: lineEnd, y: baseY2 },
  ];
  for (var i = 0; i < positions.length; i++) {
    ctx.beginPath();
    ctx.arc(positions[i].x, positions[i].y, endCircleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(139, 105, 20, 0.08)';
    ctx.fill();
  }

  var arrowSize = 5;
  ctx.beginPath();
  ctx.moveTo(center - arrowSize, baseY1 - arrowSize);
  ctx.lineTo(center, baseY1 + arrowSize);
  ctx.lineTo(center + arrowSize, baseY1 - arrowSize);
  ctx.closePath();
  ctx.fillStyle = LINE_COLOR;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(center - arrowSize, baseY2 + arrowSize);
  ctx.lineTo(center, baseY2 - arrowSize);
  ctx.lineTo(center + arrowSize, baseY2 + arrowSize);
  ctx.closePath();
  ctx.fill();

  drawCornerStars(ctx);
}

/**
 * Draws small decorative star shapes near the four corners of the play area.
 * @param {CanvasRenderingContext2D} ctx
 */
function drawCornerStars(ctx) {
  var offset = BOARD_PADDING + 42;
  var corners = [
    { x: offset, y: offset },
    { x: BOARD_SIZE - offset, y: offset },
    { x: offset, y: BOARD_SIZE - offset },
    { x: BOARD_SIZE - offset, y: BOARD_SIZE - offset },
  ];
  for (var i = 0; i < corners.length; i++) {
    drawStar(ctx, corners[i].x, corners[i].y, 6, 10, 5);
  }
}

/**
 * Draws a star shape at the given position.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} spikes
 * @param {number} outerR
 * @param {number} innerR
 */
function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  var rot = (Math.PI / 2) * 3;
  var step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (var i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fillStyle = STAR_COLOR;
  ctx.fill();
  ctx.strokeStyle = LINE_COLOR_LIGHT;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

/**
 * Draws all four pockets with depth / highlight effect.
 * @param {CanvasRenderingContext2D} ctx
 */
function drawPockets(ctx) {
  var pockets = getPockets();
  for (var i = 0; i < pockets.length; i++) {
    var pocket = pockets[i];

    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    var pocketGrad = ctx.createRadialGradient(
      pocket.x - 2, pocket.y - 2, 0,
      pocket.x, pocket.y, POCKET_RADIUS
    );
    pocketGrad.addColorStop(0, '#000000');
    pocketGrad.addColorStop(0.7, POCKET_COLOR);
    pocketGrad.addColorStop(1, POCKET_RIM);
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = pocketGrad;
    ctx.fill();

    ctx.strokeStyle = POCKET_RIM;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pocket.x - 3, pocket.y - 3, POCKET_RADIUS * 0.55, -Math.PI * 0.7, -Math.PI * 0.1);
    ctx.strokeStyle = POCKET_HIGHLIGHT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/**
 * Draws a single piece on the board with 3D radial gradient, shadow, and decorative rings.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} piece - The piece to draw
 */
function drawPiece(ctx, piece) {
  var x = piece.x;
  var y = piece.y;
  var radius = piece.radius;
  var type = piece.type;

  // Drop shadow
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 2, radius + 0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fill();
  ctx.restore();

  var topColor, bottomColor, edgeColor;
  switch (type) {
    case 'white':
      topColor = WHITE_PIECE_TOP;
      bottomColor = WHITE_PIECE_BOTTOM;
      edgeColor = WHITE_PIECE_EDGE;
      break;
    case 'black':
      topColor = BLACK_PIECE_TOP;
      bottomColor = BLACK_PIECE_BOTTOM;
      edgeColor = BLACK_PIECE_EDGE;
      break;
    case 'queen':
      topColor = QUEEN_TOP;
      bottomColor = QUEEN_BOTTOM;
      edgeColor = QUEEN_EDGE;
      break;
    case 'striker':
      topColor = STRIKER_TOP;
      bottomColor = STRIKER_BOTTOM;
      edgeColor = STRIKER_EDGE;
      break;
    default:
      topColor = '#999';
      bottomColor = '#666';
      edgeColor = '#777';
  }

  var grad = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, radius * 0.1,
    x, y, radius
  );
  grad.addColorStop(0, topColor);
  grad.addColorStop(0.85, bottomColor);
  grad.addColorStop(1, edgeColor);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  if (type === 'striker') {
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.52, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
  } else if (type === 'queen') {
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 180, 180, 0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.35, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 200, 200, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
    ctx.fill();
  } else {
    var innerRingColor = type === 'black'
      ? 'rgba(120, 120, 120, 0.45)'
      : 'rgba(180, 180, 180, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
    ctx.strokeStyle = innerRingColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = type === 'black'
      ? 'rgba(80, 80, 80, 0.5)'
      : 'rgba(200, 200, 200, 0.6)';
    ctx.fill();
  }

  // Specular highlight
  var hlGrad = ctx.createRadialGradient(
    x - radius * 0.35, y - radius * 0.35, 0,
    x - radius * 0.2, y - radius * 0.2, radius * 0.6
  );
  hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  hlGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
  hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.beginPath();
  ctx.arc(x, y, radius - 0.5, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();
}

/**
 * Draws the aim guide line, power bar, and trajectory dots.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} striker - Striker piece
 * @param {object} aimState - { angle, power }
 */
function drawAimGuide(ctx, striker, aimState) {
  var angle = aimState.angle;
  var power = aimState.power;
  var lineLength = 60 + power * 130;
  var endX = striker.x + Math.cos(angle) * lineLength;
  var endY = striker.y + Math.sin(angle) * lineLength;

  // Dotted trajectory
  var numDots = Math.floor(lineLength / 10);
  for (var i = 1; i <= numDots; i++) {
    var t = i / numDots;
    var dotX = striker.x + (endX - striker.x) * t;
    var dotY = striker.y + (endY - striker.y) * t;
    var dotAlpha = 0.7 - t * 0.5;
    var dotRadius = 2.5 - t * 1.2;

    ctx.beginPath();
    ctx.arc(dotX, dotY, Math.max(0.8, dotRadius), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, ' + dotAlpha + ')';
    ctx.fill();
  }

  // Thin aim line
  ctx.beginPath();
  ctx.moveTo(striker.x, striker.y);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = AIM_COLOR_SECONDARY;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // End dot
  ctx.beginPath();
  ctx.arc(endX, endY, 5, 0, Math.PI * 2);
  var dotGrad = ctx.createRadialGradient(endX, endY, 0, endX, endY, 5);
  dotGrad.addColorStop(0, AIM_COLOR_PRIMARY);
  dotGrad.addColorStop(1, AIM_COLOR_SECONDARY);
  ctx.fillStyle = dotGrad;
  ctx.fill();

  // Power bar
  var barWidth = 44;
  var barHeight = 7;
  var barX = striker.x - barWidth / 2;
  var barY = striker.y + striker.radius + 10;

  roundRect(ctx, barX, barY, barWidth, barHeight, 3);
  ctx.fillStyle = POWER_BAR_BG;
  ctx.fill();

  if (power > 0.01) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, barX, barY, barWidth * power, barHeight, 3);
    ctx.clip();
    var gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    gradient.addColorStop(0, '#06b6d4');
    gradient.addColorStop(0.6, '#f59e0b');
    gradient.addColorStop(1, '#EF4444');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth * power, barHeight);
    ctx.restore();
  }

  roundRect(ctx, barX, barY, barWidth, barHeight, 3);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Power percentage text
  ctx.font = '8px Inter, sans-serif';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(power * 100) + '%', striker.x, barY + barHeight + 10);
  ctx.textAlign = 'start';
}

/**
 * Utility: draws a rounded rectangle path on the context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
