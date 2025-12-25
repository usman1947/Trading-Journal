import Papa from 'papaparse';
import type { CSVColumnMapping, TradeFormData } from '@/types';

export interface ParsedCSV {
  headers: string[];
  data: Record<string, string>[];
}

export function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const data = results.data as Record<string, string>[];
        resolve({ headers, data });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function mapCSVToTrades(
  data: Record<string, string>[],
  mapping: CSVColumnMapping
): Partial<TradeFormData>[] {
  return data.map((row) => {
    const trade: Partial<TradeFormData> = {
      symbol: row[mapping.symbol]?.trim().toUpperCase() || '',
      side: normalizeSide(row[mapping.side]),
      tradeTime: parseDate(row[mapping.tradeTime]),
      risk: parseNumber(row[mapping.risk]),
      execution: 'PASS',
    };

    if (mapping.result && row[mapping.result]) {
      trade.result = parseNumber(row[mapping.result]);
    }

    if (mapping.execution && row[mapping.execution]) {
      trade.execution = normalizeExecution(row[mapping.execution]);
    }

    if (mapping.setup && row[mapping.setup]) {
      trade.setup = row[mapping.setup]?.trim();
    }

    return trade;
  });
}

function normalizeSide(value: string): 'LONG' | 'SHORT' {
  const normalized = value?.trim().toUpperCase() || '';
  if (['SHORT', 'SELL', 'S', 'SLD'].includes(normalized)) {
    return 'SHORT';
  }
  return 'LONG';
}

function normalizeExecution(value: string): 'PASS' | 'FAIL' {
  const normalized = value?.trim().toUpperCase() || '';
  if (['FAIL', 'F', 'NO', '0', 'FALSE'].includes(normalized)) {
    return 'FAIL';
  }
  return 'PASS';
}

function parseDate(value: string): string {
  if (!value) return new Date().toISOString();

  // Try parsing different date formats
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  // Try MM/DD/YYYY format
  const parts = value.split(/[/\-]/);
  if (parts.length === 3) {
    const [month, day, year] = parts;
    const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function parseNumber(value: string): number {
  if (!value) return 0;
  // Remove currency symbols and commas
  const cleaned = value.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
