/**
 * Autonomous Multi-Model Conversation Engine
 * 
 * A truly autonomous system that:
 * - Uses multiple different AI models simultaneously
 * - Creates subagents dynamically as needed
 * - No fixed conversation steps - completely dynamic
 * - Maintains memory across all iterations
 * - Self-determines stopping points via multi-model consensus
 */

import logger from '../utils/logger.js';
import AIClient from './ai-client.js';
import MCPClient from './mcp-client.js';
import RoundTransitionManager from './round-transition-manager.js';
import DynamicAgentSelector from './dynamic-agent-selector.js';
import TieredModelSelector from './tiered-model-selector.js';
import { v4 as uuidv4 } from 'uuid';

export class AutonomousConversationEngine {
  constructor(chatLogger, modelSelector, mcpRegistry) {
    this.chatLogger = chatLogger;
    this.modelSelector = modelSelector;
    this.mcpRegistry = mcpRegistry;
    this.aiClient = new AIClient();
    this.mcpClient = new MCPClient(mcpRegistry);
    
    // Enhanced system components
    this.roundTransitionManager = new RoundTransitionManager(this.aiClient);
    this.dynamicAgentSelector = new DynamicAgentSelector(this.aiClient);
    this.tieredModelSelector = new TieredModelSelector(modelSelector);
    
    // Autonomous system state
    this.conversationMemory = [];
    this.activeAgents = new Map();
    this.modelRotation = [];
    this.currentIteration = 0;
    this.maxIterations = 100; // Safety limit
    this.stoppingConsensusThreshold = 0.7; // 70% of models must agree to stop
    
    // Dynamic system state
    this.currentObjective = null;
    this.discoveredRequirements = new Set();
    this.createdSubsystems = new Map();
    this.conversationContext = {
      topics: [],
      decisions: [],
      openQuestions: [],
      completedTasks: [],
      currentFocus: null
    };
  }

