/**
 * Agent Interaction Documenter
 * 
 * Records and documents all agent interactions, decisions, and communications
 * for each task execution session.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class InteractionDocumenter {
  constructor() {
    this.sessions = new Map();
    this.currentSession = null;
    this.docsDir = path.join(__dirname, '../../docs/interactions');
    this.initialized = false;
  }

  async initialize() {
    try {
      // Ensure docs directory exists
      await fs.mkdir(this.docsDir, { recursive: true });
      this.initialized = true;
      logger.info('Interaction Documenter initialized');
    } catch (error) {
      logger.error('Failed to initialize Interaction Documenter:', error);
      throw error;
    }
  }

  /**
   * Start a new documentation session for a task
   */
  async startSession(prompt, analysis) {
    if (!this.initialized) await this.initialize();

    const sessionId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const session = {
      id: sessionId,
      prompt,
      analysis,
      startTime: timestamp,
      agents: new Map(),
      interactions: [],
      mcpConnections: [],
      protocolEvents: [],
      decisions: [],
      results: null,
      endTime: null,
      status: 'active'
    };

    this.sessions.set(sessionId, session);
    this.currentSession = session;

    logger.info(`Started documentation session: ${sessionId}`, { prompt });
    return sessionId;
  }

  /**
   * Record agent creation
   */
  recordAgentCreation(agentData) {
    if (!this.currentSession) return;

    const agent = {
      id: agentData.id || uuidv4(),
      type: agentData.type,
      capabilities: agentData.capabilities || [],
      mcpServers: agentData.mcpServers || [],
      createdAt: new Date().toISOString(),
      status: 'created',
      messagesSent: 0,
      messagesReceived: 0,
      tasksCompleted: 0,
      errors: []
    };

    this.currentSession.agents.set(agent.id, agent);
    
    this.recordEvent('agent-creation', {
      agentId: agent.id,
      type: agent.type,
      capabilities: agent.capabilities,
      timestamp: agent.createdAt
    });

    logger.info(`Documented agent creation: ${agent.type}`, { agentId: agent.id });
  }

  /**
   * Record MCP server connection
   */
  recordMCPConnection(serverId, serverData, connectionResult) {
    if (!this.currentSession) return;

    const connection = {
      serverId,
      serverName: serverData.name,
      serverType: serverData.type,
      category: serverData.category,
      tools: serverData.tools,
      capabilities: serverData.capabilities,
      connectionTime: new Date().toISOString(),
      status: connectionResult.available ? 'connected' : 'failed',
      error: connectionResult.error || null,
      responseTime: connectionResult.responseTime || null
    };

    this.currentSession.mcpConnections.push(connection);
    
    this.recordEvent('mcp-connection', connection);

    logger.info(`Documented MCP connection: ${serverData.name}`, { 
      status: connection.status,
      serverId 
    });
  }

  /**
   * Record agent-to-agent interaction
   */
  recordAgentInteraction(fromAgent, toAgent, messageType, content, protocol = 'A2A') {
    if (!this.currentSession) return;

    const interaction = {
      id: uuidv4(),
      fromAgent,
      toAgent,
      messageType,
      content,
      protocol,
      timestamp: new Date().toISOString(),
      processed: false,
      response: null
    };

    this.currentSession.interactions.push(interaction);

    // Update agent statistics
    if (this.currentSession.agents.has(fromAgent)) {
      this.currentSession.agents.get(fromAgent).messagesSent++;
    }
    if (this.currentSession.agents.has(toAgent)) {
      this.currentSession.agents.get(toAgent).messagesReceived++;
    }

    this.recordEvent('agent-interaction', interaction);

    logger.debug(`Documented agent interaction: ${fromAgent} -> ${toAgent}`, {
      messageType,
      protocol
    });

    return interaction.id;
  }

  /**
   * Record protocol-specific events (A2A negotiation, ACP performatives, etc.)
   */
  recordProtocolEvent(protocol, eventType, participants, data) {
    if (!this.currentSession) return;

    const event = {
      id: uuidv4(),
      protocol,
      eventType,
      participants,
      data,
      timestamp: new Date().toISOString()
    };

    this.currentSession.protocolEvents.push(event);
    
    this.recordEvent('protocol-event', event);

    logger.debug(`Documented protocol event: ${protocol}/${eventType}`, {
      participants,
      eventType
    });
  }

  /**
   * Record agent decision making
   */
  recordDecision(agentId, decisionType, context, options, chosen, reasoning) {
    if (!this.currentSession) return;

    const decision = {
      id: uuidv4(),
      agentId,
      decisionType,
      context,
      options,
      chosen,
      reasoning,
      timestamp: new Date().toISOString(),
      confidence: null
    };

    this.currentSession.decisions.push(decision);
    
    this.recordEvent('agent-decision', decision);

    logger.info(`Documented agent decision: ${agentId}/${decisionType}`, {
      chosen,
      optionsCount: options.length
    });
  }

  /**
   * Record task completion or error
   */
  recordTaskResult(agentId, taskType, result, success, error = null) {
    if (!this.currentSession) return;

    const taskResult = {
      id: uuidv4(),
      agentId,
      taskType,
      result,
      success,
      error,
      timestamp: new Date().toISOString()
    };

    // Update agent statistics
    if (this.currentSession.agents.has(agentId)) {
      const agent = this.currentSession.agents.get(agentId);
      if (success) {
        agent.tasksCompleted++;
      } else {
        agent.errors.push(taskResult);
      }
    }

    this.recordEvent('task-result', taskResult);

    logger.info(`Documented task result: ${agentId}/${taskType}`, {
      success,
      error: error?.message
    });
  }

  /**
   * Record generic event
   */
  recordEvent(eventType, data) {
    if (!this.currentSession) return;

    const event = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      sessionId: this.currentSession.id
    };

    // Store in session for detailed analysis
    if (!this.currentSession.events) {
      this.currentSession.events = [];
    }
    this.currentSession.events.push(event);
  }

  /**
   * End current session and generate documentation
   */
  async endSession(finalResults, overallStatus) {
    if (!this.currentSession) return null;

    this.currentSession.results = finalResults;
    this.currentSession.endTime = new Date().toISOString();
    this.currentSession.status = overallStatus;

    // Calculate session statistics
    const stats = this.calculateSessionStats();
    this.currentSession.statistics = stats;

    // Generate documentation files
    const docFiles = await this.generateDocumentation();

    logger.info(`Ended documentation session: ${this.currentSession.id}`, {
      duration: stats.duration,
      agentCount: stats.agentCount,
      interactionCount: stats.interactionCount
    });

    // Archive session
    const completedSession = this.currentSession;
    this.currentSession = null;

    return {
      sessionId: completedSession.id,
      documentation: docFiles,
      statistics: stats
    };
  }

  /**
   * Calculate session statistics
   */
  calculateSessionStats() {
    if (!this.currentSession) return null;

    const session = this.currentSession;
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    const duration = endTime - startTime;

    return {
      duration: duration,
      durationFormatted: this.formatDuration(duration),
      agentCount: session.agents.size,
      interactionCount: session.interactions.length,
      mcpConnectionCount: session.mcpConnections.length,
      protocolEventCount: session.protocolEvents.length,
      decisionCount: session.decisions.length,
      successfulMCPConnections: session.mcpConnections.filter(c => c.status === 'connected').length,
      failedMCPConnections: session.mcpConnections.filter(c => c.status === 'failed').length,
      agentTypes: Array.from(session.agents.values()).map(a => a.type),
      protocolsUsed: [...new Set(session.interactions.map(i => i.protocol))],
      totalMessages: session.interactions.length,
      totalErrors: Array.from(session.agents.values()).reduce((sum, a) => sum + a.errors.length, 0)
    };
  }

  /**
   * Generate comprehensive documentation
   */
  async generateDocumentation() {
    if (!this.currentSession) return null;

    const session = this.currentSession;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `interaction-log-${timestamp}`;

    const files = {};

    try {
      // 1. Executive Summary
      files.summary = await this.generateExecutiveSummary(baseFilename);
      
      // 2. Detailed Agent Report
      files.agents = await this.generateAgentReport(baseFilename);
      
      // 3. Interaction Timeline
      files.timeline = await this.generateInteractionTimeline(baseFilename);
      
      // 4. Protocol Analysis
      files.protocols = await this.generateProtocolAnalysis(baseFilename);
      
      // 5. MCP Connection Report
      files.mcpReport = await this.generateMCPReport(baseFilename);
      
      // 6. Decision Analysis
      files.decisions = await this.generateDecisionAnalysis(baseFilename);

      // 7. Raw JSON Data
      files.rawData = await this.generateRawDataExport(baseFilename);

      return files;
    } catch (error) {
      logger.error('Failed to generate documentation:', error);
      throw error;
    }
  }

  /**
   * Generate executive summary document
   */
  async generateExecutiveSummary(baseFilename) {
    const session = this.currentSession;
    const stats = session.statistics;
    
    const content = `# Agent Interaction Executive Summary

## Session Overview
- **Session ID**: ${session.id}
- **Original Prompt**: "${session.prompt}"
- **Start Time**: ${session.startTime}
- **End Time**: ${session.endTime}
- **Duration**: ${stats.durationFormatted}
- **Final Status**: ${session.status}

## Key Metrics
- **Agents Created**: ${stats.agentCount}
- **Agent Types**: ${stats.agentTypes.join(', ')}
- **Total Interactions**: ${stats.interactionCount}
- **MCP Connections**: ${stats.successfulMCPConnections}/${stats.mcpConnectionCount}
- **Protocols Used**: ${stats.protocolsUsed.join(', ')}
- **Decisions Made**: ${stats.decisionCount}

## Task Analysis
- **Complexity**: ${session.analysis.complexity}/10
- **Required Capabilities**: ${session.analysis.requiredCapabilities?.join(', ') || 'N/A'}
- **Estimated Time**: ${session.analysis.estimatedTime || 'N/A'}ms

## Agent Performance
${Array.from(session.agents.values()).map(agent => `
### ${agent.type.toUpperCase()} Agent (${agent.id})
- **Messages Sent**: ${agent.messagesSent}
- **Messages Received**: ${agent.messagesReceived}
- **Tasks Completed**: ${agent.tasksCompleted}
- **Errors**: ${agent.errors.length}
- **MCP Servers**: ${agent.mcpServers.join(', ') || 'None'}
`).join('')}

## MCP Server Utilization
${session.mcpConnections.map(conn => `
- **${conn.serverName}**: ${conn.status} (${conn.category})
  - Tools: ${conn.tools.slice(0, 3).join(', ')}${conn.tools.length > 3 ? '...' : ''}
`).join('')}

## Execution Summary
${session.results?.steps?.map((step, index) => `
${index + 1}. ${step.error ? '❌' : '✅'} ${step.step}
`).join('') || 'No detailed steps recorded'}

## Overall Assessment
- **Success Rate**: ${session.status === 'success' ? '100%' : '< 100%'}
- **Agent Collaboration**: ${stats.interactionCount > 0 ? 'Active' : 'Limited'}
- **External Integration**: ${stats.successfulMCPConnections > 0 ? 'Successful' : 'None'}
- **Protocol Compliance**: ${stats.protocolEventCount > 0 ? 'Documented' : 'Basic'}

---
*Generated by Multi-Agent MCP Ensemble System*
*Session ID: ${session.id}*
`;

    const filename = `${baseFilename}-summary.md`;
    const filepath = path.join(this.docsDir, filename);
    await fs.writeFile(filepath, content);
    
    return { filename, filepath };
  }

  /**
   * Generate detailed agent report
   */
  async generateAgentReport(baseFilename) {
    const session = this.currentSession;
    
    const content = `# Detailed Agent Report

## Session Information
- **Session ID**: ${session.id}
- **Generated**: ${new Date().toISOString()}

${Array.from(session.agents.values()).map(agent => `
## ${agent.type.toUpperCase()} Agent

### Basic Information
- **Agent ID**: ${agent.id}
- **Type**: ${agent.type}
- **Created**: ${agent.createdAt}
- **Status**: ${agent.status}

### Capabilities
${agent.capabilities.map(cap => `- ${cap}`).join('\n')}

### MCP Server Connections
${agent.mcpServers.length > 0 ? agent.mcpServers.map(server => `- ${server}`).join('\n') : '- None'}

### Communication Statistics
- **Messages Sent**: ${agent.messagesSent}
- **Messages Received**: ${agent.messagesReceived}
- **Tasks Completed**: ${agent.tasksCompleted}
- **Error Count**: ${agent.errors.length}

### Interactions Initiated
${session.interactions.filter(i => i.fromAgent === agent.id).map(interaction => `
- **To**: ${interaction.toAgent}
- **Type**: ${interaction.messageType}
- **Protocol**: ${interaction.protocol}
- **Time**: ${interaction.timestamp}
- **Content**: ${JSON.stringify(interaction.content)}
`).join('')}

### Interactions Received
${session.interactions.filter(i => i.toAgent === agent.id).map(interaction => `
- **From**: ${interaction.fromAgent}
- **Type**: ${interaction.messageType}
- **Protocol**: ${interaction.protocol}
- **Time**: ${interaction.timestamp}
- **Content**: ${JSON.stringify(interaction.content)}
`).join('')}

### Errors Encountered
${agent.errors.length > 0 ? agent.errors.map(error => `
- **Time**: ${error.timestamp}
- **Task**: ${error.taskType}
- **Error**: ${error.error}
`).join('') : '- None'}

---
`).join('')}

*Generated by Multi-Agent MCP Ensemble System*
`;

    const filename = `${baseFilename}-agents.md`;
    const filepath = path.join(this.docsDir, filename);
    await fs.writeFile(filepath, content);
    
    return { filename, filepath };
  }

  /**
   * Generate interaction timeline
   */
  async generateInteractionTimeline(baseFilename) {
    const session = this.currentSession;
    
    // Combine and sort all events by timestamp
    const allEvents = [
      ...session.interactions.map(i => ({ ...i, eventType: 'interaction' })),
      ...session.protocolEvents.map(p => ({ ...p, eventType: 'protocol' })),
      ...session.decisions.map(d => ({ ...d, eventType: 'decision' })),
      ...(session.events || [])
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const content = `# Agent Interaction Timeline

## Session: ${session.id}
**Prompt**: "${session.prompt}"

## Chronological Event Log

${allEvents.map((event, index) => {
  const time = new Date(event.timestamp).toLocaleTimeString();
  
  if (event.eventType === 'interaction') {
    return `### ${index + 1}. [${time}] Agent Interaction
- **From**: ${event.fromAgent}
- **To**: ${event.toAgent}
- **Type**: ${event.messageType}
- **Protocol**: ${event.protocol}
- **Content**: ${typeof event.content === 'object' ? JSON.stringify(event.content, null, 2) : event.content}
`;
  } else if (event.eventType === 'protocol') {
    return `### ${index + 1}. [${time}] Protocol Event (${event.protocol})
- **Event Type**: ${event.eventType}
- **Participants**: ${event.participants?.join(', ') || 'N/A'}
- **Data**: ${JSON.stringify(event.data, null, 2)}
`;
  } else if (event.eventType === 'decision') {
    return `### ${index + 1}. [${time}] Agent Decision
- **Agent**: ${event.agentId}
- **Decision Type**: ${event.decisionType}
- **Context**: ${event.context}
- **Options**: ${event.options?.join(', ') || 'N/A'}
- **Chosen**: ${event.chosen}
- **Reasoning**: ${event.reasoning}
`;
  } else {
    return `### ${index + 1}. [${time}] System Event
- **Type**: ${event.type}
- **Data**: ${JSON.stringify(event.data, null, 2)}
`;
  }
}).join('\n')}

---
*Generated by Multi-Agent MCP Ensemble System*
*Total Events: ${allEvents.length}*
`;

    const filename = `${baseFilename}-timeline.md`;
    const filepath = path.join(this.docsDir, filename);
    await fs.writeFile(filepath, content);
    
    return { filename, filepath };
  }

  /**
   * Generate protocol analysis
   */
  async generateProtocolAnalysis(baseFilename) {
    const session = this.currentSession;
    const protocolUsage = {};
    
    // Analyze protocol usage
    session.interactions.forEach(interaction => {
      if (!protocolUsage[interaction.protocol]) {
        protocolUsage[interaction.protocol] = {
          count: 0,
          messageTypes: new Set(),
          agents: new Set()
        };
      }
      protocolUsage[interaction.protocol].count++;
      protocolUsage[interaction.protocol].messageTypes.add(interaction.messageType);
      protocolUsage[interaction.protocol].agents.add(interaction.fromAgent);
      protocolUsage[interaction.protocol].agents.add(interaction.toAgent);
    });
    
    const content = `# Protocol Analysis Report

## Session: ${session.id}

## Protocol Usage Summary

${Object.entries(protocolUsage).map(([protocol, usage]) => `
### ${protocol} Protocol
- **Total Messages**: ${usage.count}
- **Message Types**: ${Array.from(usage.messageTypes).join(', ')}
- **Participating Agents**: ${Array.from(usage.agents).join(', ')}
- **Usage Percentage**: ${((usage.count / session.interactions.length) * 100).toFixed(1)}%
`).join('')}

## Protocol Events Detail

${session.protocolEvents.map((event, index) => `
### Event ${index + 1}: ${event.protocol}/${event.eventType}
- **Time**: ${event.timestamp}
- **Participants**: ${event.participants?.join(', ') || 'N/A'}
- **Data**: 
\`\`\`json
${JSON.stringify(event.data, null, 2)}
\`\`\`
`).join('')}

