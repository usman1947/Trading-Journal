import prisma from './prisma';
import type { AnalyticsData, DailyStats, StrategyStats, TradeFilters, TradeTimeStats } from '@/types';

type TradeRecord = {
  result: number | null;
  risk: number;
  execution: string | null;
  tradeTime: Date;
  exitTime: Date | null;
  isBreakEven: boolean;
};

// Helper function to apply account filter
function applyAccountFilter(where: Record<string, unknown>, accountId: string | null | undefined) {
  if (accountId !== undefined && accountId !== null) {
    if (accountId === 'paper' || accountId === '') {
      where.accountId = null;
    } else {
      where.accountId = accountId;
    }
  }
}

// Helper function to apply user filter
function applyUserFilter(where: Record<string, unknown>, userId: string | undefined) {
  if (userId) {
    where.userId = userId;
  }
}

export async function getAnalytics(filters: TradeFilters = {}): Promise<AnalyticsData> {
  const where: Record<string, unknown> = {
    result: { not: null },
  };

  applyUserFilter(where, filters.userId);
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
  applyAccountFilter(where, filters.accountId);

  const trades = await prisma.trade.findMany({ where });

  // Filter out BE trades for P&L analytics
  const nonBETrades = trades.filter((t: TradeRecord) => !t.isBreakEven);

  if (nonBETrades.length === 0) {
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

  const winningTrades = nonBETrades.filter((t: TradeRecord) => (t.result ?? 0) > 0);
  const losingTrades = nonBETrades.filter((t: TradeRecord) => (t.result ?? 0) < 0);
  const passingTrades = nonBETrades.filter((t: TradeRecord) => t.execution === 'PASS');

  const totalResult = nonBETrades.reduce((sum: number, t: TradeRecord) => sum + (t.result ?? 0), 0);
  const totalRisk = nonBETrades.reduce((sum: number, t: TradeRecord) => sum + t.risk, 0);
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
    winRate: (winningTrades.length / nonBETrades.length) * 100,
    totalTrades: nonBETrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
    averageWinnerR,
    averageLoserR,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t: TradeRecord) => t.result ?? 0)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t: TradeRecord) => t.result ?? 0)) : 0,
    totalRisk,
    executionRate: (passingTrades.length / nonBETrades.length) * 100,
  };
}

