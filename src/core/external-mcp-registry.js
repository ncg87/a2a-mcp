import logger from '../utils/logger.js';
import axios from 'axios';

/**
 * External MCP Registry
 * 
 * Manages connections to external MCP servers from the internet,
 * including public MCP servers and third-party services.
 */
export class ExternalMCPRegistry {
  constructor() {
    this.registry = new Map();
    this.publicServers = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    logger.info('Initializing External MCP Registry...');
    
    // Load public MCP servers
    await this.loadPublicMCPServers();
    
    // Load community MCP servers
    await this.loadCommunityMCPServers();
    
    this.initialized = true;
    logger.info(`External MCP Registry initialized with ${this.registry.size} servers`);
  }

  async loadPublicMCPServers() {
    // These would be real public MCP servers available on the internet
    const publicServers = [
      // AI/ML Services
      {
        id: 'openai-mcp',
        name: 'OpenAI MCP Server',
        type: 'ai-service',
        category: 'ai',
        endpoint: 'https://api.openai.com/v1',
        tools: [
          'generate-text',
          'generate-code', 
          'analyze-text',
          'create-embedding',
          'moderate-content'
        ],
        capabilities: ['text-generation', 'code-generation', 'analysis'],
        auth: {
          type: 'bearer-token',
          envVar: 'OPENAI_API_KEY'
        },
        rateLimit: {
          requests: 100,
          window: 60000 // 1 minute
        },
        cost: 'paid',
        documentation: 'https://platform.openai.com/docs',
        status: 'active'
      },
      
      {
        id: 'anthropic-mcp',
        name: 'Anthropic Claude MCP',
        type: 'ai-service',
        category: 'ai',
        endpoint: 'https://api.anthropic.com/v1',
        tools: [
          'generate-text',
          'analyze-document',
          'code-review',
          'reasoning'
        ],
        capabilities: ['text-generation', 'analysis', 'reasoning'],
        auth: {
          type: 'api-key',
          envVar: 'ANTHROPIC_API_KEY'
        },
        cost: 'paid',
        status: 'active'
      },

      // Web Browsing & Automation
      {
        id: 'playwright-mcp',
        name: 'Playwright Web Browser MCP',
        type: 'web-automation',
        category: 'browsing',
        endpoint: 'mcp://playwright-server',
        tools: [
          'browse-web',
          'search-web',
          'extract-content',
          'take-screenshot',
          'fill-forms',
          'click-elements',
          'navigate-pages',
          'scrape-data',
          'monitor-changes',
          'test-websites'
        ],
        capabilities: ['web-browsing', 'web-scraping', 'automation', 'testing'],
        auth: { type: 'none' },
        cost: 'free',
        status: 'active',
        priority: 'high'
      },

      // Sequential Thinking & Reasoning
      {
        id: 'sequential-thinking-mcp',
        name: 'Sequential Thinking MCP',
        type: 'reasoning',
        category: 'thinking',
        endpoint: 'mcp://sequential-thinking',
        tools: [
          'structured-thinking',
          'step-by-step-analysis',
          'logical-reasoning',
          'problem-decomposition',
          'decision-trees',
          'causal-analysis',
          'systematic-evaluation',
          'chain-of-thought'
        ],
        capabilities: ['structured-reasoning', 'problem-solving', 'analysis'],
        auth: { type: 'none' },
        cost: 'free',
        status: 'active',
        priority: 'high'
      },

      // Memory & Context Management
      {
        id: 'memory-mcp',
        name: 'Persistent Memory MCP',
        type: 'memory',
        category: 'storage',
        endpoint: 'mcp://memory-server',
        tools: [
          'store-context',
          'retrieve-context',
          'search-memory',
          'update-knowledge',
          'create-associations',
          'temporal-memory',
          'semantic-search'
        ],
        capabilities: ['persistent-memory', 'knowledge-management', 'context-retention'],
        auth: { type: 'none' },
        cost: 'free',
        status: 'active',
        priority: 'high'
      },

      // Development Tools
      {
        id: 'github-mcp',
        name: 'GitHub MCP Server',
        type: 'version-control',
        category: 'development',
        endpoint: 'https://api.github.com',
        tools: [
          'create-repository',
          'commit-code',
          'create-pull-request',
          'manage-issues',
          'search-code',
          'get-user-info',
          'manage-webhooks'
        ],
        capabilities: ['version-control', 'collaboration', 'project-management'],
        auth: {
          type: 'bearer-token',
          envVar: 'GITHUB_TOKEN'
        },
        rateLimit: {
          requests: 5000,
          window: 3600000 // 1 hour
        },
        cost: 'free',
        documentation: 'https://docs.github.com/en/rest',
        status: 'active'
      },

      {
        id: 'docker-hub-mcp',
        name: 'Docker Hub MCP',
        type: 'container-registry',
        category: 'devops',
        endpoint: 'https://hub.docker.com/v2',
        tools: [
          'search-images',
          'pull-image',
          'push-image',
          'manage-repositories',
          'get-tags'
        ],
        capabilities: ['containerization', 'deployment'],
        auth: {
          type: 'basic',
          envVar: 'DOCKER_HUB_TOKEN'
        },
        cost: 'freemium',
        status: 'active'
      },

      // Data & Analytics
      {
        id: 'kaggle-mcp',
        name: 'Kaggle MCP Server',
        type: 'data-platform',
        category: 'data-science',
        endpoint: 'https://www.kaggle.com/api/v1',
        tools: [
          'search-datasets',
          'download-dataset',
          'submit-competition',
          'get-leaderboard',
          'manage-kernels'
        ],
        capabilities: ['data-access', 'machine-learning', 'competitions'],
        auth: {
          type: 'api-key',
          envVar: 'KAGGLE_KEY'
        },
        cost: 'free',
        status: 'active'
      },

      {
        id: 'alpha-vantage-mcp',
        name: 'Alpha Vantage Financial MCP',
        type: 'financial-data',
        category: 'finance',
        endpoint: 'https://www.alphavantage.co/query',
        tools: [
          'get-stock-price',
          'get-forex-rate',
          'get-crypto-price',
          'technical-indicators',
          'company-overview'
        ],
        capabilities: ['market-data', 'financial-analysis'],
        auth: {
          type: 'api-key',
          envVar: 'ALPHA_VANTAGE_API_KEY'
        },
        rateLimit: {
          requests: 5,
          window: 60000 // 1 minute (free tier)
        },
        cost: 'freemium',
        status: 'active'
      },

      // Communication & Social
      {
        id: 'slack-mcp',
        name: 'Slack MCP Server',
        type: 'communication',
        category: 'communication',
        endpoint: 'https://slack.com/api',
        tools: [
          'send-message',
          'create-channel',
          'manage-users',
          'upload-file',
          'schedule-message',
          'get-conversations'
        ],
        capabilities: ['messaging', 'team-collaboration'],
        auth: {
          type: 'oauth',
          envVar: 'SLACK_BOT_TOKEN'
        },
        cost: 'freemium',
        status: 'active'
      },

      {
        id: 'discord-mcp',
        name: 'Discord MCP Server',
        type: 'communication',
        category: 'communication',
        endpoint: 'https://discord.com/api/v10',
        tools: [
          'send-message',
          'manage-guilds',
          'create-webhook',
          'manage-roles',
          'moderate-content'
        ],
        capabilities: ['messaging', 'community-management'],
        auth: {
          type: 'bot-token',
          envVar: 'DISCORD_BOT_TOKEN'
        },
        cost: 'free',
        status: 'active'
      },

      // Cloud Services
      {
        id: 'aws-lambda-mcp',
        name: 'AWS Lambda MCP',
        type: 'serverless',
        category: 'cloud',
        endpoint: 'https://lambda.us-east-1.amazonaws.com',
        tools: [
          'invoke-function',
          'create-function',
          'update-function-code',
          'manage-triggers',
          'get-logs'
        ],
        capabilities: ['serverless-computing', 'cloud-functions'],
        auth: {
          type: 'aws-credentials',
          envVar: 'AWS_ACCESS_KEY_ID'
        },
        cost: 'pay-per-use',
        status: 'active'
      },

      // Utility Services
      {
        id: 'weather-mcp',
        name: 'OpenWeather MCP',
        type: 'weather-data',
        category: 'utilities',
        endpoint: 'https://api.openweathermap.org/data/2.5',
        tools: [
          'current-weather',
          'weather-forecast',
          'weather-history',
          'weather-alerts',
          'air-pollution'
        ],
        capabilities: ['weather-data', 'environmental-monitoring'],
        auth: {
          type: 'api-key',
          envVar: 'OPENWEATHER_API_KEY'
        },
        rateLimit: {
          requests: 1000,
          window: 86400000 // 24 hours
        },
        cost: 'freemium',
        status: 'active'
      }
    ];

    publicServers.forEach(server => {
      this.registry.set(server.id, server);
      this.publicServers.set(server.id, server);
    });

    logger.info(`Loaded ${publicServers.length} public MCP servers`);
  }

