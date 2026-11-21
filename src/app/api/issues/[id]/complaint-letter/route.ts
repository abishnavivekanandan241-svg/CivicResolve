import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateFormalComplaint } from '@/lib/gemini';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await getCurrentUser();

    const issue = await prisma.issue.findFirst({
      where: { OR: [{ id }, { trackingId: id }] },
      include: {
        reporter: {
          select: { name: true },
        },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Grievance not found' }, { status: 404 });
    }

    const letter = await generateFormalComplaint({
      trackingId: issue.trackingId,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      department: issue.department,
      locationText: issue.locationText,
      ward: issue.ward,
      createdAt: issue.createdAt,
      citizenName: user?.name || issue.reporter?.name || 'Resident of Erode',
      priority: issue.priority,
    });

    return NextResponse.json({
      success: true,
      letter,
      trackingId: issue.trackingId,
    });
  } catch (error) {
    console.error('Complaint letter error:', error);
    return NextResponse.json({ error: 'Failed to generate complaint letter' }, { status: 500 });
  }
}

