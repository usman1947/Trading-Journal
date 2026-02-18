import prisma from '@/lib/prisma';

/**
 * Calculate hold duration in minutes between entry and exit times.
 *
 * @param entryTime - Trade entry time
 * @param exitTime - Trade exit time (null if trade is still open)
 * @returns Hold duration in minutes, or null if exitTime is null
 */
export function calculateHoldDuration(entryTime: Date, exitTime: Date | null): number | null {
  if (!exitTime) return null;

  return Math.round((exitTime.getTime() - entryTime.getTime()) / 60000);
}

/**
 * Calculate the total result from an array of partials.
 * Partials represent multiple exit points in a single trade.
 *
 * @param partials - Array of partial results
 * @returns Sum of all partials, or null if array is empty/null
 */
export function calculateResultFromPartials(partials: number[] | null | undefined): number | null {
  if (!partials || !Array.isArray(partials) || partials.length === 0) {
    return null;
  }

  return partials.reduce((sum, p) => sum + p, 0);
}

/**
 * Calculate the trade sequence number for a given day.
 * This represents which trade number this is for the user on the specified date.
 *
 * @param userId - User ID
 * @param tradeTime - Trade time to determine the date
 * @returns The sequence number (1-based) for this trade in the session
 */
export async function calculateSequenceInSession(userId: string, tradeTime: Date): Promise<number> {
  const startOfDay = new Date(tradeTime);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(tradeTime);
  endOfDay.setHours(23, 59, 59, 999);

  const tradesOnSameDay = await prisma.trade.count({
    where: {
      userId,
      tradeTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  return tradesOnSameDay + 1;
}

/**
 * Serialize partials array to JSON string for database storage.
 * Only serializes if array is non-empty.
 *
 * @param partials - Array of partial results
 * @returns JSON string or null
 */
export function serializePartials(partials: number[] | null | undefined): string | null {
  if (!partials || !Array.isArray(partials) || partials.length === 0) {
    return null;
  }

  return JSON.stringify(partials);
}

/**
 * Deserialize partials from JSON string to array.
 *
 * @param partials - JSON string or already-parsed array
 * @returns Array of numbers or empty array
 */
export function deserializePartials(partials: string | number[] | null | undefined): number[] {
  if (!partials) return [];

  if (typeof partials === 'string') {
    try {
      const parsed = JSON.parse(partials);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(partials) ? partials : [];
}

/**
 * Serialize strategy setups array to JSON string for database storage.
 *
 * @param setups - Array of setup strings
 * @returns JSON string or null
 */
export function serializeSetups(setups: string[] | null | undefined): string | null {
  if (!setups || !Array.isArray(setups) || setups.length === 0) {
    return null;
  }

  return JSON.stringify(setups);
}

/**
 * Deserialize setups from JSON string to array.
 *
 * @param setups - JSON string or already-parsed array
 * @returns Array of strings or empty array
 */
export function deserializeSetups(setups: string | string[] | null | undefined): string[] {
  if (!setups) return [];

  if (typeof setups === 'string') {
    try {
      const parsed = JSON.parse(setups);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(setups) ? setups : [];
}

/**
 * Normalize symbol to uppercase for consistent storage.
 *
 * @param symbol - Stock/crypto symbol
 * @returns Uppercased symbol
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().trim();
}

/**
 * Calculate average R-multiple for an array of trades.
 * R-multiple is the ratio of result to risk (profit/loss in terms of risk units).
 *
 * @param trades - Array of trades with result and risk
 * @returns Average R-multiple, or 0 if no valid trades
 */
export function calculateAverageRMultiple<T extends { result: number | null; risk: number }>(
  trades: T[]
): number {
  const tradesWithRisk = trades.filter((t) => t.risk > 0 && t.result !== null);

  if (tradesWithRisk.length === 0) return 0;

  const totalR = tradesWithRisk.reduce((sum, t) => sum + (t.result ?? 0) / t.risk, 0);

  return totalR / tradesWithRisk.length;
}

/**
 * Convert time to HH:mm format in America/New_York timezone.
 * Used for time-based filtering and display.
 *
 * @param date - Date object
 * @returns Time string in HH:mm format
 */
export function formatTimeOfDay(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  });
}

/**
 * Get the time group bucket for a given trade time.
 * Groups trades into intervals (default 5 minutes) for time-based analysis.
 *
 * @param tradeTime - Date object or ISO string representing trade entry time
 * @param intervalMins - Interval in minutes (default: 5)
 * @returns String in "HH:MM-HH:MM" format representing the bucket
 * @example
 *   9:32 AM -> "09:30-09:35"
 *   9:35 AM -> "09:35-09:40"
 *   10:07 AM -> "10:05-10:10"
 */
export function getTimeGroup(tradeTime: Date | string, intervalMins: number = 5): string {
  const date = typeof tradeTime === 'string' ? new Date(tradeTime) : tradeTime;
  const timeStr = formatTimeOfDay(date);
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  // Calculate bucket start
  const totalMinutes = hour * 60 + minute;
  const bucketStart = Math.floor(totalMinutes / intervalMins) * intervalMins;
  const bucketEnd = bucketStart + intervalMins;

  const startHour = Math.floor(bucketStart / 60);
  const startMin = bucketStart % 60;
  const endHour = Math.floor(bucketEnd / 60);
  const endMin = bucketEnd % 60;

  const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
  const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

  return `${startTime}-${endTime}`;
}

/**
 * Format a time group label for display.
 * Converts "HH:MM-HH:MM" to a more readable format.
 *
 * @param timeGroup - Time group in "HH:MM-HH:MM" format
 * @returns Formatted label like "9:30 - 9:35 AM"
 */
export function formatTimeGroupLabel(timeGroup: string): string {
  const [start] = timeGroup.split('-');
  const [startHour] = start.split(':').map(Number);
  const period = startHour >= 12 ? 'PM' : 'AM';
  return `${timeGroup} ${period}`;
}
