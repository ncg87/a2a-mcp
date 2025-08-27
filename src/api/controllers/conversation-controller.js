/**
 * Conversation Controller - Business Logic for Conversation Management
 * 
 * Extracted from the monolithic setupRoutes() method to improve maintainability.
 * Handles all conversation-related operations including:
 * - Starting new conversations with AI or simulation
 * - Managing conversation lifecycle and state
 * - WebSocket event bridging for real-time updates
 * - AI availability detection and fallback logic
 * 
 * Part of the API server refactoring that reduced code size by 52.2%
 * 
 * @class ConversationController
 */

import ModelSelector from '../../core/model-selector.js';
import ChatLogger from '../../core/chat-logger.js';
import UnifiedConversationEngine from '../../core/unified-conversation-engine.js';
import logger from '../../utils/logger.js';
import errorHandler from '../../core/error-handler.js';

export class ConversationController {
  /**
   * Initialize the conversation controller
   * 
   * @param {Map} conversations - Active conversations storage
   * @param {ConversationStateManager} stateManager - State persistence manager
   * @param {SocketIO} io - WebSocket server for real-time updates
   * @param {Function} simulateAgentConversation - Simulation fallback function
   */
  constructor(conversations, stateManager, io, simulateAgentConversation) {
    this.conversations = conversations;
    this.stateManager = stateManager;
    this.io = io;
    this.simulateAgentConversation = simulateAgentConversation;
  }

