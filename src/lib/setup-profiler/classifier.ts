import type {
  Cluster,
  ClusterClassification,
  ClusterStats,
  ClusterDimensionValue,
  SetupProfilerConfig,
} from '@/types';
import { generateClusterId, generateDisplayKey } from './clustering';

/**
 * Default configuration for classification thresholds.
 */
export const DEFAULT_CLASSIFICATION_CONFIG = {
  minSampleSize: 10,
  edgeExpectancyThreshold: 0.5,    // Minimum +0.5R expected per trade
  leakExpectancyThreshold: -0.3,   // Maximum -0.3R expected per trade
  edgeWinRateMin: 50,              // Minimum 50% win rate for edge
  leakWinRateMax: 40,              // Maximum 40% win rate for leak
  edgeProfitFactorMin: 1.5,        // Minimum profit factor for edge
};

/**
 * Classification weights for calculating composite score.
 */
const CLASSIFICATION_WEIGHTS = {
  expectancyR: 0.35,
  winRate: 0.20,
  profitFactor: 0.20,
  payoffRatio: 0.15,
  executionDelta: 0.10,
};

/**
 * Classify a cluster as EDGE, LEAK, NEUTRAL, or INSUFFICIENT_DATA.
 */
export function classifyCluster(
  stats: ClusterStats,
  config: Partial<SetupProfilerConfig> = {}
): { classification: ClusterClassification; score: number } {
  const minSampleSize = config.minSampleSize ?? DEFAULT_CLASSIFICATION_CONFIG.minSampleSize;
  const edgeThreshold = config.edgeExpectancyThreshold ?? DEFAULT_CLASSIFICATION_CONFIG.edgeExpectancyThreshold;
  const leakThreshold = config.leakExpectancyThreshold ?? DEFAULT_CLASSIFICATION_CONFIG.leakExpectancyThreshold;

  // Check for insufficient data
  if (stats.totalTrades < minSampleSize) {
    return { classification: 'INSUFFICIENT_DATA', score: 0 };
  }

  // Calculate composite score (-100 to +100)
  const score = calculateClassificationScore(stats);

  // Determine classification based on score and thresholds
  if (score >= 40 && stats.expectancyR >= edgeThreshold) {
    return { classification: 'EDGE', score };
  }

  if (score <= -30 && stats.expectancyR <= leakThreshold) {
    return { classification: 'LEAK', score };
  }

  return { classification: 'NEUTRAL', score };
}

/**
 * Calculate a composite classification score from -100 to +100.
 */
function calculateClassificationScore(stats: ClusterStats): number {
  let score = 0;

  // 1. Expectancy R contribution (-35 to +35)
  const expectancyContrib = Math.max(-35, Math.min(35, stats.expectancyR * 17.5));
  score += expectancyContrib * (CLASSIFICATION_WEIGHTS.expectancyR / 0.35);

  // 2. Win rate contribution (-20 to +20)
  const winRateNormalized = (stats.winRate - 50) / 10;
  const winRateContrib = Math.max(-20, Math.min(20, winRateNormalized * 10));
  score += winRateContrib * (CLASSIFICATION_WEIGHTS.winRate / 0.20);

  // 3. Profit factor contribution (-20 to +20)
  let pfContrib = 0;
  if (stats.profitFactor === Infinity || stats.profitFactor > 3) {
    pfContrib = 20;
  } else if (stats.profitFactor >= 1) {
    pfContrib = Math.min(20, (stats.profitFactor - 1) * 20);
  } else {
    pfContrib = Math.max(-20, (stats.profitFactor - 1) * 40);
  }
  score += pfContrib * (CLASSIFICATION_WEIGHTS.profitFactor / 0.20);

  // 4. Payoff ratio contribution (-15 to +15)
  let payoffContrib = 0;
  if (stats.payoffRatio === Infinity || stats.payoffRatio > 3) {
    payoffContrib = 15;
  } else if (stats.payoffRatio >= 1) {
    payoffContrib = Math.min(15, (stats.payoffRatio - 1) * 15);
  } else {
    payoffContrib = Math.max(-15, (stats.payoffRatio - 1) * 30);
  }
  score += payoffContrib * (CLASSIFICATION_WEIGHTS.payoffRatio / 0.15);

  // 5. Execution quality delta contribution (-10 to +10)
  const execDelta = stats.passTradeWinRate - stats.failTradeWinRate;
  const execContrib = Math.max(-10, Math.min(10, execDelta / 2));
  score += execContrib * (CLASSIFICATION_WEIGHTS.executionDelta / 0.10);

  // Apply confidence penalty for small sample sizes
  if (stats.confidenceLevel === 'LOW') {
    score *= 0.6;
  } else if (stats.confidenceLevel === 'MEDIUM') {
    score *= 0.85;
  }

  return Math.round(score);
}

/**
 * Create a full Cluster object from dimensions, trades, and stats.
 */
export function createCluster(
  dimensions: ClusterDimensionValue[],
  tradeIds: string[],
  stats: ClusterStats,
  config: Partial<SetupProfilerConfig> = {}
): Cluster {
  const { classification, score } = classifyCluster(stats, config);

  return {
    id: generateClusterId(dimensions),
    dimensions,
    displayKey: generateDisplayKey(dimensions),
    stats,
    classification,
    classificationScore: score,
    tradeIds,
  };
}
