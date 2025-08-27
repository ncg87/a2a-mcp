/**
 * Unified Conversation Engine
 * 
 * Combines the best features from all three conversation engines:
 * - Basic conversation capabilities (ConversationEngine)
 * - Enhanced memory and interactions (EnhancedConversationEngine)
 * - Autonomous multi-model consensus (AutonomousConversationEngine)
 * 
 * Uses strategy pattern to switch between modes:
 * - Simple: Quick single-model responses
 * - Extended: Multi-turn conversations
 * - Enhanced: With memory and direct responses
 * - Autonomous: Full multi-model consensus
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger.js';
import AIClient from './ai-client.js';
import MCPClient from './mcp-client.js';
import { v4 as uuidv4 } from 'uuid';

// Import only the components that actually exist and work
import RoundTransitionManager from './round-transition-manager.js';
import DynamicAgentSelector from './dynamic-agent-selector.js';
import TieredModelSelector from './tiered-model-selector.js';
import ConversationStateManager from './conversation-state-manager.js';
import AgentPerformanceAnalytics from './agent-performance-analytics.js';
import DirectResponseSystem from './direct-response-system.js';

// Import memory systems
import { AgentMemoryBank } from './agent-memory-bank.js';
import SharedMemoryBank from './shared-memory-bank.js';

export class UnifiedConversationEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Core dependencies
    this.chatLogger = config.chatLogger;
    this.modelSelector = config.modelSelector;
    this.mcpRegistry = config.mcpRegistry;
    
    // Initialize AI clients
    this.aiClient = new AIClient();
    this.mcpClient = config.mcpRegistry ? new MCPClient(config.mcpRegistry) : null;
    
    // Initialize subsystems (only if dependencies exist)
    this.initializeSubsystems(config);
    
    // Conversation mode (simple, extended, enhanced, autonomous)
    this.mode = config.mode || 'simple';
    
    // Unified state management
    this.conversationState = {
      id: null,
      active: false,
      mode: this.mode,
      rounds: 0,
      maxRounds: 10,
      agents: [],
      topics: [],
      decisions: [],
      memory: [],
      context: {},
      metrics: {
        totalExchanges: 0,
        directResponses: 0,
        questionsAsked: 0,
        questionsAnswered: 0,
        agreements: 0,
        disagreements: 0,
        modelSwitches: 0,
        tokensUsed: 0
      }
    };
    
    // Configuration
    this.config = {
      enableMemory: config.enableMemory !== false,
      enableMCP: config.enableMCP !== false,
      enableAnalytics: config.enableAnalytics !== false,
      enableDirectResponses: config.enableDirectResponses !== false,
      maxTurnsPerRound: config.maxTurnsPerRound || 10,
      responseTimeout: config.responseTimeout || 30000,
      minAgentsPerConversation: config.minAgentsPerConversation || 2,
      maxAgentsPerConversation: config.maxAgentsPerConversation || 5,
      stoppingConsensusThreshold: config.stoppingConsensusThreshold || 0.7,
      ...config
    };
    
    // Initialize strategies for different modes
    this.strategies = {
      simple: new SimpleConversationStrategy(this),
      extended: new ExtendedConversationStrategy(this),
      enhanced: new EnhancedConversationStrategy(this),
      autonomous: new AutonomousConversationStrategy(this)
    };
    
    this.currentStrategy = this.strategies[this.mode];
  }

  /**
   * Initialize subsystems based on available dependencies
   */
  initializeSubsystems(config) {
    // Memory systems
    if (config.enableMemory !== false) {
      try {
        this.memoryBank = new AgentMemoryBank('unified-conversation', {
          maxShortTermSize: 100,
          maxLongTermSize: 1000
        });
        this.sharedMemory = new SharedMemoryBank();
        logger.info('Memory systems initialized');
      } catch (error) {
        logger.warn('Memory systems initialization failed:', error.message);
        this.memoryBank = null;
        this.sharedMemory = null;
      }
    }
    
    // State management
    try {
      this.stateManager = new ConversationStateManager({
        autoSaveInterval: 30000,
        maxSnapshots: 10
      });
      logger.info('State manager initialized');
    } catch (error) {
      logger.warn('State manager initialization failed:', error.message);
      this.stateManager = null;
    }
    
    // Analytics
    if (config.enableAnalytics !== false) {
      try {
        this.analytics = new AgentPerformanceAnalytics();
        logger.info('Analytics initialized');
      } catch (error) {
        logger.warn('Analytics initialization failed:', error.message);
        this.analytics = null;
      }
    }
    
    // Advanced components (only if available)
    try {
      this.roundTransitionManager = new RoundTransitionManager(this.aiClient);
      this.dynamicAgentSelector = new DynamicAgentSelector(this.aiClient);
      this.tieredModelSelector = new TieredModelSelector(this.modelSelector);
      logger.info('Advanced components initialized');
    } catch (error) {
      logger.warn('Some advanced components failed to initialize:', error.message);
    }
    
    // Direct response system
    if (config.enableDirectResponses !== false && this.memoryBank) {
      try {
        this.directResponseSystem = new DirectResponseSystem(this.aiClient, this.memoryBank);
        logger.info('Direct response system initialized');
      } catch (error) {
        logger.warn('Direct response system initialization failed:', error.message);
        this.directResponseSystem = null;
      }
    }
  }

  /**
   * Initialize the conversation engine
   */
  async initialize() {
    logger.info(`Initializing UnifiedConversationEngine in ${this.mode} mode`);
    
    // Initialize AI client
    await this.aiClient.initialize();
    
    // Initialize MCP client if available
    if (this.mcpClient && this.mcpRegistry) {
      await this.mcpClient.initialize();
    }
    
    // Initialize memory if enabled
    if (this.memoryBank) {
      await this.memoryBank.initialize();
    }
    
    // Initialize state manager if available
    if (this.stateManager) {
      await this.stateManager.initialize();
    }
    
    this.emit('initialized');
    logger.info('UnifiedConversationEngine initialized successfully');
  }

  /**
   * Set the conversation mode
   */
  setMode(mode) {
    if (!this.strategies[mode]) {
      throw new Error(`Invalid mode: ${mode}. Valid modes: ${Object.keys(this.strategies).join(', ')}`);
    }
    
    this.mode = mode;
    this.currentStrategy = this.strategies[mode];
    this.conversationState.mode = mode;
    
    logger.info(`Conversation mode set to: ${mode}`);
    this.emit('modeChanged', mode);
  }

  /**
   * Process a prompt using the current strategy
   */
  async processPrompt(prompt, options = {}) {
    // Start conversation
    this.conversationState.id = uuidv4();
    this.conversationState.active = true;
    this.conversationState.rounds = 0;
    
    // Log conversation start
    if (this.chatLogger) {
      await this.chatLogger.startChatLog(prompt, this.conversationState.id);
    }
    
    // Store in memory if available
    if (this.memoryBank) {
      await this.memoryBank.store({
        type: 'prompt',
        content: prompt,
        timestamp: Date.now()
      }, 'shortTerm');
    }
    
    // Track analytics
    if (this.analytics) {
      this.analytics.startConversation(this.conversationState.id, prompt);
    }
    
    try {
      // Execute using current strategy
      const result = await this.currentStrategy.execute(prompt, options);
      
      // Store result in memory
      if (this.memoryBank) {
        await this.memoryBank.store({
          type: 'result',
          content: result,
          timestamp: Date.now()
        }, 'longTerm');
      }
      
      // Finalize logging
      if (this.chatLogger) {
        await this.chatLogger.finalizeChatLog({
          mode: this.mode,
          rounds: this.conversationState.rounds,
          metrics: this.conversationState.metrics
        });
      }
      
      // Track completion
      if (this.analytics) {
        this.analytics.endConversation(this.conversationState.id, result);
      }
      
      this.conversationState.active = false;
      this.emit('conversationComplete', result);
      
      return result;
      
    } catch (error) {
      logger.error('Conversation failed:', error);
      this.conversationState.active = false;
      this.emit('conversationError', error);
      throw error;
    }
  }

  /**
   * Get available modes
   */
  getAvailableModes() {
    return Object.keys(this.strategies);
  }

  /**
   * Get current conversation state
   */
  getState() {
    return { ...this.conversationState };
  }

  /**
   * Get conversation metrics
   */
  getMetrics() {
    return { ...this.conversationState.metrics };
  }

  /**
   * Start autonomous conversation - compatibility method for API server
   * Maps to autonomous mode strategy execution
   */
  async startAutonomousConversation(objective, options = {}) {
    logger.info('Starting autonomous conversation with objective:', objective);
    
    // Switch to autonomous mode
    this.setMode('autonomous');
    
    // Map old API to new processPrompt method
    const result = await this.processPrompt(objective, {
      multiModel: true,
      requireConsensus: true,
      maxIterations: options.maxIterations || 10,
      complexity: options.complexity || 5,
      continuous: options.continuous || false,
      autoStart: options.autoStart !== false,
      originalPrompt: objective
    });
    
    // Emit events for backwards compatibility
    this.emit('conversation:complete', {
      objective,
      result,
      mode: 'autonomous'
    });
    
    return result;
  }
  
  /**
   * Shutdown the engine
   */
  async shutdown() {
    logger.info('Shutting down UnifiedConversationEngine');
    
    this.conversationState.active = false;
    
    if (this.stateManager) {
      await this.stateManager.saveSnapshot(this.conversationState);
    }
    
    if (this.memoryBank) {
      await this.memoryBank.consolidateMemory();
    }
    
    this.emit('shutdown');
  }
}

