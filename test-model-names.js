#!/usr/bin/env node

/**
 * Test Corrected AI Model Names
 * Verify that model names are correctly configured
 */

import { ModelSelector } from './src/core/model-selector.js';
import { AIClient } from './src/core/ai-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testModelNames() {
  console.log('🧪 Testing Corrected AI Model Names\n');
  
  try {
    // Initialize model selector
    const modelSelector = new ModelSelector();
    await modelSelector.initialize();
    
    console.log(`✅ Model Selector initialized with ${modelSelector.availableModels.size} models`);
    
    // Test model selection
    const activeModel = modelSelector.getActiveModel();
    console.log(`✅ Active model: ${activeModel?.name || 'none'}`);
    console.log(`   Provider: ${activeModel?.provider || 'none'}`);
    console.log(`   Model ID: ${activeModel?.model || 'none'}\n`);
    
    // Test available models
    const allModels = modelSelector.getAvailableModels();
    console.log(`📋 Total available models: ${allModels.length}\n`);
    
    // Group models by provider
    const providerGroups = {};
    allModels.forEach(model => {
      if (!providerGroups[model.provider]) {
        providerGroups[model.provider] = [];
      }
      providerGroups[model.provider].push(model);
    });
    
    // List all available models by provider
    for (const [provider, models] of Object.entries(providerGroups)) {
      console.log(`🔧 ${provider.toUpperCase()} Models (${models.length}):`);
      models.forEach(model => {
        console.log(`   - ${model.name} (${model.model})`);
      });
      console.log();
    }
    
    // Test AI client initialization
    console.log('🔌 Testing AI Client initialization...');
    const aiClient = new AIClient();
    await aiClient.initialize();
    
    const availableProviders = aiClient.getAvailableProviders();
    console.log(`✅ AI Client providers: ${availableProviders.join(', ')}\n`);
    
    // Test model name mapping
    console.log('🔍 Testing model name mappings...');
    
    const testModels = [
      'gpt-4',
      'gpt-4.1',
      'claude-3-5-sonnet-20241022',
      'gemini-2.5-flash',
      'llama-3.3-70b-instruct'
    ];
    
    for (const modelName of testModels) {
      try {
        const provider = aiClient.getProviderFromModelId(modelName);
        console.log(`✅ ${modelName} → ${provider}`);
      } catch (error) {
        console.log(`❌ ${modelName} → Error: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Model name verification completed!');
    
  } catch (error) {
    console.error('❌ Model test failed:', error.message);
    process.exit(1);
  }
}

testModelNames();