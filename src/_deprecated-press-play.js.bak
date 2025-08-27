#!/usr/bin/env node

/**
 * Press Play System - Ultimate "Just Write a Prompt" Interface
 * 
 * Simply write any prompt and this system will:
 * 1. Analyze what you need
 * 2. Create specialized agents
 * 3. Connect to external MCP servers
 * 4. Execute using A2A and ACP protocols
 * 5. Return results
 */

import dotenv from 'dotenv';
import readline from 'readline';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import AutoOrchestrator from './core/auto-orchestrator.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PressPlaySystem {
  constructor() {
    this.orchestrator = null;
    this.isRunning = false;
    this.rl = null;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Press Play System...\n');

      // Load configuration
      const configPath = path.join(__dirname, '../config/ensemble.yaml');
      const configFile = await fs.readFile(configPath, 'utf8');
      const config = yaml.load(configFile);

      // Initialize auto-orchestrator
      this.orchestrator = new AutoOrchestrator(config.ensemble);
      await this.orchestrator.initialize();

      // Set up readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '🎯 Enter your prompt (or "help", "status", "history", "exit"): '
      });

      this.isRunning = true;
      console.log('✅ Press Play System ready!\n');
      console.log('💡 How it works:');
      console.log('   1. Write any natural language prompt');
      console.log('   2. System analyzes and creates needed agents');
      console.log('   3. Connects to relevant MCP servers');
      console.log('   4. Executes using A2A/ACP protocols');
      console.log('   5. Returns results\n');
      
      this.showExamples();

    } catch (error) {
      logger.error('Failed to initialize Press Play System:', error);
      throw error;
    }
  }

  showExamples() {
    console.log('📋 Example Prompts:');
    console.log('');
    console.log('🧪 Data Science:');
    console.log('   "Analyze customer data from Kaggle and build a machine learning model"');
    console.log('   "Create a prediction system for stock prices using AI"');
    console.log('');
    console.log('💰 Finance:');
    console.log('   "Monitor cryptocurrency prices and send alerts to Slack"');
    console.log('   "Build a portfolio tracker with risk analysis"');
    console.log('');
    console.log('📱 Marketing:');
    console.log('   "Create social media content and schedule posts across platforms"');
    console.log('   "Launch a product campaign on Discord and track engagement"');
    console.log('');
    console.log('☁️ DevOps:');
    console.log('   "Deploy my app to AWS Lambda and set up monitoring"');
    console.log('   "Create a CI/CD pipeline that builds Docker containers"');
    console.log('');
    console.log('📝 Content:');
    console.log('   "Write technical documentation and publish to GitHub"');
    console.log('   "Create a knowledge base in Notion with AI-generated content"');
    console.log('');
    console.log('🔬 Research:');
    console.log('   "Research latest AI trends and create a comprehensive report"');
    console.log('   "Analyze competitor data and generate insights"');
    console.log('');
  }

  async start() {
    if (!this.isRunning) {
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

    switch (command) {
      case 'help':
        this.showHelp();
        break;
      
      case 'status':
        this.showStatus();
        break;
      
      case 'history':
        this.showHistory();
        break;
      
      case 'examples':
        this.showExamples();
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
        await this.processPrompt(input);
    }
  }

  async processPrompt(prompt) {
    try {
      console.log(`\n🎯 Processing: "${prompt}"\n`);
      
      const startTime = Date.now();
      const result = await this.orchestrator.processPrompt(prompt);
      const duration = Date.now() - startTime;

      // Show analysis
      console.log(`📊 Analysis Complete:`);
      console.log(`   Task Type: ${result.analysis.taskType}`);
      console.log(`   Complexity: ${result.analysis.complexity}/10`);
      console.log(`   Estimated Time: ${Math.round(result.analysis.estimatedTime / 1000)}s`);
      console.log(`   Required Capabilities: ${result.analysis.requiredCapabilities.join(', ')}`);
      console.log('');

      // Show agents created
      if (result.createdAgents.length > 0) {
        console.log(`🤖 Agents Created: ${result.createdAgents.length}`);
        result.createdAgents.forEach((agent, index) => {
          console.log(`   ${index + 1}. ${agent.type.toUpperCase()} Agent`);
          console.log(`      Capabilities: ${agent.capabilities.join(', ')}`);
          console.log(`      Protocols: A2A + ACP`);
        });
        console.log('');
      }

      // Show MCP servers connected
      if (result.connectedServers.length > 0) {
        console.log(`🌐 MCP Servers Connected: ${result.connectedServers.length}`);
        result.connectedServers.forEach((server, index) => {
          const toolCount = server.tools?.length || 0;
          const status = server.connectionStatus?.available ? '✅' : '⚠️';
          console.log(`   ${index + 1}. ${status} ${server.name} (${toolCount} tools)`);
        });
        console.log('');
      }

      // Show execution results
      console.log(`⚙️ Execution Results:`);
      if (result.result.steps) {
        result.result.steps.forEach((step, index) => {
          const status = step.error ? '❌' : '✅';
          console.log(`   ${index + 1}. ${status} ${step.step}`);
        });
      }
      console.log('');

      // Show final status
      const statusIcon = result.result.overallStatus === 'success' ? '🎉' : '⚠️';
      console.log(`${statusIcon} Final Status: ${result.result.overallStatus.toUpperCase()}`);
      console.log(`⏱️ Total Duration: ${Math.round(duration / 1000)}s`);
      
      if (result.result.overallStatus === 'success') {
        console.log(`✨ Your prompt has been successfully executed!`);
        if (result.createdAgents.length > 0) {
          console.log(`   Created ${result.createdAgents.length} specialized agents`);
        }
        if (result.connectedServers.length > 0) {
          console.log(`   Connected to ${result.connectedServers.length} external services`);
        }
        console.log(`   Used A2A and ACP protocols for coordination`);
      }

      console.log('');

    } catch (error) {
      console.log(`❌ Failed to process prompt: ${error.message}\n`);
      logger.error('Prompt processing error:', error);
    }
  }

  showHelp() {
    console.log('\n📖 Press Play System Help\n');
    console.log('Commands:');
    console.log('  help      - Show this help message');
    console.log('  status    - Show system status');
    console.log('  history   - Show recent task history');
    console.log('  examples  - Show example prompts');
    console.log('  clear     - Clear the screen');
    console.log('  exit      - Exit the system\n');
    console.log('How to use:');
    console.log('  1. Simply type any natural language prompt');
    console.log('  2. The system will automatically:');
    console.log('     - Analyze your request');
    console.log('     - Create specialized agents');
    console.log('     - Connect to external MCP servers');
    console.log('     - Execute using A2A/ACP protocols');
    console.log('     - Return results\n');
    console.log('Features:');
    console.log('  ✅ Dynamic agent creation');
    console.log('  ✅ External MCP server integration');
    console.log('  ✅ A2A and ACP protocol support');
    console.log('  ✅ Multi-agent collaboration');
    console.log('  ✅ Automatic complexity analysis');
    console.log('  ✅ Real-time execution monitoring\n');
  }

  showStatus() {
    const status = this.orchestrator.getSystemStatus();
    
    console.log('\n📊 System Status\n');
    console.log(`🔧 Initialized: ${status.initialized ? '✅' : '❌'}`);
    console.log(`🤖 Active Agents: ${status.activeAgents}`);
    console.log(`🌐 Connected MCP Servers: ${status.connectedMCPServers}`);
    console.log(`📚 Available MCP Servers: ${status.availableMCPServers}`);
    console.log(`📋 Task History: ${status.taskHistory} executions`);
    console.log(`🔗 Protocols: ${status.protocols.join(', ')}`);
    
    if (status.lastExecution) {
      const lastExec = status.lastExecution;
      const timeAgo = Math.round((Date.now() - lastExec.timestamp) / 1000);
      console.log(`⏰ Last Execution: ${timeAgo}s ago`);
      console.log(`   Task: "${lastExec.prompt.substring(0, 50)}..."`);
      console.log(`   Status: ${lastExec.result.overallStatus}`);
      console.log(`   Duration: ${Math.round(lastExec.duration / 1000)}s`);
    }
    
    console.log('');
  }

  showHistory() {
    const history = this.orchestrator.taskHistory.slice(-10); // Last 10 tasks
    
    console.log('\n📚 Recent Task History\n');
    
    if (history.length === 0) {
      console.log('No tasks executed yet.\n');
      return;
    }

    history.forEach((task, index) => {
      const timeAgo = Math.round((Date.now() - task.timestamp) / 1000);
      const status = task.result.overallStatus === 'success' ? '✅' : '❌';
      const duration = Math.round(task.duration / 1000);
      
      console.log(`${index + 1}. ${status} ${task.prompt.substring(0, 60)}...`);
      console.log(`   Type: ${task.analysis.taskType} | Complexity: ${task.analysis.complexity}/10`);
      console.log(`   Duration: ${duration}s | ${timeAgo}s ago`);
      console.log('');
    });
  }
}

// Main execution
async function main() {
  try {
    const pressPlay = new PressPlaySystem();
    await pressPlay.initialize();
    await pressPlay.start();
  } catch (error) {
    console.error('❌ Failed to start Press Play System:', error);
    process.exit(1);
  }
}

// Auto-run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default PressPlaySystem;