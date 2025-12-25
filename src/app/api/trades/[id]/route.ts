import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const trade = await prisma.trade.findUnique({
      where: { id },
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
    const { id } = await params;
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

    const trade = await prisma.trade.update({
      where: { id },
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
    const { id } = await params;

    await prisma.trade.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
