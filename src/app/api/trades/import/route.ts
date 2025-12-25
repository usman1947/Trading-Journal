import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trades } = body;

    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json({ error: 'No trades provided' }, { status: 400 });
    }

    const createdTrades = [];
    const errors = [];

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      try {
        const {
          symbol,
          side,
          tradeTime,
          setup,
          risk,
          result,
          execution = 'PASS',
        } = trade;

        // Validate required fields
        if (!symbol || !side || !tradeTime || risk === undefined) {
          errors.push({ row: i + 1, error: 'Missing required fields (symbol, side, tradeTime, risk)' });
          continue;
        }

        const created = await prisma.trade.create({
          data: {
            symbol: symbol.toUpperCase(),
            side,
            tradeTime: new Date(tradeTime),
            setup: setup || null,
            risk: parseFloat(risk) || 0,
            result: result !== undefined ? parseFloat(result) : null,
            execution,
          },
        });

        createdTrades.push(created);
      } catch (error) {
        errors.push({ row: i + 1, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      imported: createdTrades.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error importing trades:', error);
    return NextResponse.json({ error: 'Failed to import trades' }, { status: 500 });
  }
}
