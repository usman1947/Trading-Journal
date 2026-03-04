import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { handleApiError, validationError } from '@/lib/api-helpers';
import { applyAccountFilter } from '@/lib/query-helpers';
import { deserializeSetups, serializeSetups } from '@/utils/trade-calculations';
import { createStrategySchema, formatZodError } from '@/lib/validation-schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const accountIdParam = searchParams.get('accountId');

    // Build the trade count filter based on accountId
    const tradeCountWhere: Record<string, unknown> = { userId: user.id };
    applyAccountFilter(tradeCountWhere, accountIdParam);

    const strategies = await prisma.strategy.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            trades: {
              where: tradeCountWhere,
            },
          },
        },
        screenshots: {
          orderBy: { createdAt: 'asc' as const },
        },
      },
      orderBy: { name: 'asc' as const },
    });

    // Parse setups JSON for each strategy
    const parsed = strategies.map((s: { setups: string | null; _count: { trades: number } }) => ({
      ...s,
      setups: deserializeSetups(s.setups),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    return handleApiError(error, 'fetching strategies');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const parsed = createStrategySchema.safeParse(body);
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

    const strategy = await prisma.strategy.create({
      data: {
        name,
        description: description || null,
        setups: serializeSetups(setups),
        isSwingStrategy: isSwingStrategy ?? false,
        userId: user.id,
        checkPlanDesc: checkPlanDesc || null,
        checkJudgeDesc: checkJudgeDesc || null,
        checkExecuteDesc: checkExecuteDesc || null,
        checkManageDesc: checkManageDesc || null,
      },
      include: {
        screenshots: {
          orderBy: { createdAt: 'asc' as const },
        },
      },
    });

    return NextResponse.json(
      { ...strategy, setups: deserializeSetups(strategy.setups) },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'creating strategy');
  }
}
