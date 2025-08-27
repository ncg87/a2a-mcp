/**
 * Agent Performance Analytics
 * 
 * Tracks and analyzes agent performance metrics, model efficiency,
 * and conversation quality for optimization
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

export class AgentPerformanceAnalytics extends EventEmitter {
  constructor() {
    super();
    
    // Performance metrics by agent
    this.agentMetrics = new Map();
    
    // Model performance tracking
    this.modelMetrics = new Map();
    
    // Conversation quality metrics
    this.conversationMetrics = {
      totalConversations: 0,
      successfulConclusions: 0,
      averageIterations: 0,
      averageDuration: 0,
      totalTokensUsed: 0,
      totalCost: 0
    };
    
    // Real-time metrics
    this.realtimeMetrics = {
      activeAgents: 0,
      messagesPerMinute: 0,
      tokensPerMinute: 0,
      errorsPerHour: 0
    };
    
    // Time-series data for trends
    this.timeSeriesData = [];
    this.metricsBuffer = [];
    
    // Configuration
    this.config = {
      metricsInterval: 60000, // 1 minute
      bufferSize: 100,
      alertThresholds: {
        errorRate: 0.1,
        responseTime: 5000,
        tokenUsage: 10000
      }
    };
  }
  
  /**
   * Track agent creation
   */
  trackAgentCreation(agentId, agentType, model) {
    if (!this.agentMetrics.has(agentId)) {
      this.agentMetrics.set(agentId, {
        id: agentId,
        type: agentType,
        model: model,
        created: Date.now(),
        messages: 0,
        tokens: 0,
        errors: 0,
        avgResponseTime: 0,
        successRate: 1.0,
        mcpToolsUsed: 0,
        subAgentsCreated: 0,
        contributions: []
      });
    }
    
    this.realtimeMetrics.activeAgents++;
    
    this.emit('agentCreated', { agentId, agentType, model });
  }
  
  /**
   * Track agent response
   */
  trackAgentResponse(agentId, responseData) {
    const agent = this.agentMetrics.get(agentId);
    if (!agent) return;
    
    agent.messages++;
    agent.tokens += responseData.tokens || 0;
    
    // Update response time average
    const currentAvg = agent.avgResponseTime;
    agent.avgResponseTime = (currentAvg * (agent.messages - 1) + responseData.responseTime) / agent.messages;
    
    // Track MCP tools usage
    if (responseData.usedMCPTools) {
      agent.mcpToolsUsed++;
    }
    
    // Track sub-agent creation
    if (responseData.createdSubAgents) {
      agent.subAgentsCreated += responseData.subAgentCount || 0;
    }
    
    // Track contribution quality
    if (responseData.content && responseData.content.length > 100) {
      agent.contributions.push({
        timestamp: Date.now(),
        quality: this.assessResponseQuality(responseData.content),
        tokens: responseData.tokens
      });
    }
    
    // Update model metrics
    this.updateModelMetrics(agent.model, responseData);
    
    this.emit('agentResponse', { agentId, metrics: agent });
  }
  
  /**
   * Track agent error
   */
  trackAgentError(agentId, error) {
    const agent = this.agentMetrics.get(agentId);
    if (!agent) return;
    
    agent.errors++;
    agent.successRate = (agent.messages - agent.errors) / agent.messages;
    
    this.realtimeMetrics.errorsPerHour++;
    
    // Check alert threshold
    if (agent.successRate < 0.9) {
      this.emit('alert', {
        type: 'lowSuccessRate',
        agentId,
        value: agent.successRate
      });
    }
    
    this.emit('agentError', { agentId, error: error.message });
  }
  
  /**
   * Update model metrics
   */
  updateModelMetrics(modelId, responseData) {
    if (!this.modelMetrics.has(modelId)) {
      this.modelMetrics.set(modelId, {
        model: modelId,
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        avgResponseTime: 0,
        successRate: 1.0,
        errors: 0,
        retries: 0
      });
    }
    
    const model = this.modelMetrics.get(modelId);
    model.totalRequests++;
    model.totalTokens += responseData.tokens || 0;
    model.totalCost += responseData.cost || 0;
    
    // Update response time average
    const currentAvg = model.avgResponseTime;
    model.avgResponseTime = (currentAvg * (model.totalRequests - 1) + responseData.responseTime) / model.totalRequests;
    
    // Track retries
    if (responseData.attempt && responseData.attempt > 1) {
      model.retries += responseData.attempt - 1;
    }
    
    // Check performance thresholds
    if (model.avgResponseTime > this.config.alertThresholds.responseTime) {
      this.emit('alert', {
        type: 'slowModel',
        model: modelId,
        value: model.avgResponseTime
      });
    }
  }
  
  /**
   * Track conversation completion
   */
  trackConversationCompletion(conversationData) {
    this.conversationMetrics.totalConversations++;
    
    if (conversationData.conclusion) {
      this.conversationMetrics.successfulConclusions++;
    }
    
    // Update averages
    const prevAvgIterations = this.conversationMetrics.averageIterations;
    const prevAvgDuration = this.conversationMetrics.averageDuration;
    const count = this.conversationMetrics.totalConversations;
    
    this.conversationMetrics.averageIterations = 
      (prevAvgIterations * (count - 1) + conversationData.iterations) / count;
    
    this.conversationMetrics.averageDuration = 
      (prevAvgDuration * (count - 1) + conversationData.duration) / count;
    
    this.conversationMetrics.totalTokensUsed += conversationData.totalTokens || 0;
    this.conversationMetrics.totalCost += conversationData.totalCost || 0;
    
    // Record time-series data point
    this.recordTimeSeriesData({
      timestamp: Date.now(),
      iterations: conversationData.iterations,
      duration: conversationData.duration,
      agents: conversationData.agentCount,
      tokens: conversationData.totalTokens,
      cost: conversationData.totalCost,
      success: !!conversationData.conclusion
    });
    
    this.emit('conversationComplete', this.conversationMetrics);
  }
  
  /**
   * Assess response quality
   */
  assessResponseQuality(content) {
    let score = 0;
    
    // Length score
    if (content.length > 500) score += 0.2;
    else if (content.length > 200) score += 0.1;
    
    // Substance indicators
    const substanceKeywords = ['implemented', 'created', 'solved', 'analyzed', 'designed', 'developed'];
    substanceKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) score += 0.1;
    });
    
    // Technical depth
    const technicalTerms = ['architecture', 'framework', 'protocol', 'implementation', 'algorithm'];
    technicalTerms.forEach(term => {
      if (content.toLowerCase().includes(term)) score += 0.05;
    });
    
    // Collaboration indicators
    const collaborationPhrases = ['building on', 'agree with', 'suggest', 'propose', 'consider'];
    collaborationPhrases.forEach(phrase => {
      if (content.toLowerCase().includes(phrase)) score += 0.05;
    });
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Record time-series data
   */
  recordTimeSeriesData(dataPoint) {
    this.timeSeriesData.push(dataPoint);
    
    // Keep only last 1000 data points
    if (this.timeSeriesData.length > 1000) {
      this.timeSeriesData.shift();
    }
    
    // Buffer for batch processing
    this.metricsBuffer.push(dataPoint);
    if (this.metricsBuffer.length >= this.config.bufferSize) {
      this.processMetricsBuffer();
    }
  }
  
  /**
   * Process metrics buffer
   */
  processMetricsBuffer() {
    if (this.metricsBuffer.length === 0) return;
    
    // Calculate aggregated metrics
    const aggregated = {
      timestamp: Date.now(),
      avgIterations: 0,
      avgDuration: 0,
      avgTokens: 0,
      avgCost: 0,
      successRate: 0
    };
    
    this.metricsBuffer.forEach(point => {
      aggregated.avgIterations += point.iterations;
      aggregated.avgDuration += point.duration;
      aggregated.avgTokens += point.tokens;
      aggregated.avgCost += point.cost;
      aggregated.successRate += point.success ? 1 : 0;
    });
    
    const count = this.metricsBuffer.length;
    aggregated.avgIterations /= count;
    aggregated.avgDuration /= count;
    aggregated.avgTokens /= count;
    aggregated.avgCost /= count;
    aggregated.successRate /= count;
    
    // Clear buffer
    this.metricsBuffer = [];
    
    this.emit('metricsAggregated', aggregated);
  }
  
  /**
   * Get agent rankings
   */
  getAgentRankings() {
    const agents = Array.from(this.agentMetrics.values());
    
    // Rank by contribution quality
    const byQuality = [...agents].sort((a, b) => {
      const aQuality = a.contributions.reduce((sum, c) => sum + c.quality, 0) / Math.max(a.contributions.length, 1);
      const bQuality = b.contributions.reduce((sum, c) => sum + c.quality, 0) / Math.max(b.contributions.length, 1);
      return bQuality - aQuality;
    });
    
    // Rank by efficiency (quality per token)
    const byEfficiency = [...agents].sort((a, b) => {
      const aEfficiency = (a.contributions.reduce((sum, c) => sum + c.quality, 0) / Math.max(a.tokens, 1)) * 1000;
      const bEfficiency = (b.contributions.reduce((sum, c) => sum + c.quality, 0) / Math.max(b.tokens, 1)) * 1000;
      return bEfficiency - aEfficiency;
    });
    
    // Rank by reliability
    const byReliability = [...agents].sort((a, b) => b.successRate - a.successRate);
    
    return {
      topQuality: byQuality.slice(0, 5),
      topEfficiency: byEfficiency.slice(0, 5),
      topReliability: byReliability.slice(0, 5)
    };
  }
  
  /**
   * Get model comparison
   */
  getModelComparison() {
    const models = Array.from(this.modelMetrics.values());
    
    return models.map(model => ({
      model: model.model,
      performance: {
        avgResponseTime: model.avgResponseTime,
        successRate: model.successRate,
        retryRate: model.retries / Math.max(model.totalRequests, 1)
      },
      efficiency: {
        tokensPerRequest: model.totalTokens / Math.max(model.totalRequests, 1),
        costPerRequest: model.totalCost / Math.max(model.totalRequests, 1),
        costPerToken: model.totalCost / Math.max(model.totalTokens, 1)
      },
      usage: {
        totalRequests: model.totalRequests,
        totalTokens: model.totalTokens,
        totalCost: model.totalCost
      }
    })).sort((a, b) => b.performance.successRate - a.performance.successRate);
  }
  
  /**
   * Get analytics dashboard data
   */
  getDashboardData() {
    return {
      overview: {
        activeAgents: this.realtimeMetrics.activeAgents,
        totalAgents: this.agentMetrics.size,
        totalModels: this.modelMetrics.size,
        totalConversations: this.conversationMetrics.totalConversations
      },
      performance: {
        avgResponseTime: this.calculateAverageResponseTime(),
        successRate: this.calculateOverallSuccessRate(),
        tokenUsage: this.conversationMetrics.totalTokensUsed,
        totalCost: this.conversationMetrics.totalCost
      },
      rankings: this.getAgentRankings(),
      models: this.getModelComparison(),
      trends: this.calculateTrends(),
      alerts: this.getActiveAlerts()
    };
  }
  
  /**
   * Calculate average response time across all agents
   */
  calculateAverageResponseTime() {
    const agents = Array.from(this.agentMetrics.values());
    if (agents.length === 0) return 0;
    
    const totalTime = agents.reduce((sum, agent) => sum + agent.avgResponseTime, 0);
    return totalTime / agents.length;
  }
  
  /**
   * Calculate overall success rate
   */
  calculateOverallSuccessRate() {
    const agents = Array.from(this.agentMetrics.values());
    if (agents.length === 0) return 1.0;
    
    const totalMessages = agents.reduce((sum, agent) => sum + agent.messages, 0);
    const totalErrors = agents.reduce((sum, agent) => sum + agent.errors, 0);
    
    if (totalMessages === 0) return 1.0;
    return (totalMessages - totalErrors) / totalMessages;
  }
  
  /**
   * Calculate trends from time-series data
   */
  calculateTrends() {
    if (this.timeSeriesData.length < 10) return null;
    
    const recent = this.timeSeriesData.slice(-10);
    const older = this.timeSeriesData.slice(-20, -10);
    
    if (older.length === 0) return null;
    
    const recentAvg = {
      iterations: recent.reduce((sum, p) => sum + p.iterations, 0) / recent.length,
      duration: recent.reduce((sum, p) => sum + p.duration, 0) / recent.length,
      tokens: recent.reduce((sum, p) => sum + p.tokens, 0) / recent.length
    };
    
    const olderAvg = {
      iterations: older.reduce((sum, p) => sum + p.iterations, 0) / older.length,
      duration: older.reduce((sum, p) => sum + p.duration, 0) / older.length,
      tokens: older.reduce((sum, p) => sum + p.tokens, 0) / older.length
    };
    
    return {
      iterations: ((recentAvg.iterations - olderAvg.iterations) / olderAvg.iterations * 100).toFixed(1),
      duration: ((recentAvg.duration - olderAvg.duration) / olderAvg.duration * 100).toFixed(1),
      tokens: ((recentAvg.tokens - olderAvg.tokens) / olderAvg.tokens * 100).toFixed(1)
    };
  }
  
  /**
   * Get active alerts
   */
  getActiveAlerts() {
    const alerts = [];
    
    // Check error rate
    const errorRate = 1 - this.calculateOverallSuccessRate();
    if (errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        type: 'highErrorRate',
        severity: 'warning',
        value: errorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }
    
    // Check token usage rate
    const recentTokens = this.timeSeriesData.slice(-10)
      .reduce((sum, p) => sum + p.tokens, 0);
    
    if (recentTokens > this.config.alertThresholds.tokenUsage) {
      alerts.push({
        type: 'highTokenUsage',
        severity: 'info',
        value: recentTokens,
        threshold: this.config.alertThresholds.tokenUsage
      });
    }
    
    return alerts;
  }
  
  /**
   * Export analytics report
   */
  exportReport(format = 'json') {
    const report = {
      generated: new Date().toISOString(),
      summary: this.conversationMetrics,
      agents: Array.from(this.agentMetrics.values()),
      models: Array.from(this.modelMetrics.values()),
      rankings: this.getAgentRankings(),
      trends: this.calculateTrends(),
      dashboard: this.getDashboardData()
    };
    
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else if (format === 'markdown') {
      return this.generateMarkdownReport(report);
    }
    
    return report;
  }
  
  /**
   * Get system-level metrics
   */
  getSystemMetrics() {
    const runtime = Date.now() - (this.startTime || Date.now());
    const totalResponses = Array.from(this.agentMetrics.values())
      .reduce((sum, agent) => sum + agent.totalResponses, 0);
    const totalTokens = Array.from(this.agentMetrics.values())
      .reduce((sum, agent) => sum + agent.totalTokens, 0);
    const totalErrors = Array.from(this.agentMetrics.values())
      .reduce((sum, agent) => sum + agent.errors, 0);
    const avgResponseTime = totalResponses > 0 
      ? Array.from(this.agentMetrics.values())
          .reduce((sum, agent) => sum + agent.totalResponseTime, 0) / totalResponses
      : 0;
    
    return {
      runtime,
      totalResponses,
      totalTokens,
      totalErrors,
      totalAgents: this.agentMetrics.size,
      totalModels: this.modelMetrics.size,
      avgResponseTime,
      errorRate: totalResponses > 0 ? (totalErrors / totalResponses) * 100 : 0,
      throughput: runtime > 0 ? (totalResponses / (runtime / 1000)) : 0,
      activeConversations: this.conversationMetrics.totalConversations
    };
  }
  
  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    let md = `# Agent Performance Analytics Report\n\n`;
    md += `Generated: ${report.generated}\n\n`;
    
    md += `## Summary\n`;
    md += `- Total Conversations: ${report.summary.totalConversations}\n`;
    md += `- Success Rate: ${(report.summary.successfulConclusions / report.summary.totalConversations * 100).toFixed(1)}%\n`;
    md += `- Average Iterations: ${report.summary.averageIterations.toFixed(1)}\n`;
    md += `- Total Tokens: ${report.summary.totalTokensUsed}\n`;
    md += `- Total Cost: $${report.summary.totalCost.toFixed(4)}\n\n`;
    
    md += `## Top Performing Agents\n\n`;
    
    md += `### By Quality\n`;
    report.rankings.topQuality.forEach((agent, idx) => {
      md += `${idx + 1}. ${agent.type} (${agent.model}) - ${agent.messages} messages\n`;
    });
    
    md += `\n### By Efficiency\n`;
    report.rankings.topEfficiency.forEach((agent, idx) => {
      md += `${idx + 1}. ${agent.type} (${agent.model}) - ${(agent.tokens / agent.messages).toFixed(0)} tokens/msg\n`;
    });
    
    md += `\n## Model Performance\n`;
    report.models.forEach(model => {
      md += `\n### ${model.model}\n`;
      md += `- Requests: ${model.totalRequests}\n`;
      md += `- Avg Response Time: ${model.avgResponseTime.toFixed(0)}ms\n`;
      md += `- Success Rate: ${(model.successRate * 100).toFixed(1)}%\n`;
      md += `- Cost per Request: $${(model.totalCost / model.totalRequests).toFixed(4)}\n`;
    });
    
    return md;
  }
}

export default AgentPerformanceAnalytics;