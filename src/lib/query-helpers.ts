import type { TradeFilters } from '@/types';

/**
 * Apply account filter to a Prisma where clause.
 * Handles 'paper' account logic where 'paper' or empty string maps to null accountId.
 *
 * @param where - The Prisma where clause object to modify
 * @param accountId - The account ID to filter by (null/undefined/'paper'/'' for paper account)
 */
export function applyAccountFilter(
  where: Record<string, unknown>,
  accountId: string | null | undefined
): void {
  if (accountId !== undefined && accountId !== null) {
    if (accountId === 'paper' || accountId === '') {
      where.accountId = null;
    } else {
      where.accountId = accountId;
    }
  }
}

/**
 * Apply user filter to a Prisma where clause.
 *
 * @param where - The Prisma where clause object to modify
 * @param userId - The user ID to filter by
 */
export function applyUserFilter(where: Record<string, unknown>, userId: string | undefined): void {
  if (userId) {
    where.userId = userId;
  }
}

/**
 * Apply date range filter to a Prisma where clause.
 * Modifies the tradeTime field to include gte and lte constraints.
 *
 * @param where - The Prisma where clause object to modify
 * @param dateFrom - Start date (inclusive)
 * @param dateTo - End date (inclusive)
 */
export function buildDateRangeFilter(
  where: Record<string, unknown>,
  dateFrom?: string,
  dateTo?: string
): void {
  if (dateFrom) {
    where.tradeTime = { ...((where.tradeTime as object) || {}), gte: new Date(dateFrom) };
  }
  if (dateTo) {
    where.tradeTime = { ...((where.tradeTime as object) || {}), lte: new Date(dateTo) };
  }
}

/**
 * Build a complete Prisma where clause from TradeFilters.
 * Combines all filter logic into a single reusable function.
 *
 * @param filters - TradeFilters object with filter criteria
 * @param userId - User ID to filter by (optional if already in filters)
 * @returns Prisma where clause object
 */
export function buildTradeFilters(
  filters: TradeFilters = {},
  userId?: string
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  // Apply user filter
  applyUserFilter(where, filters.userId || userId);

  // Apply date range filter
  buildDateRangeFilter(where, filters.dateFrom, filters.dateTo);

  // Apply field filters
  if (filters.symbol) {
    where.symbol = { contains: filters.symbol };
  }
  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }
  if (filters.side) {
    where.side = filters.side;
  }
  if (filters.execution) {
    where.execution = filters.execution;
  }
  if (filters.setup) {
    where.setup = filters.setup;
  }
  if (filters.resultMin !== undefined || filters.resultMax !== undefined) {
    where.result = {};
    if (filters.resultMin !== undefined) {
      (where.result as Record<string, unknown>).gte = filters.resultMin;
    }
    if (filters.resultMax !== undefined) {
      (where.result as Record<string, unknown>).lte = filters.resultMax;
    }
  }

  // Apply account filter
  applyAccountFilter(where, filters.accountId);

  return where;
}

/**
 * Filter trades by time of day in HH:mm format.
 * Uses America/New_York timezone to match trade time display.
 *
 * @param trades - Array of trades with tradeTime property
 * @param timeAfter - Start time in HH:mm format (e.g., "09:30")
 * @param timeBefore - End time in HH:mm format (e.g., "16:00")
 * @returns Filtered array of trades
 */
export function filterByTimeOfDay<T extends { tradeTime: Date }>(
  trades: T[],
  timeAfter?: string | null,
  timeBefore?: string | null
): T[] {
  if (!timeAfter && !timeBefore) return trades;

  return trades.filter((trade) => {
    const tradeDate = new Date(trade.tradeTime);
    // Use America/New_York timezone to match trade time display
    const timeStr = tradeDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    });

    if (timeAfter && timeStr < timeAfter) return false;
    if (timeBefore && timeStr > timeBefore) return false;
    return true;
  });
}

/**
 * Filter trades by minimum checklist adherence percentage.
 * Checklist adherence is calculated from 4 boolean fields: checkPlan, checkJudge, checkExecute, checkManage.
 *
 * @param trades - Array of trades with checklist boolean fields
 * @param minPercent - Minimum adherence percentage (0-100)
 * @returns Filtered array of trades meeting the minimum threshold
 */
export function filterByChecklistAdherence<
  T extends {
    checkPlan: boolean;
    checkJudge: boolean;
    checkExecute: boolean;
    checkManage: boolean;
  },
>(trades: T[], minPercent?: number): T[] {
  if (!minPercent || minPercent <= 0) return trades;

  return trades.filter((t) => {
    const checked = [t.checkPlan, t.checkJudge, t.checkExecute, t.checkManage].filter(
      Boolean
    ).length;
    return (checked / 4) * 100 >= minPercent;
  });
}

/**
 * Filter out break-even trades from an array.
 *
 * @param trades - Array of trades with isBreakEven property
 * @returns Filtered array excluding break-even trades
 */
export function excludeBreakevenTrades<T extends { isBreakEven: boolean }>(trades: T[]): T[] {
  return trades.filter((t) => !t.isBreakEven);
}

/**
 * Filter trades into winning and losing groups.
 * Excludes break-even trades by default.
 *
 * @param trades - Array of trades with result and isBreakEven properties
 * @returns Object with winningTrades and losingTrades arrays
 */
export function separateWinLossTrades<T extends { result: number | null; isBreakEven: boolean }>(
  trades: T[]
): { winningTrades: T[]; losingTrades: T[] } {
  const nonBETrades = excludeBreakevenTrades(trades);

  const winningTrades = nonBETrades.filter((t) => (t.result ?? 0) > 0);
  const losingTrades = nonBETrades.filter((t) => (t.result ?? 0) < 0);

  return { winningTrades, losingTrades };
}

/**
 * Parse trade filters from Next.js request search params.
 * Converts URLSearchParams to TradeFilters object with proper typing.
 *
 * @param searchParams - URLSearchParams from Next.js request
 * @param userId - User ID to include in filters
 * @returns TradeFilters object
 */
export function parseTradeFiltersFromParams(
  searchParams: URLSearchParams,
  userId: string
): import('@/types').TradeFilters {
  const accountIdParam = searchParams.get('accountId');

  return {
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    timeAfter: searchParams.get('timeAfter') || undefined,
    timeBefore: searchParams.get('timeBefore') || undefined,
    symbol: searchParams.get('symbol') || undefined,
    strategyId: searchParams.get('strategyId') || undefined,
    side: (searchParams.get('side') as 'LONG' | 'SHORT') || undefined,
    execution: (searchParams.get('execution') as 'PASS' | 'FAIL') || undefined,
    setup: searchParams.get('setup') || undefined,
    accountId: accountIdParam !== null ? accountIdParam : undefined,
    minChecklistPercent: searchParams.get('minChecklistPercent')
      ? Number(searchParams.get('minChecklistPercent'))
      : undefined,
    userId,
  };
}
