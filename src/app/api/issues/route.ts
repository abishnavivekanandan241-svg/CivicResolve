import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { analyzeIssue, checkDuplicate } from '@/lib/gemini';
import { batchTranslateIssues } from '@/lib/translation';
import fs from 'fs';
import path from 'path';

const createIssueSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(5, 'Description is required'),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  locationText: z.string().min(3, 'Location is required'),
  lat: z.number().default(11.3410),
  lng: z.number().default(77.7172),
  ward: z.string().default('Ward 1 - Central Market'),
  imageBase64: z.string().optional(),
  preferredReplyLanguage: z.string().optional(),
  forceCreate: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const department = searchParams.get('department');
    const ward = searchParams.get('ward');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'priorityScore'; // priorityScore | recent | upvotes
    const slaBreached = searchParams.get('slaBreached') === 'true';
    const myIssuesOnly = searchParams.get('my') === 'true';

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (department && department !== 'ALL') {
      where.department = department;
    }

    if (ward && ward !== 'ALL') {
      where.ward = ward;
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (myIssuesOnly && user) {
      where.reporterId = user.id;
    }

    if (slaBreached) {
      where.status = { not: 'RESOLVED' };
      where.slaDueAt = { lt: new Date() };
    }

    if (search) {
      where.OR = [
        { trackingId: { contains: search } },
        { title: { contains: search } },
        { description: { contains: search } },
        { locationText: { contains: search } },
      ];
    }

    let orderBy: any = { priorityScore: 'desc' };
    if (sort === 'recent') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'upvotes') {
      orderBy = { upvotes: 'desc' };
    }

    const issues = await prisma.issue.findMany({
      where,
      orderBy,
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        duplicateOf: {
          select: { id: true, trackingId: true, title: true, status: true },
        },
        userUpvotes: user
          ? {
            where: { userId: user.id },
            select: { id: true },
          }
          : false,
      },
    });

    const lang = searchParams.get('lang') || 'en';

    const enriched = issues.map((issue) => ({
      ...issue,
      hasUpvoted: user ? (issue as any).userUpvotes?.length > 0 : false,
      isSlaBreached: issue.status !== 'RESOLVED' && issue.slaDueAt ? new Date(issue.slaDueAt) < new Date() : false,
    }));

    const translatedIssues = await batchTranslateIssues(enriched, lang);

    return NextResponse.json({ success: true, issues: translatedIssues, count: translatedIssues.length });
  } catch (error) {
    console.error('Fetch issues error:', error);
    return NextResponse.json({ error: 'Failed to retrieve issues' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const json = await request.json();
    const parsed = createIssueSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      locationText,
      lat,
      lng,
      ward,
      imageBase64,
      preferredReplyLanguage,
      forceCreate,
    } = parsed.data;

    // Run AI analysis
    const analysis = await analyzeIssue({
      title,
      description,
      location: locationText,
      imageBase64,
    });

    const category = parsed.data.category || analysis.category;
    const departmentName = analysis.department;

    // Check for duplicates within 200m if not forced
    if (!forceCreate) {
      const candidates = await prisma.issue.findMany({
        where: {
          status: { in: ['REPORTED', 'IN_PROGRESS'] },
          ward,
        },
        select: {
          id: true,
          trackingId: true,
          title: true,
          description: true,
          category: true,
          lat: true,
          lng: true,
        },
      });

      const duplicateCheck = await checkDuplicate({
        newIssue: { title, description, category, lat, lng },
        candidateIssues: candidates,
      });

      if (duplicateCheck.isDuplicate) {
        return NextResponse.json({
          duplicateDetected: true,
          duplicate: duplicateCheck,
          message: 'A similar civic grievance was recently reported nearby. You can upvote it instead or submit anyway.',
        });
      }
    }

    // Save image to /public/uploads if provided
    let imageUrl = '/seed/road-damage.svg';
    if (imageBase64) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const fileName = `issue-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = path.join(uploadsDir, fileName);
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        imageUrl = `/uploads/${fileName}`;
      } catch (err) {
        console.warn('Could not save uploaded image to disk, falling back to data URL:', err);
        imageUrl = imageBase64;
      }
    }

    // Calculate SLA due date based on Department SLA
    const department = await prisma.department.findUnique({
      where: { name: departmentName },
    });
    const slaHours = department?.slaHours || 24;
    const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    // Generate Tracking ID
    const count = await prisma.issue.count();
    const trackingId = `CR-2026-${String(count + 101).padStart(5, '0')}`;

    // Create Issue
    const issue = await prisma.issue.create({
      data: {
        trackingId,
        title: analysis.suggestedTitle && title.length < 5 ? analysis.suggestedTitle : title,
        description,
        originalText: description,
        category,
        subcategory: analysis.subcategory,
        department: departmentName,
        locationText,
        lat,
        lng,
        ward,
        imageUrl,
        status: 'REPORTED',
        priority: analysis.priority,
        priorityScore: analysis.priorityScore,
        priorityFactors: JSON.stringify(analysis.priorityFactors),
        safetyRisk: analysis.safetyRisk,
        aiSummary: analysis.summary,
        aiReasoning: analysis.reasoning,
        aiConfidence: analysis.confidence,
        detectedLanguage: analysis.detectedLanguage,
        detectedScript: analysis.detectedScript,
        isRomanizedIndic: analysis.isRomanizedIndic,
        englishTranslation: analysis.englishTranslation,
        preferredReplyLanguage: preferredReplyLanguage || analysis.detectedLanguage,
        slaDueAt,
        isAiAnalyzed: analysis.isAiGenerated,
        reporterId: user?.id,
        upvotes: 1, // First upvote by creator
      },
    });

    // Create Initial Audit StatusEvent
    await prisma.statusEvent.create({
      data: {
        issueId: issue.id,
        fromStatus: 'NONE',
        toStatus: 'REPORTED',
        note: `Grievance registered. CivicResolve AI classified priority as ${analysis.priority} (${analysis.priorityScore}/100) and assigned to ${departmentName}. SLA: ${slaHours} hours.`,
        actorId: user?.id,
      },
    });

    // Register initial upvote
    if (user) {
      await prisma.upvote.create({
        data: {
          userId: user.id,
          issueId: issue.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      issue,
      trackingId: issue.trackingId,
      analysis,
    });
  } catch (error) {
    console.error('Create issue error:', error);
    return NextResponse.json({ error: 'Failed to record grievance' }, { status: 500 });
  }
}

