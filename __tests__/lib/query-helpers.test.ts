import {
  applyAccountFilter,
  applyUserFilter,
  buildDateRangeFilter,
  buildTradeFilters,
  filterByTimeOfDay,
  excludeBreakevenTrades,
  separateWinLossTrades,
} from '@/lib/query-helpers';

describe('applyAccountFilter', () => {
  it('sets accountId to null for "paper" string', () => {
    const where: Record<string, unknown> = {};
    applyAccountFilter(where, 'paper');
    expect(where.accountId).toBeNull();
  });

  it('sets accountId to null for empty string', () => {
    const where: Record<string, unknown> = {};
    applyAccountFilter(where, '');
    expect(where.accountId).toBeNull();
  });

  it('sets accountId to the given string for a real account', () => {
    const where: Record<string, unknown> = {};
    applyAccountFilter(where, 'acc-123');
    expect(where.accountId).toBe('acc-123');
  });

  it('does not modify where when accountId is null', () => {
    const where: Record<string, unknown> = {};
    applyAccountFilter(where, null);
    expect(where).not.toHaveProperty('accountId');
  });

  it('does not modify where when accountId is undefined', () => {
    const where: Record<string, unknown> = {};
    applyAccountFilter(where, undefined);
    expect(where).not.toHaveProperty('accountId');
  });
});

describe('applyUserFilter', () => {
  it('sets userId when provided', () => {
    const where: Record<string, unknown> = {};
    applyUserFilter(where, 'user-123');
    expect(where.userId).toBe('user-123');
  });

  it('does not set userId when undefined', () => {
    const where: Record<string, unknown> = {};
    applyUserFilter(where, undefined);
    expect(where).not.toHaveProperty('userId');
  });
});

describe('buildDateRangeFilter', () => {
  it('sets gte for dateFrom only', () => {
    const where: Record<string, unknown> = {};
    buildDateRangeFilter(where, '2024-01-01');
    expect(where.tradeTime).toEqual({ gte: new Date('2024-01-01') });
  });

  it('sets lte for dateTo only', () => {
    const where: Record<string, unknown> = {};
    buildDateRangeFilter(where, undefined, '2024-01-31');
    expect(where.tradeTime).toEqual({ lte: new Date('2024-01-31') });
  });

  it('sets both gte and lte when both are provided', () => {
    const where: Record<string, unknown> = {};
    buildDateRangeFilter(where, '2024-01-01', '2024-01-31');
    expect(where.tradeTime).toEqual({
      gte: new Date('2024-01-01'),
      lte: new Date('2024-01-31'),
    });
  });

  it('does not modify where when neither is provided', () => {
    const where: Record<string, unknown> = {};
    buildDateRangeFilter(where);
    expect(where).not.toHaveProperty('tradeTime');
  });
});

describe('buildTradeFilters', () => {
  it('returns empty where object with no filters', () => {
    const result = buildTradeFilters();
    expect(result).toEqual({});
  });

  it('applies userId from the second argument', () => {
    const result = buildTradeFilters({}, 'user-123');
    expect(result.userId).toBe('user-123');
  });

  it('applies userId from filters object', () => {
    const result = buildTradeFilters({ userId: 'user-456' });
    expect(result.userId).toBe('user-456');
  });

  it('applies symbol filter with contains', () => {
    const result = buildTradeFilters({ symbol: 'AAPL' });
    expect(result.symbol).toEqual({ contains: 'AAPL' });
  });

  it('applies side filter', () => {
    const result = buildTradeFilters({ side: 'LONG' });
    expect(result.side).toBe('LONG');
  });

  it('applies execution filter', () => {
    const result = buildTradeFilters({ execution: 'PASS' });
    expect(result.execution).toBe('PASS');
  });

  it('applies strategyId filter', () => {
    const result = buildTradeFilters({ strategyId: 'strat-1' });
    expect(result.strategyId).toBe('strat-1');
  });

  it('applies setup filter', () => {
    const result = buildTradeFilters({ setup: 'Gap Up' });
    expect(result.setup).toBe('Gap Up');
  });

  it('applies date range filters', () => {
    const result = buildTradeFilters({
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
    });
    expect(result.tradeTime).toEqual({
      gte: new Date('2024-01-01'),
      lte: new Date('2024-01-31'),
    });
  });

  it('applies accountId filter', () => {
    const result = buildTradeFilters({ accountId: 'acc-123' });
    expect(result.accountId).toBe('acc-123');
  });

  it('applies resultMin and resultMax filters', () => {
    const result = buildTradeFilters({ resultMin: -100, resultMax: 500 });
    expect(result.result).toEqual({ gte: -100, lte: 500 });
  });

  it('applies resultMin only', () => {
    const result = buildTradeFilters({ resultMin: 0 });
    expect(result.result).toEqual({ gte: 0 });
  });

  it('applies resultMax only', () => {
    const result = buildTradeFilters({ resultMax: 1000 });
    expect(result.result).toEqual({ lte: 1000 });
  });

  it('combines multiple filters', () => {
    const result = buildTradeFilters(
      {
        symbol: 'AAPL',
        side: 'LONG',
        dateFrom: '2024-01-01',
        accountId: 'acc-1',
      },
      'user-1'
    );
    expect(result.userId).toBe('user-1');
    expect(result.symbol).toEqual({ contains: 'AAPL' });
    expect(result.side).toBe('LONG');
    expect(result.tradeTime).toEqual({ gte: new Date('2024-01-01') });
    expect(result.accountId).toBe('acc-1');
  });
});

