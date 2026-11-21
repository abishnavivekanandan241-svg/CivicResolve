import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  props: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await props.params;

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

    return NextResponse.json({
      success: true,
      issue: {
        ...issue,
        isSlaBreached,
      },
    });
  } catch (error) {
    console.error('Tracking query error:', error);
    return NextResponse.json({ error: 'Tracking service error' }, { status: 500 });
  }
}

