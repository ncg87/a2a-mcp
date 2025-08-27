/**
 * REST API Server with WebSocket Support
 * 
 * Provides HTTP endpoints and real-time communication for the
 * Multi-Agent MCP Ensemble System
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';

// Import security middleware and auth service
import security from './security-middleware.js';
import authService from './auth-service.js';

// Import error handler
import errorHandler from '../core/error-handler.js';

// Import performance monitor
import performanceMonitor from '../core/performance-monitor.js';

// Import core components
import ConversationStateManager from '../core/conversation-state-manager.js';
import AgentPerformanceAnalytics from '../core/agent-performance-analytics.js';
import IntelligentCache from '../core/intelligent-cache.js';

// Import modular routes
import healthRoutes from './routes/health-routes.js';
import authRoutes from './routes/auth-routes.js';
import logsRoutes from './routes/logs-routes.js';
import { createConversationRoutes } from './routes/conversation-routes.js';
import { ConversationController } from './controllers/conversation-controller.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class APIServer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      port: config.port || process.env.API_PORT || 3001,
      corsOrigin: config.corsOrigin || process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3002'],
      wsPort: config.wsPort || process.env.WS_PORT || 3002,
      ...config
    };
    
    // Express app setup
    this.app = express();
    this.httpServer = createServer(this.app);
    
    // Socket.IO setup
    this.io = new Server(this.httpServer, {
      cors: {
        origin: this.config.corsOrigin,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      }
    });
    
    // Core components
    this.stateManager = new ConversationStateManager();
    this.analytics = new AgentPerformanceAnalytics();
    this.cache = new IntelligentCache();
    this.conversations = new Map(); // Active conversation engines
    
    // Setup middleware and routes
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }
  
  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security headers and protections
    this.app.use(security.securityHeaders);
    
    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigin,
      credentials: true
    }));
    
    // Body parsing with size limits
    this.app.use(bodyParser.json({ limit: security.requestSizeLimit.json }));
    this.app.use(bodyParser.urlencoded(security.requestSizeLimit.urlencoded));
    
    // Global rate limiting
    this.app.use(security.createRateLimiter());
    
    // Input validation
    this.app.use(security.validateInput);
    
    // Performance monitoring
    this.app.use(performanceMonitor.middleware());
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, { 
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      next();
    });
    
    // Use centralized error handling
    this.app.use(errorHandler.expressErrorHandler());
  }
  
  /**
   * Setup REST API routes - Refactored to use modular approach
   */
  setupRoutes() {
    // Create conversation controller
    const conversationController = new ConversationController(
      this.conversations,
      this.stateManager,
      this.io,
      this.simulateAgentConversation.bind(this)
    );

    // Expose required objects to routes via app.locals
    this.app.locals.conversations = this.conversations;
    this.app.locals.cache = this.cache;
    this.app.locals.stateManager = this.stateManager;

    // Use modular route handlers
    this.app.use('/', healthRoutes);
    this.app.use('/', authRoutes);
    this.app.use('/', logsRoutes);
    this.app.use('/', createConversationRoutes(conversationController));

    // Add any remaining legacy routes that weren't extracted yet
    this.setupLegacyRoutes();
  }

  /**
   * Setup remaining legacy routes that haven't been extracted yet
   */
  setupLegacyRoutes() {
    // Add any routes that weren't moved to modular handlers  
    // TODO: Extract remaining routes to appropriate modules
    
    // Cache management endpoints (temporary - should be extracted to cache-routes.js)
    this.app.get('/api/cache/stats', (req, res) => {
      res.json(this.cache.getStats());
    });
    
    this.app.post('/api/cache/clear', (req, res) => {
      this.cache.clear();
      res.json({ message: 'Cache cleared' });
    });

    // State management endpoints (temporary - should be extracted to state-routes.js)
    this.app.get('/api/states', (req, res) => {
      // Return mock state data for now
      res.json({
        states: [],
        current: null,
        snapshots: []
      });
    });
  }
  
  /**
   * Setup WebSocket handlers
   */
  setupWebSocket() {
    this.io.on('connection', (socket) => {
      logger.info('WebSocket client connected', { id: socket.id });
      
      // Subscribe to conversation updates
      socket.on('subscribe:conversation', (conversationId) => {
        socket.join(`conversation:${conversationId}`);
        logger.info(`Client ${socket.id} subscribed to conversation ${conversationId}`);
      });
      
      // Unsubscribe from conversation
      socket.on('unsubscribe:conversation', (conversationId) => {
        socket.leave(`conversation:${conversationId}`);
        logger.info(`Client ${socket.id} unsubscribed from conversation ${conversationId}`);
      });
      
      // Subscribe to analytics updates
      socket.on('subscribe:analytics', () => {
        socket.join('analytics');
        
        // Send initial analytics data
        socket.emit('analytics:update', {
          agents: this.analytics.getAgentRankings(),
          models: this.analytics.getModelComparison(),
          system: this.analytics.getSystemMetrics()
        });
      });
      
      // Request real-time metrics
      socket.on('request:metrics', async () => {
        const metrics = {
          cache: this.cache.getStats(),
          conversations: this.conversations.size,
          analytics: this.analytics.getSystemMetrics()
        };
        
        socket.emit('metrics:update', metrics);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', { id: socket.id });
      });
    });
    
    // Setup periodic broadcasts
    this.setupPeriodicBroadcasts();
  }
  
  /**
   * Setup periodic metric broadcasts
   */
  setupPeriodicBroadcasts() {
    // Broadcast analytics every 60 seconds
    setInterval(() => {
      const analyticsData = {
        agents: this.analytics.getAgentRankings(),
        models: this.analytics.getModelComparison(),
        system: this.analytics.getSystemMetrics()
      };
      
      this.io.to('analytics').emit('analytics:update', analyticsData);
    }, 60000);
    
    // Broadcast cache stats every 30 seconds
    setInterval(() => {
      const cacheStats = this.cache.getStats();
      this.io.emit('cache:stats', cacheStats);
    }, 30000);
  }
  
  /**
   * Simulate agent conversation for dashboard demonstration
   */
  simulateAgentConversation(conversationId, engine, config) {
    const agentTypes = [
      'research-specialist',
      'architect-agent',
      'implementation-specialist',
      'analysis-expert',
      'coordinator-agent'
    ];
    
    const models = [
      'GPT-4 Turbo',
      'Claude 3 Opus',
      'Gemini Pro',
      'GPT-3.5 Turbo',
      'Claude 3 Sonnet'
    ];
    
    // Create agents based on complexity
    const numAgents = Math.min(config.complexity, 5);
    const agents = [];
    
    // Emit agent creation events
    for (let i = 0; i < numAgents; i++) {
      const agentId = `agent-${i}-${Date.now()}`;
      const agentType = agentTypes[i % agentTypes.length];
      const model = models[i % models.length];
      
      agents.push({ id: agentId, type: agentType, model });
      
      this.io.to(`conversation:${conversationId}`).emit('agent:created', {
        conversationId,
        agentId,
        agentType,
        model,
        timestamp: Date.now()
      });
    }
    
    // Simulate conversation iterations
    let currentIteration = 0;
    const interval = setInterval(() => {
      currentIteration++;
      
      // Check if we should stop
      if (currentIteration > config.iterations) {
        clearInterval(interval);
        
        // Emit completion
        this.io.to(`conversation:${conversationId}`).emit('conversation:complete', {
          conversationId,
          summary: `Completed analysis of: ${config.objective}`,
          finalIteration: currentIteration - 1,
          totalAgents: agents.length,
          timestamp: Date.now()
        });
        
        return;
      }
      
      // Each agent responds in this iteration
      agents.forEach((agent, index) => {
        setTimeout(() => {
          // Generate contextual response based on objective
          const response = this.generateAgentResponse(
            agent.type,
            config.objective,
            currentIteration,
            config.iterations
          );
          
          // Emit agent response
          this.io.to(`conversation:${conversationId}`).emit('agent:response', {
            conversationId,
            agentId: agent.id,
            agentType: agent.type,
            content: response,
            iteration: currentIteration,
            timestamp: Date.now(),
            model: agent.model,
            tokens: Math.floor(Math.random() * 500) + 100
          });
          
          // Track in analytics
          this.analytics.trackAgentResponse(agent.id, {
            responseTime: Math.random() * 2000 + 500,
            tokens: Math.floor(Math.random() * 500) + 100,
            usedMCPTools: Math.random() > 0.7
          });
        }, index * 1000); // Stagger responses
      });
      
      // Emit iteration complete
      setTimeout(() => {
        this.io.to(`conversation:${conversationId}`).emit('iteration:complete', {
          conversationId,
          iteration: currentIteration,
          agentCount: agents.length,
          messageCount: currentIteration * agents.length,
          timestamp: Date.now()
        });
      }, agents.length * 1000 + 500);
      
    }, (agents.length * 1000) + 2000); // Wait for all agents + buffer
    
    // Store interval for cleanup if needed
    if (!this.activeSimulations) {
      this.activeSimulations = new Map();
    }
    this.activeSimulations.set(conversationId, interval);
  }
  
  /**
   * Generate contextual agent response
   */
  generateAgentResponse(agentType, objective, iteration, maxIterations) {
    const progress = iteration / maxIterations;
    
    const responses = {
      'research-specialist': [
        `Analyzing the requirements for: ${objective}`,
        `Research indicates several approaches for this objective...`,
        `Found relevant patterns and best practices in the literature`,
        `Comparative analysis shows multiple viable solutions`,
        `Final research summary: Key findings documented`
      ],
      'architect-agent': [
        `Designing system architecture for the given requirements`,
        `Proposing a modular architecture with clear separation of concerns`,
        `Considering scalability and performance implications`,
        `Refining the architectural blueprint based on constraints`,
        `Architecture finalized with comprehensive design patterns`
      ],
      'implementation-specialist': [
        `Evaluating implementation strategies for the design`,
        `Recommending technology stack based on requirements`,
        `Outlining development phases and milestones`,
        `Addressing technical challenges and solutions`,
        `Implementation roadmap complete with deliverables`
      ],
      'analysis-expert': [
        `Performing detailed analysis of the proposal`,
        `Identifying potential risks and mitigation strategies`,
        `Cost-benefit analysis suggests positive ROI`,
        `Quality metrics and KPIs defined`,
        `Analysis complete: All criteria satisfied`
      ],
      'coordinator-agent': [
        `Coordinating agent activities for optimal collaboration`,
        `Synthesizing inputs from specialized agents`,
        `Ensuring alignment with original objective`,
        `Facilitating consensus on approach`,
        `Coordination successful: Team aligned on solution`
      ]
    };
    
    const typeResponses = responses[agentType] || responses['coordinator-agent'];
    const index = Math.min(Math.floor(progress * typeResponses.length), typeResponses.length - 1);
    
    // Add some dynamic content
    const prefix = `[Iteration ${iteration}/${maxIterations}] `;
    const suffix = objective.length > 50 
      ? `\n\nFocus area: "${objective.substring(0, 50)}..."`
      : `\n\nFocus area: "${objective}"`;
    
    return prefix + typeResponses[index] + suffix;
  }
  
  /**
   * Bridge conversation events to WebSocket
   */
  bridgeConversationEvents(conversationId, engine) {
    // Forward agent responses
    engine.on('agentResponse', (data) => {
      this.io.to(`conversation:${conversationId}`).emit('agent:response', {
        conversationId,
        ...data
      });
    });
    
    // Forward iteration complete
    engine.on('iterationComplete', (iteration) => {
      this.io.to(`conversation:${conversationId}`).emit('iteration:complete', {
        conversationId,
        iteration
      });
    });
    
    // Forward conversation complete
    engine.on('conversationComplete', (summary) => {
      this.io.to(`conversation:${conversationId}`).emit('conversation:complete', {
        conversationId,
        summary
      });
    });
  }
  
  /**
   * Start the API server
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        // Start performance monitoring
        performanceMonitor.start();
        
        this.httpServer.listen(this.config.port, () => {
          logger.info(`API Server started on port ${this.config.port}`);
          logger.info(`WebSocket server available on same port`);
          logger.info(`CORS enabled for ${this.config.corsOrigin}`);
          logger.info(`Performance monitoring active`);
          resolve();
        });
        
        this.httpServer.on('error', (err) => {
          logger.error('Failed to start API server:', err);
          reject(err);
        });
      } catch (err) {
        logger.error('Error starting server:', err);
        reject(err);
      }
    });
  }
  
  /**
   * Stop the API server
   */
  async stop() {
    return new Promise((resolve) => {
      this.io.close(() => {
        this.httpServer.close(() => {
          logger.info('API Server stopped');
          resolve();
        });
      });
    });
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  logger.info('Starting API server...');
  const server = new APIServer();
  
  server.start()
    .then(() => {
      logger.info(`✅ API Server running on http://localhost:${server.config.port}`);
      logger.info(`   WebSocket available on same port`);
      logger.info(`   CORS enabled for ${server.config.corsOrigin}`);
      logger.info('   Press Ctrl+C to stop');
    })
    .catch(err => {
      logger.error('Failed to start server:', err);
      process.exit(1);
    });
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}

export default APIServer;