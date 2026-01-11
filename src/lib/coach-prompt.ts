import type { WeeklyStats } from './weekly-stats';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatters';

export interface PreviousWeekContext {
  weekRange: string;
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgWinnerR: number;
  avgLoserR: number;
  executionRate: number;
  summary: string;
  commonTheme: string | null;
  strengths: string[];
  improvements: string[];
  actionItems: string[];
}

export function buildCoachingPrompt(
  stats: WeeklyStats,
  previousWeek?: PreviousWeekContext | null
): string {
  const weekRange = `${format(stats.weekStart, 'MMM d')} - ${format(stats.weekEnd, 'MMM d, yyyy')}`;

  const strategyBreakdown = stats.strategyPerformance
    .map(
      (s) =>
        `  - ${s.name}: ${s.trades} trades, ${s.winRate.toFixed(1)}% win rate, ${formatCurrency(s.pnl)}`
    )
    .join('\n');

  const setupBreakdown = stats.setupPerformance
    .map(
      (s) =>
        `  - ${s.name}: ${s.trades} trades, ${s.winRate.toFixed(1)}% win rate, ${s.avgR.toFixed(2)}R avg, ${formatCurrency(s.pnl)}`
    )
    .join('\n');

  const moodBreakdown = Object.entries(stats.moodDistribution)
    .map(([mood, count]) => `  - ${mood}: ${count} trades`)
    .join('\n');

  const timeOfDayBreakdown = stats.timeOfDayPerformance
    .map(
      (t) =>
        `  - ${t.period}: ${t.trades} trades, ${t.winRate.toFixed(1)}% win rate, ${formatCurrency(t.pnl)}`
    )
    .join('\n');

  // Build previous week context section if available
  let previousWeekSection = '';
  if (previousWeek) {
    previousWeekSection = `
## Previous Week Context (${previousWeek.weekRange})
Use this to compare progress and track improvement on action items.

### Last Week's Metrics
- Total Trades: ${previousWeek.totalTrades}
- Win Rate: ${previousWeek.winRate.toFixed(1)}%
- Total P&L: ${formatCurrency(previousWeek.totalPnl)}
- Average Winner: ${previousWeek.avgWinnerR.toFixed(2)}R
- Average Loser: ${previousWeek.avgLoserR.toFixed(2)}R
- Execution Rate: ${previousWeek.executionRate.toFixed(1)}%

### Last Week's Summary
"${previousWeek.summary}"

### Last Week's Action Items (check if trader improved on these)
${previousWeek.actionItems.map((item, i) => `  ${i + 1}. ${item}`).join('\n')}

### Last Week's Areas for Improvement
${previousWeek.improvements.map((item) => `  - ${item}`).join('\n')}

`;
  }

  const jsonFormat = previousWeek
    ? `{
  "summary": "2-3 sentence executive summary of the week",
  "commonTheme": "identify any common themes in performance or psychology",
  "progressNotes": "compare to last week - note improvements, regressions, and progress on action items",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["area 1", "area 2", "area 3"],
  "actionItems": ["specific action 1", "specific action 2", "specific action 3"]
}`
    : `{
  "summary": "2-3 sentence executive summary of the week",
  "commonTheme": "identify any common themes in performance or psychology",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["area 1", "area 2", "area 3"],
  "actionItems": ["specific action 1", "specific action 2", "specific action 3"]
}`;

  return `Analyze this trader's weekly performance for ${weekRange} and provide coaching insights.
${previousWeekSection}
## This Week's Performance Metrics
- Total Trades: ${stats.totalTrades}
- Win Rate: ${stats.winRate.toFixed(1)}%
- Total P&L: ${formatCurrency(stats.totalPnl)}
- Average Winner: ${stats.avgWinnerR.toFixed(2)}R
- Average Loser: ${stats.avgLoserR.toFixed(2)}R
- Execution Rate (followed plan): ${stats.executionRate.toFixed(1)}%
- Largest Win: ${formatCurrency(stats.largestWin)}
- Largest Loss: ${formatCurrency(Math.abs(stats.largestLoss))}

## Day Analysis
- Best Day: ${stats.bestDay ? `${stats.bestDay.day} (${formatCurrency(stats.bestDay.pnl)})` : 'N/A'}
- Worst Day: ${stats.worstDay ? `${stats.worstDay.day} (${formatCurrency(stats.worstDay.pnl)})` : 'N/A'}

## Time of Day Analysis
${timeOfDayBreakdown || '  No time data available'}
- Best Time Period: ${stats.bestTimePeriod ? `${stats.bestTimePeriod.period} (${formatCurrency(stats.bestTimePeriod.pnl)})` : 'N/A'}
- Worst Time Period: ${stats.worstTimePeriod ? `${stats.worstTimePeriod.period} (${formatCurrency(stats.worstTimePeriod.pnl)})` : 'N/A'}

## Strategy Breakdown
${strategyBreakdown || '  No strategy data available'}

## Setup Analysis
${setupBreakdown || '  No setup data available'}

## Psychology
- Average Confidence Level: ${stats.avgConfidence?.toFixed(1) ?? 'Not tracked'}/10
- Most Common Mistake: ${stats.mostCommonMistake ?? 'None identified'}
- Pre-Trade Mood Distribution:
${moodBreakdown || '  No mood data available'}

## Symbols
- Symbols Traded: ${stats.symbolsTraded.join(', ') || 'None'}
- Top Symbol: ${stats.topSymbol ? `${stats.topSymbol.symbol} (${formatCurrency(stats.topSymbol.pnl)})` : 'N/A'}

Provide your analysis in the following JSON format:
${jsonFormat}`;
}
