import type { Trade, AnalyticsData } from '@/types';

export function calculateRMultiple(result: number, risk: number): number {
  if (risk === 0) return 0;
  return result / risk;
}

export function calculateAnalytics(trades: Trade[]): AnalyticsData {
  // Filter trades that have a result (completed trades)
  const completedTrades = trades.filter((t) => t.result !== null && t.result !== undefined);

  if (completedTrades.length === 0) {
    return {
      totalResult: 0,
      winRate: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      averageWin: 0,
      averageLoss: 0,
      averageWinnerR: 0,
      averageLoserR: 0,
      largestWin: 0,
      largestLoss: 0,
      totalRisk: 0,
      executionRate: 0,
    };
  }

  const winningTrades = completedTrades.filter((t) => (t.result ?? 0) > 0);
  const losingTrades = completedTrades.filter((t) => (t.result ?? 0) < 0);

  const totalResult = completedTrades.reduce((sum, t) => sum + (t.result ?? 0), 0);
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.result ?? 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.result ?? 0), 0));
  const totalRisk = trades.reduce((sum, t) => sum + (t.risk ?? 0), 0);

  // Calculate average R-multiples for winners and losers
  const winnersWithRisk = winningTrades.filter((t) => t.risk > 0);
  const losersWithRisk = losingTrades.filter((t) => t.risk > 0);

  const averageWinnerR =
    winnersWithRisk.length > 0
      ? winnersWithRisk.reduce((sum, t) => sum + calculateRMultiple(t.result ?? 0, t.risk), 0) / winnersWithRisk.length
      : 0;

  const averageLoserR =
    losersWithRisk.length > 0
      ? losersWithRisk.reduce((sum, t) => sum + calculateRMultiple(t.result ?? 0, t.risk), 0) / losersWithRisk.length
      : 0;

  // Calculate execution rate (% of PASS trades)
  const passTrades = trades.filter((t) => t.execution === 'PASS');
  const executionRate = trades.length > 0 ? (passTrades.length / trades.length) * 100 : 0;

  return {
    totalResult,
    winRate: (winningTrades.length / completedTrades.length) * 100,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
    averageWinnerR,
    averageLoserR,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.result ?? 0)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.result ?? 0)) : 0,
    totalRisk,
    executionRate,
  };
}

export function groupTradesByDate(trades: Trade[]): Record<string, Trade[]> {
  return trades.reduce((acc, trade) => {
    const date = trade.tradeTime.split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(trade);
    return acc;
  }, {} as Record<string, Trade[]>);
}
