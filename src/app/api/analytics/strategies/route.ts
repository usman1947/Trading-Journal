import { NextResponse } from 'next/server';
import { getStrategyStats } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getStrategyStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching strategy stats:', error);
    return NextResponse.json({ error: 'Failed to fetch strategy stats' }, { status: 500 });
  }
}
