import { BaseAgent } from '../../core/base-agent.js';
import AgentRuntimeManager from './agent-runtime.js';
import logger from '../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

export class AgentFactoryAgent extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      type: 'agent-factory',
      capabilities: [
        'agent-creation',
        'code-generation',
        'dynamic-instantiation',
        'mcp-integration',
        'agent-deployment'
      ]
    });
    
    this.createdAgents = new Map();
    
    // Initialize runtime manager for actual agent execution
    this.runtimeManager = new AgentRuntimeManager({
      maxAgents: config.maxAgents || 10,
      sandboxMode: true, // Always use sandboxed execution for security
      agentDirectory: './generated-agents'
    });
  }
  
  async initialize() {
    await super.initialize();
    await this.runtimeManager.initialize();
    
    // Set up event handlers
    this.runtimeManager.on('agent:ready', ({ agentId }) => {
      logger.info(`Created agent ${agentId} is ready`);
    });
    
    this.runtimeManager.on('agent:result', ({ agentId, taskId, result }) => {
      logger.info(`Agent ${agentId} completed task ${taskId}`);
      this.emit('agent:task-complete', { agentId, taskId, result });
    });
    
    this.runtimeManager.on('agent:error', ({ agentId, error }) => {
      logger.error(`Agent ${agentId} error:`, error);
    });
    
    return true;
  }

  async processTask(task) {
    logger.info(`Agent Factory processing: ${task.description}`);
    
    try {
      switch (task.subtype || task.type) {
        case 'create-agent':
          return await this.createAgent(task);
        case 'deploy-agent':
          return await this.deployAgent(task);
        case 'connect-mcp-servers':
          return await this.connectMCPServers(task);
        case 'create-and-deploy':
          return await this.createAndDeployAgent(task);
        default:
          return await this.handleAgentFactoryTask(task);
      }
    } catch (error) {
      logger.error(`Agent Factory failed to process task:`, error);
      throw error;
    }
  }

  async createAgent(task) {
    logger.info(`Creating new agent: ${task.agentType}`);
    
    const agentSpec = task.agentSpec || this.inferAgentSpec(task);
    const agentCode = await this.generateAgentCode(agentSpec);
    const filePath = await this.writeAgentFile(agentSpec.type, agentCode);
    
    return {
      type: 'agent-creation',
      agentType: agentSpec.type,
      filePath,
      capabilities: agentSpec.capabilities,
      mcpServers: agentSpec.mcpServers || [],
      status: 'created'
    };
  }

  inferAgentSpec(task) {
    const description = task.description.toLowerCase();
    
    // Infer agent type and capabilities from task description
    let agentType = 'custom';
    let capabilities = [];
    let mcpServers = [];
    
    // Machine Learning / Data Science
    if (description.includes('machine learning') || description.includes('ml') || 
        description.includes('data science') || description.includes('model')) {
      agentType = 'data-science';
      capabilities = [
        'machine-learning',
        'statistical-analysis',
        'data-visualization',
        'model-training',
        'data-preprocessing'
      ];
      mcpServers = ['jupyter-mcp', 'pandas-mcp', 'sklearn-mcp'];
    }
    
    // DevOps / Infrastructure
    else if (description.includes('deploy') || description.includes('infrastructure') ||
             description.includes('docker') || description.includes('kubernetes')) {
      agentType = 'devops';
      capabilities = [
        'deployment',
        'containerization',
        'orchestration',
        'monitoring',
        'infrastructure-automation'
      ];
      mcpServers = ['docker-mcp', 'kubernetes-mcp', 'aws-mcp'];
    }
    
    // Content / Documentation
    else if (description.includes('content') || description.includes('documentation') ||
             description.includes('writing') || description.includes('blog')) {
      agentType = 'content';
      capabilities = [
        'content-creation',
        'documentation',
        'technical-writing',
        'markdown-generation'
      ];
      mcpServers = ['openai-mcp', 'github-mcp', 'notion-mcp'];
    }
    
    // Marketing / Social Media
    else if (description.includes('marketing') || description.includes('social') ||
             description.includes('campaign') || description.includes('analytics')) {
      agentType = 'marketing';
      capabilities = [
        'campaign-management',
        'social-media',
        'analytics',
        'content-strategy'
      ];
      mcpServers = ['twitter-mcp', 'facebook-mcp', 'analytics-mcp'];
    }
    
    // Finance / Trading
    else if (description.includes('finance') || description.includes('trading') ||
             description.includes('crypto') || description.includes('stocks')) {
      agentType = 'finance';
      capabilities = [
        'market-analysis',
        'trading',
        'risk-assessment',
        'portfolio-management'
      ];
      mcpServers = ['yahoo-finance-mcp', 'coinbase-mcp', 'trading-mcp'];
    }
    
    // IoT / Hardware
    else if (description.includes('iot') || description.includes('sensor') ||
             description.includes('hardware') || description.includes('embedded')) {
      agentType = 'iot';
      capabilities = [
        'sensor-monitoring',
        'device-control',
        'data-collection',
        'hardware-integration'
      ];
      mcpServers = ['mqtt-mcp', 'influxdb-mcp', 'arduino-mcp'];
    }
    
    return {
      type: agentType,
      capabilities,
      mcpServers,
      description: task.description
    };
  }

  async generateAgentCode(agentSpec) {
    const className = this.toPascalCase(agentSpec.type) + 'Agent';
    
    return `import { BaseAgent } from '../../core/base-agent.js';
import logger from '../../utils/logger.js';

/**
 * ${className}
 * Generated by AgentFactoryAgent
 * 
 * Description: ${agentSpec.description}
 * Capabilities: ${agentSpec.capabilities.join(', ')}
 * MCP Servers: ${agentSpec.mcpServers.join(', ')}
 */
export class ${className} extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      type: '${agentSpec.type}',
      capabilities: ${JSON.stringify(agentSpec.capabilities, null, 8)}
    });
    
    this.initialized = false;
  }

  async initialize() {
    await super.initialize();
    
    // Connect to required MCP servers
    ${agentSpec.mcpServers.map(server => `
    try {
      await this.connectToMCPServer({
        id: '${server}',
        type: '${server.replace('-mcp', '')}',
        endpoint: process.env.${server.toUpperCase()}_ENDPOINT || 'localhost'
      });
    } catch (error) {
      logger.warn(\`Failed to connect to ${server}: \${error.message}\`);
    }`).join('')}
    
    this.initialized = true;
    logger.info(\`${className} initialized with \${this.mcpClients.size} MCP connections\`);
  }

  async processTask(task) {
    logger.info(\`${className} processing task: \${task.description}\`);
    
    if (!this.initialized) {
      throw new Error('${className} not properly initialized');
    }
    
    try {
      switch (task.subtype || this.inferTaskType(task)) {
        ${this.generateTaskHandlers(agentSpec)}
        default:
          return await this.handleGenericTask(task);
      }
    } catch (error) {
      logger.error(\`${className} failed to process task:\`, error);
      throw error;
    }
  }

  inferTaskType(task) {
    const description = task.description.toLowerCase();
    
    ${this.generateTaskTypeInference(agentSpec)}
    
    return 'generic';
  }

  ${this.generateCapabilityMethods(agentSpec)}

  async handleGenericTask(task) {
    logger.info(\`Handling generic task: \${task.description}\`);
    
    // Use the most appropriate MCP server based on task
    const mcpServer = this.selectBestMCPServer(task);
    
    if (mcpServer) {
      const result = await this.invokeMCPTool(mcpServer, 'process', {
        task: task.description,
        context: task
      }).catch(() => ({ processed: true, method: 'fallback' }));
      
      return {
        type: '${agentSpec.type}-task',
        description: task.description,
        result,
        mcpServer,
        status: 'completed'
      };
    }
    
    return {
      type: '${agentSpec.type}-task',
      description: task.description,
      result: 'Processed using internal logic',
      status: 'completed'
    };
  }

  selectBestMCPServer(task) {
    const availableServers = Array.from(this.mcpClients.keys());
    
    ${agentSpec.mcpServers.map((server, index) => `
    if (availableServers.includes('${server}')) {
      return '${server}';
    }`).join('')}
    
    return availableServers[0] || null;
  }

  ${this.generateUtilityMethods(agentSpec)}
}

export default ${className};`;
  }

  generateTaskHandlers(agentSpec) {
    const handlers = [];
    
    agentSpec.capabilities.forEach(capability => {
      const methodName = capability.replace(/-/g, '');
      handlers.push(`        case '${capability}':
          return await this.handle${this.toPascalCase(methodName)}(task);`);
    });
    
    return handlers.join('\n');
  }

  generateTaskTypeInference(agentSpec) {
    const inferences = [];
    
    agentSpec.capabilities.forEach(capability => {
      const keywords = capability.split('-');
      const conditions = keywords.map(keyword => 
        `description.includes('${keyword}')`
      ).join(' || ');
      
      inferences.push(`    if (${conditions}) return '${capability}';`);
    });
    
    return inferences.join('\n');
  }

  generateCapabilityMethods(agentSpec) {
    return agentSpec.capabilities.map(capability => {
      const methodName = 'handle' + this.toPascalCase(capability.replace(/-/g, ''));
      
      return `  async ${methodName}(task) {
    logger.info(\`Executing ${capability}: \${task.description}\`);
    
    // Find appropriate MCP server for this capability
    const mcpServer = this.selectMCPServerForCapability('${capability}');
    
    if (mcpServer) {
      const result = await this.invokeMCPTool(mcpServer, '${capability}', {
        task: task.description,
        parameters: task.parameters || {}
      }).catch(error => ({
        error: error.message,
        fallback: true
      }));
      
      return {
        type: '${capability}',
        result,
        mcpServer,
        status: result.error ? 'partial' : 'completed'
      };
    }
    
    // Fallback to internal processing
    return {
      type: '${capability}',
      result: \`Processed ${capability} for: \${task.description}\`,
      method: 'internal',
      status: 'completed'
    };
  }`;
    }).join('\n\n');
  }

  generateUtilityMethods(agentSpec) {
    return `  selectMCPServerForCapability(capability) {
    const serverMap = {
      ${agentSpec.mcpServers.map(server => {
        const capabilities = this.getMCPServerCapabilities(server);
        return capabilities.map(cap => `      '${cap}': '${server}'`).join(',\n');
      }).join(',\n')}
    };
    
    return serverMap[capability] || Array.from(this.mcpClients.keys())[0];
  }

  getCapabilitySummary() {
    return {
      type: '${agentSpec.type}',
      capabilities: this.capabilities,
      mcpServers: Array.from(this.mcpClients.keys()),
      status: this.status
    };
  }`;
  }

  getMCPServerCapabilities(server) {
    const capabilityMap = {
      'jupyter-mcp': ['data-analysis', 'visualization', 'statistical-analysis'],
      'sklearn-mcp': ['machine-learning', 'model-training'],
      'github-mcp': ['version-control', 'collaboration'],
      'openai-mcp': ['content-creation', 'text-generation'],
      'docker-mcp': ['containerization', 'deployment'],
      'aws-mcp': ['infrastructure', 'cloud-deployment'],
      'twitter-mcp': ['social-media', 'content-distribution'],
      'mqtt-mcp': ['iot', 'sensor-monitoring']
    };
    
    return capabilityMap[server] || ['generic'];
  }

  async writeAgentFile(agentType, agentCode) {
    const fileName = `${agentType}-agent.js`;
    const dirPath = path.join(process.cwd(), 'src', 'agents', 'generated');
    const filePath = path.join(dirPath, fileName);
    
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });
    
    // Write the agent file
    await this.invokeMCPTool('file-system-mcp', 'write', {
      path: filePath,
      content: agentCode
    }).catch(async () => {
      // Fallback to direct file write
      await fs.writeFile(filePath, agentCode, 'utf8');
    });
    
    logger.info(`Agent code written to: ${filePath}`);
    return filePath;
  }

  async deployAgent(task) {
    logger.info(`Deploying agent: ${task.agentType}`);
    
    const agentPath = task.agentPath;
    const agentConfig = task.agentConfig || {
      replicas: 1,
      resources: { cpu: 2, memory: '4Gi' }
    };
    
    // Spawn the new agent process
    const agentProcess = await this.spawnAgentProcess(agentPath, agentConfig);
    
    // Register the new agent
    this.createdAgents.set(task.agentType, {
      path: agentPath,
      process: agentProcess,
      config: agentConfig,
      createdAt: Date.now()
    });
    
    return {
      type: 'agent-deployment',
      agentType: task.agentType,
      processId: agentProcess.pid,
      status: 'deployed'
    };
  }

  async spawnAgentProcess(agentPath, config) {
    return new Promise((resolve, reject) => {
      const process = spawn('node', [agentPath], {
        env: {
          ...process.env,
          AGENT_CONFIG: JSON.stringify(config)
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      process.on('spawn', () => {
        logger.info(`Agent process spawned with PID: ${process.pid}`);
        resolve(process);
      });
      
      process.on('error', (error) => {
        logger.error(`Failed to spawn agent process:`, error);
        reject(error);
      });
      
      // Handle process output
      process.stdout.on('data', (data) => {
        logger.info(`[Agent ${process.pid}] ${data.toString().trim()}`);
      });
      
      process.stderr.on('data', (data) => {
        logger.error(`[Agent ${process.pid}] ${data.toString().trim()}`);
      });
    });
  }

  async connectMCPServers(task) {
    logger.info('Connecting to external MCP servers');
    
    const servers = task.mcpServers || [];
    const connections = [];
    
    for (const serverConfig of servers) {
      try {
        await this.connectToMCPServer(serverConfig);
        connections.push({
          id: serverConfig.id,
          status: 'connected',
          tools: serverConfig.tools
        });
      } catch (error) {
        logger.error(`Failed to connect to ${serverConfig.id}:`, error);
        connections.push({
          id: serverConfig.id,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return {
      type: 'mcp-connections',
      connections,
      status: 'completed'
    };
  }

  async createAndDeployAgent(task) {
    logger.info('Creating and deploying agent in one operation');
    
    try {
      // Step 1: Create the agent
      const createResult = await this.createAgent(task);
      
      // Step 2: Read the generated agent code from file
      const agentCode = await fs.readFile(createResult.filePath, 'utf-8');
      
      // Step 3: Deploy the agent using runtime manager
      const agentSpec = task.agentSpec || this.inferAgentSpec(task);
      const agentId = await this.runtimeManager.deployAgent(
        agentCode,
        agentSpec
      );
      
      // Store agent reference
      this.createdAgents.set(agentId, {
        ...createResult,
        agentId,
        status: 'running',
        createdAt: Date.now()
      });
      
      // Step 3: Connect MCP servers if specified
      let mcpResult = null;
      if (task.mcpServers && task.mcpServers.length > 0) {
        mcpResult = await this.connectMCPServers(task);
      }
      
      // Step 4: Send initial task if provided
      if (task.initialTask) {
        const taskId = await this.runtimeManager.sendTaskToAgent(agentId, task.initialTask);
        logger.info(`Sent initial task ${taskId} to agent ${agentId}`);
      }
      
      return {
        type: 'agent-creation-and-deployment',
        agentId,
        creation: createResult,
        deployment: {
          status: 'success',
          agentId,
          message: `Agent ${agentId} is now running`
        },
        mcpConnections: mcpResult,
        status: 'completed'
      };
      
    } catch (error) {
      logger.error('Failed to create and deploy agent:', error);
      throw error;
    }
  }

  async handleAgentFactoryTask(task) {
    // Handle any other agent factory related tasks
    return {
      type: 'agent-factory-generic',
      description: task.description,
      result: 'Processed by Agent Factory',
      status: 'completed'
    };
  }

  toPascalCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
      return word.toUpperCase();
    }).replace(/\s+/g, '').replace(/-/g, '');
  }

  getCreatedAgents() {
    return Array.from(this.createdAgents.entries()).map(([type, info]) => ({
      type,
      ...info,
      uptime: Date.now() - info.createdAt
    }));
  }
}

export default AgentFactoryAgent;