import { NextRequest, NextResponse } from 'next/server';
import { getTimeDayProfitability } from '@/lib/analytics';
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
    if (searchParams.get('strategyId')) {
      filters.strategyId = searchParams.get('strategyId')!;
    }

    const data = await getTimeDayProfitability(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Time/day profitability error:', error);
    return NextResponse.json({ error: 'Failed to fetch time/day profitability' }, { status: 500 });
  }
}
