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

    const strategy = await prisma.strategy.findFirst({
      where: { id, userId: user.id },
      include: {
        rules: {
          orderBy: { order: 'asc' },
        },
        screenshots: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { trades: true },
        },
      },
    });

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...strategy,
      setups: strategy.setups ? JSON.parse(strategy.setups) : [],
    });
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return NextResponse.json({ error: 'Failed to fetch strategy' }, { status: 500 });
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
    const existing = await prisma.strategy.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, setups, rules, isSwingStrategy } = body;

    // Update strategy with rules in a transaction
    const strategy = await prisma.$transaction(async (tx) => {
      // Delete existing rules and create new ones
      await tx.strategyRule.deleteMany({
        where: { strategyId: id },
      });

      // Create new rules if provided
      if (rules && rules.length > 0) {
        await tx.strategyRule.createMany({
          data: rules.map((text: string, index: number) => ({
            strategyId: id,
            text,
            order: index,
          })),
        });
      }

      // Update strategy
      return tx.strategy.update({
        where: { id },
        data: {
          name,
          description: description || null,
          setups: setups && setups.length > 0 ? JSON.stringify(setups) : null,
          isSwingStrategy: isSwingStrategy ?? existing.isSwingStrategy,
        },
        include: {
          rules: {
            orderBy: { order: 'asc' },
          },
          screenshots: true,
        },
      });
    });

    return NextResponse.json({
      ...strategy,
      setups: strategy.setups ? JSON.parse(strategy.setups) : [],
    });
  } catch (error) {
    console.error('Error updating strategy:', error);
    return NextResponse.json({ error: 'Failed to update strategy' }, { status: 500 });
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
    const existing = await prisma.strategy.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    await prisma.strategy.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    return NextResponse.json({ error: 'Failed to delete strategy' }, { status: 500 });
  }
}
