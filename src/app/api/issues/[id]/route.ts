import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { draftStatusUpdate } from '@/lib/gemini';
import { translateCompleteIssue } from '@/lib/translation';

const patchSchema = z.object({
  status: z.enum(['REPORTED', 'IN_PROGRESS', 'RESOLVED']).optional(),
  note: z.string().optional(),
  assignedOfficer: z.string().optional(),
  overrideCategory: z.string().optional(),
  overridePriority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  overridePriorityScore: z.number().min(0).max(100).optional(),
  overrideDepartment: z.string().optional(),
  resolutionImageUrl: z.string().optional(),
  resolutionNote: z.string().optional(),
  resolutionVerified: z.boolean().optional(),
});

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await getCurrentUser();

    const issue = await prisma.issue.findFirst({
      where: {
        OR: [{ id }, { trackingId: id }],
      },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        duplicateOf: {
          select: { id: true, trackingId: true, title: true, status: true },
        },
        duplicates: {
          select: { id: true, trackingId: true, title: true, status: true, createdAt: true },
        },
        statusEvents: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        userUpvotes: user
          ? {
            where: { userId: user.id },
            select: { id: true },
          }
          : false,
      },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Grievance not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';

    const enriched = {
      ...issue,
      hasUpvoted: user ? (issue as any).userUpvotes?.length > 0 : false,
      isSlaBreached: issue.status !== 'RESOLVED' && issue.slaDueAt ? new Date(issue.slaDueAt) < new Date() : false,
    };

    const translatedIssue = await translateCompleteIssue(enriched, lang);

    return NextResponse.json({ success: true, issue: translatedIssue });
  } catch (error) {
    console.error('Get issue error:', error);
    return NextResponse.json({ error: 'Failed to retrieve grievance' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await getCurrentUser();
    const json = await request.json();
    const parsed = patchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.issue.findFirst({
      where: { OR: [{ id }, { trackingId: id }] },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Grievance not found' }, { status: 404 });
    }

    const updateData: any = {};
    const auditNotes: string[] = [];
    const payload = parsed.data;

    // Handle Human Overrides
    if (payload.overrideCategory && payload.overrideCategory !== existing.category) {
      updateData.category = payload.overrideCategory;
      updateData.isHumanOverridden = true;
      auditNotes.push(`Category overridden from "${existing.category}" to "${payload.overrideCategory}"`);
    }

    if (payload.overridePriority && payload.overridePriority !== existing.priority) {
      updateData.priority = payload.overridePriority;
      updateData.isHumanOverridden = true;
      auditNotes.push(`Priority overridden from "${existing.priority}" to "${payload.overridePriority}"`);
    }

    if (payload.overridePriorityScore !== undefined && payload.overridePriorityScore !== existing.priorityScore) {
      updateData.priorityScore = payload.overridePriorityScore;
      updateData.isHumanOverridden = true;
      auditNotes.push(`Priority score adjusted to ${payload.overridePriorityScore}/100`);
    }

    if (payload.overrideDepartment && payload.overrideDepartment !== existing.department) {
      updateData.department = payload.overrideDepartment;
      updateData.isHumanOverridden = true;
      auditNotes.push(`Department re-routed from "${existing.department}" to "${payload.overrideDepartment}"`);
    }

    if (payload.assignedOfficer) {
      updateData.assignedOfficer = payload.assignedOfficer;
      auditNotes.push(`Assigned to officer: ${payload.assignedOfficer}`);
    }

    if (payload.resolutionImageUrl) {
      updateData.resolutionImageUrl = payload.resolutionImageUrl;
    }

    if (payload.resolutionNote) {
      updateData.resolutionNote = payload.resolutionNote;
    }

    if (payload.resolutionVerified !== undefined) {
      updateData.resolutionVerified = payload.resolutionVerified;
    }

    // Handle Status Transition
    let statusChanged = false;
    let oldStatus = existing.status;
    let newStatus = existing.status;

    if (payload.status && payload.status !== existing.status) {
      statusChanged = true;
      newStatus = payload.status;
      updateData.status = newStatus;

      if (newStatus === 'RESOLVED') {
        updateData.resolvedAt = new Date();
      } else if (newStatus !== 'RESOLVED' && existing.resolvedAt) {
        updateData.resolvedAt = null;
      }
    }

    // Perform Update
    const updated = await prisma.issue.update({
      where: { id: existing.id },
      data: updateData,
    });

    // Create Audit StatusEvent
    let finalNote = payload.note;
    if (!finalNote && statusChanged) {
      // Draft note with AI
      const drafted = await draftStatusUpdate({
        issueTitle: existing.title,
        department: updated.department,
        fromStatus: oldStatus,
        toStatus: newStatus,
        officerName: updated.assignedOfficer || undefined,
        preferredLanguage: existing.preferredReplyLanguage || undefined,
      });
      finalNote = drafted.englishNote;
    }

    if (auditNotes.length > 0 && !statusChanged) {
      finalNote = auditNotes.join('. ');
    }

    if (statusChanged || auditNotes.length > 0) {
      await prisma.statusEvent.create({
        data: {
          issueId: existing.id,
          fromStatus: oldStatus,
          toStatus: newStatus,
          note: finalNote || `Updated status to ${newStatus}`,
          actorId: user?.id,
        },
      });
    }

    return NextResponse.json({ success: true, issue: updated });
  } catch (error) {
    console.error('Update issue error:', error);
    return NextResponse.json({ error: 'Failed to update grievance' }, { status: 500 });
  }
}

