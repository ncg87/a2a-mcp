# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Multi-Agent MCP Ensemble System** - a revolutionary self-expanding AI system that can dynamically create specialized agents and connect to external MCP (Model Context Protocol) servers from the internet. The system demonstrates advanced distributed AI architecture with recursive self-improvement capabilities.

## Core System Capabilities

### 🤖 Dynamic Agent Creation
The system can create new agents on-demand based on task requirements:
- Analyze task descriptions to infer required capabilities
- Generate complete agent code with best practices
- Deploy agents at runtime and integrate them into the system
- Support recursive agent creation (agents creating other agents)

### 🌐 External MCP Integration
Connect to 30+ external MCP servers across the internet:
- AI/ML services (OpenAI, Anthropic, Hugging Face)
- Development tools (GitHub, Docker Hub, AWS)
- Data services (Kaggle, Alpha Vantage, Airtable)
- Communication platforms (Slack, Discord, Notion)

### 🧠 Meta-Task Processing
Handle complex multi-step workflows:
- Decompose high-level tasks into executable subtasks
- Route tasks to appropriate agents (existing or newly created)
- Manage task dependencies and parallel execution
- Synthesize results from multiple agents

## Architecture

### Key Components

**Enhanced Coordinator** (`src/agents/coordinator-enhanced.js`)
- Orchestrates meta-tasks and agent creation
- Handles intelligent task decomposition
- Manages agent lifecycle and communication

**Agent Factory** (`src/agents/specialists/agent-factory.js`)
- Creates specialized agents based on requirements
- Generates agent code with capabilities and MCP connections
- Manages agent deployment and registration

**External MCP Registry** (`src/core/external-mcp-registry.js`)
- Maintains registry of 30+ external MCP servers
- Provides intelligent server discovery and selection
- Handles authentication and connection testing

**Base Agent Framework** (`src/core/base-agent.js`)
- Foundation for all agents with event-driven architecture
- MCP client management and tool invocation
- Health monitoring and error recovery

### Message Flow
```
User Task → Enhanced Coordinator → Task Decomposition → Agent Factory (if needed) 
→ MCP Connections → Task Execution → Result Synthesis → Response
```

## Development Guidelines

### Working with Meta-Tasks
When users request tasks that involve creating agents or connecting to external services:

1. **Recognize Meta-Task Patterns**:
   - Tasks mentioning "create agent", "connect to external service", "use AI/ML"
   - Tasks requiring capabilities not available in existing agents
   - Tasks involving multiple external platforms

2. **Task Decomposition Process**:
   - Analyze task requirements and infer needed capabilities
   - Determine if new agents are needed
   - Identify optimal external MCP servers
   - Create execution plan with dependencies

3. **Agent Creation**:
   - Use Agent Factory to generate specialized agents
   - Ensure agents include proper MCP server connections
   - Follow established patterns for capability implementation

### Common Development Tasks

#### Build and Run System
```bash
# Install dependencies
npm install

# Start complete ensemble
npm run start:all

# Start individual components
npm run start:coordinator
npm run start:code-agent
```

#### Submit Meta-Tasks
```bash
# Create data science agent with external connections
node src/index.js task "Create a data science agent that uses Kaggle for data and OpenAI for analysis"

# Create marketing agent with social media integration
node src/index.js task "Create a marketing agent that manages campaigns across Slack and Discord"
```

#### Add New Agent Types
1. Create agent class extending `BaseAgent`
2. Add configuration to `config/ensemble.yaml`
3. Update Agent Factory templates
4. Add MCP server recommendations

#### Integrate New MCP Servers
1. Add server config to `external-mcp-registry.js`
2. Implement authentication handling
3. Update agent recommendations
4. Test connections and error handling

### Testing
```bash
# Run all tests
npm test

# Test specific components
npm test -- --testNamePattern="BaseAgent"

# Run with coverage
npm test -- --coverage
```

### Logging and Monitoring
- Use structured logging with agent/task context
- Monitor agent health and MCP server connections
- Log all meta-task operations for debugging

## Key Files to Understand

### Core Framework
- `src/core/base-agent.js` - Base agent implementation
- `src/core/message-bus.js` - Redis communication system
- `src/core/mcp-manager.js` - MCP server management
- `src/core/external-mcp-registry.js` - External server registry

### Agent System
- `src/agents/coordinator-enhanced.js` - Meta-task coordinator
- `src/agents/specialists/agent-factory.js` - Dynamic agent creator
- `src/agents/specialists/code-agent.js` - Programming agent
- `src/agents/specialists/research-agent.js` - Research agent

