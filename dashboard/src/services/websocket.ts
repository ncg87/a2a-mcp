import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

export interface MetricsUpdate {
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    cacheSize: number;
  };
  conversations: number;
  analytics: {
    totalResponses: number;
    totalTokens: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

export interface AgentResponse {
  conversationId: string;
  agentId: string;
  content: string;
  iteration: number;
  timestamp: number;
}

export interface ConversationComplete {
  conversationId: string;
  summary: string;
  finalIteration: number;
  totalAgents: number;
}

class WebSocketService extends EventEmitter {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor() {
    super();
  }

  connect(url: string = 'http://localhost:3001'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.isConnected = false;
        this.emit('disconnected', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error.message);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.emit('error', 'Max reconnection attempts reached');
          reject(error);
        }
      });

      // System events
      this.socket.on('metrics:update', (data: MetricsUpdate) => {
        this.emit('metrics:update', data);
      });

      this.socket.on('cache:stats', (data) => {
        this.emit('cache:stats', data);
      });

      this.socket.on('analytics:update', (data) => {
        this.emit('analytics:update', data);
      });

      // Conversation events
      this.socket.on('conversation:started', (data) => {
        this.emit('conversation:started', data);
      });

      this.socket.on('conversation:stopped', (data) => {
        this.emit('conversation:stopped', data);
      });

      this.socket.on('conversation:complete', (data: ConversationComplete) => {
        this.emit('conversation:complete', data);
      });

      this.socket.on('conversation:error', (data) => {
        this.emit('conversation:error', data);
      });

      // Agent events
      this.socket.on('agent:created', (data) => {
        this.emit('agent:created', data);
      });

      this.socket.on('agent:response', (data: AgentResponse) => {
        this.emit('agent:response', data);
      });

      // Iteration events
      this.socket.on('iteration:complete', (data) => {
        this.emit('iteration:complete', data);
      });

      // State events
      this.socket.on('snapshot:created', (data) => {
        this.emit('snapshot:created', data);
      });

      this.socket.on('state:saved', (data) => {
        this.emit('state:saved', data);
      });

      // Alert events
      this.socket.on('alert:triggered', (data) => {
        this.emit('alert:triggered', data);
      });

      // Set a timeout for initial connection
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Subscription methods
  subscribeToConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:conversation', conversationId);
    }
  }

  unsubscribeFromConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:conversation', conversationId);
    }
  }

  subscribeToAnalytics(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:analytics');
    }
  }

  requestMetrics(): void {
    if (this.socket?.connected) {
      this.socket.emit('request:metrics');
    }
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;