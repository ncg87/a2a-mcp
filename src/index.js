#!/usr/bin/env node

/**
 * Multi-Agent MCP Ensemble - Main Entry Point
 * 
 * This is the main entry point for the multi-agent system.
 * It provides a CLI interface to start and manage the ensemble.
 */

import { Command } from 'commander';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import EnsembleLauncher from './ensemble-launcher.js';
import CoordinatorAgent from './agents/coordinator.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('multi-agent-ensemble')
  .description('Multi-Agent MCP Ensemble System')
  .version('1.0.0');

program
  .command('start')
  .description('Start the complete multi-agent ensemble')
  .option('-c, --config <path>', 'Configuration file path', path.join(__dirname, '../config/ensemble.yaml'))
  .option('--log-level <level>', 'Set log level (error, warn, info, debug)', 'info')
  .action(async (options) => {
    try {
      // Set log level
      logger.level = options.logLevel;
      
      logger.info('Starting Multi-Agent MCP Ensemble...');
      
      const launcher = new EnsembleLauncher(options.config);
      await launcher.initialize();
      await launcher.launchEnsemble();
      
    } catch (error) {
      logger.error('Failed to start ensemble:', error);
      process.exit(1);
    }
  });

program
  .command('coordinator')
  .description('Start only the coordinator agent')
  .option('-c, --config <path>', 'Configuration file path', path.join(__dirname, '../config/ensemble.yaml'))
  .option('--log-level <level>', 'Set log level', 'info')
  .action(async (options) => {
    try {
      logger.level = options.logLevel;
      logger.info('Starting Coordinator Agent...');
      
      // Load configuration
      const fs = await import('fs/promises');
      const yaml = await import('js-yaml');
      const configFile = await fs.readFile(options.config, 'utf8');
      const config = yaml.load(configFile);
      
      // Start coordinator
      const coordinator = new CoordinatorAgent({
        ...config.ensemble.agents.coordinator,
        ...config.ensemble
      });
      
      await coordinator.initialize();
      
      logger.info('Coordinator Agent started successfully');
      
      // Keep running
      process.on('SIGINT', async () => {
        logger.info('Shutting down coordinator...');
        await coordinator.handleShutdown();
        process.exit(0);
      });
      
    } catch (error) {
      logger.error('Failed to start coordinator:', error);
      process.exit(1);
    }
  });

