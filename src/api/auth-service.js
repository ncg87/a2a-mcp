/**
 * Authentication Service
 * 
 * JWT-based authentication and authorization for the API
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import logger from '../utils/logger.js';

class AuthService {
  constructor() {
    // Generate or load JWT secret
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecret();
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
    
    // Store users in memory for now (should be database in production)
    this.users = new Map();
    this.refreshTokens = new Map();
    this.sessions = new Map();
    
    // Initialize with default admin user
    this.initializeDefaultUsers();
  }

  /**
   * Generate a secure random secret
   */
  generateSecret() {
    const secret = crypto.randomBytes(64).toString('hex');
    logger.warn('Generated random JWT secret - set JWT_SECRET env variable in production');
    return secret;
  }

  /**
   * Initialize default users
   */
  async initializeDefaultUsers() {
    // Create default admin user
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    await this.createUser('admin', adminPassword, ['admin', 'user']);
    
    // Create default user
    await this.createUser('user', 'user123', ['user']);
    
    logger.info('Default users initialized (admin/user)');
  }

  /**
   * Create a new user
   */
  async createUser(username, password, roles = ['user']) {
    try {
      // Check if user exists
      if (this.users.has(username)) {
        throw new Error('User already exists');
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Store user
      const user = {
        id: crypto.randomUUID(),
        username,
        password: hashedPassword,
        roles,
        createdAt: new Date(),
        lastLogin: null
      };
      
      this.users.set(username, user);
      logger.info(`User created: ${username}`);
      
      return { id: user.id, username, roles };
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Authenticate user
   */
  async authenticate(username, password) {
    try {
      // Get user
      const user = this.users.get(username);
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new Error('Invalid credentials');
      }
      
      // Update last login
      user.lastLogin = new Date();
      
      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);
      
      // Store refresh token
      this.refreshTokens.set(refreshToken, {
        userId: user.id,
        username: user.username,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      
      // Create session
      const sessionId = crypto.randomUUID();
      this.sessions.set(sessionId, {
        userId: user.id,
        username: user.username,
        startedAt: new Date(),
        lastActivity: new Date()
      });
      
      logger.info(`User authenticated: ${username}`);
      
      return {
        accessToken,
        refreshToken,
        sessionId,
        user: {
          id: user.id,
          username: user.username,
          roles: user.roles
        }
      };
    } catch (error) {
      logger.error('Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        roles: user.roles
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry }
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        type: 'refresh'
      },
      this.jwtSecret,
      { expiresIn: this.refreshTokenExpiry }
    );
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Check if it's not a refresh token
      if (decoded.type === 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtSecret);
      
      // Check if it's a refresh token
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      // Check if refresh token is stored and valid
      const storedToken = this.refreshTokens.get(refreshToken);
      if (!storedToken) {
        throw new Error('Refresh token not found');
      }
      
      if (storedToken.expiresAt < new Date()) {
        this.refreshTokens.delete(refreshToken);
        throw new Error('Refresh token expired');
      }
      
      // Get user
      const user = this.users.get(storedToken.username);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Generate new access token
      const newAccessToken = this.generateAccessToken(user);
      
      logger.info(`Access token refreshed for: ${user.username}`);
      
      return {
        accessToken: newAccessToken,
        user: {
          id: user.id,
          username: user.username,
          roles: user.roles
        }
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout(sessionId, refreshToken) {
    // Remove session
    if (sessionId) {
      this.sessions.delete(sessionId);
    }
    
    // Remove refresh token
    if (refreshToken) {
      this.refreshTokens.delete(refreshToken);
    }
    
    logger.info('User logged out');
  }

  /**
   * Middleware to verify authentication
   */
  authenticateRequest(required = true) {
    return (req, res, next) => {
      try {
        // Extract token from header or query
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
          ? authHeader.substring(7) 
          : req.query.token;
        
        if (!token) {
          if (required) {
            return res.status(401).json({ error: 'Authentication required' });
          }
          // Optional auth - continue without user
          return next();
        }
        
        // Verify token
        const user = this.verifyAccessToken(token);
        
        // Attach user to request
        req.user = user;
        
        // Update session activity
        const sessionId = req.headers['x-session-id'];
        if (sessionId && this.sessions.has(sessionId)) {
          this.sessions.get(sessionId).lastActivity = new Date();
        }
        
        next();
      } catch (error) {
        if (!required) {
          // Optional auth - continue without user
          return next();
        }
        
        logger.error('Authentication middleware error:', error);
        res.status(401).json({ error: error.message });
      }
    };
  }

  /**
   * Middleware to check authorization
   */
  authorize(...requiredRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if user has any of the required roles
      const hasRole = requiredRoles.some(role => 
        req.user.roles && req.user.roles.includes(role)
      );
      
      if (!hasRole) {
        logger.warn(`Authorization failed for user ${req.user.username} - missing roles: ${requiredRoles}`);
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    };
  }

  /**
   * Get user by ID
   */
  getUserById(userId) {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return {
          id: user.id,
          username: user.username,
          roles: user.roles,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        };
      }
    }
    return null;
  }

  /**
   * Get all users
   */
  getAllUsers() {
    return Array.from(this.users.values()).map(user => ({
      id: user.id,
      username: user.username,
      roles: user.roles,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }));
  }

  /**
   * Delete user
   */
  deleteUser(username) {
    if (username === 'admin') {
      throw new Error('Cannot delete admin user');
    }
    
    const deleted = this.users.delete(username);
    if (deleted) {
      logger.info(`User deleted: ${username}`);
    }
    return deleted;
  }

  /**
   * Clean up expired sessions and tokens
   */
  cleanup() {
    const now = new Date();
    
    // Clean expired refresh tokens
    for (const [token, data] of this.refreshTokens) {
      if (data.expiresAt < now) {
        this.refreshTokens.delete(token);
      }
    }
    
    // Clean inactive sessions (24 hours)
    const sessionTimeout = 24 * 60 * 60 * 1000;
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }
    
    logger.debug('Auth cleanup completed');
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // Every hour
  }
}

// Create singleton instance
const authService = new AuthService();
authService.startCleanupInterval();

export default authService;