describe('filterByTimeOfDay', () => {
  // Create trades with specific ET times (UTC - 5 in EST/winter)
  const createTrade = (utcTime: string) => ({
    tradeTime: new Date(utcTime),
  });

  const trades = [
    createTrade('2024-01-15T14:30:00Z'), // 09:30 ET
    createTrade('2024-01-15T15:00:00Z'), // 10:00 ET
    createTrade('2024-01-15T16:00:00Z'), // 11:00 ET
    createTrade('2024-01-15T19:00:00Z'), // 14:00 ET
    createTrade('2024-01-15T20:30:00Z'), // 15:30 ET
  ];

  it('returns all trades when no time filters are provided', () => {
    const result = filterByTimeOfDay(trades);
    expect(result).toHaveLength(5);
  });

  it('returns all trades when both filters are null', () => {
    const result = filterByTimeOfDay(trades, null, null);
    expect(result).toHaveLength(5);
  });

  it('filters with timeAfter only', () => {
    const result = filterByTimeOfDay(trades, '11:00');
    expect(result).toHaveLength(3); // 11:00, 14:00, 15:30
  });

  it('filters with timeBefore only', () => {
    const result = filterByTimeOfDay(trades, null, '11:00');
    expect(result).toHaveLength(3); // 09:30, 10:00, 11:00
  });

  it('filters with both timeAfter and timeBefore', () => {
    const result = filterByTimeOfDay(trades, '10:00', '14:00');
    expect(result).toHaveLength(3); // 10:00, 11:00, 14:00
  });

  it('returns empty array when no trades match the range', () => {
    const result = filterByTimeOfDay(trades, '16:00', '17:00');
    expect(result).toHaveLength(0);
  });
});

describe('excludeBreakevenTrades', () => {
  it('returns empty array for empty input', () => {
    expect(excludeBreakevenTrades([])).toEqual([]);
  });

  it('excludes break-even trades', () => {
    const trades = [
      { id: '1', isBreakEven: false },
      { id: '2', isBreakEven: true },
      { id: '3', isBreakEven: false },
    ];
    const result = excludeBreakevenTrades(trades);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['1', '3']);
  });

  it('returns all trades when none are break-even', () => {
    const trades = [
      { id: '1', isBreakEven: false },
      { id: '2', isBreakEven: false },
    ];
    const result = excludeBreakevenTrades(trades);
    expect(result).toHaveLength(2);
  });

  it('returns empty when all are break-even', () => {
    const trades = [
      { id: '1', isBreakEven: true },
      { id: '2', isBreakEven: true },
    ];
    const result = excludeBreakevenTrades(trades);
    expect(result).toHaveLength(0);
  });
});

describe('separateWinLossTrades', () => {
  const createTrade = (id: string, result: number | null, isBreakEven: boolean = false) => ({
    id,
    result,
    isBreakEven,
  });

  it('separates all winning trades', () => {
    const trades = [createTrade('1', 100), createTrade('2', 200)];
    const { winningTrades, losingTrades } = separateWinLossTrades(trades);
    expect(winningTrades).toHaveLength(2);
    expect(losingTrades).toHaveLength(0);
  });

  it('separates all losing trades', () => {
    const trades = [createTrade('1', -100), createTrade('2', -200)];
    const { winningTrades, losingTrades } = separateWinLossTrades(trades);
    expect(winningTrades).toHaveLength(0);
    expect(losingTrades).toHaveLength(2);
  });

  it('separates mixed winning and losing trades', () => {
    const trades = [
      createTrade('1', 100),
      createTrade('2', -50),
      createTrade('3', 200),
      createTrade('4', -100),
    ];
    const { winningTrades, losingTrades } = separateWinLossTrades(trades);
    expect(winningTrades).toHaveLength(2);
    expect(losingTrades).toHaveLength(2);
  });

  it('excludes break-even trades from both groups', () => {
    const trades = [
      createTrade('1', 100),
      createTrade('2', 0, true), // break-even
      createTrade('3', -50),
    ];
    const { winningTrades, losingTrades } = separateWinLossTrades(trades);
    expect(winningTrades).toHaveLength(1);
    expect(losingTrades).toHaveLength(1);
    // Break-even trade should not appear in either group
    expect([...winningTrades, ...losingTrades].find((t) => t.id === '2')).toBeUndefined();
  });

  it('treats null result as 0 (neither win nor loss)', () => {
    const trades = [createTrade('1', null)];
    const { winningTrades, losingTrades } = separateWinLossTrades(trades);
    expect(winningTrades).toHaveLength(0);
    expect(losingTrades).toHaveLength(0);
  });

  it('handles empty input', () => {
    const { winningTrades, losingTrades } = separateWinLossTrades([]);
    expect(winningTrades).toHaveLength(0);
    expect(losingTrades).toHaveLength(0);
  });
});
