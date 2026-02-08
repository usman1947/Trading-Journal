import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError, validationError, notFoundResponse, errorResponse, successResponse } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const account = await prisma.account.findFirst({
      where: { id, userId: user.id },
      include: {
        _count: {
          select: { trades: true },
        },
      },
    });

    if (!account) {
      return notFoundResponse('Account');
    }

    return NextResponse.json(account);
  } catch (error) {
    return handleApiError(error, 'fetching account');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const { name, description, initialBalance, isSwingAccount } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return validationError('Account name is required');
    }

    // Verify ownership
    const existing = await prisma.account.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return notFoundResponse('Account');
    }

    const account = await prisma.account.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        initialBalance: typeof initialBalance === 'number' ? Math.max(0, initialBalance) : existing.initialBalance,
        isSwingAccount: isSwingAccount ?? existing.isSwingAccount,
      },
    });

    return NextResponse.json(account);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return validationError('An account with this name already exists');
    }
    return handleApiError(error, 'updating account');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.account.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return notFoundResponse('Account');
    }

    // Check if account has trades
    const tradeCount = await prisma.trade.count({
      where: { accountId: id, userId: user.id },
    });

    if (tradeCount > 0) {
      return errorResponse(`Cannot delete account with ${tradeCount} trades. Move or delete the trades first.`);
    }

    await prisma.account.delete({
      where: { id },
    });

    return successResponse();
  } catch (error: unknown) {
    return handleApiError(error, 'deleting account');
  }
}
