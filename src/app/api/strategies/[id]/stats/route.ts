import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type TradeWithScreenshots = {
  result: number | null;
  risk: number;
  execution: string | null;
  isBreakEven: boolean;
  screenshots: unknown[];
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const accountIdParam = searchParams.get('accountId');

    // Build the trade filter based on accountId
    const tradeWhere: Record<string, unknown> = {};
    if (accountIdParam !== null) {
      if (accountIdParam === 'paper' || accountIdParam === '') {
        tradeWhere.accountId = null;
      } else {
        tradeWhere.accountId = accountIdParam;
      }
    }

    const strategy = await prisma.strategy.findUnique({
      where: { id },
      include: {
        trades: {
          where: tradeWhere,
          orderBy: { tradeTime: 'desc' },
          include: {
            screenshots: true,
          },
        },
        rules: {
          orderBy: { order: 'asc' },
        },
        screenshots: true,
      },
    });

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // Calculate stats - exclude BE trades from P&L analytics
    const closedTrades = strategy.trades.filter((t: TradeWithScreenshots) => t.result !== null);
    const beTrades = closedTrades.filter((t: TradeWithScreenshots) => t.isBreakEven);
    const nonBETrades = closedTrades.filter((t: TradeWithScreenshots) => !t.isBreakEven);
    const winningTrades = nonBETrades.filter((t: TradeWithScreenshots) => (t.result ?? 0) > 0);
    const losingTrades = nonBETrades.filter((t: TradeWithScreenshots) => (t.result ?? 0) < 0);
    const passingTrades = nonBETrades.filter((t: TradeWithScreenshots) => t.execution === 'PASS');

    const totalPnl = nonBETrades.reduce((sum: number, t: TradeWithScreenshots) => sum + (t.result ?? 0), 0);
    const totalRisk = nonBETrades.reduce((sum: number, t: TradeWithScreenshots) => sum + t.risk, 0);
    const totalWins = winningTrades.reduce((sum: number, t: TradeWithScreenshots) => sum + (t.result ?? 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum: number, t: TradeWithScreenshots) => sum + (t.result ?? 0), 0));

    const tradesWithResult = nonBETrades.filter((t: TradeWithScreenshots) => t.result !== null && t.risk > 0);
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
        rules: strategy.rules,
        screenshots: strategy.screenshots,
        createdAt: strategy.createdAt,
        updatedAt: strategy.updatedAt,
      },
      trades: strategy.trades,
      stats: {
        totalTrades: nonBETrades.length,
        openTrades: strategy.trades.length - closedTrades.length,
        breakEvenTrades: beTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate: nonBETrades.length > 0 ? (winningTrades.length / nonBETrades.length) * 100 : 0,
        totalPnl,
        totalRisk,
        averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
        averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
        profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
        averageRMultiple,
        largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t: TradeWithScreenshots) => t.result ?? 0)) : 0,
        largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t: TradeWithScreenshots) => t.result ?? 0)) : 0,
        executionRate: nonBETrades.length > 0 ? (passingTrades.length / nonBETrades.length) * 100 : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching strategy stats:', error);
    return NextResponse.json({ error: 'Failed to fetch strategy stats' }, { status: 500 });
  }
}
