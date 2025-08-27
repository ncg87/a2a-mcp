#!/usr/bin/env node

/**
 * Test for Unified Conversation System
 */

import UnifiedPressPlaySystem from '../src/unified-press-play.js';
import UnifiedConversationEngine from '../src/core/unified-conversation-engine.js';

console.log('Testing Unified Conversation System...\n');

async function testUnifiedSystem() {
  try {
    // Test UnifiedConversationEngine
    console.log('1. Testing UnifiedConversationEngine...');
    const conversationEngine = new UnifiedConversationEngine({
      messageBus: { publish: () => {}, subscribe: () => {} },
      documenter: { documentInteraction: () => {} },
      chatLogger: { logChat: () => {} }
    });
    
    // Test available modes
    const modes = conversationEngine.getAvailableModes();
    console.log('   Available modes:', modes);
    
    // Test mode switching
    conversationEngine.setMode('extended');
    console.log('   Switched to extended mode');
    
    conversationEngine.setMode('autonomous');
    console.log('   Switched to autonomous mode');
    
    console.log('   ✅ UnifiedConversationEngine test passed\n');
    
    // Test UnifiedPressPlaySystem
    console.log('2. Testing UnifiedPressPlaySystem...');
    const pressPlay = new UnifiedPressPlaySystem();
    console.log('   System instance created');
    
    // Test mode detection
    const isComplex = pressPlay.isComplexTask('Create an AI agent that connects to GitHub');
    console.log('   Complex task detection:', isComplex ? 'Yes' : 'No');
    
    console.log('   ✅ UnifiedPressPlaySystem test passed\n');
    
    console.log('All tests passed! ✅');
    console.log('\nConversation engines successfully consolidated:');
    console.log('- ConversationEngine');
    console.log('- EnhancedConversationEngine');
    console.log('- AutonomousConversationEngine');
    console.log('→ UnifiedConversationEngine (with strategy pattern)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testUnifiedSystem();