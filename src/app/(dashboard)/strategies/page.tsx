'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
  FormControlLabel,
  Switch,
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
  useGetAccountsQuery,
} from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { StrategyScreenshot, Account, CHECKLIST_ITEMS } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface Strategy {
  id: string;
  name: string;
  description?: string | null;
  setups?: string[];
  isSwingStrategy?: boolean;
  checkPlanDesc?: string | null;
  checkJudgeDesc?: string | null;
  checkExecuteDesc?: string | null;
  checkManageDesc?: string | null;
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

function StrategyCard({
  strategy,
  onEdit,
  onDelete,
  onClick,
  expanded,
  onToggleExpand,
}: StrategyCardProps) {
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const accountFilter = selectedAccountId === null ? 'paper' : selectedAccountId;
  const { data: statsData } = useGetStrategyStatsQuery({
    id: strategy.id,
    accountId: accountFilter,
  });

  const stats = statsData?.stats;

  return (
    <Card
      sx={{
        position: 'relative',
        '&::before': expanded
          ? {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              backgroundColor: 'primary.main',
              borderRadius: '12px 0 0 12px',
            }
          : undefined,
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
                  <Chip key={setup} label={setup} variant="outlined" color="primary" />
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
                    {stats
                      ? (stats.totalPnl >= 0 ? '+' : '') + formatCurrency(stats.totalPnl)
                      : '$0'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* TRADE CHECKLIST Section */}
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
              TRADE CHECKLIST
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {CHECKLIST_ITEMS.map((item, index) => {
                const descKey = `${item.key}Desc` as keyof Strategy;
                const customDesc = strategy[descKey] as string | null | undefined;
                return (
                  <Box key={item.key} sx={{ display: 'flex', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>
                      {index + 1}.
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ minWidth: 60 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {customDesc || item.defaultDesc}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
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
  const { data: allStrategies = [], isLoading } = useGetStrategiesQuery({
    accountId: accountFilter,
  });
  const { data: accounts = [] } = useGetAccountsQuery({});

  // Check if the selected account is a swing account
  const isSwingAccount = useMemo(() => {
    if (!selectedAccountId) return false;
    const account = accounts.find((a: Account) => a.id === selectedAccountId);
    return account?.isSwingAccount || false;
  }, [selectedAccountId, accounts]);

  // Filter strategies based on account type
  const strategies = useMemo(() => {
    if (isSwingAccount) {
      return allStrategies.filter((s: Strategy) => s.isSwingStrategy);
    }
    return allStrategies.filter((s: Strategy) => !s.isSwingStrategy);
  }, [allStrategies, isSwingAccount]);
  const [createStrategy] = useCreateStrategyMutation();
  const [updateStrategy] = useUpdateStrategyMutation();
  const [deleteStrategy, { isLoading: deleting }] = useDeleteStrategyMutation();
  const [uploadScreenshots] = useUploadStrategyScreenshotsMutation();
  const [deleteScreenshot] = useDeleteStrategyScreenshotMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [setups, setSetups] = useState<string[]>([]);
  const [newSetup, setNewSetup] = useState('');
  const [checkPlanDesc, setCheckPlanDesc] = useState('');
  const [checkJudgeDesc, setCheckJudgeDesc] = useState('');
  const [checkExecuteDesc, setCheckExecuteDesc] = useState('');
  const [checkManageDesc, setCheckManageDesc] = useState('');
  const [isSwingStrategy, setIsSwingStrategy] = useState(false);
  const [localScreenshots, setLocalScreenshots] = useState<StrategyScreenshot[]>([]);
  const [pendingStrategyFiles, setPendingStrategyFiles] = useState<
    { file: File; preview: string }[]
  >([]);
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
      setCheckPlanDesc(strategy.checkPlanDesc || '');
      setCheckJudgeDesc(strategy.checkJudgeDesc || '');
      setCheckExecuteDesc(strategy.checkExecuteDesc || '');
      setCheckManageDesc(strategy.checkManageDesc || '');
      setIsSwingStrategy(strategy.isSwingStrategy || false);
      setLocalScreenshots(strategy.screenshots || []);
    } else {
      setEditingStrategy(null);
      setName('');
      setDescription('');
      setSetups([]);
      setCheckPlanDesc('');
      setCheckJudgeDesc('');
      setCheckExecuteDesc('');
      setCheckManageDesc('');
      setIsSwingStrategy(isSwingAccount); // Default to current account type
      setLocalScreenshots([]);
    }
    setNewSetup('');
    setPendingStrategyFiles([]);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStrategy(null);
    setName('');
    setDescription('');
    setSetups([]);
    setNewSetup('');
    setCheckPlanDesc('');
    setCheckJudgeDesc('');
    setCheckExecuteDesc('');
    setCheckManageDesc('');
    setIsSwingStrategy(false);
    setLocalScreenshots([]);
    pendingStrategyFiles.forEach((pf) => URL.revokeObjectURL(pf.preview));
    setPendingStrategyFiles([]);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingStrategyFiles((prev) => [...prev, ...newFiles]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingStrategyFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
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
      let strategyId: string;
      if (editingStrategy) {
        await updateStrategy({
          id: editingStrategy.id,
          name,
          description,
          setups,
          checkPlanDesc: checkPlanDesc.trim() || null,
          checkJudgeDesc: checkJudgeDesc.trim() || null,
          checkExecuteDesc: checkExecuteDesc.trim() || null,
          checkManageDesc: checkManageDesc.trim() || null,
          isSwingStrategy,
        }).unwrap();
        strategyId = editingStrategy.id;
      } else {
        const created = await createStrategy({
          name,
          description,
          setups,
          checkPlanDesc: checkPlanDesc.trim() || null,
          checkJudgeDesc: checkJudgeDesc.trim() || null,
          checkExecuteDesc: checkExecuteDesc.trim() || null,
          checkManageDesc: checkManageDesc.trim() || null,
          isSwingStrategy,
        }).unwrap();
        strategyId = created.id;
      }

      // Upload pending screenshots if any
      if (pendingStrategyFiles.length > 0) {
        const formData = new FormData();
        pendingStrategyFiles.forEach((pf) => {
          formData.append('files', pf.file);
        });
        try {
          await uploadScreenshots({ strategyId, formData }).unwrap();
        } catch {
          console.error('Failed to upload strategy screenshots');
        }
      }

      dispatch(
        showSnackbar({
          message: editingStrategy ? 'Strategy updated' : 'Strategy created',
          severity: 'success',
        })
      );
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          New Strategy
        </Button>
      </Box>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Create and manage your trading strategies (playbooks). Tag trades with strategies to track
        performance by setup.
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
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
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
              onToggleExpand={() =>
                setExpandedStrategyId(expandedStrategyId === strategy.id ? null : strategy.id)
              }
            />
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingStrategy ? 'Edit Strategy' : 'New Strategy'}</DialogTitle>
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

          <FormControlLabel
            control={
              <Switch
                checked={isSwingStrategy}
                onChange={(e) => setIsSwingStrategy(e.target.checked)}
                color="primary"
              />
            }
            label="Swing Strategy"
            sx={{ mt: 2 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', ml: 4, mt: -0.5 }}
          >
            Enable this for strategies used with swing trading accounts
          </Typography>

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
                    <Button size="small" onClick={handleAddSetup} disabled={!newSetup.trim()}>
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

          {/* Trade Checklist Descriptions */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ChecklistIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">Trade Checklist</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Customize what each checklist item means for this strategy. Leave blank to use the
              default.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {CHECKLIST_ITEMS.map((item) => {
                const stateMap: Record<string, [string, (v: string) => void]> = {
                  checkPlan: [checkPlanDesc, setCheckPlanDesc],
                  checkJudge: [checkJudgeDesc, setCheckJudgeDesc],
                  checkExecute: [checkExecuteDesc, setCheckExecuteDesc],
                  checkManage: [checkManageDesc, setCheckManageDesc],
                };
                const [value, setter] = stateMap[item.key];
                return (
                  <TextField
                    key={item.key}
                    fullWidth
                    size="small"
                    label={`${item.label} Description`}
                    placeholder={item.defaultDesc}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Example Screenshots Section */}
          <Divider sx={{ my: 3 }} />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ImageIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">Example Screenshots</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              {editingStrategy
                ? 'Upload example charts/screenshots for this strategy'
                : 'Screenshots will be uploaded after creating the strategy'}
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
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ mb: 2 }}
            >
              Add Screenshots
            </Button>

            {/* Pending file previews */}
            {pendingStrategyFiles.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 1, display: 'block' }}
                >
                  Ready to upload ({pendingStrategyFiles.length}):
                </Typography>
                <Grid container spacing={1}>
                  {pendingStrategyFiles.map((pf, index) => (
                    <Grid size={{ xs: 4 }} key={index}>
                      <Box
                        sx={{
                          position: 'relative',
                          paddingTop: '75%',
                          borderRadius: 1,
                          overflow: 'hidden',
                          border: '2px solid',
                          borderColor: 'primary.main',
                          cursor: 'pointer',
                        }}
                        onClick={() => setPreviewImage(pf.preview)}
                      >
                        <Box
                          component="img"
                          src={pf.preview}
                          alt={pf.file.name}
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
                            '&:hover': { bgcolor: 'error.main' },
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePendingFile(index);
                          }}
                        >
                          <CloseIcon fontSize="small" sx={{ color: 'white' }} />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Existing screenshots (edit mode) */}
            {editingStrategy && localScreenshots.length > 0 && (
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
            {editingStrategy ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onClose={() => setPreviewImage(null)} maxWidth="lg" fullWidth>
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
