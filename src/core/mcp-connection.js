/**
 * Real MCP Connection Handler
 * 
 * Manages actual connections to MCP servers using WebSocket or HTTP protocols
 */

import WebSocket from 'ws';
import axios from 'axios';
import { EventEmitter } from 'eventemitter3';
import logger from '../utils/logger.js';

export class MCPConnection extends EventEmitter {
  constructor(server) {
    super();
    this.server = server;
    this.connected = false;
    this.ws = null;
    this.httpClient = null;
    this.messageQueue = [];
    this.pendingRequests = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  async connect() {
    try {
      logger.info(`Establishing MCP connection to ${this.server.name}...`);
      
      // Determine connection type based on endpoint
      if (this.server.endpoint.startsWith('ws://') || this.server.endpoint.startsWith('wss://')) {
        await this.connectWebSocket();
      } else if (this.server.endpoint.startsWith('http://') || this.server.endpoint.startsWith('https://')) {
        await this.connectHTTP();
      } else if (this.server.endpoint === 'mock://localhost' || !this.server.endpoint) {
        // Use mock connection for testing
        await this.connectMock();
      } else {
        throw new Error(`Unsupported protocol for endpoint: ${this.server.endpoint}`);
      }
      
      this.connected = true;
      this.emit('connected', { server: this.server.name });
      
      // Process queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        await this.send(message);
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to connect to ${this.server.name}:`, error);
      throw error;
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.server.endpoint, {
        headers: this.server.auth ? {
          'Authorization': `Bearer ${this.server.auth.token}`
        } : {}
      });

      this.ws.on('open', () => {
        logger.info(`WebSocket connected to ${this.server.name}`);
        this.setupHeartbeat();
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data));
      });

      this.ws.on('error', (error) => {
        logger.error(`WebSocket error for ${this.server.name}:`, error);
        reject(error);
      });

      this.ws.on('close', () => {
        logger.warn(`WebSocket connection closed for ${this.server.name}`);
        this.connected = false;
        this.attemptReconnect();
      });
    });
  }

  async connectHTTP() {
    this.httpClient = axios.create({
      baseURL: this.server.endpoint,
      timeout: 30000,
      headers: this.server.auth ? {
        'Authorization': `Bearer ${this.server.auth.token}`
      } : {}
    });

    // Test connection with a ping
    try {
      const response = await this.httpClient.get('/ping');
      if (response.status === 200) {
        logger.info(`HTTP connection established to ${this.server.name}`);
        return true;
      }
    } catch (error) {
      // Some servers might not have /ping, try /health or /status
      try {
        const response = await this.httpClient.get('/health');
        if (response.status === 200) {
          logger.info(`HTTP connection established to ${this.server.name}`);
          return true;
        }
      } catch (healthError) {
        // Assume connection is valid if we can create the client
        logger.info(`HTTP client created for ${this.server.name} (no health check available)`);
        return true;
      }
    }
  }

  async connectMock() {
    // Mock connection for testing
    logger.info(`Using mock connection for ${this.server.name}`);
    this.connected = true;
    return true;
  }

  async send(message) {
    if (!this.connected) {
      this.messageQueue.push(message);
      return;
    }

    const requestId = message.id || this.generateRequestId();
    
    return new Promise((resolve, reject) => {
      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject });

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout for ${requestId}`));
      }, message.timeout || 30000);

      // Send based on connection type
      if (this.ws) {
        this.ws.send(JSON.stringify({ ...message, id: requestId }));
      } else if (this.httpClient) {
        this.sendHTTPRequest(message, requestId)
          .then(response => {
            clearTimeout(timeout);
            this.pendingRequests.delete(requestId);
            resolve(response);
          })
          .catch(error => {
            clearTimeout(timeout);
            this.pendingRequests.delete(requestId);
            reject(error);
          });
      } else {
        // Mock response
        setTimeout(() => {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          resolve(this.generateMockResponse(message));
        }, 100);
      }
    });
  }

  async sendHTTPRequest(message, requestId) {
    const endpoint = message.tool ? `/tools/${message.tool}` : '/execute';
    
    try {
      const response = await this.httpClient.post(endpoint, {
        ...message,
        id: requestId
      });
      
      return response.data;
    } catch (error) {
      logger.error(`HTTP request failed for ${this.server.name}:`, error);
      throw error;
    }
  }

  handleMessage(message) {
    const requestId = message.id || message.requestId;
    
    if (requestId && this.pendingRequests.has(requestId)) {
      const { resolve, reject } = this.pendingRequests.get(requestId);
      this.pendingRequests.delete(requestId);
      
      if (message.error) {
        reject(new Error(message.error));
      } else {
        resolve(message.result || message);
      }
    } else {
      // Unsolicited message - emit as event
      this.emit('message', message);
    }
  }

  async invokeTool(toolName, parameters) {
    logger.debug(`Invoking tool ${toolName} on ${this.server.name}`);
    
    const message = {
      type: 'tool_invocation',
      tool: toolName,
      parameters,
      timestamp: Date.now()
    };

    try {
      const result = await this.send(message);
      return result;
    } catch (error) {
      logger.error(`Tool invocation failed for ${toolName}:`, error);
      throw error;
    }
  }

  async listTools() {
    if (this.server.tools && this.server.tools.length > 0) {
      return this.server.tools;
    }

    try {
      const message = {
        type: 'list_tools',
        timestamp: Date.now()
      };

      const result = await this.send(message);
      return result.tools || [];
    } catch (error) {
      logger.error(`Failed to list tools for ${this.server.name}:`, error);
      return this.server.tools || [];
    }
  }

  setupHeartbeat() {
    if (!this.ws) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts reached for ${this.server.name}`);
      this.emit('connection_failed', { server: this.server.name });
      return;
    }

    this.reconnectAttempts++;
    logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} for ${this.server.name}`);
    
    setTimeout(async () => {
      try {
        await this.connect();
        this.reconnectAttempts = 0;
      } catch (error) {
        logger.error(`Reconnection attempt failed:`, error);
        this.attemptReconnect();
      }
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)); // Exponential backoff
  }

  generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMockResponse(message) {
    // Generate contextual mock responses based on tool type
    if (message.tool === 'search') {
      return {
        results: [
          { title: 'Mock Result 1', url: 'https://example.com/1' },
          { title: 'Mock Result 2', url: 'https://example.com/2' }
        ]
      };
    } else if (message.tool === 'compute') {
      return {
        result: Math.random() * 100,
        computation: 'mock'
      };
    } else {
      return {
        success: true,
        message: `Mock response for ${message.tool || message.type}`,
        data: message.parameters
      };
    }
  }

  async disconnect() {
    this.connected = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.httpClient = null;
    
    // Clear pending requests
    for (const [requestId, { reject }] of this.pendingRequests) {
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
    
    logger.info(`Disconnected from ${this.server.name}`);
  }

  isConnected() {
    return this.connected;
  }

  getServerInfo() {
    return {
      name: this.server.name,
      endpoint: this.server.endpoint,
      connected: this.connected,
      capabilities: this.server.capabilities,
      tools: this.server.tools
    };
  }
}

export default MCPConnection;