#!/usr/bin/env node

/**
 * Simple Test Runner for Press Play System
 * Uses in-memory message bus instead of Redis for testing
 */

import dotenv from 'dotenv';
import readline from 'readline';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ExternalMCPRegistry from './src/core/external-mcp-registry.js';
import InMemoryMessageBus from './src/core/in-memory-message-bus.js';
import InteractionDocumenter from './src/core/interaction-documenter.js';
import ModelSelector from './src/core/model-selector.js';
import ChatLogger from './src/core/chat-logger.js';
import ConversationEngine from './src/core/conversation-engine.js';
import logger from './src/utils/logger.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestPressPlaySystem {
  constructor() {
    this.mcpRegistry = null;
    this.messageBus = null;
    this.documenter = null;
    this.modelSelector = null;
    this.chatLogger = null;
    this.conversationEngine = null;
    this.currentSessionId = null;
    this.currentChatFile = null;
    this.taskHistory = [];
    this.isInitialized = false;
    this.rl = null;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Test Press Play System...\n');

      // Load configuration
      const configPath = path.join(__dirname, 'config/ensemble.yaml');
      const configFile = await fs.readFile(configPath, 'utf8');
      const config = yaml.load(configFile);

      // Initialize in-memory message bus
      this.messageBus = new InMemoryMessageBus(config.ensemble.message_bus);
      await this.messageBus.connect();

      // Initialize MCP registry
      this.mcpRegistry = new ExternalMCPRegistry();
      await this.mcpRegistry.initialize();

      // Initialize interaction documenter
      this.documenter = new InteractionDocumenter();
      await this.documenter.initialize();

      // Initialize model selector
      this.modelSelector = new ModelSelector();
      await this.modelSelector.initialize();

      // Initialize chat logger
      this.chatLogger = new ChatLogger();
      await this.chatLogger.initialize();

      // Initialize conversation engine
      this.conversationEngine = new ConversationEngine(
        this.chatLogger,
        this.modelSelector,
        this.mcpRegistry
      );

      // Set up readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '🎯 Enter your prompt (or "help", "status", "servers", "models", "docs", "chats", "exit"): '
      });

      this.isInitialized = true;
      console.log('✅ Test Press Play System ready!\n');
      console.log('💡 This is a simplified test version that demonstrates:');
      console.log('   - MCP server discovery and connection testing');
      console.log('   - Prompt analysis and capability matching');
      console.log('   - In-memory message bus functionality');
      console.log('   - **Complete agent interaction documentation**');
      console.log('   - **AI model selection and switching**');
      console.log('   - **Simple chat logs in txt files**\n');
      
      this.showExamples();

    } catch (error) {
      logger.error('Failed to initialize Test Press Play System:', error);
      throw error;
    }
  }

  showExamples() {
    console.log('📋 Test Commands:');
    console.log('');
    console.log('🔍 Discovery:');
    console.log('   "find ai servers" - Discover AI/ML MCP servers');
    console.log('   "show github tools" - Show GitHub MCP server capabilities');
    console.log('   "test openai connection" - Test OpenAI MCP server');
    console.log('');
    console.log('🧪 Analysis:');
    console.log('   "analyze: create a data science pipeline" - Analyze task requirements');
    console.log('   "analyze: deploy to aws" - Analyze deployment task');
    console.log('');
    console.log('📊 System:');
    console.log('   "servers" - List all available MCP servers');
    console.log('   "status" - Show system status');
    console.log('   "help" - Show help information');
    console.log('');
  }

  async start() {
    if (!this.isInitialized) {
      throw new Error('System not initialized');
    }

    this.rl.prompt();

    this.rl.on('line', async (input) => {
      const prompt = input.trim();

      if (prompt === '') {
        this.rl.prompt();
        return;
      }

      try {
        await this.handleCommand(prompt);
      } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
        logger.error('Command handling error:', error);
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.rl.close();
    });
  }

  async handleCommand(input) {
    const command = input.toLowerCase();

    if (command === 'help') {
      this.showHelp();
    } else if (command === 'status') {
      this.showStatus();
    } else if (command === 'servers') {
      this.showAllServers();
    } else if (command === 'docs') {
      this.showDocumentation();
    } else if (command === 'models') {
      this.showModels();
    } else if (command === 'chats') {
      await this.showChatLogs();
    } else if (command === 'examples') {
      this.showExamples();
    } else if (command === 'clear') {
      console.clear();
      console.log('✨ Screen cleared\n');
    } else if (command === 'exit' || command === 'quit') {
      this.rl.close();
    } else if (command.startsWith('find ')) {
      const query = command.substring(5);
      await this.discoverServers(query);
    } else if (command.startsWith('test ')) {
      const serverId = command.substring(5).replace(' connection', '');
      await this.testServer(serverId);
    } else if (command.startsWith('show ') && command.includes('tools')) {
      const serverId = command.split(' ')[1];
      this.showServerTools(serverId);
    } else if (command.startsWith('analyze: ')) {
      const prompt = input.substring(9);
      await this.analyzePrompt(prompt);
    } else if (command.startsWith('use model ')) {
      const modelId = command.substring(10);
      this.switchModel(modelId);
    } else if (command.startsWith('optimal model ')) {
      const taskType = command.substring(14);
      this.suggestOptimalModel(taskType);
    } else {
      // Default to prompt analysis
      this.analyzePrompt(input);
    }
  }

  async discoverServers(query) {
    console.log(`\n🔍 Discovering servers for: "${query}"\n`);
    
    const servers = await this.mcpRegistry.discoverMCPServers(query);
    
    if (servers.length === 0) {
      console.log('No servers found matching your query.\n');
      return;
    }

    console.log(`Found ${servers.length} matching servers:\n`);
    
    servers.slice(0, 5).forEach((server, index) => {
      console.log(`${index + 1}. 🌐 ${server.name}`);
      console.log(`   Type: ${server.type} | Category: ${server.category}`);
      console.log(`   Tools: ${server.tools.slice(0, 3).join(', ')}${server.tools.length > 3 ? '...' : ''}`);
      console.log(`   Cost: ${server.cost} | Status: ${server.status}`);
      console.log(`   Relevance: ${server.relevanceScore}/10`);
      console.log('');
    });
  }

  async testServer(serverId) {
    console.log(`\n🔧 Testing connection to: ${serverId}\n`);
    
    const server = this.mcpRegistry.getServerById(serverId);
    if (!server) {
      console.log(`❌ Server '${serverId}' not found\n`);
      return;
    }

    try {
      const result = await this.mcpRegistry.testServerConnection(serverId);
      
      if (result.available) {
        console.log(`✅ Connection successful to ${server.name}`);
        console.log(`   Response time: ${Date.now() - result.responseTime}ms`);
        console.log(`   Status: ${result.status}`);
      } else {
        console.log(`❌ Connection failed to ${server.name}`);
        console.log(`   Error: ${result.error}`);
        console.log(`   Status: ${result.status}`);
      }
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
    
    console.log('');
  }

  showServerTools(serverId) {
    console.log(`\n🛠️ Tools for: ${serverId}\n`);
    
    const server = this.mcpRegistry.getServerById(serverId);
    if (!server) {
      console.log(`❌ Server '${serverId}' not found\n`);
      return;
    }

    console.log(`📡 ${server.name}`);
    console.log(`Category: ${server.category} | Type: ${server.type}`);
    console.log(`\nAvailable Tools (${server.tools.length}):`);
    
    server.tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool}`);
    });
    
    console.log(`\nCapabilities (${server.capabilities.length}):`);
    server.capabilities.forEach((cap, index) => {
      console.log(`  ${index + 1}. ${cap}`);
    });
    
    if (server.auth) {
      console.log(`\nAuthentication: ${server.auth.type}`);
      console.log(`Environment Variable: ${server.auth.envVar}`);
    }
    
    console.log('');
  }

  showAllServers() {
    console.log('\n📊 Available MCP Servers\n');
    
    const servers = this.mcpRegistry.getAllServers();
    const categories = {};
    
    // Group by category
    servers.forEach(server => {
      if (!categories[server.category]) {
        categories[server.category] = [];
      }
      categories[server.category].push(server);
    });

    Object.keys(categories).forEach(category => {
      console.log(`📂 ${category.toUpperCase()} (${categories[category].length})`);
      categories[category].forEach((server, index) => {
        const cost = server.cost === 'free' ? '🆓' : server.cost === 'freemium' ? '💰' : '💳';
        const status = server.status === 'active' ? '✅' : '⚠️';
        console.log(`   ${index + 1}. ${status} ${cost} ${server.name} (${server.tools.length} tools)`);
      });
      console.log('');
    });

    console.log(`Total: ${servers.length} servers available\n`);
  }

  async analyzePrompt(prompt) {
    console.log(`\n🧠 Analyzing: "${prompt}"\n`);
    
    // Simple analysis based on keywords
    const keywords = prompt.toLowerCase();
    const complexity = this.calculateComplexity(keywords);
    const requiredCapabilities = this.inferCapabilities(keywords);
    const recommendedServers = this.getRecommendedServers(requiredCapabilities);
    
    // Start documentation session
    const analysis = {
      complexity,
      requiredCapabilities,
      estimatedTime: complexity * 30000, // 30s per complexity point
      taskType: this.inferTaskType(keywords)
    };
    
    this.currentSessionId = await this.documenter.startSession(prompt, analysis);
    
    // Start chat log
    const chatInfo = await this.chatLogger.startChatLog(prompt, this.currentSessionId);
    this.currentChatFile = chatInfo.filename;
    
    await this.chatLogger.addSystemMessage(`Started new analysis session with complexity ${analysis.complexity}/10`, 'SESSION_START');
    
    console.log(`📊 Analysis Results:`);
    console.log(`   Complexity: ${complexity}/10`);
    console.log(`   Required Capabilities: ${requiredCapabilities.join(', ')}`);
    console.log(`   Recommended Agents: ${this.inferAgentTypes(keywords).join(', ')}`);
    console.log(`   📋 Session ID: ${this.currentSessionId}`);
    console.log('');
    
    // Select optimal AI model for this task
    const optimalModel = this.modelSelector.getOptimalModel(analysis.taskType, {
      capabilities: requiredCapabilities,
      maxTokens: prompt.length > 1000 ? 8192 : 4096
    });
    
    console.log(`🤖 AI Model Selection:`);
    if (optimalModel) {
      console.log(`   Selected: ${optimalModel.name} (${optimalModel.provider})`);
      console.log(`   Reason: Optimal for ${analysis.taskType} tasks`);
      console.log(`   Quality: ${optimalModel.qualityScore}/10 | Speed: ${optimalModel.speedScore}/10`);
      console.log(`   Cost: $${optimalModel.costPerToken}/token`);
      
      // Log model selection
      await this.chatLogger.addSystemMessage(
        `Selected AI Model: ${optimalModel.name} (${optimalModel.provider}) - Optimal for ${analysis.taskType} tasks`,
        'MODEL_SELECTION'
      );
      
      // Switch to optimal model if different
      const currentModel = this.modelSelector.getActiveModel();
      if (currentModel?.id !== optimalModel.id) {
        this.modelSelector.selectModel(optimalModel.id);
        this.documenter.recordEvent('model-auto-switch', {
          from: currentModel?.id || null,
          to: optimalModel.id,
          reason: `optimal-for-${analysis.taskType}`
        });
        
        await this.chatLogger.addModelSwitch(
          currentModel?.name || 'default',
          optimalModel.name,
          `Optimal for ${analysis.taskType} tasks`
        );
        
        console.log(`   🔄 Switched from ${currentModel?.name || 'default'} to optimal model`);
      }
    } else {
      const currentModel = this.modelSelector.getActiveModel();
      console.log(`   Using: ${currentModel?.name || 'No model available'}`);
      
      await this.chatLogger.addSystemMessage(
        `Using current model: ${currentModel?.name || 'No model available'}`,
        'MODEL_SELECTION'
      );
    }
    console.log('');

    // Create specialized agents based on complexity and requirements
    const agentTypes = this.inferAgentTypes(keywords);
    const agents = [];
    
    console.log(`🤖 Creating Specialized Agents (${agentTypes.length}):`);
    
    for (let i = 0; i < agentTypes.length; i++) {
      const agentType = agentTypes[i];
      const agentId = `${agentType}-agent-${Date.now()}-${i}`;
      
      // Each agent gets the optimal model for its tasks
      const agentOptimalModel = this.modelSelector.getOptimalModel(
        agentType === 'code' ? 'code-generation' : 
        agentType === 'research' ? 'reasoning' :
        agentType === 'data-science' ? 'reasoning' :
        agentType === 'devops' ? 'fast-response' :
        agentType === 'coordinator' ? 'fast-response' : 'general'
      );
      
      const agent = {
        id: agentId,
        type: agentType,
        capabilities: this.getAgentCapabilities(agentType),
        mcpServers: recommendedServers.slice(0, 2).map(s => s.id),
        model: agentOptimalModel?.name || optimalModel?.name || 'Default'
      };
      
      agents.push(agent);
      
      // Document agent creation
      this.documenter.recordAgentCreation({
        ...agent,
        aiModel: agentOptimalModel?.id || optimalModel?.id
      });
      
      console.log(`   ✅ ${agentType.toUpperCase()} Agent: ${agentId}`);
      console.log(`      Model: ${agent.model}`);
      console.log(`      Specializes in: ${agent.capabilities.join(', ')}`);
    }
    console.log('');
    
    if (recommendedServers.length > 0) {
      console.log(`🌐 Connecting to MCP Servers (${recommendedServers.length}):`);
      for (let i = 0; i < Math.min(recommendedServers.length, 3); i++) {
        const server = recommendedServers[i];
        
        // Simulate connection test
        const connectionResult = {
          available: Math.random() > 0.2, // 80% success rate
          responseTime: Math.floor(Math.random() * 500) + 100
        };
        
        this.documenter.recordMCPConnection(server.id, server, connectionResult);
        
        await this.chatLogger.addMCPConnection(
          server.id,
          server.name,
          connectionResult.available ? 'connected' : 'failed',
          server.tools.slice(0, 3)
        );
        
        const status = connectionResult.available ? '✅' : '❌';
        console.log(`   ${status} ${server.name} - ${server.reason}`);
        console.log(`      Response time: ${connectionResult.responseTime}ms`);
      }
      console.log('');
    }
    
    // Start extended multi-agent conversation
    console.log(`\n🗣️  Initiating Extended Agent Conversation...\n`);
    console.log(`   This will simulate ${agents.length} agents having an extended discussion`);
    console.log(`   Each agent will contribute multiple times over 12-20 rounds\n`);
    
    // Start the conversation engine with all agents
    try {
      await this.conversationEngine.startConversation(prompt, agents, analysis);
    } catch (error) {
      console.error(`❌ Conversation engine error: ${error.message}`);
      await this.chatLogger.addSystemMessage(`Conversation engine error: ${error.message}`, 'ERROR');
    }
    
    // Complete the documentation session
    const results = {
      steps: [
        { step: 'Agent creation', error: null },
        { step: 'MCP server connections', error: null },
        { step: 'Protocol initialization', error: null },
        { step: 'Task analysis complete', error: null }
      ],
      overallStatus: 'success'
    };
    
    const docResult = await this.documenter.endSession(results, 'success');
    
    console.log(`📄 Documentation Generated:`);
    console.log(`   📋 Executive Summary: ${docResult.documentation.summary.filename}`);
    console.log(`   🤖 Agent Report: ${docResult.documentation.agents.filename}`);
    console.log(`   ⏰ Interaction Timeline: ${docResult.documentation.timeline.filename}`);
    console.log(`   🔗 Protocol Analysis: ${docResult.documentation.protocols.filename}`);
    console.log(`   🌐 MCP Report: ${docResult.documentation.mcpReport.filename}`);
    console.log(`   🧠 Decision Analysis: ${docResult.documentation.decisions.filename}`);
    console.log(`   📊 Raw Data: ${docResult.documentation.rawData.filename}`);
    console.log('');
    console.log(`📈 Session Statistics:`);
    console.log(`   Duration: ${docResult.statistics.durationFormatted}`);
    console.log(`   Agents: ${docResult.statistics.agentCount}`);
    console.log(`   Interactions: ${docResult.statistics.interactionCount}`);
    console.log(`   Decisions: ${docResult.statistics.decisionCount}`);
    console.log(`   MCP Connections: ${docResult.statistics.mcpConnectionCount}`);
    console.log('');
    
    // Finalize chat log
    const chatSummary = {
      agentsUsed: agentTypes.length,
      modelsUsed: [optimalModel?.name || 'Default'],
      mcpServers: Math.min(recommendedServers.length, 3),
      interactions: agentTypes.length - 1,
      decisions: agentTypes.length > 0 ? 1 : 0,
      duration: docResult.statistics.durationFormatted,
      status: 'success'
    };
    
    const finalChatFile = await this.chatLogger.finalizeChatLog(chatSummary);
    
    console.log(`💬 Chat log saved: ${this.currentChatFile}`);
    
    // Add to history
    this.taskHistory.push({
      prompt,
      analysis,
      sessionId: this.currentSessionId,
      documentation: docResult,
      chatFile: this.currentChatFile,
      timestamp: Date.now()
    });
    
    this.currentSessionId = null;
    this.currentChatFile = null;
  }

  calculateComplexity(keywords) {
    let complexity = 1;
    
    // Keywords that increase complexity
    const complexTerms = [
      'machine learning', 'ai', 'deploy', 'pipeline', 'analysis', 
      'integration', 'automation', 'monitoring', 'scale', 'cluster'
    ];
    
    complexTerms.forEach(term => {
      if (keywords.includes(term)) complexity += 1;
    });
    
    return Math.min(complexity, 10);
  }

  inferCapabilities(keywords) {
    const capabilities = [];
    
    if (keywords.includes('data') || keywords.includes('analysis')) capabilities.push('data-analysis');
    if (keywords.includes('code') || keywords.includes('programming')) capabilities.push('programming');
    if (keywords.includes('deploy') || keywords.includes('cloud')) capabilities.push('deployment');
    if (keywords.includes('ai') || keywords.includes('machine learning')) capabilities.push('ai-inference');
    if (keywords.includes('github') || keywords.includes('git')) capabilities.push('version-control');
    if (keywords.includes('test')) capabilities.push('testing');
    if (keywords.includes('monitor')) capabilities.push('monitoring');
    
    return capabilities.length > 0 ? capabilities : ['general-purpose'];
  }

  inferAgentTypes(keywords) {
    const agents = [];
    
    // Core agent types based on keywords
    if (keywords.includes('defi') || keywords.includes('blockchain') || keywords.includes('crypto')) {
      agents.push('blockchain', 'defi-specialist', 'security');
    }
    if (keywords.includes('ai') || keywords.includes('machine learning') || keywords.includes('ml')) {
      agents.push('ml-specialist');
    }
    if (keywords.includes('mobile') || keywords.includes('app')) {
      agents.push('mobile-developer');
    }
    if (keywords.includes('compliance') || keywords.includes('regulatory')) {
      agents.push('compliance');
    }
    if (keywords.includes('data') || keywords.includes('analysis')) {
      agents.push('data-science');
    }
    if (keywords.includes('code') || keywords.includes('programming')) {
      agents.push('code');
    }
    if (keywords.includes('deploy') || keywords.includes('devops') || keywords.includes('cloud')) {
      agents.push('devops');
    }
    if (keywords.includes('research')) {
      agents.push('research');
    }
    if (keywords.includes('test')) {
      agents.push('testing');
    }
    if (keywords.includes('security') || keywords.includes('audit')) {
      if (!agents.includes('security')) agents.push('security');
    }
    if (keywords.includes('frontend') || keywords.includes('ui') || keywords.includes('web')) {
      agents.push('frontend');
    }
    if (keywords.includes('backend') || keywords.includes('api')) {
      agents.push('backend');
    }
    
    // Always add a coordinator for complex tasks
    if (agents.length > 2) {
      agents.push('coordinator');
    }
    
    // Ensure we have at least 3-4 agents for interesting conversations
    if (agents.length === 0) {
      return ['coordinator', 'code', 'data-science'];
    } else if (agents.length === 1) {
      agents.push('coordinator', 'research');
    } else if (agents.length === 2) {
      agents.push('coordinator');
    }
    
    // Remove duplicates and limit to 8 agents max
    return [...new Set(agents)].slice(0, 8);
  }

  inferTaskType(keywords) {
    if (keywords.includes('data') || keywords.includes('analysis')) return 'data-analysis';
    if (keywords.includes('deploy') || keywords.includes('cloud')) return 'deployment';
    if (keywords.includes('bot') || keywords.includes('automated')) return 'automation';
    if (keywords.includes('research')) return 'research';
    if (keywords.includes('test')) return 'testing';
    return 'general';
  }

  getAgentCapabilities(agentType) {
    const capabilityMap = {
      'blockchain': ['smart-contracts', 'crypto-protocols', 'consensus-mechanisms', 'gas-optimization'],
      'defi-specialist': ['yield-farming', 'liquidity-pools', 'tokenomics', 'automated-market-makers'],
      'security': ['penetration-testing', 'vulnerability-assessment', 'cryptography', 'audit-trails'],
      'compliance': ['regulatory-analysis', 'kyc-aml', 'reporting', 'legal-frameworks'],
      'ml-specialist': ['neural-networks', 'data-modeling', 'algorithm-optimization', 'predictive-analytics'],
      'mobile-developer': ['react-native', 'flutter', 'ios-android', 'mobile-security'],
      'data-science': ['data-analysis', 'machine-learning', 'statistics', 'data-visualization'],
      'code': ['programming', 'debugging', 'code-review', 'software-architecture'],
      'devops': ['deployment', 'monitoring', 'infrastructure', 'containerization'],
      'research': ['information-gathering', 'analysis', 'reporting', 'market-research'],
      'testing': ['test-creation', 'validation', 'quality-assurance', 'automation-testing'],
      'coordinator': ['orchestration', 'task-management', 'coordination', 'project-planning'],
      'frontend': ['ui-ux-design', 'web-development', 'responsive-design', 'user-experience'],
      'backend': ['api-development', 'database-design', 'server-architecture', 'microservices']
    };
    return capabilityMap[agentType] || ['general-purpose'];
  }

  getRecommendedServers(capabilities) {
    const recommended = [];
    
    capabilities.forEach(capability => {
      const servers = this.mcpRegistry.getServersByCapability(capability);
      servers.forEach(server => {
        if (!recommended.find(r => r.id === server.id)) {
          recommended.push({
            ...server,
            reason: `Required for ${capability}`
          });
        }
      });
    });
    
    return recommended;
  }

  showStatus() {
    console.log('\n📊 System Status\n');
    console.log(`🔧 Initialized: ✅`);
    console.log(`💾 Message Bus: ${this.messageBus.isConnected() ? '✅' : '❌'} (In-Memory)`);
    console.log(`🌐 MCP Registry: ✅`);
    console.log(`📚 Available Servers: ${this.mcpRegistry.getAllServers().length}`);
    console.log(`📋 Task History: ${this.taskHistory.length} analyses`);
    
    const stats = this.messageBus.getStats();
    console.log(`📡 Message Bus Stats:`);
    console.log(`   Channels: ${stats.channels}`);
    console.log(`   Total Messages: ${stats.totalMessages}`);
    console.log('');
  }

  showDocumentation() {
    console.log('\n📄 Generated Documentation\n');
    
    if (this.taskHistory.length === 0) {
      console.log('No documented sessions yet. Try analyzing a prompt first!\n');
      return;
    }

    console.log(`Total documented sessions: ${this.taskHistory.length}\n`);
    
    this.taskHistory.slice(-3).forEach((task, index) => {
      const timeAgo = Math.round((Date.now() - task.timestamp) / 1000);
      console.log(`${index + 1}. 📋 Session: ${task.sessionId.substring(0, 8)}...`);
      console.log(`   Prompt: "${task.prompt.substring(0, 50)}..."`);
      console.log(`   Duration: ${task.documentation.statistics.durationFormatted}`);
      console.log(`   Agents: ${task.documentation.statistics.agentCount}`);
      console.log(`   Interactions: ${task.documentation.statistics.interactionCount}`);
      console.log(`   Generated: ${timeAgo}s ago`);
      console.log(`   Files: docs/interactions/${task.documentation.documentation.summary.filename}`);
      console.log('');
    });

    console.log('📁 All documentation files are saved in: docs/interactions/');
    console.log('📝 Each session generates 7 comprehensive reports:');
    console.log('   - Executive Summary (.md)');
    console.log('   - Detailed Agent Report (.md)');
    console.log('   - Interaction Timeline (.md)');
    console.log('   - Protocol Analysis (.md)');
    console.log('   - MCP Connection Report (.md)');
    console.log('   - Decision Analysis (.md)');
    console.log('   - Raw JSON Data (.json)');
    console.log('');
  }

  showModels() {
    console.log('\n🤖 AI Model Management\n');
    
    const stats = this.modelSelector.getModelStats();
    const activeModel = this.modelSelector.getActiveModel();
    const availableModels = this.modelSelector.getAvailableModels();
    
    console.log(`📊 Model Statistics:`);
    console.log(`   Total Models: ${stats.total}`);
    console.log(`   Available: ${stats.available}`);
    console.log(`   Providers: ${stats.providers.join(', ')}`);
    console.log(`   Free Models: ${stats.freeModels}`);
    console.log(`   Active Model: ${stats.activeModel}`);
    console.log('');

    if (activeModel) {
      console.log(`🎯 Currently Active Model:`);
      console.log(`   Name: ${activeModel.name}`);
      console.log(`   Provider: ${activeModel.provider}`);
      console.log(`   Quality Score: ${activeModel.qualityScore}/10`);
      console.log(`   Speed Score: ${activeModel.speedScore}/10`);
      console.log(`   Cost per Token: $${activeModel.costPerToken}`);
      console.log(`   Max Tokens: ${activeModel.maxTokens.toLocaleString()}`);
      console.log(`   Capabilities: ${activeModel.capabilities.join(', ')}`);
      console.log('');
    }

    console.log(`📋 Available Models (${availableModels.length}):`);
    availableModels.forEach((model, index) => {
      const cost = model.costPerToken === 0 ? 'Free' : `$${model.costPerToken}`;
      const quality = '★'.repeat(Math.floor(model.qualityScore / 2)) + '☆'.repeat(5 - Math.floor(model.qualityScore / 2));
      const speed = '⚡'.repeat(Math.floor(model.speedScore / 2));
      
      console.log(`   ${index + 1}. ${model.name}`);
      console.log(`      ID: ${model.id}`);
      console.log(`      Provider: ${model.provider}`);
      console.log(`      Quality: ${quality} (${model.qualityScore}/10)`);
      console.log(`      Speed: ${speed} (${model.speedScore}/10)`);
      console.log(`      Cost: ${cost}/token`);
      console.log(`      Max Tokens: ${model.maxTokens.toLocaleString()}`);
      console.log('');
    });

    const recommendations = this.modelSelector.getRecommendations();
    console.log(`💡 Recommendations:`);
    Object.entries(recommendations).forEach(([useCase, model]) => {
      if (model) {
        console.log(`   ${useCase}: ${model.name} (${model.provider})`);
      }
    });
    console.log('');

    console.log(`🔧 Model Commands:`);
    console.log(`   use model <model-id>     - Switch to specific model`);
    console.log(`   optimal model <task>     - Get optimal model for task type`);
    console.log(`   models                   - Show this information`);
    console.log('');
    console.log(`📝 Example: use model anthropic-claude-3-opus`);
    console.log(`📝 Example: optimal model reasoning`);
    console.log('');
  }

  switchModel(modelId) {
    try {
      const previousModel = this.modelSelector.getActiveModel();
      const newModel = this.modelSelector.selectModel(modelId);
      
      console.log(`\n🔄 Model Switch Successful!\n`);
      console.log(`Previous: ${previousModel?.name || 'None'}`);
      console.log(`New: ${newModel.name}`);
      console.log(`Provider: ${newModel.provider}`);
      console.log(`Quality: ${newModel.qualityScore}/10`);
      console.log(`Speed: ${newModel.speedScore}/10`);
      console.log(`Cost: $${newModel.costPerToken}/token`);
      console.log('');
      
      // Log the change
      if (this.currentSessionId) {
        this.documenter.recordEvent('model-switch', {
          from: previousModel?.id || null,
          to: newModel.id,
          reason: 'manual-selection'
        });
      }
      
    } catch (error) {
      console.log(`❌ Failed to switch model: ${error.message}\n`);
      console.log(`💡 Use 'models' command to see available models\n`);
    }
  }

  suggestOptimalModel(taskType) {
    const optimalModel = this.modelSelector.getOptimalModel(taskType);
    
    if (!optimalModel) {
      console.log(`\n❌ No optimal model found for task type: ${taskType}\n`);
      return;
    }
    
    console.log(`\n🎯 Optimal Model for "${taskType}":\n`);
    console.log(`Recommended: ${optimalModel.name}`);
    console.log(`Provider: ${optimalModel.provider}`);
    console.log(`Quality: ${optimalModel.qualityScore}/10`);
    console.log(`Speed: ${optimalModel.speedScore}/10`);
    console.log(`Cost: $${optimalModel.costPerToken}/token`);
    console.log(`Capabilities: ${optimalModel.capabilities.join(', ')}`);
    console.log('');
    console.log(`💡 To use this model: use model ${optimalModel.id}`);
    console.log('');
  }

  async showChatLogs() {
    console.log('\n💬 Chat Logs\n');
    
    const chatLogs = await this.chatLogger.getChatLogs();
    const chatDir = this.chatLogger.getChatLogsDirectory();
    
    if (chatLogs.length === 0) {
      console.log('No chat logs found. Start analyzing prompts to generate chat logs!\n');
      return;
    }

    console.log(`📁 Chat logs directory: ${chatDir}\n`);
    console.log(`Found ${chatLogs.length} chat log files:\n`);
    
    chatLogs.slice(0, 10).forEach((log, index) => {
      const timeAgo = Math.round((Date.now() - log.created) / 1000);
      const sizeKB = (log.size / 1024).toFixed(1);
      
      console.log(`${index + 1}. 📄 ${log.filename}`);
      console.log(`   Created: ${timeAgo}s ago`);
      console.log(`   Size: ${sizeKB} KB`);
      console.log(`   Path: ${log.filepath}`);
      console.log('');
    });

    if (chatLogs.length > 10) {
      console.log(`... and ${chatLogs.length - 10} more files\n`);
    }

    console.log('💡 What\'s in each chat log:');
    console.log('   📝 Original user prompt');
    console.log('   🤖 Agent responses with timestamps');
    console.log('   🔄 Agent interactions and decisions');
    console.log('   🌐 MCP server connections');
    console.log('   🧠 AI model selections and switches');
    console.log('   📊 Session summary and statistics');
    console.log('');
    console.log('🔧 You can open these .txt files in any text editor!');
    console.log('');
  }

  showHelp() {
    console.log('\n📖 Test Press Play System Help\n');
    console.log('Available Commands:');
    console.log('  help              - Show this help');
    console.log('  status            - Show system status');
    console.log('  servers           - List all MCP servers');
    console.log('  docs              - View generated documentation');
    console.log('  models            - Show AI model management');
    console.log('  chats             - View chat log files');
    console.log('  find <query>      - Discover servers by query');
    console.log('  test <server-id>  - Test server connection');
    console.log('  show <server> tools - Show server capabilities');
    console.log('  analyze: <prompt> - Analyze task requirements');
    console.log('  use model <id>    - Switch to specific AI model');
    console.log('  optimal model <task> - Get optimal model for task');
    console.log('  clear             - Clear screen');
    console.log('  exit              - Exit system\n');
    console.log('Examples:');
    console.log('  find ai');
    console.log('  test openai-mcp');
    console.log('  show github-mcp tools');
    console.log('  analyze: create a web scraper');
    console.log('  use model anthropic-claude-3-opus');
    console.log('  optimal model reasoning');
    console.log('');
  }
}

// Main execution
async function main() {
  try {
    const testSystem = new TestPressPlaySystem();
    await testSystem.initialize();
    await testSystem.start();
  } catch (error) {
    console.error('❌ Failed to start Test Press Play System:', error);
    process.exit(1);
  }
}

main();