import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    // Find screenshot and verify ownership through trade
    const screenshot = await prisma.screenshot.findUnique({
      where: { id },
      include: { trade: true },
    });

    if (!screenshot || screenshot.trade.userId !== user.id) {
      return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
    }

    // Delete from Cloudinary
    if (screenshot.publicId) {
      try {
        await deleteFromCloudinary(screenshot.publicId);
      } catch {
        // Continue with database deletion even if Cloudinary delete fails
        console.error('Failed to delete from Cloudinary');
      }
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
