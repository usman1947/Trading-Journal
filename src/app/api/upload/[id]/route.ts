import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const screenshot = await prisma.screenshot.findUnique({
      where: { id },
    });

    if (!screenshot) {
      return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
    }

    // Delete file from filesystem
    try {
      const filepath = path.join(process.cwd(), 'public', screenshot.path);
      await unlink(filepath);
    } catch {
      // File might not exist, continue with database deletion
    }

    // Delete from database
    await prisma.screenshot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting screenshot:', error);
    return NextResponse.json({ error: 'Failed to delete screenshot' }, { status: 500 });
  }
}