/**
 * Strategy Pattern: Simple Conversation
 * Quick single-model responses
 */
class SimpleConversationStrategy {
  constructor(engine) {
    this.engine = engine;
  }

  async execute(prompt, options) {
    logger.info('Executing simple conversation strategy');
    
    // Get a simple response from the AI
    const response = await this.engine.aiClient.generateResponse(prompt, {
      model: options.model || 'gpt-3.5-turbo',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 500
    });
    
    // Update metrics
    this.engine.conversationState.rounds = 1;
    this.engine.conversationState.metrics.totalExchanges = 1;
    
    // Log the response
    if (this.engine.chatLogger) {
      await this.engine.chatLogger.addAgentResponse('system', 'simple', response, {
        model: options.model || 'gpt-3.5-turbo'
      });
    }
    
    return response;
  }
}

/**
 * Strategy Pattern: Extended Conversation
 * Multi-turn conversations with context
 */
class ExtendedConversationStrategy {
  constructor(engine) {
    this.engine = engine;
  }

  async execute(prompt, options) {
    logger.info('Executing extended conversation strategy');
    
    const maxRounds = options.maxRounds || 5;
    const responses = [];
    let context = prompt;
    
    for (let round = 0; round < maxRounds; round++) {
      this.engine.conversationState.rounds = round + 1;
      
      // Generate response with context
      const response = await this.engine.aiClient.generateResponse(context, {
        model: options.model || 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 800,
        systemPrompt: `You are in round ${round + 1} of a multi-turn conversation. Build upon previous context.`
      });
      
      responses.push(response);
      
      // Update context for next round
      context = `Previous: ${response}\n\nContinue exploring: ${prompt}`;
      
      // Log the exchange
      if (this.engine.chatLogger) {
        await this.engine.chatLogger.addAgentResponse(
          `agent-${round}`,
          'extended',
          response,
          {
            round: round + 1,
            model: options.model || 'gpt-3.5-turbo'
          }
        );
      }
      
      // Update metrics
      this.engine.conversationState.metrics.totalExchanges++;
    }
    
    return {
      prompt,
      rounds: maxRounds,
      responses,
      summary: responses[responses.length - 1]
    };
  }
}

