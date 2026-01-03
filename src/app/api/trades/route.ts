import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const where: Record<string, unknown> = { userId: user.id };

    // Apply filters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const symbol = searchParams.get('symbol');
    const side = searchParams.get('side');
    const execution = searchParams.get('execution');
    const strategyId = searchParams.get('strategyId');
    const setup = searchParams.get('setup');
    const accountId = searchParams.get('accountId');

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
    // Handle accountId filter - 'paper' or null means Paper Account (accountId is null)
    if (accountId !== undefined && accountId !== null) {
      if (accountId === 'paper' || accountId === '') {
        where.accountId = null;
      } else {
        where.accountId = accountId;
      }
    }

    const trades = await prisma.trade.findMany({
      where,
      include: {
        strategy: {
          include: {
            rules: {
              orderBy: { order: 'asc' },
            },
          },
        },
        account: true,
        screenshots: true,
        tags: {
          include: {
            tag: true,
          },
        },
        ruleChecks: {
          include: {
            rule: true,
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
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const {
      symbol,
      side,
      tradeTime,
      exitTime,
      setup,
      risk,
      result,
      execution,
      isBreakEven,
      notes,
      strategyId,
      accountId,
      // AI-ready fields
      preTradeMood,
      postTradeMood,
      confidenceLevel,
      mistake,
    } = body;

    const tradeDateTime = new Date(tradeTime);
    const exitDateTime = exitTime ? new Date(exitTime) : null;

    // Calculate holdDurationMins if both entry and exit times exist
    let holdDurationMins: number | null = null;
    if (exitDateTime) {
      holdDurationMins = Math.round((exitDateTime.getTime() - tradeDateTime.getTime()) / 60000);
    }

    // Calculate sequenceInSession (count trades for same user on same date)
    const startOfDay = new Date(tradeDateTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(tradeDateTime);
    endOfDay.setHours(23, 59, 59, 999);

    const tradesOnSameDay = await prisma.trade.count({
      where: {
        userId: user.id,
        tradeTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
    const sequenceInSession = tradesOnSameDay + 1;

    const trade = await prisma.trade.create({
      data: {
        symbol: symbol.toUpperCase(),
        side,
        tradeTime: tradeDateTime,
        exitTime: exitDateTime,
        setup: setup || null,
        risk,
        result: result ?? null,
        execution,
        isBreakEven: isBreakEven || false,
        notes: notes || null,
        strategyId: strategyId || null,
        accountId: accountId || null,
        userId: user.id,
        // AI-ready fields
        preTradeMood: preTradeMood || null,
        postTradeMood: postTradeMood || null,
        confidenceLevel: confidenceLevel ?? null,
        mistake: mistake || null,
        sequenceInSession,
        holdDurationMins,
      },
      include: {
        strategy: {
          include: {
            rules: {
              orderBy: { order: 'asc' },
            },
          },
        },
        account: true,
        screenshots: true,
        tags: {
          include: {
            tag: true,
          },
        },
        ruleChecks: {
          include: {
            rule: true,
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
