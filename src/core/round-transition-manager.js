/**
 * Round Transition Manager
 * 
 * Manages intelligent transitions between discussion rounds,
 * determining when to move forward, what topics to cover,
 * and when discussions should conclude
 */

import logger from '../utils/logger.js';

export class RoundTransitionManager {
  constructor(aiClient) {
    this.aiClient = aiClient;
    
    // Round management state
    this.currentRound = 0;
    this.roundHistory = [];
    this.roundObjectives = [];
    this.progressMetrics = new Map();
    
    // Configuration for round transitions
    this.config = {
      minRounds: 2,
      maxRounds: 20,
      optimalRounds: 5,
      redundancyThreshold: 0.7,
      progressThreshold: 0.3,
      consensusThreshold: 0.8,
      depthRequirement: 'adaptive' // adaptive, shallow, medium, deep
    };
    
    // Round phase definitions
    this.phases = {
      EXPLORATION: { name: 'exploration', rounds: [1, 2] },
      ANALYSIS: { name: 'analysis', rounds: [3, 4, 5] },
      SYNTHESIS: { name: 'synthesis', rounds: [6, 7] },
      CONVERGENCE: { name: 'convergence', rounds: [8, 9] },
      CONCLUSION: { name: 'conclusion', rounds: [10] }
    };
  }

  /**
   * Determine if we should transition to the next round
   */
  async shouldTransitionToNextRound(currentRoundData, conversationContext) {
    try {
      // Multiple criteria for round transition
      const criteria = await this.evaluateTransitionCriteria(currentRoundData, conversationContext);
      
      // Log evaluation results
      logger.info('Round transition evaluation:', {
        round: this.currentRound,
        criteria: criteria,
        decision: criteria.shouldTransition
      });
      
      return {
        shouldTransition: criteria.shouldTransition,
        reason: criteria.primaryReason,
        confidence: criteria.confidence,
        nextRoundFocus: criteria.nextRoundFocus
      };
    } catch (error) {
      logger.error('Failed to evaluate round transition:', error);
      // Default to continuing if evaluation fails
      return {
        shouldTransition: this.currentRound < this.config.maxRounds,
        reason: 'default_progression',
        confidence: 0.5
      };
    }
  }

  /**
   * Evaluate multiple criteria for round transition
   */
  async evaluateTransitionCriteria(roundData, context) {
    const criteria = {
      objectivesComplete: false,
      sufficientDepth: false,
      newInsightsGenerated: true,
      consensusReached: false,
      redundancyDetected: false,
      progressMade: true,
      shouldTransition: true,
      confidence: 0,
      primaryReason: '',
      nextRoundFocus: null
    };

    // 1. Check if round objectives are complete
    criteria.objectivesComplete = await this.checkRoundObjectivesComplete(roundData);
    
    // 2. Check if sufficient depth has been reached
    criteria.sufficientDepth = this.evaluateDiscussionDepth(roundData);
    
    // 3. Check for new insights
    criteria.newInsightsGenerated = this.detectNewInsights(roundData, this.roundHistory);
    
    // 4. Check for consensus
    criteria.consensusReached = this.evaluateConsensus(roundData);
    
    // 5. Check for redundancy
    criteria.redundancyDetected = this.detectRedundancy(roundData, this.roundHistory);
    
    // 6. Check overall progress
    criteria.progressMade = this.evaluateProgress(roundData, context);
    
    // Decision logic
    if (criteria.redundancyDetected && !criteria.newInsightsGenerated) {
      criteria.shouldTransition = true;
      criteria.primaryReason = 'redundancy_detected';
      criteria.confidence = 0.9;
    } else if (criteria.objectivesComplete && criteria.sufficientDepth) {
      criteria.shouldTransition = true;
      criteria.primaryReason = 'objectives_achieved';
      criteria.confidence = 0.95;
    } else if (!criteria.progressMade && this.currentRound > this.config.minRounds) {
      criteria.shouldTransition = true;
      criteria.primaryReason = 'insufficient_progress';
      criteria.confidence = 0.7;
    } else if (criteria.consensusReached && this.currentRound >= this.config.optimalRounds) {
      criteria.shouldTransition = true;
      criteria.primaryReason = 'consensus_achieved';
      criteria.confidence = 0.85;
    } else if (this.currentRound >= this.config.maxRounds) {
      criteria.shouldTransition = false; // End discussion
      criteria.primaryReason = 'max_rounds_reached';
      criteria.confidence = 1.0;
    } else {
      criteria.shouldTransition = true;
      criteria.primaryReason = 'continue_exploration';
      criteria.confidence = 0.6;
    }
    
    // Determine next round focus
    criteria.nextRoundFocus = await this.determineNextRoundFocus(criteria, context);
    
    return criteria;
  }

