/**
 * Agent Interaction Manager
 * 
 * Manages sophisticated agent-to-agent interactions including
 * direct responses, debates, questions, and consensus building
 */

import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class AgentInteractionManager {
  constructor(aiClient, chatLogger) {
    this.aiClient = aiClient;
    this.chatLogger = chatLogger;
    
    // Interaction state
    this.conversationThreads = new Map();
    this.agentMemory = new Map();
    this.pendingQuestions = new Map();
    this.agentOpinions = new Map();
    this.consensusTracking = new Map();
    
    // Interaction modes
    this.interactionModes = {
      DISCUSSION: 'discussion',
      DEBATE: 'debate',
      BRAINSTORM: 'brainstorm',
      CONSENSUS: 'consensus',
      QA: 'question-answer',
      CHALLENGE: 'challenge'
    };
    
    // Interaction patterns
    this.interactionPatterns = [
      'sequential',  // A → B → C → A
      'star',        // All agents respond to coordinator
      'mesh',        // All agents can interact with all
      'debate',      // Two sides debate, others judge
      'socratic'     // One agent asks questions, others answer
    ];
  }

  /**
   * Facilitate multi-agent discussion with enhanced interaction
   */
  async facilitateDiscussion(agents, topic, options = {}) {
    const discussionId = uuidv4();
    const mode = options.mode || this.interactionModes.DISCUSSION;
    const pattern = options.pattern || 'mesh';
    const rounds = options.rounds || 5;
    
    logger.info(`Starting ${mode} discussion: ${topic.title}`);
    console.log(`\n🎭 Agent Interaction Mode: ${mode.toUpperCase()}`);
    console.log(`   Pattern: ${pattern}`);
    console.log(`   Participants: ${agents.map(a => a.type).join(', ')}`);
    
    // Initialize agent memory for this discussion
    this.initializeAgentMemory(agents, discussionId);
    
    // Create conversation thread
    const thread = {
      id: discussionId,
      topic: topic,
      mode: mode,
      pattern: pattern,
      exchanges: [],
      startTime: Date.now()
    };
    this.conversationThreads.set(discussionId, thread);
    
    // Execute interaction based on pattern
    const results = await this.executeInteractionPattern(
      agents, topic, pattern, mode, rounds, discussionId
    );
    
    // Build consensus if needed
    if (mode === this.interactionModes.CONSENSUS || options.seekConsensus) {
      const consensus = await this.buildConsensus(agents, topic, discussionId);
      results.consensus = consensus;
    }
    
    // Log discussion summary
    await this.logDiscussionSummary(discussionId, results);
    
    return results;
  }

  /**
   * Execute specific interaction pattern
   */
  async executeInteractionPattern(agents, topic, pattern, mode, rounds, discussionId) {
    const results = {
      exchanges: [],
      questions: [],
      answers: [],
      agreements: [],
      disagreements: [],
      insights: []
    };
    
    switch (pattern) {
      case 'mesh':
        return await this.executeMeshPattern(agents, topic, mode, rounds, discussionId);
      
      case 'debate':
        return await this.executeDebatePattern(agents, topic, rounds, discussionId);
      
      case 'socratic':
        return await this.executeSocraticPattern(agents, topic, rounds, discussionId);
      
      case 'star':
        return await this.executeStarPattern(agents, topic, mode, rounds, discussionId);
      
      default:
        return await this.executeSequentialPattern(agents, topic, mode, rounds, discussionId);
    }
  }

  /**
   * Mesh pattern - all agents can respond to each other
   */
  async executeMeshPattern(agents, topic, mode, rounds, discussionId) {
    const results = { exchanges: [], insights: [], agreements: [], disagreements: [] };
    
    for (let round = 1; round <= rounds; round++) {
      console.log(`\n   Round ${round}/${rounds}:`);
      
      // Each agent responds to the topic and previous statements
      for (const agent of agents) {
        const otherAgents = agents.filter(a => a.id !== agent.id);
        const targetAgent = otherAgents[Math.floor(Math.random() * otherAgents.length)];
        
        // Get agent's memory of the conversation
        const memory = this.getAgentMemory(agent.id, discussionId);
        
        // Generate contextual response
        const response = await this.generateContextualResponse(
          agent, targetAgent, topic, memory, mode, round
        );
        
        // Check if agent is asking a question
        if (response.hasQuestion) {
          this.pendingQuestions.set(response.questionId, {
            from: agent,
            to: targetAgent,
            question: response.question,
            round: round
          });
          console.log(`      ❓ ${agent.type} asks ${targetAgent.type}: "${response.question}"`);
        }
        
        // Check if agent is answering a pending question
        const pendingQuestion = this.findPendingQuestionFor(agent.id);
        if (pendingQuestion) {
          response.answering = pendingQuestion.question;
          console.log(`      💬 ${agent.type} answers: "${response.content.substring(0, 100)}..."`);
          this.pendingQuestions.delete(pendingQuestion.id);
        } else {
          console.log(`      💭 ${agent.type} → ${targetAgent.type}: "${response.content.substring(0, 100)}..."`);
        }
        
        // Update all agents' memory with this exchange
        this.updateAgentMemories(agents, {
          from: agent,
          to: targetAgent,
          content: response.content,
          round: round,
          hasQuestion: response.hasQuestion,
          question: response.question,
          answering: response.answering
        }, discussionId);
        
        // Track agreements and disagreements
        if (response.agrees) {
          results.agreements.push({
            agent: agent.type,
            agreesWith: targetAgent.type,
            point: response.agreementPoint
          });
        }
        if (response.disagrees) {
          results.disagreements.push({
            agent: agent.type,
            disagreesWith: targetAgent.type,
            point: response.disagreementPoint
          });
        }
        
        // Store exchange
        results.exchanges.push({
          round: round,
          from: agent.type,
          to: targetAgent.type,
          content: response.content,
          sentiment: response.sentiment,
          hasQuestion: response.hasQuestion,
          answering: response.answering
        });
        
        // Log to chat
        await this.chatLogger.addAgentInteraction(
          agent.type,
          targetAgent.type,
          response.hasQuestion ? 'QUESTION' : response.answering ? 'ANSWER' : 'RESPONSE',
          response.content
        );
      }
      
      // Analyze round for insights
      const roundInsights = await this.analyzeRoundForInsights(results.exchanges, round);
      results.insights.push(...roundInsights);
    }
    
    return results;
  }

  /**
   * Generate contextual response considering conversation history
   */
  async generateContextualResponse(agent, targetAgent, topic, memory, mode, round) {
    // Build context from memory
    const context = this.buildContextFromMemory(memory, targetAgent);
    
    // Determine response type based on mode
    const responseType = this.determineResponseType(mode, round, memory);
    
    const prompt = `You are ${agent.type} in a ${mode} discussion about "${topic.title}".

CONVERSATION MEMORY:
${context.recentExchanges}

${context.hasUnansweredQuestion ? `PENDING QUESTION TO YOU: "${context.pendingQuestion}"` : ''}

YOUR TASK:
${responseType === 'question' ? 
  `Ask ${targetAgent.type} a probing question to deepen the discussion.` :
  responseType === 'challenge' ?
  `Challenge or critically examine ${targetAgent.type}'s previous statement.` :
  responseType === 'support' ?
  `Build upon and support ${targetAgent.type}'s idea with additional insights.` :
  `Respond to ${targetAgent.type} with your perspective, directly addressing their points.`}

Previous statement from ${targetAgent.type}: "${context.lastTargetStatement}"

IMPORTANT:
- Directly reference what ${targetAgent.type} said
- ${mode === 'debate' ? 'Take a clear position and defend it' : 'Seek understanding and collaboration'}
- Be specific and technical
- Keep response to 2-3 sentences

Response:`;

    const response = await this.aiClient.generateResponse(
      agent.assignedModel?.model || agent.assignedModel?.id || 'gpt-4',
      prompt,
      {
        agentType: agent.type,
        maxTokens: 150,
        temperature: mode === 'debate' ? 0.8 : 0.7
      }
    );
    
    // Analyze response for various elements
    const analysis = this.analyzeResponse(response.content, context);
    
    return {
      content: response.content,
      hasQuestion: analysis.hasQuestion,
      question: analysis.question,
      questionId: analysis.hasQuestion ? uuidv4() : null,
      agrees: analysis.agrees,
      disagrees: analysis.disagrees,
      agreementPoint: analysis.agreementPoint,
      disagreementPoint: analysis.disagreementPoint,
      sentiment: analysis.sentiment,
      references: analysis.references
    };
  }

  /**
   * Initialize agent memory for discussion
   */
  initializeAgentMemory(agents, discussionId) {
    agents.forEach(agent => {
      const memoryKey = `${agent.id}-${discussionId}`;
      this.agentMemory.set(memoryKey, {
        exchanges: [],
        questionsAsked: [],
        questionsReceived: [],
        agreements: [],
        disagreements: [],
        keyPoints: []
      });
    });
  }

  /**
   * Get agent's memory of the discussion
   */
  getAgentMemory(agentId, discussionId) {
    const memoryKey = `${agentId}-${discussionId}`;
    return this.agentMemory.get(memoryKey) || {
      exchanges: [],
      questionsAsked: [],
      questionsReceived: [],
      agreements: [],
      disagreements: [],
      keyPoints: []
    };
  }

  /**
   * Update all agents' memories with new exchange
   */
  updateAgentMemories(agents, exchange, discussionId) {
    agents.forEach(agent => {
      const memoryKey = `${agent.id}-${discussionId}`;
      const memory = this.agentMemory.get(memoryKey);
      
      if (memory) {
        memory.exchanges.push(exchange);
        
        // Track questions
        if (exchange.hasQuestion) {
          if (exchange.from.id === agent.id) {
            memory.questionsAsked.push(exchange.question);
          } else if (exchange.to.id === agent.id) {
            memory.questionsReceived.push(exchange.question);
          }
        }
        
        // Keep memory size manageable
        if (memory.exchanges.length > 20) {
          memory.exchanges = memory.exchanges.slice(-20);
        }
      }
    });
  }

  /**
   * Build context from agent's memory
   */
  buildContextFromMemory(memory, targetAgent) {
    const recentExchanges = memory.exchanges
      .slice(-5)
      .map(e => `${e.from.type} → ${e.to.type}: ${e.content}`)
      .join('\n');
    
    const lastTargetStatement = memory.exchanges
      .filter(e => e.from.type === targetAgent.type)
      .slice(-1)[0]?.content || 'No previous statement';
    
    const pendingQuestion = memory.questionsReceived
      .filter(q => !memory.exchanges.some(e => e.answering === q))
      .slice(-1)[0];
    
    return {
      recentExchanges,
      lastTargetStatement,
      hasUnansweredQuestion: !!pendingQuestion,
      pendingQuestion,
      exchangeCount: memory.exchanges.length
    };
  }

  /**
   * Determine what type of response to generate
   */
  determineResponseType(mode, round, memory) {
    if (mode === 'debate' && round % 2 === 0) {
      return 'challenge';
    }
    if (mode === 'brainstorm' && round % 3 === 0) {
      return 'support';
    }
    if (mode === 'socratic' || (memory.exchanges.length % 4 === 0)) {
      return 'question';
    }
    return 'response';
  }

  /**
   * Analyze response content
   */
  analyzeResponse(content, context) {
    const contentLower = content.toLowerCase();
    
    return {
      hasQuestion: content.includes('?'),
      question: content.match(/([^.!]*\?)/)?.[1] || null,
      agrees: contentLower.includes('agree') || contentLower.includes('correct') || 
              contentLower.includes('good point'),
      disagrees: contentLower.includes('disagree') || contentLower.includes('however') || 
                 contentLower.includes('but'),
      agreementPoint: contentLower.includes('agree') ? 
        content.substring(content.toLowerCase().indexOf('agree'), content.toLowerCase().indexOf('agree') + 50) : null,
      disagreementPoint: contentLower.includes('disagree') ? 
        content.substring(content.toLowerCase().indexOf('disagree'), content.toLowerCase().indexOf('disagree') + 50) : null,
      sentiment: this.analyzeSentiment(content),
      references: this.extractReferences(content, context)
    };
  }

  /**
   * Analyze sentiment of response
   */
  analyzeSentiment(content) {
    const positive = ['agree', 'excellent', 'great', 'support', 'correct', 'yes'];
    const negative = ['disagree', 'wrong', 'incorrect', 'no', 'problem', 'issue'];
    
    const contentLower = content.toLowerCase();
    let score = 0;
    
    positive.forEach(word => {
      if (contentLower.includes(word)) score++;
    });
    
    negative.forEach(word => {
      if (contentLower.includes(word)) score--;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Extract references to other agents
   */
  extractReferences(content, context) {
    const references = [];
    
    // Check for direct mentions
    const agentTypes = ['coordinator', 'researcher', 'developer', 'analyst'];
    agentTypes.forEach(type => {
      if (content.toLowerCase().includes(type)) {
        references.push(type);
      }
    });
    
    return references;
  }

  /**
   * Find pending questions for an agent
   */
  findPendingQuestionFor(agentId) {
    for (const [id, question] of this.pendingQuestions) {
      if (question.to.id === agentId) {
        return { id, ...question };
      }
    }
    return null;
  }

  /**
   * Build consensus among agents
   */
  async buildConsensus(agents, topic, discussionId) {
    console.log('\n   🤝 Building consensus...');
    
    const consensusPoints = [];
    const disagreementPoints = [];
    
    // Collect all opinions
    for (const agent of agents) {
      const memory = this.getAgentMemory(agent.id, discussionId);
      const opinion = await this.extractAgentOpinion(agent, topic, memory);
      this.agentOpinions.set(agent.id, opinion);
    }
    
    // Find common ground
    const opinions = Array.from(this.agentOpinions.values());
    const commonPoints = this.findCommonPoints(opinions);
    const conflicts = this.findConflictingPoints(opinions);
    
    // Attempt to resolve conflicts through additional discussion
    if (conflicts.length > 0) {
      console.log(`   ⚠️  Found ${conflicts.length} conflicting points, attempting resolution...`);
      // Additional targeted discussion could happen here
    }
    
    return {
      achieved: commonPoints.length > conflicts.length,
      commonGround: commonPoints,
      remainingConflicts: conflicts,
      confidence: commonPoints.length / (commonPoints.length + conflicts.length)
    };
  }

  /**
   * Extract agent's opinion from their exchanges
   */
  async extractAgentOpinion(agent, topic, memory) {
    const statements = memory.exchanges
      .filter(e => e.from.id === agent.id)
      .map(e => e.content)
      .join(' ');
    
    return {
      agent: agent.type,
      position: statements.substring(0, 200),
      keyPoints: this.extractKeyPoints(statements),
      confidence: 0.7 + Math.random() * 0.3
    };
  }

  /**
   * Extract key points from text
   */
  extractKeyPoints(text) {
    // Simple extraction - could be enhanced with NLP
    const sentences = text.split(/[.!?]+/);
    return sentences
      .filter(s => s.length > 20)
      .slice(0, 3)
      .map(s => s.trim());
  }

  /**
   * Find common points among opinions
   */
  findCommonPoints(opinions) {
    const commonPoints = [];
    
    // Simple similarity check - could be enhanced
    opinions.forEach((opinion1, i) => {
      opinions.slice(i + 1).forEach(opinion2 => {
        opinion1.keyPoints.forEach(point1 => {
          opinion2.keyPoints.forEach(point2 => {
            if (this.calculateSimilarity(point1, point2) > 0.7) {
              commonPoints.push({
                point: point1,
                supporters: [opinion1.agent, opinion2.agent]
              });
            }
          });
        });
      });
    });
    
    return commonPoints;
  }

  /**
   * Find conflicting points
   */
  findConflictingPoints(opinions) {
    // Simplified conflict detection
    const conflicts = [];
    
    opinions.forEach((opinion1, i) => {
      opinions.slice(i + 1).forEach(opinion2 => {
        if (opinion1.position.includes('not') && opinion2.position.includes('should')) {
          conflicts.push({
            issue: 'Disagreement on approach',
            parties: [opinion1.agent, opinion2.agent]
          });
        }
      });
    });
    
    return conflicts;
  }

  /**
   * Calculate similarity between two texts
   */
  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Analyze round for insights
   */
  async analyzeRoundForInsights(exchanges, round) {
    const insights = [];
    
    // Look for patterns in exchanges
    const agreements = exchanges.filter(e => e.sentiment === 'positive');
    const disagreements = exchanges.filter(e => e.sentiment === 'negative');
    
    if (agreements.length > disagreements.length * 2) {
      insights.push({
        type: 'consensus-forming',
        round: round,
        description: 'Agents are converging toward agreement'
      });
    }
    
    if (exchanges.filter(e => e.hasQuestion).length > 2) {
      insights.push({
        type: 'exploratory',
        round: round,
        description: 'High questioning indicates exploratory phase'
      });
    }
    
    return insights;
  }

  /**
   * Execute debate pattern
   */
  async executeDebatePattern(agents, topic, rounds, discussionId) {
    console.log('   🎭 Debate Pattern: Two sides with moderator');
    
    // Divide agents into sides
    const sideA = agents.slice(0, Math.floor(agents.length / 2));
    const sideB = agents.slice(Math.floor(agents.length / 2));
    
    const results = { exchanges: [], arguments: { sideA: [], sideB: [] } };
    
    for (let round = 1; round <= rounds; round++) {
      // Side A argues
      for (const agent of sideA) {
        const argument = await this.generateDebateArgument(agent, topic, 'support', round);
        results.arguments.sideA.push(argument);
        results.exchanges.push(argument);
      }
      
      // Side B counters
      for (const agent of sideB) {
        const counter = await this.generateDebateArgument(agent, topic, 'oppose', round);
        results.arguments.sideB.push(counter);
        results.exchanges.push(counter);
      }
    }
    
    return results;
  }

  /**
   * Generate debate argument
   */
  async generateDebateArgument(agent, topic, stance, round) {
    const prompt = `As ${agent.type}, ${stance} this position: "${topic.title}"
Round ${round} argument (2-3 sentences, be specific and forceful):`;
    
    const response = await this.aiClient.generateResponse(
      agent.assignedModel?.model || 'gpt-4',
      prompt,
      { agentType: agent.type, temperature: 0.8 }
    );
    
    return {
      agent: agent.type,
      stance: stance,
      round: round,
      content: response.content
    };
  }

  /**
   * Execute Socratic pattern
   */
  async executeSocraticPattern(agents, topic, rounds, discussionId) {
    console.log('   🤔 Socratic Pattern: Question-driven exploration');
    
    const questioner = agents[0];
    const responders = agents.slice(1);
    const results = { exchanges: [], questions: [], answers: [] };
    
    for (let round = 1; round <= rounds; round++) {
      // Questioner asks probing question
      const question = await this.generateSocraticQuestion(questioner, topic, results.answers);
      results.questions.push(question);
      
      // Each responder answers
      for (const responder of responders) {
        const answer = await this.generateSocraticAnswer(responder, question, topic);
        results.answers.push(answer);
        results.exchanges.push({ question, answer });
      }
    }
    
    return results;
  }

  /**
   * Generate Socratic question
   */
  async generateSocraticQuestion(agent, topic, previousAnswers) {
    const context = previousAnswers.map(a => a.content).join('\n');
    const prompt = `As ${agent.type}, ask a probing Socratic question about "${topic.title}"
${context ? `Previous answers:\n${context}\n` : ''}
Ask a deeper question that challenges assumptions:`;
    
    const response = await this.aiClient.generateResponse(
      agent.assignedModel?.model || 'gpt-4',
      prompt,
      { agentType: agent.type }
    );
    
    return {
      agent: agent.type,
      content: response.content
    };
  }

  /**
   * Generate Socratic answer
   */
  async generateSocraticAnswer(agent, question, topic) {
    const prompt = `As ${agent.type}, answer this Socratic question about "${topic.title}":
"${question.content}"
Provide a thoughtful, specific answer:`;
    
    const response = await this.aiClient.generateResponse(
      agent.assignedModel?.model || 'gpt-4',
      prompt,
      { agentType: agent.type }
    );
    
    return {
      agent: agent.type,
      question: question.content,
      content: response.content
    };
  }

  /**
   * Execute star pattern
   */
  async executeStarPattern(agents, topic, mode, rounds, discussionId) {
    console.log('   ⭐ Star Pattern: All agents report to coordinator');
    
    const coordinator = agents.find(a => a.type === 'coordinator') || agents[0];
    const others = agents.filter(a => a.id !== coordinator.id);
    const results = { exchanges: [], coordinatorSummaries: [] };
    
    for (let round = 1; round <= rounds; round++) {
      const roundExchanges = [];
      
      // Each agent reports to coordinator
      for (const agent of others) {
        const report = await this.generateReportToCoordinator(agent, topic, round);
        roundExchanges.push(report);
        results.exchanges.push(report);
      }
      
      // Coordinator synthesizes and responds
      const synthesis = await this.generateCoordinatorSynthesis(coordinator, roundExchanges, topic);
      results.coordinatorSummaries.push(synthesis);
    }
    
    return results;
  }

  /**
   * Generate report to coordinator
   */
  async generateReportToCoordinator(agent, topic, round) {
    const prompt = `As ${agent.type}, report your findings about "${topic.title}" to the coordinator.
Round ${round} report (2-3 sentences):`;
    
    const response = await this.aiClient.generateResponse(
      agent.assignedModel?.model || 'gpt-4',
      prompt,
      { agentType: agent.type }
    );
    
    return {
      from: agent.type,
      to: 'coordinator',
      round: round,
      content: response.content
    };
  }

  /**
   * Generate coordinator synthesis
   */
  async generateCoordinatorSynthesis(coordinator, reports, topic) {
    const reportsText = reports.map(r => `${r.from}: ${r.content}`).join('\n');
    const prompt = `As ${coordinator.type}, synthesize these reports about "${topic.title}":
${reportsText}
Provide integrated summary:`;
    
    const response = await this.aiClient.generateResponse(
      coordinator.assignedModel?.model || 'gpt-4',
      prompt,
      { agentType: coordinator.type }
    );
    
    return {
      agent: coordinator.type,
      synthesis: response.content,
      reportCount: reports.length
    };
  }

  /**
   * Execute sequential pattern (fallback)
   */
  async executeSequentialPattern(agents, topic, mode, rounds, discussionId) {
    const results = { exchanges: [] };
    
    for (let round = 1; round <= rounds; round++) {
      for (let i = 0; i < agents.length; i++) {
        const speaker = agents[i];
        const listener = agents[(i + 1) % agents.length];
        
        const response = await this.generateContextualResponse(
          speaker, listener, topic, 
          this.getAgentMemory(speaker.id, discussionId),
          mode, round
        );
        
        results.exchanges.push({
          round: round,
          from: speaker.type,
          to: listener.type,
          content: response.content
        });
      }
    }
    
    return results;
  }

  /**
   * Log discussion summary
   */
  async logDiscussionSummary(discussionId, results) {
    const thread = this.conversationThreads.get(discussionId);
    if (!thread) return;
    
    const duration = Date.now() - thread.startTime;
    const summary = {
      topic: thread.topic.title,
      mode: thread.mode,
      pattern: thread.pattern,
      duration: duration,
      exchangeCount: results.exchanges.length,
      insightCount: results.insights?.length || 0,
      consensusAchieved: results.consensus?.achieved || false,
      agreements: results.agreements?.length || 0,
      disagreements: results.disagreements?.length || 0
    };
    
    await this.chatLogger.addSystemMessage(
      `Discussion Summary: ${JSON.stringify(summary, null, 2)}`,
      'DISCUSSION_COMPLETE'
    );
    
    logger.info('Discussion completed:', summary);
  }

  /**
   * Facilitate a debate between agents
   */
  async facilitateDebate(agents, proposition, options = {}) {
    const rounds = options.rounds || 3;
    const discussionId = uuidv4();
    
    logger.info(`Starting debate on: ${proposition}`);
    
    // Assign positions
    const proponent = agents[0];
    const opponent = agents[1];
    
    proponent.position = 'FOR';
    opponent.position = 'AGAINST';
    
    const results = {
      proposition: proposition,
      arguments: [],
      rebuttals: [],
      winner: null
    };
    
    // Initialize memory
    this.initializeAgentMemory([proponent, opponent], discussionId);
    
    for (let round = 1; round <= rounds; round++) {
      // Proponent argues
      const proArgument = await this.generateContextualResponse(
        proponent, opponent, 
        `Argue FOR: ${proposition}`,
        this.getAgentMemory(proponent.id, discussionId),
        'debate', round
      );
      
      results.arguments.push({
        round: round,
        position: 'FOR',
        agent: proponent.type,
        content: proArgument.content
      });
      
      // Opponent rebuts and counter-argues
      const oppArgument = await this.generateContextualResponse(
        opponent, proponent,
        `Argue AGAINST: ${proposition}\nRebut: ${proArgument.content}`,
        this.getAgentMemory(opponent.id, discussionId),
        'debate', round
      );
      
      results.arguments.push({
        round: round,
        position: 'AGAINST',
        agent: opponent.type,
        content: oppArgument.content
      });
      
      // Update memories
      this.updateAgentMemories(
        [proponent, opponent],
        { from: proponent, to: opponent, content: proArgument.content },
        discussionId
      );
      
      this.updateAgentMemories(
        [proponent, opponent],
        { from: opponent, to: proponent, content: oppArgument.content },
        discussionId
      );
    }
    
    // Determine winner based on argument strength
    // (In a real implementation, this could use a separate judge agent)
    results.winner = Math.random() > 0.5 ? proponent.type : opponent.type;
    
    return results;
  }

  /**
   * Facilitate Socratic dialogue
   */
  async facilitateSocraticDialogue(teacher, students, topic, options = {}) {
    const depth = options.depth || 3;
    const discussionId = uuidv4();
    
    logger.info(`Starting Socratic dialogue on: ${topic}`);
    
    const results = {
      topic: topic,
      questions: [],
      answers: [],
      insights: []
    };
    
    // Initialize memory for all participants
    const allAgents = [teacher, ...students];
    this.initializeAgentMemory(allAgents, discussionId);
    
    for (let level = 1; level <= depth; level++) {
      // Teacher asks probing question
      const questionPrompt = level === 1 
        ? `As a teacher, ask a thought-provoking question about: ${topic}`
        : `Based on the previous answers, ask a deeper question about: ${topic}`;
      
      const question = await this.generateContextualResponse(
        teacher, students[0],
        questionPrompt,
        this.getAgentMemory(teacher.id, discussionId),
        'socratic', level
      );
      
      results.questions.push({
        level: level,
        teacher: teacher.type,
        question: question.content
      });
      
      // Each student responds
      for (const student of students) {
        const answer = await this.generateContextualResponse(
          student, teacher,
          `Answer this question thoughtfully: ${question.content}`,
          this.getAgentMemory(student.id, discussionId),
          'socratic', level
        );
        
        results.answers.push({
          level: level,
          student: student.type,
          answer: answer.content
        });
        
        // Extract insights if present
        if (answer.content.toLowerCase().includes('realize') || 
            answer.content.toLowerCase().includes('understand') ||
            answer.content.toLowerCase().includes('insight')) {
          results.insights.push({
            from: student.type,
            insight: answer.content
          });
        }
        
        // Update memories
        this.updateAgentMemories(
          allAgents,
          { from: teacher, to: student, content: question.content, hasQuestion: true },
          discussionId
        );
        
        this.updateAgentMemories(
          allAgents,
          { from: student, to: teacher, content: answer.content },
          discussionId
        );
      }
    }
    
    return results;
  }
}

export default AgentInteractionManager;