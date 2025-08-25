/**
 * Deep Analysis Engine
 * 
 * Provides multi-layered analysis capabilities for agents
 * Enables reasoning chains, verification, and progressive knowledge building
 */

import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class DeepAnalysisEngine {
  constructor(aiClient, mcpClient) {
    this.aiClient = aiClient;
    this.mcpClient = mcpClient;
    
    // Analysis tracking
    this.analysisCache = new Map();
    this.reasoningChains = new Map();
    this.verificationResults = new Map();
    
    // Configuration
    this.config = {
      maxReasoningDepth: 7,
      verificationRequired: true,
      cacheAnalysisResults: true,
      parallelAnalysis: true,
      progressiveRefinement: true
    };
    
    // Analysis patterns
    this.analysisPatterns = {
      technical: ['decomposition', 'dependencies', 'complexity', 'optimization'],
      causal: ['root-causes', 'effects', 'correlations', 'predictions'],
      comparative: ['similarities', 'differences', 'trade-offs', 'recommendations'],
      systemic: ['components', 'interactions', 'emergent-properties', 'bottlenecks']
    };
  }

  /**
   * Perform comprehensive multi-layer analysis
   */
  async performMultiLayerAnalysis(topic, agent, context = {}) {
    const analysisId = uuidv4();
    console.log(`   🔬 Starting multi-layer analysis: ${topic}`);
    
    try {
      // Check cache first
      const cacheKey = `${topic}-${agent.type}`;
      if (this.config.cacheAnalysisResults && this.analysisCache.has(cacheKey)) {
        const cached = this.analysisCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
          console.log(`      ✓ Using cached analysis`);
          return cached.analysis;
        }
      }
      
      // Perform parallel analysis layers
      const layers = await Promise.all([
        this.analyzeSurface(topic, agent, context),
        this.analyzeTechnical(topic, agent, context),
        this.analyzeImplications(topic, agent, context),
        this.findConnections(topic, agent, context),
        this.generatePredictions(topic, agent, context)
      ]);
      
      // Synthesize layers
      const synthesis = await this.synthesizeLayers(layers, topic, agent);
      
      // Create reasoning chain
      const reasoningChain = await this.createReasoningChain(synthesis.premise, agent);
      
      // Verify critical findings
      let verificationStatus = null;
      if (this.config.verificationRequired) {
        verificationStatus = await this.verifyFindings(synthesis.criticalFindings, topic);
      }
      
      const analysis = {
        id: analysisId,
        topic: topic,
        agent: agent.type,
        timestamp: Date.now(),
        layers: {
          surface: layers[0],
          technical: layers[1],
          implications: layers[2],
          connections: layers[3],
          predictions: layers[4]
        },
        synthesis: synthesis,
        reasoningChain: reasoningChain,
        verification: verificationStatus,
        confidence: this.calculateConfidence(layers, verificationStatus)
      };
      
      // Cache the analysis
      if (this.config.cacheAnalysisResults) {
        this.analysisCache.set(cacheKey, {
          analysis: analysis,
          timestamp: Date.now()
        });
      }
      
      console.log(`      ✅ Multi-layer analysis complete (confidence: ${analysis.confidence.toFixed(2)})`);
      
      return analysis;
      
    } catch (error) {
      logger.error('Multi-layer analysis failed:', error);
      return this.getFallbackAnalysis(topic, agent);
    }
  }

  /**
   * Analyze surface level understanding
   */
  async analyzeSurface(topic, agent, context) {
    const prompt = `As a ${agent.type} expert, provide surface-level analysis of: "${topic}"

Consider:
1. What is immediately apparent?
2. Key components or elements
3. Observable characteristics
4. Initial complexity assessment

Provide structured analysis:`;

    try {
      const response = await this.aiClient.generateResponse(
        agent.assignedModel?.id || 'gpt-4',
        prompt,
        {
          agentType: 'analyst',
          maxTokens: 200,
          temperature: 0.5
        }
      );
      
      return {
        level: 'surface',
        content: response.content,
        keyElements: this.extractKeyElements(response.content),
        complexity: this.assessComplexity(response.content)
      };
    } catch (error) {
      logger.error('Surface analysis failed:', error);
      return { level: 'surface', content: 'Surface analysis unavailable', keyElements: [], complexity: 'unknown' };
    }
  }

  /**
   * Perform deep technical analysis
   */
  async analyzeTechnical(topic, agent, context) {
    const patterns = this.analysisPatterns.technical;
    const analyses = {};
    
    for (const pattern of patterns) {
      const prompt = `As a ${agent.type} expert, perform ${pattern} analysis of: "${topic}"

Focus on technical depth and specificity.
Context: ${JSON.stringify(context, null, 2)}

Provide detailed ${pattern} analysis:`;

      try {
        const response = await this.aiClient.generateResponse(
          agent.assignedModel?.id || 'gpt-4',
          prompt,
          {
            agentType: 'technical-analyst',
            maxTokens: 250,
            temperature: 0.4
          }
        );
        
        analyses[pattern] = {
          content: response.content,
          insights: this.extractInsights(response.content),
          metrics: this.extractMetrics(response.content)
        };
      } catch (error) {
        logger.error(`Technical analysis (${pattern}) failed:`, error);
        analyses[pattern] = { content: 'Analysis failed', insights: [], metrics: {} };
      }
    }
    
    return {
      level: 'technical',
      patterns: analyses,
      technicalDepth: this.calculateTechnicalDepth(analyses),
      criticalFactors: this.identifyCriticalFactors(analyses)
    };
  }

  /**
   * Analyze implications and consequences
   */
  async analyzeImplications(topic, agent, context) {
    const timeframes = ['immediate', 'short-term', 'long-term'];
    const implications = {};
    
    for (const timeframe of timeframes) {
      const prompt = `As a ${agent.type} expert, analyze ${timeframe} implications of: "${topic}"

Consider:
- Direct consequences
- Indirect effects
- Risk factors
- Opportunity areas

Provide ${timeframe} implication analysis:`;

      try {
        const response = await this.aiClient.generateResponse(
          agent.assignedModel?.id || 'gpt-4',
          prompt,
          {
            agentType: 'strategic-analyst',
            maxTokens: 200,
            temperature: 0.6
          }
        );
        
        implications[timeframe] = {
          content: response.content,
          risks: this.extractRisks(response.content),
          opportunities: this.extractOpportunities(response.content),
          criticalPath: this.identifyCriticalPath(response.content)
        };
      } catch (error) {
        logger.error(`Implication analysis (${timeframe}) failed:`, error);
        implications[timeframe] = { content: 'Analysis unavailable', risks: [], opportunities: [] };
      }
    }
    
    return {
      level: 'implications',
      timeframes: implications,
      overallRisk: this.calculateOverallRisk(implications),
      strategicValue: this.assessStrategicValue(implications)
    };
  }

  /**
   * Find connections to other concepts/systems
   */
  async findConnections(topic, agent, context) {
    // Use MCP tools for enhanced connection finding
    let webConnections = [];
    let memoryConnections = [];
    
    try {
      // Search for related concepts in web
      if (this.mcpClient) {
        const searchQuery = `${topic} related concepts systems integration`;
        const webResults = await this.mcpClient.searchWeb(searchQuery, { maxResults: 3 });
        webConnections = webResults.results?.map(r => ({
          title: r.title,
          relevance: r.snippet
        })) || [];
        
        // Check memory for previous related analyses
        const memoryResults = await this.mcpClient.retrieveMemory(topic, { limit: 5 });
        memoryConnections = memoryResults.results?.map(r => ({
          context: r.data,
          timestamp: r.timestamp
        })) || [];
      }
    } catch (error) {
      logger.error('Connection search failed:', error);
    }
    
    const prompt = `As a ${agent.type} expert, identify connections between "${topic}" and other systems/concepts.

Web connections found: ${JSON.stringify(webConnections, null, 2)}
Memory connections: ${JSON.stringify(memoryConnections, null, 2)}

Identify:
1. Direct dependencies
2. Similar systems or patterns
3. Potential integrations
4. Cross-domain applications

Provide connection analysis:`;

    try {
      const response = await this.aiClient.generateResponse(
        agent.assignedModel?.id || 'gpt-4',
        prompt,
        {
          agentType: 'systems-analyst',
          maxTokens: 250,
          temperature: 0.7
        }
      );
      
      return {
        level: 'connections',
        content: response.content,
        directConnections: this.extractDirectConnections(response.content),
        indirectConnections: this.extractIndirectConnections(response.content),
        webEnhanced: webConnections,
        memoryEnhanced: memoryConnections,
        connectionStrength: this.assessConnectionStrength(response.content)
      };
    } catch (error) {
      logger.error('Connection analysis failed:', error);
      return { level: 'connections', content: 'Connection analysis unavailable', directConnections: [], indirectConnections: [] };
    }
  }

  /**
   * Generate predictions based on analysis
   */
  async generatePredictions(topic, agent, context) {
    const predictionTypes = ['trends', 'challenges', 'opportunities', 'evolution'];
    const predictions = {};
    
    for (const type of predictionTypes) {
      const prompt = `As a ${agent.type} expert, predict ${type} for: "${topic}"

Base predictions on:
- Current state analysis
- Historical patterns
- Industry trends
- Technical constraints

Provide ${type} predictions with confidence levels:`;

      try {
        const response = await this.aiClient.generateResponse(
          agent.assignedModel?.id || 'gpt-4',
          prompt,
          {
            agentType: 'predictive-analyst',
            maxTokens: 200,
            temperature: 0.7
          }
        );
        
        predictions[type] = {
          content: response.content,
          confidence: this.extractConfidenceLevel(response.content),
          timeframe: this.extractTimeframe(response.content),
          factors: this.extractInfluencingFactors(response.content)
        };
      } catch (error) {
        logger.error(`Prediction generation (${type}) failed:`, error);
        predictions[type] = { content: 'Prediction unavailable', confidence: 0, factors: [] };
      }
    }
    
    return {
      level: 'predictions',
      types: predictions,
      overallConfidence: this.calculateAverageConfidence(predictions),
      keyPredictions: this.extractKeyPredictions(predictions)
    };
  }

  /**
   * Create reasoning chain for complex topics
   */
  async createReasoningChain(premise, agent, maxDepth = null) {
    const chainId = uuidv4();
    const depth = maxDepth || this.config.maxReasoningDepth;
    
    console.log(`      🔗 Building reasoning chain (max depth: ${depth})`);
    
    const chain = {
      id: chainId,
      premise: premise,
      steps: [],
      conclusions: [],
      validity: true
    };
    
    let currentPremise = premise;
    
    for (let i = 0; i < depth; i++) {
      const step = await this.generateReasoningStep(currentPremise, agent, i + 1);
      
      // Validate step
      const validation = await this.validateReasoningStep(step, chain.steps);
      
      if (!validation.valid) {
        console.log(`      ⚠️  Invalid reasoning at step ${i + 1}: ${validation.reason}`);
        chain.validity = false;
        break;
      }
      
      chain.steps.push({
        number: i + 1,
        premise: currentPremise,
        reasoning: step.reasoning,
        conclusion: step.conclusion,
        confidence: step.confidence,
        validation: validation
      });
      
      // Check if we've reached a terminal conclusion
      if (step.isTerminal || step.confidence < 0.5) {
        break;
      }
      
      currentPremise = step.conclusion;
    }
    
    // Generate final conclusions
    chain.conclusions = this.synthesizeConclusions(chain.steps);
    
    // Store chain for reference
    this.reasoningChains.set(chainId, chain);
    
    console.log(`      ✓ Reasoning chain complete: ${chain.steps.length} steps, validity: ${chain.validity}`);
    
    return chain;
  }

  /**
   * Generate a single reasoning step
   */
  async generateReasoningStep(premise, agent, stepNumber) {
    const prompt = `As a ${agent.type} expert, continue this reasoning chain.

Step ${stepNumber}
Current premise: "${premise}"

Apply logical reasoning to:
1. Identify what follows from this premise
2. State your reasoning clearly
3. Draw a specific conclusion
4. Assess confidence (0-1)
5. Determine if this is a terminal conclusion

Format response as JSON:
{
  "reasoning": "explanation of logical step",
  "conclusion": "what follows from the premise",
  "confidence": 0.0-1.0,
  "isTerminal": true/false,
  "assumptions": ["assumption1", "assumption2"]
}`;

    try {
      const response = await this.aiClient.generateResponse(
        agent.assignedModel?.id || 'gpt-4',
        prompt,
        {
          agentType: 'logical-reasoner',
          maxTokens: 200,
          temperature: 0.3
        }
      );
      
      try {
        return JSON.parse(response.content);
      } catch (e) {
        // Fallback parsing
        return {
          reasoning: response.content,
          conclusion: this.extractConclusion(response.content),
          confidence: 0.7,
          isTerminal: stepNumber >= 5,
          assumptions: []
        };
      }
    } catch (error) {
      logger.error('Reasoning step generation failed:', error);
      return {
        reasoning: 'Step generation failed',
        conclusion: premise,
        confidence: 0,
        isTerminal: true,
        assumptions: []
      };
    }
  }

  /**
   * Validate reasoning step for logical consistency
   */
  async validateReasoningStep(step, previousSteps) {
    // Check for circular reasoning
    for (const prevStep of previousSteps) {
      if (step.conclusion === prevStep.premise || step.conclusion === prevStep.conclusion) {
        return { valid: false, reason: 'Circular reasoning detected' };
      }
    }
    
    // Check for contradictions
    for (const prevStep of previousSteps) {
      if (this.detectContradiction(step.conclusion, prevStep.conclusion)) {
        return { valid: false, reason: 'Contradiction with previous conclusion' };
      }
    }
    
    // Check confidence threshold
    if (step.confidence < 0.3) {
      return { valid: false, reason: 'Confidence too low' };
    }
    
    // Check logical connection
    if (!this.hasLogicalConnection(step.premise, step.conclusion)) {
      return { valid: false, reason: 'No clear logical connection' };
    }
    
    return { valid: true, reason: 'Valid reasoning step' };
  }

  /**
   * Verify critical findings with external sources
   */
  async verifyFindings(findings, topic) {
    console.log(`      🔍 Verifying ${findings.length} critical findings`);
    
    const verificationResults = [];
    
    for (const finding of findings.slice(0, 3)) { // Limit to top 3 for efficiency
      try {
        // Use MCP web search for verification
        if (this.mcpClient) {
          const searchQuery = `${topic} ${finding} verification facts`;
          const results = await this.mcpClient.searchWeb(searchQuery, { maxResults: 2 });
          
          const verified = results.results?.some(r => 
            r.snippet.toLowerCase().includes(finding.toLowerCase())
          ) || false;
          
          verificationResults.push({
            finding: finding,
            verified: verified,
            sources: results.results?.map(r => r.url) || [],
            confidence: verified ? 0.8 : 0.3
          });
        }
      } catch (error) {
        logger.error(`Verification failed for finding: ${finding}`, error);
        verificationResults.push({
          finding: finding,
          verified: false,
          sources: [],
          confidence: 0.5
        });
      }
    }
    
    const overallVerification = {
      findings: verificationResults,
      verificationRate: verificationResults.filter(v => v.verified).length / verificationResults.length,
      confidence: verificationResults.reduce((sum, v) => sum + v.confidence, 0) / verificationResults.length
    };
    
    console.log(`      ✓ Verification complete: ${(overallVerification.verificationRate * 100).toFixed(0)}% verified`);
    
    return overallVerification;
  }

  /**
   * Synthesize analysis layers into coherent understanding
   */
  async synthesizeLayers(layers, topic, agent) {
    const [surface, technical, implications, connections, predictions] = layers;
    
    // Extract critical findings from all layers
    const criticalFindings = [
      ...surface.keyElements,
      ...Object.values(technical.patterns).flatMap(p => p.insights),
      ...Object.values(implications.timeframes).flatMap(t => t.risks),
      ...connections.directConnections,
      ...predictions.keyPredictions
    ].filter(f => f).slice(0, 10); // Top 10 findings
    
    // Build synthesis
    const synthesis = {
      premise: `${topic} analyzed by ${agent.type}`,
      summary: this.generateSynthesisSummary(layers),
      criticalFindings: criticalFindings,
      complexity: this.assessOverallComplexity(layers),
      confidence: this.calculateSynthesisConfidence(layers),
      recommendations: this.generateRecommendations(layers, agent),
      gaps: this.identifyKnowledgeGaps(layers)
    };
    
    return synthesis;
  }

  // Utility methods for extraction and calculation

  extractKeyElements(content) {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.slice(0, 3).map(l => l.replace(/^[-*•]\s*/, '').trim());
  }

  assessComplexity(content) {
    const complexityKeywords = {
      high: ['complex', 'intricate', 'sophisticated', 'challenging', 'difficult'],
      medium: ['moderate', 'standard', 'typical', 'manageable'],
      low: ['simple', 'straightforward', 'basic', 'elementary']
    };
    
    const contentLower = content.toLowerCase();
    
    for (const [level, keywords] of Object.entries(complexityKeywords)) {
      if (keywords.some(k => contentLower.includes(k))) {
        return level;
      }
    }
    
    return 'medium';
  }

  extractInsights(content) {
    const insightPatterns = [
      /insight[s]?:\s*([^.]+)/gi,
      /finding[s]?:\s*([^.]+)/gi,
      /discovered?\s+that\s+([^.]+)/gi,
      /reveals?\s+([^.]+)/gi
    ];
    
    const insights = [];
    for (const pattern of insightPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        insights.push(match[1].trim());
      }
    }
    
    return insights.slice(0, 5);
  }

  extractMetrics(content) {
    const metrics = {};
    const metricPatterns = [
      /(\d+(?:\.\d+)?)\s*(%|percent|ms|seconds?|minutes?|hours?|days?)/gi,
      /(\w+):\s*(\d+(?:\.\d+)?)/gi
    ];
    
    for (const pattern of metricPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[2]) {
          metrics[match[1] || 'value'] = match[2];
        }
      }
    }
    
    return metrics;
  }

  calculateTechnicalDepth(analyses) {
    const depths = Object.values(analyses).map(a => {
      const insightCount = a.insights?.length || 0;
      const metricCount = Object.keys(a.metrics || {}).length;
      return (insightCount * 2 + metricCount) / 3;
    });
    
    return Math.min(depths.reduce((a, b) => a + b, 0) / depths.length, 10);
  }

  identifyCriticalFactors(analyses) {
    const factors = [];
    
    for (const [pattern, analysis] of Object.entries(analyses)) {
      if (analysis.insights && analysis.insights.length > 0) {
        factors.push({
          pattern: pattern,
          factor: analysis.insights[0],
          importance: 'high'
        });
      }
    }
    
    return factors.slice(0, 5);
  }

  extractRisks(content) {
    const riskKeywords = ['risk', 'danger', 'threat', 'vulnerability', 'weakness', 'concern'];
    const sentences = content.split(/[.!?]/).filter(s => s.trim());
    
    return sentences
      .filter(s => riskKeywords.some(k => s.toLowerCase().includes(k)))
      .map(s => s.trim())
      .slice(0, 3);
  }

  extractOpportunities(content) {
    const opportunityKeywords = ['opportunity', 'potential', 'advantage', 'benefit', 'improvement'];
    const sentences = content.split(/[.!?]/).filter(s => s.trim());
    
    return sentences
      .filter(s => opportunityKeywords.some(k => s.toLowerCase().includes(k)))
      .map(s => s.trim())
      .slice(0, 3);
  }

  identifyCriticalPath(content) {
    // Simple extraction of sequential steps mentioned
    const stepPatterns = [
      /first[,\s]+([^.]+)/i,
      /then[,\s]+([^.]+)/i,
      /finally[,\s]+([^.]+)/i,
      /step\s+\d+[:\s]+([^.]+)/gi
    ];
    
    const steps = [];
    for (const pattern of stepPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        steps.push(match[1].trim());
      }
    }
    
    return steps;
  }

  calculateOverallRisk(implications) {
    const riskCounts = Object.values(implications)
      .map(i => i.risks?.length || 0)
      .reduce((a, b) => a + b, 0);
    
    if (riskCounts > 10) return 'high';
    if (riskCounts > 5) return 'medium';
    return 'low';
  }

  assessStrategicValue(implications) {
    const opportunityCounts = Object.values(implications)
      .map(i => i.opportunities?.length || 0)
      .reduce((a, b) => a + b, 0);
    
    if (opportunityCounts > 10) return 'high';
    if (opportunityCounts > 5) return 'medium';
    return 'low';
  }

  extractDirectConnections(content) {
    const connectionPatterns = [
      /directly (?:connected|related|linked) to ([^,.]+)/gi,
      /depends on ([^,.]+)/gi,
      /integrates with ([^,.]+)/gi
    ];
    
    const connections = [];
    for (const pattern of connectionPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        connections.push(match[1].trim());
      }
    }
    
    return connections;
  }

  extractIndirectConnections(content) {
    const connectionPatterns = [
      /indirectly (?:connected|related|linked) to ([^,.]+)/gi,
      /similar to ([^,.]+)/gi,
      /resembles ([^,.]+)/gi
    ];
    
    const connections = [];
    for (const pattern of connectionPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        connections.push(match[1].trim());
      }
    }
    
    return connections;
  }

  assessConnectionStrength(content) {
    const strongWords = ['strongly', 'directly', 'tightly', 'closely'];
    const weakWords = ['loosely', 'indirectly', 'somewhat', 'partially'];
    
    const contentLower = content.toLowerCase();
    const strongCount = strongWords.filter(w => contentLower.includes(w)).length;
    const weakCount = weakWords.filter(w => contentLower.includes(w)).length;
    
    if (strongCount > weakCount) return 'strong';
    if (weakCount > strongCount) return 'weak';
    return 'moderate';
  }

  extractConfidenceLevel(content) {
    const match = content.match(/confidence[:\s]+(\d+(?:\.\d+)?)/i);
    if (match) {
      return parseFloat(match[1]);
    }
    
    // Estimate from language
    if (content.includes('highly likely') || content.includes('certain')) return 0.9;
    if (content.includes('probable') || content.includes('likely')) return 0.7;
    if (content.includes('possible') || content.includes('may')) return 0.5;
    if (content.includes('unlikely') || content.includes('doubtful')) return 0.3;
    
    return 0.6; // Default moderate confidence
  }

  extractTimeframe(content) {
    const timePatterns = [
      /(\d+)\s*(days?|weeks?|months?|years?)/i,
      /(short|medium|long)[\s-]?term/i,
      /(immediate|soon|future|eventual)/i
    ];
    
    for (const pattern of timePatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return 'unspecified';
  }

  extractInfluencingFactors(content) {
    const factorPatterns = [
      /factors?[:\s]+([^.]+)/i,
      /influenced by[:\s]+([^.]+)/i,
      /depends on[:\s]+([^.]+)/i
    ];
    
    const factors = [];
    for (const pattern of factorPatterns) {
      const match = content.match(pattern);
      if (match) {
        factors.push(...match[1].split(/[,;]/).map(f => f.trim()));
      }
    }
    
    return factors;
  }

  calculateAverageConfidence(predictions) {
    const confidences = Object.values(predictions)
      .map(p => p.confidence || 0.5)
      .filter(c => c > 0);
    
    if (confidences.length === 0) return 0.5;
    
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  extractKeyPredictions(predictions) {
    const keyPredictions = [];
    
    for (const [type, prediction] of Object.entries(predictions)) {
      if (prediction.confidence > 0.7 && prediction.content) {
        keyPredictions.push({
          type: type,
          prediction: prediction.content.substring(0, 100),
          confidence: prediction.confidence
        });
      }
    }
    
    return keyPredictions.slice(0, 5);
  }

  extractConclusion(content) {
    const conclusionPatterns = [
      /therefore[,\s]+([^.]+)/i,
      /conclude[s]? that[:\s]+([^.]+)/i,
      /result[s]? in[:\s]+([^.]+)/i,
      /leads? to[:\s]+([^.]+)/i
    ];
    
    for (const pattern of conclusionPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Return last sentence as fallback
    const sentences = content.split(/[.!?]/).filter(s => s.trim());
    return sentences[sentences.length - 1]?.trim() || content;
  }

  detectContradiction(statement1, statement2) {
    // Simple contradiction detection
    const negations = ['not', 'no', 'never', 'none', 'neither'];
    
    const words1 = statement1.toLowerCase().split(/\s+/);
    const words2 = statement2.toLowerCase().split(/\s+/);
    
    // Check if one negates the other
    for (const negation of negations) {
      if (words1.includes(negation) && !words2.includes(negation)) {
        // Check for same key terms
        const overlap = words1.filter(w => words2.includes(w) && w.length > 3);
        if (overlap.length > 2) return true;
      }
    }
    
    return false;
  }

  hasLogicalConnection(premise, conclusion) {
    // Check if conclusion shares key terms with premise
    const premiseWords = new Set(premise.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const conclusionWords = new Set(conclusion.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    
    const intersection = new Set([...premiseWords].filter(x => conclusionWords.has(x)));
    
    return intersection.size >= 2; // At least 2 shared key terms
  }

  synthesizeConclusions(steps) {
    const conclusions = steps
      .filter(s => s.confidence > 0.5)
      .map(s => s.conclusion);
    
    // Remove duplicates and return
    return [...new Set(conclusions)];
  }

  generateSynthesisSummary(layers) {
    const components = [];
    
    if (layers[0]?.complexity) {
      components.push(`Complexity: ${layers[0].complexity}`);
    }
    
    if (layers[1]?.technicalDepth) {
      components.push(`Technical depth: ${layers[1].technicalDepth.toFixed(1)}/10`);
    }
    
    if (layers[2]?.overallRisk) {
      components.push(`Risk level: ${layers[2].overallRisk}`);
    }
    
    if (layers[3]?.connectionStrength) {
      components.push(`Connections: ${layers[3].connectionStrength}`);
    }
    
    if (layers[4]?.overallConfidence) {
      components.push(`Prediction confidence: ${(layers[4].overallConfidence * 100).toFixed(0)}%`);
    }
    
    return components.join(', ');
  }

  assessOverallComplexity(layers) {
    const complexityScores = {
      'high': 3,
      'medium': 2,
      'low': 1,
      'unknown': 2
    };
    
    const scores = [];
    
    if (layers[0]?.complexity) {
      scores.push(complexityScores[layers[0].complexity] || 2);
    }
    
    if (layers[1]?.technicalDepth) {
      scores.push(layers[1].technicalDepth / 3.33); // Convert to 1-3 scale
    }
    
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    if (avgScore > 2.5) return 'high';
    if (avgScore > 1.5) return 'medium';
    return 'low';
  }

  calculateSynthesisConfidence(layers) {
    const confidences = [];
    
    // Collect all confidence values
    if (layers[4]?.overallConfidence) {
      confidences.push(layers[4].overallConfidence);
    }
    
    // Add reasoning chain validity as confidence factor
    if (layers.reasoningChain?.validity) {
      confidences.push(0.8);
    }
    
    // Add verification confidence if available
    if (layers.verification?.confidence) {
      confidences.push(layers.verification.confidence);
    }
    
    if (confidences.length === 0) return 0.6;
    
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  generateRecommendations(layers, agent) {
    const recommendations = [];
    
    // Based on complexity
    if (layers[0]?.complexity === 'high') {
      recommendations.push('Break down into smaller components for manageable implementation');
    }
    
    // Based on risks
    if (layers[2]?.overallRisk === 'high') {
      recommendations.push('Implement comprehensive risk mitigation strategies');
    }
    
    // Based on opportunities
    if (layers[2]?.strategicValue === 'high') {
      recommendations.push('Prioritize implementation to capture strategic value');
    }
    
    // Based on connections
    if (layers[3]?.connectionStrength === 'strong') {
      recommendations.push('Leverage existing connections for faster integration');
    }
    
    // Based on predictions
    if (layers[4]?.overallConfidence > 0.7) {
      recommendations.push('Proceed with confidence based on positive predictions');
    }
    
    return recommendations;
  }

  identifyKnowledgeGaps(layers) {
    const gaps = [];
    
    // Check for missing analysis areas
    if (!layers[0]?.keyElements || layers[0].keyElements.length === 0) {
      gaps.push('Surface level understanding incomplete');
    }
    
    if (!layers[1]?.patterns || Object.keys(layers[1].patterns).length < 3) {
      gaps.push('Technical analysis incomplete');
    }
    
    if (!layers[3]?.webEnhanced || layers[3].webEnhanced.length === 0) {
      gaps.push('External verification needed');
    }
    
    if (!layers[4]?.types || Object.keys(layers[4].types).length < 3) {
      gaps.push('Predictive analysis incomplete');
    }
    
    return gaps;
  }

  calculateConfidence(layers, verificationStatus) {
    let confidence = 0.5; // Base confidence
    
    // Add confidence from each layer
    if (layers[0]?.complexity && layers[0].complexity !== 'unknown') {
      confidence += 0.1;
    }
    
    if (layers[1]?.technicalDepth > 5) {
      confidence += 0.15;
    }
    
    if (layers[4]?.overallConfidence > 0.6) {
      confidence += 0.15;
    }
    
    // Verification bonus
    if (verificationStatus?.verificationRate > 0.5) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  getFallbackAnalysis(topic, agent) {
    return {
      id: uuidv4(),
      topic: topic,
      agent: agent.type,
      timestamp: Date.now(),
      layers: {
        surface: { level: 'surface', content: 'Analysis unavailable', keyElements: [], complexity: 'unknown' },
        technical: { level: 'technical', patterns: {}, technicalDepth: 0, criticalFactors: [] },
        implications: { level: 'implications', timeframes: {}, overallRisk: 'unknown', strategicValue: 'unknown' },
        connections: { level: 'connections', content: 'Analysis unavailable', directConnections: [], indirectConnections: [] },
        predictions: { level: 'predictions', types: {}, overallConfidence: 0, keyPredictions: [] }
      },
      synthesis: {
        premise: topic,
        summary: 'Analysis failed - using fallback',
        criticalFindings: [],
        complexity: 'unknown',
        confidence: 0.1,
        recommendations: ['Retry analysis with different parameters'],
        gaps: ['Complete analysis unavailable']
      },
      reasoningChain: { steps: [], conclusions: [], validity: false },
      verification: null,
      confidence: 0.1
    };
  }
}

export default DeepAnalysisEngine;