import crypto from 'crypto';
import { prisma } from './prisma';
import { translateContent } from './gemini';

export function computeSourceHash(text: string): string {
  return crypto.createHash('md5').update(text || '').digest('hex');
}

/**
 * Translates and caches arbitrary fields for a specific entity (e.g. Issue, StatusEvent)
 */
export async function getOrTranslateEntityFields(params: {
  entityType: string;
  entityId: string;
  fields: Record<string, string>;
  targetLang: string;
}): Promise<Record<string, string>> {
  const { entityType, entityId, fields, targetLang } = params;
  const normLang = (targetLang || 'en').toLowerCase().trim();

  if (normLang === 'en' || !fields || Object.keys(fields).length === 0) {
    return { ...fields };
  }

  // 1. Fetch existing cached translations
  const cached = await prisma.translation.findMany({
    where: {
      entityType,
      entityId,
      lang: normLang,
    },
  });

  const cachedMap = new Map<string, { text: string; sourceHash: string }>();
  for (const c of cached) {
    cachedMap.set(c.field, { text: c.text, sourceHash: c.sourceHash });
  }

  // 2. Identify missing or invalid fields
  const missingOrInvalid: Record<string, string> = {};
  const result: Record<string, string> = { ...fields };

  for (const [fieldName, sourceText] of Object.entries(fields)) {
    if (!sourceText || typeof sourceText !== 'string' || !sourceText.trim()) {
      continue;
    }
    const currentHash = computeSourceHash(sourceText);
    const existing = cachedMap.get(fieldName);

    if (existing && existing.sourceHash === currentHash) {
      result[fieldName] = existing.text;
    } else {
      missingOrInvalid[fieldName] = sourceText;
    }
  }

  // 3. If everything was cached, return immediately
  const missingKeys = Object.keys(missingOrInvalid);
  if (missingKeys.length === 0) {
    return result;
  }

  // 4. Translate missing fields in ONE batch call
  try {
    const translated = await translateContent(missingOrInvalid, normLang);

    // 5. Store in Prisma cache
    for (const [fieldName, translatedText] of Object.entries(translated)) {
      if (translatedText && translatedText !== missingOrInvalid[fieldName]) {
        result[fieldName] = translatedText;
        const currentHash = computeSourceHash(missingOrInvalid[fieldName]);

        await prisma.translation.upsert({
          where: {
            entityType_entityId_field_lang: {
              entityType,
              entityId,
              field: fieldName,
              lang: normLang,
            },
          },
          update: {
            text: translatedText,
            sourceHash: currentHash,
          },
          create: {
            entityType,
            entityId,
            field: fieldName,
            lang: normLang,
            text: translatedText,
            sourceHash: currentHash,
          },
        }).catch((err) => console.error('Failed to cache translation:', err));
      }
    }
  } catch (err) {
    console.error('Translation pipeline error:', err);
  }

  return result;
}

/**
 * Translates a complete Issue including its priorityFactors and statusEvents
 */
export async function translateCompleteIssue(issue: any, targetLang: string) {
  const normLang = (targetLang || 'en').toLowerCase().trim();
  if (normLang === 'en' || !issue) {
    return issue;
  }

  // 1. Gather all translatable string fields for the main issue
  const issueFields: Record<string, string> = {};
  if (issue.title) issueFields.title = issue.title;
  if (issue.description) issueFields.description = issue.description;
  if (issue.aiSummary) issueFields.aiSummary = issue.aiSummary;
  if (issue.aiReasoning) issueFields.aiReasoning = issue.aiReasoning;
  if (issue.category) issueFields.category = issue.category;
  if (issue.subcategory) issueFields.subcategory = issue.subcategory;
  if (issue.department) issueFields.department = issue.department;
  if (issue.assignedOfficer) issueFields.assignedOfficer = issue.assignedOfficer;
  if (issue.resolutionNote) issueFields.resolutionNote = issue.resolutionNote;

  // Priority factors translation map
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
      if (f.factor) issueFields[`factor_title_${idx}`] = f.factor;
      if (f.explanation) issueFields[`factor_expl_${idx}`] = f.explanation;
    });
  }

  // 2. Translate main issue fields
  const translatedIssueFields = await getOrTranslateEntityFields({
    entityType: 'Issue',
    entityId: issue.id,
    fields: issueFields,
    targetLang: normLang,
  });

  // Rebuild translated priority factors
  if (Array.isArray(parsedFactors) && parsedFactors.length > 0) {
    const translatedFactors = parsedFactors.map((f, idx) => ({
      ...f,
      factor: translatedIssueFields[`factor_title_${idx}`] || f.factor,
      explanation: translatedIssueFields[`factor_expl_${idx}`] || f.explanation,
    }));
    issue.priorityFactors = JSON.stringify(translatedFactors);
  }

  // Assign translated fields
  if (translatedIssueFields.title) issue.title = translatedIssueFields.title;
  if (translatedIssueFields.description) issue.description = translatedIssueFields.description;
  if (translatedIssueFields.aiSummary) issue.aiSummary = translatedIssueFields.aiSummary;
  if (translatedIssueFields.aiReasoning) issue.aiReasoning = translatedIssueFields.aiReasoning;
  if (translatedIssueFields.category) issue.category = translatedIssueFields.category;
  if (translatedIssueFields.subcategory) issue.subcategory = translatedIssueFields.subcategory;
  if (translatedIssueFields.department) issue.department = translatedIssueFields.department;
  if (translatedIssueFields.assignedOfficer) issue.assignedOfficer = translatedIssueFields.assignedOfficer;
  if (translatedIssueFields.resolutionNote) issue.resolutionNote = translatedIssueFields.resolutionNote;

  // 3. Translate statusEvents if present
  if (Array.isArray(issue.statusEvents) && issue.statusEvents.length > 0) {
    const eventFieldMap: Record<string, string> = {};
    issue.statusEvents.forEach((evt: any) => {
      if (evt.note) {
        eventFieldMap[`event_note_${evt.id}`] = evt.note;
      }
    });

    if (Object.keys(eventFieldMap).length > 0) {
      const translatedEvents = await getOrTranslateEntityFields({
        entityType: 'StatusEventGroup',
        entityId: issue.id,
        fields: eventFieldMap,
        targetLang: normLang,
      });

      issue.statusEvents = issue.statusEvents.map((evt: any) => ({
        ...evt,
        note: translatedEvents[`event_note_${evt.id}`] || evt.note,
      }));
    }
  }

  return issue;
}

