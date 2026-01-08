import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const accountIdParam = searchParams.get('accountId');

    // Build the trade count filter based on accountId
    const tradeCountWhere: Record<string, unknown> = { userId: user.id };
    if (accountIdParam !== null) {
      if (accountIdParam === 'paper' || accountIdParam === '') {
        tradeCountWhere.accountId = null;
      } else {
        tradeCountWhere.accountId = accountIdParam;
      }
    }

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
          orderBy: { order: 'asc' },
        },
        screenshots: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Parse setups JSON for each strategy
    const parsed = strategies.map((s: { setups: string | null; _count: { trades: number } }) => ({
      ...s,
      setups: s.setups ? JSON.parse(s.setups) : [],
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return NextResponse.json({ error: 'Failed to fetch strategies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const { name, description, setups, rules, isSwingStrategy } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const strategy = await prisma.strategy.create({
      data: {
        name,
        description: description || null,
        setups: setups && setups.length > 0 ? JSON.stringify(setups) : null,
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
      include: {
        rules: {
          orderBy: { order: 'asc' },
        },
        screenshots: true,
      },
    });

    return NextResponse.json(
      { ...strategy, setups: strategy.setups ? JSON.parse(strategy.setups) : [] },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating strategy:', error);
    return NextResponse.json({ error: 'Failed to create strategy' }, { status: 500 });
  }
}
