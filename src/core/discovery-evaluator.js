/**
 * Discovery Evaluator
 * 
 * Evaluates discoveries to determine if they're "cool" enough to email
 * Uses multiple criteria to assess discovery importance
 */

import logger from '../utils/logger.js';

export class DiscoveryEvaluator {
  constructor() {
    // Criteria for evaluating discoveries
    this.criteria = {
      BREAKTHROUGH: {
        weight: 0.3,
        keywords: [
          'breakthrough', 'revolutionary', 'discovered', 'solved',
          'first time', 'never before', 'impossible', 'paradigm shift',
          'game changer', 'historic', 'unprecedented'
        ]
      },
      NOVELTY: {
        weight: 0.25,
        keywords: [
          'new', 'novel', 'unique', 'original', 'innovative',
          'unexpected', 'surprising', 'counterintuitive', 'paradox',
          'mystery', 'unknown', 'unexplained'
        ]
      },
      IMPACT: {
        weight: 0.2,
        keywords: [
          'change everything', 'transform', 'revolutionize', 'disrupt',
          'significant', 'major', 'important', 'crucial', 'critical',
          'fundamental', 'essential'
        ]
      },
      CONSENSUS: {
        weight: 0.15,
        keywords: [
          'scientists agree', 'consensus', 'confirmed', 'proven',
          'evidence shows', 'peer reviewed', 'replicated', 'validated'
        ]
      },
      CONTROVERSY: {
        weight: 0.1,
        keywords: [
          'controversial', 'debate', 'disagree', 'challenges',
          'contradicts', 'questions', 'disputes', 'contentious'
        ]
      }
    };
    
    // Coolness thresholds
    this.thresholds = {
      EMAIL_IMMEDIATELY: 0.8,  // Super cool - email right away
      EMAIL_BATCH: 0.6,        // Pretty cool - include in next batch
      INTERESTING: 0.4,        // Interesting but not email-worthy
      ROUTINE: 0.2            // Regular discovery
    };
    
    // Track recent emails to avoid spam
    this.recentEmails = [];
    this.emailCooldown = 30 * 60 * 1000; // 30 minutes between emails
    this.batchBuffer = [];
    this.batchThreshold = 3; // Email when 3 cool discoveries accumulate
  }

  /**
   * Evaluate if a discovery is cool enough to email
   */
  evaluateDiscovery(discovery, context = {}) {
    const coolnessScore = this.calculateCoolness(discovery, context);
    const evaluation = {
      score: coolnessScore,
      isCool: coolnessScore >= this.thresholds.EMAIL_BATCH,
      isSuperCool: coolnessScore >= this.thresholds.EMAIL_IMMEDIATELY,
      shouldEmailNow: false,
      reason: '',
      factors: this.analyzeFactors(discovery)
    };
    
    // Determine email action
    if (evaluation.isSuperCool) {
      if (this.canEmailNow()) {
        evaluation.shouldEmailNow = true;
        evaluation.reason = 'BREAKTHROUGH: This is an extraordinary discovery!';
      } else {
        // Add to high priority batch
        this.batchBuffer.unshift({
          ...discovery,
          coolness: coolnessScore,
          priority: 'high'
        });
        evaluation.reason = 'Amazing discovery! Will email soon (cooldown active)';
      }
    } else if (evaluation.isCool) {
      // Add to batch
      this.batchBuffer.push({
        ...discovery,
        coolness: coolnessScore,
        priority: 'normal'
      });
      
      // Check if batch is ready
      if (this.batchBuffer.length >= this.batchThreshold) {
        evaluation.shouldEmailNow = true;
        evaluation.reason = `Collection ready: ${this.batchBuffer.length} cool discoveries to share!`;
      } else {
        evaluation.reason = `Cool discovery added to collection (${this.batchBuffer.length}/${this.batchThreshold})`;
      }
    } else if (coolnessScore >= this.thresholds.INTERESTING) {
      evaluation.reason = 'Interesting finding, but not quite email-worthy';
    } else {
      evaluation.reason = 'Routine discovery';
    }
    
    logger.info(`Discovery evaluation: Score ${coolnessScore.toFixed(2)} - ${evaluation.reason}`);
    
    return evaluation;
  }

  /**
   * Calculate coolness score
   */
  calculateCoolness(discovery, context) {
    let score = 0;
    const content = (discovery.content || '').toLowerCase();
    const topic = (discovery.topic || context.topic || '').toLowerCase();
    
    // Check each criterion
    for (const [criterion, config] of Object.entries(this.criteria)) {
      let criterionScore = 0;
      
      // Check for keywords
      const matchCount = config.keywords.filter(keyword => 
        content.includes(keyword) || topic.includes(keyword)
      ).length;
      
      criterionScore = Math.min(1, matchCount / 3); // Normalize
      score += criterionScore * config.weight;
    }
    
    // Bonus factors
    if (context.hasConsensus) score += 0.1;
    if (context.multipleAgentsAgreed) score += 0.1;
    if (context.generatedInsight) score += 0.15;
    if (context.solvedProblem) score += 0.2;
    if (context.foundContradiction) score += 0.1;
    
    // Check for exciting patterns
    if (this.hasExcitingPattern(content)) {
      score += 0.15;
    }
    
    // Novelty bonus based on uniqueness
    if (this.isNovel(discovery)) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }

