/**
 * ai.js
 * AI opponent logic for the carrom game.
 * Computes striker angle and power based on difficulty level.
 */

import { BOARD_SIZE, BOARD_PADDING, PIECE_RADIUS, getPockets } from './physics';

/**
 * Calculates the distance between two points.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Adds randomness to a value based on difficulty.
 * @param {number} value - Base value
 * @param {number} range - Max random offset
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @returns {number}
 */
function addNoise(value, range, difficulty) {
  const noiseScale = difficulty === 'easy' ? 1.0 : difficulty === 'medium' ? 0.5 : 0.15;
  return value + (Math.random() * 2 - 1) * range * noiseScale;
}

// PUBLIC_INTERFACE
/**
 * Computes an AI move: striker position, angle, and power.
 * The AI targets its assigned pieces (black for player 2) towards the nearest pocket.
 * @param {Array<object>} pieces - Current game pieces
 * @param {object} striker - Striker piece
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @returns {{ strikerX: number, angle: number, power: number }}
 */
export function computeAIMove(pieces, striker, difficulty) {
  const pockets = getPockets();
  const aiPieces = pieces.filter(p => p.type === 'black' && !p.pocketed);
  const queen = pieces.find(p => p.type === 'queen' && !p.pocketed);

  // Target selection: find the piece-pocket pair with best angle
  let bestTarget = null;
  let bestScore = -Infinity;

  const targets = [...aiPieces];
  if (queen && aiPieces.length <= 3) {
    targets.push(queen); // Go for queen when few pieces left
  }

  for (const target of targets) {
    for (const pocket of pockets) {
      const distToPocket = distance(target.x, target.y, pocket.x, pocket.y);
      const distFromStriker = distance(striker.x, striker.y, target.x, target.y);

      // Score based on how close the target is to a pocket and how aligned the shot would be
      const angleToTarget = Math.atan2(target.y - striker.y, target.x - striker.x);
      const angleToPocket = Math.atan2(pocket.y - target.y, pocket.x - target.x);

      // Alignment: how well the striker->target->pocket lines up
      const angleDiff = Math.abs(angleToTarget - angleToPocket);
      const alignment = Math.cos(angleDiff);

      const score = alignment * 100 - distToPocket * 0.5 - distFromStriker * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = { target, pocket };
      }
    }
  }

  // Default: aim at center
  let angle = -Math.PI / 2; // Aim upward (AI is at top)
  let power = 0.5;
  let strikerX = BOARD_SIZE / 2;

  if (bestTarget) {
    const { target, pocket } = bestTarget;

    // Calculate the ideal point on the target piece to hit
    // to send it toward the pocket
    const angleToPocket = Math.atan2(pocket.y - target.y, pocket.x - target.x);
    const hitPointX = target.x - Math.cos(angleToPocket) * (PIECE_RADIUS * 2);
    const hitPointY = target.y - Math.sin(angleToPocket) * (PIECE_RADIUS * 2);

    angle = Math.atan2(hitPointY - striker.y, hitPointX - striker.x);
    const dist = distance(striker.x, striker.y, hitPointX, hitPointY);

    // Power based on distance
    power = Math.min(0.9, Math.max(0.25, dist / (BOARD_SIZE * 0.7)));

    // Position striker optimally within baseline range
    const baselineMin = BOARD_PADDING + 80;
    const baselineMax = BOARD_SIZE - BOARD_PADDING - 80;
    strikerX = Math.max(baselineMin, Math.min(baselineMax, hitPointX));
  }

  // Add difficulty-based noise
  angle = addNoise(angle, 0.25, difficulty);
  power = Math.max(0.15, Math.min(0.95, addNoise(power, 0.15, difficulty)));
  strikerX = addNoise(strikerX, 30, difficulty);

  // Clamp striker X
  const minX = BOARD_PADDING + 80;
  const maxX = BOARD_SIZE - BOARD_PADDING - 80;
  strikerX = Math.max(minX, Math.min(maxX, strikerX));

  return { strikerX, angle, power };
}
