import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

export class BaseAgent extends EventEmitter {
  constructor(config) {
    super();
    this.id = config.id || uuidv4();
    this.type = config.type;
    this.capabilities = config.capabilities || [];
    this.status = 'initializing';
    this.workload = new Map();
    this.mcpClients = new Map();
    this.messageBus = null;
    this.config = config;
    this.heartbeatInterval = null;
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on('task-assigned', this.handleTaskAssigned.bind(this));
    this.on('task-completed', this.handleTaskCompleted.bind(this));
    this.on('task-failed', this.handleTaskFailed.bind(this));
    this.on('shutdown', this.handleShutdown.bind(this));
  }

  async initialize() {
    try {
      logger.info(`Initializing agent ${this.id} of type ${this.type}`);
      
      // Connect to message bus
      await this.connectToMessageBus();
      
      // Register with agent discovery service
      await this.registerWithDiscovery();
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Set status to ready
      this.status = 'ready';
      
      logger.info(`Agent ${this.id} initialized successfully`);
      this.emit('initialized');
      
    } catch (error) {
      logger.error(`Failed to initialize agent ${this.id}:`, error);
      this.status = 'error';
      throw error;
    }
  }

  async connectToMessageBus() {
    // Implementation depends on message bus type (Redis, RabbitMQ, etc.)
    // This is a placeholder that will be implemented by the MessageBus class
    logger.debug(`Connecting agent ${this.id} to message bus`);
  }

  async registerWithDiscovery() {
    const registration = {
      id: this.id,
      type: this.type,
      capabilities: this.capabilities,
      status: this.status,
      timestamp: Date.now()
    };
    
    // Publish registration to discovery channel
    if (this.messageBus) {
      await this.messageBus.publish('agent-discovery', JSON.stringify(registration));
    }
    
    logger.debug(`Agent ${this.id} registered with discovery service`);
  }

  startHeartbeat() {
    const interval = this.config.heartbeatInterval || 30000;
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat();
    }, interval);
  }

  async sendHeartbeat() {
    const heartbeat = {
      agentId: this.id,
      status: this.status,
      workloadSize: this.workload.size,
      timestamp: Date.now()
    };
    
    if (this.messageBus) {
      await this.messageBus.publish('agent-status', JSON.stringify(heartbeat));
    }
  }

  async handleTaskAssigned(task) {
    try {
      logger.info(`Agent ${this.id} received task ${task.id}`);
      this.workload.set(task.id, { ...task, status: 'in-progress', startTime: Date.now() });
      
      // Process the task (to be implemented by subclasses)
      const result = await this.processTask(task);
      
      // Mark task as completed
      this.workload.delete(task.id);
      this.emit('task-completed', { taskId: task.id, result });
      
    } catch (error) {
      logger.error(`Agent ${this.id} failed to process task ${task.id}:`, error);
      this.workload.delete(task.id);
      this.emit('task-failed', { taskId: task.id, error: error.message });
    }
  }

  async processTask(task) {
    // To be implemented by subclasses
    throw new Error(`processTask must be implemented by subclass ${this.constructor.name}`);
  }

  async handleTaskCompleted(data) {
    logger.info(`Task ${data.taskId} completed by agent ${this.id}`);
    
    // Send result to coordinator or requesting agent
    if (this.messageBus) {
      const message = {
        type: 'task-result',
        agentId: this.id,
        taskId: data.taskId,
        result: data.result,
        timestamp: Date.now()
      };
      await this.messageBus.publish('results', JSON.stringify(message));
    }
  }

  async handleTaskFailed(data) {
    logger.error(`Task ${data.taskId} failed on agent ${this.id}: ${data.error}`);
    
    // Send failure notification
    if (this.messageBus) {
      const message = {
        type: 'task-failure',
        agentId: this.id,
        taskId: data.taskId,
        error: data.error,
        timestamp: Date.now()
      };
      await this.messageBus.publish('results', JSON.stringify(message));
    }
  }

  async handleShutdown() {
    logger.info(`Shutting down agent ${this.id}`);
    
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close MCP connections
    for (const [id, client] of this.mcpClients) {
      await client.disconnect();
    }
    
    // Update status
    this.status = 'shutdown';
    await this.sendHeartbeat();
    
    // Disconnect from message bus
    if (this.messageBus) {
      await this.messageBus.disconnect();
    }
  }

  async connectToMCPServer(serverConfig) {
    try {
      const mcpClient = new MCPClient(serverConfig);
      await mcpClient.connect();
      this.mcpClients.set(serverConfig.id, mcpClient);
      logger.info(`Agent ${this.id} connected to MCP server ${serverConfig.id}`);
      return mcpClient;
    } catch (error) {
      logger.error(`Failed to connect to MCP server ${serverConfig.id}:`, error);
      throw error;
    }
  }

  async invokeMCPTool(serverId, toolName, parameters) {
    const client = this.mcpClients.get(serverId);
    if (!client) {
      throw new Error(`MCP server ${serverId} not connected`);
    }
    
    return await client.invokeTool(toolName, parameters);
  }

  getCapabilities() {
    return this.capabilities;
  }

  getStatus() {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      workloadSize: this.workload.size,
      capabilities: this.capabilities
    };
  }

  canHandleTask(task) {
    // Check if agent capabilities match task requirements
    if (!task.requiredCapabilities) return true;
    
    return task.requiredCapabilities.every(cap => 
      this.capabilities.includes(cap)
    );
  }
}

// Import the real MCP client
import RealMCPClient from './real-mcp-client.js';

// Use RealMCPClient as MCPClient
const MCPClient = RealMCPClient;

export { MCPClient };