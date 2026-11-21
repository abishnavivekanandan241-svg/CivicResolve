import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { translateCompleteIssue } from '@/lib/translation';

export async function GET(
  request: Request,
  props: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await props.params;
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';

    const issue = await prisma.issue.findFirst({
      where: {
        OR: [
          { trackingId: trackingId.toUpperCase().trim() },
          { trackingId: { contains: trackingId.trim() } },
          { id: trackingId.trim() },
        ],
      },
      include: {
        reporter: {
          select: { name: true },
        },
        statusEvents: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: { name: true, role: true },
            },
          },
        },
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: `No grievance found matching Tracking ID "${trackingId}"` },
        { status: 404 }
      );
    }

    const isSlaBreached = issue.status !== 'RESOLVED' && issue.slaDueAt ? new Date(issue.slaDueAt) < new Date() : false;

    // Translate issue if requested language is not English
    let returnIssue: any = { ...issue, isSlaBreached };
    if (lang && lang !== 'en') {
      try {
        returnIssue = await translateCompleteIssue(returnIssue, lang);
      } catch (err) {
        console.error('Translation error in tracking route:', err);
      }
    }

    return NextResponse.json({
      success: true,
      issue: returnIssue,
    });
  } catch (error) {
    console.error('Tracking query error:', error);
    return NextResponse.json({ error: 'Tracking service error' }, { status: 500 });
  }
}


