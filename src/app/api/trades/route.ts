import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const where: Record<string, unknown> = {};

    // Apply filters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const symbol = searchParams.get('symbol');
    const side = searchParams.get('side');
    const execution = searchParams.get('execution');
    const strategyId = searchParams.get('strategyId');
    const setup = searchParams.get('setup');

    if (dateFrom) {
      where.tradeTime = { ...(where.tradeTime as object || {}), gte: new Date(dateFrom) };
    }
    if (dateTo) {
      where.tradeTime = { ...(where.tradeTime as object || {}), lte: new Date(dateTo) };
    }
    if (symbol) {
      where.symbol = { contains: symbol };
    }
    if (side) {
      where.side = side;
    }
    if (execution) {
      where.execution = execution;
    }
    if (strategyId) {
      where.strategyId = strategyId;
    }
    if (setup) {
      where.setup = { contains: setup };
    }

    const trades = await prisma.trade.findMany({
      where,
      include: {
        strategy: true,
        screenshots: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { tradeTime: 'desc' },
    });

    return NextResponse.json(trades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      symbol,
      side,
      tradeTime,
      setup,
      risk,
      result,
      execution,
      notes,
      strategyId,
    } = body;

    const trade = await prisma.trade.create({
      data: {
        symbol: symbol.toUpperCase(),
        side,
        tradeTime: new Date(tradeTime),
        setup: setup || null,
        risk,
        result: result ?? null,
        execution,
        notes: notes || null,
        strategyId: strategyId || null,
      },
      include: {
        strategy: true,
        screenshots: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json(trade, { status: 201 });
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}
