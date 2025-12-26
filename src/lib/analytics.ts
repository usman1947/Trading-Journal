import prisma from './prisma';
import type { AnalyticsData, DailyStats, StrategyStats, TradeFilters } from '@/types';

type TradeRecord = {
  result: number | null;
  risk: number;
  execution: string | null;
  tradeTime: Date;
};

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
      averageWinnerR: 0,
      averageLoserR: 0,
      largestWin: 0,
      largestLoss: 0,
      totalRisk: 0,
      executionRate: 0,
    };
  }

  const winningTrades = trades.filter((t: TradeRecord) => (t.result ?? 0) > 0);
  const losingTrades = trades.filter((t: TradeRecord) => (t.result ?? 0) < 0);
  const passingTrades = trades.filter((t: TradeRecord) => t.execution === 'PASS');

  const totalResult = trades.reduce((sum: number, t: TradeRecord) => sum + (t.result ?? 0), 0);
  const totalRisk = trades.reduce((sum: number, t: TradeRecord) => sum + t.risk, 0);
  const totalWins = winningTrades.reduce((sum: number, t: TradeRecord) => sum + (t.result ?? 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum: number, t: TradeRecord) => sum + (t.result ?? 0), 0));

  // Calculate average R-multiples for winners and losers
  const winnersWithRisk = winningTrades.filter((t: TradeRecord) => t.risk > 0);
  const losersWithRisk = losingTrades.filter((t: TradeRecord) => t.risk > 0);

  const averageWinnerR =
    winnersWithRisk.length > 0
      ? winnersWithRisk.reduce((sum: number, t: TradeRecord) => sum + ((t.result ?? 0) / t.risk), 0) / winnersWithRisk.length
      : 0;

  const averageLoserR =
    losersWithRisk.length > 0
      ? losersWithRisk.reduce((sum: number, t: TradeRecord) => sum + ((t.result ?? 0) / t.risk), 0) / losersWithRisk.length
      : 0;

  return {
    totalResult,
    winRate: (winningTrades.length / trades.length) * 100,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
    averageWinnerR,
    averageLoserR,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t: TradeRecord) => t.result ?? 0)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t: TradeRecord) => t.result ?? 0)) : 0,
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

  trades.forEach((trade: TradeRecord) => {
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

  return strategies.map((strategy: { id: string; name: string; trades: TradeRecord[] }) => {
    const trades = strategy.trades;
    const winningTrades = trades.filter((t: TradeRecord) => (t.result ?? 0) > 0);
    const losingTrades = trades.filter((t: TradeRecord) => (t.result ?? 0) < 0);
    const tradesWithResult = trades.filter((t: TradeRecord) => t.result !== null && t.risk > 0);
    const winnersWithRisk = winningTrades.filter((t: TradeRecord) => t.risk > 0);
    const losersWithRisk = losingTrades.filter((t: TradeRecord) => t.risk > 0);

    const averageWinR = winnersWithRisk.length > 0
      ? winnersWithRisk.reduce((sum: number, t: TradeRecord) => sum + ((t.result ?? 0) / t.risk), 0) / winnersWithRisk.length
      : 0;

    const averageLossR = losersWithRisk.length > 0
      ? losersWithRisk.reduce((sum: number, t: TradeRecord) => sum + ((t.result ?? 0) / t.risk), 0) / losersWithRisk.length
      : 0;

    return {
      strategyId: strategy.id,
      strategyName: strategy.name,
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      totalPnl: trades.reduce((sum: number, t: TradeRecord) => sum + (t.result ?? 0), 0),
      averageRMultiple:
        tradesWithResult.length > 0
          ? tradesWithResult.reduce((sum: number, t: TradeRecord) => sum + ((t.result ?? 0) / t.risk), 0) / tradesWithResult.length
          : 0,
      averageWinR,
      averageLossR,
    };
  });
}

export async function getStrategyDistribution(filters: TradeFilters = {}) {
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
    include: {
      strategy: true,
    },
  });

  const strategyMap = new Map<string, number>();
  const totalTrades = trades.length;

  trades.forEach((trade: any) => {
    const strategyName = trade.strategy?.name || 'No Strategy';
    strategyMap.set(strategyName, (strategyMap.get(strategyName) || 0) + 1);
  });

  return Array.from(strategyMap.entries()).map(([name, trades]) => ({
    name,
    trades,
    percentage: totalTrades > 0 ? (trades / totalTrades) * 100 : 0,
  }));
}

