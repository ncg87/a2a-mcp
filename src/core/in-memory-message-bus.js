import { EventEmitter } from 'eventemitter3';
import logger from '../utils/logger.js';

/**
 * In-Memory Message Bus for Testing
 * Simulates Redis message bus functionality without external dependencies
 */
export class InMemoryMessageBus extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.subscriptions = new Map();
    this.connected = false;
    this.messageStore = new Map(); // Store messages by channel
  }

  async connect() {
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.connected = true;
      logger.info('In-Memory message bus connected successfully');
      this.emit('connected');
      
      return true;
    } catch (error) {
      logger.error('Failed to connect to in-memory message bus:', error);
      throw error;
    }
  }

  async disconnect() {
    this.connected = false;
    this.subscriptions.clear();
    this.messageStore.clear();
    this.emit('disconnected');
    logger.info('In-Memory message bus disconnected');
  }

  async subscribe(channel, handler) {
    if (!this.connected) {
      throw new Error('Message bus not connected');
    }

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    
    this.subscriptions.get(channel).add(handler);
    logger.debug(`Subscribed to channel: ${channel}`);
  }

  async unsubscribe(channel, handler) {
    if (this.subscriptions.has(channel)) {
      this.subscriptions.get(channel).delete(handler);
      
      // Clean up empty channel subscriptions
      if (this.subscriptions.get(channel).size === 0) {
        this.subscriptions.delete(channel);
      }
    }
    
    logger.debug(`Unsubscribed from channel: ${channel}`);
  }

  async publish(channel, message) {
    if (!this.connected) {
      throw new Error('Message bus not connected');
    }

    // Store the message
    if (!this.messageStore.has(channel)) {
      this.messageStore.set(channel, []);
    }
    this.messageStore.get(channel).push({
      message,
      timestamp: Date.now()
    });

    // Deliver to subscribers
    if (this.subscriptions.has(channel)) {
      const handlers = this.subscriptions.get(channel);
      
      // Simulate async message delivery
      process.nextTick(() => {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            logger.error(`Error in message handler for channel ${channel}:`, error);
          }
        });
      });
    }

    logger.debug(`Published message to channel: ${channel}`);
  }

  async getMessages(channel, limit = 10) {
    if (!this.messageStore.has(channel)) {
      return [];
    }
    
    const messages = this.messageStore.get(channel);
    return messages.slice(-limit);
  }

  async clearChannel(channel) {
    if (this.messageStore.has(channel)) {
      this.messageStore.delete(channel);
      logger.debug(`Cleared messages for channel: ${channel}`);
    }
  }

  getChannels() {
    return Array.from(this.subscriptions.keys());
  }

  getSubscriberCount(channel) {
    return this.subscriptions.has(channel) ? this.subscriptions.get(channel).size : 0;
  }

  isConnected() {
    return this.connected;
  }

  // Health check method
  async ping() {
    return this.connected ? 'PONG' : null;
  }

  // Get statistics
  getStats() {
    return {
      connected: this.connected,
      channels: this.subscriptions.size,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce((sum, handlers) => sum + handlers.size, 0),
      totalMessages: Array.from(this.messageStore.values()).reduce((sum, messages) => sum + messages.length, 0)
    };
  }
}

export default InMemoryMessageBus;