program
  .command('agent <type>')
  .description('Start a specific agent type')
  .option('-i, --id <id>', 'Agent instance ID', 'agent-1')
  .option('-c, --config <path>', 'Configuration file path', path.join(__dirname, '../config/ensemble.yaml'))
  .option('--log-level <level>', 'Set log level', 'info')
  .action(async (type, options) => {
    try {
      logger.level = options.logLevel;
      logger.info(`Starting ${type} agent (${options.id})...`);
      
      // Dynamic agent loading
      const agentModule = await import(`./agents/${type.includes('/') ? type : `specialists/${type}-agent`}.js`);
      const AgentClass = agentModule.default || agentModule[Object.keys(agentModule)[0]];
      
      // Load configuration
      const fs = await import('fs/promises');
      const yaml = await import('js-yaml');
      const configFile = await fs.readFile(options.config, 'utf8');
      const config = yaml.load(configFile);
      
      // Find agent config
      const agentConfig = [
        ...config.ensemble.agents.specialists,
        ...config.ensemble.agents.workers
      ].find(a => a.type === type.replace('-agent', ''));
      
      if (!agentConfig) {
        throw new Error(`Agent type ${type} not found in configuration`);
      }
      
      // Start agent
      const agent = new AgentClass({
        id: options.id,
        ...agentConfig,
        ...config.ensemble
      });
      
      await agent.initialize();
      
      logger.info(`${type} agent (${options.id}) started successfully`);
      
      // Keep running
      process.on('SIGINT', async () => {
        logger.info(`Shutting down ${type} agent...`);
        await agent.handleShutdown();
        process.exit(0);
      });
      
    } catch (error) {
      logger.error(`Failed to start ${type} agent:`, error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show ensemble status')
  .option('-c, --config <path>', 'Configuration file path', path.join(__dirname, '../config/ensemble.yaml'))
  .action(async (options) => {
    try {
      // This would connect to the running ensemble and show status
      // For now, just show configuration
      const fs = await import('fs/promises');
      const yaml = await import('js-yaml');
      const configFile = await fs.readFile(options.config, 'utf8');
      const config = yaml.load(configFile);
      
      console.log('\n=== Multi-Agent MCP Ensemble Configuration ===');
      console.log(`Ensemble: ${config.ensemble.name} v${config.ensemble.version}`);
      console.log(`Coordinator: ${config.ensemble.agents.coordinator.replicas} instance(s)`);
      console.log(`Specialists: ${config.ensemble.agents.specialists.length} types, ${config.ensemble.agents.specialists.reduce((sum, s) => sum + s.replicas, 0)} total instances`);
      console.log(`Workers: ${config.ensemble.agents.workers.length} types, ${config.ensemble.agents.workers.reduce((sum, w) => sum + w.replicas, 0)} total instances`);
      console.log(`MCP Servers: ${config.ensemble.mcp_servers.length} configured`);
      console.log('===============================================\n');
      
    } catch (error) {
      logger.error('Failed to show status:', error);
      process.exit(1);
    }
  });

program
  .command('task <description>')
  .description('Submit a task to the ensemble')
  .option('--type <type>', 'Task type', 'general')
  .option('--priority <priority>', 'Task priority (low, medium, high)', 'medium')
  .option('--timeout <timeout>', 'Task timeout in milliseconds', '300000')
  .action(async (description, options) => {
    try {
      logger.info(`Submitting task: ${description}`);
      
      // This would submit a task to the running ensemble
      // For now, just log the task details
      const task = {
        id: require('uuid').v4(),
        description,
        type: options.type,
        priority: options.priority,
        timeout: parseInt(options.timeout),
        timestamp: new Date().toISOString()
      };
      
      console.log('Task created:', JSON.stringify(task, null, 2));
      console.log('Note: Task submission to running ensemble not yet implemented');
      
    } catch (error) {
      logger.error('Failed to submit task:', error);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Generate example configuration')
  .option('-o, --output <path>', 'Output file path', './ensemble-config.yaml')
  .action(async (options) => {
    try {
      const exampleConfig = `# Multi-Agent MCP Ensemble Configuration Example
# Generated by multi-agent-ensemble CLI

ensemble:
  name: "my-ensemble"
  version: "1.0.0"
  
  message_bus:
    type: "redis"
    host: "localhost"
    port: 6379
    channels:
      task_queue: "tasks"
      agent_discovery: "agent-discovery"
      agent_status: "agent-status"
      results: "results"
  
  agents:
    coordinator:
      replicas: 1
      capabilities: ["task-management", "orchestration"]
    
    specialists:
      - type: "code"
        replicas: 2
        capabilities: ["programming", "debugging"]
      - type: "research"
        replicas: 1
        capabilities: ["information-gathering", "web-search"]
    
    workers:
      - type: "file"
        replicas: 1
        capabilities: ["file-operations"]
      - type: "database"
        replicas: 1
        capabilities: ["data-persistence"]
  
  mcp_servers:
    - id: "file-system-mcp"
      type: "filesystem"
      endpoint: "file:///"
      tools: ["read", "write", "search"]
  
  monitoring:
    health_check_interval: 30000
    log_level: "info"
`;
      
      const fs = await import('fs/promises');
      await fs.writeFile(options.output, exampleConfig);
      
      console.log(`Example configuration written to: ${options.output}`);
      
    } catch (error) {
      logger.error('Failed to generate config:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (process.argv.length <= 2) {
  program.help();
}