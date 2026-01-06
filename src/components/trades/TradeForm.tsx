'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  Typography,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Chip,
  LinearProgress,
  Divider,
  Switch,
  Slider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  ChecklistRtl as ChecklistIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  useCreateTradeMutation,
  useUpdateTradeMutation,
  useGetStrategiesQuery,
  useGetSetupsQuery,
  useUploadScreenshotsMutation,
  useUpdateTradeRuleChecksMutation,
  useGetSettingsQuery,
} from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import ScreenshotUpload from '@/components/common/ScreenshotUpload';
import type { Trade, TradeFormData, Strategy, PreTradeMood, PostTradeMood, TradeMistake } from '@/types';

// Options for psychology dropdowns
const PRE_TRADE_MOODS: { value: PreTradeMood; label: string }[] = [
  { value: 'CONFIDENT', label: 'Confident' },
  { value: 'CALM', label: 'Calm' },
  { value: 'NEUTRAL', label: 'Neutral' },
  { value: 'ANXIOUS', label: 'Anxious' },
  { value: 'FOMO', label: 'FOMO' },
  { value: 'REVENGE', label: 'Revenge' },
];

const POST_TRADE_MOODS: { value: PostTradeMood; label: string }[] = [
  { value: 'SATISFIED', label: 'Satisfied' },
  { value: 'RELIEVED', label: 'Relieved' },
  { value: 'NEUTRAL', label: 'Neutral' },
  { value: 'FRUSTRATED', label: 'Frustrated' },
  { value: 'REGRETFUL', label: 'Regretful' },
];

const TRADE_MISTAKES: { value: TradeMistake; label: string }[] = [
  { value: 'FOMO', label: 'FOMO' },
  { value: 'CHASING', label: 'Chasing' },
  { value: 'EARLY_EXIT', label: 'Early Exit' },
  { value: 'OVERSIZE', label: 'Oversized' },
  { value: 'REVENGE', label: 'Revenge Trading' },
  { value: 'NO_PLAN', label: 'No Plan' },
  { value: 'IGNORED_STOP', label: 'Ignored Stop' },
  { value: 'MOVED_STOP', label: 'Moved Stop' },
  { value: 'NO_STOP', label: 'No Stop' },
  { value: 'OVERTRADING', label: 'Overtrading' },
];

const validationSchema = yup.object({
  symbol: yup.string().required('Symbol is required'),
  side: yup.string().oneOf(['LONG', 'SHORT']).required(),
  tradeTime: yup.date().required('Time is required'),
  risk: yup.number().positive('Must be positive').required('Risk is required'),
  result: yup.number().nullable(),
  execution: yup.string().oneOf(['PASS', 'FAIL']).required(),
  setup: yup.string().nullable(),
  notes: yup.string().nullable(),
});

interface TradeFormProps {
  trade?: Trade;
  mode: 'create' | 'edit';
}

interface PendingFile {
  file: File;
  preview: string;
}

