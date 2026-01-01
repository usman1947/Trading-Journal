import { NextRequest, NextResponse } from 'next/server';
import { getStrategyStats } from '@/lib/analytics';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const accountIdParam = searchParams.get('accountId');
    const filters = {
      accountId: accountIdParam !== null ? accountIdParam : undefined,
      userId: user.id,
    };

    const stats = await getStrategyStats(filters);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching strategy stats:', error);
    return NextResponse.json({ error: 'Failed to fetch strategy stats' }, { status: 500 });
  }
}