  /**
   * Plan what the next round should focus on
   */
  async planNextRound(currentRoundData, conversationContext) {
    const nextRoundNumber = this.currentRound + 1;
    const currentPhase = this.getCurrentPhase(nextRoundNumber);
    
    // Generate round plan using AI
    const planPrompt = `Based on the current discussion state, plan the focus for round ${nextRoundNumber}.

Current Phase: ${currentPhase.name}
Previous Round Topics: ${this.roundHistory.slice(-3).map(r => r.topic).join(', ')}
Open Questions: ${conversationContext.openQuestions.slice(0, 5).join(', ')}
Unresolved Issues: ${conversationContext.unresolvedIssues?.join(', ') || 'none'}

Generate a focused plan for the next round as JSON:
{
  "primaryFocus": "main topic or question to address",
  "objectives": ["objective1", "objective2", "objective3"],
  "expectedOutcomes": ["outcome1", "outcome2"],
  "suggestedApproach": "discussion|debate|analysis|synthesis|brainstorming",
  "keyQuestions": ["question1", "question2"],
  "requiredExpertise": ["expertise1", "expertise2"]
}`;

    try {
      const response = await this.aiClient.generateResponse(
        'gpt-4',
        planPrompt,
        {
          agentType: 'round-planner',
          maxTokens: 300,
          temperature: 0.7
        }
      );

      const plan = this.parseJsonResponse(response.content);
      
      // Store the plan
      this.roundObjectives.push({
        round: nextRoundNumber,
        phase: currentPhase.name,
        plan: plan,
        timestamp: Date.now()
      });

      return {
        roundNumber: nextRoundNumber,
        phase: currentPhase.name,
        focus: plan.primaryFocus,
        objectives: plan.objectives,
        approach: plan.suggestedApproach,
        questions: plan.keyQuestions,
        requiredExpertise: plan.requiredExpertise
      };
    } catch (error) {
      logger.error('Failed to plan next round:', error);
      // Fallback plan
      return this.getFallbackRoundPlan(nextRoundNumber, currentPhase);
    }
  }

  /**
   * Check if round objectives are complete
   */
  async checkRoundObjectivesComplete(roundData) {
    if (this.roundObjectives.length === 0) return false;
    
    const currentObjectives = this.roundObjectives[this.roundObjectives.length - 1];
    if (!currentObjectives || !currentObjectives.plan) return false;
    
    // Simple completion check - could be enhanced with AI evaluation
    const completedObjectives = currentObjectives.plan.objectives.filter(obj => {
      // Check if objective appears to be addressed in round data
      const addressed = roundData.exchanges?.some(exchange => 
        exchange.content?.toLowerCase().includes(obj.toLowerCase())
      );
      return addressed;
    });
    
    const completionRate = completedObjectives.length / currentObjectives.plan.objectives.length;
    return completionRate >= 0.7; // 70% threshold
  }

  /**
   * Evaluate discussion depth
   */
  evaluateDiscussionDepth(roundData) {
    const metrics = {
      exchangeCount: roundData.exchanges?.length || 0,
      averageResponseLength: 0,
      technicalTermsUsed: 0,
      followUpQuestions: 0,
      disagreements: 0
    };
    
    if (roundData.exchanges) {
      // Calculate average response length
      const totalLength = roundData.exchanges.reduce((sum, e) => 
        sum + (e.content?.length || 0), 0
      );
      metrics.averageResponseLength = totalLength / roundData.exchanges.length;
      
      // Count technical discussions
      roundData.exchanges.forEach(exchange => {
        if (exchange.hasFollowUp) metrics.followUpQuestions++;
        if (exchange.disagreements?.length > 0) metrics.disagreements++;
      });
    }
    
    // Depth score calculation
    const depthScore = (
      (metrics.exchangeCount >= 5 ? 1 : metrics.exchangeCount / 5) * 0.3 +
      (metrics.averageResponseLength >= 200 ? 1 : metrics.averageResponseLength / 200) * 0.2 +
      (metrics.followUpQuestions > 0 ? 1 : 0) * 0.25 +
      (metrics.disagreements > 0 ? 1 : 0) * 0.25
    );
    
    // Depth requirement based on configuration
    const requiredDepth = this.config.depthRequirement === 'deep' ? 0.8 :
                         this.config.depthRequirement === 'medium' ? 0.6 : 0.4;
    
    return depthScore >= requiredDepth;
  }

