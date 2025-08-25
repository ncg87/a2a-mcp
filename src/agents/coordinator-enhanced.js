import CoordinatorAgent from './coordinator.js';
import AgentFactoryAgent from './specialists/agent-factory.js';
import ExternalMCPRegistry from '../core/external-mcp-registry.js';
import logger from '../utils/logger.js';

/**
 * Enhanced Coordinator Agent
 * 
 * Extends the base coordinator with meta-task capabilities:
 * - Dynamic agent creation
 * - External MCP server integration  
 * - Recursive task delegation
 * - Intelligent capability matching
 */
export class EnhancedCoordinatorAgent extends CoordinatorAgent {
  constructor(config) {
    super(config);
    
    this.agentFactory = null;
    this.mcpRegistry = null;
    this.createdAgents = new Map();
  }

  async initialize() {
    await super.initialize();
    
    // Initialize Agent Factory
    this.agentFactory = new AgentFactoryAgent({
      id: 'agent-factory',
      ...this.config
    });
    await this.agentFactory.initialize();
    
    // Initialize External MCP Registry
    this.mcpRegistry = new ExternalMCPRegistry();
    await this.mcpRegistry.initialize();
    
    logger.info('Enhanced Coordinator initialized with meta-task capabilities');
  }

  async decomposeTask(task) {
    // Check if this is a meta-task (involves creating agents or connecting MCP servers)
    if (this.isMetaTask(task)) {
      return await this.decomposeMetaTask(task);
    }
    
    // For regular tasks, use the base implementation
    return await super.decomposeTask(task);
  }

  isMetaTask(task) {
    const description = task.description.toLowerCase();
    const metaKeywords = [
      'create agent',
      'new agent', 
      'agent creation',
      'connect mcp',
      'external server',
      'dynamic agent',
      'meta-task'
    ];
    
    return metaKeywords.some(keyword => description.includes(keyword)) ||
           task.type === 'agent-creation' ||
           task.requirements?.agentType ||
           task.requirements?.externalMCPServers;
  }

  async decomposeMetaTask(task) {
    logger.info(`Decomposing meta-task: ${task.description}`);
    
    const subtasks = [];
    
    // If we need to create a new agent
    if (task.requirements?.agentType || this.needsNewAgent(task)) {
      // Determine what type of agent we need
      const agentSpec = task.requirements || this.inferRequiredAgent(task);
      
      // Task 1: Create the agent
      subtasks.push({
        id: `create-agent-${task.id}`,
        type: 'agent-creation',
        description: `Create ${agentSpec.agentType} agent with capabilities: ${agentSpec.capabilities?.join(', ')}`,
        agentSpec,
        requiredCapabilities: ['agent-creation', 'code-generation'],
        priority: 'high',
        dependencies: []
      });
      
      // Task 2: Connect to external MCP servers if needed
      if (agentSpec.externalMCPServers && agentSpec.externalMCPServers.length > 0) {
        // Find the best MCP servers for this agent
        const recommendedServers = await this.findOptimalMCPServers(
          agentSpec.agentType, 
          agentSpec.externalMCPServers
        );
        
        subtasks.push({
          id: `connect-mcp-${task.id}`,
          type: 'mcp-integration',
          description: `Connect to external MCP servers: ${recommendedServers.map(s => s.name).join(', ')}`,
          mcpServers: recommendedServers,
          requiredCapabilities: ['mcp-integration'],
          priority: 'high',
          dependencies: [`create-agent-${task.id}`]
        });
      }
      
      // Task 3: Execute the actual work with the new agent
      if (task.requirements?.taskToExecute) {
        subtasks.push({
          id: `execute-task-${task.id}`,
          type: task.requirements.taskToExecute.type || 'execution',
          description: task.requirements.taskToExecute.description,
          originalTask: task.requirements.taskToExecute,
          requiredCapabilities: agentSpec.capabilities,
          priority: task.priority || 'medium',
          dependencies: subtasks.map(st => st.id), // Depends on agent creation and MCP connection
          targetAgent: agentSpec.agentType // Should be executed by the newly created agent
        });
      }
    }
    
    // If we only need to connect MCP servers to existing agents
    else if (task.requirements?.externalMCPServers) {
      const recommendedServers = await this.findOptimalMCPServers(
        'general',
        task.requirements.externalMCPServers
      );
      
      subtasks.push({
        id: `connect-external-mcp-${task.id}`,
        type: 'mcp-integration',
        description: `Connect to external MCP servers: ${recommendedServers.map(s => s.name).join(', ')}`,
        mcpServers: recommendedServers,
        requiredCapabilities: ['mcp-integration'],
        priority: 'high',
        dependencies: []
      });
    }
    
    // If no specific requirements, decompose based on description analysis
    else {
      subtasks.push(...await this.analyzeAndDecomposeTask(task));
    }
    
    logger.info(`Meta-task decomposed into ${subtasks.length} subtasks`);
    return subtasks;
  }

