/**
 * Conversation State Manager
 * 
 * Handles persistence, recovery, and management of conversation states
 * Enables resuming conversations, branching, and rollback capabilities
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { EventEmitter } from 'events';

export class ConversationStateManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      statePath: config.statePath || './conversation-states',
      autoSaveInterval: config.autoSaveInterval || 30000, // 30 seconds
      maxSnapshots: config.maxSnapshots || 10,
      compressionEnabled: config.compressionEnabled || true,
      ...config
    };
    
    this.states = new Map();
    this.currentStateId = null;
    this.snapshots = [];
    this.autoSaveTimer = null;
    this.isDirty = false;
  }
  
  /**
   * Initialize state manager
   */
  async initialize() {
    try {
      await fs.mkdir(this.config.statePath, { recursive: true });
      await this.loadRecentStates();
      this.startAutoSave();
      
      logger.info(`State manager initialized with ${this.states.size} states`);
    } catch (error) {
      logger.error('Failed to initialize state manager:', error);
      throw error;
    }
  }
  
  /**
   * Create a new conversation state
   */
  createState(conversationData) {
    const stateId = uuidv4();
    const state = {
      id: stateId,
      created: Date.now(),
      updated: Date.now(),
      data: {
        objective: conversationData.objective,
        agents: Array.from(conversationData.agents || []),
        memory: conversationData.memory || [],
        decisions: conversationData.decisions || [],
        context: conversationData.context || {},
        iteration: conversationData.iteration || 0,
        status: 'active'
      },
      metadata: {
        modelVersions: conversationData.modelVersions || {},
        totalTokens: 0,
        totalCost: 0,
        duration: 0
      },
      snapshots: [],
      branches: []
    };
    
    this.states.set(stateId, state);
    this.currentStateId = stateId;
    this.isDirty = true;
    
    this.emit('stateCreated', state);
    
    return stateId;
  }
  
  /**
   * Save current state to disk
   */
  async saveState(stateId = this.currentStateId) {
    if (!stateId || !this.states.has(stateId)) {
      throw new Error(`State ${stateId} not found`);
    }
    
    const state = this.states.get(stateId);
    state.updated = Date.now();
    
    const filename = `state-${stateId}.json`;
    const filepath = path.join(this.config.statePath, filename);
    
    try {
      const data = JSON.stringify(state, null, 2);
      await fs.writeFile(filepath, data, 'utf8');
      
      this.isDirty = false;
      logger.info(`Saved conversation state: ${stateId}`);
      
      this.emit('stateSaved', { stateId, filepath });
      
      return filepath;
    } catch (error) {
      logger.error(`Failed to save state ${stateId}:`, error);
      throw error;
    }
  }
  
  /**
   * Load state from disk
   */
  async loadState(stateId) {
    const filename = `state-${stateId}.json`;
    const filepath = path.join(this.config.statePath, filename);
    
    try {
      const data = await fs.readFile(filepath, 'utf8');
      const state = JSON.parse(data);
      
      this.states.set(stateId, state);
      this.currentStateId = stateId;
      
      logger.info(`Loaded conversation state: ${stateId}`);
      this.emit('stateLoaded', state);
      
      return state;
    } catch (error) {
      logger.error(`Failed to load state ${stateId}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a snapshot of current state
   */
  async createSnapshot(description = '') {
    if (!this.currentStateId) {
      throw new Error('No active conversation state');
    }
    
    const state = this.states.get(this.currentStateId);
    const snapshot = {
      id: uuidv4(),
      stateId: this.currentStateId,
      created: Date.now(),
      description,
      data: JSON.parse(JSON.stringify(state.data)), // Deep clone
      metadata: { ...state.metadata }
    };
    
    state.snapshots.push(snapshot);
    
    // Limit snapshots
    if (state.snapshots.length > this.config.maxSnapshots) {
      state.snapshots.shift();
    }
    
    this.isDirty = true;
    
    logger.info(`Created snapshot: ${snapshot.id}`);
    this.emit('snapshotCreated', snapshot);
    
    return snapshot.id;
  }
  
  /**
   * Restore from snapshot
   */
  async restoreSnapshot(snapshotId) {
    if (!this.currentStateId) {
      throw new Error('No active conversation state');
    }
    
    const state = this.states.get(this.currentStateId);
    const snapshot = state.snapshots.find(s => s.id === snapshotId);
    
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }
    
    // Save current state as snapshot before restoring
    await this.createSnapshot(`Before restore from ${snapshotId}`);
    
    // Restore snapshot data
    state.data = JSON.parse(JSON.stringify(snapshot.data));
    state.metadata = { ...snapshot.metadata };
    state.updated = Date.now();
    
    this.isDirty = true;
    
    logger.info(`Restored from snapshot: ${snapshotId}`);
    this.emit('snapshotRestored', snapshot);
    
    return state;
  }
  
  /**
   * Create a branch from current state
   */
  async createBranch(branchName) {
    if (!this.currentStateId) {
      throw new Error('No active conversation state');
    }
    
    const parentState = this.states.get(this.currentStateId);
    const branchId = uuidv4();
    
    const branchState = {
      ...JSON.parse(JSON.stringify(parentState)),
      id: branchId,
      parentId: this.currentStateId,
      branchName,
      created: Date.now(),
      updated: Date.now()
    };
    
    this.states.set(branchId, branchState);
    parentState.branches.push({
      id: branchId,
      name: branchName,
      created: Date.now()
    });
    
    this.isDirty = true;
    
    logger.info(`Created branch: ${branchName} (${branchId})`);
    this.emit('branchCreated', { branchId, branchName, parentId: this.currentStateId });
    
    return branchId;
  }
  
  /**
   * Switch to a different branch
   */
  async switchBranch(branchId) {
    if (!this.states.has(branchId)) {
      throw new Error(`Branch ${branchId} not found`);
    }
    
    // Save current state before switching
    if (this.isDirty && this.currentStateId) {
      await this.saveState();
    }
    
    this.currentStateId = branchId;
    
    logger.info(`Switched to branch: ${branchId}`);
    this.emit('branchSwitched', branchId);
    
    return this.states.get(branchId);
  }
  
  /**
   * Update conversation data
   */
  updateConversation(updates) {
    if (!this.currentStateId) {
      throw new Error('No active conversation state');
    }
    
    const state = this.states.get(this.currentStateId);
    
    // Update data
    if (updates.memory) {
      state.data.memory.push(...updates.memory);
    }
    
    if (updates.agents) {
      state.data.agents = Array.from(new Set([...state.data.agents, ...updates.agents]));
    }
    
    if (updates.decisions) {
      state.data.decisions.push(...updates.decisions);
    }
    
    if (updates.context) {
      state.data.context = { ...state.data.context, ...updates.context };
    }
    
    if (updates.iteration !== undefined) {
      state.data.iteration = updates.iteration;
    }
    
    // Update metadata
    if (updates.tokens) {
      state.metadata.totalTokens += updates.tokens;
    }
    
    if (updates.cost) {
      state.metadata.totalCost += updates.cost;
    }
    
    state.updated = Date.now();
    this.isDirty = true;
    
    this.emit('stateUpdated', { stateId: this.currentStateId, updates });
  }
  
  /**
   * Get current state
   */
  getCurrentState() {
    if (!this.currentStateId) {
      return null;
    }
    
    return this.states.get(this.currentStateId);
  }
  
  /**
   * Get state history
   */
  getStateHistory(stateId = this.currentStateId) {
    if (!stateId || !this.states.has(stateId)) {
      return [];
    }
    
    const state = this.states.get(stateId);
    const history = [];
    
    // Add snapshots
    state.snapshots.forEach(snapshot => {
      history.push({
        type: 'snapshot',
        id: snapshot.id,
        created: snapshot.created,
        description: snapshot.description
      });
    });
    
    // Add branches
    state.branches.forEach(branch => {
      history.push({
        type: 'branch',
        id: branch.id,
        created: branch.created,
        name: branch.name
      });
    });
    
    // Sort by creation time
    history.sort((a, b) => a.created - b.created);
    
    return history;
  }
  
  /**
   * Load recent states from disk
   */
  async loadRecentStates() {
    try {
      const files = await fs.readdir(this.config.statePath);
      const stateFiles = files.filter(f => f.startsWith('state-') && f.endsWith('.json'));
      
      // Load last 5 states
      const recentFiles = stateFiles.slice(-5);
      
      for (const file of recentFiles) {
        try {
          const filepath = path.join(this.config.statePath, file);
          const data = await fs.readFile(filepath, 'utf8');
          const state = JSON.parse(data);
          this.states.set(state.id, state);
        } catch (error) {
          logger.warn(`Failed to load state file ${file}:`, error.message);
        }
      }
    } catch (error) {
      logger.warn('Failed to load recent states:', error.message);
    }
  }
  
  /**
   * Start auto-save timer
   */
  startAutoSave() {
    this.autoSaveTimer = setInterval(async () => {
      if (this.isDirty && this.currentStateId) {
        try {
          await this.saveState();
        } catch (error) {
          logger.error('Auto-save failed:', error);
        }
      }
    }, this.config.autoSaveInterval);
  }
  
  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
  
  /**
   * Export conversation state
   */
  async exportState(format = 'json', stateId = this.currentStateId) {
    if (!stateId || !this.states.has(stateId)) {
      throw new Error(`State ${stateId} not found`);
    }
    
    const state = this.states.get(stateId);
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(state, null, 2);
        
      case 'markdown':
        return this.exportAsMarkdown(state);
        
      case 'summary':
        return this.exportAsSummary(state);
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  /**
   * Export as Markdown
   */
  exportAsMarkdown(state) {
    let markdown = `# Conversation State: ${state.id}\n\n`;
    markdown += `**Created:** ${new Date(state.created).toISOString()}\n`;
    markdown += `**Updated:** ${new Date(state.updated).toISOString()}\n\n`;
    
    markdown += `## Objective\n${state.data.objective || 'Not specified'}\n\n`;
    
    markdown += `## Agents (${state.data.agents.length})\n`;
    state.data.agents.forEach(agent => {
      markdown += `- ${agent}\n`;
    });
    markdown += '\n';
    
    markdown += `## Decisions (${state.data.decisions.length})\n`;
    state.data.decisions.forEach((decision, idx) => {
      markdown += `${idx + 1}. ${decision}\n`;
    });
    markdown += '\n';
    
    markdown += `## Metrics\n`;
    markdown += `- Iterations: ${state.data.iteration}\n`;
    markdown += `- Total Tokens: ${state.metadata.totalTokens}\n`;
    markdown += `- Total Cost: $${state.metadata.totalCost.toFixed(4)}\n`;
    markdown += `- Messages: ${state.data.memory.length}\n\n`;
    
    if (state.snapshots.length > 0) {
      markdown += `## Snapshots (${state.snapshots.length})\n`;
      state.snapshots.forEach(snapshot => {
        markdown += `- ${snapshot.description || snapshot.id} (${new Date(snapshot.created).toISOString()})\n`;
      });
    }
    
    return markdown;
  }
  
  /**
   * Export as summary
   */
  exportAsSummary(state) {
    return {
      id: state.id,
      objective: state.data.objective,
      agents: state.data.agents.length,
      messages: state.data.memory.length,
      decisions: state.data.decisions,
      iterations: state.data.iteration,
      tokens: state.metadata.totalTokens,
      cost: state.metadata.totalCost,
      duration: state.updated - state.created,
      snapshots: state.snapshots.length,
      branches: state.branches.length
    };
  }
  
  /**
   * Cleanup old states
   */
  async cleanup(daysToKeep = 7) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    try {
      const files = await fs.readdir(this.config.statePath);
      const stateFiles = files.filter(f => f.startsWith('state-') && f.endsWith('.json'));
      
      let deletedCount = 0;
      
      for (const file of stateFiles) {
        const filepath = path.join(this.config.statePath, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtimeMs < cutoffTime) {
          await fs.unlink(filepath);
          deletedCount++;
          logger.info(`Deleted old state file: ${file}`);
        }
      }
      
      logger.info(`Cleaned up ${deletedCount} old state files`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old states:', error);
      throw error;
    }
  }
  
  /**
   * Get state by conversation ID
   */
  async getState(conversationId) {
    // Check memory first
    for (const [id, state] of this.states.entries()) {
      if (state.conversationId === conversationId) {
        return state;
      }
    }
    
    // Try to load from disk
    try {
      const files = await fs.readdir(this.config.statePath);
      for (const file of files) {
        if (file.includes(conversationId)) {
          const filepath = path.join(this.config.statePath, file);
          const data = await fs.readFile(filepath, 'utf8');
          return JSON.parse(data);
        }
      }
    } catch (error) {
      logger.error('Failed to get state:', error);
    }
    
    return null;
  }
  
  /**
   * List all saved states
   */
  async listStates() {
    const states = [];
    
    // Add in-memory states
    for (const [id, state] of this.states.entries()) {
      states.push({
        id: state.id,
        conversationId: state.conversationId || state.id,
        objective: state.data?.objective,
        created: state.created,
        updated: state.updated,
        inMemory: true
      });
    }
    
    // Add disk states
    try {
      const files = await fs.readdir(this.config.statePath);
      for (const file of files) {
        if (file.startsWith('state-') && file.endsWith('.json')) {
          const filepath = path.join(this.config.statePath, file);
          try {
            const data = await fs.readFile(filepath, 'utf8');
            const state = JSON.parse(data);
            
            // Skip if already in memory
            if (!states.some(s => s.id === state.id)) {
              states.push({
                id: state.id,
                conversationId: state.conversationId || state.id,
                objective: state.data?.objective,
                created: state.created,
                updated: state.updated,
                inMemory: false,
                file
              });
            }
          } catch (err) {
            logger.warn(`Failed to read state file ${file}:`, err.message);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to list disk states:', error);
    }
    
    return states.sort((a, b) => b.updated - a.updated);
  }
  
  /**
   * Get total number of conversations
   */
  async getTotalConversations() {
    const states = await this.listStates();
    return states.length;
  }
  
  /**
   * Shutdown state manager
   */
  async shutdown() {
    this.stopAutoSave();
    
    // Save current state if dirty
    if (this.isDirty && this.currentStateId) {
      await this.saveState();
    }
    
    this.emit('shutdown');
    logger.info('State manager shutdown complete');
  }
}

export default ConversationStateManager;