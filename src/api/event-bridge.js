/**
 * Event Bridge
 * 
 * Bridges core system events to WebSocket for real-time updates
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

export class EventBridge extends EventEmitter {
  constructor(io, config = {}) {
    super();
    
    this.io = io;
    this.config = {
      throttleDelay: config.throttleDelay || 100, // ms
      batchSize: config.batchSize || 10,
      ...config
    };
    
    // Event queues for batching
    this.eventQueues = new Map();
    this.throttleTimers = new Map();
    
    // Statistics
    this.stats = {
      eventsForwarded: 0,
      eventsBatched: 0,
      errors: 0
    };
  }
  
  /**
   * Connect a conversation engine to the bridge
   */
  connectConversation(conversationId, engine, stateManager, analytics) {
    logger.info(`Connecting conversation ${conversationId} to event bridge`);
    
    // ==================== Conversation Events ====================
    
    // Agent created
    engine.on('agentCreated', (agent) => {
      this.forwardEvent(`conversation:${conversationId}`, 'agent:created', {
        conversationId,
        agentId: agent.id,
        agentType: agent.type,
        model: agent.assignedModel?.name,
        timestamp: Date.now()
      });
      
      // Track in analytics
      if (analytics) {
        analytics.trackAgentCreation(agent.id, agent.type, agent.assignedModel?.id);
      }
    });
    
    // Agent response
    engine.on('agentResponse', (data) => {
      this.forwardEvent(`conversation:${conversationId}`, 'agent:response', {
        conversationId,
        agentId: data.agent,
        content: data.content,
        iteration: data.iteration,
        timestamp: Date.now()
      });
      
      // Track in analytics
      if (analytics) {
        analytics.trackAgentResponse(data.agent, {
          responseTime: data.responseTime || 0,
          tokens: data.tokens || 0,
          usedMCPTools: data.usedMCPTools || false
        });
      }
    });
    
    // Iteration complete
    engine.on('iterationComplete', (iteration) => {
      this.forwardEvent(`conversation:${conversationId}`, 'iteration:complete', {
        conversationId,
        iteration,
        agentCount: engine.activeAgents.size,
        messageCount: engine.conversationMemory.length,
        timestamp: Date.now()
      });
      
      // Auto-save state
      if (stateManager) {
        stateManager.updateConversation({
          conversationId,
          memory: engine.conversationMemory,
          agents: Array.from(engine.activeAgents.keys()),
          iteration
        });
      }
    });
    
    // Decision made
    engine.on('decisionMade', (decision) => {
      this.forwardEvent(`conversation:${conversationId}`, 'decision:made', {
        conversationId,
        decision,
        timestamp: Date.now()
      });
    });
    
    // MCP tool used
    engine.on('mcpToolUsed', (toolData) => {
      this.forwardEvent(`conversation:${conversationId}`, 'mcp:tool:used', {
        conversationId,
        tool: toolData.tool,
        server: toolData.server,
        agent: toolData.agent,
        timestamp: Date.now()
      });
    });
    
    // Conversation complete
    engine.on('conversationComplete', (summary) => {
      this.forwardEvent(`conversation:${conversationId}`, 'conversation:complete', {
        conversationId,
        summary,
        finalIteration: engine.currentIteration,
        totalAgents: engine.activeAgents.size,
        timestamp: Date.now()
      });
      
      // Save final state
      if (stateManager) {
        stateManager.createSnapshot(`Final state for conversation ${conversationId}`);
      }
    });
    
    // Error occurred
    engine.on('error', (error) => {
      this.forwardEvent(`conversation:${conversationId}`, 'conversation:error', {
        conversationId,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: Date.now()
      });
      
      this.stats.errors++;
    });
  }
  
  /**
   * Connect analytics to the bridge
   */
  connectAnalytics(analytics) {
    logger.info('Connecting analytics to event bridge');
    
    // Metrics aggregated
    analytics.on('metricsAggregated', (metrics) => {
      this.broadcastEvent('metrics:update', metrics);
    });
    
    // Alert triggered
    analytics.on('alertTriggered', (alert) => {
      this.broadcastEvent('alert:triggered', {
        ...alert,
        timestamp: Date.now()
      });
    });
    
    // Agent ranking changed
    analytics.on('rankingChanged', (rankings) => {
      this.broadcastEvent('rankings:update', rankings);
    });
  }
  
  /**
   * Connect cache to the bridge
   */
  connectCache(cache) {
    logger.info('Connecting cache to event bridge');
    
    // Cache hit
    cache.on('cacheHit', (data) => {
      this.throttledEvent('cache', 'cache:hit', data);
    });
    
    // Cache miss
    cache.on('cacheMiss', (data) => {
      this.throttledEvent('cache', 'cache:miss', data);
    });
    
    // Cache eviction
    cache.on('cacheEviction', (data) => {
      this.broadcastEvent('cache:eviction', data);
    });
    
    // Cache cleared
    cache.on('cacheCleared', (data) => {
      this.broadcastEvent('cache:cleared', data);
    });
  }
  
  /**
   * Connect state manager to the bridge
   */
  connectStateManager(stateManager) {
    logger.info('Connecting state manager to event bridge');
    
    // State saved
    stateManager.on('stateSaved', (data) => {
      this.broadcastEvent('state:saved', {
        conversationId: data.conversationId,
        timestamp: Date.now()
      });
    });
    
    // Snapshot created
    stateManager.on('snapshotCreated', (snapshot) => {
      this.broadcastEvent('snapshot:created', {
        id: snapshot.id,
        description: snapshot.description,
        timestamp: snapshot.timestamp
      });
    });
    
    // Branch created
    stateManager.on('branchCreated', (branch) => {
      this.broadcastEvent('branch:created', {
        id: branch.id,
        name: branch.name,
        parentSnapshot: branch.parentSnapshot,
        timestamp: Date.now()
      });
    });
    
    // State restored
    stateManager.on('stateRestored', (data) => {
      this.broadcastEvent('state:restored', {
        snapshotId: data.snapshotId,
        conversationId: data.conversationId,
        timestamp: Date.now()
      });
    });
  }
  
  /**
   * Forward event to specific room
   */
  forwardEvent(room, event, data) {
    try {
      this.io.to(room).emit(event, data);
      this.stats.eventsForwarded++;
      
      logger.debug(`Forwarded event ${event} to room ${room}`);
    } catch (error) {
      logger.error(`Failed to forward event ${event}:`, error);
      this.stats.errors++;
    }
  }
  
  /**
   * Broadcast event to all clients
   */
  broadcastEvent(event, data) {
    try {
      this.io.emit(event, data);
      this.stats.eventsForwarded++;
      
      logger.debug(`Broadcasted event ${event}`);
    } catch (error) {
      logger.error(`Failed to broadcast event ${event}:`, error);
      this.stats.errors++;
    }
  }
  
  /**
   * Throttled event emission
   */
  throttledEvent(category, event, data) {
    // Initialize queue if needed
    if (!this.eventQueues.has(category)) {
      this.eventQueues.set(category, []);
    }
    
    // Add to queue
    const queue = this.eventQueues.get(category);
    queue.push({ event, data, timestamp: Date.now() });
    
    // Clear existing timer
    if (this.throttleTimers.has(category)) {
      clearTimeout(this.throttleTimers.get(category));
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.flushEventQueue(category);
    }, this.config.throttleDelay);
    
    this.throttleTimers.set(category, timer);
    
    // Flush if queue is too large
    if (queue.length >= this.config.batchSize) {
      this.flushEventQueue(category);
    }
  }
  
  /**
   * Flush event queue for a category
   */
  flushEventQueue(category) {
    const queue = this.eventQueues.get(category);
    if (!queue || queue.length === 0) return;
    
    // Clear timer
    if (this.throttleTimers.has(category)) {
      clearTimeout(this.throttleTimers.get(category));
      this.throttleTimers.delete(category);
    }
    
    // Batch emit
    this.broadcastEvent(`${category}:batch`, {
      events: queue,
      count: queue.length,
      timestamp: Date.now()
    });
    
    this.stats.eventsBatched += queue.length;
    
    // Clear queue
    this.eventQueues.set(category, []);
  }
  
  /**
   * Get bridge statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueSizes: Object.fromEntries(
        Array.from(this.eventQueues.entries()).map(([key, queue]) => [key, queue.length])
      ),
      activeTimers: this.throttleTimers.size
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      eventsForwarded: 0,
      eventsBatched: 0,
      errors: 0
    };
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    // Clear all timers
    for (const timer of this.throttleTimers.values()) {
      clearTimeout(timer);
    }
    this.throttleTimers.clear();
    
    // Clear all queues
    this.eventQueues.clear();
    
    // Remove all listeners
    this.removeAllListeners();
    
    logger.info('Event bridge cleaned up');
  }
}

export default EventBridge;