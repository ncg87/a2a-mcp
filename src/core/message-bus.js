import Redis from 'redis';
import { EventEmitter } from 'eventemitter3';
import logger from '../utils/logger.js';

export class MessageBus extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.publisher = null;
    this.subscriber = null;
    this.subscriptions = new Map();
    this.connected = false;
  }

  async connect() {
    try {
      // Create Redis clients for publisher and subscriber
      this.publisher = Redis.createClient({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password
      });

      this.subscriber = Redis.createClient({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password
      });

      // Set up error handlers
      this.publisher.on('error', (error) => {
        logger.error('Redis publisher error:', error);
        this.emit('error', error);
      });

      this.subscriber.on('error', (error) => {
        logger.error('Redis subscriber error:', error);
        this.emit('error', error);
      });

      // Connect both clients
      await this.publisher.connect();
      await this.subscriber.connect();

      this.connected = true;
      logger.info('Message bus connected successfully');
      this.emit('connected');

    } catch (error) {
      logger.error('Failed to connect to message bus:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.publisher) {
        await this.publisher.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      this.connected = false;
      logger.info('Message bus disconnected');
      this.emit('disconnected');
    } catch (error) {
      logger.error('Error disconnecting from message bus:', error);
      throw error;
    }
  }

  async publish(channel, message) {
    if (!this.connected) {
      throw new Error('Message bus not connected');
    }

    try {
      await this.publisher.publish(channel, message);
      logger.debug(`Published message to channel ${channel}`);
    } catch (error) {
      logger.error(`Failed to publish to channel ${channel}:`, error);
      throw error;
    }
  }

  async subscribe(channel, handler) {
    if (!this.connected) {
      throw new Error('Message bus not connected');
    }

    try {
      // Store the handler for this channel
      this.subscriptions.set(channel, handler);

      // Subscribe to the channel
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          handler(parsedMessage);
        } catch (error) {
          logger.error(`Error parsing message from channel ${channel}:`, error);
          handler(message); // Send raw message if parsing fails
        }
      });

      logger.info(`Subscribed to channel ${channel}`);
    } catch (error) {
      logger.error(`Failed to subscribe to channel ${channel}:`, error);
      throw error;
    }
  }

  async unsubscribe(channel) {
    if (!this.connected) {
      return;
    }

    try {
      await this.subscriber.unsubscribe(channel);
      this.subscriptions.delete(channel);
      logger.info(`Unsubscribed from channel ${channel}`);
    } catch (error) {
      logger.error(`Failed to unsubscribe from channel ${channel}:`, error);
      throw error;
    }
  }

  async publishTask(task) {
    const message = {
      type: 'task',
      id: task.id,
      payload: task,
      timestamp: Date.now()
    };
    
    await this.publish(this.config.channels.task_queue, JSON.stringify(message));
  }

  async subscribeToTasks(handler) {
    await this.subscribe(this.config.channels.task_queue, handler);
  }

  async publishAgentStatus(agentId, status) {
    const message = {
      type: 'status_update',
      agentId,
      status,
      timestamp: Date.now()
    };
    
    await this.publish(this.config.channels.agent_status, JSON.stringify(message));
  }

  async subscribeToAgentStatus(handler) {
    await this.subscribe(this.config.channels.agent_status, handler);
  }

  async publishResult(result) {
    const message = {
      type: 'result',
      payload: result,
      timestamp: Date.now()
    };
    
    await this.publish(this.config.channels.results, JSON.stringify(message));
  }

  async subscribeToResults(handler) {
    await this.subscribe(this.config.channels.results, handler);
  }

  // Pattern-based subscription for flexible message routing
  async psubscribe(pattern, handler) {
    if (!this.connected) {
      throw new Error('Message bus not connected');
    }

    try {
      await this.subscriber.pSubscribe(pattern, (message, channel) => {
        try {
          const parsedMessage = JSON.parse(message);
          handler(parsedMessage, channel);
        } catch (error) {
          logger.error(`Error parsing message from pattern ${pattern}:`, error);
          handler(message, channel);
        }
      });

      logger.info(`Subscribed to pattern ${pattern}`);
    } catch (error) {
      logger.error(`Failed to subscribe to pattern ${pattern}:`, error);
      throw error;
    }
  }

  // Request-response pattern for direct agent communication
  async request(targetAgentId, message, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const requestId = require('uuid').v4();
      const responseChannel = `response:${requestId}`;
      
      // Set up timeout
      const timer = setTimeout(() => {
        this.unsubscribe(responseChannel);
        reject(new Error('Request timeout'));
      }, timeout);

      // Subscribe to response channel
      this.subscribe(responseChannel, (response) => {
        clearTimeout(timer);
        this.unsubscribe(responseChannel);
        resolve(response);
      });

      // Send request
      const request = {
        type: 'request',
        requestId,
        targetAgentId,
        responseChannel,
        payload: message,
        timestamp: Date.now()
      };

      this.publish(`agent:${targetAgentId}`, JSON.stringify(request));
    });
  }

  async respond(requestId, responseChannel, response) {
    const message = {
      type: 'response',
      requestId,
      payload: response,
      timestamp: Date.now()
    };

    await this.publish(responseChannel, JSON.stringify(message));
  }

  // Health check methods
  async ping() {
    try {
      if (this.publisher) {
        await this.publisher.ping();
      }
      return true;
    } catch (error) {
      logger.error('Message bus ping failed:', error);
      return false;
    }
  }

  getConnectionStatus() {
    return {
      connected: this.connected,
      subscriptions: Array.from(this.subscriptions.keys())
    };
  }
}

export default MessageBus;