  /**
   * Detect new insights in current round
   */
  detectNewInsights(currentRound, history) {
    if (!currentRound.exchanges || currentRound.exchanges.length === 0) return false;
    
    const currentInsights = new Set();
    currentRound.exchanges.forEach(exchange => {
      if (exchange.newInsights) {
        exchange.newInsights.forEach(insight => currentInsights.add(insight));
      }
    });
    
    if (currentInsights.size === 0) return false;
    
    // Check if insights are truly new compared to history
    const historicalInsights = new Set();
    history.forEach(round => {
      round.exchanges?.forEach(exchange => {
        exchange.newInsights?.forEach(insight => historicalInsights.add(insight));
      });
    });
    
    let newCount = 0;
    currentInsights.forEach(insight => {
      if (!historicalInsights.has(insight)) newCount++;
    });
    
    return newCount > 0;
  }

  /**
   * Evaluate consensus among agents
   */
  evaluateConsensus(roundData) {
    if (!roundData.exchanges) return false;
    
    const agreements = [];
    const disagreements = [];
    
    roundData.exchanges.forEach(exchange => {
      if (exchange.agreements) agreements.push(...exchange.agreements);
      if (exchange.disagreements) disagreements.push(...exchange.disagreements);
    });
    
    if (agreements.length + disagreements.length === 0) return false;
    
    const consensusRate = agreements.length / (agreements.length + disagreements.length);
    return consensusRate >= this.config.consensusThreshold;
  }

