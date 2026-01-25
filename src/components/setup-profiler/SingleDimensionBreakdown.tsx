'use client';

import { Box, Typography, Stack, Alert } from '@mui/material';
import type { DimensionAnalysis } from '@/lib/setup-profiler';
import PatternCard from './PatternCard';

interface SingleDimensionBreakdownProps {
  analysis: DimensionAnalysis | undefined;
  isLoading?: boolean;
}

export default function SingleDimensionBreakdown({
  analysis,
  isLoading,
}: SingleDimensionBreakdownProps) {
  if (isLoading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  if (!analysis) {
    return (
      <Alert severity="info">
        No data available for this dimension.
      </Alert>
    );
  }

  const { segments, baseline, displayName, totalTradesAnalyzed } = analysis;

  // Filter out segments with no trades
  const validSegments = segments.filter(s => s.stats.totalTrades > 0);

  if (validSegments.length === 0) {
    return (
      <Alert severity="info">
        No patterns found for {displayName.toLowerCase()}.
        Make sure your trades have this information recorded.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {displayName} Breakdown
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Baseline: {baseline.winRate.toFixed(0)}% win rate · {baseline.expectancyR >= 0 ? '+' : ''}{baseline.expectancyR.toFixed(2)}R expectancy · {totalTradesAnalyzed} trades analyzed
        </Typography>
      </Box>

      {/* Pattern Cards */}
      <Stack spacing={1.5}>
        {validSegments.map((segment) => (
          <PatternCard
            key={segment.value}
            segment={segment}
            baselineWinRate={baseline.winRate}
          />
        ))}
      </Stack>

      {/* Explanatory note */}
      {validSegments.some(s => s.classification === 'INSUFFICIENT') && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Patterns marked &quot;Low Data&quot; need more trades for reliable analysis.
        </Typography>
      )}
    </Box>
  );
}
