/**
 * Test Enhanced Discussion System
 * 
 * Tests the new round transition manager, dynamic agent selection,
 * tiered model assignment, and improved MCP tool usage
 */

import AutonomousConversationEngine from './src/core/autonomous-conversation-engine.js';
import ChatLogger from './src/core/chat-logger.js';
import ModelSelector from './src/core/model-selector.js';
import ExternalMCPRegistry from './src/core/external-mcp-registry.js';
import logger from './src/utils/logger.js';

async function testEnhancedDiscussion() {
  console.log('🚀 Testing Enhanced Discussion System\n');
  console.log('='.repeat(80));
  
  try {
    // Initialize components
    const chatLogger = new ChatLogger();
    const modelSelector = new ModelSelector();
    const mcpRegistry = new ExternalMCPRegistry();
    
    // Create autonomous conversation engine
    const engine = new AutonomousConversationEngine(
      chatLogger,
      modelSelector,
      mcpRegistry
    );
    
    // Test different complexity scenarios
    const testScenarios = [
      {
        name: 'Complex Technical Architecture',
        prompt: 'Design a comprehensive microservices architecture for a global e-commerce platform with real-time inventory management, AI-powered recommendations, and multi-region deployment',
        expectedComplexity: 'high',
        expectedAgentTypes: ['architect', 'developer', 'devops', 'data-science'],
        expectedRounds: 5
      },
      {
        name: 'Research and Analysis Task',
        prompt: 'Research the latest developments in quantum computing and analyze their potential impact on cryptography and data security in the next 5 years',
        expectedComplexity: 'medium',
        expectedAgentTypes: ['researcher', 'analyst', 'security'],
        expectedRounds: 4
      },
      {
        name: 'Simple Implementation Task',
        prompt: 'Create a basic REST API endpoint for user authentication with JWT tokens',
        expectedComplexity: 'low',
        expectedAgentTypes: ['developer', 'qa'],
        expectedRounds: 3
      }
    ];
    
    for (const scenario of testScenarios) {
      console.log(`\n📋 Testing Scenario: ${scenario.name}`);
      console.log('-'.repeat(60));
      console.log(`Prompt: "${scenario.prompt}"`);
      console.log(`Expected Complexity: ${scenario.expectedComplexity}`);
      console.log(`Expected Agent Types: ${scenario.expectedAgentTypes.join(', ')}`);
      console.log(`Expected Rounds: ~${scenario.expectedRounds}`);
      console.log('');
      
      // Start conversation with no initial agents to test dynamic selection
      await testScenarioExecution(engine, scenario);
      
      // Brief pause between scenarios
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Display final statistics
    displayTestStatistics(engine);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    logger.error('Enhanced discussion test failed:', error);
  }
}

async function testScenarioExecution(engine, scenario) {
  console.log('🔄 Starting autonomous conversation...\n');
  
  // Mock a shortened conversation for testing
  const originalMaxIterations = engine.maxIterations;
  engine.maxIterations = 5; // Limit for testing
  
  // Track metrics
  const startTime = Date.now();
  const metrics = {
    agentsCreated: 0,
    modelsUsed: new Set(),
    mcpToolsUsed: 0,
    roundsCompleted: 0,
    subAgentsCreated: 0
  };
  
  // Override some methods to track metrics
  const originalCreateDynamicAgent = engine.createDynamicAgent.bind(engine);
  engine.createDynamicAgent = async function(action) {
    metrics.agentsCreated++;
    return originalCreateDynamicAgent(action);
  };
  
  const originalCreateSubAgent = engine.createSubAgent.bind(engine);
  engine.createSubAgent = async function(parentAgent, spec, topic) {
    metrics.subAgentsCreated++;
    const subAgent = await originalCreateSubAgent(parentAgent, spec, topic);
    if (subAgent.assignedModel) {
      metrics.modelsUsed.add(subAgent.assignedModel.name);
    }
    return subAgent;
  };
  
  const originalUseRelevantMCPTools = engine.useRelevantMCPTools.bind(engine);
  engine.useRelevantMCPTools = async function(agent, topic) {
    const result = await originalUseRelevantMCPTools(agent, topic);
    if (result.toolsUsed) {
      metrics.mcpToolsUsed++;
    }
    return result;
  };
  
  // Start the conversation
  try {
    await engine.startAutonomousConversation(scenario.prompt, []);
    
    metrics.roundsCompleted = engine.roundTransitionManager.currentRound;
    
    // Collect model usage from active agents
    for (const [agentId, agent] of engine.activeAgents) {
      if (agent.assignedModel) {
        metrics.modelsUsed.add(agent.assignedModel.name);
      }
    }
    
  } catch (error) {
    console.error(`Error in scenario execution: ${error.message}`);
  }
  
  // Restore original max iterations
  engine.maxIterations = originalMaxIterations;
  
  // Display scenario results
  const duration = Date.now() - startTime;
  console.log('\n📊 Scenario Results:');
  console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log(`   Agents Created: ${metrics.agentsCreated}`);
  console.log(`   Sub-Agents Created: ${metrics.subAgentsCreated}`);
  console.log(`   Rounds Completed: ${metrics.roundsCompleted}`);
  console.log(`   MCP Tools Used: ${metrics.mcpToolsUsed} times`);
  console.log(`   Unique Models Used: ${metrics.modelsUsed.size}`);
  console.log(`   Model Distribution:`);
  
  // Show model tier distribution
  const tierCounts = categorizModelsByTier(Array.from(metrics.modelsUsed));
  console.log(`      Premium: ${tierCounts.premium} models`);
  console.log(`      Balanced: ${tierCounts.balanced} models`);
  console.log(`      Fast: ${tierCounts.fast} models`);
  console.log(`      Economical: ${tierCounts.economical} models`);
  
  // Verify expectations
  console.log('\n✅ Verification:');
  const complexityMatch = checkComplexityMatch(engine.currentObjective?.complexity, scenario.expectedComplexity);
  console.log(`   Complexity Detection: ${complexityMatch ? 'PASS' : 'FAIL'}`);
  
  const agentTypesMatch = checkAgentTypes(engine.activeAgents, scenario.expectedAgentTypes);
  console.log(`   Agent Type Selection: ${agentTypesMatch ? 'PASS' : 'PARTIAL'}`);
  
  const roundsReasonable = Math.abs(metrics.roundsCompleted - scenario.expectedRounds) <= 2;
  console.log(`   Round Management: ${roundsReasonable ? 'PASS' : 'NEEDS TUNING'}`);
  
  // Check if MCP tools were used
  const mcpToolsWorking = metrics.mcpToolsUsed > 0;
  console.log(`   MCP Tool Usage: ${mcpToolsWorking ? 'WORKING' : 'NOT WORKING'}`);
  
  // Reset for next scenario
  engine.roundTransitionManager.reset();
  engine.activeAgents.clear();
  engine.conversationMemory = [];
  engine.currentIteration = 0;
}

function categorizModelsByTier(modelNames) {
  const tiers = {
    premium: 0,
    balanced: 0,
    fast: 0,
    economical: 0
  };
  
  modelNames.forEach(name => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('opus') || nameLower.includes('gpt-5') || 
        nameLower.includes('o3') || nameLower.includes('2.5') || 
        nameLower.includes('flagship') || nameLower.includes('reasoner')) {
      tiers.premium++;
    } else if (nameLower.includes('sonnet') || nameLower.includes('gpt-4') || 
               nameLower.includes('llama-3')) {
      tiers.balanced++;
    } else if (nameLower.includes('mini') || nameLower.includes('flash') || 
               nameLower.includes('haiku') || nameLower.includes('nano')) {
      tiers.fast++;
    } else {
      tiers.economical++;
    }
  });
  
  return tiers;
}

