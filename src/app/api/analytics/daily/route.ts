import { NextRequest, NextResponse } from 'next/server';
import { getDailyStats } from '@/lib/analytics';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-helpers';
import { parseTradeFiltersFromParams } from '@/lib/query-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const filters = parseTradeFiltersFromParams(request.nextUrl.searchParams, user.id);
    const stats = await getDailyStats(filters);

    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error, 'fetching daily stats');
  }
}