  /**
   * Detect redundancy in discussions
   */
  detectRedundancy(currentRound, history) {
    if (!currentRound.exchanges || history.length < 2) return false;
    
    // Get recent content
    const currentContent = currentRound.exchanges.map(e => e.content).join(' ');
    const recentHistory = history.slice(-2);
    
    // Check similarity with recent rounds
    for (const historicalRound of recentHistory) {
      if (historicalRound.exchanges) {
        const historicalContent = historicalRound.exchanges.map(e => e.content).join(' ');
        const similarity = this.calculateTextSimilarity(currentContent, historicalContent);
        
        if (similarity >= this.config.redundancyThreshold) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Evaluate overall progress
   */
  evaluateProgress(roundData, context) {
    const progressIndicators = {
      newDecisions: context.decisions?.length > (this.progressMetrics.get('decisions') || 0),
      questionsAnswered: context.openQuestions?.length < (this.progressMetrics.get('questions') || Infinity),
      tasksCompleted: context.completedTasks?.length > (this.progressMetrics.get('tasks') || 0),
      topicsExplored: context.topics?.length > (this.progressMetrics.get('topics') || 0)
    };
    
    // Update metrics
    this.progressMetrics.set('decisions', context.decisions?.length || 0);
    this.progressMetrics.set('questions', context.openQuestions?.length || 0);
    this.progressMetrics.set('tasks', context.completedTasks?.length || 0);
    this.progressMetrics.set('topics', context.topics?.length || 0);
    
    // Count progress indicators
    const progressCount = Object.values(progressIndicators).filter(v => v).length;
    const progressRate = progressCount / Object.keys(progressIndicators).length;
    
    return progressRate >= this.config.progressThreshold;
  }

  /**
   * Determine focus for next round based on criteria
   */
  async determineNextRoundFocus(criteria, context) {
    const focuses = {
      'redundancy_detected': 'Break new ground with unexplored aspects',
      'objectives_achieved': 'Synthesize findings and draw conclusions',
      'insufficient_progress': 'Approach from different angle with new perspectives',
      'consensus_achieved': 'Explore edge cases and potential challenges',
      'continue_exploration': 'Deepen analysis of current topics',
      'max_rounds_reached': 'Final synthesis and actionable recommendations'
    };
    
    return focuses[criteria.primaryReason] || 'Continue structured discussion';
  }

  /**
   * Get current discussion phase
   */
  getCurrentPhase(roundNumber) {
    for (const [key, phase] of Object.entries(this.phases)) {
      if (phase.rounds.includes(roundNumber)) {
        return phase;
      }
    }
    
    // Dynamic phase assignment for rounds beyond defined phases
    if (roundNumber <= 2) return this.phases.EXPLORATION;
    if (roundNumber <= 5) return this.phases.ANALYSIS;
    if (roundNumber <= 7) return this.phases.SYNTHESIS;
    if (roundNumber <= 9) return this.phases.CONVERGENCE;
    return this.phases.CONCLUSION;
  }

  /**
   * Get fallback round plan
   */
  getFallbackRoundPlan(roundNumber, phase) {
    const fallbackPlans = {
      'exploration': {
        focus: 'Explore problem space and identify key challenges',
        objectives: ['Identify main components', 'Understand constraints', 'Map dependencies'],
        approach: 'discussion',
        questions: ['What are the key challenges?', 'What resources are needed?']
      },
      'analysis': {
        focus: 'Deep dive into technical details and requirements',
        objectives: ['Analyze technical requirements', 'Evaluate solutions', 'Identify risks'],
        approach: 'analysis',
        questions: ['What are the technical implications?', 'What are the trade-offs?']
      },
      'synthesis': {
        focus: 'Combine insights and develop comprehensive solution',
        objectives: ['Integrate findings', 'Develop solution', 'Create action plan'],
        approach: 'synthesis',
        questions: ['How do components fit together?', 'What is the optimal approach?']
      },
      'convergence': {
        focus: 'Reach consensus and finalize decisions',
        objectives: ['Resolve disagreements', 'Finalize decisions', 'Confirm approach'],
        approach: 'debate',
        questions: ['Are all concerns addressed?', 'Is the solution complete?']
      },
      'conclusion': {
        focus: 'Summarize outcomes and define next steps',
        objectives: ['Summarize decisions', 'Define action items', 'Assign responsibilities'],
        approach: 'synthesis',
        questions: ['What are the next steps?', 'Who is responsible for what?']
      }
    };
    
    const plan = fallbackPlans[phase.name] || fallbackPlans['exploration'];
    
    return {
      roundNumber: roundNumber,
      phase: phase.name,
      focus: plan.focus,
      objectives: plan.objectives,
      approach: plan.approach,
      questions: plan.questions,
      requiredExpertise: []
    };
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Parse JSON response with fallback
   */
  parseJsonResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Failed to parse JSON response:', error);
    }
    
    // Fallback structure
    return {
      primaryFocus: 'Continue discussion',
      objectives: ['Explore topic', 'Generate insights', 'Reach consensus'],
      expectedOutcomes: ['Better understanding', 'Actionable insights'],
      suggestedApproach: 'discussion',
      keyQuestions: ['What are the implications?', 'How should we proceed?'],
      requiredExpertise: []
    };
  }

  /**
   * Update round history
   */
  updateRoundHistory(roundData) {
    this.roundHistory.push({
      round: this.currentRound,
      topic: roundData.topic,
      exchanges: roundData.exchanges,
      timestamp: Date.now(),
      metrics: {
        depth: this.evaluateDiscussionDepth(roundData),
        consensus: this.evaluateConsensus(roundData),
        insights: roundData.exchanges?.flatMap(e => e.newInsights || []).length || 0
      }
    });
    
    // Keep history manageable
    if (this.roundHistory.length > 10) {
      this.roundHistory = this.roundHistory.slice(-10);
    }
  }

  /**
   * Get round transition summary
   */
  getRoundTransitionSummary() {
    return {
      currentRound: this.currentRound,
      totalRounds: this.roundHistory.length,
      currentPhase: this.getCurrentPhase(this.currentRound).name,
      completedObjectives: this.roundObjectives.filter(o => 
        this.checkRoundObjectivesComplete({ exchanges: [] })
      ).length,
      averageDepth: this.roundHistory.reduce((sum, r) => 
        sum + (r.metrics?.depth || 0), 0
      ) / this.roundHistory.length || 0,
      progressMetrics: Object.fromEntries(this.progressMetrics)
    };
  }

  /**
   * Advance to next round
   */
  advanceRound() {
    this.currentRound++;
    logger.info(`Advanced to round ${this.currentRound}`);
  }

  /**
   * Reset for new discussion
   */
  reset() {
    this.currentRound = 0;
    this.roundHistory = [];
    this.roundObjectives = [];
    this.progressMetrics.clear();
  }
}

export default RoundTransitionManager;