/**
 * Batch translates a list of issues (e.g. for directory or admin table)
 */
export async function batchTranslateIssues(issues: any[], targetLang: string) {
  const normLang = (targetLang || 'en').toLowerCase().trim();
  if (normLang === 'en' || !Array.isArray(issues) || issues.length === 0) {
    return issues;
  }

  // 1. Fetch all translations for these issues
  const issueIds = issues.map((i) => i.id);
  const cachedTranslations = await prisma.translation.findMany({
    where: {
      entityType: 'Issue',
      entityId: { in: issueIds },
      lang: normLang,
    },
  });

  const cacheIndex = new Map<string, string>(); // key: `${entityId}:${field}:${sourceHash}`
  for (const c of cachedTranslations) {
    cacheIndex.set(`${c.entityId}:${c.field}:${c.sourceHash}`, c.text);
  }

  const missingBatch: Record<string, string> = {}; // key: `${issueId}___${field}`

  for (const issue of issues) {
    const fieldsToCheck: Record<string, string> = {
      title: issue.title,
      description: issue.description,
      category: issue.category,
      department: issue.department,
      aiSummary: issue.aiSummary,
    };

    for (const [field, text] of Object.entries(fieldsToCheck)) {
      if (!text) continue;
      const hash = computeSourceHash(text);
      const cached = cacheIndex.get(`${issue.id}:${field}:${hash}`);
      if (cached) {
        issue[field] = cached;
      } else {
        missingBatch[`${issue.id}___${field}`] = text;
      }
    }
  }

  // If there are missing fields, batch translate in chunks of 30 strings
  const missingKeys = Object.keys(missingBatch);
  if (missingKeys.length > 0) {
    try {
      // Chunk into blocks of 30 to stay within response token limits
      const chunkSize = 30;
      for (let i = 0; i < missingKeys.length; i += chunkSize) {
        const sliceKeys = missingKeys.slice(i, i + chunkSize);
        const subPayload: Record<string, string> = {};
        for (const k of sliceKeys) subPayload[k] = missingBatch[k];

        const translatedSub = await translateContent(subPayload, normLang);

        for (const k of sliceKeys) {
          const translatedText = translatedSub[k];
          if (translatedText && translatedText !== subPayload[k]) {
            const [issueId, field] = k.split('___');
            const targetIssue = issues.find((x) => x.id === issueId);
            if (targetIssue) {
              targetIssue[field] = translatedText;
            }

            const currentHash = computeSourceHash(subPayload[k]);
            await prisma.translation.upsert({
              where: {
                entityType_entityId_field_lang: {
                  entityType: 'Issue',
                  entityId: issueId,
                  field,
                  lang: normLang,
                },
              },
              update: { text: translatedText, sourceHash: currentHash },
              create: {
                entityType: 'Issue',
                entityId: issueId,
                field,
                lang: normLang,
                text: translatedText,
                sourceHash: currentHash,
              },
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('Batch translation failure:', err);
    }
  }

  return issues;
}
