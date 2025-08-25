/**
 * A2A (Agent-to-Agent) Protocol Implementation
 * 
 * Provides standardized communication protocol for direct agent-to-agent
 * interaction, negotiation, and collaboration following A2A specifications.
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

export class A2AProtocol extends EventEmitter {
  constructor(agentId, messageBus) {
    super();
    this.agentId = agentId;
    this.messageBus = messageBus;
    this.conversations = new Map();
    this.capabilities = new Set();
    this.trustNetwork = new Map();
    this.negotiations = new Map();
  }

  async initialize() {
    // Subscribe to A2A protocol messages
    await this.messageBus.subscribe(`a2a:${this.agentId}`, this.handleA2AMessage.bind(this));
    await this.messageBus.subscribe('a2a:broadcast', this.handleBroadcastMessage.bind(this));
    
    logger.info(`A2A Protocol initialized for agent ${this.agentId}`);
  }

  /**
   * Send a direct message to another agent
   */
  async sendMessage(targetAgentId, messageType, payload, options = {}) {
    const message = {
      id: uuidv4(),
      protocol: 'A2A',
      version: '1.0',
      timestamp: Date.now(),
      from: this.agentId,
      to: targetAgentId,
      type: messageType,
      payload,
      conversationId: options.conversationId || uuidv4(),
      priority: options.priority || 'normal',
      requiresResponse: options.requiresResponse || false,
      ttl: options.ttl || 300000, // 5 minutes default
      signature: this.signMessage(payload)
    };

    await this.messageBus.publish(`a2a:${targetAgentId}`, JSON.stringify(message));
    
    if (message.requiresResponse) {
      return this.waitForResponse(message.id, message.ttl);
    }
    
    return message.id;
  }

  /**
   * Broadcast a message to all agents
   */
  async broadcast(messageType, payload, options = {}) {
    const message = {
      id: uuidv4(),
      protocol: 'A2A',
      version: '1.0',
      timestamp: Date.now(),
      from: this.agentId,
      to: 'broadcast',
      type: messageType,
      payload,
      priority: options.priority || 'normal',
      ttl: options.ttl || 60000, // 1 minute for broadcasts
      signature: this.signMessage(payload)
    };

    await this.messageBus.publish('a2a:broadcast', JSON.stringify(message));
    return message.id;
  }

  /**
   * Request capability from another agent
   */
  async requestCapability(targetAgentId, capability, parameters = {}) {
    const payload = {
      capability,
      parameters,
      requesterCapabilities: Array.from(this.capabilities)
    };

    return await this.sendMessage(targetAgentId, 'CAPABILITY_REQUEST', payload, {
      requiresResponse: true,
      ttl: 30000
    });
  }

  /**
   * Offer capability to another agent
   */
  async offerCapability(targetAgentId, capability, terms = {}) {
    const payload = {
      capability,
      terms,
      availability: true,
      cost: terms.cost || 'free'
    };

    return await this.sendMessage(targetAgentId, 'CAPABILITY_OFFER', payload);
  }

  /**
   * Negotiate task delegation with another agent
   */
  async negotiateTask(targetAgentId, task, terms = {}) {
    const negotiationId = uuidv4();
    const payload = {
      negotiationId,
      task,
      proposedTerms: {
        deadline: terms.deadline || Date.now() + 300000,
        priority: terms.priority || 'medium',
        reward: terms.reward || null,
        requirements: terms.requirements || []
      }
    };

    this.negotiations.set(negotiationId, {
      targetAgent: targetAgentId,
      task,
      status: 'negotiating',
      startTime: Date.now()
    });

    return await this.sendMessage(targetAgentId, 'TASK_NEGOTIATION', payload, {
      requiresResponse: true,
      ttl: 60000
    });
  }

  /**
   * Accept a task from another agent
   */
  async acceptTask(fromAgentId, negotiationId, counterTerms = null) {
    const payload = {
      negotiationId,
      accepted: true,
      counterTerms
    };

    return await this.sendMessage(fromAgentId, 'TASK_ACCEPTANCE', payload);
  }

  /**
   * Reject a task from another agent
   */
  async rejectTask(fromAgentId, negotiationId, reason) {
    const payload = {
      negotiationId,
      accepted: false,
      reason
    };

    return await this.sendMessage(fromAgentId, 'TASK_REJECTION', payload);
  }

  /**
   * Request collaboration on a complex task
   */
  async requestCollaboration(targetAgents, task, collaborationType = 'parallel') {
    const collaborationId = uuidv4();
    const payload = {
      collaborationId,
      task,
      type: collaborationType, // 'parallel', 'sequential', 'hierarchical'
      participants: [this.agentId, ...targetAgents],
      coordinator: this.agentId
    };

    const promises = targetAgents.map(agentId => 
      this.sendMessage(agentId, 'COLLABORATION_REQUEST', payload, {
        requiresResponse: true,
        ttl: 45000
      })
    );

    return Promise.all(promises);
  }

  /**
   * Share knowledge with another agent
   */
  async shareKnowledge(targetAgentId, knowledge, knowledgeType = 'general') {
    const payload = {
      knowledge,
      type: knowledgeType,
      source: this.agentId,
      timestamp: Date.now(),
      trustLevel: this.getTrustLevel(targetAgentId)
    };

    return await this.sendMessage(targetAgentId, 'KNOWLEDGE_SHARE', payload);
  }

  /**
   * Request help from network of agents
   */
  async requestHelp(problem, urgency = 'normal') {
    const payload = {
      problem,
      urgency,
      requesterCapabilities: Array.from(this.capabilities),
      preferredAgents: this.getPreferredAgents()
    };

    return await this.broadcast('HELP_REQUEST', payload, {
      priority: urgency === 'urgent' ? 'high' : 'normal'
    });
  }

  /**
   * Handle incoming A2A messages
   */
  async handleA2AMessage(message) {
    try {
      const parsedMessage = JSON.parse(message);
      
      // Verify message signature
      if (!this.verifyMessage(parsedMessage)) {
        logger.warn(`Invalid message signature from ${parsedMessage.from}`);
        return;
      }

      // Check TTL
      if (Date.now() > parsedMessage.timestamp + parsedMessage.ttl) {
        logger.debug(`Message ${parsedMessage.id} expired`);
        return;
      }

      // Update trust network
      this.updateTrustScore(parsedMessage.from, 'message_received');

      // Handle different message types
      switch (parsedMessage.type) {
        case 'CAPABILITY_REQUEST':
          await this.handleCapabilityRequest(parsedMessage);
          break;
        case 'CAPABILITY_OFFER':
          await this.handleCapabilityOffer(parsedMessage);
          break;
        case 'TASK_NEGOTIATION':
          await this.handleTaskNegotiation(parsedMessage);
          break;
        case 'TASK_ACCEPTANCE':
          await this.handleTaskAcceptance(parsedMessage);
          break;
        case 'TASK_REJECTION':
          await this.handleTaskRejection(parsedMessage);
          break;
        case 'COLLABORATION_REQUEST':
          await this.handleCollaborationRequest(parsedMessage);
          break;
        case 'KNOWLEDGE_SHARE':
          await this.handleKnowledgeShare(parsedMessage);
          break;
        case 'HELP_REQUEST':
          await this.handleHelpRequest(parsedMessage);
          break;
        case 'PING':
          await this.handlePing(parsedMessage);
          break;
        default:
          this.emit('unknown_message', parsedMessage);
      }

    } catch (error) {
      logger.error(`Error handling A2A message:`, error);
    }
  }

  async handleBroadcastMessage(message) {
    const parsedMessage = JSON.parse(message);
    
    // Don't handle our own broadcasts
    if (parsedMessage.from === this.agentId) return;
    
    await this.handleA2AMessage(message);
  }

  async handleCapabilityRequest(message) {
    const { capability, parameters } = message.payload;
    
    if (this.capabilities.has(capability)) {
      const canProvide = await this.evaluateCapabilityRequest(capability, parameters);
      
      if (canProvide) {
        await this.sendMessage(message.from, 'CAPABILITY_OFFER', {
          capability,
          available: true,
          terms: this.getCapabilityTerms(capability)
        });
      }
    }
  }

  async handleTaskNegotiation(message) {
    const { negotiationId, task, proposedTerms } = message.payload;
    
    const canAccept = await this.evaluateTaskProposal(task, proposedTerms);
    
    if (canAccept.accept) {
      await this.acceptTask(message.from, negotiationId, canAccept.counterTerms);
    } else {
      await this.rejectTask(message.from, negotiationId, canAccept.reason);
    }
  }

  async handleCollaborationRequest(message) {
    const { collaborationId, task, type, participants } = message.payload;
    
    const canCollaborate = await this.evaluateCollaboration(task, type, participants);
    
    const response = {
      collaborationId,
      accepted: canCollaborate.accept,
      reason: canCollaborate.reason,
      suggestedRole: canCollaborate.role
    };

    await this.sendMessage(message.from, 'COLLABORATION_RESPONSE', response);
  }

  async handleKnowledgeShare(message) {
    const { knowledge, type, trustLevel } = message.payload;
    
    // Process and store knowledge based on trust level
    await this.processSharedKnowledge(knowledge, type, message.from, trustLevel);
    
    // Send acknowledgment
    await this.sendMessage(message.from, 'KNOWLEDGE_ACK', {
      received: true,
      timestamp: Date.now()
    });
  }

  async handleHelpRequest(message) {
    const { problem, urgency, requesterCapabilities } = message.payload;
    
    const canHelp = await this.evaluateHelpRequest(problem, urgency, requesterCapabilities);
    
    if (canHelp.canAssist) {
      await this.sendMessage(message.from, 'HELP_OFFER', {
        assistance: canHelp.assistance,
        capability: canHelp.capability,
        availability: canHelp.availability
      });
    }
  }

  // Trust and reputation management
  updateTrustScore(agentId, interaction) {
    const currentScore = this.trustNetwork.get(agentId) || { score: 0.5, interactions: 0 };
    
    const scoreAdjustments = {
      'message_received': 0.01,
      'task_completed': 0.1,
      'task_failed': -0.05,
      'knowledge_verified': 0.05,
      'knowledge_invalid': -0.1
    };

    currentScore.score += scoreAdjustments[interaction] || 0;
    currentScore.score = Math.max(0, Math.min(1, currentScore.score)); // Clamp between 0 and 1
    currentScore.interactions++;

    this.trustNetwork.set(agentId, currentScore);
  }

  getTrustLevel(agentId) {
    const trustInfo = this.trustNetwork.get(agentId);
    if (!trustInfo) return 'unknown';
    
    if (trustInfo.score >= 0.8) return 'high';
    if (trustInfo.score >= 0.6) return 'medium';
    if (trustInfo.score >= 0.4) return 'low';
    return 'untrusted';
  }

  getPreferredAgents() {
    return Array.from(this.trustNetwork.entries())
      .filter(([, trust]) => trust.score >= 0.6)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 5)
      .map(([agentId]) => agentId);
  }

  // Message signing and verification (simplified)
  signMessage(payload) {
    // In production, use proper cryptographic signing
    return Buffer.from(JSON.stringify(payload) + this.agentId).toString('base64');
  }

  verifyMessage(message) {
    // In production, use proper cryptographic verification
    const expectedSignature = Buffer.from(JSON.stringify(message.payload) + message.from).toString('base64');
    return message.signature === expectedSignature;
  }

  // Evaluation methods (to be implemented by specific agents)
  async evaluateCapabilityRequest(capability, parameters) {
    return true; // Default: can provide any capability we have
  }

  async evaluateTaskProposal(task, terms) {
    return { accept: true }; // Default: accept all tasks
  }

  async evaluateCollaboration(task, type, participants) {
    return { accept: true, role: 'participant' }; // Default: accept collaboration
  }

  async evaluateHelpRequest(problem, urgency, requesterCapabilities) {
    return { canAssist: false }; // Default: cannot help
  }

  async processSharedKnowledge(knowledge, type, source, trustLevel) {
    // Default: log received knowledge
    logger.info(`Received ${type} knowledge from ${source} (trust: ${trustLevel})`);
  }

  getCapabilityTerms(capability) {
    return {
      cost: 'free',
      availability: 'immediate',
      quality: 'standard'
    };
  }

  // Utility methods
  async waitForResponse(messageId, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Response timeout for message ${messageId}`));
      }, timeout);

      const handler = (response) => {
        if (response.inReplyTo === messageId) {
          clearTimeout(timer);
          resolve(response);
        }
      };

      this.once('response', handler);
    });
  }

  getProtocolStats() {
    return {
      agentId: this.agentId,
      conversations: this.conversations.size,
      trustNetwork: this.trustNetwork.size,
      capabilities: this.capabilities.size,
      activeNegotiations: this.negotiations.size
    };
  }
}

export default A2AProtocol;