## Message Flow Analysis

### A2A (Agent-to-Agent) Protocol
${session.interactions.filter(i => i.protocol === 'A2A').map(interaction => `
- **${interaction.fromAgent}** → **${interaction.toAgent}**: ${interaction.messageType}
  - Time: ${interaction.timestamp}
  - Content: ${typeof interaction.content === 'string' ? interaction.content : JSON.stringify(interaction.content)}
`).join('')}

### ACP (Agent Communication Protocol)
${session.interactions.filter(i => i.protocol === 'ACP').map(interaction => `
- **${interaction.fromAgent}** → **${interaction.toAgent}**: ${interaction.messageType}
  - Time: ${interaction.timestamp}
  - Content: ${typeof interaction.content === 'string' ? interaction.content : JSON.stringify(interaction.content)}
`).join('')}

## Protocol Compliance
- **Total Protocol Events**: ${session.protocolEvents.length}
- **Formal Message Structure**: ${session.interactions.every(i => i.protocol) ? 'Compliant' : 'Partial'}
- **Event Documentation**: ${session.protocolEvents.length > 0 ? 'Complete' : 'Limited'}

---
*Generated by Multi-Agent MCP Ensemble System*
`;

    const filename = `${baseFilename}-protocols.md`;
    const filepath = path.join(this.docsDir, filename);
    await fs.writeFile(filepath, content);
    
    return { filename, filepath };
  }

  /**
   * Generate MCP connection report
   */
  async generateMCPReport(baseFilename) {
    const session = this.currentSession;
    
    const content = `# MCP Server Connection Report

## Session: ${session.id}

## Connection Summary
- **Total Connections Attempted**: ${session.mcpConnections.length}
- **Successful Connections**: ${session.mcpConnections.filter(c => c.status === 'connected').length}
- **Failed Connections**: ${session.mcpConnections.filter(c => c.status === 'failed').length}

## Connection Details

${session.mcpConnections.map((conn, index) => `
### ${index + 1}. ${conn.serverName}
- **Server ID**: ${conn.serverId}
- **Type**: ${conn.serverType}
- **Category**: ${conn.category}
- **Status**: ${conn.status === 'connected' ? '✅ Connected' : '❌ Failed'}
- **Connection Time**: ${conn.connectionTime}
- **Response Time**: ${conn.responseTime || 'N/A'}ms
${conn.error ? `- **Error**: ${conn.error}` : ''}

#### Available Tools (${conn.tools.length})
${conn.tools.map(tool => `- ${tool}`).join('\n')}

#### Capabilities (${conn.capabilities.length})
${conn.capabilities.map(cap => `- ${cap}`).join('\n')}

---
`).join('')}

## Category Breakdown
${Object.entries(
  session.mcpConnections.reduce((acc, conn) => {
    if (!acc[conn.category]) acc[conn.category] = [];
    acc[conn.category].push(conn);
    return acc;
  }, {})
).map(([category, connections]) => `
### ${category.toUpperCase()}
- **Servers**: ${connections.length}
- **Success Rate**: ${((connections.filter(c => c.status === 'connected').length / connections.length) * 100).toFixed(1)}%
- **Servers**: ${connections.map(c => c.serverName).join(', ')}
`).join('')}

