import { NextRequest, NextResponse } from 'next/server';
import { getTradeTimeStats } from '@/lib/analytics';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const accountIdParam = searchParams.get('accountId');
    const filters = {
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      strategyId: searchParams.get('strategyId') || undefined,
      side: searchParams.get('side') as 'LONG' | 'SHORT' | undefined,
      execution: searchParams.get('execution') as 'PASS' | 'FAIL' | undefined,
      accountId: accountIdParam !== null ? accountIdParam : undefined,
      userId: user.id,
    };

    const stats = await getTradeTimeStats(filters);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching trade time stats:', error);
    return NextResponse.json({ error: 'Failed to fetch trade time stats' }, { status: 500 });
  }
}
