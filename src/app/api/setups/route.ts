import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Get all unique setups from trades
    const trades = await prisma.trade.findMany({
      where: {
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
      .flatMap((s: { setups: string | null }) => {
        try {
          return s.setups ? JSON.parse(s.setups) : [];
        } catch {
          return [];
        }
      })
      .filter((s: unknown): s is string => typeof s === 'string' && s.trim() !== '');

    const allSetups = Array.from(new Set([...tradeSetups, ...strategySetups])).sort();

    return NextResponse.json(allSetups);
  } catch (error) {
    console.error('Error fetching setups:', error);
    return NextResponse.json({ error: 'Failed to fetch setups' }, { status: 500 });
  }
}
