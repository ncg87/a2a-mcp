import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  List,
  ListItem,
  Avatar,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  SmartToy,
  Psychology,
  Engineering,
  Code,
  Analytics,
  Security,
} from '@mui/icons-material';
import websocketService from '../services/websocket';
import { format } from 'date-fns';

interface Message {
  id: string;
  agentId: string;
  agentType: string;
  content: string;
  timestamp: number;
  iteration: number;
  model?: string;
}

interface ConversationViewProps {
  conversationId: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ conversationId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listen for agent responses
    const handleAgentResponse = (data: any) => {
      if (data.conversationId === conversationId) {
        const newMessage: Message = {
          id: `${data.agentId}-${Date.now()}`,
          agentId: data.agentId,
          agentType: data.agentType || 'agent',
          content: data.content,
          timestamp: data.timestamp,
          iteration: data.iteration || currentIteration,
          model: data.model,
        };
        setMessages(prev => [...prev, newMessage]);
      }
    };

    // Listen for iteration complete
    const handleIterationComplete = (data: any) => {
      if (data.conversationId === conversationId) {
        setCurrentIteration(data.iteration);
      }
    };

    // Listen for conversation complete
    const handleConversationComplete = (data: any) => {
      if (data.conversationId === conversationId) {
        setIsComplete(true);
      }
    };

    websocketService.on('agent:response', handleAgentResponse);
    websocketService.on('iteration:complete', handleIterationComplete);
    websocketService.on('conversation:complete', handleConversationComplete);

    return () => {
      websocketService.off('agent:response', handleAgentResponse);
      websocketService.off('iteration:complete', handleIterationComplete);
      websocketService.off('conversation:complete', handleConversationComplete);
    };
  }, [conversationId, currentIteration]);

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

  return (
    <Card sx={{ 
      height: '600px',
      display: 'flex',
      flexDirection: 'column' 
    }}>
      <CardHeader
        title="Conversation"
        subheader={`ID: ${conversationId}`}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={`Iteration ${currentIteration}`}
              size="small"
              color="primary"
            />
            {isComplete ? (
              <Chip label="Complete" size="small" color="success" />
            ) : (
              <Chip label="Active" size="small" color="warning" />
            )}
          </Box>
        }
      />
      
      {!isComplete && <LinearProgress />}
      
      <CardContent sx={{ flex: 1, overflow: 'auto', p: 0, height: 0 }}>
        <List sx={{ p: 2 }}>
          {messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body2" color="text.secondary">
                Waiting for agent responses...
              </Typography>
            </Box>
          ) : (
            messages.map((message, index) => (
              <React.Fragment key={message.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    flexDirection: 'column',
                    gap: 1,
                    py: 2,
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Avatar
                      sx={{
                        bgcolor: getAgentColor(message.agentType),
                        width: 32,
                        height: 32,
                      }}
                    >
                      {getAgentIcon(message.agentType)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {message.agentType}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(message.timestamp, 'HH:mm:ss')} • Iteration {message.iteration}
                        {message.model && ` • ${message.model}`}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography
                    variant="body2"
                    sx={{
                      pl: 5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {message.content || 'No content available'}
                  </Typography>
                </ListItem>
                
                {index < messages.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
          <div ref={messagesEndRef} />
        </List>
      </CardContent>
    </Card>
  );
};