  /**
   * Start a new conversation with AI or simulation
   * 
   * Creates a new conversation instance with UnifiedConversationEngine,
   * sets up WebSocket event bridging, and starts autonomous processing
   * if an objective is provided.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async startConversation(req, res) {
    const { objective, complexity, iterations, useRealAI, autoStart, continuous } = req.body;
    
    try {
      // Initialize components for new conversation
      const modelSelector = new ModelSelector();
      await modelSelector.initialize();
        
      const chatLogger = new ChatLogger();
      const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await chatLogger.startChatLog(conversationId);
      
      // Use UnifiedConversationEngine instead of deprecated AutonomousConversationEngine
      const engine = new UnifiedConversationEngine({
        chatLogger,
        modelSelector,
        mcpRegistry: null, // will be initialized inside the engine
        messageBus: null,
        documenter: null
      });
      
      // Store conversation engine
      this.conversations.set(conversationId, {
        engine,
        modelSelector,
        chatLogger,
        startTime: Date.now(),
        objective
      });
      
      // Bridge events to WebSocket
      this.bridgeConversationEvents(conversationId, engine);
      
      // Start autonomous conversation if objective provided
      if (objective) {
        this.startAutonomousConversation(conversationId, objective, {
          complexity,
          iterations,
          useRealAI,
          autoStart,
          continuous
        });
      }
      
      res.json({
        conversationId,
        message: 'Conversation started successfully'
      });
      
      // Emit to WebSocket
      this.io.emit('conversation:started', { conversationId, objective });
      
    } catch (error) {
      logger.error('Failed to start conversation:', error);
      throw new errorHandler.ServerError('Failed to start conversation', error.message);
    }
  }

  /**
   * Start autonomous conversation (extracted from main handler)
   */
  async startAutonomousConversation(conversationId, objective, options) {
    const { complexity, iterations, useRealAI, autoStart, continuous } = options;
    
    setTimeout(async () => {
      try {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) return;
        
        const engine = conversation.engine;
        logger.info(`Starting conversation: ${objective} (useRealAI: ${useRealAI})`);
        
        if (useRealAI) {
          const hasRealAI = await this.checkRealAIAvailability(engine, conversationId);
          
          if (!hasRealAI) {
            this.simulateAgentConversation(conversationId, engine, {
              objective,
              complexity: complexity || 5,
              iterations: iterations || 10
            });
          } else {
            await this.executeRealAI(engine, objective, conversationId, {
              iterations,
              complexity,
              continuous,
              autoStart
            });
          }
        } else {
          // Use simulation as requested
          this.simulateAgentConversation(conversationId, engine, {
            objective,
            complexity: complexity || 5,
            iterations: iterations || 10
          });
        }
      } catch (error) {
        logger.error(`Failed to start autonomous conversation ${conversationId}:`, error);
        this.io.emit('conversation:error', {
          conversationId,
          error: error.message
        });
      }
    }, 100); // Small delay to allow response to be sent first
  }

  /**
   * Check if real AI is available
   */
  async checkRealAIAvailability(engine, conversationId) {
    const aiClient = engine.aiClient;
    const hasRealAI = aiClient && !aiClient.simulationMode && aiClient.clients.size > 0;
    
    if (!hasRealAI) {
      logger.info('Real AI not available - API keys not configured');
      this.io.emit('system:ai-status', {
        conversationId,
        status: 'simulation',
        reason: 'No AI API keys configured',
        message: 'Configure API keys in .env file for real AI responses',
        availableProviders: []
      });
      return false;
    }
    
    // Notify that real AI is being used
    this.io.emit('system:ai-status', {
      conversationId,
      status: 'real',
      message: 'Using real AI providers',
      availableProviders: Array.from(aiClient.clients.keys()).filter(k => k !== 'simulation')
    });
    
    return true;
  }

  /**
   * Execute real AI conversation
   */
  async executeRealAI(engine, objective, conversationId, options) {
    try {
      await engine.startAutonomousConversation(objective, {
        maxIterations: options.iterations || 10,
        complexity: options.complexity || 5,
        continuous: options.continuous,
        autoStart: options.autoStart
      });
    } catch (realAIError) {
      logger.warn('Real AI execution failed, falling back to simulation:', realAIError);
      
      // Notify frontend about fallback
      this.io.emit('system:ai-status', {
        conversationId,
        status: 'fallback',
        reason: 'Real AI execution failed',
        error: realAIError.message,
        message: 'Falling back to simulation mode'
      });
      
      // Fallback to simulation
      this.simulateAgentConversation(conversationId, engine, {
        objective,
        complexity: options.complexity || 5,
        iterations: options.iterations || 10
      });
    }
  }

  /**
   * Get conversation state
   */
  async getConversationState(req, res) {
    try {
      const { id } = req.params;
      const conversation = this.conversations.get(id);
      
      if (!conversation) {
        throw new errorHandler.NotFoundError('Conversation');
      }
      
      const state = await this.stateManager.getState(id);
      const engine = conversation.engine;
      
      res.json({
        conversationId: id,
        state: state || {
          memory: engine.conversationMemory,
          agents: Array.from(engine.activeAgents?.keys() || []),
          iteration: engine.currentIteration,
          objective: engine.currentObjective
        },
        startTime: conversation.startTime,
        uptime: Date.now() - conversation.startTime
      });
      
    } catch (error) {
      logger.error('Failed to get conversation state:', error);
      throw new errorHandler.ServerError('Failed to get conversation state', error.message);
    }
  }

  /**
   * Stop a conversation
   */
  async stopConversation(req, res) {
    try {
      const { id } = req.params;
      const conversation = this.conversations.get(id);
      
      if (!conversation) {
        throw new errorHandler.NotFoundError('Conversation');
      }
      
      // Stop the engine
      if (conversation.engine && conversation.engine.shutdown) {
        await conversation.engine.shutdown();
      }
      
      // Remove from active conversations
      this.conversations.delete(id);
      
      res.json({ message: 'Conversation stopped' });
      this.io.emit('conversation:stopped', { conversationId: id });
      
    } catch (error) {
      logger.error('Failed to stop conversation:', error);
      throw new errorHandler.ServerError('Failed to stop conversation', error.message);
    }
  }

  /**
   * Bridge conversation events to WebSocket
   */
  bridgeConversationEvents(conversationId, engine) {
    // Forward engine events to WebSocket
    engine.on('message', (data) => {
      this.io.emit('conversation:message', { conversationId, ...data });
    });
    
    engine.on('complete', (data) => {
      this.io.emit('conversation:complete', { conversationId, ...data });
    });
    
    engine.on('error', (error) => {
      this.io.emit('conversation:error', { conversationId, error: error.message });
    });
  }
}