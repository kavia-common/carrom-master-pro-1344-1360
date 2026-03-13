 /**
 * renderer.js
 * Realistic carrom board renderer - photorealistic upgrade.
 * Outlines, geometry, wood, pockets, powder, net, 3D highlights, shadow, frame realism.
 */

import {
  BOARD_SIZE,
  BOARD_PADDING,
  POCKET_RADIUS,
  getPockets,
} from './physics';

/* --- Realistic Board Materials & Color Palettes --- */

// Polished Indian plywood board surface
const BOARD_WOOD = '#f7e5bd';
const BOARD_WOOD_GRAIN_LIGHT = '#fbeed7';
const BOARD_WOOD_GRAIN_MID = '#efd4a5';
const BOARD_WOOD_BURST = '#dab16f';

const FRAME_EDGE = '#654321';
const FRAME_EDGE_HL = '#79562b';
const FRAME_EDGE_DK = '#36230e';
const FRAME_BEVEL = '#b58d5a';

const LINE_COLOR = '#694a19';
const LINE_ACCENT = '#deb76a';
const BASELINE_DARK = '#a98540';
const BASELINE_LIGHT = '#eccb96';

const POCKET_OUTER = '#1c1512';
const POCKET_INNER = '#090909';
const POCKET_NET = '#8d7151';

const POWDER_COLOR1 = 'rgba(255,216,173,0.19)';
const POWDER_COLOR2 = 'rgba(222,202,133,0.17)';

const HIGHLIGHT = 'rgba(255,255,230,0.21)';
const SHADOW_DARK = 'rgba(60,40,15,0.28)';
const FRAME_SHADOW = 'rgba(0,0,0,0.20)';

// Coin colors
const WHITE_PIECE_TOP = '#fff9ea';
const WHITE_PIECE_EDGE = '#b8b6a4';
const WHITE_PIECE_DOT = '#ece2c5';

const BLACK_PIECE_TOP = '#242326';
const BLACK_PIECE_EDGE = '#a19d96';
const BLACK_PIECE_DOT = '#615c4c';

const QUEEN_TOP = '#e84545';
const QUEEN_EDGE = '#900909';
const QUEEN_RING = '#fae6e6';

const STRIKER_TOP = '#f5f6fa';
const STRIKER_EDGE = '#d5dadb';
const STRIKER_RING = '#68a3e8';
const STRIKER_SHADOW = 'rgba(76,125,172,0.14)';

// For animations
let _animPulse = Math.sin((Date.now() / 340));

// PUBLIC_INTERFACE
/**
 * Renders a photorealistic carrom board onto the canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasSize
 * @param {Array<object>} pieces
 * @param {object|null} striker
 * @param {object|null} aimState
 * @param {number|null} _strikerX
 * @param {boolean} isAiming
 */
export function renderBoard(ctx, canvasSize, pieces, striker, aimState, _strikerX, isAiming) {
  _animPulse = Math.sin((Date.now() / 340));
  let scale = canvasSize / BOARD_SIZE;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  drawBoardFrameReal(ctx);
  drawFrameShadow(ctx);
  drawBoardSurfaceReal(ctx);
  drawBoardPowder(ctx);
  drawBoardMarkingsReal(ctx);
  drawBoardPocketsReal(ctx);

  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].pocketed) continue;
    drawPieceReal(ctx, pieces[i]);
  }
  if (striker && !striker.pocketed) {
    drawPieceReal(ctx, striker, isAiming);
  }
  if (isAiming && aimState && striker && !striker.pocketed) {
    drawAimGuideReal(ctx, striker, aimState);
  }

  ctx.restore();
}

