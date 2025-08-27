/**
 * Insight Evaluator
 * 
 * Evaluates discoveries to determine if they are true insights
 * worth saving and emailing
 */

import logger from '../utils/logger.js';

export class InsightEvaluator {
  constructor() {
    this.sharedMemory = null;
    
    // Evaluation criteria weights
    this.criteriaWeights = {
      novelty: 0.3,
      relevance: 0.25,
      actionability: 0.2,
      clarity: 0.15,
      evidence: 0.1
    };
    
    // Insight type classifications
    this.insightTypes = {
      BREAKTHROUGH: 'breakthrough',
      DISCOVERY: 'discovery',
      CONNECTION: 'connection',
      PATTERN: 'pattern',
      PREDICTION: 'prediction',
      SOLUTION: 'solution',
      WARNING: 'warning',
      OPPORTUNITY: 'opportunity',
      SYNTHESIS: 'synthesis',
      CRITICAL: 'critical'
    };
    
    // Keywords indicating high-value insights
    this.highValueKeywords = [
      'breakthrough', 'discovery', 'revolutionary', 'paradigm',
      'unprecedented', 'critical', 'urgent', 'transformative',
      'game-changing', 'disruptive', 'novel', 'first',
      'solved', 'proven', 'confirmed', 'validated'
    ];
    
    // Pattern matchers for different insight types
    this.insightPatterns = {
      discovery: /discovered|found|identified|uncovered|revealed/i,
      connection: /relates to|connected|linked|correlation|relationship/i,
      pattern: /pattern|trend|tendency|recurring|systematic/i,
      prediction: /predict|forecast|expect|will|future|likely/i,
      solution: /solves|addresses|fixes|resolves|answers/i,
      warning: /risk|danger|threat|concern|warning|caution/i,
      opportunity: /opportunity|potential|possibility|could|enable/i
    };
  }

  /**
   * Initialize with shared memory
   */
  async initialize(sharedMemory) {
    this.sharedMemory = sharedMemory;
    logger.info('Insight evaluator initialized');
  }

  /**
   * Evaluate if content contains an insight
   */
  async evaluate(content, topic) {
    const evaluation = {
      isInsight: false,
      score: 0,
      insightType: null,
      novelty: 0,
      relevance: 0,
      actionability: 0,
      clarity: 0,
      evidence: 0,
      confidence: 0
    };
    
    // Basic content check
    if (!content || content.length < 50) {
      return evaluation;
    }
    
    // Evaluate each criterion
    evaluation.novelty = await this.evaluateNovelty(content);
    evaluation.relevance = this.evaluateRelevance(content, topic);
    evaluation.actionability = this.evaluateActionability(content);
    evaluation.clarity = this.evaluateClarity(content);
    evaluation.evidence = this.evaluateEvidence(content);
    
    // Calculate weighted score
    evaluation.score = this.calculateWeightedScore(evaluation);
    
    // Determine insight type
    evaluation.insightType = this.classifyInsightType(content);
    
    // Calculate confidence
    evaluation.confidence = this.calculateConfidence(evaluation);
    
    // Determine if it's an insight
    evaluation.isInsight = evaluation.score >= 0.6 || 
                          evaluation.insightType === this.insightTypes.BREAKTHROUGH ||
                          evaluation.insightType === this.insightTypes.CRITICAL;
    
    return evaluation;
  }

  /**
   * Evaluate novelty by checking against memory
   */
  async evaluateNovelty(content) {
    // Check if similar content exists in memory
    if (this.sharedMemory) {
      const similar = await this.sharedMemory.searchMemory(
        content.substring(0, 100),
        { limit: 5, minRelevance: 0.8 }
      );
      
      if (similar.length > 0) {
        // Reduce novelty if similar content exists
        const maxSimilarity = Math.max(...similar.map(s => s.relevance));
        return Math.max(0, 1 - maxSimilarity);
      }
    }
    
    // Check for high-value keywords
    const hasHighValueKeywords = this.highValueKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    if (hasHighValueKeywords) {
      return 0.9;
    }
    
    // Check for unique technical terms
    const technicalTerms = this.extractTechnicalTerms(content);
    if (technicalTerms.length > 3) {
      return 0.7;
    }
    
    return 0.5; // Default moderate novelty
  }