export async function getDailyStats(filters: TradeFilters = {}): Promise<DailyStats[]> {
  const where: Record<string, unknown> = {
    result: { not: null },
  };

  applyUserFilter(where, filters.userId);
  if (filters.dateFrom) {
    where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(filters.dateTo) };
  }
  applyAccountFilter(where, filters.accountId);

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  // Filter out BE trades for P&L analytics
  const nonBETrades = trades.filter((t: TradeRecord) => !t.isBreakEven);

  const dailyMap = new Map<string, { pnl: number; wins: number; total: number }>();

  nonBETrades.forEach((trade: TradeRecord) => {
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

export async function getStrategyStats(filters: TradeFilters = {}): Promise<StrategyStats[]> {
  const tradeWhere: Record<string, unknown> = {
    result: { not: null },
  };
  applyUserFilter(tradeWhere, filters.userId);
  applyAccountFilter(tradeWhere, filters.accountId);

  const strategyWhere: Record<string, unknown> = {};
  applyUserFilter(strategyWhere, filters.userId);

  const strategies = await prisma.strategy.findMany({
    where: strategyWhere,
    include: {
      trades: {
        where: tradeWhere,
        include: {
          ruleChecks: true,
        },
      },
      rules: true,
    },
  });

  type TradeWithRuleChecks = TradeRecord & {
    ruleChecks: { checked: boolean }[];
  };

  return strategies.map((strategy: { id: string; name: string; trades: TradeWithRuleChecks[]; rules: { id: string }[] }) => {
    // Filter out BE trades for P&L analytics
    const nonBETrades = strategy.trades.filter((t) => !t.isBreakEven);
    const winningTrades = nonBETrades.filter((t) => (t.result ?? 0) > 0);
    const losingTrades = nonBETrades.filter((t) => (t.result ?? 0) < 0);
    const tradesWithResult = nonBETrades.filter((t) => t.result !== null && t.risk > 0);
    const winnersWithRisk = winningTrades.filter((t) => t.risk > 0);
    const losersWithRisk = losingTrades.filter((t) => t.risk > 0);

    const averageWinR = winnersWithRisk.length > 0
      ? winnersWithRisk.reduce((sum: number, t) => sum + ((t.result ?? 0) / t.risk), 0) / winnersWithRisk.length
      : 0;

    const averageLossR = losersWithRisk.length > 0
      ? losersWithRisk.reduce((sum: number, t) => sum + ((t.result ?? 0) / t.risk), 0) / losersWithRisk.length
      : 0;

    // Calculate average rule satisfaction (use all trades for this)
    const totalRules = strategy.rules.length;
    let averageRuleSatisfaction = 0;
    if (totalRules > 0 && strategy.trades.length > 0) {
      const tradesWithRules = strategy.trades.filter((t) => t.ruleChecks.length > 0);
      if (tradesWithRules.length > 0) {
        const totalSatisfaction = tradesWithRules.reduce((sum, t) => {
          const checkedCount = t.ruleChecks.filter((rc) => rc.checked).length;
          const tradeRuleCount = t.ruleChecks.length;
          return sum + (tradeRuleCount > 0 ? (checkedCount / tradeRuleCount) * 100 : 0);
        }, 0);
        averageRuleSatisfaction = totalSatisfaction / tradesWithRules.length;
      }
    }

    return {
      strategyId: strategy.id,
      strategyName: strategy.name,
      totalTrades: nonBETrades.length,
      winRate: nonBETrades.length > 0 ? (winningTrades.length / nonBETrades.length) * 100 : 0,
      totalPnl: nonBETrades.reduce((sum: number, t) => sum + (t.result ?? 0), 0),
      averageRMultiple:
        tradesWithResult.length > 0
          ? tradesWithResult.reduce((sum: number, t) => sum + ((t.result ?? 0) / t.risk), 0) / tradesWithResult.length
          : 0,
      averageWinR,
      averageLossR,
      averageRuleSatisfaction,
    };
  });
}

export async function getStrategyDistribution(filters: TradeFilters = {}) {
  const where: Record<string, unknown> = {
    result: { not: null },
  };

  applyUserFilter(where, filters.userId);
  if (filters.dateFrom) {
    where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(filters.dateTo) };
  }
  applyAccountFilter(where, filters.accountId);

  const trades = await prisma.trade.findMany({
    where,
    include: {
      strategy: true,
    },
  });

  // Filter out BE trades for P&L analytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nonBETrades = trades.filter((t: any) => !t.isBreakEven);

  const strategyMap = new Map<string, number>();
  const totalTrades = nonBETrades.length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nonBETrades.forEach((trade: any) => {
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

  applyUserFilter(where, filters.userId);
  if (filters.dateFrom) {
    where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(filters.dateTo) };
  }
  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }
  applyAccountFilter(where, filters.accountId);

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return trades.map((trade: any) => {
    const tradeDate = new Date(trade.tradeTime);
    // Use America/New_York timezone to display trades in EST
    const timeStr = tradeDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York'
    });
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    return {
      id: trade.id,
      time: timeStr,
      date: tradeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }),
      hour,
      minute,
      result: trade.result,
      symbol: trade.symbol,
    };
  });
}

