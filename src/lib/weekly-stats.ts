import prisma from './prisma';
import { startOfWeek, endOfWeek } from 'date-fns';
import type { PreTradeMood, TradeMistake } from '@/types';

export interface WeeklyStats {
  weekStart: Date;
  weekEnd: Date;

  // Performance metrics
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgWinnerR: number;
  avgLoserR: number;
  executionRate: number;
  largestWin: number;
  largestLoss: number;

  // Day-of-week performance
  bestDay: { day: string; pnl: number } | null;
  worstDay: { day: string; pnl: number } | null;

  // Psychology metrics
  avgConfidence: number | null;
  mostCommonMistake: TradeMistake | null;
  moodDistribution: Partial<Record<PreTradeMood, number>>;

  // Strategy breakdown
  strategyPerformance: Array<{
    name: string;
    trades: number;
    winRate: number;
    pnl: number;
  }>;

  // Setup breakdown
  setupPerformance: Array<{
    name: string;
    trades: number;
    winRate: number;
    pnl: number;
    avgR: number;
  }>;

  // Symbols traded
  symbolsTraded: string[];
  topSymbol: { symbol: string; pnl: number } | null;

  // Time-of-day performance
  timeOfDayPerformance: Array<{
    period: string;
    trades: number;
    winRate: number;
    pnl: number;
  }>;
  bestTimePeriod: { period: string; pnl: number } | null;
  worstTimePeriod: { period: string; pnl: number } | null;
}

