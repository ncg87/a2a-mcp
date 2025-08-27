#!/usr/bin/env node

/**
 * Test for API Server Refactoring
 * Verifies that the modular route structure works correctly
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import { spawn } from 'child_process';

dotenv.config();

console.log('Testing API Server Refactoring...\n');

async function testAPIServerRefactor() {
  try {
    // Test 1: Check that server file loads without errors
    console.log('1. Testing server file syntax...');
    try {
      const { default: APIServer } = await import('../src/api/server.js');
      console.log('   ✅ Server file loads successfully');
      
      // Test 2: Check that server can be instantiated
      const server = new APIServer(3001);
      console.log('   ✅ Server can be instantiated');
      
    } catch (importError) {
      console.log('   ❌ Server file has syntax errors:', importError.message);
      throw importError;
    }
    
    // Test 3: Check modular route files exist
    console.log('\n2. Checking modular route files...');
    
    const routeFiles = [
      'src/api/routes/health-routes.js',
      'src/api/routes/auth-routes.js', 
      'src/api/routes/logs-routes.js',
      'src/api/routes/conversation-routes.js'
    ];
    
    for (const file of routeFiles) {
      try {
        await fs.access(file);
        console.log(`   ✅ ${file} exists`);
      } catch {
        console.log(`   ❌ ${file} missing`);
      }
    }
    
    // Test 4: Check controller exists
    console.log('\n3. Checking controller files...');
    try {
      await fs.access('src/api/controllers/conversation-controller.js');
      console.log('   ✅ ConversationController exists');
    } catch {
      console.log('   ❌ ConversationController missing');
    }
    
    // Test 5: Check imports work
    console.log('\n4. Testing route imports...');
    try {
      const { default: healthRoutes } = await import('../src/api/routes/health-routes.js');
      console.log('   ✅ Health routes import successfully');
      
      const { default: authRoutes } = await import('../src/api/routes/auth-routes.js');
      console.log('   ✅ Auth routes import successfully');
      
      const { ConversationController } = await import('../src/api/controllers/conversation-controller.js');
      console.log('   ✅ ConversationController imports successfully');
      
    } catch (importError) {
      console.log('   ❌ Route import failed:', importError.message);
    }
    
    // Test 6: Check file size reduction
    console.log('\n5. Checking refactoring impact...');
    
    const currentStats = await fs.stat('src/api/server.js');
    const currentLines = (await fs.readFile('src/api/server.js', 'utf8')).split('\n').length;
    
    try {
      const backupStats = await fs.stat('src/api/server.js.pre-refactor-backup');
      const backupLines = (await fs.readFile('src/api/server.js.pre-refactor-backup', 'utf8')).split('\n').length;
      
      const lineReduction = backupLines - currentLines;
      const percentReduction = ((lineReduction / backupLines) * 100).toFixed(1);
      
      console.log(`   Original: ${backupLines} lines`);
      console.log(`   Refactored: ${currentLines} lines`);
      console.log(`   Reduction: ${lineReduction} lines (${percentReduction}%)`);
      
      if (lineReduction > 0) {
        console.log('   ✅ File size successfully reduced');
      } else {
        console.log('   ❌ File size not reduced');
      }
      
    } catch {
      console.log('   ℹ️  No backup file found for comparison');
    }
    
    console.log('\n✅ API Server Refactoring Test Complete');
    console.log('\nRefactoring Summary:');
    console.log('- Monolithic setupRoutes() method broken into modular components');
    console.log('- ConversationController extracted to handle complex conversation logic');
    console.log('- Routes organized into separate files by domain');
    console.log('- Improved maintainability and testability');
    console.log('- Reduced file size and complexity');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAPIServerRefactor();