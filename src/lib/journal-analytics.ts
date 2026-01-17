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

  return 'general_analytics';
}

// =============================================================================
// Analytics Queries
// =============================================================================

/**
 * Get hourly trading performance
 */
export async function getHourlyPerformance(userId: string): Promise<HourlyStats[]> {
  const trades = await prisma.trade.findMany({
    where: { userId, result: { not: null } },
    select: {
      tradeTime: true,
      result: true,
    },
  });

  // Group by hour
  const hourlyMap = new Map<number, { pnl: number; count: number; wins: number }>();

  for (const trade of trades) {
    const hour = new Date(trade.tradeTime).getHours();
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
 * Get time window performance (e.g., 5-minute windows)
 */
export async function getTimeWindowPerformance(
  userId: string,
  windowMinutes: number = 30
): Promise<TimeWindowStats[]> {
  const trades = await prisma.trade.findMany({
    where: { userId, result: { not: null } },
    select: {
      tradeTime: true,
      result: true,
    },
  });

  // Group by time window
  const windowMap = new Map<string, { pnl: number; count: number; wins: number }>();

  for (const trade of trades) {
    const date = new Date(trade.tradeTime);
    const minutes = date.getHours() * 60 + date.getMinutes();
    const windowStart = Math.floor(minutes / windowMinutes) * windowMinutes;
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
export async function getExtremeTrades(userId: string) {
  const [biggestWinner, biggestLoser] = await Promise.all([
    prisma.trade.findFirst({
      where: { userId, result: { gt: 0 } },
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
      where: { userId, result: { lt: 0 } },
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
export async function getOverallStats(userId: string) {
  const trades = await prisma.trade.findMany({
    where: { userId, result: { not: null } },
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
export async function getSymbolPerformance(userId: string) {
  const trades = await prisma.trade.findMany({
    where: { userId, result: { not: null } },
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
 * Get day of week performance
 */
export async function getDayOfWeekPerformance(userId: string) {
  const trades = await prisma.trade.findMany({
    where: { userId, result: { not: null } },
    select: {
      tradeTime: true,
      result: true,
    },
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayMap = new Map<number, { pnl: number; count: number; wins: number }>();

  for (const trade of trades) {
    const day = new Date(trade.tradeTime).getDay();
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

// =============================================================================
// Main Analytics Handler
// =============================================================================

/**
 * Run analytics query and generate natural language response
 */
export async function runAnalyticsQuery(
  question: string,
  userId: string
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

      const hourly = await getHourlyPerformance(userId);
      const windows = await getTimeWindowPerformance(userId, windowMinutes);

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
      const extremes = await getExtremeTrades(userId);
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
      const symbols = await getSymbolPerformance(userId);
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
      const days = await getDayOfWeekPerformance(userId);
      data = { days };

      const bestDay = [...days].sort((a, b) => b.totalPnL - a.totalPnL)[0];
      const worstDay = [...days].sort((a, b) => a.totalPnL - b.totalPnL)[0];

      context = `Day of Week Performance:

${days.map(d => `- ${d.day}: ${d.tradeCount} trades, $${d.totalPnL.toFixed(2)} PnL, ${d.winRate.toFixed(1)}% win rate`).join('\n')}

Best Day: ${bestDay?.day} with $${bestDay?.totalPnL.toFixed(2)} total PnL
Worst Day: ${worstDay?.day} with $${worstDay?.totalPnL.toFixed(2)} total PnL`;
      break;
    }

    default: {
      const overall = await getOverallStats(userId);
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
