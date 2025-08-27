# Multi-Agent MCP Ensemble System

**A revolutionary self-expanding AI system with unified architecture**

[![System Grade](https://img.shields.io/badge/System%20Grade-A---%20(Well--architected%20and%20maintainable)-brightgreen)](./SYSTEM_ISSUES.md)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success)](./SYSTEM_DOCUMENTATION.md)
[![Test Coverage](https://img.shields.io/badge/Tests-Core%20Systems%20Tested-green)](./test/)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Redis (for message bus)
- API keys for AI providers (OpenAI, Anthropic, etc.)

### Installation
```bash
# Clone and install
git clone <repository>
cd a2a
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start the unified system
npm run play
```

### Basic Usage
```bash
# Interactive Press Play interface
npm run play

# Then try commands like:
/mode autonomous
/analyze "market trends in AI"
/discuss "future of autonomous systems"
```

## 📋 Prerequisites

- Node.js 18+ 
- Redis server (for message bus)
- PostgreSQL/MongoDB (for MCP servers)
- Git (for version control MCP)

## 🏗 Architecture

### Agent Types

**Coordinator Agent**
- Task decomposition and delegation
- Result synthesis and coordination
- Agent discovery and load balancing

**Specialist Agents**
- **Code Agent**: Programming, debugging, refactoring, code review
- **Research Agent**: Information gathering, web search, documentation analysis
- **Analysis Agent**: Data analysis, pattern recognition, reporting
- **Testing Agent**: Test creation, validation, quality assurance
- **DevOps Agent**: Deployment, monitoring, infrastructure management

**Worker Agents**
- **File Agent**: File system operations, content management
- **Database Agent**: Data persistence, queries, migrations
- **API Agent**: External service integration, HTTP requests
- **Security Agent**: Vulnerability scanning, compliance checking

### MCP Servers

- **Database MCP**: PostgreSQL, MongoDB, Redis connections
- **Git MCP**: Version control operations
- **File System MCP**: Local and cloud file operations
- **Web API MCP**: External service integrations
- **Testing MCP**: Test execution and reporting
- **Security MCP**: Scanning, compliance, secrets management

## 🛠 Configuration

The system is configured via `config/ensemble.yaml`:

```yaml
ensemble:
  name: "multi-agent-mcp-ensemble"
  
  agents:
    coordinator:
      replicas: 1
    specialists:
      - type: "code"
        replicas: 2
        capabilities: ["programming", "debugging"]
      - type: "research"  
        replicas: 1
        capabilities: ["information-gathering"]
    workers:
      - type: "file"
        replicas: 1
        capabilities: ["file-operations"]
  
  mcp_servers:
    - id: "database-mcp"
      type: "database"
      endpoint: "postgresql://localhost:5432/ensemble_db"
      tools: ["query", "migrate", "backup"]
```

## 🚀 Usage

### Starting the Ensemble

```bash
# Start complete system
npm run start:all

# Start with custom config
node src/index.js start --config ./my-config.yaml

# Start individual agents
npm run start:coordinator
npm run start:code-agent
npm run start:research-agent
```

### CLI Commands

```bash
# Show ensemble status
node src/index.js status

# Start specific agent type  
node src/index.js agent code --id code-agent-1

# Submit a task
node src/index.js task "Build a REST API for user management"

# Generate example config
node src/index.js config --output my-ensemble.yaml
```

### Submitting Tasks

Tasks can be submitted programmatically:

```javascript
import { CoordinatorAgent } from './src/agents/coordinator.js';

const coordinator = new CoordinatorAgent(config);
await coordinator.initialize();

const task = {
  id: 'task-001',
  type: 'software-development',
  description: 'Build a user authentication system',
  priority: 'high',
  requiredCapabilities: ['programming', 'security']
};

const result = await coordinator.processTask(task);
console.log('Task result:', result);
```

## 🔧 Development

### Project Structure

```
src/
├── core/                  # Core framework
│   ├── base-agent.js     # Base agent class
│   ├── message-bus.js    # Redis message bus
│   └── mcp-manager.js    # MCP server management
├── agents/               # Agent implementations
│   ├── coordinator.js    # Coordinator agent
│   ├── specialists/      # Specialist agents
│   │   ├── code-agent.js
│   │   └── research-agent.js
│   └── workers/          # Worker agents
│       └── file-agent.js
├── utils/                # Utilities
│   └── logger.js         # Winston logger
└── index.js              # CLI entry point
```

### Adding New Agents

1. Create agent class extending `BaseAgent`:

```javascript
import { BaseAgent } from '../core/base-agent.js';

export class MyAgent extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      type: 'my-agent',
      capabilities: ['my-capability']
    });
  }
  
  async processTask(task) {
    // Implement task processing logic
    return { status: 'completed', result: 'task done' };
  }
}
```

2. Add to configuration:

```yaml
agents:
  specialists:
    - type: "my-agent"
      replicas: 1
      capabilities: ["my-capability"]
```

3. Add npm script:

```json
{
  "scripts": {
    "start:my-agent": "node src/agents/specialists/my-agent.js"
  }
}
```

### Adding MCP Servers

1. Implement MCP client in `mcp-manager.js`
2. Add server configuration:

```yaml
mcp_servers:
  - id: "my-mcp"
    type: "my-service"  
    endpoint: "https://api.myservice.com"
    tools: ["tool1", "tool2"]
    capabilities: ["my-capability"]
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testNamePattern="BaseAgent"

# Run with coverage
npm test -- --coverage
```

## 📊 Monitoring

The system includes comprehensive monitoring:

- **Health Checks**: Automatic agent and MCP server health monitoring
- **Metrics**: Performance and task completion metrics
- **Logging**: Structured logging with Winston
- **Status Dashboard**: Real-time system status

View logs:

```bash
# Combined logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Agent-specific logs
grep "code-agent-1" logs/combined.log
```

## 🔒 Security

- **Authentication**: JWT-based agent authentication
- **Encryption**: TLS for all inter-component communication  
- **Secrets Management**: Centralized secret distribution
- **Audit Logging**: Complete audit trail of agent actions
- **Network Isolation**: Containerized agent environments

## 🐳 Docker Deployment

```bash
# Build ensemble image
docker build -t multi-agent-ensemble .

# Run with Docker Compose
docker-compose up -d

# Scale specific agents
docker-compose up -d --scale code-agent=3
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: See `/docs` directory
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## 🎯 Example Use Cases

### Software Development
```bash
node src/index.js task "Build a REST API with authentication, user management, and PostgreSQL integration"
```

### Data Analysis  
```bash
node src/index.js task "Analyze customer data trends and generate executive dashboard" --type data-analysis
```

### Research Project
```bash
node src/index.js task "Research latest AI/ML frameworks and provide comparison report" --type research
```

## 🔮 Roadmap

- [ ] Web UI dashboard for ensemble management
- [ ] Advanced task scheduling and prioritization  
- [ ] Integration with additional MCP servers
- [ ] Kubernetes operator for cloud deployment
- [ ] Machine learning-based task optimization
- [ ] Multi-tenant support
- [ ] Advanced security features