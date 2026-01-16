import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-helpers';
import { deserializeSetups } from '@/utils/trade-calculations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    // Get all unique setups from trades
    const trades = await prisma.trade.findMany({
      where: {
        userId: user.id,
        setup: {
          not: null,
        },
      },
      select: {
        setup: true,
      },
      distinct: ['setup'],
    });

    // Get all setups from strategies
    const strategies = await prisma.strategy.findMany({
      where: {
        userId: user.id,
        setups: {
          not: null,
        },
      },
      select: {
        setups: true,
      },
    });

    // Combine and deduplicate
    const tradeSetups = trades
      .map((t: { setup: string | null }) => t.setup)
      .filter((s: string | null): s is string => s !== null && s.trim() !== '');

    const strategySetups = strategies
      .flatMap((s: { setups: string | null }) => deserializeSetups(s.setups))
      .filter((s: unknown): s is string => typeof s === 'string' && s.trim() !== '');

    const allSetups = Array.from(new Set([...tradeSetups, ...strategySetups])).sort();

    return NextResponse.json(allSetups);
  } catch (error) {
    return handleApiError(error, 'fetching setups');
  }
}
