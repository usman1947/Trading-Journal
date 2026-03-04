'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
import { useDeleteTradeMutation, useDeleteScreenshotMutation } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { showSnackbar } from '@/store/slices/uiSlice';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ScreenshotUpload from '@/components/common/ScreenshotUpload';
import type { Trade } from '@/types';
import { CHECKLIST_ITEMS } from '@/types';

interface TradeDetailProps {
  trade: Trade;
}

export default function TradeDetail({ trade }: TradeDetailProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [deleteTrade, { isLoading: deleting }] = useDeleteTradeMutation();
  const [deleteScreenshot, { isLoading: deletingScreenshot }] = useDeleteScreenshotMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [screenshotToDelete, setScreenshotToDelete] = useState<string | null>(null);
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

  const handleDeleteScreenshot = async () => {
    if (!screenshotToDelete) return;
    try {
      await deleteScreenshot(screenshotToDelete).unwrap();
      dispatch(showSnackbar({ message: 'Screenshot deleted', severity: 'success' }));
      setScreenshotToDelete(null);
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete screenshot', severity: 'error' }));
    }
  };

  const rMultiple =
    trade.result !== null && trade.result !== undefined && trade.risk
      ? trade.result / trade.risk
      : null;

  // Calculate trade checklist score
  const checklistData = useMemo(() => {
    const items = CHECKLIST_ITEMS.map((item) => ({
      key: item.key,
      label: item.label,
      desc:
        (trade.strategy?.[`${item.key}Desc` as keyof typeof trade.strategy] as string) ||
        item.defaultDesc,
      checked: trade[item.key],
    }));
    const checkedCount = items.filter((i) => i.checked).length;
    return { items, checkedCount, total: 4, score: Math.round((checkedCount / 4) * 100) };
  }, [trade]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.back()}>
            <BackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {trade.side === 'LONG' ? <LongIcon color="success" /> : <ShortIcon color="error" />}
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
                        position: 'relative',
                        width: '100%',
                        height: 500,
                        backgroundColor: '#f5f5f5',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.9 },
                        }}
                        onClick={() => setSelectedImage(screenshot.path)}
                      >
                        <Image
                          src={screenshot.path}
                          alt={screenshot.filename}
                          fill
                          sizes="(max-width: 768px) 100vw, 66vw"
                          style={{ objectFit: 'contain' }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScreenshotToDelete(screenshot.id);
                        }}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'error.main',
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
                  <Typography color="text.secondary">No screenshots uploaded</Typography>
                </Box>
              )}

              {/* Upload more screenshots */}
              <Box sx={{ mt: 3 }}>
                <ScreenshotUpload
                  mode="edit"
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
                    {trade.result >= 0 ? '+' : ''}
                    {formatCurrency(trade.result)}
                  </Typography>
                  {rMultiple !== null && (
                    <Typography variant="h6" color={rMultiple >= 0 ? 'success.main' : 'error.main'}>
                      {rMultiple >= 0 ? '+' : ''}
                      {rMultiple.toFixed(2)}R
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
                  <Typography variant="body1">{formatDateTime(trade.tradeTime)}</Typography>
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
                      <Typography variant="body1">{trade.strategy.name}</Typography>
                    </Box>
                  </>
                )}

                {/* Trade Checklist */}
                <Divider />
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <ChecklistIcon fontSize="small" color="primary" />
                    <Typography variant="caption" color="text.secondary">
                      Trade Checklist
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">
                      {checklistData.checkedCount} of {checklistData.total} items
                    </Typography>
                    <Chip
                      label={`${checklistData.score}%`}
                      size="small"
                      color={
                        checklistData.score >= 75
                          ? 'success'
                          : checklistData.score >= 50
                            ? 'warning'
                            : 'error'
                      }
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={checklistData.score}
                    color={
                      checklistData.score >= 75
                        ? 'success'
                        : checklistData.score >= 50
                          ? 'warning'
                          : 'error'
                    }
                    sx={{ height: 6, borderRadius: 1, mb: 1.5 }}
                  />
                  {checklistData.items.map((item) => (
                    <FormControlLabel
                      key={item.key}
                      control={
                        <Checkbox checked={item.checked} size="small" disabled sx={{ py: 0.25 }} />
                      }
                      label={
                        <Box>
                          <Typography
                            variant="body2"
                            color={item.checked ? 'text.primary' : 'text.secondary'}
                          >
                            {item.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.desc}
                          </Typography>
                        </Box>
                      }
                      sx={{ ml: 0, mr: 0, display: 'flex', alignItems: 'flex-start' }}
                    />
                  ))}
                </Box>

                {trade.setup && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Setup
                      </Typography>
                      <Typography variant="body1">{trade.setup}</Typography>
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
      <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)} maxWidth="xl" fullWidth>
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
          <Box sx={{ position: 'relative', width: '100%', height: '90vh' }}>
            <Image
              src={selectedImage}
              alt="Screenshot preview"
              fill
              style={{ objectFit: 'contain' }}
              sizes="100vw"
            />
          </Box>
        )}
      </Dialog>

      {/* Delete Trade Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Trade"
        message="Are you sure you want to delete this trade? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleting}
      />

      {/* Delete Screenshot Confirmation */}
      <ConfirmDialog
        open={!!screenshotToDelete}
        title="Delete Screenshot"
        message="Are you sure you want to delete this screenshot?"
        confirmText="Delete"
        onConfirm={handleDeleteScreenshot}
        onCancel={() => setScreenshotToDelete(null)}
        loading={deletingScreenshot}
      />
    </Box>
  );
}