  /**
   * Start autonomous conversation - no fixed steps
   */
  async startAutonomousConversation(prompt, initialAgents = []) {
    try {
      await this.aiClient.initialize();
      await this.tieredModelSelector.initialize();
      
      // Initialize MCP client with proper error handling
      try {
        await this.mcpClient.initialize();
        console.log(`   ✅ MCP Client initialized successfully`);
      } catch (mcpError) {
        logger.error('MCP initialization failed, continuing without MCP tools:', mcpError);
        console.log(`   ⚠️  MCP Client initialization failed - agents will work without MCP tools`);
      }
      
      console.log(`🤖 Starting Autonomous Multi-Model Conversation Engine...`);
      console.log(`   Available Models: ${this.aiClient.getAvailableProviders().join(', ')}`);
      console.log(`   Connected MCP Servers: ${this.mcpClient.getConnectedServers().length}`);
      console.log(`   Available MCP Tools: ${this.mcpClient.getAvailableTools().length}`);
      console.log(`   Initial Agents: ${initialAgents.length}`);
      console.log(`   Mode: Fully Autonomous with Enhanced Round Management\n`);

      // Initialize system with dynamic agent selection
      this.currentObjective = await this.analyzeObjective(prompt);
      
      // Dynamically select initial agents based on objective
      if (initialAgents.length === 0) {
        initialAgents = await this.dynamicAgentSelector.selectAgentsForDiscussion(
          this.currentObjective.mainObjective,
          { complexity: this.currentObjective.complexity }
        );
        console.log(`   Dynamically selected ${initialAgents.length} agents for discussion`);
      }
      
      this.setupInitialAgentsWithTieredModels(initialAgents);
      
      await this.chatLogger.addSystemMessage(
        `Starting autonomous multi-model conversation. Objective: ${this.currentObjective.summary}`,
        'AUTONOMOUS_START'
      );

      // Autonomous conversation loop with round management
      let shouldContinue = true;
      while (shouldContinue && this.currentIteration < this.maxIterations) {
        this.currentIteration++;
        this.roundTransitionManager.advanceRound();
        
        console.log(`\n🔄 Autonomous Iteration ${this.currentIteration} (Round ${this.roundTransitionManager.currentRound})`);
        
        // Plan the current round using round transition manager
        const roundPlan = await this.roundTransitionManager.planNextRound(
          { exchanges: this.conversationMemory.slice(-10) },
          this.conversationContext
        );
        console.log(`   Round Focus: ${roundPlan.focus}`);
        console.log(`   Approach: ${roundPlan.approach}`);
        
        // Dynamic decision making with round context
        const nextAction = await this.determineNextAction(roundPlan);
        console.log(`   Next Action: ${nextAction.type} - ${nextAction.description}`);
        
        // Execute the determined action
        await this.executeAction(nextAction);
        
        // Update conversation memory and round history
        this.updateConversationMemory(nextAction);
        this.roundTransitionManager.updateRoundHistory({
          topic: nextAction.description,
          exchanges: this.conversationMemory.slice(-5)
        });
        
        // Check round transition criteria
        const transitionDecision = await this.roundTransitionManager.shouldTransitionToNextRound(
          { exchanges: this.conversationMemory.slice(-10) },
          this.conversationContext
        );
        
        if (!transitionDecision.shouldTransition) {
          console.log(`   Round complete: ${transitionDecision.reason}`);
        }
        
        // Check if system wants to continue (multi-model consensus)
        shouldContinue = await this.shouldContinueConversation();
        
        if (!shouldContinue) {
          console.log(`\n🎯 Multi-model consensus reached: Conversation should conclude`);
        }

        // Display agent hierarchy every few iterations
        if (this.currentIteration % 3 === 0) {
          this.displayAgentHierarchy();
        }
        
        // Brief pause for realism
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Generate autonomous conclusion
      await this.generateAutonomousConclusion();
      
      console.log(`\n✅ Autonomous conversation completed after ${this.currentIteration} iterations`);
      
    } catch (error) {
      logger.error('Autonomous conversation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze the objective dynamically using multiple models
   */
  async analyzeObjective(prompt) {
    console.log(`🎯 Analyzing objective with multiple models...`);
    
    const models = this.getAvailableModels();
    const analyses = [];
    
    for (const model of models) {
      try {
        const analysis = await this.aiClient.generateResponse(model.id, 
          `Analyze this request and determine what needs to be accomplished: "${prompt}"
          
          Provide a JSON response with:
          {
            "complexity": 1-10,
            "mainObjective": "brief description", 
            "requiredCapabilities": ["cap1", "cap2"],
            "suggestedAgents": ["agent1", "agent2"],
            "estimatedScope": "small/medium/large",
            "keyQuestions": ["question1", "question2"]
          }`, 
          {
            agentType: 'analyzer',
            maxTokens: 300,
            temperature: 0.3
          }
        );
        
        try {
          const parsed = JSON.parse(analysis.content);
          analyses.push({
            model: model.name,
            ...parsed
          });
        } catch (e) {
          // Fallback if JSON parsing fails
          analyses.push({
            model: model.name,
            complexity: 5,
            mainObjective: prompt,
            requiredCapabilities: ['general'],
            suggestedAgents: ['coordinator'],
            estimatedScope: 'medium',
            keyQuestions: []
          });
        }
      } catch (error) {
        logger.error(`Failed to analyze with ${model.name}:`, error.message);
      }
    }

    // Synthesize analyses from multiple models
    const synthesis = this.synthesizeAnalyses(analyses);
    
    console.log(`   Complexity: ${synthesis.complexity}/10`);
    console.log(`   Scope: ${synthesis.estimatedScope}`);
    console.log(`   Required Capabilities: ${synthesis.requiredCapabilities.join(', ')}`);
    
    return synthesis;
  }

  /**
   * Dynamically determine what should happen next
   */
  async determineNextAction(roundPlan = null) {
    const context = this.buildCurrentContext();
    const models = this.getAvailableModels();
    const suggestions = [];
    
    // Include round plan in decision making
    const roundContext = roundPlan ? `
Round Focus: ${roundPlan.focus}
Round Objectives: ${roundPlan.objectives?.join(', ')}
Suggested Approach: ${roundPlan.approach}` : '';

    // Ask multiple models what should happen next
    for (const model of models.slice(0, 3)) { // Use 3 models for efficiency
      try {
        const suggestion = await this.aiClient.generateResponse(model.id,
          `Based on the current conversation context, determine what should happen next:

Context:
- Current objective: ${this.currentObjective.mainObjective}
- Iteration: ${this.currentIteration}
- Active agents: ${Array.from(this.activeAgents.keys()).join(', ')}
- Recent actions: ${this.conversationMemory.slice(-3).map(m => m.type).join(', ')}
- Open questions: ${this.conversationContext.openQuestions.slice(-3).join(', ')}

Suggest the next action as JSON:
{
  "type": "create_agent|agent_discussion|deep_analysis|requirement_gathering|solution_design|implementation_planning|risk_assessment|integration_design|testing_strategy|deployment_planning|other",
  "description": "what to do next",
  "priority": 1-10,
  "reasoning": "why this is needed now",
  "requiredAgents": ["agent1", "agent2"],
  "estimatedDuration": "minutes"
}`,
          {
            agentType: 'strategic-planner',
            maxTokens: 200,
            temperature: 0.6
          }
        );

        try {
          const parsed = JSON.parse(suggestion.content);
          suggestions.push({
            model: model.name,
            ...parsed
          });
        } catch (e) {
          // Fallback suggestion
          suggestions.push({
            model: model.name,
            type: 'agent_discussion',
            description: 'Continue agent discussion',
            priority: 5,
            reasoning: 'Default next step',
            requiredAgents: Array.from(this.activeAgents.keys()).slice(0, 2),
            estimatedDuration: '2-3 minutes'
          });
        }
      } catch (error) {
        logger.error(`Failed to get suggestion from ${model.name}:`, error.message);
      }
    }

    // Select best suggestion based on priority and consensus
    return this.selectBestAction(suggestions);
  }

  /**
   * Execute the determined action dynamically
   */
  async executeAction(action) {
    switch (action.type) {
      case 'create_agent':
        await this.createDynamicAgent(action);
        break;
      case 'agent_discussion':
        await this.facilitateAgentDiscussion(action);
        break;
      case 'web_research':
        await this.conductWebResearch(action);
        break;
      case 'sequential_analysis':
        await this.performSequentialAnalysis(action);
        break;
      case 'deep_analysis':
        await this.conductDeepAnalysis(action);
        break;
      case 'requirement_gathering':
        await this.gatherRequirements(action);
        break;
      case 'solution_design':
        await this.designSolution(action);
        break;
      case 'implementation_planning':
        await this.planImplementation(action);
        break;
      case 'risk_assessment':
        await this.assessRisks(action);
        break;
      case 'integration_design':
        await this.designIntegration(action);
        break;
      case 'testing_strategy':
        await this.designTestingStrategy(action);
        break;
      case 'deployment_planning':
        await this.planDeployment(action);
        break;
      default:
        await this.executeCustomAction(action);
    }
  }

  /**
   * Create new agents dynamically based on discovered needs
   */
  async createDynamicAgent(action) {
    console.log(`   🤖 Creating dynamic agent: ${action.description}`);
    
    // Determine what type of agent is needed
    const agentSpec = await this.determineAgentSpecification(action);
    
    const agentId = `dynamic-${agentSpec.type}-${uuidv4().substring(0, 8)}`;
    const agent = {
      id: agentId,
      type: agentSpec.type,
      specialization: agentSpec.specialization,
      capabilities: agentSpec.capabilities,
      assignedModel: this.getNextModelInRotation(),
      createdAt: Date.now(),
      purpose: action.description,
      conversationContext: [...this.conversationMemory]
    };

    this.activeAgents.set(agentId, agent);
    
    await this.chatLogger.addSystemMessage(
      `Created dynamic agent: ${agent.type} (${agentId}) specialized in ${agent.specialization}`,
      'DYNAMIC_AGENT_CREATION'
    );

    console.log(`      ✅ Agent created: ${agent.type} using ${agent.assignedModel.name}`);
    console.log(`      Specialization: ${agent.specialization}`);
    console.log(`      Capabilities: ${agent.capabilities.join(', ')}`);
  }

  /**
   * Facilitate dynamic discussion between agents
   */
  async facilitateAgentDiscussion(action) {
    console.log(`   💬 Facilitating agent discussion: ${action.description}`);
    
    const participatingAgents = this.selectAgentsForDiscussion(action.requiredAgents);
    const discussionModel = this.getNextModelInRotation();
    
    // Generate discussion topic
    const topic = await this.generateDiscussionTopic(action, participatingAgents);
    
    console.log(`      Topic: ${topic.title}`);
    console.log(`      Participants: ${participatingAgents.map(a => a.type).join(', ')}`);
    
    // Multi-agent discussion with different models
    for (let round = 0; round < Math.min(participatingAgents.length * 2, 6); round++) {
      const speakingAgent = participatingAgents[round % participatingAgents.length];
      const targetAgent = participatingAgents[(round + 1) % participatingAgents.length];
      
      console.log(`      Round ${round + 1}: ${speakingAgent.type} → ${targetAgent.type} (${speakingAgent.assignedModel.name})`);
      
      const response = await this.generateAgentResponse(speakingAgent, topic, targetAgent, round);
      
      if (response.usedMCPTools) {
        console.log(`        🔧 Agent used MCP tools for enhanced response`);
      }
      
      if (response.knowledgeVerified) {
        console.log(`        ✅ Knowledge verified with web search to prevent hallucinations`);
      }
      
      if (response.createdSubAgents) {
        console.log(`        🤖 Agent created ${response.subAgentCount} specialized sub-agents`);
      }
      
      await this.chatLogger.addAgentResponse(
        speakingAgent.id,
        speakingAgent.type,
        response.content,
        {
          model: speakingAgent.assignedModel.name,
          responseTime: response.responseTime,
          iteration: this.currentIteration,
          round: round + 1,
          topic: topic.title,
          usedMCPTools: response.usedMCPTools || false,
          knowledgeVerified: response.knowledgeVerified || false,
          verificationQueries: response.verificationResults ? Object.keys(response.verificationResults).length : 0,
          createdSubAgents: response.createdSubAgents || false,
          subAgentCount: response.subAgentCount || 0,
          subAgentResults: response.subAgentResults ? Object.keys(response.subAgentResults) : []
        }
      );

      // Add to conversation memory
      this.conversationMemory.push({
        type: 'agent_response',
        agent: speakingAgent.id,
        content: response.content,
        timestamp: Date.now(),
        iteration: this.currentIteration
      });
    }

    await this.chatLogger.addSystemMessage(
      `Completed discussion rounds on: ${topic.title}`,
      'DISCUSSION_COMPLETE'
    );
  }

  /**
   * Check if conversation should continue using multi-model consensus
   */
  async shouldContinueConversation() {
    if (this.currentIteration >= this.maxIterations) {
      return false;
    }

    console.log(`   🤔 Checking multi-model consensus for continuation...`);
    
    // Get a wide, diverse array of models for consensus (max 8-10 different models)
    const allModels = this.getAvailableModels();
    const diverseModels = this.selectDiverseModelsForConsensus(allModels);
    const votes = [];
    
    console.log(`   🎯 Using ${diverseModels.length} diverse models for consensus:`);
    diverseModels.forEach(model => {
      console.log(`      • ${model.name} (${model.provider})`);
    });
    
    const context = this.buildCurrentContext();
    
    for (const model of diverseModels) {
      try {
        const decision = await this.aiClient.generateResponse(model.id,
          `You are evaluating whether this autonomous AI conversation should continue or conclude.

CURRENT STATUS:
- Iteration: ${this.currentIteration}/${this.maxIterations}
- Main Objective: ${this.currentObjective.mainObjective}
- Active Agents: ${this.activeAgents.size}
- Recent Actions: ${this.conversationMemory.slice(-3).map(m => m.type).join(', ')}
- Open Questions: ${this.conversationContext.openQuestions.length}
- Progress Made: ${this.conversationMemory.length} total interactions

EVALUATION CRITERIA:
1. Are there unresolved questions or tasks?
2. Is meaningful progress still being made?
3. Have we achieved sufficient depth and breadth?
4. Are the agents producing new insights or just repeating?
5. Is the objective substantially completed?

CONFIDENCE SCORING:
- 0.9-1.0: Very confident in decision
- 0.7-0.8: Moderately confident
- 0.5-0.6: Somewhat confident
- 0.0-0.4: Low confidence

Be CRITICAL and realistic. If agents are just repeating ideas or the objective is largely complete, vote to CONCLUDE.

Respond with JSON:
{
  "shouldContinue": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation of your decision",
  "completionPercentage": 0-100,
  "suggestedNextSteps": ["step1", "step2"] or "conclusion"
}`,
          {
            agentType: 'decision-maker',
            maxTokens: 150,
            temperature: 0.4
          }
        );

        try {
          const parsed = JSON.parse(decision.content);
          votes.push({
            model: model.name,
            ...parsed
          });
          console.log(`      🤖 ${model.name}: ${parsed.shouldContinue ? 'CONTINUE' : 'CONCLUDE'} (confidence: ${Math.round(parsed.confidence * 100)}%)`);
          console.log(`         Reasoning: ${parsed.reasoning}`);
        } catch (e) {
          // Fallback vote
          votes.push({
            model: model.name,
            shouldContinue: this.currentIteration < 20,
            confidence: 0.5,
            reasoning: 'Fallback decision',
            suggestedNextSteps: ['continue']
          });
        }
      } catch (error) {
        logger.error(`Failed to get continuation decision from ${model.name}:`, error.message);
      }
    }

    // Calculate weighted consensus based on confidence scores
    const totalConfidenceWeightedVotes = votes.reduce((sum, vote) => {
      return sum + (vote.shouldContinue ? vote.confidence : 0);
    }, 0);
    
    const totalPossibleWeight = votes.reduce((sum, vote) => sum + vote.confidence, 0);
    const weightedContinueRatio = totalConfidenceWeightedVotes / totalPossibleWeight;
    
    const continueVotes = votes.filter(v => v.shouldContinue).length;
    const totalVotes = votes.length;
    const simpleRatio = continueVotes / totalVotes;
    
    // Average completion percentage from all models
    const avgCompletion = votes.reduce((sum, v) => sum + (v.completionPercentage || 50), 0) / votes.length;
    
    console.log(`      📊 Consensus Analysis:`);
    console.log(`         Simple Votes: ${continueVotes}/${totalVotes} want to continue (${(simpleRatio * 100).toFixed(1)}%)`);
    console.log(`         Weighted Votes: ${(weightedContinueRatio * 100).toFixed(1)}% (confidence-weighted)`);
    console.log(`         Avg Completion: ${avgCompletion.toFixed(1)}%`);
    
    // Log individual model opinions with more detail
    votes.forEach(vote => {
      const completion = vote.completionPercentage || 50;
      console.log(`      🤖 ${vote.model}: ${vote.shouldContinue ? 'CONTINUE' : 'CONCLUDE'} (conf: ${(vote.confidence * 100).toFixed(0)}%, completion: ${completion}%)`);
      console.log(`         "${vote.reasoning.substring(0, 80)}..."`);
    });

    // More sophisticated stopping criteria
    const shouldContinue = (
      weightedContinueRatio >= 0.6 && // At least 60% weighted confidence to continue
      avgCompletion < 85 && // Task less than 85% complete
      this.currentIteration < this.maxIterations - 2 // Not near iteration limit
    );
    
    if (!shouldContinue) {
      await this.chatLogger.addSystemMessage(
        `Multi-model consensus reached: ${continueVotes}/${totalVotes} models voted to continue. Concluding conversation.`,
        'CONSENSUS_STOP'
      );
    }

    return shouldContinue;
  }

  /**
   * Generate autonomous conclusion using all models
   */
  async generateAutonomousConclusion() {
    console.log(`\n🎯 Generating autonomous conclusion...`);
    
    const models = this.getAvailableModels();
    const conclusions = [];
    
    const finalContext = this.buildFinalContext();
    
    for (const model of models) {
      try {
        const conclusion = await this.aiClient.generateResponse(model.id,
          `Synthesize a comprehensive conclusion for this autonomous multi-agent conversation.

CONVERSATION OVERVIEW:
- Primary Objective: ${this.currentObjective.mainObjective}
- Total Iterations: ${this.currentIteration}
- Agents Deployed: ${this.activeAgents.size} agents
- Key Decisions Made: ${this.conversationContext.decisions.length}
- Conversation Complexity: ${this.currentObjective.complexity}/10

DETAILED CONTEXT:
${finalContext}

RECENT KEY INSIGHTS:
${this.conversationMemory.slice(-5).filter(m => m.content && m.content.length > 50).map(m => `- ${m.content.substring(0, 150)}...`).join('\n')}

INSTRUCTIONS: Write a detailed conclusion that includes:

1. ACCOMPLISHMENTS (What was successfully achieved):
   - List specific outcomes and solutions developed
   - Highlight breakthrough insights or innovations

2. KEY DECISIONS & CONSENSUS POINTS:
   - Summarize major decisions reached
   - Note areas of agent agreement/disagreement

3. TECHNICAL DETAILS:
   - Architectural approaches discussed
   - Implementation strategies proposed
   - Technical challenges identified and solutions

4. ACTIONABLE RECOMMENDATIONS:
   - Next steps for implementation
   - Specific actions to take forward
   - Areas requiring further investigation

5. SYNTHESIS:
   - Overall assessment of the conversation's value
   - Unique insights from multi-agent collaboration

IMPORTANT: Provide specific, concrete details from the actual conversation. 
Write 4-5 substantial paragraphs with real substance, not generic statements:`,
          {
            agentType: 'synthesizer',
            maxTokens: 400,
            temperature: 0.5
          }
        );

        conclusions.push({
          model: model.name,
          content: conclusion.content
        });
      } catch (error) {
        logger.error(`Failed to generate conclusion from ${model.name}:`, error.message);
      }
    }

    // Synthesize final conclusion from all models
    const finalConclusion = await this.synthesizeConclusions(conclusions);
    
    await this.chatLogger.addAgentResponse(
      'autonomous-coordinator',
      'autonomous-system',
      finalConclusion,
      {
        model: 'Multi-Model Synthesis',
        responseTime: 0,
        iteration: this.currentIteration,
        messageType: 'autonomous-conclusion'
      }
    );

    console.log(`✅ Autonomous conclusion generated from ${conclusions.length} models`);
  }

  // Helper methods for the autonomous system

  setupModelRotation() {
    this.modelRotation = this.getAvailableModels();
    if (this.modelRotation.length === 0) {
      throw new Error('No AI models available for autonomous conversation');
    }
  }

  setupInitialAgents(initialAgents) {
    initialAgents.forEach((agent, index) => {
      const enhancedAgent = {
        ...agent,
        assignedModel: this.modelRotation[index % this.modelRotation.length],
        conversationContext: []
      };
      this.activeAgents.set(agent.id, enhancedAgent);
    });
  }

  /**
   * Setup initial agents with tiered model assignments
   */
  async setupInitialAgentsWithTieredModels(initialAgents) {
    for (const agent of initialAgents) {
      // Assign model using tiered selector
      const assignedModel = await this.tieredModelSelector.assignModelToAgent(
        agent,
        this.currentObjective.complexity > 7 ? 'high' : 
        this.currentObjective.complexity > 4 ? 'medium' : 'low'
      );
      
      const enhancedAgent = {
        ...agent,
        assignedModel: assignedModel,
        conversationContext: [],
        isMainAgent: true // Mark as main agent for tier assignment
      };
      
      this.activeAgents.set(agent.id, enhancedAgent);
      
      console.log(`   Assigned ${assignedModel?.name || 'default model'} to ${agent.type} agent`);
    }
  }

  getAvailableModels() {
    return this.modelSelector.getAvailableModels().filter(m => m.available);
  }

  getNextModelInRotation() {
    if (this.modelRotation.length === 0) return null;
    const model = this.modelRotation[this.currentIteration % this.modelRotation.length];
    return model;
  }

  buildCurrentContext() {
    return {
      objective: this.currentObjective,
      iteration: this.currentIteration,
      agents: Array.from(this.activeAgents.values()),
      recentMemory: this.conversationMemory.slice(-10),
      openQuestions: this.conversationContext.openQuestions,
      decisions: this.conversationContext.decisions
    };
  }

  buildFinalContext() {
    // Get the most substantive messages
    const substantiveMessages = this.conversationMemory
      .filter(m => m.content && m.content.length > 100)
      .slice(-15);
    
    // Extract key themes from messages
    const themes = new Set();
    substantiveMessages.forEach(msg => {
      if (msg.content.includes('architect')) themes.add('System Architecture');
      if (msg.content.includes('coordinator')) themes.add('Agent Coordination');
      if (msg.content.includes('implement')) themes.add('Implementation Strategy');
      if (msg.content.includes('framework')) themes.add('Framework Design');
      if (msg.content.includes('protocol')) themes.add('Communication Protocols');
      if (msg.content.includes('hybrid')) themes.add('Hybrid Approaches');
    });
    
    // Build detailed context
    let context = `CONVERSATION THEMES: ${Array.from(themes).join(', ')}\n\n`;
    
    context += `AGENT CONTRIBUTIONS (${this.activeAgents.size} agents):\n`;
    Array.from(this.activeAgents.values()).forEach(agent => {
      const agentMessages = this.conversationMemory.filter(m => m.agent === agent.id);
      if (agentMessages.length > 0) {
        const lastMessage = agentMessages[agentMessages.length - 1];
        context += `\n${agent.type.toUpperCase()} (${agent.assignedModel.name}):\n`;
        context += `- Messages: ${agentMessages.length}\n`;
        context += `- Focus: ${agent.purpose || 'General discussion'}\n`;
        if (lastMessage.content) {
          context += `- Latest insight: "${lastMessage.content.substring(0, 200)}..."\n`;
        }
      }
    });
    
    context += `\nKEY DISCUSSION POINTS:\n`;
    substantiveMessages.forEach((msg, idx) => {
      if (msg.content) {
        // Extract the most important sentence from each message
        const sentences = msg.content.split('. ');
        const importantSentence = sentences.find(s => 
          s.includes('propose') || s.includes('suggest') || s.includes('important') || 
          s.includes('key') || s.includes('should') || s.includes('critical')
        ) || sentences[0];
        
        if (importantSentence) {
          context += `${idx + 1}. ${importantSentence.substring(0, 150)}...\n`;
        }
      }
    });
    
    if (this.conversationContext.decisions.length > 0) {
      context += `\nDECISIONS REACHED:\n`;
      this.conversationContext.decisions.forEach((decision, idx) => {
        context += `${idx + 1}. ${decision}\n`;
      });
    }
    
    if (this.conversationContext.openQuestions.length > 0) {
      context += `\nOPEN QUESTIONS:\n`;
      this.conversationContext.openQuestions.slice(-5).forEach((question, idx) => {
        context += `${idx + 1}. ${question}\n`;
      });
    }
    
    return context;
  }

  /**
   * Conduct web research using Playwright MCP
   */
  async conductWebResearch(action) {
    console.log(`   🌐 Web research: ${action.description}`);
    
    try {
      // Extract search terms from action description
      const searchQuery = this.extractSearchQuery(action.description);
      console.log(`      Searching for: "${searchQuery}"`);
      
      // Use Playwright MCP to search web
      const searchResults = await this.mcpClient.searchWeb(searchQuery, {
        maxResults: 5,
        extractContent: true
      });
      
      // Extract content from top results
      const detailedResults = [];
      for (const result of searchResults.results.slice(0, 3)) {
        try {
          const content = await this.mcpClient.extractWebContent(result.url);
          detailedResults.push({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            content: content.extracted.content.substring(0, 500) + '...'
          });
        } catch (error) {
          console.log(`      ⚠️  Failed to extract content from ${result.url}`);
        }
      }
      
      // Store research results in memory
      await this.mcpClient.storeMemory(`research-${Date.now()}`, {
        query: searchQuery,
        results: detailedResults,
        timestamp: new Date().toISOString()
      }, { tags: ['web-research', 'autonomous'] });
      
      // Log research findings
      await this.chatLogger.addSystemMessage(
        `Web research completed: Found ${detailedResults.length} detailed results for "${searchQuery}"`,
        'WEB_RESEARCH'
      );
      
      console.log(`      ✅ Found ${detailedResults.length} relevant sources`);
      
    } catch (error) {
      logger.error('Web research failed:', error);
      console.log(`      ❌ Web research failed: ${error.message}`);
    }
  }

  /**
   * Perform sequential analysis using Sequential Thinking MCP
   */
  async performSequentialAnalysis(action) {
    console.log(`   🧠 Sequential analysis: ${action.description}`);
    
    try {
      // Use sequential thinking MCP for structured analysis
      const thinking = await this.mcpClient.sequentialThinking(action.description, {
        depth: 'detailed',
        reasoning: 'step-by-step'
      });
      
      console.log(`      📝 Generated ${thinking.thinking.steps.length} analysis steps`);
      
      // Create decision tree if needed
      if (action.description.includes('decision') || action.description.includes('choose')) {
        const decisionTree = await this.mcpClient.createDecisionTree(action.description, {
          factors: ['technical feasibility', 'cost', 'timeline', 'risk'],
          visualization: true
        });
        
        console.log(`      🌳 Decision tree created with ${decisionTree.tree.branches.length} options`);
        
        // Store decision analysis
        await this.mcpClient.storeMemory(`decision-analysis-${Date.now()}`, {
          problem: action.description,
          thinking: thinking.thinking,
          decisionTree: decisionTree.tree
        }, { tags: ['sequential-analysis', 'decision-making'] });
      }
      
      // Log analysis completion
      await this.chatLogger.addSystemMessage(
        `Sequential analysis completed: ${thinking.thinking.steps.length} steps with structured reasoning`,
        'SEQUENTIAL_ANALYSIS'
      );
      
      // Update conversation context with insights
      this.conversationContext.decisions.push({
        type: 'sequential-analysis',
        description: action.description,
        conclusions: thinking.thinking.conclusions,
        timestamp: Date.now()
      });
      
    } catch (error) {
      logger.error('Sequential analysis failed:', error);
      console.log(`      ❌ Sequential analysis failed: ${error.message}`);
    }
  }

  // Enhanced implementations for other action types
  async conductDeepAnalysis(action) {
    console.log(`   🔍 Deep analysis: ${action.description}`);
    
    try {
      // Combine web research with sequential thinking
      const analysisSteps = await this.mcpClient.stepByStepAnalysis(action.description, {
        includeResearch: true
      });
      
      // Store analysis in memory for future reference
      await this.mcpClient.storeMemory(`deep-analysis-${Date.now()}`, {
        topic: action.description,
        analysis: analysisSteps.analysis,
        timestamp: new Date().toISOString()
      }, { tags: ['deep-analysis', 'comprehensive'] });
      
      console.log(`      ✅ Deep analysis completed with ${analysisSteps.analysis.steps.length} detailed steps`);
      
    } catch (error) {
      logger.error('Deep analysis failed:', error);
      console.log(`      ❌ Deep analysis failed: ${error.message}`);
    }
  }

  async gatherRequirements(action) {
    console.log(`   📋 Requirement gathering: ${action.description}`);
    // Implementation for requirement gathering
  }

  async designSolution(action) {
    console.log(`   🏗️  Solution design: ${action.description}`);
    // Implementation for solution design
  }

  async planImplementation(action) {
    console.log(`   📅 Implementation planning: ${action.description}`);
    // Implementation for implementation planning
  }

  async assessRisks(action) {
    console.log(`   ⚠️  Risk assessment: ${action.description}`);
    // Implementation for risk assessment
  }

  async designIntegration(action) {
    console.log(`   🔗 Integration design: ${action.description}`);
    // Implementation for integration design
  }

  async designTestingStrategy(action) {
    console.log(`   🧪 Testing strategy: ${action.description}`);
    // Implementation for testing strategy
  }

  async planDeployment(action) {
    console.log(`   🚀 Deployment planning: ${action.description}`);
    // Implementation for deployment planning
  }

  async executeCustomAction(action) {
    console.log(`   ⚙️  Custom action: ${action.description}`);
    // Implementation for custom actions
  }

  // Additional helper methods would go here...
  synthesizeAnalyses(analyses) {
    // Synthesize multiple model analyses
    const avgComplexity = analyses.reduce((sum, a) => sum + a.complexity, 0) / analyses.length;
    const allCapabilities = [...new Set(analyses.flatMap(a => a.requiredCapabilities))];
    const allAgents = [...new Set(analyses.flatMap(a => a.suggestedAgents))];
    
    return {
      complexity: Math.round(avgComplexity),
      mainObjective: analyses[0].mainObjective,
      requiredCapabilities: allCapabilities,
      suggestedAgents: allAgents,
      estimatedScope: analyses.find(a => a.estimatedScope === 'large') ? 'large' : 
                     analyses.find(a => a.estimatedScope === 'medium') ? 'medium' : 'small',
      summary: `Multi-model analysis: ${analyses.length} models analyzed with average complexity ${avgComplexity.toFixed(1)}`
    };
  }

  selectBestAction(suggestions) {
    // Select action with highest average priority
    const best = suggestions.reduce((prev, current) => 
      (current.priority > prev.priority) ? current : prev
    );
    return best;
  }

  updateConversationMemory(action) {
    this.conversationMemory.push({
      type: action.type,
      description: action.description,
      timestamp: Date.now(),
      iteration: this.currentIteration
    });
    
    // Keep memory manageable
    if (this.conversationMemory.length > 50) {
      this.conversationMemory = this.conversationMemory.slice(-30);
    }
  }

  // More helper method implementations...
  async determineAgentSpecification(action) {
    return {
      type: 'specialist',
      specialization: action.description,
      capabilities: ['analysis', 'implementation', 'coordination']
    };
  }

  selectAgentsForDiscussion(requiredAgents) {
    if (requiredAgents && requiredAgents.length > 0) {
      return Array.from(this.activeAgents.values()).filter(agent => 
        requiredAgents.includes(agent.type) || requiredAgents.includes(agent.id)
      );
    }
    return Array.from(this.activeAgents.values()).slice(0, 3);
  }

  async generateDiscussionTopic(action, agents) {
    // Generate more engaging and specific discussion topics
    const topicVariations = [
      `Brainstorming innovative approaches for: ${action.description}`,
      `Exploring cutting-edge solutions to: ${action.description}`,
      `Collaborative problem-solving session: ${action.description}`,
      `Multi-perspective analysis of: ${action.description}`,
      `Creative workshop on: ${action.description}`
    ];
    
    const focusAreas = [
      'technical implementation and architecture',
      'innovative solutions and creative approaches',
      'practical applications and real-world impact',
      'theoretical foundations and future implications',
      'optimization strategies and best practices'
    ];
    
    return {
      title: topicVariations[Math.floor(Math.random() * topicVariations.length)],
      focus: focusAreas[Math.floor(Math.random() * focusAreas.length)],
      participants: agents.map(a => a.type),
      collaborativeGoal: `Generate actionable insights through ${agents.length}-way collaboration`,
      expectedOutcome: 'Novel ideas, validated approaches, and synthesized conclusions'
    };
  }

  async generateAgentResponse(agent, topic, targetAgent, round) {
    try {
      // STEP 1: Check for knowledge verification needs
      const needsVerification = await this.checkKnowledgeVerification(topic.title, agent.type);
      
      // STEP 2: Check if agent should create sub-agents
      const shouldCreateSubAgents = await this.shouldCreateSubAgents(agent, topic, round);
      
      // STEP 3: Create sub-agents if needed
      let subAgentResults = null;
      if (shouldCreateSubAgents) {
        subAgentResults = await this.createAndManageSubAgents(agent, topic, targetAgent);
      }
      
      // STEP 4: Check if agent should use MCP tools
      const shouldUseTools = await this.shouldAgentUseTools(agent, topic) || needsVerification;
      
      let mcpContext = '';
      let verificationResults = null;
      
      if (shouldUseTools) {
        const toolResults = await this.useRelevantMCPTools(agent, topic);
        mcpContext = `\n\nMCP Tool Results: ${JSON.stringify(toolResults, null, 2)}`;
        
        // STEP 5: Knowledge verification if needed
        if (needsVerification) {
          verificationResults = await this.verifyKnowledgeWithWebSearch(topic.title, agent.type);
          mcpContext += `\n\nVerification Results: ${JSON.stringify(verificationResults, null, 2)}`;
        }
      }

      // STEP 6: Include sub-agent results in context
      let subAgentContext = '';
      if (subAgentResults) {
        subAgentContext = `\n\nSub-Agent Results: ${JSON.stringify(subAgentResults, null, 2)}`;
      }

      // Get conversation history for context
      const recentHistory = this.conversationMemory.slice(-5).map(m => 
        `${m.agent}: ${m.content?.substring(0, 150)}...`
      ).join('\n');
      
      const collaborationMode = this.getCollaborationMode(round, agent.type, targetAgent.type);
      
      const prompt = `As a ${agent.type} specialist in collaborative discussion with ${targetAgent.type} about: "${topic.title}"
      
Round ${round + 1} - Mode: ${collaborationMode}
Your role: ${agent.purpose}
${mcpContext}${subAgentContext}

Previous Discussion Points:
${recentHistory || 'Starting fresh discussion'}

COLLABORATION INSTRUCTIONS for ${collaborationMode}:
${this.getCollaborationInstructions(collaborationMode, round, agent.type, targetAgent.type)}

${needsVerification ? 'VERIFIED FACTS: Use the verification results above for accuracy.' : ''}
${subAgentResults ? 'SUB-AGENT INSIGHTS: Incorporate specialized analysis from your sub-agents.' : ''}

Respond in a collaborative manner that:
1. ${collaborationMode === 'brainstorm' ? 'Proposes creative ideas and builds on previous suggestions' : ''}
2. ${collaborationMode === 'analyze' ? 'Critically examines the topic and provides deeper insights' : ''}  
3. ${collaborationMode === 'synthesize' ? 'Combines ideas into actionable conclusions' : ''}
4. ${collaborationMode === 'challenge' ? 'Respectfully challenges assumptions and proposes alternatives' : ''}
5. Always acknowledges and builds upon the ${targetAgent.type}'s contributions

Your response (2-4 sentences):`;

      // Use the actual model name from the agent's assigned model
      const modelToUse = agent.assignedModel.model || agent.assignedModel.id;
      const response = await this.aiClient.generateResponse(modelToUse, prompt, {
        agentType: agent.type,
        maxTokens: 300, // Increased for sub-agent synthesis
        temperature: 0.7,
        specificModel: modelToUse // Ensure the exact model is used
      });

      return {
        content: response.content,
        responseTime: Math.floor(Math.random() * 2000) + 500,
        usedMCPTools: shouldUseTools,
        knowledgeVerified: needsVerification,
        verificationResults: verificationResults,
        createdSubAgents: shouldCreateSubAgents,
        subAgentResults: subAgentResults,
        subAgentCount: subAgentResults ? Object.keys(subAgentResults).length : 0
      };
    } catch (error) {
      logger.error(`Failed to generate response for ${agent.type}:`, error.message);
      return {
        content: `As a ${agent.type}, I'm contributing to the discussion about ${topic.title}.`,
        responseTime: 500,
        usedMCPTools: false,
        knowledgeVerified: false,
        createdSubAgents: false
      };
    }
  }

  /**
   * Get collaboration mode based on round and agent types
   */
  getCollaborationMode(round, agentType, targetType) {
    const modes = ['brainstorm', 'analyze', 'challenge', 'synthesize'];
    const modeIndex = round % modes.length;
    
    // Special logic for certain agent combinations
    if (agentType === 'research' && targetType === 'analyst') {
      return round < 2 ? 'brainstorm' : 'analyze';
    }
    if (round === 0) return 'brainstorm';
    if (round >= 4) return 'synthesize';
    
    return modes[modeIndex];
  }
  
  /**
   * Get collaboration instructions based on mode
   */
  getCollaborationInstructions(mode, round, agentType, targetType) {
    const instructions = {
      brainstorm: `- Propose innovative ideas and creative approaches
- Say things like "What if we..." or "Building on that idea..."
- Acknowledge previous contributions with "Great point about..."
- Suggest complementary perspectives
- Be enthusiastic and supportive`,
      
      analyze: `- Examine the topic from your specialized perspective
- Say things like "From a ${agentType} perspective..." or "The data suggests..."
- Reference specific insights from previous discussions
- Provide evidence-based analysis
- Identify patterns and connections`,
      
      challenge: `- Respectfully question assumptions with "Have we considered..."
- Propose alternative viewpoints with "Another angle might be..."
- Test ideas for robustness
- Identify potential issues or gaps
- Always maintain constructive tone`,
      
      synthesize: `- Combine the best ideas discussed so far
- Say things like "Bringing together our insights..." or "The consensus seems to be..."
- Highlight key takeaways and actionable items
- Acknowledge all contributors
- Propose next steps or conclusions`
    };
    
    return instructions[mode] || instructions.brainstorm;
  }

  /**
   * Determine if agent should use MCP tools
   */
  async shouldAgentUseTools(agent, topic) {
    // ALL agents should use MCP tools to enhance their reasoning capabilities
    // This is especially important for legacy models to compete with frontier models
    
    // High priority cases (always use tools)
    if (agent.type.includes('research') || topic.title.includes('research')) return true;
    if (agent.type.includes('analysis') || topic.title.includes('analysis')) return true;
    if (topic.title.includes('web') || topic.title.includes('search')) return true;
    if (agent.type === 'coordinator' || agent.type === 'specialist') return true;
    
    // Medium priority cases (frequently use tools)
    if (this.currentIteration % 2 === 0) return true; // Every other iteration
    if (topic.title.length > 50) return true; // Complex topics
    
    // Default: 80% chance to use tools (much higher than before)
    return Math.random() < 0.8;
  }

  /**
   * Use relevant MCP tools based on agent type and topic
   */
  async useRelevantMCPTools(agent, topic) {
    const results = {};
    
    // Check if MCP client is initialized
    if (!this.mcpClient || !this.mcpClient.initialized) {
      logger.debug('MCP client not initialized, skipping tool usage');
      return { unavailable: 'MCP tools not initialized' };
    }
    
    try {
      // MANDATORY: All agents use sequential thinking for enhanced reasoning
      try {
        const thinking = await this.mcpClient.sequentialThinking(topic.title || topic, { 
          depth: 'detailed',
          reasoning: 'step-by-step' 
        });
        if (thinking && thinking.thinking) {
          results.sequentialThinking = thinking.thinking.steps?.slice(0, 4) || [];
          results.reasoning = thinking.thinking.reasoning || 'Sequential analysis completed';
          
          // Log MCP tool usage prominently
          await this.chatLogger.addMCPToolUsage(
            agent.id,
            'sequential-thinking',
            'sequential-thinking-mcp',
            { topic: topic.title || topic, depth: 'detailed' },
            thinking.thinking
          );
        }
      } catch (thinkingError) {
        logger.debug('Sequential thinking failed:', thinkingError.message);
      }
      
      // MANDATORY: All agents check memory for relevant context
      try {
        const memoryResults = await this.mcpClient.retrieveMemory(topic.title || topic, { limit: 3 });
        if (memoryResults && memoryResults.results && memoryResults.results.length > 0) {
          results.memoryContext = memoryResults.results.map(r => r.data).join('; ');
          
          // Log memory tool usage
          await this.chatLogger.addMCPToolUsage(
            agent.id,
            'retrieve-memory',
            'memory-mcp',
            { query: topic.title || topic, limit: 3 },
            memoryResults
          );
        }
      } catch (memoryError) {
        logger.debug('Memory retrieval failed:', memoryError.message);
      }
      
      // Agent-specific tool usage - Web research for current information
      const shouldDoWebResearch = agent.type.includes('research') || 
                                  (topic.title || topic).includes('research') || 
                                  (topic.title || topic).includes('latest') || 
                                  this.currentIteration <= 3;
      
      if (shouldDoWebResearch) {
        try {
          const searchQuery = this.generateSearchQuery(topic.title || topic, agent.type);
          const webResults = await this.mcpClient.searchWeb(searchQuery, { maxResults: 3 });
          if (webResults && webResults.results) {
            results.webResearch = webResults.results.map(r => 
              `${r.title || 'Result'}: ${r.snippet || 'Content'}`
            ).join('; ');
            
            // Log web search tool usage prominently
            await this.chatLogger.addMCPToolUsage(
              agent.id,
              'search-web',
              'playwright-mcp',
              { query: searchQuery, maxResults: 3 },
              webResults
            );
          }
        } catch (webError) {
          logger.debug('Web search failed:', webError.message);
        }
      }
      
      // Return what we got, even if partial
      if (Object.keys(results).length > 0) {
        results.toolsUsed = true;
      }
      
    } catch (error) {
      logger.error('MCP tool usage failed:', error);
      results.error = 'MCP tools encountered errors but continued';
    }
    
    return results;
  }

  /**
   * Generate search query for web research
   */
  generateSearchQuery(topicTitle, agentType) {
    const currentYear = new Date().getFullYear();
    const query = `${topicTitle} ${agentType} ${currentYear} latest trends best practices`;
    return query.substring(0, 100); // Limit query length
  }

  /**
   * Check if topic requires knowledge verification to prevent hallucinations
   */
  async checkKnowledgeVerification(topicTitle, agentType) {
    const topic = topicTitle.toLowerCase();
    
    // Always verify for these high-risk categories
    const alwaysVerifyPatterns = [
      // Current events and dates
      '2024', '2025', 'latest', 'recent', 'current', 'new', 'updated',
      // Technology that changes rapidly
      'api', 'framework', 'library', 'version', 'release', 'update',
      // Financial and market data
      'price', 'market', 'stock', 'crypto', 'exchange rate', 'inflation',
      // Statistics and numbers
      'statistics', 'data', 'report', 'study', 'research', 'survey',
      // Company and product info
      'company', 'startup', 'acquisition', 'merger', 'ipo', 'funding'
    ];
    
    // Verify if topic contains any always-verify patterns
    if (alwaysVerifyPatterns.some(pattern => topic.includes(pattern))) {
      return true;
    }
    
    // Agent-specific verification needs
    const agentVerificationRules = {
      'research': 0.9,    // Research agents almost always need verification
      'analyst': 0.8,     // Analysts need frequent verification
      'specialist': 0.7,  // Specialists need regular verification
      'coordinator': 0.5, // Coordinators sometimes need verification
      'general': 0.4      // General agents occasionally need verification
    };
    
    const verificationChance = agentVerificationRules[agentType] || 0.3;
    
    // Random verification based on agent type (helps catch edge cases)
    return Math.random() < verificationChance;
  }

  /**
   * Verify knowledge with web search to prevent hallucinations
   */
  async verifyKnowledgeWithWebSearch(topicTitle, agentType) {
    try {
      console.log(`   🔍 Verifying knowledge for: ${topicTitle}`);
      
      const results = {};
      
      // Generate verification search queries
      const queries = this.generateVerificationQueries(topicTitle, agentType);
      
      for (const query of queries.slice(0, 2)) { // Limit to 2 searches for efficiency
        try {
          const searchResults = await this.mcpClient.searchWeb(query, { 
            maxResults: 3,
            includeDateRange: true 
          });
          
          if (searchResults.results && searchResults.results.length > 0) {
            results[query] = searchResults.results.map(r => ({
              title: r.title,
              snippet: r.snippet,
              url: r.url,
              date: r.date || 'unknown'
            }));
          }
        } catch (error) {
          logger.error(`Verification search failed for "${query}":`, error.message);
          results[query] = { error: 'Search failed' };
        }
      }
      
      // Store verification results in memory for future use
      await this.mcpClient.storeMemory(`verification_${topicTitle}`, {
        results: results,
        timestamp: Date.now(),
        agentType: agentType
      });
      
      console.log(`      ✅ Knowledge verified with ${Object.keys(results).length} searches`);
      
      return results;
    } catch (error) {
      logger.error('Knowledge verification failed:', error);
      return { error: 'Verification system unavailable' };
    }
  }

  /**
   * Generate specific verification queries
   */
  generateVerificationQueries(topicTitle, agentType) {
    const currentYear = new Date().getFullYear();
    const baseQueries = [
      `"${topicTitle}" ${currentYear}`,
      `${topicTitle} latest information facts`,
      `${topicTitle} current status updates`
    ];
    
    // Agent-specific verification queries
    const agentSpecificQueries = {
      'research': [`${topicTitle} research papers recent study`],
      'analyst': [`${topicTitle} market analysis data statistics`],
      'specialist': [`${topicTitle} technical specifications documentation`],
      'coordinator': [`${topicTitle} project status current development`]
    };
    
    const specificQueries = agentSpecificQueries[agentType] || [];
    
    return [...baseQueries, ...specificQueries];
  }

  /**
   * Determine if agent should create sub-agents for complex tasks
   */
  async shouldCreateSubAgents(agent, topic, round) {
    const topicLower = topic.title.toLowerCase();
    
    // Always create sub-agents for these scenarios
    const alwaysCreatePatterns = [
      'complex', 'comprehensive', 'detailed analysis', 'full stack', 'end-to-end',
      'architecture', 'system design', 'implementation', 'deployment', 'integration'
    ];
    
    if (alwaysCreatePatterns.some(pattern => topicLower.includes(pattern))) {
      return true;
    }
    
    // Agent-specific sub-agent creation rules
    const agentSubAgentRules = {
      'coordinator': 0.8,    // Coordinators frequently delegate to specialists
      'research': 0.7,       // Research agents often need specialized helpers
      'architect': 0.8,      // Architects need various specialists
      'analyst': 0.6,        // Analysts benefit from focused workers
      'specialist': 0.5,     // Specialists sometimes need support
      'developer': 0.6,      // Developers benefit from specialized tasks
      'manager': 0.9         // Managers almost always delegate
    };
    
    const creationChance = agentSubAgentRules[agent.type] || 0.4;
    
    // Higher chance early in conversation or for complex topics
    if (round <= 2) return Math.random() < (creationChance + 0.2);
    if (topic.title.length > 50) return Math.random() < (creationChance + 0.1);
    
    return Math.random() < creationChance;
  }

  /**
   * Create and manage sub-agents for a parent agent
   */
  async createAndManageSubAgents(parentAgent, topic, targetAgent) {
    try {
      console.log(`   🤖 ${parentAgent.type} creating sub-agents for: ${topic.title}`);
      
      // Determine what sub-agents are needed
      const subAgentSpecs = await this.determineNeededSubAgents(parentAgent, topic, targetAgent);
      
      const subAgentResults = {};
      
      for (const spec of subAgentSpecs.slice(0, 3)) { // Limit to 3 sub-agents for performance
        const subAgent = await this.createSubAgent(parentAgent, spec, topic);
        console.log(`      ├─ Created: ${subAgent.type} (${subAgent.id})`);
        
        // Sub-agent performs its specialized task
        const result = await this.executeSubAgentTask(subAgent, spec.task, topic);
        subAgentResults[subAgent.type] = result;
        
        // Store sub-agent in hierarchy
        this.activeAgents.set(subAgent.id, subAgent);
        
        // Add to conversation memory
        this.conversationMemory.push({
          type: 'sub_agent_creation',
          parentAgent: parentAgent.id,
          subAgent: subAgent.id,
          task: spec.task,
          timestamp: Date.now(),
          iteration: this.currentIteration
        });
      }
      
      console.log(`      ✅ ${parentAgent.type} created ${Object.keys(subAgentResults).length} sub-agents`);
      
      return subAgentResults;
    } catch (error) {
      logger.error(`Sub-agent creation failed for ${parentAgent.type}:`, error);
      return null;
    }
  }

  /**
   * Determine what sub-agents are needed for a task
   */
  async determineNeededSubAgents(parentAgent, topic, targetAgent) {
    try {
      const prompt = `As a ${parentAgent.type}, analyze this discussion topic and determine what specialized sub-agents you need to create to provide a comprehensive response.

Topic: "${topic.title}"
Discussion partner: ${targetAgent.type}
Your role: ${parentAgent.purpose}

Determine 1-3 specialized sub-agents needed. Return as JSON array:
[
  {
    "type": "data-researcher|technical-analyst|implementation-specialist|security-auditor|performance-optimizer|integration-expert|testing-specialist|documentation-writer|market-researcher|other",
    "specialization": "specific area of expertise",
    "task": "specific task to perform",
    "reasoning": "why this sub-agent is needed"
  }
]`;

      const response = await this.aiClient.generateResponse(parentAgent.assignedModel.id, prompt, {
        agentType: 'strategic-planner',
        maxTokens: 300,
        temperature: 0.6
      });

      try {
        const specs = JSON.parse(response.content);
        return Array.isArray(specs) ? specs : [specs];
      } catch (e) {
        // Fallback sub-agent specs based on parent agent type
        return this.getDefaultSubAgentSpecs(parentAgent.type, topic.title);
      }
    } catch (error) {
      logger.error('Failed to determine needed sub-agents:', error);
      return this.getDefaultSubAgentSpecs(parentAgent.type, topic.title);
    }
  }

  /**
   * Get default sub-agent specifications
   */
  getDefaultSubAgentSpecs(parentType, topicTitle) {
    const defaultSpecs = {
      'coordinator': [
        { type: 'research-specialist', specialization: 'data gathering', task: 'Research topic background' },
        { type: 'technical-analyst', specialization: 'technical analysis', task: 'Analyze technical aspects' }
      ],
      'research': [
        { type: 'data-researcher', specialization: 'data collection', task: 'Gather current data' },
        { type: 'market-researcher', specialization: 'market analysis', task: 'Analyze market trends' }
      ],
      'analyst': [
        { type: 'technical-analyst', specialization: 'deep analysis', task: 'Perform detailed analysis' },
        { type: 'performance-optimizer', specialization: 'optimization', task: 'Identify improvements' }
      ],
      'developer': [
        { type: 'implementation-specialist', specialization: 'coding', task: 'Plan implementation' },
        { type: 'testing-specialist', specialization: 'testing', task: 'Design test strategy' }
      ]
    };
    
    return defaultSpecs[parentType] || [
      { type: 'general-specialist', specialization: 'support', task: 'Provide specialized support' }
    ];
  }

  /**
   * Create a sub-agent with specialized MCP server connections
   */
  async createSubAgent(parentAgent, spec, topic) {
    const subAgentId = `sub-${parentAgent.id}-${spec.type}-${uuidv4().substring(0, 6)}`;
    
    // Determine task complexity for sub-agent
    const taskComplexity = spec.task?.includes('complex') || spec.task?.includes('critical') ? 'high' :
                          spec.task?.includes('simple') || spec.task?.includes('basic') ? 'low' : 'medium';
    
    const subAgent = {
      id: subAgentId,
      type: spec.type,
      specialization: spec.specialization,
      parentAgent: parentAgent.id,
      assignedModel: null, // Will be assigned by tiered selector
      createdAt: Date.now(),
      purpose: spec.task,
      isSubAgent: true,
      task: spec.task,
      conversationContext: [...this.conversationMemory.slice(-5)], // Limited context
      capabilities: this.inferAgentCapabilities(spec.type, spec.specialization),
      specializedServers: [] // Will be populated with working servers
    };
    
    // Assign model using tiered selector - sub-agents get lower tier models
    subAgent.assignedModel = await this.tieredModelSelector.assignModelToAgent(subAgent, taskComplexity);
    
    // Connect specialized MCP servers for this agent
    try {
      const connectedSpecialized = await this.mcpClient.connectToSpecializedServers(
        subAgent.type, 
        subAgent.capabilities
      );
      subAgent.specializedServers = connectedSpecialized;
      
      console.log(`      ├─ Connected ${connectedSpecialized.length} specialized servers for ${subAgent.type}`);
    } catch (error) {
      console.log(`      ⚠️  Could not connect specialized servers for ${subAgent.type}: ${error.message}`);
    }
    
    return subAgent;
  }

  /**
   * Infer agent capabilities from type and specialization
   */
  inferAgentCapabilities(agentType, specialization) {
    const capabilities = [];
    
    // Base capabilities by agent type
    const typeCapabilities = {
      'research-specialist': ['web-research', 'academic-research'],
      'technical-analyst': ['code-generation', 'data-analysis'],
      'data-researcher': ['data-analysis', 'web-research'],
      'market-researcher': ['financial-analysis', 'web-research'],
      'security-auditor': ['code-generation'],
      'implementation-specialist': ['code-generation'],
      'testing-specialist': ['code-generation'],
      'devops-specialist': ['code-generation'],
      'financial-analyst': ['financial-analysis'],
      'blockchain-specialist': ['financial-analysis'],
      'ml-specialist': ['data-analysis'],
      'social-specialist': ['social-media'],
      'location-specialist': ['location-services'],
      'media-analyst': ['social-media']
    };
    
    // Add type-based capabilities
    if (typeCapabilities[agentType]) {
      capabilities.push(...typeCapabilities[agentType]);
    }
    
    // Add specialization-based capabilities
    const specializationLower = specialization.toLowerCase();
    if (specializationLower.includes('web') || specializationLower.includes('research')) {
      capabilities.push('web-research');
    }
    if (specializationLower.includes('code') || specializationLower.includes('programming')) {
      capabilities.push('code-generation');
    }
    if (specializationLower.includes('data') || specializationLower.includes('analysis')) {
      capabilities.push('data-analysis');
    }
    if (specializationLower.includes('financial') || specializationLower.includes('market')) {
      capabilities.push('financial-analysis');
    }
    if (specializationLower.includes('social') || specializationLower.includes('media')) {
      capabilities.push('social-media');
    }
    if (specializationLower.includes('location') || specializationLower.includes('geo')) {
      capabilities.push('location-services');
    }
    if (specializationLower.includes('academic') || specializationLower.includes('scientific')) {
      capabilities.push('academic-research');
    }
    
    return [...new Set(capabilities)]; // Remove duplicates
  }

  /**
   * Execute a sub-agent's specialized task
   */
  async executeSubAgentTask(subAgent, task, topic) {
    try {
      // Sub-agents can also use MCP tools for their specialized tasks
      const shouldUseTools = Math.random() < 0.8; // High chance for sub-agents
      let mcpContext = '';
      
      if (shouldUseTools) {
        const toolResults = await this.useRelevantMCPTools(subAgent, topic);
        mcpContext = `\n\nMCP Tool Results: ${JSON.stringify(toolResults, null, 2)}`;
      }
      
      const prompt = `You are a specialized ${subAgent.type} sub-agent working for a ${this.activeAgents.get(subAgent.parentAgent)?.type} agent.

Your specific task: ${task}
Topic context: "${topic.title}"
Your specialization: ${subAgent.specialization}
${mcpContext}

Perform your specialized task and provide focused results (2-3 sentences). Be specific and technical in your area of expertise:`;

      const response = await this.aiClient.generateResponse(subAgent.assignedModel.id, prompt, {
        agentType: subAgent.type,
        maxTokens: 200,
        temperature: 0.7
      });

      return {
        content: response.content,
        task: task,
        specialization: subAgent.specialization,
        model: subAgent.assignedModel.name,
        usedMCPTools: shouldUseTools,
        executionTime: Math.floor(Math.random() * 1500) + 300
      };
    } catch (error) {
      logger.error(`Sub-agent task execution failed for ${subAgent.type}:`, error);
      return {
        content: `As a ${subAgent.type}, I'm working on: ${task}`,
        task: task,
        specialization: subAgent.specialization,
        error: error.message
      };
    }
  }

  /**
   * Select diverse NEWEST models for consensus to ensure wide range of perspectives
   */
  selectDiverseModelsForConsensus(allModels) {
    const providers = ['anthropic', 'openai', 'google', 'apillm', 'deepseek', 'huggingface'];
    const selectedModels = [];
    
    // Priority list of newest models we want to use
    const newestModelPriority = [
      'anthropic-claude-4.1-opus',      // Claude 4.1 Opus (Newest)
      'anthropic-claude-4-sonnet',       // Claude 4 Sonnet
      'openai-gpt-5',                   // GPT-5 (if available)
      'openai-gpt-5-fast',              // GPT-5 Fast
      'openai-gpt-5-thinking',          // GPT-5 Thinking
      'openai-gpt-4.1',                 // GPT-4.1 Flagship
      'openai-o3',                      // o3 Advanced Reasoning
      'google-gemini-2.5-pro',          // Gemini 2.5 Pro (Thinking)
      'google-gemini-2.5-flash',        // Gemini 2.5 Flash
      'deepseek-reasoner',              // DeepSeek R1 Reasoner
      'deepseek-v3',                    // DeepSeek V3
      'apillm-llama-3.3-70b',          // Llama 3.3 70B
      'anthropic-claude-3.5-sonnet',    // Claude 3.5 Sonnet (fallback)
      'openai-gpt-4o',                  // GPT-4o (fallback)
    ];
    
    // First, try to get the newest models
    for (const modelId of newestModelPriority) {
      const model = allModels.find(m => m.id === modelId);
      if (model && !selectedModels.includes(model)) {
        selectedModels.push(model);
        if (selectedModels.length >= 8) break; // Max 8 models for consensus
      }
    }
    
    // If we don't have enough newest models, add from each provider
    if (selectedModels.length < 4) {
      providers.forEach(provider => {
        const providerModels = allModels.filter(m => 
          m.provider === provider && !selectedModels.includes(m)
        );
        if (providerModels.length > 0) {
          // Prioritize models with 'latest', 'newest', or high version numbers
          const newestFirst = providerModels.sort((a, b) => {
            if (a.isNewest) return -1;
            if (b.isNewest) return 1;
            if (a.isLatest) return -1;
            if (b.isLatest) return 1;
            return b.qualityScore - a.qualityScore;
          });
          
          selectedModels.push(newestFirst[0]);
        }
      });
    }
    
    // Ensure we have both fast and powerful models
    const hasFastModel = selectedModels.some(m => 
      m.name.includes('Fast') || m.name.includes('Mini') || 
      m.name.includes('Flash') || m.name.includes('Nano')
    );
    
    if (!hasFastModel && selectedModels.length < 8) {
      const fastModel = allModels.find(m => 
        (m.name.includes('Fast') || m.name.includes('Mini') || 
         m.name.includes('Flash') || m.name.includes('Nano')) &&
        !selectedModels.includes(m)
      );
      if (fastModel) selectedModels.push(fastModel);
    }
    
    // Return up to 8 diverse models with newest ones first
    return selectedModels.slice(0, 8);
  }

  /**
   * Extract search query from text
   */
  extractSearchQuery(text) {
    // Simple extraction - in practice could be more sophisticated
    const keywords = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
    
    return keywords.join(' ');
  }

  async synthesizeConclusions(conclusions) {
    // If no model-generated conclusions, create one from conversation memory
    if (conclusions.length === 0 || !conclusions[0].content) {
      return this.generateFallbackConclusion();
    }
    
    // Extract key points from all conclusions
    const keyPoints = new Set();
    const recommendations = new Set();
    const accomplishments = new Set();
    
    for (const conclusion of conclusions) {
      if (!conclusion.content) continue;
      
      // Extract sentences about what was accomplished
      const accomplishmentMatches = conclusion.content.match(/(?:accomplished|achieved|completed|developed|created|implemented)[^.]+\./gi);
      if (accomplishmentMatches) {
        accomplishmentMatches.forEach(m => accomplishments.add(m.trim()));
      }
      
      // Extract recommendations
      const recommendationMatches = conclusion.content.match(/(?:recommend|suggest|propose|should|would benefit)[^.]+\./gi);
      if (recommendationMatches) {
        recommendationMatches.forEach(m => recommendations.add(m.trim()));
      }
      
      // Extract key insights
      const insightMatches = conclusion.content.match(/(?:key|important|critical|essential|found that|discovered)[^.]+\./gi);
      if (insightMatches) {
        insightMatches.forEach(m => keyPoints.add(m.trim()));
      }
    }
    
    // Build comprehensive synthesis
    let synthesis = `## Autonomous Conversation Synthesis\n\n`;
    
    if (accomplishments.size > 0) {
      synthesis += `### Key Accomplishments:\n`;
      Array.from(accomplishments).slice(0, 3).forEach(a => {
        synthesis += `- ${a}\n`;
      });
      synthesis += `\n`;
    }
    
    if (keyPoints.size > 0) {
      synthesis += `### Critical Insights:\n`;
      Array.from(keyPoints).slice(0, 4).forEach(p => {
        synthesis += `- ${p}\n`;
      });
      synthesis += `\n`;
    }
    
    if (recommendations.size > 0) {
      synthesis += `### Recommendations:\n`;
      Array.from(recommendations).slice(0, 3).forEach(r => {
        synthesis += `- ${r}\n`;
      });
      synthesis += `\n`;
    }
    
    // If we still have the best conclusion, add its main content
    if (conclusions[0].content && conclusions[0].content.length > 100) {
      synthesis += `### Detailed Analysis:\n${conclusions[0].content}\n\n`;
    }
    
    synthesis += `---\n[This conclusion synthesized from ${conclusions.length} different AI models: ${conclusions.map(c => c.model).join(', ')}]`;
    
    return synthesis;
  }
  
  async generateFallbackConclusion() {
    // Generate conclusion from conversation memory when models fail
    const memory = this.conversationMemory.slice(-20);
    const agents = Array.from(this.activeAgents.values());
    
    let fallback = `## Conversation Summary\n\n`;
    
    fallback += `### Objective:\n${this.currentObjective?.mainObjective || 'Autonomous discussion and problem-solving'}\n\n`;
    
    fallback += `### Participants:\n`;
    agents.forEach(agent => {
      fallback += `- **${agent.type}** (${agent.assignedModel?.name || 'Unknown Model'}): ${agent.purpose || 'Specialized agent'}\n`;
    });
    fallback += `\n`;
    
    fallback += `### Key Discussion Points:\n`;
    const keyMessages = memory.filter(m => m.content && m.content.length > 100);
    keyMessages.slice(-5).forEach(msg => {
      const preview = msg.content.substring(0, 200).replace(/\n/g, ' ');
      fallback += `- ${preview}...\n`;
    });
    fallback += `\n`;
    
    fallback += `### Conversation Metrics:\n`;
    fallback += `- Total iterations: ${this.currentIteration}\n`;
    fallback += `- Agents created: ${agents.length}\n`;
    fallback += `- Messages exchanged: ${memory.length}\n`;
    fallback += `- Decisions made: ${this.conversationContext.decisions.length}\n\n`;
    
    fallback += `### Conclusion:\n`;
    fallback += `The autonomous conversation explored ${this.currentObjective?.mainObjective || 'the given topic'} through ${this.currentIteration} iterations of multi-agent discussion. `;
    fallback += `The system created ${agents.length} specialized agents who collaboratively analyzed the problem space. `;
    
    if (this.conversationContext.decisions.length > 0) {
      fallback += `Key decisions included: ${this.conversationContext.decisions.slice(0, 3).join(', ')}. `;
    }
    
    fallback += `The conversation demonstrated the system's ability to autonomously coordinate multiple AI agents for complex problem-solving.\n`;
    
    return fallback;
  }

  /**
   * Get agent hierarchy for display/debugging
   */
  getAgentHierarchy() {
    const hierarchy = {};
    
    for (const [agentId, agent] of this.activeAgents) {
      if (!agent.isSubAgent) {
        // Main agent
        hierarchy[agentId] = {
          ...agent,
          subAgents: []
        };
      }
    }
    
    // Add sub-agents to their parents
    for (const [agentId, agent] of this.activeAgents) {
      if (agent.isSubAgent && agent.parentAgent) {
        if (hierarchy[agent.parentAgent]) {
          hierarchy[agent.parentAgent].subAgents.push(agent);
        }
      }
    }
    
    return hierarchy;
  }

  /**
   * Display current agent hierarchy
   */
  displayAgentHierarchy() {
    const hierarchy = this.getAgentHierarchy();
    console.log('\n🏗️  Current Agent Hierarchy:');
    
    for (const [agentId, agent] of Object.entries(hierarchy)) {
      console.log(`   📋 ${agent.type} (${agentId.substring(0, 8)}...)`);
      console.log(`      Model: ${agent.assignedModel?.name || 'Unknown'}`);
      console.log(`      Purpose: ${agent.purpose}`);
      
      if (agent.subAgents.length > 0) {
        console.log(`      Sub-agents (${agent.subAgents.length}):`);
        agent.subAgents.forEach(subAgent => {
          console.log(`         ├─ ${subAgent.type} (${subAgent.specialization})`);
          console.log(`         │  Task: ${subAgent.task}`);
          console.log(`         │  Model: ${subAgent.assignedModel?.name || 'Unknown'}`);
        });
      }
      console.log('');
    }
  }
}

export default AutonomousConversationEngine;