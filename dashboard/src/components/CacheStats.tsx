import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Button,
  Tooltip,
} from '@mui/material';
import { Clear as ClearIcon, GetApp as ExportIcon } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import websocketService from '../services/websocket';
import apiService from '../services/api';

interface CacheStatsData {
  hits: number;
  misses: number;
  hitRate: number;
  cacheSize: number;
  memoryUsage: number;
  avgEntrySizeKB: string;
  saves: number;
  evictions: number;
}

export const CacheStats: React.FC = () => {
  const [stats, setStats] = useState<CacheStatsData | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const handleCacheStats = (data: CacheStatsData) => {
      setStats(data);
    };

    const handleMetricsUpdate = (data: any) => {
      if (data.cache) {
        setStats(data.cache);
      }
    };

    websocketService.on('cache:stats', handleCacheStats);
    websocketService.on('metrics:update', handleMetricsUpdate);

    // Request initial cache stats
    apiService.getCacheStats().then((data: any) => {
      setStats(data.stats);
    });

    return () => {
      websocketService.off('cache:stats', handleCacheStats);
      websocketService.off('metrics:update', handleMetricsUpdate);
    };
  }, []);

  const clearCache = async () => {
    setClearing(true);
    try {
      await apiService.clearCache();
      // Stats will be updated via WebSocket
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setClearing(false);
    }
  };

  const exportCache = async () => {
    try {
      const data = await apiService.exportCache();
      // Create download link
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cache-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export cache:', error);
    }
  };

  if (!stats) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  // Prepare data for hit/miss chart
  const hitMissData = [
    { name: 'Hits', value: stats.hits, color: '#10b981' },
    { name: 'Misses', value: stats.misses, color: '#ef4444' },
  ];

  const total = stats.hits + stats.misses;
  const hitPercentage = total > 0 ? (stats.hits / total) * 100 : 0;

  return (
    <Card sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title="Cache Performance"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Export Cache">
              <Button
                size="small"
                startIcon={<ExportIcon />}
                onClick={exportCache}
              >
                Export
              </Button>
            </Tooltip>
            <Tooltip title="Clear Cache">
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearCache}
                disabled={clearing}
                color="warning"
              >
                Clear
              </Button>
            </Tooltip>
          </Box>
        }
      />
      <CardContent sx={{ flex: 1, overflow: 'auto' }}>
        <Grid container spacing={3}>
          {/* Hit Rate Circle */}
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'inline-flex',
                  mb: 2,
                }}
              >
                <CircularProgress
                  variant="determinate"
                  value={hitPercentage}
                  size={120}
                  thickness={4}
                  sx={{
                    color: hitPercentage > 70 ? 'success.main' : 
                           hitPercentage > 40 ? 'warning.main' : 
                           'error.main',
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="h4" fontWeight={600}>
                      {hitPercentage.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hit Rate
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Stats Grid */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Total Hits
                </Typography>
                <Typography variant="h6" fontWeight={600} color="success.main">
                  {stats.hits.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Total Misses
                </Typography>
                <Typography variant="h6" fontWeight={600} color="error.main">
                  {stats.misses.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Cache Size
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {stats.cacheSize}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Memory Usage
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {(stats.memoryUsage / 1024).toFixed(1)} KB
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Saves
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {stats.saves}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Evictions
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {stats.evictions}
                </Typography>
              </Grid>
            </Grid>
          </Grid>

          {/* Hit/Miss Bar Chart */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Hit vs Miss Distribution
            </Typography>
            <Box sx={{ height: { xs: 80, sm: 100, md: 120, lg: 140 } }}>
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hitMissData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="value">
                  {hitMissData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};