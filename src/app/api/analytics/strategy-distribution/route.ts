import { NextRequest, NextResponse } from 'next/server';
import { getStrategyDistribution } from '@/lib/analytics';
import type { TradeFilters } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters: TradeFilters = {};

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = searchParams.get('dateFrom')!;
    }
    if (searchParams.get('dateTo')) {
      filters.dateTo = searchParams.get('dateTo')!;
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
