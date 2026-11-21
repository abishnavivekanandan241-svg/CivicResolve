import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { summarizeBacklog } from '@/lib/gemini';
import { getOrTranslateEntityFields } from '@/lib/translation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = (searchParams.get('lang') || 'en').toLowerCase().trim();

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

    let finalBriefing = briefing;

    if (lang !== 'en' && briefing) {
      const payload: Record<string, string> = {
        headline: briefing.headline,
      };

      briefing.topClusters?.forEach((c, idx) => {
        payload[`cluster_title_${idx}`] = c.title;
        payload[`cluster_desc_${idx}`] = c.description;
      });

      briefing.suggestedWorkOrders?.forEach((wo, idx) => {
        payload[`wo_crew_${idx}`] = wo.crewTitle;
        payload[`wo_benefit_${idx}`] = wo.benefit;
      });

      const translated = await getOrTranslateEntityFields({
        entityType: 'BriefingMetadata',
        entityId: 'today',
        fields: payload,
        targetLang: lang,
      });

      finalBriefing = {
        ...briefing,
        headline: translated.headline || briefing.headline,
        topClusters: briefing.topClusters?.map((c, idx) => ({
          ...c,
          title: translated[`cluster_title_${idx}`] || c.title,
          description: translated[`cluster_desc_${idx}`] || c.description,
        })) || [],
        suggestedWorkOrders: briefing.suggestedWorkOrders?.map((wo, idx) => ({
          ...wo,
          crewTitle: translated[`wo_crew_${idx}`] || wo.crewTitle,
          benefit: translated[`wo_benefit_${idx}`] || wo.benefit,
        })) || [],
      };
    }

    return NextResponse.json({
      success: true,
      briefing: finalBriefing,
      openCount: openIssues.length,
    });
  } catch (error) {
    console.error('Admin briefing error:', error);
    return NextResponse.json({ error: 'Failed to generate operational briefing' }, { status: 500 });
  }
}

