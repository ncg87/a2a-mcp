/**
 * Centralized Error Handling System
 * 
 * Provides consistent error handling, logging, and recovery mechanisms
 */

import logger from '../utils/logger.js';
import { EventEmitter } from 'eventemitter3';

/**
 * Custom error classes
 */
export class SystemError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'SystemError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date();
  }
}

export class ValidationError extends SystemError {
  constructor(message, field) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class AuthenticationError extends SystemError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends SystemError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'AUTHZ_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends SystemError {
  constructor(resource) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

export class ConflictError extends SystemError {
  constructor(message) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends SystemError {
  constructor(retryAfter) {
    super('Rate limit exceeded', 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ExternalServiceError extends SystemError {
  constructor(service, originalError) {
    super(`External service error: ${service}`, 'EXTERNAL_SERVICE', 502);
    this.name = 'ExternalServiceError';
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Error Handler Class
 */
export class ErrorHandler extends EventEmitter {
  constructor() {
    super();
    this.errorCount = 0;
    this.errorHistory = [];
    this.maxHistorySize = 100;
    this.recoveryStrategies = new Map();
    
    // Register default recovery strategies
    this.registerDefaultStrategies();
  }

  /**
   * Register default recovery strategies
   */
  registerDefaultStrategies() {
    // Retry strategy for temporary failures
    this.registerRecoveryStrategy('RETRY', async (error, context, attempts = 3) => {
      for (let i = 0; i < attempts; i++) {
        try {
          logger.info(`Retry attempt ${i + 1}/${attempts} for ${error.code}`);
          if (context.retryFunction) {
            return await context.retryFunction();
          }
          break;
        } catch (retryError) {
          if (i === attempts - 1) throw retryError;
          await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
        }
      }
    });

    // Fallback strategy
    this.registerRecoveryStrategy('FALLBACK', async (error, context) => {
      if (context.fallbackFunction) {
        logger.info(`Using fallback for ${error.code}`);
        return await context.fallbackFunction();
      }
      throw error;
    });

    // Circuit breaker strategy
    this.registerRecoveryStrategy('CIRCUIT_BREAKER', async (error, context) => {
      const circuit = context.circuit || { failures: 0, lastFailure: null, isOpen: false };
      
      circuit.failures++;
      circuit.lastFailure = Date.now();
      
      if (circuit.failures >= 5) {
        circuit.isOpen = true;
        setTimeout(() => {
          circuit.isOpen = false;
          circuit.failures = 0;
        }, 60000); // Reset after 1 minute
        
        throw new SystemError('Circuit breaker open', 'CIRCUIT_OPEN', 503);
      }
      
      throw error;
    });
  }

  /**
   * Register a recovery strategy
   */
  registerRecoveryStrategy(name, handler) {
    this.recoveryStrategies.set(name, handler);
  }

  /**
   * Handle error with recovery
   */
  async handleError(error, context = {}) {
    try {
      // Log error
      this.logError(error, context);
      
      // Track error
      this.trackError(error);
      
      // Emit error event
      this.emit('error', { error, context });
      
      // Attempt recovery if strategy specified
      if (context.recovery) {
        const strategy = this.recoveryStrategies.get(context.recovery);
        if (strategy) {
          try {
            const result = await strategy(error, context);
            this.emit('recovery:success', { error, strategy: context.recovery });
            return result;
          } catch (recoveryError) {
            this.emit('recovery:failed', { error, strategy: context.recovery, recoveryError });
            throw recoveryError;
          }
        }
      }
      
      // Check if error is critical
      if (this.isCriticalError(error)) {
        this.handleCriticalError(error, context);
      }
      
      throw error;
    } catch (handlingError) {
      // Last resort - log and re-throw
      console.error('Error handler failed:', handlingError);
      throw error;
    }
  }

  /**
   * Log error with context
   */
  logError(error, context) {
    const errorInfo = {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      timestamp: new Date(),
      context
    };
    
    // Choose log level based on error type
    if (error.statusCode >= 500 || !error.statusCode) {
      logger.error('System error occurred:', errorInfo);
    } else if (error.statusCode >= 400) {
      logger.warn('Client error occurred:', errorInfo);
    } else {
      logger.info('Handled error:', errorInfo);
    }
  }

  /**
   * Track error for analytics
   */
  trackError(error) {
    this.errorCount++;
    
    const errorRecord = {
      timestamp: new Date(),
      type: error.name,
      code: error.code,
      message: error.message
    };
    
    this.errorHistory.push(errorRecord);
    
    // Limit history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Check if error is critical
   */
  isCriticalError(error) {
    return (
      error.code === 'SYSTEM_FAILURE' ||
      error.code === 'DATA_CORRUPTION' ||
      error.code === 'SECURITY_BREACH' ||
      this.getErrorRate() > 10 // More than 10 errors per minute
    );
  }

  /**
   * Handle critical error
   */
  handleCriticalError(error, context) {
    logger.error('CRITICAL ERROR DETECTED:', error);
    
    // Emit critical error event
    this.emit('critical:error', { error, context });
    
    // Could trigger alerts, notifications, or system shutdown
    // For now, just log prominently
    console.error('🚨 CRITICAL ERROR 🚨');
    console.error(error);
  }

  /**
   * Get error rate (errors per minute)
   */
  getErrorRate() {
    const oneMinuteAgo = Date.now() - 60000;
    const recentErrors = this.errorHistory.filter(
      e => e.timestamp.getTime() > oneMinuteAgo
    );
    return recentErrors.length;
  }

  /**
   * Express error middleware
   */
  expressErrorHandler() {
    return (err, req, res, next) => {
      // Don't log client errors as errors
      if (err.statusCode >= 400 && err.statusCode < 500) {
        logger.warn('Client error:', {
          path: req.path,
          method: req.method,
          error: err.message,
          code: err.code
        });
      } else {
        logger.error('Server error:', {
          path: req.path,
          method: req.method,
          error: err.message,
          stack: err.stack
        });
      }
      
      // Track error
      this.trackError(err);
      
      // Send appropriate response
      const statusCode = err.statusCode || 500;
      const response = {
        error: {
          message: err.message || 'Internal server error',
          code: err.code || 'INTERNAL_ERROR'
        }
      };
      
      // Add additional info for specific error types
      if (err instanceof ValidationError) {
        response.error.field = err.field;
      } else if (err instanceof RateLimitError) {
        response.error.retryAfter = err.retryAfter;
      } else if (err instanceof NotFoundError) {
        response.error.resource = err.resource;
      }
      
      // Include stack trace in development
      if (process.env.NODE_ENV === 'development') {
        response.error.stack = err.stack;
      }
      
      res.status(statusCode).json(response);
    };
  }

  /**
   * Wrap async route handlers
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const stats = {
      totalErrors: this.errorCount,
      errorRate: this.getErrorRate(),
      recentErrors: this.errorHistory.slice(-10),
      errorTypes: {}
    };
    
    // Count error types
    this.errorHistory.forEach(error => {
      stats.errorTypes[error.type] = (stats.errorTypes[error.type] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Clear error history
   */
  clearHistory() {
    this.errorHistory = [];
    this.errorCount = 0;
    logger.info('Error history cleared');
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Set up global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  errorHandler.handleCriticalError(error, { type: 'uncaughtException' });
  // Give time to log then exit
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
  errorHandler.handleError(
    new SystemError(`Unhandled rejection: ${reason}`, 'UNHANDLED_REJECTION'),
    { type: 'unhandledRejection', promise }
  );
});

export default errorHandler;