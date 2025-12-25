import { mapCSVToTrades } from '@/lib/csvParser';
import type { CSVColumnMapping } from '@/types';

describe('mapCSVToTrades', () => {
  const mapping: CSVColumnMapping = {
    symbol: 'Symbol',
    side: 'Side',
    tradeTime: 'Time',
    risk: 'Risk',
    result: 'Result',
    execution: 'Execution',
    setup: 'Setup',
  };

  it('maps CSV data to trades correctly', () => {
    const data = [
      {
        Symbol: 'AAPL',
        Side: 'LONG',
        Time: '2024-01-15 09:30',
        Risk: '100',
        Result: '250',
        Execution: 'PASS',
        Setup: 'Gap Up',
      },
    ];

    const result = mapCSVToTrades(data, mapping);

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('AAPL');
    expect(result[0].side).toBe('LONG');
    expect(result[0].risk).toBe(100);
    expect(result[0].result).toBe(250);
    expect(result[0].execution).toBe('PASS');
    expect(result[0].setup).toBe('Gap Up');
  });

  it('normalizes side values', () => {
    const simpleMapping: CSVColumnMapping = {
      symbol: 'Symbol',
      side: 'Side',
      tradeTime: 'Time',
      risk: 'Risk',
    };

    const data = [
      {
        Symbol: 'AAPL',
        Side: 'BUY',
        Time: '2024-01-15',
        Risk: '100',
      },
      {
        Symbol: 'TSLA',
        Side: 'SELL',
        Time: '2024-01-15',
        Risk: '100',
      },
      {
        Symbol: 'MSFT',
        Side: 'S',
        Time: '2024-01-15',
        Risk: '100',
      },
    ];

    const result = mapCSVToTrades(data, simpleMapping);

    expect(result[0].side).toBe('LONG'); // BUY -> LONG
    expect(result[1].side).toBe('SHORT'); // SELL -> SHORT
    expect(result[2].side).toBe('SHORT'); // S -> SHORT
  });

  it('normalizes execution values', () => {
    const data = [
      {
        Symbol: 'AAPL',
        Side: 'LONG',
        Time: '2024-01-15',
        Risk: '100',
        Execution: 'FAIL',
      },
      {
        Symbol: 'TSLA',
        Side: 'LONG',
        Time: '2024-01-15',
        Risk: '100',
        Execution: 'F',
      },
      {
        Symbol: 'MSFT',
        Side: 'LONG',
        Time: '2024-01-15',
        Risk: '100',
        Execution: 'NO',
      },
      {
        Symbol: 'GOOGL',
        Side: 'LONG',
        Time: '2024-01-15',
        Risk: '100',
        Execution: 'YES',
      },
    ];

    const simpleMapping: CSVColumnMapping = {
      symbol: 'Symbol',
      side: 'Side',
      tradeTime: 'Time',
      risk: 'Risk',
      execution: 'Execution',
    };

    const result = mapCSVToTrades(data, simpleMapping);

    expect(result[0].execution).toBe('FAIL');
    expect(result[1].execution).toBe('FAIL');
    expect(result[2].execution).toBe('FAIL');
    expect(result[3].execution).toBe('PASS');
  });

  it('handles currency symbols in amounts', () => {
    const simpleMapping: CSVColumnMapping = {
      symbol: 'Symbol',
      side: 'Side',
      tradeTime: 'Time',
      risk: 'Risk',
      result: 'Result',
    };

    const data = [
      {
        Symbol: 'AAPL',
        Side: 'LONG',
        Time: '2024-01-15',
        Risk: '$100',
        Result: '$250',
      },
    ];

    const result = mapCSVToTrades(data, simpleMapping);

    expect(result[0].risk).toBe(100);
    expect(result[0].result).toBe(250);
  });

  it('handles comma-separated numbers', () => {
    const simpleMapping: CSVColumnMapping = {
      symbol: 'Symbol',
      side: 'Side',
      tradeTime: 'Time',
      risk: 'Risk',
      result: 'Result',
    };

    const data = [
      {
        Symbol: 'SPY',
        Side: 'LONG',
        Time: '2024-01-15',
        Risk: '1,000',
        Result: '2,500',
      },
    ];

    const result = mapCSVToTrades(data, simpleMapping);

    expect(result[0].risk).toBe(1000);
    expect(result[0].result).toBe(2500);
  });

  it('defaults execution to PASS when not mapped', () => {
    const simpleMapping: CSVColumnMapping = {
      symbol: 'Symbol',
      side: 'Side',
      tradeTime: 'Time',
      risk: 'Risk',
    };

    const data = [
      {
        Symbol: 'AAPL',
        Side: 'LONG',
        Time: '2024-01-15',
        Risk: '100',
      },
    ];

    const result = mapCSVToTrades(data, simpleMapping);

    expect(result[0].execution).toBe('PASS');
  });
});
