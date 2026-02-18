/**
 * In-Memory Token Bucket Rate Limiter
 *
 * Provides rate limiting for API routes using a token bucket algorithm.
 * Compatible with Next.js edge runtime (middleware).
 *
 * @module lib/rate-limiter
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitMap.entries()).forEach(([key, entry]) => {
    if (now - entry.lastRefill > 300_000) {
      rateLimitMap.delete(key);
    }
  });
}, 300_000);

/**
 * Check if a request is allowed under the rate limit.
 *
 * @param identifier - Unique identifier for the client (e.g., IP address)
 * @param maxTokens - Maximum number of tokens (requests) in the window
 * @param windowMs - Time window in milliseconds for token refill
 * @returns Object with allowed status and remaining tokens
 */
export function checkRateLimit(
  identifier: string,
  maxTokens: number = 100,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry) {
    rateLimitMap.set(identifier, { tokens: maxTokens - 1, lastRefill: now });
    return { allowed: true, remaining: maxTokens - 1 };
  }

  // Refill tokens based on elapsed time
  const elapsed = now - entry.lastRefill;
  const refillAmount = Math.floor((elapsed / windowMs) * maxTokens);

  if (refillAmount > 0) {
    entry.tokens = Math.min(maxTokens, entry.tokens + refillAmount);
    entry.lastRefill = now;
  }

  if (entry.tokens > 0) {
    entry.tokens--;
    return { allowed: true, remaining: entry.tokens };
  }

  return { allowed: false, remaining: 0 };
}
