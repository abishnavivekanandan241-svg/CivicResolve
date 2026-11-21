import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'initial'; // 'initial' | 'resolution'

    const issue = await prisma.issue.findFirst({
      where: { OR: [{ id }, { trackingId: id }] },
      select: { imageUrl: true, resolutionImageUrl: true },
    });

    if (!issue) {
      return new NextResponse('Grievance not found', { status: 404 });
    }

    const rawUrl = type === 'resolution' ? issue.resolutionImageUrl : issue.imageUrl;
    if (!rawUrl) {
      return new NextResponse('Image not available', { status: 404 });
    }

    // If it's a data URL, decode and serve as binary image with aggressive cache
    if (rawUrl.startsWith('data:image/')) {
      const matches = rawUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (matches) {
        const mime = `image/${matches[1]}`;
        const buffer = Buffer.from(matches[2], 'base64');
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mime,
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }
    }

    // If it's a local static asset (e.g. /seed/pothole-after.svg), redirect
    return NextResponse.redirect(new URL(rawUrl, request.url));
  } catch (error) {
    console.error('Image serve error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
