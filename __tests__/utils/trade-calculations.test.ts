// Mock prisma before importing the module (trade-calculations.ts imports prisma at top level)
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {},
}));

import {
  calculateHoldDuration,
  calculateResultFromPartials,
  serializePartials,
  deserializePartials,
  serializeSetups,
  deserializeSetups,
  normalizeSymbol,
  calculateAverageRMultiple,
  getTimeGroup,
  formatTimeGroupLabel,
  formatTimeOfDay,
} from '@/utils/trade-calculations';

describe('calculateHoldDuration', () => {
  it('returns null when exitTime is null', () => {
    const entry = new Date('2024-01-15T09:30:00Z');
    expect(calculateHoldDuration(entry, null)).toBeNull();
  });

  it('returns positive number for valid entry and exit times', () => {
    const entry = new Date('2024-01-15T09:30:00Z');
    const exit = new Date('2024-01-15T10:00:00Z');
    expect(calculateHoldDuration(entry, exit)).toBe(30);
  });

  it('returns 0 when entry and exit are the same time', () => {
    const time = new Date('2024-01-15T09:30:00Z');
    expect(calculateHoldDuration(time, time)).toBe(0);
  });

  it('returns correct duration for multi-hour hold', () => {
    const entry = new Date('2024-01-15T09:30:00Z');
    const exit = new Date('2024-01-15T15:30:00Z');
    expect(calculateHoldDuration(entry, exit)).toBe(360); // 6 hours = 360 minutes
  });

  it('rounds to nearest minute', () => {
    const entry = new Date('2024-01-15T09:30:00Z');
    const exit = new Date('2024-01-15T09:32:29Z'); // 2 min 29 sec
    expect(calculateHoldDuration(entry, exit)).toBe(2);
  });
});

describe('calculateResultFromPartials', () => {
  it('returns null when partials is null', () => {
    expect(calculateResultFromPartials(null)).toBeNull();
  });

  it('returns null when partials is undefined', () => {
    expect(calculateResultFromPartials(undefined)).toBeNull();
  });

  it('returns null when partials is an empty array', () => {
    expect(calculateResultFromPartials([])).toBeNull();
  });

  it('returns the value for a single partial', () => {
    expect(calculateResultFromPartials([150])).toBe(150);
  });

  it('sums multiple partials correctly', () => {
    expect(calculateResultFromPartials([100, 50, -25])).toBe(125);
  });

  it('handles all negative partials', () => {
    expect(calculateResultFromPartials([-50, -100])).toBe(-150);
  });

  it('handles partials with zero values', () => {
    expect(calculateResultFromPartials([0, 100, 0])).toBe(100);
  });
});

