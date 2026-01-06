import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

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

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    return NextResponse.json(trade);
  } catch (error) {
    console.error('Error fetching trade:', error);
    return NextResponse.json({ error: 'Failed to fetch trade' }, { status: 500 });
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
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
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

    // Recalculate holdDurationMins if both entry and exit times exist
    let holdDurationMins: number | null = null;
    if (exitDateTime) {
      holdDurationMins = Math.round((exitDateTime.getTime() - tradeDateTime.getTime()) / 60000);
    }

    const trade = await prisma.trade.update({
      where: { id },
      data: {
        symbol: symbol.toUpperCase(),
        side,
        tradeTime: tradeDateTime,
        exitTime: exitDateTime,
        setup: setup || null,
        risk,
        result: result ?? null,
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

    return NextResponse.json(trade);
  } catch (error) {
    console.error('Error updating trade:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
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
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    await prisma.trade.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
