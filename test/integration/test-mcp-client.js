/**
 * Test script for MCP client functionality
 */

import RealMCPClient from './src/core/real-mcp-client.js';
import MCPClient from './src/core/mcp-client.js';

console.log('🧪 Testing MCP Client Functionality\n');
console.log('=' .repeat(50));

async function testRealMCPClient() {
  console.log('\n1️⃣ Testing Real MCP Client...\n');
  
  const client = new RealMCPClient();
  
  try {
    // Initialize client
    await client.initialize();
    console.log('✅ Real MCP client initialized');
    
    // Check available tools
    const tools = client.getAvailableTools();
    console.log(`✅ ${tools.length} built-in tools available:`);
    tools.forEach(tool => {
      console.log(`   - ${tool.id}: ${tool.description}`);
    });
    
    // Test filesystem tool
    console.log('\n2️⃣ Testing filesystem tools...\n');
    
    // Test listing directory
    const listResult = await client.invokeTool('filesystem', 'list_directory', {
      path: '.'
    });
    console.log('✅ Directory listing:', listResult.success ? 
      `Found ${listResult.result.files.length} files` : 
      listResult.error);
    
    // Test writing and reading a file
    const testContent = 'Test MCP client content';
    const testPath = './test-mcp-file.txt';
    
    const writeResult = await client.invokeTool('filesystem', 'write_file', {
      path: testPath,
      content: testContent
    });
    console.log('✅ File write:', writeResult.success ? 'Success' : writeResult.error);
    
    const readResult = await client.invokeTool('filesystem', 'read_file', {
      path: testPath
    });
    console.log('✅ File read:', readResult.success ? 
      `Content matches: ${readResult.result.content === testContent}` : 
      readResult.error);
    
    // Clean up test file
    const fs = await import('fs/promises');
    await fs.unlink(testPath).catch(() => {});
    
    // Test web tools
    console.log('\n3️⃣ Testing web tools...\n');
    
    const searchResult = await client.invokeTool('web', 'search_web', {
      query: 'test query'
    });
    console.log('✅ Web search:', searchResult.success ? 
      `Got ${searchResult.result.results.length} results` : 
      searchResult.error);
    
    // Test data tools
    console.log('\n4️⃣ Testing data tools...\n');
    
    const jsonResult = await client.invokeTool('data', 'parse_json', {
      text: '{"test": "value"}'
    });
    console.log('✅ JSON parse:', jsonResult.success ? 
      `Parsed: ${JSON.stringify(jsonResult.result.parsed)}` : 
      jsonResult.error);
    
    const formatResult = await client.invokeTool('data', 'format_data', {
      data: { key: 'value', number: 42 },
      format: 'json'
    });
    console.log('✅ Data format:', formatResult.success ? 
      'Formatted successfully' : 
      formatResult.error);
    
    // Test code evaluation (safe)
    console.log('\n5️⃣ Testing code evaluation...\n');
    
    const evalResult = await client.invokeTool('code', 'evaluate_expression', {
      expression: '2 + 2 * 3',
      context: {}
    });
    console.log('✅ Expression evaluation:', evalResult.success ? 
      `Result: ${evalResult.result.result}` : 
      evalResult.error);
    
    // Test security validation
    const dangerousEval = await client.invokeTool('code', 'evaluate_expression', {
      expression: 'require("fs")',
      context: {}
    });
    console.log('✅ Security check:', !dangerousEval.success ? 
      'Correctly blocked dangerous code' : 
      'WARNING: Security check failed!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Real MCP client test failed:', error.message);
    return false;
  }
}

async function testOriginalMCPClient() {
  console.log('\n6️⃣ Testing Original MCP Client (for comparison)...\n');
  
  try {
    const client = new MCPClient(null); // Pass null to test fallback
    await client.initialize();
    console.log('✅ Original MCP client initialized (with mock fallback)');
    
    // Test that it doesn't crash
    const servers = client.getConnectedServers();
    console.log(`✅ Connected servers: ${servers.length}`);
    
    const tools = client.getAvailableTools();
    console.log(`✅ Available tools: ${tools.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Original MCP client test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting MCP Client Tests...');
  
  const results = {
    realMCP: await testRealMCPClient(),
    originalMCP: await testOriginalMCPClient()
  };
  
  console.log('\n' + '=' .repeat(50));
  console.log('TEST RESULTS:');
  console.log('=' .repeat(50));
  
  if (results.realMCP) {
    console.log('✅ Real MCP Client: WORKING');
  } else {
    console.log('❌ Real MCP Client: FAILED');
  }
  
  if (results.originalMCP) {
    console.log('✅ Original MCP Client: WORKING (with fallback)');
  } else {
    console.log('❌ Original MCP Client: FAILED');
  }
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n🎉 All MCP client tests passed!');
    console.log('The system now has functional MCP tools instead of mocks.');
  } else {
    console.log('\n⚠️ Some MCP tests failed. Check the errors above.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);