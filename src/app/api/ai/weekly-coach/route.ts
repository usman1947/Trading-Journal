import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';
import { getWeeklyStats } from '@/lib/weekly-stats';
import { generateCoachingInsights } from '@/lib/groq-client';
import { buildCoachingPrompt, type PreviousWeekContext } from '@/lib/coach-prompt';
import prisma from '@/lib/prisma';
import { startOfWeek, endOfWeek, parseISO, subWeeks, format } from 'date-fns';

export const dynamic = 'force-dynamic';

// GET - Retrieve existing coaching report for a week
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const weekDateParam = searchParams.get('weekDate');
    const accountIdParam = searchParams.get('accountId');

    const weekDate = weekDateParam ? parseISO(weekDateParam) : new Date();
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });

    // Normalize accountId - paper/empty string means null (Paper Account)
    const accountId = accountIdParam === 'paper' || accountIdParam === '' ? null : accountIdParam;

    const report = await prisma.weeklyCoachReport.findFirst({
      where: {
        userId: user.id,
        accountId: accountId,
        weekStart,
      },
    });

    if (!report) {
      return NextResponse.json({ exists: false, report: null });
    }

    return NextResponse.json({
      exists: true,
      report: {
        ...report,
        strengths: JSON.parse(report.strengths),
        improvements: JSON.parse(report.improvements),
        actionItems: JSON.parse(report.actionItems),
        moodDistribution: report.moodDistribution ? JSON.parse(report.moodDistribution) : null,
      },
    });
  } catch (error) {
    console.error('Error fetching weekly coach report:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

// POST - Generate new coaching report
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const { weekDate, accountId: accountIdParam } = body;

    const targetDate = weekDate ? parseISO(weekDate) : new Date();
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    // Normalize accountId
    const accountId = accountIdParam === 'paper' || accountIdParam === '' ? null : accountIdParam;

    // Get weekly stats
    const stats = await getWeeklyStats(user.id, accountId, targetDate);

    if (!stats || stats.totalTrades === 0) {
      return NextResponse.json({ error: 'No trades found for this week' }, { status: 400 });
    }

    // Fetch previous week's report for context
    const previousWeekStart = startOfWeek(subWeeks(targetDate, 1), { weekStartsOn: 1 });
    const previousWeekEnd = endOfWeek(subWeeks(targetDate, 1), { weekStartsOn: 1 });
    const previousReport = await prisma.weeklyCoachReport.findFirst({
      where: {
        userId: user.id,
        accountId: accountId,
        weekStart: previousWeekStart,
      },
    });

    // Build previous week context if report exists
    let previousWeekContext: PreviousWeekContext | null = null;
    if (previousReport) {
      previousWeekContext = {
        weekRange: `${format(previousWeekStart, 'MMM d')} - ${format(previousWeekEnd, 'MMM d')}`,
        totalTrades: previousReport.totalTrades,
        winRate: previousReport.winRate,
        totalPnl: previousReport.totalPnl,
        avgWinnerR: previousReport.avgWinnerR,
        avgLoserR: previousReport.avgLoserR,
        executionRate: previousReport.executionRate,
        summary: previousReport.summary,
        commonTheme: previousReport.commonTheme ?? null,
        strengths: JSON.parse(previousReport.strengths),
        improvements: JSON.parse(previousReport.improvements),
        actionItems: JSON.parse(previousReport.actionItems),
      };
    }

    // Generate coaching insights
    const prompt = buildCoachingPrompt(stats, previousWeekContext);
    const aiResponse = await generateCoachingInsights(prompt);

    let insights: {
      summary: string;
      commonTheme?: string;
      progressNotes?: string;
      strengths: string[];
      improvements: string[];
      actionItems: string[];
    };
    try {
      insights = JSON.parse(aiResponse);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Check if report already exists
    const existingReport = await prisma.weeklyCoachReport.findFirst({
      where: {
        userId: user.id,
        accountId: accountId,
        weekStart,
      },
    });

    const reportData = {
      weekEnd,
      totalTrades: stats.totalTrades,
      winRate: stats.winRate,
      totalPnl: stats.totalPnl,
      avgWinnerR: stats.avgWinnerR,
      avgLoserR: stats.avgLoserR,
      executionRate: stats.executionRate,
      avgConfidence: stats.avgConfidence,
      mostCommonMistake: stats.mostCommonMistake,
      moodDistribution: JSON.stringify(stats.moodDistribution),
      summary: insights.summary,
      commonTheme: insights.commonTheme ?? null,
      progressNotes: insights.progressNotes ?? null,
      strengths: JSON.stringify(insights.strengths),
      improvements: JSON.stringify(insights.improvements),
      actionItems: JSON.stringify(insights.actionItems),
      generatedAt: new Date(),
    };

    let report;
    if (existingReport) {
      report = await prisma.weeklyCoachReport.update({
        where: { id: existingReport.id },
        data: reportData,
      });
    } else {
      report = await prisma.weeklyCoachReport.create({
        data: {
          userId: user.id,
          accountId: accountId,
          weekStart,
          ...reportData,
        },
      });
    }

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        commonTheme: insights.commonTheme ?? null,
        progressNotes: insights.progressNotes ?? null,
        strengths: insights.strengths,
        improvements: insights.improvements,
        actionItems: insights.actionItems,
        moodDistribution: stats.moodDistribution,
      },
    });
  } catch (error) {
    console.error('Error generating weekly coach report:', error);
    return NextResponse.json({ error: 'Failed to generate coaching report' }, { status: 500 });
  }
}