  needsNewAgent(task) {
    const description = task.description.toLowerCase();
    
    // Check if the task requires capabilities we don't currently have
    const requiredCapabilities = this.extractRequiredCapabilities(task);
    const availableCapabilities = this.getAvailableCapabilities();
    
    const missingCapabilities = requiredCapabilities.filter(
      cap => !availableCapabilities.includes(cap)
    );
    
    return missingCapabilities.length > 0;
  }

  extractRequiredCapabilities(task) {
    const description = task.description.toLowerCase();
    const capabilities = [];
    
    // AI/ML capabilities
    if (description.includes('machine learning') || description.includes('ml') ||
        description.includes('model') || description.includes('prediction')) {
      capabilities.push('machine-learning', 'data-analysis', 'model-training');
    }
    
    // Finance capabilities
    if (description.includes('trading') || description.includes('finance') ||
        description.includes('stock') || description.includes('crypto')) {
      capabilities.push('market-analysis', 'trading', 'risk-assessment');
    }
    
    // Social media capabilities
    if (description.includes('social media') || description.includes('twitter') ||
        description.includes('instagram') || description.includes('marketing')) {
      capabilities.push('social-media', 'content-creation', 'campaign-management');
    }
    
    // Cloud/DevOps capabilities
    if (description.includes('deploy') || description.includes('cloud') ||
        description.includes('aws') || description.includes('docker')) {
      capabilities.push('deployment', 'cloud-management', 'containerization');
    }
    
    return capabilities;
  }

  getAvailableCapabilities() {
    const allCapabilities = new Set();
    
    for (const [agentId, agentInfo] of this.agentRegistry) {
      if (agentInfo.capabilities) {
        agentInfo.capabilities.forEach(cap => allCapabilities.add(cap));
      }
    }
    
    return Array.from(allCapabilities);
  }

  inferRequiredAgent(task) {
    const requiredCapabilities = this.extractRequiredCapabilities(task);
    
    // Determine agent type based on capabilities
    let agentType = 'general';
    
    if (requiredCapabilities.some(cap => cap.includes('machine-learning'))) {
      agentType = 'data-science';
    } else if (requiredCapabilities.some(cap => cap.includes('trading'))) {
      agentType = 'finance';
    } else if (requiredCapabilities.some(cap => cap.includes('social-media'))) {
      agentType = 'marketing';
    } else if (requiredCapabilities.some(cap => cap.includes('deployment'))) {
      agentType = 'devops';
    }
    
    return {
      agentType,
      capabilities: requiredCapabilities,
      externalMCPServers: this.inferRequiredMCPServers(agentType, task),
      description: task.description
    };
  }

  inferRequiredMCPServers(agentType, task) {
    const description = task.description.toLowerCase();
    const mcpServers = [];
    
    // Always useful servers
    mcpServers.push('openai-mcp', 'github-mcp');
    
    // Agent-specific servers
    switch (agentType) {
      case 'data-science':
        mcpServers.push('kaggle-mcp', 'huggingface-mcp');
        break;
      case 'finance':
        mcpServers.push('alpha-vantage-mcp', 'airtable-mcp');
        break;
      case 'marketing':
        mcpServers.push('slack-mcp', 'notion-mcp');
        if (description.includes('discord')) mcpServers.push('discord-mcp');
        break;
      case 'devops':
        mcpServers.push('docker-hub-mcp', 'aws-lambda-mcp');
        break;
    }
    
    // Task-specific servers based on keywords
    if (description.includes('weather')) mcpServers.push('weather-mcp');
    if (description.includes('slack')) mcpServers.push('slack-mcp');
    if (description.includes('notion')) mcpServers.push('notion-mcp');
    
    return [...new Set(mcpServers)]; // Remove duplicates
  }

