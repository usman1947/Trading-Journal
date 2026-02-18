import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// Get all rule checks for a trade
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id: tradeId } = await params;

    // Verify trade ownership
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId: user.id },
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const ruleChecks = await prisma.tradeRuleCheck.findMany({
      where: { tradeId },
      include: {
        rule: true,
      },
      orderBy: {
        rule: {
          order: 'asc',
        },
      },
    });

    return NextResponse.json(ruleChecks);
  } catch (error) {
    console.error('Error fetching rule checks:', error);
    return NextResponse.json({ error: 'Failed to fetch rule checks' }, { status: 500 });
  }
}

// Update rule checks for a trade (bulk update)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id: tradeId } = await params;

    // Verify trade ownership
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId: user.id },
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const body = await request.json();
    const { ruleChecks } = body; // Array of { ruleId: string, checked: boolean }

    if (!Array.isArray(ruleChecks)) {
      return NextResponse.json({ error: 'ruleChecks must be an array' }, { status: 400 });
    }

    // Upsert each rule check
    const results = await prisma.$transaction(
      ruleChecks.map((check: { ruleId: string; checked: boolean }) =>
        prisma.tradeRuleCheck.upsert({
          where: {
            tradeId_ruleId: {
              tradeId,
              ruleId: check.ruleId,
            },
          },
          update: {
            checked: check.checked,
          },
          create: {
            tradeId,
            ruleId: check.ruleId,
            checked: check.checked,
          },
          include: {
            rule: true,
          },
        })
      )
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error updating rule checks:', error);
    return NextResponse.json({ error: 'Failed to update rule checks' }, { status: 500 });
  }
}
