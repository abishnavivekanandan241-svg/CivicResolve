import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeIssue, translateContent } from '@/lib/gemini';

const analyzeSchema = z.object({
  title: z.string().optional().default(''),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  location: z.string().optional().default(''),
  imageBase64: z.string().optional(),
  lang: z.string().optional().default('en'),
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

    const { title, description, location, imageBase64, lang } = parsed.data;
    const result = await analyzeIssue({
      title,
      description,
      location,
      imageBase64,
    });

    const normLang = (lang || 'en').toLowerCase().trim();
    if (normLang !== 'en') {
      try {
        const toTranslate: Record<string, string> = {};
        if (result.suggestedTitle) toTranslate.suggestedTitle = result.suggestedTitle;
        if (result.reasoning) toTranslate.reasoning = result.reasoning;
        if (result.category) toTranslate.category = result.category;
        if (result.department) toTranslate.department = result.department;

        if (Array.isArray(result.priorityFactors)) {
          result.priorityFactors.forEach((f, idx) => {
            if (f.factor) toTranslate[`f_title_${idx}`] = f.factor;
            if (f.explanation) toTranslate[`f_expl_${idx}`] = f.explanation;
          });
        }

        const translated = await translateContent(toTranslate, normLang);
        if (translated.suggestedTitle) result.suggestedTitle = translated.suggestedTitle;
        if (translated.reasoning) result.reasoning = translated.reasoning;
        if (translated.category) result.category = translated.category;
        if (translated.department) result.department = translated.department;

        if (Array.isArray(result.priorityFactors)) {
          result.priorityFactors = result.priorityFactors.map((f, idx) => ({
            ...f,
            factor: translated[`f_title_${idx}`] || f.factor,
            explanation: translated[`f_expl_${idx}`] || f.explanation,
          }));
        }
      } catch (err) {
        console.error('Failed to translate analysis output:', err);
      }
    }

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


