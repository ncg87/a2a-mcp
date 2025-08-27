#!/usr/bin/env node

/**
 * Test API Fixes
 * 
 * Tests the corrected Google and APillm API integrations to ensure
 * they work properly with the autonomous agent system.
 */

import { AIClient } from './src/core/ai-client.js';
import logger from './src/utils/logger.js';

class APIFixTester {
  constructor() {
    this.aiClient = new AIClient();
  }

  async testAPIProviders() {
    console.log('🔧 Testing API Provider Fixes\n');
    
    await this.aiClient.initialize();
    
    const testPrompt = "Hello, can you briefly introduce yourself?";
    const providers = this.aiClient.getAvailableProviders();
    
    console.log(`Available providers: ${providers.join(', ')}\n`);
    
    const results = [];
    
    for (const provider of providers) {
      console.log(`🧪 Testing ${provider} provider...`);
      
      try {
        // Get a model ID for this provider
        const modelId = this.getTestModelId(provider);
        
        const response = await this.aiClient.generateResponse(modelId, testPrompt, {
          maxTokens: 100,
          temperature: 0.7
        });
        
        console.log(`   ✅ ${provider} API call successful`);
        console.log(`   Model: ${response.model}`);
        console.log(`   Response: ${response.content.substring(0, 100)}...`);
        console.log(`   Cost: $${response.cost ? response.cost.toFixed(6) : '0.000000'}`);
        
        results.push({
          provider: provider,
          success: true,
          model: response.model,
          responseLength: response.content.length,
          cost: response.cost || 0
        });
        
      } catch (error) {
        console.log(`   ❌ ${provider} API call failed: ${error.message}`);
        
        results.push({
          provider: provider,
          success: false,
          error: error.message
        });
      }
      
      console.log('');
    }
    
    this.generateAPITestReport(results);
  }

  getTestModelId(provider) {
    const testModels = {
      'openai': 'openai-gpt-4o',
      'anthropic': 'anthropic-claude-3.5-sonnet',
      'google': 'google-gemini-1.5-pro',
      'apillm': 'apillm-llama-3.3-70b',
      'deepseek': 'deepseek-chat',
      'huggingface': 'huggingface-llama'
    };
    
    return testModels[provider] || `${provider}-default`;
  }

  generateAPITestReport(results) {
    console.log('📊 API Provider Test Report');
    console.log('===========================\n');
    
    const totalProviders = results.length;
    const successfulProviders = results.filter(r => r.success).length;
    const successRate = (successfulProviders / totalProviders * 100).toFixed(1);
    
    console.log(`Total Providers Tested: ${totalProviders}`);
    console.log(`Successful API Calls: ${successfulProviders}`);
    console.log(`Success Rate: ${successRate}%\n`);
    
    console.log('Provider Status:');
    console.log('----------------');
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.provider}`);
      
      if (result.success) {
        console.log(`   Model: ${result.model}`);
        console.log(`   Response Length: ${result.responseLength} chars`);
        console.log(`   Cost: $${result.cost.toFixed(6)}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    // Assessment
    console.log('🎯 API Fix Assessment:');
    if (successRate >= 80) {
      console.log('✅ API integrations are working well!');
      console.log('   Most providers are responding correctly.');
    } else if (successRate >= 50) {
      console.log('⚠️  Some API integrations need attention.');
      console.log('   Check API keys and endpoint configurations.');
    } else {
      console.log('❌ Multiple API integrations are failing.');
      console.log('   Review API keys, endpoints, and authentication.');
    }
    
    // Specific provider recommendations
    const failedProviders = results.filter(r => !r.success);
    if (failedProviders.length > 0) {
      console.log('\n🔍 Failed Provider Analysis:');
      failedProviders.forEach(provider => {
        console.log(`• ${provider.provider}: ${provider.error}`);
        
        if (provider.error.includes('API key') || provider.error.includes('401')) {
          console.log(`  → Check your ${provider.provider.toUpperCase()}_API_KEY in .env file`);
        } else if (provider.error.includes('404') || provider.error.includes('model')) {
          console.log(`  → Verify model names and endpoints for ${provider.provider}`);
        } else if (provider.error.includes('timeout') || provider.error.includes('network')) {
          console.log(`  → Check network connection and ${provider.provider} service status`);
        }
      });
    }
  }

  async testSpecificFixes() {
    console.log('\n🎯 Testing Specific API Fixes\n');
    
    // Test Google API with corrected model names and safety settings
    if (this.aiClient.clients.has('google')) {
      console.log('Testing Google Gemini with safety settings...');
      try {
        const response = await this.aiClient.generateResponse(
          'google-gemini-1.5-pro', 
          'Explain AI safety in one sentence',
          { maxTokens: 50 }
        );
        console.log('✅ Google API with safety settings works');
        console.log(`   Response: ${response.content}`);
      } catch (error) {
        console.log(`❌ Google API test failed: ${error.message}`);
      }
      console.log('');
    }
    
    // Test APillm API with corrected model format
    if (this.aiClient.clients.has('apillm')) {
      console.log('Testing APillm with corrected model format...');
      try {
        const response = await this.aiClient.generateResponse(
          'apillm-llama-3.3-70b', 
          'What is machine learning in one sentence?',
          { maxTokens: 50 }
        );
        console.log('✅ APillm API with corrected format works');
        console.log(`   Response: ${response.content}`);
      } catch (error) {
        console.log(`❌ APillm API test failed: ${error.message}`);
      }
      console.log('');
    }
  }
}

// Run the tests
async function main() {
  const tester = new APIFixTester();
  
  try {
    await tester.testAPIProviders();
    await tester.testSpecificFixes();
    
  } catch (error) {
    logger.error('API fix test suite failed:', error);
    process.exit(1);
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting API test...');
  main().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { APIFixTester };