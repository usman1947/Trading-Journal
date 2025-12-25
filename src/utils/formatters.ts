import { format, formatDistance, parseISO } from 'date-fns';

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function formatDate(date: string | Date, formatStr = 'MMM dd, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy HH:mm');
}

export function formatTimeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true });
}

export function formatPnL(value: number, currency = 'USD'): string {
  const formatted = formatCurrency(Math.abs(value), currency);
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatRMultiple(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}R`;
}

export function getPnLColor(value: number): 'success' | 'error' | 'inherit' {
  if (value > 0) return 'success';
  if (value < 0) return 'error';
  return 'inherit';
}

export function getWinRateColor(winRate: number): 'success' | 'warning' | 'error' {
  if (winRate >= 50) return 'success';
  if (winRate >= 40) return 'warning';
  return 'error';
}
