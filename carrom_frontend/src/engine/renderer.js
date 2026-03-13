/**
 * renderer.js
 * Enhanced canvas rendering for the carrom board, pieces, pockets, aim line, and decorations.
 * Features: 3D gradient coins, drop shadows, wood grain marble texture, surface overlays, fine board markings,
 * super-polished visuals for coins/striker, pocket shading, and subtle touch feedback animations.
 */

import {
  BOARD_SIZE,
  BOARD_PADDING,
  POCKET_RADIUS,
  getPockets,
} from './physics';

/* --- Extended Color + Texture Palettes --- */
const BOARD_BG = '#F5DEB3';
const BOARD_BG_LIGHT = '#FAE8C8';
const BOARD_BG_BURST = '#EAD491';
const BOARD_BG_MARBLE = '#e5c182';

const BOARD_BORDER = '#5D3A1A';
const BOARD_BORDER_DARK = '#3E2510';
const BOARD_BORDER_LIGHT = '#A67E4B';

const LINE_COLOR = '#8B6914';
const LINE_COLOR_LIGHT = 'rgba(139, 105, 20, 0.4)';
const LINE_ACCENT = '#e1be73';

const POCKET_COLOR = '#090909';
const POCKET_RIM = '#333333';
const POCKET_HIGHLIGHT = 'rgba(255,255,255,0.10)';

const WHITE_PIECE_TOP = '#FFFFFF';
const WHITE_PIECE_BOTTOM = '#DFDBCC';
const WHITE_PIECE_EDGE = '#BBBBBB';
const WHITE_PIECE_DOT = '#eee6ba';

const BLACK_PIECE_TOP = '#3A3A3A';
const BLACK_PIECE_BOTTOM = '#111111';
const BLACK_PIECE_EDGE = '#555555';
const BLACK_PIECE_DOT = '#616273';

const QUEEN_TOP = '#F93D34';
const QUEEN_BOTTOM = '#A91B1B';
const QUEEN_EDGE = '#CC2222';
const QUEEN_DECAL = '#ffc4d0';

const STRIKER_TOP = '#5fd9ff';
const STRIKER_BOTTOM = '#3984bc';
const STRIKER_EDGE = '#3B82F6';
const STRIKER_RING = '#ebf4ff';

const AIM_COLOR_PRIMARY = 'rgba(59, 130, 246, 0.8)';
const AIM_COLOR_SECONDARY = 'rgba(59, 130, 246, 0.3)';
const POWER_BAR_BG = 'rgba(0,0,0,0.19)';
const STAR_COLOR = 'rgba(139, 105, 20, 0.5)';

// For subtle feedback animations
let _animPulse = Math.sin((Date.now() / 400));

// PUBLIC_INTERFACE
/**
 * Renders the complete carrom board scene onto the provided canvas context, with maximum realism.
 * Enhanced with polished wood, fine lines, realistic pocket insets, coin/striker shading and special effects.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} canvasSize - Actual pixel size of the canvas
 * @param {Array<object>} pieces - Array of piece objects to draw
 * @param {object|null} striker - Striker piece (null if not on board)
 * @param {object|null} aimState - { angle, power } for aiming guide, or null
 * @param {number|null} _strikerX - X position of striker during placement (unused)
 * @param {boolean} isAiming - Whether player is currently aiming
 */
export function renderBoard(ctx, canvasSize, pieces, striker, aimState, _strikerX, isAiming) {
  _animPulse = Math.sin((Date.now() / 400));

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
  drawTextureOverlay(ctx);
  drawPockets(ctx);

  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].pocketed) continue;
    drawPiece(ctx, pieces[i]);
  }

  if (striker && !striker.pocketed) {
    drawPiece(ctx, striker, isAiming);
  }

  if (isAiming && aimState && striker && !striker.pocketed) {
    drawAimGuide(ctx, striker, aimState);
  }

  ctx.restore();
}

