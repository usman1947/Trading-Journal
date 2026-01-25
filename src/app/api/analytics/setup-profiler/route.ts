import { NextRequest, NextResponse } from 'next/server';
import { runSetupProfiler } from '@/lib/setup-profiler';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-helpers';
import { parseTradeFiltersFromParams } from '@/lib/query-helpers';
import type { ClusterDimension, SetupProfilerConfig } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Valid clustering dimensions for validation.
 */
const VALID_DIMENSIONS: ClusterDimension[] = [
  'setup',
  'strategy',
  'timeGroup',
  'execution',
  'side',
];

/**
 * Parse and validate dimensions from query parameter.
 */
function parseDimensions(dimensionsParam: string | null): ClusterDimension[] {
  if (!dimensionsParam) {
    // Default to all dimensions if not specified
    return ['setup', 'strategy', 'side'];
  }

  const dimensions = dimensionsParam.split(',').map((d) => d.trim()) as ClusterDimension[];

  // Validate each dimension
  for (const dim of dimensions) {
    if (!VALID_DIMENSIONS.includes(dim)) {
      throw new Error(
        `Invalid dimension: ${dim}. Valid dimensions are: ${VALID_DIMENSIONS.join(', ')}`
      );
    }
  }

  // Check for duplicates
  const uniqueDimensions = Array.from(new Set(dimensions));
  if (uniqueDimensions.length !== dimensions.length) {
    throw new Error('Duplicate dimensions are not allowed');
  }

  return uniqueDimensions;
}

/**
 * GET /api/analytics/setup-profiler
 *
 * Query Parameters:
 * - dimensions (optional): Comma-separated list of dimensions to cluster by
 *   Valid values: setup, strategy, timeGroup, execution, side
 *   Default: setup,strategy,side
 *   Example: ?dimensions=setup,side
 *
 * - minSampleSize (optional): Minimum trades required per cluster (default: 10)
 * - timeInterval (optional): Time group interval in minutes (default: 5)
 * - edgeThreshold (optional): Minimum expectancy R for edge classification (default: 0.5)
 * - leakThreshold (optional): Maximum expectancy R for leak classification (default: -0.3)
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

    // Parse dimensions (optional, has defaults)
    const dimensions = parseDimensions(searchParams.get('dimensions'));

    // Parse optional profiler config
    const minSampleSizeParam = searchParams.get('minSampleSize');
    const minSampleSize = minSampleSizeParam ? parseInt(minSampleSizeParam, 10) : 10;

    const timeIntervalParam = searchParams.get('timeInterval');
    const timeGroupIntervalMins = timeIntervalParam ? parseInt(timeIntervalParam, 10) : 5;

    const edgeThresholdParam = searchParams.get('edgeThreshold');
    const edgeExpectancyThreshold = edgeThresholdParam ? parseFloat(edgeThresholdParam) : 0.5;

    const leakThresholdParam = searchParams.get('leakThreshold');
    const leakExpectancyThreshold = leakThresholdParam ? parseFloat(leakThresholdParam) : -0.3;

    // Validate numeric params
    if (isNaN(minSampleSize) || minSampleSize < 1) {
      return NextResponse.json(
        { error: 'minSampleSize must be a positive integer' },
        { status: 400 }
      );
    }

    if (isNaN(timeGroupIntervalMins) || timeGroupIntervalMins < 1) {
      return NextResponse.json(
        { error: 'timeInterval must be a positive integer' },
        { status: 400 }
      );
    }

    // Parse standard trade filters (includes accountId for account separation)
    const filters = parseTradeFiltersFromParams(searchParams, user.id);

    // Combine into SetupProfilerConfig
    const config: Partial<SetupProfilerConfig> = {
      dimensions,
      minSampleSize,
      timeGroupIntervalMins,
      edgeExpectancyThreshold,
      leakExpectancyThreshold,
      filters,
    };

    const results = await runSetupProfiler(user.id, config);

    return NextResponse.json(results);
  } catch (error) {
    // Handle validation errors with 400 status
    if (error instanceof Error && error.message.includes('dimension')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return handleApiError(error, 'running setup profiler analysis');
  }
}
