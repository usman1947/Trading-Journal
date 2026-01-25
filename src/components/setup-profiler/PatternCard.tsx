'use client';

import { Box, Card, CardContent, Typography, Chip, LinearProgress, Stack, Tooltip } from '@mui/material';
import {
  TrendingUp as EdgeIcon,
  TrendingDown as LeakIcon,
  HelpOutline as LowDataIcon,
} from '@mui/icons-material';
import type { AnalyzedSegment, PatternClassification } from '@/lib/setup-profiler';
import { formatCurrency } from '@/utils/formatters';

interface PatternCardProps {
  segment: AnalyzedSegment;
  baselineWinRate: number;
}

// Softer, more eye-friendly colors for dark mode
const COLORS = {
  // Softer green/teal for positive values
  positive: '#4ade80',       // Emerald-400 equivalent
  positiveMuted: '#22c55e',  // For borders
  // Softer coral/salmon for negative values
  negative: '#f87171',       // Rose-400 equivalent
  negativeMuted: '#ef4444',  // For borders
  // Warning orange
  warning: '#fb923c',        // Orange-400
  warningMuted: '#f97316',
};

function getClassificationConfig(classification: PatternClassification) {
  const config = {
    STRONG_EDGE: {
      label: 'Edge',
      color: 'success' as const,
      icon: <EdgeIcon fontSize="small" />,
      borderColor: COLORS.positiveMuted,
    },
    POTENTIAL_EDGE: {
      label: 'Promising',
      color: 'success' as const,
      icon: <EdgeIcon fontSize="small" />,
      borderColor: COLORS.positive,
    },
    NEUTRAL: {
      label: 'Neutral',
      color: 'default' as const,
      icon: null,
      borderColor: 'transparent',
    },
    POTENTIAL_LEAK: {
      label: 'Concerning',
      color: 'warning' as const,
      icon: <LeakIcon fontSize="small" />,
      borderColor: COLORS.warningMuted,
    },
    STRONG_LEAK: {
      label: 'Leak',
      color: 'error' as const,
      icon: <LeakIcon fontSize="small" />,
      borderColor: COLORS.negativeMuted,
    },
    INSUFFICIENT: {
      label: 'Low Data',
      color: 'default' as const,
      icon: <LowDataIcon fontSize="small" />,
      borderColor: 'transparent',
    },
  };
  return config[classification];
}

export default function PatternCard({ segment, baselineWinRate }: PatternCardProps) {
  const { displayLabel, stats, classification, vsBaseline } = segment;
  const config = getClassificationConfig(classification);

  // Use softer colors for text
  const winRateColor = stats.winRate >= 50 ? COLORS.positive : COLORS.negative;
  const pnlColor = stats.totalPnL >= 0 ? COLORS.positive : COLORS.negative;
  const expectancyColor = stats.expectancyR >= 0 ? COLORS.positive : COLORS.negative;

  return (
    <Card
      sx={{
        borderLeft: `4px solid ${config.borderColor}`,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Header: Name + Classification */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {displayLabel}
          </Typography>
          {classification !== 'NEUTRAL' && (
            <Chip
              size="small"
              label={config.label}
              color={config.color}
              icon={config.icon || undefined}
              sx={{ fontWeight: 500 }}
            />
          )}
        </Box>

        {/* Stats Row */}
        <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Trades
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {stats.totalTrades}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Win Rate
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ color: winRateColor }}>
              {stats.winRate.toFixed(0)}%
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Expectancy
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ color: expectancyColor }}>
              {stats.expectancyR >= 0 ? '+' : ''}{stats.expectancyR.toFixed(2)}R
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Total P&L
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ color: pnlColor }}>
              {formatCurrency(stats.totalPnL)}
            </Typography>
          </Box>
        </Stack>

        {/* Win Rate Bar */}
        <Tooltip
          title={`${stats.winRate.toFixed(0)}% win rate vs ${baselineWinRate.toFixed(0)}% baseline (${vsBaseline.winRateDelta >= 0 ? '+' : ''}${vsBaseline.winRateDelta.toFixed(0)}%)`}
        >
          <Box sx={{ position: 'relative' }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(stats.winRate, 100)}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  bgcolor: stats.winRate >= 50 ? COLORS.positive : COLORS.negative,
                },
              }}
            />
            {/* Baseline marker at 50% */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: 2,
                bgcolor: 'text.secondary',
                opacity: 0.5,
              }}
            />
          </Box>
        </Tooltip>

        {/* Comparison text */}
        {classification !== 'INSUFFICIENT' && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {vsBaseline.winRateDelta >= 0 ? '+' : ''}{vsBaseline.winRateDelta.toFixed(0)}% vs average
            {' · '}
            {stats.confidenceLevel === 'HIGH' ? 'High' : stats.confidenceLevel === 'MEDIUM' ? 'Medium' : 'Low'} confidence
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
