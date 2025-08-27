/**
 * Performance Monitoring System
 * 
 * Tracks system performance, resource usage, and bottlenecks
 */

import { EventEmitter } from 'eventemitter3';
import logger from '../utils/logger.js';
import os from 'os';
import { performance } from 'perf_hooks';

export class PerformanceMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      sampleInterval: config.sampleInterval || 5000, // 5 seconds
      historySize: config.historySize || 100,
      thresholds: {
        cpu: config.cpuThreshold || 80,
        memory: config.memoryThreshold || 85,
        responseTime: config.responseTimeThreshold || 1000, // 1 second
        errorRate: config.errorRateThreshold || 5 // percent
      },
      ...config
    };
    
    this.metrics = {
      cpu: [],
      memory: [],
      responseTime: [],
      throughput: [],
      errors: []
    };
    
    this.operations = new Map();
    this.errorCount = 0;
    this.requestCount = 0;
    this.lastSampleTime = Date.now();
    this.isMonitoring = false;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.sampleInterval = setInterval(() => this.collectMetrics(), this.config.sampleInterval);
    
    logger.info('Performance monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
    }
    
    logger.info('Performance monitoring stopped');
  }

  /**
   * Start tracking an operation
   */
  startOperation(operationId, metadata = {}) {
    this.operations.set(operationId, {
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End tracking an operation
   */
  endOperation(operationId, success = true) {
    const operation = this.operations.get(operationId);
    if (!operation) return;
    
    const duration = performance.now() - operation.startTime;
    this.operations.delete(operationId);
    
    // Track response time
    this.addMetric('responseTime', duration);
    
    // Track success/failure
    this.requestCount++;
    if (!success) {
      this.errorCount++;
    }
    
    // Check thresholds
    if (duration > this.config.thresholds.responseTime) {
      this.emit('threshold:exceeded', {
        type: 'responseTime',
        value: duration,
        threshold: this.config.thresholds.responseTime,
        operationId,
        metadata: operation.metadata
      });
    }
    
    return duration;
  }

  /**
   * Collect system metrics
   */
  async collectMetrics() {
    const now = Date.now();
    const timeDelta = now - this.lastSampleTime;
    
    // CPU usage
    const cpuUsage = this.getCPUUsage();
    this.addMetric('cpu', cpuUsage);
    
    // Memory usage
    const memoryUsage = this.getMemoryUsage();
    this.addMetric('memory', memoryUsage);
    
    // Throughput (requests per second)
    const throughput = (this.requestCount / (timeDelta / 1000));
    this.addMetric('throughput', throughput);
    
    // Error rate
    const errorRate = this.requestCount > 0 
      ? (this.errorCount / this.requestCount) * 100 
      : 0;
    this.addMetric('errors', errorRate);
    
    // Check thresholds
    this.checkThresholds({
      cpu: cpuUsage,
      memory: memoryUsage,
      errorRate
    });
    
    // Reset counters
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastSampleTime = now;
    
    // Emit metrics event
    this.emit('metrics:collected', this.getLatestMetrics());
  }

  /**
   * Get CPU usage percentage
   */
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    return usage;
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usage = (usedMem / totalMem) * 100;
    
    return usage;
  }

  /**
   * Add metric to history
   */
  addMetric(type, value) {
    if (!this.metrics[type]) {
      this.metrics[type] = [];
    }
    
    this.metrics[type].push({
      value,
      timestamp: Date.now()
    });
    
    // Limit history size
    if (this.metrics[type].length > this.config.historySize) {
      this.metrics[type].shift();
    }
  }

  /**
   * Check if thresholds are exceeded
   */
  checkThresholds(currentMetrics) {
    const { thresholds } = this.config;
    
    if (currentMetrics.cpu > thresholds.cpu) {
      this.emit('threshold:exceeded', {
        type: 'cpu',
        value: currentMetrics.cpu,
        threshold: thresholds.cpu
      });
      logger.warn(`CPU usage threshold exceeded: ${currentMetrics.cpu.toFixed(2)}%`);
    }
    
    if (currentMetrics.memory > thresholds.memory) {
      this.emit('threshold:exceeded', {
        type: 'memory',
        value: currentMetrics.memory,
        threshold: thresholds.memory
      });
      logger.warn(`Memory usage threshold exceeded: ${currentMetrics.memory.toFixed(2)}%`);
    }
    
    if (currentMetrics.errorRate > thresholds.errorRate) {
      this.emit('threshold:exceeded', {
        type: 'errorRate',
        value: currentMetrics.errorRate,
        threshold: thresholds.errorRate
      });
      logger.warn(`Error rate threshold exceeded: ${currentMetrics.errorRate.toFixed(2)}%`);
    }
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics() {
    const latest = {};
    
    for (const [type, values] of Object.entries(this.metrics)) {
      if (values.length > 0) {
        latest[type] = values[values.length - 1].value;
      }
    }
    
    return latest;
  }

  /**
   * Get average metrics
   */
  getAverageMetrics(duration = 60000) {
    const averages = {};
    const cutoff = Date.now() - duration;
    
    for (const [type, values] of Object.entries(this.metrics)) {
      const recentValues = values.filter(v => v.timestamp > cutoff);
      
      if (recentValues.length > 0) {
        const sum = recentValues.reduce((acc, v) => acc + v.value, 0);
        averages[type] = sum / recentValues.length;
      } else {
        averages[type] = 0;
      }
    }
    
    return averages;
  }

  /**
   * Get performance report
   */
  getReport() {
    const latest = this.getLatestMetrics();
    const averages = this.getAverageMetrics();
    
    return {
      current: {
        cpu: `${(latest.cpu || 0).toFixed(2)}%`,
        memory: `${(latest.memory || 0).toFixed(2)}%`,
        responseTime: `${(latest.responseTime || 0).toFixed(2)}ms`,
        throughput: `${(latest.throughput || 0).toFixed(2)} req/s`,
        errorRate: `${(latest.errors || 0).toFixed(2)}%`
      },
      averages: {
        cpu: `${(averages.cpu || 0).toFixed(2)}%`,
        memory: `${(averages.memory || 0).toFixed(2)}%`,
        responseTime: `${(averages.responseTime || 0).toFixed(2)}ms`,
        throughput: `${(averages.throughput || 0).toFixed(2)} req/s`,
        errorRate: `${(averages.errors || 0).toFixed(2)}%`
      },
      thresholds: this.config.thresholds,
      historySize: this.metrics.cpu.length,
      monitoring: this.isMonitoring
    };
  }

  /**
   * Track async operation
   */
  async trackOperation(operationId, operation, metadata = {}) {
    this.startOperation(operationId, metadata);
    
    try {
      const result = await operation();
      this.endOperation(operationId, true);
      return result;
    } catch (error) {
      this.endOperation(operationId, false);
      throw error;
    }
  }

  /**
   * Create Express middleware
   */
  middleware() {
    return (req, res, next) => {
      const operationId = `${req.method}-${req.path}-${Date.now()}`;
      
      this.startOperation(operationId, {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      
      // Override res.end to track completion
      const originalEnd = res.end;
      res.end = (...args) => {
        const success = res.statusCode < 400;
        this.endOperation(operationId, success);
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const metrics = this.getLatestMetrics();
    const { thresholds } = this.config;
    
    let status = 'healthy';
    const issues = [];
    
    if (metrics.cpu > thresholds.cpu) {
      status = 'degraded';
      issues.push(`High CPU usage: ${metrics.cpu.toFixed(2)}%`);
    }
    
    if (metrics.memory > thresholds.memory) {
      status = 'degraded';
      issues.push(`High memory usage: ${metrics.memory.toFixed(2)}%`);
    }
    
    if (metrics.errors > thresholds.errorRate) {
      status = 'unhealthy';
      issues.push(`High error rate: ${metrics.errors.toFixed(2)}%`);
    }
    
    if (metrics.responseTime > thresholds.responseTime) {
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
      issues.push(`Slow response time: ${metrics.responseTime.toFixed(2)}ms`);
    }
    
    return {
      status,
      issues,
      metrics: {
        cpu: metrics.cpu || 0,
        memory: metrics.memory || 0,
        responseTime: metrics.responseTime || 0,
        errorRate: metrics.errors || 0
      }
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;