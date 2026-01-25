import type {
  ClusterDimensionValue,
  Cluster,
  SetupProfilerConfig,
  SetupProfilerResults,
  TradeFilters,
} from '@/types';
import prisma from '@/lib/prisma';
import {
  groupTradesByDimension,
  groupTradesByMultipleDimensions,
  getDisplayLabel,
  type ClusterableTrade,
} from './clustering';
import { calculateClusterStats } from './stats-calculator';
import { createCluster } from './classifier';
import {
  applyAccountFilter,
  applyUserFilter,
  buildDateRangeFilter,
  filterByTimeOfDay,
} from '@/lib/query-helpers';

/**
 * Default configuration for Setup Profiler.
 */
export const DEFAULT_PROFILER_CONFIG: SetupProfilerConfig = {
  dimensions: ['setup', 'strategy', 'timeGroup', 'execution', 'side'],
  minSampleSize: 10,
  edgeExpectancyThreshold: 0.5,
  leakExpectancyThreshold: -0.3,
  timeGroupIntervalMins: 5,
  filters: {},
};

/**
 * Main entry point for the Setup Profiler analysis.
 * Fetches trades, clusters them by dimensions, and calculates statistics.
 */
export async function runSetupProfiler(
  userId: string,
  config: Partial<SetupProfilerConfig> = {}
): Promise<SetupProfilerResults> {
  const fullConfig: SetupProfilerConfig = { ...DEFAULT_PROFILER_CONFIG, ...config };

  // Fetch trades based on filters
  const trades = await fetchTrades(userId, fullConfig.filters);

  if (trades.length === 0) {
    return createEmptyResults(fullConfig);
  }

  // Calculate overall stats
  const overallStats = calculateClusterStats(trades);

  // Generate clusters based on selected dimensions
  const clusters = generateClusters(trades, fullConfig);

  // Sort clusters by classification score (best to worst)
  clusters.sort((a, b) => b.classificationScore - a.classificationScore);

  // Extract top edges and leaks
  const topEdges = clusters
    .filter((c) => c.classification === 'EDGE')
    .slice(0, 5);

  const topLeaks = clusters
    .filter((c) => c.classification === 'LEAK')
    .slice(0, 5);

  // Determine date range
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.tradeTime).getTime() - new Date(b.tradeTime).getTime()
  );
  const dateRange = trades.length > 0
    ? {
        from: new Date(sortedTrades[0].tradeTime).toISOString(),
        to: new Date(sortedTrades[sortedTrades.length - 1].tradeTime).toISOString(),
      }
    : null;

  return {
    overallStats,
    clusters,
    topEdges,
    topLeaks,
    tradesAnalyzed: trades.length,
    dateRange,
    generatedAt: new Date().toISOString(),
    config: fullConfig,
  };
}

/**
 * Fetch trades from database with filters applied.
 * Respects account filtering (null accountId = paper account).
 */
async function fetchTrades(
  userId: string,
  filters: TradeFilters
): Promise<ClusterableTrade[]> {
  const where: Record<string, unknown> = {
    result: { not: null }, // Only completed trades
  };

  applyUserFilter(where, userId);
  buildDateRangeFilter(where, filters.dateFrom, filters.dateTo);

  if (filters.symbol) {
    where.symbol = { contains: filters.symbol };
  }
  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }
  if (filters.side) {
    where.side = filters.side;
  }
  if (filters.execution) {
    where.execution = filters.execution;
  }
  if (filters.setup) {
    where.setup = filters.setup;
  }

  // Apply account filter - critical for separating data by account
  applyAccountFilter(where, filters.accountId);

  const allTrades = await prisma.trade.findMany({
    where,
    include: {
      strategy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { tradeTime: 'asc' },
  });

  // Apply time-of-day filter if specified
  const filteredTrades = filterByTimeOfDay(
    allTrades,
    filters.timeAfter,
    filters.timeBefore
  );

  // Map to ClusterableTrade type
  return filteredTrades.map((t) => ({
    id: t.id,
    setup: t.setup,
    strategyId: t.strategyId,
    strategyName: t.strategy?.name ?? null,
    tradeTime: t.tradeTime,
    execution: t.execution ?? 'PASS',
    side: t.side,
    result: t.result,
    risk: t.risk,
    commission: t.commission,
    isBreakEven: t.isBreakEven,
    holdDurationMins: t.holdDurationMins,
  }));
}

/**
 * Generate clusters for the selected dimensions.
 */
function generateClusters(
  trades: ClusterableTrade[],
  config: SetupProfilerConfig
): Cluster[] {
  const clusters: Cluster[] = [];
  const { dimensions, timeGroupIntervalMins, minSampleSize } = config;

  if (dimensions.length === 1) {
    // Single dimension clustering
    const groups = groupTradesByDimension(
      trades,
      dimensions[0],
      timeGroupIntervalMins
    );

    for (const [value, groupTrades] of Array.from(groups.entries())) {
      if (groupTrades.length < minSampleSize) continue;

      const stats = calculateClusterStats(groupTrades);
      const clusterDimension: ClusterDimensionValue = {
        name: dimensions[0],
        value,
        displayLabel: getDisplayLabel(dimensions[0], value),
      };

      const cluster = createCluster(
        [clusterDimension],
        groupTrades.map((t) => t.id),
        stats,
        config
      );

      clusters.push(cluster);
    }
  } else {
    // Multi-dimensional clustering
    const groups = groupTradesByMultipleDimensions(
      trades,
      dimensions,
      timeGroupIntervalMins
    );

    for (const [, group] of Array.from(groups.entries())) {
      if (group.trades.length < minSampleSize) continue;

      const stats = calculateClusterStats(group.trades);
      const cluster = createCluster(
        group.dimensions,
        group.trades.map((t) => t.id),
        stats,
        config
      );

      clusters.push(cluster);
    }
  }

  return clusters;
}

/**
 * Create empty results for when no trades are found.
 */
function createEmptyResults(config: SetupProfilerConfig): SetupProfilerResults {
  const emptyStats = calculateClusterStats([]);

  return {
    overallStats: emptyStats,
    clusters: [],
    topEdges: [],
    topLeaks: [],
    tradesAnalyzed: 0,
    dateRange: null,
    generatedAt: new Date().toISOString(),
    config,
  };
}

// Re-export for convenience
export { calculateClusterStats } from './stats-calculator';
export { classifyCluster, DEFAULT_CLASSIFICATION_CONFIG } from './classifier';
export { getDisplayLabel, generateClusterId, generateDisplayKey } from './clustering';
export type { ClusterableTrade } from './clustering';