/* === Frame & 3D Edgework === */
function drawBoardFrameReal(ctx) {
  // OUTER THICK FRAME with bevels
  ctx.save();
  // Outer border bevel highlight
  let grad = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
  grad.addColorStop(0, FRAME_EDGE_HL);
  grad.addColorStop(0.20, FRAME_EDGE);
  grad.addColorStop(0.45, FRAME_BEVEL);
  grad.addColorStop(0.75, FRAME_EDGE_DK);
  grad.addColorStop(1, FRAME_EDGE);

  ctx.beginPath();
  roundRect(ctx, 0, 0, BOARD_SIZE, BOARD_SIZE, 22);
  ctx.fillStyle = grad;
  ctx.filter = 'drop-shadow(0px 10px 22px #7e634873)';
  ctx.fill();
  ctx.restore();

  // Frame rim shine
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, BOARD_PADDING - 10, BOARD_PADDING - 10, BOARD_SIZE - 2 * (BOARD_PADDING - 10), BOARD_SIZE - 2 * (BOARD_PADDING - 10), 11);
  ctx.strokeStyle = '#e5ccb1';
  ctx.lineWidth = 2.8;
  ctx.globalAlpha = 0.62;
  ctx.stroke();
  ctx.restore();
}

function drawFrameShadow(ctx) {
  ctx.save();
  // Simulate floor cast shadow
  ctx.beginPath();
  roundRect(ctx, -11, BOARD_SIZE - 8, BOARD_SIZE + 22, 18, 18);
  ctx.fillStyle = FRAME_SHADOW;
  ctx.globalAlpha = 0.55;
  ctx.filter = 'blur(4.2px)';
  ctx.fill();
  ctx.restore();
}

/* === Board Surface with realistic wood grain/radial burst === */
function drawBoardSurfaceReal(ctx) {
  const corner = BOARD_PADDING;
  const size = BOARD_SIZE - 2 * BOARD_PADDING;
  const center = BOARD_SIZE / 2;

  // Base wood color and radial burst
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, corner, corner, size, size, 8.6);
  ctx.clip();

  let woodGrad = ctx.createRadialGradient(center, center, size * 0.18, center, center, size * 0.68);
  woodGrad.addColorStop(0, BOARD_WOOD_GRAIN_LIGHT);
  woodGrad.addColorStop(0.27, BOARD_WOOD);
  woodGrad.addColorStop(0.45, BOARD_WOOD_BURST);
  woodGrad.addColorStop(1, BOARD_WOOD_GRAIN_MID);

  ctx.globalAlpha = 1;
  ctx.fillStyle = woodGrad;
  ctx.fillRect(corner, corner, size, size);

  // Add subtle wood streaks (simulate wood planks)
  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 8; i++) {
    let y = corner + (i + 0.5) * (size / 8);
    ctx.beginPath();
    ctx.moveTo(corner + 1, y);
    ctx.lineTo(BOARD_SIZE - corner - 1, y + 6 * Math.sin(i * 0.75 + _animPulse));
    ctx.lineWidth = 2 + 1.2 * Math.abs(Math.sin(i + _animPulse));
    ctx.strokeStyle = '#ecd1a3';
    ctx.stroke();
  }
  ctx.restore();

  // Surface highlight gradient - gives convex lens shine
  let gradHi = ctx.createLinearGradient(corner, corner, BOARD_SIZE - corner, corner);
  gradHi.addColorStop(0, 'rgba(255,255,255,0.13)');
  gradHi.addColorStop(0.34, 'rgba(255,255,250,0.08)');
  gradHi.addColorStop(0.96, 'rgba(230, 205, 160,0.10)');
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = gradHi;
  ctx.fillRect(corner, corner, size, size);
  ctx.restore();
}

/* === Dusty powder overlay === */
function drawBoardPowder(ctx) {
  ctx.save();
  const center = BOARD_SIZE / 2;
  const size = BOARD_SIZE - 2 * BOARD_PADDING;
  for (let d = 0; d < 50; d++) {
    ctx.beginPath();
    let ang = 2 * Math.PI * (d / 50) + _animPulse * 0.05;
    let rx = size/2 * 0.83 + 11 * Math.sin(d + _animPulse * 1.8);
    let ry = size/2 * 0.8  + 2.1 * Math.sin(d * 2 + _animPulse * 0.7);
    let x = center + rx * Math.cos(ang);
    let y = center + ry * Math.sin(ang);
    ctx.globalAlpha = Math.random() * 0.20 + 0.06;
    ctx.arc(x, y, Math.random() * 1.7 + 0.7, 0, 2 * Math.PI);
    ctx.fillStyle = d % 2 === 0 ? POWDER_COLOR1 : POWDER_COLOR2;
    ctx.fill();
  }
  ctx.restore();
}

