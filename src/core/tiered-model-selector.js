/**
 * Tiered Model Selector
 * 
 * Intelligently assigns AI models based on agent importance, task complexity,
 * and resource optimization. Main agents get premium models, sub-agents get
 * appropriate tier models based on their tasks.
 */

import logger from '../utils/logger.js';

export class TieredModelSelector {
  constructor(modelSelector) {
    this.modelSelector = modelSelector;
    
    // Model tier definitions
    this.tiers = {
      PREMIUM: {
        name: 'premium',
        priority: 1,
        description: 'Newest, most capable models for critical reasoning',
        maxCostPerToken: Infinity,
        minQualityScore: 10,
        preferredProviders: ['anthropic', 'openai', 'google', 'deepseek'],
        models: []
      },
      BALANCED: {
        name: 'balanced',
        priority: 2,
        description: 'Good quality models balancing cost and performance',
        maxCostPerToken: 0.000005,
        minQualityScore: 8,
        preferredProviders: ['anthropic', 'openai', 'google', 'apillm'],
        models: []
      },
      FAST: {
        name: 'fast',
        priority: 3,
        description: 'Fast, efficient models for quick tasks',
        maxCostPerToken: 0.000002,
        minQualityScore: 6,
        minSpeedScore: 9,
        preferredProviders: ['openai', 'anthropic', 'google', 'apillm'],
        models: []
      },
      ECONOMICAL: {
        name: 'economical',
        priority: 4,
        description: 'Cost-effective models for simple tasks',
        maxCostPerToken: 0.0000005,
        minQualityScore: 5,
        preferredProviders: ['apillm', 'huggingface', 'ollama'],
        models: []
      }
    };
    
    // Agent type to tier mapping
    this.agentTierMapping = {
      // Main agents - always get premium models
      'coordinator': 'PREMIUM',
      'architect': 'PREMIUM',
      'strategic-planner': 'PREMIUM',
      'decision-maker': 'PREMIUM',
      
      // Specialist agents - get balanced or premium based on task
      'researcher': 'BALANCED',
      'analyst': 'BALANCED',
      'developer': 'BALANCED',
      'security': 'PREMIUM',
      'data-science': 'PREMIUM',
      
      // Support agents - get fast or economical models
      'qa': 'FAST',
      'documentation': 'FAST',
      'helper': 'ECONOMICAL',
      
      // Sub-agents - dynamically assigned based on parent
      'sub-agent': 'DYNAMIC'
    };
    
    // Model assignment tracking
    this.modelAssignments = new Map();
    this.modelUsageStats = new Map();
    
    // Load balancing configuration
    this.loadBalancing = {
      enabled: true,
      maxConcurrentPremium: 3,
      maxConcurrentPerModel: 5,
      rotationEnabled: true
    };
  }

  /**
   * Initialize and categorize available models into tiers
   */
  async initialize() {
    await this.modelSelector.initialize();
    this.categorizeModelsIntoTiers();
    this.logTierDistribution();
  }

  /**
   * Categorize available models into tiers
   */
  categorizeModelsIntoTiers() {
    const availableModels = this.modelSelector.getAvailableModels();
    
    // Clear existing tier assignments
    Object.values(this.tiers).forEach(tier => tier.models = []);
    
    availableModels.forEach(model => {
      // Assign to PREMIUM tier
      if (this.isPremiumModel(model)) {
        this.tiers.PREMIUM.models.push(model);
      }
      
      // Assign to BALANCED tier
      if (this.isBalancedModel(model)) {
        this.tiers.BALANCED.models.push(model);
      }
      
      // Assign to FAST tier
      if (this.isFastModel(model)) {
        this.tiers.FAST.models.push(model);
      }
      
      // Assign to ECONOMICAL tier
      if (this.isEconomicalModel(model)) {
        this.tiers.ECONOMICAL.models.push(model);
      }
    });
    
    // Sort models within each tier by quality and speed
    Object.values(this.tiers).forEach(tier => {
      tier.models.sort((a, b) => {
        const scoreA = a.qualityScore + (a.speedScore * 0.5);
        const scoreB = b.qualityScore + (b.speedScore * 0.5);
        return scoreB - scoreA;
      });
    });
  }

