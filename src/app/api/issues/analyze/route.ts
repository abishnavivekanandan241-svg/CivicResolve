import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeIssue } from '@/lib/gemini';

const analyzeSchema = z.object({
  title: z.string().optional().default(''),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  location: z.string().optional().default(''),
  imageBase64: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = analyzeSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { title, description, location, imageBase64 } = parsed.data;
    const result = await analyzeIssue({
      title,
      description,
      location,
      imageBase64,
    });

    return NextResponse.json({
      success: true,
      analysis: result,
    });
  } catch (error) {
    console.error('Issue analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze issue' },
      { status: 500 }
    );
  }
}

