/**
 * sound.js
 * Sound effect manager using the Web Audio API.
 * Generates synthetic sounds for carrom game events.
 */

let audioContext = null;
let soundEnabled = true;

/**
 * Lazily initializes the AudioContext (requires user gesture).
 * @returns {AudioContext|null}
 */
function getAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      // Web Audio not supported
      return null;
    }
  }
  return audioContext;
}

// PUBLIC_INTERFACE
/**
 * Enables or disables sound effects globally.
 * @param {boolean} enabled - Whether sounds should play
 */
export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
}

// PUBLIC_INTERFACE
/**
 * Returns whether sound is currently enabled.
 * @returns {boolean}
 */
export function isSoundEnabled() {
  return soundEnabled;
}

/**
 * Plays a simple tone with the given parameters.
 * @param {number} frequency - Base frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {string} type - Oscillator type ('sine', 'square', 'triangle', 'sawtooth')
 * @param {number} volume - Volume from 0 to 1
 */
function playTone(frequency, duration, type = 'sine', volume = 0.3) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

/**
 * Plays a noise burst (for collision sounds).
 * @param {number} duration - Duration in seconds
 * @param {number} volume - Volume from 0 to 1
 */
function playNoise(duration, volume = 0.15) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(ctx.currentTime);
}

// PUBLIC_INTERFACE
/** Plays the striker launch / flick sound. */
export function playStrikerSound() {
  playTone(300, 0.15, 'triangle', 0.25);
  playNoise(0.08, 0.12);
}

// PUBLIC_INTERFACE
/** Plays the collision sound when pieces hit each other. */
export function playCollisionSound() {
  playTone(800, 0.08, 'sine', 0.15);
  playNoise(0.05, 0.08);
}

// PUBLIC_INTERFACE
/** Plays the pocket / scoring sound. */
export function playPocketSound() {
  playTone(520, 0.2, 'sine', 0.3);
  setTimeout(() => playTone(780, 0.15, 'sine', 0.2), 80);
}

// PUBLIC_INTERFACE
/** Plays the foul sound (striker pocketed). */
export function playFoulSound() {
  playTone(200, 0.3, 'square', 0.2);
  setTimeout(() => playTone(150, 0.3, 'square', 0.15), 150);
}

// PUBLIC_INTERFACE
/** Plays the game over / victory sound. */
export function playGameOverSound() {
  playTone(440, 0.2, 'sine', 0.3);
  setTimeout(() => playTone(550, 0.2, 'sine', 0.3), 150);
  setTimeout(() => playTone(660, 0.2, 'sine', 0.3), 300);
  setTimeout(() => playTone(880, 0.4, 'sine', 0.35), 450);
}

// PUBLIC_INTERFACE
/** Plays the turn change notification sound. */
export function playTurnSound() {
  playTone(600, 0.1, 'triangle', 0.15);
}