  /**
   * Check if model qualifies as premium
   */
  isPremiumModel(model) {
    return (
      model.qualityScore >= 10 &&
      (model.isLatest || model.isNewest || 
       model.name.includes('opus') || 
       model.name.includes('Flagship') ||
       model.name.includes('Advanced') ||
       model.name.includes('o3') ||
       model.name.includes('Thinking') ||
       model.name.includes('Reasoner') ||
       model.name.includes('2.5'))
    );
  }

  /**
   * Check if model qualifies as balanced
   */
  isBalancedModel(model) {
    return (
      model.qualityScore >= 8 &&
      model.qualityScore < 10 &&
      model.costPerToken <= 0.000005
    );
  }

  /**
   * Check if model qualifies as fast
   */
  isFastModel(model) {
    return (
      model.speedScore >= 9 &&
      (model.name.includes('mini') || 
       model.name.includes('flash') || 
       model.name.includes('haiku') ||
       model.name.includes('nano') ||
       model.name.includes('Fast'))
    );
  }

  /**
   * Check if model qualifies as economical
   */
  isEconomicalModel(model) {
    return (
      model.costPerToken <= 0.0000005 ||
      model.costPerToken === 0 ||
      model.provider === 'huggingface' ||
      model.provider === 'ollama'
    );
  }

  /**
   * Assign model to an agent based on tier preferences
   */
  async assignModelToAgent(agent, taskComplexity = 'medium') {
    try {
      // Determine appropriate tier for this agent
      const tier = this.determineAgentTier(agent, taskComplexity);
      
      // Get model from appropriate tier
      const model = await this.selectModelFromTier(tier, agent);
      
      if (!model) {
        logger.warn(`No model available in tier ${tier} for agent ${agent.type}`);
        // Fallback to any available model
        return this.getFallbackModel();
      }
      
      // Track assignment
      this.trackModelAssignment(agent, model);
      
      logger.info(`Assigned ${model.name} (${tier}) to ${agent.type} agent`);
      
      return model;
    } catch (error) {
      logger.error('Failed to assign model to agent:', error);
      return this.getFallbackModel();
    }
  }

  /**
   * Determine appropriate tier for an agent
   */
  determineAgentTier(agent, taskComplexity) {
    // Check if agent is a sub-agent
    if (agent.isSubAgent) {
      return this.determineSubAgentTier(agent, taskComplexity);
    }
    
    // Check predefined mapping
    let tierName = this.agentTierMapping[agent.type];
    
    // If no mapping, determine based on agent properties
    if (!tierName || tierName === 'DYNAMIC') {
      tierName = this.dynamicallyDetermineTier(agent, taskComplexity);
    }
    
    // Override based on preferred model tier if specified
    if (agent.preferredModelTier) {
      const preferredTier = this.getTierByName(agent.preferredModelTier);
      if (preferredTier) {
        tierName = preferredTier;
      }
    }
    
    return tierName;
  }

  /**
   * Determine tier for sub-agents
   */
  determineSubAgentTier(agent, taskComplexity) {
    // Sub-agents get distributed across tiers
    const subAgentDistribution = {
      'research-specialist': 'BALANCED',
      'technical-analyst': 'BALANCED',
      'data-researcher': 'FAST',
      'market-researcher': 'FAST',
      'implementation-specialist': 'BALANCED',
      'testing-specialist': 'FAST',
      'documentation-writer': 'ECONOMICAL',
      'general-specialist': 'ECONOMICAL'
    };
    
    // Check specific sub-agent type
    if (subAgentDistribution[agent.type]) {
      return subAgentDistribution[agent.type];
    }
    
    // Complex sub-agent tasks still get good models
    if (taskComplexity === 'high' || agent.specialization?.includes('critical')) {
      return 'BALANCED';
    }
    
    // Default sub-agents to economical tier
    return 'FAST';
  }