### System Management
- `src/ensemble-launcher.js` - System orchestration
- `src/index.js` - CLI interface
- `config/ensemble.yaml` - System configuration

### Documentation
- `SYSTEM_DOCUMENTATION.md` - Comprehensive system overview
- `README.md` - Quick start guide
- `examples/` - Working examples and demos

## Important Patterns

### Meta-Task Recognition
```javascript
isMetaTask(task) {
  const description = task.description.toLowerCase();
  return description.includes('create agent') || 
         description.includes('connect mcp') ||
         task.type === 'agent-creation';
}
```

### Agent Code Generation
```javascript
generateAgentCode(agentSpec) {
  return `
export class ${AgentClass} extends BaseAgent {
  constructor(config) {
    super({
      type: '${agentSpec.type}',
      capabilities: ${JSON.stringify(agentSpec.capabilities)}
    });
  }
  
  async processTask(task) {
    // Generated task processing logic
  }
}`;
}
```

### MCP Server Discovery
```javascript
async discoverMCPServers(query) {
  const results = [];
  for (const [id, server] of this.registry) {
    if (server.capabilities.some(cap => cap.includes(query))) {
      results.push(server);
    }
  }
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
```

## System Philosophy

This system embodies several key principles:

1. **Self-Expansion**: The system can grow its own capabilities by creating specialized agents
2. **Internet Integration**: Leverages external services to extend functionality beyond local capabilities
3. **Recursive Intelligence**: Agents can create other agents, enabling complex emergent behaviors
4. **Distributed Architecture**: No single point of failure, agents operate independently
5. **Adaptive Scaling**: System scales resources based on workload demands

## Best Practices

### When Adding New Features
- Follow the existing agent pattern and extend `BaseAgent`
- Add proper MCP server integration for external services
- Include comprehensive error handling and recovery
- Update configuration files and documentation
- Add tests for new functionality

### When Handling User Requests
- Always check if the request involves meta-task capabilities
- Consider whether new agents or MCP connections are needed
- Provide clear explanations of what the system will do
- Show the multi-step process for complex tasks

### Performance Considerations
- Use async/await for all I/O operations
- Implement proper connection pooling for MCP servers
- Monitor agent resource usage and scale appropriately
- Cache frequently used data and results

## Security Notes
- All external MCP connections require proper authentication
- Agent-to-agent communication is secured through the message bus
- Secrets are managed through environment variables
- Generated agent code includes security best practices

This system represents a significant advancement in AI architecture, demonstrating how artificial intelligence can autonomously expand its capabilities through dynamic component creation and external service integration.

## Press Play System - Ultimate Interface

The system includes a revolutionary "Press Play" interface (`src/press-play.js`) that allows users to simply write any natural language prompt and have the system:

1. **Automatically analyze** the prompt for complexity and requirements
2. **Dynamically create** specialized agents with needed capabilities  
3. **Connect to optimal** external MCP servers from the internet
4. **Execute using A2A/ACP protocols** for formal agent communication
5. **Return complete results** with full execution details

### Using Press Play
```bash
# Start interactive mode
npm run play

# Then just type ANY prompt:
# "Analyze customer data and build ML model"
# "Deploy to AWS with monitoring"
# "Create social media campaign"
# "Research AI trends and generate report"
```

### Protocol Integration

**A2A (Agent-to-Agent) Protocol** (`src/core/a2a-protocol.js`):
- Direct agent communication and negotiation
- Trust network management
- Capability sharing and requests
- Collaborative task execution

**ACP (Agent Communication Protocol)** (`src/core/acp-protocol.js`):
- Formal performative-based messaging
- Ontology and belief management
- Contract net protocol for task delegation
- Distributed consensus mechanisms

### Auto-Orchestrator System

The `AutoOrchestrator` class (`src/core/auto-orchestrator.js`) provides:
- Intelligent prompt analysis (complexity, capabilities, domains)
- Dynamic agent specification and creation
- Optimal MCP server selection from 30+ available servers
- Multi-agent coordination using both A2A and ACP protocols
- Real-time execution monitoring and result synthesis

### When Working with User Requests

1. **Always check if Press Play is appropriate**: For any complex request involving multiple steps, agent creation, or external service integration

2. **Use the Press Play interface**: `npm run play` for interactive mode, or direct execution via `AutoOrchestrator`

3. **Expect automatic capabilities**: The system will create needed agents and connect to relevant MCP servers without manual configuration

4. **Protocol-aware execution**: All agent communication uses formal A2A and ACP protocols for reliability and standardization