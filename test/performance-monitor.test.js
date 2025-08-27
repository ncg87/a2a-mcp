/**
 * Tests for Performance Monitor
 */

import { jest } from '@jest/globals';
import { PerformanceMonitor } from '../src/core/performance-monitor.js';
import os from 'os';

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      sampleInterval: 100, // Faster for testing
      historySize: 10,
      thresholds: {
        cpu: 80,
        memory: 85,
        responseTime: 1000,
        errorRate: 5
      }
    });
  });

  afterEach(() => {
    monitor.stop();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    test('should start monitoring', () => {
      expect(monitor.isMonitoring).toBe(false);
      
      monitor.start();
      
      expect(monitor.isMonitoring).toBe(true);
    });

    test('should stop monitoring', () => {
      monitor.start();
      expect(monitor.isMonitoring).toBe(true);
      
      monitor.stop();
      
      expect(monitor.isMonitoring).toBe(false);
    });

    test('should not start multiple times', () => {
      monitor.start();
      const interval1 = monitor.sampleInterval;
      
      monitor.start();
      const interval2 = monitor.sampleInterval;
      
      expect(interval1).toBe(interval2);
    });
  });

  describe('operation tracking', () => {
    test('should track operation duration', () => {
      const operationId = 'test-op-123';
      
      monitor.startOperation(operationId, { type: 'api_call' });
      
      // Simulate some work
      const startTime = Date.now();
      while (Date.now() - startTime < 50) {
        // Busy wait
      }
      
      const duration = monitor.endOperation(operationId, true);
      
      expect(duration).toBeGreaterThan(40);
      expect(duration).toBeLessThan(100);
      expect(monitor.operations.has(operationId)).toBe(false);
    });

    test('should track success and failure', () => {
      monitor.startOperation('op1');
      monitor.endOperation('op1', true);
      
      monitor.startOperation('op2');
      monitor.endOperation('op2', false);
      
      expect(monitor.requestCount).toBe(2);
      expect(monitor.errorCount).toBe(1);
    });

    test('should emit threshold exceeded event for slow operations', (done) => {
      monitor.on('threshold:exceeded', (event) => {
        expect(event.type).toBe('responseTime');
        expect(event.value).toBeGreaterThan(1000);
        done();
      });
      
      monitor.startOperation('slow-op');
      
      setTimeout(() => {
        monitor.endOperation('slow-op', true);
      }, 1100);
    });
  });

  describe('async operation tracking', () => {
    test('should track async operations', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'result';
      };
      
      const result = await monitor.trackOperation('async-op', operation, {
        type: 'async_task'
      });
      
      expect(result).toBe('result');
      expect(monitor.requestCount).toBe(1);
      expect(monitor.errorCount).toBe(0);
    });

    test('should track async operation failures', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Operation failed');
      };
      
      await expect(monitor.trackOperation('failing-op', operation)).rejects.toThrow('Operation failed');
      
      expect(monitor.requestCount).toBe(1);
      expect(monitor.errorCount).toBe(1);
    });
  });

  describe('metrics collection', () => {
    test('should collect system metrics', async () => {
      monitor.start();
      
      // Wait for first collection
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const cpuMetrics = monitor.metrics.cpu;
      const memoryMetrics = monitor.metrics.memory;
      
      expect(cpuMetrics.length).toBeGreaterThan(0);
      expect(memoryMetrics.length).toBeGreaterThan(0);
      
      const lastCpu = cpuMetrics[cpuMetrics.length - 1];
      expect(lastCpu.value).toBeGreaterThanOrEqual(0);
      expect(lastCpu.value).toBeLessThanOrEqual(100);
    });

    test('should calculate throughput', async () => {
      monitor.startOperation('op1');
      monitor.endOperation('op1', true);
      monitor.startOperation('op2');
      monitor.endOperation('op2', true);
      
      await monitor.collectMetrics();
      
      const throughput = monitor.metrics.throughput;
      expect(throughput.length).toBeGreaterThan(0);
    });

    test('should calculate error rate', async () => {
      monitor.startOperation('op1');
      monitor.endOperation('op1', true);
      monitor.startOperation('op2');
      monitor.endOperation('op2', false);
      monitor.startOperation('op3');
      monitor.endOperation('op3', false);
      
      await monitor.collectMetrics();
      
      const errors = monitor.metrics.errors;
      expect(errors.length).toBeGreaterThan(0);
      const lastError = errors[errors.length - 1];
      expect(lastError.value).toBeCloseTo(66.67, 1); // 2 out of 3 failed
    });

    test('should limit history size', () => {
      // Add more metrics than history size
      for (let i = 0; i < 15; i++) {
        monitor.addMetric('cpu', i);
      }
      
      expect(monitor.metrics.cpu.length).toBe(10); // historySize
    });
  });

  describe('threshold monitoring', () => {
    test('should emit event when CPU threshold exceeded', (done) => {
      monitor.on('threshold:exceeded', (event) => {
        if (event.type === 'cpu') {
          expect(event.value).toBeGreaterThan(80);
          expect(event.threshold).toBe(80);
          done();
        }
      });
      
      monitor.checkThresholds({
        cpu: 85,
        memory: 50,
        errorRate: 2
      });
    });

    test('should emit event when memory threshold exceeded', (done) => {
      monitor.on('threshold:exceeded', (event) => {
        if (event.type === 'memory') {
          expect(event.value).toBeGreaterThan(85);
          done();
        }
      });
      
      monitor.checkThresholds({
        cpu: 70,
        memory: 90,
        errorRate: 2
      });
    });

    test('should emit event when error rate threshold exceeded', (done) => {
      monitor.on('threshold:exceeded', (event) => {
        if (event.type === 'errorRate') {
          expect(event.value).toBeGreaterThan(5);
          done();
        }
      });
      
      monitor.checkThresholds({
        cpu: 70,
        memory: 80,
        errorRate: 10
      });
    });
  });

  describe('reporting', () => {
    test('should get latest metrics', () => {
      monitor.addMetric('cpu', 50);
      monitor.addMetric('memory', 60);
      monitor.addMetric('responseTime', 500);
      
      const latest = monitor.getLatestMetrics();
      
      expect(latest.cpu).toBe(50);
      expect(latest.memory).toBe(60);
      expect(latest.responseTime).toBe(500);
    });

    test('should calculate average metrics', () => {
      const now = Date.now();
      
      monitor.metrics.cpu = [
        { value: 40, timestamp: now - 5000 },
        { value: 50, timestamp: now - 3000 },
        { value: 60, timestamp: now - 1000 }
      ];
      
      const averages = monitor.getAverageMetrics(10000);
      
      expect(averages.cpu).toBe(50); // (40+50+60)/3
    });

    test('should generate performance report', () => {
      monitor.addMetric('cpu', 45);
      monitor.addMetric('memory', 65);
      monitor.addMetric('responseTime', 750);
      monitor.addMetric('throughput', 100);
      monitor.addMetric('errors', 2);
      
      const report = monitor.getReport();
      
      expect(report.current.cpu).toBe('45.00%');
      expect(report.current.memory).toBe('65.00%');
      expect(report.current.responseTime).toBe('750.00ms');
      expect(report.current.throughput).toBe('100.00 req/s');
      expect(report.current.errorRate).toBe('2.00%');
      expect(report.thresholds).toEqual(monitor.config.thresholds);
    });

    test('should get health status', () => {
      monitor.addMetric('cpu', 45);
      monitor.addMetric('memory', 65);
      monitor.addMetric('responseTime', 500);
      monitor.addMetric('errors', 1);
      
      const health = monitor.getHealthStatus();
      
      expect(health.status).toBe('healthy');
      expect(health.issues).toHaveLength(0);
    });

    test('should detect degraded health', () => {
      monitor.addMetric('cpu', 85); // Above threshold
      monitor.addMetric('memory', 65);
      monitor.addMetric('responseTime', 500);
      monitor.addMetric('errors', 1);
      
      const health = monitor.getHealthStatus();
      
      expect(health.status).toBe('degraded');
      expect(health.issues).toContain(expect.stringContaining('High CPU'));
    });

    test('should detect unhealthy state', () => {
      monitor.addMetric('cpu', 45);
      monitor.addMetric('memory', 65);
      monitor.addMetric('responseTime', 500);
      monitor.addMetric('errors', 10); // Above error threshold
      
      const health = monitor.getHealthStatus();
      
      expect(health.status).toBe('unhealthy');
      expect(health.issues).toContain(expect.stringContaining('High error rate'));
    });
  });

  describe('middleware', () => {
    test('should create Express middleware', () => {
      const middleware = monitor.middleware();
      expect(typeof middleware).toBe('function');
      
      const mockReq = {
        method: 'GET',
        path: '/api/test',
        ip: '127.0.0.1'
      };
      
      const mockRes = {
        statusCode: 200,
        end: jest.fn()
      };
      
      const mockNext = jest.fn();
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(monitor.operations.size).toBe(1);
      
      // Simulate response
      mockRes.end();
      
      expect(monitor.requestCount).toBe(1);
      expect(monitor.errorCount).toBe(0);
    });

    test('should track failed requests', () => {
      const middleware = monitor.middleware();
      
      const mockReq = {
        method: 'POST',
        path: '/api/fail',
        ip: '127.0.0.1'
      };
      
      const mockRes = {
        statusCode: 500,
        end: jest.fn()
      };
      
      const mockNext = jest.fn();
      
      middleware(mockReq, mockRes, mockNext);
      mockRes.end();
      
      expect(monitor.requestCount).toBe(1);
      expect(monitor.errorCount).toBe(1);
    });
  });
});