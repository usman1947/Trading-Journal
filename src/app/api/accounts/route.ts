import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError, validationError } from '@/lib/api-helpers';
import { createAccountSchema, formatZodError } from '@/lib/validation-schemas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    return handleApiError(error, 'fetching accounts');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const parsed = createAccountSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(formatZodError(parsed.error));
    }
    const { name, description, initialBalance, isSwingAccount } = parsed.data;

    const account = await prisma.account.create({
      data: {
        name,
        description: description?.trim() || null,
        initialBalance,
        isSwingAccount,
        userId: user.id,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return validationError('An account with this name already exists');
    }
    return handleApiError(error, 'creating account');
  }
}
