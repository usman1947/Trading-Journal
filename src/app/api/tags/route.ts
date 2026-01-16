import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError, validationError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const tags = await prisma.tag.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { trades: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(tags);
  } catch (error) {
    return handleApiError(error, 'fetching tags');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const { name, color = '#1976d2' } = body;

    if (!name) {
      return validationError('Name is required');
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color,
        userId: user.id,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'creating tag');
  }
}
