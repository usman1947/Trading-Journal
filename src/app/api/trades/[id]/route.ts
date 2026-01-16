import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError, notFoundResponse, successResponse } from '@/lib/api-helpers';
import { TRADE_FULL_INCLUDE } from '@/lib/prisma-includes';
import {
  calculateHoldDuration,
  calculateResultFromPartials,
  serializePartials,
  normalizeSymbol,
} from '@/utils/trade-calculations';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const trade = await prisma.trade.findFirst({
      where: { id, userId: user.id },
      include: TRADE_FULL_INCLUDE,
    });

    if (!trade) {
      return notFoundResponse('Trade');
    }

    return NextResponse.json(trade);
  } catch (error) {
    return handleApiError(error, 'fetching trade');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.trade.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return notFoundResponse('Trade');
    }

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

    // Recalculate derived fields using helper functions
    const holdDurationMins = calculateHoldDuration(tradeDateTime, exitDateTime);
    const finalResult = calculateResultFromPartials(partials) ?? result ?? null;

    const trade = await prisma.trade.update({
      where: { id },
      data: {
        symbol: normalizeSymbol(symbol),
        side,
        tradeTime: tradeDateTime,
        exitTime: exitDateTime,
        setup: setup || null,
        risk,
        result: finalResult,
        partials: partials !== undefined ? serializePartials(partials) : undefined,
        commission: commission ?? 0,
        execution,
        isBreakEven: isBreakEven ?? undefined,
        notes: notes || null,
        strategyId: strategyId || null,
        accountId: accountId !== undefined ? (accountId || null) : undefined,
        // AI-ready fields
        preTradeMood: preTradeMood || null,
        postTradeMood: postTradeMood || null,
        confidenceLevel: confidenceLevel ?? null,
        mistake: mistake || null,
        holdDurationMins,
      },
      include: TRADE_FULL_INCLUDE,
    });

    return NextResponse.json(trade);
  } catch (error) {
    return handleApiError(error, 'updating trade');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.trade.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return notFoundResponse('Trade');
    }

    await prisma.trade.delete({
      where: { id },
    });

    return successResponse();
  } catch (error) {
    return handleApiError(error, 'deleting trade');
  }
}