  /**
   * Analyze what factors make this discovery cool
   */
  analyzeFactors(discovery) {
    const factors = [];
    const content = (discovery.content || '').toLowerCase();
    
    // Check for breakthrough indicators
    if (content.includes('first') || content.includes('discovered')) {
      factors.push('First discovery');
    }
    
    if (content.includes('solved') || content.includes('answer')) {
      factors.push('Problem solved');
    }
    
    if (content.includes('impossible') || content.includes('thought')) {
      factors.push('Challenges assumptions');
    }
    
    if (content.includes('could') || content.includes('might')) {
      factors.push('Future implications');
    }
    
    if (content.includes('quantum') || content.includes('ai') || content.includes('consciousness')) {
      factors.push('Cutting-edge field');
    }
    
    return factors;
  }

  /**
   * Check for exciting patterns in content
   */
  hasExcitingPattern(content) {
    const excitingPatterns = [
      /scientists?.+discovered/i,
      /breakthrough.+in/i,
      /for the first time/i,
      /never before seen/i,
      /could change everything/i,
      /mystery.+solved/i,
      /evidence.+suggests/i,
      /quantum.+consciousness/i,
      /artificial.+intelligence/i
    ];
    
    return excitingPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if discovery is novel
   */
  isNovel(discovery) {
    // Simple novelty check - could be enhanced with memory
    const uniqueWords = [
      'unique', 'unprecedented', 'novel', 'original',
      'first', 'new', 'unusual', 'rare'
    ];
    
    const content = (discovery.content || '').toLowerCase();
    return uniqueWords.some(word => content.includes(word));
  }

  /**
   * Check if we can email now (cooldown)
   */
  canEmailNow() {
    if (this.recentEmails.length === 0) return true;
    
    const lastEmail = this.recentEmails[this.recentEmails.length - 1];
    const timeSinceLastEmail = Date.now() - lastEmail.timestamp;
    
    return timeSinceLastEmail >= this.emailCooldown;
  }

  /**
   * Get discoveries ready to email
   */
  getEmailBatch() {
    if (this.batchBuffer.length === 0) return null;
    
    // Sort by coolness
    this.batchBuffer.sort((a, b) => b.coolness - a.coolness);
    
    // Take top discoveries
    const batch = this.batchBuffer.slice(0, 5);
    
    // Clear batch
    this.batchBuffer = this.batchBuffer.slice(5);
    
    // Record email
    this.recentEmails.push({
      timestamp: Date.now(),
      count: batch.length
    });
    
    // Keep only recent email history
    const cutoff = Date.now() - (2 * 60 * 60 * 1000); // 2 hours
    this.recentEmails = this.recentEmails.filter(e => e.timestamp > cutoff);
    
    return {
      discoveries: batch,
      headline: this.generateHeadline(batch),
      summary: this.generateSummary(batch)
    };
  }

  /**
   * Generate exciting headline for email
   */
  generateHeadline(discoveries) {
    const topDiscovery = discoveries[0];
    const headlines = [
      `🚨 ${discoveries.length} Mind-Blowing Discoveries!`,
      `🔬 Breakthrough Alert: ${this.extractKeyPhrase(topDiscovery)}`,
      `🌟 Incredible Finding: ${this.extractKeyPhrase(topDiscovery)}`,
      `💡 ${discoveries.length} Amazing Insights Discovered`,
      `🎯 Important Discovery: ${this.extractKeyPhrase(topDiscovery)}`,
      `⚡ Breaking: New Research Reveals Stunning Insights`,
      `🧬 Scientific Breakthrough Detected!`
    ];
    
    return headlines[Math.floor(Math.random() * headlines.length)];
  }

  /**
   * Extract key phrase from discovery
   */
  extractKeyPhrase(discovery) {
    const content = discovery.content || '';
    // Take first 50 characters or until period
    const firstSentence = content.split('.')[0];
    return firstSentence.substring(0, 50) + (firstSentence.length > 50 ? '...' : '');
  }

  /**
   * Generate summary of discoveries
   */
  generateSummary(discoveries) {
    const topics = [...new Set(discoveries.map(d => d.topic))];
    const totalCoolness = discoveries.reduce((sum, d) => sum + d.coolness, 0) / discoveries.length;
    
    return `Your AI research system has made ${discoveries.length} fascinating discoveries ` +
           `across ${topics.length} topic${topics.length > 1 ? 's' : ''}. ` +
           `Average significance score: ${(totalCoolness * 100).toFixed(0)}%. ` +
           `These findings represent cutting-edge insights that could reshape our understanding.`;
  }

  /**
   * Force email if user requests
   */
  forceEmail() {
    if (this.batchBuffer.length > 0) {
      return this.getEmailBatch();
    }
    return null;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      batchSize: this.batchBuffer.length,
      batchThreshold: this.batchThreshold,
      canEmailNow: this.canEmailNow(),
      recentEmailCount: this.recentEmails.length,
      cooldownRemaining: this.canEmailNow() ? 0 : 
        (this.emailCooldown - (Date.now() - this.recentEmails[this.recentEmails.length - 1].timestamp))
    };
  }
}

export default DiscoveryEvaluator;