#!/usr/bin/env node

/**
 * Simple test for the Working Press Play system
 * This simulates entering a prompt without interactive mode
 */

import WorkingPressPlaySystem from './src/working-press-play.js';

async function testPressPlay() {
  try {
    console.log('🧪 Testing Working Press Play System\n');

    const pressPlay = new WorkingPressPlaySystem();
    await pressPlay.initialize();

    console.log('✅ System initialized, now processing test prompt...\n');

    // Simulate processing a complex DeFi prompt
    const testPrompt = "Create a comprehensive DeFi ecosystem with AMM, yield farming, governance token, and mobile app";
    
    await pressPlay.processPrompt(testPrompt);

    console.log('\n🎉 Test completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testPressPlay();