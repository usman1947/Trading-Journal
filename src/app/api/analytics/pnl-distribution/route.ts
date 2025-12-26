import { NextRequest, NextResponse } from 'next/server';
import { getPnLDistribution } from '@/lib/analytics';
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

    const data = await getPnLDistribution(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error('PnL distribution error:', error);
    return NextResponse.json({ error: 'Failed to fetch PnL distribution' }, { status: 500 });
  }
}
