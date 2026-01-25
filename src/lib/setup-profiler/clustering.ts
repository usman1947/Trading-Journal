import type { ClusterDimension, ClusterDimensionValue } from '@/types';
import { getTimeGroup } from '@/utils/trade-calculations';

// Internal trade type for clustering
export interface ClusterableTrade {
  id: string;
  setup: string | null;
  strategyId: string | null;
  strategyName?: string | null;
  tradeTime: Date | string;
  execution: string;
  side: string;
  result: number | null;
  risk: number;
  commission: number;
  isBreakEven: boolean;
  holdDurationMins?: number | null;
}

/**
 * Extract dimension value from a trade based on the dimension type.
 */
export function getDimensionValue(
  trade: ClusterableTrade,
  dimension: ClusterDimension,
  intervalMins: number = 5
): string {
  switch (dimension) {
    case 'setup':
      return trade.setup || '(No Setup)';
    case 'strategy':
      return trade.strategyName || trade.strategyId || '(No Strategy)';
    case 'timeGroup':
      return getTimeGroup(trade.tradeTime, intervalMins);
    case 'execution':
      return trade.execution || 'PASS';
    case 'side':
      return trade.side;
    default:
      throw new Error(`Unknown dimension: ${dimension}`);
  }
}

/**
 * Get human-readable display label for a dimension value.
 */
export function getDisplayLabel(
  dimension: ClusterDimension,
  value: string
): string {
  switch (dimension) {
    case 'side':
      return value === 'LONG' ? 'Long' : 'Short';
    case 'execution':
      return value === 'PASS' ? 'Good Execution' : 'Poor Execution';
    case 'setup':
      return value === '(No Setup)' ? 'No Setup' : value;
    case 'strategy':
      return value === '(No Strategy)' ? 'No Strategy' : value;
    case 'timeGroup':
      return value;
    default:
      return value;
  }
}

/**
 * Generate a unique cluster ID from dimension values.
 */
export function generateClusterId(dimensions: ClusterDimensionValue[]): string {
  const sortedDims = [...dimensions].sort((a, b) => a.name.localeCompare(b.name));
  return sortedDims.map((d) => `${d.name}:${d.value}`).join('|');
}

/**
 * Generate a display key for a cluster from its dimensions.
 */
export function generateDisplayKey(dimensions: ClusterDimensionValue[]): string {
  return dimensions.map((d) => d.displayLabel).join(' + ');
}

/**
 * Group trades by a single dimension.
 */
export function groupTradesByDimension(
  trades: ClusterableTrade[],
  dimension: ClusterDimension,
  intervalMins: number = 5
): Map<string, ClusterableTrade[]> {
  const groups = new Map<string, ClusterableTrade[]>();

  for (const trade of trades) {
    const value = getDimensionValue(trade, dimension, intervalMins);
    const existing = groups.get(value) || [];
    existing.push(trade);
    groups.set(value, existing);
  }

  return groups;
}

/**
 * Group trades by multiple dimensions (creates cross-product clusters).
 */
export function groupTradesByMultipleDimensions(
  trades: ClusterableTrade[],
  dimensions: ClusterDimension[],
  intervalMins: number = 5
): Map<string, { dimensions: ClusterDimensionValue[]; trades: ClusterableTrade[] }> {
  const groups = new Map<string, { dimensions: ClusterDimensionValue[]; trades: ClusterableTrade[] }>();

  for (const trade of trades) {
    const dims: ClusterDimensionValue[] = dimensions.map((dim) => ({
      name: dim,
      value: getDimensionValue(trade, dim, intervalMins),
      displayLabel: getDisplayLabel(dim, getDimensionValue(trade, dim, intervalMins)),
    }));

    const clusterId = generateClusterId(dims);
    const existing = groups.get(clusterId);

    if (existing) {
      existing.trades.push(trade);
    } else {
      groups.set(clusterId, { dimensions: dims, trades: [trade] });
    }
  }

  return groups;
}
