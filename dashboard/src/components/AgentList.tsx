import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Chip,
  Box,
  LinearProgress,
} from '@mui/material';
import {
  SmartToy,
  Psychology,
  Engineering,
  Code,
  Analytics,
  Security,
  Circle,
} from '@mui/icons-material';
import websocketService from '../services/websocket';

interface Agent {
  id: string;
  type: string;
  model: string;
  status: 'idle' | 'thinking' | 'responding';
  messageCount: number;
  lastActivity: number;
  tokens: number;
}

interface AgentListProps {
  conversationId: string;
}

export const AgentList: React.FC<AgentListProps> = ({ conversationId }) => {
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map());

  useEffect(() => {
    // Handle agent created event
    const handleAgentCreated = (data: any) => {
      if (data.conversationId === conversationId) {
        const newAgent: Agent = {
          id: data.agentId,
          type: data.agentType,
          model: data.model || 'Unknown',
          status: 'idle',
          messageCount: 0,
          lastActivity: data.timestamp,
          tokens: 0,
        };
        
        setAgents(prev => {
          const updated = new Map(prev);
          updated.set(data.agentId, newAgent);
          return updated;
        });
      }
    };

    // Handle agent response event
    const handleAgentResponse = (data: any) => {
      if (data.conversationId === conversationId) {
        setAgents(prev => {
          const updated = new Map(prev);
          const agent = updated.get(data.agentId);
          
          if (agent) {
            agent.status = 'idle';
            agent.messageCount += 1;
            agent.lastActivity = data.timestamp;
            agent.tokens += data.tokens || 0;
            updated.set(data.agentId, agent);
          }
          
          return updated;
        });
      }
    };

    // Handle agent thinking (when they start processing)
    const handleAgentThinking = (data: any) => {
      if (data.conversationId === conversationId) {
        setAgents(prev => {
          const updated = new Map(prev);
          const agent = updated.get(data.agentId);
          
          if (agent) {
            agent.status = 'thinking';
            updated.set(data.agentId, agent);
          }
          
          return updated;
        });
      }
    };

    websocketService.on('agent:created', handleAgentCreated);
    websocketService.on('agent:response', handleAgentResponse);
    websocketService.on('agent:thinking', handleAgentThinking);

    return () => {
      websocketService.off('agent:created', handleAgentCreated);
      websocketService.off('agent:response', handleAgentResponse);
      websocketService.off('agent:thinking', handleAgentThinking);
    };
  }, [conversationId]);

  const getAgentIcon = (agentType: string) => {
    const type = agentType.toLowerCase();
    if (type.includes('research')) return <Psychology />;
    if (type.includes('code') || type.includes('dev')) return <Code />;
    if (type.includes('architect') || type.includes('design')) return <Engineering />;
    if (type.includes('analysis') || type.includes('analyst')) return <Analytics />;
    if (type.includes('security')) return <Security />;
    return <SmartToy />;
  };

  const getAgentColor = (agentType: string) => {
    const type = agentType.toLowerCase();
    if (type.includes('research')) return '#9c27b0';
    if (type.includes('code') || type.includes('dev')) return '#2196f3';
    if (type.includes('architect') || type.includes('design')) return '#ff9800';
    if (type.includes('analysis') || type.includes('analyst')) return '#4caf50';
    if (type.includes('security')) return '#f44336';
    return '#607d8b';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responding':
        return 'success';
      case 'thinking':
        return 'warning';
      case 'idle':
      default:
        return 'default';
    }
  };

  const agentArray = Array.from(agents.values());

  return (
    <Card sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title="Active Agents"
        subheader={`${agentArray.length} agents deployed`}
      />
      <CardContent sx={{ p: 0, flex: 1, overflow: 'auto' }}>
        {agentArray.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No agents created yet
            </Typography>
          </Box>
        ) : (
          <List>
            {agentArray.map((agent) => (
              <ListItem
                key={agent.id}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: getAgentColor(agent.type) }}>
                    {getAgentIcon(agent.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {agent.type}
                      </Typography>
                      <Circle
                        sx={{
                          fontSize: 8,
                          color: agent.status === 'idle' ? 'text.disabled' : 
                                 agent.status === 'thinking' ? 'warning.main' : 
                                 'success.main',
                          animation: agent.status !== 'idle' ? 'pulse 2s infinite' : 'none',
                          '@keyframes pulse': {
                            '0%': { opacity: 1 },
                            '50%': { opacity: 0.3 },
                            '100%': { opacity: 1 },
                          },
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {agent.model}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={`${agent.messageCount} msgs`}
                          size="small"
                          variant="outlined"
                        />
                        {agent.tokens > 0 && (
                          <Chip
                            label={`${agent.tokens.toLocaleString()} tokens`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={agent.status}
                          size="small"
                          color={getStatusColor(agent.status)}
                        />
                      </Box>
                    </Box>
                  }
                />
                {agent.status === 'thinking' && (
                  <LinearProgress
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                    }}
                  />
                )}
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};