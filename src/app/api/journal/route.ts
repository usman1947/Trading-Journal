import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: Record<string, unknown> = {};

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
    const body = await request.json();
    const { date, notes, mood, lessons } = body;

    if (!date || !notes) {
      return NextResponse.json({ error: 'Date and notes are required' }, { status: 400 });
    }

    // Parse as UTC noon to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

    // Upsert - create or update
    const entry = await prisma.dailyJournal.upsert({
      where: { date: dateObj },
      update: {
        notes,
        mood: mood || null,
        lessons: lessons || null,
      },
      create: {
        date: dateObj,
        notes,
        mood: mood || null,
        lessons: lessons || null,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error saving journal entry:', error);
    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Journal entry ID is required' }, { status: 400 });
    }

    // Get the entry with screenshots to delete from Cloudinary
    const entry = await prisma.dailyJournal.findUnique({
      where: { id },
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