  async findOptimalMCPServers(agentType, requestedServers) {
    const optimalServers = [];
    
    for (const serverId of requestedServers) {
      // First try to get exact match
      let server = this.mcpRegistry.getServerById(serverId);
      
      if (!server) {
        // Try to find similar server by name/capability
        const searchResults = await this.mcpRegistry.discoverMCPServers(
          serverId.replace('-mcp', '')
        );
        
        if (searchResults.length > 0) {
          server = searchResults[0]; // Take best match
          logger.info(`Using ${server.name} as substitute for ${serverId}`);
        }
      }
      
      if (server) {
        // Test connection if possible
        try {
          const connectionTest = await this.mcpRegistry.testServerConnection(server.id);
          server.connectionStatus = connectionTest;
          optimalServers.push(server);
        } catch (error) {
          logger.warn(`Failed to test connection to ${server.name}: ${error.message}`);
          server.connectionStatus = { available: false, error: error.message };
          optimalServers.push(server); // Still add it, agent can handle connection failures
        }
      } else {
        logger.warn(`Could not find MCP server: ${serverId}`);
      }
    }
    
    // Add recommended servers if none were found
    if (optimalServers.length === 0) {
      const recommended = this.mcpRegistry.getRecommendedServers(agentType);
      optimalServers.push(...recommended.slice(0, 3)); // Top 3 recommendations
    }
    
    return optimalServers;
  }

  async analyzeAndDecomposeTask(task) {
    // Use AI-powered task analysis to break down complex tasks
    const analysis = await this.analyzeTaskComplexity(task);
    const subtasks = [];
    
    // Create subtasks based on analysis
    analysis.components.forEach((component, index) => {
      subtasks.push({
        id: `subtask-${task.id}-${index}`,
        type: component.type,
        description: component.description,
        requiredCapabilities: component.capabilities,
        priority: component.priority || 'medium',
        dependencies: component.dependencies || []
      });
    });
    
    return subtasks;
  }

  async analyzeTaskComplexity(task) {
    // This would ideally use an AI service to analyze task complexity
    // For now, we'll use rule-based analysis
    
    const description = task.description;
    const words = description.toLowerCase().split(' ');
    const complexity = this.calculateComplexity(words);
    
    return {
      complexity,
      components: this.identifyTaskComponents(description),
      estimatedTime: complexity * 10, // minutes
      requiredAgents: Math.ceil(complexity / 3)
    };
  }

  calculateComplexity(words) {
    let complexity = 1;
    
    const complexityIndicators = {
      'analyze': 2,
      'build': 3,
      'create': 2,
      'deploy': 3,
      'integrate': 4,
      'optimize': 4,
      'machine learning': 5,
      'database': 3,
      'api': 2,
      'cloud': 3
    };
    
    words.forEach(word => {
      if (complexityIndicators[word]) {
        complexity += complexityIndicators[word];
      }
    });
    
    return Math.min(complexity, 10); // Cap at 10
  }

  identifyTaskComponents(description) {
    const components = [];
    const desc = description.toLowerCase();
    
    // Data components
    if (desc.includes('data') || desc.includes('analyze')) {
      components.push({
        type: 'data-processing',
        description: 'Data analysis and processing',
        capabilities: ['data-analysis'],
        priority: 'high'
      });
    }
    
    // Code components
    if (desc.includes('build') || desc.includes('develop') || desc.includes('code')) {
      components.push({
        type: 'development',
        description: 'Software development and coding',
        capabilities: ['programming'],
        priority: 'high'
      });
    }
    
    // Deployment components
    if (desc.includes('deploy') || desc.includes('cloud')) {
      components.push({
        type: 'deployment',
        description: 'Deployment and infrastructure setup',
        capabilities: ['deployment'],
        priority: 'medium'
      });
    }
    
    // Testing components
    if (desc.includes('test') || desc.includes('quality')) {
      components.push({
        type: 'testing',
        description: 'Testing and quality assurance',
        capabilities: ['testing'],
        priority: 'medium'
      });
    }
    
    return components;
  }

