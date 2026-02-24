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
      totalCommissions: 0,
      executionRate: 0,
    };
  }

  // Filter out BE trades for win/loss analytics only (not for total counts)
  const nonBETrades = completedTrades.filter((t) => !t.isBreakEven);

  const winningTrades = nonBETrades.filter((t) => (t.result ?? 0) > 0);
  const losingTrades = nonBETrades.filter((t) => (t.result ?? 0) < 0);

  // Total result includes ALL trades (including BE), minus commissions
  const totalCommissions = completedTrades.reduce((sum, t) => sum + (t.commission ?? 0), 0);
  const totalResult =
    completedTrades.reduce((sum, t) => sum + (t.result ?? 0), 0) - totalCommissions;
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.result ?? 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.result ?? 0), 0));
  const totalRisk = completedTrades.reduce((sum, t) => sum + (t.risk ?? 0), 0);

  // Calculate average R-multiples for winners and losers (non-BE only)
  const winnersWithRisk = winningTrades.filter((t) => t.risk > 0);
  const losersWithRisk = losingTrades.filter((t) => t.risk > 0);

  const averageWinnerR =
    winnersWithRisk.length > 0
      ? winnersWithRisk.reduce((sum, t) => sum + calculateRMultiple(t.result ?? 0, t.risk), 0) /
        winnersWithRisk.length
      : 0;

  const averageLoserR =
    losersWithRisk.length > 0
      ? losersWithRisk.reduce((sum, t) => sum + calculateRMultiple(t.result ?? 0, t.risk), 0) /
        losersWithRisk.length
      : 0;

  // Calculate execution rate (% of PASS trades) - includes all completed trades
  const passTrades = completedTrades.filter((t) => t.execution === 'PASS');
  const executionRate =
    completedTrades.length > 0 ? (passTrades.length / completedTrades.length) * 100 : 0;

  return {
    totalResult,
    // Win rate uses non-BE trades only to not skew the ratio
    winRate: nonBETrades.length > 0 ? (winningTrades.length / nonBETrades.length) * 100 : 0,
    totalTrades: completedTrades.length, // Include BE trades in total count
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
    averageWinnerR,
    averageLoserR,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.result ?? 0)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.result ?? 0)) : 0,
    totalRisk,
    totalCommissions,
    executionRate,
  };
}

export function groupTradesByDate(trades: Trade[]): Record<string, Trade[]> {
  return trades.reduce(
    (acc, trade) => {
      const date = new Date(trade.tradeTime).toLocaleDateString('en-CA', {
        timeZone: 'America/New_York',
      });
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(trade);
      return acc;
    },
    {} as Record<string, Trade[]>
  );
}
