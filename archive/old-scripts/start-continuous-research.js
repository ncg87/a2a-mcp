#!/usr/bin/env node

/**
 * Start 24/7 Continuous Research System
 * 
 * This system will continuously research topics, discover insights,
 * and email you important findings
 */

import ContinuousResearchEngine from './src/core/continuous-research-engine.js';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.clear();
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║      🔬 24/7 AUTONOMOUS RESEARCH SYSTEM 🔬                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('This system will continuously:');
  console.log('  ✨ Auto-generate FASCINATING research topics');
  console.log('  🚨 Detect BREAKTHROUGH discoveries');
  console.log('  📧 Email you when it finds something COOL');
  console.log('  🧠 Build knowledge across cutting-edge fields');
  console.log('  🔮 Explore mysteries and impossible science');
  console.log('');
  console.log('🤖 Topics include: Quantum consciousness, AGI emergence,');
  console.log('   dark matter, time crystals, synthetic biology & more!');
  console.log('');
  
  // Check email configuration
  const emailConfigured = process.env.NOTIFICATION_EMAIL && 
                         (process.env.EMAIL_USER || process.env.EMAIL_CONFIGURED === 'false');
  
  if (!emailConfigured) {
    console.log('⚠️  Email notifications not configured!');
    console.log('   Add to your .env file:');
    console.log('   NOTIFICATION_EMAIL=your-email@example.com');
    console.log('   EMAIL_USER=sender-email@gmail.com');
    console.log('   EMAIL_PASS=app-specific-password');
    console.log('   EMAIL_SERVICE=gmail');
    console.log('');
    console.log('   Or set EMAIL_CONFIGURED=false to use console output');
    console.log('');
  }
  
  // Get configuration from user
  const config = await getConfiguration();
  
  // Create research engine
  const engine = new ContinuousResearchEngine(config);
  
  // Setup event listeners
  setupEventListeners(engine);
  
  // Start the engine
  console.log('\n🚀 Starting continuous research engine...\n');
  
  try {
    await engine.start(config.initialTopic);
    
    // Setup graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n📊 Shutting down gracefully...');
      await engine.stop();
      
      // Display final statistics
      const stats = engine.getStatistics();
      console.log('\n📈 Final Statistics:');
      console.log(`   Uptime: ${stats.uptime}`);
      console.log(`   Topics Explored: ${stats.totalTopicsExplored}`);
      console.log(`   Insights Discovered: ${stats.totalInsightsDiscovered}`);
      console.log(`   Emails Sent: ${stats.totalEmailsSent}`);
      console.log(`   Memory Entries: ${stats.memoryEntries}`);
      
      process.exit(0);
    });
    
    // Keep the process running
    console.log('System is running. Press Ctrl+C to stop.\n');
    
    // Show periodic status updates
    setInterval(() => {
      const stats = engine.getStatistics();
      console.log(`[${new Date().toLocaleTimeString()}] Status: ${stats.currentActiveTopics} active topics | ${stats.queuedTopics} queued | ${stats.totalInsightsDiscovered} insights found`);
    }, 60000); // Every minute
    
  } catch (error) {
    console.error('❌ Failed to start engine:', error);
    process.exit(1);
  }
}

async function getConfiguration() {
  const config = {
    emailRecipient: process.env.NOTIFICATION_EMAIL,
    baseTopics: [],
    initialTopic: null,
    researchDepth: 'comprehensive',
    insightThreshold: 0.7,
    topicTransitionInterval: 30,
    maxConcurrentTopics: 3
  };
  
  // Ask for initial topic
  const initialTopic = await askQuestion('\n📝 Press Enter for AUTO-GENERATED topics (recommended!)\n   Or type a specific topic: ');
  if (initialTopic.trim()) {
    config.initialTopic = initialTopic.trim();
  } else {
    console.log('\n✨ Excellent choice! System will auto-generate mind-blowing topics!');
  }
  
  // Ask for base topics
  const baseTopicsInput = await askQuestion('📚 Enter base topics (comma-separated, or Enter for defaults): ');
  if (baseTopicsInput.trim()) {
    config.baseTopics = baseTopicsInput.split(',').map(t => t.trim());
  } else {
    // Default base topics
    config.baseTopics = [
      'Artificial Intelligence breakthroughs',
      'Quantum computing applications',
      'Biotechnology innovations',
      'Sustainable technology',
      'Future of work and automation'
    ];
  }
  
  // Ask for configuration preferences
  const depthChoice = await askQuestion('\n🔍 Research depth (1=quick, 2=balanced, 3=comprehensive) [3]: ');
  if (depthChoice === '1') {
    config.researchDepth = 'quick';
    config.insightThreshold = 0.6;
    config.topicTransitionInterval = 15;
  } else if (depthChoice === '2') {
    config.researchDepth = 'balanced';
    config.insightThreshold = 0.7;
    config.topicTransitionInterval = 25;
  }
  
  // Ask for concurrent topics
  const concurrentInput = await askQuestion('🔄 Number of concurrent research sessions (1-5) [3]: ');
  const concurrent = parseInt(concurrentInput);
  if (concurrent >= 1 && concurrent <= 5) {
    config.maxConcurrentTopics = concurrent;
  }
  
  // Ask for email frequency
  const emailFreq = await askQuestion('📧 Email frequency in hours (1-24) [1]: ');
  const freq = parseInt(emailFreq);
  if (freq >= 1 && freq <= 24) {
    config.emailBatchInterval = freq * 3600000;
  } else {
    config.emailBatchInterval = 3600000; // 1 hour default
  }
  
  rl.close();
  
  console.log('\n✅ Configuration complete!');
  console.log('   Base Topics:', config.baseTopics.length);
  console.log('   Research Depth:', config.researchDepth);
  console.log('   Concurrent Sessions:', config.maxConcurrentTopics);
  console.log('   Email Frequency: Every', (config.emailBatchInterval / 3600000), 'hour(s)');
  
  return config;
}

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

function setupEventListeners(engine) {
  engine.on('started', () => {
    console.log('✅ Research engine started successfully');
  });
  
  engine.on('stopped', () => {
    console.log('⏹️  Research engine stopped');
  });
  
  engine.on('health-check', (health) => {
    if (!health.isHealthy) {
      console.log(`⚠️  Health check warning at ${new Date().toLocaleTimeString()}`);
    }
  });
}

// Run the system
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});