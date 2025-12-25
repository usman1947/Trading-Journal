import prisma from './prisma';
import type { AnalyticsData, DailyStats, StrategyStats, TradeFilters } from '@/types';

export async function getAnalytics(filters: TradeFilters = {}): Promise<AnalyticsData> {
  const where: Record<string, unknown> = {
    result: { not: null },
  };

  if (filters.dateFrom) {
    where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(filters.dateTo) };
  }
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
    where.setup = { contains: filters.setup };
  }

  const trades = await prisma.trade.findMany({ where });

  if (trades.length === 0) {
    return {
      totalResult: 0,
      winRate: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      averageRMultiple: 0,
      largestWin: 0,
      largestLoss: 0,
      totalRisk: 0,
      executionRate: 0,
    };
  }

  const winningTrades = trades.filter((t) => (t.result ?? 0) > 0);
  const losingTrades = trades.filter((t) => (t.result ?? 0) < 0);
  const passingTrades = trades.filter((t) => t.execution === 'PASS');

  const totalResult = trades.reduce((sum, t) => sum + (t.result ?? 0), 0);
  const totalRisk = trades.reduce((sum, t) => sum + t.risk, 0);
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.result ?? 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.result ?? 0), 0));

  // Calculate R-multiples based on result/risk
  const tradesWithResult = trades.filter((t) => t.result !== null && t.risk > 0);
  const averageRMultiple =
    tradesWithResult.length > 0
      ? tradesWithResult.reduce((sum, t) => sum + ((t.result ?? 0) / t.risk), 0) / tradesWithResult.length
      : 0;

  return {
    totalResult,
    winRate: (winningTrades.length / trades.length) * 100,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    averageRMultiple,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.result ?? 0)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.result ?? 0)) : 0,
    totalRisk,
    executionRate: (passingTrades.length / trades.length) * 100,
  };
}

export async function getDailyStats(filters: TradeFilters = {}): Promise<DailyStats[]> {
  const where: Record<string, unknown> = {
    result: { not: null },
  };

  if (filters.dateFrom) {
    where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(filters.dateTo) };
  }

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  const dailyMap = new Map<string, { pnl: number; wins: number; total: number }>();

  trades.forEach((trade) => {
    const date = trade.tradeTime.toISOString().split('T')[0];
    const existing = dailyMap.get(date) || { pnl: 0, wins: 0, total: 0 };
    existing.pnl += trade.result ?? 0;
    existing.total += 1;
    if ((trade.result ?? 0) > 0) existing.wins += 1;
    dailyMap.set(date, existing);
  });

  return Array.from(dailyMap.entries()).map(([date, stats]) => ({
    date,
    pnl: stats.pnl,
    trades: stats.total,
    winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
  }));
}

export async function getStrategyStats(): Promise<StrategyStats[]> {
  const strategies = await prisma.strategy.findMany({
    include: {
      trades: {
        where: {
          result: { not: null },
        },
      },
    },
  });

  return strategies.map((strategy) => {
    const trades = strategy.trades;
    const winningTrades = trades.filter((t) => (t.result ?? 0) > 0);
    const tradesWithResult = trades.filter((t) => t.result !== null && t.risk > 0);

    return {
      strategyId: strategy.id,
      strategyName: strategy.name,
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      totalPnl: trades.reduce((sum, t) => sum + (t.result ?? 0), 0),
      averageRMultiple:
        tradesWithResult.length > 0
          ? tradesWithResult.reduce((sum, t) => sum + ((t.result ?? 0) / t.risk), 0) / tradesWithResult.length
          : 0,
    };
  });
}
