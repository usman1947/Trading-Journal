import { calculateRMultiple, calculateAnalytics, groupTradesByDate } from '@/utils/calculations';
import type { Trade } from '@/types';

describe('calculateRMultiple', () => {
  it('calculates positive R-multiple for winning trade', () => {
    const result = calculateRMultiple(200, 100);
    expect(result).toBe(2);
  });

  it('calculates negative R-multiple for losing trade', () => {
    const result = calculateRMultiple(-150, 100);
    expect(result).toBe(-1.5);
  });

  it('returns 0 when risk amount is 0', () => {
    const result = calculateRMultiple(100, 0);
    expect(result).toBe(0);
  });
});

describe('calculateAnalytics', () => {
  const createTrade = (
    result: number,
    risk: number = 100,
    execution: 'PASS' | 'FAIL' = 'PASS'
  ): Trade => ({
    id: Math.random().toString(),
    symbol: 'TEST',
    side: 'LONG',
    tradeTime: '2024-01-01T09:00:00Z',
    risk,
    result,
    execution,
    commission: 0,
    isBreakEven: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('calculates analytics for multiple trades', () => {
    const trades: Trade[] = [createTrade(100, 100), createTrade(200, 100), createTrade(-50, 100)];

    const result = calculateAnalytics(trades);

    expect(result.totalResult).toBe(250);
    expect(result.totalTrades).toBe(3);
    expect(result.winningTrades).toBe(2);
    expect(result.losingTrades).toBe(1);
    expect(result.winRate).toBeCloseTo(66.67, 1);
    expect(result.averageWin).toBe(150);
    expect(result.averageLoss).toBe(50);
  });

  it('returns zeros for empty trades', () => {
    const result = calculateAnalytics([]);

    expect(result.totalResult).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.totalTrades).toBe(0);
  });

  it('handles all winning trades', () => {
    const trades: Trade[] = [createTrade(100), createTrade(200)];

    const result = calculateAnalytics(trades);

    expect(result.winRate).toBe(100);
    expect(result.averageLoss).toBe(0);
  });

  it('handles all losing trades', () => {
    const trades: Trade[] = [createTrade(-100), createTrade(-200)];

    const result = calculateAnalytics(trades);

    expect(result.winRate).toBe(0);
    expect(result.averageWin).toBe(0);
  });

  it('calculates execution rate correctly', () => {
    const trades: Trade[] = [
      createTrade(100, 100, 'PASS'),
      createTrade(200, 100, 'PASS'),
      createTrade(-50, 100, 'FAIL'),
      createTrade(50, 100, 'FAIL'),
    ];

    const result = calculateAnalytics(trades);

    expect(result.executionRate).toBe(50); // 2 out of 4 are PASS
  });

  it('calculates total risk correctly', () => {
    const trades: Trade[] = [createTrade(100, 100), createTrade(200, 150), createTrade(-50, 75)];

    const result = calculateAnalytics(trades);

    expect(result.totalRisk).toBe(325); // 100 + 150 + 75
  });

  it('calculates largest win and loss correctly', () => {
    const trades: Trade[] = [
      createTrade(100),
      createTrade(500),
      createTrade(-50),
      createTrade(-200),
    ];

    const result = calculateAnalytics(trades);

    expect(result.largestWin).toBe(500);
    expect(result.largestLoss).toBe(-200);
  });
});

describe('groupTradesByDate', () => {
  it('groups trades by date', () => {
    const trades: Trade[] = [
      {
        id: '1',
        symbol: 'AAPL',
        side: 'LONG',
        tradeTime: '2024-01-01T09:00:00Z',
        risk: 100,
        result: 50,
        execution: 'PASS',
        commission: 0,
        isBreakEven: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        symbol: 'TSLA',
        side: 'SHORT',
        tradeTime: '2024-01-01T10:00:00Z',
        risk: 100,
        result: -25,
        execution: 'PASS',
        commission: 0,
        isBreakEven: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        symbol: 'MSFT',
        side: 'LONG',
        tradeTime: '2024-01-02T09:00:00Z',
        risk: 100,
        result: 75,
        execution: 'FAIL',
        commission: 0,
        isBreakEven: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = groupTradesByDate(trades);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['2024-01-01']).toHaveLength(2);
    expect(result['2024-01-02']).toHaveLength(1);
  });
});
