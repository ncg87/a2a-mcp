/**
 * Shared Memory Bank
 * 
 * Persistent memory system shared across all agents for storing
 * insights, facts, conclusions, and research history
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class SharedMemoryBank {
  constructor(dataPath = './memory-bank') {
    this.dataPath = dataPath;
    this.memory = new Map();
    this.indexes = {
      byType: new Map(),
      byTopic: new Map(),
      byDate: new Map(),
      byScore: []
    };
    this.initialized = false;
  }

  /**
   * Initialize memory bank
   */
  async initialize() {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // Load existing memory
      await this.loadMemory();
      
      // Build indexes
      this.rebuildIndexes();
      
      this.initialized = true;
      logger.info(`Memory bank initialized with ${this.memory.size} entries`);
      
    } catch (error) {
      logger.error('Failed to initialize memory bank:', error);
      throw error;
    }
  }

  /**
   * Store an insight
   */
  async storeInsight(insight) {
    const entry = {
      id: insight.id || uuidv4(),
      type: 'insight',
      content: insight.content,
      topic: insight.topic,
      score: insight.score,
      novelty: insight.novelty,
      actionability: insight.actionability,
      metadata: {
        ...insight,
        storedAt: Date.now()
      }
    };
    
    await this.storeEntry(entry);
    return entry.id;
  }

  /**
   * Store a fact
   */
  async storeFact(fact, topic, source) {
    const entry = {
      id: uuidv4(),
      type: 'fact',
      content: fact,
      topic: topic,
      source: source,
      metadata: {
        verified: false,
        confidence: 0.8,
        storedAt: Date.now()
      }
    };
    
    await this.storeEntry(entry);
    return entry.id;
  }

  /**
   * Store a conclusion
   */
  async storeConclusion(conclusion, topic, supportingInsights = []) {
    const entry = {
      id: uuidv4(),
      type: 'conclusion',
      content: conclusion,
      topic: topic,
      supportingInsights: supportingInsights,
      metadata: {
        confidence: 0.85,
        storedAt: Date.now()
      }
    };
    
    await this.storeEntry(entry);
    return entry.id;
  }

  /**
   * Store a question for future research
   */
  async storeQuestion(question, topic, priority = 5) {
    const entry = {
      id: uuidv4(),
      type: 'question',
      content: question,
      topic: topic,
      priority: priority,
      metadata: {
        answered: false,
        storedAt: Date.now()
      }
    };
    
    await this.storeEntry(entry);
    return entry.id;
  }

  /**
   * Store generic entry
   */
  async storeEntry(entry) {
    // Add to memory
    this.memory.set(entry.id, entry);
    
    // Update indexes
    this.addToIndexes(entry);
    
    // Persist to disk
    await this.saveEntry(entry);
    
    logger.debug(`Stored ${entry.type} entry: ${entry.id}`);
  }

  /**
   * Search memory by query
   */
  async searchMemory(query, options = {}) {
    const {
      type = null,
      limit = 20,
      minRelevance = 0.3,
      sortBy = 'relevance'
    } = options;
    
    const results = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    // Search through memory
    for (const [id, entry] of this.memory) {
      // Type filter
      if (type && entry.type !== type) continue;
      
      // Calculate relevance
      const relevance = this.calculateRelevance(entry, queryWords);
      
      if (relevance >= minRelevance) {
        results.push({
          ...entry,
          relevance: relevance
        });
      }
    }
    
    // Sort results
    if (sortBy === 'relevance') {
      results.sort((a, b) => b.relevance - a.relevance);
    } else if (sortBy === 'date') {
      results.sort((a, b) => b.metadata.storedAt - a.metadata.storedAt);
    } else if (sortBy === 'score' && results[0]?.score !== undefined) {
      results.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    
    return results.slice(0, limit);
  }

  /**
   * Calculate relevance score
   */
  calculateRelevance(entry, queryWords) {
    const contentLower = (entry.content || '').toLowerCase();
    const topicLower = (entry.topic || '').toLowerCase();
    
    let matches = 0;
    let totalWords = queryWords.length;
    
    for (const word of queryWords) {
      if (contentLower.includes(word) || topicLower.includes(word)) {
        matches++;
      }
    }
    
    // Base relevance
    let relevance = matches / totalWords;
    
    // Boost for exact topic match
    if (queryWords.some(w => topicLower === w)) {
      relevance += 0.3;
    }
    
    // Boost for high-scoring insights
    if (entry.type === 'insight' && entry.score > 0.8) {
      relevance += 0.1;
    }
    
    // Recency boost (last 24 hours)
    const age = Date.now() - entry.metadata.storedAt;
    if (age < 86400000) {
      relevance += 0.05;
    }
    
    return Math.min(relevance, 1.0);
  }

  /**
   * Get related memories
   */
  async getRelatedMemories(entryId, limit = 10) {
    const entry = this.memory.get(entryId);
    if (!entry) return [];
    
    // Search for related content
    const related = await this.searchMemory(entry.topic || entry.content, {
      limit: limit + 1,
      minRelevance: 0.5
    });
    
    // Remove the original entry
    return related.filter(e => e.id !== entryId).slice(0, limit);
  }

  /**
   * Get memories by type
   */
  getByType(type, limit = 50) {
    const typeEntries = this.indexes.byType.get(type) || [];
    return typeEntries
      .slice(0, limit)
      .map(id => this.memory.get(id))
      .filter(Boolean);
  }

  /**
   * Get memories by topic
   */
  getByTopic(topic, limit = 50) {
    const topicLower = topic.toLowerCase();
    const topicEntries = this.indexes.byTopic.get(topicLower) || [];
    return topicEntries
      .slice(0, limit)
      .map(id => this.memory.get(id))
      .filter(Boolean);
  }

  /**
   * Get top insights
   */
  getTopInsights(limit = 10) {
    return this.indexes.byScore
      .slice(0, limit)
      .map(item => this.memory.get(item.id))
      .filter(Boolean);
  }

  /**
   * Get unanswered questions
   */
  getUnansweredQuestions(limit = 20) {
    const questions = this.getByType('question', 100);
    return questions
      .filter(q => !q.metadata.answered)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }

  /**
   * Mark question as answered
   */
  async markQuestionAnswered(questionId, answerId) {
    const question = this.memory.get(questionId);
    if (question && question.type === 'question') {
      question.metadata.answered = true;
      question.metadata.answerId = answerId;
      question.metadata.answeredAt = Date.now();
      await this.saveEntry(question);
    }
  }

  /**
   * Store system state
   */
  async storeSystemState(state) {
    const stateEntry = {
      id: 'system-state',
      type: 'system',
      content: JSON.stringify(state),
      metadata: {
        storedAt: Date.now()
      }
    };
    
    await this.storeEntry(stateEntry);
  }

  /**
   * Get system state
   */
  async getSystemState() {
    const state = this.memory.get('system-state');
    if (state) {
      try {
        return JSON.parse(state.content);
      } catch (error) {
        logger.error('Failed to parse system state:', error);
      }
    }
    return null;
  }

  /**
   * Load memory from disk
   */
  async loadMemory() {
    try {
      const files = await fs.readdir(this.dataPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.dataPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const entry = JSON.parse(content);
          this.memory.set(entry.id, entry);
        } catch (error) {
          logger.error(`Failed to load memory file ${file}:`, error);
        }
      }
      
      logger.info(`Loaded ${this.memory.size} memory entries from disk`);
      
    } catch (error) {
      logger.error('Failed to load memory:', error);
    }
  }

  /**
   * Save entry to disk
   */
  async saveEntry(entry) {
    try {
      const filename = `${entry.type}-${entry.id}.json`;
      const filePath = path.join(this.dataPath, filename);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      logger.error(`Failed to save entry ${entry.id}:`, error);
    }
  }

  /**
   * Rebuild indexes
   */
  rebuildIndexes() {
    // Clear indexes
    this.indexes.byType.clear();
    this.indexes.byTopic.clear();
    this.indexes.byDate.clear();
    this.indexes.byScore = [];
    
    // Rebuild from memory
    for (const [id, entry] of this.memory) {
      this.addToIndexes(entry);
    }
    
    // Sort score index
    this.indexes.byScore.sort((a, b) => b.score - a.score);
  }

  /**
   * Add entry to indexes
   */
  addToIndexes(entry) {
    // Type index
    if (!this.indexes.byType.has(entry.type)) {
      this.indexes.byType.set(entry.type, []);
    }
    this.indexes.byType.get(entry.type).push(entry.id);
    
    // Topic index
    if (entry.topic) {
      const topicLower = entry.topic.toLowerCase();
      if (!this.indexes.byTopic.has(topicLower)) {
        this.indexes.byTopic.set(topicLower, []);
      }
      this.indexes.byTopic.get(topicLower).push(entry.id);
    }
    
    // Date index
    const date = new Date(entry.metadata.storedAt).toDateString();
    if (!this.indexes.byDate.has(date)) {
      this.indexes.byDate.set(date, []);
    }
    this.indexes.byDate.get(date).push(entry.id);
    
    // Score index (for insights)
    if (entry.type === 'insight' && entry.score) {
      this.indexes.byScore.push({
        id: entry.id,
        score: entry.score
      });
      this.indexes.byScore.sort((a, b) => b.score - a.score);
    }
  }

  /**
   * Cleanup old entries
   */
  async cleanupOldEntries(cutoffDate) {
    let cleaned = 0;
    
    for (const [id, entry] of this.memory) {
      if (entry.metadata.storedAt < cutoffDate) {
        // Keep important entries
        if (entry.type === 'conclusion' || 
            (entry.type === 'insight' && entry.score > 0.9)) {
          continue;
        }
        
        // Delete entry
        this.memory.delete(id);
        
        // Delete file
        try {
          const filename = `${entry.type}-${entry.id}.json`;
          const filePath = path.join(this.dataPath, filename);
          await fs.unlink(filePath);
          cleaned++;
        } catch (error) {
          logger.error(`Failed to delete file for ${id}:`, error);
        }
      }
    }
    
    // Rebuild indexes after cleanup
    if (cleaned > 0) {
      this.rebuildIndexes();
    }
    
    return cleaned;
  }

  /**
   * Get memory statistics
   */
  getStatistics() {
    const stats = {
      totalEntries: this.memory.size,
      byType: {},
      topTopics: [],
      averageScore: 0,
      oldestEntry: null,
      newestEntry: null
    };
    
    // Count by type
    for (const [type, ids] of this.indexes.byType) {
      stats.byType[type] = ids.length;
    }
    
    // Top topics
    const topicCounts = new Map();
    for (const [topic, ids] of this.indexes.byTopic) {
      topicCounts.set(topic, ids.length);
    }
    stats.topTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));
    
    // Average score for insights
    const insights = this.getByType('insight');
    if (insights.length > 0) {
      const totalScore = insights.reduce((sum, i) => sum + (i.score || 0), 0);
      stats.averageScore = totalScore / insights.length;
    }
    
    // Find oldest and newest
    let oldest = Infinity;
    let newest = 0;
    for (const [id, entry] of this.memory) {
      const timestamp = entry.metadata.storedAt;
      if (timestamp < oldest) {
        oldest = timestamp;
        stats.oldestEntry = entry;
      }
      if (timestamp > newest) {
        newest = timestamp;
        stats.newestEntry = entry;
      }
    }
    
    return stats;
  }

  /**
   * Export memory to file
   */
  async exportMemory(outputPath) {
    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      entries: Array.from(this.memory.values()),
      statistics: this.getStatistics()
    };
    
    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
    logger.info(`Exported ${this.memory.size} entries to ${outputPath}`);
  }

  /**
   * Get entry count
   */
  getEntryCount() {
    return this.memory.size;
  }
}

export default SharedMemoryBank;