  /**
   * Evaluate relevance to topic
   */
  evaluateRelevance(content, topic) {
    if (!topic) return 0.5;
    
    const contentLower = content.toLowerCase();
    const topicLower = (topic.title || topic).toLowerCase();
    const topicWords = topicLower.split(/\s+/);
    
    // Count topic word occurrences
    let relevanceScore = 0;
    for (const word of topicWords) {
      if (word.length > 3 && contentLower.includes(word)) {
        relevanceScore += 0.2;
      }
    }
    
    // Check for related domain terms
    const domainTerms = this.extractDomainTerms(topicLower);
    for (const term of domainTerms) {
      if (contentLower.includes(term)) {
        relevanceScore += 0.15;
      }
    }
    
    return Math.min(1, relevanceScore);
  }

  /**
   * Evaluate actionability
   */
  evaluateActionability(content) {
    const actionablePatterns = [
      /can be used/i,
      /should|must|need to/i,
      /recommend|suggest/i,
      /implement|apply|utilize/i,
      /step[s]?\s+\d+/i,
      /how to/i,
      /guide|tutorial|instruction/i,
      /best practice/i
    ];
    
    let actionabilityScore = 0;
    for (const pattern of actionablePatterns) {
      if (pattern.test(content)) {
        actionabilityScore += 0.15;
      }
    }
    
    // Check for specific recommendations
    if (content.includes('specifically') || content.includes('concretely')) {
      actionabilityScore += 0.2;
    }
    
    // Check for measurable outcomes
    if (/\d+%|\d+x|increase|decrease|improve/i.test(content)) {
      actionabilityScore += 0.15;
    }
    
    return Math.min(1, actionabilityScore);
  }

  /**
   * Evaluate clarity
   */
  evaluateClarity(content) {
    // Check sentence structure
    const sentences = content.split(/[.!?]+/);
    const avgSentenceLength = content.length / sentences.length;
    
    // Ideal sentence length is 15-25 words
    let clarityScore = 0.5;
    if (avgSentenceLength > 100) {
      clarityScore -= 0.2; // Too complex
    } else if (avgSentenceLength < 50) {
      clarityScore += 0.2; // Good clarity
    }
    
    // Check for structure indicators
    if (/first|second|finally|in conclusion/i.test(content)) {
      clarityScore += 0.15;
    }
    
    // Check for examples
    if (/for example|such as|including|specifically/i.test(content)) {
      clarityScore += 0.15;
    }
    
    return Math.min(1, Math.max(0, clarityScore));
  }

  /**
   * Evaluate evidence quality
   */
  evaluateEvidence(content) {
    let evidenceScore = 0.3; // Base score
    
    // Check for data/statistics
    if (/\d+%|\d+\s+(study|studies|research|paper)/i.test(content)) {
      evidenceScore += 0.2;
    }
    
    // Check for citations or references
    if (/according to|research shows|studies indicate|data suggests/i.test(content)) {
      evidenceScore += 0.2;
    }
    
    // Check for specific examples
    if (/for instance|case study|real-world example/i.test(content)) {
      evidenceScore += 0.15;
    }
    
    // Check for causal language
    if (/because|therefore|consequently|as a result/i.test(content)) {
      evidenceScore += 0.15;
    }
    
    return Math.min(1, evidenceScore);
  }

  /**
   * Calculate weighted score
   */
  calculateWeightedScore(evaluation) {
    let score = 0;
    score += evaluation.novelty * this.criteriaWeights.novelty;
    score += evaluation.relevance * this.criteriaWeights.relevance;
    score += evaluation.actionability * this.criteriaWeights.actionability;
    score += evaluation.clarity * this.criteriaWeights.clarity;
    score += evaluation.evidence * this.criteriaWeights.evidence;
    
    return score;
  }