/**
 * Strategy Pattern: Enhanced Conversation
 * With memory, direct responses, and agent interactions
 */
class EnhancedConversationStrategy {
  constructor(engine) {
    this.engine = engine;
  }

  async execute(prompt, options) {
    logger.info('Executing enhanced conversation strategy');
    
    const agents = options.agents || ['analyst', 'critic', 'synthesizer'];
    const maxRounds = options.maxRounds || 7;
    const exchanges = [];
    
    // Initialize agent memories
    const agentMemories = new Map();
    agents.forEach(agent => {
      agentMemories.set(agent, []);
    });
    
    for (let round = 0; round < maxRounds; round++) {
      this.engine.conversationState.rounds = round + 1;
      
      // Dynamic agent selection
      const activeAgent = agents[round % agents.length];
      const respondingAgent = agents[(round + 1) % agents.length];
      
      // Get agent memory context
      const memory = agentMemories.get(activeAgent);
      const context = memory.length > 0 ? 
        `Previous thoughts: ${memory.join(' ')} Current topic: ${prompt}` : 
        prompt;
      
      // Generate agent response
      const response = await this.engine.aiClient.generateResponse(context, {
        model: options.model || 'gpt-4',
        temperature: 0.85,
        systemPrompt: `You are ${activeAgent}. Engage in thoughtful discussion.`
      });
      
      // Store in agent memory
      memory.push(response.substring(0, 200));
      if (memory.length > 3) memory.shift(); // Keep last 3 memories
      
      // Check for direct response opportunity
      if (this.engine.directResponseSystem && round > 0) {
        const shouldRespond = response.includes('?') || response.includes('suggest');
        if (shouldRespond) {
          const directResponse = await this.engine.aiClient.generateResponse(
            `As ${respondingAgent}, directly respond to: ${response}`,
            {
              model: 'gpt-3.5-turbo',
              temperature: 0.7,
              maxTokens: 300
            }
          );
          
          exchanges.push({
            round: round + 1,
            agent: activeAgent,
            response,
            directResponse: {
              from: respondingAgent,
              content: directResponse
            }
          });
          
          this.engine.conversationState.metrics.directResponses++;
        } else {
          exchanges.push({
            round: round + 1,
            agent: activeAgent,
            response
          });
        }
      } else {
        exchanges.push({
          round: round + 1,
          agent: activeAgent,
          response
        });
      }
      
      // Log the exchange
      if (this.engine.chatLogger) {
        await this.engine.chatLogger.addAgentResponse(
          activeAgent,
          'enhanced',
          response,
          {
            round: round + 1,
            model: options.model || 'gpt-4',
            hasMemory: true,
            memorySize: memory.length
          }
        );
      }
      
      // Update metrics
      this.engine.conversationState.metrics.totalExchanges++;
      if (response.includes('?')) this.engine.conversationState.metrics.questionsAsked++;
    }
    
    // Save to long-term memory if available
    if (this.engine.memoryBank) {
      await this.engine.memoryBank.store({
        type: 'enhanced_conversation',
        prompt,
        exchanges,
        timestamp: Date.now()
      }, 'longTerm');
    }
    
    return {
      prompt,
      mode: 'enhanced',
      agents,
      rounds: maxRounds,
      exchanges,
      memories: Object.fromEntries(agentMemories),
      metrics: this.engine.conversationState.metrics
    };
  }
}

