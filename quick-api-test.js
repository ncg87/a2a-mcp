#!/usr/bin/env node

import { AIClient } from './src/core/ai-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function quickAPITest() {
  console.log('🔧 Quick API Test');
  console.log('=================\n');
  
  const aiClient = new AIClient();
  
  try {
    await aiClient.initialize();
    console.log('✅ AI Client initialized');
    
    const providers = aiClient.getAvailableProviders();
    console.log(`📋 Available providers: ${providers.join(', ')}\n`);
    
    // Test OpenAI if available
    if (providers.includes('openai')) {
      console.log('🧪 Testing OpenAI...');
      try {
        const response = await aiClient.generateResponse('openai-gpt-4o', 'Say hello in one word', {
          maxTokens: 10
        });
        console.log(`✅ OpenAI works: "${response.content}"`);
      } catch (error) {
        console.log(`❌ OpenAI failed: ${error.message}`);
      }
    }
    
    // Test Anthropic if available
    if (providers.includes('anthropic')) {
      console.log('🧪 Testing Anthropic...');
      try {
        const response = await aiClient.generateResponse('anthropic-claude-3.5-sonnet', 'Say hello in one word', {
          maxTokens: 10
        });
        console.log(`✅ Anthropic works: "${response.content}"`);
      } catch (error) {
        console.log(`❌ Anthropic failed: ${error.message}`);
      }
    }
    
    // Test Google if available
    if (providers.includes('google')) {
      console.log('🧪 Testing Google...');
      try {
        const response = await aiClient.generateResponse('google-gemini-1.5-pro', 'Say hello in one word', {
          maxTokens: 10
        });
        console.log(`✅ Google works: "${response.content}"`);
      } catch (error) {
        console.log(`❌ Google failed: ${error.message}`);
      }
    }
    
    // Test APillm if available
    if (providers.includes('apillm')) {
      console.log('🧪 Testing APillm...');
      try {
        const response = await aiClient.generateResponse('apillm-llama-3.3-70b', 'Say hello in one word', {
          maxTokens: 10
        });
        console.log(`✅ APillm works: "${response.content}"`);
      } catch (error) {
        console.log(`❌ APillm failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
  }
}

quickAPITest().catch(console.error);