## Integration Impact
- **Enhanced Capabilities**: ${session.mcpConnections.filter(c => c.status === 'connected').reduce((acc, conn) => acc + conn.capabilities.length, 0)} additional capabilities
- **Available Tools**: ${session.mcpConnections.filter(c => c.status === 'connected').reduce((acc, conn) => acc + conn.tools.length, 0)} external tools
- **External Reach**: ${[...new Set(session.mcpConnections.map(c => c.category))].length} service categories

---
*Generated by Multi-Agent MCP Ensemble System*
`;

    const filename = `${baseFilename}-mcp-report.md`;
    const filepath = path.join(this.docsDir, filename);
    await fs.writeFile(filepath, content);
    
    return { filename, filepath };
  }

  /**
   * Generate decision analysis
   */
  async generateDecisionAnalysis(baseFilename) {
    const session = this.currentSession;
    
    const content = `# Agent Decision Analysis

## Session: ${session.id}

## Decision Summary
- **Total Decisions**: ${session.decisions.length}
- **Agents Involved**: ${[...new Set(session.decisions.map(d => d.agentId))].length}
- **Decision Types**: ${[...new Set(session.decisions.map(d => d.decisionType))].join(', ')}

## Detailed Decision Log

${session.decisions.map((decision, index) => `
### Decision ${index + 1}: ${decision.decisionType}
- **Agent**: ${decision.agentId}
- **Time**: ${decision.timestamp}
- **Context**: ${decision.context}
- **Available Options**: ${decision.options?.join(', ') || 'N/A'}
- **Decision Made**: ${decision.chosen}
- **Reasoning**: ${decision.reasoning}
${decision.confidence ? `- **Confidence**: ${decision.confidence}` : ''}

---
`).join('')}

