import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-helpers';
import { applyAccountFilter, buildDateRangeFilter, filterByTimeOfDay } from '@/lib/query-helpers';
import { TRADE_FULL_INCLUDE } from '@/lib/prisma-includes';
import {
  calculateHoldDuration,
  calculateResultFromPartials,
  calculateSequenceInSession,
  serializePartials,
  normalizeSymbol,
} from '@/utils/trade-calculations';

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
    const timeAfter = searchParams.get('timeAfter');
    const timeBefore = searchParams.get('timeBefore');

    buildDateRangeFilter(where, dateFrom || undefined, dateTo || undefined);

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
      where.setup = setup;
    }

    applyAccountFilter(where, accountId);

    const allTrades = await prisma.trade.findMany({
      where,
      include: TRADE_FULL_INCLUDE,
      orderBy: { tradeTime: 'desc' },
    });

    const trades = filterByTimeOfDay(allTrades, timeAfter, timeBefore);

    return NextResponse.json(trades);
  } catch (error) {
    return handleApiError(error, 'fetching trades');
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
      partials,
      commission,
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

    // Calculate derived fields using helper functions
    const holdDurationMins = calculateHoldDuration(tradeDateTime, exitDateTime);
    const sequenceInSession = await calculateSequenceInSession(user.id, tradeDateTime);
    const finalResult = calculateResultFromPartials(partials) ?? result ?? null;

    const trade = await prisma.trade.create({
      data: {
        symbol: normalizeSymbol(symbol),
        side,
        tradeTime: tradeDateTime,
        exitTime: exitDateTime,
        setup: setup || null,
        risk,
        result: finalResult,
        partials: serializePartials(partials),
        commission: commission ?? 0,
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
      include: TRADE_FULL_INCLUDE,
    });

    return NextResponse.json(trade, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'creating trade');
  }
}
