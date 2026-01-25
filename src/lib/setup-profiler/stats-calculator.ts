import type { ClusterStats, ConfidenceLevel } from '@/types';
import type { ClusterableTrade } from './clustering';
import { calculateAverageRMultiple } from '@/utils/trade-calculations';

/**
 * Calculate comprehensive statistics for a group of trades.
 */
export function calculateClusterStats(trades: ClusterableTrade[]): ClusterStats {
  // Filter completed trades with results
  const completedTrades = trades.filter((t) => t.result !== null && t.result !== undefined);

  if (completedTrades.length === 0) {
    return createEmptyStats();
  }

  // Separate trade types
  const beTrades = completedTrades.filter((t) => t.isBreakEven);
  const nonBETrades = completedTrades.filter((t) => !t.isBreakEven);
  const winningTrades = nonBETrades.filter((t) => (t.result ?? 0) > 0);
  const losingTrades = nonBETrades.filter((t) => (t.result ?? 0) < 0);
  const passTrades = completedTrades.filter((t) => t.execution === 'PASS');
  const failTrades = completedTrades.filter((t) => t.execution === 'FAIL');

  // P&L calculations
  const totalCommissions = completedTrades.reduce((sum, t) => sum + (t.commission ?? 0), 0);
  const grossProfit = winningTrades.reduce((sum, t) => sum + (t.result ?? 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.result ?? 0), 0));
  const totalPnL = completedTrades.reduce((sum, t) => sum + (t.result ?? 0), 0) - totalCommissions;

  // Win rate (excludes BE trades)
  const winRate = nonBETrades.length > 0
    ? (winningTrades.length / nonBETrades.length) * 100
    : 0;
  const lossRate = 100 - winRate;

  // Average win/loss
  const avgWin = winningTrades.length > 0
    ? grossProfit / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? grossLoss / losingTrades.length
    : 0;

  // R-multiple calculations
  const avgRMultiple = calculateAverageRMultiple(nonBETrades);
  const avgWinnerR = calculateAverageRMultiple(winningTrades);
  const avgLoserR = calculateAverageRMultiple(losingTrades);
  const totalRMultiple = nonBETrades
    .filter((t) => t.risk > 0)
    .reduce((sum, t) => sum + ((t.result ?? 0) / t.risk), 0);

  // Expectancy calculations
  const expectancy = (winRate / 100 * avgWin) - (lossRate / 100 * avgLoss);
  const expectancyR = (winRate / 100 * avgWinnerR) - (lossRate / 100 * Math.abs(avgLoserR));

  // Profit factor and payoff ratio
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? Infinity : 0);

  // Risk metrics
  const totalRisk = completedTrades.reduce((sum, t) => sum + (t.risk ?? 0), 0);

  // Execution quality
  const executionRate = completedTrades.length > 0
    ? (passTrades.length / completedTrades.length) * 100
    : 0;

  const passNonBE = passTrades.filter((t) => !t.isBreakEven);
  const failNonBE = failTrades.filter((t) => !t.isBreakEven);
  const passTradeWinRate = passNonBE.length > 0
    ? (passNonBE.filter((t) => (t.result ?? 0) > 0).length / passNonBE.length) * 100
    : 0;
  const failTradeWinRate = failNonBE.length > 0
    ? (failNonBE.filter((t) => (t.result ?? 0) > 0).length / failNonBE.length) * 100
    : 0;

  // Hold duration calculations
  const tradesWithDuration = completedTrades.filter((t) => t.holdDurationMins !== null && t.holdDurationMins !== undefined);
  const avgHoldDurationMins = tradesWithDuration.length > 0
    ? tradesWithDuration.reduce((sum, t) => sum + (t.holdDurationMins ?? 0), 0) / tradesWithDuration.length
    : 0;

  // Confidence level based on sample size
  const confidenceLevel = getConfidenceLevel(completedTrades.length);

  return {
    totalTrades: completedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: beTrades.length,
    totalPnL,
    grossProfit,
    grossLoss,
    avgPnL: completedTrades.length > 0 ? totalPnL / completedTrades.length : 0,
    winRate,
    avgWin,
    avgLoss,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.result ?? 0)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.result ?? 0)) : 0,
    avgRMultiple,
    avgWinnerR,
    avgLoserR,
    totalRMultiple,
    expectancy,
    expectancyR,
    profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    payoffRatio: isFinite(payoffRatio) ? payoffRatio : 0,
    totalRisk,
    executionRate,
    passTradeWinRate,
    failTradeWinRate,
    avgHoldDurationMins,
    confidenceLevel,
  };
}

/**
 * Determine confidence level based on sample size.
 */
function getConfidenceLevel(sampleSize: number): ConfidenceLevel {
  if (sampleSize >= 30) return 'HIGH';
  if (sampleSize >= 15) return 'MEDIUM';
  return 'LOW';
}

/**
 * Create empty stats object for edge cases.
 */
function createEmptyStats(): ClusterStats {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakEvenTrades: 0,
    totalPnL: 0,
    grossProfit: 0,
    grossLoss: 0,
    avgPnL: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    avgRMultiple: 0,
    avgWinnerR: 0,
    avgLoserR: 0,
    totalRMultiple: 0,
    expectancy: 0,
    expectancyR: 0,
    profitFactor: 0,
    payoffRatio: 0,
    totalRisk: 0,
    executionRate: 0,
    passTradeWinRate: 0,
    failTradeWinRate: 0,
    avgHoldDurationMins: 0,
    confidenceLevel: 'LOW',
  };
}
