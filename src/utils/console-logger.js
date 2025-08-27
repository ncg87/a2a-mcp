/**
 * Console Logger Wrapper
 * 
 * Provides a drop-in replacement for console.log that uses proper logging
 * while maintaining compatibility with existing code
 */

import logger from './logger.js';
import chalk from 'chalk';

class ConsoleLogger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.debugMode = process.env.DEBUG === 'true';
  }

  /**
   * Log general information (replaces console.log)
   */
  log(...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    logger.info(message);
    
    // Also output to console in development for visibility
    if (this.isDevelopment) {
      console.log(chalk.gray('[LOG]'), ...args);
    }
  }

  /**
   * Log informational messages
   */
  info(...args) {
    const message = args.join(' ');
    logger.info(message);
    
    if (this.isDevelopment) {
      console.log(chalk.blue('[INFO]'), ...args);
    }
  }

  /**
   * Log warning messages
   */
  warn(...args) {
    const message = args.join(' ');
    logger.warn(message);
    
    if (this.isDevelopment) {
      console.log(chalk.yellow('[WARN]'), ...args);
    }
  }

  /**
   * Log error messages
   */
  error(...args) {
    const message = args.join(' ');
    const error = args.find(arg => arg instanceof Error);
    
    if (error) {
      logger.error(message, error);
    } else {
      logger.error(message);
    }
    
    if (this.isDevelopment) {
      console.log(chalk.red('[ERROR]'), ...args);
    }
  }

  /**
   * Log debug messages (only in debug mode)
   */
  debug(...args) {
    if (this.debugMode) {
      const message = args.join(' ');
      logger.debug(message);
      
      if (this.isDevelopment) {
        console.log(chalk.gray('[DEBUG]'), ...args);
      }
    }
  }

  /**
   * Clear console (development only)
   */
  clear() {
    if (this.isDevelopment) {
      console.clear();
    }
  }

  /**
   * Create a table (development only)
   */
  table(data) {
    logger.info(`Table data: ${JSON.stringify(data)}`);
    
    if (this.isDevelopment) {
      console.table(data);
    }
  }

  /**
   * Time tracking
   */
  time(label) {
    if (this.isDevelopment) {
      console.time(label);
    }
    this.timers = this.timers || {};
    this.timers[label] = Date.now();
  }

  timeEnd(label) {
    if (this.timers && this.timers[label]) {
      const duration = Date.now() - this.timers[label];
      logger.info(`${label}: ${duration}ms`);
      delete this.timers[label];
    }
    
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Group logging (development only)
   */
  group(label) {
    logger.info(`Group: ${label}`);
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }
}

// Create singleton instance
const consoleLogger = new ConsoleLogger();

// Export as default with console-like interface
export default {
  log: (...args) => consoleLogger.log(...args),
  info: (...args) => consoleLogger.info(...args),
  warn: (...args) => consoleLogger.warn(...args),
  error: (...args) => consoleLogger.error(...args),
  debug: (...args) => consoleLogger.debug(...args),
  clear: () => consoleLogger.clear(),
  table: (data) => consoleLogger.table(data),
  time: (label) => consoleLogger.time(label),
  timeEnd: (label) => consoleLogger.timeEnd(label),
  group: (label) => consoleLogger.group(label),
  groupEnd: () => consoleLogger.groupEnd()
};

// Also export the class for custom instances
export { ConsoleLogger };