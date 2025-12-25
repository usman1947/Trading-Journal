'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  useGetStrategiesQuery,
  useCreateStrategyMutation,
  useUpdateStrategyMutation,
  useDeleteStrategyMutation,
} from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface Strategy {
  id: string;
  name: string;
  description?: string | null;
  setups?: string[];
  _count?: { trades: number };
}

export default function StrategiesPage() {
  const dispatch = useAppDispatch();
  const { data: strategies = [], isLoading } = useGetStrategiesQuery({});
  const [createStrategy] = useCreateStrategyMutation();
  const [updateStrategy] = useUpdateStrategyMutation();
  const [deleteStrategy, { isLoading: deleting }] = useDeleteStrategyMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [setups, setSetups] = useState<string[]>([]);
  const [newSetup, setNewSetup] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleOpenDialog = (strategy?: Strategy) => {
    if (strategy) {
      setEditingStrategy(strategy);
      setName(strategy.name);
      setDescription(strategy.description || '');
      setSetups(strategy.setups || []);
    } else {
      setEditingStrategy(null);
      setName('');
      setDescription('');
      setSetups([]);
    }
    setNewSetup('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStrategy(null);
    setName('');
    setDescription('');
    setSetups([]);
    setNewSetup('');
  };

  const handleAddSetup = () => {
    const trimmed = newSetup.trim();
    if (trimmed && !setups.includes(trimmed)) {
      setSetups([...setups, trimmed]);
      setNewSetup('');
    }
  };

  const handleRemoveSetup = (setupToRemove: string) => {
    setSetups(setups.filter((s) => s !== setupToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSetup();
    }
  };

  const handleSave = async () => {
    try {
      if (editingStrategy) {
        await updateStrategy({ id: editingStrategy.id, name, description, setups }).unwrap();
        dispatch(showSnackbar({ message: 'Strategy updated', severity: 'success' }));
      } else {
        await createStrategy({ name, description, setups }).unwrap();
        dispatch(showSnackbar({ message: 'Strategy created', severity: 'success' }));
      }
      handleCloseDialog();
    } catch {
      dispatch(showSnackbar({ message: 'Failed to save strategy', severity: 'error' }));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStrategy(deleteId).unwrap();
      dispatch(showSnackbar({ message: 'Strategy deleted', severity: 'success' }));
      setDeleteId(null);
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete strategy', severity: 'error' }));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Strategies
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Strategy
        </Button>
      </Box>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Create and manage your trading strategies (playbooks). Tag trades with strategies to track performance by setup.
      </Typography>

      {isLoading ? (
        <Typography>Loading...</Typography>
      ) : strategies.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary" gutterBottom>
              No strategies yet
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Create Your First Strategy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {strategies.map((strategy: Strategy) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={strategy.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6">
                      {strategy.name}
                    </Typography>
                    <Box sx={{ flexShrink: 0 }}>
                      <IconButton size="small" onClick={() => handleOpenDialog(strategy)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteId(strategy.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      minHeight: 40,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {strategy.description || 'No description'}
                  </Typography>

                  <Box sx={{ flex: 1, mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Setups:
                    </Typography>
                    {strategy.setups && strategy.setups.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {strategy.setups.map((setup) => (
                          <Chip
                            key={setup}
                            label={setup}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                        No setups defined
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ mt: 'auto' }}>
                    <Chip
                      label={`${strategy._count?.trades || 0} trades`}
                      size="small"
                      variant="filled"
                      color="default"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingStrategy ? 'Edit Strategy' : 'New Strategy'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            placeholder="e.g., 30M ABCD, PMH Breakout"
          />
          <TextField
            fullWidth
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
            placeholder="Describe when you use this strategy..."
          />

          {/* Setups Section */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Setups
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Add the specific setups/patterns you look for with this strategy
            </Typography>

            <TextField
              fullWidth
              size="small"
              placeholder="e.g., Breakout, ORB, Pullback..."
              value={newSetup}
              onChange={(e) => setNewSetup(e.target.value)}
              onKeyDown={handleKeyDown}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={handleAddSetup}
                      disabled={!newSetup.trim()}
                    >
                      Add
                    </Button>
                  </InputAdornment>
                ),
              }}
            />

            {setups.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {setups.map((setup) => (
                  <Chip
                    key={setup}
                    label={setup}
                    onDelete={() => handleRemoveSetup(setup)}
                    deleteIcon={<CloseIcon fontSize="small" />}
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
            {editingStrategy ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Strategy"
        message="Are you sure you want to delete this strategy? Trades using this strategy will not be deleted."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </Box>
  );
}
