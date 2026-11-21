import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyResolution } from '@/lib/gemini';
import fs from 'fs';
import path from 'path';

const verifySchema = z.object({
  afterImageBase64: z.string().min(10, 'After-resolution image is required'),
  beforeImageBase64: z.string().optional(),
  saveToIssue: z.boolean().optional().default(true),
  resolutionNote: z.string().optional(),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const json = await request.json();
    const parsed = verifySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid verification payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const issue = await prisma.issue.findFirst({
      where: { OR: [{ id }, { trackingId: id }] },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Grievance not found' }, { status: 404 });
    }

    const { afterImageBase64, beforeImageBase64, saveToIssue, resolutionNote } = parsed.data;

    // Run AI verification
    const verification = await verifyResolution({
      beforeImageBase64: beforeImageBase64 || (issue.imageUrl?.startsWith('data:') ? issue.imageUrl : undefined),
      afterImageBase64,
      issueDescription: issue.description,
      category: issue.category,
    });

    // Save resolution image: in production, never write to local disk
    let resolutionImageUrl = '/seed/pothole-after.svg';
    if (process.env.NODE_ENV !== 'production' && !process.env.TURSO_DATABASE_URL) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const fileName = `resolution-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = path.join(uploadsDir, fileName);
        const base64Data = afterImageBase64.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        resolutionImageUrl = `/uploads/${fileName}`;
      } catch {
        resolutionImageUrl = afterImageBase64;
      }
    } else {
      resolutionImageUrl = afterImageBase64;
    }

    // Persist verification status if requested
    if (saveToIssue) {
      await prisma.issue.update({
        where: { id: issue.id },
        data: {
          resolutionImageUrl,
          resolutionVerified: verification.resolved,
          resolutionConfidence: verification.confidence,
          resolutionNote: resolutionNote || verification.explanation,
        },
      });
    }

    return NextResponse.json({
      success: true,
      verification,
      resolutionImageUrl,
    });
  } catch (error) {
    console.error('Verify resolution error:', error);
    return NextResponse.json({ error: 'Failed to verify resolution' }, { status: 500 });
  }
}

