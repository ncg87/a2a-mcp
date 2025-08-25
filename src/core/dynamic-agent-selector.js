/**
 * Dynamic Agent Selector
 * 
 * Intelligently selects which agents should participate in discussions
 * based on task requirements, agent capabilities, and conversation context
 */

import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class DynamicAgentSelector {
  constructor(aiClient) {
    this.aiClient = aiClient;
    
    // Agent pool management
    this.availableAgents = new Map();
    this.agentCapabilities = new Map();
    this.agentPerformance = new Map();
    this.agentSpecializations = new Map();
    
    // Selection configuration
    this.config = {
      minAgents: 2,
      maxAgents: 8,
      optimalAgents: 4,
      diversityWeight: 0.3,
      expertiseWeight: 0.4,
      performanceWeight: 0.3
    };
    
    // Pre-defined agent templates
    this.agentTemplates = this.defineAgentTemplates();
  }

  /**
   * Define agent templates for different specializations
   */
  defineAgentTemplates() {
    return {
      'strategic-coordinator': {
        type: 'coordinator',
        specialization: 'Strategic planning and orchestration',
        capabilities: ['planning', 'coordination', 'synthesis', 'decision-making'],
        requiredForTopics: ['strategy', 'planning', 'architecture', 'system-design'],
        preferredModelTier: 'premium'
      },
      'technical-architect': {
        type: 'architect',
        specialization: 'System architecture and technical design',
        capabilities: ['system-design', 'architecture', 'technical-analysis', 'integration'],
        requiredForTopics: ['architecture', 'design', 'infrastructure', 'integration'],
        preferredModelTier: 'premium'
      },
      'research-analyst': {
        type: 'researcher',
        specialization: 'Research and data analysis',
        capabilities: ['research', 'data-analysis', 'investigation', 'fact-checking'],
        requiredForTopics: ['research', 'analysis', 'data', 'investigation'],
        preferredModelTier: 'balanced'
      },
      'implementation-specialist': {
        type: 'developer',
        specialization: 'Implementation and coding',
        capabilities: ['coding', 'implementation', 'debugging', 'optimization'],
        requiredForTopics: ['implementation', 'coding', 'development', 'programming'],
        preferredModelTier: 'balanced'
      },
      'security-auditor': {
        type: 'security',
        specialization: 'Security analysis and auditing',
        capabilities: ['security-analysis', 'vulnerability-assessment', 'compliance', 'risk-assessment'],
        requiredForTopics: ['security', 'vulnerability', 'compliance', 'risk'],
        preferredModelTier: 'premium'
      },
      'quality-engineer': {
        type: 'qa',
        specialization: 'Quality assurance and testing',
        capabilities: ['testing', 'quality-assurance', 'validation', 'verification'],
        requiredForTopics: ['testing', 'quality', 'validation', 'qa'],
        preferredModelTier: 'balanced'
      },
      'devops-engineer': {
        type: 'devops',
        specialization: 'DevOps and deployment',
        capabilities: ['deployment', 'ci-cd', 'infrastructure', 'monitoring'],
        requiredForTopics: ['deployment', 'devops', 'ci-cd', 'operations'],
        preferredModelTier: 'balanced'
      },
      'business-analyst': {
        type: 'business',
        specialization: 'Business analysis and requirements',
        capabilities: ['requirements-analysis', 'business-logic', 'process-design', 'stakeholder-management'],
        requiredForTopics: ['business', 'requirements', 'process', 'stakeholder'],
        preferredModelTier: 'balanced'
      },
      'data-scientist': {
        type: 'data-science',
        specialization: 'Data science and machine learning',
        capabilities: ['machine-learning', 'data-science', 'statistics', 'predictive-modeling'],
        requiredForTopics: ['ml', 'ai', 'data-science', 'statistics'],
        preferredModelTier: 'premium'
      },
      'ui-ux-designer': {
        type: 'design',
        specialization: 'UI/UX design and user experience',
        capabilities: ['ui-design', 'ux-design', 'user-research', 'prototyping'],
        requiredForTopics: ['ui', 'ux', 'design', 'user-experience'],
        preferredModelTier: 'balanced'
      },
      'domain-expert': {
        type: 'expert',
        specialization: 'Domain-specific expertise',
        capabilities: ['domain-knowledge', 'best-practices', 'industry-standards', 'compliance'],
        requiredForTopics: ['domain', 'industry', 'compliance', 'standards'],
        preferredModelTier: 'balanced'
      },
      'creative-innovator': {
        type: 'innovator',
        specialization: 'Creative problem solving and innovation',
        capabilities: ['brainstorming', 'innovation', 'creative-thinking', 'ideation'],
        requiredForTopics: ['innovation', 'creativity', 'brainstorming', 'ideation'],
        preferredModelTier: 'fast'
      }
    };
  }

  /**
   * Dynamically select agents for a discussion based on requirements
   */
  async selectAgentsForDiscussion(topic, requirements, roundPlan = null) {
    try {
      logger.info('Selecting agents for discussion:', { topic, requirements });
      
      // Analyze topic to determine needed expertise
      const neededExpertise = await this.analyzeTopicRequirements(topic, requirements);
      
      // Score available agents based on requirements
      const agentScores = await this.scoreAgents(neededExpertise, requirements);
      
      // Select optimal agent composition
      const selectedAgents = this.selectOptimalComposition(agentScores, neededExpertise);
      
      // Create or retrieve agent instances
      const agents = await this.instantiateAgents(selectedAgents, topic);
      
      logger.info(`Selected ${agents.length} agents for discussion`);
      
      return agents;
    } catch (error) {
      logger.error('Failed to select agents:', error);
      // Fallback to default agent selection
      return this.getDefaultAgents();
    }
  }

  /**
   * Analyze topic to determine required expertise
   */
  async analyzeTopicRequirements(topic, requirements) {
    const prompt = `Analyze this discussion topic and determine what expertise is needed.

Topic: "${topic}"
Requirements: ${JSON.stringify(requirements)}

Identify the key areas of expertise needed as JSON:
{
  "primaryExpertise": ["expertise1", "expertise2"],
  "secondaryExpertise": ["expertise3", "expertise4"],
  "technicalDepth": "low|medium|high",
  "creativityNeeded": true/false,
  "analyticalDepth": "low|medium|high",
  "domainSpecific": true/false,
  "suggestedAgentTypes": ["type1", "type2", "type3"]
}`;

    try {
      const response = await this.aiClient.generateResponse(
        'gpt-4',
        prompt,
        {
          agentType: 'agent-selector',
          maxTokens: 200,
          temperature: 0.6
        }
      );

      return this.parseJsonResponse(response.content);
    } catch (error) {
      logger.error('Failed to analyze topic requirements:', error);
      // Fallback analysis
      return this.performFallbackAnalysis(topic);
    }
  }

  /**
   * Score agents based on requirements
   */
  async scoreAgents(neededExpertise, requirements) {
    const scores = new Map();
    
    // Score each agent template
    for (const [templateId, template] of Object.entries(this.agentTemplates)) {
      let score = 0;
      
      // Score based on expertise match
      const expertiseScore = this.calculateExpertiseMatch(
        template,
        neededExpertise
      );
      score += expertiseScore * this.config.expertiseWeight;
      
      // Score based on past performance (if available)
      const performanceScore = this.getAgentPerformanceScore(templateId);
      score += performanceScore * this.config.performanceWeight;
      
      // Score based on diversity contribution
      const diversityScore = this.calculateDiversityContribution(
        template,
        Array.from(scores.keys())
      );
      score += diversityScore * this.config.diversityWeight;
      
      scores.set(templateId, {
        template: template,
        score: score,
        expertiseMatch: expertiseScore,
        performance: performanceScore,
        diversity: diversityScore
      });
    }
    
    return scores;
  }

  /**
   * Calculate expertise match score
   */
  calculateExpertiseMatch(template, neededExpertise) {
    let matchScore = 0;
    const totalNeeded = (neededExpertise.primaryExpertise?.length || 0) + 
                       (neededExpertise.secondaryExpertise?.length || 0);
    
    if (totalNeeded === 0) return 0.5; // Default score if no specific expertise needed
    
    // Check primary expertise matches
    if (neededExpertise.primaryExpertise) {
      neededExpertise.primaryExpertise.forEach(expertise => {
        if (template.capabilities.some(cap => cap.includes(expertise))) {
          matchScore += 2; // Double weight for primary
        }
      });
    }
    
    // Check secondary expertise matches
    if (neededExpertise.secondaryExpertise) {
      neededExpertise.secondaryExpertise.forEach(expertise => {
        if (template.capabilities.some(cap => cap.includes(expertise))) {
          matchScore += 1;
        }
      });
    }
    
    // Check if agent type is suggested
    if (neededExpertise.suggestedAgentTypes?.includes(template.type)) {
      matchScore += 1.5;
    }
    
    // Normalize score
    return Math.min(matchScore / (totalNeeded * 1.5), 1);
  }

  /**
   * Get agent performance score
   */
  getAgentPerformanceScore(agentId) {
    const performance = this.agentPerformance.get(agentId);
    if (!performance) return 0.7; // Default score for new agents
    
    return performance.successRate || 0.7;
  }

  /**
   * Calculate diversity contribution
   */
  calculateDiversityContribution(template, selectedAgentIds) {
    if (selectedAgentIds.length === 0) return 1; // First agent has max diversity
    
    // Check if this type is already selected
    const alreadySelected = selectedAgentIds.some(id => {
      const selected = this.agentTemplates[id];
      return selected && selected.type === template.type;
    });
    
    if (alreadySelected) return 0.2; // Low diversity if type already selected
    
    // Check capability overlap
    let overlapScore = 0;
    selectedAgentIds.forEach(id => {
      const selected = this.agentTemplates[id];
      if (selected) {
        const overlap = template.capabilities.filter(cap => 
          selected.capabilities.includes(cap)
        ).length;
        overlapScore += overlap / template.capabilities.length;
      }
    });
    
    // Higher score for less overlap
    return 1 - (overlapScore / selectedAgentIds.length);
  }

  /**
   * Select optimal agent composition
   */
  selectOptimalComposition(agentScores, neededExpertise) {
    // Sort agents by score
    const sortedAgents = Array.from(agentScores.entries())
      .sort((a, b) => b[1].score - a[1].score);
    
    const selected = [];
    const targetCount = this.determineOptimalAgentCount(neededExpertise);
    
    // Always include top scorer
    if (sortedAgents.length > 0) {
      selected.push(sortedAgents[0][0]);
    }
    
    // Add agents to reach target count, considering diversity
    for (let i = 1; i < sortedAgents.length && selected.length < targetCount; i++) {
      const [agentId, scoreData] = sortedAgents[i];
      
      // Recalculate diversity with current selection
      const diversityScore = this.calculateDiversityContribution(
        scoreData.template,
        selected
      );
      
      // Include if diversity is acceptable or expertise match is very high
      if (diversityScore > 0.3 || scoreData.expertiseMatch > 0.8) {
        selected.push(agentId);
      }
    }
    
    // Ensure minimum agents
    while (selected.length < this.config.minAgents && sortedAgents.length > selected.length) {
      const nextAgent = sortedAgents[selected.length][0];
      if (!selected.includes(nextAgent)) {
        selected.push(nextAgent);
      }
    }
    
    return selected;
  }

  /**
   * Determine optimal number of agents
   */
  determineOptimalAgentCount(neededExpertise) {
    let count = this.config.optimalAgents;
    
    // Adjust based on technical depth
    if (neededExpertise.technicalDepth === 'high') count += 1;
    if (neededExpertise.technicalDepth === 'low') count -= 1;
    
    // Adjust based on analytical depth
    if (neededExpertise.analyticalDepth === 'high') count += 1;
    
    // Ensure within bounds
    return Math.max(
      this.config.minAgents,
      Math.min(this.config.maxAgents, count)
    );
  }

  /**
   * Instantiate selected agents
   */
  async instantiateAgents(selectedTemplateIds, topic) {
    const agents = [];
    
    for (const templateId of selectedTemplateIds) {
      const template = this.agentTemplates[templateId];
      if (!template) continue;
      
      const agent = {
        id: `${template.type}-${uuidv4().substring(0, 8)}`,
        type: template.type,
        specialization: template.specialization,
        capabilities: template.capabilities,
        purpose: `Contribute ${template.specialization} perspective to: ${topic}`,
        preferredModelTier: template.preferredModelTier,
        templateId: templateId,
        createdAt: Date.now()
      };
      
      agents.push(agent);
      
      // Store in available agents
      this.availableAgents.set(agent.id, agent);
      this.agentCapabilities.set(agent.id, template.capabilities);
    }
    
    return agents;
  }

  /**
   * Get default agents as fallback
   */
  getDefaultAgents() {
    const defaults = [
      'strategic-coordinator',
      'technical-architect',
      'research-analyst'
    ];
    
    return this.instantiateAgents(defaults, 'General discussion');
  }

  /**
   * Perform fallback topic analysis
   */
  performFallbackAnalysis(topic) {
    const topicLower = topic.toLowerCase();
    const analysis = {
      primaryExpertise: [],
      secondaryExpertise: [],
      technicalDepth: 'medium',
      creativityNeeded: false,
      analyticalDepth: 'medium',
      domainSpecific: false,
      suggestedAgentTypes: []
    };
    
    // Simple keyword matching for fallback
    if (topicLower.includes('architect') || topicLower.includes('design')) {
      analysis.primaryExpertise.push('architecture');
      analysis.suggestedAgentTypes.push('architect');
    }
    if (topicLower.includes('secur')) {
      analysis.primaryExpertise.push('security');
      analysis.suggestedAgentTypes.push('security');
    }
    if (topicLower.includes('test') || topicLower.includes('qa')) {
      analysis.primaryExpertise.push('testing');
      analysis.suggestedAgentTypes.push('qa');
    }
    if (topicLower.includes('data') || topicLower.includes('ml')) {
      analysis.primaryExpertise.push('data-science');
      analysis.suggestedAgentTypes.push('data-science');
    }
    
    // Default suggestions if no matches
    if (analysis.suggestedAgentTypes.length === 0) {
      analysis.suggestedAgentTypes = ['coordinator', 'researcher', 'developer'];
    }
    
    return analysis;
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
      logger.error('Failed to parse JSON:', error);
    }
    
    return this.performFallbackAnalysis('');
  }

  /**
   * Update agent performance metrics
   */
  updateAgentPerformance(agentId, performance) {
    const current = this.agentPerformance.get(agentId) || {
      totalTasks: 0,
      successfulTasks: 0,
      successRate: 0
    };
    
    current.totalTasks++;
    if (performance.success) {
      current.successfulTasks++;
    }
    current.successRate = current.successfulTasks / current.totalTasks;
    
    this.agentPerformance.set(agentId, current);
  }

  /**
   * Get agent selection summary
   */
  getSelectionSummary(agents) {
    return {
      count: agents.length,
      types: agents.map(a => a.type),
      specializations: agents.map(a => a.specialization),
      capabilities: [...new Set(agents.flatMap(a => a.capabilities))],
      modelTiers: agents.map(a => a.preferredModelTier)
    };
  }
}

export default DynamicAgentSelector;