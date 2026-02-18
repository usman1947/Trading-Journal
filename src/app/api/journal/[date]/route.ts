import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError, notFoundResponse } from '@/lib/api-helpers';
import { JOURNAL_WITH_SCREENSHOTS_INCLUDE } from '@/lib/prisma-includes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { date } = await params;
    // Parse as UTC noon to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

    const entry = await prisma.dailyJournal.findFirst({
      where: { userId: user.id, date: dateObj },
      include: JOURNAL_WITH_SCREENSHOTS_INCLUDE,
    });

    if (!entry) {
      return notFoundResponse('Journal entry');
    }

    return NextResponse.json(entry);
  } catch (error) {
    return handleApiError(error, 'fetching journal entry');
  }
}