export async function getPnLDistribution(filters: TradeFilters = {}) {
  const where: Record<string, unknown> = {
    result: { not: null },
  };

  applyUserFilter(where, filters.userId);
  if (filters.dateFrom) {
    where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(filters.dateTo) };
  }
  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }
  applyAccountFilter(where, filters.accountId);

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  // Filter out BE trades for P&L analytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nonBETrades = trades.filter((t: any) => !t.isBreakEven);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return nonBETrades.map((trade: any) => {
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

  applyUserFilter(where, filters.userId);
  if (filters.dateFrom) {
    where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(filters.dateTo) };
  }
  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }
  applyAccountFilter(where, filters.accountId);

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  // Filter out BE trades for P&L analytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nonBETrades = trades.filter((t: any) => !t.isBreakEven);

  // 30-minute interval stats
  const intervalMap = new Map<string, { totalPnL: number; trades: number; wins: number }>();

  // Daily stats (day of week)
  const dailyMap = new Map<string, { totalPnL: number; trades: number; wins: number }>();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nonBETrades.forEach((trade: any) => {
    const date = new Date(trade.tradeTime);
    // Use America/New_York timezone to display trades in EST
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York'
    });
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' });
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

export async function getTradeTimeStats(filters: TradeFilters = {}): Promise<TradeTimeStats> {
  const where: Record<string, unknown> = {
    result: { not: null },
    exitTime: { not: null }, // Only trades with exit time
  };

  applyUserFilter(where, filters.userId);
  if (filters.dateFrom) {
    where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(filters.dateTo) };
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
  applyAccountFilter(where, filters.accountId);

  const trades = await prisma.trade.findMany({ where });

  // Separate BE trades and non-BE trades
  const breakevenTrades = trades.filter((t: TradeRecord) => t.isBreakEven);
  const nonBETrades = trades.filter((t: TradeRecord) => !t.isBreakEven);

  const winningTrades = nonBETrades.filter((t: TradeRecord) => (t.result ?? 0) > 0);
  const losingTrades = nonBETrades.filter((t: TradeRecord) => (t.result ?? 0) < 0);

  // Calculate average time in minutes for winners
  let avgWinnerTime = 0;
  if (winningTrades.length > 0) {
    const totalWinnerMinutes = winningTrades.reduce((sum: number, t: TradeRecord) => {
      const entryTime = new Date(t.tradeTime).getTime();
      const exitTime = new Date(t.exitTime!).getTime();
      const durationMinutes = (exitTime - entryTime) / (1000 * 60);
      return sum + Math.max(0, durationMinutes); // Ensure non-negative
    }, 0);
    avgWinnerTime = totalWinnerMinutes / winningTrades.length;
  }

  // Calculate average time in minutes for losers
  let avgLoserTime = 0;
  if (losingTrades.length > 0) {
    const totalLoserMinutes = losingTrades.reduce((sum: number, t: TradeRecord) => {
      const entryTime = new Date(t.tradeTime).getTime();
      const exitTime = new Date(t.exitTime!).getTime();
      const durationMinutes = (exitTime - entryTime) / (1000 * 60);
      return sum + Math.max(0, durationMinutes); // Ensure non-negative
    }, 0);
    avgLoserTime = totalLoserMinutes / losingTrades.length;
  }

  // Calculate average time in minutes for breakeven trades
  let avgBreakevenTime = 0;
  if (breakevenTrades.length > 0) {
    const totalBreakevenMinutes = breakevenTrades.reduce((sum: number, t: TradeRecord) => {
      const entryTime = new Date(t.tradeTime).getTime();
      const exitTime = new Date(t.exitTime!).getTime();
      const durationMinutes = (exitTime - entryTime) / (1000 * 60);
      return sum + Math.max(0, durationMinutes); // Ensure non-negative
    }, 0);
    avgBreakevenTime = totalBreakevenMinutes / breakevenTrades.length;
  }

  return {
    avgWinnerTime,
    avgLoserTime,
    avgBreakevenTime,
    winnerCount: winningTrades.length,
    loserCount: losingTrades.length,
    breakevenCount: breakevenTrades.length,
  };
}