## Decision Analysis by Agent

${[...new Set(session.decisions.map(d => d.agentId))].map(agentId => {
  const agentDecisions = session.decisions.filter(d => d.agentId === agentId);
  return `
### ${agentId}
- **Total Decisions**: ${agentDecisions.length}
- **Decision Types**: ${[...new Set(agentDecisions.map(d => d.decisionType))].join(', ')}
- **Most Recent**: ${agentDecisions[agentDecisions.length - 1]?.timestamp || 'N/A'}

#### Decision Breakdown
${agentDecisions.map((decision, idx) => `
${idx + 1}. **${decision.decisionType}** (${decision.timestamp})
   - Chose: ${decision.chosen}
   - Reason: ${decision.reasoning}
`).join('')}
`;
}).join('')}

## Decision Pattern Analysis
- **Most Common Decision Type**: ${
  session.decisions.length > 0 
    ? Object.entries(session.decisions.reduce((acc, d) => {
        acc[d.decisionType] = (acc[d.decisionType] || 0) + 1;
        return acc;
      }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] 
    : 'N/A'
}
- **Average Decisions per Agent**: ${session.decisions.length > 0 ? (session.decisions.length / [...new Set(session.decisions.map(d => d.agentId))].length).toFixed(1) : '0'}
- **Decision Timeline**: ${session.decisions.length > 0 ? `${session.decisions[0]?.timestamp} to ${session.decisions[session.decisions.length - 1]?.timestamp}` : 'N/A'}

---
*Generated by Multi-Agent MCP Ensemble System*
`;

    const filename = `${baseFilename}-decisions.md`;
    const filepath = path.join(this.docsDir, filename);
    await fs.writeFile(filepath, content);
    
    return { filename, filepath };
  }

  /**
   * Generate raw data export
   */
  async generateRawDataExport(baseFilename) {
    const session = this.currentSession;
    
    const rawData = {
      session: {
        id: session.id,
        prompt: session.prompt,
        analysis: session.analysis,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        statistics: session.statistics
      },
      agents: Object.fromEntries(session.agents),
      interactions: session.interactions,
      mcpConnections: session.mcpConnections,
      protocolEvents: session.protocolEvents,
      decisions: session.decisions,
      events: session.events || [],
      results: session.results
    };
    
    const filename = `${baseFilename}-raw-data.json`;
    const filepath = path.join(this.docsDir, filename);
    await fs.writeFile(filepath, JSON.stringify(rawData, null, 2));
    
    return { filename, filepath };
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get all documented sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
}

export default InteractionDocumenter;