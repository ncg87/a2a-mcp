/**
 * Security Middleware for API Server
 * 
 * Provides input validation, rate limiting, and security headers
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import validator from 'validator';
import logger from '../utils/logger.js';

/**
 * Rate limiting configuration
 */
export const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options.max || 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.round(options.windowMs / 1000)
      });
    }
  });
};

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10 // 10 requests per 5 minutes
});

/**
 * Input validation middleware
 */
export const validateInput = (req, res, next) => {
  try {
    // Validate common injection patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i, // Event handlers
      /eval\(/i,
      /require\(/i,
      /__proto__/i,
      /constructor\[/i
    ];
    
    // Check all string inputs
    const checkValue = (value) => {
      if (typeof value === 'string') {
        // Check for dangerous patterns
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            throw new Error(`Potentially dangerous input detected`);
          }
        }
        
        // Check for SQL injection patterns
        if (/(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bSELECT\b.*\bFROM\b)/i.test(value)) {
          throw new Error('SQL injection pattern detected');
        }
        
        // Check for command injection
        if (/[;&|`$]/.test(value) && !/^[a-zA-Z0-9\s\-_\.@]+$/.test(value)) {
          logger.warn(`Suspicious characters in input: ${value.substring(0, 50)}`);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively check objects
        Object.values(value).forEach(checkValue);
      }
    };
    
    // Validate body
    if (req.body) {
      checkValue(req.body);
    }
    
    // Validate query parameters
    if (req.query) {
      Object.values(req.query).forEach(checkValue);
    }
    
    // Validate path parameters
    if (req.params) {
      Object.values(req.params).forEach(param => {
        if (typeof param === 'string') {
          // Path traversal check
          if (param.includes('../') || param.includes('..\\')) {
            throw new Error('Path traversal attempt detected');
          }
        }
      });
    }
    
    next();
  } catch (error) {
    logger.error('Input validation failed:', error);
    res.status(400).json({ 
      error: 'Invalid input',
      message: error.message 
    });
  }
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    // Remove HTML tags
    let sanitized = validator.stripLow(input);
    sanitized = validator.escape(sanitized);
    
    // Limit length
    if (sanitized.length > 10000) {
      sanitized = sanitized.substring(0, 10000);
    }
    
    return sanitized;
  } else if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  } else if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};

/**
 * Security headers middleware
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development
});

/**
 * API key validation middleware
 */
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    // For now, allow requests without API key in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'API key required' });
    }
    return next();
  }
  
  // Validate API key format
  if (!/^[a-zA-Z0-9]{32,}$/.test(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }
  
  // TODO: Check API key against database
  // For now, accept any properly formatted key
  req.apiKey = apiKey;
  next();
};

/**
 * Request size limit middleware
 */
export const requestSizeLimit = {
  json: '1mb',
  urlencoded: { extended: true, limit: '1mb' }
};

/**
 * Validate conversation objective
 */
export const validateObjective = (req, res, next) => {
  const { objective } = req.body;
  
  if (objective) {
    // Check length
    if (objective.length > 5000) {
      return res.status(400).json({ 
        error: 'Objective too long',
        maxLength: 5000 
      });
    }
    
    // Sanitize
    req.body.objective = sanitizeInput(objective);
  }
  
  next();
};

/**
 * Log security events
 */
export const logSecurityEvent = (eventType, details) => {
  logger.warn('Security Event', {
    type: eventType,
    timestamp: new Date().toISOString(),
    ...details
  });
};

/**
 * Create security middleware stack
 */
export const createSecurityMiddleware = () => {
  return [
    securityHeaders,
    createRateLimiter(),
    validateInput,
    validateApiKey
  ];
};

export default {
  createRateLimiter,
  strictRateLimiter,
  validateInput,
  sanitizeInput,
  securityHeaders,
  validateApiKey,
  requestSizeLimit,
  validateObjective,
  logSecurityEvent,
  createSecurityMiddleware
};