/**
 * Direct Response System
 * 
 * Ensures agents directly respond to each other's statements,
 * questions, and challenges rather than just taking turns
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

export class DirectResponseSystem {
  constructor(aiClient, memory) {
    this.aiClient = aiClient;
    this.memory = memory;
    
    // Response tracking
    this.pendingResponses = new Map();
    this.responseChains = new Map();
    this.directMentions = new Map();
    
    // Response types
    this.responseTypes = {
      ANSWER: 'answer',
      AGREEMENT: 'agreement',
      DISAGREEMENT: 'disagreement',
      CLARIFICATION: 'clarification',
      CHALLENGE: 'challenge',
      ELABORATION: 'elaboration',
      COUNTER_ARGUMENT: 'counter_argument',
      SUPPORT: 'support',
      QUESTION: 'question',
      SYNTHESIS: 'synthesis'
    };
    
    // Response triggers
    this.triggers = {
      questions: ['?', 'what', 'why', 'how', 'when', 'where', 'who', 'which'],
      disagreement: ['disagree', 'however', 'but', 'actually', 'incorrect', 'wrong'],
      agreement: ['agree', 'correct', 'exactly', 'right', 'indeed', 'absolutely'],
      clarification: ['mean', 'explain', 'clarify', 'elaborate', 'specifically'],
      challenge: ['prove', 'evidence', 'sure', 'certain', 'doubt', 'question']
    };
  }

  /**
   * Analyze a statement to determine if it requires direct responses
   */
  analyzeStatement(statement, fromAgent, toAgents) {
    const analysis = {
      requiresResponse: false,
      responseType: null,
      targetAgents: [],
      urgency: 'normal',
      specificQuestions: [],
      mentions: [],
      topics: [],
      sentiment: null
    };

    // Check for questions
    const questions = this.extractQuestions(statement.content);
    if (questions.length > 0) {
      analysis.requiresResponse = true;
      analysis.responseType = this.responseTypes.ANSWER;
      analysis.specificQuestions = questions;
      analysis.urgency = 'high';
      analysis.targetAgents = statement.to ? [statement.to] : toAgents;
    }

    // Check for direct mentions
    const mentions = this.extractMentions(statement.content, toAgents);
    if (mentions.length > 0) {
      analysis.requiresResponse = true;
      analysis.mentions = mentions;
      analysis.targetAgents = [...new Set([...analysis.targetAgents, ...mentions])];
    }

    // Check for challenges or disagreements
    if (this.containsTriggers(statement.content, this.triggers.challenge)) {
      analysis.requiresResponse = true;
      analysis.responseType = this.responseTypes.CHALLENGE;
      analysis.urgency = 'high';
    }

    // Check for requests for clarification
    if (this.containsTriggers(statement.content, this.triggers.clarification)) {
      analysis.requiresResponse = true;
      analysis.responseType = this.responseTypes.CLARIFICATION;
    }

    // Extract topics for context
    analysis.topics = this.extractTopics(statement.content);
    
    // Analyze sentiment
    analysis.sentiment = this.analyzeSentiment(statement.content);

    return analysis;
  }

  /**
   * Generate a direct response to a specific statement
   */
  async generateDirectResponse(respondingAgent, originalStatement, analysis, context) {
    // Build response context from memory
    const memoryContext = await this.memory.buildConversationContext(
      respondingAgent.id,
      originalStatement.from.id,
      analysis.topics.join(' ')
    );

    // Construct response prompt based on response type
    const prompt = this.buildResponsePrompt(
      respondingAgent,
      originalStatement,
      analysis,
      memoryContext,
      context
    );

    // Generate response using AI
    const response = await this.aiClient.generateResponse(
      respondingAgent.modelPreference || 'gpt-4',
      prompt,
      {
        agentType: respondingAgent.type,
        maxTokens: 200,
        temperature: this.getTemperatureForResponseType(analysis.responseType)
      }
    );

    // Process and structure the response
    const structuredResponse = {
      id: uuidv4(),
      from: respondingAgent,
      to: originalStatement.from,
      content: response.content,
      type: analysis.responseType || this.responseTypes.ELABORATION,
      inResponseTo: originalStatement.id,
      timestamp: Date.now(),
      metadata: {
        model: response.model,
        responseAnalysis: analysis,
        confidence: this.calculateConfidence(response.content, analysis)
      }
    };

    // Track response chain
    this.updateResponseChain(originalStatement.id, structuredResponse);

    // Store in memory
    await this.memory.storeExchange(respondingAgent.id, structuredResponse);

    return structuredResponse;
  }

  /**
   * Build appropriate prompt for response type
   */
  buildResponsePrompt(agent, originalStatement, analysis, memoryContext, globalContext) {
    const basePrompt = `You are ${agent.name}, a ${agent.type} agent with expertise in ${agent.expertise?.join(', ') || 'general topics'}.

Previous Context:
${memoryContext.recentHistory}

${originalStatement.from.name} just said: "${originalStatement.content}"

`;

    let specificPrompt = '';

    switch (analysis.responseType) {
      case this.responseTypes.ANSWER:
        specificPrompt = `They asked: ${analysis.specificQuestions.join('; ')}
        
Based on your expertise and the context, provide a direct, helpful answer. Reference specific facts if relevant.
Your answer:`;
        break;

      case this.responseTypes.DISAGREEMENT:
        specificPrompt = `You disagree with their statement. Explain why, providing evidence or reasoning.
Be respectful but clear about your disagreement.
Your response:`;
        break;

      case this.responseTypes.AGREEMENT:
        specificPrompt = `You agree with their point. Build upon it with additional insights or examples.
Don't just say "I agree" - add value to the discussion.
Your response:`;
        break;

      case this.responseTypes.CLARIFICATION:
        specificPrompt = `They need clarification. Provide a clear, detailed explanation.
Use examples if helpful. Address any confusion directly.
Your clarification:`;
        break;

      case this.responseTypes.CHALLENGE:
        specificPrompt = `They are challenging a previous statement. 
Defend your position with evidence, or acknowledge if they have a valid point.
Your response:`;
        break;

      case this.responseTypes.COUNTER_ARGUMENT:
        specificPrompt = `Present a counter-argument to their position.
Be logical and evidence-based. Acknowledge their points before countering.
Your counter-argument:`;
        break;

      case this.responseTypes.SYNTHESIS:
        specificPrompt = `Synthesize the different viewpoints presented.
Find common ground and propose a unified understanding.
Your synthesis:`;
        break;

      default:
        specificPrompt = `Respond directly to their statement.
Be specific and reference what they said. Add your perspective.
Your response:`;
    }

    // Add memory-based context
    if (memoryContext.pendingQuestions) {
      specificPrompt += `\n\nNote: There are unanswered questions from earlier: ${memoryContext.pendingQuestions}`;
    }

    if (memoryContext.targetAgentProfile?.trust) {
      specificPrompt += `\n\nYour relationship: Trust level ${memoryContext.targetAgentProfile.trust}, ${memoryContext.targetAgentProfile.interactions} previous interactions`;
    }

    return basePrompt + specificPrompt;
  }

  /**
   * Manage response ordering and priority
   */
  async prioritizeResponses(pendingResponses) {
    // Sort by urgency and relevance
    return pendingResponses.sort((a, b) => {
      // Questions get highest priority
      if (a.analysis.responseType === this.responseTypes.ANSWER) return -1;
      if (b.analysis.responseType === this.responseTypes.ANSWER) return 1;
      
      // Challenges next
      if (a.analysis.responseType === this.responseTypes.CHALLENGE) return -1;
      if (b.analysis.responseType === this.responseTypes.CHALLENGE) return 1;
      
      // Direct mentions
      if (a.analysis.mentions.length > b.analysis.mentions.length) return -1;
      
      // Timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Extract questions from content
   */
  extractQuestions(content) {
    const questions = [];
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.includes('?') || 
          this.triggers.questions.some(trigger => 
            trimmed.toLowerCase().startsWith(trigger))) {
        questions.push(trimmed);
      }
    }
    
    return questions;
  }

  /**
   * Extract agent mentions
   */
  extractMentions(content, agents) {
    const mentions = [];
    
    for (const agent of agents) {
      // Check for agent name mentions
      if (content.toLowerCase().includes(agent.name?.toLowerCase()) ||
          content.includes(`@${agent.id}`) ||
          content.toLowerCase().includes(agent.type?.toLowerCase())) {
        mentions.push(agent);
      }
    }
    
    return mentions;
  }

  /**
   * Extract main topics from content
   */
  extractTopics(content) {
    // Simple topic extraction - could be enhanced with NLP
    const topics = [];
    const nounPhrases = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
    topics.push(...nounPhrases);
    
    // Add technical terms
    const technicalTerms = content.match(/\b\w+(?:tion|ment|ity|ness|ance|ence)\b/g) || [];
    topics.push(...technicalTerms);
    
    return [...new Set(topics)].slice(0, 5);
  }

  /**
   * Check if content contains trigger words
   */
  containsTriggers(content, triggers) {
    const contentLower = content.toLowerCase();
    return triggers.some(trigger => contentLower.includes(trigger));
  }

  /**
   * Analyze sentiment of content
   */
  analyzeSentiment(content) {
    const contentLower = content.toLowerCase();
    
    if (this.containsTriggers(content, this.triggers.agreement)) {
      return 'positive';
    } else if (this.containsTriggers(content, this.triggers.disagreement)) {
      return 'negative';
    } else if (this.containsTriggers(content, this.triggers.questions)) {
      return 'inquisitive';
    }
    
    return 'neutral';
  }

  /**
   * Get appropriate temperature for response type
   */
  getTemperatureForResponseType(responseType) {
    const temperatures = {
      [this.responseTypes.ANSWER]: 0.3,        // Factual, low creativity
      [this.responseTypes.AGREEMENT]: 0.5,     // Moderate
      [this.responseTypes.DISAGREEMENT]: 0.6,  // Slightly higher for nuance
      [this.responseTypes.CLARIFICATION]: 0.3, // Clear and precise
      [this.responseTypes.CHALLENGE]: 0.7,     // More creative argumentation
      [this.responseTypes.ELABORATION]: 0.6,   // Creative expansion
      [this.responseTypes.COUNTER_ARGUMENT]: 0.7, // Creative reasoning
      [this.responseTypes.SYNTHESIS]: 0.5      // Balanced
    };
    
    return temperatures[responseType] || 0.5;
  }

  /**
   * Calculate confidence in response
   */
  calculateConfidence(responseContent, analysis) {
    let confidence = 0.5;
    
    // Higher confidence for direct answers
    if (analysis.responseType === this.responseTypes.ANSWER && 
        responseContent.length > 50) {
      confidence += 0.2;
    }
    
    // Higher confidence if response addresses specific questions
    if (analysis.specificQuestions.length > 0) {
      const addressed = analysis.specificQuestions.filter(q => 
        responseContent.toLowerCase().includes(q.toLowerCase().slice(0, 20))
      );
      confidence += (addressed.length / analysis.specificQuestions.length) * 0.2;
    }
    
    // Lower confidence for uncertain language
    const uncertainPhrases = ['might', 'maybe', 'possibly', 'could be', 'not sure'];
    if (uncertainPhrases.some(phrase => responseContent.toLowerCase().includes(phrase))) {
      confidence -= 0.1;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Update response chain tracking
   */
  updateResponseChain(originalId, response) {
    if (!this.responseChains.has(originalId)) {
      this.responseChains.set(originalId, []);
    }
    
    this.responseChains.get(originalId).push({
      responseId: response.id,
      responderId: response.from.id,
      timestamp: response.timestamp,
      type: response.type
    });
  }

  /**
   * Get response chain for a statement
   */
  getResponseChain(statementId) {
    return this.responseChains.get(statementId) || [];
  }

  /**
   * Check if a statement has been adequately responded to
   */
  isAdequatelyResponded(statementId, analysis) {
    const chain = this.getResponseChain(statementId);
    
    // Questions need at least one answer
    if (analysis.responseType === this.responseTypes.ANSWER) {
      return chain.some(r => r.type === this.responseTypes.ANSWER);
    }
    
    // Challenges need a defense or acknowledgment
    if (analysis.responseType === this.responseTypes.CHALLENGE) {
      return chain.some(r => 
        r.type === this.responseTypes.COUNTER_ARGUMENT ||
        r.type === this.responseTypes.AGREEMENT
      );
    }
    
    // General statements benefit from any response
    return chain.length > 0;
  }

  /**
   * Generate follow-up prompts for continuing conversation
   */
  generateFollowUpPrompts(conversation) {
    const prompts = [];
    
    // Look for unresolved disagreements
    const disagreements = conversation.filter(s => 
      s.type === this.responseTypes.DISAGREEMENT
    );
    if (disagreements.length > 0) {
      prompts.push("Let's explore this disagreement further. What evidence supports each position?");
    }
    
    // Look for partial answers
    const partialAnswers = conversation.filter(s => 
      s.metadata?.confidence < 0.6 && s.type === this.responseTypes.ANSWER
    );
    if (partialAnswers.length > 0) {
      prompts.push("Can anyone provide more details or clarification on this topic?");
    }
    
    // Encourage synthesis after debate
    const hasDebate = conversation.some(s => 
      s.type === this.responseTypes.DISAGREEMENT || 
      s.type === this.responseTypes.COUNTER_ARGUMENT
    );
    if (hasDebate && conversation.length > 10) {
      prompts.push("Can we synthesize these different viewpoints into a unified understanding?");
    }
    
    return prompts;
  }
}

export default DirectResponseSystem;