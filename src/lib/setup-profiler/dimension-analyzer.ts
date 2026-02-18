import type { ClusterDimension, ClusterStats, ConfidenceLevel } from '@/types';
import type { ClusterableTrade } from './clustering';
import { groupTradesByDimension, getDisplayLabel } from './clustering';
import { calculateClusterStats } from './stats-calculator';

/**
 * Single dimension analysis result - analyzes one factor at a time.
 */
export interface DimensionAnalysis {
  dimension: ClusterDimension;
  displayName: string;
  baseline: ClusterStats;
  segments: AnalyzedSegment[];
  hasSignificantFindings: boolean;
  totalTradesAnalyzed: number;
}

/**
 * A segment within a dimension (e.g., "ORB" within "setup" dimension).
 */
export interface AnalyzedSegment {
  value: string;
  displayLabel: string;
  stats: ClusterStats;
  tradeIds: string[];
  classification: PatternClassification;
  vsBaseline: BaselineComparison;
}

/**
 * Classification for patterns (more intuitive than EDGE/LEAK).
 */
export type PatternClassification =
  | 'STRONG_EDGE' // Clear winner
  | 'POTENTIAL_EDGE' // Promising, needs more data
  | 'NEUTRAL' // Average performance
  | 'POTENTIAL_LEAK' // Concerning, needs more data
  | 'STRONG_LEAK' // Clear loser
  | 'INSUFFICIENT'; // Not enough trades

/**
 * How a segment compares to overall baseline.
 */
export interface BaselineComparison {
  winRateDelta: number; // +5 means 5% better than baseline
  expectancyDelta: number; // +0.3R means 0.3R better
  pnlDelta: number; // Dollar difference from average
  isSignificant: boolean; // Statistically meaningful?
  effectSize: 'LARGE' | 'MEDIUM' | 'SMALL' | 'NEGLIGIBLE';
}

/**
 * A significant finding/insight from the analysis.
 */
export interface PatternInsight {
  id: string;
  type: 'EDGE' | 'LEAK' | 'OPPORTUNITY' | 'WARNING';
  dimension: ClusterDimension;
  dimensionLabel: string;
  value: string;
  displayLabel: string;
  headline: string;
  detail: string;
  stats: ClusterStats;
  confidence: ConfidenceLevel;
  suggestedAction: string;
  impactScore: number; // For sorting (higher = more impactful)
}

/**
 * Full profiler results with the new structure.
 */
export interface SetupProfilerResultsV2 {
  // Overview
  summary: {
    tradesAnalyzed: number;
    dateRange: { from: string; to: string } | null;
    overallStats: ClusterStats;
    dataQuality: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT';
    dataQualityMessage: string;
  };

  // Top insights (most impactful findings)
  topInsights: PatternInsight[];

  // Per-dimension breakdowns
  dimensionAnalyses: DimensionAnalysis[];

  // For backwards compatibility / advanced view
  legacyClusters?: {
    clusters: unknown[];
    topEdges: unknown[];
    topLeaks: unknown[];
  };

  generatedAt: string;
}

/**
 * Analyze a single dimension independently.
 */
export function analyzeDimension(
  trades: ClusterableTrade[],
  dimension: ClusterDimension,
  baseline: ClusterStats,
  timeIntervalMins: number = 5
): DimensionAnalysis {
  const groups = groupTradesByDimension(trades, dimension, timeIntervalMins);
  const segments: AnalyzedSegment[] = [];

  for (const [value, groupTrades] of Array.from(groups.entries())) {
    const stats = calculateClusterStats(groupTrades);
    const comparison = compareToBaseline(stats, baseline);
    const classification = classifyPattern(stats, comparison);

    segments.push({
      value,
      displayLabel: getDisplayLabel(dimension, value),
      stats,
      tradeIds: groupTrades.map((t) => t.id),
      classification,
      vsBaseline: comparison,
    });
  }

  // Sort by impact (effect size * sample size)
  segments.sort((a, b) => {
    const aScore = getImpactScore(a);
    const bScore = getImpactScore(b);
    return bScore - aScore;
  });

  return {
    dimension,
    displayName: getDimensionDisplayName(dimension),
    baseline,
    segments,
    hasSignificantFindings: segments.some(
      (s) =>
        s.classification === 'STRONG_EDGE' ||
        s.classification === 'STRONG_LEAK' ||
        s.vsBaseline.isSignificant
    ),
    totalTradesAnalyzed: trades.length,
  };
}

/**
 * Compare segment stats to baseline.
 */