/**
 * Strategy Pattern: Autonomous Conversation
 * Full multi-model consensus with dynamic agent creation
 */
class AutonomousConversationStrategy {
  constructor(engine) {
    this.engine = engine;
  }

  async execute(prompt, options) {
    logger.info('Executing autonomous conversation strategy');
    
    const models = options.models || ['gpt-4', 'gpt-3.5-turbo', 'claude-2'];
    const maxIterations = options.maxIterations || 10;
    const consensusThreshold = options.consensusThreshold || 0.7;
    
    let iteration = 0;
    let shouldContinue = true;
    const iterations = [];
    const modelVotes = new Map();
    
    while (shouldContinue && iteration < maxIterations) {
      iteration++;
      this.engine.conversationState.rounds = iteration;
      
      const iterationResponses = [];
      
      // Get responses from all models
      for (const model of models) {
        try {
          const response = await this.engine.aiClient.generateResponse(prompt, {
            model,
            temperature: 0.9,
            systemPrompt: `Iteration ${iteration}. Provide insights and determine if more analysis is needed.`
          });
          
          iterationResponses.push({
            model,
            response,
            continueVote: response.toLowerCase().includes('continue') || 
                         response.toLowerCase().includes('further') ||
                         response.toLowerCase().includes('additionally')
          });
          
          // Track model votes
          if (!modelVotes.has(model)) modelVotes.set(model, []);
          modelVotes.get(model).push(iterationResponses[iterationResponses.length - 1].continueVote);
          
        } catch (error) {
          logger.warn(`Model ${model} failed:`, error.message);
        }
      }
      
      // Calculate consensus
      const continueVotes = iterationResponses.filter(r => r.continueVote).length;
      const totalVotes = iterationResponses.length;
      const consensusRatio = totalVotes > 0 ? continueVotes / totalVotes : 0;
      
      // Determine if we should continue
      shouldContinue = consensusRatio > (1 - consensusThreshold);
      
      // Store iteration results
      iterations.push({
        iteration,
        responses: iterationResponses,
        consensusRatio,
        shouldContinue
      });
      
      // Log the iteration
      if (this.engine.chatLogger) {
        await this.engine.chatLogger.addSystemMessage(
          `Autonomous iteration ${iteration}: ${iterationResponses.length} models responded, consensus: ${(consensusRatio * 100).toFixed(1)}%`,
          'AUTONOMOUS_ITERATION'
        );
        
        for (const resp of iterationResponses) {
          await this.engine.chatLogger.addAgentResponse(
            `model-${resp.model}`,
            'autonomous',
            resp.response,
            {
              iteration,
              model: resp.model,
              continueVote: resp.continueVote
            }
          );
        }
      }
      
      // Update metrics
      this.engine.conversationState.metrics.totalExchanges += iterationResponses.length;
      this.engine.conversationState.metrics.modelSwitches += models.length - 1;
      
      // Update prompt for next iteration based on responses
      if (shouldContinue && iteration < maxIterations) {
        const lastResponses = iterationResponses.map(r => r.response).join('\n');
        prompt = `Based on these perspectives:\n${lastResponses}\n\nContinue analyzing: ${options.originalPrompt || prompt}`;
      }
    }
    
    // Generate final consensus
    const finalConsensus = await this.generateConsensus(iterations, options.originalPrompt || prompt);
    
    // Store in memory
    if (this.engine.memoryBank) {
      await this.engine.memoryBank.store({
        type: 'autonomous_conversation',
        prompt: options.originalPrompt || prompt,
        iterations,
        finalConsensus,
        timestamp: Date.now()
      }, 'longTerm');
    }
    
    return {
      prompt: options.originalPrompt || prompt,
      mode: 'autonomous',
      totalIterations: iteration,
      models: models,
      iterations,
      finalConsensus,
      modelVotes: Object.fromEntries(modelVotes),
      metrics: this.engine.conversationState.metrics
    };
  }

  async generateConsensus(iterations, originalPrompt) {
    // Collect all responses
    const allResponses = [];
    iterations.forEach(iter => {
      iter.responses.forEach(resp => {
        allResponses.push(resp.response);
      });
    });
    
    // Generate consensus using the most capable model
    try {
      const consensus = await this.engine.aiClient.generateResponse(
        `Synthesize these ${allResponses.length} perspectives into a final consensus:\n\n${allResponses.join('\n\n')}\n\nOriginal question: ${originalPrompt}`,
        {
          model: 'gpt-4',
          temperature: 0.5,
          maxTokens: 1000,
          systemPrompt: 'You are a master synthesizer. Create a comprehensive consensus from all perspectives.'
        }
      );
      
      return consensus;
    } catch (error) {
      logger.warn('Consensus generation failed, using last response');
      return allResponses[allResponses.length - 1];
    }
  }
}

export default UnifiedConversationEngine;