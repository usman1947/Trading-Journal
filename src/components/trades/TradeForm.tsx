'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Chip,
  LinearProgress,
  Divider,
  Switch,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
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
import ScreenshotUpload, { type PendingFile } from '@/components/common/ScreenshotUpload';
import DateTimePickerGroup from '@/components/common/DateTimePickerGroup';
import ToggleButtonGroupField, { type ToggleOption } from '@/components/common/ToggleButtonGroupField';
import SliderInput from '@/components/common/SliderInput';
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

// Toggle button options
const SIDE_OPTIONS: ToggleOption[] = [
  { value: 'LONG', label: 'Long', color: 'success' },
  { value: 'SHORT', label: 'Short', color: 'error' },
];

const EXECUTION_OPTIONS: ToggleOption[] = [
  { value: 'PASS', label: 'Pass', color: 'success' },
  { value: 'FAIL', label: 'Fail', color: 'error' },
];

export default function TradeForm({ trade, mode }: TradeFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const [createTrade, { isLoading: creating }] = useCreateTradeMutation();
  const [updateTrade, { isLoading: updating }] = useUpdateTradeMutation();
  const [uploadScreenshots] = useUploadScreenshotsMutation();
  const [updateRuleChecks] = useUpdateTradeRuleChecksMutation();
  const { data: allStrategies = [] } = useGetStrategiesQuery({});
  const { data: existingSetups = [] } = useGetSetupsQuery({});
  const { data: settings } = useGetSettingsQuery({});

  // Filter to only show non-swing strategies
  const strategies = useMemo(() => {
    return allStrategies.filter((s: Strategy) => !s.isSwingStrategy);
  }, [allStrategies]);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [ruleChecks, setRuleChecks] = useState<Record<string, boolean>>({});

  // Get the currently selected strategy with its rules
  const selectedStrategy = useMemo(() => {
    return allStrategies.find((s: Strategy) => s.id === trade?.strategyId) as Strategy | undefined;
  }, [allStrategies, trade?.strategyId]);

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

                {/* Date and Time */}
                <DateTimePickerGroup
                  entryDateTime={formik.values.tradeTime}
                  exitDateTime={formik.values.exitTime}
                  onEntryDateChange={(date) => formik.setFieldValue('tradeTime', date.toISOString())}
                  onEntryTimeChange={(time) => formik.setFieldValue('tradeTime', time.toISOString())}
                  onExitTimeChange={(time) => formik.setFieldValue('exitTime', time ? time.toISOString() : null)}
                  error={Boolean(formik.errors.tradeTime)}
                  touched={formik.touched.tradeTime}
                />

                {/* Side */}
                <ToggleButtonGroupField
                  label="Side"
                  value={formik.values.side}
                  onChange={(value) => formik.setFieldValue('side', value)}
                  options={SIDE_OPTIONS}
                />

                {/* Execution */}
                <ToggleButtonGroupField
                  label="Execution"
                  value={formik.values.execution}
                  onChange={(value) => formik.setFieldValue('execution', value)}
                  options={EXECUTION_OPTIONS}
                />

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
                  <SliderInput
                    label="Confidence Level"
                    value={formik.values.confidenceLevel ?? 5}
                    onChange={(value) => formik.setFieldValue('confidenceLevel', value)}
                    min={1}
                    max={10}
                  />
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
                  mode="edit"
                  tradeId={trade.id}
                  screenshots={trade.screenshots || []}
                />
              ) : (
                <ScreenshotUpload
                  mode="create"
                  pendingFiles={pendingFiles}
                  onFileSelect={handleFileSelect}
                  onRemovePendingFile={removePendingFile}
                />
              )}
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => router.back()}
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
