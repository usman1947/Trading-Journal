import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: strategyId } = await params;

    // Verify strategy exists
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const caption = formData.get('caption') as string | null;

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const screenshots = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // Upload to Cloudinary in a strategy folder
      const result = await uploadToCloudinary(buffer, filename, `strategy-${strategyId}`);

      const screenshot = await prisma.strategyScreenshot.create({
        data: {
          filename: file.name,
          path: result.secure_url,
          publicId: result.public_id,
          caption: caption || null,
          strategyId,
        },
      });

      screenshots.push(screenshot);
    }

    return NextResponse.json(screenshots, { status: 201 });
  } catch (error) {
    console.error('Error uploading strategy screenshots:', error);
    return NextResponse.json({ error: 'Failed to upload screenshots' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: strategyId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const screenshotId = searchParams.get('screenshotId');

    if (!screenshotId) {
      return NextResponse.json({ error: 'Screenshot ID is required' }, { status: 400 });
    }

    // Find the screenshot
    const screenshot = await prisma.strategyScreenshot.findFirst({
      where: {
        id: screenshotId,
        strategyId,
      },
    });

    if (!screenshot) {
      return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
    }

    // Delete from Cloudinary
    if (screenshot.publicId) {
      await deleteFromCloudinary(screenshot.publicId);
    }

    // Delete from database
    await prisma.strategyScreenshot.delete({
      where: { id: screenshotId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting strategy screenshot:', error);
    return NextResponse.json({ error: 'Failed to delete screenshot' }, { status: 500 });
  }
}
