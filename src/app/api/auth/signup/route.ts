import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, createToken } from '@/lib/auth';
import { createAuthResponse } from '@/lib/auth-helpers';
import { handleApiError, validationError } from '@/lib/api-helpers';
import { signupSchema, formatZodError } from '@/lib/validation-schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(formatZodError(parsed.error));
    }
    const { email, password, name } = parsed.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return validationError(
        'Unable to create account. Please try again or use a different email.'
      );
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
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
