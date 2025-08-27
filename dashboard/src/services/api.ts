import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class APIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error);
      }
    );
  }

  // Health check
  async getHealth() {
    return this.client.get('/health');
  }

  // Conversation endpoints
  async startConversation(data: {
    objective?: string;
    complexity?: number;
    iterations?: number;
  }) {
    return this.client.post('/api/conversation/start', data);
  }

  async getConversationState(conversationId: string) {
    return this.client.get(`/api/conversation/${conversationId}/state`);
  }

  async createSnapshot(conversationId: string, description: string) {
    return this.client.post(`/api/conversation/${conversationId}/snapshot`, {
      description,
    });
  }

  async createBranch(conversationId: string, branchName: string, fromSnapshot?: string) {
    return this.client.post(`/api/conversation/${conversationId}/branch`, {
      branchName,
      fromSnapshot,
    });
  }

  async stopConversation(conversationId: string) {
    return this.client.post(`/api/conversation/${conversationId}/stop`);
  }

  // Analytics endpoints
  async getAnalyticsDashboard() {
    return this.client.get('/api/analytics/dashboard');
  }

  async getAgentMetrics() {
    return this.client.get('/api/analytics/agents');
  }

  async getModelComparison() {
    return this.client.get('/api/analytics/models');
  }

  // Performance metrics endpoints
  async getPerformanceMetrics() {
    return this.client.get('/api/metrics');
  }

  async getMetricsHistory(duration?: number) {
    return this.client.get('/api/metrics/history', {
      params: { duration }
    });
  }

  // Cache endpoints
  async getCacheStats() {
    return this.client.get('/api/cache/stats');
  }

  async clearCache() {
    return this.client.post('/api/cache/clear');
  }

  async exportCache() {
    return this.client.get('/api/cache/export');
  }

  async importCache(data: any) {
    return this.client.post('/api/cache/import', { data });
  }

  // State management endpoints
  async listStates() {
    return this.client.get('/api/states');
  }

  async restoreState(snapshotId: string) {
    return this.client.post('/api/states/restore', { snapshotId });
  }
}

// Export singleton instance
export const apiService = new APIService();
export default apiService;