function checkComplexityMatch(actual, expected) {
  if (!actual) return false;
  
  if (expected === 'high' && actual >= 7) return true;
  if (expected === 'medium' && actual >= 4 && actual < 7) return true;
  if (expected === 'low' && actual < 4) return true;
  
  return false;
}

function checkAgentTypes(activeAgents, expectedTypes) {
  const actualTypes = new Set();
  for (const [agentId, agent] of activeAgents) {
    actualTypes.add(agent.type);
  }
  
  let matchCount = 0;
  for (const expectedType of expectedTypes) {
    if (actualTypes.has(expectedType)) {
      matchCount++;
    }
  }
  
  return matchCount >= expectedTypes.length * 0.5; // At least 50% match
}

function displayTestStatistics(engine) {
  console.log('\n' + '='.repeat(80));
  console.log('📈 Overall Test Statistics');
  console.log('='.repeat(80));
  
  // Display tiered model selector stats
  if (engine.tieredModelSelector) {
    const tierStats = engine.tieredModelSelector.getTierStatistics();
    console.log('\n🎯 Model Tier Distribution:');
    for (const [tier, stats] of Object.entries(tierStats)) {
      console.log(`   ${tier}: ${stats.modelCount} models available, ${stats.currentUsage} in use`);
    }
    
    const assignmentSummary = engine.tieredModelSelector.getAssignmentSummary();
    console.log('\n📊 Model Assignment Summary:');
    console.log(`   Total Assignments: ${assignmentSummary.totalAssignments}`);
    console.log(`   Active Assignments: ${assignmentSummary.activeAssignments}`);
    console.log('   Tier Distribution:', assignmentSummary.tierDistribution);
  }
  
  // Display round transition manager stats
  if (engine.roundTransitionManager) {
    const roundStats = engine.roundTransitionManager.getRoundTransitionSummary();
    console.log('\n🔄 Round Management Statistics:');
    console.log(`   Total Rounds: ${roundStats.totalRounds}`);
    console.log(`   Current Phase: ${roundStats.currentPhase}`);
    console.log(`   Average Depth: ${roundStats.averageDepth.toFixed(2)}`);
    console.log('   Progress Metrics:', roundStats.progressMetrics);
  }
  
  // Display agent selector stats
  if (engine.dynamicAgentSelector && engine.activeAgents.size > 0) {
    const agents = Array.from(engine.activeAgents.values());
    const selectionSummary = engine.dynamicAgentSelector.getSelectionSummary(agents);
    console.log('\n🤖 Agent Selection Summary:');
    console.log(`   Agent Count: ${selectionSummary.count}`);
    console.log(`   Agent Types: ${selectionSummary.types.join(', ')}`);
    console.log(`   Capabilities: ${selectionSummary.capabilities.join(', ')}`);
    console.log(`   Model Tiers: ${selectionSummary.modelTiers.join(', ')}`);
  }
  
  console.log('\n✨ Enhanced Discussion System Test Complete!');
}

// Run the test
testEnhancedDiscussion().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});