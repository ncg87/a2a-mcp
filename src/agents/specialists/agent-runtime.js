/**
 * Agent Runtime Manager
 * 
 * Manages the lifecycle and execution of dynamically created agents
 */

import { EventEmitter } from 'eventemitter3';
import { Worker } from 'worker_threads';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class AgentRuntimeManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxAgents: config.maxAgents || 10,
      agentTimeout: config.agentTimeout || 300000, // 5 minutes
      sandboxMode: config.sandboxMode !== false, // Default to sandboxed
      agentDirectory: config.agentDirectory || './generated-agents',
      ...config
    };
    
    this.runningAgents = new Map();
    this.agentProcesses = new Map();
    this.agentStats = new Map();
  }

  /**
   * Initialize the runtime manager
   */
  async initialize() {
    try {
      // Ensure agent directory exists
      await fs.mkdir(this.config.agentDirectory, { recursive: true });
      
      // Create worker pool for sandboxed execution
      this.workerPool = [];
      
      logger.info('Agent Runtime Manager initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Agent Runtime Manager:', error);
      throw error;
    }
  }

  /**
   * Deploy and run a generated agent
   */
  async deployAgent(agentCode, agentSpec) {
    try {
      // Check agent limit
      if (this.runningAgents.size >= this.config.maxAgents) {
        throw new Error(`Maximum agent limit (${this.config.maxAgents}) reached`);
      }
      
      // Generate unique agent ID
      const agentId = `agent-${agentSpec.type}-${uuidv4().slice(0, 8)}`;
      
      // Validate agent code (basic security check)
      this.validateAgentCode(agentCode);
      
      // Save agent code to file
      const agentPath = path.join(this.config.agentDirectory, `${agentId}.js`);
      await fs.writeFile(agentPath, agentCode);
      
      // Create agent metadata
      const agentMeta = {
        id: agentId,
        type: agentSpec.type,
        capabilities: agentSpec.capabilities,
        path: agentPath,
        status: 'deploying',
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      
      this.runningAgents.set(agentId, agentMeta);
      
      // Start the agent
      if (this.config.sandboxMode) {
        await this.startSandboxedAgent(agentId, agentPath, agentMeta);
      } else {
        await this.startProcessAgent(agentId, agentPath, agentMeta);
      }
      
      // Set up timeout
      this.setupAgentTimeout(agentId);
      
      logger.info(`Agent ${agentId} deployed successfully`);
      this.emit('agent:deployed', { agentId, ...agentMeta });
      
      return agentId;
      
    } catch (error) {
      logger.error('Failed to deploy agent:', error);
      throw error;
    }
  }

  /**
   * Validate agent code for security issues
   */
  validateAgentCode(code) {
    // Basic security validation
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /require\s*\(\s*['"`]child_process/,
      /require\s*\(\s*['"`]fs/,
      /process\.exit/,
      /process\.env/,
      /__dirname/,
      /__filename/
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Security violation: dangerous pattern detected in agent code`);
      }
    }
    
    // Check for imports/requires of dangerous modules
    const dangerousModules = [
      'child_process',
      'cluster',
      'dgram',
      'dns',
      'net',
      'tls',
      'crypto'
    ];
    
    for (const module of dangerousModules) {
      if (code.includes(`require('${module}')`) || 
          code.includes(`require("${module}")`) ||
          code.includes(`import.*from.*${module}`)) {
        throw new Error(`Security violation: forbidden module ${module}`);
      }
    }
  }

  /**
   * Start agent in sandboxed worker thread
   */
  async startSandboxedAgent(agentId, agentPath, agentMeta) {
    try {
      // Create wrapper for worker execution
      const workerCode = `
        const { parentPort, workerData } = require('worker_threads');
        
        // Dynamic import for ES modules
        (async () => {
          try {
            let AgentClass;
            
            // Try to import the agent module
            try {
              const agentModule = await import(workerData.agentPath);
              AgentClass = agentModule.default || agentModule.${agentMeta.className || 'Agent'};
            } catch (importError) {
              // Fallback to require for CommonJS
              const agentModule = require(workerData.agentPath);
              AgentClass = agentModule.default || agentModule.${agentMeta.className || 'Agent'} || agentModule;
            }
            
            // Create agent instance
            const agent = typeof AgentClass === 'function' ? new AgentClass(workerData.config) : AgentClass;
            
            // Initialize if needed
            if (agent.initialize) {
              await agent.initialize();
            }
            
            // Set up message handling
            parentPort.on('message', async (message) => {
              try {
                const result = await agent.processTask(message);
                parentPort.postMessage({ 
                  type: 'result',
                  taskId: message.taskId,
                  result 
                });
              } catch (error) {
                parentPort.postMessage({ 
                  type: 'error',
                  taskId: message.taskId,
                  error: error.message 
                });
              }
            });
            
            // Signal ready
            parentPort.postMessage({ type: 'ready' });
          } catch (error) {
            parentPort.postMessage({ 
              type: 'error',
              error: 'Failed to initialize agent: ' + error.message 
            });
          }
        })();
      `;
      
      // Save worker wrapper
      const workerPath = path.join(this.config.agentDirectory, `${agentId}-worker.js`);
      await fs.writeFile(workerPath, workerCode);
      
      // Create worker with proper configuration
      const worker = new Worker(workerPath, {
        workerData: { 
          agentPath: path.resolve(agentPath),
          config: {
            agentId,
            ...agentMeta,
            messageBus: null, // Workers can't share message bus
            mcpRegistry: null  // Workers use isolated MCP connections
          }
        }
      });
      
      // Set up worker event handlers
      worker.on('message', (message) => {
        this.handleAgentMessage(agentId, message);
      });
      
      worker.on('error', (error) => {
        logger.error(`Agent ${agentId} worker error:`, error);
        this.emit('agent:error', { agentId, error: error.message });
      });
      
      worker.on('exit', (code) => {
        logger.info(`Agent ${agentId} worker exited with code ${code}`);
        this.stopAgent(agentId);
      });
      
      this.agentProcesses.set(agentId, { type: 'worker', worker });
      
      // Update status
      agentMeta.status = 'running';
      agentMeta.lastActivity = Date.now();
      
    } catch (error) {
      logger.error(`Failed to start sandboxed agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Start agent as separate process
   */
  async startProcessAgent(agentId, agentPath, agentMeta) {
    try {
      // Create process wrapper
      const processCode = `
        const agent = require('${path.resolve(agentPath)}');
        
        process.on('message', async (message) => {
          try {
            const result = await agent.processTask(message);
            process.send({ 
              type: 'result',
              taskId: message.taskId,
              result 
            });
          } catch (error) {
            process.send({ 
              type: 'error',
              taskId: message.taskId,
              error: error.message 
            });
          }
        });
        
        // Signal ready
        process.send({ type: 'ready' });
      `;
      
      // Save process wrapper
      const processPath = path.join(this.config.agentDirectory, `${agentId}-process.js`);
      await fs.writeFile(processPath, processCode);
      
      // Spawn process
      const agentProcess = spawn('node', [processPath], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
      });
      
      // Set up process event handlers
      agentProcess.on('message', (message) => {
        this.handleAgentMessage(agentId, message);
      });
      
      agentProcess.on('error', (error) => {
        logger.error(`Agent ${agentId} process error:`, error);
        this.emit('agent:error', { agentId, error: error.message });
      });
      
      agentProcess.on('exit', (code) => {
        logger.info(`Agent ${agentId} process exited with code ${code}`);
        this.stopAgent(agentId);
      });
      
      // Capture output
      agentProcess.stdout.on('data', (data) => {
        logger.debug(`Agent ${agentId} stdout:`, data.toString());
      });
      
      agentProcess.stderr.on('data', (data) => {
        logger.error(`Agent ${agentId} stderr:`, data.toString());
      });
      
      this.agentProcesses.set(agentId, { type: 'process', process: agentProcess });
      
      // Update status
      agentMeta.status = 'running';
      agentMeta.lastActivity = Date.now();
      
    } catch (error) {
      logger.error(`Failed to start process agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Send task to agent
   */
  async sendTaskToAgent(agentId, task) {
    const agent = this.runningAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    if (agent.status !== 'running') {
      throw new Error(`Agent ${agentId} is not running (status: ${agent.status})`);
    }
    
    const process = this.agentProcesses.get(agentId);
    if (!process) {
      throw new Error(`Agent ${agentId} process not found`);
    }
    
    // Create task with ID
    const taskWithId = {
      ...task,
      taskId: task.taskId || uuidv4()
    };
    
    // Send task to agent
    if (process.type === 'worker') {
      process.worker.postMessage(taskWithId);
    } else if (process.type === 'process') {
      process.process.send(taskWithId);
    }
    
    // Update activity
    agent.lastActivity = Date.now();
    
    // Track task
    this.trackAgentTask(agentId, taskWithId);
    
    return taskWithId.taskId;
  }

  /**
   * Handle messages from agent
   */
  handleAgentMessage(agentId, message) {
    const agent = this.runningAgents.get(agentId);
    if (!agent) return;
    
    agent.lastActivity = Date.now();
    
    switch (message.type) {
      case 'ready':
        agent.status = 'running';
        this.emit('agent:ready', { agentId });
        break;
        
      case 'result':
        this.emit('agent:result', { 
          agentId, 
          taskId: message.taskId,
          result: message.result 
        });
        break;
        
      case 'error':
        this.emit('agent:task-error', { 
          agentId, 
          taskId: message.taskId,
          error: message.error 
        });
        break;
        
      default:
        this.emit('agent:message', { agentId, message });
    }
  }

  /**
   * Set up agent timeout
   */
  setupAgentTimeout(agentId) {
    const timeoutId = setTimeout(() => {
      const agent = this.runningAgents.get(agentId);
      if (agent) {
        const idleTime = Date.now() - agent.lastActivity;
        if (idleTime > this.config.agentTimeout) {
          logger.info(`Agent ${agentId} timed out after ${idleTime}ms of inactivity`);
          this.stopAgent(agentId);
        } else {
          // Reset timeout
          this.setupAgentTimeout(agentId);
        }
      }
    }, this.config.agentTimeout);
    
    // Store timeout ID
    const agent = this.runningAgents.get(agentId);
    if (agent) {
      agent.timeoutId = timeoutId;
    }
  }

  /**
   * Track agent task
   */
  trackAgentTask(agentId, task) {
    if (!this.agentStats.has(agentId)) {
      this.agentStats.set(agentId, {
        tasksReceived: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        totalProcessingTime: 0
      });
    }
    
    const stats = this.agentStats.get(agentId);
    stats.tasksReceived++;
    
    // Track task start time
    task.startTime = Date.now();
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId) {
    try {
      const agent = this.runningAgents.get(agentId);
      if (!agent) return;
      
      // Clear timeout
      if (agent.timeoutId) {
        clearTimeout(agent.timeoutId);
      }
      
      // Stop process/worker
      const process = this.agentProcesses.get(agentId);
      if (process) {
        if (process.type === 'worker') {
          await process.worker.terminate();
        } else if (process.type === 'process') {
          process.process.kill('SIGTERM');
        }
        this.agentProcesses.delete(agentId);
      }
      
      // Update status
      agent.status = 'stopped';
      
      // Clean up after delay
      setTimeout(async () => {
        // Remove agent files
        try {
          await fs.unlink(agent.path);
          await fs.unlink(agent.path.replace('.js', '-worker.js')).catch(() => {});
          await fs.unlink(agent.path.replace('.js', '-process.js')).catch(() => {});
        } catch (error) {
          logger.error(`Failed to clean up agent ${agentId} files:`, error);
        }
        
        this.runningAgents.delete(agentId);
      }, 5000);
      
      this.emit('agent:stopped', { agentId });
      logger.info(`Agent ${agentId} stopped`);
      
    } catch (error) {
      logger.error(`Failed to stop agent ${agentId}:`, error);
    }
  }

  /**
   * Stop all agents
   */
  async stopAllAgents() {
    const agentIds = Array.from(this.runningAgents.keys());
    
    await Promise.all(agentIds.map(agentId => this.stopAgent(agentId)));
    
    logger.info('All agents stopped');
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentId) {
    const agent = this.runningAgents.get(agentId);
    if (!agent) return null;
    
    const stats = this.agentStats.get(agentId);
    
    return {
      ...agent,
      stats: stats || {
        tasksReceived: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        totalProcessingTime: 0
      }
    };
  }

  /**
   * Get all agents status
   */
  getAllAgentsStatus() {
    return Array.from(this.runningAgents.keys()).map(agentId => 
      this.getAgentStatus(agentId)
    );
  }

  /**
   * Clean up
   */
  async shutdown() {
    await this.stopAllAgents();
    this.removeAllListeners();
    logger.info('Agent Runtime Manager shutdown complete');
  }
}

export default AgentRuntimeManager;