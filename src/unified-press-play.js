#!/usr/bin/env node

/**
 * Unified Press Play System - Single Implementation
 * 
 * Combines the best features from all three implementations:
 * - AutoOrchestrator for intelligent task routing (from press-play.js)
 * - AutonomousConversationEngine for multi-model consensus (from autonomous-press-play.js)
 * - ConversationEngine for simple conversations (from working-press-play.js)
 * 
 * Modes:
 * - Simple: Quick single-model responses
 * - Extended: Multi-turn conversations
 * - Autonomous: Full multi-model consensus with auto-orchestration
 */

import dotenv from 'dotenv';
import readline from 'readline';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Core components
import AutoOrchestrator from './core/auto-orchestrator.js';
import UnifiedConversationEngine from './core/unified-conversation-engine.js';
import ExternalMCPRegistry from './core/external-mcp-registry.js';
import InMemoryMessageBus from './core/in-memory-message-bus.js';
import InteractionDocumenter from './core/interaction-documenter.js';
import ModelSelector from './core/model-selector.js';
import ChatLogger from './core/chat-logger.js';

// Advanced features (previously unused but now integrated!)
import { DeepAnalysisEngine } from './core/deep-analysis-engine.js';
import { DiscussionManager } from './core/discussion-manager.js';
import { AgentMemoryBank } from './core/agent-memory-bank.js';