export default function TradeForm({ trade, mode }: TradeFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const [createTrade, { isLoading: creating }] = useCreateTradeMutation();
  const [updateTrade, { isLoading: updating }] = useUpdateTradeMutation();
  const [uploadScreenshots] = useUploadScreenshotsMutation();
  const [updateRuleChecks] = useUpdateTradeRuleChecksMutation();
  const { data: strategies = [] } = useGetStrategiesQuery({});
  const { data: existingSetups = [] } = useGetSetupsQuery({});
  const { data: settings } = useGetSettingsQuery({});

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [ruleChecks, setRuleChecks] = useState<Record<string, boolean>>({});

  // Get the currently selected strategy with its rules
  const selectedStrategy = useMemo(() => {
    return strategies.find((s: Strategy) => s.id === trade?.strategyId) as Strategy | undefined;
  }, [strategies, trade?.strategyId]);

  // Initialize rule checks from trade data
  useEffect(() => {
    if (trade?.ruleChecks) {
      const checks: Record<string, boolean> = {};
      trade.ruleChecks.forEach((rc) => {
        checks[rc.ruleId] = rc.checked;
      });
      setRuleChecks(checks);
    }
  }, [trade?.ruleChecks]);

  const handleRuleToggle = (ruleId: string) => {
    setRuleChecks((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }));
  };


  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: PendingFile[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Get the default risk from settings - memoize to prevent infinite re-renders
  const defaultRisk = useMemo(() => settings?.defaultRisk || 100, [settings?.defaultRisk]);

  // Memoize initial values to prevent unnecessary reinitializations
  const initialValues = useMemo<TradeFormData>(() => ({
    symbol: trade?.symbol || '',
    side: trade?.side || 'LONG',
    tradeTime: trade?.tradeTime || new Date().toISOString(),
    exitTime: trade?.exitTime || null,
    setup: trade?.setup || '',
    risk: trade?.risk ?? defaultRisk,
    result: trade?.result ?? undefined,
    commission: trade?.commission ?? 0,
    execution: trade?.execution || 'PASS',
    isBreakEven: trade?.isBreakEven || false,
    notes: trade?.notes || '',
    strategyId: trade?.strategyId || '',
    accountId: trade?.accountId ?? selectedAccountId,
    // AI-ready fields
    preTradeMood: trade?.preTradeMood || null,
    postTradeMood: trade?.postTradeMood || null,
    confidenceLevel: trade?.confidenceLevel ?? null,
    mistake: trade?.mistake || null,
  }), [trade, defaultRisk, selectedAccountId]);

  const formik = useFormik<TradeFormData>({
    initialValues,
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      try {
        if (mode === 'create') {
          const newTrade = await createTrade(values).unwrap();

          // Upload pending screenshots if any
          if (pendingFiles.length > 0) {
            const formData = new FormData();
            pendingFiles.forEach((pf) => {
              formData.append('files', pf.file);
            });
            try {
              await uploadScreenshots({ tradeId: newTrade.id, formData }).unwrap();
            } catch {
              console.error('Failed to upload screenshots');
            }
          }

          // Save rule checks if a strategy with rules was selected
          const newStrategy = strategies.find((s: Strategy) => s.id === values.strategyId) as Strategy | undefined;
          if (newStrategy?.rules && newStrategy.rules.length > 0) {
            const ruleChecksData = newStrategy.rules.map((rule) => ({
              ruleId: rule.id,
              checked: ruleChecks[rule.id] || false,
            }));
            try {
              await updateRuleChecks({ tradeId: newTrade.id, ruleChecks: ruleChecksData }).unwrap();
            } catch {
              console.error('Failed to save rule checks');
            }
          }

          dispatch(showSnackbar({ message: 'Trade created successfully', severity: 'success' }));
        } else {
          await updateTrade({ id: trade!.id, ...values }).unwrap();

          // Save rule checks for edit mode
          if (selectedStrategy?.rules && selectedStrategy.rules.length > 0) {
            const ruleChecksData = selectedStrategy.rules.map((rule) => ({
              ruleId: rule.id,
              checked: ruleChecks[rule.id] || false,
            }));
            try {
              await updateRuleChecks({ tradeId: trade!.id, ruleChecks: ruleChecksData }).unwrap();
            } catch {
              console.error('Failed to save rule checks');
            }
          }

          dispatch(showSnackbar({ message: 'Trade updated successfully', severity: 'success' }));
        }

        router.push('/trades');
      } catch {
        dispatch(showSnackbar({ message: 'Failed to save trade', severity: 'error' }));
      }
    },
  });

  const isLoading = creating || updating;

  return (
    <form onSubmit={formik.handleSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trade Details
              </Typography>

              <Grid container spacing={2}>
                {/* Symbol */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Symbol"
                    name="symbol"
                    value={formik.values.symbol}
                    onChange={formik.handleChange}
                    error={formik.touched.symbol && Boolean(formik.errors.symbol)}
                    helperText={formik.touched.symbol && formik.errors.symbol}
                    placeholder="AAPL, SPY, ES..."
                  />
                </Grid>

                {/* Date */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Date"
                    value={new Date(formik.values.tradeTime)}
                    onChange={(date) => {
                      if (date) {
                        const currentTime = new Date(formik.values.tradeTime);
                        date.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());
                        formik.setFieldValue('tradeTime', date.toISOString());
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: formik.touched.tradeTime && Boolean(formik.errors.tradeTime),
                      },
                    }}
                  />
                </Grid>

                {/* Entry Time */}
                <Grid size={{ xs: 6, sm: 6 }}>
                  <TimePicker
                    label="Entry Time"
                    value={new Date(formik.values.tradeTime)}
                    onChange={(time) => {
                      if (time) {
                        const currentDate = new Date(formik.values.tradeTime);
                        currentDate.setHours(time.getHours(), time.getMinutes(), time.getSeconds());
                        formik.setFieldValue('tradeTime', currentDate.toISOString());
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                </Grid>

                {/* Exit Time */}
                <Grid size={{ xs: 6, sm: 6 }}>
                  <TimePicker
                    label="Exit Time"
                    value={formik.values.exitTime ? new Date(formik.values.exitTime) : new Date(formik.values.tradeTime)}
                    onChange={(time) => {
                      if (time) {
                        // Use the trade date for the exit time
                        const tradeDate = new Date(formik.values.tradeTime);
                        const exitDateTime = new Date(tradeDate);
                        exitDateTime.setHours(time.getHours(), time.getMinutes(), time.getSeconds());
                        formik.setFieldValue('exitTime', exitDateTime.toISOString());
                      } else {
                        formik.setFieldValue('exitTime', null);
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                      field: {
                        clearable: true,
                      },
                    }}
                  />
                </Grid>

                {/* Side */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Side
                  </Typography>
                  <ToggleButtonGroup
                    value={formik.values.side}
                    exclusive
                    onChange={(_, value) => value && formik.setFieldValue('side', value)}
                    fullWidth
                  >
                    <ToggleButton value="LONG" color="success">
                      Long
                    </ToggleButton>
                    <ToggleButton value="SHORT" color="error">
                      Short
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Grid>

                {/* Execution */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Execution
                  </Typography>
                  <ToggleButtonGroup
                    value={formik.values.execution}
                    exclusive
                    onChange={(_, value) => value && formik.setFieldValue('execution', value)}
                    fullWidth
                  >
                    <ToggleButton value="PASS" color="success">
                      Pass
                    </ToggleButton>
                    <ToggleButton value="FAIL" color="error">
                      Fail
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Grid>

                {/* Risk */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Risk $"
                    name="risk"
                    type="number"
                    value={formik.values.risk}
                    onChange={formik.handleChange}
                    error={formik.touched.risk && Boolean(formik.errors.risk)}
                    helperText={formik.touched.risk && formik.errors.risk}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>

                {/* Result */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Result $"
                    name="result"
                    type="number"
                    value={formik.values.result ?? ''}
                    onChange={formik.handleChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    helperText="Leave empty for open trades"
                  />
                </Grid>

                {/* Commission */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Commission $"
                    name="commission"
                    type="number"
                    value={formik.values.commission ?? 0}
                    onChange={formik.handleChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    helperText="Fees/commissions paid"
                  />
                </Grid>

                {/* Break Even Toggle */}
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formik.values.isBreakEven || false}
                        onChange={(e) => formik.setFieldValue('isBreakEven', e.target.checked)}
                        color="warning"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">Break Even Trade</Typography>
                        <Typography variant="caption" color="text.secondary">
                          BE trades are excluded from P&L analytics
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>

                {/* Setup */}
                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    freeSolo
                    options={existingSetups}
                    value={formik.values.setup || ''}
                    onChange={(_, newValue) => {
                      formik.setFieldValue('setup', newValue || '');
                    }}
                    onInputChange={(_, newInputValue) => {
                      formik.setFieldValue('setup', newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Setup"
                        placeholder="e.g., Breakout, VWAP bounce, Gap fill..."
                        helperText="Select existing or type a new setup"
                      />
                    )}
                  />
                </Grid>

                {/* Notes */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Notes (Optional)"
                    name="notes"
                    multiline
                    rows={3}
                    value={formik.values.notes || ''}
                    onChange={formik.handleChange}
                    placeholder="Additional observations..."
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Trade Psychology Section */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trade Psychology
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Optional - helps AI analyze emotional patterns
              </Typography>

              <Grid container spacing={2}>
                {/* Pre-Trade Mood */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Pre-Trade Mood</InputLabel>
                    <Select
                      name="preTradeMood"
                      value={formik.values.preTradeMood || ''}
                      label="Pre-Trade Mood"
                      onChange={formik.handleChange}
                    >
                      <MenuItem value="">None</MenuItem>
                      {PRE_TRADE_MOODS.map((mood) => (
                        <MenuItem key={mood.value} value={mood.value}>
                          {mood.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Post-Trade Mood */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Post-Trade Mood</InputLabel>
                    <Select
                      name="postTradeMood"
                      value={formik.values.postTradeMood || ''}
                      label="Post-Trade Mood"
                      onChange={formik.handleChange}
                    >
                      <MenuItem value="">None</MenuItem>
                      {POST_TRADE_MOODS.map((mood) => (
                        <MenuItem key={mood.value} value={mood.value}>
                          {mood.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Confidence Level */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Confidence Level
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Slider
                      value={formik.values.confidenceLevel ?? 5}
                      onChange={(_, value) => formik.setFieldValue('confidenceLevel', value)}
                      min={1}
                      max={10}
                      step={1}
                      valueLabelDisplay="auto"
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'right', fontWeight: 500 }}>
                      {formik.values.confidenceLevel ?? '-'}
                    </Typography>
                  </Box>
                </Grid>

                {/* Mistake */}
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Mistake (if any)</InputLabel>
                    <Select
                      name="mistake"
                      value={formik.values.mistake || ''}
                      label="Mistake (if any)"
                      onChange={formik.handleChange}
                    >
                      <MenuItem value="">None</MenuItem>
                      {TRADE_MISTAKES.map((mistake) => (
                        <MenuItem key={mistake.value} value={mistake.value}>
                          {mistake.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Strategy
              </Typography>

              <FormControl fullWidth>
                <InputLabel>Strategy</InputLabel>
                <Select
                  name="strategyId"
                  value={formik.values.strategyId || ''}
                  label="Strategy"
                  onChange={(e) => {
                    formik.handleChange(e);
                    // Reset rule checks when strategy changes
                    setRuleChecks({});
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {strategies.map((strategy: Strategy) => (
                    <MenuItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                      {strategy.rules && strategy.rules.length > 0 && (
                        <Chip
                          size="small"
                          label={`${strategy.rules.length} rules`}
                          sx={{ ml: 1 }}
                        />
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Strategy Rules Checklist */}
              {(() => {
                const currentStrategy = strategies.find((s: Strategy) => s.id === formik.values.strategyId) as Strategy | undefined;
                if (!currentStrategy?.rules || currentStrategy.rules.length === 0) return null;

                const checkedCount = currentStrategy.rules.filter((rule) => ruleChecks[rule.id]).length;
                const score = Math.round((checkedCount / currentStrategy.rules.length) * 100);

                return (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <ChecklistIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2">
                        Strategy Checklist
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                      Check the rules this trade satisfied
                    </Typography>

                    {currentStrategy.rules.map((rule) => (
                      <FormControlLabel
                        key={rule.id}
                        control={
                          <Checkbox
                            checked={ruleChecks[rule.id] || false}
                            onChange={() => handleRuleToggle(rule.id)}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2">
                            {rule.text}
                          </Typography>
                        }
                        sx={{ display: 'flex', mb: 0.5, ml: 0 }}
                      />
                    ))}

                    {/* Satisfaction Score */}
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          Strategy Satisfaction Score
                        </Typography>
                        <Chip
                          label={`${score}%`}
                          size="small"
                          color={score >= 75 ? 'success' : score >= 50 ? 'warning' : 'error'}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={score}
                        color={score >= 75 ? 'success' : score >= 50 ? 'warning' : 'error'}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {checkedCount} of {currentStrategy.rules.length} rules satisfied
                      </Typography>
                    </Box>
                  </Box>
                );
              })()}
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              {mode === 'edit' && trade ? (
                <ScreenshotUpload
                  tradeId={trade.id}
                  screenshots={trade.screenshots || []}
                />
              ) : (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Screenshots
                  </Typography>

                  {/* Upload Area */}
                  <Box
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    sx={{
                      border: '2px dashed',
                      borderColor: dragOver ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: dragOver ? 'action.hover' : 'background.paper',
                      transition: 'all 0.2s',
                      mb: 2,
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/*';
                      input.onchange = (e) =>
                        handleFileSelect((e.target as HTMLInputElement).files);
                      input.click();
                    }}
                  >
                    <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary" variant="body2">
                      Drag & drop images or click to upload
                    </Typography>
                  </Box>

                  {/* Pending Files Preview */}
                  {pendingFiles.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {pendingFiles.map((pf, index) => (
                        <Box
                          key={index}
                          sx={{
                            position: 'relative',
                            width: 100,
                            height: 100,
                            borderRadius: 1,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Image
                            src={pf.preview}
                            alt={pf.file.name}
                            fill
                            style={{ objectFit: 'cover' }}
                            unoptimized
                          />
                          <IconButton
                            size="small"
                            onClick={() => removePendingFile(index)}
                            sx={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              backgroundColor: 'rgba(0,0,0,0.6)',
                              color: 'white',
                              padding: '4px',
                              '&:hover': {
                                backgroundColor: 'error.main',
                              },
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => router.push('/trades')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create Trade' : 'Update Trade'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
  );
}
