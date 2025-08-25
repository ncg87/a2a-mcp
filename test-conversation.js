#!/usr/bin/env node

/**
 * Simple test for the conversation engine
 */

import dotenv from 'dotenv';
import ConversationEngine from './src/core/conversation-engine.js';
import ChatLogger from './src/core/chat-logger.js';
import ModelSelector from './src/core/model-selector.js';
import ExternalMCPRegistry from './src/core/external-mcp-registry.js';

dotenv.config();

async function testConversation() {
  try {
    console.log('🧪 Testing Conversation Engine\n');

    // Initialize components
    const chatLogger = new ChatLogger();
    await chatLogger.initialize();

    const modelSelector = new ModelSelector();
    await modelSelector.initialize();

    const mcpRegistry = new ExternalMCPRegistry();
    await mcpRegistry.initialize();

    const conversationEngine = new ConversationEngine(chatLogger, modelSelector, mcpRegistry);

    // Start a chat log
    const prompt = "Create a comprehensive DeFi ecosystem with AMM, yield farming, governance token, and mobile app";
    const chatInfo = await chatLogger.startChatLog(prompt, 'test-conversation');

    // Create test agents
    const agents = [
      { id: 'blockchain-001', type: 'blockchain', model: 'GPT-4' },
      { id: 'defi-002', type: 'defi-specialist', model: 'Claude-3' },
      { id: 'security-003', type: 'security', model: 'GPT-4' },
      { id: 'mobile-004', type: 'mobile-developer', model: 'Claude-3' }
    ];

    const analysis = { complexity: 8 };

    console.log('🚀 Starting conversation with agents:');
    agents.forEach(agent => {
      console.log(`   - ${agent.type} (${agent.id})`);
    });
    console.log('');

    // Start the conversation
    await conversationEngine.startConversation(prompt, agents, analysis);

    // Finalize chat log
    await chatLogger.finalizeChatLog({
      agentsUsed: agents.length,
      modelsUsed: ['GPT-4', 'Claude-3'],
      mcpServers: 0,
      interactions: 'multiple',
      decisions: 'several',
      duration: '2-3 minutes',
      status: 'success'
    });

    console.log(`\n✅ Conversation test completed!`);
    console.log(`📄 Chat log: ${chatInfo.filename}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

testConversation();