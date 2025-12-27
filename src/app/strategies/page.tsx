'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  InputAdornment,
  Divider,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  ChecklistRtl as ChecklistIcon,
  Image as ImageIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import {
  useGetStrategiesQuery,
  useCreateStrategyMutation,
  useUpdateStrategyMutation,
  useDeleteStrategyMutation,
  useUploadStrategyScreenshotsMutation,
  useDeleteStrategyScreenshotMutation,
} from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { StrategyRule, StrategyScreenshot } from '@/types';

interface Strategy {
  id: string;
  name: string;
  description?: string | null;
  setups?: string[];
  rules?: StrategyRule[];
  screenshots?: StrategyScreenshot[];
  _count?: { trades: number };
}

export default function StrategiesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: strategies = [], isLoading } = useGetStrategiesQuery({});
  const [createStrategy] = useCreateStrategyMutation();
  const [updateStrategy] = useUpdateStrategyMutation();
  const [deleteStrategy, { isLoading: deleting }] = useDeleteStrategyMutation();
  const [uploadScreenshots, { isLoading: uploading }] = useUploadStrategyScreenshotsMutation();
  const [deleteScreenshot] = useDeleteStrategyScreenshotMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [setups, setSetups] = useState<string[]>([]);
  const [newSetup, setNewSetup] = useState('');
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState('');
  const [localScreenshots, setLocalScreenshots] = useState<StrategyScreenshot[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleOpenDialog = (strategy?: Strategy) => {
    if (strategy) {
      setEditingStrategy(strategy);
      setName(strategy.name);
      setDescription(strategy.description || '');
      setSetups(strategy.setups || []);
      setRules(strategy.rules?.map((r) => r.text) || []);
      setLocalScreenshots(strategy.screenshots || []);
    } else {
      setEditingStrategy(null);
      setName('');
      setDescription('');
      setSetups([]);
      setRules([]);
      setLocalScreenshots([]);
    }
    setNewSetup('');
    setNewRule('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStrategy(null);
    setName('');
    setDescription('');
    setSetups([]);
    setNewSetup('');
    setRules([]);
    setNewRule('');
    setLocalScreenshots([]);
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

  const handleSetupKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSetup();
    }
  };

  const handleAddRule = () => {
    const trimmed = newRule.trim();
    if (trimmed && !rules.includes(trimmed)) {
      setRules([...rules, trimmed]);
      setNewRule('');
    }
  };

  const handleRemoveRule = (ruleToRemove: string) => {
    setRules(rules.filter((r) => r !== ruleToRemove));
  };

  const handleRuleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRule();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !editingStrategy) return;

    const formData = new FormData();
    Array.from(e.target.files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const result = await uploadScreenshots({
        strategyId: editingStrategy.id,
        formData,
      }).unwrap();
      setLocalScreenshots([...localScreenshots, ...result]);
      dispatch(showSnackbar({ message: 'Screenshots uploaded', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to upload screenshots', severity: 'error' }));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteScreenshot = async (screenshotId: string) => {
    if (!editingStrategy) return;

    try {
      await deleteScreenshot({
        strategyId: editingStrategy.id,
        screenshotId,
      }).unwrap();
      setLocalScreenshots(localScreenshots.filter((s) => s.id !== screenshotId));
      dispatch(showSnackbar({ message: 'Screenshot deleted', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete screenshot', severity: 'error' }));
    }
  };

  const handleSave = async () => {
    try {
      if (editingStrategy) {
        await updateStrategy({ id: editingStrategy.id, name, description, setups, rules }).unwrap();
        dispatch(showSnackbar({ message: 'Strategy updated', severity: 'success' }));
      } else {
        await createStrategy({ name, description, setups, rules }).unwrap();
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
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, pt: 1 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(strategy);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(strategy.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <CardActionArea
                  onClick={() => router.push(`/strategies/${strategy.id}`)}
                  sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: 0 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {strategy.name}
                    </Typography>

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

                    <Box sx={{ mt: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`${strategy._count?.trades || 0} trades`}
                        size="small"
                        variant="filled"
                        color="default"
                      />
                      {strategy.rules && strategy.rules.length > 0 && (
                        <Chip
                          icon={<ChecklistIcon fontSize="small" />}
                          label={`${strategy.rules.length} rules`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
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
              onKeyDown={handleSetupKeyDown}
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

          <Divider sx={{ my: 3 }} />

          {/* Rules/Checklist Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ChecklistIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">
                Checklist Rules
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Add rules that should be checked before taking a trade with this strategy
            </Typography>

            <TextField
              fullWidth
              size="small"
              placeholder="e.g., Price above VWAP, Volume above average..."
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={handleRuleKeyDown}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={handleAddRule}
                      disabled={!newRule.trim()}
                    >
                      Add
                    </Button>
                  </InputAdornment>
                ),
              }}
            />

            {rules.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {rules.map((rule, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.5,
                      px: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {index + 1}. {rule}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveRule(rule)}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Example Screenshots Section - Only show when editing */}
          {editingStrategy && (
            <>
              <Divider sx={{ my: 3 }} />

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ImageIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2">
                    Example Screenshots
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Upload example charts/screenshots for this strategy
                </Typography>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                />

                <Button
                  variant="outlined"
                  startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  sx={{ mb: 2 }}
                >
                  {uploading ? 'Uploading...' : 'Upload Screenshots'}
                </Button>

                {localScreenshots.length > 0 && (
                  <Grid container spacing={1}>
                    {localScreenshots.map((screenshot) => (
                      <Grid size={{ xs: 4 }} key={screenshot.id}>
                        <Box
                          sx={{
                            position: 'relative',
                            paddingTop: '75%',
                            borderRadius: 1,
                            overflow: 'hidden',
                            bgcolor: 'action.hover',
                            cursor: 'pointer',
                          }}
                          onClick={() => setPreviewImage(screenshot.path)}
                        >
                          <Box
                            component="img"
                            src={screenshot.path}
                            alt={screenshot.filename}
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'rgba(0,0,0,0.5)',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScreenshot(screenshot.id);
                            }}
                          >
                            <CloseIcon fontSize="small" sx={{ color: 'white' }} />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
            {editingStrategy ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', bgcolor: 'black' }}>
          {previewImage && (
            <Box
              component="img"
              src={previewImage}
              alt="Preview"
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
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
