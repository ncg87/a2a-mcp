#!/usr/bin/env node

/**
 * Simple test for the Autonomous Press Play system
 */

import AutonomousPressPlaySystem from './src/autonomous-press-play.js';

async function testAutonomous() {
  try {
    console.log('🧪 Testing Autonomous Press Play System\n');

    const autonomous = new AutonomousPressPlaySystem();
    await autonomous.initialize();

    console.log('✅ System initialized, now processing autonomous test prompt...\n');

    // Test with a complex multi-domain prompt
    const testPrompt = "Create a revolutionary AI-powered sustainable energy platform that uses IoT sensors, blockchain governance, machine learning for optimization, mobile apps for citizens, and integrates with smart city infrastructure";
    
    await autonomous.processAutonomousPrompt(testPrompt);

    console.log('\n🎉 Autonomous test completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Autonomous test failed:', error);
    process.exit(1);
  }
}

testAutonomous();