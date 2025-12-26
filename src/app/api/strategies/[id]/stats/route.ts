import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type TradeWithScreenshots = {
  result: number | null;
  risk: number;
  execution: string | null;
  screenshots: unknown[];
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const strategy = await prisma.strategy.findUnique({
      where: { id },
      include: {
        trades: {
          orderBy: { tradeTime: 'desc' },
          include: {
            screenshots: true,
          },
        },
      },
    });

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // Calculate stats
    const closedTrades = strategy.trades.filter((t: TradeWithScreenshots) => t.result !== null);
    const winningTrades = closedTrades.filter((t: TradeWithScreenshots) => (t.result ?? 0) > 0);
    const losingTrades = closedTrades.filter((t: TradeWithScreenshots) => (t.result ?? 0) < 0);
    const passingTrades = closedTrades.filter((t: TradeWithScreenshots) => t.execution === 'PASS');

    const totalPnl = closedTrades.reduce((sum: number, t: TradeWithScreenshots) => sum + (t.result ?? 0), 0);
    const totalRisk = closedTrades.reduce((sum: number, t: TradeWithScreenshots) => sum + t.risk, 0);
    const totalWins = winningTrades.reduce((sum: number, t: TradeWithScreenshots) => sum + (t.result ?? 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum: number, t: TradeWithScreenshots) => sum + (t.result ?? 0), 0));

    const tradesWithResult = closedTrades.filter((t: TradeWithScreenshots) => t.result !== null && t.risk > 0);
    const averageRMultiple =
      tradesWithResult.length > 0
        ? tradesWithResult.reduce((sum: number, t: TradeWithScreenshots) => sum + ((t.result ?? 0) / t.risk), 0) / tradesWithResult.length
        : 0;

    // Parse setups from JSON
    const setups = strategy.setups ? JSON.parse(strategy.setups) : [];

    return NextResponse.json({
      strategy: {
        id: strategy.id,
        name: strategy.name,
        description: strategy.description,
        setups,
        createdAt: strategy.createdAt,
        updatedAt: strategy.updatedAt,
      },
      trades: strategy.trades,
      stats: {
        totalTrades: closedTrades.length,
        openTrades: strategy.trades.length - closedTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
        totalPnl,
        totalRisk,
        averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
        averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
        profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
        averageRMultiple,
        largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t: TradeWithScreenshots) => t.result ?? 0)) : 0,
        largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t: TradeWithScreenshots) => t.result ?? 0)) : 0,
        executionRate: closedTrades.length > 0 ? (passingTrades.length / closedTrades.length) * 100 : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching strategy stats:', error);
    return NextResponse.json({ error: 'Failed to fetch strategy stats' }, { status: 500 });
  }
}
