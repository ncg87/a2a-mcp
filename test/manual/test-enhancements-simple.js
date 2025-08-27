/**
 * Simple test to verify enhanced discussion system components
 */

import RoundTransitionManager from './src/core/round-transition-manager.js';
import DynamicAgentSelector from './src/core/dynamic-agent-selector.js';
import TieredModelSelector from './src/core/tiered-model-selector.js';
import ModelSelector from './src/core/model-selector.js';
import AIClient from './src/core/ai-client.js';

async function testEnhancements() {
  console.log('🧪 Testing Enhanced Discussion Components\n');
  
  try {
    // Test Round Transition Manager
    console.log('1️⃣ Testing Round Transition Manager...');
    const aiClient = new AIClient();
    const roundManager = new RoundTransitionManager(aiClient);
    
    const transitionDecision = await roundManager.shouldTransitionToNextRound(
      { exchanges: [{ content: 'Test exchange' }] },
      { openQuestions: ['Q1', 'Q2'], decisions: [] }
    );
    console.log('   ✅ Round transition decision:', transitionDecision.reason);
    
    // Test Dynamic Agent Selector
    console.log('\n2️⃣ Testing Dynamic Agent Selector...');
    const agentSelector = new DynamicAgentSelector(aiClient);
    
    const selectedAgents = await agentSelector.selectAgentsForDiscussion(
      'Design a microservices architecture',
      { complexity: 'high' }
    );
    console.log(`   ✅ Selected ${selectedAgents.length} agents:`);
    selectedAgents.forEach(agent => {
      console.log(`      - ${agent.type}: ${agent.specialization}`);
    });
    
    // Test Tiered Model Selector
    console.log('\n3️⃣ Testing Tiered Model Selector...');
    const modelSelector = new ModelSelector();
    await modelSelector.initialize();
    
    const tieredSelector = new TieredModelSelector(modelSelector);
    await tieredSelector.initialize();
    
    const tierStats = tieredSelector.getTierStatistics();
    console.log('   Model Tier Distribution:');
    for (const [tier, stats] of Object.entries(tierStats)) {
      console.log(`      ${tier}: ${stats.modelCount} models`);
    }
    
    // Test model assignment for different agent types
    const testAgents = [
      { id: 'agent-1', type: 'coordinator', isMainAgent: true },
      { id: 'agent-2', type: 'researcher', isMainAgent: true },
      { id: 'agent-3', type: 'sub-agent', isSubAgent: true, specialization: 'data analysis' }
    ];
    
    console.log('\n   Model Assignments:');
    for (const agent of testAgents) {
      const model = await tieredSelector.assignModelToAgent(agent, 'medium');
      console.log(`      ${agent.type}: ${model?.name || 'No model'} (Tier: ${tieredSelector.getModelTier(model)})`);
    }
    
    console.log('\n✅ All components tested successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testEnhancements().catch(console.error);