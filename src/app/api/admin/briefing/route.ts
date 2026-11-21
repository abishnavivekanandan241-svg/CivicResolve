import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { summarizeBacklog } from '@/lib/gemini';
import { getOrTranslateEntityFields } from '@/lib/translation';
import crypto from 'crypto';

interface CachedBriefing {
  data: any;
  hash: string;
  cachedAt: number;
}

let cachedBriefing: CachedBriefing | null = null;
const BRIEFING_TTL_MS = 15 * 60 * 1000; // 15 minutes

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

    // Cache key based on open issues state
    const currentFingerprint = issuesForAi
      .map((i) => `${i.id}:${i.status}:${i.priorityScore}`)
      .join('|');
    const stateHash = crypto.createHash('md5').update(currentFingerprint).digest('hex');

    let rawBriefing: any = null;
    const nowMs = Date.now();

    if (
      cachedBriefing &&
      cachedBriefing.hash === stateHash &&
      nowMs - cachedBriefing.cachedAt < BRIEFING_TTL_MS
    ) {
      rawBriefing = cachedBriefing.data;
    } else {
      rawBriefing = await summarizeBacklog(issuesForAi);
      cachedBriefing = {
        data: rawBriefing,
        hash: stateHash,
        cachedAt: nowMs,
      };
    }

    let finalBriefing = rawBriefing;

    if (lang !== 'en' && rawBriefing) {
      const payload: Record<string, string> = {
        headline: rawBriefing.headline,
      };

      rawBriefing.topClusters?.forEach((c: any, idx: number) => {
        payload[`cluster_title_${idx}`] = c.title;
        payload[`cluster_desc_${idx}`] = c.description;
      });

      rawBriefing.suggestedWorkOrders?.forEach((wo: any, idx: number) => {
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
        ...rawBriefing,
        headline: translated.headline || rawBriefing.headline,
        topClusters: rawBriefing.topClusters?.map((c: any, idx: number) => ({
          ...c,
          title: translated[`cluster_title_${idx}`] || c.title,
          description: translated[`cluster_desc_${idx}`] || c.description,
        })),
        suggestedWorkOrders: rawBriefing.suggestedWorkOrders?.map((wo: any, idx: number) => ({
          ...wo,
          crewTitle: translated[`wo_crew_${idx}`] || wo.crewTitle,
          benefit: translated[`wo_benefit_${idx}`] || wo.benefit,
        })),
      };
    }

    return NextResponse.json({
      success: true,
      briefing: finalBriefing,
      openCount: openIssues.length,
      cached: cachedBriefing ? cachedBriefing.hash === stateHash : false,
    });
  } catch (error) {
    console.error('Admin briefing error:', error);
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
  }
}