export async function getWeeklyStats(
  userId: string,
  accountId: string | null,
  weekDate: Date = new Date()
): Promise<WeeklyStats | null> {
  // Calculate week boundaries (Monday to Sunday)
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

  // Build query filters
  const where: Record<string, unknown> = {
    userId,
    result: { not: null },
    tradeTime: {
      gte: weekStart,
      lte: weekEnd,
    },
  };

  // Handle account filtering
  if (accountId === 'paper' || accountId === '' || accountId === null) {
    where.accountId = null;
  } else if (accountId) {
    where.accountId = accountId;
  }

  const trades = await prisma.trade.findMany({
    where,
    include: { strategy: true },
    orderBy: { tradeTime: 'asc' },
  });

  if (trades.length === 0) {
    return null;
  }

  // Calculate core metrics
  const nonBETrades = trades.filter((t) => !t.isBreakEven);
  const winningTrades = nonBETrades.filter((t) => (t.result ?? 0) > 0);
  const losingTrades = nonBETrades.filter((t) => (t.result ?? 0) < 0);
  const passingTrades = trades.filter((t) => t.execution === 'PASS');

  const totalPnl = trades.reduce(
    (sum, t) => sum + (t.result ?? 0) - (t.commission ?? 0),
    0
  );
  const winRate =
    nonBETrades.length > 0
      ? (winningTrades.length / nonBETrades.length) * 100
      : 0;
  const executionRate =
    trades.length > 0 ? (passingTrades.length / trades.length) * 100 : 0;

  // Average R-multiples
  const winnersWithRisk = winningTrades.filter((t) => t.risk > 0);
  const losersWithRisk = losingTrades.filter((t) => t.risk > 0);

  const avgWinnerR =
    winnersWithRisk.length > 0
      ? winnersWithRisk.reduce((sum, t) => sum + (t.result ?? 0) / t.risk, 0) /
        winnersWithRisk.length
      : 0;

  const avgLoserR =
    losersWithRisk.length > 0
      ? losersWithRisk.reduce((sum, t) => sum + (t.result ?? 0) / t.risk, 0) /
        losersWithRisk.length
      : 0;

  // Largest win/loss
  const largestWin =
    winningTrades.length > 0
      ? Math.max(...winningTrades.map((t) => t.result ?? 0))
      : 0;
  const largestLoss =
    losingTrades.length > 0
      ? Math.min(...losingTrades.map((t) => t.result ?? 0))
      : 0;

  // Day-of-week analysis
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const dayPnl = new Map<string, number>();
  trades.forEach((t) => {
    const day = days[new Date(t.tradeTime).getDay()];
    dayPnl.set(
      day,
      (dayPnl.get(day) ?? 0) + (t.result ?? 0) - (t.commission ?? 0)
    );
  });

  const dayEntries = Array.from(dayPnl.entries());
  const bestDay =
    dayEntries.length > 0
      ? dayEntries.reduce(
          (best, [day, pnl]) =>
            pnl > (best?.pnl ?? -Infinity) ? { day, pnl } : best,
          null as { day: string; pnl: number } | null
        )
      : null;
  const worstDay =
    dayEntries.length > 0
      ? dayEntries.reduce(
          (worst, [day, pnl]) =>
            pnl < (worst?.pnl ?? Infinity) ? { day, pnl } : worst,
          null as { day: string; pnl: number } | null
        )
      : null;

  // Psychology metrics
  const tradesWithConfidence = trades.filter((t) => t.confidenceLevel !== null);
  const avgConfidence =
    tradesWithConfidence.length > 0
      ? tradesWithConfidence.reduce(
          (sum, t) => sum + (t.confidenceLevel ?? 0),
          0
        ) / tradesWithConfidence.length
      : null;

  const mistakeCounts = new Map<TradeMistake, number>();
  trades.forEach((t) => {
    if (t.mistake) {
      const mistake = t.mistake as TradeMistake;
      mistakeCounts.set(mistake, (mistakeCounts.get(mistake) ?? 0) + 1);
    }
  });
  const mostCommonMistake =
    mistakeCounts.size > 0
      ? Array.from(mistakeCounts.entries()).reduce(
          (most, [mistake, count]) =>
            count > (most?.count ?? 0) ? { mistake, count } : most,
          null as { mistake: TradeMistake; count: number } | null
        )?.mistake ?? null
      : null;

  const moodDistribution: Partial<Record<PreTradeMood, number>> = {};
  trades.forEach((t) => {
    if (t.preTradeMood) {
      const mood = t.preTradeMood as PreTradeMood;
      moodDistribution[mood] = (moodDistribution[mood] ?? 0) + 1;
    }
  });

  // Strategy breakdown
  const strategyMap = new Map<
    string,
    { trades: number; wins: number; pnl: number }
  >();
  trades.forEach((t) => {
    const name = t.strategy?.name ?? 'No Strategy';
    const existing = strategyMap.get(name) ?? { trades: 0, wins: 0, pnl: 0 };
    existing.trades += 1;
    if (!t.isBreakEven && (t.result ?? 0) > 0) existing.wins += 1;
    existing.pnl += (t.result ?? 0) - (t.commission ?? 0);
    strategyMap.set(name, existing);
  });

  const strategyPerformance = Array.from(strategyMap.entries()).map(
    ([name, stats]) => ({
      name,
      trades: stats.trades,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
      pnl: stats.pnl,
    })
  );

  // Setup breakdown
  const setupMap = new Map<
    string,
    { trades: number; wins: number; pnl: number; totalR: number; tradesWithR: number }
  >();
  trades.forEach((t) => {
    if (t.setup) {
      const name = t.setup;
      const existing = setupMap.get(name) ?? { trades: 0, wins: 0, pnl: 0, totalR: 0, tradesWithR: 0 };
      existing.trades += 1;
      if (!t.isBreakEven && (t.result ?? 0) > 0) existing.wins += 1;
      existing.pnl += (t.result ?? 0) - (t.commission ?? 0);
      if (t.risk > 0) {
        existing.totalR += (t.result ?? 0) / t.risk;
        existing.tradesWithR += 1;
      }
      setupMap.set(name, existing);
    }
  });

  const setupPerformance = Array.from(setupMap.entries())
    .map(([name, stats]) => ({
      name,
      trades: stats.trades,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
      pnl: stats.pnl,
      avgR: stats.tradesWithR > 0 ? stats.totalR / stats.tradesWithR : 0,
    }))
    .sort((a, b) => b.trades - a.trades); // Sort by most used

  // Symbol analysis
  const symbolPnl = new Map<string, number>();
  trades.forEach((t) => {
    symbolPnl.set(t.symbol, (symbolPnl.get(t.symbol) ?? 0) + (t.result ?? 0));
  });
  const symbolsTraded = Array.from(symbolPnl.keys());
  const topSymbol =
    symbolPnl.size > 0
      ? Array.from(symbolPnl.entries()).reduce(
          (top, [symbol, pnl]) =>
            pnl > (top?.pnl ?? -Infinity) ? { symbol, pnl } : top,
          null as { symbol: string; pnl: number } | null
        )
      : null;

  // Time-of-day analysis
  const getTimePeriod = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const time = hours * 60 + minutes;

    if (time < 9 * 60 + 30) return 'Pre-market (before 9:30)';
    if (time < 10 * 60 + 30) return 'Market Open (9:30-10:30)';
    if (time < 12 * 60) return 'Mid-morning (10:30-12:00)';
    if (time < 14 * 60) return 'Midday (12:00-2:00)';
    if (time < 16 * 60) return 'Afternoon (2:00-4:00)';
    return 'After-hours (after 4:00)';
  };

  const timeMap = new Map<
    string,
    { trades: number; wins: number; pnl: number }
  >();
  trades.forEach((t) => {
    const period = getTimePeriod(new Date(t.tradeTime));
    const existing = timeMap.get(period) ?? { trades: 0, wins: 0, pnl: 0 };
    existing.trades += 1;
    if (!t.isBreakEven && (t.result ?? 0) > 0) existing.wins += 1;
    existing.pnl += (t.result ?? 0) - (t.commission ?? 0);
    timeMap.set(period, existing);
  });

  const timeOfDayPerformance = Array.from(timeMap.entries()).map(
    ([period, stats]) => ({
      period,
      trades: stats.trades,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
      pnl: stats.pnl,
    })
  );

  const bestTimePeriod =
    timeOfDayPerformance.length > 0
      ? timeOfDayPerformance.reduce(
          (best, curr) =>
            curr.pnl > (best?.pnl ?? -Infinity) ? { period: curr.period, pnl: curr.pnl } : best,
          null as { period: string; pnl: number } | null
        )
      : null;

  const worstTimePeriod =
    timeOfDayPerformance.length > 0
      ? timeOfDayPerformance.reduce(
          (worst, curr) =>
            curr.pnl < (worst?.pnl ?? Infinity) ? { period: curr.period, pnl: curr.pnl } : worst,
          null as { period: string; pnl: number } | null
        )
      : null;

  return {
    weekStart,
    weekEnd,
    totalTrades: trades.length,
    winRate,
    totalPnl,
    avgWinnerR,
    avgLoserR,
    executionRate,
    largestWin,
    largestLoss,
    bestDay,
    worstDay,
    avgConfidence,
    mostCommonMistake,
    moodDistribution,
    strategyPerformance,
    setupPerformance,
    symbolsTraded,
    topSymbol,
    timeOfDayPerformance,
    bestTimePeriod,
    worstTimePeriod,
  };
}
