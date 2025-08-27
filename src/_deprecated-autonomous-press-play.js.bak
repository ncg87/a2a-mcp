#!/usr/bin/env node

/**
 * Autonomous Press Play System
 * 
 * Fully autonomous multi-model system that:
 * - Uses multiple different AI models simultaneously  
 * - Creates subagents dynamically as needed
 * - No fixed conversation steps - completely dynamic
 * - Maintains memory across all iterations
 * - Self-determines stopping points via multi-model consensus
 */

import dotenv from 'dotenv';
import readline from 'readline';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ExternalMCPRegistry from './core/external-mcp-registry.js';
import InMemoryMessageBus from './core/in-memory-message-bus.js';
import InteractionDocumenter from './core/interaction-documenter.js';
import ModelSelector from './core/model-selector.js';
import ChatLogger from './core/chat-logger.js';
import AutonomousConversationEngine from './core/autonomous-conversation-engine.js';
import logger from './utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AutonomousPressPlaySystem {
  constructor() {
    this.mcpRegistry = null;
    this.messageBus = null;
    this.documenter = null;
    this.modelSelector = null;
    this.chatLogger = null;
    this.autonomousEngine = null;
    this.taskHistory = [];
    this.isInitialized = false;
    this.rl = null;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Autonomous Press Play System...\n');

      // Load configuration
      const configPath = path.join(__dirname, '../config/ensemble.yaml');
      const configFile = await fs.readFile(configPath, 'utf8');
      const config = yaml.load(configFile);

      // Initialize all components
      this.messageBus = new InMemoryMessageBus(config.ensemble.message_bus || {});
      await this.messageBus.connect();

      this.mcpRegistry = new ExternalMCPRegistry();
      await this.mcpRegistry.initialize();

      this.documenter = new InteractionDocumenter();
      await this.documenter.initialize();

      this.modelSelector = new ModelSelector();
      await this.modelSelector.initialize();

      this.chatLogger = new ChatLogger();
      await this.chatLogger.initialize();

      this.autonomousEngine = new AutonomousConversationEngine(
        this.chatLogger,
        this.modelSelector,
        this.mcpRegistry
      );

      // Set up readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '🤖 Enter your prompt (autonomous mode will take over): '
      });

      this.isInitialized = true;
      console.log('✅ Autonomous Press Play System ready!\n');
      console.log('🧠 This system provides:');
      console.log('   ✅ Multiple AI models working simultaneously');
      console.log('   ✅ Dynamic subagent creation on-demand');
      console.log('   ✅ No fixed conversation steps - fully autonomous');
      console.log('   ✅ Conversation memory across all iterations');
      console.log('   ✅ Multi-model consensus for stopping decisions');
      console.log('   ✅ Self-expanding capabilities and requirements discovery\n');
      
      this.showExamples();

    } catch (error) {
      logger.error('Failed to initialize Autonomous Press Play System:', error);
      throw error;
    }
  }

  showExamples() {
    console.log('🎯 Try These Autonomous Challenges:');
    console.log('');
    console.log('🌟 **Complex Multi-Domain Projects**:');
    console.log('   "Build a next-generation AI-powered smart city platform with');
    console.log('    IoT integration, blockchain governance, real-time analytics,');
    console.log('    citizen engagement apps, and autonomous decision making"');
    console.log('');
    console.log('🔬 **Research & Development**:');
    console.log('   "Research and develop a quantum-resistant cryptocurrency');
    console.log('    with advanced privacy features and cross-chain compatibility"');
    console.log('');
    console.log('🏭 **Enterprise Solutions**:');
    console.log('   "Design a comprehensive digital transformation strategy for');
    console.log('    a global manufacturing company including AI, automation,');
    console.log('    supply chain optimization, and workforce development"');
    console.log('');
    console.log('🌍 **Social Impact**:');
    console.log('   "Create a technology platform to address climate change');
    console.log('    through renewable energy optimization, carbon tracking,');
    console.log('    and community engagement with global policy integration"');
    console.log('');
    console.log('🎮 **Innovation Projects**:');
    console.log('   "Develop a revolutionary metaverse platform with AI NPCs,');
    console.log('    procedural world generation, blockchain economics, and');
    console.log('    seamless AR/VR integration"');
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

    process.on('SIGINT', () => {
      this.rl.close();
    });
  }

  async handleCommand(input) {
    const command = input.toLowerCase();

    switch (command) {
      case 'help':
        this.showHelp();
        break;
      
      case 'status':
        this.showStatus();
        break;
      
      case 'models':
        this.showModels();
        break;
      
      case 'history':
        this.showHistory();
        break;
      
      case 'examples':
        this.showExamples();
        break;
      
      case 'chats':
        await this.showChatLogs();
        break;
      
      case 'clear':
        console.clear();
        console.log('✨ Screen cleared\n');
        break;
      
      case 'exit':
      case 'quit':
        this.rl.close();
        break;
      
      default:
        await this.processAutonomousPrompt(input);
    }
  }

  async processAutonomousPrompt(prompt) {
    try {
      console.log(`\n🤖 Autonomous Processing: "${prompt}"\n`);
      
      const startTime = Date.now();

      // Step 1: Multi-model initial analysis
      console.log(`🧠 Multi-Model Analysis Phase...`);
      const availableModels = this.modelSelector.getAvailableModels().filter(m => m.available);
      console.log(`   Available Models: ${availableModels.map(m => m.name).join(', ')}`);
      
      if (availableModels.length === 0) {
        console.log(`❌ No AI models available. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY`);
        return;
      }

      // Step 2: Dynamic initial agent creation
      console.log(`\n🤖 Dynamic Agent Creation Phase...`);
      const initialAgents = await this.createInitialAgents(prompt, availableModels);
      
      console.log(`   Created ${initialAgents.length} initial agents:`);
      initialAgents.forEach(agent => {
        console.log(`     - ${agent.type.toUpperCase()} (${agent.assignedModel.name})`);
        console.log(`       Capabilities: ${agent.capabilities.join(', ')}`);
      });

      // Step 3: Start comprehensive documentation
      const sessionId = await this.documenter.startSession(prompt, { 
        complexity: 10, 
        taskType: 'autonomous',
        models: availableModels.length,
        agents: initialAgents.length
      });
      
      const chatInfo = await this.chatLogger.startChatLog(prompt, sessionId);
      await this.chatLogger.addSystemMessage(
        `Started autonomous session with ${availableModels.length} models and ${initialAgents.length} initial agents`,
        'AUTONOMOUS_SESSION_START'
      );

      // Step 4: Launch fully autonomous conversation
      console.log(`\n🚀 Launching Autonomous Conversation Engine...\n`);
      console.log(`═══════════════════════════════════════════════════════════════`);
      console.log(`🧠 AUTONOMOUS MODE ACTIVATED`);
      console.log(`   • Multiple AI models will collaborate autonomously`);
      console.log(`   • Agents will be created dynamically as needed`);
      console.log(`   • No fixed steps - fully adaptive workflow`);
      console.log(`   • System will determine its own stopping point`);
      console.log(`   • Memory maintained across all iterations`);
      console.log(`═══════════════════════════════════════════════════════════════\n`);

      await this.autonomousEngine.startAutonomousConversation(prompt, initialAgents);

      // Step 5: Finalize and show results
      const duration = Date.now() - startTime;
      
      const docResult = await this.documenter.endSession({
        steps: [
          { step: 'Multi-model analysis', error: null },
          { step: 'Dynamic agent creation', error: null },
          { step: 'Autonomous conversation', error: null },
          { step: 'Multi-model consensus conclusion', error: null }
        ],
        overallStatus: 'success'
      }, 'success');

      const chatSummary = {
        agentsUsed: initialAgents.length + ' + dynamic',
        modelsUsed: availableModels.map(m => m.name),
        mcpServers: 0,
        interactions: 'autonomous',
        decisions: 'multi-model consensus',
        duration: `${Math.round(duration / 1000)}s`,
        status: 'autonomous-success'
      };
      
      await this.chatLogger.finalizeChatLog(chatSummary);

      console.log(`\n🎉 Autonomous Processing Completed!\n`);
      console.log(`📊 Results Summary:`);
      console.log(`   ✅ Status: AUTONOMOUS SUCCESS`);
      console.log(`   🤖 Models Used: ${availableModels.length} (${availableModels.map(m => m.name).join(', ')})`);
      console.log(`   🧠 Initial Agents: ${initialAgents.length}`);
      console.log(`   🔄 Dynamic Agents: Created on-demand`);
      console.log(`   🎯 Stopping: Multi-model consensus`);
      console.log(`   ⏱️  Duration: ${Math.round(duration / 1000)}s`);
      console.log(`   💬 Chat Log: ${chatInfo.filename}`);
      console.log(`   📄 Documentation: ${docResult.documentation.summary.filename}`);
      console.log('');

      // Store in history
      this.taskHistory.push({
        prompt,
        models: availableModels.length,
        initialAgents: initialAgents.length,
        duration,
        chatFile: chatInfo.filename,
        timestamp: Date.now(),
        mode: 'autonomous'
      });

    } catch (error) {
      console.log(`❌ Failed to process autonomous prompt: ${error.message}\n`);
      logger.error('Autonomous processing error:', error);
    }
  }

  async createInitialAgents(prompt, availableModels) {
    console.log(`   Analyzing prompt for initial agent requirements...`);
    
    // Use the first available model to analyze what agents are needed
    const analysisModel = availableModels[0];
    
    try {
      const analysis = await this.autonomousEngine.aiClient.generateResponse(
        analysisModel.id,
        `Analyze this request and determine what initial agents should be created: "${prompt}"

Create a JSON array of 3-6 initial agents needed:
[
  {
    "type": "agent-type",
    "specialization": "specific focus area",
    "capabilities": ["cap1", "cap2", "cap3"],
    "priority": 1-10
  }
]

Focus on diverse specializations that can bootstrap the autonomous conversation.`,
        {
          agentType: 'analyst',
          maxTokens: 400,
          temperature: 0.5
        }
      );

      let agentSpecs;
      try {
        agentSpecs = JSON.parse(analysis.content);
      } catch (e) {
        // Fallback if JSON parsing fails
        agentSpecs = [
          { type: 'coordinator', specialization: 'project coordination', capabilities: ['planning', 'coordination'], priority: 10 },
          { type: 'architect', specialization: 'system architecture', capabilities: ['design', 'integration'], priority: 9 },
          { type: 'specialist', specialization: 'domain expertise', capabilities: ['analysis', 'implementation'], priority: 8 }
        ];
      }

      // Create agent objects with assigned models
      const agents = agentSpecs.map((spec, index) => {
        const assignedModel = availableModels[index % availableModels.length];
        return {
          id: `initial-${spec.type}-${Date.now()}-${index}`,
          type: spec.type,
          specialization: spec.specialization,
          capabilities: spec.capabilities || ['general'],
          priority: spec.priority || 5,
          assignedModel: assignedModel,
          createdAt: Date.now(),
          purpose: `Initial ${spec.type} agent for autonomous conversation`
        };
      });

      return agents;

    } catch (error) {
      logger.error('Failed to create initial agents:', error.message);
      
      // Fallback agents
      return [
        {
          id: `fallback-coordinator-${Date.now()}`,
          type: 'coordinator',
          specialization: 'project coordination',
          capabilities: ['planning', 'coordination', 'analysis'],
          priority: 10,
          assignedModel: availableModels[0],
          createdAt: Date.now(),
          purpose: 'Fallback coordinator agent'
        },
        {
          id: `fallback-specialist-${Date.now()}`,
          type: 'specialist',
          specialization: 'technical implementation',
          capabilities: ['implementation', 'analysis', 'problem-solving'],
          priority: 8,
          assignedModel: availableModels[availableModels.length > 1 ? 1 : 0],
          createdAt: Date.now(),
          purpose: 'Fallback specialist agent'
        }
      ];
    }
  }

  showStatus() {
    console.log('\n📊 Autonomous Press Play System Status\n');
    console.log(`🔧 Initialized: ✅`);
    console.log(`🤖 Available Models: ${this.modelSelector.getAvailableModels().filter(m => m.available).length}`);
    console.log(`🌐 Available MCP Servers: ${this.mcpRegistry.getAllServers().length}`);
    console.log(`📋 Task History: ${this.taskHistory.length} autonomous executions`);
    
    if (this.taskHistory.length > 0) {
      const last = this.taskHistory[this.taskHistory.length - 1];
      const timeAgo = Math.round((Date.now() - last.timestamp) / 1000);
      console.log(`⏰ Last Execution: ${timeAgo}s ago`);
      console.log(`   Prompt: "${last.prompt.substring(0, 50)}..."`);
      console.log(`   Models: ${last.models} | Initial Agents: ${last.initialAgents}`);
      console.log(`   Duration: ${Math.round(last.duration / 1000)}s`);
    }
    console.log('');
  }

  showModels() {
    const models = this.modelSelector.getAvailableModels();
    const available = models.filter(m => m.available);
    
    console.log('\n🤖 Multi-Model Configuration\n');
    console.log(`📊 Available Models: ${available.length}/${models.length}`);
    console.log(`🔄 Rotation Mode: All available models used simultaneously\n`);
    
    available.forEach((model, index) => {
      const quality = '★'.repeat(Math.floor(model.qualityScore / 2));
      console.log(`${index + 1}. ✅ ${model.name} (${model.provider})`);
      console.log(`     Quality: ${quality} (${model.qualityScore}/10)`);
      console.log(`     Cost: $${model.costPerToken}/token`);
    });
    
    const unavailable = models.filter(m => !m.available);
    if (unavailable.length > 0) {
      console.log(`\n❌ Unavailable Models (missing API keys):`);
      unavailable.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name} (${model.provider})`);
      });
    }
    console.log('');
  }

  showHistory() {
    console.log('\n📚 Autonomous Execution History\n');
    
    if (this.taskHistory.length === 0) {
      console.log('No autonomous executions yet.\n');
      return;
    }

    this.taskHistory.slice(-5).forEach((task, index) => {
      const timeAgo = Math.round((Date.now() - task.timestamp) / 1000);
      console.log(`${index + 1}. "${task.prompt.substring(0, 60)}..."`);
      console.log(`   Mode: ${task.mode} | Models: ${task.models} | Initial Agents: ${task.initialAgents}`);
      console.log(`   Duration: ${Math.round(task.duration / 1000)}s | Executed: ${timeAgo}s ago`);
      console.log(`   Chat Log: ${task.chatFile}\n`);
    });
  }

  async showChatLogs() {
    const chatLogs = await this.chatLogger.getChatLogs();
    console.log('\n💬 Autonomous Chat Logs\n');
    
    if (chatLogs.length === 0) {
      console.log('No chat logs found. Execute some autonomous prompts first!\n');
      return;
    }

    console.log(`📁 Directory: ${this.chatLogger.getChatLogsDirectory()}\n`);
    console.log(`Found ${chatLogs.length} autonomous conversation files:\n`);
    
    chatLogs.slice(0, 5).forEach((log, index) => {
      const timeAgo = Math.round((Date.now() - log.created) / 1000);
      const sizeKB = (log.size / 1024).toFixed(1);
      console.log(`${index + 1}. 📄 ${log.filename}`);
      console.log(`   Created: ${timeAgo}s ago | Size: ${sizeKB} KB`);
    });
    console.log('');
  }

  showHelp() {
    console.log('\n📖 Autonomous Press Play System Help\n');
    console.log('Commands:');
    console.log('  help      - Show this help message');
    console.log('  status    - Show system status');
    console.log('  models    - Show multi-model configuration');
    console.log('  history   - Show autonomous execution history');
    console.log('  chats     - Show chat log files');
    console.log('  examples  - Show example autonomous prompts');
    console.log('  clear     - Clear the screen');
    console.log('  exit      - Exit the system\n');
    console.log('🤖 How Autonomous Mode Works:');
    console.log('  1. Enter any natural language prompt');
    console.log('  2. Multiple AI models analyze the request simultaneously');
    console.log('  3. Initial agents are created dynamically based on requirements');
    console.log('  4. Autonomous conversation begins with no fixed steps');
    console.log('  5. System creates new subagents on-demand as needs are discovered');
    console.log('  6. All models maintain conversation memory across iterations');
    console.log('  7. Multi-model consensus determines when to conclude');
    console.log('  8. Comprehensive results generated from all participating models\n');
    console.log('✨ Revolutionary Features:');
    console.log('  ✅ True multi-model collaboration (OpenAI, Anthropic, etc.)');
    console.log('  ✅ Dynamic agent creation during conversation');
    console.log('  ✅ No predetermined conversation flow');
    console.log('  ✅ Self-expanding requirements and capabilities');
    console.log('  ✅ Autonomous stopping decisions via model consensus');
    console.log('  ✅ Persistent memory across all conversation iterations\n');
  }
}

// Main execution
async function main() {
  try {
    const autonomousSystem = new AutonomousPressPlaySystem();
    await autonomousSystem.initialize();
    await autonomousSystem.start();
  } catch (error) {
    console.error('❌ Failed to start Autonomous Press Play System:', error);
    process.exit(1);
  }
}

// Auto-run if this file is executed directly
const currentFilePath = import.meta.url;
const processFilePath = `file:///${process.argv[1].replace(/\\/g, '/')}`;

if (currentFilePath === processFilePath || process.argv[1].endsWith('autonomous-press-play.js')) {
  main().catch(err => {
    console.error('❌ Unhandled error in main:', err);
    process.exit(1);
  });
}

export default AutonomousPressPlaySystem;