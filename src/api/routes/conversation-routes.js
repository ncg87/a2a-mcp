/**
 * Conversation Routes Module
 */

import express from 'express';
import security from '../security-middleware.js';
import errorHandler from '../../core/error-handler.js';

const router = express.Router();

/**
 * Initialize conversation routes with controller
 */
export function createConversationRoutes(conversationController) {
  /**
   * Start new conversation (with security validation)
   */
  router.post('/api/conversation/start', 
    security.validateObjective, 
    errorHandler.asyncHandler(async (req, res) => {
      await conversationController.startConversation(req, res);
    })
  );

  /**
   * Get conversation state
   */
  router.get('/api/conversation/:id/state', 
    errorHandler.asyncHandler(async (req, res) => {
      await conversationController.getConversationState(req, res);
    })
  );

  /**
   * Stop conversation
   */
  router.post('/api/conversation/:id/stop', 
    errorHandler.asyncHandler(async (req, res) => {
      await conversationController.stopConversation(req, res);
    })
  );

  /**
   * Get all active conversations
   */
  router.get('/api/conversations', (req, res) => {
    const conversations = req.app.locals.conversations;
    const activeConversations = Array.from(conversations.entries()).map(([id, conv]) => ({
      id,
      objective: conv.objective,
      startTime: conv.startTime,
      uptime: Date.now() - conv.startTime
    }));
    
    res.json({ conversations: activeConversations });
  });

  return router;
}

export default router;