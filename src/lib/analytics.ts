import prisma from './prisma';
import type { AnalyticsData, DailyStats, StrategyStats, TradeFilters, TradeTimeStats } from '@/types';
import {
  applyAccountFilter,
  applyUserFilter,
  buildDateRangeFilter,
  filterByTimeOfDay,
  excludeBreakevenTrades,
  separateWinLossTrades,
} from './query-helpers';
import { calculateAverageRMultiple, formatTimeOfDay } from '@/utils/trade-calculations';

type TradeRecord = {
  result: number | null;
  risk: number;
  commission: number;
  execution: string | null;
  tradeTime: Date;
  exitTime: Date | null;
  isBreakEven: boolean;
};

export async function getAnalytics(filters: TradeFilters = {}): Promise<AnalyticsData> {
  const where: Record<string, unknown> = {
    result: { not: null },
  };

  applyUserFilter(where, filters.userId);
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
  applyAccountFilter(where, filters.accountId);

  const allTrades = await prisma.trade.findMany({ where });
  const trades = filterByTimeOfDay(allTrades, filters.timeAfter, filters.timeBefore);

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
      totalCommissions: 0,
      executionRate: 0,
    };
  }

  // Filter out BE trades for win/loss analytics only (not for total counts)
  const nonBETrades = excludeBreakevenTrades(trades);
  const { winningTrades, losingTrades } = separateWinLossTrades(trades);
  const passingTrades = trades.filter((t: TradeRecord) => t.execution === 'PASS');

  // Total result and risk include ALL trades (including BE)
  // Commissions are subtracted from total result
  const totalCommissions = trades.reduce((sum: number, t: TradeRecord) => sum + (t.commission ?? 0), 0);
  const totalResult = trades.reduce((sum: number, t: TradeRecord) => sum + (t.result ?? 0), 0) - totalCommissions;
  const totalRisk = trades.reduce((sum: number, t: TradeRecord) => sum + t.risk, 0);
  const totalWins = winningTrades.reduce((sum: number, t: TradeRecord) => sum + (t.result ?? 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum: number, t: TradeRecord) => sum + (t.result ?? 0), 0));

  // Calculate average R-multiples for winners and losers (non-BE only)
  const averageWinnerR = calculateAverageRMultiple(winningTrades);
  const averageLoserR = calculateAverageRMultiple(losingTrades);

  return {
    totalResult,
    // Win rate uses non-BE trades only to not skew the ratio
    winRate: nonBETrades.length > 0 ? (winningTrades.length / nonBETrades.length) * 100 : 0,
    totalTrades: trades.length, // Include BE trades in total count
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
    averageWinnerR,
    averageLoserR,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t: TradeRecord) => t.result ?? 0)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t: TradeRecord) => t.result ?? 0)) : 0,
    totalRisk,
    totalCommissions,
    executionRate: trades.length > 0 ? (passingTrades.length / trades.length) * 100 : 0,
  };
}

export async function getDailyStats(filters: TradeFilters = {}): Promise<DailyStats[]> {
  const where: Record<string, unknown> = {
    result: { not: null },
  };

  applyUserFilter(where, filters.userId);
  buildDateRangeFilter(where, filters.dateFrom, filters.dateTo);
  applyAccountFilter(where, filters.accountId);

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  // Track daily stats: total includes all trades, nonBETotal for winRate calculation
  const dailyMap = new Map<string, { pnl: number; wins: number; total: number; nonBETotal: number }>();

  trades.forEach((trade: TradeRecord) => {
    const date = trade.tradeTime.toISOString().split('T')[0];
    const existing = dailyMap.get(date) || { pnl: 0, wins: 0, total: 0, nonBETotal: 0 };
    // Subtract commission from PnL
    existing.pnl += (trade.result ?? 0) - (trade.commission ?? 0);
    existing.total += 1; // Count all trades including BE
    if (!trade.isBreakEven) {
      existing.nonBETotal += 1; // Non-BE trades for winRate denominator
      if ((trade.result ?? 0) > 0) existing.wins += 1; // Only count non-BE wins
    }
    dailyMap.set(date, existing);
  });

  return Array.from(dailyMap.entries()).map(([date, stats]) => ({
    date,
    pnl: stats.pnl,
    trades: stats.total, // Total trades including BE
    // Win rate uses non-BE trades only to not skew the ratio
    winRate: stats.nonBETotal > 0 ? (stats.wins / stats.nonBETotal) * 100 : 0,
  }));
}

