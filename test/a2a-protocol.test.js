/**
 * Tests for A2A Protocol Implementation
 */

import { jest } from '@jest/globals';
import A2AProtocol from '../src/core/a2a-protocol.js';
import { v4 as uuidv4 } from 'uuid';

describe('A2AProtocol', () => {
  let protocol;
  let mockMessageBus;
  const agentId = 'test-agent-123';

  beforeEach(() => {
    mockMessageBus = {
      subscribe: jest.fn(),
      publish: jest.fn(),
      unsubscribe: jest.fn()
    };
    
    protocol = new A2AProtocol(agentId, mockMessageBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    test('should subscribe to agent-specific and broadcast channels', async () => {
      await protocol.initialize();
      
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith(
        `a2a:${agentId}`,
        expect.any(Function)
      );
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith(
        'a2a:broadcast',
        expect.any(Function)
      );
    });
  });

  describe('sendMessage', () => {
    test('should publish message to target agent channel', async () => {
      const targetAgentId = 'target-agent-456';
      const messageType = 'TEST_MESSAGE';
      const payload = { data: 'test' };
      
      const messageId = await protocol.sendMessage(targetAgentId, messageType, payload);
      
      expect(mockMessageBus.publish).toHaveBeenCalledWith(
        `a2a:${targetAgentId}`,
        expect.stringContaining(messageType)
      );
      
      const publishedMessage = JSON.parse(mockMessageBus.publish.mock.calls[0][1]);
      expect(publishedMessage).toMatchObject({
        protocol: 'A2A',
        from: agentId,
        to: targetAgentId,
        type: messageType,
        payload
      });
      expect(messageId).toBeTruthy();
    });

    test('should wait for response when requiresResponse is true', async () => {
      const targetAgentId = 'target-agent-789';
      const messageType = 'REQUEST';
      const payload = { query: 'test' };
      
      const responsePromise = protocol.sendMessage(
        targetAgentId,
        messageType,
        payload,
        { requiresResponse: true, ttl: 1000 }
      );
      
      // Simulate response
      setTimeout(() => {
        const publishedMessage = JSON.parse(mockMessageBus.publish.mock.calls[0][1]);
        protocol.handleResponse({
          conversationId: publishedMessage.conversationId,
          payload: { answer: 'response' }
        });
      }, 50);
      
      const response = await responsePromise;
      expect(response.payload.answer).toBe('response');
    });

    test('should timeout when no response received', async () => {
      const targetAgentId = 'target-agent-timeout';
      const messageType = 'REQUEST';
      const payload = { query: 'test' };
      
      const responsePromise = protocol.sendMessage(
        targetAgentId,
        messageType,
        payload,
        { requiresResponse: true, ttl: 100 }
      );
      
      await expect(responsePromise).rejects.toThrow('Response timeout');
    });
  });

  describe('broadcast', () => {
    test('should publish message to broadcast channel', async () => {
      const messageType = 'ANNOUNCEMENT';
      const payload = { info: 'broadcast message' };
      
      await protocol.broadcast(messageType, payload);
      
      expect(mockMessageBus.publish).toHaveBeenCalledWith(
        'a2a:broadcast',
        expect.stringContaining(messageType)
      );
    });
  });

  describe('capability management', () => {
    test('should request capability from another agent', async () => {
      protocol.capabilities.add('capability1');
      protocol.capabilities.add('capability2');
      
      const targetAgentId = 'capable-agent';
      const capability = 'data_processing';
      const parameters = { type: 'csv' };
      
      const requestPromise = protocol.requestCapability(
        targetAgentId,
        capability,
        parameters
      );
      
      expect(mockMessageBus.publish).toHaveBeenCalledWith(
        `a2a:${targetAgentId}`,
        expect.stringContaining('CAPABILITY_REQUEST')
      );
      
      const publishedMessage = JSON.parse(mockMessageBus.publish.mock.calls[0][1]);
      expect(publishedMessage.payload).toMatchObject({
        capability,
        parameters,
        requesterCapabilities: ['capability1', 'capability2']
      });
    });

    test('should handle capability request from another agent', async () => {
      protocol.capabilities.add('requested_capability');
      const sendMessageSpy = jest.spyOn(protocol, 'sendMessage');
      
      const message = {
        from: 'requesting-agent',
        type: 'CAPABILITY_REQUEST',
        payload: {
          capability: 'requested_capability',
          parameters: {}
        }
      };
      
      await protocol.handleCapabilityRequest(message);
      
      expect(sendMessageSpy).toHaveBeenCalledWith(
        'requesting-agent',
        'CAPABILITY_OFFER',
        expect.objectContaining({
          capability: 'requested_capability',
          available: true
        })
      );
    });
  });

  describe('task negotiation', () => {
    test('should initiate task negotiation', async () => {
      const targetAgentId = 'worker-agent';
      const task = { type: 'process_data', data: [1, 2, 3] };
      const terms = {
        deadline: Date.now() + 60000,
        priority: 'high',
        reward: 10
      };
      
      await protocol.negotiateTask(targetAgentId, task, terms);
      
      expect(mockMessageBus.publish).toHaveBeenCalledWith(
        `a2a:${targetAgentId}`,
        expect.stringContaining('TASK_NEGOTIATION')
      );
      
      const publishedMessage = JSON.parse(mockMessageBus.publish.mock.calls[0][1]);
      expect(publishedMessage.payload).toMatchObject({
        task,
        proposedTerms: expect.objectContaining({
          deadline: terms.deadline,
          priority: terms.priority
        })
      });
      
      expect(protocol.negotiations.size).toBe(1);
    });

    test('should handle task acceptance', async () => {
      const negotiationId = uuidv4();
      const task = { type: 'test_task' };
      
      protocol.negotiations.set(negotiationId, {
        targetAgent: 'worker-agent',
        task,
        status: 'negotiating'
      });
      
      const emitSpy = jest.spyOn(protocol, 'emit');
      
      await protocol.handleTaskAcceptance({
        from: 'worker-agent',
        payload: {
          negotiationId,
          accepted: true,
          counterTerms: null
        }
      });
      
      expect(emitSpy).toHaveBeenCalledWith('task_accepted', expect.objectContaining({
        negotiationId,
        task,
        acceptedBy: 'worker-agent'
      }));
      
      expect(protocol.negotiations.get(negotiationId).status).toBe('accepted');
    });
  });

  describe('trust network', () => {
    test('should update trust scores based on interactions', () => {
      const agentId = 'trusted-agent';
      
      // Initial interaction
      protocol.updateTrustScore(agentId, 'message_received');
      let trust = protocol.trustNetwork.get(agentId);
      expect(trust.score).toBeGreaterThan(0.5);
      
      // Positive interaction
      protocol.updateTrustScore(agentId, 'task_completed');
      trust = protocol.trustNetwork.get(agentId);
      expect(trust.score).toBeGreaterThan(0.6);
      
      // Negative interaction
      protocol.updateTrustScore(agentId, 'task_failed');
      trust = protocol.trustNetwork.get(agentId);
      expect(trust.score).toBeLessThan(0.65);
    });

    test('should get trust level based on score', () => {
      const highTrustAgent = 'high-trust';
      const lowTrustAgent = 'low-trust';
      
      protocol.trustNetwork.set(highTrustAgent, { score: 0.85, interactions: 10 });
      protocol.trustNetwork.set(lowTrustAgent, { score: 0.3, interactions: 5 });
      
      expect(protocol.getTrustLevel(highTrustAgent)).toBe('high');
      expect(protocol.getTrustLevel(lowTrustAgent)).toBe('untrusted');
      expect(protocol.getTrustLevel('unknown-agent')).toBe('unknown');
    });

    test('should get preferred agents based on trust', () => {
      protocol.trustNetwork.set('agent1', { score: 0.9, interactions: 20 });
      protocol.trustNetwork.set('agent2', { score: 0.4, interactions: 10 });
      protocol.trustNetwork.set('agent3', { score: 0.7, interactions: 15 });
      protocol.trustNetwork.set('agent4', { score: 0.8, interactions: 18 });
      
      const preferred = protocol.getPreferredAgents();
      
      expect(preferred).toHaveLength(3); // Only agents with score >= 0.6
      expect(preferred[0]).toBe('agent1'); // Highest score first
      expect(preferred).not.toContain('agent2'); // Low trust excluded
    });
  });

  describe('collaboration', () => {
    test('should request collaboration from multiple agents', async () => {
      const targetAgents = ['agent1', 'agent2', 'agent3'];
      const task = { type: 'complex_task', subtasks: 3 };
      const collaborationType = 'parallel';
      
      await protocol.requestCollaboration(targetAgents, task, collaborationType);
      
      expect(mockMessageBus.publish).toHaveBeenCalledTimes(3);
      
      targetAgents.forEach(agentId => {
        expect(mockMessageBus.publish).toHaveBeenCalledWith(
          `a2a:${agentId}`,
          expect.stringContaining('COLLABORATION_REQUEST')
        );
      });
    });
  });

  describe('knowledge sharing', () => {
    test('should share knowledge with another agent', async () => {
      const targetAgentId = 'learning-agent';
      const knowledge = { fact: 'water boils at 100C', confidence: 0.95 };
      
      protocol.trustNetwork.set(targetAgentId, { score: 0.8, interactions: 5 });
      
      await protocol.shareKnowledge(targetAgentId, knowledge, 'scientific');
      
      expect(mockMessageBus.publish).toHaveBeenCalledWith(
        `a2a:${targetAgentId}`,
        expect.stringContaining('KNOWLEDGE_SHARE')
      );
      
      const publishedMessage = JSON.parse(mockMessageBus.publish.mock.calls[0][1]);
      expect(publishedMessage.payload).toMatchObject({
        knowledge,
        type: 'scientific',
        trustLevel: 'high'
      });
    });
  });

  describe('message validation', () => {
    test('should verify message signatures', async () => {
      const validMessage = {
        from: 'sender-agent',
        type: 'TEST',
        payload: { data: 'test' },
        signature: protocol.signMessage({ data: 'test' }),
        timestamp: Date.now(),
        ttl: 60000
      };
      
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await protocol.handleA2AMessage(JSON.stringify(validMessage));
      
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('should reject expired messages', async () => {
      const expiredMessage = {
        from: 'sender-agent',
        type: 'TEST',
        payload: { data: 'test' },
        signature: protocol.signMessage({ data: 'test' }),
        timestamp: Date.now() - 100000,
        ttl: 5000 // Already expired
      };
      
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
      
      await protocol.handleA2AMessage(JSON.stringify(expiredMessage));
      
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('expired'));
      debugSpy.mockRestore();
    });
  });
});