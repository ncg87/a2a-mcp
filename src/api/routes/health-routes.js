/**
 * Health and Metrics Routes Module
 * 
 * Provides endpoints for system health monitoring and performance metrics.
 * Extracted from the monolithic API server as part of the modular refactoring.
 * 
 * Endpoints:
 * - GET /health - System health status with uptime and resource usage
 * - GET /api/metrics - Current performance metrics 
 * - GET /api/metrics/history - Historical performance data
 * 
 * @module HealthRoutes
 */

import express from 'express';
import performanceMonitor from '../../core/performance-monitor.js';
import authService from '../auth-service.js';

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const healthStatus = performanceMonitor.getHealthStatus();
  res.status(healthStatus.status === 'healthy' ? 200 : 
             healthStatus.status === 'degraded' ? 200 : 503)
    .json({
      status: healthStatus.status,
      timestamp: Date.now(),
      uptime: process.uptime(),
      conversations: req.app.locals.conversations?.size || 0,
      cache: req.app.locals.cache?.getStats() || {},
      performance: healthStatus.metrics,
      issues: healthStatus.issues
    });
});

/**
 * Performance metrics endpoint
 */
router.get('/api/metrics', authService.authenticateRequest(false), (req, res) => {
  res.json(performanceMonitor.getReport());
});

/**
 * Performance history endpoint
 */
router.get('/api/metrics/history', authService.authenticateRequest(), (req, res) => {
  const duration = parseInt(req.query.duration) || 300000; // Default 5 minutes
  res.json({
    averages: performanceMonitor.getAverageMetrics(duration),
    current: performanceMonitor.getLatestMetrics(),
    duration
  });
});

export default router;