  async loadCommunityMCPServers() {
    // Essential MCP servers for autonomous agents
    const communityServers = [
      // File System Operations
      {
        id: 'filesystem-mcp',
        name: 'File System MCP',
        type: 'file-operations',
        category: 'system',
        endpoint: 'mcp://filesystem',
        tools: [
          'read-file',
          'write-file',
          'list-directory',
          'create-directory',
          'delete-file',
          'move-file',
          'search-files',
          'get-file-info'
        ],
        capabilities: ['file-management', 'data-persistence', 'system-access'],
        auth: { type: 'none' },
        cost: 'free',
        status: 'active',
        priority: 'high'
      },

      // Code Execution & Development
      {
        id: 'code-execution-mcp',
        name: 'Code Execution MCP',
        type: 'code-runner',
        category: 'development',
        endpoint: 'mcp://code-executor',
        tools: [
          'execute-python',
          'execute-javascript',
          'execute-bash',
          'install-packages',
          'run-tests',
          'lint-code',
          'format-code',
          'compile-code'
        ],
        capabilities: ['code-execution', 'testing', 'development'],
        auth: { type: 'none' },
        cost: 'free',
        status: 'active',
        priority: 'high'
      },

      // Database Operations
      {
        id: 'database-mcp',
        name: 'Database MCP',
        type: 'database',
        category: 'storage',
        endpoint: 'mcp://database',
        tools: [
          'query-sql',
          'insert-data',
          'update-data',
          'delete-data',
          'create-table',
          'backup-database',
          'analyze-schema'
        ],
        capabilities: ['data-storage', 'querying', 'data-analysis'],
        auth: { type: 'connection-string' },
        cost: 'free',
        status: 'active',
        priority: 'medium'
      },

      {
        id: 'huggingface-mcp',
        name: 'Hugging Face MCP',
        type: 'ai-models',
        category: 'ai',
        endpoint: 'https://api-inference.huggingface.co',
        tools: [
          'text-generation',
          'text-classification',
          'sentiment-analysis',
          'translation',
          'summarization',
          'question-answering'
        ],
        capabilities: ['nlp', 'machine-learning', 'ai-inference'],
        auth: {
          type: 'bearer-token',
          envVar: 'HUGGINGFACE_API_TOKEN'
        },
        cost: 'freemium',
        community: true,
        status: 'active'
      },

      {
        id: 'notion-mcp',
        name: 'Notion MCP Server',
        type: 'productivity',
        category: 'productivity',
        endpoint: 'https://api.notion.com/v1',
        tools: [
          'create-page',
          'update-page',
          'search-pages',
          'create-database',
          'query-database',
          'manage-blocks'
        ],
        capabilities: ['document-management', 'knowledge-base'],
        auth: {
          type: 'bearer-token',
          envVar: 'NOTION_TOKEN'
        },
        cost: 'free',
        community: true,
        status: 'active'
      },

      {
        id: 'airtable-mcp',
        name: 'Airtable MCP',
        type: 'database',
        category: 'data',
        endpoint: 'https://api.airtable.com/v0',
        tools: [
          'create-record',
          'update-record',
          'delete-record',
          'list-records',
          'create-table'
        ],
        capabilities: ['database-operations', 'data-management'],
        auth: {
          type: 'bearer-token',
          envVar: 'AIRTABLE_API_KEY'
        },
        cost: 'freemium',
        community: true,
        status: 'active'
      },

      // Additional MCP Servers for Maximum Agency
      {
        id: 'wolfram-alpha-mcp',
        name: 'Wolfram Alpha MCP',
        type: 'computation-service',
        category: 'computation',
        endpoint: 'https://api.wolframalpha.com/v2',
        tools: [
          'compute-expression',
          'solve-equation',
          'query-knowledge',
          'generate-plot',
          'unit-conversion'
        ],
        capabilities: ['mathematical-computation', 'knowledge-query', 'data-visualization'],
        auth: {
          type: 'api-key',
          keyName: 'WOLFRAM_API_KEY'
        },
        cost: 'paid',
        community: true,
        status: 'active',
        description: 'Computational knowledge and mathematical problem solving'
      },

      {
        id: 'arxiv-mcp',
        name: 'arXiv Research MCP',
        type: 'research-service',
        category: 'research',
        endpoint: 'https://export.arxiv.org/api',
        tools: [
          'search-papers',
          'get-paper-details',
          'get-abstract',
          'search-authors',
          'get-latest-papers'
        ],
        capabilities: ['academic-research', 'paper-search', 'scientific-literature'],
        auth: { type: 'none' },
        cost: 'free',
        community: true,
        status: 'active',
        description: 'Academic paper search and research from arXiv'
      },

      {
        id: 'wikipedia-mcp',
        name: 'Wikipedia MCP',
        type: 'knowledge-service',
        category: 'knowledge',
        endpoint: 'https://en.wikipedia.org/api/rest_v1',
        tools: [
          'search-articles',
          'get-page-content',
          'get-page-summary',
          'get-random-article',
          'search-nearby'
        ],
        capabilities: ['knowledge-lookup', 'encyclopedic-search', 'content-retrieval'],
        auth: { type: 'none' },
        cost: 'free',
        community: true,
        status: 'active',
        description: 'Wikipedia knowledge base access'
      },

      {
        id: 'google-maps-mcp',
        name: 'Google Maps MCP',
        type: 'location-service',
        category: 'geospatial',
        endpoint: 'https://maps.googleapis.com/maps/api',
        tools: [
          'geocode-address',
          'reverse-geocode',
          'find-places',
          'get-directions',
          'get-distance-matrix'
        ],
        capabilities: ['geolocation', 'mapping', 'directions', 'place-search'],
        auth: {
          type: 'api-key',
          keyName: 'GOOGLE_MAPS_API_KEY'
        },
        cost: 'freemium',
        community: true,
        status: 'active',
        description: 'Location services and mapping capabilities'
      },

      {
        id: 'news-api-mcp',
        name: 'News API MCP',
        type: 'news-service',
        category: 'information',
        endpoint: 'https://newsapi.org/v2',
        tools: [
          'get-headlines',
          'search-news',
          'get-sources',
          'get-everything',
          'get-top-headlines'
        ],
        capabilities: ['news-retrieval', 'current-events', 'media-monitoring'],
        auth: {
          type: 'api-key',
          keyName: 'NEWS_API_KEY'
        },
        cost: 'freemium',
        community: true,
        status: 'active',
        description: 'Real-time news and current events'
      },

      {
        id: 'youtube-mcp',
        name: 'YouTube Data MCP',
        type: 'media-service',
        category: 'media',
        endpoint: 'https://www.googleapis.com/youtube/v3',
        tools: [
          'search-videos',
          'get-video-details',
          'get-channel-info',
          'get-comments',
          'get-captions'
        ],
        capabilities: ['video-search', 'media-analysis', 'content-discovery'],
        auth: {
          type: 'api-key',
          keyName: 'YOUTUBE_API_KEY'
        },
        cost: 'freemium',
        community: true,
        status: 'active',
        description: 'YouTube video search and media analysis'
      },

      {
        id: 'blockchain-mcp',
        name: 'Blockchain Explorer MCP',
        type: 'blockchain-service',
        category: 'finance',
        endpoint: 'https://api.blockchain.info',
        tools: [
          'get-address-info',
          'get-transaction',
          'get-block-info',
          'get-stats',
          'get-price-data'
        ],
        capabilities: ['blockchain-analysis', 'cryptocurrency-data', 'transaction-tracking'],
        auth: { type: 'none' },
        cost: 'free',
        community: true,
        status: 'active',
        description: 'Blockchain and cryptocurrency data analysis'
      }
    ];

    communityServers.forEach(server => {
      this.registry.set(server.id, server);
    });

    logger.info(`Loaded ${communityServers.length} community MCP servers`);
  }