/* === Markings - ultimate accuracy: base lines, arrows, inner circles, stars === */
function drawBoardMarkingsReal(ctx) {
  ctx.save();
  const center = BOARD_SIZE / 2;
  const size = BOARD_SIZE - 2 * BOARD_PADDING;

  // Main circle
  ctx.beginPath();
  ctx.arc(center, center, 30, 0, Math.PI * 2);
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.93;
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(180,142,70,0.16)';
  ctx.shadowBlur = 1.8;
  ctx.stroke();

  // Base circles
  ctx.beginPath();
  ctx.arc(center, center, 73, 0, Math.PI * 2);
  ctx.strokeStyle = LINE_ACCENT;
  ctx.lineWidth = 1.65;
  ctx.shadowBlur = 0;
  ctx.stroke();

  // Center dot
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, 3, 0, Math.PI * 2);
  ctx.fillStyle = LINE_COLOR;
  ctx.shadowColor = '#deb76a';
  ctx.shadowBlur = 2.2;
  ctx.fill();
  ctx.restore();

  // Baselines (horizontal and vertical with double-outline for depth)
  let yBot = BOARD_SIZE - BOARD_PADDING - 60;
  let yTop = BOARD_PADDING + 60;
  let xLeft = BOARD_PADDING + 60;
  let xRight = BOARD_SIZE - BOARD_PADDING - 60;
  // Main lines
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xLeft, yBot);
  ctx.lineTo(xRight, yBot);
  ctx.strokeStyle = BASELINE_DARK;
  ctx.lineWidth = 2.4;
  ctx.shadowBlur = 2;
  ctx.globalAlpha = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(xLeft, yTop);
  ctx.lineTo(xRight, yTop);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(xLeft, yTop);
  ctx.lineTo(xLeft, yBot);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(xRight, yTop);
  ctx.lineTo(xRight, yBot);
  ctx.stroke();
  ctx.restore();
  // Accent light lines
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xLeft, yTop - 2.5);
  ctx.lineTo(xRight, yTop - 2.5);
  ctx.moveTo(xLeft, yBot + 2.5);
  ctx.lineTo(xRight, yBot + 2.5);
  ctx.moveTo(xLeft - 2.5, yTop);
  ctx.lineTo(xLeft - 2.5, yBot);
  ctx.moveTo(xRight + 2.5, yTop);
  ctx.lineTo(xRight + 2.5, yBot);
  ctx.strokeStyle = BASELINE_LIGHT;
  ctx.lineWidth = 1.18;
  ctx.globalAlpha = 0.78;
  ctx.shadowBlur = 0.6;
  ctx.stroke();
  ctx.restore();

  // Circles at line ends
  let endCircleRadius = 8.7;
  let positions = [
    { x: xLeft, y: yBot },
    { x: xRight, y: yBot },
    { x: xLeft, y: yTop },
    { x: xRight, y: yTop },
  ];
  for (let i = 0; i < positions.length; i++) {
    ctx.beginPath();
    ctx.arc(positions[i].x, positions[i].y, endCircleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.globalAlpha = 0.17;
    ctx.fillStyle = '#f3edc1';
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Triangle arrows at base lines
  let arrowSz = 6.5;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(center - arrowSz, yBot - arrowSz);
  ctx.lineTo(center, yBot + arrowSz + 1.2);
  ctx.lineTo(center + arrowSz, yBot - arrowSz);
  ctx.closePath();
  ctx.fillStyle = BASELINE_DARK;
  ctx.globalAlpha = 0.92;
  ctx.shadowBlur = 0.4;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(center - arrowSz, yTop + arrowSz);
  ctx.lineTo(center, yTop - arrowSz - 1.2);
  ctx.lineTo(center + arrowSz, yTop + arrowSz);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // STAR motifs (near corners, 8-point sharp)
  drawRealStar(ctx, BOARD_PADDING + 43, BOARD_PADDING + 43, 8, 10.6, 4.9, '#deae6d');
  drawRealStar(ctx, BOARD_SIZE - BOARD_PADDING - 43, BOARD_PADDING + 43, 8, 10.6, 4.9, '#deae6d');
  drawRealStar(ctx, BOARD_PADDING + 43, BOARD_SIZE - BOARD_PADDING - 43, 8, 10.6, 4.9, '#deae6d');
  drawRealStar(ctx, BOARD_SIZE - BOARD_PADDING - 43, BOARD_SIZE - BOARD_PADDING - 43, 8, 10.6, 4.9, '#deae6d');

  ctx.restore();
}

function drawRealStar(ctx, cx, cy, spikes, outerR, innerR, color) {
  let rot = Math.PI / 2 * 3;
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
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.86 + 0.05 * _animPulse;
  ctx.shadowColor = "#deb96c";
  ctx.shadowBlur = 2.2;
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = "#ecd1a3";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
}

/* === Pockets: rim, depth, net perspective === */
function drawBoardPocketsReal(ctx) {
  let pockets = getPockets();
  for (let i = 0; i < pockets.length; i++) {
    let pocket = pockets[i];

    // Pocket shadow around outside
    ctx.save();
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS + 7.15 + 2 * _animPulse, 0, Math.PI * 2);
    ctx.globalAlpha = 0.26 + 0.035 * _animPulse;
    ctx.fillStyle = 'rgba(40, 21, 0, 0.18)';
    ctx.filter = "blur(1.8px)";
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.filter = "none";
    ctx.restore();

    // Pocket 3D rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS + 4.5, 0, Math.PI * 2);
    ctx.strokeStyle = "#d7c4a7";
    ctx.lineWidth = 2.8;
    ctx.globalAlpha = 0.64;
    ctx.stroke();
    ctx.restore();

    // Main pocket darkness
    let pocketGrad = ctx.createRadialGradient(
      pocket.x, pocket.y, POCKET_RADIUS * 0.1 + 0.4 * Math.abs(_animPulse),
      pocket.x, pocket.y, POCKET_RADIUS + 2
    );
    pocketGrad.addColorStop(0, POCKET_INNER);
    pocketGrad.addColorStop(0.71, POCKET_OUTER);
    pocketGrad.addColorStop(1, 'rgba(60, 40, 10,0.32)');

    ctx.save();
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = pocketGrad;
    ctx.fill();

    // Pocket net (gently simulated with crossing arcs)
    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = POCKET_NET;
    ctx.lineWidth = 1.05;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      ctx.beginPath();
      ctx.arc(
        pocket.x + 2 * Math.cos(angle),
        pocket.y + 2 * Math.sin(angle),
        POCKET_RADIUS * 0.65,
        0, Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 0.18;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(pocket.x - POCKET_RADIUS * 0.6, pocket.y - POCKET_RADIUS * 0.6);
    ctx.lineTo(pocket.x + POCKET_RADIUS * 0.6, pocket.y + POCKET_RADIUS * 0.6);
    ctx.moveTo(pocket.x + POCKET_RADIUS * 0.6, pocket.y - POCKET_RADIUS * 0.6);
    ctx.lineTo(pocket.x - POCKET_RADIUS * 0.6, pocket.y + POCKET_RADIUS * 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.restore();

    // Gloss highlight
    ctx.save();
    ctx.beginPath();
    ctx.arc(pocket.x - 3, pocket.y - 3, POCKET_RADIUS * 0.47, -Math.PI * 0.8, -Math.PI * 0.18);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.globalAlpha = 0.82;
    ctx.lineWidth = 1.42;
    ctx.stroke();
    ctx.restore();
  }
}

/* === Piece (coins, queen, striker): realistic 3D, shadow, highlight, surface details === */
function drawPieceReal(ctx, piece, isStrikerAiming) {
  let { x, y, radius, type } = piece;
  ctx.save();

  // Shadow (soft, colored beneath, varies on striker)
  ctx.save();
  ctx.beginPath();
  ctx.arc(
    x + (type === 'striker' ? 4.2 : 2.3),
    y + (type === 'striker' ? 4 : 2.5),
    radius + 2.3, 0, Math.PI * 2
  );
  ctx.globalAlpha = type === 'striker' ? 0.22 : 0.15 + 0.06 * Math.abs(_animPulse);
  ctx.fillStyle = type === 'striker' ? STRIKER_SHADOW : SHADOW_DARK;
  ctx.filter = type === 'striker' && isStrikerAiming ? 'blur(3.6px)' : 'blur(2.8px)';
  ctx.fill();
  ctx.restore();

  // COIN body (gradient, edge, dot/ring, highlights)
  let topColor, edgeColor, spotColor, ringColor;
  if (type === 'white') {
    topColor = WHITE_PIECE_TOP;
    edgeColor = WHITE_PIECE_EDGE;
    spotColor = WHITE_PIECE_DOT;
    ringColor = "#fff3d3";
  } else if (type === 'black') {
    topColor = BLACK_PIECE_TOP;
    edgeColor = BLACK_PIECE_EDGE;
    spotColor = BLACK_PIECE_DOT;
    ringColor = "#c9bca7";
  } else if (type === 'queen') {
    topColor = QUEEN_TOP;
    edgeColor = QUEEN_EDGE;
    spotColor = "#fbeee7";
    ringColor = QUEEN_RING;
  } else if (type === 'striker') {
    topColor = STRIKER_TOP;
    edgeColor = STRIKER_EDGE;
    spotColor = STRIKER_RING;
    ringColor = "#deecfc";
  } else {
    topColor = '#bbb'; edgeColor = '#888'; spotColor = '#ddd'; ringColor = "#eee";
  }

  // 3D fill
  let grad = ctx.createRadialGradient(
    x - radius * 0.35, y - radius * 0.25, radius * 0.13,
    x, y, radius * 1.02
  );
  grad.addColorStop(0, topColor);
  grad.addColorStop(0.50, topColor);
  grad.addColorStop(0.87, edgeColor);
  grad.addColorStop(1, '#888');

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = grad;
  ctx.fill();

  // Edge rim line
  ctx.lineWidth = type === 'striker' ? 2.18 : 1.32;
  ctx.strokeStyle = edgeColor;
  ctx.shadowColor = 'rgba(0,0,0,0.05)';
  ctx.shadowBlur = 0.9;
  ctx.stroke();

  // Inner ring/accent
  if (type === 'queen' || type === 'striker' || type === 'white' || type === 'black') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.63, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = type === 'queen' ? 1.32 : 1.06;
    ctx.globalAlpha = 0.69;
    ctx.stroke();
    ctx.restore();
  }

  // Spot or central detail (dot, flower for queen, ring for striker)
  ctx.save();
  if (type === 'queen') {
    // Queen: floral effect petals + dot
    ctx.globalAlpha = 0.91;
    for (let i = 0; i < 6; i++) {
      let angle = i * Math.PI / 3 + _animPulse * 0.15;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(angle) * radius * 0.28,
        y + Math.sin(angle) * radius * 0.27,
        2.7, 1.17, angle, 0, 2 * Math.PI
      );
      ctx.fillStyle = '#fcdce4';
      ctx.globalAlpha = 0.19 + 0.12 * Math.abs(_animPulse);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, 2.18, 0, Math.PI * 2);
    ctx.fillStyle = spotColor;
    ctx.globalAlpha = 1;
    ctx.fill();
  } else if (type === 'striker') {
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
    ctx.strokeStyle = spotColor;
    ctx.lineWidth = 2.1;
    ctx.globalAlpha = .68;
    ctx.setLineDash([2.6, 3.2]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.19, 0, Math.PI * 2);
    ctx.strokeStyle = "#b5cee6";
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    if (isStrikerAiming) {
      ctx.beginPath();
      ctx.arc(x, y, 3.1 + 0.7 * _animPulse, 0, 2 * Math.PI);
      ctx.fillStyle = '#a8daff';
      ctx.globalAlpha = 0.37 + 0.14 * Math.abs(_animPulse);
      ctx.fill();
    }
  } else {
    // Coin: dot in center
    ctx.beginPath();
    ctx.arc(x, y, 1.9, 0, Math.PI * 2);
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = spotColor;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
  ctx.restore();

  // Glossy highlight ellipse
  let hlGrad = ctx.createRadialGradient(
    x - radius * 0.51, y - radius * 0.38, 0,
    x - radius * 0.25, y - radius * 0.25, radius * 0.69
  );
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.24)');
  hlGrad.addColorStop(0.56, 'rgba(255,255,255,0.08)');
  hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(x, y, radius - 0.4, 0, 2 * Math.PI);
  ctx.fillStyle = hlGrad;
  ctx.globalAlpha = 0.88;
  ctx.fill();

  ctx.restore();
}

