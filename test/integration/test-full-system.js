#!/usr/bin/env node

/**
 * Full System Integration Test
 * Tests the complete autonomous conversation engine with MCP integration
 */

import { AutonomousConversationEngine } from './src/core/autonomous-conversation-engine.js';
import ExternalMCPRegistry from './src/core/external-mcp-registry.js';
import InMemoryMessageBus from './src/core/in-memory-message-bus.js';
import InteractionDocumenter from './src/core/interaction-documenter.js';
import ModelSelector from './src/core/model-selector.js';
import ChatLogger from './src/core/chat-logger.js';
import logger from './src/utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

async function testFullSystem() {
  console.log('🚀 Starting Full System Integration Test...\n');
  
  try {
    // Initialize all dependencies
    const messageBus = new InMemoryMessageBus();
    await messageBus.connect();
    
    const mcpRegistry = new ExternalMCPRegistry();
    await mcpRegistry.initialize();
    
    const documenter = new InteractionDocumenter();
    await documenter.initialize();
    
    const modelSelector = new ModelSelector();
    await modelSelector.initialize();
    
    const chatLogger = new ChatLogger();
    await chatLogger.initialize();
    
    // Initialize the autonomous conversation engine
    const engine = new AutonomousConversationEngine(
      chatLogger,
      modelSelector,
      mcpRegistry
    );
    
    console.log('✅ Autonomous Conversation Engine initialized\n');
    
    // Test simple conversation with MCP tools
    const testPrompt = "Use web search to find information about MCP servers and then store the findings in memory";
    
    console.log(`📝 Testing prompt: "${testPrompt}"\n`);
    
    // Start autonomous conversation
    const result = await engine.startAutonomousConversation(testPrompt);
    
    console.log('🎯 Autonomous Conversation Results:');
    console.log('=====================================');
    console.log(`Final Response: ${result.finalResponse}`);
    console.log(`Total Iterations: ${result.totalIterations}`);
    console.log(`Models Used: ${result.modelsUsed?.join(', ') || 'Unknown'}`);
    console.log(`MCP Tools Used: ${result.toolsUsed?.length || 0} tools`);
    console.log(`Sub-agents Created: ${result.subAgentsCreated?.length || 0}`);
    
    if (result.toolsUsed && result.toolsUsed.length > 0) {
      console.log('\n🔧 MCP Tools Actually Used:');
      result.toolsUsed.forEach((tool, index) => {
        console.log(`  ${index + 1}. ${tool.server}:${tool.tool} - ${tool.success ? '✅' : '❌'}`);
      });
    }
    
    if (result.subAgentsCreated && result.subAgentsCreated.length > 0) {
      console.log('\n🤖 Sub-agents Created:');
      result.subAgentsCreated.forEach((agent, index) => {
        console.log(`  ${index + 1}. ${agent.type} (${agent.specialization})`);
      });
    }
    
    console.log('\n✅ Full System Test Completed Successfully!');
    
    // Cleanup
    await engine.shutdown();
    
  } catch (error) {
    console.error('❌ Full System Test Failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testFullSystem();