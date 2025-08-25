/**
 * Continuous Research Engine
 * 
 * A 24/7 autonomous system that continuously explores topics,
 * discovers insights, and emails important findings
 */

import logger from '../utils/logger.js';
import AutonomousConversationEngine from './autonomous-conversation-engine.js';
import SharedMemoryBank from './shared-memory-bank.js';
import EmailNotifier from './email-notifier.js';
import TopicDiscoveryEngine from './topic-discovery-engine.js';
import InsightEvaluator from './insight-evaluator.js';
import AutonomousTopicGenerator from './autonomous-topic-generator.js';
import DiscoveryEvaluator from './discovery-evaluator.js';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export class ContinuousResearchEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Core configuration
    this.config = {
      baseTopics: config.baseTopics || [],
      emailRecipient: config.emailRecipient || process.env.NOTIFICATION_EMAIL,
      researchDepth: config.researchDepth || 'comprehensive',
      insightThreshold: config.insightThreshold || 0.7,
      topicTransitionInterval: config.topicTransitionInterval || 30, // minutes
      memoryRetentionDays: config.memoryRetentionDays || 30,
      maxConcurrentTopics: config.maxConcurrentTopics || 3,
      emailBatchInterval: config.emailBatchInterval || 3600000, // 1 hour in ms
      ...config
    };
    
    // System components
    this.conversationEngine = null;
    this.sharedMemory = new SharedMemoryBank();
    this.emailNotifier = new EmailNotifier(this.config.emailRecipient);
    this.topicDiscovery = new TopicDiscoveryEngine();
    this.insightEvaluator = new InsightEvaluator();
    this.topicGenerator = new AutonomousTopicGenerator();
    this.discoveryEvaluator = new DiscoveryEvaluator();
    
    // System state
    this.isRunning = false;
    this.currentTopics = new Map();
    this.discoveredInsights = [];
    this.pendingEmails = [];
    this.researchSessions = new Map();
    this.topicQueue = [];
    this.processedTopics = new Set();
    
    // Statistics
    this.stats = {
      startTime: null,
      totalTopicsExplored: 0,
      totalInsightsDiscovered: 0,
      totalEmailsSent: 0,
      totalAgentsCreated: 0,
      currentActiveTopics: 0,
      memoryEntries: 0
    };
    
    // Timers
    this.emailBatchTimer = null;
    this.topicRotationTimer = null;
    this.healthCheckTimer = null;
  }

  /**
   * Start the 24/7 continuous research system
   */
  async start(initialTopic = null) {
    if (this.isRunning) {
      logger.warn('Continuous research engine already running');
      return;
    }
    
    try {
      logger.info('🚀 Starting 24/7 Continuous Research Engine');
      console.log('\n' + '='.repeat(80));
      console.log('🔬 CONTINUOUS RESEARCH ENGINE ACTIVATED');
      console.log('='.repeat(80));
      console.log(`📧 Email Recipient: ${this.config.emailRecipient}`);
      console.log(`🎯 Base Topics: ${this.config.baseTopics.join(', ') || 'Auto-discovery mode'}`);
      console.log(`⏰ Topic Rotation: Every ${this.config.topicTransitionInterval} minutes`);
      console.log(`📊 Insight Threshold: ${this.config.insightThreshold}`);
      console.log(`💾 Memory Retention: ${this.config.memoryRetentionDays} days`);
      console.log('='.repeat(80) + '\n');
      
      this.isRunning = true;
      this.stats.startTime = Date.now();
      
      // Initialize components
      await this.initializeComponents();
      
      // Load or create initial topics
      await this.initializeTopics(initialTopic);
      
      // Start research loops
      this.startResearchLoops();
      
      // Start scheduled tasks
      this.startScheduledTasks();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      logger.info('✅ Continuous research engine started successfully');
      this.emit('started');
      
    } catch (error) {
      logger.error('Failed to start continuous research engine:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Initialize system components
   */
  async initializeComponents() {
    // Initialize shared memory
    await this.sharedMemory.initialize();
    logger.info(`Shared memory initialized with ${this.sharedMemory.getEntryCount()} existing entries`);
    
    // Initialize email notifier
    await this.emailNotifier.initialize();
    
    // Initialize topic discovery
    await this.topicDiscovery.initialize(this.sharedMemory);
    
    // Initialize insight evaluator
    await this.insightEvaluator.initialize(this.sharedMemory);
    
    // Create conversation engine with enhanced components
    const { default: ChatLogger } = await import('./chat-logger.js');
    const { default: ModelSelector } = await import('./model-selector.js');
    const { default: ExternalMCPRegistry } = await import('./external-mcp-registry.js');
    
    const chatLogger = new ChatLogger();
    const modelSelector = new ModelSelector();
    const mcpRegistry = new ExternalMCPRegistry();
    
    this.conversationEngine = new AutonomousConversationEngine(
      chatLogger,
      modelSelector,
      mcpRegistry
    );
    
    // Configure for continuous operation
    this.conversationEngine.maxIterations = 50; // Higher limit for deep research
    this.conversationEngine.stoppingConsensusThreshold = 0.8; // Higher threshold for quality
  }

  /**
   * Initialize research topics
   */
  async initializeTopics(initialTopic) {
    // Add initial topic if provided
    if (initialTopic) {
      this.topicQueue.push({
        id: uuidv4(),
        title: initialTopic,
        source: 'user',
        priority: 10,
        createdAt: Date.now()
      });
    } else {
      // Auto-generate fascinating initial topics
      console.log('\n🤖 Auto-generating research topics...\n');
      const autoTopics = this.topicGenerator.getTopicSuggestions(3);
      
      for (const suggestion of autoTopics) {
        console.log(`  ✨ ${suggestion.topic} [${suggestion.category}]`);
        this.topicQueue.push({
          id: uuidv4(),
          title: suggestion.topic,
          source: 'auto-generated',
          category: suggestion.category,
          priority: 8 + suggestion.excitement,
          createdAt: Date.now()
        });
      }
      console.log();
    }
    
    // Add base topics if any
    for (const baseTopic of this.config.baseTopics) {
      this.topicQueue.push({
        id: uuidv4(),
        title: baseTopic,
        source: 'config',
        priority: 5,
        createdAt: Date.now()
      });
    }
    
    // Discover related topics from memory
    if (this.sharedMemory.getEntryCount() > 0) {
      const discoveredTopics = await this.topicDiscovery.discoverFromMemory();
      for (const topic of discoveredTopics.slice(0, 5)) {
        this.topicQueue.push({
          id: uuidv4(),
          title: topic.title,
          source: 'discovery',
          priority: topic.relevance * 10,
          createdAt: Date.now()
        });
      }
    }
    
    // If still no topics, use trending topics
    if (this.topicQueue.length === 0) {
      const trendingTopics = await this.topicDiscovery.getTrendingTopics();
      for (const topic of trendingTopics.slice(0, 3)) {
        this.topicQueue.push({
          id: uuidv4(),
          title: topic,
          source: 'trending',
          priority: 3,
          createdAt: Date.now()
        });
      }
    }
    
    // Sort by priority
    this.topicQueue.sort((a, b) => b.priority - a.priority);
    
    console.log(`📚 Initialized with ${this.topicQueue.length} topics in queue`);
  }

  /**
   * Start continuous research loops
   */
  startResearchLoops() {
    // Start multiple concurrent research sessions
    for (let i = 0; i < this.config.maxConcurrentTopics; i++) {
      this.startResearchSession(i);
    }
  }

  /**
   * Start a single research session
   */
  async startResearchSession(sessionId) {
    const sessionKey = `session-${sessionId}`;
    
    while (this.isRunning) {
      try {
        // Get next topic from queue
        const topic = await this.getNextTopic();
        
        if (!topic) {
          // No topics available, discover new ones
          await this.discoverNewTopics();
          await this.sleep(5000); // Wait before retry
          continue;
        }
        
        console.log(`\n🔍 Session ${sessionId} researching: "${topic.title}"`);
        this.currentTopics.set(sessionKey, topic);
        this.stats.currentActiveTopics = this.currentTopics.size;
        
        // Create research context
        const context = await this.buildResearchContext(topic);
        
        // Start autonomous research
        const insights = await this.conductResearch(topic, context, sessionId);
        
        // Process and evaluate insights
        await this.processInsights(insights, topic);
        
        // Mark topic as processed
        this.processedTopics.add(topic.id);
        this.stats.totalTopicsExplored++;
        
        // Generate follow-up topics
        const followUpTopics = await this.topicDiscovery.generateFollowUpTopics(topic, insights);
        this.queueFollowUpTopics(followUpTopics);
        
        // Remove from current topics
        this.currentTopics.delete(sessionKey);
        this.stats.currentActiveTopics = this.currentTopics.size;
        
        // Brief pause before next topic
        await this.sleep(2000);
        
      } catch (error) {
        logger.error(`Research session ${sessionId} error:`, error);
        await this.sleep(5000); // Error recovery pause
      }
    }
  }

  /**
   * Conduct research on a topic
   */
  async conductResearch(topic, context, sessionId) {
    const researchSession = {
      id: uuidv4(),
      topic: topic,
      startTime: Date.now(),
      insights: [],
      agents: [],
      iterations: 0,
      conclusion: null
    };
    
    this.researchSessions.set(researchSession.id, researchSession);
    
    try {
      // Build research prompt with context
      const researchPrompt = this.buildResearchPrompt(topic, context);
      
      // Start autonomous conversation
      await this.conversationEngine.startAutonomousConversation(researchPrompt, []);
      
      // Extract insights from conversation
      const insights = await this.extractInsights(
        this.conversationEngine.conversationMemory,
        topic
      );
      
      // Generate conclusion from research
      const conclusion = await this.generateConclusion(topic, insights, this.conversationEngine.conversationMemory);
      
      researchSession.insights = insights;
      researchSession.conclusion = conclusion;
      researchSession.agents = Array.from(this.conversationEngine.activeAgents.values());
      researchSession.iterations = this.conversationEngine.currentIteration;
      researchSession.endTime = Date.now();
      
      // Store conclusion in shared memory
      if (conclusion) {
        await this.sharedMemory.storeMemory({
          type: 'conclusion',
          content: conclusion,
          topic: topic.title,
          timestamp: Date.now(),
          importance: 0.8
        });
      }
      
      // Update statistics
      this.stats.totalAgentsCreated += researchSession.agents.length;
      
      // Reset conversation engine for next topic
      this.conversationEngine.roundTransitionManager.reset();
      this.conversationEngine.activeAgents.clear();
      this.conversationEngine.conversationMemory = [];
      this.conversationEngine.currentIteration = 0;
      
      return insights;
      
    } catch (error) {
      logger.error(`Research failed for topic "${topic.title}":`, error);
      researchSession.error = error.message;
      return [];
    }
  }

  /**
   * Build research context from shared memory
   */
  async buildResearchContext(topic) {
    const relatedMemories = await this.sharedMemory.searchMemory(topic.title, {
      limit: 10,
      minRelevance: 0.5
    });
    
    const context = {
      relatedInsights: relatedMemories.filter(m => m.type === 'insight'),
      relatedFacts: relatedMemories.filter(m => m.type === 'fact'),
      relatedQuestions: relatedMemories.filter(m => m.type === 'question'),
      previousConclusions: relatedMemories.filter(m => m.type === 'conclusion')
    };
    
    return context;
  }

  /**
   * Build research prompt
   */
  buildResearchPrompt(topic, context) {
    let prompt = `Research Topic: "${topic.title}"

Objective: Conduct comprehensive research to discover novel insights, connections, and actionable conclusions.

Requirements:
1. Explore multiple perspectives and dimensions
2. Identify non-obvious connections and patterns
3. Generate actionable insights and recommendations
4. Challenge assumptions and explore edge cases
5. Synthesize findings into clear conclusions`;

    if (context.relatedInsights.length > 0) {
      prompt += `\n\nRelated Previous Insights:
${context.relatedInsights.slice(0, 3).map(i => `- ${i.content}`).join('\n')}`;
    }

    if (context.previousConclusions.length > 0) {
      prompt += `\n\nPrevious Related Conclusions:
${context.previousConclusions.slice(0, 2).map(c => `- ${c.content}`).join('\n')}`;
    }

    prompt += `\n\nFocus on discovering NEW information and connections not already known.`;

    return prompt;
  }

  /**
   * Generate conclusion from research
   */
  async generateConclusion(topic, insights, conversationMemory) {
    try {
      // Combine key insights
      const keyInsights = insights
        .filter(i => i.score > 0.6)
        .slice(0, 5)
        .map(i => i.content)
        .join('\n- ');
      
      // Extract key discussion points
      const keyPoints = conversationMemory
        .filter(msg => msg.content && msg.content.length > 100)
        .slice(-10)
        .map(msg => {
          const lines = msg.content.split('\n');
          return lines.find(line => 
            line.includes('discovered') || 
            line.includes('found') || 
            line.includes('important') ||
            line.includes('conclude') ||
            line.includes('result')
          ) || lines[0];
        })
        .filter(Boolean)
        .slice(0, 3)
        .join('\n');
      
      const prompt = `Based on the research conducted on "${topic.title}", synthesize a comprehensive conclusion.

Key Insights:
${keyInsights || 'No significant insights extracted'}

Key Discussion Points:
${keyPoints || 'No key points identified'}

Generate a 2-3 paragraph conclusion that:
1. Summarizes the main findings
2. Highlights the most important discoveries
3. Suggests potential implications or applications
4. Identifies areas for future research

Conclusion:`;
      
      // Use the AI to generate conclusion
      const response = await this.aiInterface.generateResponse(prompt);
      
      return response || `Research on "${topic.title}" yielded ${insights.length} insights with interesting implications for future exploration.`;
      
    } catch (error) {
      logger.error('Failed to generate conclusion:', error);
      return `Research completed on "${topic.title}" with ${insights.length} insights discovered.`;
    }
  }

  /**
   * Extract insights from conversation memory
   */
  async extractInsights(conversationMemory, topic) {
    const insights = [];
    
    for (const memory of conversationMemory) {
      if (memory.type === 'agent_response' && memory.content) {
        // Evaluate if content contains insights
        const evaluation = await this.insightEvaluator.evaluate(memory.content, topic);
        
        if (evaluation.isInsight && evaluation.score >= this.config.insightThreshold) {
          insights.push({
            id: uuidv4(),
            content: memory.content,
            topic: topic.title,
            type: evaluation.insightType,
            score: evaluation.score,
            novelty: evaluation.novelty,
            actionability: evaluation.actionability,
            timestamp: Date.now(),
            agentId: memory.agent
          });
        }
      }
    }
    
    return insights;
  }

  /**
   * Process and store insights
   */
  async processInsights(insights, topic) {
    for (const insight of insights) {
      // Store in shared memory
      await this.sharedMemory.storeInsight(insight);
      
      // Add to discovered insights
      this.discoveredInsights.push(insight);
      this.stats.totalInsightsDiscovered++;
      
      // Evaluate discovery coolness
      const evaluation = this.discoveryEvaluator.evaluateDiscovery(insight, {
        topic: topic.title,
        hasConsensus: insight.hasConsensus,
        multipleAgentsAgreed: insight.agentAgreement > 0.6,
        generatedInsight: insight.type === 'insight',
        solvedProblem: insight.type === 'solution',
        foundContradiction: insight.type === 'contradiction'
      });
      
      console.log(`   💡 Discovered: ${insight.content.substring(0, 100)}...`);
      console.log(`      Score: ${insight.score.toFixed(2)}, Coolness: ${evaluation.score.toFixed(2)}`);
      console.log(`      ${evaluation.reason}`);
      
      // Handle email triggers based on coolness
      if (evaluation.shouldEmailNow) {
        if (evaluation.isSuperCool) {
          // Send breakthrough email immediately
          await this.sendBreakthroughEmail(insight, topic);
        } else {
          // Send batch email
          const batch = this.discoveryEvaluator.getEmailBatch();
          if (batch) {
            await this.sendDiscoveryBatchEmail(batch);
          }
        }
      }
    }
  }

  /**
   * Send breakthrough email immediately
   */
  async sendBreakthroughEmail(insight, topic) {
    const emailData = {
      subject: `🚨 BREAKTHROUGH: ${topic.title}`,
      content: {
        title: 'Extraordinary Discovery!',
        insights: [{
          topic: topic.title,
          content: insight.content,
          score: insight.score * 10,
          timestamp: new Date().toISOString()
        }],
        summary: `This is a breakthrough discovery with exceptional significance. ` +
                 `The research system has uncovered something truly remarkable.`,
        metadata: {
          discoveryType: 'breakthrough',
          urgency: 'high',
          confidence: insight.confidence || 0.9
        }
      }
    };
    
    await this.emailNotifier.sendInsightEmail(emailData);
    this.stats.totalEmailsSent++;
    console.log('\n   📧 BREAKTHROUGH EMAIL SENT!\n');
  }

  /**
   * Send batch of cool discoveries
   */
  async sendDiscoveryBatchEmail(batch) {
    const emailData = {
      subject: batch.headline,
      content: {
        title: 'Cool Discoveries Collection',
        insights: batch.discoveries.map(d => ({
          topic: d.topic,
          content: d.content,
          score: (d.coolness * 10).toFixed(1),
          timestamp: d.timestamp || new Date().toISOString()
        })),
        summary: batch.summary,
        metadata: {
          batchSize: batch.discoveries.length,
          averageCoolness: (batch.discoveries.reduce((sum, d) => sum + d.coolness, 0) / batch.discoveries.length).toFixed(2)
        }
      }
    };
    
    await this.emailNotifier.sendInsightEmail(emailData);
    this.stats.totalEmailsSent++;
    console.log(`\n   📧 Discovery batch email sent (${batch.discoveries.length} findings)\n`);
  }

  /**
   * Queue email notification
   */
  queueEmailNotification(insight, topic) {
    this.pendingEmails.push({
      insight: insight,
      topic: topic,
      queuedAt: Date.now()
    });
    
    console.log(`   📧 Queued for email: ${insight.type} insight`);
  }

  /**
   * Get next topic from queue
   */
  async getNextTopic() {
    // Remove already processed topics
    this.topicQueue = this.topicQueue.filter(t => !this.processedTopics.has(t.id));
    
    if (this.topicQueue.length === 0) {
      return null;
    }
    
    return this.topicQueue.shift();
  }

  /**
   * Discover new topics
   */
  async discoverNewTopics() {
    console.log('   🔎 Discovering new topics...');
    
    // Auto-generate fascinating topics
    const autoGenerated = [];
    const suggestions = this.topicGenerator.getTopicSuggestions(3);
    
    for (const suggestion of suggestions) {
      autoGenerated.push({
        id: uuidv4(),
        title: suggestion.topic,
        source: 'auto-discovery',
        category: suggestion.category,
        priority: 7 + suggestion.excitement,
        createdAt: Date.now()
      });
      console.log(`      ✨ Auto-discovered: ${suggestion.topic}`);
    }
    
    // Generate related topics based on recent discoveries
    if (this.discoveredInsights.length > 0) {
      const lastInsight = this.discoveredInsights[this.discoveredInsights.length - 1];
      const related = this.topicGenerator.generateRelatedTopic(
        lastInsight.topic,
        this.discoveredInsights.slice(-5)
      );
      
      if (related) {
        autoGenerated.push({
          id: uuidv4(),
          title: related.topic,
          source: 'related-discovery',
          category: related.category,
          priority: 8,
          createdAt: Date.now()
        });
        console.log(`      🔗 Related topic: ${related.topic}`);
      }
    }
    
    // Get trending topics from discovery engine
    const trending = await this.topicDiscovery.getTrendingTopics();
    
    // Get topics from recent insights
    const fromInsights = await this.topicDiscovery.generateFromInsights(
      this.discoveredInsights.slice(-20)
    );
    
    // Combine all new topics
    const newTopics = [...autoGenerated, ...trending, ...fromInsights];
    
    for (const topicTitle of newTopics) {
      // Check if not already processed
      const topicHash = this.hashTopic(topicTitle);
      if (!this.processedTopics.has(topicHash)) {
        this.topicQueue.push({
          id: uuidv4(),
          title: topicTitle,
          source: 'discovery',
          priority: Math.random() * 5 + 3,
          createdAt: Date.now()
        });
      }
    }
    
    // Sort by priority
    this.topicQueue.sort((a, b) => b.priority - a.priority);
    
    console.log(`   ✅ Discovered ${newTopics.length} new topics`);
  }

  /**
   * Queue follow-up topics
   */
  queueFollowUpTopics(topics) {
    for (const topic of topics) {
      this.topicQueue.push({
        id: uuidv4(),
        title: topic.title,
        source: 'follow-up',
        priority: topic.priority || 6,
        createdAt: Date.now()
      });
    }
  }

  /**
   * Start scheduled tasks
   */
  startScheduledTasks() {
    // Email batch sending
    this.emailBatchTimer = setInterval(() => {
      this.sendEmailBatch();
    }, this.config.emailBatchInterval);
    
    // Topic rotation
    this.topicRotationTimer = setInterval(() => {
      this.rotateTopics();
    }, this.config.topicTransitionInterval * 60000);
    
    // Memory cleanup
    setInterval(() => {
      this.cleanupOldMemory();
    }, 86400000); // Daily
  }

  /**
   * Send batch of email notifications
   */
  async sendEmailBatch() {
    if (this.pendingEmails.length === 0) return;
    
    console.log(`\n📮 Sending email batch (${this.pendingEmails.length} insights)...`);
    
    try {
      const emailContent = this.formatEmailContent(this.pendingEmails);
      
      await this.emailNotifier.sendInsightEmail({
        subject: `Research Insights: ${new Date().toLocaleDateString()} - ${this.pendingEmails.length} discoveries`,
        content: emailContent,
        insights: this.pendingEmails.map(e => e.insight),
        topics: [...new Set(this.pendingEmails.map(e => e.topic.title))]
      });
      
      this.stats.totalEmailsSent++;
      this.pendingEmails = [];
      
      console.log('   ✅ Email sent successfully');
      
    } catch (error) {
      logger.error('Failed to send email batch:', error);
    }
  }

  /**
   * Format email content
   */
  formatEmailContent(pendingEmails) {
    let content = `# Research Insights Report\n\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Total Discoveries: ${pendingEmails.length}\n\n`;
    
    // Group by topic
    const byTopic = {};
    for (const item of pendingEmails) {
      if (!byTopic[item.topic.title]) {
        byTopic[item.topic.title] = [];
      }
      byTopic[item.topic.title].push(item.insight);
    }
    
    // Format each topic section
    for (const [topicTitle, insights] of Object.entries(byTopic)) {
      content += `## ${topicTitle}\n\n`;
      
      for (const insight of insights) {
        content += `### ${insight.type.toUpperCase()} Insight\n`;
        content += `**Score:** ${insight.score.toFixed(2)} | `;
        content += `**Novelty:** ${insight.novelty.toFixed(2)} | `;
        content += `**Actionability:** ${insight.actionability.toFixed(2)}\n\n`;
        content += `${insight.content}\n\n`;
        content += `---\n\n`;
      }
    }
    
    // Add statistics
    content += `## System Statistics\n\n`;
    content += `- Uptime: ${this.getUptime()}\n`;
    content += `- Topics Explored: ${this.stats.totalTopicsExplored}\n`;
    content += `- Total Insights: ${this.stats.totalInsightsDiscovered}\n`;
    content += `- Active Research Sessions: ${this.stats.currentActiveTopics}\n`;
    content += `- Memory Entries: ${this.sharedMemory.getEntryCount()}\n`;
    
    return content;
  }

  /**
   * Rotate topics periodically
   */
  async rotateTopics() {
    console.log('\n🔄 Rotating research topics...');
    
    // Discover new topics
    await this.discoverNewTopics();
    
    // Re-prioritize queue based on age and relevance
    this.topicQueue = this.topicQueue.map(topic => {
      const age = Date.now() - topic.createdAt;
      const agePenalty = age / (3600000 * 24); // Days old
      topic.priority = Math.max(0, topic.priority - agePenalty);
      return topic;
    });
    
    this.topicQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Cleanup old memory entries
   */
  async cleanupOldMemory() {
    const cutoffDate = Date.now() - (this.config.memoryRetentionDays * 86400000);
    const cleaned = await this.sharedMemory.cleanupOldEntries(cutoffDate);
    logger.info(`Cleaned up ${cleaned} old memory entries`);
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute
  }

  /**
   * Perform system health check
   */
  async performHealthCheck() {
    const health = {
      uptime: this.getUptime(),
      activeTopics: this.stats.currentActiveTopics,
      queuedTopics: this.topicQueue.length,
      pendingEmails: this.pendingEmails.length,
      memoryUsage: process.memoryUsage(),
      isHealthy: true
    };
    
    // Check for stuck sessions
    if (this.stats.currentActiveTopics === 0 && this.topicQueue.length > 0) {
      logger.warn('No active research sessions despite available topics');
      health.isHealthy = false;
    }
    
    // Check memory usage
    if (health.memoryUsage.heapUsed > 1024 * 1024 * 1024) { // 1GB
      logger.warn('High memory usage detected');
      health.isHealthy = false;
    }
    
    this.emit('health-check', health);
    
    if (!health.isHealthy) {
      logger.warn('Health check failed, attempting recovery...');
      // Implement recovery logic if needed
    }
  }

  /**
   * Stop the continuous research engine
   */
  async stop() {
    console.log('\n🛑 Stopping continuous research engine...');
    this.isRunning = false;
    
    // Clear timers
    if (this.emailBatchTimer) clearInterval(this.emailBatchTimer);
    if (this.topicRotationTimer) clearInterval(this.topicRotationTimer);
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    
    // Send final email batch
    if (this.pendingEmails.length > 0) {
      await this.sendEmailBatch();
    }
    
    // Save state
    await this.saveState();
    
    logger.info('Continuous research engine stopped');
    this.emit('stopped');
  }

  /**
   * Save current state for recovery
   */
  async saveState() {
    const state = {
      topicQueue: this.topicQueue,
      processedTopics: Array.from(this.processedTopics),
      stats: this.stats,
      timestamp: Date.now()
    };
    
    await this.sharedMemory.storeSystemState(state);
    logger.info('System state saved');
  }

  /**
   * Load previous state
   */
  async loadState() {
    const state = await this.sharedMemory.getSystemState();
    if (state) {
      this.topicQueue = state.topicQueue || [];
      this.processedTopics = new Set(state.processedTopics || []);
      this.stats = { ...this.stats, ...state.stats };
      logger.info('Previous state loaded');
    }
  }

  /**
   * Get uptime string
   */
  getUptime() {
    if (!this.stats.startTime) return 'Not started';
    
    const uptime = Date.now() - this.stats.startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    
    return `${hours}h ${minutes}m`;
  }

  /**
   * Hash topic for deduplication
   */
  hashTopic(title) {
    // Ensure title is a string before processing
    const titleStr = String(title || '');
    return titleStr.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      uptime: this.getUptime(),
      queuedTopics: this.topicQueue.length,
      pendingEmails: this.pendingEmails.length,
      memoryEntries: this.sharedMemory.getEntryCount()
    };
  }
}

export default ContinuousResearchEngine;