/* === Aim Guide: More realistic aim + power bar === */
function drawAimGuideReal(ctx, striker, aimState) {
  let angle = aimState.angle;
  let power = aimState.power;
  let lineLength = 62 + power * 130;
  let endX = striker.x + Math.cos(angle) * lineLength;
  let endY = striker.y + Math.sin(angle) * lineLength;

  // Dotted aim line w/ perspective shadow
  let numDots = Math.floor(lineLength / 8);
  for (let i = 1; i <= numDots; i++) {
    let t = i / numDots;
    let dotX = striker.x + (endX - striker.x) * t;
    let dotY = striker.y + (endY - striker.y) * t;
    let dotAlpha = 0.78 - t * 0.62 + 0.10 * Math.abs(_animPulse);
    let dotRadius = 2.6 - t * 1.0 + 0.25 * Math.sin(Date.now() / 146 + t * 2.3);

    ctx.save();
    ctx.beginPath();
    ctx.arc(dotX, dotY, Math.max(0.9, dotRadius), 0, Math.PI * 2);
    ctx.globalAlpha = dotAlpha;
    ctx.fillStyle = "#3b82f6";
    ctx.shadowColor = '#04214b';
    ctx.shadowBlur = 2.1;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Main line below dots
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(striker.x, striker.y);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = "#06b6d4";
  ctx.lineWidth = 2.2 + 1.3 * Math.abs(_animPulse);
  ctx.setLineDash([4, 7]);
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 2.0 + 2.8 * Math.abs(_animPulse);
  ctx.globalAlpha = 0.67;
  ctx.stroke();
  ctx.restore();

  // Final target ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(endX, endY, 7.5 + 1.1 * Math.abs(_animPulse), 0, Math.PI * 2);
  let dotGrad = ctx.createRadialGradient(endX, endY, 0, endX, endY, 6.9);
  dotGrad.addColorStop(0, '#06b6d4');
  dotGrad.addColorStop(1, 'rgba(59,130,246,0.12)');
  ctx.fillStyle = dotGrad;
  ctx.globalAlpha = 0.83;
  ctx.fill();
  ctx.restore();

  // Power bar - below striker
  let barWidth = 48;
  let barHeight = 8.9;
  let barX = striker.x - barWidth / 2;
  let barY = striker.y + striker.radius + 15;
  roundRect(ctx, barX, barY, barWidth, barHeight, 4.1);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(0,0,0,0.19)";
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
  roundRect(ctx, barX, barY, barWidth, barHeight, 4.1);
  ctx.strokeStyle = '#eaeaea';
  ctx.lineWidth = 0.72;
  ctx.stroke();

  // Power % text
  ctx.font = '10.3px Inter, sans-serif';
  ctx.fillStyle = '#2e2e2e';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(power * 100) + '%', striker.x, barY + barHeight + 13);

  ctx.textAlign = 'start';
}

/* === Util: Draw rounded rect === */
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
