import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to upvote' }, { status: 401 });
    }

    const issue = await prisma.issue.findFirst({
      where: { OR: [{ id }, { trackingId: id }] },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Grievance not found' }, { status: 404 });
    }

    // Check existing upvote
    const existingUpvote = await prisma.upvote.findUnique({
      where: {
        userId_issueId: {
          userId: user.id,
          issueId: issue.id,
        },
      },
    });

    let newUpvotes = issue.upvotes;
    let hasUpvoted = false;
    let newScore = issue.priorityScore;

    if (existingUpvote) {
      // Remove upvote
      await prisma.upvote.delete({
        where: { id: existingUpvote.id },
      });
      newUpvotes = Math.max(0, issue.upvotes - 1);
      hasUpvoted = false;
      newScore = Math.max(0, issue.priorityScore - 1);
    } else {
      // Add upvote
      await prisma.upvote.create({
        data: {
          userId: user.id,
          issueId: issue.id,
        },
      });
      newUpvotes = issue.upvotes + 1;
      hasUpvoted = true;
      // Citizen upvotes raise priority score by 2
      newScore = Math.min(100, issue.priorityScore + 2);
    }

    const updated = await prisma.issue.update({
      where: { id: issue.id },
      data: {
        upvotes: newUpvotes,
        priorityScore: newScore,
      },
      select: { id: true, trackingId: true, upvotes: true, priorityScore: true },
    });

    return NextResponse.json({
      success: true,
      hasUpvoted,
      upvotes: updated.upvotes,
      priorityScore: updated.priorityScore,
    });
  } catch (error) {
    console.error('Upvote error:', error);
    return NextResponse.json({ error: 'Failed to process upvote' }, { status: 500 });
  }
}

