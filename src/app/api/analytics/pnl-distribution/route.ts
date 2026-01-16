import { NextRequest, NextResponse } from 'next/server';
import { getPnLDistribution } from '@/lib/analytics';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-helpers';
import { parseTradeFiltersFromParams } from '@/lib/query-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const filters = parseTradeFiltersFromParams(request.nextUrl.searchParams, user.id);
    const data = await getPnLDistribution(filters);

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'fetching PnL distribution');
  }
}
