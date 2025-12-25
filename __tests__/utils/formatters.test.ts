import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatPnL,
  formatRMultiple,
  getPnLColor,
  getWinRateColor,
} from '@/utils/formatters';

describe('formatCurrency', () => {
  it('formats positive amounts', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('handles large numbers', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });
});

describe('formatPercent', () => {
  it('formats positive percentage with plus sign', () => {
    expect(formatPercent(25.5)).toBe('+25.50%');
  });

  it('formats negative percentage', () => {
    expect(formatPercent(-10.25)).toBe('-10.25%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });

  it('respects decimal places parameter', () => {
    expect(formatPercent(25.567, 1)).toBe('+25.6%');
  });
});

describe('formatNumber', () => {
  it('formats with default decimals', () => {
    expect(formatNumber(123.456)).toBe('123.46');
  });

  it('formats with custom decimals', () => {
    expect(formatNumber(123.456, 3)).toBe('123.456');
  });
});

describe('formatPnL', () => {
  it('formats positive P&L', () => {
    expect(formatPnL(500)).toBe('+$500.00');
  });

  it('formats negative P&L', () => {
    expect(formatPnL(-250)).toBe('-$250.00');
  });

  it('formats zero P&L', () => {
    expect(formatPnL(0)).toBe('+$0.00');
  });
});

describe('formatRMultiple', () => {
  it('formats positive R-multiple', () => {
    expect(formatRMultiple(2.5)).toBe('+2.50R');
  });

  it('formats negative R-multiple', () => {
    expect(formatRMultiple(-1.25)).toBe('-1.25R');
  });

  it('formats zero', () => {
    expect(formatRMultiple(0)).toBe('+0.00R');
  });
});

describe('getPnLColor', () => {
  it('returns success for positive', () => {
    expect(getPnLColor(100)).toBe('success');
  });

  it('returns error for negative', () => {
    expect(getPnLColor(-100)).toBe('error');
  });

  it('returns inherit for zero', () => {
    expect(getPnLColor(0)).toBe('inherit');
  });
});

describe('getWinRateColor', () => {
  it('returns success for >= 50%', () => {
    expect(getWinRateColor(50)).toBe('success');
    expect(getWinRateColor(75)).toBe('success');
  });

  it('returns warning for 40-49%', () => {
    expect(getWinRateColor(40)).toBe('warning');
    expect(getWinRateColor(49)).toBe('warning');
  });

  it('returns error for < 40%', () => {
    expect(getWinRateColor(39)).toBe('error');
    expect(getWinRateColor(0)).toBe('error');
  });
});
