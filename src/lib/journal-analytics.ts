/**
 * Journal Analytics - SQL-based analysis for analytical questions
 *
 * Handles questions that require aggregation/computation rather than RAG,
 * such as "most profitable time window", "best trading hour", etc.
 *
 * Uses a hybrid approach:
 * 1. Pattern matching for common analytics questions (fast)
 * 2. LLM classification fallback for ambiguous questions (accurate)
 *
 * @module lib/journal-analytics
 */

import prisma from '@/lib/prisma';
import { getGroqClient } from '@/lib/groq-client';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default timezone for trade time analysis.
 * US Eastern (America/New_York) is used since that's the main US market timezone.
 */
const MARKET_TIMEZONE = 'America/New_York';

// =============================================================================
// Types
// =============================================================================

export interface AnalyticsResult {
  type: 'analytics';
  answer: string;
  data: Record<string, unknown>;
  query: string;
}

export interface TimeWindowStats {
  windowStart: string;
  windowEnd: string;
  tradeCount: number;
  totalPnL: number;
  winRate: number;
  avgPnL: number;
}

export interface HourlyStats {
  hour: number;
  tradeCount: number;
  totalPnL: number;
  winRate: number;
  avgPnL: number;
}

// =============================================================================
// Question Detection
// =============================================================================

/**
 * Patterns that indicate analytical questions requiring SQL queries
 */
const ANALYTICS_PATTERNS = [
  // Time-based patterns (allow words like "5 minute" between)
  /most profitable .* (time|hour|window|period)/i,
  /most profitable (time|hour|window|period)/i,
  /best .* (time|hour|window|period) .* trade/i,
  /best (time|hour|window|period) to trade/i,
  /worst .* (time|hour|window|period)/i,
  /worst (time|hour|window|period)/i,
  /what (time|hour) .* (best|worst|most|profitable)/i,
  /when .* most profitable/i,
  /trading (hour|time|window) analysis/i,
  /(morning|afternoon|evening) .* (performance|profitable|results)/i,
  /\d+\s*(minute|min|hour|hr)\s*(window|period|time)/i, // "5 minute window"
  /(window|period|time)\s*performance/i,

  // Aggregation patterns
  /total (profit|loss|pnl|p&l)/i,
  /average (profit|loss|pnl|win|loss)/i,
  /win rate/i,
  /winrate/i,
  /how many (trades|winners|losers)/i,
  /biggest (win|loss|winner|loser)/i,
  /largest (profit|loss)/i,
  /most profitable trade/i,
  /best trade/i,
  /worst trade/i,

  // Day-based patterns
  /best day (of|to)/i,
  /worst day/i,
  /(monday|tuesday|wednesday|thursday|friday) .* (performance|results)/i,

  // Symbol-based aggregations
  /most traded symbol/i,
  /best performing (symbol|stock|ticker)/i,
  /worst performing (symbol|stock|ticker)/i,
  /which symbol/i,

  // Strategy patterns
  /strateg(y|ies)/i,
  /best (performing )?strategy/i,
  /worst (performing )?strategy/i,
  /which strategy/i,
  /strategy (performance|results|stats)/i,

  // Setup patterns
  /setup/i,
  /best (performing )?setup/i,
  /worst (performing )?setup/i,
  /which setup/i,
  /setup (performance|results|stats)/i,

  // Rule adherence patterns
  /rule/i,
  /follow.* (my |the )?rules/i,
  /break.* (my |the )?rules/i,
  /rule adherence/i,
  /rule compliance/i,
  /which rules? .* (break|follow|broken|followed)/i,
  /cost of (breaking|not following)/i,

  // Execution patterns
  /execution/i,
  /pass.* (vs|versus|or|compared) .* fail/i,
  /execution (rate|quality|stats)/i,
  /how.* execut/i,
];

/**
 * Check if a question requires analytics (SQL) rather than RAG
 * Uses pattern matching first (fast), then LLM classification for ambiguous cases
 */
export function isAnalyticsQuestion(question: string): boolean {
  return ANALYTICS_PATTERNS.some(pattern => pattern.test(question));
}

/**
 * Use LLM to classify whether a question needs analytics or RAG
 * This is a fallback for questions that don't match patterns but might be analytics
 */