import logger from './utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UnifiedPressPlaySystem {
  constructor() {
    // Core components
    this.mcpRegistry = null;
    this.messageBus = null;
    this.documenter = null;
    this.modelSelector = null;
    this.chatLogger = null;
    
    // Execution engines
    this.orchestrator = null;
    this.conversationEngine = null; // Now using UnifiedConversationEngine
    
    // Advanced features
    this.deepAnalysisEngine = null;
    this.discussionManager = null;
    this.memoryBank = null;
    
    // State
    this.currentMode = 'autonomous'; // Default to most capable mode
    this.taskHistory = [];
    this.isInitialized = false;
    this.rl = null;
    this.config = null;
    
    // Feature flags
    this.features = {
      deepAnalysis: true,
      multiAgentDiscussions: true,
      persistentMemory: true
    };
  }

  async initialize() {
    try {
      this.displayBanner();
      
      // Load configuration
      const configPath = path.join(__dirname, '../config/ensemble.yaml');
      const configFile = await fs.readFile(configPath, 'utf8');
      this.config = yaml.load(configFile);

      // Initialize core components
      this.mcpRegistry = new ExternalMCPRegistry();
      await this.mcpRegistry.initialize();
      
      this.messageBus = new InMemoryMessageBus();
      await this.messageBus.initialize();
      
      this.documenter = new InteractionDocumenter();
      await this.documenter.initialize();
      
      this.modelSelector = new ModelSelector();
      
      this.chatLogger = new ChatLogger();
      await this.chatLogger.initialize();

      // Initialize execution engines based on available API keys
      await this.initializeEngines();
      
      // Initialize advanced features
      await this.initializeAdvancedFeatures();

      // Set up readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.cyan('\n💭 Enter your prompt (or command): ')
      });

      this.isInitialized = true;
      this.displayStatus();
      
      logger.info('Unified Press Play System initialized successfully');
      return true;
      
    } catch (error) {
      logger.error('Failed to initialize Unified Press Play System:', error);
      console.error(chalk.red('❌ Initialization failed:'), error.message);
      return false;
    }
  }

  async initializeEngines() {
    try {
      // Always try to initialize AutoOrchestrator for agent creation
      this.orchestrator = new AutoOrchestrator(this.config.ensemble);
      await this.orchestrator.initialize();
      logger.info('AutoOrchestrator initialized');
    } catch (error) {
      logger.warn('AutoOrchestrator initialization failed:', error.message);
    }

    try {
      // Initialize UnifiedConversationEngine with all modes
      this.conversationEngine = new UnifiedConversationEngine({
        chatLogger: this.chatLogger,
        modelSelector: this.modelSelector,
        mcpRegistry: this.mcpRegistry,
        enableMemory: true,
        enableMCP: true,
        enableAnalytics: true,
        enableDirectResponses: true,
        mode: this.currentMode === 'autonomous' ? 'autonomous' : 
              this.currentMode === 'deep' ? 'enhanced' : 
              this.currentMode
      });
      await this.conversationEngine.initialize();
      logger.info('UnifiedConversationEngine initialized');
    } catch (error) {
      logger.warn('UnifiedConversationEngine initialization failed:', error.message);
    }
  }

  async initializeAdvancedFeatures() {
    // Initialize Deep Analysis Engine
    if (this.features.deepAnalysis) {
      try {
        // Get AI client from model selector or conversation engine
        const aiClient = this.modelSelector || this.conversationEngine?.aiClient;
        const mcpClient = this.mcpRegistry;
        
        if (aiClient && mcpClient) {
          this.deepAnalysisEngine = new DeepAnalysisEngine(aiClient, mcpClient);
          logger.info('DeepAnalysisEngine initialized - Multi-layer analysis now available');
        }
      } catch (error) {
        logger.warn('DeepAnalysisEngine initialization failed:', error.message);
        this.features.deepAnalysis = false;
      }
    }
    
    // Initialize Discussion Manager
    if (this.features.multiAgentDiscussions) {
      try {
        const aiClient = this.modelSelector || this.conversationEngine?.aiClient;
        
        if (aiClient && this.chatLogger) {
          this.discussionManager = new DiscussionManager(aiClient, this.chatLogger);
          logger.info('DiscussionManager initialized - Multi-agent discussions enabled');
        }
      } catch (error) {
        logger.warn('DiscussionManager initialization failed:', error.message);
        this.features.multiAgentDiscussions = false;
      }
    }
    
    // Initialize Agent Memory Bank
    if (this.features.persistentMemory) {
      try {
        this.memoryBank = new AgentMemoryBank('unified-system', {
          maxShortTermSize: 200,
          maxLongTermSize: 50000,
          persistencePath: './memory/unified',
          forgettingCurveEnabled: true
        });
        logger.info('AgentMemoryBank initialized - Persistent memory enabled');
      } catch (error) {
        logger.warn('AgentMemoryBank initialization failed:', error.message);
        this.features.persistentMemory = false;
      }
    }
  }

  displayBanner() {
    console.clear();
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════'));
    console.log(chalk.cyan('║') + chalk.white('           🚀 UNIFIED PRESS PLAY SYSTEM 🚀              ') + chalk.cyan('║'));
    console.log(chalk.cyan('║') + chalk.gray('         One System to Rule Them All                    ') + chalk.cyan('║'));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════'));
    console.log();
  }

  displayStatus() {
    console.log(chalk.green('\n✅ System Status:'));
    console.log(chalk.gray('├─ Mode: ') + chalk.yellow(this.currentMode));
    console.log(chalk.gray('├─ Orchestrator: ') + (this.orchestrator ? chalk.green('Ready') : chalk.red('Unavailable')));
    console.log(chalk.gray('├─ Unified Conversation Engine: ') + (this.conversationEngine ? chalk.green('Ready') : chalk.red('Unavailable')));
    console.log(chalk.gray('│  └─ Available Modes: ') + (this.conversationEngine ? chalk.cyan(this.conversationEngine.getAvailableModes().join(', ')) : chalk.gray('None')));
    console.log(chalk.gray('├─ MCP Servers: ') + chalk.green(`${this.mcpRegistry?.getAvailableServers()?.length || 0} available`));
    
    // Show advanced features status
    console.log(chalk.gray('├─ ') + chalk.cyan('Advanced Features:'));
    console.log(chalk.gray('│  ├─ Deep Analysis: ') + (this.deepAnalysisEngine ? chalk.green('Active') : chalk.gray('Disabled')));
    console.log(chalk.gray('│  ├─ Multi-Agent Discussions: ') + (this.discussionManager ? chalk.green('Active') : chalk.gray('Disabled')));
    console.log(chalk.gray('│  └─ Persistent Memory: ') + (this.memoryBank ? chalk.green('Active') : chalk.gray('Disabled')));
    
    // Show memory stats if available
    if (this.memoryBank) {
      const memStats = this.memoryBank.getMemoryStats();
      console.log(chalk.gray('└─ Memory Stats: ') + chalk.blue(`${memStats.totalItems} items, ${memStats.totalRecalls} recalls`));
    } else {
      console.log(chalk.gray('└─ Memory: ') + chalk.gray('Not initialized'));
    }
  }

  displayHelp() {
    console.log(chalk.cyan('\n📖 Available Commands:'));
    console.log(chalk.gray('├─ ') + chalk.white('/mode [simple|extended|autonomous|deep]') + chalk.gray(' - Switch execution mode'));
    console.log(chalk.gray('├─ ') + chalk.white('/analyze <topic>') + chalk.gray(' - Perform deep multi-layer analysis'));
    console.log(chalk.gray('├─ ') + chalk.white('/discuss <topic>') + chalk.gray(' - Start multi-agent discussion'));
    console.log(chalk.gray('├─ ') + chalk.white('/memory [save|recall|stats]') + chalk.gray(' - Memory operations'));
    console.log(chalk.gray('├─ ') + chalk.white('/status') + chalk.gray(' - Show system status'));
    console.log(chalk.gray('├─ ') + chalk.white('/history') + chalk.gray(' - Show task history'));
    console.log(chalk.gray('├─ ') + chalk.white('/clear') + chalk.gray(' - Clear screen'));
    console.log(chalk.gray('├─ ') + chalk.white('/help') + chalk.gray(' - Show this help'));
    console.log(chalk.gray('└─ ') + chalk.white('/exit') + chalk.gray(' - Exit system'));
    console.log();
    console.log(chalk.cyan('Execution Modes:'));
    console.log(chalk.gray('├─ ') + chalk.yellow('simple') + chalk.gray(' - Quick single-model responses'));
    console.log(chalk.gray('├─ ') + chalk.yellow('extended') + chalk.gray(' - Multi-turn conversations'));
    console.log(chalk.gray('├─ ') + chalk.yellow('autonomous') + chalk.gray(' - Full multi-model consensus with orchestration'));
    console.log(chalk.gray('└─ ') + chalk.yellow('deep') + chalk.gray(' - Deep analysis with multi-agent discussions'));
  }

  async processCommand(input) {
    const command = input.trim().toLowerCase();
    
    if (command.startsWith('/mode ')) {
      const mode = command.substring(6).trim();
      if (['simple', 'extended', 'autonomous', 'deep'].includes(mode)) {
        this.currentMode = mode;
        console.log(chalk.green(`✅ Switched to ${mode} mode`));
      } else {
        console.log(chalk.red('❌ Invalid mode. Use: simple, extended, autonomous, or deep'));
      }
      return true;
    }
    
    // Handle analyze command
    if (command.startsWith('/analyze ')) {
      const topic = input.substring(9).trim();
      if (this.deepAnalysisEngine) {
        await this.performDeepAnalysis(topic);
      } else {
        console.log(chalk.red('❌ Deep Analysis Engine not available'));
      }
      return true;
    }
    
    // Handle discuss command
    if (command.startsWith('/discuss ')) {
      const topic = input.substring(9).trim();
      if (this.discussionManager) {
        await this.startDiscussion(topic);
      } else {
        console.log(chalk.red('❌ Discussion Manager not available'));
      }
      return true;
    }
    
    // Handle memory commands
    if (command.startsWith('/memory ')) {
      const action = command.substring(8).trim();
      await this.handleMemoryCommand(action);
      return true;
    }
    
    switch (command) {
      case '/status':
        this.displayStatus();
        return true;
        
      case '/history':
        this.displayHistory();
        return true;
        
      case '/clear':
        console.clear();
        this.displayBanner();
        return true;
        
      case '/help':
        this.displayHelp();
        return true;
        
      case '/exit':
        return false;
        
      default:
        if (command.startsWith('/')) {
          console.log(chalk.red(`❌ Unknown command: ${command}`));
          console.log(chalk.gray('Type /help for available commands'));
          return true;
        }
        return true;
    }
  }

  displayHistory() {
    if (this.taskHistory.length === 0) {
      console.log(chalk.gray('\n📜 No task history yet'));
      return;
    }
    
    console.log(chalk.cyan('\n📜 Task History:'));
    this.taskHistory.forEach((task, index) => {
      const timestamp = new Date(task.timestamp).toLocaleTimeString();
      console.log(chalk.gray(`${index + 1}. [${timestamp}] ${task.mode}: `) + chalk.white(task.prompt.substring(0, 50) + '...'));
    });
  }

  async executePrompt(prompt) {
    const startTime = Date.now();
    
    // Store in memory if available
    if (this.memoryBank) {
      await this.memoryBank.store({
        type: 'user_prompt',
        content: prompt,
        timestamp: Date.now()
      }, 'shortTerm');
    }
    
    // Add to history
    this.taskHistory.push({
      prompt,
      mode: this.currentMode,
      timestamp: Date.now()
    });
    
    // Start logging
    const logInfo = await this.chatLogger.startChatLog(prompt, `unified-${this.currentMode}`);
    console.log(chalk.gray(`\n📝 Logging to: ${logInfo.filename}`));
    
    try {
      let result;
      
      switch (this.currentMode) {
        case 'simple':
          result = await this.executeSimpleMode(prompt);
          break;
          
        case 'extended':
          result = await this.executeExtendedMode(prompt);
          break;
          
        case 'deep':
          result = await this.executeDeepMode(prompt);
          break;
          
        case 'autonomous':
        default:
          result = await this.executeAutonomousMode(prompt);
          break;
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Finalize logging
      await this.chatLogger.finalizeChatLog({
        mode: this.currentMode,
        duration: `${duration}s`,
        status: 'completed'
      });
      
      console.log(chalk.gray(`\n⏱️ Completed in ${duration}s`));
      
      return result;
      
    } catch (error) {
      logger.error('Execution failed:', error);
      console.log(chalk.red(`\n❌ Execution failed: ${error.message}`));
      
      await this.chatLogger.finalizeChatLog({
        mode: this.currentMode,
        status: 'failed',
        error: error.message
      });
      
      return null;
    }
  }

  async executeSimpleMode(prompt) {
    console.log(chalk.yellow('\n🎯 Executing in SIMPLE mode...'));
    
    if (!this.conversationEngine) {
      throw new Error('UnifiedConversationEngine not available');
    }
    
    // Set mode and execute
    this.conversationEngine.setMode('simple');
    const response = await this.conversationEngine.processPrompt(prompt);
    
    console.log(chalk.cyan('\n📤 Response:'));
    console.log(chalk.white(typeof response === 'string' ? response : JSON.stringify(response, null, 2)));
    
    return response;
  }

  async executeExtendedMode(prompt) {
    console.log(chalk.yellow('\n🔄 Executing in EXTENDED mode...'));
    
    if (!this.conversationEngine) {
      throw new Error('UnifiedConversationEngine not available');
    }
    
    // Set mode and execute with options
    this.conversationEngine.setMode('extended');
    const result = await this.conversationEngine.processPrompt(prompt, {
      maxRounds: 5
    });
    
    console.log(chalk.cyan('\n📊 Extended Conversation Results:'));
    if (result.responses) {
      result.responses.forEach((resp, i) => {
        console.log(chalk.gray(`Round ${i + 1}: `) + chalk.white(resp.substring(0, 100) + '...'));
      });
    }
    
    return result;
  }

  async executeAutonomousMode(prompt) {
    console.log(chalk.yellow('\n🤖 Executing in AUTONOMOUS mode...'));
    
    // Try orchestrator first for complex task decomposition
    if (this.orchestrator && this.isComplexTask(prompt)) {
      console.log(chalk.gray('Using AutoOrchestrator for task decomposition...'));
      
      try {
        const result = await this.orchestrator.executePrompt(prompt);
        
        console.log(chalk.cyan('\n📊 Orchestration Results:'));
        console.log(chalk.white(JSON.stringify(result, null, 2)));
        
        return result;
      } catch (error) {
        logger.warn('Orchestrator execution failed, falling back:', error.message);
      }
    }
    
    // Use unified conversation engine with autonomous strategy
    if (this.conversationEngine) {
      console.log(chalk.gray('Using UnifiedConversationEngine in autonomous mode...'));
      
      // Switch to autonomous mode
      this.conversationEngine.setMode('autonomous');
      
      const result = await this.conversationEngine.processPrompt(prompt, {
        multiModel: true,
        requireConsensus: true,
        analysisDepth: 'deep'
      });
      
      console.log(chalk.cyan('\n🎯 Final Consensus:'));
      console.log(chalk.white(result.finalResponse || result));
      
      return result;
    }
    
    // Final fallback to extended mode
    console.log(chalk.yellow('Falling back to extended mode...'));
    return this.executeExtendedMode(prompt);
  }

  async executeDeepMode(prompt) {
    console.log(chalk.yellow('\n🔍 Executing in DEEP mode with advanced analysis...'));
    
    // First perform deep analysis if available
    let analysisResult = null;
    if (this.deepAnalysisEngine) {
      console.log(chalk.gray('Performing multi-layer analysis...'));
      const mockAgent = { type: 'unified', id: 'system' };
      analysisResult = await this.deepAnalysisEngine.performMultiLayerAnalysis(prompt, mockAgent);
      
      console.log(chalk.cyan('\n📊 Analysis Layers:'));
      if (analysisResult?.layers) {
        console.log(chalk.gray('├─ Surface: ') + chalk.white(JSON.stringify(analysisResult.layers.surface).substring(0, 100) + '...'));
        console.log(chalk.gray('├─ Technical: ') + chalk.white(JSON.stringify(analysisResult.layers.technical).substring(0, 100) + '...'));
        console.log(chalk.gray('└─ Predictions: ') + chalk.white(JSON.stringify(analysisResult.layers.predictions).substring(0, 100) + '...'));
      }
    }
    
    // Then facilitate discussion if available
    let discussionResult = null;
    if (this.discussionManager && this.conversationEngine) {
      console.log(chalk.gray('\nStarting multi-agent discussion...'));
      
      // Create mock agents for discussion
      const agents = [
        { type: 'analyst', id: 'agent1' },
        { type: 'critic', id: 'agent2' },
        { type: 'synthesizer', id: 'agent3' }
      ];
      
      const topic = {
        title: prompt,
        context: analysisResult,
        requiresConsensus: true
      };
      
      discussionResult = await this.discussionManager.facilitateDeepDiscussion(agents, topic, {
        minExchangesPerTopic: 2,
        maxExchangesPerTopic: 5
      });
    }
    
    // Use unified conversation engine with enhanced mode for deep synthesis
    if (this.conversationEngine) {
      console.log(chalk.gray('\nUsing UnifiedConversationEngine for deep synthesis...'));
      
      // Switch to enhanced mode for deep analysis
      this.conversationEngine.setMode('enhanced');
      
      const result = await this.conversationEngine.processPrompt(prompt, {
        multiModel: true,
        analysisContext: analysisResult,
        discussionContext: discussionResult,
        enhancedFeatures: {
          deepAnalysis: true,
          multiAgentDiscussion: true,
          persistentMemory: true
        }
      });
      
      // Store in long-term memory
      if (this.memoryBank) {
        await this.memoryBank.store({
          prompt,
          result,
          analysis: analysisResult,
          discussion: discussionResult,
          timestamp: Date.now()
        }, 'longTerm');
      }
      
      console.log(chalk.cyan('\n✨ Deep Mode Complete'));
      return result;
    }
    
    // Fall back to autonomous mode if conversation engine unavailable
    console.log(chalk.yellow('Conversation engine unavailable, using autonomous mode...'));
    return this.executeAutonomousMode(prompt);
  }

  async performDeepAnalysis(topic) {
    if (!this.deepAnalysisEngine) {
      console.log(chalk.red('Deep Analysis Engine not available'));
      return;
    }
    
    console.log(chalk.cyan(`\n🔬 Performing deep analysis on: ${topic}`));
    const mockAgent = { type: 'analyzer', id: 'system' };
    const result = await this.deepAnalysisEngine.performMultiLayerAnalysis(topic, mockAgent);
    
    console.log(chalk.green('\n📊 Analysis Complete:'));
    console.log(result);
    return result;
  }

  async startDiscussion(topic) {
    if (!this.discussionManager) {
      console.log(chalk.red('Discussion Manager not available'));
      return;
    }
    
    console.log(chalk.cyan(`\n💬 Starting discussion on: ${topic}`));
    const agents = [
      { type: 'expert', id: 'agent1' },
      { type: 'challenger', id: 'agent2' }
    ];
    
    const result = await this.discussionManager.facilitateDeepDiscussion(agents, { title: topic });
    
    console.log(chalk.green('\n🗣️ Discussion Complete'));
    return result;
  }

  async handleMemoryCommand(action) {
    if (!this.memoryBank) {
      console.log(chalk.red('Memory Bank not available'));
      return;
    }
    
    switch (action) {
      case 'stats':
        const stats = this.memoryBank.getMemoryStats();
        console.log(chalk.cyan('\n📊 Memory Statistics:'));
        console.log(chalk.gray('├─ Short Term: ') + chalk.white(`${stats.shortTerm} items`));
        console.log(chalk.gray('├─ Long Term: ') + chalk.white(`${stats.longTerm} items`));
        console.log(chalk.gray('├─ Total Recalls: ') + chalk.white(stats.totalRecalls));
        console.log(chalk.gray('└─ Total Stores: ') + chalk.white(stats.totalStores));
        break;
        
      case 'save':
        await this.memoryBank.consolidateMemory();
        console.log(chalk.green('✅ Memory consolidated and saved'));
        break;
        
      case 'recall':
        const recent = await this.memoryBank.recall({ type: 'recent', limit: 5 });
        console.log(chalk.cyan('\n📝 Recent Memories:'));
        recent.forEach((mem, i) => {
          console.log(chalk.gray(`${i + 1}. `) + chalk.white(JSON.stringify(mem).substring(0, 100) + '...'));
        });
        break;
        
      default:
        console.log(chalk.gray('Usage: /memory [stats|save|recall]'));
    }
  }

  isComplexTask(prompt) {
    // Simple heuristic to detect complex tasks
    const complexKeywords = [
      'create agent', 'build system', 'analyze and',
      'multiple', 'integrate', 'connect to',
      'step by step', 'comprehensive', 'detailed'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return complexKeywords.some(keyword => lowerPrompt.includes(keyword));
  }

  async run() {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) {
        console.log(chalk.red('Failed to initialize. Exiting...'));
        return;
      }
    }

    console.log(chalk.green('\n🎮 Press Play System Ready!'));
    console.log(chalk.gray('Type your prompt or /help for commands\n'));

    this.rl.prompt();

    this.rl.on('line', async (input) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      // Check if it's a command
      if (trimmed.startsWith('/')) {
        const shouldContinue = await this.processCommand(trimmed);
        if (!shouldContinue) {
          this.shutdown();
          return;
        }
        this.rl.prompt();
        return;
      }

      // Execute the prompt
      await this.executePrompt(trimmed);
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this.shutdown();
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n👋 Shutting down gracefully...'));
      this.shutdown();
    });
  }

  async shutdown() {
    try {
      console.log(chalk.gray('\nCleaning up...'));
      
      if (this.orchestrator) {
        await this.orchestrator.shutdown();
      }
      
      if (this.conversationEngine) {
        await this.conversationEngine.shutdown();
      }
      
      if (this.messageBus) {
        await this.messageBus.shutdown();
      }
      
      if (this.rl) {
        this.rl.close();
      }
      
      console.log(chalk.green('✅ Shutdown complete'));
      console.log(chalk.cyan('\nThank you for using Unified Press Play System! 👋\n'));
      
      process.exit(0);
    } catch (error) {
      logger.error('Shutdown error:', error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const system = new UnifiedPressPlaySystem();
  await system.run();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export default UnifiedPressPlaySystem;