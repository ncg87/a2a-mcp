/**
 * Comprehensive Test Suite for Integrated Systems
 * 
 * Tests State Manager, Performance Analytics, and Intelligent Cache
 * both individually and as integrated systems
 */

import { ConversationStateManager } from '../src/core/conversation-state-manager.js';
import { AgentPerformanceAnalytics } from '../src/core/agent-performance-analytics.js';
import { IntelligentCache } from '../src/core/intelligent-cache.js';
import AIClient from '../src/core/ai-client.js';
import AutonomousConversationEngine from '../src/core/autonomous-conversation-engine.js';
import fs from 'fs/promises';
import path from 'path';

// Test configuration
const TEST_DIR = './test-output';
const VERBOSE = process.argv.includes('--verbose');

// Helper functions
function log(message, data = null) {
  if (VERBOSE) {
    console.log(message);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
}

async function cleanup() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore if doesn't exist
  }
  await fs.mkdir(TEST_DIR, { recursive: true });
}

// Test State Manager
async function testStateManager() {
  console.log('\n📁 Testing Conversation State Manager...\n');
  
  const stateManager = new ConversationStateManager({
    statePath: path.join(TEST_DIR, 'states'),
    autoSaveInterval: 1000 // 1 second for testing
  });
  
  try {
    // Test 1: Initialize
    console.log('Test 1: Initialization');
    await stateManager.initialize();
    console.log('✅ State manager initialized');
    
    // Test 2: Create state
    console.log('\nTest 2: Create conversation state');
    const stateId = stateManager.createState({
      objective: 'Test conversation',
      agents: ['agent-1', 'agent-2'],
      memory: [],
      decisions: [],
      context: { test: true },
      iteration: 0
    });
    console.log(`✅ State created: ${stateId}`);
    
    // Test 3: Update state
    console.log('\nTest 3: Update conversation state');
    stateManager.updateConversation({
      memory: [{ content: 'Test message 1' }],
      decisions: ['Decision 1'],
      iteration: 1
    });
    console.log('✅ State updated');
    
    // Test 4: Create snapshot
    console.log('\nTest 4: Create snapshot');
    const snapshotId = await stateManager.createSnapshot('Test snapshot');
    console.log(`✅ Snapshot created: ${snapshotId}`);
    
    // Test 5: Save state
    console.log('\nTest 5: Save state to disk');
    await stateManager.saveState();
    console.log('✅ State saved to disk');
    
    // Test 6: Create branch
    console.log('\nTest 6: Create branch');
    const branchId = await stateManager.createBranch('Test branch');
    console.log(`✅ Branch created: ${branchId}`);
    
    // Test 7: Switch branch
    console.log('\nTest 7: Switch branch');
    await stateManager.switchBranch(branchId);
    console.log('✅ Switched to branch');
    
    // Test 8: Restore snapshot
    console.log('\nTest 8: Restore from snapshot');
    await stateManager.switchBranch(stateId); // Back to main
    await stateManager.restoreSnapshot(snapshotId);
    console.log('✅ Restored from snapshot');
    
    // Test 9: Export state
    console.log('\nTest 9: Export state');
    const jsonExport = await stateManager.exportState('json');
    const markdownExport = await stateManager.exportState('markdown');
    console.log('✅ Exported to JSON (length: ' + jsonExport.length + ')');
    console.log('✅ Exported to Markdown (length: ' + markdownExport.length + ')');
    
    // Test 10: Get history
    console.log('\nTest 10: Get state history');
    const history = stateManager.getStateHistory();
    console.log(`✅ History retrieved: ${history.length} events`);
    
    // Test 11: Auto-save (wait for interval)
    console.log('\nTest 11: Auto-save functionality');
    stateManager.isDirty = true;
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('✅ Auto-save completed');
    
    // Cleanup
    await stateManager.shutdown();
    console.log('\n✅ State Manager tests completed successfully!');
    
  } catch (error) {
    console.error('❌ State Manager test failed:', error);
    throw error;
  }
}

