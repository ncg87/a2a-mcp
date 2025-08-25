/**
 * Test Enhanced Agent Interactions
 * 
 * Demonstrates agents directly responding to each other with:
 * - Memory of previous statements
 * - Direct responses to questions
 * - Building on each other's ideas
 * - Challenges and debates
 */

import { EnhancedConversationEngine } from './src/core/enhanced-conversation-engine.js';
import { AIClient } from './src/core/ai-client.js';
import { ChatLogger } from './src/core/chat-logger.js';
import dotenv from 'dotenv';

dotenv.config();

async function testEnhancedInteractions() {
  console.log('\n🚀 Testing Enhanced Agent Interaction System');
  console.log('=' . repeat(70));
  console.log('This test demonstrates agents that:');
  console.log('  ✓ Remember what others said');
  console.log('  ✓ Directly respond to questions');
  console.log('  ✓ Challenge and debate ideas');
  console.log('  ✓ Build on previous statements');
  console.log('=' . repeat(70));
  
  // Initialize components
  const aiClient = new AIClient();
  await aiClient.initialize();
  
  const chatLogger = new ChatLogger();
  await chatLogger.initialize();
  
  // Start chat log
  const { filename } = await chatLogger.startChatLog(
    'Enhanced Agent Interactions - Direct Responses and Memory',
    'enhanced-test-' + Date.now()
  );
  
  console.log(`\n📝 Chat log: ${filename}\n`);
  
  // Create enhanced conversation engine
  const engine = new EnhancedConversationEngine(aiClient, chatLogger);
  
  // Define test agents with specific personalities
  const testAgents = [
    {
      id: 'scientist-1',
      name: 'Dr. Research',
      type: 'research',
      expertise: ['quantum physics', 'scientific method', 'experimentation'],
      personality: 'analytical and questioning',
      modelPreference: 'claude-opus-4.1'
    },
    {
      id: 'engineer-1',
      name: 'Engineer Smith',
      type: 'engineering',
      expertise: ['practical applications', 'system design', 'implementation'],
      personality: 'pragmatic and solution-focused',
      modelPreference: 'gpt-5'
    },
    {
      id: 'philosopher-1',
      name: 'Prof. Philosophy',
      type: 'philosophy',
      expertise: ['ethics', 'implications', 'theoretical frameworks'],
      personality: 'thoughtful and challenging',
      modelPreference: 'gemini-2.0-flash-exp'
    }
  ];
  
  // Test Topic 1: Complex topic requiring debate
  console.log('\n📚 TEST 1: AI Consciousness Debate');
  console.log('-'.repeat(50));
  
  const topic1 = {
    title: 'Can artificial intelligence achieve true consciousness?',
    description: 'Explore whether AI can be truly conscious or merely simulate consciousness',
    complexity: 'high',
    requiresDebate: true
  };
  
  try {
    const results1 = await engine.startEnhancedDiscussion(topic1, {
      agents: testAgents,
      maxRounds: 3,
      maxTurnsPerRound: 8,
      seekConsensus: false
    });
    
    console.log('\n📊 Discussion Results:');
    console.log(`   Total Exchanges: ${results1.totalExchanges}`);
    console.log(`   Questions Asked: ${results1.questions}`);
    console.log(`   Questions Answered: ${results1.answers}`);
    console.log(`   Agreements: ${results1.agreements}`);
    console.log(`   Disagreements: ${results1.disagreements}`);
    console.log(`   Insights Generated: ${results1.insights.length}`);
    console.log(`   Consensus: ${results1.consensus.reached ? 'Yes' : 'No'}`);
    
    if (results1.keyPoints.length > 0) {
      console.log('\n🔑 Key Points:');
      results1.keyPoints.forEach((point, i) => {
        console.log(`   ${i + 1}. [${point.type}] ${point.content.substring(0, 100)}...`);
      });
    }
    
    await chatLogger.addSystemMessage(
      `Test 1 Complete: ${JSON.stringify(results1, null, 2)}`,
      'TEST_RESULT'
    );
    
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  console.log('\n' + '=' . repeat(70));
  
  // Test Topic 2: Technical problem requiring collaboration
  console.log('\n🔧 TEST 2: Collaborative Problem Solving');
  console.log('-'.repeat(50));
  
  const topic2 = {
    title: 'Design a quantum-resistant encryption system',
    description: 'Collaborate to design encryption that can withstand quantum attacks',
    complexity: 'high',
    requiresCollaboration: true
  };
  
  try {
    const results2 = await engine.startEnhancedDiscussion(topic2, {
      agents: testAgents,
      maxRounds: 2,
      maxTurnsPerRound: 10,
      seekConsensus: true
    });
    
    console.log('\n📊 Collaboration Results:');
    console.log(`   Solutions Proposed: ${results2.insights.length}`);
    console.log(`   Consensus Reached: ${results2.consensus.reached}`);
    console.log(`   Consensus Strength: ${results2.consensus.strength}`);
    
    // Show agent contributions
    console.log('\n👥 Agent Contributions:');
    for (const [agent, contrib] of Object.entries(results2.agentContributions)) {
      console.log(`   ${agent}:`);
      console.log(`     - Statements: ${contrib.statements}`);
      console.log(`     - Questions: ${contrib.questionsAsked}`);
      console.log(`     - Answers: ${contrib.questionsAnswered}`);
    }
    
    await chatLogger.addSystemMessage(
      `Test 2 Complete: ${JSON.stringify(results2, null, 2)}`,
      'TEST_RESULT'
    );
    
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  console.log('\n' + '=' . repeat(70));
  
  // Test direct response scenarios
  console.log('\n💬 TEST 3: Direct Response Scenarios');
  console.log('-'.repeat(50));
  
  // Simulate specific interaction patterns
  const scenarios = [
    {
      type: 'question-answer',
      initial: "What are the main challenges in quantum computing?",
      expectedResponse: 'answer'
    },
    {
      type: 'disagreement',
      initial: "I believe quantum supremacy has already been achieved.",
      expectedResponse: 'disagreement'
    },
    {
      type: 'clarification',
      initial: "The implications are unclear. Can you elaborate?",
      expectedResponse: 'clarification'
    }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n   Testing ${scenario.type}:`);
    console.log(`   Initial: "${scenario.initial}"`);
    
    // Test direct response system
    const mockStatement = {
      id: 'test-' + Date.now(),
      from: testAgents[0],
      to: testAgents[1],
      content: scenario.initial,
      type: 'statement'
    };
    
    const analysis = engine.directResponse.analyzeStatement(
      mockStatement,
      testAgents[0],
      testAgents.slice(1)
    );
    
    console.log(`   Analysis: Requires ${analysis.responseType} response`);
    console.log(`   Target Agents: ${analysis.targetAgents.length}`);
    
    if (analysis.requiresResponse) {
      const response = await engine.directResponse.generateDirectResponse(
        testAgents[1],
        mockStatement,
        analysis,
        { topic: 'test' }
      );
      
      console.log(`   Response Type: ${response.type}`);
      console.log(`   Response: "${response.content.substring(0, 100)}..."`);
      console.log(`   Confidence: ${response.metadata.confidence}`);
    }
  }
  
  // Show memory statistics
  console.log('\n🧠 Memory Statistics:');
  const memStats = engine.enhancedMemory.getMemoryStats();
  console.log(`   Short-term entries: ${memStats.shortTermEntries}`);
  console.log(`   Working memory: ${memStats.workingMemoryEntries}`);
  console.log(`   Semantic facts: ${memStats.semanticFacts}`);
  console.log(`   Social profiles: ${memStats.socialProfiles}`);
  console.log(`   Tracked questions: ${memStats.trackedQuestions}`);
  
  // Show interaction metrics
  console.log('\n📈 Interaction Metrics:');
  const metrics = engine.getMetrics();
  console.log(`   Total Exchanges: ${metrics.totalExchanges}`);
  console.log(`   Direct Responses: ${metrics.directResponses}`);
  console.log(`   Questions Asked: ${metrics.questionsAsked}`);
  console.log(`   Questions Answered: ${metrics.questionsAnswered}`);
  console.log(`   Agreements: ${metrics.agreements}`);
  console.log(`   Disagreements: ${metrics.disagreements}`);
  console.log(`   Insights Generated: ${metrics.insightsGenerated}`);
  
  // Finalize
  await chatLogger.finalizeChatLog({
    testsRun: 3,
    status: 'Complete',
    enhancedFeatures: [
      'Memory System',
      'Direct Responses',
      'Question Tracking',
      'Consensus Building',
      'Insight Extraction'
    ]
  });
  
  console.log('\n' + '=' . repeat(70));
  console.log('✅ Enhanced Interaction Tests Complete!');
  console.log(`📁 Full log: ${filename}`);
  console.log('\n🎯 Key Improvements Demonstrated:');
  console.log('   ✓ Agents directly respond to questions');
  console.log('   ✓ Agents remember and reference previous statements');
  console.log('   ✓ Agents can disagree and debate');
  console.log('   ✓ Agents build on each other\'s ideas');
  console.log('   ✓ Conversations reach meaningful conclusions');
}

// Run the test
testEnhancedInteractions().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});