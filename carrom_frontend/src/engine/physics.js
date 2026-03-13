/**
 * physics.js
 * 2D physics engine for carrom board simulation.
 * Handles piece movement, collisions (piece-piece, piece-wall), friction, and pocketing.
 */

// Board constants (logical units; canvas will scale)
export const BOARD_SIZE = 600;
export const BOARD_PADDING = 30; // border width
export const POCKET_RADIUS = 22;
export const PIECE_RADIUS = 12;
export const STRIKER_RADIUS = 16;
export const FRICTION = 0.985; // per-frame velocity damping
export const MIN_VELOCITY = 0.15; // below this, piece stops
export const RESTITUTION = 0.85; // bounce energy retention
export const MAX_STRIKER_POWER = 18;

// Pocket positions (corners of inner play area)
const INNER_MIN = BOARD_PADDING + 10;
const INNER_MAX = BOARD_SIZE - BOARD_PADDING - 10;

// PUBLIC_INTERFACE
/**
 * Returns the four pocket center positions on the board.
 * @returns {Array<{x: number, y: number}>} Array of pocket positions
 */
export function getPockets() {
  return [
    { x: INNER_MIN, y: INNER_MIN },
    { x: INNER_MAX, y: INNER_MIN },
    { x: INNER_MIN, y: INNER_MAX },
    { x: INNER_MAX, y: INNER_MAX },
  ];
}

// PUBLIC_INTERFACE
/**
 * Creates a new piece object for the physics simulation.
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Piece radius
 * @param {string} type - 'white' | 'black' | 'queen' | 'striker'
 * @returns {object} Piece object with position, velocity, and metadata
 */
export function createPiece(x, y, radius, type) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius,
    type,
    pocketed: false,
    mass: type === 'striker' ? 2.0 : 1.0,
  };
}

// PUBLIC_INTERFACE
/**
 * Sets up the initial arrangement of carrom pieces on the board.
 * Returns an array of piece objects: 9 white, 9 black, 1 queen.
 * @returns {Array<object>} Array of piece objects
 */
export function createInitialPieces() {
  const center = BOARD_SIZE / 2;
  const pieces = [];

  // Queen at center
  pieces.push(createPiece(center, center, PIECE_RADIUS, 'queen'));

  // Arrange pieces in concentric rings around center
  // Inner ring: 6 pieces alternating black/white
  const innerRadius = 28;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const type = i % 2 === 0 ? 'white' : 'black';
    pieces.push(
      createPiece(
        center + innerRadius * Math.cos(angle),
        center + innerRadius * Math.sin(angle),
        PIECE_RADIUS,
        type
      )
    );
  }

  // Outer ring: 12 pieces alternating
  const outerRadius = 55;
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI / 6) * i + Math.PI / 12;
    const type = i % 2 === 0 ? 'black' : 'white';
    pieces.push(
      createPiece(
        center + outerRadius * Math.cos(angle),
        center + outerRadius * Math.sin(angle),
        PIECE_RADIUS,
        type
      )
    );
  }

  return pieces;
}

// PUBLIC_INTERFACE
/**
 * Creates the striker piece at the given position.
 * @param {number} x - X position of striker
 * @param {number} bottomY - Y position (baseline for current player)
 * @returns {object} Striker piece object
 */
export function createStriker(x, bottomY) {
  return createPiece(x, bottomY, STRIKER_RADIUS, 'striker');
}

/**
 * Detects and resolves collision between two circular pieces.
 * Uses elastic collision formula adjusted by restitution.
 * @param {object} a - First piece
 * @param {object} b - Second piece
 */
function resolveCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radius + b.radius;

  if (dist < minDist && dist > 0) {
    // Normalize collision vector
    const nx = dx / dist;
    const ny = dy / dist;

    // Separate overlapping pieces
    const overlap = (minDist - dist) / 2;
    a.x -= overlap * nx;
    a.y -= overlap * ny;
    b.x += overlap * nx;
    b.y += overlap * ny;

    // Relative velocity
    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const dvDotN = dvx * nx + dvy * ny;

    // Only resolve if pieces are moving toward each other
    if (dvDotN > 0) {
      const totalMass = a.mass + b.mass;
      const impulse = (2 * dvDotN * RESTITUTION) / totalMass;

      a.vx -= impulse * b.mass * nx;
      a.vy -= impulse * b.mass * ny;
      b.vx += impulse * a.mass * nx;
      b.vy += impulse * a.mass * ny;
    }
  }
}

/**
 * Handles wall bounce for a single piece.
 * @param {object} piece - The piece to check for wall collision
 */
function resolveWallCollision(piece) {
  const minBound = BOARD_PADDING + piece.radius;
  const maxBound = BOARD_SIZE - BOARD_PADDING - piece.radius;

  if (piece.x < minBound) {
    piece.x = minBound;
    piece.vx = -piece.vx * RESTITUTION;
  }
  if (piece.x > maxBound) {
    piece.x = maxBound;
    piece.vx = -piece.vx * RESTITUTION;
  }
  if (piece.y < minBound) {
    piece.y = minBound;
    piece.vy = -piece.vy * RESTITUTION;
  }
  if (piece.y > maxBound) {
    piece.y = maxBound;
    piece.vy = -piece.vy * RESTITUTION;
  }
}

/**
 * Checks if a piece has entered a pocket.
 * @param {object} piece - The piece to check
 * @param {Array} pockets - Array of pocket positions
 * @returns {boolean} True if piece is in a pocket
 */
function checkPocketed(piece, pockets) {
  for (const pocket of pockets) {
    const dx = piece.x - pocket.x;
    const dy = piece.y - pocket.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < POCKET_RADIUS) {
      return true;
    }
  }
  return false;
}

// PUBLIC_INTERFACE
/**
 * Advances the physics simulation by one time step.
 * Moves pieces, applies friction, resolves collisions and pocketing.
 * @param {Array<object>} pieces - All pieces (coins + striker)
 * @returns {{ moving: boolean, newlyPocketed: Array<object> }} Status after step
 */
export function physicsStep(pieces) {
  const pockets = getPockets();
  const activePieces = pieces.filter((p) => !p.pocketed);
  const newlyPocketed = [];

  // Move pieces
  for (const piece of activePieces) {
    piece.x += piece.vx;
    piece.y += piece.vy;

    // Apply friction
    piece.vx *= FRICTION;
    piece.vy *= FRICTION;

    // Stop if very slow
    const speed = Math.sqrt(piece.vx * piece.vx + piece.vy * piece.vy);
    if (speed < MIN_VELOCITY) {
      piece.vx = 0;
      piece.vy = 0;
    }
  }

  // Piece-piece collisions
  for (let i = 0; i < activePieces.length; i++) {
    for (let j = i + 1; j < activePieces.length; j++) {
      resolveCollision(activePieces[i], activePieces[j]);
    }
  }

  // Wall collisions
  for (const piece of activePieces) {
    resolveWallCollision(piece);
  }

  // Pocket detection
  for (const piece of activePieces) {
    if (checkPocketed(piece, pockets)) {
      piece.pocketed = true;
      piece.vx = 0;
      piece.vy = 0;
      newlyPocketed.push(piece);
    }
  }

  // Check if any piece is still moving
  const moving = activePieces.some((p) => {
    if (p.pocketed) return false;
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    return speed >= MIN_VELOCITY;
  });

  return { moving, newlyPocketed };
}

// PUBLIC_INTERFACE
/**
 * Launches the striker in a given direction with given power.
 * @param {object} striker - The striker piece
 * @param {number} angle - Angle in radians
 * @param {number} power - Power (0-1 normalized)
 */
export function launchStriker(striker, angle, power) {
  const speed = power * MAX_STRIKER_POWER;
  striker.vx = Math.cos(angle) * speed;
  striker.vy = Math.sin(angle) * speed;
}
