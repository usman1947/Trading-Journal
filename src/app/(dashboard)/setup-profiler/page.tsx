'use client';

import { useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Skeleton,
  Alert,
  AlertTitle,
} from '@mui/material';
import { useAppSelector } from '@/store/hooks';
import { useGetSetupProfilerQuery } from '@/store';
import {
  HeroInsightCard,
  DimensionTabs,
  SingleDimensionBreakdown,
  DataQualityBanner,
} from '@/components/setup-profiler';
import type { SetupProfilerResultsV2, DimensionAnalysis, PatternInsight } from '@/lib/setup-profiler';

export default function SetupProfilerPage() {
  const activeDimension = useAppSelector((state) => state.setupProfiler.activeDimension);
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);

  // Build account filter - null means paper account
  const accountFilter = selectedAccountId === null ? 'paper' : selectedAccountId;

  // Build API query params
  const queryParams = useMemo(() => ({
    accountId: accountFilter,
  }), [accountFilter]);

  const { data, isLoading, error } = useGetSetupProfilerQuery(queryParams);

  // Type-safe data access
  const profilerData = data as SetupProfilerResultsV2 | undefined;

  // Get top edge and leak from insights
  const topEdge = useMemo(() => {
    if (!profilerData?.topInsights) return null;
    return profilerData.topInsights.find((i: PatternInsight) => i.type === 'EDGE') || null;
  }, [profilerData?.topInsights]);

  const topLeak = useMemo(() => {
    if (!profilerData?.topInsights) return null;
    return profilerData.topInsights.find((i: PatternInsight) => i.type === 'LEAK') || null;
  }, [profilerData?.topInsights]);

  // Get the analysis for the active dimension
  const activeAnalysis = useMemo(() => {
    if (!profilerData?.dimensionAnalyses) return undefined;
    return profilerData.dimensionAnalyses.find(
      (a: DimensionAnalysis) => a.dimension === activeDimension
    );
  }, [profilerData?.dimensionAnalyses, activeDimension]);

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Pattern Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Discover what&apos;s working and what&apos;s costing you money in your trading.
        </Typography>
        <Skeleton variant="rounded" height={100} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={100} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={48} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={300} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Pattern Analysis
        </Typography>
        <Alert severity="error">
          <AlertTitle>Error loading analysis</AlertTitle>
          Something went wrong. Please try refreshing the page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Pattern Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Discover what&apos;s working and what&apos;s costing you money in your trading.
        </Typography>
      </Box>

      {/* Data Quality Banner */}
      {profilerData && (
        <DataQualityBanner
          quality={profilerData.summary.dataQuality}
          message={profilerData.summary.dataQualityMessage}
          tradesAnalyzed={profilerData.summary.tradesAnalyzed}
        />
      )}

      {/* Hero Insights - Most Important Finding */}
      <Box sx={{ mb: 3 }}>
        <HeroInsightCard
          topEdge={topEdge}
          topLeak={topLeak}
          isLoading={isLoading}
        />
      </Box>

      {/* Dimension Analysis Section */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {/* Dimension Tabs */}
          <DimensionTabs />

          {/* Active Dimension Breakdown */}
          <Box sx={{ p: 3 }}>
            <SingleDimensionBreakdown
              analysis={activeAnalysis}
              isLoading={isLoading}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Analysis Info */}
      {profilerData && profilerData.summary.tradesAnalyzed > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Analyzed {profilerData.summary.tradesAnalyzed} trades
          {profilerData.summary.dateRange && (
            <> from {new Date(profilerData.summary.dateRange.from).toLocaleDateString()} to {new Date(profilerData.summary.dateRange.to).toLocaleDateString()}</>
          )}
        </Typography>
      )}
    </Box>
  );
}