  /**
   * Classify insight type
   */
  classifyInsightType(content) {
    const contentLower = content.toLowerCase();
    
    // Check for breakthrough indicators
    if (this.highValueKeywords.some(kw => contentLower.includes(kw))) {
      if (contentLower.includes('first') || contentLower.includes('never before')) {
        return this.insightTypes.BREAKTHROUGH;
      }
    }
    
    // Check for critical/urgent insights
    if (/critical|urgent|immediate|emergency/i.test(content)) {
      return this.insightTypes.CRITICAL;
    }
    
    // Check patterns for each type
    for (const [type, pattern] of Object.entries(this.insightPatterns)) {
      if (pattern.test(content)) {
        return type;
      }
    }
    
    // Check for synthesis (combining multiple ideas)
    if (content.includes(' and ') && content.includes('combining')) {
      return this.insightTypes.SYNTHESIS;
    }
    
    // Default to discovery
    return this.insightTypes.DISCOVERY;
  }

  /**
   * Calculate confidence in evaluation
   */
  calculateConfidence(evaluation) {
    // Higher confidence if multiple criteria are strong
    let strongCriteria = 0;
    if (evaluation.novelty > 0.7) strongCriteria++;
    if (evaluation.relevance > 0.7) strongCriteria++;
    if (evaluation.actionability > 0.7) strongCriteria++;
    if (evaluation.clarity > 0.7) strongCriteria++;
    if (evaluation.evidence > 0.7) strongCriteria++;
    
    const baseConfidence = strongCriteria / 5;
    
    // Boost confidence for certain insight types
    let typeBoost = 0;
    if (evaluation.insightType === this.insightTypes.BREAKTHROUGH) {
      typeBoost = 0.2;
    } else if (evaluation.insightType === this.insightTypes.CRITICAL) {
      typeBoost = 0.15;
    }
    
    return Math.min(1, baseConfidence + typeBoost);
  }

  /**
   * Extract technical terms
   */
  extractTechnicalTerms(content) {
    const technicalPatterns = [
      /[A-Z]{2,}/g, // Acronyms
      /\w+ization/g, // -ization words
      /\w+ology/g, // -ology words
      /\w+metric/g, // -metric words
      /quantum|neural|genetic|molecular|atomic/gi,
      /algorithm|protocol|framework|architecture/gi
    ];
    
    const terms = new Set();
    for (const pattern of technicalPatterns) {
      const matches = content.match(pattern) || [];
      matches.forEach(match => terms.add(match.toLowerCase()));
    }
    
    return Array.from(terms);
  }

  /**
   * Extract domain terms
   */
  extractDomainTerms(topic) {
    const domainMappings = {
      'ai': ['machine learning', 'neural', 'deep learning', 'model', 'training'],
      'quantum': ['qubit', 'superposition', 'entanglement', 'coherence'],
      'bio': ['genetic', 'protein', 'cell', 'molecular', 'organism'],
      'tech': ['software', 'hardware', 'system', 'platform', 'application'],
      'science': ['research', 'experiment', 'hypothesis', 'theory', 'data']
    };
    
    const terms = [];
    for (const [domain, domainTerms] of Object.entries(domainMappings)) {
      if (topic.includes(domain)) {
        terms.push(...domainTerms);
      }
    }
    
    return terms;
  }

  /**
   * Batch evaluate multiple pieces of content
   */
  async batchEvaluate(contents, topic) {
    const evaluations = [];
    
    for (const content of contents) {
      const evaluation = await this.evaluate(content, topic);
      evaluations.push(evaluation);
    }
    
    // Sort by score
    evaluations.sort((a, b) => b.score - a.score);
    
    return evaluations;
  }

  /**
   * Get evaluation statistics
   */
  getStatistics(evaluations) {
    const stats = {
      total: evaluations.length,
      insights: evaluations.filter(e => e.isInsight).length,
      averageScore: 0,
      typeDistribution: {},
      highQuality: evaluations.filter(e => e.score > 0.8).length
    };
    
    // Calculate average score
    const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0);
    stats.averageScore = totalScore / evaluations.length;
    
    // Count by type
    for (const evaluation of evaluations) {
      if (evaluation.insightType) {
        stats.typeDistribution[evaluation.insightType] = 
          (stats.typeDistribution[evaluation.insightType] || 0) + 1;
      }
    }
    
    return stats;
  }
}

export default InsightEvaluator;