export async function classifyQuestionWithLLM(
  question: string
): Promise<{ type: 'analytics' | 'rag' | 'unsupported'; analyticsType?: string }> {
  try {
    const client = getGroqClient();

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You classify trading journal questions into categories. Respond with ONLY a JSON object, no other text.

Categories:
- "analytics": Questions about statistics, aggregations, counts, averages, best/worst performance, time analysis, comparisons
  Examples: "What's my win rate?", "Best performing symbol?", "How many trades this week?", "Most profitable hour?"

- "rag": Questions that need to search through trade notes, journal entries, or find specific patterns in text
  Examples: "When do I overtrade?", "What mistakes do I repeat?", "Why did I lose on AAPL trades?"

- "unsupported": Questions unrelated to trading, or that cannot be answered with trading journal data
  Examples: "What's the weather?", "Tell me a joke", "What should I trade tomorrow?"

Respond with: {"type": "analytics"|"rag"|"unsupported", "analyticsType": "time_analysis"|"extreme_trades"|"symbol_analysis"|"day_analysis"|"general_analytics"|null}`,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      temperature: 0,
      max_tokens: 100,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '';

    // Parse JSON response
    const match = response.match(/\{[^}]+\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        type: parsed.type || 'rag',
        analyticsType: parsed.analyticsType || undefined,
      };
    }

    return { type: 'rag' };
  } catch (error) {
    console.error('[Analytics] LLM classification failed:', error);
    // Default to RAG on failure
    return { type: 'rag' };
  }
}

/**
 * Detect the type of analytics query needed
 */
export function detectAnalyticsType(question: string): string {
  const q = question.toLowerCase();

  if (/time|hour|window|period|morning|afternoon|evening/.test(q) &&
      /profitable|best|worst|performance/.test(q)) {
    return 'time_analysis';
  }

  if (/biggest|largest|most profitable trade/.test(q)) {
    return 'extreme_trades';
  }

  if (/total|sum/.test(q) && /profit|loss|pnl/.test(q)) {
    return 'total_pnl';
  }

  if (/average|avg/.test(q)) {
    return 'averages';
  }

  if (/win rate|winrate/.test(q)) {
    return 'win_rate';
  }

  if (/how many|count/.test(q)) {
    return 'counts';
  }

  if (/day|monday|tuesday|wednesday|thursday|friday/.test(q)) {
    return 'day_analysis';
  }

  if (/symbol|stock|ticker/.test(q) && /best|worst|most/.test(q)) {
    return 'symbol_analysis';
  }

  if (/strateg(y|ies)/.test(q)) {
    return 'strategy_analysis';
  }

  if (/setup/.test(q)) {
    return 'setup_analysis';
  }

  if (/rule|adherence|compliance/.test(q) || /follow|break/.test(q) && /rule/.test(q)) {
    return 'rule_analysis';
  }

  if (/execution|pass|fail/.test(q)) {
    return 'execution_analysis';
  }

  return 'general_analytics';
}

// =============================================================================
// Analytics Queries
// =============================================================================

/**
 * Get the hour in market timezone from a date
 */
function getMarketHour(date: Date): number {
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: MARKET_TIMEZONE,
  });
  return parseInt(timeStr, 10);
}

/**
 * Get hour and minute in market timezone from a date
 */
function getMarketTime(date: Date): { hour: number; minute: number } {
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: MARKET_TIMEZONE,
  });
  const [hourStr, minuteStr] = timeStr.split(':');
  return {
    hour: parseInt(hourStr, 10),
    minute: parseInt(minuteStr, 10),
  };
}

/**
 * Get hourly trading performance (in market timezone)
 */
export async function getHourlyPerformance(userId: string, accountId?: string): Promise<HourlyStats[]> {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      result: { not: null },
      ...(accountId && { accountId }),
    },
    select: {
      tradeTime: true,
      result: true,
    },
  });

  // Group by hour (in market timezone)
  const hourlyMap = new Map<number, { pnl: number; count: number; wins: number }>();

  for (const trade of trades) {
    const hour = getMarketHour(new Date(trade.tradeTime));
    const existing = hourlyMap.get(hour) || { pnl: 0, count: 0, wins: 0 };

    existing.pnl += trade.result || 0;
    existing.count += 1;
    if ((trade.result || 0) > 0) existing.wins += 1;

    hourlyMap.set(hour, existing);
  }

  // Convert to array and sort by hour
  const stats: HourlyStats[] = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
    hour,
    tradeCount: data.count,
    totalPnL: data.pnl,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    avgPnL: data.count > 0 ? data.pnl / data.count : 0,
  }));

  return stats.sort((a, b) => a.hour - b.hour);
}

/**
 * Get time window performance (e.g., 5-minute windows) in market timezone
 */
export async function getTimeWindowPerformance(
  userId: string,
  windowMinutes: number = 30,
  accountId?: string
): Promise<TimeWindowStats[]> {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      result: { not: null },
      ...(accountId && { accountId }),
    },
    select: {
      tradeTime: true,
      result: true,
    },
  });

  // Group by time window (in market timezone)
  const windowMap = new Map<string, { pnl: number; count: number; wins: number }>();

  for (const trade of trades) {
    const { hour, minute } = getMarketTime(new Date(trade.tradeTime));
    const totalMinutes = hour * 60 + minute;
    const windowStart = Math.floor(totalMinutes / windowMinutes) * windowMinutes;
    const windowKey = `${Math.floor(windowStart / 60).toString().padStart(2, '0')}:${(windowStart % 60).toString().padStart(2, '0')}`;

    const existing = windowMap.get(windowKey) || { pnl: 0, count: 0, wins: 0 };
    existing.pnl += trade.result || 0;
    existing.count += 1;
    if ((trade.result || 0) > 0) existing.wins += 1;

    windowMap.set(windowKey, existing);
  }

  // Convert to array
  const stats: TimeWindowStats[] = Array.from(windowMap.entries()).map(([windowStart, data]) => {
    const startMinutes = parseInt(windowStart.split(':')[0]) * 60 + parseInt(windowStart.split(':')[1]);
    const endMinutes = startMinutes + windowMinutes;
    const windowEnd = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

    return {
      windowStart,
      windowEnd,
      tradeCount: data.count,
      totalPnL: data.pnl,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      avgPnL: data.count > 0 ? data.pnl / data.count : 0,
    };
  });

  return stats.sort((a, b) => a.windowStart.localeCompare(b.windowStart));
}

/**
 * Get extreme trades (biggest winners/losers)
 */
export async function getExtremeTrades(userId: string, accountId?: string) {
  const [biggestWinner, biggestLoser] = await Promise.all([
    prisma.trade.findFirst({
      where: {
        userId,
        result: { gt: 0 },
        ...(accountId && { accountId }),
      },
      orderBy: { result: 'desc' },
      select: {
        id: true,
        symbol: true,
        side: true,
        result: true,
        tradeTime: true,
        notes: true,
      },
    }),
    prisma.trade.findFirst({
      where: {
        userId,
        result: { lt: 0 },
        ...(accountId && { accountId }),
      },
      orderBy: { result: 'asc' },
      select: {
        id: true,
        symbol: true,
        side: true,
        result: true,
        tradeTime: true,
        notes: true,
      },
    }),
  ]);

  return { biggestWinner, biggestLoser };
}

/**
 * Get overall statistics
 */
export async function getOverallStats(userId: string, accountId?: string) {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      result: { not: null },
      ...(accountId && { accountId }),
    },
    select: { result: true },
  });

  const totalTrades = trades.length;
  const winners = trades.filter(t => (t.result || 0) > 0);
  const losers = trades.filter(t => (t.result || 0) < 0);
  const totalPnL = trades.reduce((sum, t) => sum + (t.result || 0), 0);

  return {
    totalTrades,
    winners: winners.length,
    losers: losers.length,
    winRate: totalTrades > 0 ? (winners.length / totalTrades) * 100 : 0,
    totalPnL,
    avgPnL: totalTrades > 0 ? totalPnL / totalTrades : 0,
    avgWin: winners.length > 0 ? winners.reduce((sum, t) => sum + (t.result || 0), 0) / winners.length : 0,
    avgLoss: losers.length > 0 ? losers.reduce((sum, t) => sum + (t.result || 0), 0) / losers.length : 0,
  };
}

/**
 * Get symbol performance
 */
export async function getSymbolPerformance(userId: string, accountId?: string) {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      result: { not: null },
      ...(accountId && { accountId }),
    },
    select: {
      symbol: true,
      result: true,
    },
  });

  const symbolMap = new Map<string, { pnl: number; count: number; wins: number }>();

  for (const trade of trades) {
    const existing = symbolMap.get(trade.symbol) || { pnl: 0, count: 0, wins: 0 };
    existing.pnl += trade.result || 0;
    existing.count += 1;
    if ((trade.result || 0) > 0) existing.wins += 1;
    symbolMap.set(trade.symbol, existing);
  }

  const stats = Array.from(symbolMap.entries()).map(([symbol, data]) => ({
    symbol,
    tradeCount: data.count,
    totalPnL: data.pnl,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    avgPnL: data.count > 0 ? data.pnl / data.count : 0,
  }));

  return {
    byPnL: [...stats].sort((a, b) => b.totalPnL - a.totalPnL),
    byCount: [...stats].sort((a, b) => b.tradeCount - a.tradeCount),
  };
}

/**
 * Get day of week in market timezone
 */
function getMarketDayOfWeek(date: Date): number {
  const dayStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: MARKET_TIMEZONE,
  });
  const dayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  return dayMap[dayStr] ?? 0;
}

/**
 * Get day of week performance (in market timezone)
 */
export async function getDayOfWeekPerformance(userId: string, accountId?: string) {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      result: { not: null },
      ...(accountId && { accountId }),
    },
    select: {
      tradeTime: true,
      result: true,
    },
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayMap = new Map<number, { pnl: number; count: number; wins: number }>();

  for (const trade of trades) {
    const day = getMarketDayOfWeek(new Date(trade.tradeTime));
    const existing = dayMap.get(day) || { pnl: 0, count: 0, wins: 0 };
    existing.pnl += trade.result || 0;
    existing.count += 1;
    if ((trade.result || 0) > 0) existing.wins += 1;
    dayMap.set(day, existing);
  }

  return Array.from(dayMap.entries())
    .map(([day, data]) => ({
      day: dayNames[day],
      dayNumber: day,
      tradeCount: data.count,
      totalPnL: data.pnl,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      avgPnL: data.count > 0 ? data.pnl / data.count : 0,
    }))
    .sort((a, b) => a.dayNumber - b.dayNumber);
}

/**
 * Get strategy performance
 */
export async function getStrategyPerformance(userId: string, accountId?: string) {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      result: { not: null },
      strategyId: { not: null },
      ...(accountId && { accountId }),
    },
    select: {
      result: true,
      strategy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const strategyMap = new Map<string, { name: string; pnl: number; count: number; wins: number }>();

  for (const trade of trades) {
    if (!trade.strategy) continue;
    const existing = strategyMap.get(trade.strategy.id) || {
      name: trade.strategy.name,
      pnl: 0,
      count: 0,
      wins: 0,
    };
    existing.pnl += trade.result || 0;
    existing.count += 1;
    if ((trade.result || 0) > 0) existing.wins += 1;
    strategyMap.set(trade.strategy.id, existing);
  }

  const stats = Array.from(strategyMap.entries()).map(([id, data]) => ({
    strategyId: id,
    strategyName: data.name,
    tradeCount: data.count,
    totalPnL: data.pnl,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    avgPnL: data.count > 0 ? data.pnl / data.count : 0,
  }));

  return {
    byPnL: [...stats].sort((a, b) => b.totalPnL - a.totalPnL),
    byWinRate: [...stats].sort((a, b) => b.winRate - a.winRate),
    byCount: [...stats].sort((a, b) => b.tradeCount - a.tradeCount),
  };
}

/**
 * Get setup performance
 */
export async function getSetupPerformance(userId: string, accountId?: string) {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      result: { not: null },
      setup: { not: null },
      ...(accountId && { accountId }),
    },
    select: {
      setup: true,
      result: true,
    },
  });

  const setupMap = new Map<string, { pnl: number; count: number; wins: number }>();

  for (const trade of trades) {
    if (!trade.setup) continue;
    const setup = trade.setup.trim();
    const existing = setupMap.get(setup) || { pnl: 0, count: 0, wins: 0 };
    existing.pnl += trade.result || 0;
    existing.count += 1;
    if ((trade.result || 0) > 0) existing.wins += 1;
    setupMap.set(setup, existing);
  }

  const stats = Array.from(setupMap.entries()).map(([setup, data]) => ({
    setup,
    tradeCount: data.count,
    totalPnL: data.pnl,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    avgPnL: data.count > 0 ? data.pnl / data.count : 0,
  }));

  return {
    byPnL: [...stats].sort((a, b) => b.totalPnL - a.totalPnL),
    byWinRate: [...stats].sort((a, b) => b.winRate - a.winRate),
    byCount: [...stats].sort((a, b) => b.tradeCount - a.tradeCount),
  };
}

/**
 * Get rule adherence analytics
 */
export async function getRuleAdherence(userId: string, accountId?: string) {
  // Get all trades with their rule checks
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      result: { not: null },
      ...(accountId && { accountId }),
    },
    select: {
      id: true,
      result: true,
      ruleChecks: {
        include: {
          rule: true,
        },
      },
    },
  });

  // Overall rule adherence stats
  let totalRuleChecks = 0;
  let followedRules = 0;
  let tradesWithPerfectAdherence = 0;
  let pnlWithPerfectAdherence = 0;
  let pnlWithBrokenRules = 0;
  let tradesWithBrokenRules = 0;

  // Per-rule stats
  const ruleMap = new Map<string, {
    text: string;
    timesChecked: number;
    timesFollowed: number;
    pnlWhenFollowed: number;
    pnlWhenBroken: number;
    tradesWhenFollowed: number;
    tradesWhenBroken: number;
  }>();

  for (const trade of trades) {
    if (trade.ruleChecks.length === 0) continue;

    const allFollowed = trade.ruleChecks.every(rc => rc.checked);
    const result = trade.result || 0;

    if (allFollowed) {
      tradesWithPerfectAdherence += 1;
      pnlWithPerfectAdherence += result;
    } else {
      tradesWithBrokenRules += 1;
      pnlWithBrokenRules += result;
    }

    for (const ruleCheck of trade.ruleChecks) {
      totalRuleChecks += 1;
      if (ruleCheck.checked) followedRules += 1;

      const existing = ruleMap.get(ruleCheck.rule.id) || {
        text: ruleCheck.rule.text,
        timesChecked: 0,
        timesFollowed: 0,
        pnlWhenFollowed: 0,
        pnlWhenBroken: 0,
        tradesWhenFollowed: 0,
        tradesWhenBroken: 0,
      };

      existing.timesChecked += 1;
      if (ruleCheck.checked) {
        existing.timesFollowed += 1;
        existing.pnlWhenFollowed += result;
        existing.tradesWhenFollowed += 1;
      } else {
        existing.pnlWhenBroken += result;
        existing.tradesWhenBroken += 1;
      }

      ruleMap.set(ruleCheck.rule.id, existing);
    }
  }

  const ruleStats = Array.from(ruleMap.entries()).map(([id, data]) => ({
    ruleId: id,
    ruleText: data.text,
    timesChecked: data.timesChecked,
    adherenceRate: data.timesChecked > 0 ? (data.timesFollowed / data.timesChecked) * 100 : 0,
    avgPnLWhenFollowed: data.tradesWhenFollowed > 0 ? data.pnlWhenFollowed / data.tradesWhenFollowed : 0,
    avgPnLWhenBroken: data.tradesWhenBroken > 0 ? data.pnlWhenBroken / data.tradesWhenBroken : 0,
    costOfBreaking: data.tradesWhenBroken > 0
      ? (data.tradesWhenFollowed > 0 ? data.pnlWhenFollowed / data.tradesWhenFollowed : 0) - (data.pnlWhenBroken / data.tradesWhenBroken)
      : 0,
  }));

  return {
    overall: {
      totalRuleChecks,
      overallAdherenceRate: totalRuleChecks > 0 ? (followedRules / totalRuleChecks) * 100 : 0,
      tradesWithPerfectAdherence,
      tradesWithBrokenRules,
      avgPnLWithPerfectAdherence: tradesWithPerfectAdherence > 0 ? pnlWithPerfectAdherence / tradesWithPerfectAdherence : 0,
      avgPnLWithBrokenRules: tradesWithBrokenRules > 0 ? pnlWithBrokenRules / tradesWithBrokenRules : 0,
    },
    byRule: ruleStats.sort((a, b) => a.adherenceRate - b.adherenceRate), // Worst adherence first
    mostBroken: ruleStats.sort((a, b) => a.adherenceRate - b.adherenceRate).slice(0, 5),
    mostCostly: ruleStats.sort((a, b) => b.costOfBreaking - a.costOfBreaking).slice(0, 5),
  };
}

/**
 * Get execution quality analytics (PASS vs FAIL)
 */
export async function getExecutionAnalytics(userId: string, accountId?: string) {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      result: { not: null },
      ...(accountId && { accountId }),
    },
    select: {
      execution: true,
      result: true,
    },
  });

  const passStats = { count: 0, pnl: 0, wins: 0 };
  const failStats = { count: 0, pnl: 0, wins: 0 };

  for (const trade of trades) {
    const result = trade.result || 0;
    const isWin = result > 0;

    if (trade.execution === 'PASS') {
      passStats.count += 1;
      passStats.pnl += result;
      if (isWin) passStats.wins += 1;
    } else {
      failStats.count += 1;
      failStats.pnl += result;
      if (isWin) failStats.wins += 1;
    }
  }

  const totalTrades = passStats.count + failStats.count;

  return {
    executionRate: totalTrades > 0 ? (passStats.count / totalTrades) * 100 : 0,
    pass: {
      count: passStats.count,
      totalPnL: passStats.pnl,
      winRate: passStats.count > 0 ? (passStats.wins / passStats.count) * 100 : 0,
      avgPnL: passStats.count > 0 ? passStats.pnl / passStats.count : 0,
    },
    fail: {
      count: failStats.count,
      totalPnL: failStats.pnl,
      winRate: failStats.count > 0 ? (failStats.wins / failStats.count) * 100 : 0,
      avgPnL: failStats.count > 0 ? failStats.pnl / failStats.count : 0,
    },
    costOfPoorExecution: failStats.count > 0
      ? (passStats.count > 0 ? passStats.pnl / passStats.count : 0) - (failStats.pnl / failStats.count)
      : 0,
  };
}

// =============================================================================
// Main Analytics Handler
// =============================================================================

/**
 * Run analytics query and generate natural language response
 */
export async function runAnalyticsQuery(
  question: string,
  userId: string,
  accountId?: string
): Promise<AnalyticsResult> {
  const queryType = detectAnalyticsType(question);
  let data: Record<string, unknown> = {};
  let context = '';

  // Gather relevant data based on query type
  switch (queryType) {
    case 'time_analysis': {
      // Check if they're asking about specific window sizes
      const windowMatch = question.match(/(\d+)\s*-?\s*minute/i);
      const windowMinutes = windowMatch ? parseInt(windowMatch[1]) : 30;

      const hourly = await getHourlyPerformance(userId, accountId);
      const windows = await getTimeWindowPerformance(userId, windowMinutes, accountId);

      // Find best/worst
      const bestHour = [...hourly].sort((a, b) => b.totalPnL - a.totalPnL)[0];
      const worstHour = [...hourly].sort((a, b) => a.totalPnL - b.totalPnL)[0];
      const bestWindow = [...windows].sort((a, b) => b.totalPnL - a.totalPnL)[0];
      const worstWindow = [...windows].sort((a, b) => a.totalPnL - b.totalPnL)[0];

      data = { hourly, windows, bestHour, worstHour, bestWindow, worstWindow, windowMinutes };

      context = `Time Analysis Data:

Hourly Performance:
${hourly.map(h => `- ${h.hour}:00: ${h.tradeCount} trades, $${h.totalPnL.toFixed(2)} PnL, ${h.winRate.toFixed(1)}% win rate`).join('\n')}

Best Hour: ${bestHour?.hour}:00 with $${bestHour?.totalPnL.toFixed(2)} total PnL
Worst Hour: ${worstHour?.hour}:00 with $${worstHour?.totalPnL.toFixed(2)} total PnL

${windowMinutes}-Minute Window Performance:
${windows.slice(0, 10).map(w => `- ${w.windowStart}-${w.windowEnd}: ${w.tradeCount} trades, $${w.totalPnL.toFixed(2)} PnL`).join('\n')}

Best ${windowMinutes}-min Window: ${bestWindow?.windowStart}-${bestWindow?.windowEnd} with $${bestWindow?.totalPnL.toFixed(2)} total PnL
Worst ${windowMinutes}-min Window: ${worstWindow?.windowStart}-${worstWindow?.windowEnd} with $${worstWindow?.totalPnL.toFixed(2)} total PnL`;
      break;
    }

    case 'extreme_trades': {
      const extremes = await getExtremeTrades(userId, accountId);
      data = extremes;

      context = `Extreme Trades:

Biggest Winner: ${extremes.biggestWinner
  ? `${extremes.biggestWinner.symbol} ${extremes.biggestWinner.side} on ${new Date(extremes.biggestWinner.tradeTime).toLocaleDateString()} - $${extremes.biggestWinner.result?.toFixed(2)} profit${extremes.biggestWinner.notes ? `\nNotes: ${extremes.biggestWinner.notes}` : ''}`
  : 'No winning trades found'}

Biggest Loser: ${extremes.biggestLoser
  ? `${extremes.biggestLoser.symbol} ${extremes.biggestLoser.side} on ${new Date(extremes.biggestLoser.tradeTime).toLocaleDateString()} - $${Math.abs(extremes.biggestLoser.result || 0).toFixed(2)} loss${extremes.biggestLoser.notes ? `\nNotes: ${extremes.biggestLoser.notes}` : ''}`
  : 'No losing trades found'}`;
      break;
    }

    case 'symbol_analysis': {
      const symbols = await getSymbolPerformance(userId, accountId);
      data = symbols;

      const top5 = symbols.byPnL.slice(0, 5);
      const bottom5 = symbols.byPnL.slice(-5).reverse();

      context = `Symbol Performance:

Top 5 by PnL:
${top5.map((s, i) => `${i + 1}. ${s.symbol}: $${s.totalPnL.toFixed(2)} (${s.tradeCount} trades, ${s.winRate.toFixed(1)}% win rate)`).join('\n')}

Bottom 5 by PnL:
${bottom5.map((s, i) => `${i + 1}. ${s.symbol}: $${s.totalPnL.toFixed(2)} (${s.tradeCount} trades, ${s.winRate.toFixed(1)}% win rate)`).join('\n')}

Most Traded:
${symbols.byCount.slice(0, 5).map((s, i) => `${i + 1}. ${s.symbol}: ${s.tradeCount} trades`).join('\n')}`;
      break;
    }

    case 'day_analysis': {
      const days = await getDayOfWeekPerformance(userId, accountId);
      data = { days };

      const bestDay = [...days].sort((a, b) => b.totalPnL - a.totalPnL)[0];
      const worstDay = [...days].sort((a, b) => a.totalPnL - b.totalPnL)[0];

      context = `Day of Week Performance:

${days.map(d => `- ${d.day}: ${d.tradeCount} trades, $${d.totalPnL.toFixed(2)} PnL, ${d.winRate.toFixed(1)}% win rate`).join('\n')}

Best Day: ${bestDay?.day} with $${bestDay?.totalPnL.toFixed(2)} total PnL
Worst Day: ${worstDay?.day} with $${worstDay?.totalPnL.toFixed(2)} total PnL`;
      break;
    }

    case 'strategy_analysis': {
      const strategies = await getStrategyPerformance(userId, accountId);
      data = strategies;

      const bestStrategy = strategies.byPnL[0];
      const worstStrategy = strategies.byPnL[strategies.byPnL.length - 1];

      context = `Strategy Performance:

${strategies.byPnL.length > 0 ? `By PnL:
${strategies.byPnL.map((s, i) => `${i + 1}. ${s.strategyName}: $${s.totalPnL.toFixed(2)} (${s.tradeCount} trades, ${s.winRate.toFixed(1)}% win rate)`).join('\n')}

Best Strategy: ${bestStrategy?.strategyName} with $${bestStrategy?.totalPnL.toFixed(2)} total PnL and ${bestStrategy?.winRate.toFixed(1)}% win rate
Worst Strategy: ${worstStrategy?.strategyName} with $${worstStrategy?.totalPnL.toFixed(2)} total PnL` : 'No trades with strategies found'}`;
      break;
    }

    case 'setup_analysis': {
      const setups = await getSetupPerformance(userId, accountId);
      data = setups;

      const bestSetup = setups.byPnL[0];
      const worstSetup = setups.byPnL[setups.byPnL.length - 1];

      context = `Setup Performance:

${setups.byPnL.length > 0 ? `By PnL:
${setups.byPnL.map((s, i) => `${i + 1}. "${s.setup}": $${s.totalPnL.toFixed(2)} (${s.tradeCount} trades, ${s.winRate.toFixed(1)}% win rate)`).join('\n')}

Best Setup: "${bestSetup?.setup}" with $${bestSetup?.totalPnL.toFixed(2)} total PnL and ${bestSetup?.winRate.toFixed(1)}% win rate
Worst Setup: "${worstSetup?.setup}" with $${worstSetup?.totalPnL.toFixed(2)} total PnL` : 'No trades with setups found'}`;
      break;
    }

    case 'rule_analysis': {
      const ruleData = await getRuleAdherence(userId, accountId);
      data = ruleData;

      context = `Rule Adherence Analysis:

Overall:
- Overall Adherence Rate: ${ruleData.overall.overallAdherenceRate.toFixed(1)}%
- Trades with Perfect Adherence: ${ruleData.overall.tradesWithPerfectAdherence}
- Trades with Broken Rules: ${ruleData.overall.tradesWithBrokenRules}
- Avg PnL when Following All Rules: $${ruleData.overall.avgPnLWithPerfectAdherence.toFixed(2)}
- Avg PnL when Breaking Rules: $${ruleData.overall.avgPnLWithBrokenRules.toFixed(2)}

${ruleData.mostBroken.length > 0 ? `Most Frequently Broken Rules:
${ruleData.mostBroken.map((r, i) => `${i + 1}. "${r.ruleText}" - ${r.adherenceRate.toFixed(1)}% adherence (Avg PnL when followed: $${r.avgPnLWhenFollowed.toFixed(2)}, when broken: $${r.avgPnLWhenBroken.toFixed(2)})`).join('\n')}` : 'No rule data found'}

${ruleData.mostCostly.length > 0 ? `Most Costly Rules to Break:
${ruleData.mostCostly.map((r, i) => `${i + 1}. "${r.ruleText}" - Breaking costs avg $${r.costOfBreaking.toFixed(2)} per trade`).join('\n')}` : ''}`;
      break;
    }

    case 'execution_analysis': {
      const execution = await getExecutionAnalytics(userId, accountId);
      data = execution;

      context = `Execution Quality Analysis:

Overall Execution Rate: ${execution.executionRate.toFixed(1)}%

Good Execution (PASS):
- Trades: ${execution.pass.count}
- Total PnL: $${execution.pass.totalPnL.toFixed(2)}
- Win Rate: ${execution.pass.winRate.toFixed(1)}%
- Avg PnL per Trade: $${execution.pass.avgPnL.toFixed(2)}

Poor Execution (FAIL):
- Trades: ${execution.fail.count}
- Total PnL: $${execution.fail.totalPnL.toFixed(2)}
- Win Rate: ${execution.fail.winRate.toFixed(1)}%
- Avg PnL per Trade: $${execution.fail.avgPnL.toFixed(2)}

Cost of Poor Execution: $${execution.costOfPoorExecution.toFixed(2)} per trade (difference between PASS and FAIL avg PnL)`;
      break;
    }

    default: {
      const overall = await getOverallStats(userId, accountId);
      data = overall;

      context = `Overall Statistics:

Total Trades: ${overall.totalTrades}
Winners: ${overall.winners} (${overall.winRate.toFixed(1)}%)
Losers: ${overall.losers}
Total PnL: $${overall.totalPnL.toFixed(2)}
Average PnL per Trade: $${overall.avgPnL.toFixed(2)}
Average Win: $${overall.avgWin.toFixed(2)}
Average Loss: $${overall.avgLoss.toFixed(2)}`;
      break;
    }
  }

  // Use LLM to generate natural language answer
  const client = getGroqClient();

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a trading analytics assistant. Answer the user's question based on the data provided. Be specific with numbers and provide actionable insights. Keep your response concise but informative.`,
      },
      {
        role: 'user',
        content: `Question: ${question}

Data:
${context}

Please answer the question based on this data. Include specific numbers and any patterns you notice.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const answer = completion.choices[0]?.message?.content || 'Unable to analyze the data.';

  return {
    type: 'analytics',
    answer,
    data,
    query: queryType,
  };
}