/** Draws the beveled wood frame with sunburst/marble grain accents. */
function drawBoardFrame(ctx) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 16 + 3 * _animPulse;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3 + 0.5 * _animPulse;

  let borderGrad = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
  borderGrad.addColorStop(0, BOARD_BORDER_LIGHT);
  borderGrad.addColorStop(0.2, BOARD_BORDER);
  borderGrad.addColorStop(0.5, BOARD_BG_MARBLE);
  borderGrad.addColorStop(0.75, BOARD_BORDER_DARK);
  borderGrad.addColorStop(1, BOARD_BORDER_LIGHT);
  ctx.fillStyle = borderGrad;
  roundRect(ctx, 0, 0, BOARD_SIZE, BOARD_SIZE, 10);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#edd8b2';
  ctx.lineWidth = 1.4;
  roundRect(ctx, BOARD_PADDING - 5, BOARD_PADDING - 5, BOARD_SIZE - 2 * BOARD_PADDING + 10, BOARD_SIZE - 2 * BOARD_PADDING + 10, 5);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(40,30,5,0.23)';
  ctx.lineWidth = 2;
  roundRect(ctx, BOARD_PADDING - 1.7, BOARD_PADDING - 1.7, BOARD_SIZE - 2 * BOARD_PADDING + 3.4, BOARD_SIZE - 2 * BOARD_PADDING + 3.4, 4);
  ctx.stroke();
  ctx.restore();
}

