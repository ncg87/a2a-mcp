/**
 * Intelligent Cache System
 * 
 * Caches model responses intelligently based on semantic similarity,
 * reducing API calls and improving response times
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

export class IntelligentCache extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxSize: config.maxSize || 1000,
      ttl: config.ttl || 3600000, // 1 hour
      similarityThreshold: config.similarityThreshold || 0.85,
      compressionEnabled: config.compressionEnabled || true,
      ...config
    };
    
    // Main cache storage
    this.cache = new Map();
    
    // Semantic index for similarity matching
    this.semanticIndex = new Map();
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      saves: 0,
      evictions: 0,
      totalSaved: 0,
      avgHitRate: 0
    };
    
    // LRU tracking
    this.accessOrder = [];
  }
  
  /**
   * Generate cache key from prompt and context
   */
  generateKey(prompt, context = {}) {
    const normalized = this.normalizePrompt(prompt);
    const contextStr = JSON.stringify(context, Object.keys(context).sort());
    const combined = `${normalized}::${contextStr}`;
    
    return crypto.createHash('sha256').update(combined).digest('hex');
  }
  
  /**
   * Normalize prompt for better cache hits
   */
  normalizePrompt(prompt) {
    return prompt
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }
  
  /**
   * Calculate semantic similarity between two prompts
   */
  calculateSimilarity(prompt1, prompt2) {
    const words1 = new Set(prompt1.toLowerCase().split(/\s+/));
    const words2 = new Set(prompt2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    // Jaccard similarity
    const jaccard = intersection.size / union.size;
    
    // Length similarity
    const lengthSim = Math.min(prompt1.length, prompt2.length) / 
                     Math.max(prompt1.length, prompt2.length);
    
    // Combined similarity
    return (jaccard * 0.7) + (lengthSim * 0.3);
  }
  
  /**
   * Find similar cached entries
   */
  findSimilarEntries(prompt, threshold = this.config.similarityThreshold) {
    const similar = [];
    const normalized = this.normalizePrompt(prompt);
    
    for (const [key, entry] of this.cache) {
      if (entry.expired) continue;
      
      const similarity = this.calculateSimilarity(normalized, entry.normalizedPrompt);
      if (similarity >= threshold) {
        similar.push({
          key,
          entry,
          similarity
        });
      }
    }
    
    // Sort by similarity descending
    similar.sort((a, b) => b.similarity - a.similarity);
    
    return similar;
  }
  
  /**
   * Get cached response
   */
  get(prompt, context = {}, options = {}) {
    const key = this.generateKey(prompt, context);
    
    // Direct cache hit
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      
      // Check if expired
      if (Date.now() - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
        this.stats.misses++;
        this.emit('cacheMiss', { reason: 'expired', key });
        return null;
      }
      
      // Update LRU
      this.updateAccessOrder(key);
      
      this.stats.hits++;
      this.stats.avgHitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
      
      this.emit('cacheHit', { key, similarity: 1.0 });
      
      return {
        response: entry.response,
        cached: true,
        similarity: 1.0,
        timestamp: entry.timestamp
      };
    }
    
    // Try semantic similarity matching
    if (options.useSimilarity !== false) {
      const similar = this.findSimilarEntries(prompt);
      
      if (similar.length > 0) {
        const best = similar[0];
        
        // Update LRU
        this.updateAccessOrder(best.key);
        
        this.stats.hits++;
        this.stats.avgHitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
        
        this.emit('cacheHit', { 
          key: best.key, 
          similarity: best.similarity,
          type: 'semantic'
        });
        
        return {
          response: best.entry.response,
          cached: true,
          similarity: best.similarity,
          timestamp: best.entry.timestamp,
          originalPrompt: best.entry.prompt
        };
      }
    }
    
    this.stats.misses++;
    this.stats.avgHitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
    
    this.emit('cacheMiss', { reason: 'notFound', prompt });
    
    return null;
  }
  
  /**
   * Set cached response
   */
  set(prompt, context, response, metadata = {}) {
    const key = this.generateKey(prompt, context);
    const normalizedPrompt = this.normalizePrompt(prompt);
    
    // Check cache size
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }
    
    const entry = {
      prompt,
      normalizedPrompt,
      context,
      response,
      metadata,
      timestamp: Date.now(),
      hits: 0,
      size: JSON.stringify(response).length
    };
    
    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    
    // Update semantic index
    this.updateSemanticIndex(key, normalizedPrompt);
    
    this.stats.saves++;
    this.stats.totalSaved += entry.size;
    
    this.emit('cacheSave', { key, size: entry.size });
    
    return key;
  }
  
  /**
   * Update semantic index
   */
  updateSemanticIndex(key, normalizedPrompt) {
    // Extract key terms
    const terms = normalizedPrompt.split(/\s+/)
      .filter(word => word.length > 3);
    
    // Index by terms
    terms.forEach(term => {
      if (!this.semanticIndex.has(term)) {
        this.semanticIndex.set(term, new Set());
      }
      this.semanticIndex.get(term).add(key);
    });
  }
  
  /**
   * Update LRU access order
   */
  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
  
  /**
   * Evict least recently used entry
   */
  evictLRU() {
    if (this.accessOrder.length === 0) return;
    
    const key = this.accessOrder.shift();
    const entry = this.cache.get(key);
    
    if (entry) {
      this.cache.delete(key);
      
      // Clean semantic index
      const terms = entry.normalizedPrompt.split(/\s+/)
        .filter(word => word.length > 3);
      
      terms.forEach(term => {
        const termKeys = this.semanticIndex.get(term);
        if (termKeys) {
          termKeys.delete(key);
          if (termKeys.size === 0) {
            this.semanticIndex.delete(term);
          }
        }
      });
      
      this.stats.evictions++;
      
      this.emit('cacheEviction', { key, size: entry.size });
    }
  }
  
  /**
   * Preload cache with common prompts
   */
  async preload(commonPrompts) {
    let loaded = 0;
    
    for (const item of commonPrompts) {
      const { prompt, context, response } = item;
      
      if (prompt && response) {
        this.set(prompt, context || {}, response);
        loaded++;
      }
    }
    
    logger.info(`Preloaded ${loaded} cache entries`);
    
    return loaded;
  }
  
  /**
   * Warm up cache with predictions
   */
  async warmUp(conversationContext) {
    // Predict likely follow-up prompts based on context
    const predictions = this.predictNextPrompts(conversationContext);
    
    // Pre-cache predicted responses
    // In real implementation, would call AI to generate these
    
    this.emit('cacheWarmedUp', { predictions: predictions.length });
    
    return predictions;
  }
  
  /**
   * Predict next likely prompts
   */
  predictNextPrompts(context) {
    const predictions = [];
    
    // Based on current objective
    if (context.objective) {
      predictions.push({
        prompt: `Implement ${context.objective}`,
        likelihood: 0.8
      });
      
      predictions.push({
        prompt: `What are the challenges with ${context.objective}`,
        likelihood: 0.6
      });
    }
    
    // Based on recent decisions
    if (context.decisions && context.decisions.length > 0) {
      const lastDecision = context.decisions[context.decisions.length - 1];
      predictions.push({
        prompt: `How to implement ${lastDecision}`,
        likelihood: 0.7
      });
    }
    
    // Based on open questions
    if (context.openQuestions && context.openQuestions.length > 0) {
      context.openQuestions.forEach(question => {
        predictions.push({
          prompt: question,
          likelihood: 0.9
        });
      });
    }
    
    return predictions.sort((a, b) => b.likelihood - a.likelihood);
  }
  
  /**
   * Clear cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.semanticIndex.clear();
    this.accessOrder = [];
    
    this.emit('cacheCleared', { entriesCleared: size });
    
    logger.info(`Cleared ${size} cache entries`);
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const memoryUsage = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      memoryUsage,
      hitRate: this.stats.avgHitRate * 100,
      avgEntrySizeKB: (memoryUsage / Math.max(this.cache.size, 1) / 1024).toFixed(2),
      semanticIndexSize: this.semanticIndex.size
    };
  }
  
  /**
   * Export cache for persistence
   */
  exportCache() {
    const entries = [];
    
    for (const [key, entry] of this.cache) {
      // Skip expired entries
      if (Date.now() - entry.timestamp > this.config.ttl) continue;
      
      entries.push({
        key,
        prompt: entry.prompt,
        context: entry.context,
        response: entry.response,
        metadata: entry.metadata,
        timestamp: entry.timestamp
      });
    }
    
    return {
      version: '1.0',
      exported: Date.now(),
      entries,
      stats: this.stats
    };
  }
  
  /**
   * Import cache from export
   */
  importCache(data) {
    if (!data || !data.entries) {
      throw new Error('Invalid cache data');
    }
    
    let imported = 0;
    
    for (const entry of data.entries) {
      // Skip very old entries
      if (Date.now() - entry.timestamp > this.config.ttl * 2) continue;
      
      this.set(
        entry.prompt,
        entry.context || {},
        entry.response,
        entry.metadata || {}
      );
      
      imported++;
    }
    
    logger.info(`Imported ${imported} cache entries`);
    
    return imported;
  }
  
  /**
   * Analyze cache effectiveness
   */
  analyzeEffectiveness() {
    const analysis = {
      hitRate: this.stats.avgHitRate * 100,
      totalSavedBytes: this.stats.totalSaved,
      estimatedTokensSaved: Math.floor(this.stats.totalSaved / 4), // Rough estimate
      estimatedCostSaved: (this.stats.hits * 0.002).toFixed(4), // Rough cost estimate
      mostAccessedEntries: this.getMostAccessed(),
      cacheAge: this.getCacheAge(),
      recommendations: []
    };
    
    // Recommendations
    if (analysis.hitRate < 20) {
      analysis.recommendations.push('Consider increasing similarity threshold for more hits');
    }
    
    if (this.stats.evictions > this.stats.saves * 0.5) {
      analysis.recommendations.push('Consider increasing cache size to reduce evictions');
    }
    
    if (analysis.cacheAge.avgAge > this.config.ttl * 0.8) {
      analysis.recommendations.push('Cache entries are aging out - consider longer TTL');
    }
    
    return analysis;
  }
  
  /**
   * Get most accessed cache entries
   */
  getMostAccessed() {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        prompt: entry.prompt.substring(0, 100),
        hits: entry.hits,
        age: Date.now() - entry.timestamp
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);
    
    return entries;
  }
  
  /**
   * Get cache age statistics
   */
  getCacheAge() {
    const ages = Array.from(this.cache.values())
      .map(entry => Date.now() - entry.timestamp);
    
    if (ages.length === 0) {
      return { minAge: 0, maxAge: 0, avgAge: 0 };
    }
    
    return {
      minAge: Math.min(...ages),
      maxAge: Math.max(...ages),
      avgAge: ages.reduce((sum, age) => sum + age, 0) / ages.length
    };
  }
}

export default IntelligentCache;