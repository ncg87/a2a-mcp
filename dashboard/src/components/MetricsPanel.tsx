import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Grid,
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import websocketService from '../services/websocket';
import apiService from '../services/api';

interface MetricsData {
  timestamp: number;
  responseTime: number;
  tokens: number;
  errorRate: number;
  throughput: number;
}

export const MetricsPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);

  useEffect(() => {
    // Fetch real performance metrics
    const fetchMetrics = async () => {
      try {
        const perfMetrics = await apiService.getPerformanceMetrics();
        setPerformanceData(perfMetrics);
        
        // Convert to display format
        const newMetric: MetricsData = {
          timestamp: Date.now(),
          responseTime: parseFloat(perfMetrics.current?.responseTime) || 0,
          tokens: 0, // Will be updated from analytics
          errorRate: parseFloat(perfMetrics.current?.errorRate) || 0,
          throughput: parseFloat(perfMetrics.current?.throughput) || 0,
        };
        
        setMetrics(prev => {
          const updated = [...prev, newMetric];
          return updated.slice(-20);
        });
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    // Initial fetch
    fetchMetrics();

    // Set up interval for periodic updates
    const interval = setInterval(fetchMetrics, 5000);

    const handleMetricsUpdate = (data: any) => {
      setCurrentMetrics(data);
      
      // Add to time series
      const newMetric: MetricsData = {
        timestamp: Date.now(),
        responseTime: data.analytics?.avgResponseTime || performanceData?.current?.responseTime || 0,
        tokens: data.analytics?.totalTokens || 0,
        errorRate: data.analytics?.errorRate || performanceData?.current?.errorRate || 0,
        throughput: data.analytics?.throughput || performanceData?.current?.throughput || 0,
      };
      
      setMetrics(prev => {
        const updated = [...prev, newMetric];
        // Keep only last 20 data points
        return updated.slice(-20);
      });
    };

    websocketService.on('metrics:update', handleMetricsUpdate);
    websocketService.on('analytics:update', handleMetricsUpdate);

    // Request initial metrics
    websocketService.requestMetrics();

    return () => {
      clearInterval(interval);
      websocketService.off('metrics:update', handleMetricsUpdate);
      websocketService.off('analytics:update', handleMetricsUpdate);
    };
  }, []);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  // Prepare pie chart data for model distribution
  const modelData = currentMetrics?.models?.map((model: any, index: number) => ({
    name: model.name || `Model ${index + 1}`,
    value: model.totalRequests || 0,
  })) || [];

  return (
    <Card sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <CardHeader title="System Metrics" />
      <CardContent sx={{ flex: 1, overflow: 'auto' }}>
        <Grid container spacing={3}>
          {/* Key Metrics */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Response Time
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {currentMetrics?.analytics?.avgResponseTime?.toFixed(0) || 
                     performanceData?.current?.responseTime || 0}ms
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Tokens
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {currentMetrics?.analytics?.totalTokens?.toLocaleString() || 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Error Rate
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {currentMetrics?.analytics?.errorRate?.toFixed(1) || 0}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Throughput
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {currentMetrics?.analytics?.throughput?.toFixed(1) || 0}/s
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>

          {/* Response Time Chart */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Response Time Trend
            </Typography>
            <Box sx={{ height: { xs: 150, sm: 180, md: 200, lg: 220 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  hide
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  formatter={(value: number) => `${value.toFixed(0)}ms`}
                />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Throughput Chart */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Throughput
            </Typography>
            <Box sx={{ height: { xs: 150, sm: 180, md: 200, lg: 220 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  hide
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  formatter={(value: number) => `${value.toFixed(1)}/s`}
                />
                <Area
                  type="monotone"
                  dataKey="throughput"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Model Distribution */}
          {modelData.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Model Usage Distribution
              </Typography>
              <Box sx={{ height: { xs: 150, sm: 180, md: 200, lg: 220 } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                  <Pie
                    data={modelData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {modelData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};