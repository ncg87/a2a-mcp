/**
 * ACP (Agent Communication Protocol) Implementation
 * 
 * Implements standardized agent communication protocol for formal
 * communication, ontology sharing, and distributed coordination.
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

export class ACPProtocol extends EventEmitter {
  constructor(agentId, messageBus) {
    super();
    this.agentId = agentId;
    this.messageBus = messageBus;
    this.ontology = new Map(); // Shared knowledge representation
    this.commitments = new Map(); // Agent commitments and contracts
    this.beliefs = new Map(); // Agent beliefs and facts
    this.intentions = new Map(); // Agent goals and intentions
    this.conversations = new Map(); // Active conversations
    this.performatives = new Set([
      'INFORM', 'REQUEST', 'QUERY', 'PROPOSE', 'ACCEPT', 'REJECT',
      'CONFIRM', 'CANCEL', 'AGREE', 'REFUSE', 'SUBSCRIBE', 'CFP', 'BID'
    ]);
  }

  async initialize() {
    // Subscribe to ACP protocol messages
    await this.messageBus.subscribe(`acp:${this.agentId}`, this.handleACPMessage.bind(this));
    await this.messageBus.subscribe('acp:broadcast', this.handleBroadcastMessage.bind(this));
    
    // Initialize agent's beliefs and intentions
    await this.initializeKnowledgeBase();
    
    logger.info(`ACP Protocol initialized for agent ${this.agentId}`);
  }

  /**
   * Send ACP message with formal performative structure
   */
  async sendACPMessage(targetAgentId, performative, content, options = {}) {
    if (!this.performatives.has(performative)) {
      throw new Error(`Invalid performative: ${performative}`);
    }

    const message = {
      id: uuidv4(),
      protocol: 'ACP',
      version: '2.0',
      timestamp: Date.now(),
      sender: this.agentId,
      receiver: targetAgentId,
      performative,
      content,
      conversationId: options.conversationId || uuidv4(),
      inReplyTo: options.inReplyTo || null,
      language: options.language || 'JSON',
      ontology: options.ontology || 'default',
      replyWith: options.replyWith || null,
      replyBy: options.replyBy || null
    };

    // Add to conversation tracking
    this.trackConversation(message);

    await this.messageBus.publish(`acp:${targetAgentId}`, JSON.stringify(message));
    return message.id;
  }

  /**
   * INFORM: Share information/beliefs with another agent
   */
  async inform(targetAgentId, information, conversationId = null) {
    return await this.sendACPMessage(targetAgentId, 'INFORM', {
      type: 'information',
      data: information,
      beliefStrength: this.getBeliefStrength(information)
    }, { conversationId });
  }

  /**
   * REQUEST: Request another agent to perform an action
   */
  async request(targetAgentId, action, parameters = {}, conversationId = null) {
    return await this.sendACPMessage(targetAgentId, 'REQUEST', {
      action,
      parameters,
      deadline: parameters.deadline || Date.now() + 300000,
      priority: parameters.priority || 'normal'
    }, { conversationId });
  }

  /**
   * QUERY: Ask for information from another agent
   */
  async query(targetAgentId, queryType, queryParams = {}, conversationId = null) {
    return await this.sendACPMessage(targetAgentId, 'QUERY', {
      queryType,
      parameters: queryParams,
      maxResults: queryParams.maxResults || 10
    }, { conversationId });
  }

  /**
   * PROPOSE: Propose a course of action or agreement
   */
  async propose(targetAgentId, proposal, terms = {}, conversationId = null) {
    const proposalId = uuidv4();
    
    const content = {
      proposalId,
      proposal,
      terms,
      validUntil: terms.validUntil || Date.now() + 600000, // 10 minutes
      conditions: terms.conditions || []
    };

    return await this.sendACPMessage(targetAgentId, 'PROPOSE', content, { conversationId });
  }

  /**
   * ACCEPT: Accept a proposal or request
   */
  async accept(targetAgentId, proposalId, conditions = {}, conversationId = null) {
    return await this.sendACPMessage(targetAgentId, 'ACCEPT', {
      proposalId,
      acceptedConditions: conditions,
      commitment: this.createCommitment(proposalId, conditions)
    }, { conversationId });
  }

  /**
   * REJECT: Reject a proposal or request
   */
  async reject(targetAgentId, proposalId, reason, conversationId = null) {
    return await this.sendACPMessage(targetAgentId, 'REJECT', {
      proposalId,
      reason,
      alternative: null
    }, { conversationId });
  }

  /**
   * CFP: Call for Proposals (auction mechanism)
   */
  async callForProposals(task, requirements = {}, deadline = null) {
    const cfpId = uuidv4();
    const content = {
      cfpId,
      task,
      requirements,
      deadline: deadline || Date.now() + 900000, // 15 minutes
      evaluationCriteria: requirements.criteria || ['cost', 'time', 'quality']
    };

    return await this.sendACPMessage('broadcast', 'CFP', content);
  }

  /**
   * BID: Submit a bid in response to CFP
   */
  async submitBid(targetAgentId, cfpId, bidDetails, conversationId = null) {
    const bidId = uuidv4();
    
    return await this.sendACPMessage(targetAgentId, 'BID', {
      bidId,
      cfpId,
      ...bidDetails,
      validUntil: bidDetails.validUntil || Date.now() + 300000
    }, { conversationId });
  }

  /**
   * SUBSCRIBE: Subscribe to information updates from another agent
   */
  async subscribe(targetAgentId, informationType, conditions = {}, conversationId = null) {
    const subscriptionId = uuidv4();
    
    return await this.sendACPMessage(targetAgentId, 'SUBSCRIBE', {
      subscriptionId,
      informationType,
      conditions,
      frequency: conditions.frequency || 'on_change'
    }, { conversationId });
  }

  /**
   * Contract Net Protocol implementation
   */
  async initiateContractNet(task, participants = []) {
    const contractId = uuidv4();
    const cfp = {
      contractId,
      task,
      participationDeadline: Date.now() + 300000, // 5 minutes
      executionDeadline: Date.now() + 1800000, // 30 minutes
      evaluationCriteria: ['capability', 'availability', 'cost']
    };

    // Send CFP to all potential participants
    const cfpPromises = participants.map(agentId => 
      this.callForProposals(cfp, {}, cfp.participationDeadline)
    );

    // If no specific participants, broadcast
    if (participants.length === 0) {
      await this.callForProposals(cfp, {}, cfp.participationDeadline);
    }

    // Wait for bids and select winner
    return this.waitForBidsAndSelect(contractId, cfp.participationDeadline);
  }

  /**
   * Coordination protocol for multi-agent tasks
   */
  async coordinateMultiAgentTask(task, agents, coordinationType = 'centralized') {
    const coordinationId = uuidv4();
    
    const coordinationPlan = {
      coordinationId,
      task,
      agents,
      type: coordinationType,
      coordinator: this.agentId,
      phases: this.planCoordinationPhases(task, agents),
      synchronizationPoints: []
    };

    // Inform all agents about the coordination plan
    const informPromises = agents.map(agentId => 
      this.inform(agentId, coordinationPlan, coordinationId)
    );

    await Promise.all(informPromises);
    return coordinationId;
  }

  /**
   * Distributed consensus mechanism
   */
  async reachConsensus(proposal, participants, consensusType = 'majority') {
    const consensusId = uuidv4();
    
    const consensusRequest = {
      consensusId,
      proposal,
      consensusType,
      deadline: Date.now() + 180000, // 3 minutes
      participants
    };

    // Send consensus request to all participants
    const requestPromises = participants.map(agentId =>
      this.sendACPMessage(agentId, 'CONSENSUS_REQUEST', consensusRequest)
    );

    await Promise.all(requestPromises);
    return this.waitForConsensus(consensusId, consensusRequest);
  }

  /**
   * Handle incoming ACP messages
   */
  async handleACPMessage(message) {
    try {
      const parsedMessage = JSON.parse(message);
      
      // Validate ACP message structure
      if (!this.validateACPMessage(parsedMessage)) {
        logger.warn(`Invalid ACP message from ${parsedMessage.sender}`);
        return;
      }

      // Update conversation tracking
      this.updateConversation(parsedMessage);

      // Handle different performatives
      switch (parsedMessage.performative) {
        case 'INFORM':
          await this.handleInform(parsedMessage);
          break;
        case 'REQUEST':
          await this.handleRequest(parsedMessage);
          break;
        case 'QUERY':
          await this.handleQuery(parsedMessage);
          break;
        case 'PROPOSE':
          await this.handlePropose(parsedMessage);
          break;
        case 'ACCEPT':
          await this.handleAccept(parsedMessage);
          break;
        case 'REJECT':
          await this.handleReject(parsedMessage);
          break;
        case 'CFP':
          await this.handleCFP(parsedMessage);
          break;
        case 'BID':
          await this.handleBid(parsedMessage);
          break;
        case 'SUBSCRIBE':
          await this.handleSubscribe(parsedMessage);
          break;
        case 'CONSENSUS_REQUEST':
          await this.handleConsensusRequest(parsedMessage);
          break;
        default:
          logger.warn(`Unknown ACP performative: ${parsedMessage.performative}`);
      }

    } catch (error) {
      logger.error(`Error handling ACP message:`, error);
    }
  }

  async handleBroadcastMessage(message) {
    const parsedMessage = JSON.parse(message);
    
    // Don't handle our own broadcasts
    if (parsedMessage.sender === this.agentId) return;
    
    await this.handleACPMessage(message);
  }

  async handleInform(message) {
    const { data, beliefStrength } = message.content;
    
    // Update beliefs based on received information
    await this.updateBeliefs(data, message.sender, beliefStrength);
    
    // Emit event for agent to process new information
    this.emit('information_received', {
      sender: message.sender,
      information: data,
      strength: beliefStrength
    });
  }

  async handleRequest(message) {
    const { action, parameters, deadline, priority } = message.content;
    
    // Evaluate if we can perform the requested action
    const canPerform = await this.evaluateActionRequest(action, parameters, deadline);
    
    if (canPerform.possible) {
      // Accept the request and create commitment
      await this.accept(message.sender, message.id, {
        estimatedCompletion: canPerform.estimatedTime,
        conditions: canPerform.conditions
      }, message.conversationId);
      
      // Schedule action execution
      this.scheduleAction(action, parameters, message.conversationId);
    } else {
      // Reject the request with reason
      await this.reject(message.sender, message.id, canPerform.reason, message.conversationId);
    }
  }

  async handleQuery(message) {
    const { queryType, parameters, maxResults } = message.content;
    
    // Process query against knowledge base
    const results = await this.processQuery(queryType, parameters, maxResults);
    
    // Send response with query results
    await this.inform(message.sender, {
      queryId: message.id,
      results,
      resultCount: results.length
    }, message.conversationId);
  }

  async handlePropose(message) {
    const { proposalId, proposal, terms, validUntil, conditions } = message.content;
    
    // Evaluate the proposal
    const evaluation = await this.evaluateProposal(proposal, terms, conditions);
    
    if (evaluation.acceptable) {
      await this.accept(message.sender, proposalId, evaluation.counterConditions, message.conversationId);
    } else {
      await this.reject(message.sender, proposalId, evaluation.reason, message.conversationId);
    }
  }

  async handleCFP(message) {
    const { cfpId, task, requirements, deadline, evaluationCriteria } = message.content;
    
    // Evaluate if we can bid on this task
    const canBid = await this.evaluateTaskCapability(task, requirements);
    
    if (canBid.capable) {
      // Submit bid
      await this.submitBid(message.sender, cfpId, {
        capability: canBid.capability,
        estimatedTime: canBid.estimatedTime,
        cost: canBid.cost,
        qualityGuarantee: canBid.quality
      }, message.conversationId);
    }
  }

  // Knowledge management methods
  async initializeKnowledgeBase() {
    // Initialize with basic agent knowledge
    this.beliefs.set('agent_id', this.agentId);
    this.beliefs.set('creation_time', Date.now());
    this.intentions.set('primary_goal', 'serve_user_requests');
  }

  async updateBeliefs(information, source, strength = 0.8) {
    const beliefId = uuidv4();
    
    this.beliefs.set(beliefId, {
      content: information,
      source,
      strength,
      timestamp: Date.now(),
      verified: false
    });

    // Trigger belief revision if necessary
    await this.reviseBeliefsIfNeeded();
  }

  async reviseBeliefsIfNeeded() {
    // Simple belief revision - remove conflicting beliefs with lower strength
    const beliefs = Array.from(this.beliefs.entries());
    
    for (const [id1, belief1] of beliefs) {
      for (const [id2, belief2] of beliefs) {
        if (id1 !== id2 && this.beliefsConflict(belief1, belief2)) {
          if (belief1.strength < belief2.strength) {
            this.beliefs.delete(id1);
          } else if (belief2.strength < belief1.strength) {
            this.beliefs.delete(id2);
          }
        }
      }
    }
  }

  beliefsConflict(belief1, belief2) {
    // Simple conflict detection (would be more sophisticated in practice)
    return JSON.stringify(belief1.content) === JSON.stringify(belief2.content) && 
           belief1.source !== belief2.source;
  }

  createCommitment(proposalId, conditions) {
    const commitmentId = uuidv4();
    const commitment = {
      id: commitmentId,
      proposalId,
      conditions,
      status: 'active',
      createdAt: Date.now()
    };
    
    this.commitments.set(commitmentId, commitment);
    return commitment;
  }

  // Utility methods
  trackConversation(message) {
    const conv = this.conversations.get(message.conversationId) || {
      id: message.conversationId,
      participants: new Set([this.agentId]),
      messages: [],
      startTime: Date.now()
    };
    
    conv.participants.add(message.sender);
    conv.participants.add(message.receiver);
    conv.messages.push(message);
    
    this.conversations.set(message.conversationId, conv);
  }

  updateConversation(message) {
    const conv = this.conversations.get(message.conversationId);
    if (conv) {
      conv.messages.push(message);
      conv.lastActivity = Date.now();
    }
  }

  validateACPMessage(message) {
    const requiredFields = ['id', 'protocol', 'sender', 'receiver', 'performative', 'content'];
    return requiredFields.every(field => message.hasOwnProperty(field)) &&
           this.performatives.has(message.performative);
  }

  getBeliefStrength(information) {
    // Default belief strength based on information type
    if (typeof information === 'object' && information.verified) return 0.9;
    if (typeof information === 'string') return 0.7;
    return 0.6;
  }

  planCoordinationPhases(task, agents) {
    return [
      { phase: 'initialization', participants: agents, duration: 30000 },
      { phase: 'execution', participants: agents, duration: 300000 },
      { phase: 'synchronization', participants: agents, duration: 60000 },
      { phase: 'completion', participants: [this.agentId], duration: 30000 }
    ];
  }

  // Abstract methods to be implemented by specific agents
  async evaluateActionRequest(action, parameters, deadline) {
    return { possible: true, estimatedTime: 60000, conditions: [] };
  }

  async evaluateProposal(proposal, terms, conditions) {
    return { acceptable: true, counterConditions: {} };
  }

  async evaluateTaskCapability(task, requirements) {
    return { capable: false };
  }

  async processQuery(queryType, parameters, maxResults) {
    return [];
  }

  scheduleAction(action, parameters, conversationId) {
    // Default: emit action request for agent to handle
    this.emit('action_requested', { action, parameters, conversationId });
  }

  getProtocolStats() {
    return {
      agentId: this.agentId,
      beliefs: this.beliefs.size,
      intentions: this.intentions.size,
      commitments: this.commitments.size,
      conversations: this.conversations.size
    };
  }
}

export default ACPProtocol;