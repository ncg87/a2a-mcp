/**
 * Agent Memory Bank
 * 
 * Persistent memory system for agents with multiple memory types
 * Enables learning across conversations and knowledge retention
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class AgentMemoryBank {
  constructor(agentId, config = {}) {
    this.agentId = agentId;
    
    // Memory configuration
    this.config = {
      maxShortTermSize: config.maxShortTermSize || 100,
      maxLongTermSize: config.maxLongTermSize || 10000,
      maxEpisodicSize: config.maxEpisodicSize || 500,
      maxWorkingSize: config.maxWorkingSize || 20,
      consolidationInterval: config.consolidationInterval || 300000, // 5 minutes
      persistencePath: config.persistencePath || './memory',
      compressionEnabled: config.compressionEnabled || true,
      forgettingCurveEnabled: config.forgettingCurveEnabled || true
    };
    
    // Different memory types
    this.memory = {
      shortTerm: [],           // Current conversation context
      longTerm: new Map(),     // Persistent knowledge across conversations
      episodic: [],           // Important events and decisions
      semantic: new Map(),     // Learned concepts and relationships
      working: [],            // Current focus items (active processing)
      procedural: new Map()    // Learned procedures and patterns
    };
    
    // Memory metadata
    this.metadata = {
      created: Date.now(),
      lastAccessed: Date.now(),
      totalRecalls: 0,
      totalStores: 0,
      consolidations: 0
    };
    
    // Memory indexes for fast retrieval
    this.indexes = {
      temporal: new Map(),     // Time-based index
      semantic: new Map(),     // Concept-based index
      importance: new Map(),   // Importance-based index
      association: new Map()   // Association network
    };
    
    // Initialize persistence
    this.initializePersistence();
    
    // Start consolidation timer
    if (this.config.consolidationInterval > 0) {
      this.startConsolidationTimer();
    }
  }

  /**
   * Initialize persistence layer
   */
  async initializePersistence() {
    try {
      const memoryPath = path.join(this.config.persistencePath, this.agentId);
      await fs.mkdir(memoryPath, { recursive: true });
      
      // Load existing memory if available
      await this.loadPersistedMemory();
      
      console.log(`   💾 Memory bank initialized for agent: ${this.agentId}`);
    } catch (error) {
      logger.error(`Failed to initialize memory persistence for ${this.agentId}:`, error);
    }
  }

  /**
   * Store memory with intelligent categorization
   */
  async store(memoryType, content, metadata = {}) {
    const memoryId = uuidv4();
    
    const memoryItem = {
      id: memoryId,
      type: memoryType,
      content: content,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        accessCount: 0,
        importance: metadata.importance || this.calculateImportance(content, metadata),
        decay: 1.0, // Freshness factor
        associations: metadata.associations || [],
        source: metadata.source || 'unknown',
        confidence: metadata.confidence || 0.8
      }
    };
    
    // Store in appropriate memory type
    switch (memoryType) {
      case 'short-term':
        await this.storeShortTerm(memoryItem);
        break;
      case 'long-term':
        await this.storeLongTerm(memoryItem);
        break;
      case 'episodic':
        await this.storeEpisodic(memoryItem);
        break;
      case 'semantic':
        await this.storeSemantic(memoryItem);
        break;
      case 'working':
        await this.storeWorking(memoryItem);
        break;
      case 'procedural':
        await this.storeProcedural(memoryItem);
        break;
      default:
        await this.storeShortTerm(memoryItem); // Default to short-term
    }
    
    // Update indexes
    await this.updateIndexes(memoryItem);
    
    // Update metadata
    this.metadata.totalStores++;
    this.metadata.lastAccessed = Date.now();
    
    // Trigger consolidation if needed
    if (this.shouldConsolidate()) {
      await this.consolidateMemory();
    }
    
    return memoryId;
  }

  /**
   * Retrieve memories with intelligent filtering
   */
  async retrieve(query, options = {}) {
    const {
      memoryTypes = ['all'],
      limit = 10,
      minImportance = 0,
      maxAge = null,
      includeDecayed = false
    } = options;
    
    this.metadata.totalRecalls++;
    this.metadata.lastAccessed = Date.now();
    
    // Collect relevant memories
    let relevantMemories = [];
    
    // Search across specified memory types
    for (const memoryType of memoryTypes) {
      if (memoryType === 'all' || memoryType === 'short-term') {
        relevantMemories.push(...this.searchShortTerm(query, options));
      }
      if (memoryType === 'all' || memoryType === 'long-term') {
        relevantMemories.push(...this.searchLongTerm(query, options));
      }
      if (memoryType === 'all' || memoryType === 'episodic') {
        relevantMemories.push(...this.searchEpisodic(query, options));
      }
      if (memoryType === 'all' || memoryType === 'semantic') {
        relevantMemories.push(...this.searchSemantic(query, options));
      }
      if (memoryType === 'all' || memoryType === 'procedural') {
        relevantMemories.push(...this.searchProcedural(query, options));
      }
    }
    
    // Apply filters
    relevantMemories = this.applyFilters(relevantMemories, {
      minImportance,
      maxAge,
      includeDecayed
    });
    
    // Calculate relevance scores
    const scoredMemories = this.calculateRelevance(relevantMemories, query);
    
    // Sort by relevance and importance
    scoredMemories.sort((a, b) => {
      const scoreA = a.relevance * a.metadata.importance * a.metadata.decay;
      const scoreB = b.relevance * b.metadata.importance * b.metadata.decay;
      return scoreB - scoreA;
    });
    
    // Apply limit
    const results = scoredMemories.slice(0, limit);
    
    // Update access counts
    for (const memory of results) {
      memory.metadata.accessCount++;
      memory.metadata.lastAccessed = Date.now();
      
      // Strengthen frequently accessed memories
      if (memory.metadata.accessCount > 5) {
        memory.metadata.importance = Math.min(memory.metadata.importance * 1.1, 1.0);
      }
    }
    
    // Return synthesized results
    return this.synthesizeResults(results, query);
  }

  /**
   * Store in short-term memory
   */
  async storeShortTerm(memoryItem) {
    this.memory.shortTerm.push(memoryItem);
    
    // Maintain size limit
    if (this.memory.shortTerm.length > this.config.maxShortTermSize) {
      // Move oldest to long-term if important enough
      const oldest = this.memory.shortTerm.shift();
      if (oldest.metadata.importance > 0.5) {
        await this.promoteToLongTerm(oldest);
      }
    }
  }

  /**
   * Store in long-term memory
   */
  async storeLongTerm(memoryItem) {
    const key = this.generateMemoryKey(memoryItem);
    this.memory.longTerm.set(key, memoryItem);
    
    // Maintain size limit with forgetting curve
    if (this.memory.longTerm.size > this.config.maxLongTermSize) {
      await this.applyForgettingCurve();
    }
  }

  /**
   * Store episodic memory
   */
  async storeEpisodic(memoryItem) {
    this.memory.episodic.push(memoryItem);
    
    // Sort by importance and time
    this.memory.episodic.sort((a, b) => {
      const scoreA = a.metadata.importance * (1 / (Date.now() - a.metadata.timestamp + 1));
      const scoreB = b.metadata.importance * (1 / (Date.now() - b.metadata.timestamp + 1));
      return scoreB - scoreA;
    });
    
    // Maintain size limit
    if (this.memory.episodic.length > this.config.maxEpisodicSize) {
      this.memory.episodic = this.memory.episodic.slice(0, this.config.maxEpisodicSize);
    }
  }

  /**
   * Store semantic memory
   */
  async storeSemantic(memoryItem) {
    const concept = this.extractConcept(memoryItem.content);
    
    if (!this.memory.semantic.has(concept)) {
      this.memory.semantic.set(concept, []);
    }
    
    this.memory.semantic.get(concept).push(memoryItem);
    
    // Build semantic associations
    await this.buildSemanticAssociations(concept, memoryItem);
  }

  /**
   * Store working memory
   */
  async storeWorking(memoryItem) {
    this.memory.working.push(memoryItem);
    
    // Working memory is limited and FIFO
    if (this.memory.working.length > this.config.maxWorkingSize) {
      const removed = this.memory.working.shift();
      
      // Move to short-term if important
      if (removed.metadata.importance > 0.3) {
        await this.storeShortTerm(removed);
      }
    }
  }

  /**
   * Store procedural memory
   */
  async storeProcedural(memoryItem) {
    const procedure = this.extractProcedure(memoryItem.content);
    
    if (!this.memory.procedural.has(procedure)) {
      this.memory.procedural.set(procedure, {
        steps: [],
        successRate: 1.0,
        usageCount: 0
      });
    }
    
    const proc = this.memory.procedural.get(procedure);
    proc.steps.push(memoryItem);
    proc.usageCount++;
  }

  /**
   * Promote memory from short-term to long-term
   */
  async promoteToLongTerm(memoryItem) {
    memoryItem.metadata.promoted = true;
    memoryItem.metadata.promotionTime = Date.now();
    await this.storeLongTerm(memoryItem);
  }

  /**
   * Memory consolidation process
   */
  async consolidateMemory() {
    console.log(`   🧠 Consolidating memory for ${this.agentId}...`);
    
    this.metadata.consolidations++;
    
    // 1. Identify patterns in short-term memory
    const patterns = this.identifyPatterns(this.memory.shortTerm);
    
    // 2. Promote important short-term memories
    for (const memory of this.memory.shortTerm) {
      if (memory.metadata.importance > 0.7 || memory.metadata.accessCount > 3) {
        await this.promoteToLongTerm(memory);
      }
    }
    
    // 3. Merge similar memories in long-term
    await this.mergeSimilarMemories();
    
    // 4. Extract semantic concepts
    await this.extractSemanticConcepts();
    
    // 5. Build association networks
    await this.buildAssociationNetworks();
    
    // 6. Apply decay to old memories
    await this.applyMemoryDecay();
    
    // 7. Save to persistent storage
    await this.saveMemoryToDisk();
    
    // 8. Clear working memory
    this.memory.working = [];
    
    console.log(`   ✓ Memory consolidation complete`);
  }

  /**
   * Search short-term memory
   */
  searchShortTerm(query, options) {
    return this.memory.shortTerm.filter(memory => 
      this.matchesQuery(memory, query)
    );
  }

  /**
   * Search long-term memory
   */
  searchLongTerm(query, options) {
    const results = [];
    
    for (const [key, memory] of this.memory.longTerm) {
      if (this.matchesQuery(memory, query)) {
        results.push(memory);
      }
    }
    
    return results;
  }

  /**
   * Search episodic memory
   */
  searchEpisodic(query, options) {
    return this.memory.episodic.filter(memory =>
      this.matchesQuery(memory, query)
    );
  }

  /**
   * Search semantic memory
   */
  searchSemantic(query, options) {
    const results = [];
    const concepts = this.extractQueryConcepts(query);
    
    for (const concept of concepts) {
      if (this.memory.semantic.has(concept)) {
        results.push(...this.memory.semantic.get(concept));
      }
      
      // Also search related concepts
      const related = this.findRelatedConcepts(concept);
      for (const relatedConcept of related) {
        if (this.memory.semantic.has(relatedConcept)) {
          results.push(...this.memory.semantic.get(relatedConcept));
        }
      }
    }
    
    return results;
  }

  /**
   * Search procedural memory
   */
  searchProcedural(query, options) {
    const results = [];
    
    for (const [procedure, data] of this.memory.procedural) {
      if (procedure.toLowerCase().includes(query.toLowerCase())) {
        results.push(...data.steps);
      }
    }
    
    return results;
  }

  /**
   * Check if memory matches query
   */
  matchesQuery(memory, query) {
    const queryLower = query.toLowerCase();
    const contentLower = JSON.stringify(memory.content).toLowerCase();
    
    // Direct match
    if (contentLower.includes(queryLower)) {
      return true;
    }
    
    // Check metadata
    if (memory.metadata.associations) {
      for (const association of memory.metadata.associations) {
        if (association.toLowerCase().includes(queryLower)) {
          return true;
        }
      }
    }
    
    // Semantic similarity (simplified)
    const queryWords = queryLower.split(/\s+/);
    const contentWords = contentLower.split(/\s+/);
    const overlap = queryWords.filter(w => contentWords.includes(w));
    
    return overlap.length >= Math.ceil(queryWords.length * 0.5);
  }

  /**
   * Calculate relevance scores
   */
  calculateRelevance(memories, query) {
    return memories.map(memory => {
      let relevance = 0;
      
      // Direct match score
      const queryLower = query.toLowerCase();
      const contentLower = JSON.stringify(memory.content).toLowerCase();
      
      if (contentLower.includes(queryLower)) {
        relevance += 0.5;
      }
      
      // Word overlap score
      const queryWords = queryLower.split(/\s+/);
      const contentWords = contentLower.split(/\s+/);
      const overlap = queryWords.filter(w => contentWords.includes(w));
      relevance += (overlap.length / queryWords.length) * 0.3;
      
      // Recency score
      const age = Date.now() - memory.metadata.timestamp;
      const recencyScore = Math.exp(-age / (86400000 * 7)); // Decay over a week
      relevance += recencyScore * 0.2;
      
      return {
        ...memory,
        relevance: Math.min(relevance, 1.0)
      };
    });
  }

  /**
   * Apply filters to memories
   */
  applyFilters(memories, filters) {
    let filtered = [...memories];
    
    // Importance filter
    if (filters.minImportance > 0) {
      filtered = filtered.filter(m => m.metadata.importance >= filters.minImportance);
    }
    
    // Age filter
    if (filters.maxAge) {
      const cutoff = Date.now() - filters.maxAge;
      filtered = filtered.filter(m => m.metadata.timestamp >= cutoff);
    }
    
    // Decay filter
    if (!filters.includeDecayed) {
      filtered = filtered.filter(m => m.metadata.decay > 0.3);
    }
    
    return filtered;
  }

  /**
   * Synthesize retrieved memories into coherent response
   */
  synthesizeResults(memories, query) {
    if (memories.length === 0) {
      return {
        found: false,
        content: null,
        confidence: 0
      };
    }
    
    // Group by memory type
    const grouped = {
      facts: [],
      experiences: [],
      procedures: [],
      concepts: []
    };
    
    for (const memory of memories) {
      if (memory.type === 'semantic') {
        grouped.concepts.push(memory);
      } else if (memory.type === 'episodic') {
        grouped.experiences.push(memory);
      } else if (memory.type === 'procedural') {
        grouped.procedures.push(memory);
      } else {
        grouped.facts.push(memory);
      }
    }
    
    return {
      found: true,
      memories: memories,
      grouped: grouped,
      topMemory: memories[0],
      confidence: memories[0].relevance * memories[0].metadata.confidence,
      synthesis: this.createSynthesis(memories, query)
    };
  }

  /**
   * Create synthesis from multiple memories
   */
  createSynthesis(memories, query) {
    const contents = memories.map(m => m.content);
    const concepts = [...new Set(memories.flatMap(m => m.metadata.associations || []))];
    
    return {
      mainContent: contents[0], // Most relevant
      supportingContent: contents.slice(1, 4),
      relatedConcepts: concepts.slice(0, 5),
      confidence: memories[0].relevance,
      sources: memories.length
    };
  }

  /**
   * Apply forgetting curve to reduce memory load
   */
  async applyForgettingCurve() {
    if (!this.config.forgettingCurveEnabled) return;
    
    const now = Date.now();
    const toRemove = [];
    
    for (const [key, memory] of this.memory.longTerm) {
      const age = now - memory.metadata.timestamp;
      const accessRecency = now - (memory.metadata.lastAccessed || memory.metadata.timestamp);
      
      // Calculate retention probability
      const retentionProbability = this.calculateRetention(
        age,
        accessRecency,
        memory.metadata.accessCount,
        memory.metadata.importance
      );
      
      // Apply decay
      memory.metadata.decay = retentionProbability;
      
      // Remove if below threshold
      if (retentionProbability < 0.1) {
        toRemove.push(key);
      }
    }
    
    // Remove forgotten memories
    for (const key of toRemove) {
      this.memory.longTerm.delete(key);
    }
    
    if (toRemove.length > 0) {
      console.log(`   🧹 Forgot ${toRemove.length} low-value memories`);
    }
  }

  /**
   * Calculate memory retention probability
   */
  calculateRetention(age, accessRecency, accessCount, importance) {
    // Ebbinghaus forgetting curve with modifications
    const ageFactor = Math.exp(-age / (86400000 * 30)); // 30-day half-life
    const accessFactor = Math.exp(-accessRecency / (86400000 * 7)); // 7-day recency boost
    const frequencyFactor = Math.min(accessCount / 10, 1.0);
    const importanceFactor = importance;
    
    return (ageFactor * 0.3 + accessFactor * 0.3 + frequencyFactor * 0.2 + importanceFactor * 0.2);
  }

  /**
   * Build semantic associations
   */
  async buildSemanticAssociations(concept, memoryItem) {
    // Find related concepts
    const related = this.findRelatedConcepts(concept);
    
    // Create bidirectional associations
    for (const relatedConcept of related) {
      if (!this.indexes.association.has(concept)) {
        this.indexes.association.set(concept, new Set());
      }
      if (!this.indexes.association.has(relatedConcept)) {
        this.indexes.association.set(relatedConcept, new Set());
      }
      
      this.indexes.association.get(concept).add(relatedConcept);
      this.indexes.association.get(relatedConcept).add(concept);
    }
    
    // Update memory associations
    memoryItem.metadata.associations = [
      ...(memoryItem.metadata.associations || []),
      ...related
    ];
  }

  /**
   * Extract concepts from content
   */
  extractConcept(content) {
    // Simple concept extraction - in practice would use NLP
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    
    // Return most significant word as concept
    return words[0] || 'general';
  }

  /**
   * Extract procedure from content
   */
  extractProcedure(content) {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Look for action words
    const actionWords = ['create', 'build', 'implement', 'design', 'analyze', 'process'];
    
    for (const action of actionWords) {
      if (text.toLowerCase().includes(action)) {
        return action;
      }
    }
    
    return 'general-procedure';
  }

  /**
   * Find related concepts
   */
  findRelatedConcepts(concept) {
    const related = [];
    
    // Check association index
    if (this.indexes.association.has(concept)) {
      related.push(...this.indexes.association.get(concept));
    }
    
    // Simple word similarity
    for (const [key, value] of this.memory.semantic) {
      if (key !== concept && this.calculateSimilarity(key, concept) > 0.5) {
        related.push(key);
      }
    }
    
    return [...new Set(related)].slice(0, 5);
  }

  /**
   * Calculate similarity between concepts
   */
  calculateSimilarity(concept1, concept2) {
    const c1 = concept1.toLowerCase();
    const c2 = concept2.toLowerCase();
    
    // Exact match
    if (c1 === c2) return 1.0;
    
    // Substring match
    if (c1.includes(c2) || c2.includes(c1)) return 0.7;
    
    // Character overlap
    const chars1 = new Set(c1.split(''));
    const chars2 = new Set(c2.split(''));
    const intersection = new Set([...chars1].filter(x => chars2.has(x)));
    const union = new Set([...chars1, ...chars2]);
    
    return intersection.size / union.size;
  }

  /**
   * Extract query concepts
   */
  extractQueryConcepts(query) {
    return query.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 3);
  }

  /**
   * Calculate importance of memory
   */
  calculateImportance(content, metadata) {
    let importance = 0.5; // Base importance
    
    // Adjust based on metadata
    if (metadata.source === 'user') importance += 0.2;
    if (metadata.source === 'system') importance += 0.1;
    if (metadata.type === 'decision') importance += 0.2;
    if (metadata.type === 'error') importance += 0.15;
    if (metadata.type === 'success') importance += 0.15;
    
    // Adjust based on content keywords
    const importantKeywords = ['critical', 'important', 'essential', 'key', 'main', 'primary'];
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    
    for (const keyword of importantKeywords) {
      if (contentStr.toLowerCase().includes(keyword)) {
        importance += 0.1;
        break;
      }
    }
    
    return Math.min(importance, 1.0);
  }

  /**
   * Generate memory key for storage
   */
  generateMemoryKey(memoryItem) {
    const timestamp = memoryItem.metadata.timestamp;
    const type = memoryItem.type;
    const hash = this.simpleHash(JSON.stringify(memoryItem.content));
    
    return `${type}-${timestamp}-${hash}`;
  }

  /**
   * Simple hash function for memory keys
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Update memory indexes
   */
  async updateIndexes(memoryItem) {
    // Temporal index
    const timeKey = Math.floor(memoryItem.metadata.timestamp / 3600000); // Hour buckets
    if (!this.indexes.temporal.has(timeKey)) {
      this.indexes.temporal.set(timeKey, []);
    }
    this.indexes.temporal.get(timeKey).push(memoryItem.id);
    
    // Semantic index
    const concepts = this.extractQueryConcepts(JSON.stringify(memoryItem.content));
    for (const concept of concepts) {
      if (!this.indexes.semantic.has(concept)) {
        this.indexes.semantic.set(concept, []);
      }
      this.indexes.semantic.get(concept).push(memoryItem.id);
    }
    
    // Importance index
    const importanceKey = Math.floor(memoryItem.metadata.importance * 10);
    if (!this.indexes.importance.has(importanceKey)) {
      this.indexes.importance.set(importanceKey, []);
    }
    this.indexes.importance.get(importanceKey).push(memoryItem.id);
  }

  /**
   * Identify patterns in memories
   */
  identifyPatterns(memories) {
    const patterns = {
      frequentConcepts: new Map(),
      sequences: [],
      clusters: []
    };
    
    // Find frequent concepts
    for (const memory of memories) {
      const concepts = this.extractQueryConcepts(JSON.stringify(memory.content));
      for (const concept of concepts) {
        patterns.frequentConcepts.set(
          concept,
          (patterns.frequentConcepts.get(concept) || 0) + 1
        );
      }
    }
    
    // Find sequences (simplified)
    for (let i = 0; i < memories.length - 2; i++) {
      const sequence = memories.slice(i, i + 3);
      if (this.isValidSequence(sequence)) {
        patterns.sequences.push(sequence);
      }
    }
    
    return patterns;
  }

  /**
   * Check if memories form a valid sequence
   */
  isValidSequence(memories) {
    if (memories.length < 2) return false;
    
    // Check temporal ordering
    for (let i = 1; i < memories.length; i++) {
      if (memories[i].metadata.timestamp <= memories[i-1].metadata.timestamp) {
        return false;
      }
    }
    
    // Check conceptual connection
    const concepts = memories.map(m => 
      this.extractQueryConcepts(JSON.stringify(m.content))
    ).flat();
    
    const uniqueConcepts = new Set(concepts);
    return uniqueConcepts.size < concepts.length; // Some overlap
  }

  /**
   * Merge similar memories to reduce redundancy
   */
  async mergeSimilarMemories() {
    const merged = new Map();
    
    for (const [key, memory] of this.memory.longTerm) {
      let wasMerged = false;
      
      for (const [mergedKey, mergedMemory] of merged) {
        if (this.calculateSimilarity(
          JSON.stringify(memory.content),
          JSON.stringify(mergedMemory.content)
        ) > 0.8) {
          // Merge into existing
          mergedMemory.metadata.accessCount += memory.metadata.accessCount;
          mergedMemory.metadata.importance = Math.max(
            mergedMemory.metadata.importance,
            memory.metadata.importance
          );
          wasMerged = true;
          break;
        }
      }
      
      if (!wasMerged) {
        merged.set(key, memory);
      }
    }
    
    this.memory.longTerm = merged;
  }

  /**
   * Extract semantic concepts from recent memories
   */
  async extractSemanticConcepts() {
    const recentMemories = this.memory.shortTerm.slice(-20);
    
    for (const memory of recentMemories) {
      const concepts = this.extractQueryConcepts(JSON.stringify(memory.content));
      
      for (const concept of concepts) {
        if (!this.memory.semantic.has(concept)) {
          this.memory.semantic.set(concept, []);
        }
        
        // Add memory reference to concept
        this.memory.semantic.get(concept).push({
          memoryId: memory.id,
          relevance: 0.8,
          timestamp: memory.metadata.timestamp
        });
      }
    }
  }

  /**
   * Build association networks between memories
   */
  async buildAssociationNetworks() {
    // Build associations based on co-occurrence
    const memories = [...this.memory.shortTerm, ...Array.from(this.memory.longTerm.values())];
    
    for (let i = 0; i < memories.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 5, memories.length); j++) {
        const similarity = this.calculateSimilarity(
          JSON.stringify(memories[i].content),
          JSON.stringify(memories[j].content)
        );
        
        if (similarity > 0.5) {
          // Create association
          if (!memories[i].metadata.associations) {
            memories[i].metadata.associations = [];
          }
          if (!memories[j].metadata.associations) {
            memories[j].metadata.associations = [];
          }
          
          memories[i].metadata.associations.push(memories[j].id);
          memories[j].metadata.associations.push(memories[i].id);
        }
      }
    }
  }

  /**
   * Apply decay to memories based on age and usage
   */
  async applyMemoryDecay() {
    const now = Date.now();
    
    // Apply to long-term memories
    for (const [key, memory] of this.memory.longTerm) {
      const age = now - memory.metadata.timestamp;
      const accessRecency = now - (memory.metadata.lastAccessed || memory.metadata.timestamp);
      
      // Calculate decay
      const decay = this.calculateRetention(
        age,
        accessRecency,
        memory.metadata.accessCount,
        memory.metadata.importance
      );
      
      memory.metadata.decay = decay;
    }
    
    // Apply to episodic memories
    for (const memory of this.memory.episodic) {
      const age = now - memory.metadata.timestamp;
      memory.metadata.decay = Math.exp(-age / (86400000 * 14)); // 14-day half-life
    }
  }

  /**
   * Check if consolidation is needed
   */
  shouldConsolidate() {
    return (
      this.memory.shortTerm.length > this.config.maxShortTermSize * 0.8 ||
      this.memory.working.length > this.config.maxWorkingSize * 0.9 ||
      Date.now() - (this.lastConsolidation || 0) > this.config.consolidationInterval
    );
  }

  /**
   * Start automatic consolidation timer
   */
  startConsolidationTimer() {
    this.consolidationTimer = setInterval(async () => {
      if (this.shouldConsolidate()) {
        await this.consolidateMemory();
      }
    }, this.config.consolidationInterval);
  }

  /**
   * Stop consolidation timer
   */
  stopConsolidationTimer() {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
      this.consolidationTimer = null;
    }
  }

  /**
   * Save memory to persistent storage
   */
  async saveMemoryToDisk() {
    try {
      const memoryPath = path.join(this.config.persistencePath, this.agentId);
      
      // Save each memory type
      const memoryData = {
        metadata: this.metadata,
        shortTerm: this.memory.shortTerm,
        longTerm: Array.from(this.memory.longTerm.entries()),
        episodic: this.memory.episodic,
        semantic: Array.from(this.memory.semantic.entries()),
        procedural: Array.from(this.memory.procedural.entries())
      };
      
      // Compress if enabled
      let dataToSave = JSON.stringify(memoryData, null, 2);
      if (this.config.compressionEnabled) {
        // In practice, would use proper compression
        dataToSave = JSON.stringify(memoryData);
      }
      
      await fs.writeFile(
        path.join(memoryPath, 'memory.json'),
        dataToSave,
        'utf8'
      );
      
      // Save indexes separately
      const indexData = {
        temporal: Array.from(this.indexes.temporal.entries()),
        semantic: Array.from(this.indexes.semantic.entries()),
        importance: Array.from(this.indexes.importance.entries()),
        association: Array.from(this.indexes.association.entries())
      };
      
      await fs.writeFile(
        path.join(memoryPath, 'indexes.json'),
        JSON.stringify(indexData),
        'utf8'
      );
      
    } catch (error) {
      logger.error(`Failed to save memory for ${this.agentId}:`, error);
    }
  }

  /**
   * Load persisted memory from disk
   */
  async loadPersistedMemory() {
    try {
      const memoryPath = path.join(this.config.persistencePath, this.agentId);
      
      // Check if memory file exists
      try {
        await fs.access(path.join(memoryPath, 'memory.json'));
      } catch {
        // No existing memory
        return;
      }
      
      // Load memory data
      const memoryData = JSON.parse(
        await fs.readFile(path.join(memoryPath, 'memory.json'), 'utf8')
      );
      
      // Restore memory
      this.metadata = memoryData.metadata || this.metadata;
      this.memory.shortTerm = memoryData.shortTerm || [];
      this.memory.longTerm = new Map(memoryData.longTerm || []);
      this.memory.episodic = memoryData.episodic || [];
      this.memory.semantic = new Map(memoryData.semantic || []);
      this.memory.procedural = new Map(memoryData.procedural || []);
      
      // Load indexes
      try {
        const indexData = JSON.parse(
          await fs.readFile(path.join(memoryPath, 'indexes.json'), 'utf8')
        );
        
        this.indexes.temporal = new Map(indexData.temporal || []);
        this.indexes.semantic = new Map(indexData.semantic || []);
        this.indexes.importance = new Map(indexData.importance || []);
        this.indexes.association = new Map(indexData.association || []);
      } catch {
        // Rebuild indexes if needed
        await this.rebuildIndexes();
      }
      
      console.log(`   ✓ Loaded ${this.memory.longTerm.size} long-term memories for ${this.agentId}`);
      
    } catch (error) {
      logger.error(`Failed to load memory for ${this.agentId}:`, error);
    }
  }

  /**
   * Rebuild indexes from memory
   */
  async rebuildIndexes() {
    this.indexes = {
      temporal: new Map(),
      semantic: new Map(),
      importance: new Map(),
      association: new Map()
    };
    
    // Rebuild from all memories
    const allMemories = [
      ...this.memory.shortTerm,
      ...Array.from(this.memory.longTerm.values()),
      ...this.memory.episodic
    ];
    
    for (const memory of allMemories) {
      await this.updateIndexes(memory);
    }
  }

  /**
   * Get memory statistics
   */
  getStatistics() {
    return {
      agentId: this.agentId,
      metadata: this.metadata,
      memoryCounts: {
        shortTerm: this.memory.shortTerm.length,
        longTerm: this.memory.longTerm.size,
        episodic: this.memory.episodic.length,
        semantic: this.memory.semantic.size,
        working: this.memory.working.length,
        procedural: this.memory.procedural.size
      },
      indexSizes: {
        temporal: this.indexes.temporal.size,
        semantic: this.indexes.semantic.size,
        importance: this.indexes.importance.size,
        association: this.indexes.association.size
      },
      totalMemories: this.getTotalMemoryCount()
    };
  }

  /**
   * Get total memory count
   */
  getTotalMemoryCount() {
    return (
      this.memory.shortTerm.length +
      this.memory.longTerm.size +
      this.memory.episodic.length +
      this.memory.semantic.size +
      this.memory.working.length +
      this.memory.procedural.size
    );
  }

  /**
   * Clear all memories (use with caution)
   */
  async clearAllMemories() {
    this.memory = {
      shortTerm: [],
      longTerm: new Map(),
      episodic: [],
      semantic: new Map(),
      working: [],
      procedural: new Map()
    };
    
    this.indexes = {
      temporal: new Map(),
      semantic: new Map(),
      importance: new Map(),
      association: new Map()
    };
    
    await this.saveMemoryToDisk();
    
    console.log(`   🧹 Cleared all memories for ${this.agentId}`);
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    this.stopConsolidationTimer();
    await this.consolidateMemory();
    await this.saveMemoryToDisk();
    
    console.log(`   💾 Memory bank shut down for ${this.agentId}`);
  }
}

export default AgentMemoryBank;