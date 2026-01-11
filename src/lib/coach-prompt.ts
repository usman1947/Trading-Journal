import type { WeeklyStats } from './weekly-stats';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatters';

export function buildCoachingPrompt(stats: WeeklyStats): string {
  const weekRange = `${format(stats.weekStart, 'MMM d')} - ${format(stats.weekEnd, 'MMM d, yyyy')}`;

  const strategyBreakdown = stats.strategyPerformance
    .map(
      (s) =>
        `  - ${s.name}: ${s.trades} trades, ${s.winRate.toFixed(1)}% win rate, ${formatCurrency(s.pnl)}`
    )
    .join('\n');

  const moodBreakdown = Object.entries(stats.moodDistribution)
    .map(([mood, count]) => `  - ${mood}: ${count} trades`)
    .join('\n');

  return `Analyze this trader's weekly performance for ${weekRange} and provide coaching insights.

## Performance Metrics
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

## Strategy Breakdown
${strategyBreakdown || '  No strategy data available'}

## Psychology
- Average Confidence Level: ${stats.avgConfidence?.toFixed(1) ?? 'Not tracked'}/10
- Most Common Mistake: ${stats.mostCommonMistake ?? 'None identified'}
- Pre-Trade Mood Distribution:
${moodBreakdown || '  No mood data available'}

## Symbols
- Symbols Traded: ${stats.symbolsTraded.join(', ') || 'None'}
- Top Symbol: ${stats.topSymbol ? `${stats.topSymbol.symbol} (${formatCurrency(stats.topSymbol.pnl)})` : 'N/A'}

Provide your analysis in the following JSON format:
{
  "summary": "2-3 sentence executive summary of the week",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["area 1", "area 2", "area 3"],
  "actionItems": ["specific action 1", "specific action 2", "specific action 3"]
}`;
}
