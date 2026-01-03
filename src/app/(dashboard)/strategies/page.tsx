'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Divider,
  CircularProgress,
  Collapse,
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
  useGetStrategyStatsQuery,
} from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { StrategyRule, StrategyScreenshot } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface Strategy {
  id: string;
  name: string;
  description?: string | null;
  setups?: string[];
  rules?: StrategyRule[];
  screenshots?: StrategyScreenshot[];
  _count?: { trades: number };
}

interface StrategyCardProps {
  strategy: Strategy;
  onEdit: (strategy: Strategy) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

function StrategyCard({ strategy, onEdit, onDelete, onClick, expanded, onToggleExpand }: StrategyCardProps) {
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const accountFilter = selectedAccountId === null ? 'paper' : selectedAccountId;
  const { data: statsData } = useGetStrategyStatsQuery({ id: strategy.id, accountId: accountFilter });

  const stats = statsData?.stats;

  return (
    <Card
      sx={{
        position: 'relative',
        '&::before': expanded ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          backgroundColor: 'primary.main',
          borderRadius: '12px 0 0 12px',
        } : undefined,
      }}
    >
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        <Box
          sx={{
            px: 3,
            pt: 2.5,
            pb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            cursor: 'pointer',
          }}
          onClick={onToggleExpand}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              fontWeight={600}
              sx={{
                mb: 0.5,
                display: 'inline',
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              {strategy.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {strategy.description || 'No description'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(strategy);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(strategy.id);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider />

          {/* SETUPS Section */}
          <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
            <Typography
              variant="overline"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'text.secondary',
                mb: 1.5,
                display: 'block',
              }}
            >
              SETUPS
            </Typography>
            {strategy.setups && strategy.setups.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {strategy.setups.map((setup) => (
                  <Chip
                    key={setup}
                    label={setup}
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

          <Divider />

          {/* PERFORMANCE Section */}
          <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
            <Typography
              variant="overline"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'text.secondary',
                mb: 1.5,
                display: 'block',
              }}
            >
              PERFORMANCE
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Trades
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {stats?.totalTrades || 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Win Rate
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    color={stats && stats.winRate >= 50 ? 'success.main' : 'error.main'}
                  >
                    {stats ? `${stats.winRate.toFixed(1)}%` : '0%'}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    P&L
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    color={stats && stats.totalPnl >= 0 ? 'success.main' : 'error.main'}
                  >
                    {stats ? (stats.totalPnl >= 0 ? '+' : '') + formatCurrency(stats.totalPnl) : '$0'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* NOTES Section */}
          <Box sx={{ px: 3, pt: 2.5, pb: 2.5 }}>
            <Typography
              variant="overline"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'text.secondary',
                mb: 1.5,
                display: 'block',
              }}
            >
              NOTES
            </Typography>
            {strategy.rules && strategy.rules.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {strategy.rules.map((rule, index) => (
                  <Box key={rule.id} sx={{ display: 'flex', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>
                      {index + 1}.
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {rule.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                No rules defined
              </Typography>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function StrategiesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const accountFilter = selectedAccountId === null ? 'paper' : selectedAccountId;
  const { data: strategies = [], isLoading } = useGetStrategiesQuery({ accountId: accountFilter });
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
  const [expandedStrategyId, setExpandedStrategyId] = useState<string | null>(null);

  // Set first strategy as expanded by default
  useEffect(() => {
    if (strategies.length > 0 && expandedStrategyId === null) {
      setExpandedStrategyId(strategies[0].id);
    }
  }, [strategies, expandedStrategyId]);

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
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {strategies.map((strategy: Strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              onEdit={handleOpenDialog}
              onDelete={(id) => setDeleteId(id)}
              onClick={() => router.push(`/strategies/${strategy.id}`)}
              expanded={expandedStrategyId === strategy.id}
              onToggleExpand={() => setExpandedStrategyId(expandedStrategyId === strategy.id ? null : strategy.id)}
            />
          ))}
        </Box>
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