function compareToBaseline(stats: ClusterStats, baseline: ClusterStats): BaselineComparison {
  const winRateDelta = stats.winRate - baseline.winRate;
  const expectancyDelta = stats.expectancyR - baseline.expectancyR;
  const pnlDelta = stats.avgPnL - baseline.avgPnL;

  // Effect size calculation (simplified Cohen's h for proportions)
  const effectSizeValue = Math.abs(winRateDelta) / 100;
  let effectSize: 'LARGE' | 'MEDIUM' | 'SMALL' | 'NEGLIGIBLE';
  if (effectSizeValue >= 0.15) effectSize = 'LARGE';
  else if (effectSizeValue >= 0.1) effectSize = 'MEDIUM';
  else if (effectSizeValue >= 0.05) effectSize = 'SMALL';
  else effectSize = 'NEGLIGIBLE';

  // Simple significance check (needs enough trades and meaningful difference)
  const isSignificant =
    stats.totalTrades >= 5 &&
    (effectSize === 'LARGE' || effectSize === 'MEDIUM') &&
    Math.abs(expectancyDelta) >= 0.2;

  return {
    winRateDelta,
    expectancyDelta,
    pnlDelta,
    isSignificant,
    effectSize,
  };
}

/**
 * Classify a pattern based on stats and comparison to baseline.
 */
function classifyPattern(
  stats: ClusterStats,
  comparison: BaselineComparison
): PatternClassification {
  // Not enough data
  if (stats.totalTrades < 3) return 'INSUFFICIENT';

  // Low confidence (3-9 trades) - use "potential" classifications
  if (stats.totalTrades < 10) {
    if (comparison.expectancyDelta > 0.3 && stats.winRate > 50) {
      return 'POTENTIAL_EDGE';
    }
    if (comparison.expectancyDelta < -0.3 && stats.winRate < 50) {
      return 'POTENTIAL_LEAK';
    }
    return 'NEUTRAL';
  }

  // Moderate+ confidence (10+ trades)
  // Strong edge: significantly better than baseline
  if (stats.expectancyR > 0.3 && comparison.expectancyDelta > 0.2 && stats.winRate >= 50) {
    return 'STRONG_EDGE';
  }

  // Strong leak: significantly worse than baseline
  if (stats.expectancyR < -0.2 && comparison.expectancyDelta < -0.2 && stats.winRate < 50) {
    return 'STRONG_LEAK';
  }

  // Potential edge: positive but not definitive
  if (stats.expectancyR > 0.1 && comparison.expectancyDelta > 0.1) {
    return 'POTENTIAL_EDGE';
  }

  // Potential leak: negative but not definitive
  if (stats.expectancyR < -0.1 && comparison.expectancyDelta < -0.1) {
    return 'POTENTIAL_LEAK';
  }

  return 'NEUTRAL';
}

/**
 * Calculate impact score for sorting (higher = more actionable).
 */
function getImpactScore(segment: AnalyzedSegment): number {
  const effectMultiplier = {
    LARGE: 3,
    MEDIUM: 2,
    SMALL: 1,
    NEGLIGIBLE: 0.5,
  }[segment.vsBaseline.effectSize];

  const classificationMultiplier = {
    STRONG_EDGE: 2,
    STRONG_LEAK: 2,
    POTENTIAL_EDGE: 1.5,
    POTENTIAL_LEAK: 1.5,
    NEUTRAL: 1,
    INSUFFICIENT: 0.1,
  }[segment.classification];

  return effectMultiplier * classificationMultiplier * Math.sqrt(segment.stats.totalTrades);
}

/**
 * Generate human-readable insights from dimension analyses.
 */
export function generateInsights(analyses: DimensionAnalysis[]): PatternInsight[] {
  const insights: PatternInsight[] = [];

  for (const analysis of analyses) {
    for (const segment of analysis.segments) {
      // Skip if insufficient data or negligible effect
      if (segment.classification === 'INSUFFICIENT') continue;
      if (segment.vsBaseline.effectSize === 'NEGLIGIBLE' && segment.classification === 'NEUTRAL')
        continue;

      const insight = createInsight(analysis.dimension, segment);
      if (insight) insights.push(insight);
    }
  }

  // Sort by impact score
  insights.sort((a, b) => b.impactScore - a.impactScore);

  return insights;
}

/**
 * Create a single insight from a segment.
 */
function createInsight(
  dimension: ClusterDimension,
  segment: AnalyzedSegment
): PatternInsight | null {
  const { classification, stats } = segment;

  // Determine insight type
  let type: PatternInsight['type'];
  if (classification === 'STRONG_EDGE') type = 'EDGE';
  else if (classification === 'STRONG_LEAK') type = 'LEAK';
  else if (classification === 'POTENTIAL_EDGE') type = 'OPPORTUNITY';
  else if (classification === 'POTENTIAL_LEAK') type = 'WARNING';
  else return null; // Skip neutral patterns

  const headline = generateHeadline(dimension, segment, type);
  const detail = generateDetail(segment);
  const action = generateAction(type, dimension, segment);

  return {
    id: `${dimension}:${segment.value}`,
    type,
    dimension,
    dimensionLabel: getDimensionDisplayName(dimension),
    value: segment.value,
    displayLabel: segment.displayLabel,
    headline,
    detail,
    stats,
    confidence: stats.confidenceLevel,
    suggestedAction: action,
    impactScore: getImpactScore(segment),
  };
}

