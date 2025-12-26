import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const strategies = await prisma.strategy.findMany({
      include: {
        _count: {
          select: { trades: true },
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
    const body = await request.json();
    const { name, description, setups } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const strategy = await prisma.strategy.create({
      data: {
        name,
        description: description || null,
        setups: setups && setups.length > 0 ? JSON.stringify(setups) : null,
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
