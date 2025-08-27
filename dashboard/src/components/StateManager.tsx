import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  Restore as RestoreIcon,
  CameraAlt as SnapshotIcon,
  AccountTree as BranchIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import apiService from '../services/api';
import websocketService from '../services/websocket';

interface State {
  id: string;
  conversationId: string;
  objective?: string;
  created: number;
  updated: number;
  inMemory: boolean;
}

interface StateManagerProps {
  conversationId: string | null;
}

export const StateManager: React.FC<StateManagerProps> = ({ conversationId }) => {
  const [states, setStates] = useState<State[]>([]);
  const [snapshotDialog, setSnapshotDialog] = useState(false);
  const [branchDialog, setBranchDialog] = useState(false);
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [branchName, setBranchName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStates();

    // Listen for state events
    const handleStateSaved = () => {
      loadStates();
    };

    const handleSnapshotCreated = () => {
      loadStates();
    };

    websocketService.on('state:saved', handleStateSaved);
    websocketService.on('snapshot:created', handleSnapshotCreated);

    return () => {
      websocketService.off('state:saved', handleStateSaved);
      websocketService.off('snapshot:created', handleSnapshotCreated);
    };
  }, []);

  const loadStates = async () => {
    try {
      const data = await apiService.listStates();
      // Ensure states is always an array
      const statesArray = data?.states || data || [];
      setStates(Array.isArray(statesArray) ? statesArray : []);
    } catch (error) {
      console.error('Failed to load states:', error);
      setStates([]); // Set empty array on error
    }
  };

  const createSnapshot = async () => {
    if (!conversationId || !snapshotDescription) return;
    
    setLoading(true);
    try {
      await apiService.createSnapshot(conversationId, snapshotDescription);
      setSnapshotDialog(false);
      setSnapshotDescription('');
      loadStates();
    } catch (error) {
      console.error('Failed to create snapshot:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBranch = async () => {
    if (!conversationId || !branchName) return;
    
    setLoading(true);
    try {
      await apiService.createBranch(conversationId, branchName);
      setBranchDialog(false);
      setBranchName('');
      loadStates();
    } catch (error) {
      console.error('Failed to create branch:', error);
    } finally {
      setLoading(false);
    }
  };

  const restoreState = async (snapshotId: string) => {
    setLoading(true);
    try {
      await apiService.restoreState(snapshotId);
      // Refresh will happen via WebSocket events
    } catch (error) {
      console.error('Failed to restore state:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card sx={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title="State Management"
          subheader={`${states.length} saved states`}
          action={
            conversationId && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<SnapshotIcon />}
                  onClick={() => setSnapshotDialog(true)}
                >
                  Snapshot
                </Button>
                <Button
                  size="small"
                  startIcon={<BranchIcon />}
                  onClick={() => setBranchDialog(true)}
                >
                  Branch
                </Button>
              </Box>
            )
          }
        />
        <CardContent sx={{ p: 0, flex: 1, overflow: 'auto' }}>
          {states.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No saved states yet
              </Typography>
            </Box>
          ) : (
            <List>
              {states.map((state) => (
                <ListItem
                  key={state.id}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {state.objective || state.conversationId}
                        </Typography>
                        {state.inMemory && (
                          <Chip label="In Memory" size="small" color="primary" />
                        )}
                        {state.conversationId === conversationId && (
                          <Chip label="Current" size="small" color="success" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Created: {format(state.created, 'MMM dd, HH:mm')}
                        </Typography>
                        {state.updated !== state.created && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                            Updated: {format(state.updated, 'MMM dd, HH:mm')}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => restoreState(state.id)}
                      disabled={loading}
                      title="Restore State"
                    >
                      <RestoreIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Snapshot Dialog */}
      <Dialog
        open={snapshotDialog}
        onClose={() => setSnapshotDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Snapshot</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            value={snapshotDescription}
            onChange={(e) => setSnapshotDescription(e.target.value)}
            placeholder="Enter a description for this snapshot..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnapshotDialog(false)}>Cancel</Button>
          <Button
            onClick={createSnapshot}
            variant="contained"
            disabled={!snapshotDescription || loading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Branch Dialog */}
      <Dialog
        open={branchDialog}
        onClose={() => setBranchDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Branch</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Branch Name"
            fullWidth
            variant="outlined"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="Enter a name for this branch..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBranchDialog(false)}>Cancel</Button>
          <Button
            onClick={createBranch}
            variant="contained"
            disabled={!branchName || loading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};