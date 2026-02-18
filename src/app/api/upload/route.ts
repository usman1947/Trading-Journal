import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILES = 10;

/**
 * Validate a single file's size and type.
 */
function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `File "${file.name}" has unsupported type "${file.type}". Allowed: ${ALLOWED_TYPES.join(', ')}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" exceeds maximum size of 5MB`;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const tradeId = searchParams.get('tradeId');
    const folder = searchParams.get('folder');

    const formData = await request.formData();

    // Handle avatar upload (single file, returns URL)
    if (folder === 'avatars') {
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const fileError = validateFile(file);
      if (fileError) {
        return NextResponse.json({ error: fileError }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `avatar-${user.id}-${Date.now()}`;

      const result = await uploadToCloudinary(buffer, filename, 'avatars');

      return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
    }

    // Handle trade screenshot upload (requires tradeId)
    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    // Verify trade belongs to user
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId: user.id },
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${MAX_FILES} files allowed per upload.` },
        { status: 400 }
      );
    }

    // Validate all files before processing any
    for (const file of files) {
      const fileError = validateFile(file);
      if (fileError) {
        return NextResponse.json({ error: fileError }, { status: 400 });
      }
    }

    const screenshots = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const result = await uploadToCloudinary(buffer, filename, tradeId);

      const screenshot = await prisma.screenshot.create({
        data: {
          filename: file.name,
          path: result.secure_url,
          publicId: result.public_id,
          tradeId,
        },
      });

      screenshots.push(screenshot);
    }

    return NextResponse.json(screenshots, { status: 201 });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}
