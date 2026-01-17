'use client';

import { useState, useCallback, useMemo } from 'react';
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
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DatePicker } from '@mui/x-date-pickers';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  useCreateTradeMutation,
  useUpdateTradeMutation,
  useGetStrategiesQuery,
  useUploadScreenshotsMutation,
  useGetSettingsQuery,
} from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import ScreenshotUpload from '@/components/common/ScreenshotUpload';
import type { Trade, Strategy } from '@/types';

const validationSchema = yup.object({
  symbol: yup.string().required('Symbol is required'),
  side: yup.string().oneOf(['LONG', 'SHORT']).required(),
  tradeTime: yup.date().required('Entry date is required'),
  risk: yup.number().positive('Must be positive').required('Risk is required'),
});

interface SwingTradeFormData {
  symbol: string;
  side: 'LONG' | 'SHORT';
  tradeTime: string;
  exitTime: string | null;
  risk: number;
  partials: number[];
  notes: string;
  strategyId: string;
  accountId: string | null;
}

interface SwingTradeFormProps {
  trade?: Trade;
  mode: 'create' | 'edit';
}

interface PendingFile {
  file: File;
  preview: string;
}

export default function SwingTradeForm({ trade, mode }: SwingTradeFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);
  const [createTrade, { isLoading: creating }] = useCreateTradeMutation();
  const [updateTrade, { isLoading: updating }] = useUpdateTradeMutation();
  const [uploadScreenshots] = useUploadScreenshotsMutation();
  const { data: allStrategies = [] } = useGetStrategiesQuery({});
  const { data: settings } = useGetSettingsQuery({});

  // Filter to only show swing strategies
  const strategies = useMemo(() => {
    return allStrategies.filter((s: Strategy) => s.isSwingStrategy);
  }, [allStrategies]);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [partials, setPartials] = useState<(number | null)[]>(() => {
    if (trade?.partials) {
      // Handle partials as JSON string from database or as array
      const parsed = typeof trade.partials === 'string'
        ? JSON.parse(trade.partials)
        : trade.partials;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return [null]; // Default to one empty partial
  });

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

  const defaultRisk = useMemo(() => settings?.defaultRisk || 100, [settings?.defaultRisk]);

  const initialValues = useMemo<SwingTradeFormData>(() => ({
    symbol: trade?.symbol || '',
    side: trade?.side || 'LONG',
    tradeTime: trade?.tradeTime || new Date().toISOString(),
    exitTime: trade?.exitTime || null,
    risk: trade?.risk ?? defaultRisk,
    partials: trade?.partials
      ? (typeof trade.partials === 'string' ? JSON.parse(trade.partials) : trade.partials)
      : [],
    notes: trade?.notes || '',
    strategyId: trade?.strategyId || '',
    accountId: trade?.accountId ?? selectedAccountId,
  }), [trade, defaultRisk, selectedAccountId]);

  // Calculate total result from partials
  const totalResult = useMemo(() => {
    return partials.reduce((sum, p) => (sum || 0) + (p || 0), 0);
  }, [partials]);

  const addPartial = () => {
    setPartials([...partials, null]);
  };

  const updatePartial = (index: number, value: number | null) => {
    const newPartials = [...partials];
    newPartials[index] = value;
    setPartials(newPartials);
  };

  const removePartial = (index: number) => {
    const newPartials = partials.filter((_, i) => i !== index);
    setPartials(newPartials);
  };

  const formik = useFormik<SwingTradeFormData>({
    initialValues,
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      try {
        const tradeData = {
          symbol: values.symbol,
          side: values.side,
          tradeTime: values.tradeTime,
          exitTime: values.exitTime,
          risk: values.risk,
          result: totalResult || 0,
          partials: partials.filter((p): p is number => p !== null),
          execution: 'PASS' as const,
          notes: values.notes || null,
          strategyId: values.strategyId || null,
          accountId: values.accountId,
        };

        if (mode === 'create') {
          const newTrade = await createTrade(tradeData).unwrap();

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

          dispatch(showSnackbar({ message: 'Swing trade created successfully', severity: 'success' }));
        } else {
          await updateTrade({ id: trade!.id, ...tradeData }).unwrap();
          dispatch(showSnackbar({ message: 'Swing trade updated successfully', severity: 'success' }));
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
                Swing Trade Details
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

                {/* Side */}
                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
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

                {/* Entry Date */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Entry Date"
                    value={new Date(formik.values.tradeTime)}
                    onChange={(date) => {
                      if (date) {
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

                {/* Exit Date */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Exit Date (Optional)"
                    value={formik.values.exitTime ? new Date(formik.values.exitTime) : null}
                    onChange={(date) => {
                      formik.setFieldValue('exitTime', date ? date.toISOString() : null);
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

                {/* Result (Read-only) */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Total Result $"
                    value={(totalResult || 0).toFixed(2)}
                    InputProps={{
                      readOnly: true,
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        color: (totalResult || 0) >= 0 ? 'success.main' : 'error.main',
                        fontWeight: 'bold',
                      },
                    }}
                    helperText="Calculated from partials"
                  />
                </Grid>

                {/* Partials Section */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Partials
                      </Typography>
                      <Button
                        startIcon={<AddIcon />}
                        onClick={addPartial}
                        variant="outlined"
                        size="small"
                      >
                        Add Partial
                      </Button>
                    </Box>

                    {partials.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No partials added yet. Click &quot;Add Partial&quot; to record profits/losses.
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {partials.map((partial, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={`#${index + 1}`}
                              size="small"
                              variant="outlined"
                              sx={{ minWidth: 45 }}
                            />
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              value={partial === null ? '' : partial}
                              onChange={(e) => {
                                const val = e.target.value;
                                updatePartial(index, val === '' ? null : parseFloat(val));
                              }}
                              InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                              }}
                              placeholder="Enter profit/loss"
                              sx={{
                                '& .MuiInputBase-input': {
                                  color: partial === null ? 'inherit' : (partial >= 0 ? 'success.main' : 'error.main'),
                                },
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => removePartial(index)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
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
                    placeholder="Trade thesis, management notes, lessons learned..."
                  />
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
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">None</MenuItem>
                  {strategies.map((strategy: Strategy) => (
                    <MenuItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
