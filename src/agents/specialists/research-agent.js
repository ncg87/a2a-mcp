import { BaseAgent } from '../../core/base-agent.js';
import logger from '../../utils/logger.js';
import axios from 'axios';

export class ResearchAgent extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      type: 'research',
      capabilities: ['information-gathering', 'web-search', 'documentation-analysis', 'data-mining']
    });
  }

  async processTask(task) {
    logger.info(`Research agent ${this.id} processing task: ${task.description}`);
    
    try {
      switch (task.subtype || task.type) {
        case 'web-search':
          return await this.performWebSearch(task);
        case 'documentation':
          return await this.analyzeDocumentation(task);
        case 'api-research':
          return await this.researchAPI(task);
        case 'technology-research':
          return await this.researchTechnology(task);
        case 'market-research':
          return await this.performMarketResearch(task);
        default:
          return await this.performGeneralResearch(task);
      }
    } catch (error) {
      logger.error(`Research agent ${this.id} failed to process task:`, error);
      throw error;
    }
  }

  async performWebSearch(task) {
    logger.info(`Performing web search: ${task.query || task.description}`);
    
    const searchResults = await this.executeWebSearch(task.query || task.description);
    const analyzedResults = await this.analyzeSearchResults(searchResults);
    const summary = await this.summarizeFindings(analyzedResults);
    
    return {
      type: 'web-search',
      query: task.query || task.description,
      resultsCount: searchResults.length,
      results: analyzedResults,
      summary,
      sources: searchResults.map(r => r.url),
      reliability: this.assessReliability(searchResults),
      status: 'completed'
    };
  }

  async executeWebSearch(query) {
    try {
      // Mock web search - in practice, this would use a real search API
      const mockResults = [
        {
          title: `Best practices for ${query}`,
          url: `https://example.com/best-practices-${query.replace(/\s+/g, '-')}`,
          snippet: `Comprehensive guide covering the latest approaches to ${query}`,
          relevance: 0.95
        },
        {
          title: `${query} - Documentation`,
          url: `https://docs.example.com/${query.replace(/\s+/g, '-')}`,
          snippet: `Official documentation and API reference for ${query}`,
          relevance: 0.90
        },
        {
          title: `Tutorial: Getting started with ${query}`,
          url: `https://tutorial.example.com/${query.replace(/\s+/g, '-')}`,
          snippet: `Step-by-step tutorial for beginners learning ${query}`,
          relevance: 0.85
        }
      ];
      
      return mockResults;
    } catch (error) {
      logger.error('Web search failed:', error);
      return [];
    }
  }

  async analyzeSearchResults(results) {
    return await Promise.all(results.map(async (result) => {
      const content = await this.fetchContent(result.url);
      const analysis = await this.analyzeContent(content);
      
      return {
        ...result,
        content: content.substring(0, 1000), // Truncate for storage
        keyPoints: analysis.keyPoints,
        sentiment: analysis.sentiment,
        credibility: analysis.credibility
      };
    }));
  }

  async fetchContent(url) {
    try {
      // Use web API MCP server if available
      const response = await this.invokeMCPTool('web-api-mcp', 'http-get', { url });
      return response.data || `Mock content for ${url}`;
    } catch (error) {
      logger.debug(`Failed to fetch content from ${url}:`, error);
      return `Mock content for ${url}`;
    }
  }

  async analyzeContent(content) {
    // Simple content analysis - in practice, would use NLP/AI
    const words = content.toLowerCase().split(/\s+/);
    
    const keyPoints = this.extractKeyPoints(content);
    const sentiment = this.analyzeSentiment(words);
    const credibility = this.assessCredibility(content);
    
    return {
      keyPoints,
      sentiment,
      credibility,
      wordCount: words.length
    };
  }

  extractKeyPoints(content) {
    // Simple keyword extraction
    const keywords = content.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4)
      .slice(0, 10);
    
    return keywords.map(keyword => ({
      keyword,
      importance: Math.random() // Mock importance score
    }));
  }

  analyzeSentiment(words) {
    const positiveWords = ['good', 'great', 'excellent', 'best', 'amazing', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'horrible', 'poor'];
    
    const positive = words.filter(word => positiveWords.includes(word)).length;
    const negative = words.filter(word => negativeWords.includes(word)).length;
    
    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  assessCredibility(content) {
    // Simple credibility assessment
    const indicators = {
      hasReferences: content.includes('reference') || content.includes('citation'),
      hasAuthority: content.includes('expert') || content.includes('research'),
      isRecent: content.includes('2023') || content.includes('2024'),
      hasDetail: content.length > 1000
    };
    
    const score = Object.values(indicators).filter(Boolean).length / Object.keys(indicators).length;
    
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  async summarizeFindings(results) {
    const totalResults = results.length;
    const highCredibility = results.filter(r => r.credibility === 'high').length;
    const commonKeywords = this.findCommonKeywords(results);
    
    return {
      totalSources: totalResults,
      highCredibilitySources: highCredibility,
      commonThemes: commonKeywords,
      overallSentiment: this.calculateOverallSentiment(results),
      recommendation: this.generateRecommendation(results)
    };
  }

  findCommonKeywords(results) {
    const keywordCounts = new Map();
    
    results.forEach(result => {
      result.keyPoints?.forEach(point => {
        const count = keywordCounts.get(point.keyword) || 0;
        keywordCounts.set(point.keyword, count + 1);
      });
    });
    
    return Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword, count]) => ({ keyword, frequency: count }));
  }

  calculateOverallSentiment(results) {
    const sentiments = results.map(r => r.sentiment);
    const counts = {
      positive: sentiments.filter(s => s === 'positive').length,
      negative: sentiments.filter(s => s === 'negative').length,
      neutral: sentiments.filter(s => s === 'neutral').length
    };
    
    const max = Math.max(...Object.values(counts));
    return Object.keys(counts).find(key => counts[key] === max);
  }

  generateRecommendation(results) {
    const highCredResults = results.filter(r => r.credibility === 'high');
    
    if (highCredResults.length >= results.length * 0.7) {
      return 'Strong consensus found across high-credibility sources';
    } else if (highCredResults.length > 0) {
      return 'Mixed findings - recommend focusing on high-credibility sources';
    } else {
      return 'Limited high-credibility sources - additional research recommended';
    }
  }

  assessReliability(results) {
    const totalResults = results.length;
    if (totalResults === 0) return 'none';
    
    const avgRelevance = results.reduce((sum, r) => sum + r.relevance, 0) / totalResults;
    
    if (avgRelevance >= 0.8) return 'high';
    if (avgRelevance >= 0.6) return 'medium';
    return 'low';
  }

  async analyzeDocumentation(task) {
    logger.info(`Analyzing documentation: ${task.target || task.description}`);
    
    // Get documentation files using file system MCP
    const docFiles = await this.invokeMCPTool('file-system-mcp', 'search', {
      pattern: '*.md|*.txt|*.rst|*.doc|README*',
      directory: task.directory || '.'
    }).catch(() => ({ files: [] }));
    
    const analysis = await this.analyzeDocumentationFiles(docFiles.files || []);
    
    return {
      type: 'documentation-analysis',
      target: task.target || task.description,
      filesAnalyzed: (docFiles.files || []).length,
      analysis,
      status: 'completed'
    };
  }

  async analyzeDocumentationFiles(files) {
    const fileAnalyses = [];
    
    for (const file of files.slice(0, 10)) { // Limit to first 10 files
      try {
        const content = await this.invokeMCPTool('file-system-mcp', 'read', { path: file });
        const analysis = await this.analyzeDocumentContent(content.content || '');
        
        fileAnalyses.push({
          file,
          ...analysis
        });
      } catch (error) {
        logger.debug(`Failed to analyze file ${file}:`, error);
      }
    }
    
    return {
      files: fileAnalyses,
      summary: this.summarizeDocumentationAnalysis(fileAnalyses)
    };
  }

  async analyzeDocumentContent(content) {
    const structure = this.analyzeDocumentStructure(content);
    const completeness = this.assessDocumentCompleteness(content);
    const quality = this.assessDocumentQuality(content);
    
    return {
      structure,
      completeness,
      quality,
      wordCount: content.split(/\s+/).length
    };
  }

  analyzeDocumentStructure(content) {
    const lines = content.split('\n');
    const headers = lines.filter(line => line.startsWith('#') || line.match(/^={3,}$|^-{3,}$/));
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
    const links = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
    
    return {
      headers: headers.length,
      codeBlocks,
      links,
      hasTableOfContents: content.toLowerCase().includes('table of contents') || content.toLowerCase().includes('toc')
    };
  }

  assessDocumentCompleteness(content) {
    const sections = {
      hasIntroduction: /introduction|overview|about/i.test(content),
      hasInstallation: /install|setup|getting started/i.test(content),
      hasUsage: /usage|how to|example/i.test(content),
      hasAPI: /api|reference|methods/i.test(content),
      hasTroubleshooting: /troubleshoot|faq|issues/i.test(content)
    };
    
    const completeness = Object.values(sections).filter(Boolean).length / Object.keys(sections).length;
    
    return {
      ...sections,
      score: completeness,
      level: completeness >= 0.8 ? 'comprehensive' : completeness >= 0.5 ? 'adequate' : 'basic'
    };
  }

  assessDocumentQuality(content) {
    const indicators = {
      hasExamples: /example|demo|sample/i.test(content),
      hasImages: /!\[.*?\]|<img/i.test(content),
      isWellFormatted: content.includes('```') || content.includes('`'),
      hasRecentUpdates: /2023|2024|updated|revised/i.test(content),
      isDetailed: content.length > 2000
    };
    
    const quality = Object.values(indicators).filter(Boolean).length / Object.keys(indicators).length;
    
    return {
      ...indicators,
      score: quality,
      level: quality >= 0.8 ? 'excellent' : quality >= 0.5 ? 'good' : 'needs_improvement'
    };
  }

  summarizeDocumentationAnalysis(fileAnalyses) {
    const avgQuality = fileAnalyses.reduce((sum, f) => sum + f.quality.score, 0) / fileAnalyses.length;
    const avgCompleteness = fileAnalyses.reduce((sum, f) => sum + f.completeness.score, 0) / fileAnalyses.length;
    
    return {
      overallQuality: avgQuality >= 0.8 ? 'excellent' : avgQuality >= 0.5 ? 'good' : 'needs_improvement',
      overallCompleteness: avgCompleteness >= 0.8 ? 'comprehensive' : avgCompleteness >= 0.5 ? 'adequate' : 'basic',
      recommendations: this.generateDocumentationRecommendations(fileAnalyses)
    };
  }

  generateDocumentationRecommendations(fileAnalyses) {
    const recommendations = [];
    
    const lowQuality = fileAnalyses.filter(f => f.quality.score < 0.5);
    if (lowQuality.length > 0) {
      recommendations.push('Improve documentation quality by adding more examples and better formatting');
    }
    
    const incomplete = fileAnalyses.filter(f => f.completeness.score < 0.5);
    if (incomplete.length > 0) {
      recommendations.push('Add missing sections such as installation, usage examples, and troubleshooting');
    }
    
    const noImages = fileAnalyses.filter(f => !f.quality.hasImages);
    if (noImages.length > fileAnalyses.length * 0.7) {
      recommendations.push('Consider adding diagrams and screenshots to improve clarity');
    }
    
    return recommendations;
  }

  async researchAPI(task) {
    logger.info(`Researching API: ${task.apiUrl || task.description}`);
    
    const apiInfo = await this.gatherAPIInformation(task.apiUrl);
    const documentation = await this.analyzeAPIDocumentation(task.apiUrl);
    const capabilities = await this.assessAPICapabilities(apiInfo);
    
    return {
      type: 'api-research',
      apiUrl: task.apiUrl,
      information: apiInfo,
      documentation,
      capabilities,
      status: 'completed'
    };
  }

  async gatherAPIInformation(apiUrl) {
    try {
      // Try to fetch API info
      const response = await this.invokeMCPTool('web-api-mcp', 'http-get', { 
        url: `${apiUrl}/info` 
      }).catch(() => null);
      
      return response || {
        name: 'Unknown API',
        version: 'Unknown',
        description: 'No API information available'
      };
    } catch (error) {
      return {
        name: 'Unknown API',
        version: 'Unknown',
        description: 'Failed to fetch API information',
        error: error.message
      };
    }
  }

  async analyzeAPIDocumentation(apiUrl) {
    // This would typically fetch and analyze API documentation
    return {
      hasDocumentation: true,
      quality: 'good',
      hasExamples: true,
      hasAuthentication: true,
      endpoints: [
        { path: '/users', methods: ['GET', 'POST'] },
        { path: '/users/{id}', methods: ['GET', 'PUT', 'DELETE'] }
      ]
    };
  }

  async assessAPICapabilities(apiInfo) {
    return {
      restful: true,
      authentication: ['Bearer Token', 'API Key'],
      rateLimiting: true,
      versioning: true,
      reliability: 'high'
    };
  }

  async researchTechnology(task) {
    logger.info(`Researching technology: ${task.technology || task.description}`);
    
    const searchResults = await this.executeWebSearch(task.technology || task.description);
    const techAnalysis = await this.analyzeTechnologyInfo(searchResults);
    const recommendations = await this.generateTechnologyRecommendations(techAnalysis);
    
    return {
      type: 'technology-research',
      technology: task.technology || task.description,
      analysis: techAnalysis,
      recommendations,
      status: 'completed'
    };
  }

  async analyzeTechnologyInfo(searchResults) {
    return {
      popularity: 'high', // Would be calculated from search results
      maturity: 'stable',
      learningCurve: 'moderate',
      communitySupport: 'excellent',
      lastUpdated: '2024',
      pros: ['High performance', 'Active community', 'Good documentation'],
      cons: ['Learning curve', 'Resource intensive']
    };
  }

  async generateTechnologyRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.popularity === 'high') {
      recommendations.push('Technology has strong adoption - good choice for production use');
    }
    
    if (analysis.communitySupport === 'excellent') {
      recommendations.push('Strong community support available for troubleshooting');
    }
    
    if (analysis.learningCurve === 'steep') {
      recommendations.push('Consider additional training time for team members');
    }
    
    return recommendations;
  }

  async performMarketResearch(task) {
    logger.info(`Performing market research: ${task.market || task.description}`);
    
    // This would involve comprehensive market analysis
    return {
      type: 'market-research',
      market: task.market || task.description,
      marketSize: '$10B',
      growthRate: '15% YoY',
      keyPlayers: ['Company A', 'Company B', 'Company C'],
      trends: ['Trend 1', 'Trend 2', 'Trend 3'],
      opportunities: ['Opportunity 1', 'Opportunity 2'],
      threats: ['Threat 1', 'Threat 2'],
      status: 'completed'
    };
  }

  async performGeneralResearch(task) {
    logger.info(`Performing general research: ${task.description}`);
    
    const searchResults = await this.executeWebSearch(task.description);
    const analysis = await this.analyzeSearchResults(searchResults);
    const summary = await this.summarizeFindings(analysis);
    
    return {
      type: 'general-research',
      topic: task.description,
      sources: searchResults.length,
      findings: analysis,
      summary,
      status: 'completed'
    };
  }
}

export default ResearchAgent;