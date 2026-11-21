import { prisma } from '../src/lib/prisma';
import { translateContent } from '../src/lib/gemini';
import { computeSourceHash } from '../src/lib/translation';
import * as dotenv from 'dotenv';
dotenv.config();

const TARGET_LANGS = [
  'hi', // Hindi
  'ta', // Tamil
  'te', // Telugu
  'bn', // Bengali
  'kn', // Kannada
  'ml', // Malayalam
  'mr', // Marathi
  'gu', // Gujarati
  'pa', // Punjabi
  'ur', // Urdu
];

// Helper to delay between API calls to prevent 429 rate limit errors
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('--- STARTING CIVICRESOLVE SEED PRE-TRANSLATION ---');

  const issues = await prisma.issue.findMany({
    include: {
      statusEvents: true,
    },
    orderBy: { priorityScore: 'desc' },
  });

  console.log(`Found ${issues.length} seeded issues to pre-translate across ${TARGET_LANGS.length} languages.`);

  // Prioritize primary languages requested by user: hi, ta, te, bn, then the others
  for (const lang of TARGET_LANGS) {
    console.log(`\n========================================`);
    console.log(`[Phase] Processing Language: ${lang.toUpperCase()}`);
    console.log(`========================================`);

    // Process issues in batches of 5 to minimize Gemini calls while avoiding token limits
    const CHUNK_SIZE = 5;
    for (let i = 0; i < issues.length; i += CHUNK_SIZE) {
      const issueChunk = issues.slice(i, i + CHUNK_SIZE);
      const batchFields: Record<string, string> = {};
      const fieldMeta: Record<string, { entityType: string; entityId: string; field: string; sourceHash: string }> = {};

      for (const issue of issueChunk) {
        // Collect main fields
        const candidateFields: Record<string, string | null | undefined> = {
          title: issue.title,
          description: issue.description,
          aiSummary: issue.aiSummary,
          aiReasoning: issue.aiReasoning,
          category: issue.category,
          subcategory: issue.subcategory,
          department: issue.department,
          assignedOfficer: issue.assignedOfficer,
          resolutionNote: issue.resolutionNote,
        };

        // Collect priority factors
        let parsedFactors: any[] = [];
        try {
          if (issue.priorityFactors) {
            parsedFactors = typeof issue.priorityFactors === 'string'
              ? JSON.parse(issue.priorityFactors)
              : issue.priorityFactors;
          }
        } catch {}

        if (Array.isArray(parsedFactors)) {
          parsedFactors.forEach((f, idx) => {
            if (f.factor) candidateFields[`factor_title_${idx}`] = f.factor;
            if (f.explanation) candidateFields[`factor_expl_${idx}`] = f.explanation;
          });
        }

        // Collect statusEvents notes
        if (Array.isArray(issue.statusEvents)) {
          issue.statusEvents.forEach((evt) => {
            if (evt.note) candidateFields[`event_note_${evt.id}`] = evt.note;
          });
        }

        // Register for batch check
        for (const [fieldName, val] of Object.entries(candidateFields)) {
          if (val && typeof val === 'string' && val.trim().length > 0) {
            const hash = computeSourceHash(val);
            const globalKey = `${issue.id}___${fieldName}`;
            const entityType = fieldName.startsWith('event_note_') ? 'StatusEventGroup' : 'Issue';

            batchFields[globalKey] = val;
            fieldMeta[globalKey] = {
              entityType,
              entityId: issue.id,
              field: fieldName,
              sourceHash: hash,
            };
          }
        }
      }

      // Check which fields are already cached
      const chunkIssueIds = issueChunk.map((it) => it.id);
      const existingTranslations = await prisma.translation.findMany({
        where: {
          entityId: { in: chunkIssueIds },
          lang,
        },
      });

      const existingIndex = new Set(
        existingTranslations.map((t) => `${t.entityId}___${t.field}___${t.sourceHash}`)
      );

      const uncachedBatch: Record<string, string> = {};
      for (const [globalKey, text] of Object.entries(batchFields)) {
        const meta = fieldMeta[globalKey];
        const cacheKey = `${meta.entityId}___${meta.field}___${meta.sourceHash}`;
        if (!existingIndex.has(cacheKey)) {
          uncachedBatch[globalKey] = text;
        }
      }

      const uncachedKeys = Object.keys(uncachedBatch);
      if (uncachedKeys.length === 0) {
        console.log(`  ✓ Batch ${i + 1}-${Math.min(i + CHUNK_SIZE, issues.length)} already fully cached in [${lang.toUpperCase()}].`);
        continue;
      }

      console.log(`  -> Translating ${uncachedKeys.length} fields for issues ${i + 1}-${Math.min(i + CHUNK_SIZE, issues.length)} into [${lang.toUpperCase()}]...`);

      try {
        const translatedResults = await translateContent(uncachedBatch, lang);

        // Store into Prisma Translation table
        let inserted = 0;
        for (const [globalKey, translatedText] of Object.entries(translatedResults)) {
          const meta = fieldMeta[globalKey];
          if (meta && translatedText) {
            await prisma.translation.upsert({
              where: {
                entityType_entityId_field_lang: {
                  entityType: meta.entityType,
                  entityId: meta.entityId,
                  field: meta.field,
                  lang,
                },
              },
              update: {
                text: translatedText,
                sourceHash: meta.sourceHash,
              },
              create: {
                entityType: meta.entityType,
                entityId: meta.entityId,
                field: meta.field,
                lang,
                text: translatedText,
                sourceHash: meta.sourceHash,
              },
            }).catch((err) => console.error('Upsert translation error:', err.message));
            inserted++;
          }
        }
        console.log(`    ✓ Saved ${inserted} translations to database.`);
      } catch (err: any) {
        console.error(`    ✘ Error during batch translation into [${lang.toUpperCase()}]:`, err.message);
      }

      // Small throttle between batches
      await delay(1200);
    }
  }

  const finalCount = await prisma.translation.count();
  console.log('\n======================================================');
  console.log(`✓ SEED PRE-TRANSLATION COMPLETE! Total cached translation rows: ${finalCount}`);
  console.log('======================================================');
}

main()
  .catch((e) => {
    console.error('Fatal seed pre-translation error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
