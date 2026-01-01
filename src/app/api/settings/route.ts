import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    let settings = await prisma.settings.findUnique({
      where: { userId: user.id },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId: user.id,
          defaultRisk: 100,
          currency: 'USD',
          theme: 'light',
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const { defaultRisk, currency, theme, defaultAccountId } = body;

    const settings = await prisma.settings.upsert({
      where: { userId: user.id },
      update: {
        defaultRisk: defaultRisk ?? undefined,
        currency: currency ?? undefined,
        theme: theme ?? undefined,
        defaultAccountId: defaultAccountId !== undefined ? defaultAccountId : undefined,
      },
      create: {
        userId: user.id,
        defaultRisk: defaultRisk ?? 100,
        currency: currency ?? 'USD',
        theme: theme ?? 'light',
        defaultAccountId: defaultAccountId ?? null,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