  async delegateTask(subtask) {
    // Check if this task should go to a newly created agent
    if (subtask.targetAgent) {
      // Wait for the agent to be created and registered
      const agent = await this.waitForAgent(subtask.targetAgent, 30000); // 30 second timeout
      
      if (agent) {
        return await this.delegateToSpecificAgent(subtask, agent);
      } else {
        logger.warn(`Target agent ${subtask.targetAgent} not available, using fallback`);
      }
    }
    
    // For agent creation tasks, delegate to agent factory
    if (subtask.type === 'agent-creation') {
      return await this.delegateToAgentFactory(subtask);
    }
    
    // For MCP integration tasks, handle specially
    if (subtask.type === 'mcp-integration') {
      return await this.handleMCPIntegration(subtask);
    }
    
    // For regular tasks, use base implementation
    return await super.delegateTask(subtask);
  }

  async waitForAgent(agentType, timeout) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check if agent is registered
      for (const [agentId, agentInfo] of this.agentRegistry) {
        if (agentInfo.type === agentType) {
          return agentInfo;
        }
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return null;
  }

  async delegateToAgentFactory(subtask) {
    logger.info(`Delegating agent creation task to Agent Factory`);
    
    try {
      const result = await this.agentFactory.processTask({
        type: 'create-and-deploy',
        agentSpec: subtask.agentSpec,
        mcpServers: subtask.mcpServers,
        description: subtask.description
      });
      
      // Register the newly created agent
      if (result.creation && result.deployment) {
        this.createdAgents.set(subtask.agentSpec.agentType, {
          ...result,
          createdAt: Date.now()
        });
      }
      
      return result;
      
    } catch (error) {
      logger.error(`Agent Factory failed:`, error);
      throw error;
    }
  }

  async handleMCPIntegration(subtask) {
    logger.info(`Handling MCP integration for ${subtask.mcpServers?.length || 0} servers`);
    
    const results = [];
    
    if (subtask.mcpServers) {
      for (const server of subtask.mcpServers) {
        try {
          // Add server to MCP manager
          await this.mcpManager.connectServer(server);
          
          results.push({
            serverId: server.id,
            status: 'connected',
            tools: server.tools
          });
          
        } catch (error) {
          logger.error(`Failed to connect to MCP server ${server.id}:`, error);
          results.push({
            serverId: server.id,
            status: 'failed',
            error: error.message
          });
        }
      }
    }
    
    return {
      type: 'mcp-integration',
      connections: results,
      status: 'completed'
    };
  }

  async delegateToSpecificAgent(subtask, agent) {
    logger.info(`Delegating task to specific agent: ${agent.id}`);
    
    // This would send the task directly to the specified agent
    const taskMessage = {
      type: 'task-assignment',
      task: subtask,
      coordinatorId: this.id,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      // Store task for tracking
      this.activeTasks.set(subtask.id, {
        subtask,
        agent,
        startTime: Date.now(),
        resolve,
        reject
      });

      // Set timeout
      const timeout = setTimeout(() => {
        this.activeTasks.delete(subtask.id);
        reject(new Error(`Task ${subtask.id} timed out on agent ${agent.id}`));
      }, this.config.taskTimeout || 300000);

      this.activeTasks.get(subtask.id).timeout = timeout;

      // Send task to specific agent
      this.messageBus.publish(`agent:${agent.id}`, JSON.stringify(taskMessage));
    });
  }

  getSystemStatus() {
    const baseStatus = super.getSystemStatus();
    
    return {
      ...baseStatus,
      createdAgents: this.createdAgents.size,
      agentFactory: this.agentFactory ? 'active' : 'inactive',
      mcpRegistry: this.mcpRegistry ? `${this.mcpRegistry.getAllServers().length} servers` : 'inactive',
      metaTaskCapabilities: [
        'dynamic-agent-creation',
        'external-mcp-integration',
        'recursive-task-delegation',
        'ai-powered-decomposition'
      ]
    };
  }
}

export default EnhancedCoordinatorAgent;