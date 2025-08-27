#!/usr/bin/env node

/**
 * Test Claude Model Names to find the correct ones
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testClaudeModelNames() {
  console.log('🧪 Testing Claude Model Names\n');
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('❌ No ANTHROPIC_API_KEY found');
    return;
  }
  
  const testModels = [
    'claude-3-5-sonnet-20241022',  // Known working
    'claude-3-5-haiku-20241022',   // Known working  
    'claude-3-opus-20240229',      // Known working
    'claude-sonnet-4-20250514',    // Claude 4 Sonnet attempt
    'claude-opus-4-1-20250805',    // Claude 4.1 Opus attempt
    'claude-4-sonnet',             // Simple name attempt
    'claude-4-opus',               // Simple name attempt
    'claude-opus-4',               // Alternative format
    'claude-sonnet-4'              // Alternative format
  ];
  
  for (const modelName of testModels) {
    console.log(`🔍 Testing model: ${modelName}`);
    
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: modelName,
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: 'Hi'
          }]
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          timeout: 10000
        }
      );
      
      if (response.data && response.data.content) {
        console.log(`✅ ${modelName} - WORKS!`);
        console.log(`   Response: ${response.data.content[0]?.text || 'No text'}`);
      } else {
        console.log(`⚠️  ${modelName} - Unexpected response format`);
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${modelName} - Error ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`);
      } else {
        console.log(`❌ ${modelName} - Network error: ${error.message}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎯 Test completed! Use the working model names in your configuration.');
}

testClaudeModelNames();