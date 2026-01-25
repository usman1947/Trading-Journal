import { NextRequest, NextResponse } from 'next/server';
import { runSetupProfilerV2 } from '@/lib/setup-profiler';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-helpers';
import { parseTradeFiltersFromParams } from '@/lib/query-helpers';
import type { SetupProfilerConfig } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/setup-profiler
 *
 * Returns pattern analysis with single-dimension breakdowns and insights.
 *
 * Query Parameters:
 * - timeInterval (optional): Time group interval in minutes (default: 5)
 *
 * - Standard TradeFilters:
 *   - dateFrom, dateTo: Date range
 *   - timeAfter, timeBefore: Time of day filter (HH:mm format)
 *   - symbol: Symbol filter (contains match)
 *   - strategyId: Filter by strategy
 *   - side: LONG | SHORT
 *   - execution: PASS | FAIL
 *   - setup: Filter by specific setup
 *   - accountId: Filter by account ('paper' or '' for paper account, null accountId)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;

    // Parse optional config
    const timeIntervalParam = searchParams.get('timeInterval');
    const timeGroupIntervalMins = timeIntervalParam ? parseInt(timeIntervalParam, 10) : 5;

    if (isNaN(timeGroupIntervalMins) || timeGroupIntervalMins < 1) {
      return NextResponse.json(
        { error: 'timeInterval must be a positive integer' },
        { status: 400 }
      );
    }

    // Parse standard trade filters (includes accountId for account separation)
    const filters = parseTradeFiltersFromParams(searchParams, user.id);

    // Config for V2 profiler
    const config: Partial<SetupProfilerConfig> = {
      timeGroupIntervalMins,
      filters,
    };

    // Use V2 profiler - analyzes dimensions independently with insights
    const results = await runSetupProfilerV2(user.id, config);

    return NextResponse.json(results);
  } catch (error) {
    return handleApiError(error, 'running pattern analysis');
  }
}
