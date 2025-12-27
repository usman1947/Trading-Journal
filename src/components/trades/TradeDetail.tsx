'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Dialog,
  IconButton,
  Divider,
  LinearProgress,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  TrendingUp as LongIcon,
  TrendingDown as ShortIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  ArrowBack as BackIcon,
  ChecklistRtl as ChecklistIcon,
} from '@mui/icons-material';
import { useDeleteTradeMutation } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ScreenshotUpload from '@/components/common/ScreenshotUpload';
import type { Trade } from '@/types';

interface TradeDetailProps {
  trade: Trade;
}

export default function TradeDetail({ trade }: TradeDetailProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [deleteTrade, { isLoading: deleting }] = useDeleteTradeMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      await deleteTrade(trade.id).unwrap();
      dispatch(showSnackbar({ message: 'Trade deleted', severity: 'success' }));
      router.push('/trades');
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete trade', severity: 'error' }));
    }
  };

  const rMultiple = trade.result !== null && trade.result !== undefined && trade.risk
    ? trade.result / trade.risk
    : null;

  // Calculate strategy satisfaction score
  const satisfactionData = useMemo(() => {
    if (!trade.strategy?.rules || trade.strategy.rules.length === 0) {
      return null;
    }

    const ruleChecksMap = new Map(
      trade.ruleChecks?.map((rc) => [rc.ruleId, rc.checked]) || []
    );

    const checkedCount = trade.strategy.rules.filter(
      (rule) => ruleChecksMap.get(rule.id) === true
    ).length;

    const totalRules = trade.strategy.rules.length;
    const score = Math.round((checkedCount / totalRules) * 100);

    return {
      checkedCount,
      totalRules,
      score,
      rules: trade.strategy.rules.map((rule) => ({
        ...rule,
        checked: ruleChecksMap.get(rule.id) || false,
      })),
    };
  }, [trade.strategy?.rules, trade.ruleChecks]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push('/trades')}>
            <BackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {trade.side === 'LONG' ? (
              <LongIcon color="success" />
            ) : (
              <ShortIcon color="error" />
            )}
            <Typography variant="h4" fontWeight="bold">
              {trade.symbol}
            </Typography>
            <Chip
              label={trade.side}
              color={trade.side === 'LONG' ? 'success' : 'error'}
              size="small"
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => router.push(`/trades/${trade.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Screenshots - Main Content */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '100%', minHeight: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Screenshots
              </Typography>

              {trade.screenshots && trade.screenshots.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {trade.screenshots.map((screenshot) => (
                    <Box
                      key={screenshot.id}
                      sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.9 },
                      }}
                      onClick={() => setSelectedImage(screenshot.path)}
                    >
                      <img
                        src={screenshot.path}
                        alt={screenshot.filename}
                        style={{
                          width: '100%',
                          maxHeight: 500,
                          objectFit: 'contain',
                          backgroundColor: '#f5f5f5',
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box
                  sx={{
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'action.hover',
                    borderRadius: 2,
                  }}
                >
                  <Typography color="text.secondary">
                    No screenshots uploaded
                  </Typography>
                </Box>
              )}

              {/* Upload more screenshots */}
              <Box sx={{ mt: 3 }}>
                <ScreenshotUpload
                  tradeId={trade.id}
                  screenshots={[]}
                  disabled={false}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Trade Details - Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Result Card */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Result
              </Typography>
              {trade.result !== null && trade.result !== undefined ? (
                <>
                  <Typography
                    variant="h3"
                    fontWeight="bold"
                    color={trade.result >= 0 ? 'success.main' : 'error.main'}
                  >
                    {trade.result >= 0 ? '+' : ''}{formatCurrency(trade.result)}
                  </Typography>
                  {rMultiple !== null && (
                    <Typography
                      variant="h6"
                      color={rMultiple >= 0 ? 'success.main' : 'error.main'}
                    >
                      {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(2)}R
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="h4" color="text.secondary">
                  Open Trade
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trade Details
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Time
                  </Typography>
                  <Typography variant="body1">
                    {formatDateTime(trade.tradeTime)}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Execution
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      icon={trade.execution === 'PASS' ? <PassIcon /> : <FailIcon />}
                      label={trade.execution}
                      color={trade.execution === 'PASS' ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Risk
                  </Typography>
                  <Typography variant="body1" color="warning.main" fontWeight="medium">
                    {formatCurrency(trade.risk)}
                  </Typography>
                </Box>

                {trade.strategy && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Strategy
                      </Typography>
                      <Typography variant="body1">
                        {trade.strategy.name}
                      </Typography>
                    </Box>
                  </>
                )}

                {/* Strategy Satisfaction Score */}
                {satisfactionData && (
                  <>
                    <Divider />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <ChecklistIcon fontSize="small" color="primary" />
                        <Typography variant="caption" color="text.secondary">
                          Strategy Satisfaction
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2">
                          {satisfactionData.checkedCount} of {satisfactionData.totalRules} rules
                        </Typography>
                        <Chip
                          label={`${satisfactionData.score}%`}
                          size="small"
                          color={
                            satisfactionData.score >= 75
                              ? 'success'
                              : satisfactionData.score >= 50
                                ? 'warning'
                                : 'error'
                          }
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={satisfactionData.score}
                        color={
                          satisfactionData.score >= 75
                            ? 'success'
                            : satisfactionData.score >= 50
                              ? 'warning'
                              : 'error'
                        }
                        sx={{ height: 6, borderRadius: 1, mb: 1.5 }}
                      />
                      {satisfactionData.rules.map((rule) => (
                        <FormControlLabel
                          key={rule.id}
                          control={
                            <Checkbox
                              checked={rule.checked}
                              size="small"
                              disabled
                              sx={{ py: 0.25 }}
                            />
                          }
                          label={
                            <Typography
                              variant="body2"
                              color={rule.checked ? 'text.primary' : 'text.secondary'}
                              sx={{
                                textDecoration: rule.checked ? 'none' : 'none',
                              }}
                            >
                              {rule.text}
                            </Typography>
                          }
                          sx={{ ml: 0, mr: 0, display: 'flex' }}
                        />
                      ))}
                    </Box>
                  </>
                )}

                {trade.setup && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Setup
                      </Typography>
                      <Typography variant="body1">
                        {trade.setup}
                      </Typography>
                    </Box>
                  </>
                )}

                {trade.notes && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Notes
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {trade.notes}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Tags */}
          {trade.tags && trade.tags.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {trade.tags.map((tagOnTrade) => (
                    <Chip
                      key={tagOnTrade.tagId}
                      label={tagOnTrade.tag?.name}
                      size="small"
                      sx={{
                        backgroundColor: tagOnTrade.tag?.color,
                        color: 'white',
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="xl"
        fullWidth
      >
        <IconButton
          onClick={() => setSelectedImage(null)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.7)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
        {selectedImage && (
          <img
            src={selectedImage}
            alt="Screenshot preview"
            style={{ width: '100%', maxHeight: '90vh', objectFit: 'contain' }}
          />
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Trade"
        message="Are you sure you want to delete this trade? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleting}
      />
    </Box>
  );
}
