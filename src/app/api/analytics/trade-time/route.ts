import { NextRequest, NextResponse } from 'next/server';
import { getTradeTimeDistribution } from '@/lib/analytics';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import type { TradeFilters } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const filters: TradeFilters = { userId: user.id };

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = searchParams.get('dateFrom')!;
    }
    if (searchParams.get('dateTo')) {
      filters.dateTo = searchParams.get('dateTo')!;
    }
    if (searchParams.get('strategyId')) {
      filters.strategyId = searchParams.get('strategyId')!;
    }
    const accountIdParam = searchParams.get('accountId');
    if (accountIdParam !== null) {
      filters.accountId = accountIdParam || null;
    }

    const data = await getTradeTimeDistribution(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Trade time distribution error:', error);
    return NextResponse.json({ error: 'Failed to fetch trade time distribution' }, { status: 500 });
  }
}
