import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const journalId = searchParams.get('journalId');

    if (!journalId) {
      return NextResponse.json({ error: 'Journal ID is required' }, { status: 400 });
    }

    // Verify journal exists and belongs to user
    const journal = await prisma.dailyJournal.findFirst({
      where: { id: journalId, userId: user.id },
    });

    if (!journal) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const screenshots = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const result = await uploadToCloudinary(buffer, filename, `journal-${journalId}`);

      const screenshot = await prisma.journalScreenshot.create({
        data: {
          filename: file.name,
          path: result.secure_url,
          publicId: result.public_id,
          journalId,
        },
      });

      screenshots.push(screenshot);
    }

    return NextResponse.json(screenshots, { status: 201 });
  } catch (error) {
    console.error('Error uploading journal screenshots:', error);
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const screenshotId = searchParams.get('screenshotId');

    if (!screenshotId) {
      return NextResponse.json({ error: 'Screenshot ID is required' }, { status: 400 });
    }

    // Find screenshot and verify ownership through journal
    const screenshot = await prisma.journalScreenshot.findUnique({
      where: { id: screenshotId },
      include: { journal: true },
    });

    if (!screenshot || screenshot.journal.userId !== user.id) {
      return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
    }

    // Delete from Cloudinary
    if (screenshot.publicId) {
      await deleteFromCloudinary(screenshot.publicId);
    }

    // Delete from database
    await prisma.journalScreenshot.delete({
      where: { id: screenshotId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting journal screenshot:', error);
    return NextResponse.json({ error: 'Failed to delete screenshot' }, { status: 500 });
  }
}
