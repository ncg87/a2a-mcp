/**
 * Example: Task to create new agents and utilize MCP servers
 * 
 * This demonstrates how the ensemble can handle meta-tasks that involve
 * creating new agents and connecting to various MCP servers.
 */

import CoordinatorAgent from '../src/agents/coordinator.js';
import logger from '../src/utils/logger.js';

// Example task that creates agents and uses MCP servers
const createAgentsTask = {
  id: 'meta-task-001',
  type: 'agent-creation',
  description: 'Create a specialized data science agent and connect it to external MCP servers for data analysis',
  requirements: {
    newAgents: [
      {
        type: 'data-science',
        capabilities: ['machine-learning', 'statistical-analysis', 'data-visualization'],
        mcpServers: ['jupyter-mcp', 'pandas-mcp', 'sklearn-mcp']
      }
    ],
    externalMCPServers: [
      {
        id: 'jupyter-mcp',
        type: 'jupyter',
        endpoint: 'http://localhost:8888/api/kernels',
        tools: ['execute-cell', 'create-notebook', 'run-analysis']
      },
      {
        id: 'github-mcp',
        type: 'github',
        endpoint: 'https://api.github.com',
        tools: ['create-repo', 'commit-code', 'create-pr'],
        auth: 'bearer-token'
      },
      {
        id: 'openai-mcp',
        type: 'ai-service',
        endpoint: 'https://api.openai.com/v1',
        tools: ['generate-code', 'analyze-data', 'create-documentation'],
        auth: 'api-key'
      }
    ],
    taskToExecute: {
      description: 'Analyze customer data, create ML model, generate report, and commit to GitHub',
      steps: [
        'Load customer data from database',
        'Perform exploratory data analysis using Jupyter',
        'Train ML model using scikit-learn',
        'Generate visualization and report',
        'Commit results to GitHub repository'
      ]
    }
  },
  priority: 'high'
};

async function demonstrateMetaTask() {
  try {
    logger.info('Starting meta-task demonstration...');
    
    // This would be submitted to a running coordinator
    console.log('Task to be submitted:');
    console.log(JSON.stringify(createAgentsTask, null, 2));
    
    console.log('\n=== How the Coordinator would process this task ===\n');
    
    // Simulate coordinator processing
    console.log('1. Coordinator receives meta-task');
    console.log('2. Decomposes into subtasks:');
    console.log('   - Create new agent type (data-science agent)');
    console.log('   - Connect to external MCP servers');
    console.log('   - Execute the actual data analysis task');
    
    console.log('\n3. Subtasks created:');
    const subtasks = [
      {
        id: 'subtask-1',
        type: 'agent-creation',
        description: 'Create data-science agent with ML capabilities',
        assignedTo: 'code-agent',
        mcpServers: ['file-system-mcp']
      },
      {
        id: 'subtask-2', 
        type: 'mcp-integration',
        description: 'Connect to Jupyter, GitHub, and OpenAI MCP servers',
        assignedTo: 'devops-agent',
        mcpServers: ['web-api-mcp']
      },
      {
        id: 'subtask-3',
        type: 'data-analysis',
        description: 'Execute ML pipeline using new agent and MCP servers',
        assignedTo: 'data-science-agent', // The newly created agent
        mcpServers: ['jupyter-mcp', 'github-mcp', 'openai-mcp']
      }
    ];
    
    subtasks.forEach((task, i) => {
      console.log(`   ${i + 1}. ${task.description}`);
      console.log(`      Assigned to: ${task.assignedTo}`);
      console.log(`      Uses MCP: ${task.mcpServers.join(', ')}`);
    });
    
    console.log('\n4. Execution flow:');
    console.log('   - Code agent creates data-science-agent.js file');
    console.log('   - DevOps agent configures MCP server connections');
    console.log('   - New data-science agent is spawned and registered');
    console.log('   - Data-science agent executes ML pipeline');
    console.log('   - Results are synthesized and returned');
    
  } catch (error) {
    logger.error('Meta-task demonstration failed:', error);
  }
}

// Example of what the generated agent would look like
const generatedAgentCode = `
import { BaseAgent } from '../../core/base-agent.js';
import logger from '../../utils/logger.js';

export class DataScienceAgent extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      type: 'data-science',
      capabilities: [
        'machine-learning',
        'statistical-analysis', 
        'data-visualization',
        'model-training',
        'data-preprocessing'
      ]
    });
  }

  async processTask(task) {
    logger.info(\`Data Science agent processing: \${task.description}\`);
    
    switch (task.subtype) {
      case 'ml-training':
        return await this.trainModel(task);
      case 'data-analysis':
        return await this.analyzeData(task);
      case 'visualization':
        return await this.createVisualization(task);
      default:
        return await this.handleDataScienceTask(task);
    }
  }

  async trainModel(task) {
    // Use sklearn MCP server to train model
    const trainingData = await this.invokeMCPTool('pandas-mcp', 'load-dataset', {
      source: task.dataSource
    });
    
    const model = await this.invokeMCPTool('sklearn-mcp', 'train-model', {
      algorithm: task.algorithm || 'random-forest',
      data: trainingData,
      target: task.target
    });
    
    return {
      type: 'model-training',
      model: model,
      accuracy: model.score,
      status: 'completed'
    };
  }

  async analyzeData(task) {
    // Use Jupyter MCP server for analysis
    const notebook = await this.invokeMCPTool('jupyter-mcp', 'create-notebook', {
      name: \`analysis-\${task.id}\`
    });
    
    const analysisCode = this.generateAnalysisCode(task);
    
    const results = await this.invokeMCPTool('jupyter-mcp', 'execute-cell', {
      notebook: notebook.id,
      code: analysisCode
    });
    
    return {
      type: 'data-analysis',
      notebook: notebook.id,
      results: results,
      status: 'completed'
    };
  }

  generateAnalysisCode(task) {
    return \`
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Load data
df = pd.read_csv('\${task.dataSource}')

# Basic statistics
print("Dataset shape:", df.shape)
print("\\nData types:")
print(df.dtypes)

# Summary statistics  
print("\\nSummary statistics:")
print(df.describe())

# Missing values
print("\\nMissing values:")
print(df.isnull().sum())

# Create visualizations
plt.figure(figsize=(12, 8))
sns.heatmap(df.corr(), annot=True, cmap='coolwarm')
plt.title('Correlation Matrix')
plt.savefig('correlation_matrix.png')

# Distribution plots
for col in df.select_dtypes(include=[np.number]).columns:
    plt.figure(figsize=(8, 6))
    df[col].hist(bins=30)
    plt.title(f'Distribution of {col}')
    plt.savefig(f'{col}_distribution.png')

print("Analysis complete!")
\`;
  }
}

export default DataScienceAgent;
`;

console.log('\n=== Generated Agent Code Preview ===');
console.log(generatedAgentCode.substring(0, 1000) + '...');

// Run the demonstration
demonstrateMetaTask();

export { createAgentsTask, generatedAgentCode };