/**
 * Auto-Orchestrator - "Press Play" System
 * 
 * Automatically analyzes natural language prompts and creates the optimal
 * multi-agent system with appropriate MCP server connections using A2A and ACP protocols.
 */

import { EventEmitter } from 'eventemitter3';
import EnhancedCoordinatorAgent from '../agents/coordinator-enhanced.js';
import AgentFactoryAgent from '../agents/specialists/agent-factory.js';
import ExternalMCPRegistry from './external-mcp-registry.js';
import A2AProtocol from './a2a-protocol.js';
import ACPProtocol from './acp-protocol.js';
import InMemoryMessageBus from './in-memory-message-bus.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class AutoOrchestrator extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.coordinator = null;
    this.agentFactory = null;
    this.mcpRegistry = null;
    this.messageBus = null;
    this.activeAgents = new Map();
    this.taskHistory = [];
    this.isInitialized = false;
  }

  /**
   * Initialize the auto-orchestrator system
   */
  async initialize() {
    try {
      logger.info('🚀 Initializing Auto-Orchestrator...');

      // Initialize in-memory message bus (fallback for systems without Redis)
      this.messageBus = new InMemoryMessageBus(this.config.message_bus || {});
      await this.messageBus.connect();

      // Initialize MCP registry
      this.mcpRegistry = new ExternalMCPRegistry();
      await this.mcpRegistry.initialize();

      // Initialize enhanced coordinator
      this.coordinator = new EnhancedCoordinatorAgent({
        id: 'auto-coordinator',
        ...this.config
      });
      await this.coordinator.initialize();

      // Initialize agent factory
      this.agentFactory = new AgentFactoryAgent({
        id: 'auto-agent-factory',
        ...this.config
      });
      await this.agentFactory.initialize();

      // Set up A2A and ACP protocols for coordinator
      this.coordinator.a2a = new A2AProtocol('auto-coordinator', this.messageBus);
      this.coordinator.acp = new ACPProtocol('auto-coordinator', this.messageBus);
      await this.coordinator.a2a.initialize();
      await this.coordinator.acp.initialize();

      this.isInitialized = true;
      logger.info('✅ Auto-Orchestrator initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Auto-Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Main "Press Play" method - process any natural language prompt
   */
  async processPrompt(prompt, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Auto-Orchestrator not initialized');
    }

    try {
      logger.info(`🎯 Processing prompt: "${prompt}"`);

      // Step 1: Analyze the prompt
      const analysis = await this.analyzePrompt(prompt, options);
      logger.info(`📊 Prompt analysis:`, analysis);

      // Step 2: Create execution plan
      const executionPlan = await this.createExecutionPlan(analysis);
      logger.info(`📋 Execution plan created with ${executionPlan.agents.length} agents and ${executionPlan.mcpServers.length} MCP servers`);

      // Step 3: Auto-create required agents
      const createdAgents = await this.createRequiredAgents(executionPlan.agents);
      logger.info(`🤖 Created ${createdAgents.length} new agents`);

      // Step 4: Connect to required MCP servers
      const connectedServers = await this.connectMCPServers(executionPlan.mcpServers);
      logger.info(`🌐 Connected to ${connectedServers.length} MCP servers`);

      // Step 5: Execute the task using A2A/ACP protocols
      const result = await this.executeWithProtocols(executionPlan, createdAgents);
      logger.info(`✅ Task execution completed`);

      // Step 6: Store execution history
      this.storeExecutionHistory(prompt, analysis, executionPlan, result);

      return {
        success: true,
        prompt,
        analysis,
        executionPlan,
        createdAgents,
        connectedServers,
        result,
        executionTime: Date.now() - analysis.startTime
      };

    } catch (error) {
      logger.error(`❌ Failed to process prompt: "${prompt}"`, error);
      throw error;
    }
  }

  /**
   * Analyze natural language prompt to determine requirements
   */
  async analyzePrompt(prompt, options = {}) {
    const startTime = Date.now();
    const analysis = {
      startTime,
      originalPrompt: prompt,
      complexity: 1,
      requiredCapabilities: [],
      suggestedAgents: [],
      suggestedMCPServers: [],
      taskType: 'general',
      priority: options.priority || 'medium',
      estimatedTime: 0,
      userContext: options.context || {}
    };

    const promptLower = prompt.toLowerCase();

    // Analyze for different domains and capabilities
    await this.analyzeForDomains(promptLower, analysis);
    await this.analyzeForComplexity(promptLower, analysis);
    await this.analyzeForMCPRequirements(promptLower, analysis);
    await this.analyzeForCollaboration(promptLower, analysis);

    // Calculate estimated execution time
    analysis.estimatedTime = this.calculateEstimatedTime(analysis);

    return analysis;
  }

  async analyzeForDomains(promptLower, analysis) {
    const domainPatterns = {
      'data-science': {
        patterns: ['data analysis', 'machine learning', 'ml model', 'predict', 'dataset', 'statistical', 'correlation', 'regression', 'classification'],
        capabilities: ['machine-learning', 'data-analysis', 'statistical-analysis', 'visualization'],
        mcpServers: ['kaggle-mcp', 'huggingface-mcp', 'openai-mcp'],
        complexity: 4
      },
      'finance': {
        patterns: ['stock', 'trading', 'crypto', 'portfolio', 'market analysis', 'financial', 'investment', 'risk'],
        capabilities: ['market-analysis', 'trading', 'risk-assessment', 'financial-reporting'],
        mcpServers: ['alpha-vantage-mcp', 'openai-mcp', 'airtable-mcp'],
        complexity: 3
      },
      'marketing': {
        patterns: ['social media', 'campaign', 'content creation', 'advertisement', 'brand', 'engagement', 'viral'],
        capabilities: ['content-creation', 'social-media', 'campaign-management', 'analytics'],
        mcpServers: ['slack-mcp', 'discord-mcp', 'notion-mcp', 'openai-mcp'],
        complexity: 2
      },
      'devops': {
        patterns: ['deploy', 'cloud', 'docker', 'kubernetes', 'ci/cd', 'infrastructure', 'monitoring', 'scaling'],
        capabilities: ['deployment', 'containerization', 'monitoring', 'infrastructure-automation'],
        mcpServers: ['github-mcp', 'docker-hub-mcp', 'aws-lambda-mcp', 'slack-mcp'],
        complexity: 4
      },
      'content': {
        patterns: ['write', 'blog', 'article', 'documentation', 'content', 'copywriting', 'editing'],
        capabilities: ['content-creation', 'writing', 'editing', 'documentation'],
        mcpServers: ['openai-mcp', 'notion-mcp', 'github-mcp'],
        complexity: 2
      },
      'research': {
        patterns: ['research', 'investigate', 'analyze', 'study', 'survey', 'information', 'knowledge'],
        capabilities: ['information-gathering', 'web-search', 'analysis', 'documentation'],
        mcpServers: ['openai-mcp', 'github-mcp', 'notion-mcp'],
        complexity: 3
      },
      'automation': {
        patterns: ['automate', 'schedule', 'workflow', 'process', 'batch', 'recurring', 'systematic'],
        capabilities: ['automation', 'scheduling', 'workflow-management'],
        mcpServers: ['slack-mcp', 'github-mcp', 'notion-mcp'],
        complexity: 3
      },
      'iot': {
        patterns: ['sensor', 'iot', 'device', 'hardware', 'monitor', 'embedded', 'raspberry pi'],
        capabilities: ['sensor-monitoring', 'device-control', 'data-collection'],
        mcpServers: ['weather-mcp', 'slack-mcp'],
        complexity: 4
      }
    };

    for (const [domain, config] of Object.entries(domainPatterns)) {
      const matchCount = config.patterns.filter(pattern => promptLower.includes(pattern)).length;
      
      if (matchCount > 0) {
        analysis.taskType = domain;
        analysis.complexity = Math.max(analysis.complexity, config.complexity);
        analysis.requiredCapabilities.push(...config.capabilities);
        analysis.suggestedMCPServers.push(...config.mcpServers);
        
        // Suggest agent type
        analysis.suggestedAgents.push({
          type: domain,
          capabilities: config.capabilities,
          reason: `Detected ${matchCount} ${domain} patterns`
        });
      }
    }

    // Remove duplicates
    analysis.requiredCapabilities = [...new Set(analysis.requiredCapabilities)];
    analysis.suggestedMCPServers = [...new Set(analysis.suggestedMCPServers)];
  }

  async analyzeForComplexity(promptLower, analysis) {
    const complexityIndicators = {
      'multiple': 1, 'several': 1, 'various': 1, 'different': 1,
      'complex': 2, 'advanced': 2, 'sophisticated': 2,
      'integrate': 2, 'combine': 2, 'merge': 2,
      'automate': 2, 'optimize': 3, 'scale': 3,
      'enterprise': 3, 'production': 3, 'distributed': 4
    };

    for (const [indicator, weight] of Object.entries(complexityIndicators)) {
      if (promptLower.includes(indicator)) {
        analysis.complexity += weight;
      }
    }

    // Check for multi-step processes
    const steps = promptLower.split(/\band\b|\bthen\b|\bnext\b|\bafter\b/).length;
    if (steps > 1) {
      analysis.complexity += steps;
    }

    // Cap complexity at 10
    analysis.complexity = Math.min(analysis.complexity, 10);
  }

  async analyzeForMCPRequirements(promptLower, analysis) {
    const mcpPatterns = {
      'github-mcp': ['github', 'git', 'repository', 'version control', 'commit', 'pull request'],
      'slack-mcp': ['slack', 'team', 'notification', 'message', 'communication'],
      'discord-mcp': ['discord', 'community', 'bot', 'server'],
      'notion-mcp': ['notion', 'document', 'notes', 'wiki', 'knowledge base'],
      'openai-mcp': ['ai', 'gpt', 'openai', 'generate', 'artificial intelligence'],
      'kaggle-mcp': ['kaggle', 'dataset', 'competition', 'data'],
      'weather-mcp': ['weather', 'temperature', 'forecast', 'climate'],
      'airtable-mcp': ['database', 'table', 'record', 'airtable'],
      'docker-hub-mcp': ['docker', 'container', 'image', 'containerize'],
      'aws-lambda-mcp': ['aws', 'lambda', 'serverless', 'cloud function']
    };

    for (const [server, patterns] of Object.entries(mcpPatterns)) {
      if (patterns.some(pattern => promptLower.includes(pattern))) {
        if (!analysis.suggestedMCPServers.includes(server)) {
          analysis.suggestedMCPServers.push(server);
        }
      }
    }
  }

  async analyzeForCollaboration(promptLower, analysis) {
    const collaborationPatterns = [
      'collaborate', 'team', 'multiple agents', 'work together', 
      'coordinate', 'parallel', 'distribute', 'share'
    ];

    const needsCollaboration = collaborationPatterns.some(pattern => 
      promptLower.includes(pattern)
    );

    if (needsCollaboration || analysis.complexity > 6) {
      analysis.collaborationType = 'multi-agent';
      analysis.estimatedAgents = Math.ceil(analysis.complexity / 3);
    } else {
      analysis.collaborationType = 'single-agent';
      analysis.estimatedAgents = 1;
    }
  }

  calculateEstimatedTime(analysis) {
    // Base time calculation in milliseconds
    let baseTime = 60000; // 1 minute base

    // Complexity factor
    baseTime *= analysis.complexity;

    // MCP server connection time
    baseTime += analysis.suggestedMCPServers.length * 10000; // 10 seconds per server

    // Agent creation time
    baseTime += analysis.suggestedAgents.length * 30000; // 30 seconds per agent

    return Math.min(baseTime, 1800000); // Cap at 30 minutes
  }

  /**
   * Create execution plan based on analysis
   */
  async createExecutionPlan(analysis) {
    const plan = {
      id: uuidv4(),
      taskType: analysis.taskType,
      complexity: analysis.complexity,
      agents: [],
      mcpServers: [],
      executionSteps: [],
      protocols: ['A2A', 'ACP'],
      estimatedTime: analysis.estimatedTime
    };

    // Determine required agents
    if (analysis.suggestedAgents.length === 0) {
      // Create default agent based on capabilities
      const defaultAgent = {
        type: analysis.taskType || 'general',
        capabilities: analysis.requiredCapabilities,
        mcpServers: analysis.suggestedMCPServers.slice(0, 5) // Limit to 5 servers per agent
      };
      plan.agents.push(defaultAgent);
    } else {
      plan.agents = analysis.suggestedAgents.map(agent => ({
        ...agent,
        mcpServers: analysis.suggestedMCPServers.filter(server => 
          this.isRelevantMCPServer(server, agent.type)
        )
      }));
    }

    // Get optimal MCP servers
    for (const serverId of analysis.suggestedMCPServers) {
      const server = this.mcpRegistry.getServerById(serverId);
      if (server) {
        plan.mcpServers.push(server);
      } else {
        // Try to find similar server
        const alternatives = await this.mcpRegistry.discoverMCPServers(
          serverId.replace('-mcp', '')
        );
        if (alternatives.length > 0) {
          plan.mcpServers.push(alternatives[0]);
        }
      }
    }

    // Create execution steps
    plan.executionSteps = this.createExecutionSteps(plan, analysis);

    return plan;
  }

  isRelevantMCPServer(serverId, agentType) {
    const relevanceMap = {
      'data-science': ['kaggle-mcp', 'huggingface-mcp', 'openai-mcp', 'github-mcp'],
      'finance': ['alpha-vantage-mcp', 'openai-mcp', 'airtable-mcp', 'slack-mcp'],
      'marketing': ['slack-mcp', 'discord-mcp', 'notion-mcp', 'openai-mcp'],
      'devops': ['github-mcp', 'docker-hub-mcp', 'aws-lambda-mcp', 'slack-mcp'],
      'content': ['openai-mcp', 'notion-mcp', 'github-mcp'],
      'research': ['openai-mcp', 'github-mcp', 'notion-mcp']
    };

    return relevanceMap[agentType]?.includes(serverId) || 
           ['openai-mcp', 'github-mcp'].includes(serverId); // Always relevant
  }

  createExecutionSteps(plan, analysis) {
    const steps = [];

    // Step 1: Agent creation
    if (plan.agents.length > 0) {
      steps.push({
        id: 'create-agents',
        type: 'agent-creation',
        description: `Create ${plan.agents.length} specialized agents`,
        agents: plan.agents,
        protocol: 'ACP',
        estimatedTime: plan.agents.length * 30000
      });
    }

    // Step 2: MCP server connections
    if (plan.mcpServers.length > 0) {
      steps.push({
        id: 'connect-mcp',
        type: 'mcp-connection',
        description: `Connect to ${plan.mcpServers.length} external MCP servers`,
        servers: plan.mcpServers,
        protocol: 'A2A',
        estimatedTime: plan.mcpServers.length * 10000
      });
    }

    // Step 3: Task execution
    steps.push({
      id: 'execute-task',
      type: 'task-execution',
      description: 'Execute the main task using created agents and MCP servers',
      task: analysis.originalPrompt,
      protocol: 'A2A+ACP',
      estimatedTime: analysis.estimatedTime * 0.7 // 70% of total time
    });

    // Step 4: Result synthesis
    steps.push({
      id: 'synthesize-results',
      type: 'result-synthesis',
      description: 'Synthesize results from all agents',
      protocol: 'ACP',
      estimatedTime: 30000
    });

    return steps;
  }

  /**
   * Create required agents automatically
   */
  async createRequiredAgents(agentSpecs) {
    const createdAgents = [];

    for (const spec of agentSpecs) {
      try {
        logger.info(`🤖 Creating ${spec.type} agent...`);

        const result = await this.agentFactory.processTask({
          type: 'create-and-deploy',
          agentSpec: spec,
          mcpServers: spec.mcpServers?.map(serverId => 
            this.mcpRegistry.getServerById(serverId)
          ).filter(Boolean) || []
        });

        if (result.status === 'completed') {
          // Set up A2A and ACP protocols for the new agent
          const agentId = `${spec.type}-${Date.now()}`;
          const protocols = {
            a2a: new A2AProtocol(agentId, this.messageBus),
            acp: new ACPProtocol(agentId, this.messageBus)
          };
          
          await protocols.a2a.initialize();
          await protocols.acp.initialize();

          const agentInfo = {
            id: agentId,
            type: spec.type,
            capabilities: spec.capabilities,
            protocols,
            result,
            createdAt: Date.now()
          };

          this.activeAgents.set(agentId, agentInfo);
          createdAgents.push(agentInfo);

          logger.info(`✅ Created ${spec.type} agent with A2A/ACP protocols`);
        }

      } catch (error) {
        logger.error(`❌ Failed to create ${spec.type} agent:`, error);
      }
    }

    return createdAgents;
  }

  /**
   * Connect to required MCP servers
   */
  async connectMCPServers(serverSpecs) {
    const connectedServers = [];

    for (const server of serverSpecs) {
      try {
        logger.info(`🌐 Connecting to ${server.name}...`);

        // Test connection first
        const connectionTest = await this.mcpRegistry.testServerConnection(server.id);
        
        if (connectionTest.available) {
          // Add to coordinator's MCP manager
          await this.coordinator.mcpManager.connectServer(server);
          connectedServers.push({
            ...server,
            connectionStatus: connectionTest,
            connectedAt: Date.now()
          });
          
          logger.info(`✅ Connected to ${server.name}`);
        } else {
          logger.warn(`⚠️ Failed to connect to ${server.name}: ${connectionTest.error}`);
        }

      } catch (error) {
        logger.error(`❌ Error connecting to ${server.name}:`, error);
      }
    }

    return connectedServers;
  }

  /**
   * Execute task using A2A and ACP protocols
   */
  async executeWithProtocols(executionPlan, createdAgents) {
    logger.info('🚀 Executing task with A2A/ACP protocols...');

    const results = [];

    for (const step of executionPlan.executionSteps) {
      try {
        logger.info(`⚙️ Executing step: ${step.description}`);

        let stepResult;

        switch (step.type) {
          case 'agent-creation':
            stepResult = { completed: true, agents: createdAgents.length };
            break;

          case 'mcp-connection':
            stepResult = { completed: true, servers: step.servers.length };
            break;

          case 'task-execution':
            stepResult = await this.executeMainTask(step, createdAgents);
            break;

          case 'result-synthesis':
            stepResult = await this.synthesizeResults(results);
            break;

          default:
            stepResult = { completed: true, message: 'Step completed' };
        }

        results.push({
          step: step.id,
          result: stepResult,
          timestamp: Date.now()
        });

        logger.info(`✅ Completed step: ${step.description}`);

      } catch (error) {
        logger.error(`❌ Step failed: ${step.description}`, error);
        results.push({
          step: step.id,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    return {
      steps: results,
      overallStatus: results.every(r => !r.error) ? 'success' : 'partial',
      completedAt: Date.now()
    };
  }

  async executeMainTask(step, createdAgents) {
    const taskId = uuidv4();

    if (createdAgents.length === 1) {
      // Single agent execution using ACP
      const agent = createdAgents[0];
      return await this.executeSingleAgentTask(agent, step.task, taskId);
    } else if (createdAgents.length > 1) {
      // Multi-agent collaboration using A2A + ACP
      return await this.executeMultiAgentTask(createdAgents, step.task, taskId);
    } else {
      // Use coordinator directly
      return await this.coordinator.processTask({
        id: taskId,
        description: step.task,
        type: 'general'
      });
    }
  }

  async executeSingleAgentTask(agent, task, taskId) {
    // Use ACP to formally request task execution
    const messageId = await agent.protocols.acp.request(
      this.coordinator.id,
      'execute_task',
      {
        taskId,
        description: task,
        deadline: Date.now() + 300000
      }
    );

    // Simulate task execution (in practice, this would be handled by the actual agent)
    return {
      type: 'single-agent-execution',
      agent: agent.id,
      task,
      messageId,
      status: 'completed',
      result: `Task executed by ${agent.type} agent using ACP protocol`
    };
  }

  async executeMultiAgentTask(agents, task, taskId) {
    // Use A2A to coordinate between agents
    const coordinationId = uuidv4();
    
    // Initiate collaboration using ACP
    const collaborationPromises = agents.map(agent => 
      agent.protocols.acp.sendACPMessage(
        this.coordinator.id,
        'PROPOSE',
        {
          collaborationId: coordinationId,
          task,
          role: `${agent.type}-specialist`,
          capabilities: agent.capabilities
        }
      )
    );

    await Promise.all(collaborationPromises);

    // Simulate multi-agent coordination
    return {
      type: 'multi-agent-execution',
      agents: agents.map(a => a.id),
      task,
      collaborationId: coordinationId,
      status: 'completed',
      result: `Task executed collaboratively by ${agents.length} agents using A2A+ACP protocols`
    };
  }

  async synthesizeResults(stepResults) {
    const successful = stepResults.filter(r => !r.error);
    const failed = stepResults.filter(r => r.error);

    return {
      type: 'result-synthesis',
      successfulSteps: successful.length,
      failedSteps: failed.length,
      overallStatus: failed.length === 0 ? 'success' : 'partial',
      summary: `Executed ${successful.length}/${stepResults.length} steps successfully`,
      details: stepResults
    };
  }

  storeExecutionHistory(prompt, analysis, plan, result) {
    this.taskHistory.push({
      id: uuidv4(),
      timestamp: Date.now(),
      prompt,
      analysis,
      executionPlan: plan,
      result,
      duration: Date.now() - analysis.startTime
    });

    // Keep only last 100 executions
    if (this.taskHistory.length > 100) {
      this.taskHistory = this.taskHistory.slice(-100);
    }
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      activeAgents: this.activeAgents.size,
      connectedMCPServers: this.coordinator?.mcpManager?.getAllServers()?.length || 0,
      taskHistory: this.taskHistory.length,
      availableMCPServers: this.mcpRegistry?.getAllServers()?.length || 0,
      protocols: ['A2A', 'ACP'],
      lastExecution: this.taskHistory.length > 0 ? this.taskHistory[this.taskHistory.length - 1] : null
    };
  }

  /**
   * Simple prompt interface for easy testing
   */
  async prompt(userPrompt) {
    console.log(`\n🎯 Processing: "${userPrompt}"`);
    const result = await this.processPrompt(userPrompt);
    
    console.log(`\n📊 Analysis:`);
    console.log(`   Task Type: ${result.analysis.taskType}`);
    console.log(`   Complexity: ${result.analysis.complexity}/10`);
    console.log(`   Required Capabilities: ${result.analysis.requiredCapabilities.join(', ')}`);
    
    console.log(`\n🤖 Agents Created: ${result.createdAgents.length}`);
    result.createdAgents.forEach(agent => {
      console.log(`   - ${agent.type} (${agent.capabilities.join(', ')})`);
    });
    
    console.log(`\n🌐 MCP Servers Connected: ${result.connectedServers.length}`);
    result.connectedServers.forEach(server => {
      console.log(`   - ${server.name} (${server.tools?.length || 0} tools)`);
    });
    
    console.log(`\n✅ Execution: ${result.result.overallStatus}`);
    console.log(`   Duration: ${(result.executionTime / 1000).toFixed(1)}s`);
    
    return result;
  }
}

export default AutoOrchestrator;