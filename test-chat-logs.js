#!/usr/bin/env node

/**
 * Test Chat Logging System
 * 
 * Tests the simple chat log functionality with agent conversations
 */

import dotenv from 'dotenv';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ExternalMCPRegistry from './src/core/external-mcp-registry.js';
import InMemoryMessageBus from './src/core/in-memory-message-bus.js';
import InteractionDocumenter from './src/core/interaction-documenter.js';
import ModelSelector from './src/core/model-selector.js';
import ChatLogger from './src/core/chat-logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testChatLogs() {
  try {
    console.log('🧪 Testing Chat Logging System\n');

    // Initialize components
    const configPath = path.join(__dirname, 'config/ensemble.yaml');
    const configFile = await fs.readFile(configPath, 'utf8');
    const config = yaml.load(configFile);

    const messageBus = new InMemoryMessageBus(config.ensemble.message_bus);
    await messageBus.connect();

    const mcpRegistry = new ExternalMCPRegistry();
    await mcpRegistry.initialize();

    const documenter = new InteractionDocumenter();
    await documenter.initialize();

    const modelSelector = new ModelSelector();
    await modelSelector.initialize();

    const chatLogger = new ChatLogger();
    await chatLogger.initialize();

    console.log('✅ All systems initialized\n');

    // Test Prompt
    const testPrompt = "Create a smart home automation system that uses IoT sensors, machine learning for pattern recognition, mobile app control, and voice assistant integration with Alexa and Google Home";

    console.log('🎯 Test Prompt:');
    console.log(`"${testPrompt}"\n`);

    // Start chat log
    const sessionId = 'test-session-123';
    const chatInfo = await chatLogger.startChatLog(testPrompt, sessionId);
    console.log(`📝 Started chat log: ${chatInfo.filename}\n`);

    // Add system message
    await chatLogger.addSystemMessage('Analyzing prompt complexity and requirements...', 'ANALYSIS_START');

    // Select optimal model
    const optimalModel = modelSelector.getOptimalModel('automation');
    if (optimalModel) {
      await chatLogger.addModelSwitch('default', optimalModel.name, 'Optimal for automation tasks');
    }

    // Create and respond with multiple agents
    const agents = [
      {
        id: 'iot-agent-001',
        type: 'iot-specialist',
        response: 'I can help design the IoT sensor network. I recommend using temperature, motion, light, and humidity sensors connected via Zigbee protocol for reliable mesh networking. We\'ll need a central hub for data aggregation.'
      },
      {
        id: 'ml-agent-002', 
        type: 'machine-learning',
        response: 'For pattern recognition, I suggest implementing a time-series analysis model using LSTM networks to learn user behavior patterns. We can predict when lights should turn on/off, optimal temperature settings, and security patterns.'
      },
      {
        id: 'mobile-dev-003',
        type: 'mobile-developer',
        response: 'I\'ll create a React Native app with real-time dashboard, remote control capabilities, and push notifications. The UI will include scene management, scheduling, and energy usage analytics with beautiful data visualizations.'
      },
      {
        id: 'voice-ai-004',
        type: 'voice-integration',
        response: 'For voice integration, I\'ll implement custom Alexa Skills and Google Actions. Users can control devices with natural language like "Set living room to movie mode" or "What\'s the temperature upstairs?"'
      },
      {
        id: 'coordinator-005',
        type: 'system-coordinator',
        response: 'I\'ll orchestrate all components. The architecture will use MQTT for IoT communication, Node.js backend with Redis for real-time data, and secure API endpoints. Everything will be containerized with Docker for easy deployment.'
      }
    ];

    // Add agent responses
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      
      await chatLogger.addAgentResponse(
        agent.id,
        agent.type,
        agent.response,
        {
          model: optimalModel?.name || 'Anthropic Claude 3 Sonnet',
          responseTime: Math.floor(Math.random() * 1000) + 200,
          cost: '0.002'
        }
      );
      
      console.log(`🤖 ${agent.type.toUpperCase()} responded`);
      
      // Add some interactions between agents
      if (i > 0) {
        await chatLogger.addAgentInteraction(
          agents[i-1].id,
          agent.id,
          'coordination',
          `Here's what I'm working on for the smart home system. How does this integrate with your ${agent.type} components?`
        );
      }
    }

    // Add some MCP connections
    await chatLogger.addMCPConnection('github-mcp', 'GitHub MCP Server', 'connected', ['create-repo', 'commit-code']);
    await chatLogger.addMCPConnection('aws-lambda-mcp', 'AWS Lambda MCP', 'connected', ['deploy-function', 'manage-triggers']);
    await chatLogger.addMCPConnection('slack-mcp', 'Slack MCP Server', 'failed', ['send-message']);

    // Add agent decisions
    await chatLogger.addAgentDecision(
      'coordinator-005',
      'architecture-choice',
      'Choosing between microservices vs monolithic architecture',
      'microservices',
      'Given the complexity and need for scalability, microservices will allow independent scaling of IoT data processing, ML inference, and mobile API components'
    );

    await chatLogger.addAgentDecision(
      'ml-agent-002',
      'model-selection',
      'Selecting ML model for behavior prediction',
      'LSTM with attention mechanism',
      'LSTM networks excel at time-series prediction, and attention mechanism will help focus on important temporal patterns in user behavior'
    );

    // Add task results
    await chatLogger.addTaskResult(
      'iot-agent-001',
      'sensor-network-design',
      'Completed IoT sensor placement plan with 15 strategic locations and Zigbee mesh topology',
      true
    );

    await chatLogger.addTaskResult(
      'mobile-dev-003',
      'app-prototype',
      'Created interactive wireframes and initial React Native setup',
      true
    );

    await chatLogger.addTaskResult(
      'voice-ai-004',
      'alexa-skill-development',
      null,
      false,
      'Amazon Developer Account approval pending - 3-5 business days'
    );

    // Add system messages
    await chatLogger.addSystemMessage('All agents have completed their initial analysis', 'PROGRESS_UPDATE');
    await chatLogger.addSystemMessage('Estimated project timeline: 8-12 weeks for MVP', 'TIMELINE_ESTIMATE');

    // Finalize chat log
    const summary = {
      agentsUsed: agents.length,
      modelsUsed: [optimalModel?.name || 'Anthropic Claude 3 Sonnet'],
      mcpServers: 2,
      interactions: agents.length - 1,
      decisions: 2,
      duration: '45 seconds',
      status: 'success'
    };

    const finalFile = await chatLogger.finalizeChatLog(summary);
    
    console.log('\n🎉 Chat log test completed!\n');
    console.log(`📄 Chat log saved to: ${chatInfo.filename}`);
    console.log(`📁 Full path: ${finalFile}`);
    console.log('');

    // Show what's in the chat log
    console.log('💬 Chat log contains:');
    console.log(`   📝 Original prompt`);
    console.log(`   🤖 ${agents.length} agent responses`);
    console.log(`   🔄 ${agents.length - 1} agent interactions`);
    console.log(`   🧠 2 agent decisions with reasoning`);
    console.log(`   🌐 3 MCP server connections (2 successful, 1 failed)`);
    console.log(`   ⚙️ Task execution results`);
    console.log(`   📊 Session summary and statistics`);
    console.log('');

    // Read and show excerpt
    const content = await chatLogger.readChatLog(chatInfo.filename);
    const lines = content.split('\n');
    const excerpt = lines.slice(0, 20).join('\n');
    
    console.log('📖 Chat log excerpt (first 20 lines):');
    console.log('─'.repeat(60));
    console.log(excerpt);
    console.log('─'.repeat(60));
    console.log('... (continues with full conversation) ...');
    console.log('');

    // Show all chat logs
    const allLogs = await chatLogger.getChatLogs();
    console.log(`📚 Total chat logs: ${allLogs.length}`);
    allLogs.forEach((log, index) => {
      const sizeKB = (log.size / 1024).toFixed(1);
      console.log(`   ${index + 1}. ${log.filename} (${sizeKB} KB)`);
    });

    // Cleanup
    await messageBus.disconnect();
    
    console.log('\n✅ Chat logging system test successful!');
    console.log('🔧 You can now open the .txt files in any text editor to see the conversations!');

  } catch (error) {
    console.error('❌ Chat logging test failed:', error);
    process.exit(1);
  }
}

testChatLogs();