describe('serializePartials', () => {
  it('returns null for null input', () => {
    expect(serializePartials(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(serializePartials(undefined)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(serializePartials([])).toBeNull();
  });

  it('serializes a single partial to JSON string', () => {
    expect(serializePartials([100])).toBe('[100]');
  });

  it('serializes multiple partials to JSON string', () => {
    expect(serializePartials([100, 50, -25])).toBe('[100,50,-25]');
  });
});

describe('deserializePartials', () => {
  it('returns empty array for null input', () => {
    expect(deserializePartials(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(deserializePartials(undefined)).toEqual([]);
  });

  it('parses a valid JSON string to number array', () => {
    expect(deserializePartials('[100,50,-25]')).toEqual([100, 50, -25]);
  });

  it('returns empty array for invalid JSON string', () => {
    expect(deserializePartials('not-json')).toEqual([]);
  });

  it('returns empty array when JSON parses to a non-array', () => {
    expect(deserializePartials('{"a":1}')).toEqual([]);
  });

  it('passes through an already-parsed array', () => {
    expect(deserializePartials([100, 200])).toEqual([100, 200]);
  });

  it('returns empty array for empty string', () => {
    expect(deserializePartials('')).toEqual([]);
  });
});

describe('serializePartials and deserializePartials round-trip', () => {
  it('round-trips correctly', () => {
    const original = [100, 50, -25, 0];
    const serialized = serializePartials(original);
    expect(serialized).not.toBeNull();
    const deserialized = deserializePartials(serialized);
    expect(deserialized).toEqual(original);
  });
});

describe('serializeSetups', () => {
  it('returns null for null input', () => {
    expect(serializeSetups(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(serializeSetups(undefined)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(serializeSetups([])).toBeNull();
  });

  it('serializes setup strings to JSON', () => {
    expect(serializeSetups(['Gap Up', 'Breakout'])).toBe('["Gap Up","Breakout"]');
  });
});

describe('deserializeSetups', () => {
  it('returns empty array for null input', () => {
    expect(deserializeSetups(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(deserializeSetups(undefined)).toEqual([]);
  });

  it('parses a valid JSON string to string array', () => {
    expect(deserializeSetups('["Gap Up","Breakout"]')).toEqual(['Gap Up', 'Breakout']);
  });

  it('returns empty array for invalid JSON string', () => {
    expect(deserializeSetups('bad-json')).toEqual([]);
  });

  it('returns empty array when JSON parses to a non-array', () => {
    expect(deserializeSetups('"just a string"')).toEqual([]);
  });

  it('passes through an already-parsed array', () => {
    expect(deserializeSetups(['Gap Up', 'Breakout'])).toEqual(['Gap Up', 'Breakout']);
  });
});

describe('serializeSetups and deserializeSetups round-trip', () => {
  it('round-trips correctly', () => {
    const original = ['Gap Up', 'Breakout', 'VWAP Reclaim'];
    const serialized = serializeSetups(original);
    expect(serialized).not.toBeNull();
    const deserialized = deserializeSetups(serialized);
    expect(deserialized).toEqual(original);
  });
});

describe('normalizeSymbol', () => {
  it('uppercases a lowercase symbol', () => {
    expect(normalizeSymbol('aapl')).toBe('AAPL');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeSymbol('  TSLA  ')).toBe('TSLA');
  });

  it('uppercases and trims simultaneously', () => {
    expect(normalizeSymbol(' msft ')).toBe('MSFT');
  });

  it('handles already-uppercase symbol', () => {
    expect(normalizeSymbol('SPY')).toBe('SPY');
  });

  it('handles mixed case', () => {
    expect(normalizeSymbol('gOoGl')).toBe('GOOGL');
  });
});

describe('calculateAverageRMultiple', () => {
  it('returns 0 for empty trades array', () => {
    expect(calculateAverageRMultiple([])).toBe(0);
  });

  it('returns 0 when all trades have zero risk', () => {
    const trades = [
      { result: 100, risk: 0 },
      { result: -50, risk: 0 },
    ];
    expect(calculateAverageRMultiple(trades)).toBe(0);
  });

  it('returns 0 when all trades have null result', () => {
    const trades = [
      { result: null, risk: 100 },
      { result: null, risk: 200 },
    ];
    expect(calculateAverageRMultiple(trades)).toBe(0);
  });

  it('correctly calculates average R for a single trade', () => {
    const trades = [{ result: 200, risk: 100 }];
    expect(calculateAverageRMultiple(trades)).toBe(2);
  });

  it('correctly averages R-multiples for multiple trades', () => {
    const trades = [
      { result: 200, risk: 100 }, // 2R
      { result: -50, risk: 100 }, // -0.5R
    ];
    // Average: (2 + -0.5) / 2 = 0.75
    expect(calculateAverageRMultiple(trades)).toBe(0.75);
  });

  it('excludes trades with zero risk from the calculation', () => {
    const trades = [
      { result: 200, risk: 100 }, // 2R
      { result: 100, risk: 0 }, // Excluded (zero risk)
    ];
    expect(calculateAverageRMultiple(trades)).toBe(2);
  });

  it('excludes trades with null result from the calculation', () => {
    const trades = [
      { result: 200, risk: 100 }, // 2R
      { result: null, risk: 100 }, // Excluded (null result)
    ];
    expect(calculateAverageRMultiple(trades)).toBe(2);
  });
});

describe('getTimeGroup', () => {
  // Note: getTimeGroup converts to America/New_York timezone internally.
  // We need to create dates in UTC that correspond to desired ET times.
  // During EST (winter): ET = UTC - 5
  // So 9:30 AM ET = 14:30 UTC

  it('groups a time into the correct 5-minute bucket', () => {
    // 9:32 AM ET = 14:32 UTC (in EST/winter)
    const tradeTime = new Date('2024-01-15T14:32:00Z');
    const result = getTimeGroup(tradeTime);
    expect(result).toBe('09:30-09:35');
  });

  it('handles time exactly on a bucket boundary', () => {
    // 9:30 AM ET = 14:30 UTC
    const tradeTime = new Date('2024-01-15T14:30:00Z');
    const result = getTimeGroup(tradeTime);
    expect(result).toBe('09:30-09:35');
  });

  it('handles a string input', () => {
    const result = getTimeGroup('2024-01-15T14:32:00Z');
    expect(result).toBe('09:30-09:35');
  });

  it('handles custom interval', () => {
    // 9:32 AM ET with 15-minute interval
    const tradeTime = new Date('2024-01-15T14:32:00Z');
    const result = getTimeGroup(tradeTime, 15);
    expect(result).toBe('09:30-09:45');
  });

  it('handles afternoon time', () => {
    // 2:07 PM ET = 19:07 UTC (in EST)
    const tradeTime = new Date('2024-01-15T19:07:00Z');
    const result = getTimeGroup(tradeTime);
    expect(result).toBe('14:05-14:10');
  });
});

describe('formatTimeGroupLabel', () => {
  it('appends AM for morning time groups', () => {
    expect(formatTimeGroupLabel('09:30-09:35')).toBe('09:30-09:35 AM');
  });

  it('appends AM for 11:xx time groups', () => {
    expect(formatTimeGroupLabel('11:55-12:00')).toBe('11:55-12:00 AM');
  });

  it('appends PM for afternoon time groups', () => {
    expect(formatTimeGroupLabel('14:05-14:10')).toBe('14:05-14:10 PM');
  });

  it('appends PM for 12:xx time groups (noon)', () => {
    expect(formatTimeGroupLabel('12:00-12:05')).toBe('12:00-12:05 PM');
  });

  it('appends AM for early morning', () => {
    expect(formatTimeGroupLabel('08:00-08:05')).toBe('08:00-08:05 AM');
  });
});

describe('formatTimeOfDay', () => {
  it('formats a date to HH:mm in America/New_York timezone', () => {
    // 9:30 AM ET = 14:30 UTC in EST
    const date = new Date('2024-01-15T14:30:00Z');
    expect(formatTimeOfDay(date)).toBe('09:30');
  });

  it('formats an afternoon time correctly', () => {
    // 3:00 PM ET = 20:00 UTC in EST
    const date = new Date('2024-01-15T20:00:00Z');
    expect(formatTimeOfDay(date)).toBe('15:00');
  });
});
