// Mock next/server before any imports
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, options?: { status?: number }) => ({
      status: options?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { validateRequiredFields } from '@/lib/api-helpers';

describe('validateRequiredFields', () => {
  it('does not throw when all required fields are present', () => {
    const body = { name: 'Test', symbol: 'AAPL', risk: 100 };
    expect(() => validateRequiredFields(body, ['name', 'symbol', 'risk'])).not.toThrow();
  });

  it('throws when a required field is missing (undefined)', () => {
    const body = { name: 'Test' };
    expect(() => validateRequiredFields(body, ['name', 'symbol'])).toThrow(
      'Missing required fields: symbol'
    );
  });

  it('throws when a required field is null', () => {
    const body = { name: 'Test', symbol: null };
    expect(() => validateRequiredFields(body, ['name', 'symbol'])).toThrow(
      'Missing required fields: symbol'
    );
  });

  it('throws when a required field is empty string', () => {
    const body = { name: 'Test', symbol: '' };
    expect(() => validateRequiredFields(body, ['name', 'symbol'])).toThrow(
      'Missing required fields: symbol'
    );
  });

  it('lists all missing fields in the error message', () => {
    const body = {};
    expect(() => validateRequiredFields(body, ['name', 'symbol', 'risk'])).toThrow(
      'Missing required fields: name, symbol, risk'
    );
  });

  it('does not throw when required fields array is empty', () => {
    const body = {};
    expect(() => validateRequiredFields(body, [])).not.toThrow();
  });
});