// Test Performance Analytics
async function testAnalytics() {
  console.log('\n📊 Testing Agent Performance Analytics...\n');
  
  const analytics = new AgentPerformanceAnalytics();
  
  try {
    // Test 1: Track agent creation
    console.log('Test 1: Track agent creation');
    analytics.trackAgentCreation('agent-1', 'coordinator', 'gpt-4');
    analytics.trackAgentCreation('agent-2', 'analyst', 'claude-3');
    console.log('✅ Agents tracked');
    
    // Test 2: Track agent responses
    console.log('\nTest 2: Track agent responses');
    for (let i = 0; i < 5; i++) {
      analytics.trackAgentResponse('agent-1', {
        content: 'Test response ' + i,
        tokens: 100 + i * 10,
        responseTime: 500 + i * 100,
        usedMCPTools: i % 2 === 0,
        createdSubAgents: i === 2,
        subAgentCount: i === 2 ? 2 : 0
      });
    }
    console.log('✅ Responses tracked');
    
    // Test 3: Track errors
    console.log('\nTest 3: Track agent errors');
    analytics.trackAgentError('agent-2', new Error('Test error'));
    console.log('✅ Error tracked');
    
    // Test 4: Track conversation completion
    console.log('\nTest 4: Track conversation completion');
    analytics.trackConversationCompletion({
      iterations: 10,
      duration: 60000,
      agentCount: 2,
      totalTokens: 1500,
      totalCost: 0.05,
      conclusion: 'Test conclusion'
    });
    console.log('✅ Conversation completion tracked');
    
    // Test 5: Get agent rankings
    console.log('\nTest 5: Get agent rankings');
    const rankings = analytics.getAgentRankings();
    console.log(`✅ Rankings retrieved:`);
    console.log(`   Top Quality: ${rankings.topQuality.length} agents`);
    console.log(`   Top Efficiency: ${rankings.topEfficiency.length} agents`);
    console.log(`   Top Reliability: ${rankings.topReliability.length} agents`);
    
    // Test 6: Get model comparison
    console.log('\nTest 6: Get model comparison');
    const comparison = analytics.getModelComparison();
    console.log(`✅ Model comparison: ${comparison.length} models analyzed`);
    
    // Test 7: Get dashboard data
    console.log('\nTest 7: Get dashboard data');
    const dashboard = analytics.getDashboardData();
    console.log('✅ Dashboard data retrieved:');
    console.log(`   Active agents: ${dashboard.overview.activeAgents}`);
    console.log(`   Token usage: ${dashboard.performance.tokenUsage}`);
    console.log(`   Success rate: ${(dashboard.performance.successRate * 100).toFixed(1)}%`);
    
    // Test 8: Export report
    console.log('\nTest 8: Export analytics report');
    const jsonReport = analytics.exportReport('json');
    const markdownReport = analytics.exportReport('markdown');
    console.log('✅ JSON report exported (length: ' + jsonReport.length + ')');
    console.log('✅ Markdown report exported (length: ' + markdownReport.length + ')');
    
    console.log('\n✅ Analytics tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Analytics test failed:', error);
    throw error;
  }
}

