/**
 * Enhanced Conversation Engine
 * 
 * Integrates advanced memory, direct response, and interaction systems
 * to create truly interactive agent conversations
 */

import { ConversationEngine } from './conversation-engine.js';
import { EnhancedAgentMemory } from './enhanced-agent-memory.js';
import { DirectResponseSystem } from './direct-response-system.js';
import { AgentInteractionManager } from './agent-interaction-manager.js';
import { RoundTransitionManager } from './round-transition-manager.js';
import { DynamicAgentSelector } from './dynamic-agent-selector.js';
import { TieredModelSelector } from './tiered-model-selector.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class EnhancedConversationEngine extends ConversationEngine {
  constructor(aiClient, chatLogger) {
    super(aiClient, chatLogger);
    
    // Initialize enhanced systems
    this.enhancedMemory = new EnhancedAgentMemory();
    this.directResponse = new DirectResponseSystem(aiClient, this.enhancedMemory);
    this.interactionManager = new AgentInteractionManager(aiClient, chatLogger);
    this.roundManager = new RoundTransitionManager();
    this.agentSelector = new DynamicAgentSelector();
    // Pass null for modelSelector since we don't have that component
    this.modelSelector = new TieredModelSelector(null);
    
    // Conversation state
    this.activeConversations = new Map();
    this.conversationThreads = new Map();
    this.agentStates = new Map();
    
    // Configuration
    this.config = {
      enableDirectResponses: true,
      enableMemory: true,
      enableDynamicSelection: true,
      maxTurnsPerRound: 10,
      responseTimeout: 30000,
      minAgentsPerConversation: 3,
      maxAgentsPerConversation: 7
    };
    
    // Metrics
    this.metrics = {
      totalExchanges: 0,
      directResponses: 0,
      questionsAsked: 0,
      questionsAnswered: 0,
      agreements: 0,
      disagreements: 0,
      insightsGenerated: 0
    };
  }

  /**
   * Start an enhanced multi-agent discussion
   */
  async startEnhancedDiscussion(topic, options = {}) {
    const discussionId = uuidv4();
    logger.info(`Starting enhanced discussion: ${topic.title || topic}`);
    
    // Select optimal agents for the topic
    let agents = options.agents;
    if (!agents && this.config.enableDynamicSelection) {
      agents = await this.agentSelector.selectAgentsForDiscussion(
        topic,
        { 
          min: this.config.minAgentsPerConversation,
          max: this.config.maxAgentsPerConversation
        }
      );
    }
    
    // Assign tiered models to agents
    for (const agent of agents) {
      const model = await this.modelSelector.assignModelToAgent(
        agent,
        topic.complexity || 'medium'
      );
      agent.assignedModel = model;
      logger.info(`Assigned ${model.displayName} to ${agent.type} agent`);
    }
    
    // Initialize conversation state
    const conversation = {
      id: discussionId,
      topic: topic,
      agents: agents,
      rounds: [],
      currentRound: 1,
      exchanges: [],
      startTime: Date.now(),
      status: 'active'
    };
    
    this.activeConversations.set(discussionId, conversation);
    
    // Initialize agent states and memory
    this.initializeAgentStates(agents, discussionId);
    
    // Start the discussion
    const results = await this.runEnhancedDiscussion(conversation, options);
    
    // Finalize and return results
    return this.finalizeDiscussion(discussionId, results);
  }

  /**
   * Run the enhanced discussion with direct responses
   */
  async runEnhancedDiscussion(conversation, options = {}) {
    const maxRounds = options.maxRounds || 5;
    const results = {
      rounds: [],
      insights: [],
      consensus: null,
      keyPoints: []
    };
    
    for (let round = 1; round <= maxRounds; round++) {
      console.log(`\n🔄 Round ${round}/${maxRounds}`);
      
      // Determine round objectives
      const roundPlan = await this.roundManager.planRound(
        round,
        conversation.topic,
        conversation.exchanges,
        conversation.agents
      );
      
      console.log(`   Objective: ${roundPlan.objective}`);
      console.log(`   Approach: ${roundPlan.approach}`);
      
      // Run the round with enhanced interactions
      const roundResults = await this.runEnhancedRound(
        conversation,
        roundPlan,
        options
      );
      
      results.rounds.push(roundResults);
      
      // Check for round transition
      const transitionDecision = await this.roundManager.shouldTransitionToNextRound(
        roundResults,
        conversation
      );
      
      if (transitionDecision.shouldTransition) {
        console.log(`   ✓ Transitioning: ${transitionDecision.reason}`);
        if (transitionDecision.reason === 'consensus_reached' || 
            transitionDecision.reason === 'objective_achieved') {
          break;
        }
      }
      
      // Update conversation state
      conversation.currentRound = round + 1;
      conversation.exchanges.push(...roundResults.exchanges);
    }
    
    return results;
  }

  /**
   * Run a single enhanced round with direct responses
   */
  async runEnhancedRound(conversation, roundPlan, options) {
    const roundResults = {
      roundNumber: conversation.currentRound,
      objective: roundPlan.objective,
      exchanges: [],
      questions: [],
      answers: [],
      agreements: [],
      disagreements: [],
      insights: []
    };
    
    const agents = conversation.agents;
    const maxTurns = options.maxTurnsPerRound || this.config.maxTurnsPerRound;
    
    // Track pending responses
    const pendingResponses = [];
    
    for (let turn = 1; turn <= maxTurns; turn++) {
      // Determine who should speak based on conversation flow
      const speaker = await this.selectNextSpeaker(
        agents,
        conversation,
        pendingResponses,
        roundPlan
      );
      
      if (!speaker) break; // No one has anything to say
      
      // Generate statement from speaker
      const statement = await this.generateEnhancedStatement(
        speaker,
        conversation,
        roundPlan,
        pendingResponses
      );
      
      // Log the statement
      console.log(`\n   💬 ${speaker.name}: "${statement.content.substring(0, 100)}..."`);
      
      // Store in memory
      await this.enhancedMemory.storeExchange(speaker.id, statement);
      
      // Analyze statement for required responses
      const analysis = this.directResponse.analyzeStatement(
        statement,
        speaker,
        agents.filter(a => a.id !== speaker.id)
      );
      
      // If statement requires responses, add to pending
      if (analysis.requiresResponse) {
        pendingResponses.push({
          statement: statement,
          analysis: analysis,
          timestamp: Date.now()
        });
        
        // Track questions
        if (analysis.responseType === 'answer') {
          roundResults.questions.push(statement);
          this.metrics.questionsAsked++;
        }
      }
      
      // Add to exchanges
      roundResults.exchanges.push(statement);
      
      // Generate direct responses if enabled
      if (this.config.enableDirectResponses && pendingResponses.length > 0) {
        const responses = await this.generateDirectResponses(
          pendingResponses,
          agents,
          conversation
        );
        
        for (const response of responses) {
          console.log(`     ↳ ${response.from.name}: "${response.content.substring(0, 80)}..."`);
          
          // Track response types
          if (response.type === 'answer') {
            roundResults.answers.push(response);
            this.metrics.questionsAnswered++;
          } else if (response.type === 'agreement') {
            roundResults.agreements.push(response);
            this.metrics.agreements++;
          } else if (response.type === 'disagreement') {
            roundResults.disagreements.push(response);
            this.metrics.disagreements++;
          }
          
          roundResults.exchanges.push(response);
        }
        
        // Remove handled responses from pending
        pendingResponses.splice(0, responses.length);
      }
      
      // Check for insights
      const insight = this.extractInsight(statement);
      if (insight) {
        roundResults.insights.push(insight);
        this.metrics.insightsGenerated++;
      }
    }
    
    // Handle any remaining pending responses
    if (pendingResponses.length > 0) {
      console.log(`\n   📋 ${pendingResponses.length} pending responses carried to next round`);
    }
    
    return roundResults;
  }

  /**
   * Select the next speaker based on conversation flow
   */
  async selectNextSpeaker(agents, conversation, pendingResponses, roundPlan) {
    // Priority 1: Agent with pending response obligation
    if (pendingResponses.length > 0) {
      const prioritized = await this.directResponse.prioritizeResponses(pendingResponses);
      if (prioritized.length > 0) {
        const targetAgents = prioritized[0].analysis.targetAgents;
        if (targetAgents.length > 0) {
          return targetAgents[0];
        }
      }
    }
    
    // Priority 2: Agent who hasn't spoken recently
    const recentSpeakers = conversation.exchanges
      .slice(-agents.length)
      .map(e => e.from.id);
    
    const silentAgent = agents.find(a => !recentSpeakers.includes(a.id));
    if (silentAgent) {
      return silentAgent;
    }
    
    // Priority 3: Agent with relevant expertise
    if (roundPlan.focusArea) {
      const expert = agents.find(a => 
        a.expertise?.some(e => 
          roundPlan.focusArea.toLowerCase().includes(e.toLowerCase())
        )
      );
      if (expert) {
        return expert;
      }
    }
    
    // Default: Random selection
    return agents[Math.floor(Math.random() * agents.length)];
  }

  /**
   * Generate an enhanced statement with memory and context
   */
  async generateEnhancedStatement(agent, conversation, roundPlan, pendingResponses) {
    // Check if agent should respond to pending items
    const relevantPending = pendingResponses.filter(p => 
      p.analysis.targetAgents.some(t => t.id === agent.id)
    );
    
    if (relevantPending.length > 0) {
      // Generate direct response
      const response = await this.directResponse.generateDirectResponse(
        agent,
        relevantPending[0].statement,
        relevantPending[0].analysis,
        conversation
      );
      
      return response;
    }
    
    // Otherwise, generate new statement with context
    const memoryContext = await this.enhancedMemory.retrieveRelevantMemories(
      agent.id,
      { topic: conversation.topic.title }
    );
    
    const prompt = this.buildEnhancedPrompt(
      agent,
      conversation,
      roundPlan,
      memoryContext
    );
    
    const response = await this.aiClient.generateResponse(
      agent.assignedModel?.id || 'gpt-4',
      prompt,
      {
        agentType: agent.type,
        maxTokens: 150,
        temperature: 0.7
      }
    );
    
    return {
      id: uuidv4(),
      from: agent,
      to: 'all',
      content: response.content,
      type: 'statement',
      timestamp: Date.now(),
      metadata: {
        model: response.model,
        round: conversation.currentRound
      }
    };
  }

  /**
   * Generate direct responses to pending items
   */
  async generateDirectResponses(pendingResponses, agents, conversation) {
    const responses = [];
    const prioritized = await this.directResponse.prioritizeResponses(pendingResponses);
    
    // Generate up to 3 direct responses per turn
    const toHandle = prioritized.slice(0, 3);
    
    for (const pending of toHandle) {
      const targetAgents = pending.analysis.targetAgents;
      
      for (const targetAgent of targetAgents) {
        const response = await this.directResponse.generateDirectResponse(
          targetAgent,
          pending.statement,
          pending.analysis,
          conversation
        );
        
        responses.push(response);
        this.metrics.directResponses++;
        
        // Mark question as answered if applicable
        if (pending.analysis.responseType === 'answer') {
          this.enhancedMemory.markQuestionAnswered(
            pending.statement.id,
            response.id
          );
        }
      }
    }
    
    return responses;
  }

  /**
   * Build enhanced prompt with full context
   */
  buildEnhancedPrompt(agent, conversation, roundPlan, memoryContext) {
    const recentExchanges = conversation.exchanges
      .slice(-5)
      .map(e => `${e.from.name}: ${e.content}`)
      .join('\n');
    
    return `You are ${agent.name}, a ${agent.type} agent.

Discussion Topic: ${conversation.topic.title}
Current Round: ${conversation.currentRound}
Round Objective: ${roundPlan.objective}

Recent Discussion:
${recentExchanges}

Your Recent Memories:
${memoryContext.recentExchanges.map(m => m.content).join('\n')}

Unanswered Questions:
${memoryContext.previousQuestions.map(q => q.question).join('\n')}

Important Facts:
${memoryContext.importantFacts.map(f => f.content).join('\n')}

Based on the discussion and your expertise, provide a valuable contribution.
- Directly reference other agents' points when relevant
- Ask questions if something is unclear
- Build on previous ideas
- Challenge assumptions respectfully
- Share insights from your domain

Your response:`;
  }

  /**
   * Initialize agent states for tracking
   */
  initializeAgentStates(agents, discussionId) {
    for (const agent of agents) {
      this.agentStates.set(`${agent.id}-${discussionId}`, {
        agent: agent,
        contributionCount: 0,
        questionsAsked: 0,
        questionsAnswered: 0,
        lastSpoke: null,
        engagement: 'active',
        confidence: 0.7
      });
    }
  }

  /**
   * Extract insights from statements
   */
  extractInsight(statement) {
    const insightKeywords = [
      'realize', 'discovered', 'insight', 'understand now',
      'breakthrough', 'key point', 'important', 'crucial'
    ];
    
    const hasInsight = insightKeywords.some(keyword => 
      statement.content.toLowerCase().includes(keyword)
    );
    
    if (hasInsight) {
      return {
        id: uuidv4(),
        content: statement.content,
        author: statement.from,
        timestamp: statement.timestamp,
        importance: 0.8
      };
    }
    
    return null;
  }

  /**
   * Finalize discussion and generate summary
   */
  async finalizeDiscussion(discussionId, results) {
    const conversation = this.activeConversations.get(discussionId);
    
    // Calculate final metrics
    const summary = {
      discussionId: discussionId,
      topic: conversation.topic,
      duration: Date.now() - conversation.startTime,
      rounds: results.rounds.length,
      totalExchanges: results.rounds.reduce((sum, r) => sum + r.exchanges.length, 0),
      questions: results.rounds.reduce((sum, r) => sum + r.questions.length, 0),
      answers: results.rounds.reduce((sum, r) => sum + r.answers.length, 0),
      agreements: results.rounds.reduce((sum, r) => sum + r.agreements.length, 0),
      disagreements: results.rounds.reduce((sum, r) => sum + r.disagreements.length, 0),
      insights: results.rounds.reduce((arr, r) => [...arr, ...r.insights], []),
      consensus: await this.evaluateConsensus(results),
      keyPoints: await this.extractKeyPoints(results),
      agentContributions: this.summarizeAgentContributions(discussionId)
    };
    
    // Log summary
    await this.chatLogger.addSystemMessage(
      `Enhanced Discussion Complete:\n${JSON.stringify(summary, null, 2)}`,
      'SUMMARY'
    );
    
    // Clean up
    this.activeConversations.delete(discussionId);
    
    return summary;
  }

  /**
   * Evaluate if consensus was reached
   */
  async evaluateConsensus(results) {
    const agreements = results.rounds.reduce((sum, r) => sum + r.agreements.length, 0);
    const disagreements = results.rounds.reduce((sum, r) => sum + r.disagreements.length, 0);
    
    if (agreements > disagreements * 2) {
      return {
        reached: true,
        strength: 'strong',
        confidence: agreements / (agreements + disagreements)
      };
    } else if (agreements > disagreements) {
      return {
        reached: true,
        strength: 'moderate',
        confidence: agreements / (agreements + disagreements)
      };
    }
    
    return {
      reached: false,
      strength: 'none',
      confidence: 0
    };
  }

  /**
   * Extract key points from discussion
   */
  async extractKeyPoints(results) {
    const keyPoints = [];
    
    // Add insights as key points
    for (const round of results.rounds) {
      keyPoints.push(...round.insights.map(i => ({
        type: 'insight',
        content: i.content,
        importance: i.importance
      })));
    }
    
    // Add major agreements
    for (const round of results.rounds) {
      if (round.agreements.length >= 2) {
        keyPoints.push({
          type: 'consensus',
          content: `Multiple agents agreed on: ${round.agreements[0].content}`,
          importance: 0.7
        });
      }
    }
    
    // Sort by importance
    return keyPoints.sort((a, b) => b.importance - a.importance).slice(0, 5);
  }

  /**
   * Summarize individual agent contributions
   */
  summarizeAgentContributions(discussionId) {
    const contributions = {};
    
    for (const [key, state] of this.agentStates) {
      if (key.includes(discussionId)) {
        contributions[state.agent.name] = {
          statements: state.contributionCount,
          questionsAsked: state.questionsAsked,
          questionsAnswered: state.questionsAnswered,
          engagement: state.engagement
        };
      }
    }
    
    return contributions;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      memoryStats: this.enhancedMemory.getMemoryStats(),
      activeConversations: this.activeConversations.size
    };
  }
}

export default EnhancedConversationEngine;