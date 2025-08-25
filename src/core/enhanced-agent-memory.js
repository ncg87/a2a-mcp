/**
 * Enhanced Agent Memory System
 * 
 * Provides sophisticated memory capabilities for agents to remember
 * and reference previous statements, build on ideas, and maintain context
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

export class EnhancedAgentMemory {
  constructor() {
    // Multi-layered memory structure
    this.shortTermMemory = new Map();  // Last 10 exchanges per agent
    this.workingMemory = new Map();    // Current discussion context
    this.episodicMemory = new Map();   // Specific memorable events
    this.semanticMemory = new Map();   // Facts and knowledge learned
    this.socialMemory = new Map();     // Relationships and opinions about other agents
    
    // Memory indexes for fast retrieval
    this.topicIndex = new Map();       // Index by topic/keyword
    this.agentIndex = new Map();       // Index by agent interactions
    this.questionIndex = new Map();    // Track questions and answers
    this.insightIndex = new Map();     // Important insights and discoveries
    
    // Memory configuration
    this.config = {
      shortTermCapacity: 10,
      workingMemoryDuration: 5 * 60 * 1000, // 5 minutes
      episodicRetention: 24 * 60 * 60 * 1000, // 24 hours
      importanceThreshold: 0.7
    };
  }

  /**
   * Store an exchange in agent's memory with full context
   */
  async storeExchange(agentId, exchange) {
    const memoryEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      from: exchange.from,
      to: exchange.to,
      content: exchange.content,
      type: exchange.type || 'statement',
      importance: this.calculateImportance(exchange),
      keywords: this.extractKeywords(exchange.content),
      sentiment: this.analyzeSentiment(exchange.content),
      references: this.extractReferences(exchange.content),
      metadata: exchange.metadata || {}
    };

    // Store in short-term memory
    this.updateShortTermMemory(agentId, memoryEntry);
    
    // Update working memory if active
    if (this.isRelevantToCurrentDiscussion(memoryEntry)) {
      this.updateWorkingMemory(agentId, memoryEntry);
    }
    
    // Store important exchanges in episodic memory
    if (memoryEntry.importance > this.config.importanceThreshold) {
      this.storeEpisodicMemory(agentId, memoryEntry);
    }
    
    // Extract and store facts in semantic memory
    const facts = this.extractFacts(exchange.content);
    if (facts.length > 0) {
      this.updateSemanticMemory(agentId, facts);
    }
    
    // Update social memory
    this.updateSocialMemory(agentId, exchange);
    
    // Update indexes
    this.updateIndexes(agentId, memoryEntry);
    
    return memoryEntry;
  }

  /**
   * Retrieve relevant memories for context building
   */
  async retrieveRelevantMemories(agentId, context, options = {}) {
    const relevantMemories = {
      recentExchanges: [],
      relatedTopics: [],
      previousQuestions: [],
      agentOpinions: [],
      importantFacts: [],
      socialContext: []
    };

    // Get recent exchanges from short-term memory
    const shortTerm = this.shortTermMemory.get(agentId) || [];
    relevantMemories.recentExchanges = shortTerm.slice(-5);

    // Find related topics from indexes
    if (context.topic) {
      const keywords = this.extractKeywords(context.topic);
      for (const keyword of keywords) {
        const topicMemories = this.topicIndex.get(keyword) || [];
        relevantMemories.relatedTopics.push(...topicMemories.filter(m => m.agentId === agentId));
      }
    }

    // Get unanswered questions
    const questions = this.questionIndex.get(agentId) || [];
    relevantMemories.previousQuestions = questions.filter(q => !q.answered);

    // Get opinions about other agents
    if (context.targetAgent) {
      const socialMem = this.socialMemory.get(agentId) || new Map();
      const targetOpinions = socialMem.get(context.targetAgent) || {};
      relevantMemories.agentOpinions = targetOpinions;
    }

    // Get important facts from semantic memory
    const semanticMem = this.semanticMemory.get(agentId) || [];
    relevantMemories.importantFacts = semanticMem
      .filter(fact => fact.relevance > 0.5)
      .slice(0, 5);

    // Get social context
    relevantMemories.socialContext = this.getSocialContext(agentId);

    return relevantMemories;
  }

  /**
   * Build conversation context from memories
   */
  async buildConversationContext(agentId, targetAgentId, topic) {
    const memories = await this.retrieveRelevantMemories(agentId, { 
      topic, 
      targetAgent: targetAgentId 
    });

    const context = {
      // What the agent knows about the topic
      topicKnowledge: memories.relatedTopics && memories.relatedTopics.length > 0
        ? memories.relatedTopics.map(m => m.content).join('\n')
        : '',
      
      // Recent conversation history
      recentHistory: memories.recentExchanges && memories.recentExchanges.length > 0
        ? memories.recentExchanges.map(m => `${m.from?.name || 'Agent'}: ${m.content}`).join('\n')
        : '',
      
      // Unanswered questions to potentially address
      pendingQuestions: memories.previousQuestions && memories.previousQuestions.length > 0
        ? memories.previousQuestions.map(q => q.question).join('\n')
        : '',
      
      // Opinion about the target agent
      targetAgentProfile: memories.agentOpinions || {},
      
      // Key facts to consider
      relevantFacts: memories.importantFacts && memories.importantFacts.length > 0
        ? memories.importantFacts.map(f => f.content).join('\n')
        : '',
      
      // Social dynamics
      socialContext: memories.socialContext
    };

    return context;
  }

  /**
   * Update short-term memory with size limit
   */
  updateShortTermMemory(agentId, entry) {
    if (!this.shortTermMemory.has(agentId)) {
      this.shortTermMemory.set(agentId, []);
    }
    
    const memory = this.shortTermMemory.get(agentId);
    memory.push(entry);
    
    // Maintain capacity limit
    if (memory.length > this.config.shortTermCapacity) {
      memory.shift();
    }
  }

  /**
   * Update working memory for active discussions
   */
  updateWorkingMemory(agentId, entry) {
    if (!this.workingMemory.has(agentId)) {
      this.workingMemory.set(agentId, []);
    }
    
    const memory = this.workingMemory.get(agentId);
    memory.push({
      ...entry,
      expiresAt: Date.now() + this.config.workingMemoryDuration
    });
    
    // Clean expired entries
    const now = Date.now();
    this.workingMemory.set(
      agentId,
      memory.filter(m => m.expiresAt > now)
    );
  }

  /**
   * Store important events in episodic memory
   */
  storeEpisodicMemory(agentId, entry) {
    if (!this.episodicMemory.has(agentId)) {
      this.episodicMemory.set(agentId, []);
    }
    
    this.episodicMemory.get(agentId).push({
      ...entry,
      storedAt: Date.now(),
      expiresAt: Date.now() + this.config.episodicRetention
    });
  }

  /**
   * Update semantic memory with facts
   */
  updateSemanticMemory(agentId, facts) {
    if (!this.semanticMemory.has(agentId)) {
      this.semanticMemory.set(agentId, []);
    }
    
    const memory = this.semanticMemory.get(agentId);
    for (const fact of facts) {
      // Check if fact already exists
      const existing = memory.find(f => f.content === fact.content);
      if (existing) {
        existing.confidence = Math.min(1, existing.confidence + 0.1);
        existing.references.push(fact.reference);
      } else {
        memory.push({
          id: uuidv4(),
          content: fact.content,
          confidence: fact.confidence || 0.5,
          relevance: fact.relevance || 0.5,
          references: [fact.reference],
          learnedAt: Date.now()
        });
      }
    }
  }

  /**
   * Update social memory about other agents
   */
  updateSocialMemory(agentId, exchange) {
    if (!this.socialMemory.has(agentId)) {
      this.socialMemory.set(agentId, new Map());
    }
    
    const socialMem = this.socialMemory.get(agentId);
    const targetId = exchange.to.id;
    
    if (!socialMem.has(targetId)) {
      socialMem.set(targetId, {
        interactions: 0,
        agreements: 0,
        disagreements: 0,
        questionsAsked: 0,
        questionsAnswered: 0,
        trust: 0.5,
        expertise: [],
        communicationStyle: ''
      });
    }
    
    const profile = socialMem.get(targetId);
    profile.interactions++;
    
    // Update based on exchange type
    if (exchange.type === 'agreement') profile.agreements++;
    if (exchange.type === 'disagreement') profile.disagreements++;
    if (exchange.type === 'question') profile.questionsAsked++;
    if (exchange.type === 'answer') profile.questionsAnswered++;
    
    // Update trust based on interactions
    profile.trust = this.calculateTrust(profile);
  }

  /**
   * Update various indexes for fast retrieval
   */
  updateIndexes(agentId, entry) {
    // Update topic index
    for (const keyword of entry.keywords) {
      if (!this.topicIndex.has(keyword)) {
        this.topicIndex.set(keyword, []);
      }
      this.topicIndex.get(keyword).push({
        agentId,
        entryId: entry.id,
        content: entry.content,
        timestamp: entry.timestamp
      });
    }
    
    // Update agent interaction index
    const interactionKey = `${entry.from.id}-${entry.to.id}`;
    if (!this.agentIndex.has(interactionKey)) {
      this.agentIndex.set(interactionKey, []);
    }
    this.agentIndex.get(interactionKey).push(entry);
    
    // Update question index if applicable
    if (entry.type === 'question') {
      if (!this.questionIndex.has(entry.to.id)) {
        this.questionIndex.set(entry.to.id, []);
      }
      this.questionIndex.get(entry.to.id).push({
        questionId: entry.id,
        question: entry.content,
        askedBy: entry.from.id,
        timestamp: entry.timestamp,
        answered: false
      });
    }
  }

  /**
   * Calculate importance of an exchange
   */
  calculateImportance(exchange) {
    let importance = 0.5; // Base importance
    
    // Questions and answers are more important
    if (exchange.type === 'question' || exchange.type === 'answer') {
      importance += 0.2;
    }
    
    // Agreements and disagreements are important
    if (exchange.type === 'agreement' || exchange.type === 'disagreement') {
      importance += 0.15;
    }
    
    // Insights are very important
    if (exchange.type === 'insight' || exchange.content.includes('realize') || 
        exchange.content.includes('discovered')) {
      importance += 0.3;
    }
    
    // Longer, detailed responses are more important
    if (exchange.content.length > 200) {
      importance += 0.1;
    }
    
    return Math.min(1, importance);
  }

  /**
   * Extract keywords from content
   */
  extractKeywords(content) {
    // Simple keyword extraction - in production, use NLP
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but'];
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));
    
    // Return unique keywords
    return [...new Set(words)].slice(0, 10);
  }

  /**
   * Analyze sentiment of content
   */
  analyzeSentiment(content) {
    // Simple sentiment analysis
    const positive = ['agree', 'good', 'excellent', 'right', 'correct', 'yes'];
    const negative = ['disagree', 'wrong', 'incorrect', 'no', 'bad', 'poor'];
    
    const contentLower = content.toLowerCase();
    let score = 0;
    
    positive.forEach(word => {
      if (contentLower.includes(word)) score += 0.2;
    });
    
    negative.forEach(word => {
      if (contentLower.includes(word)) score -= 0.2;
    });
    
    return {
      score: Math.max(-1, Math.min(1, score)),
      label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral'
    };
  }

  /**
   * Extract references to other agents or previous statements
   */
  extractReferences(content) {
    const references = [];
    
    // Look for agent mentions
    const agentPattern = /@(\w+)/g;
    const agentMatches = content.matchAll(agentPattern);
    for (const match of agentMatches) {
      references.push({ type: 'agent', target: match[1] });
    }
    
    // Look for quote references
    if (content.includes('"') || content.includes("'")) {
      references.push({ type: 'quote', content: content });
    }
    
    // Look for agreement/disagreement references
    if (content.includes('as mentioned') || content.includes('you said')) {
      references.push({ type: 'previous_statement' });
    }
    
    return references;
  }

  /**
   * Extract facts from content
   */
  extractFacts(content) {
    const facts = [];
    
    // Look for factual statements (simple heuristic)
    const factPatterns = [
      /(\w+) is (\w+)/g,
      /(\w+) are (\w+)/g,
      /(\w+) can (\w+)/g,
      /(\w+) will (\w+)/g
    ];
    
    for (const pattern of factPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        facts.push({
          content: match[0],
          confidence: 0.5,
          relevance: 0.5,
          reference: content
        });
      }
    }
    
    return facts;
  }

  /**
   * Check if entry is relevant to current discussion
   */
  isRelevantToCurrentDiscussion(entry) {
    // Check if within working memory timeframe
    const recentThreshold = Date.now() - this.config.workingMemoryDuration;
    return entry.timestamp > recentThreshold;
  }

  /**
   * Get social context for an agent
   */
  getSocialContext(agentId) {
    const socialMem = this.socialMemory.get(agentId) || new Map();
    const context = {
      trustedAgents: [],
      conflictingAgents: [],
      frequentCollaborators: []
    };
    
    for (const [targetId, profile] of socialMem) {
      if (profile.trust > 0.7) {
        context.trustedAgents.push(targetId);
      }
      if (profile.disagreements > profile.agreements) {
        context.conflictingAgents.push(targetId);
      }
      if (profile.interactions > 5) {
        context.frequentCollaborators.push(targetId);
      }
    }
    
    return context;
  }

  /**
   * Calculate trust score based on interaction history
   */
  calculateTrust(profile) {
    const agreementRatio = profile.interactions > 0 
      ? profile.agreements / profile.interactions 
      : 0.5;
    
    const responseRate = profile.questionsAsked > 0
      ? profile.questionsAnswered / profile.questionsAsked
      : 0.5;
    
    // Weighted average of factors
    return (agreementRatio * 0.6 + responseRate * 0.4);
  }

  /**
   * Mark a question as answered
   */
  markQuestionAnswered(questionId, answerId) {
    for (const [agentId, questions] of this.questionIndex) {
      const question = questions.find(q => q.questionId === questionId);
      if (question) {
        question.answered = true;
        question.answerId = answerId;
        question.answeredAt = Date.now();
        break;
      }
    }
  }

  /**
   * Get memory statistics for monitoring
   */
  getMemoryStats() {
    return {
      shortTermEntries: Array.from(this.shortTermMemory.values()).flat().length,
      workingMemoryEntries: Array.from(this.workingMemory.values()).flat().length,
      episodicMemoryEntries: Array.from(this.episodicMemory.values()).flat().length,
      semanticFacts: Array.from(this.semanticMemory.values()).flat().length,
      socialProfiles: Array.from(this.socialMemory.values()).reduce((acc, m) => acc + m.size, 0),
      indexedTopics: this.topicIndex.size,
      trackedQuestions: Array.from(this.questionIndex.values()).flat().length
    };
  }

  /**
   * Clear expired memories
   */
  cleanupExpiredMemories() {
    const now = Date.now();
    
    // Clean working memory
    for (const [agentId, memories] of this.workingMemory) {
      this.workingMemory.set(
        agentId,
        memories.filter(m => m.expiresAt > now)
      );
    }
    
    // Clean episodic memory
    for (const [agentId, memories] of this.episodicMemory) {
      this.episodicMemory.set(
        agentId,
        memories.filter(m => m.expiresAt > now)
      );
    }
    
    logger.debug('Memory cleanup completed', this.getMemoryStats());
  }
}

export default EnhancedAgentMemory;