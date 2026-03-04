/**
 * Reusable Prisma include configurations for consistent query results.
 * These constants ensure all API endpoints return the same related data structure.
 */

import type { Prisma } from '@prisma/client';

/**
 * Full trade include with all relations.
 * Includes strategy, account, screenshots, and tags.
 */
export const TRADE_FULL_INCLUDE = {
  strategy: true,
  account: true,
  screenshots: true,
  tags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.TradeInclude;

/**
 * Journal entry include with screenshots.
 */
export const JOURNAL_WITH_SCREENSHOTS_INCLUDE = {
  screenshots: true,
} satisfies Prisma.DailyJournalInclude;

/**
 * Trade include for list views (minimal relations).
 * Only includes essential data for display in tables.
 */
export const TRADE_LIST_INCLUDE = {
  strategy: {
    select: {
      id: true,
      name: true,
    },
  },
  account: {
    select: {
      id: true,
      name: true,
      isSwingAccount: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.TradeInclude;

/**
 * Strategy include for list views.
 */
export const STRATEGY_LIST_INCLUDE = {
  _count: {
    select: {
      trades: true,
    },
  },
} satisfies Prisma.StrategyInclude;
