import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/analytics';
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
      timeAfter: searchParams.get('timeAfter') || undefined,
      timeBefore: searchParams.get('timeBefore') || undefined,
      symbol: searchParams.get('symbol') || undefined,
      strategyId: searchParams.get('strategyId') || undefined,
      side: searchParams.get('side') as 'LONG' | 'SHORT' | undefined,
      execution: searchParams.get('execution') as 'PASS' | 'FAIL' | undefined,
      setup: searchParams.get('setup') || undefined,
      accountId: accountIdParam !== null ? accountIdParam : undefined,
      userId: user.id,
    };

    const analytics = await getAnalytics(filters);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
