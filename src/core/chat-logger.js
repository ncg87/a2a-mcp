/**
 * Simple Chat Logger
 * 
 * Creates readable chat log files for each prompt/session
 * Format: question first, then each agent response appended
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ChatLogger {
  constructor() {
    this.chatLogsDir = path.join(__dirname, '../../chat-logs');
    this.activeChatFile = null;
    this.currentSessionId = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Ensure chat logs directory exists
      await fs.mkdir(this.chatLogsDir, { recursive: true });
      this.initialized = true;
      logger.info('Chat Logger initialized');
    } catch (error) {
      logger.error('Failed to initialize Chat Logger:', error);
      throw error;
    }
  }

  /**
   * Start a new chat log for a prompt
   */
  async startChatLog(prompt, sessionId = null) {
    if (!this.initialized) await this.initialize();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const promptPreview = prompt.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-');
    const filename = `chat-${timestamp}-${promptPreview}.txt`;
    
    this.activeChatFile = path.join(this.chatLogsDir, filename);
    this.currentSessionId = sessionId;

    // Write initial prompt to file
    const header = `CHAT LOG - ${new Date().toISOString()}
Session ID: ${sessionId || 'N/A'}
=============================================================

USER PROMPT:
${prompt}

=============================================================
AGENT RESPONSES:

`;

    await fs.writeFile(this.activeChatFile, header);
    
    logger.info(`Started chat log: ${filename}`);
    return { filename, filepath: this.activeChatFile };
  }

  /**
   * Add agent response to current chat log
   */
  async addAgentResponse(agentId, agentType, message, metadata = {}) {
    if (!this.activeChatFile) {
      logger.warn('No active chat file - cannot add agent response');
      return;
    }

    const timestamp = new Date().toISOString();
    
    // Format MCP tools section if used
    let mcpToolsSection = '';
    if (metadata.usedMCPTools || metadata.mcpTools) {
      mcpToolsSection = `🔧 MCP TOOLS: ${metadata.mcpTools || 'Used'}`;
    }
    
    // Format sub-agents section if created
    let subAgentsSection = '';
    if (metadata.createdSubAgents) {
      subAgentsSection = `🤖 SUB-AGENTS: Created ${metadata.subAgentCount || 0} agents`;
      if (metadata.subAgentResults && metadata.subAgentResults.length > 0) {
        subAgentsSection += ` (${metadata.subAgentResults.join(', ')})`;
      }
    }
    
    // Format knowledge verification section
    let verificationSection = '';
    if (metadata.knowledgeVerified) {
      verificationSection = `✅ KNOWLEDGE VERIFIED: ${metadata.verificationQueries || 0} queries`;
    }
    
    const response = `
[${timestamp}] ${agentType.toUpperCase()} AGENT (${agentId}):
═══════════════════════════════════════════════════════════
MODEL: ${metadata.model || 'Unknown'}${metadata.actualModel ? ` (${metadata.actualModel})` : ''}
PROVIDER: ${metadata.provider || 'Unknown'}
${metadata.iteration ? `ITERATION: ${metadata.iteration}` : ''}${metadata.round ? `, ROUND: ${metadata.round}` : ''}
${mcpToolsSection}
${subAgentsSection}
${verificationSection}
───────────────────────────────────────────────────────────
${typeof message === 'string' ? message : JSON.stringify(message, null, 2)}
───────────────────────────────────────────────────────────
${metadata.responseTime ? `Response Time: ${metadata.responseTime}ms` : ''}
${metadata.usage ? `Tokens: ${JSON.stringify(metadata.usage)}` : ''}
═══════════════════════════════════════════════════════════

`;

    try {
      await fs.appendFile(this.activeChatFile, response);
      logger.debug(`Added response from ${agentType} agent to chat log`);
    } catch (error) {
      logger.error('Failed to append to chat log:', error);
    }
  }

  /**
   * Add system message to chat log
   */
  async addSystemMessage(message, type = 'INFO') {
    if (!this.activeChatFile) return;

    const timestamp = new Date().toISOString();
    const systemMsg = `
[${timestamp}] SYSTEM ${type}:
${message}

-----------------------------------------------------------
`;

    try {
      await fs.appendFile(this.activeChatFile, systemMsg);
    } catch (error) {
      logger.error('Failed to append system message to chat log:', error);
    }
  }

  /**
   * Add agent interaction to chat log
   */
  async addAgentInteraction(fromAgent, toAgent, messageType, content) {
    if (!this.activeChatFile) return;

    const timestamp = new Date().toISOString();
    const interaction = `
[${timestamp}] AGENT INTERACTION:
${fromAgent} → ${toAgent}: ${messageType}
Content: ${typeof content === 'string' ? content : JSON.stringify(content)}

-----------------------------------------------------------
`;

    try {
      await fs.appendFile(this.activeChatFile, interaction);
    } catch (error) {
      logger.error('Failed to append interaction to chat log:', error);
    }
  }

  /**
   * Add decision making to chat log
   */
  async addAgentDecision(agentId, decisionType, context, chosen, reasoning) {
    if (!this.activeChatFile) return;

    const timestamp = new Date().toISOString();
    const decision = `
[${timestamp}] AGENT DECISION (${agentId}):
Decision Type: ${decisionType}
Context: ${context}
Chosen: ${chosen}
Reasoning: ${reasoning}

-----------------------------------------------------------
`;

    try {
      await fs.appendFile(this.activeChatFile, decision);
    } catch (error) {
      logger.error('Failed to append decision to chat log:', error);
    }
  }

  /**
   * Add model switch information
   */
  async addModelSwitch(fromModel, toModel, reason) {
    if (!this.activeChatFile) return;

    const timestamp = new Date().toISOString();
    const switchMsg = `
[${timestamp}] AI MODEL SWITCH:
From: ${fromModel || 'Default'}
To: ${toModel}
Reason: ${reason}

-----------------------------------------------------------
`;

    try {
      await fs.appendFile(this.activeChatFile, switchMsg);
    } catch (error) {
      logger.error('Failed to append model switch to chat log:', error);
    }
  }

  /**
   * Add MCP server connection info
   */
  async addMCPConnection(serverId, serverName, status, tools = []) {
    if (!this.activeChatFile) return;

    const timestamp = new Date().toISOString();
    const connection = `
[${timestamp}] MCP SERVER CONNECTION:
Server: ${serverName} (${serverId})
Status: ${status.toUpperCase()}
Available Tools: ${tools.join(', ') || 'None'}

-----------------------------------------------------------
`;

    try {
      await fs.appendFile(this.activeChatFile, connection);
    } catch (error) {
      logger.error('Failed to append MCP connection to chat log:', error);
    }
  }

  /**
   * Add MCP tool usage with enhanced visibility (compact)
   */
  async addMCPToolUsage(agentId, toolName, serverId, parameters, result) {
    if (!this.activeChatFile) return;

    const timestamp = new Date().toISOString();
    
    // Create compact one-line summary
    const paramSummary = JSON.stringify(parameters).substring(0, 100);
    const resultSummary = typeof result === 'string' ? 
      result.substring(0, 100) : 
      (result?.success ? '✓ Success' : '✗ Failed');
    
    const toolUsage = `[${timestamp}] 🔧 MCP: ${agentId} → ${toolName}@${serverId} | Params: ${paramSummary} | Result: ${resultSummary}\n`;

    try {
      await fs.appendFile(this.activeChatFile, toolUsage);
    } catch (error) {
      logger.error('Failed to append MCP tool usage to chat log:', error);
    }
  }

  /**
   * Add task execution result
   */
  async addTaskResult(agentId, taskType, result, success, error = null) {
    if (!this.activeChatFile) return;

    const timestamp = new Date().toISOString();
    const taskResult = `
[${timestamp}] TASK EXECUTION (${agentId}):
Task Type: ${taskType}
Success: ${success ? 'YES' : 'NO'}
Result: ${typeof result === 'string' ? result : JSON.stringify(result)}
${error ? `Error: ${error}` : ''}

-----------------------------------------------------------
`;

    try {
      await fs.appendFile(this.activeChatFile, taskResult);
    } catch (error) {
      logger.error('Failed to append task result to chat log:', error);
    }
  }

  /**
   * Finalize chat log with summary
   */
  async finalizeChatLog(summary = {}) {
    if (!this.activeChatFile) return;

    const timestamp = new Date().toISOString();
    const footer = `

=============================================================
CHAT SESSION COMPLETED - ${timestamp}

SUMMARY:
${summary.agentsUsed ? `Agents Used: ${summary.agentsUsed}` : ''}
${summary.modelsUsed ? `AI Models: ${summary.modelsUsed.join(', ')}` : ''}
${summary.mcpServers ? `MCP Servers: ${summary.mcpServers}` : ''}
${summary.interactions ? `Total Interactions: ${summary.interactions}` : ''}
${summary.decisions ? `Decisions Made: ${summary.decisions}` : ''}
${summary.duration ? `Session Duration: ${summary.duration}` : ''}
${summary.status ? `Final Status: ${summary.status}` : ''}

=============================================================
END OF CHAT LOG
`;

    try {
      await fs.appendFile(this.activeChatFile, footer);
      logger.info(`Finalized chat log: ${path.basename(this.activeChatFile)}`);
      
      const finalFile = this.activeChatFile;
      this.activeChatFile = null;
      this.currentSessionId = null;
      
      return finalFile;
    } catch (error) {
      logger.error('Failed to finalize chat log:', error);
      return null;
    }
  }

  /**
   * Get list of all chat logs
   */
  async getChatLogs() {
    try {
      const files = await fs.readdir(this.chatLogsDir);
      const chatFiles = files.filter(file => file.startsWith('chat-') && file.endsWith('.txt'));
      
      const logs = await Promise.all(chatFiles.map(async (file) => {
        const filepath = path.join(this.chatLogsDir, file);
        const stats = await fs.stat(filepath);
        return {
          filename: file,
          filepath,
          created: stats.birthtime,
          modified: stats.mtime,
          size: stats.size
        };
      }));

      return logs.sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('Failed to get chat logs:', error);
      return [];
    }
  }

  /**
   * Read a specific chat log
   */
  async readChatLog(filename) {
    try {
      const filepath = path.join(this.chatLogsDir, filename);
      const content = await fs.readFile(filepath, 'utf8');
      return content;
    } catch (error) {
      logger.error(`Failed to read chat log ${filename}:`, error);
      return null;
    }
  }

  /**
   * Get current active chat file info
   */
  getActiveChat() {
    return {
      file: this.activeChatFile,
      sessionId: this.currentSessionId,
      active: this.activeChatFile !== null
    };
  }

  /**
   * Get chat logs directory
   */
  getChatLogsDirectory() {
    return this.chatLogsDir;
  }
}

export default ChatLogger;