/**
 * Generate headline for an insight.
 */
function generateHeadline(
  dimension: ClusterDimension,
  segment: AnalyzedSegment,
  type: PatternInsight['type']
): string {
  const label = segment.displayLabel;

  if (type === 'EDGE') {
    switch (dimension) {
      case 'setup':
        return `"${label}" is your most profitable setup`;
      case 'strategy':
        return `${label} strategy is working well`;
      case 'timeGroup':
        return `${label} is your best trading window`;
      case 'execution':
        return `Good execution significantly boosts results`;
      case 'side':
        return `${label} trades are consistently profitable`;
    }
  }

  if (type === 'LEAK') {
    switch (dimension) {
      case 'setup':
        return `"${label}" setup is losing you money`;
      case 'strategy':
        return `${label} strategy is underperforming`;
      case 'timeGroup':
        return `Avoid trading during ${label}`;
      case 'execution':
        return `Execution mistakes are hurting your P&L`;
      case 'side':
        return `${label} trades are a weak point`;
    }
  }

  if (type === 'OPPORTUNITY') {
    return `${label} shows promise - keep tracking`;
  }

  if (type === 'WARNING') {
    return `Watch out for ${label} - showing losses`;
  }

  return `${label} pattern identified`;
}

/**
 * Generate detail text for an insight.
 */
function generateDetail(segment: AnalyzedSegment): string {
  const { stats, vsBaseline } = segment;
  const parts: string[] = [];

  // Win rate comparison
  const winRateDir = vsBaseline.winRateDelta >= 0 ? '+' : '';
  parts.push(
    `${stats.winRate.toFixed(0)}% win rate (${winRateDir}${vsBaseline.winRateDelta.toFixed(0)}% vs average)`
  );

  // Expectancy
  const expDir = stats.expectancyR >= 0 ? '+' : '';
  parts.push(`${expDir}${stats.expectancyR.toFixed(2)}R expectancy`);

  // Sample size
  parts.push(`${stats.totalTrades} trades`);

  return parts.join(' · ');
}

/**
 * Generate action suggestion for an insight.
 */
function generateAction(
  type: PatternInsight['type'],
  dimension: ClusterDimension,
  segment: AnalyzedSegment
): string {
  if (type === 'EDGE') {
    if (dimension === 'setup')
      return `Keep taking "${segment.displayLabel}" trades - this is working`;
    if (dimension === 'timeGroup') return `Focus your trading during ${segment.displayLabel}`;
    if (dimension === 'side')
      return `${segment.displayLabel} trades are your strength - lean into them`;
    return 'Continue doing what works here';
  }

  if (type === 'LEAK') {
    if (dimension === 'setup')
      return `Consider avoiding "${segment.displayLabel}" or review your process`;
    if (dimension === 'timeGroup') return `Consider stopping before ${segment.displayLabel}`;
    if (dimension === 'side')
      return `Review your ${segment.displayLabel.toLowerCase()} trade process`;
    return 'Review and consider reducing exposure here';
  }

  if (type === 'OPPORTUNITY') {
    return `Track ${segment.stats.totalTrades < 10 ? 10 - segment.stats.totalTrades + ' more' : 'more'} trades to confirm this edge`;
  }

  if (type === 'WARNING') {
    return 'Monitor closely - may become a confirmed leak';
  }

  return 'Keep tracking for more data';
}

/**
 * Get display name for a dimension.
 */
function getDimensionDisplayName(dimension: ClusterDimension): string {
  const names: Record<ClusterDimension, string> = {
    setup: 'Setup',
    strategy: 'Strategy',
    timeGroup: 'Time of Day',
    execution: 'Execution Quality',
    side: 'Direction',
  };
  return names[dimension];
}

/**
 * Assess data quality based on trade count.
 */
export function assessDataQuality(tradeCount: number): {
  quality: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT';
  message: string;
} {
  if (tradeCount >= 100) {
    return {
      quality: 'HIGH',
      message: 'Enough data for reliable pattern detection.',
    };
  }
  if (tradeCount >= 50) {
    return {
      quality: 'MODERATE',
      message: 'Good amount of data. Some patterns may need more trades to confirm.',
    };
  }
  if (tradeCount >= 20) {
    return {
      quality: 'LOW',
      message: 'Limited data. Results are preliminary - keep logging trades.',
    };
  }
  return {
    quality: 'INSUFFICIENT',
    message: 'Not enough trades yet. Add more trades to see meaningful patterns.',
  };
}
