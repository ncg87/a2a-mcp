/**
 * Discussion Manager
 * 
 * Manages multi-round agent discussions within conversation iterations
 * Enables deeper, more natural conversations with multiple exchanges per topic
 */

import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class DiscussionManager {
  constructor(aiClient, chatLogger) {
    this.aiClient = aiClient;
    this.chatLogger = chatLogger;
    
    // Discussion tracking
    this.discussionThreads = new Map();
    this.topicDepth = new Map();
    this.agentResponses = [];
    this.currentThread = null;
    
    // Configuration
    this.config = {
      minExchangesPerTopic: 3,
      maxExchangesPerTopic: 15,
      topicCoherenceThreshold: 0.8,
      allowParallelDiscussions: true,
      displayAllResponses: true,
      progressiveDepth: true
    };
    
    // Metrics
    this.metrics = {
      totalExchanges: 0,
      averageDepth: 0,
      topicCoherence: 1.0,
      meaningfulProgress: true
    };
  }

  /**
   * Facilitate deep discussion between agents on a topic
   */
  async facilitateDeepDiscussion(agents, topic, options = {}) {
    const discussionId = uuidv4();
    const config = { ...this.config, ...options };
    
    console.log(`\n🗣️  Starting deep discussion: "${topic.title}"`);
    console.log(`   Participants: ${agents.map(a => a.type).join(', ')}`);
    console.log(`   Target exchanges: ${config.minExchangesPerTopic}-${config.maxExchangesPerTopic}\n`);
    
    // Initialize discussion thread
    const thread = {
      id: discussionId,
      topic: topic,
      participants: agents,
      exchanges: [],
      depth: 0,
      coherenceScore: 1.0,
      startTime: Date.now(),
      status: 'active'
    };
    
    this.discussionThreads.set(discussionId, thread);
    this.currentThread = thread;
    
    // Log discussion start
    await this.chatLogger.addSystemMessage(
      `Deep discussion started: ${topic.title} with ${agents.length} agents`,
      'DEEP_DISCUSSION_START'
    );
    
    // Main discussion loop
    let exchangeCount = 0;
    let shouldContinue = true;
    
    while (shouldContinue && exchangeCount < config.maxExchangesPerTopic) {
      exchangeCount++;
      
      // Select speaking order for this exchange
      const speakingOrder = this.determineSpeakingOrder(agents, thread, exchangeCount);
      
      console.log(`   📍 Exchange ${exchangeCount}:`);
      
      // Each agent gets to speak in this exchange
      for (const speaker of speakingOrder) {
        // Select target agent(s) for response
        const targets = this.selectTargetAgents(speaker, agents, thread);
        
        // Generate response with context from entire thread
        const response = await this.generateContextualResponse(
          speaker, 
          targets, 
          thread, 
          exchangeCount
        );
        
        // Display response in real-time
        if (config.displayAllResponses) {
          await this.displayAgentResponse(speaker, response, exchangeCount);
        }
        
        // Add to thread
        thread.exchanges.push({
          exchangeNumber: exchangeCount,
          speaker: speaker,
          targets: targets,
          response: response,
          timestamp: Date.now()
        });
        
        // Log to chat
        await this.chatLogger.addAgentResponse(
          speaker.id,
          speaker.type,
          response.content,
          {
            discussionId: discussionId,
            exchangeNumber: exchangeCount,
            depth: thread.depth,
            coherenceScore: thread.coherenceScore,
            responseType: response.type,
            hasFollowUp: response.hasFollowUp
          }
        );
        
        // Check for follow-up questions
        if (response.hasFollowUp && targets.length > 0) {
          const followUp = await this.handleFollowUpExchange(
            targets[0], 
            speaker, 
            response.followUpQuestion,
            thread,
            exchangeCount
          );
          
          if (followUp) {
            thread.exchanges.push(followUp);
          }
        }
      }
      
      // Update discussion metrics
      thread.depth = this.calculateDiscussionDepth(thread);
      thread.coherenceScore = await this.calculateTopicCoherence(thread);
      
      // Determine if discussion should continue
      shouldContinue = await this.shouldContinueDiscussion(
        thread, 
        exchangeCount, 
        config
      );
      
      if (!shouldContinue) {
        console.log(`   ✓ Natural conclusion reached after ${exchangeCount} exchanges\n`);
      }
    }
    
    // Conclude discussion
    await this.concludeDiscussion(thread);
    
    // Update metrics
    this.updateMetrics(thread);
    
    return thread;
  }

  /**
   * Generate contextual response based on entire discussion thread
   */
  async generateContextualResponse(speaker, targets, thread, exchangeNumber) {
    try {
      // Build context from thread history
      const context = this.buildDiscussionContext(thread, speaker);
      
      // Determine response type based on discussion phase
      const responseType = this.determineResponseType(exchangeNumber, thread.depth);
      
      // Create prompt with full context
      const prompt = this.buildContextualPrompt(
        speaker, 
        targets, 
        thread.topic, 
        context, 
        responseType,
        exchangeNumber
      );
      
      // Generate AI response
      const response = await this.aiClient.generateResponse(
        speaker.assignedModel?.id || 'gpt-4',
        prompt,
        {
          agentType: speaker.type,
          maxTokens: 250,
          temperature: 0.7
        }
      );
      
      // Parse response for structure
      const structured = this.parseStructuredResponse(response.content);
      
      return {
        content: structured.mainContent || response.content,
        type: responseType,
        hasFollowUp: structured.hasFollowUp || false,
        followUpQuestion: structured.followUpQuestion,
        keyPoints: structured.keyPoints || [],
        agreements: structured.agreements || [],
        disagreements: structured.disagreements || [],
        newInsights: structured.newInsights || []
      };
      
    } catch (error) {
      logger.error(`Failed to generate contextual response for ${speaker.type}:`, error);
      return {
        content: `${speaker.type} continues the discussion on ${thread.topic.title}`,
        type: 'continuation',
        hasFollowUp: false
      };
    }
  }

  /**
   * Build contextual prompt for agent response
   */
  buildContextualPrompt(speaker, targets, topic, context, responseType, exchangeNumber) {
    const targetNames = targets.map(t => t.type).join(', ');
    
    return `You are ${speaker.type} in exchange ${exchangeNumber} of a deep technical discussion about: "${topic.title}"

DISCUSSION CONTEXT:
${context.recentExchanges}

Key Points Established:
${context.keyPoints.join('\n')}

Open Questions:
${context.openQuestions.join('\n')}

YOUR RESPONSE TYPE: ${responseType}

${this.getResponseTypeInstructions(responseType)}

You are responding to: ${targetNames}

IMPORTANT INSTRUCTIONS:
1. Stay strictly on topic - coherence is critical
2. Build upon previous points, don't repeat
3. Add new insights or perspectives
4. If you disagree, explain why constructively
5. Ask follow-up questions when appropriate
6. Be specific and technical in your domain

Provide your response in this JSON format:
{
  "mainContent": "Your main response (2-3 sentences)",
  "keyPoints": ["point1", "point2"],
  "agreements": ["what you agree with"],
  "disagreements": ["what you disagree with and why"],
  "newInsights": ["new perspective or information"],
  "hasFollowUp": true/false,
  "followUpQuestion": "Your follow-up question if any"
}`;
  }

  /**
   * Get instructions for specific response types
   */
  getResponseTypeInstructions(responseType) {
    const instructions = {
      'opening': 'Introduce your perspective on the topic and identify key challenges',
      'elaboration': 'Provide deeper technical details and expand on previous points',
      'clarification': 'Ask for or provide clarification on specific technical aspects',
      'challenge': 'Constructively challenge assumptions or propose alternatives',
      'synthesis': 'Combine different viewpoints into a coherent understanding',
      'conclusion': 'Summarize key agreements and remaining open questions'
    };
    
    return instructions[responseType] || 'Continue the discussion naturally';
  }

  /**
   * Parse structured response from AI
   */
  parseStructuredResponse(content) {
    try {
      // Try to parse as JSON first
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback to text parsing
    }
    
    // Fallback: extract structure from text
    return {
      mainContent: content,
      hasFollowUp: content.includes('?'),
      followUpQuestion: this.extractQuestion(content),
      keyPoints: this.extractKeyPoints(content),
      agreements: [],
      disagreements: [],
      newInsights: []
    };
  }

  /**
   * Handle follow-up exchange between agents
   */
  async handleFollowUpExchange(responder, questioner, question, thread, exchangeNumber) {
    console.log(`      ↩️  Follow-up: ${responder.type} responding to ${questioner.type}'s question`);
    
    const prompt = `As ${responder.type}, answer this follow-up question from ${questioner.type}:
"${question}"

Context: ${thread.topic.title}
Be concise and specific (1-2 sentences):`;
    
    try {
      const response = await this.aiClient.generateResponse(
        responder.assignedModel?.id || 'gpt-4',
        prompt,
        {
          agentType: responder.type,
          maxTokens: 150,
          temperature: 0.6
        }
      );
      
      return {
        exchangeNumber: exchangeNumber,
        speaker: responder,
        targets: [questioner],
        response: {
          content: response.content,
          type: 'follow-up',
          isFollowUpResponse: true
        },
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Follow-up exchange failed:', error);
      return null;
    }
  }

  /**
   * Determine if discussion should continue
   */
  async shouldContinueDiscussion(thread, exchangeCount, config) {
    // Check minimum exchanges
    if (exchangeCount < config.minExchangesPerTopic) {
      return true;
    }
    
    // Check maximum exchanges
    if (exchangeCount >= config.maxExchangesPerTopic) {
      return false;
    }
    
    // Check coherence threshold
    if (thread.coherenceScore < config.topicCoherenceThreshold) {
      console.log(`   ⚠️  Coherence dropped to ${thread.coherenceScore.toFixed(2)}, refocusing...`);
      return true; // Continue to get back on track
    }
    
    // Check if meaningful progress is being made
    const progress = await this.assessProgress(thread);
    if (!progress.meaningful) {
      console.log(`   ℹ️  Discussion reaching natural conclusion`);
      return false;
    }
    
    // Check if all key points have been addressed
    if (progress.allPointsAddressed && exchangeCount >= config.minExchangesPerTopic) {
      return false;
    }
    
    return true;
  }

  /**
   * Calculate discussion depth
   */
  calculateDiscussionDepth(thread) {
    const factors = {
      exchangeCount: thread.exchanges.length,
      uniqueInsights: new Set(thread.exchanges.flatMap(e => e.response.newInsights || [])).size,
      followUpQuestions: thread.exchanges.filter(e => e.response.hasFollowUp).length,
      disagreements: thread.exchanges.filter(e => (e.response.disagreements || []).length > 0).length
    };
    
    // Weighted depth calculation
    const depth = (
      factors.exchangeCount * 0.2 +
      factors.uniqueInsights * 0.3 +
      factors.followUpQuestions * 0.3 +
      factors.disagreements * 0.2
    ) / 10;
    
    return Math.min(depth, 10); // Cap at 10
  }

  /**
   * Calculate topic coherence score
   */
  async calculateTopicCoherence(thread) {
    if (thread.exchanges.length === 0) return 1.0;
    
    try {
      // Simple coherence based on keyword overlap
      const topicKeywords = this.extractKeywords(thread.topic.title);
      const responseKeywords = thread.exchanges.map(e => 
        this.extractKeywords(e.response.content)
      );
      
      let totalCoherence = 0;
      for (const keywords of responseKeywords) {
        const overlap = this.calculateKeywordOverlap(topicKeywords, keywords);
        totalCoherence += overlap;
      }
      
      return totalCoherence / responseKeywords.length;
      
    } catch (error) {
      logger.error('Coherence calculation failed:', error);
      return 0.8; // Default to acceptable coherence
    }
  }

  /**
   * Assess if meaningful progress is being made
   */
  async assessProgress(thread) {
    const recentExchanges = thread.exchanges.slice(-5);
    
    // Check for new insights
    const recentInsights = recentExchanges.flatMap(e => e.response.newInsights || []);
    const hasNewInsights = recentInsights.length > 0;
    
    // Check for repetition
    const recentContents = recentExchanges.map(e => e.response.content);
    const hasRepetition = this.detectRepetition(recentContents);
    
    // Check if questions are being answered
    const questions = recentExchanges.filter(e => e.response.hasFollowUp).length;
    const answers = recentExchanges.filter(e => e.response.type === 'follow-up').length;
    const questionsBeingAnswered = answers >= questions * 0.5;
    
    return {
      meaningful: hasNewInsights && !hasRepetition && questionsBeingAnswered,
      allPointsAddressed: false, // Would need more sophisticated checking
      insights: recentInsights,
      repetitionDetected: hasRepetition
    };
  }

  /**
   * Conclude discussion and generate summary
   */
  async concludeDiscussion(thread) {
    thread.status = 'concluded';
    thread.endTime = Date.now();
    thread.duration = thread.endTime - thread.startTime;
    
    // Generate discussion summary
    const summary = this.generateDiscussionSummary(thread);
    
    await this.chatLogger.addSystemMessage(
      `Deep discussion concluded: ${thread.exchanges.length} exchanges, depth: ${thread.depth.toFixed(1)}, coherence: ${thread.coherenceScore.toFixed(2)}`,
      'DEEP_DISCUSSION_END'
    );
    
    // Store summary for future reference
    thread.summary = summary;
    
    return summary;
  }

  /**
   * Generate discussion summary
   */
  generateDiscussionSummary(thread) {
    const allKeyPoints = thread.exchanges.flatMap(e => e.response.keyPoints || []);
    const allInsights = thread.exchanges.flatMap(e => e.response.newInsights || []);
    const allAgreements = thread.exchanges.flatMap(e => e.response.agreements || []);
    const allDisagreements = thread.exchanges.flatMap(e => e.response.disagreements || []);
    
    return {
      topic: thread.topic.title,
      participants: thread.participants.map(p => p.type),
      exchangeCount: thread.exchanges.length,
      depth: thread.depth,
      coherence: thread.coherenceScore,
      duration: thread.duration,
      keyPoints: [...new Set(allKeyPoints)],
      newInsights: [...new Set(allInsights)],
      agreements: [...new Set(allAgreements)],
      disagreements: [...new Set(allDisagreements)],
      consensus: allAgreements.length > allDisagreements.length
    };
  }

  /**
   * Display agent response in real-time
   */
  async displayAgentResponse(speaker, response, exchangeNumber) {
    console.log(`      🤖 ${speaker.type}:`);
    console.log(`         "${response.content}"`);
    
    if (response.hasFollowUp) {
      console.log(`         ❓ Follow-up: "${response.followUpQuestion}"`);
    }
    
    if (response.newInsights && response.newInsights.length > 0) {
      console.log(`         💡 New insights: ${response.newInsights.join(', ')}`);
    }
  }

  /**
   * Build discussion context from thread history
   */
  buildDiscussionContext(thread, currentSpeaker) {
    const recentExchanges = thread.exchanges.slice(-5);
    
    const context = {
      recentExchanges: recentExchanges.map(e => 
        `${e.speaker.type}: ${e.response.content}`
      ).join('\n'),
      keyPoints: [...new Set(thread.exchanges.flatMap(e => e.response.keyPoints || []))],
      openQuestions: thread.exchanges
        .filter(e => e.response.hasFollowUp)
        .map(e => e.response.followUpQuestion)
        .filter(q => q)
    };
    
    return context;
  }

  /**
   * Determine speaking order for exchange
   */
  determineSpeakingOrder(agents, thread, exchangeNumber) {
    // Rotate speaker order but with some variation
    const baseOrder = [...agents];
    
    // Shift order based on exchange number
    for (let i = 0; i < exchangeNumber; i++) {
      baseOrder.push(baseOrder.shift());
    }
    
    // Occasionally randomize for variety
    if (Math.random() < 0.3) {
      return this.shuffle(baseOrder);
    }
    
    return baseOrder;
  }

  /**
   * Select target agents for response
   */
  selectTargetAgents(speaker, allAgents, thread) {
    const others = allAgents.filter(a => a.id !== speaker.id);
    
    // Sometimes address all, sometimes specific agent
    if (Math.random() < 0.4) {
      return others; // Address all
    } else {
      // Select 1-2 specific agents
      const count = Math.random() < 0.7 ? 1 : 2;
      return this.shuffle(others).slice(0, count);
    }
  }

  /**
   * Determine response type based on discussion phase
   */
  determineResponseType(exchangeNumber, depth) {
    if (exchangeNumber === 1) return 'opening';
    if (exchangeNumber === 2) return 'elaboration';
    
    if (depth < 3) {
      return ['elaboration', 'clarification'][Math.floor(Math.random() * 2)];
    } else if (depth < 6) {
      return ['challenge', 'synthesis', 'elaboration'][Math.floor(Math.random() * 3)];
    } else {
      return ['synthesis', 'conclusion'][Math.floor(Math.random() * 2)];
    }
  }

  /**
   * Update discussion metrics
   */
  updateMetrics(thread) {
    this.metrics.totalExchanges += thread.exchanges.length;
    this.metrics.averageDepth = (this.metrics.averageDepth + thread.depth) / 2;
    this.metrics.topicCoherence = (this.metrics.topicCoherence + thread.coherenceScore) / 2;
  }

  // Utility methods

  extractKeywords(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
  }

  calculateKeywordOverlap(keywords1, keywords2) {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  detectRepetition(contents) {
    for (let i = 0; i < contents.length - 1; i++) {
      for (let j = i + 1; j < contents.length; j++) {
        const similarity = this.calculateSimilarity(contents[i], contents[j]);
        if (similarity > 0.8) return true;
      }
    }
    return false;
  }

  calculateSimilarity(text1, text2) {
    const words1 = new Set(this.extractKeywords(text1));
    const words2 = new Set(this.extractKeywords(text2));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  extractQuestion(text) {
    const match = text.match(/[^.!]*\?/);
    return match ? match[0].trim() : null;
  }

  extractKeyPoints(text) {
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 2).map(s => s.trim());
  }

  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get discussion statistics
   */
  getStatistics() {
    return {
      ...this.metrics,
      activeThreads: Array.from(this.discussionThreads.values())
        .filter(t => t.status === 'active').length,
      completedThreads: Array.from(this.discussionThreads.values())
        .filter(t => t.status === 'concluded').length,
      totalThreads: this.discussionThreads.size
    };
  }
}

export default DiscussionManager;