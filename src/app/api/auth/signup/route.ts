import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, createToken } from '@/lib/auth';
import { createAuthResponse } from '@/lib/auth-helpers';
import { handleApiError, validationError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password || !name) {
      return validationError('Email, password, and name are required');
    }

    if (password.length < 6) {
      return validationError('Password must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return validationError('An account with this email already exists');
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    // Create default settings for the user
    await prisma.settings.create({
      data: {
        userId: user.id,
        defaultRisk: 100,
        currency: 'USD',
        theme: 'light',
      },
    });

    // Create token and return response with cookie
    const token = await createToken(user.id);
    return createAuthResponse(user, token, 201);
  } catch (error) {
    return handleApiError(error, 'creating account');
  }
}