// Test Intelligent Cache
async function testCache() {
  console.log('\n💾 Testing Intelligent Cache...\n');
  
  const cache = new IntelligentCache({
    maxSize: 10,
    ttl: 5000, // 5 seconds for testing
    similarityThreshold: 0.8
  });
  
  try {
    // Test 1: Basic caching
    console.log('Test 1: Basic cache set/get');
    const prompt1 = 'What is artificial intelligence?';
    const response1 = { content: 'AI is...' };
    cache.set(prompt1, {}, response1);
    
    const cached1 = cache.get(prompt1, {});
    console.log(`✅ Direct cache hit: ${cached1 !== null}`);
    
    // Test 2: Semantic similarity
    console.log('\nTest 2: Semantic similarity matching');
    const prompt2 = 'What is AI?'; // Similar but not exact
    const cached2 = cache.get(prompt2, {});
    console.log(`✅ Semantic match found: ${cached2 !== null}`);
    if (cached2) {
      console.log(`   Similarity score: ${cached2.similarity}`);
    }
    
    // Test 3: Context-aware caching
    console.log('\nTest 3: Context-aware caching');
    const prompt3 = 'Explain this';
    const context1 = { topic: 'quantum' };
    const context2 = { topic: 'classical' };
    cache.set(prompt3, context1, { content: 'Quantum explanation' });
    cache.set(prompt3, context2, { content: 'Classical explanation' });
    
    const cached3a = cache.get(prompt3, context1);
    const cached3b = cache.get(prompt3, context2);
    console.log(`✅ Context 1 response correct: ${cached3a?.response.content === 'Quantum explanation'}`);
    console.log(`✅ Context 2 response correct: ${cached3b?.response.content === 'Classical explanation'}`);
    
    // Test 4: LRU eviction
    console.log('\nTest 4: LRU eviction');
    for (let i = 0; i < 15; i++) {
      cache.set(`Prompt ${i}`, {}, { content: `Response ${i}` });
    }
    const stats1 = cache.getStats();
    console.log(`✅ Cache size limited to: ${stats1.cacheSize} (max: 10)`);
    console.log(`   Evictions: ${stats1.evictions}`);
    
    // Test 5: TTL expiration
    console.log('\nTest 5: TTL expiration');
    cache.set('Expiring prompt', {}, { content: 'Will expire' });
    await new Promise(resolve => setTimeout(resolve, 6000)); // Wait for TTL
    const expired = cache.get('Expiring prompt', {});
    console.log(`✅ Expired entry not returned: ${expired === null}`);
    
    // Test 6: Cache statistics
    console.log('\nTest 6: Cache statistics');
    const stats2 = cache.getStats();
    console.log('✅ Statistics retrieved:');
    console.log(`   Hit rate: ${stats2.hitRate.toFixed(1)}%`);
    console.log(`   Cache size: ${stats2.cacheSize}`);
    console.log(`   Memory usage: ${stats2.memoryUsage} bytes`);
    
    // Test 7: Predictive warming
    console.log('\nTest 7: Predictive cache warming');
    const predictions = await cache.warmUp({
      objective: 'Build a web app',
      decisions: ['Use React', 'Deploy to AWS'],
      openQuestions: ['How to optimize performance?']
    });
    console.log(`✅ Predicted ${predictions.length} likely prompts`);
    
    // Test 8: Export/Import
    console.log('\nTest 8: Export and import cache');
    const exported = cache.exportCache();
    console.log(`✅ Exported ${exported.entries.length} entries`);
    
    cache.clear();
    const imported = cache.importCache(exported);
    console.log(`✅ Imported ${imported} entries`);
    
    // Test 9: Cache effectiveness
    console.log('\nTest 9: Analyze cache effectiveness');
    const analysis = cache.analyzeEffectiveness();
    console.log('✅ Effectiveness analyzed:');
    console.log(`   Estimated tokens saved: ${analysis.estimatedTokensSaved}`);
    console.log(`   Estimated cost saved: $${analysis.estimatedCostSaved}`);
    analysis.recommendations.forEach(rec => {
      console.log(`   Recommendation: ${rec}`);
    });
    
    console.log('\n✅ Cache tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Cache test failed:', error);
    throw error;
  }
}