  /**
   * Dynamically determine tier based on agent properties
   */
  dynamicallyDetermineTier(agent, taskComplexity) {
    // Score based on various factors
    let score = 0;
    
    // Task complexity factor
    if (taskComplexity === 'high') score += 3;
    else if (taskComplexity === 'medium') score += 2;
    else score += 1;
    
    // Agent capabilities factor
    if (agent.capabilities?.includes('reasoning')) score += 2;
    if (agent.capabilities?.includes('analysis')) score += 1;
    if (agent.capabilities?.includes('code-generation')) score += 1;
    if (agent.capabilities?.includes('simple-task')) score -= 1;
    
    // Specialization factor
    if (agent.specialization?.includes('strategic')) score += 2;
    if (agent.specialization?.includes('critical')) score += 2;
    if (agent.specialization?.includes('support')) score -= 1;
    
    // Map score to tier
    if (score >= 6) return 'PREMIUM';
    if (score >= 4) return 'BALANCED';
    if (score >= 2) return 'FAST';
    return 'ECONOMICAL';
  }

  /**
   * Select a specific model from a tier
   */
  async selectModelFromTier(tierName, agent) {
    const tier = this.tiers[tierName];
    if (!tier || tier.models.length === 0) {
      // Try next tier down
      return this.selectFromNextTier(tierName, agent);
    }
    
    // Apply load balancing if enabled
    if (this.loadBalancing.enabled) {
      return this.selectWithLoadBalancing(tier, agent);
    }
    
    // Simple selection - pick best available in tier
    return tier.models[0];
  }

  /**
   * Select model with load balancing
   */
  selectWithLoadBalancing(tier, agent) {
    const availableModels = [];
    
    for (const model of tier.models) {
      const currentUsage = this.getModelCurrentUsage(model.id);
      
      // Check if model is within usage limits
      if (currentUsage < this.loadBalancing.maxConcurrentPerModel) {
        // Check premium model limits
        if (tier.name === 'premium') {
          const premiumCount = this.getCurrentPremiumUsageCount();
          if (premiumCount >= this.loadBalancing.maxConcurrentPremium) {
            continue; // Skip this premium model
          }
        }
        
        availableModels.push({
          model: model,
          usage: currentUsage
        });
      }
    }
    
    if (availableModels.length === 0) {
      // All models at capacity, return least used
      return tier.models[0];
    }
    
    // Sort by usage (ascending) and quality (descending)
    availableModels.sort((a, b) => {
      if (a.usage !== b.usage) {
        return a.usage - b.usage; // Less used first
      }
      return b.model.qualityScore - a.model.qualityScore; // Higher quality first
    });
    
    // If rotation enabled, occasionally pick second or third option
    if (this.loadBalancing.rotationEnabled && availableModels.length > 1) {
      const rotationChance = Math.random();
      if (rotationChance < 0.2 && availableModels.length > 2) {
        return availableModels[2].model;
      } else if (rotationChance < 0.4 && availableModels.length > 1) {
        return availableModels[1].model;
      }
    }
    
    return availableModels[0].model;
  }