export async function getTradeTimeDistribution(filters: TradeFilters = {}) {
  const where: Record<string, unknown> = {
    result: { not: null },
  };

  if (filters.dateFrom) {
    where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(filters.dateTo) };
  }
  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  return trades.map((trade: any) => {
    const date = new Date(trade.tradeTime);
    return {
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      hour: date.getHours(),
      minute: date.getMinutes(),
      result: trade.result,
      symbol: trade.symbol,
    };
  });
}

export async function getPnLDistribution(filters: TradeFilters = {}) {
  const where: Record<string, unknown> = {
    result: { not: null },
  };

  if (filters.dateFrom) {
    where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(filters.dateTo) };
  }
  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  return trades.map((trade: any) => {
    const date = new Date(trade.tradeTime);
    return {
      id: trade.id,
      symbol: trade.symbol,
      result: trade.result,
      rMultiple: trade.risk > 0 ? trade.result / trade.risk : 0,
      date: date.toLocaleDateString('en-US'),
    };
  });
}

export async function getTimeDayProfitability(filters: TradeFilters = {}) {
  const where: Record<string, unknown> = {
    result: { not: null },
  };

  if (filters.dateFrom) {
    where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(filters.dateTo) };
  }
  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  // 30-minute interval stats
  const intervalMap = new Map<string, { totalPnL: number; trades: number; wins: number }>();

  // Daily stats (day of week)
  const dailyMap = new Map<string, { totalPnL: number; trades: number; wins: number }>();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  trades.forEach((trade: any) => {
    const date = new Date(trade.tradeTime);
    const hour = date.getHours();
    const minute = date.getMinutes();
    const dayOfWeek = daysOfWeek[date.getDay()];
    const result = trade.result ?? 0;
    const isWin = result > 0;

    // 30-minute intervals: group by hour and 0-29 / 30-59
    const intervalMinute = minute < 30 ? 0 : 30;
    const intervalKey = `${hour}:${intervalMinute.toString().padStart(2, '0')}`;

    const intervalData = intervalMap.get(intervalKey) || { totalPnL: 0, trades: 0, wins: 0 };
    intervalData.totalPnL += result;
    intervalData.trades += 1;
    if (isWin) intervalData.wins += 1;
    intervalMap.set(intervalKey, intervalData);

    // Daily
    const dayData = dailyMap.get(dayOfWeek) || { totalPnL: 0, trades: 0, wins: 0 };
    dayData.totalPnL += result;
    dayData.trades += 1;
    if (isWin) dayData.wins += 1;
    dailyMap.set(dayOfWeek, dayData);
  });

  const hourly = Array.from(intervalMap.entries())
    .map(([interval, stats]) => ({
      interval,
      totalPnL: stats.totalPnL,
      trades: stats.trades,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
    }))
    .sort((a, b) => {
      // Parse time strings to compare numerically (e.g., "9:00" vs "10:30")
      const [hourA, minA] = a.interval.split(':').map(Number);
      const [hourB, minB] = b.interval.split(':').map(Number);
      const timeA = hourA * 60 + minA;
      const timeB = hourB * 60 + minB;
      return timeA - timeB;
    });

  const daily = daysOfWeek
    .map((day) => {
      const stats = dailyMap.get(day) || { totalPnL: 0, trades: 0, wins: 0 };
      return {
        day,
        totalPnL: stats.totalPnL,
        trades: stats.trades,
        winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
      };
    })
    .filter((d) => d.trades > 0);

  return { hourly, daily };
}