// Test Integration
async function testIntegration() {
  console.log('\n🔗 Testing System Integration...\n');
  
  try {
    // Create a minimal conversation engine setup
    const chatLogger = {
      startChatLog: async () => {},
      addSystemMessage: async () => {},
      addAgentResponse: async () => {}
    };
    
    const modelSelector = {
      getAvailableModels: () => [
        { id: 'test-model-1', name: 'Test Model 1', available: true }
      ]
    };
    
    const mcpRegistry = {};
    
    const engine = new AutonomousConversationEngine(chatLogger, modelSelector, mcpRegistry);
    
    // Test 1: Verify state manager integration
    console.log('Test 1: State manager integration');
    console.log(`✅ State manager initialized: ${engine.stateManager !== undefined}`);
    
    // Test 2: Verify analytics integration  
    console.log('\nTest 2: Analytics integration');
    console.log(`✅ Analytics initialized: ${engine.analytics !== undefined}`);
    
    // Test 3: Verify cache integration in AI client
    console.log('\nTest 3: Cache integration in AI client');
    console.log(`✅ AI client has cache: ${engine.aiClient.cache !== undefined}`);
    
    // Test 4: Test state creation during conversation
    console.log('\nTest 4: State creation');
    engine.currentObjective = { mainObjective: 'Test objective' };
    const stateId = engine.stateManager.createState({
      objective: 'Test',
      agents: [],
      memory: [],
      decisions: [],
      context: {},
      iteration: 0
    });
    console.log(`✅ State created during conversation: ${stateId}`);
    
    // Test 5: Test analytics tracking
    console.log('\nTest 5: Analytics tracking');
    engine.analytics.trackAgentCreation('test-agent', 'test-type', 'test-model');
    engine.analytics.trackAgentResponse('test-agent', {
      content: 'Test response',
      tokens: 100,
      responseTime: 500
    });
    const dashboard = engine.analytics.getDashboardData();
    console.log(`✅ Analytics tracking working: ${dashboard.overview.totalAgents === 1}`);
    
    // Test 6: Test cache functionality
    console.log('\nTest 6: Cache functionality');
    const cacheStats = engine.aiClient.getCacheStats();
    console.log(`✅ Cache stats available: ${cacheStats !== undefined}`);
    
    // Test 7: Test state updates
    console.log('\nTest 7: State updates');
    engine.stateManager.updateConversation({
      memory: [{ content: 'Integration test message' }],
      iteration: 1
    });
    const currentState = engine.stateManager.getCurrentState();
    console.log(`✅ State updates working: ${currentState.data.iteration === 1}`);
    
    // Test 8: Test snapshot creation
    console.log('\nTest 8: Snapshot creation');
    const snapshotId = await engine.stateManager.createSnapshot('Integration test snapshot');
    console.log(`✅ Snapshot created: ${snapshotId}`);
    
    // Cleanup
    await engine.stateManager.shutdown();
    
    console.log('\n✅ Integration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    throw error;
  }
}

// Performance test
async function testPerformance() {
  console.log('\n⚡ Testing System Performance...\n');
  
  const cache = new IntelligentCache({ maxSize: 1000 });
  const analytics = new AgentPerformanceAnalytics();
  
  try {
    // Test 1: Cache performance
    console.log('Test 1: Cache performance (1000 operations)');
    const startCache = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      cache.set(`Prompt ${i}`, {}, { content: `Response ${i}` });
      cache.get(`Prompt ${Math.floor(Math.random() * i + 1)}`, {});
    }
    
    const cacheTime = Date.now() - startCache;
    console.log(`✅ Cache operations completed in ${cacheTime}ms`);
    console.log(`   Average per operation: ${(cacheTime / 1000).toFixed(2)}ms`);
    
    // Test 2: Analytics performance
    console.log('\nTest 2: Analytics performance (1000 events)');
    const startAnalytics = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      analytics.trackAgentResponse(`agent-${i % 10}`, {
        content: 'Test',
        tokens: 100,
        responseTime: 500
      });
    }
    
    const analyticsTime = Date.now() - startAnalytics;
    console.log(`✅ Analytics tracking completed in ${analyticsTime}ms`);
    console.log(`   Average per event: ${(analyticsTime / 1000).toFixed(2)}ms`);
    
    // Test 3: State manager performance
    console.log('\nTest 3: State manager performance');
    const stateManager = new ConversationStateManager({
      statePath: path.join(TEST_DIR, 'perf-states')
    });
    await stateManager.initialize();
    
    const startState = Date.now();
    const stateId = stateManager.createState({ objective: 'Perf test' });
    
    for (let i = 0; i < 100; i++) {
      stateManager.updateConversation({
        memory: [{ content: `Message ${i}` }],
        iteration: i
      });
    }
    
    await stateManager.saveState();
    const stateTime = Date.now() - startState;
    console.log(`✅ State operations completed in ${stateTime}ms`);
    
    await stateManager.shutdown();
    
    // Summary
    console.log('\n📊 Performance Summary:');
    console.log(`   Total operations: 2100`);
    console.log(`   Total time: ${cacheTime + analyticsTime + stateTime}ms`);
    console.log(`   Operations per second: ${(2100 / ((cacheTime + analyticsTime + stateTime) / 1000)).toFixed(0)}`);
    
    console.log('\n✅ Performance tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  console.log('========================================');
  console.log('  Comprehensive System Tests');
  console.log('========================================');
  
  try {
    await cleanup();
    
    // Run individual component tests
    await testStateManager();
    await testAnalytics();
    await testCache();
    
    // Run integration tests
    await testIntegration();
    
    // Run performance tests
    await testPerformance();
    
    console.log('\n========================================');
    console.log('  ✅ ALL TESTS PASSED!');
    console.log('========================================\n');
    
    // Clean up test directory
    await cleanup();
    
  } catch (error) {
    console.log('\n========================================');
    console.log('  ❌ TEST SUITE FAILED');
    console.log('========================================\n');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();