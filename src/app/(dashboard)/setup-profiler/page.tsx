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
import Grid from '@mui/material/Grid';
import { useAppSelector } from '@/store/hooks';
import { useGetSetupProfilerQuery } from '@/store';
import {
  DimensionSelector,
  ClusterFilters,
  ClusterSummaryStats,
  ClusterResultsTable,
} from '@/components/setup-profiler';
import type { Cluster, SetupProfilerResults } from '@/types';

export default function SetupProfilerPage() {
  const filters = useAppSelector((state) => state.setupProfiler.filters);
  const selectedAccountId = useAppSelector((state) => state.ui.selectedAccountId);

  // Build account filter - null means paper account
  const accountFilter = selectedAccountId === null ? 'paper' : selectedAccountId;

  // Build API query params
  const queryParams = useMemo(() => ({
    dimensions: filters.selectedDimensions.join(','),
    minSampleSize: filters.minTradeCount,
    accountId: accountFilter,
  }), [filters.selectedDimensions, filters.minTradeCount, accountFilter]);

  const { data, isLoading, error } = useGetSetupProfilerQuery(queryParams);

  // Type-safe data access
  const profilerData = data as SetupProfilerResults | undefined;

  // Filter clusters based on edge/leak toggle
  const filteredClusters = useMemo(() => {
    if (!profilerData?.clusters) return [];

    let clusters = profilerData.clusters;

    if (filters.showEdgesOnly) {
      clusters = clusters.filter((c: Cluster) => c.classification === 'EDGE');
    } else if (filters.showLeaksOnly) {
      clusters = clusters.filter((c: Cluster) => c.classification === 'LEAK');
    }

    return clusters;
  }, [profilerData?.clusters, filters.showEdgesOnly, filters.showLeaksOnly]);

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Setup Profiler
        </Typography>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Skeleton variant="text" width="40%" height={30} />
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rounded" width={80} height={32} />
              ))}
            </Box>
          </CardContent>
        </Card>
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 6, sm: 3 }} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={400} sx={{ mt: 3 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Setup Profiler
        </Typography>
        <Alert severity="error">
          <AlertTitle>Error loading profiler data</AlertTitle>
          Something went wrong. Please try refreshing the page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Setup Profiler
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Identify your trading edges and leaks by clustering trades across multiple dimensions
          </Typography>
        </Box>
      </Box>

      {/* Dimension Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <DimensionSelector />
          <Box sx={{ mt: 2 }}>
            <ClusterFilters />
          </Box>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <ClusterSummaryStats
        clusters={filteredClusters}
        overallStats={profilerData?.overallStats ?? null}
        isLoading={isLoading}
      />

      {/* Top Edges & Leaks Highlights */}
      {profilerData && (profilerData.topEdges.length > 0 || profilerData.topLeaks.length > 0) && (
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {profilerData.topEdges.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" color="success.main" gutterBottom>
                      🎯 Top Edges
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Your most profitable trading patterns
                    </Typography>
                    {profilerData.topEdges.slice(0, 3).map((cluster: Cluster) => (
                      <Box
                        key={cluster.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:last-child': { borderBottom: 'none' },
                        }}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {cluster.displayKey}
                        </Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            {cluster.stats.expectancyR >= 0 ? '+' : ''}{cluster.stats.expectancyR.toFixed(2)}R
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cluster.stats.totalTrades} trades • {cluster.stats.winRate.toFixed(0)}% win
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            )}
            {profilerData.topLeaks.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderLeft: 4, borderColor: 'error.main' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" color="error.main" gutterBottom>
                      ⚠️ Top Leaks
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Patterns to avoid or improve
                    </Typography>
                    {profilerData.topLeaks.slice(0, 3).map((cluster: Cluster) => (
                      <Box
                        key={cluster.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:last-child': { borderBottom: 'none' },
                        }}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {cluster.displayKey}
                        </Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="error.main" fontWeight="bold">
                            {cluster.stats.expectancyR >= 0 ? '+' : ''}{cluster.stats.expectancyR.toFixed(2)}R
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cluster.stats.totalTrades} trades • {cluster.stats.winRate.toFixed(0)}% win
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Cluster Results */}
      <Card sx={{ mt: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={600}>
              All Clusters ({filteredClusters.length})
            </Typography>
            {profilerData && (
              <Typography variant="body2" color="text.secondary">
                Analyzed {profilerData.tradesAnalyzed} trades
                {profilerData.dateRange && (
                  <> from {new Date(profilerData.dateRange.from).toLocaleDateString()} to {new Date(profilerData.dateRange.to).toLocaleDateString()}</>
                )}
              </Typography>
            )}
          </Box>
          <Box sx={{ p: 3 }}>
            <ClusterResultsTable clusters={filteredClusters} />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
