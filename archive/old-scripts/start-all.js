#!/usr/bin/env node

/**
 * Unified Startup Script
 * Starts the entire Multi-Agent MCP Ensemble System with Dashboard
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ASCII Art Banner
console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🤖 Multi-Agent MCP Ensemble System                   ║
║        with Real-Time Dashboard                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`));

const processes = [];
let apiServerReady = false;
let dashboardReady = false;

// Cleanup function
function cleanup() {
  console.log(chalk.yellow('\n🛑 Shutting down all services...'));
  processes.forEach(proc => {
    try {
      process.kill(-proc.pid); // Kill process group
    } catch (e) {
      proc.kill('SIGTERM');
    }
  });
  process.exit(0);
}

// Handle exit signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Start API Server
async function startAPIServer() {
  const spinner = ora(chalk.blue('Starting API Server...')).start();
  
  return new Promise((resolve, reject) => {
    const apiServer = spawn('node', ['start-api-server.js'], {
      cwd: __dirname,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    processes.push(apiServer);
    
    apiServer.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('API Server running on')) {
        spinner.succeed(chalk.green('✅ API Server started on http://localhost:3001'));
        apiServerReady = true;
        resolve();
      }
      // Log API server output in debug mode
      if (process.env.DEBUG) {
        console.log(chalk.gray('[API]'), output.trim());
      }
    });
    
    apiServer.stderr.on('data', (data) => {
      const error = data.toString();
      if (!error.includes('DeprecationWarning')) {
        console.error(chalk.red('[API Error]'), error);
      }
    });
    
    apiServer.on('error', (err) => {
      spinner.fail(chalk.red('Failed to start API Server'));
      reject(err);
    });
    
    apiServer.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        spinner.fail(chalk.red(`API Server exited with code ${code}`));
        cleanup();
      }
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!apiServerReady) {
        spinner.fail(chalk.red('API Server startup timeout'));
        reject(new Error('API Server failed to start'));
      }
    }, 10000);
  });
}

// Start Dashboard
async function startDashboard() {
  const spinner = ora(chalk.blue('Starting React Dashboard...')).start();
  
  return new Promise((resolve, reject) => {
    const dashboard = spawn('npm', ['start'], {
      cwd: join(__dirname, 'dashboard'),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, BROWSER: 'none' } // Don't auto-open browser
    });
    
    processes.push(dashboard);
    
    dashboard.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('webpack compiled') || output.includes('Compiled successfully')) {
        spinner.succeed(chalk.green('✅ Dashboard started on http://localhost:3000'));
        dashboardReady = true;
        resolve();
      }
      // Log dashboard output in debug mode
      if (process.env.DEBUG) {
        console.log(chalk.gray('[Dashboard]'), output.trim());
      }
    });
    
    dashboard.stderr.on('data', (data) => {
      const error = data.toString();
      // Ignore common warnings
      if (!error.includes('DeprecationWarning') && 
          !error.includes('warning') &&
          !error.includes('Browserslist')) {
        console.error(chalk.red('[Dashboard Error]'), error);
      }
    });
    
    dashboard.on('error', (err) => {
      spinner.fail(chalk.red('Failed to start Dashboard'));
      reject(err);
    });
    
    dashboard.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        spinner.fail(chalk.red(`Dashboard exited with code ${code}`));
        cleanup();
      }
    });
    
    // Timeout after 30 seconds (React takes longer to start)
    setTimeout(() => {
      if (!dashboardReady) {
        spinner.warn(chalk.yellow('Dashboard is taking longer than expected...'));
        // Still resolve as it might be building
        resolve();
      }
    }, 30000);
  });
}

// Open browser
async function openBrowser() {
  const { default: open } = await import('open');
  
  setTimeout(async () => {
    console.log(chalk.cyan('\n🌐 Opening dashboard in browser...'));
    try {
      await open('http://localhost:3000');
    } catch (err) {
      console.log(chalk.yellow('Please open http://localhost:3000 in your browser'));
    }
  }, 2000);
}

// Main startup sequence
async function start() {
  try {
    console.log(chalk.cyan('🚀 Starting all services...\n'));
    
    // Start API Server first
    await startAPIServer();
    
    // Wait a bit for API to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start Dashboard
    await startDashboard();
    
    // Open browser
    await openBrowser();
    
    // Success message
    console.log(chalk.green.bold(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ✅ System Ready!                                      ║
║                                                           ║
║     API Server:  http://localhost:3001                   ║
║     Dashboard:   http://localhost:3000                   ║
║                                                           ║
║     Press CTRL+C to stop all services                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `));
    
    // Show tips
    console.log(chalk.cyan('\n📝 Quick Start Guide:'));
    console.log(chalk.white('  1. Click the ▶️ Play button to start a conversation'));
    console.log(chalk.white('  2. Enter your objective in the dialog'));
    console.log(chalk.white('  3. Watch agents collaborate in real-time'));
    console.log(chalk.white('  4. Use 🌙/☀️ to toggle dark/light mode'));
    console.log(chalk.white('  5. Create snapshots to save conversation states\n'));
    
  } catch (error) {
    console.error(chalk.red('❌ Startup failed:'), error);
    cleanup();
  }
}

// Check if dependencies are installed
async function checkDependencies() {
  try {
    await import('chalk');
    await import('ora');
    await import('open');
  } catch (error) {
    console.log('Installing required dependencies...');
    const { execSync } = await import('child_process');
    execSync('npm install chalk ora open', { stdio: 'inherit' });
  }
}

// Run
checkDependencies().then(start).catch(console.error);