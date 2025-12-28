import { NextRequest, NextResponse } from 'next/server';
import { getDailyStats } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountIdParam = searchParams.get('accountId');
    const filters = {
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      accountId: accountIdParam !== null ? accountIdParam : undefined,
    };

    const stats = await getDailyStats(filters);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return NextResponse.json({ error: 'Failed to fetch daily stats' }, { status: 500 });
  }
}