/** Draws the marbled wooden playing surface with rich warmth and slight radial burst. */
function drawPlayingSurface(ctx) {
  const center = BOARD_SIZE / 2;
  const size = BOARD_SIZE - 2 * BOARD_PADDING;

  ctx.save();
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(BOARD_PADDING, BOARD_PADDING, size, size);

  let burst = ctx.createRadialGradient(center, center, size * 0.09, center, center, size * 0.58 + 2 * _animPulse);
  burst.addColorStop(0, BOARD_BG_LIGHT);
  burst.addColorStop(0.2, BOARD_BG_BURST);
  burst.addColorStop(0.64, 'rgba(210,185,113, 0.03)');
  burst.addColorStop(1, 'rgba(196, 166, 103, 0.14)');
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = burst;
  ctx.fillRect(BOARD_PADDING, BOARD_PADDING, size, size);
  ctx.globalAlpha = 1;

  // Subtle marbling streaks
  ctx.save();
  ctx.strokeStyle = 'rgba(186,155,60,0.18)';
  ctx.lineWidth = 0.8;
  for (let y = BOARD_PADDING + 15; y < BOARD_SIZE - BOARD_PADDING; y += 9) {
    ctx.beginPath();
    ctx.moveTo(BOARD_PADDING + 1, y + Math.sin(y * 0.03 + _animPulse) * 2);
    ctx.lineTo(BOARD_SIZE - BOARD_PADDING - 1, y + Math.sin(y * 0.03 + 5) * 2.5);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

/** Adds a fine translucent texture overlay for realism (no image required). */
function drawTextureOverlay(ctx) {
  const center = BOARD_SIZE / 2;
  ctx.save();
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    let ang = (Math.PI * 2) * (i / 40) + _animPulse * 0.03;
    ctx.arc(center + Math.cos(ang) * 176, center + Math.sin(ang) * 170, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(180,140,80,0.055)";
    ctx.fill();
  }
  ctx.restore();
}

/** Draws board markings and realistic baseline, circles, and highlight details. */
function drawBoardDecorations(ctx) {
  const center = BOARD_SIZE / 2;
  ctx.save();
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(center, center, 30, 0, Math.PI * 2);
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.65;
  ctx.globalAlpha = 0.92;
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  ctx.beginPath();
  ctx.arc(center, center, 73, 0, Math.PI * 2);
  ctx.strokeStyle = LINE_ACCENT;
  ctx.lineWidth = 1.45;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(center, center, 3, 0, Math.PI * 2);
  ctx.fillStyle = LINE_COLOR;
  ctx.fill();

  let baseY1 = BOARD_SIZE - BOARD_PADDING - 60;
  let baseY2 = BOARD_PADDING + 60;
  let lineStart = BOARD_PADDING + 60;
  let lineEnd = BOARD_SIZE - BOARD_PADDING - 60;

  ctx.beginPath();
  ctx.moveTo(lineStart, baseY1);
  ctx.lineTo(lineEnd, baseY1);
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.35;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(lineStart, baseY2);
  ctx.lineTo(lineEnd, baseY2);
  ctx.stroke();

  // Side baselines (verticals)
  ctx.beginPath();
  ctx.moveTo(BOARD_PADDING + 60, lineStart);
  ctx.lineTo(BOARD_PADDING + 60, lineEnd);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(BOARD_SIZE - BOARD_PADDING - 60, lineStart);
  ctx.lineTo(BOARD_SIZE - BOARD_PADDING - 60, lineEnd);
  ctx.stroke();

  let endCircleRadius = 8.7;
  let positions = [
    { x: lineStart, y: baseY1 },
    { x: lineEnd, y: baseY1 },
    { x: lineStart, y: baseY2 },
    { x: lineEnd, y: baseY2 },
  ];
  for (let i = 0; i < positions.length; i++) {
    ctx.beginPath();
    ctx.arc(positions[i].x, positions[i].y, endCircleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = LINE_COLOR_LIGHT;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  let arrowSize = 5.6;
  ctx.beginPath();
  ctx.moveTo(center - arrowSize, baseY1 - arrowSize);
  ctx.lineTo(center, baseY1 + arrowSize);
  ctx.lineTo(center + arrowSize, baseY1 - arrowSize);
  ctx.closePath();
  ctx.fillStyle = LINE_COLOR;
  ctx.globalAlpha = 0.92;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(center - arrowSize, baseY2 + arrowSize);
  ctx.lineTo(center, baseY2 - arrowSize);
  ctx.lineTo(center + arrowSize, baseY2 + arrowSize);
  ctx.closePath();
  ctx.fill();

  // Star motifs
  drawCornerStars(ctx);

  ctx.restore();
}

/** Draws small decorative star shapes near the four corners.*/
function drawCornerStars(ctx) {
  let offset = BOARD_PADDING + 41.3;
  let corners = [
    { x: offset, y: offset },
    { x: BOARD_SIZE - offset, y: offset },
    { x: offset, y: BOARD_SIZE - offset },
    { x: BOARD_SIZE - offset, y: BOARD_SIZE - offset },
  ];
  for (let i = 0; i < corners.length; i++) {
    drawStar(ctx, corners[i].x, corners[i].y, 6, 9.2, 4.7);
  }
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = (Math.PI / 2) * 3;
  let step = Math.PI / spikes;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fillStyle = STAR_COLOR;
  ctx.globalAlpha = 0.44 + 0.08 * _animPulse;
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = LINE_COLOR_LIGHT;
  ctx.lineWidth = 0.65;
  ctx.stroke();
  ctx.restore();
}

/** Adds realistic pockets with depth/gradient/shadow overlays and oval rim inset highlights. */
function drawPockets(ctx) {
  let pockets = getPockets();
  for (let i = 0; i < pockets.length; i++) {
    let pocket = pockets[i];

    ctx.save();
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS + 4.3 + 2 * _animPulse, 0, Math.PI * 2);
    ctx.globalAlpha = 0.25 + 0.03 * _animPulse;
    ctx.fillStyle = 'rgba(40, 20, 0, 0.22)';
    ctx.fill();
    ctx.globalAlpha = 1.0;

    let pocketGrad = ctx.createRadialGradient(
      pocket.x - 2, pocket.y - 2, 0,
      pocket.x, pocket.y, POCKET_RADIUS
    );
    pocketGrad.addColorStop(0, '#000000');
    pocketGrad.addColorStop(0.79, POCKET_COLOR);
    pocketGrad.addColorStop(1, POCKET_RIM);
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = pocketGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = POCKET_RIM;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pocket.x - 3, pocket.y - 3, POCKET_RADIUS * 0.54, -Math.PI * 0.7, -Math.PI * 0.1);
    ctx.strokeStyle = POCKET_HIGHLIGHT;
    ctx.lineWidth = 1.35;
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }
}

/** Draws a single piece (coin/queen/striker) with 3D shading, inner highlight, and overlays. */
function drawPiece(ctx, piece, isStrikerAiming) {
  let { x, y, radius, type } = piece;
  ctx.save();

  // Ultra-soft drop shadow with animation feedback
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + (type === 'striker' ? 2.3 : 1.5), y + (type === 'striker' ? 3.7 : 2), radius + 1.1, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(30, 30, 30, ' + (type === 'striker' && isStrikerAiming ? '0.24' : '0.19') + ')';
  ctx.globalAlpha = 0.80 + (_animPulse * 0.08) * (isStrikerAiming ? 1 : 0);
  ctx.filter = type === 'striker' && isStrikerAiming ? 'blur(2.5px)' : 'blur(1.5px)';
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1.0;
  ctx.filter = 'none';

  // Colors and gradient structure
  let topColor, bottomColor, edgeColor, spotColor;
  if (type === 'white') {
    topColor = WHITE_PIECE_TOP;
    bottomColor = WHITE_PIECE_BOTTOM;
    edgeColor = WHITE_PIECE_EDGE;
    spotColor = WHITE_PIECE_DOT;
  } else if (type === 'black') {
    topColor = BLACK_PIECE_TOP;
    bottomColor = BLACK_PIECE_BOTTOM;
    edgeColor = BLACK_PIECE_EDGE;
    spotColor = BLACK_PIECE_DOT;
  } else if (type === 'queen') {
    topColor = QUEEN_TOP;
    bottomColor = QUEEN_BOTTOM;
    edgeColor = QUEEN_EDGE;
    spotColor = QUEEN_DECAL;
  } else if (type === 'striker') {
    topColor = STRIKER_TOP;
    bottomColor = STRIKER_BOTTOM;
    edgeColor = STRIKER_EDGE;
    spotColor = STRIKER_RING;
  } else {
    topColor = '#999'; bottomColor = '#666'; edgeColor = '#888'; spotColor = '#ddd';
  }

  // Main 3D coin fill
  let grad = ctx.createRadialGradient(
    x - radius * 0.31,
    y - radius * 0.32,
    radius * 0.16,
    x, y, radius
  );
  grad.addColorStop(0, topColor);
  grad.addColorStop(0.83, bottomColor);
  grad.addColorStop(1, edgeColor);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Edge rim
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = type === 'striker' ? 2.1 : 1.3;
  ctx.stroke();

  ctx.save();
  if (type === 'striker') {
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.58, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.30, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100,180,255,0.6)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (isStrikerAiming) {
      ctx.beginPath();
      ctx.arc(x, y, 3 + 0.6 * _animPulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(110, 200, 255,' + (0.45 + 0.13 * _animPulse) + ')';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fill();
    }
  } else if (type === 'queen') {
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.62, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,160,160,0.85)';
    ctx.lineWidth = 1.15;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.33, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 216, 216, 0.46)';
    ctx.lineWidth = 1.08;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 210, 0.95)';
    ctx.fill();

    // Petal/fleur effect for queen
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(_animPulse * 0.13);
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 3);
      ctx.beginPath();
      ctx.ellipse(radius * 0.47, 0, 2.5, 1.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = QUEEN_DECAL;
      ctx.globalAlpha = 0.22 + 0.13 * Math.abs(_animPulse);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  } else {
    let innerRingColor = type === 'black'
      ? 'rgba(120, 120, 120, 0.42)'
      : 'rgba(180, 180, 180, 0.48)';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.57, 0, Math.PI * 2);
    ctx.strokeStyle = innerRingColor;
    ctx.lineWidth = 1.01;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 1.7, 0, Math.PI * 2);
    ctx.fillStyle = spotColor;
    ctx.globalAlpha = 0.63;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
  ctx.restore();

  let hlGrad = ctx.createRadialGradient(
    x - radius * 0.36, y - radius * 0.36, 0,
    x - radius * 0.21, y - radius * 0.21, radius * 0.59
  );
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.32)');
  hlGrad.addColorStop(0.6, 'rgba(255,255,255,0.09)');
  hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(x, y, radius - 0.5, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();

  ctx.restore();
}

