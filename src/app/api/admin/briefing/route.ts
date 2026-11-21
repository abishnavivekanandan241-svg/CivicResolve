import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { summarizeBacklog } from '@/lib/gemini';

export async function GET() {
  try {
    const now = new Date();
    const openIssues = await prisma.issue.findMany({
      where: {
        status: { in: ['REPORTED', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        trackingId: true,
        title: true,
        category: true,
        department: true,
        ward: true,
        locationText: true,
        priority: true,
        priorityScore: true,
        status: true,
        slaDueAt: true,
      },
      orderBy: { priorityScore: 'desc' },
    });

    const issuesForAi = openIssues.map((issue) => ({
      ...issue,
      isSlaBreached: Boolean(issue.slaDueAt && new Date(issue.slaDueAt) < now),
    }));

    const briefing = await summarizeBacklog(issuesForAi);

    return NextResponse.json({
      success: true,
      briefing,
      openCount: openIssues.length,
    });
  } catch (error) {
    console.error('Admin briefing error:', error);
    return NextResponse.json({ error: 'Failed to generate operational briefing' }, { status: 500 });
  }
}

