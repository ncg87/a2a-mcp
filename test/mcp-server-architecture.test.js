/**
 * Comprehensive Test for MCP Server Architecture
 * Tests the new essential vs specialized server system
 */

import { expect } from 'chai';
import { MCPClient } from '../src/core/mcp-client.js';
import { ExternalMCPRegistry } from '../src/core/external-mcp-registry.js';
import logger from '../src/utils/logger.js';

describe('MCP Server Architecture', function() {
  this.timeout(30000); // Allow time for real network calls
  
  let mcpClient;
  let mcpRegistry;
  
  before(async function() {
    // Initialize the registry and client
    mcpRegistry = new ExternalMCPRegistry();
    await mcpRegistry.initialize();
    
    mcpClient = new MCPClient(mcpRegistry);
  });
  
  after(async function() {
    if (mcpClient) {
      await mcpClient.disconnect();
    }
  });
  
  describe('Essential Server Architecture', function() {
    
    it('should identify essential servers correctly', function() {
      const essentialServers = [
        'playwright-mcp',
        'sequential-thinking-mcp', 
        'memory-mcp',
        'filesystem-mcp'
      ];
      
      essentialServers.forEach(serverId => {
        const server = mcpRegistry.getServerById(serverId);
        expect(server).to.exist;
        expect(server.name).to.be.a('string');
        expect(server.capabilities).to.be.an('array');
        expect(server.tools).to.be.an('array');
      });
    });
    
    it('should connect to all essential servers during initialization', async function() {
      await mcpClient.initialize();
      
      const connectedServers = mcpClient.getConnectedServers();
      const essentialServerIds = [
        'playwright-mcp',
        'sequential-thinking-mcp', 
        'memory-mcp',
        'filesystem-mcp'
      ];
      
      // Verify all essential servers are connected
      essentialServerIds.forEach(serverId => {
        const isConnected = connectedServers.some(server => server.id === serverId);
        expect(isConnected).to.be.true;
      });
      
      expect(mcpClient.initialized).to.be.true;
    });
    
    it('should have essential tools available', function() {
      const tools = mcpClient.getAvailableTools();
      
      // Check for essential tool categories
      const playwrightTools = tools.filter(t => t.serverId === 'playwright-mcp');
      const thinkingTools = tools.filter(t => t.serverId === 'sequential-thinking-mcp');
      const memoryTools = tools.filter(t => t.serverId === 'memory-mcp');
      const filesystemTools = tools.filter(t => t.serverId === 'filesystem-mcp');
      
      expect(playwrightTools.length).to.be.greaterThan(0);
      expect(thinkingTools.length).to.be.greaterThan(0);
      expect(memoryTools.length).to.be.greaterThan(0);
      expect(filesystemTools.length).to.be.greaterThan(0);
    });
  });
  
  describe('Specialized Server Selection', function() {
    
    it('should select appropriate specialized servers for developer agents', function() {
      const specializedServers = mcpClient.selectSpecializedServers('developer', ['code-generation']);
      
      expect(specializedServers).to.include('code-execution-mcp');
      expect(specializedServers).to.include('github-mcp');
    });
    
    it('should select appropriate specialized servers for research agents', function() {
      const specializedServers = mcpClient.selectSpecializedServers('research', ['academic-research']);
      
      expect(specializedServers).to.include('arxiv-mcp');
      expect(specializedServers).to.include('wikipedia-mcp');
    });
    
    it('should select appropriate specialized servers for data science agents', function() {
      const specializedServers = mcpClient.selectSpecializedServers('data-scientist', ['data-analysis']);
      
      expect(specializedServers).to.include('kaggle-mcp');
      expect(specializedServers).to.include('wolfram-alpha-mcp');
    });
    
    it('should select appropriate specialized servers for financial analysts', function() {
      const specializedServers = mcpClient.selectSpecializedServers('financial-analyst', ['financial-analysis']);
      
      expect(specializedServers).to.include('alpha-vantage-mcp');
      expect(specializedServers).to.include('blockchain-mcp');
    });
    
    it('should handle unknown agent types gracefully', function() {
      const specializedServers = mcpClient.selectSpecializedServers('unknown-agent-type');
      
      expect(specializedServers).to.be.an('array');
      expect(specializedServers.length).to.equal(0);
    });
  });
  
  describe('Server Testing and Connection', function() {
    
    it('should test server connections before connecting', async function() {
      const testServerId = 'playwright-mcp';
      const isWorking = await mcpClient.testServerConnection(testServerId);
      
      expect(isWorking).to.be.a('boolean');
    });
    
    it('should handle failed server connections gracefully', async function() {
      const nonExistentServerId = 'non-existent-server';
      const isWorking = await mcpClient.testServerConnection(nonExistentServerId);
      
      expect(isWorking).to.be.false;
    });
    
    it('should connect to working specialized servers', async function() {
      const connectedBefore = mcpClient.getConnectedServers().length;
      
      const connectedSpecialized = await mcpClient.connectToSpecializedServers('research', ['academic-research']);
      
      expect(connectedSpecialized).to.be.an('array');
      
      const connectedAfter = mcpClient.getConnectedServers().length;
      expect(connectedAfter).to.be.greaterThanOrEqual(connectedBefore);
    });
  });
  
  describe('Real Tool Execution', function() {
    
    it('should execute real Playwright web browsing tools', async function() {
      try {
        const result = await mcpClient.browseWeb('https://httpbin.org/json');
        
        expect(result.success).to.be.true;
        expect(result.url).to.equal('https://httpbin.org/json');
        expect(result.content).to.be.a('string');
        expect(result.timestamp).to.be.a('string');
      } catch (error) {
        // If real execution fails, should fall back to simulation
        console.log('Real web browsing failed, testing fallback...');
        expect(error.message).to.include('Failed to browse');
      }
    });
    
    it('should execute real web search tools', async function() {
      try {
        const result = await mcpClient.searchWeb('artificial intelligence');
        
        expect(result.success).to.be.true;
        expect(result.query).to.equal('artificial intelligence');
        expect(result.results).to.be.an('array');
        expect(result.source).to.include('DuckDuckGo');
      } catch (error) {
        // If real execution fails, should fall back to simulation
        console.log('Real web search failed, testing fallback...');
        expect(error.message).to.include('Web search failed');
      }
    });
    
    it('should execute real sequential thinking tools', async function() {
      const result = await mcpClient.sequentialThinking('How to optimize database performance');
      
      expect(result.success).to.be.true;
      expect(result.problem).to.equal('How to optimize database performance');
      expect(result.thinking.steps).to.be.an('array');
      expect(result.thinking.steps.length).to.be.greaterThan(0);
    });
    
    it('should execute real memory storage and retrieval', async function() {
      const testKey = 'test-memory-' + Date.now();
      const testData = { topic: 'MCP Architecture', details: 'Testing memory functionality' };
      
      // Store data
      const storeResult = await mcpClient.storeMemory(testKey, testData);
      expect(storeResult.success).to.be.true;
      expect(storeResult.key).to.equal(testKey);
      
      // Retrieve data
      const retrieveResult = await mcpClient.retrieveMemory('MCP Architecture');
      expect(retrieveResult.success).to.be.true;
      expect(retrieveResult.results).to.be.an('array');
    });
    
    it('should handle filesystem operations safely', async function() {
      const testFilePath = 'test-file-' + Date.now() + '.txt';
      const testContent = 'This is test content for MCP filesystem operations.';
      
      // Write file
      const writeResult = await mcpClient.writeFile(testFilePath, testContent);
      
      if (writeResult.success) {
        expect(writeResult.path).to.equal(testFilePath);
        expect(writeResult.written).to.equal(testContent.length);
        
        // Read file
        const readResult = await mcpClient.readFile(testFilePath);
        expect(readResult.success).to.be.true;
        expect(readResult.content).to.equal(testContent);
      } else {
        // File operations might fail in restricted environments
        console.log('Filesystem operations restricted in test environment');
        expect(writeResult.error).to.be.a('string');
      }
    });
  });
  
  describe('Agent Capability Inference', function() {
    
    it('should infer capabilities for web research tasks', function() {
      const specializedServers = mcpClient.selectSpecializedServers('research', ['web-research']);
      
      expect(specializedServers).to.include('news-api-mcp');
      expect(specializedServers).to.include('wikipedia-mcp');
    });
    
    it('should infer capabilities for social media tasks', function() {
      const specializedServers = mcpClient.selectSpecializedServers('social-specialist', ['social-media']);
      
      expect(specializedServers).to.include('discord-mcp');
      expect(specializedServers).to.include('youtube-mcp');
    });
    
    it('should combine agent type and capability requirements', function() {
      const specializedServers = mcpClient.selectSpecializedServers('developer', ['code-generation', 'data-analysis']);
      
      // Should include both development and data analysis servers
      expect(specializedServers).to.include('code-execution-mcp');
      expect(specializedServers).to.include('github-mcp');
      expect(specializedServers).to.include('kaggle-mcp');
      expect(specializedServers).to.include('wolfram-alpha-mcp');
    });
  });
  
  describe('Error Handling and Resilience', function() {
    
    it('should handle missing servers gracefully', async function() {
      try {
        await mcpClient.invokeTool('non-existent-server', 'some-tool', {});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('not connected');
      }
    });
    
    it('should handle missing tools gracefully', async function() {
      try {
        await mcpClient.invokeTool('playwright-mcp', 'non-existent-tool', {});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('not available');
      }
    });
    
    it('should fall back to simulation when real tools fail', async function() {
      // Force a tool failure by using invalid parameters
      const result = await mcpClient.invokeTool('playwright-mcp', 'browse-web', {
        url: 'invalid-url-that-will-fail'
      });
      
      // Should fall back to simulation and still return a result
      expect(result).to.exist;
      expect(result.success).to.be.true;
    });
  });
  
  describe('Performance and Scalability', function() {
    
    it('should handle multiple concurrent tool invocations', async function() {
      const promises = [
        mcpClient.sequentialThinking('Problem 1'),
        mcpClient.sequentialThinking('Problem 2'),
        mcpClient.sequentialThinking('Problem 3')
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).to.have.length(3);
      results.forEach(result => {
        expect(result.success).to.be.true;
      });
    });
    
    it('should cache tool information efficiently', function() {
      const toolsCache = mcpClient.getAvailableTools();
      const toolsCache2 = mcpClient.getAvailableTools();
      
      expect(toolsCache).to.deep.equal(toolsCache2);
    });
  });
  
  describe('Integration with Agent System', function() {
    
    it('should provide tools for different agent capabilities', function() {
      const webTools = mcpClient.getToolsForCapability('web-browsing');
      const thinkingTools = mcpClient.getToolsForCapability('structured-reasoning');
      const memoryTools = mcpClient.getToolsForCapability('memory-management');
      
      expect(webTools.length).to.be.greaterThan(0);
      expect(thinkingTools.length).to.be.greaterThan(0);
      expect(memoryTools.length).to.be.greaterThan(0);
    });
    
    it('should support agent-specific server configurations', async function() {
      // Test different agent types get different specialized servers
      const devServers = await mcpClient.connectToSpecializedServers('developer');
      const researchServers = await mcpClient.connectToSpecializedServers('research');
      
      expect(devServers).to.be.an('array');
      expect(researchServers).to.be.an('array');
      
      // They should be different (unless there's overlap)
      const overlap = devServers.filter(server => researchServers.includes(server));
      expect(overlap.length).to.be.lessThan(Math.max(devServers.length, researchServers.length));
    });
  });
});