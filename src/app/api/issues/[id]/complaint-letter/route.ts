import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateFormalComplaint } from '@/lib/gemini';
import { getOrTranslateEntityFields } from '@/lib/translation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, 'complaint-letter', 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Letter generation limit reached. Please wait ${rateCheck.retryAfterSec} seconds before generating another petition.`,
        },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSec) } }
      );
    }

    const { id } = await props.params;
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const lang = (searchParams.get('lang') || body?.lang || 'en').toLowerCase().trim();

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

    const baseLetter = await generateFormalComplaint({
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

    let finalLetter = baseLetter;
    if (lang !== 'en') {
      const translated = await getOrTranslateEntityFields({
        entityType: 'ComplaintLetter',
        entityId: issue.id,
        fields: { letter: baseLetter },
        targetLang: lang,
      });
      if (translated.letter) finalLetter = translated.letter;
    }

    return NextResponse.json({
      success: true,
      letter: finalLetter,
      trackingId: issue.trackingId,
    });
  } catch (error) {
    console.error('Complaint letter error:', error);
    return NextResponse.json({ error: 'Failed to generate complaint letter' }, { status: 500 });
  }
}

