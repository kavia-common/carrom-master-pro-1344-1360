/**
 * api.js
 * REST API and WebSocket service layer for communicating with the carrom backend.
 * Backend runs on port 3001. Uses environment variables for configuration.
 */

// Base URL for the backend API - configurable via environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

// PUBLIC_INTERFACE
/**
 * Makes a GET request to the backend API.
 * @param {string} endpoint - API endpoint path (e.g., '/games')
 * @returns {Promise<object>} Parsed JSON response
 */
export async function apiGet(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`API GET ${endpoint} failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`API GET ${endpoint} error:`, error.message);
    return null;
  }
}

// PUBLIC_INTERFACE
/**
 * Makes a POST request to the backend API.
 * @param {string} endpoint - API endpoint path
 * @param {object} body - Request body to send as JSON
 * @returns {Promise<object>} Parsed JSON response
 */
export async function apiPost(endpoint, body) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`API POST ${endpoint} failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`API POST ${endpoint} error:`, error.message);
    return null;
  }
}

// PUBLIC_INTERFACE
/**
 * Checks backend health / connectivity.
 * @returns {Promise<boolean>} True if backend is reachable
 */
export async function checkHealth() {
  const result = await apiGet('/');
  return result !== null;
}

// PUBLIC_INTERFACE
/**
 * Creates a new game session on the backend.
 * @param {string} mode - 'local' or 'ai'
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @returns {Promise<object|null>} Game session data or null if offline
 */
export async function createGame(mode, difficulty) {
  return apiPost('/games', { mode, difficulty });
}

// PUBLIC_INTERFACE
/**
 * Sends a move (striker action) to the backend.
 * @param {string} gameId - Game session ID
 * @param {object} moveData - { angle, power, strikerX }
 * @returns {Promise<object|null>} Updated game state or null
 */
export async function sendMove(gameId, moveData) {
  return apiPost(`/games/${gameId}/move`, moveData);
}

// WebSocket connection management
let wsConnection = null;
let wsReconnectTimer = null;
let wsMessageHandlers = [];

// PUBLIC_INTERFACE
/**
 * Connects to the backend WebSocket for real-time game state updates.
 * @param {string} gameId - Game session ID
 * @param {function} onMessage - Callback for incoming messages
 * @param {function} onError - Callback for connection errors
 * @returns {function} Cleanup function to disconnect
 */
export function connectWebSocket(gameId, onMessage, onError) {
  // Clean up any existing connection
  disconnectWebSocket();

  const url = `${WS_BASE_URL}/ws/game/${gameId}`;

  try {
    wsConnection = new WebSocket(url);

    wsConnection.onopen = () => {
      console.log('WebSocket connected to game:', gameId);
    };

    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
        wsMessageHandlers.forEach(handler => handler(data));
      } catch (e) {
        console.warn('WebSocket message parse error:', e);
      }
    };

    wsConnection.onerror = (error) => {
      console.warn('WebSocket error:', error);
      if (onError) onError(error);
    };

    wsConnection.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt reconnect after delay
      wsReconnectTimer = setTimeout(() => {
        if (gameId) {
          connectWebSocket(gameId, onMessage, onError);
        }
      }, 3000);
    };
  } catch (e) {
    console.warn('WebSocket connection failed:', e.message);
  }

  return disconnectWebSocket;
}

// PUBLIC_INTERFACE
/**
 * Disconnects the WebSocket connection.
 */
export function disconnectWebSocket() {
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  if (wsConnection) {
    wsConnection.onclose = null; // Prevent reconnect
    wsConnection.close();
    wsConnection = null;
  }
  wsMessageHandlers = [];
}

// PUBLIC_INTERFACE
/**
 * Sends a message through the WebSocket connection.
 * @param {object} data - Data to send as JSON
 */
export function sendWebSocketMessage(data) {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    wsConnection.send(JSON.stringify(data));
  } else {
    console.warn('WebSocket not connected, message not sent');
  }
}

// PUBLIC_INTERFACE
/**
 * Registers an additional handler for incoming WebSocket messages.
 * @param {function} handler - Callback function
 * @returns {function} Unsubscribe function
 */
export function onWebSocketMessage(handler) {
  wsMessageHandlers.push(handler);
  return () => {
    wsMessageHandlers = wsMessageHandlers.filter(h => h !== handler);
  };
}