  async discoverMCPServers(query) {
    await this.initialize();
    
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [id, server] of this.registry) {
      // Search by name, category, capabilities, or tools
      const searchableText = [
        server.name,
        server.category,
        ...server.capabilities,
        ...server.tools,
        server.type
      ].join(' ').toLowerCase();
      
      if (searchableText.includes(queryLower)) {
        results.push({
          ...server,
          relevanceScore: this.calculateRelevanceScore(server, queryLower)
        });
      }
    }
    
    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return results;
  }

  calculateRelevanceScore(server, query) {
    let score = 0;
    
    // Exact matches in name get highest score
    if (server.name.toLowerCase().includes(query)) score += 10;
    
    // Category matches
    if (server.category.toLowerCase().includes(query)) score += 8;
    
    // Capability matches
    server.capabilities.forEach(cap => {
      if (cap.toLowerCase().includes(query)) score += 6;
    });
    
    // Tool matches
    server.tools.forEach(tool => {
      if (tool.toLowerCase().includes(query)) score += 4;
    });
    
    // Type matches
    if (server.type.toLowerCase().includes(query)) score += 3;
    
    // Boost for free/active servers
    if (server.cost === 'free') score += 2;
    if (server.status === 'active') score += 1;
    
    return score;
  }

  getServersByCategory(category) {
    const servers = [];
    
    for (const [id, server] of this.registry) {
      if (server.category === category) {
        servers.push(server);
      }
    }
    
    return servers;
  }

  getServersByCapability(capability) {
    const servers = [];
    
    for (const [id, server] of this.registry) {
      if (server.capabilities.includes(capability)) {
        servers.push(server);
      }
    }
    
    return servers;
  }

  getRecommendedServers(agentType) {
    const recommendations = new Map();
    
    // Mapping of agent types to recommended server categories
    const agentServerMap = {
      'data-science': ['ai', 'data-science', 'utilities'],
      'devops': ['devops', 'cloud', 'development'],
      'content': ['ai', 'productivity', 'communication'],
      'marketing': ['communication', 'ai', 'utilities'],
      'finance': ['finance', 'data', 'ai'],
      'iot': ['utilities', 'cloud', 'data']
    };
    
    const recommendedCategories = agentServerMap[agentType] || ['ai', 'utilities'];
    
    recommendedCategories.forEach(category => {
      const servers = this.getServersByCategory(category);
      servers.forEach(server => {
        recommendations.set(server.id, {
          ...server,
          reason: `Recommended for ${agentType} agents - ${category} category`
        });
      });
    });
    
    return Array.from(recommendations.values());
  }

  async testServerConnection(serverId) {
    const server = this.registry.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    
    try {
      // Simple ping/health check
      const response = await axios.get(server.endpoint, {
        timeout: 5000,
        headers: this.getAuthHeaders(server)
      });
      
      return {
        serverId,
        status: 'connected',
        responseTime: Date.now(),
        available: true
      };
    } catch (error) {
      return {
        serverId,
        status: 'failed',
        error: error.message,
        available: false
      };
    }
  }

  getAuthHeaders(server) {
    const headers = {};
    
    if (server.auth) {
      const token = process.env[server.auth.envVar];
      
      if (token) {
        switch (server.auth.type) {
          case 'bearer-token':
            headers['Authorization'] = `Bearer ${token}`;
            break;
          case 'api-key':
            headers['X-API-Key'] = token;
            break;
          case 'basic':
            headers['Authorization'] = `Basic ${Buffer.from(token).toString('base64')}`;
            break;
        }
      }
    }
    
    return headers;
  }

  getAllServers() {
    return Array.from(this.registry.values());
  }

  getServerById(id) {
    return this.registry.get(id);
  }

  getPublicServers() {
    return Array.from(this.publicServers.values());
  }

  getCommunityServers() {
    return Array.from(this.registry.values()).filter(server => server.community);
  }

  getServersByTool(tool) {
    const servers = [];
    
    for (const [id, server] of this.registry) {
      if (server.tools.includes(tool)) {
        servers.push(server);
      }
    }
    
    return servers;
  }
}

export default ExternalMCPRegistry;