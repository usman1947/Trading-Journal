import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError, validationError } from '@/lib/api-helpers';
import { applyAccountFilter } from '@/lib/query-helpers';
import { STRATEGY_WITH_RULES_INCLUDE } from '@/lib/prisma-includes';
import { deserializeSetups, serializeSetups } from '@/utils/trade-calculations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const accountIdParam = searchParams.get('accountId');

    // Build the trade count filter based on accountId
    const tradeCountWhere: Record<string, unknown> = { userId: user.id };
    applyAccountFilter(tradeCountWhere, accountIdParam);

    const strategies = await prisma.strategy.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            trades: {
              where: tradeCountWhere,
            },
          },
        },
        rules: {
          orderBy: { order: 'asc' as const },
        },
        screenshots: {
          orderBy: { createdAt: 'asc' as const },
        },
      },
      orderBy: { name: 'asc' as const },
    });

    // Parse setups JSON for each strategy
    const parsed = strategies.map((s: { setups: string | null; _count: { trades: number } }) => ({
      ...s,
      setups: deserializeSetups(s.setups),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    return handleApiError(error, 'fetching strategies');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const { name, description, setups, rules, isSwingStrategy } = body;

    if (!name) {
      return validationError('Name is required');
    }

    const strategy = await prisma.strategy.create({
      data: {
        name,
        description: description || null,
        setups: serializeSetups(setups),
        isSwingStrategy: isSwingStrategy ?? false,
        userId: user.id,
        rules: rules && rules.length > 0
          ? {
              create: rules.map((text: string, index: number) => ({
                text,
                order: index,
              })),
            }
          : undefined,
      },
      include: STRATEGY_WITH_RULES_INCLUDE,
    });

    return NextResponse.json(
      { ...strategy, setups: deserializeSetups(strategy.setups) },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'creating strategy');
  }
}