export async function getStrategyStats(filters: TradeFilters = {}): Promise<StrategyStats[]> {
  const tradeWhere: Record<string, unknown> = {
    result: { not: null },
  };
  applyUserFilter(tradeWhere, filters.userId);
  applyAccountFilter(tradeWhere, filters.accountId);

  // Determine if this is a swing account to filter strategies appropriately
  let isSwingAccount = false;
  if (filters.accountId && filters.accountId !== 'paper' && filters.accountId !== '') {
    const account = await prisma.account.findUnique({
      where: { id: filters.accountId },
      select: { isSwingAccount: true },
    });
    isSwingAccount = account?.isSwingAccount || false;
  }

  const strategyWhere: Record<string, unknown> = {
    isSwingStrategy: isSwingAccount, // Only show strategies matching account type
  };
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
    // Filter out BE trades for win/loss analytics only (not for total counts)
    const nonBETrades = excludeBreakevenTrades(strategy.trades);
    const { winningTrades, losingTrades } = separateWinLossTrades(strategy.trades);
    const tradesWithResult = nonBETrades.filter((t) => t.result !== null && t.risk > 0);

    const averageWinR = calculateAverageRMultiple(winningTrades);
    const averageLossR = calculateAverageRMultiple(losingTrades);

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
      totalTrades: strategy.trades.length, // Include BE trades in total count
      // Win rate uses non-BE trades only to not skew the ratio
      winRate: nonBETrades.length > 0 ? (winningTrades.length / nonBETrades.length) * 100 : 0,
      // Total PnL includes all trades (BE trades have ~0 result anyway)
      totalPnl: strategy.trades.reduce((sum: number, t) => sum + (t.result ?? 0), 0),
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
  applyAccountFilter(where, filters.accountId);

  const allTrades = await prisma.trade.findMany({
    where,
    include: {
      strategy: true,
    },
  });

  // Apply time of day filter
  const trades = filterByTimeOfDay(allTrades, filters.timeAfter, filters.timeBefore);

  // Filter out BE trades for P&L analytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nonBETrades = excludeBreakevenTrades(trades as any);

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
  buildDateRangeFilter(where, filters.dateFrom, filters.dateTo);

  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }
  if (filters.symbol) {
    where.symbol = { contains: filters.symbol };
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
  applyAccountFilter(where, filters.accountId);

  const allTrades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  // Apply time of day filter
  const trades = filterByTimeOfDay(allTrades, filters.timeAfter, filters.timeBefore);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return trades.map((trade: any) => {
    const tradeDate = new Date(trade.tradeTime);
    const timeStr = formatTimeOfDay(tradeDate);
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
  buildDateRangeFilter(where, filters.dateFrom, filters.dateTo);

  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }
  if (filters.symbol) {
    where.symbol = { contains: filters.symbol };
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
  applyAccountFilter(where, filters.accountId);

  const allTrades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  // Apply time of day filter
  const trades = filterByTimeOfDay(allTrades, filters.timeAfter, filters.timeBefore);

  // Filter out BE trades for P&L analytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nonBETrades = excludeBreakevenTrades(trades as any);

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
  buildDateRangeFilter(where, filters.dateFrom, filters.dateTo);

  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }
  if (filters.symbol) {
    where.symbol = { contains: filters.symbol };
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
  applyAccountFilter(where, filters.accountId);

  const allTrades = await prisma.trade.findMany({
    where,
    orderBy: { tradeTime: 'asc' },
  });

  // Apply time of day filter
  const trades = filterByTimeOfDay(allTrades, filters.timeAfter, filters.timeBefore);

  // Filter out BE trades for P&L analytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nonBETrades = excludeBreakevenTrades(trades as any);

  // 30-minute interval stats
  const intervalMap = new Map<string, { totalPnL: number; trades: number; wins: number }>();

  // Daily stats (day of week)
  const dailyMap = new Map<string, { totalPnL: number; trades: number; wins: number }>();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nonBETrades.forEach((trade: any) => {
    const date = new Date(trade.tradeTime);
    const timeStr = formatTimeOfDay(date);
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
  buildDateRangeFilter(where, filters.dateFrom, filters.dateTo);

  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }
  if (filters.symbol) {
    where.symbol = { contains: filters.symbol };
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
  applyAccountFilter(where, filters.accountId);

  const allTrades = await prisma.trade.findMany({ where });

  // Apply time of day filter
  const trades = filterByTimeOfDay(allTrades, filters.timeAfter, filters.timeBefore);

  // Separate BE trades and non-BE trades
  const breakevenTrades = trades.filter((t: TradeRecord) => t.isBreakEven);
  const { winningTrades, losingTrades } = separateWinLossTrades(trades);

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
