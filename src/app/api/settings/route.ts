import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 'default',
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
    const body = await request.json();
    const { defaultRisk, currency, theme } = body;

    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        defaultRisk: defaultRisk ?? undefined,
        currency: currency ?? undefined,
        theme: theme ?? undefined,
      },
      create: {
        id: 'default',
        defaultRisk: defaultRisk ?? 100,
        currency: currency ?? 'USD',
        theme: theme ?? 'light',
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
