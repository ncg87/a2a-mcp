#!/usr/bin/env node

/**
 * Simple test runner for MCP Server Architecture
 * Tests the new essential vs specialized server system
 */

import { MCPClient } from './src/core/mcp-client.js';
import { ExternalMCPRegistry } from './src/core/external-mcp-registry.js';
import logger from './src/utils/logger.js';

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.mcpClient = null;
    this.mcpRegistry = null;
  }

  assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      this.passed++;
    } else {
      console.log(`❌ FAIL: ${message}`);
      this.failed++;
    }
  }

  async setUp() {
    console.log('🚀 Setting up MCP Architecture Test...\n');
    
    this.mcpRegistry = new ExternalMCPRegistry();
    await this.mcpRegistry.initialize();
    
    this.mcpClient = new MCPClient(this.mcpRegistry);
  }

  async testEssentialServers() {
    console.log('📋 Testing Essential Server Architecture...');
    
    // Test essential server identification
    const essentialServers = [
      'playwright-mcp',
      'sequential-thinking-mcp', 
      'memory-mcp',
      'filesystem-mcp'
    ];
    
    essentialServers.forEach(serverId => {
      const server = this.mcpRegistry.getServerById(serverId);
      this.assert(server !== undefined, `Essential server ${serverId} found in registry`);
      this.assert(typeof server.name === 'string', `Server ${serverId} has valid name`);
      this.assert(Array.isArray(server.capabilities), `Server ${serverId} has capabilities array`);
      this.assert(Array.isArray(server.tools), `Server ${serverId} has tools array`);
    });

    // Test initialization connects to essential servers
    await this.mcpClient.initialize();
    
    const connectedServers = this.mcpClient.getConnectedServers();
    this.assert(this.mcpClient.initialized === true, 'MCP Client initialized successfully');
    this.assert(connectedServers.length >= 4, 'At least 4 essential servers connected');
    
    console.log(`   Connected to ${connectedServers.length} servers\n`);
  }

  async testSpecializedServerSelection() {
    console.log('🎯 Testing Specialized Server Selection...');
    
    // Test developer agent servers
    const devServers = this.mcpClient.selectSpecializedServers('developer', ['code-generation']);
    this.assert(devServers.includes('code-execution-mcp'), 'Developer gets code execution server');
    this.assert(devServers.includes('github-mcp'), 'Developer gets GitHub server');
    
    // Test research agent servers
    const researchServers = this.mcpClient.selectSpecializedServers('research', ['academic-research']);
    this.assert(researchServers.includes('arxiv-mcp'), 'Research agent gets arXiv server');
    this.assert(researchServers.includes('wikipedia-mcp'), 'Research agent gets Wikipedia server');
    
    // Test data science agent servers
    const dataServers = this.mcpClient.selectSpecializedServers('data-scientist', ['data-analysis']);
    this.assert(dataServers.includes('kaggle-mcp'), 'Data scientist gets Kaggle server');
    this.assert(dataServers.includes('wolfram-alpha-mcp'), 'Data scientist gets Wolfram Alpha server');
    
    // Test unknown agent type handling
    const unknownServers = this.mcpClient.selectSpecializedServers('unknown-agent-type');
    this.assert(Array.isArray(unknownServers), 'Unknown agent type returns array');
    this.assert(unknownServers.length === 0, 'Unknown agent type gets no specialized servers');
    
    console.log('');
  }

  async testServerConnectionTesting() {
    console.log('🔗 Testing Server Connection Testing...');
    
    // Test server connection testing
    const testResult = await this.mcpClient.testServerConnection('playwright-mcp');
    this.assert(typeof testResult === 'boolean', 'Server test returns boolean result');
    
    // Test non-existent server
    const failResult = await this.mcpClient.testServerConnection('non-existent-server');
    this.assert(failResult === false, 'Non-existent server test returns false');
    
    console.log('');
  }

  async testRealToolExecution() {
    console.log('⚡ Testing Real Tool Execution...');
    
    try {
      // Test sequential thinking (should always work)
      const thinkingResult = await this.mcpClient.sequentialThinking('How to test MCP architecture');
      this.assert(thinkingResult.success === true, 'Sequential thinking tool executed successfully');
      this.assert(typeof thinkingResult.problem === 'string', 'Thinking result contains problem');
      this.assert(Array.isArray(thinkingResult.thinking.steps), 'Thinking result contains steps array');
      
      // Test memory operations
      const testKey = 'test-memory-' + Date.now();
      const testData = { topic: 'MCP Architecture Test', timestamp: Date.now() };
      
      const storeResult = await this.mcpClient.storeMemory(testKey, testData);
      this.assert(storeResult.success === true, 'Memory storage executed successfully');
      
      const retrieveResult = await this.mcpClient.retrieveMemory('MCP Architecture');
      this.assert(retrieveResult.success === true, 'Memory retrieval executed successfully');
      this.assert(Array.isArray(retrieveResult.results), 'Memory retrieval returns results array');
      
    } catch (error) {
      this.assert(false, `Tool execution failed: ${error.message}`);
    }
    
    console.log('');
  }

  async testAgentCapabilityInference() {
    console.log('🧠 Testing Agent Capability Inference...');
    
    // Test web research capabilities
    const webResearchServers = this.mcpClient.selectSpecializedServers('research', ['web-research']);
    this.assert(webResearchServers.includes('news-api-mcp'), 'Web research gets news API server');
    this.assert(webResearchServers.includes('wikipedia-mcp'), 'Web research gets Wikipedia server');
    
    // Test social media capabilities
    const socialServers = this.mcpClient.selectSpecializedServers('social-specialist', ['social-media']);
    this.assert(socialServers.includes('discord-mcp'), 'Social specialist gets Discord server');
    this.assert(socialServers.includes('youtube-mcp'), 'Social specialist gets YouTube server');
    
    // Test combined capabilities
    const combinedServers = this.mcpClient.selectSpecializedServers('developer', ['code-generation', 'data-analysis']);
    this.assert(combinedServers.includes('code-execution-mcp'), 'Combined capabilities include code execution');
    this.assert(combinedServers.includes('kaggle-mcp'), 'Combined capabilities include data analysis servers');
    
    console.log('');
  }

  async testErrorHandling() {
    console.log('🛡️  Testing Error Handling and Resilience...');
    
    try {
      // Test missing server
      await this.mcpClient.invokeTool('non-existent-server', 'some-tool', {});
      this.assert(false, 'Should have thrown error for missing server');
    } catch (error) {
      this.assert(error.message.includes('not connected'), 'Correct error for missing server');
    }
    
    try {
      // Test missing tool
      await this.mcpClient.invokeTool('playwright-mcp', 'non-existent-tool', {});
      this.assert(false, 'Should have thrown error for missing tool');
    } catch (error) {
      this.assert(error.message.includes('not available'), 'Correct error for missing tool');
    }
    
    // Test fallback to simulation
    const fallbackResult = await this.mcpClient.invokeTool('playwright-mcp', 'browse-web', {
      url: 'invalid-url-that-will-fail'
    });
    this.assert(fallbackResult !== undefined, 'Fallback simulation provides result');
    this.assert(fallbackResult.success === true, 'Fallback simulation indicates success');
    
    console.log('');
  }

  async testPerformance() {
    console.log('⚡ Testing Performance and Scalability...');
    
    // Test concurrent tool invocations
    const promises = [
      this.mcpClient.sequentialThinking('Problem 1'),
      this.mcpClient.sequentialThinking('Problem 2'),
      this.mcpClient.sequentialThinking('Problem 3')
    ];
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    this.assert(results.length === 3, 'All concurrent operations completed');
    results.forEach((result, index) => {
      this.assert(result.success === true, `Concurrent operation ${index + 1} succeeded`);
    });
    
    this.assert(endTime - startTime < 5000, 'Concurrent operations completed within 5 seconds');
    
    // Test tool cache efficiency
    const tools1 = this.mcpClient.getAvailableTools();
    const tools2 = this.mcpClient.getAvailableTools();
    this.assert(JSON.stringify(tools1) === JSON.stringify(tools2), 'Tool cache is consistent');
    
    console.log('');
  }

  async tearDown() {
    if (this.mcpClient) {
      await this.mcpClient.disconnect();
    }
  }

  async runAll() {
    try {
      await this.setUp();
      
      await this.testEssentialServers();
      await this.testSpecializedServerSelection();
      await this.testServerConnectionTesting();
      await this.testRealToolExecution();
      await this.testAgentCapabilityInference();
      await this.testErrorHandling();
      await this.testPerformance();
      
      await this.tearDown();
      
      console.log('=====================================');
      console.log('🎯 MCP ARCHITECTURE TEST RESULTS');
      console.log('=====================================');
      console.log(`✅ Passed: ${this.passed}`);
      console.log(`❌ Failed: ${this.failed}`);
      console.log(`📊 Total:  ${this.passed + this.failed}`);
      
      if (this.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! MCP Architecture is working correctly.');
        process.exit(0);
      } else {
        console.log(`\n⚠️  ${this.failed} test(s) failed. Please check the implementation.`);
        process.exit(1);
      }
      
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    }
  }
}

// Run the tests
const testRunner = new TestRunner();
testRunner.runAll();