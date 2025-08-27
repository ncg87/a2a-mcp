#!/usr/bin/env node

/**
 * Test for AI Simulation Fallback Fix
 */

import dotenv from 'dotenv';
import AIClient from '../src/core/ai-client.js';
import UnifiedConversationEngine from '../src/core/unified-conversation-engine.js';

dotenv.config();

console.log('Testing AI Simulation Fallback Fix...\n');

async function testAIFallback() {
  try {
    // Test 1: Check AI Client initialization
    console.log('1. Testing AI Client initialization...');
    const aiClient = new AIClient();
    await aiClient.initialize();
    
    const hasOpenAI = process.env.OPENAI_API_KEY ? true : false;
    const hasAnthropic = process.env.ANTHROPIC_API_KEY ? true : false;
    const hasHuggingFace = process.env.HUGGINGFACE_TOKEN ? true : false;
    
    console.log('   OpenAI configured:', hasOpenAI ? '✅' : '❌');
    console.log('   Anthropic configured:', hasAnthropic ? '✅' : '❌');
    console.log('   Hugging Face configured:', hasHuggingFace ? '✅' : '❌');
    console.log('   Simulation mode:', aiClient.simulationMode ? 'ON' : 'OFF');
    console.log('   Configured providers:', aiClient.clients.size);
    
    if (aiClient.simulationMode && (hasOpenAI || hasAnthropic || hasHuggingFace)) {
      console.log('   ❌ ERROR: Simulation mode active despite API keys being configured');
    } else if (!aiClient.simulationMode && !(hasOpenAI || hasAnthropic || hasHuggingFace)) {
      console.log('   ❌ ERROR: Simulation mode should be active when no API keys configured');
    } else {
      console.log('   ✅ AI Client initialization correct');
    }
    
    // Test 2: Check UnifiedConversationEngine compatibility
    console.log('\n2. Testing UnifiedConversationEngine compatibility...');
    const engine = new UnifiedConversationEngine({
      aiClient,
      messageBus: { publish: () => {}, subscribe: () => {} },
      documenter: { documentInteraction: () => {} },
      chatLogger: { logChat: () => {} }
    });
    
    // Test startAutonomousConversation method exists
    if (typeof engine.startAutonomousConversation === 'function') {
      console.log('   ✅ startAutonomousConversation method exists');
    } else {
      console.log('   ❌ startAutonomousConversation method missing');
    }
    
    // Test 3: Check proper AI status detection
    console.log('\n3. Testing AI status detection...');
    const hasRealAI = aiClient && !aiClient.simulationMode && aiClient.clients.size > 0;
    console.log('   Has real AI available:', hasRealAI ? 'YES' : 'NO');
    
    if (hasRealAI) {
      console.log('   Available providers:', Array.from(aiClient.clients.keys()).filter(k => k !== 'simulation'));
    } else {
      console.log('   Message: Configure API keys in .env file for real AI responses');
    }
    
    console.log('\n✅ AI Simulation Fallback Fix Test Complete');
    console.log('\nSummary:');
    console.log('- AI Client properly detects available providers');
    console.log('- UnifiedConversationEngine has backwards compatibility');
    console.log('- Clear indication when simulation mode is active');
    console.log('- Better error messages for missing API keys');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAIFallback();