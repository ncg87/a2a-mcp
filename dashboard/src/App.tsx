import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Grid,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Slider,
  FormControl,
  FormLabel,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { lightTheme, darkTheme } from './theme/clean-glass-theme';
import { AnimatedBackground } from './components/AnimatedBackground';
import { ConversationView } from './components/ConversationView';
import { MetricsPanel } from './components/MetricsPanel';
import { AgentList } from './components/AgentList';
import { CacheStats } from './components/CacheStats';
import { StateManager } from './components/StateManager';
import { SystemHealth } from './components/SystemHealth';
import websocketService from './services/websocket';
import apiService from './services/api';

// Create theme context
interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [connected, setConnected] = useState(false);
  const [activeConversations, setActiveConversations] = useState<string[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoMode, setAutoMode] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [mainTab, setMainTab] = useState('dashboard');
  const [simulationWarning, setSimulationWarning] = useState<string | null>(null);

  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newValue));
      return newValue;
    });
  };

  // Initialize connections
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check API health
        const healthData = await apiService.getHealth();
        setHealth(healthData);

        // Connect WebSocket
        await websocketService.connect();
        setConnected(true);

        // Subscribe to analytics
        websocketService.subscribeToAnalytics();

        // Request initial metrics
        websocketService.requestMetrics();
      } catch (err: any) {
        setError(err.message || 'Failed to connect to server');
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    // WebSocket event listeners
    websocketService.on('connected', () => setConnected(true));
    websocketService.on('disconnected', () => setConnected(false));
    websocketService.on('error', (err: string) => setError(err));
    
    // Listen for simulation mode notifications
    websocketService.on('system:simulation-mode', (data: any) => {
      setSimulationWarning(data.message || 'System is running in simulation mode');
      console.warn('Simulation mode activated:', data);
    });

    // Cleanup
    return () => {
      websocketService.removeAllListeners();
      websocketService.disconnect();
    };
  }, []);

  const [conversationDialog, setConversationDialog] = useState(false);
  const [conversationConfig, setConversationConfig] = useState({
    objective: '',
    mode: 'autonomous', // simple, extended, autonomous, deep
    complexity: 5,
  });

  const startNewConversation = async () => {
    if (!conversationConfig.objective.trim()) {
      setError('Please enter an objective for the conversation');
      return;
    }

    setConversationDialog(false);
    
    try {
      const result = await apiService.startConversation({
        objective: conversationConfig.objective,
        complexity: conversationConfig.complexity,
        mode: conversationConfig.mode,
        useRealAI: true, // Always use real AI, no mock responses
      });
      
      if (result.conversationId) {
        setActiveConversations(prev => [...prev, result.conversationId]);
        setSelectedConversation(result.conversationId);
        websocketService.subscribeToConversation(result.conversationId);
        
        // Only reset objective, keep other settings
        setConversationConfig(prev => ({
            ...prev,
            objective: '',
          }));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start conversation');
    }
  };

  const stopConversation = async (conversationId?: string) => {
    const targetId = conversationId || selectedConversation;
    if (targetId) {
      try {
        await apiService.stopConversation(targetId);
        websocketService.unsubscribeFromConversation(targetId);
        setActiveConversations(prev => prev.filter(id => id !== targetId));
        if (selectedConversation === targetId) {
          setSelectedConversation(activeConversations.find(id => id !== targetId) || null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to stop conversation');
      }
    }
  };
  
  const stopAllConversations = async () => {
    for (const convId of activeConversations) {
      await stopConversation(convId);
    }
  };

  const refreshMetrics = () => {
    websocketService.requestMetrics();
  };

  // TabPanel component for content switching
  interface TabPanelProps {
    children?: React.ReactNode;
    value: string;
    index: string;
  }

  function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`main-tabpanel-${index}`}
        aria-labelledby={`main-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ py: 3 }}>
            {children}
          </Box>
        )}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default', position: 'relative' }}>
          <AnimatedBackground />
          {/* Simulation Warning */}
          {simulationWarning && (
            <Alert 
              severity="warning" 
              onClose={() => setSimulationWarning(null)}
              sx={{ 
                position: 'fixed', 
                top: 16, 
                left: '50%', 
                transform: 'translateX(-50%)', 
                zIndex: 9999,
                maxWidth: '600px'
              }}
            >
              <strong>⚠️ Simulation Mode Active</strong> - {simulationWarning}
            </Alert>
          )}
          
          {/* App Bar */}
          <AppBar position="static" elevation={0}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
                🤖 Multi-Agent MCP Ensemble Dashboard
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Connection Status */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 2,
                    py: 0.5,
                    borderRadius: 2,
                    bgcolor: connected ? 'success.main' : 'error.main',
                    color: 'primary.contrastText',
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'background.paper',
                      animation: connected ? 'pulse 2s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                        '100%': { opacity: 1 },
                      },
                    }}
                  />
                  <Typography variant="caption" fontWeight={500}>
                    {connected ? 'Connected' : 'Disconnected'}
                  </Typography>
                </Box>

                {/* Action Buttons */}
                <IconButton
                  color="inherit"
                  onClick={() => setConversationDialog(true)}
                  title="Start New Conversation"
                >
                  <PlayIcon />
                </IconButton>
                
                {activeConversations.length > 0 && (
                  <IconButton
                    color="inherit"
                    onClick={stopAllConversations}
                    title="Stop All Conversations"
                  >
                    <StopIcon />
                  </IconButton>
                )}

                <IconButton
                  color="inherit"
                  onClick={refreshMetrics}
                  title="Refresh Metrics"
                >
                  <RefreshIcon />
                </IconButton>

                {/* Theme Toggle */}
                <IconButton
                  color="inherit"
                  onClick={toggleDarkMode}
                  title={darkMode ? 'Light Mode' : 'Dark Mode'}
                >
                  {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Main Navigation Tabs */}
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider', 
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            zIndex: 1
          }}>
            <Container maxWidth={false} sx={{ px: 3 }}>
              <Tabs
                value={mainTab}
                onChange={(event, newValue) => setMainTab(newValue)}
                sx={{ 
                  minHeight: 48,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    minHeight: 48,
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-selected': {
                      color: 'primary.main',
                    },
                  },
                }}
              >
                <Tab label="Dashboard" value="dashboard" />
                <Tab label="Conversations" value="conversations" />
              </Tabs>
            </Container>
          </Box>

          {/* Main Content */}
          <Container maxWidth={false} sx={{ px: 3, position: 'relative', zIndex: 1 }}>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary">
                  Loading dashboard...
                </Typography>
              </Box>
            ) : (
              <>
                {/* Dashboard Tab */}
                <TabPanel value={mainTab} index="dashboard">
                  <Grid container spacing={2}>
                    {/* Row 1: System Health - full width */}
                    <Grid item xs={12}>
                      <SystemHealth health={health} />
                    </Grid>

                    {/* Row 2: MetricsPanel (6 cols) | CacheStats (6 cols) */}
                    <Grid item xs={12} md={6}>
                      <MetricsPanel />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <CacheStats />
                    </Grid>

                    {/* Row 3: StateManager - full width */}
                    <Grid item xs={12}>
                      <StateManager conversationId={selectedConversation} />
                    </Grid>
                  </Grid>
                </TabPanel>

                {/* Conversations Tab */}
                <TabPanel value={mainTab} index="conversations">
                  {activeConversations.length > 0 ? (
                    <>
                      {/* Conversation Sub-tabs */}
                      <Box sx={{ 
                        borderBottom: 1, 
                        borderColor: 'divider', 
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px 12px 0 0',
                        mb: 2,
                        backdropFilter: 'blur(10px)'
                      }}>
                        <Tabs
                          value={selectedConversation || false}
                          onChange={(event, newValue) => setSelectedConversation(newValue)}
                          variant="scrollable"
                          scrollButtons="auto"
                          sx={{ 
                            minHeight: 48,
                            '& .MuiTab-root': {
                              textTransform: 'none',
                              minHeight: 48,
                              color: 'rgba(255, 255, 255, 0.6)',
                              '&.Mui-selected': {
                                color: 'primary.main',
                              },
                            },
                          }}
                        >
                          {activeConversations.map((conversationId) => (
                            <Tab
                              key={conversationId}
                              label={`Conversation ${conversationId.slice(0, 8)}...`}
                              value={conversationId}
                            />
                          ))}
                        </Tabs>
                      </Box>

                      {/* Selected Conversation Content */}
                      {selectedConversation && (
                        <Grid container spacing={2}>
                          <Grid item xs={12} lg={8}>
                            <ConversationView conversationId={selectedConversation} />
                          </Grid>
                          <Grid item xs={12} lg={4}>
                            <AgentList conversationId={selectedConversation} />
                          </Grid>
                        </Grid>
                      )}
                    </>
                  ) : (
                    <Box sx={{ 
                      textAlign: 'center', 
                      py: 8,
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 3,
                      backdropFilter: 'blur(10px)'
                    }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Active Conversations
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Start a new conversation to see agent interactions here
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<PlayIcon />}
                        onClick={() => setConversationDialog(true)}
                        sx={{
                          backdropFilter: 'blur(10px)',
                          bgcolor: 'rgba(25, 118, 210, 0.8)',
                          '&:hover': {
                            bgcolor: 'rgba(25, 118, 210, 0.9)',
                          },
                        }}
                      >
                        Start New Conversation
                      </Button>
                    </Box>
                  )}
                </TabPanel>
              </>
            )}
          </Container>

          {/* Error Snackbar */}
          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={() => setError(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={() => setError(null)}
              severity="error"
              variant="filled"
            >
              {error}
            </Alert>
          </Snackbar>

          {/* Conversation Configuration Dialog */}
          <Dialog
            open={conversationDialog}
            onClose={() => setConversationDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>🤖 Start New Conversation</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                <TextField
                  label="Objective"
                  placeholder="What would you like the agents to work on?"
                  multiline
                  rows={3}
                  fullWidth
                  value={conversationConfig.objective}
                  onChange={(e) => setConversationConfig({
                    ...conversationConfig,
                    objective: e.target.value,
                  })}
                  helperText="Describe the task or problem you want the agents to solve"
                />
                
                <FormControl>
                  <FormLabel>Complexity: {conversationConfig.complexity}</FormLabel>
                  <Slider
                    value={conversationConfig.complexity}
                    onChange={(e, value) => setConversationConfig({
                      ...conversationConfig,
                      complexity: value as number,
                    })}
                    min={1}
                    max={10}
                    marks
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Higher complexity = more agents and deeper analysis
                  </Typography>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Execution Mode</InputLabel>
                  <Select
                    value={conversationConfig.mode}
                    onChange={(e) => setConversationConfig({
                      ...conversationConfig,
                      mode: e.target.value,
                    })}
                    label="Execution Mode"
                  >
                    <MenuItem value="simple">
                      <Box>
                        <Typography variant="body2">Simple</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Quick single-model responses
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="extended">
                      <Box>
                        <Typography variant="body2">Extended</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Multi-turn conversations
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="autonomous">
                      <Box>
                        <Typography variant="body2">Autonomous</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Full multi-model consensus
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="deep">
                      <Box>
                        <Typography variant="body2">Deep</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Advanced analysis with discussion
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Choose execution mode based on task complexity and requirements
                  </Typography>
                </FormControl>

                <Box sx={{ bgcolor: 'info.main', p: 2, borderRadius: 1, opacity: 0.9 }}>
                  <Typography variant="body2" color="info.contrastText">
                    💡 Example objectives:
                  </Typography>
                  <Typography variant="caption" color="info.contrastText" component="div" sx={{ mt: 1 }}>
                    • "Design a REST API for a todo application"<br/>
                    • "Research best practices for microservices"<br/>
                    • "Create a data pipeline architecture"<br/>
                    • "Analyze security vulnerabilities in web apps"
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConversationDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={startNewConversation}
                variant="contained"
                startIcon={<PlayIcon />}
                disabled={!conversationConfig.objective.trim()}
              >
                Start Conversation
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;
