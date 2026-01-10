import { NextRequest, NextResponse } from 'next/server';
import { getStrategyDistribution } from '@/lib/analytics';
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
    if (searchParams.get('side')) {
      filters.side = searchParams.get('side') as 'LONG' | 'SHORT';
    }
    if (searchParams.get('execution')) {
      filters.execution = searchParams.get('execution') as 'PASS' | 'FAIL';
    }
    if (searchParams.get('strategyId')) {
      filters.strategyId = searchParams.get('strategyId')!;
    }
    if (searchParams.get('setup')) {
      filters.setup = searchParams.get('setup')!;
    }
    if (searchParams.get('symbol')) {
      filters.symbol = searchParams.get('symbol')!;
    }
    if (searchParams.get('timeAfter')) {
      filters.timeAfter = searchParams.get('timeAfter')!;
    }
    if (searchParams.get('timeBefore')) {
      filters.timeBefore = searchParams.get('timeBefore')!;
    }
    const accountIdParam = searchParams.get('accountId');
    if (accountIdParam !== null) {
      filters.accountId = accountIdParam || null;
    }

    const data = await getStrategyDistribution(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Strategy distribution error:', error);
    return NextResponse.json({ error: 'Failed to fetch strategy distribution' }, { status: 500 });
  }
}