/** Draws the aim guide: line, gradient dots, power bar, and pulsing trajectory feedback. */
function drawAimGuide(ctx, striker, aimState) {
  let angle = aimState.angle;
  let power = aimState.power;
  let lineLength = 60 + power * 130;
  let endX = striker.x + Math.cos(angle) * lineLength;
  let endY = striker.y + Math.sin(angle) * lineLength;

  // Dotted dynamic trajectory
  let numDots = Math.floor(lineLength / 9);
  for (let i = 1; i <= numDots; i++) {
    let t = i / numDots;
    let dotX = striker.x + (endX - striker.x) * t;
    let dotY = striker.y + (endY - striker.y) * t;
    let dotAlpha = 0.81 - t * 0.58 + 0.11 * Math.abs(_animPulse);
    let dotRadius = 2.7 - t * 1.0 + 0.2 * Math.sin(Date.now() / 150 + t * 3.1);

    ctx.beginPath();
    ctx.arc(dotX, dotY, Math.max(0.9, dotRadius), 0, Math.PI * 2);
    ctx.globalAlpha = dotAlpha;
    ctx.fillStyle = AIM_COLOR_PRIMARY;
    ctx.shadowColor = 'rgba(59,130,246,0.12)';
    ctx.shadowBlur = 2.2;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }

  // Animated aim line
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(striker.x, striker.y);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = AIM_COLOR_SECONDARY;
  ctx.lineWidth = 2.1 + 1.2 * Math.abs(_animPulse);
  ctx.setLineDash([4, 5]);
  ctx.shadowColor = 'rgba(59,130,246,0.13)';
  ctx.shadowBlur = 2.3 + 2 * Math.abs(_animPulse);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.restore();

  // End highlight
  ctx.beginPath();
  ctx.arc(endX, endY, 5.4 + 0.73 * Math.abs(_animPulse), 0, Math.PI * 2);
  let dotGrad = ctx.createRadialGradient(endX, endY, 0, endX, endY, 5.3);
  dotGrad.addColorStop(0, AIM_COLOR_PRIMARY);
  dotGrad.addColorStop(1, AIM_COLOR_SECONDARY);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = dotGrad;
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Power bar
  let barWidth = 48;
  let barHeight = 8.5;
  let barX = striker.x - barWidth / 2;
  let barY = striker.y + striker.radius + 13;
  roundRect(ctx, barX, barY, barWidth, barHeight, 4.1);
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = POWER_BAR_BG;
  ctx.fill();
  ctx.globalAlpha = 1.0;

  if (power > 0.01) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, barX, barY, barWidth * power, barHeight, 4.1);
    ctx.clip();
    let gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    gradient.addColorStop(0, '#06b6d4');
    gradient.addColorStop(0.7, '#f59e0b');
    gradient.addColorStop(1, '#EF4444');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth * power, barHeight);
    ctx.restore();
  }

  roundRect(ctx, barX, barY, barWidth, barHeight, 4.2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  // Power percent
  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(power * 100) + '%', striker.x, barY + barHeight + 13);
  ctx.textAlign = 'start';
}

/** Utility: draws a rounded rectangle path */
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
