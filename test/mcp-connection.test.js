/**
 * Tests for MCP Connection Handler
 */

import { jest } from '@jest/globals';
import MCPConnection from '../src/core/mcp-connection.js';
import WebSocket from 'ws';

jest.mock('ws');
jest.mock('axios');

describe('MCPConnection', () => {
  let connection;
  let mockServer;

  beforeEach(() => {
    mockServer = {
      id: 'test-server',
      name: 'Test Server',
      endpoint: 'ws://localhost:8080',
      tools: ['tool1', 'tool2'],
      capabilities: ['capability1'],
      auth: { token: 'test-token' }
    };
    
    connection = new MCPConnection(mockServer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    test('should establish WebSocket connection for ws:// endpoints', async () => {
      const mockWs = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn()
      };
      
      WebSocket.mockImplementation(() => mockWs);
      
      // Simulate connection open
      setTimeout(() => {
        const openCallback = mockWs.on.mock.calls.find(call => call[0] === 'open')[1];
        openCallback();
      }, 10);
      
      await connection.connect();
      
      expect(connection.connected).toBe(true);
      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8080', expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' }
      }));
    });

    test('should establish HTTP connection for http:// endpoints', async () => {
      mockServer.endpoint = 'http://localhost:3000';
      connection = new MCPConnection(mockServer);
      
      await connection.connect();
      
      expect(connection.connected).toBe(true);
      expect(connection.httpClient).toBeDefined();
    });

    test('should use mock connection for mock:// endpoints', async () => {
      mockServer.endpoint = 'mock://localhost';
      connection = new MCPConnection(mockServer);
      
      await connection.connect();
      
      expect(connection.connected).toBe(true);
    });

    test('should throw error for unsupported protocols', async () => {
      mockServer.endpoint = 'ftp://localhost';
      connection = new MCPConnection(mockServer);
      
      await expect(connection.connect()).rejects.toThrow('Unsupported protocol');
    });
  });

  describe('invokeTool', () => {
    test('should send tool invocation message', async () => {
      const mockWs = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN
      };
      
      WebSocket.mockImplementation(() => mockWs);
      connection.ws = mockWs;
      connection.connected = true;
      
      const toolName = 'testTool';
      const parameters = { param1: 'value1' };
      
      const promise = connection.invokeTool(toolName, parameters);
      
      // Simulate response
      setTimeout(() => {
        const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
        connection.handleMessage({
          id: sentMessage.id,
          result: { success: true }
        });
      }, 10);
      
      const result = await promise;
      
      expect(mockWs.send).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    test('should handle tool invocation errors', async () => {
      connection.connected = true;
      
      const promise = connection.invokeTool('failingTool', {});
      
      // Simulate error response
      setTimeout(() => {
        const pendingRequest = connection.pendingRequests.values().next().value;
        if (pendingRequest) {
          pendingRequest.reject(new Error('Tool failed'));
        }
      }, 10);
      
      await expect(promise).rejects.toThrow('Tool failed');
    });
  });

  describe('reconnection', () => {
    test('should attempt to reconnect on connection loss', async () => {
      const mockWs = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn()
      };
      
      WebSocket.mockImplementation(() => mockWs);
      
      // Simulate connection and then close
      setTimeout(() => {
        const openCallback = mockWs.on.mock.calls.find(call => call[0] === 'open')[1];
        openCallback();
        
        const closeCallback = mockWs.on.mock.calls.find(call => call[0] === 'close')[1];
        closeCallback();
      }, 10);
      
      await connection.connect();
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(connection.reconnectAttempts).toBeGreaterThan(0);
    });
  });

  describe('message handling', () => {
    test('should resolve pending requests on message receipt', () => {
      const requestId = 'test-request-123';
      const mockResolve = jest.fn();
      const mockReject = jest.fn();
      
      connection.pendingRequests.set(requestId, {
        resolve: mockResolve,
        reject: mockReject
      });
      
      connection.handleMessage({
        id: requestId,
        result: { data: 'test' }
      });
      
      expect(mockResolve).toHaveBeenCalledWith({ data: 'test' });
      expect(connection.pendingRequests.has(requestId)).toBe(false);
    });

    test('should reject pending requests on error message', () => {
      const requestId = 'test-request-456';
      const mockResolve = jest.fn();
      const mockReject = jest.fn();
      
      connection.pendingRequests.set(requestId, {
        resolve: mockResolve,
        reject: mockReject
      });
      
      connection.handleMessage({
        id: requestId,
        error: 'Something went wrong'
      });
      
      expect(mockReject).toHaveBeenCalledWith(new Error('Something went wrong'));
      expect(connection.pendingRequests.has(requestId)).toBe(false);
    });

    test('should emit unsolicited messages as events', () => {
      const emitSpy = jest.spyOn(connection, 'emit');
      
      connection.handleMessage({
        type: 'notification',
        data: 'test'
      });
      
      expect(emitSpy).toHaveBeenCalledWith('message', expect.objectContaining({
        type: 'notification'
      }));
    });
  });

  describe('disconnect', () => {
    test('should clean up resources on disconnect', async () => {
      const mockWs = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN
      };
      
      connection.ws = mockWs;
      connection.connected = true;
      connection.pendingRequests.set('pending', {
        reject: jest.fn()
      });
      
      await connection.disconnect();
      
      expect(mockWs.close).toHaveBeenCalled();
      expect(connection.connected).toBe(false);
      expect(connection.pendingRequests.size).toBe(0);
    });
  });
});