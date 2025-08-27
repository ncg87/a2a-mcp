/**
 * Conversation Logs Routes Module
 */

import express from 'express';
import ChatLogger from '../../core/chat-logger.js';
import authService from '../auth-service.js';
import errorHandler from '../../core/error-handler.js';

const router = express.Router();

/**
 * Get list of conversation logs
 */
router.get('/api/logs', authService.authenticateRequest(false), errorHandler.asyncHandler(async (req, res) => {
  const chatLogger = new ChatLogger();
  const logs = await chatLogger.getAvailableLogs();
  res.json({ logs });
}));

/**
 * Get specific conversation log
 */
router.get('/api/logs/:filename', authService.authenticateRequest(false), errorHandler.asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const chatLogger = new ChatLogger();
  const content = await chatLogger.getLogContent(filename);
  
  if (!content) {
    throw new errorHandler.NotFoundError('Log file');
  }
  
  res.json({ 
    filename,
    content,
    timestamp: new Date()
  });
}));

/**
 * Get conversation messages (for real-time display)
 */
router.get('/api/conversation/:id/messages', authService.authenticateRequest(false), errorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conversations = req.app.locals.conversations;
  const conversation = conversations?.get(id);
  
  if (!conversation) {
    throw new errorHandler.NotFoundError('Conversation');
  }
  
  // Get messages from chat logger
  const messages = await conversation.chatLogger.getMessages();
  
  res.json({
    conversationId: id,
    messages,
    count: messages.length
  });
}));

export default router;