import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError, validationError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { name, avatarUrl, currentPassword, newPassword } = body;

    // Build update data
    const updateData: {
      name?: string;
      avatarUrl?: string | null;
      passwordHash?: string;
    } = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return validationError('Name cannot be empty');
      }
      updateData.name = name.trim();
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl || null;
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return validationError('Current password is required to change password');
      }

      if (newPassword.length < 6) {
        return validationError('New password must be at least 6 characters');
      }

      // Get user with password hash
      const userWithPassword = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!userWithPassword) {
        return unauthorizedResponse();
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, userWithPassword.passwordHash);

      if (!isValid) {
        return validationError('Current password is incorrect');
      }

      updateData.passwordHash = await hashPassword(newPassword);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return handleApiError(error, 'updating profile');
  }
}