  /**
   * Get current usage count for a model
   */
  getModelCurrentUsage(modelId) {
    let count = 0;
    for (const [agentId, assignment] of this.modelAssignments) {
      if (assignment.modelId === modelId && assignment.active) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get current premium model usage count
   */
  getCurrentPremiumUsageCount() {
    let count = 0;
    const premiumModelIds = this.tiers.PREMIUM.models.map(m => m.id);
    
    for (const [agentId, assignment] of this.modelAssignments) {
      if (premiumModelIds.includes(assignment.modelId) && assignment.active) {
        count++;
      }
    }
    return count;
  }

  /**
   * Select from next tier down
   */
  selectFromNextTier(currentTierName, agent) {
    const tierOrder = ['PREMIUM', 'BALANCED', 'FAST', 'ECONOMICAL'];
    const currentIndex = tierOrder.indexOf(currentTierName);
    
    for (let i = currentIndex + 1; i < tierOrder.length; i++) {
      const nextTier = this.tiers[tierOrder[i]];
      if (nextTier.models.length > 0) {
        logger.info(`Falling back from ${currentTierName} to ${tierOrder[i]} tier`);
        return nextTier.models[0];
      }
    }
    
    return null;
  }

  /**
   * Get fallback model
   */
  getFallbackModel() {
    // Try to get any available model
    const allModels = this.modelSelector?.getAvailableModels ? 
      this.modelSelector.getAvailableModels() : [];
    if (allModels.length > 0) {
      return allModels[0];
    }
    return null;
  }

  /**
   * Track model assignment
   */
  trackModelAssignment(agent, model) {
    this.modelAssignments.set(agent.id, {
      agentId: agent.id,
      agentType: agent.type,
      modelId: model.id,
      modelName: model.name,
      tier: this.getModelTier(model),
      assignedAt: Date.now(),
      active: true
    });
    
    // Update usage stats
    const stats = this.modelUsageStats.get(model.id) || {
      totalAssignments: 0,
      currentActive: 0
    };
    stats.totalAssignments++;
    stats.currentActive++;
    this.modelUsageStats.set(model.id, stats);
  }

  /**
   * Release model assignment
   */
  releaseModelAssignment(agentId) {
    const assignment = this.modelAssignments.get(agentId);
    if (assignment && assignment.active) {
      assignment.active = false;
      assignment.releasedAt = Date.now();
      
      // Update usage stats
      const stats = this.modelUsageStats.get(assignment.modelId);
      if (stats) {
        stats.currentActive = Math.max(0, stats.currentActive - 1);
      }
    }
  }

  /**
   * Get model tier
   */
  getModelTier(model) {
    for (const [tierName, tier] of Object.entries(this.tiers)) {
      if (tier.models.some(m => m.id === model.id)) {
        return tierName;
      }
    }
    return 'UNKNOWN';
  }

  /**
   * Get tier by name
   */
  getTierByName(name) {
    const tierMap = {
      'premium': 'PREMIUM',
      'balanced': 'BALANCED',
      'fast': 'FAST',
      'economical': 'ECONOMICAL'
    };
    return tierMap[name.toLowerCase()] || 'BALANCED';
  }

  /**
   * Log tier distribution
   */
  logTierDistribution() {
    logger.info('Model Tier Distribution:');
    for (const [tierName, tier] of Object.entries(this.tiers)) {
      logger.info(`  ${tierName}: ${tier.models.length} models`);
      if (tier.models.length > 0) {
        const modelNames = tier.models.slice(0, 3).map(m => m.name);
        logger.info(`    Top models: ${modelNames.join(', ')}`);
      }
    }
  }

  /**
   * Get tier statistics
   */
  getTierStatistics() {
    const stats = {};
    
    for (const [tierName, tier] of Object.entries(this.tiers)) {
      stats[tierName] = {
        modelCount: tier.models.length,
        models: tier.models.map(m => ({
          name: m.name,
          provider: m.provider,
          quality: m.qualityScore,
          speed: m.speedScore
        })),
        currentUsage: 0
      };
      
      // Calculate current usage
      for (const [agentId, assignment] of this.modelAssignments) {
        if (assignment.active && assignment.tier === tierName) {
          stats[tierName].currentUsage++;
        }
      }
    }
    
    return stats;
  }

  /**
   * Optimize tier assignments based on performance
   */
  async optimizeTierAssignments() {
    // Analyze model performance and adjust tier assignments
    // This could be called periodically to rebalance the system
    
    logger.info('Optimizing tier assignments based on performance...');
    
    // Re-categorize models
    this.categorizeModelsIntoTiers();
    
    // Log new distribution
    this.logTierDistribution();
  }

  /**
   * Get assignment summary
   */
  getAssignmentSummary() {
    const summary = {
      totalAssignments: this.modelAssignments.size,
      activeAssignments: 0,
      tierDistribution: {},
      modelUsage: {}
    };
    
    for (const [agentId, assignment] of this.modelAssignments) {
      if (assignment.active) {
        summary.activeAssignments++;
        
        // Count by tier
        if (!summary.tierDistribution[assignment.tier]) {
          summary.tierDistribution[assignment.tier] = 0;
        }
        summary.tierDistribution[assignment.tier]++;
        
        // Count by model
        if (!summary.modelUsage[assignment.modelName]) {
          summary.modelUsage[assignment.modelName] = 0;
        }
        summary.modelUsage[assignment.modelName]++;
      }
    }
    
    return summary;
  }
}

export default TieredModelSelector;