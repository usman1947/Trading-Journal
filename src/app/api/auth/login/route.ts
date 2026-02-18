import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createToken } from '@/lib/auth';
import { createAuthResponse } from '@/lib/auth-helpers';
import { handleApiError, validationError, errorResponse } from '@/lib/api-helpers';
import { loginSchema, formatZodError } from '@/lib/validation-schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(formatZodError(parsed.error));
    }
    const { email, password } = parsed.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return errorResponse('Invalid email or password', 401);
    }

    // Create token and return response with cookie
    const token = await createToken(user.id);
    return createAuthResponse(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      token
    );
  } catch (error) {
    return handleApiError(error, 'logging in');
  }
}
