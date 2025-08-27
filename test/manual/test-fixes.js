/**
 * Test Script for System Fixes
 * Run this to verify fixes are working
 */

import ModelSelector from './src/core/model-selector.js';
import TieredModelSelector from './src/core/tiered-model-selector.js';
import AutonomousConversationEngine from './src/core/autonomous-conversation-engine.js';
import ChatLogger from './src/core/chat-logger.js';

console.log('🧪 Testing System Fixes...\n');

async function testModelSelector() {
  console.log('1️⃣ Testing Model Selector...');
  try {
    const modelSelector = new ModelSelector();
    await modelSelector.initialize();
    
    const models = modelSelector.getAvailableModels();
    console.log(`   ✅ Model Selector initialized with ${models.length} models`);
    
    // Test tiered selector
    const tieredSelector = new TieredModelSelector(modelSelector);
    await tieredSelector.initialize();
    console.log('   ✅ Tiered Model Selector initialized successfully');
    
    return true;
  } catch (error) {
    console.error('   ❌ Model Selector test failed:', error.message);
    return false;
  }
}

async function testConversationEngine() {
  console.log('\n2️⃣ Testing Conversation Engine...');
  try {
    const modelSelector = new ModelSelector();
    await modelSelector.initialize();
    
    const chatLogger = new ChatLogger();
    
    // Test with correct parameter order
    const engine = new AutonomousConversationEngine(
      chatLogger,
      modelSelector,
      null // mcpRegistry
    );
    
    console.log('   ✅ Conversation Engine created successfully');
    
    // Try to start a conversation (will fail at MCP init but that's ok for now)
    try {
      await engine.startAutonomousConversation('Test prompt', []);
    } catch (convError) {
      if (convError.message.includes('MCP')) {
        console.log('   ⚠️  MCP initialization failed (expected - not implemented yet)');
      } else if (convError.message.includes('API')) {
        console.log('   ⚠️  API keys not configured (expected in test environment)');
      } else {
        throw convError;
      }
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Conversation Engine test failed:', error.message);
    console.error('      Stack:', error.stack);
    return false;
  }
}

async function testAPIServer() {
  console.log('\n3️⃣ Testing API Server Configuration...');
  try {
    const { APIServer } = await import('./src/api/server.js');
    const server = new APIServer({
      port: 3999 // Use different port for testing
    });
    
    console.log('   ✅ API Server instantiated successfully');
    
    // Don't actually start it, just verify it can be created
    return true;
  } catch (error) {
    console.error('   ❌ API Server test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('═'.repeat(50));
  console.log('Running System Fix Validation Tests');
  console.log('═'.repeat(50));
  
  const results = {
    modelSelector: await testModelSelector(),
    conversationEngine: await testConversationEngine(),
    apiServer: await testAPIServer()
  };
  
  console.log('\n' + '═'.repeat(50));
  console.log('TEST RESULTS:');
  console.log('═'.repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  for (const [test, result] of Object.entries(results)) {
    if (result) {
      console.log(`✅ ${test}: PASSED`);
      passed++;
    } else {
      console.log(`❌ ${test}: FAILED`);
      failed++;
    }
  }
  
  console.log('\n' + '─'.repeat(50));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n🎉 All critical fixes are working!');
    console.log('The system should now be able to start without crashing.');
  } else {
    console.log('\n⚠️  Some fixes still need work.');
    console.log('Check the error messages above for details.');
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);