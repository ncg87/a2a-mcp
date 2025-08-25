#!/usr/bin/env node

/**
 * Multi-Agent MCP Ensemble Launcher
 * 
 * This script launches and orchestrates the entire multi-agent ensemble system.
 * It starts all configured agents and MCP servers based on the configuration.
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import yaml from 'js-yaml';
import logger from './utils/logger.js';
import MessageBus from './core/message-bus.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnsembleLauncher {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = null;
    this.processes = new Map();
    this.messageBus = null;
    this.shutdownHandlers = [];
  }

  async initialize() {
    try {
      logger.info('Initializing Multi-Agent MCP Ensemble...');
      
      // Load configuration
      await this.loadConfiguration();
      
      // Initialize message bus
      await this.initializeMessageBus();
      
      // Setup shutdown handlers
      this.setupShutdownHandlers();
      
      logger.info('Ensemble launcher initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize ensemble launcher:', error);
      throw error;
    }
  }

  async loadConfiguration() {
    try {
      const configFile = await fs.readFile(this.configPath, 'utf8');
      this.config = yaml.load(configFile);
      
      logger.info(`Configuration loaded from ${this.configPath}`);
      logger.debug('Configuration:', this.config);
      
    } catch (error) {
      logger.error('Failed to load configuration:', error);
      throw error;
    }
  }

  async initializeMessageBus() {
    try {
      this.messageBus = new MessageBus(this.config.ensemble.message_bus);
      await this.messageBus.connect();
      
      // Subscribe to system events
      await this.messageBus.subscribe('agent-discovery', (message) => {
        logger.info(`Agent discovered: ${message.id} (${message.type})`);
      });
      
      await this.messageBus.subscribe('agent-status', (message) => {
        logger.debug(`Agent status update: ${message.agentId} - ${message.status}`);
      });
      
      logger.info('Message bus initialized and connected');
      
    } catch (error) {
      logger.error('Failed to initialize message bus:', error);
      throw error;
    }
  }

  async launchEnsemble() {
    try {
      logger.info('Launching Multi-Agent MCP Ensemble...');
      
      // Start coordinator agent first
      await this.launchCoordinator();
      
      // Wait a bit for coordinator to initialize
      await this.delay(2000);
      
      // Start specialist agents
      await this.launchSpecialistAgents();
      
      // Wait a bit more
      await this.delay(1000);
      
      // Start worker agents
      await this.launchWorkerAgents();
      
      // Monitor system health
      this.startHealthMonitoring();
      
      logger.info('Multi-Agent MCP Ensemble launched successfully!');
      logger.info(`Total agents: ${this.processes.size}`);
      
      // Keep the launcher running
      await this.keepAlive();
      
    } catch (error) {
      logger.error('Failed to launch ensemble:', error);
      await this.shutdown();
      throw error;
    }
  }

  async launchCoordinator() {
    logger.info('Starting coordinator agent...');
    
    const coordinatorConfig = this.config.ensemble.agents.coordinator;
    const process = await this.spawnAgent('coordinator', 'coordinator.js', coordinatorConfig);
    
    this.processes.set('coordinator', process);
    logger.info('Coordinator agent started');
  }

  async launchSpecialistAgents() {
    logger.info('Starting specialist agents...');
    
    const specialists = this.config.ensemble.agents.specialists;
    
    for (const specialist of specialists) {
      for (let replica = 0; replica < specialist.replicas; replica++) {
        const agentId = `${specialist.type}-${replica + 1}`;
        const scriptName = `${specialist.type}-agent.js`;
        
        logger.info(`Starting ${agentId}...`);
        
        const process = await this.spawnAgent(
          agentId,
          `specialists/${scriptName}`,
          specialist
        );
        
        this.processes.set(agentId, process);
        
        // Stagger startup to avoid overwhelming the system
        await this.delay(500);
      }
    }
    
    logger.info(`Started ${this.config.ensemble.agents.specialists.reduce((sum, s) => sum + s.replicas, 0)} specialist agents`);
  }

  async launchWorkerAgents() {
    logger.info('Starting worker agents...');
    
    const workers = this.config.ensemble.agents.workers;
    
    for (const worker of workers) {
      for (let replica = 0; replica < worker.replicas; replica++) {
        const agentId = `${worker.type}-${replica + 1}`;
        const scriptName = `${worker.type}-agent.js`;
        
        logger.info(`Starting ${agentId}...`);
        
        const process = await this.spawnAgent(
          agentId,
          `workers/${scriptName}`,
          worker
        );
        
        this.processes.set(agentId, process);
        
        // Stagger startup
        await this.delay(300);
      }
    }
    
    logger.info(`Started ${this.config.ensemble.agents.workers.reduce((sum, w) => sum + w.replicas, 0)} worker agents`);
  }

  async spawnAgent(agentId, scriptPath, config) {
    const fullScriptPath = path.join(__dirname, 'agents', scriptPath);
    
    // Set environment variables for the agent
    const env = {
      ...process.env,
      AGENT_ID: agentId,
      AGENT_CONFIG: JSON.stringify(config),
      ENSEMBLE_CONFIG: JSON.stringify(this.config)
    };
    
    const childProcess = spawn('node', [fullScriptPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Handle process output
    childProcess.stdout.on('data', (data) => {
      logger.info(`[${agentId}] ${data.toString().trim()}`);
    });
    
    childProcess.stderr.on('data', (data) => {
      logger.error(`[${agentId}] ${data.toString().trim()}`);
    });
    
    // Handle process exit
    childProcess.on('exit', (code, signal) => {
      if (code !== 0) {
        logger.error(`Agent ${agentId} exited with code ${code}, signal ${signal}`);
      } else {
        logger.info(`Agent ${agentId} exited normally`);
      }
      
      this.processes.delete(agentId);
      
      // Restart agent if it crashed unexpectedly
      if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
        logger.warn(`Restarting crashed agent: ${agentId}`);
        setTimeout(() => {
          this.restartAgent(agentId, scriptPath, config);
        }, 5000);
      }
    });
    
    childProcess.on('error', (error) => {
      logger.error(`Failed to start agent ${agentId}:`, error);
    });
    
    return childProcess;
  }

  async restartAgent(agentId, scriptPath, config) {
    try {
      logger.info(`Restarting agent: ${agentId}`);
      const process = await this.spawnAgent(agentId, scriptPath, config);
      this.processes.set(agentId, process);
      logger.info(`Agent ${agentId} restarted successfully`);
    } catch (error) {
      logger.error(`Failed to restart agent ${agentId}:`, error);
    }
  }

  startHealthMonitoring() {
    const interval = this.config.ensemble.monitoring?.health_check_interval || 30000;
    
    const healthCheck = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);
    
    this.shutdownHandlers.push(() => clearInterval(healthCheck));
  }

  async performHealthCheck() {
    const activeProcesses = this.processes.size;
    const expectedProcesses = this.calculateExpectedProcesses();
    
    if (activeProcesses < expectedProcesses) {
      logger.warn(`Health check warning: ${activeProcesses}/${expectedProcesses} agents running`);
    }
    
    // Check message bus health
    const messageBusHealthy = await this.messageBus.ping();
    if (!messageBusHealthy) {
      logger.error('Message bus health check failed');
    }
    
    logger.debug(`Health check: ${activeProcesses}/${expectedProcesses} agents, message bus: ${messageBusHealthy ? 'healthy' : 'unhealthy'}`);
  }

  calculateExpectedProcesses() {
    let total = 1; // Coordinator
    
    // Specialists
    total += this.config.ensemble.agents.specialists.reduce((sum, s) => sum + s.replicas, 0);
    
    // Workers
    total += this.config.ensemble.agents.workers.reduce((sum, w) => sum + w.replicas, 0);
    
    return total;
  }

  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down ensemble...`);
      await this.shutdown();
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGUSR2', shutdown); // nodemon restart
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }

  async shutdown() {
    logger.info('Shutting down Multi-Agent MCP Ensemble...');
    
    // Execute shutdown handlers
    for (const handler of this.shutdownHandlers) {
      try {
        handler();
      } catch (error) {
        logger.error('Error executing shutdown handler:', error);
      }
    }
    
    // Terminate all agent processes
    for (const [agentId, process] of this.processes) {
      logger.info(`Terminating agent: ${agentId}`);
      process.kill('SIGTERM');
      
      // Force kill if process doesn't terminate gracefully
      setTimeout(() => {
        if (!process.killed) {
          logger.warn(`Force killing agent: ${agentId}`);
          process.kill('SIGKILL');
        }
      }, 5000);
    }
    
    // Disconnect message bus
    if (this.messageBus) {
      await this.messageBus.disconnect();
    }
    
    logger.info('Ensemble shutdown complete');
  }

  async keepAlive() {
    return new Promise((resolve) => {
      // Keep the process alive until shutdown
      const keepAlive = setInterval(() => {
        // Do nothing, just keep alive
      }, 1000);
      
      this.shutdownHandlers.push(() => {
        clearInterval(keepAlive);
        resolve();
      });
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async displayStatus() {
    console.log('\n=== Multi-Agent MCP Ensemble Status ===');
    console.log(`Active Processes: ${this.processes.size}`);
    console.log(`Expected Processes: ${this.calculateExpectedProcesses()}`);
    console.log(`Message Bus: ${await this.messageBus.ping() ? 'Connected' : 'Disconnected'}`);
    console.log('\nActive Agents:');
    
    for (const [agentId, process] of this.processes) {
      console.log(`  - ${agentId} (PID: ${process.pid})`);
    }
    
    console.log('=====================================\n');
  }
}

// Main execution
async function main() {
  const configPath = process.argv[2] || path.join(__dirname, '../config/ensemble.yaml');
  
  try {
    const launcher = new EnsembleLauncher(configPath);
    await launcher.initialize();
    
    // Display initial status
    setTimeout(() => {
      launcher.displayStatus();
    }, 5000);
    
    // Display status periodically
    setInterval(() => {
      launcher.displayStatus();
    }, 60000);
    
    await launcher.launchEnsemble();
    
  } catch (error) {
    logger.error('Failed to start ensemble:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default EnsembleLauncher;