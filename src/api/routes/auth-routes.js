/**
 * Authentication Routes Module
 * 
 * Handles user authentication, token management, and session control.
 * Part of the modular API refactoring for improved maintainability.
 * 
 * Endpoints:
 * - POST /api/auth/login - User authentication with credentials
 * - POST /api/auth/refresh - Refresh access token using refresh token
 * - POST /api/auth/logout - User logout and token invalidation
 * - GET /api/auth/me - Get current authenticated user information
 * 
 * @module AuthRoutes
 */

import express from 'express';
import authService from '../auth-service.js';
import errorHandler from '../../core/error-handler.js';

const router = express.Router();

/**
 * Login endpoint
 */
router.post('/api/auth/login', errorHandler.asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    throw new errorHandler.ValidationError('Username and password required', 'credentials');
  }
  
  const result = await authService.authenticate(username, password);
  res.json(result);
}));

/**
 * Refresh token endpoint
 */
router.post('/api/auth/refresh', errorHandler.asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new errorHandler.ValidationError('Refresh token required', 'refreshToken');
  }
  
  const result = await authService.refreshAccessToken(refreshToken);
  res.json(result);
}));

/**
 * Logout endpoint
 */
router.post('/api/auth/logout', authService.authenticateRequest(false), (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { refreshToken } = req.body;
  
  authService.logout(sessionId, refreshToken);
  res.json({ message: 'Logged out successfully' });
});

/**
 * Get current user
 */
router.get('/api/auth/me', authService.authenticateRequest(), (req, res) => {
  res.json({ user: req.user });
});

export default router;