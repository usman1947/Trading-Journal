'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Skeleton,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  CheckCircle as CheckIcon,
  TrendingUp as StrengthIcon,
  Build as ImproveIcon,
  PlayArrow as ActionIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { useGetWeeklyCoachQuery, useGenerateWeeklyCoachMutation } from '@/store';
import { useAppSelector } from '@/store/hooks';
import type { WeeklyCoachReport } from '@/types/coach';

export default function WeeklyCoachCard() {
  const [expanded, setExpanded] = useState(true);
  const [weekOffset, setWeekOffset] = useState(1); // 1 = last week, 2 = 2 weeks ago, etc.
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);

  // Calculate the target week based on offset
  const targetWeek = subWeeks(new Date(), weekOffset);
  const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });
  const weekDate = format(weekStart, 'yyyy-MM-dd');
  const accountId = selectedAccountId === null ? 'paper' : selectedAccountId;

  const handlePreviousWeek = () => setWeekOffset((prev) => prev + 1);
  const handleNextWeek = () => setWeekOffset((prev) => Math.max(1, prev - 1));
  const isLatestWeek = weekOffset === 1;

  const { data, isLoading, isFetching, error } = useGetWeeklyCoachQuery({
    weekDate,
    accountId,
  });

  const [generateCoach, { isLoading: isGenerating }] = useGenerateWeeklyCoachMutation();

  const handleGenerate = async () => {
    try {
      await generateCoach({ weekDate, accountId }).unwrap();
    } catch (err) {
      console.error('Failed to generate coaching:', err);
    }
  };

  const report = data?.report as WeeklyCoachReport | null;
  const hasReport = data?.exists && report;

  // Loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width={200} height={32} />
          </Box>
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PsychologyIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Weekly Performance Coach
            </Typography>
          </Box>
          <Alert severity="error">Failed to load coaching insights</Alert>
        </CardContent>
      </Card>
    );
  }

  // Week navigation component
  const WeekNavigation = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <IconButton size="small" onClick={handlePreviousWeek} title="Previous week">
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <Chip
        size="small"
        label={`${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`}
        variant="outlined"
      />
      <IconButton
        size="small"
        onClick={handleNextWeek}
        disabled={isLatestWeek}
        title="Next week"
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  // No report exists - show generate button
  if (!hasReport) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PsychologyIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Weekly Performance Coach
              </Typography>
            </Box>
            <WeekNavigation />
          </Box>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No coaching report for this week yet.
          </Typography>
          <Button
            variant="contained"
            startIcon={
              isGenerating ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <PsychologyIcon />
              )
            }
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Coaching Insights'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Display report
  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            pt: 3,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Weekly Performance Coach
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WeekNavigation />
            <IconButton
              size="small"
              onClick={handleGenerate}
              disabled={isGenerating || isFetching}
              title="Regenerate insights"
            >
              {isGenerating || isFetching ? (
                <CircularProgress size={18} />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Summary */}
        <Box sx={{ px: 3, py: 2, bgcolor: 'action.hover' }}>
          <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
            &ldquo;{report.summary}&rdquo;
          </Typography>
        </Box>

        {/* Detailed sections */}
        <Collapse in={expanded}>
          <Box sx={{ px: 3, py: 2 }}>
            {/* Strengths */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                  color: 'success.main',
                }}
              >
                <StrengthIcon fontSize="small" />
                Strengths
              </Typography>
              <List dense disablePadding>
                {report.strengths.map((strength, idx) => (
                  <ListItem key={idx} disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <CheckIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={strength}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Areas for Improvement */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                  color: 'warning.main',
                }}
              >
                <ImproveIcon fontSize="small" />
                Areas for Improvement
              </Typography>
              <List dense disablePadding>
                {report.improvements.map((improvement, idx) => (
                  <ListItem key={idx} disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <ImproveIcon fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={improvement}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Action Items */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                  color: 'primary.main',
                }}
              >
                <ActionIcon fontSize="small" />
                Action Items for Next Week
              </Typography>
              <List dense disablePadding>
                {report.actionItems.map((action, idx) => (
                  <ListItem key={idx} disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <ActionIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={action}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        </Collapse>

        {/* Footer */}
        <Box
          sx={{
            px: 3,
            py: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Generated {format(new Date(report.generatedAt), 'MMM d, h:mm a')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {report.totalTrades} trades analyzed
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
