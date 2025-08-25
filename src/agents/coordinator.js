import { BaseAgent } from '../core/base-agent.js';
import MessageBus from '../core/message-bus.js';
import MCPManager from '../core/mcp-manager.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class CoordinatorAgent extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      type: 'coordinator',
      capabilities: ['task-management', 'orchestration', 'result-synthesis']
    });
    
    this.agentRegistry = new Map();
    this.activeTasks = new Map();
    this.taskQueue = [];
    this.mcpManager = null;
    this.messageBus = null;
    this.taskHistory = [];
  }

  async initialize() {
    await super.initialize();
    
    // Initialize MCP Manager
    this.mcpManager = new MCPManager(this.config);
    await this.mcpManager.initialize();
    
    // Initialize Message Bus
    this.messageBus = new MessageBus(this.config.message_bus);
    await this.messageBus.connect();
    
    // Set up subscriptions
    await this.setupSubscriptions();
    
    logger.info(`Coordinator agent ${this.id} fully initialized`);
  }

  async setupSubscriptions() {
    // Subscribe to agent discovery
    await this.messageBus.subscribe('agent-discovery', (message) => {
      this.handleAgentRegistration(message);
    });

    // Subscribe to agent status updates
    await this.messageBus.subscribe('agent-status', (message) => {
      this.handleAgentStatusUpdate(message);
    });

    // Subscribe to task results
    await this.messageBus.subscribe('results', (message) => {
      this.handleTaskResult(message);
    });

    // Subscribe to incoming tasks
    await this.messageBus.subscribe('tasks', (message) => {
      this.handleIncomingTask(message);
    });
  }

  async processTask(task) {
    try {
      logger.info(`Coordinator processing complex task: ${task.id}`);
      
      // Analyze and decompose the task
      const subtasks = await this.decomposeTask(task);
      
      // Create task execution plan
      const executionPlan = await this.createExecutionPlan(subtasks);
      
      // Execute the plan
      const results = await this.executeTaskPlan(executionPlan);
      
      // Synthesize results
      const finalResult = await this.synthesizeResults(results, task);
      
      return finalResult;
      
    } catch (error) {
      logger.error(`Coordinator failed to process task ${task.id}:`, error);
      throw error;
    }
  }

  async decomposeTask(task) {
    logger.debug(`Decomposing task: ${task.description}`);
    
    // This would typically use AI/LLM to analyze the task
    // For now, we'll use rule-based decomposition
    
    const subtasks = [];
    
    // Analyze task requirements and break into smaller pieces
    if (task.type === 'software-development') {
      subtasks.push(...this.decomposeSoftwareDevelopmentTask(task));
    } else if (task.type === 'data-analysis') {
      subtasks.push(...this.decomposeDataAnalysisTask(task));
    } else if (task.type === 'research') {
      subtasks.push(...this.decomposeResearchTask(task));
    } else {
      // Generic task decomposition
      subtasks.push(...this.decomposeGenericTask(task));
    }
    
    logger.info(`Task ${task.id} decomposed into ${subtasks.length} subtasks`);
    return subtasks;
  }

  decomposeSoftwareDevelopmentTask(task) {
    return [
      {
        id: uuidv4(),
        type: 'research',
        description: `Research requirements and existing codebase for: ${task.description}`,
        requiredCapabilities: ['information-gathering', 'documentation-analysis'],
        priority: 'high',
        dependencies: []
      },
      {
        id: uuidv4(),
        type: 'code',
        description: `Implement core functionality for: ${task.description}`,
        requiredCapabilities: ['programming', 'debugging'],
        priority: 'high',
        dependencies: []
      },
      {
        id: uuidv4(),
        type: 'testing',
        description: `Create and run tests for: ${task.description}`,
        requiredCapabilities: ['test-creation', 'validation'],
        priority: 'medium',
        dependencies: []
      },
      {
        id: uuidv4(),
        type: 'security',
        description: `Security review for: ${task.description}`,
        requiredCapabilities: ['vulnerability-scanning', 'compliance-checking'],
        priority: 'medium',
        dependencies: []
      }
    ];
  }

  decomposeDataAnalysisTask(task) {
    return [
      {
        id: uuidv4(),
        type: 'database',
        description: `Extract data for analysis: ${task.description}`,
        requiredCapabilities: ['data-persistence', 'queries'],
        priority: 'high',
        dependencies: []
      },
      {
        id: uuidv4(),
        type: 'analysis',
        description: `Analyze data for: ${task.description}`,
        requiredCapabilities: ['data-analysis', 'pattern-recognition'],
        priority: 'high',
        dependencies: []
      },
      {
        id: uuidv4(),
        type: 'file',
        description: `Generate reports for: ${task.description}`,
        requiredCapabilities: ['file-operations', 'content-management'],
        priority: 'medium',
        dependencies: []
      }
    ];
  }

  decomposeResearchTask(task) {
    return [
      {
        id: uuidv4(),
        type: 'research',
        description: `Information gathering for: ${task.description}`,
        requiredCapabilities: ['web-search', 'information-gathering'],
        priority: 'high',
        dependencies: []
      },
      {
        id: uuidv4(),
        type: 'analysis',
        description: `Analyze findings for: ${task.description}`,
        requiredCapabilities: ['pattern-recognition', 'reporting'],
        priority: 'medium',
        dependencies: []
      }
    ];
  }

  decomposeGenericTask(task) {
    return [
      {
        id: uuidv4(),
        type: 'generic',
        description: task.description,
        requiredCapabilities: task.requiredCapabilities || [],
        priority: task.priority || 'medium',
        dependencies: []
      }
    ];
  }

  async createExecutionPlan(subtasks) {
    const plan = {
      id: uuidv4(),
      subtasks,
      executionOrder: [],
      parallelGroups: []
    };

    // Analyze dependencies and create execution order
    const dependencyGraph = this.buildDependencyGraph(subtasks);
    plan.executionOrder = this.topologicalSort(dependencyGraph);
    
    // Group independent tasks for parallel execution
    plan.parallelGroups = this.groupParallelTasks(plan.executionOrder, dependencyGraph);
    
    logger.debug(`Created execution plan with ${plan.parallelGroups.length} parallel groups`);
    return plan;
  }

  buildDependencyGraph(subtasks) {
    const graph = new Map();
    
    subtasks.forEach(task => {
      graph.set(task.id, {
        task,
        dependencies: task.dependencies || [],
        dependents: []
      });
    });

    // Build dependent relationships
    for (const [taskId, node] of graph) {
      node.dependencies.forEach(depId => {
        if (graph.has(depId)) {
          graph.get(depId).dependents.push(taskId);
        }
      });
    }

    return graph;
  }

  topologicalSort(graph) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (taskId) => {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected involving task ${taskId}`);
      }
      if (visited.has(taskId)) {
        return;
      }

      visiting.add(taskId);
      const node = graph.get(taskId);
      
      node.dependencies.forEach(depId => {
        if (graph.has(depId)) {
          visit(depId);
        }
      });

      visiting.delete(taskId);
      visited.add(taskId);
      sorted.push(taskId);
    };

    for (const taskId of graph.keys()) {
      visit(taskId);
    }

    return sorted;
  }

  groupParallelTasks(executionOrder, graph) {
    const groups = [];
    const processed = new Set();

    for (const taskId of executionOrder) {
      if (processed.has(taskId)) continue;

      const group = [taskId];
      processed.add(taskId);

      // Find other tasks that can run in parallel
      for (const otherId of executionOrder) {
        if (processed.has(otherId)) continue;
        
        if (this.canRunInParallel(taskId, otherId, graph)) {
          group.push(otherId);
          processed.add(otherId);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  canRunInParallel(task1Id, task2Id, graph) {
    const node1 = graph.get(task1Id);
    const node2 = graph.get(task2Id);

    // Check if tasks have conflicting dependencies or one depends on the other
    return !node1.dependencies.includes(task2Id) &&
           !node2.dependencies.includes(task1Id) &&
           !node1.dependents.includes(task2Id) &&
           !node2.dependents.includes(task1Id);
  }

  async executeTaskPlan(plan) {
    const results = new Map();
    
    logger.info(`Executing task plan with ${plan.parallelGroups.length} parallel groups`);
    
    for (const group of plan.parallelGroups) {
      // Execute all tasks in this group in parallel
      const groupPromises = group.map(async (taskId) => {
        const subtask = plan.subtasks.find(t => t.id === taskId);
        try {
          const result = await this.delegateTask(subtask);
          results.set(taskId, result);
          return { taskId, result, success: true };
        } catch (error) {
          logger.error(`Failed to execute subtask ${taskId}:`, error);
          results.set(taskId, { error: error.message });
          return { taskId, error: error.message, success: false };
        }
      });

      const groupResults = await Promise.all(groupPromises);
      
      // Check if any critical tasks failed
      const failures = groupResults.filter(r => !r.success);
      if (failures.length > 0) {
        logger.warn(`${failures.length} tasks failed in parallel group`);
        // Could implement retry logic here
      }
    }
    
    return results;
  }

  async delegateTask(subtask) {
    // Find appropriate agent for this subtask
    const agent = this.findBestAgent(subtask);
    
    if (!agent) {
      throw new Error(`No suitable agent found for task: ${subtask.description}`);
    }

    logger.info(`Delegating task ${subtask.id} to agent ${agent.id}`);

    // Send task to agent
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
        reject(new Error(`Task ${subtask.id} timed out`));
      }, this.config.taskTimeout || 300000);

      this.activeTasks.get(subtask.id).timeout = timeout;

      // Send task to agent
      this.messageBus.publish(`agent:${agent.id}`, JSON.stringify(taskMessage));
    });
  }

  findBestAgent(subtask) {
    const candidateAgents = [];

    // Find agents that can handle this task
    for (const [agentId, agentInfo] of this.agentRegistry) {
      if (this.canAgentHandleTask(agentInfo, subtask)) {
        candidateAgents.push(agentInfo);
      }
    }

    if (candidateAgents.length === 0) {
      return null;
    }

    // Select best agent based on load and capabilities
    return candidateAgents.sort((a, b) => {
      // Prefer agents with lower workload
      const loadDiff = (a.workloadSize || 0) - (b.workloadSize || 0);
      if (loadDiff !== 0) return loadDiff;

      // Prefer agents with more specific capabilities
      const aSpecificity = this.calculateCapabilitySpecificity(a, subtask);
      const bSpecificity = this.calculateCapabilitySpecificity(b, subtask);
      return bSpecificity - aSpecificity;
    })[0];
  }

  canAgentHandleTask(agentInfo, task) {
    if (!task.requiredCapabilities) return true;
    
    return task.requiredCapabilities.every(cap => 
      agentInfo.capabilities && agentInfo.capabilities.includes(cap)
    );
  }

  calculateCapabilitySpecificity(agentInfo, task) {
    if (!task.requiredCapabilities) return 0;
    
    const matchingCaps = task.requiredCapabilities.filter(cap =>
      agentInfo.capabilities && agentInfo.capabilities.includes(cap)
    );
    
    return matchingCaps.length / (agentInfo.capabilities?.length || 1);
  }

  async synthesizeResults(results, originalTask) {
    logger.info(`Synthesizing results for task ${originalTask.id}`);
    
    const synthesis = {
      originalTask,
      subtaskResults: Array.from(results.entries()).map(([id, result]) => ({
        subtaskId: id,
        result
      })),
      success: true,
      completedAt: new Date().toISOString(),
      summary: ''
    };

    // Check for failures
    const failures = synthesis.subtaskResults.filter(r => r.result.error);
    if (failures.length > 0) {
      synthesis.success = false;
      synthesis.failures = failures;
      synthesis.summary = `Task partially failed: ${failures.length} subtasks failed`;
    } else {
      synthesis.summary = `Task completed successfully: ${synthesis.subtaskResults.length} subtasks completed`;
    }

    // Store in history
    this.taskHistory.push(synthesis);

    return synthesis;
  }

  async handleAgentRegistration(registration) {
    logger.info(`Agent registered: ${registration.id} (${registration.type})`);
    this.agentRegistry.set(registration.id, registration);
  }

  async handleAgentStatusUpdate(statusUpdate) {
    const agentInfo = this.agentRegistry.get(statusUpdate.agentId);
    if (agentInfo) {
      Object.assign(agentInfo, statusUpdate);
    }
  }

  async handleTaskResult(resultMessage) {
    const activeTask = this.activeTasks.get(resultMessage.taskId);
    if (!activeTask) return;

    // Clear timeout
    if (activeTask.timeout) {
      clearTimeout(activeTask.timeout);
    }

    // Resolve or reject the task promise
    if (resultMessage.type === 'task-result') {
      activeTask.resolve(resultMessage.result);
    } else if (resultMessage.type === 'task-failure') {
      activeTask.reject(new Error(resultMessage.error));
    }

    this.activeTasks.delete(resultMessage.taskId);
  }

  async handleIncomingTask(taskMessage) {
    if (taskMessage.type === 'task') {
      this.emit('task-assigned', taskMessage.payload);
    }
  }

  getSystemStatus() {
    return {
      coordinatorId: this.id,
      registeredAgents: this.agentRegistry.size,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      completedTasks: this.taskHistory.length,
      mcpServers: this.mcpManager?.getAllServers() || []
    };
  }
}

export default CoordinatorAgent;