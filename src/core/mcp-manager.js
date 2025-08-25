import { EventEmitter } from 'eventemitter3';
import logger from '../utils/logger.js';

export class MCPManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.servers = new Map();
    this.healthCheckInterval = null;
  }

  async initialize() {
    logger.info('Initializing MCP Manager');
    
    // Connect to all configured MCP servers
    for (const serverConfig of this.config.mcp_servers) {
      await this.connectServer(serverConfig);
    }

    // Start health checking
    this.startHealthChecking();
    
    logger.info(`MCP Manager initialized with ${this.servers.size} servers`);
  }

  async connectServer(serverConfig) {
    try {
      logger.info(`Connecting to MCP server: ${serverConfig.id}`);
      
      const server = new MCPServerConnection(serverConfig);
      await server.connect();
      
      this.servers.set(serverConfig.id, server);
      
      // Set up event handlers
      server.on('disconnected', () => {
        logger.warn(`MCP server ${serverConfig.id} disconnected`);
        this.emit('server-disconnected', serverConfig.id);
      });

      server.on('error', (error) => {
        logger.error(`MCP server ${serverConfig.id} error:`, error);
        this.emit('server-error', serverConfig.id, error);
      });

      logger.info(`Successfully connected to MCP server: ${serverConfig.id}`);
      this.emit('server-connected', serverConfig.id);
      
    } catch (error) {
      logger.error(`Failed to connect to MCP server ${serverConfig.id}:`, error);
      throw error;
    }
  }

  async disconnectServer(serverId) {
    const server = this.servers.get(serverId);
    if (server) {
      await server.disconnect();
      this.servers.delete(serverId);
      logger.info(`Disconnected from MCP server: ${serverId}`);
    }
  }

  async invokeTool(serverId, toolName, parameters) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server ${serverId} not found or not connected`);
    }

    if (!server.isConnected()) {
      throw new Error(`MCP server ${serverId} is not connected`);
    }

    try {
      logger.debug(`Invoking tool ${toolName} on server ${serverId}`);
      const result = await server.invokeTool(toolName, parameters);
      return result;
    } catch (error) {
      logger.error(`Tool invocation failed on server ${serverId}:`, error);
      throw error;
    }
  }

  getServerByCapability(capability) {
    for (const [id, server] of this.servers) {
      if (server.hasCapability(capability)) {
        return { id, server };
      }
    }
    return null;
  }

  getServersByCapability(capability) {
    const matches = [];
    for (const [id, server] of this.servers) {
      if (server.hasCapability(capability)) {
        matches.push({ id, server });
      }
    }
    return matches;
  }

  getAllServers() {
    return Array.from(this.servers.entries()).map(([id, server]) => ({
      id,
      type: server.getType(),
      capabilities: server.getCapabilities(),
      status: server.getStatus(),
      tools: server.getAvailableTools()
    }));
  }

  startHealthChecking() {
    const interval = this.config.monitoring?.health_check_interval || 30000;
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);
  }

  async performHealthCheck() {
    for (const [id, server] of this.servers) {
      try {
        const isHealthy = await server.healthCheck();
        if (!isHealthy) {
          logger.warn(`Health check failed for MCP server: ${id}`);
          this.emit('server-unhealthy', id);
        }
      } catch (error) {
        logger.error(`Health check error for server ${id}:`, error);
        this.emit('server-error', id, error);
      }
    }
  }

  async shutdown() {
    logger.info('Shutting down MCP Manager');
    
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Disconnect all servers
    const disconnectPromises = Array.from(this.servers.keys()).map(id => 
      this.disconnectServer(id)
    );
    
    await Promise.all(disconnectPromises);
    logger.info('MCP Manager shutdown complete');
  }
}

class MCPServerConnection extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.connected = false;
    this.client = null;
    this.tools = new Map();
  }

  async connect() {
    try {
      // This would be the actual MCP client implementation
      // For now, we'll simulate the connection
      this.client = await this.createMCPClient();
      
      // Initialize available tools
      await this.loadAvailableTools();
      
      this.connected = true;
      logger.debug(`MCP server ${this.config.id} connected`);
      
    } catch (error) {
      logger.error(`Failed to connect MCP server ${this.config.id}:`, error);
      throw error;
    }
  }

  async createMCPClient() {
    // This is a mock implementation
    // In reality, this would create an actual MCP client based on the server type
    
    switch (this.config.type) {
      case 'database':
        return new DatabaseMCPClient(this.config);
      case 'git':
        return new GitMCPClient(this.config);
      case 'filesystem':
        return new FileSystemMCPClient(this.config);
      case 'web-api':
        return new WebAPIMCPClient(this.config);
      case 'testing':
        return new TestingMCPClient(this.config);
      case 'security':
        return new SecurityMCPClient(this.config);
      default:
        throw new Error(`Unknown MCP server type: ${this.config.type}`);
    }
  }

  async loadAvailableTools() {
    if (this.config.tools) {
      this.config.tools.forEach(tool => {
        this.tools.set(tool, { name: tool, available: true });
      });
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
    }
    this.connected = false;
    this.emit('disconnected');
  }

  async invokeTool(toolName, parameters) {
    if (!this.connected) {
      throw new Error('MCP server not connected');
    }

    if (!this.tools.has(toolName)) {
      throw new Error(`Tool ${toolName} not available on this server`);
    }

    return await this.client.invokeTool(toolName, parameters);
  }

  async healthCheck() {
    if (!this.connected) {
      return false;
    }

    try {
      return await this.client.ping();
    } catch (error) {
      return false;
    }
  }

  isConnected() {
    return this.connected;
  }

  getType() {
    return this.config.type;
  }

  getCapabilities() {
    return this.config.capabilities || [];
  }

  hasCapability(capability) {
    return this.getCapabilities().includes(capability);
  }

  getAvailableTools() {
    return Array.from(this.tools.keys());
  }

  getStatus() {
    return {
      connected: this.connected,
      endpoint: this.config.endpoint,
      toolCount: this.tools.size
    };
  }
}

// Mock MCP Client implementations
class DatabaseMCPClient {
  constructor(config) {
    this.config = config;
  }

  async invokeTool(toolName, parameters) {
    // Mock database operations
    switch (toolName) {
      case 'query':
        return { rows: [], rowCount: 0 };
      case 'migrate':
        return { success: true, message: 'Migration completed' };
      default:
        throw new Error(`Unknown database tool: ${toolName}`);
    }
  }

  async ping() {
    return true;
  }

  async disconnect() {
    // Mock disconnect
  }
}

class GitMCPClient {
  constructor(config) {
    this.config = config;
  }

  async invokeTool(toolName, parameters) {
    // Mock git operations
    switch (toolName) {
      case 'clone':
        return { success: true, path: parameters.path };
      case 'commit':
        return { success: true, hash: 'abc123' };
      default:
        throw new Error(`Unknown git tool: ${toolName}`);
    }
  }

  async ping() {
    return true;
  }

  async disconnect() {
    // Mock disconnect
  }
}

class FileSystemMCPClient {
  constructor(config) {
    this.config = config;
  }

  async invokeTool(toolName, parameters) {
    // Mock file system operations
    switch (toolName) {
      case 'read':
        return { content: 'file content', size: 100 };
      case 'write':
        return { success: true, bytesWritten: parameters.content?.length || 0 };
      default:
        throw new Error(`Unknown filesystem tool: ${toolName}`);
    }
  }

  async ping() {
    return true;
  }

  async disconnect() {
    // Mock disconnect
  }
}

class WebAPIMCPClient {
  constructor(config) {
    this.config = config;
  }

  async invokeTool(toolName, parameters) {
    // Mock web API operations
    switch (toolName) {
      case 'http-get':
        return { status: 200, data: {} };
      case 'http-post':
        return { status: 201, data: { id: 'new-resource' } };
      default:
        throw new Error(`Unknown web API tool: ${toolName}`);
    }
  }

  async ping() {
    return true;
  }

  async disconnect() {
    // Mock disconnect
  }
}

class TestingMCPClient {
  constructor(config) {
    this.config = config;
  }

  async invokeTool(toolName, parameters) {
    // Mock testing operations
    switch (toolName) {
      case 'unit-test':
        return { passed: 5, failed: 0, coverage: 85 };
      case 'integration-test':
        return { passed: 3, failed: 1, duration: 120 };
      default:
        throw new Error(`Unknown testing tool: ${toolName}`);
    }
  }

  async ping() {
    return true;
  }

  async disconnect() {
    // Mock disconnect
  }
}

class SecurityMCPClient {
  constructor(config) {
    this.config = config;
  }

  async invokeTool(toolName, parameters) {
    // Mock security operations
    switch (toolName) {
      case 'vulnerability-scan':
        return { vulnerabilities: [], riskLevel: 'low' };
      case 'compliance-check':
        return { compliant: true, issues: [] };
      default:
        throw new Error(`Unknown security tool: ${toolName}`);
    }
  }

  async ping() {
    return true;
  }

  async disconnect() {
    // Mock disconnect
  }
}

export default MCPManager;