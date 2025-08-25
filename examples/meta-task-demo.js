#!/usr/bin/env node

/**
 * Meta-Task Demo
 * 
 * This demonstrates how to submit a task that creates new agents
 * and connects them to external MCP servers from the internet.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import CoordinatorAgent from '../src/agents/coordinator.js';
import ExternalMCPRegistry from '../src/core/external-mcp-registry.js';
import logger from '../src/utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMetaTaskDemo() {
  try {
    logger.info('🚀 Starting Meta-Task Demonstration...');
    
    // Initialize External MCP Registry
    const mcpRegistry = new ExternalMCPRegistry();
    await mcpRegistry.initialize();
    
    // Example 1: Create a Data Science Agent with ML capabilities
    const dataScienceTask = {
      id: 'meta-task-data-science',
      type: 'agent-creation',
      description: 'Create a data science agent that can perform machine learning analysis using external APIs',
      requirements: {
        agentType: 'data-science',
        capabilities: [
          'machine-learning',
          'data-analysis', 
          'visualization',
          'model-training',
          'statistical-analysis'
        ],
        externalMCPServers: [
          'kaggle-mcp',           // For datasets
          'huggingface-mcp',      // For ML models
          'openai-mcp',           // For AI assistance
          'github-mcp'            // For code storage
        ],
        taskToExecute: {
          description: 'Analyze customer churn data and build predictive model',
          steps: [
            'Download customer dataset from Kaggle',
            'Perform exploratory data analysis',
            'Train machine learning model using Hugging Face',
            'Generate analysis report with OpenAI',
            'Commit results to GitHub repository'
          ]
        }
      }
    };
    
    // Example 2: Create a Marketing Agent with social media capabilities
    const marketingTask = {
      id: 'meta-task-marketing',
      type: 'agent-creation', 
      description: 'Create a marketing agent that manages campaigns across multiple platforms',
      requirements: {
        agentType: 'marketing',
        capabilities: [
          'campaign-management',
          'social-media',
          'content-creation',
          'analytics',
          'automation'
        ],
        externalMCPServers: [
          'slack-mcp',            // For team communication
          'discord-mcp',          // For community management
          'openai-mcp',           // For content generation
          'notion-mcp'            // For campaign planning
        ],
        taskToExecute: {
          description: 'Launch a product campaign across social media platforms',
          steps: [
            'Generate marketing content using OpenAI',
            'Create campaign plan in Notion',
            'Schedule posts across social platforms',
            'Monitor engagement and respond to community',
            'Send daily reports to team via Slack'
          ]
        }
      }
    };

    // Example 3: Create a DevOps Agent with cloud capabilities
    const devopsTask = {
      id: 'meta-task-devops',
      type: 'agent-creation',
      description: 'Create a DevOps agent for automated deployment and monitoring',
      requirements: {
        agentType: 'devops',
        capabilities: [
          'deployment',
          'monitoring',
          'infrastructure-automation',
          'containerization',
          'cloud-management'
        ],
        externalMCPServers: [
          'github-mcp',           // For code management
          'docker-hub-mcp',       // For container registry
          'aws-lambda-mcp',       // For serverless deployment
          'slack-mcp'             // For notifications
        ],
        taskToExecute: {
          description: 'Deploy application with automated monitoring and alerts',
          steps: [
            'Pull latest code from GitHub',
            'Build and push Docker container',
            'Deploy to AWS Lambda',
            'Set up monitoring and health checks',
            'Send deployment notifications to Slack'
          ]
        }
      }
    };

    // Example 4: Create a Finance Agent with market data capabilities
    const financeTask = {
      id: 'meta-task-finance',
      type: 'agent-creation',
      description: 'Create a finance agent for market analysis and trading insights',
      requirements: {
        agentType: 'finance',
        capabilities: [
          'market-analysis',
          'portfolio-management',
          'risk-assessment',
          'trading-signals',
          'reporting'
        ],
        externalMCPServers: [
          'alpha-vantage-mcp',    // For market data
          'openai-mcp',           // For analysis insights
          'airtable-mcp',         // For data tracking
          'slack-mcp'             // For alerts
        ],
        taskToExecute: {
          description: 'Perform daily market analysis and generate trading insights',
          steps: [
            'Fetch latest market data from Alpha Vantage',
            'Analyze market trends and patterns',
            'Generate trading insights with AI analysis',
            'Update portfolio tracking in Airtable', 
            'Send daily market report to team'
          ]
        }
      }
    };

    // Demonstrate server discovery
    console.log('\n🔍 Discovering MCP Servers for Different Use Cases:\n');
    
    const aiServers = await mcpRegistry.discoverMCPServers('ai');
    console.log(`AI/ML Servers found: ${aiServers.length}`);
    aiServers.slice(0, 3).forEach(server => {
      console.log(`  📡 ${server.name} - ${server.tools.length} tools - ${server.cost}`);
    });

    const dataServers = await mcpRegistry.discoverMCPServers('data');
    console.log(`\nData Servers found: ${dataServers.length}`);
    dataServers.slice(0, 3).forEach(server => {
      console.log(`  📊 ${server.name} - ${server.tools.length} tools - ${server.cost}`);
    });

    const cloudServers = await mcpRegistry.discoverMCPServers('cloud');
    console.log(`\nCloud Servers found: ${cloudServers.length}`);
    cloudServers.slice(0, 3).forEach(server => {
      console.log(`  ☁️  ${server.name} - ${server.tools.length} tools - ${server.cost}`);
    });

    // Show recommended servers for different agent types
    console.log('\n🎯 Recommended MCP Servers by Agent Type:\n');
    
    ['data-science', 'marketing', 'devops', 'finance'].forEach(agentType => {
      const recommended = mcpRegistry.getRecommendedServers(agentType);
      console.log(`${agentType.toUpperCase()} Agent:`);
      recommended.slice(0, 4).forEach(server => {
        console.log(`  🔗 ${server.name} (${server.category}) - ${server.tools.length} tools`);
      });
      console.log('');
    });

    // Simulate task submission
    console.log('📋 Example Meta-Tasks that can be submitted:\n');
    
    [dataScienceTask, marketingTask, devopsTask, financeTask].forEach((task, index) => {
      console.log(`${index + 1}. ${task.description}`);
      console.log(`   Agent Type: ${task.requirements.agentType}`);
      console.log(`   Capabilities: ${task.requirements.capabilities.join(', ')}`);
      console.log(`   MCP Servers: ${task.requirements.externalMCPServers.join(', ')}`);
      console.log(`   Task: ${task.requirements.taskToExecute.description}`);
      console.log('');
    });

    // Show how to submit these tasks
    console.log('🚀 How to submit these tasks:\n');
    console.log('# Via CLI:');
    console.log('node src/index.js task "Create a data science agent with ML capabilities" --type agent-creation\n');
    
    console.log('# Via API (programmatic):');
    console.log('const result = await coordinator.processTask(dataScience Task);');
    console.log('console.log(result);\n');

    // Test server connections
    console.log('🔍 Testing connections to some MCP servers:\n');
    const testServers = ['github-mcp', 'openai-mcp', 'weather-mcp'];
    
    for (const serverId of testServers) {
      try {
        const result = await mcpRegistry.testServerConnection(serverId);
        console.log(`✅ ${serverId}: ${result.status}`);
      } catch (error) {
        console.log(`❌ ${serverId}: ${error.message}`);
      }
    }

    // Show what happens when a meta-task is processed
    console.log('\n⚙️  What happens when you submit a meta-task:\n');
    console.log('1. 🎯 Coordinator receives the meta-task');
    console.log('2. 🔧 Agent Factory creates the new agent code');
    console.log('3. 🚀 New agent is deployed and registered');
    console.log('4. 🔗 External MCP servers are connected'); 
    console.log('5. 📋 The actual task is delegated to the new agent');
    console.log('6. 🤖 New agent executes task using MCP servers');
    console.log('7. 📊 Results are synthesized and returned');
    console.log('8. ✅ Meta-task completed successfully\n');

    // Show the power of the system
    console.log('💪 System Capabilities:\n');
    console.log('✨ Create agents dynamically based on task requirements');
    console.log('🌐 Connect to any MCP server on the internet');
    console.log('🔄 Agents can create more agents (recursive meta-tasks)');
    console.log('🧠 AI-powered agent capability inference');
    console.log('📈 Automatic scaling based on workload');
    console.log('🔒 Secure authentication with external services');
    console.log('📊 Real-time monitoring and health checks');
    console.log('🎨 Custom agent generation with best practices');

    logger.info('✅ Meta-Task Demonstration completed successfully!');

  } catch (error) {
    logger.error('❌ Meta-Task Demo failed:', error);
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  runMetaTaskDemo().catch(console.error);
}

export default runMetaTaskDemo;