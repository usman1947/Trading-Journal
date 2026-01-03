import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

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

    const entries = await prisma.dailyJournal.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { screenshots: true },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const {
      date,
      notes,
      mood,
      lessons,
      // AI-ready fields
      energyLevel,
      sleepQuality,
      focusLevel,
      premarketPlan,
    } = body;

    if (!date || !notes) {
      return NextResponse.json({ error: 'Date and notes are required' }, { status: 400 });
    }

    // Parse as UTC noon to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

    // Upsert - create or update (with userId constraint)
    const existing = await prisma.dailyJournal.findFirst({
      where: { userId: user.id, date: dateObj },
    });

    let entry;
    if (existing) {
      entry = await prisma.dailyJournal.update({
        where: { id: existing.id },
        data: {
          notes,
          mood: mood || null,
          lessons: lessons || null,
          // AI-ready fields
          energyLevel: energyLevel ?? null,
          sleepQuality: sleepQuality ?? null,
          focusLevel: focusLevel ?? null,
          premarketPlan: premarketPlan ?? false,
        },
      });
    } else {
      entry = await prisma.dailyJournal.create({
        data: {
          date: dateObj,
          notes,
          mood: mood || null,
          lessons: lessons || null,
          userId: user.id,
          // AI-ready fields
          energyLevel: energyLevel ?? null,
          sleepQuality: sleepQuality ?? null,
          focusLevel: focusLevel ?? null,
          premarketPlan: premarketPlan ?? false,
        },
      });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error saving journal entry:', error);
    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Journal entry ID is required' }, { status: 400 });
    }

    // Get the entry with screenshots to delete from Cloudinary
    const entry = await prisma.dailyJournal.findFirst({
      where: { id, userId: user.id },
      include: { screenshots: true },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    // Delete screenshots from Cloudinary
    for (const screenshot of entry.screenshots) {
      if (screenshot.publicId) {
        await deleteFromCloudinary(screenshot.publicId);
      }
    }

    // Delete the journal entry (screenshots will cascade delete)
    await prisma.dailyJournal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    return NextResponse.json({ error: 'Failed to delete journal entry' }, { status: 500 });
  }
}
