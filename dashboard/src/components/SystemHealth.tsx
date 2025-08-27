import React from 'react';
import { Card, CardContent, Typography, Grid, Chip, Box } from '@mui/material';
import { CheckCircle, Error, Warning } from '@mui/icons-material';

interface SystemHealthProps {
  health: any;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ health }) => {
  if (!health) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'warning':
        return <Warning sx={{ color: 'warning.main' }} />;
      case 'error':
        return <Error sx={{ color: 'error.main' }} />;
      default:
        return null;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            System Health
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon(health.status)}
            <Chip
              label={health.status.toUpperCase()}
              size="small"
              color={health.status === 'healthy' ? 'success' : 'warning'}
            />
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              Uptime
            </Typography>
            <Typography variant="h6">
              {formatUptime(health.uptime)}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              Active Conversations
            </Typography>
            <Typography variant="h6">
              {health.conversations || 0}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              Cache Hit Rate
            </Typography>
            <Typography variant="h6">
              {health.cache?.hitRate?.toFixed(1) || 0}%
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              Memory Usage
            </Typography>
            <Typography variant="h6">
              {((health.cache?.memoryUsage || 0) / 1024).toFixed(1)} KB
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};