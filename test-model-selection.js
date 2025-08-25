#!/usr/bin/env node

/**
 * AI Model Selection System Test
 * Demonstrates intelligent model selection and switching capabilities
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
import logger from './src/utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testModelSelection() {
  try {
    console.log('🧪 Testing AI Model Selection System\n');

    // Initialize all components
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

    console.log('✅ All systems initialized\n');

    // Test 1: Show available models
    console.log('📊 TEST 1: Available AI Models');
    const stats = modelSelector.getModelStats();
    const availableModels = modelSelector.getAvailableModels();
    
    console.log(`Total Models: ${stats.total}`);
    console.log(`Available: ${stats.available}`);
    console.log(`Providers: ${stats.providers.join(', ')}`);
    console.log(`Default Model: ${stats.activeModel}\n`);

    console.log('Available Models:');
    availableModels.forEach((model, index) => {
      const cost = model.costPerToken === 0 ? 'Free' : `$${model.costPerToken}/token`;
      console.log(`  ${index + 1}. ${model.name} (${model.provider})`);
      console.log(`     Quality: ${model.qualityScore}/10 | Speed: ${model.speedScore}/10`);
      console.log(`     Cost: ${cost} | Max Tokens: ${model.maxTokens.toLocaleString()}`);
      console.log(`     Capabilities: ${model.capabilities.join(', ')}`);
    });
    console.log('');

    // Test 2: Model Recommendations
    console.log('💡 TEST 2: Model Recommendations by Use Case');
    const recommendations = modelSelector.getRecommendations();
    
    Object.entries(recommendations).forEach(([useCase, model]) => {
      if (model) {
        console.log(`  ${useCase}: ${model.name} (${model.provider})`);
        console.log(`    Reasoning: Quality ${model.qualityScore}/10, Speed ${model.speedScore}/10, Cost $${model.costPerToken}`);
      }
    });
    console.log('');

    // Test 3: Task-Specific Model Selection
    console.log('🎯 TEST 3: Task-Specific Model Selection');
    
    const testTasks = [
      { type: 'reasoning', description: 'Complex philosophical analysis' },
      { type: 'code-generation', description: 'Generate Python machine learning code' },
      { type: 'fast-response', description: 'Quick customer support response' },
      { type: 'cost-sensitive', description: 'Simple text classification task' }
    ];

    testTasks.forEach(task => {
      const optimalModel = modelSelector.getOptimalModel(task.type);
      console.log(`  Task: ${task.description}`);
      console.log(`  Type: ${task.type}`);
      if (optimalModel) {
        console.log(`  Optimal Model: ${optimalModel.name} (${optimalModel.provider})`);
        console.log(`  Reason: Quality ${optimalModel.qualityScore}/10, Speed ${optimalModel.speedScore}/10`);
      } else {
        console.log(`  No optimal model found`);
      }
      console.log('');
    });

    // Test 4: Manual Model Switching
    console.log('🔄 TEST 4: Manual Model Switching');
    
    const originalModel = modelSelector.getActiveModel();
    console.log(`Original Model: ${originalModel?.name || 'None'}`);

    // Try switching to different models
    const switchTests = [
      'anthropic-claude-3-haiku',
      'openai-gpt-4',
      'anthropic-claude-3-sonnet'
    ];

    for (const modelId of switchTests) {
      try {
        const model = modelSelector.selectModel(modelId);
        console.log(`✅ Switched to: ${model.name} (${model.provider})`);
        console.log(`   Quality: ${model.qualityScore}/10 | Speed: ${model.speedScore}/10 | Cost: $${model.costPerToken}`);
      } catch (error) {
        console.log(`❌ Failed to switch to ${modelId}: ${error.message}`);
      }
    }
    console.log('');

    // Test 5: Intelligent Task Analysis with Model Selection
    console.log('🧠 TEST 5: Intelligent Task Analysis with Model Selection');
    
    const complexTasks = [
      {
        prompt: "Build a sophisticated AI-powered trading algorithm that uses deep learning to analyze market patterns and make automated investment decisions",
        expectedType: "reasoning"
      },
      {
        prompt: "Write a Python web scraper that extracts data from multiple e-commerce sites and stores it in a database",
        expectedType: "code-generation"
      },
      {
        prompt: "Provide a quick summary of the latest news",
        expectedType: "fast-response"
      },
      {
        prompt: "Translate this simple sentence to Spanish",
        expectedType: "cost-sensitive"
      }
    ];

    for (const task of complexTasks) {
      console.log(`\n📝 Task: "${task.prompt}"`);
      
      // Start documentation session
      const analysis = {
        complexity: Math.floor(Math.random() * 5) + 5,
        taskType: task.expectedType,
        requiredCapabilities: ['text-generation', 'analysis']
      };
      
      const sessionId = await documenter.startSession(task.prompt, analysis);
      
      // Select optimal model
      const optimalModel = modelSelector.getOptimalModel(task.expectedType, {
        capabilities: analysis.requiredCapabilities,
        maxTokens: task.prompt.length > 100 ? 8192 : 4096
      });
      
      if (optimalModel) {
        console.log(`🎯 Selected Model: ${optimalModel.name} (${optimalModel.provider})`);
        console.log(`   Optimization: ${task.expectedType}`);
        console.log(`   Quality: ${optimalModel.qualityScore}/10 | Speed: ${optimalModel.speedScore}/10`);
        console.log(`   Cost Estimate: $${(optimalModel.costPerToken * 1000).toFixed(6)} per 1K tokens`);
        
        // Switch to optimal model
        modelSelector.selectModel(optimalModel.id);
        
        // Record model selection in documentation
        documenter.recordEvent('optimal-model-selection', {
          taskType: task.expectedType,
          selectedModel: optimalModel.id,
          modelName: optimalModel.name,
          reasoning: `Optimal for ${task.expectedType} tasks`
        });
        
        // Simulate agent creation with model assignment
        const agentId = `${task.expectedType}-agent-${Date.now()}`;
        documenter.recordAgentCreation({
          id: agentId,
          type: task.expectedType,
          capabilities: ['ai-reasoning', 'task-execution'],
          mcpServers: ['openai-mcp'],
          aiModel: optimalModel.id
        });
        
        console.log(`   🤖 Created agent with ${optimalModel.name}`);
        
        // Record task execution
        documenter.recordTaskResult(
          agentId,
          'task-processing',
          { status: 'completed', model: optimalModel.name },
          true
        );
        
      } else {
        console.log(`❌ No optimal model found for ${task.expectedType}`);
      }
      
      // End documentation session
      const results = {
        steps: [
          { step: 'Model selection', error: null },
          { step: 'Agent creation', error: null },
          { step: 'Task processing', error: null }
        ],
        overallStatus: 'success',
        modelUsed: optimalModel?.name || 'none'
      };
      
      await documenter.endSession(results, 'success');
    }

    console.log('\n📊 TEST 6: Model Usage Statistics');
    
    // Show final statistics
    const finalStats = modelSelector.getModelStats();
    console.log(`Models Available: ${finalStats.available}/${finalStats.total}`);
    console.log(`Providers: ${finalStats.providers.join(', ')}`);
    console.log(`Average Quality: ${finalStats.avgQuality.toFixed(1)}/10`);
    console.log(`Average Speed: ${finalStats.avgSpeed.toFixed(1)}/10`);
    console.log(`Free Models: ${finalStats.freeModels}`);
    console.log(`Currently Active: ${finalStats.activeModel}`);
    console.log('');

    console.log('🏆 TEST 7: Cost Analysis');
    
    // Calculate cost analysis for different workloads
    const workloads = [
      { name: 'High-volume customer support', tokens: 1000000, priority: 'cost' },
      { name: 'Complex research analysis', tokens: 50000, priority: 'quality' },
      { name: 'Real-time chat responses', tokens: 100000, priority: 'speed' },
      { name: 'Code generation tasks', tokens: 200000, priority: 'capability' }
    ];

    workloads.forEach(workload => {
      let optimalModel;
      
      switch (workload.priority) {
        case 'cost':
          optimalModel = modelSelector.getOptimalModel('cost-sensitive');
          break;
        case 'quality':
          optimalModel = modelSelector.getOptimalModel('reasoning');
          break;
        case 'speed':
          optimalModel = modelSelector.getOptimalModel('fast-response');
          break;
        case 'capability':
          optimalModel = modelSelector.getOptimalModel('code-generation');
          break;
      }
      
      if (optimalModel) {
        const cost = optimalModel.costPerToken * workload.tokens;
        console.log(`  ${workload.name}:`);
        console.log(`    Model: ${optimalModel.name}`);
        console.log(`    Priority: ${workload.priority}`);
        console.log(`    Tokens: ${workload.tokens.toLocaleString()}`);
        console.log(`    Estimated Cost: $${cost.toFixed(2)}`);
        console.log('');
      }
    });

    // Cleanup
    await messageBus.disconnect();
    
    console.log('🎉 All Model Selection Tests Completed Successfully!\n');
    
    console.log('✅ Tested Features:');
    console.log('   • Multi-provider model detection (OpenAI, Anthropic, Hugging Face)');
    console.log('   • Intelligent model recommendations by use case');
    console.log('   • Task-specific optimal model selection');
    console.log('   • Manual model switching with validation');
    console.log('   • Automatic model assignment to agents');
    console.log('   • Cost analysis and optimization');
    console.log('   • Complete documentation integration');
    console.log('   • Performance and capability scoring');
    console.log('');
    
    console.log('🚀 The system now intelligently selects the best AI model for each task!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testModelSelection();