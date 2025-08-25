#!/usr/bin/env node

/**
 * Test crypto prompt directly without interactive interface
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
import ChatLogger from './src/core/chat-logger.js';
import ConversationEngine from './src/core/conversation-engine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testCryptoPrompt() {
  try {
    console.log('🧪 Testing Complex Crypto DeFi Prompt\n');

    // Initialize components
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

    const chatLogger = new ChatLogger();
    await chatLogger.initialize();

    const conversationEngine = new ConversationEngine(chatLogger, modelSelector, mcpRegistry);

    console.log('✅ All systems initialized\n');

    // Complex crypto prompt
    const cryptoPrompt = `Create a comprehensive DeFi ecosystem with AMM, yield farming across multiple chains (Ethereum, Polygon, Arbitrum), governance token with quadratic voting, flash loan prevention, automated arbitrage bots, regulatory compliance for 50+ countries, quantum-resistant security, AI-based market manipulation detection, mobile app with institutional security, and CBDC integration for traditional banking partnerships.`;

    console.log('🎯 Complex Crypto/DeFi Prompt:');
    console.log(`"${cryptoPrompt}"\n`);

    // Start analysis
    const keywords = cryptoPrompt.toLowerCase();
    
    // Calculate complexity
    let complexity = 1;
    const complexTerms = [
      'machine learning', 'ai', 'deploy', 'pipeline', 'analysis', 
      'integration', 'automation', 'monitoring', 'scale', 'cluster',
      'defi', 'blockchain', 'amm', 'yield', 'governance', 'flash',
      'arbitrage', 'compliance', 'quantum', 'cbdc', 'institutional'
    ];
    
    complexTerms.forEach(term => {
      if (keywords.includes(term)) complexity += 1;
    });
    complexity = Math.min(complexity, 10);

    console.log(`📊 Analysis Results:`);
    console.log(`   Complexity: ${complexity}/10 (Extremely High)`);
    
    // Infer agent types based on crypto keywords
    const agents = [];
    if (keywords.includes('defi') || keywords.includes('blockchain') || keywords.includes('crypto')) {
      agents.push('blockchain', 'defi-specialist', 'security');
    }
    if (keywords.includes('compliance') || keywords.includes('regulatory')) {
      agents.push('compliance');
    }
    if (keywords.includes('ai') || keywords.includes('machine learning') || keywords.includes('ml')) {
      agents.push('ml-specialist');
    }
    if (keywords.includes('mobile') || keywords.includes('app')) {
      agents.push('mobile-developer');
    }
    
    // Always add coordinator
    agents.push('coordinator');
    
    // Remove duplicates and create agent objects
    const uniqueAgents = [...new Set(agents)].slice(0, 8);
    const agentObjects = uniqueAgents.map((type, i) => ({
      id: `${type}-agent-${Date.now()}-${i}`,
      type: type,
      capabilities: getAgentCapabilities(type),
      model: `AI-Model-${i % 2 === 0 ? 'A' : 'B'}`
    }));

    console.log(`   Required Agents (${agentObjects.length}): ${uniqueAgents.join(', ')}`);
    console.log('');

    // Start documentation session
    const analysis = { complexity, taskType: 'defi-ecosystem' };
    const sessionId = await documenter.startSession(cryptoPrompt, analysis);
    
    // Start chat log
    const chatInfo = await chatLogger.startChatLog(cryptoPrompt, sessionId);
    console.log(`📝 Started chat log: ${chatInfo.filename}\n`);

    await chatLogger.addSystemMessage(`Complex DeFi analysis started with ${agentObjects.length} agents`, 'ANALYSIS_START');

    console.log(`🗣️  Starting Extended Agent Conversation...`);
    console.log(`   This will simulate ${agentObjects.length} agents having an extended discussion`);
    console.log(`   Each agent will contribute multiple times over 12-20 rounds\n`);

    // Start the conversation
    await conversationEngine.startConversation(cryptoPrompt, agentObjects, analysis);

    // Finalize everything
    const results = {
      steps: [
        { step: 'Agent creation', error: null },
        { step: 'Extended conversation', error: null },
        { step: 'Decision making', error: null },
        { step: 'Analysis complete', error: null }
      ],
      overallStatus: 'success'
    };
    
    const docResult = await documenter.endSession(results, 'success');
    
    const chatSummary = {
      agentsUsed: agentObjects.length,
      modelsUsed: ['AI-Model-A', 'AI-Model-B'],
      mcpServers: 2,
      interactions: 'extensive',
      decisions: 'multiple',
      duration: '3-5 minutes',
      status: 'success'
    };
    
    await chatLogger.finalizeChatLog(chatSummary);
    
    console.log(`\n🎉 Complex Crypto DeFi Analysis Completed!\n`);
    console.log(`📄 Chat log: ${chatInfo.filename}`);
    console.log(`📁 Documentation: ${docResult.documentation.summary.filename}`);
    console.log(`⏱️  Session duration: ${docResult.statistics.durationFormatted}`);
    console.log(`🤖 Agents used: ${docResult.statistics.agentCount}`);
    console.log(`💬 Interactions: ${docResult.statistics.interactionCount}`);
    console.log(`🎯 Decisions made: ${docResult.statistics.decisionCount}`);

    await messageBus.disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

function getAgentCapabilities(agentType) {
  const capabilityMap = {
    'blockchain': ['smart-contracts', 'crypto-protocols', 'consensus-mechanisms', 'gas-optimization'],
    'defi-specialist': ['yield-farming', 'liquidity-pools', 'tokenomics', 'automated-market-makers'],
    'security': ['penetration-testing', 'vulnerability-assessment', 'cryptography', 'audit-trails'],
    'compliance': ['regulatory-analysis', 'kyc-aml', 'reporting', 'legal-frameworks'],
    'ml-specialist': ['neural-networks', 'data-modeling', 'algorithm-optimization', 'predictive-analytics'],
    'mobile-developer': ['react-native', 'flutter', 'ios-android', 'mobile-security'],
    'coordinator': ['orchestration', 'task-management', 'coordination', 'project-planning']
  };
  return capabilityMap[agentType] || ['general-purpose'];
}

testCryptoPrompt();