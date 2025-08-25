import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'multi-agent-ensemble' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          let logMessage = `${timestamp} [${level}]: ${message}`;
          
          // Add metadata if present
          if (Object.keys(meta).length > 0) {
            logMessage += ` ${JSON.stringify(meta)}`;
          }
          
          return logMessage;
        })
      )
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Add agent-specific logging methods
logger.agentLog = function(agentId, level, message, meta = {}) {
  this.log(level, message, { agentId, ...meta });
};

logger.taskLog = function(taskId, level, message, meta = {}) {
  this.log(level, message, { taskId, ...meta });
};

logger.mcpLog = function(serverId, level, message, meta = {}) {
  this.log(level, message, { mcpServerId: serverId, ...meta });
};

export default logger;