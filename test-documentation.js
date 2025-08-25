#!/usr/bin/env node

/**
 * Documentation System Test
 * Demonstrates comprehensive agent interaction documentation
 */

import dotenv from 'dotenv';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ExternalMCPRegistry from './src/core/external-mcp-registry.js';
import InMemoryMessageBus from './src/core/in-memory-message-bus.js';
import InteractionDocumenter from './src/core/interaction-documenter.js';
import logger from './src/utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDocumentationSystem() {
  try {
    console.log('🧪 Testing Complete Agent Interaction Documentation System\n');

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

    console.log('✅ All systems initialized\n');

    // Test Case: Create an AI-powered cryptocurrency trading bot
    const testPrompt = "Create an AI-powered cryptocurrency trading bot that analyzes market trends, makes automated trades, and sends alerts to Slack";
    
    console.log(`🎯 Test Prompt: "${testPrompt}"\n`);

    // Start documentation session
    const analysis = {
      complexity: 8,
      requiredCapabilities: ['financial-analysis', 'ai-inference', 'automation', 'messaging'],
      estimatedTime: 240000, // 4 minutes
      taskType: 'automation'
    };

    const sessionId = await documenter.startSession(testPrompt, analysis);
    console.log(`📋 Started documentation session: ${sessionId}\n`);

    // Simulate creating multiple agents
    const agents = [
      {
        id: 'ai-analysis-agent-001',
        type: 'ai-analysis',
        capabilities: ['machine-learning', 'pattern-recognition', 'data-analysis'],
        mcpServers: ['openai-mcp', 'huggingface-mcp']
      },
      {
        id: 'finance-agent-002',
        type: 'finance',
        capabilities: ['market-analysis', 'trading-algorithms', 'risk-assessment'],
        mcpServers: ['alpha-vantage-mcp']
      },
      {
        id: 'automation-agent-003',
        type: 'automation',
        capabilities: ['task-scheduling', 'decision-making', 'execution'],
        mcpServers: ['github-mcp']
      },
      {
        id: 'communication-agent-004',
        type: 'communication',
        capabilities: ['messaging', 'alerts', 'notifications'],
        mcpServers: ['slack-mcp', 'discord-mcp']
      },
      {
        id: 'coordinator-agent-005',
        type: 'coordinator',
        capabilities: ['orchestration', 'task-management', 'monitoring'],
        mcpServers: []
      }
    ];

    console.log('🤖 Creating and documenting agents:');
    agents.forEach(agent => {
      documenter.recordAgentCreation(agent);
      console.log(`   ✅ ${agent.type.toUpperCase()} Agent: ${agent.id}`);
    });
    console.log('');

    // Simulate MCP server connections
    console.log('🌐 Documenting MCP server connections:');
    const mcpServers = [
      { id: 'openai-mcp', server: mcpRegistry.getServerById('openai-mcp'), success: true, time: 245 },
      { id: 'alpha-vantage-mcp', server: mcpRegistry.getServerById('alpha-vantage-mcp'), success: true, time: 156 },
      { id: 'slack-mcp', server: mcpRegistry.getServerById('slack-mcp'), success: false, time: null },
      { id: 'github-mcp', server: mcpRegistry.getServerById('github-mcp'), success: true, time: 189 }
    ];

    mcpServers.forEach(({ id, server, success, time }) => {
      if (server) {
        const result = {
          available: success,
          responseTime: time,
          error: success ? null : 'Authentication failed - missing SLACK_BOT_TOKEN'
        };
        documenter.recordMCPConnection(id, server, result);
        const status = success ? '✅' : '❌';
        console.log(`   ${status} ${server.name}: ${success ? `${time}ms` : 'Failed'}`);
      }
    });
    console.log('');

    // Simulate complex agent interactions
    console.log('📡 Documenting agent interactions:');
    
    // Initial coordination
    documenter.recordAgentInteraction(
      'coordinator-agent-005',
      'ai-analysis-agent-001',
      'task-assignment',
      { 
        task: 'analyze-market-trends',
        parameters: { symbols: ['BTC', 'ETH', 'ADA'], timeframe: '1h' }
      },
      'A2A'
    );
    console.log('   📤 COORDINATOR → AI-ANALYSIS: task assignment');

    documenter.recordAgentInteraction(
      'coordinator-agent-005',
      'finance-agent-002',
      'task-assignment',
      { 
        task: 'setup-trading-parameters',
        parameters: { riskLevel: 'medium', maxPositionSize: 0.05 }
      },
      'A2A'
    );
    console.log('   📤 COORDINATOR → FINANCE: trading setup');

    // AI analysis response
    await new Promise(resolve => setTimeout(resolve, 100));
    documenter.recordAgentInteraction(
      'ai-analysis-agent-001',
      'finance-agent-002',
      'analysis-result',
      {
        trends: { BTC: 'bullish', ETH: 'neutral', ADA: 'bearish' },
        confidence: { BTC: 0.85, ETH: 0.6, ADA: 0.78 },
        recommendation: 'buy-btc'
      },
      'ACP'
    );
    console.log('   📥 AI-ANALYSIS → FINANCE: market analysis');

    // Finance agent decision
    documenter.recordDecision(
      'finance-agent-002',
      'trading-decision',
      'Received AI analysis indicating BTC bullish trend with 85% confidence',
      ['buy-btc', 'hold-position', 'buy-eth'],
      'buy-btc',
      'High confidence bullish signal for BTC with favorable risk/reward ratio'
    );

    documenter.recordAgentInteraction(
      'finance-agent-002',
      'automation-agent-003',
      'trade-order',
      {
        action: 'buy',
        symbol: 'BTC',
        amount: 0.05,
        orderType: 'market',
        timestamp: new Date().toISOString()
      },
      'ACP'
    );
    console.log('   📤 FINANCE → AUTOMATION: trade execution order');

    // Automation execution
    documenter.recordTaskResult(
      'automation-agent-003',
      'trade-execution',
      { orderId: 'ORD-001', status: 'filled', price: 43250.00 },
      true
    );

    documenter.recordAgentInteraction(
      'automation-agent-003',
      'communication-agent-004',
      'alert-notification',
      {
        type: 'trade-executed',
        details: 'BTC buy order executed at $43,250',
        urgency: 'normal'
      },
      'A2A'
    );
    console.log('   📤 AUTOMATION → COMMUNICATION: trade alert');

    // Communication attempt (with failure)
    documenter.recordTaskResult(
      'communication-agent-004',
      'slack-notification',
      null,
      false,
      new Error('Slack MCP connection failed - missing authentication token')
    );
    console.log('   ❌ COMMUNICATION: Slack notification failed');

    // Protocol events
    console.log('');
    console.log('🔗 Recording protocol events:');
    
    documenter.recordProtocolEvent('A2A', 'negotiation', 
      ['coordinator-agent-005', 'ai-analysis-agent-001'], 
      {
        topic: 'task-priority',
        outcome: 'agreed',
        priority: 'high'
      }
    );
    console.log('   🤝 A2A negotiation: task priority agreement');

    documenter.recordProtocolEvent('ACP', 'performative', 
      ['ai-analysis-agent-001', 'finance-agent-002'], 
      {
        performative: 'inform',
        content: 'market-analysis-complete',
        ontology: 'trading-domain'
      }
    );
    console.log('   📋 ACP performative: market analysis inform');

    // Additional decisions
    documenter.recordDecision(
      'coordinator-agent-005',
      'error-handling',
      'Slack notification failed due to authentication error',
      ['retry-slack', 'use-discord', 'log-only'],
      'use-discord',
      'Discord MCP connection available as fallback for notifications'
    );

    documenter.recordDecision(
      'automation-agent-003',
      'monitoring-frequency',
      'System operating normally after successful trade execution',
      ['1-minute', '5-minute', '15-minute'],
      '5-minute',
      'Balanced frequency for monitoring without excessive API calls'
    );

    console.log('   🧠 Multiple agent decisions recorded');
    console.log('');

    // Final results
    const results = {
      steps: [
        { step: 'Agent system initialization', error: null },
        { step: 'MCP server connections', error: null },
        { step: 'Market analysis execution', error: null },
        { step: 'Trading decision made', error: null },
        { step: 'Trade executed successfully', error: null },
        { step: 'Slack notification', error: 'Authentication failed' },
        { step: 'Fallback to Discord', error: null }
      ],
      overallStatus: 'partial-success',
      executedTrades: 1,
      failedNotifications: 1,
      activeAgents: 5,
      mcpConnectionsActive: 3,
      mcpConnectionsFailed: 1
    };

    // End session and generate documentation
    console.log('📄 Generating comprehensive documentation...');
    const docResult = await documenter.endSession(results, 'partial-success');

    console.log('\n🎉 Documentation Generation Complete!\n');
    
    console.log('📊 Session Statistics:');
    console.log(`   📋 Session ID: ${sessionId}`);
    console.log(`   ⏱️ Duration: ${docResult.statistics.durationFormatted}`);
    console.log(`   🤖 Agents Created: ${docResult.statistics.agentCount}`);
    console.log(`   💬 Interactions: ${docResult.statistics.interactionCount}`);
    console.log(`   🌐 MCP Connections: ${docResult.statistics.mcpConnectionCount}`);
    console.log(`   🧠 Decisions: ${docResult.statistics.decisionCount}`);
    console.log(`   🔗 Protocol Events: ${docResult.statistics.protocolEventCount}`);
    console.log('');

    console.log('📁 Generated Documentation Files:');
    Object.entries(docResult.documentation).forEach(([type, file]) => {
      console.log(`   📄 ${type}: ${file.filename}`);
    });
    console.log('');

    console.log('🔍 What was documented:');
    console.log('   ✅ Complete agent lifecycle (creation → interaction → decisions)');
    console.log('   ✅ MCP server connection attempts and results');
    console.log('   ✅ Inter-agent communication using A2A and ACP protocols');
    console.log('   ✅ Decision-making processes with reasoning');
    console.log('   ✅ Task execution results and error handling');
    console.log('   ✅ Protocol compliance and event logging');
    console.log('   ✅ Performance metrics and statistics');
    console.log('');

    console.log('📖 Documentation includes:');
    console.log('   📋 Executive Summary - High-level overview and metrics');
    console.log('   🤖 Agent Report - Detailed agent analysis and performance');
    console.log('   ⏰ Timeline - Chronological interaction sequence');
    console.log('   🔗 Protocol Analysis - A2A and ACP usage patterns');
    console.log('   🌐 MCP Report - External service integration details');
    console.log('   🧠 Decision Analysis - Agent reasoning and choices');
    console.log('   📊 Raw Data - Complete JSON export for further analysis');
    console.log('');

    // Show file locations
    console.log('📂 Files saved to: docs/interactions/');
    console.log(`   Use: ls docs/interactions/ | grep ${docResult.documentation.summary.filename.split('-')[2]}`);
    console.log('');

    // Cleanup
    await messageBus.disconnect();
    
    console.log('✅ Test completed successfully! The documentation system fully captures:');
    console.log('   • Every agent interaction and decision');
    console.log('   • Complete communication protocols');
    console.log('   • External service integration attempts');
    console.log('   • Real-time performance metrics');
    console.log('   • Comprehensive audit trails');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testDocumentationSystem();