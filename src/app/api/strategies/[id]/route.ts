import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import {
  handleApiError,
  notFoundResponse,
  successResponse,
  validationError,
} from '@/lib/api-helpers';
import { deserializeSetups, serializeSetups } from '@/utils/trade-calculations';
import { updateStrategySchema, formatZodError } from '@/lib/validation-schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const strategy = await prisma.strategy.findFirst({
      where: { id, userId: user.id },
      include: {
        screenshots: {
          orderBy: { createdAt: 'asc' as const },
        },
        _count: {
          select: { trades: true },
        },
      },
    });

    if (!strategy) {
      return notFoundResponse('Strategy');
    }

    return NextResponse.json({
      ...strategy,
      setups: deserializeSetups(strategy.setups),
    });
  } catch (error) {
    return handleApiError(error, 'fetching strategy');
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.strategy.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return notFoundResponse('Strategy');
    }

    const body = await request.json();
    const parsed = updateStrategySchema.safeParse(body);
    if (!parsed.success) {
      return validationError(formatZodError(parsed.error));
    }
    const {
      name,
      description,
      setups,
      isSwingStrategy,
      checkPlanDesc,
      checkJudgeDesc,
      checkExecuteDesc,
      checkManageDesc,
    } = parsed.data;

    const strategy = await prisma.strategy.update({
      where: { id },
      data: {
        name,
        description: description || null,
        setups: serializeSetups(setups),
        isSwingStrategy: isSwingStrategy ?? existing.isSwingStrategy,
        checkPlanDesc: checkPlanDesc !== undefined ? checkPlanDesc || null : undefined,
        checkJudgeDesc: checkJudgeDesc !== undefined ? checkJudgeDesc || null : undefined,
        checkExecuteDesc: checkExecuteDesc !== undefined ? checkExecuteDesc || null : undefined,
        checkManageDesc: checkManageDesc !== undefined ? checkManageDesc || null : undefined,
      },
      include: {
        screenshots: {
          orderBy: { createdAt: 'asc' as const },
        },
      },
    });

    return NextResponse.json({
      ...strategy,
      setups: deserializeSetups(strategy.setups),
    });
  } catch (error) {
    return handleApiError(error, 'updating strategy');
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
    const existing = await prisma.strategy.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return notFoundResponse('Strategy');
    }

    await prisma.strategy.delete({
      where: { id },
    });

    return successResponse();
  } catch (error) {
    return handleApiError(error, 'deleting strategy');
  }
}
