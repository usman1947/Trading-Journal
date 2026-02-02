import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError, validationError, notFoundResponse, successResponse } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// Calculate score from boolean fields (each field = 14.29 points, total = 100)
function calculateScore(entry: {
  smartSlMove: boolean;
  goodEntry: boolean;
  nearVwap: boolean;
  htfSignal: boolean;
  setupTaken: boolean;
  notIntoLevel: boolean;
  noTradeOnSketchCandle: boolean;
}): number {
  const fields = [
    entry.smartSlMove,
    entry.goodEntry,
    entry.nearVwap,
    entry.htfSignal,
    entry.setupTaken,
    entry.notIntoLevel,
    entry.noTradeOnSketchCandle,
  ];
  const checkedCount = fields.filter(Boolean).length;
  return Math.round((checkedCount / 7) * 100);
}

// Add score to entry
function withScore<T extends {
  smartSlMove: boolean;
  goodEntry: boolean;
  nearVwap: boolean;
  htfSignal: boolean;
  setupTaken: boolean;
  notIntoLevel: boolean;
  noTradeOnSketchCandle: boolean;
}>(entry: T): T & { score: number } {
  return { ...entry, score: calculateScore(entry) };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: Record<string, unknown> = { userId: user.id };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const entries = await prisma.dailyRuleAdherence.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Add computed score to each entry
    const entriesWithScore = entries.map(withScore);

    return NextResponse.json(entriesWithScore);
  } catch (error) {
    return handleApiError(error, 'fetching rule adherence entries');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const {
      date,
      smartSlMove,
      goodEntry,
      nearVwap,
      htfSignal,
      setupTaken,
      notIntoLevel,
      noTradeOnSketchCandle,
      notes,
    } = body;

    if (!date) {
      return validationError('Date is required');
    }

    // Parse as UTC noon to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

    // Upsert - create or update (with userId constraint)
    const existing = await prisma.dailyRuleAdherence.findFirst({
      where: { userId: user.id, date: dateObj },
    });

    let entry;
    if (existing) {
      entry = await prisma.dailyRuleAdherence.update({
        where: { id: existing.id },
        data: {
          smartSlMove: smartSlMove ?? false,
          goodEntry: goodEntry ?? false,
          nearVwap: nearVwap ?? false,
          htfSignal: htfSignal ?? false,
          setupTaken: setupTaken ?? false,
          notIntoLevel: notIntoLevel ?? false,
          noTradeOnSketchCandle: noTradeOnSketchCandle ?? false,
          notes: notes || null,
        },
      });
    } else {
      entry = await prisma.dailyRuleAdherence.create({
        data: {
          date: dateObj,
          smartSlMove: smartSlMove ?? false,
          goodEntry: goodEntry ?? false,
          nearVwap: nearVwap ?? false,
          htfSignal: htfSignal ?? false,
          setupTaken: setupTaken ?? false,
          notIntoLevel: notIntoLevel ?? false,
          noTradeOnSketchCandle: noTradeOnSketchCandle ?? false,
          notes: notes || null,
          userId: user.id,
        },
      });
    }

    return NextResponse.json(withScore(entry));
  } catch (error) {
    return handleApiError(error, 'saving rule adherence entry');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return validationError('Entry ID is required');
    }

    const entry = await prisma.dailyRuleAdherence.findFirst({
      where: { id, userId: user.id },
    });

    if (!entry) {
      return notFoundResponse('Rule adherence entry');
    }

    await prisma.dailyRuleAdherence.delete({
      where: { id },
    });

    return successResponse();
  } catch (error) {
    return handleApiError(error, 'deleting rule adherence entry');
  }
}
