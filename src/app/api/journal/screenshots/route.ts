import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import {
  handleApiError,
  validationError,
  notFoundResponse,
  successResponse,
} from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILES = 10;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const journalId = searchParams.get('journalId');

    if (!journalId) {
      return validationError('Journal ID is required');
    }

    // Verify journal exists and belongs to user
    const journal = await prisma.dailyJournal.findFirst({
      where: { id: journalId, userId: user.id },
    });

    if (!journal) {
      return notFoundResponse('Journal entry');
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return validationError('No files uploaded');
    }

    if (files.length > MAX_FILES) {
      return validationError(`Too many files. Maximum ${MAX_FILES} files allowed per upload.`);
    }

    // Validate all files before processing any
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return validationError(
          `File "${file.name}" has unsupported type "${file.type}". Allowed: ${ALLOWED_TYPES.join(', ')}`
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return validationError(`File "${file.name}" exceeds maximum size of 5MB`);
      }
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
    return handleApiError(error, 'uploading journal screenshots');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const screenshotId = searchParams.get('screenshotId');

    if (!screenshotId) {
      return validationError('Screenshot ID is required');
    }

    // Find screenshot and verify ownership through journal
    const screenshot = await prisma.journalScreenshot.findUnique({
      where: { id: screenshotId },
      include: { journal: true },
    });

    if (!screenshot || screenshot.journal.userId !== user.id) {
      return notFoundResponse('Screenshot');
    }

    // Delete from Cloudinary
    if (screenshot.publicId) {
      await deleteFromCloudinary(screenshot.publicId);
    }

    // Delete from database
    await prisma.journalScreenshot.delete({
      where: { id: screenshotId },
    });

    return successResponse();
  } catch (error) {
    return handleApiError(error, 'deleting journal screenshot');
  }
}
