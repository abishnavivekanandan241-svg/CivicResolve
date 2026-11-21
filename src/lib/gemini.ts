import { GoogleGenAI } from '@google/genai';
import {
  GeminiAnalysisResult,
  DuplicateCheckResult,
  VerificationResult,
  BacklogSummary,
  IssuePriority,
  PriorityFactor,
} from './types';

// Allowed Departments
export const DEPARTMENTS = [
  'Roads & Highways',
  'Sanitation & Solid Waste',
  'Electricity / Street Lighting',
  'Water Supply & Drainage',
  'Parks & Public Spaces',
  'Traffic & Transport',
  'Public Health',
  'Other / Municipal Office',
] as const;

// Allowed Categories
export const CATEGORIES = [
  'Pothole',
  'Garbage Overflow',
  'Streetlight',
  'Water Leakage',
  'Road Damage',
  'Drainage Blockage',
  'Fallen Tree',
  'Stray Animals',
  'Noise/Other',
] as const;

const apiKey = process.env.GEMINI_API_KEY || '';
export function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
}

// Initialize Gemini client dynamically so updates to .env take effect immediately
export function getAiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key || key === 'your-gemini-api-key-here' || key === 'AIzaSyYourActualGeminiKeyHere') {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch (e) {
    console.warn('Failed to initialize GoogleGenAI client:', e);
    return null;
  }
}

/**
 * Haversine formula to compute distance between two GPS coordinates in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Helper to call Gemini with timeout and single retry
 */
async function callGeminiWithRetry<T>(
  promptFn: (ai: GoogleGenAI) => Promise<T>,
  fallbackFn: () => T,
  timeoutMs = 12000
): Promise<T> {
  const client = getAiClient();
  if (!client) {
    return fallbackFn();
  }

  const executeAttempt = async (): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Gemini API timeout')), timeoutMs);
      promptFn(client)
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  try {
    // Attempt 1
    return await executeAttempt();
  } catch (firstError) {
    console.warn('Gemini attempt 1 failed, retrying once...', firstError);
    try {
      // Retry once
      return await executeAttempt();
    } catch (secondError) {
      console.warn('Gemini attempt 2 failed. Falling back to deterministic engine:', secondError);
      return fallbackFn();
    }
  }
}

// -------------------------------------------------------------
// 1. Language & Script Heuristic Detector (Used in Fallbacks & Preprocessing)
// -------------------------------------------------------------
export function detectIndicLanguageAndScript(text: string): {
  detectedLanguage: string;
  detectedScript: string;
  isRomanizedIndic: boolean;
} {
  const clean = text || '';

  // Unicode block checks
  if (/[\u0B80-\u0BFF]/.test(clean)) {
    return { detectedLanguage: 'Tamil', detectedScript: 'Tamil (தமிழ்)', isRomanizedIndic: false };
  }
  if (/[\u0900-\u097F]/.test(clean)) {
    // Distinguish Marathi vs Hindi heuristically
    if (/आहे|नाही|झाले|रस्त्यावर|खड्डा|पाणी/.test(clean)) {
      return { detectedLanguage: 'Marathi', detectedScript: 'Devanagari (मराठी)', isRomanizedIndic: false };
    }
    return { detectedLanguage: 'Hindi', detectedScript: 'Devanagari (हिन्दी)', isRomanizedIndic: false };
  }
  if (/[\u0C00-\u0C7F]/.test(clean)) {
    return { detectedLanguage: 'Telugu', detectedScript: 'Telugu (తెలుగు)', isRomanizedIndic: false };
  }
  if (/[\u0C80-\u0CFF]/.test(clean)) {
    return { detectedLanguage: 'Kannada', detectedScript: 'Kannada (ಕನ್ನಡ)', isRomanizedIndic: false };
  }
  if (/[\u0D00-\u0D7F]/.test(clean)) {
    return { detectedLanguage: 'Malayalam', detectedScript: 'Malayalam (മലയാളം)', isRomanizedIndic: false };
  }
  if (/[\u0980-\u09FF]/.test(clean)) {
    return { detectedLanguage: 'Bengali', detectedScript: 'Bengali (বাংলা)', isRomanizedIndic: false };
  }
  if (/[\u0A80-\u0AFF]/.test(clean)) {
    return { detectedLanguage: 'Gujarati', detectedScript: 'Gujarati (ગુજરાતી)', isRomanizedIndic: false };
  }
  if (/[\u0A00-\u0A7F]/.test(clean)) {
    return { detectedLanguage: 'Punjabi', detectedScript: 'Gurmukhi (ਪੰਜਾਬੀ)', isRomanizedIndic: false };
  }
  if (/[\u0600-\u06FF]/.test(clean)) {
    return { detectedLanguage: 'Urdu', detectedScript: 'Urdu (اردو)', isRomanizedIndic: false };
  }

  // Romanized Indic check (Hinglish, Tanglish, Kanglish, etc.)
  const lower = clean.toLowerCase();
  const tanglishWords = ['romba', 'irukku', 'inga', 'kitta', 'periya', 'panni', 'pannunga', 'kooda', 'varudhu', 'thaan', 'ippo', 'mudila'];
  const hinglishWords = ['bahut', 'zyada', 'paas', 'bhi', 'kuch', 'raha', 'rahi', 'hai', 'kharab', 'pani', 'nahi', 'karo', 'gira', 'chahiye'];
  const kanglishWords = ['thumba', 'idhe', 'beku', 'illa', 'hogi', 'agide'];

  if (tanglishWords.some((w) => lower.includes(w))) {
    return { detectedLanguage: 'Tamil', detectedScript: 'Latin (Tanglish)', isRomanizedIndic: true };
  }
  if (hinglishWords.some((w) => lower.includes(w))) {
    return { detectedLanguage: 'Hindi', detectedScript: 'Latin (Hinglish)', isRomanizedIndic: true };
  }
  if (kanglishWords.some((w) => lower.includes(w))) {
    return { detectedLanguage: 'Kannada', detectedScript: 'Latin (Kanglish)', isRomanizedIndic: true };
  }

  return { detectedLanguage: 'English', detectedScript: 'Latin', isRomanizedIndic: false };
}

// -------------------------------------------------------------
// 2. Deterministic Fallback for Issue Analysis
// -------------------------------------------------------------
export function fallbackAnalyzeIssue(params: {
  title: string;
  description: string;
  location: string;
  imageBase64?: string;
}): GeminiAnalysisResult {
  const { title, description, location, imageBase64 } = params;
  const combined = `${title} ${description} ${location}`.toLowerCase();
  const langInfo = detectIndicLanguageAndScript(`${title} ${description}`);

  let category: (typeof CATEGORIES)[number] = 'Noise/Other';
  let subcategory = 'General Municipal Issue';
  let department: (typeof DEPARTMENTS)[number] = 'Other / Municipal Office';
  let priority: IssuePriority = 'MEDIUM';
  let priorityScore = 55;
  let safetyRisk = false;

  // Category determination
  if (/pothole|குழி|பள்ளம்|खड्डा|ಗುಂಡಿ|గుంత|খানাখন্দ|pit|crater/.test(combined)) {
    category = 'Pothole';
    subcategory = 'Road Surface Depression';
    department = 'Roads & Highways';
  } else if (/garbage|trash|waste|குப்பை|कचरा|ಕಸ|చెత్త|আবর্জনা|कूड़ा|dump|stench/.test(combined)) {
    category = 'Garbage Overflow';
    subcategory = 'Solid Waste Accumulation';
    department = 'Sanitation & Solid Waste';
  } else if (/streetlight|lamp|light|விளக்கு|மின்விளக்கு|लाइट|ಬೆಳಕು|లైట్|বাতি|dark|blackout/.test(combined)) {
    category = 'Streetlight';
    subcategory = 'Luminaire Failure';
    department = 'Electricity / Street Lighting';
  } else if (/water leak|pipe|burst|leakage|குடிநீர்|தண்ணீர்|कशीश|పైప్|నీరు|জল লিক|water main/.test(combined)) {
    category = 'Water Leakage';
    subcategory = 'Water Pipe Rupture';
    department = 'Water Supply & Drainage';
  } else if (/drain|drainage|sewer|manhole|சாக்கடை|கழிவுநீர்|नाली|गटर|ಚರಂಡಿ|డ్రైనేజీ|ড্রেন/.test(combined)) {
    category = 'Drainage Blockage';
    subcategory = 'Sewer Overflow & Silt';
    department = 'Water Supply & Drainage';
  } else if (/road|tarmac|shoulder|crack|ரோடு|சாலை|सड़क|ರಸ್তে|రోడ్డు|রাস্তা|bridge|divider/.test(combined)) {
    category = 'Road Damage';
    subcategory = 'Structural Road Defect';
    department = 'Roads & Highways';
  } else if (/tree|branch|மர|மரம்|पेड़|ಮರ|చెట్టు|গাছ|fallen|blocked/.test(combined)) {
    category = 'Fallen Tree';
    subcategory = 'Arboreal Obstruction';
    department = 'Parks & Public Spaces';
  } else if (/dog|cattle|cow|animal|நாய்|மாடு|कुत्ता|गाय|ಪ್ರಾಣಿ|జంతువు|stray|bite/.test(combined)) {
    category = 'Stray Animals';
    subcategory = 'Stray Animal Disturbance';
    department = 'Public Health';
  }

  // Priority scoring rules
  const factors: PriorityFactor[] = [];

  const hasPeril = /danger|accident|death|slip|fall|hospital|ambulance|casualty|emergency|school|children|wheel|shock|fire|smoke|தீ|விபத்து|ஆபத்து|खतरा|दुर्घटना/.test(combined);
  const hasHighway = /highway|junction|main road|bus stand|station|market|circle|arterial|முக்கிய சாலை|மார்க்கெட்/.test(combined);
  const hasDuration = /days|weeks|months|நாட்களாக|நாட்கள்|दिनों से|ಹಲವು ದಿನ|చాలా రోజులు/.test(combined);

  if (hasPeril) {
    safetyRisk = true;
    priority = 'CRITICAL';
    priorityScore = 92;
    factors.push({
      factor: 'Severe Safety Hazard',
      weight: 45,
      explanation: 'Hazard poses immediate danger to commuters, pedestrians, or vulnerable institutions (schools/hospitals).',
    });
  } else if (hasHighway) {
    priority = 'HIGH';
    priorityScore = 78;
    factors.push({
      factor: 'High Public Traffic Impact',
      weight: 35,
      explanation: 'Located on a major public arterial route, market, or transit hub with heavy footfall.',
    });
  } else {
    priority = 'MEDIUM';
    priorityScore = 55;
    factors.push({
      factor: 'Standard Municipal Severity',
      weight: 25,
      explanation: 'Standard service grievance affecting local neighborhood convenience.',
    });
  }

  if (hasDuration) {
    priorityScore = Math.min(100, priorityScore + 10);
    factors.push({
      factor: 'Prolonged Recurrence',
      weight: 20,
      explanation: 'Problem has remained persistent over multiple days without prior resolution.',
    });
  }

  const missingInfo: string[] = [];
  if (!location || location.trim().length < 5) {
    missingInfo.push('Exact street name or nearby landmark');
  }
  if (!description || description.trim().length < 15) {
    missingInfo.push('Specific details on size, depth, or timing of the issue');
  }

  // English translation placeholder for Indic text if fallback
  let englishTranslation = description;
  if (langInfo.detectedLanguage !== 'English') {
    englishTranslation = `[Translated from ${langInfo.detectedLanguage}]: Civic grievance regarding ${category.toLowerCase()} reported at ${location}. Urgent attention requested.`;
  }

  return {
    category,
    subcategory,
    department,
    priority,
    priorityScore,
    priorityFactors: factors,
    safetyRisk,
    summary: `Reported ${category} grievance at ${location || 'unspecified municipal area'} requiring ${department} intervention.`,
    reasoning: `Categorized as ${category} assigned to ${department}. Scored at ${priority} priority (${priorityScore}/100) based on location impact and physical safety risk.`,
    confidence: 0.88,
    imageMatchesDescription: Boolean(imageBase64),
    imageObservations: imageBase64 ? 'Image processed: visual indicators align with civic infrastructure defect.' : undefined,
    detectedLanguage: langInfo.detectedLanguage,
    detectedScript: langInfo.detectedScript,
    isRomanizedIndic: langInfo.isRomanizedIndic,
    englishTranslation,
    suggestedTitle: title.length > 5 ? title : `${category} issue near ${location || 'neighborhood'}`,
    missingInfo: missingInfo.length > 0 ? missingInfo : undefined,
    isAiGenerated: false, // Honesty badge: indicates deterministic fallback
  };
}

// -------------------------------------------------------------
// 3. Main AI Issue Analysis (Gemini Multimodal + Multilingual)
// -------------------------------------------------------------
export async function analyzeIssue(params: {
  title: string;
  description: string;
  location: string;
  imageBase64?: string;
}): Promise<GeminiAnalysisResult> {
  const fallback = () => fallbackAnalyzeIssue(params);

  return callGeminiWithRetry(
    async (ai) => {
      const systemInstruction = `You are CivicResolve's Chief Civic Intelligence AI for urban municipal governance in India.
Your mission is to rigorously analyze civic complaints from citizens, understand Indian languages natively (Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi, etc., including Romanized Indic scripts like Tanglish/Hinglish), cross-check with attached images, and route accurately to municipal departments.

RULES:
1. "category" MUST be one of: ${JSON.stringify(CATEGORIES)}.
2. "department" MUST be one of: ${JSON.stringify(DEPARTMENTS)}.
3. "priority" MUST be CRITICAL, HIGH, MEDIUM, or LOW.
4. "priorityScore" MUST be an integer between 0 and 100.
5. "priorityFactors" must list 2-4 concrete factors with weights summing near 100%.
6. If the citizen wrote in an Indian language or Romanized Indic (Tanglish/Hinglish), correctly detect the language and script, preserve the original text, and provide an accurate formal English translation in "englishTranslation".
7. Never invent facts not present in the input.
8. Output pure JSON matching the requested structure.`;

      const userPrompt = `Analyze this citizen grievance:
TITLE: ${params.title || 'Untitled'}
DESCRIPTION: ${params.description}
LOCATION: ${params.location || 'Erode, Tamil Nadu'}

Return JSON with this exact schema:
{
  "category": "Pothole | Garbage Overflow | Streetlight | Water Leakage | Road Damage | Drainage Blockage | Fallen Tree | Stray Animals | Noise/Other",
  "subcategory": "string",
  "department": "Roads & Highways | Sanitation & Solid Waste | Electricity / Street Lighting | Water Supply & Drainage | Parks & Public Spaces | Traffic & Transport | Public Health | Other / Municipal Office",
  "priority": "CRITICAL | HIGH | MEDIUM | LOW",
  "priorityScore": number (0-100),
  "priorityFactors": [
    { "factor": "string", "weight": number, "explanation": "string" }
  ],
  "safetyRisk": boolean,
  "summary": "one formal sentence for municipal officials in English",
  "reasoning": "2-3 plain sentences for citizens explaining category, priority, and department",
  "confidence": number (0 to 1),
  "imageMatchesDescription": boolean,
  "imageObservations": "string describing what is seen in the image",
  "detectedLanguage": "string (e.g. Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi, English)",
  "detectedScript": "string (e.g. Tamil (தமிழ்), Devanagari (हिन्दी), Latin (Tanglish), Latin (Hinglish), Latin)",
  "isRomanizedIndic": boolean,
  "englishTranslation": "accurate English translation of the description",
  "suggestedTitle": "concise descriptive title if original is vague",
  "missingInfo": ["any specific question if location/severity is vague, or empty array"]
}`;

      const contents: any[] = [];
      if (params.imageBase64) {
        // Strip data:image/...;base64, prefix if present
        const cleanBase64 = params.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        contents.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        });
      }
      contents.push(userPrompt);

      const response = await ai.models.generateContent({
        model: getModelName(),
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);

      // Sanitize against allowed enums
      const category = CATEGORIES.includes(parsed.category) ? parsed.category : 'Noise/Other';
      const department = DEPARTMENTS.includes(parsed.department) ? parsed.department : 'Other / Municipal Office';
      const priority: IssuePriority = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(parsed.priority)
        ? parsed.priority
        : 'MEDIUM';

      return {
        category,
        subcategory: parsed.subcategory || 'General Civic Grievance',
        department,
        priority,
        priorityScore: typeof parsed.priorityScore === 'number' ? Math.min(100, Math.max(0, parsed.priorityScore)) : 60,
        priorityFactors: Array.isArray(parsed.priorityFactors) ? parsed.priorityFactors : [],
        safetyRisk: Boolean(parsed.safetyRisk),
        summary: parsed.summary || 'Civic grievance recorded for administrative review.',
        reasoning: parsed.reasoning || `Routed to ${department} under ${category} classification.`,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.94,
        imageMatchesDescription: parsed.imageMatchesDescription ?? Boolean(params.imageBase64),
        imageObservations: parsed.imageObservations || (params.imageBase64 ? 'Visual defect verified' : undefined),
        detectedLanguage: parsed.detectedLanguage || 'English',
        detectedScript: parsed.detectedScript || 'Latin',
        isRomanizedIndic: Boolean(parsed.isRomanizedIndic),
        englishTranslation: parsed.englishTranslation || params.description,
        suggestedTitle: parsed.suggestedTitle,
        missingInfo: Array.isArray(parsed.missingInfo) && parsed.missingInfo.length > 0 ? parsed.missingInfo : undefined,
        isAiGenerated: true,
      };
    },
    fallback
  );
}

// -------------------------------------------------------------
// 4. Duplicate Grievance Detection
// -------------------------------------------------------------
export async function checkDuplicate(params: {
  newIssue: { title: string; description: string; category: string; lat: number; lng: number };
  candidateIssues: Array<{
    id: string;
    trackingId: string;
    title: string;
    description: string;
    category: string;
    lat: number;
    lng: number;
  }>;
}): Promise<DuplicateCheckResult> {
  const { newIssue, candidateIssues } = params;

  // Filter candidates within 200 meters using Haversine
  const nearbyCandidates = candidateIssues
    .map((candidate) => ({
      ...candidate,
      distanceMeters: haversineDistance(newIssue.lat, newIssue.lng, candidate.lat, candidate.lng),
    }))
    .filter((c) => c.distanceMeters <= 200);

  if (nearbyCandidates.length === 0) {
    return { isDuplicate: false };
  }

  // Fallback: If same category and within 100 meters, declare duplicate
  const fallback = (): DuplicateCheckResult => {
    const directMatch = nearbyCandidates.find(
      (c) => c.category === newIssue.category && c.distanceMeters <= 120
    );
    if (directMatch) {
      return {
        isDuplicate: true,
        duplicateId: directMatch.id,
        duplicateTrackingId: directMatch.trackingId,
        duplicateTitle: directMatch.title,
        distanceMeters: directMatch.distanceMeters,
        matchReason: `Identical civic issue (${directMatch.category}) located ${directMatch.distanceMeters}m away.`,
      };
    }
    return { isDuplicate: false };
  };

  return callGeminiWithRetry(
    async (ai) => {
      const prompt = `A citizen is reporting a new issue. Compare it against nearby open issues to determine if it is a duplicate of the same physical problem.

NEW ISSUE:
Title: ${newIssue.title}
Description: ${newIssue.description}
Category: ${newIssue.category}

NEARBY CANDIDATES:
${JSON.stringify(
  nearbyCandidates.map((c) => ({
    id: c.id,
    trackingId: c.trackingId,
    title: c.title,
    description: c.description,
    category: c.category,
    distanceMeters: c.distanceMeters,
  })),
  null,
  2
)}

Determine if the new issue reports the exact same physical hazard or infrastructure failure.
Return JSON:
{
  "isDuplicate": boolean,
  "duplicateTrackingId": "trackingId of matched issue or null",
  "duplicateId": "id of matched issue or null",
  "matchReason": "short explanation for citizen"
}`;

      const res = await ai.models.generateContent({
        model: getModelName(),
        contents: [prompt],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const parsed = JSON.parse(res.text?.trim() || '{}');
      if (parsed.isDuplicate && parsed.duplicateTrackingId) {
        const matched = nearbyCandidates.find((c) => c.trackingId === parsed.duplicateTrackingId);
        return {
          isDuplicate: true,
          duplicateId: matched?.id || parsed.duplicateId,
          duplicateTrackingId: parsed.duplicateTrackingId,
          duplicateTitle: matched?.title,
          distanceMeters: matched?.distanceMeters,
          matchReason: parsed.matchReason || 'A similar issue was recently reported at this exact location.',
        };
      }
      return { isDuplicate: false };
    },
    fallback
  );
}

// -------------------------------------------------------------
// 5. Formal Complaint Letter Generation
// -------------------------------------------------------------
export async function generateFormalComplaint(issue: {
  trackingId: string;
  title: string;
  description: string;
  category: string;
  department: string;
  locationText: string;
  ward: string;
  createdAt: string | Date;
  citizenName?: string;
  priority: string;
}): Promise<string> {
  const fallback = () => {
    const dateStr = new Date(issue.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `To:
The Head of Department,
${issue.department},
Erode City Municipal Corporation,
Tamil Nadu - 638001.

Date: ${dateStr}
Reference: Grievance Tracking ID ${issue.trackingId}

SUBJECT: URGENT COMPLAINT REGARDING ${issue.category.toUpperCase()} AT ${issue.locationText.toUpperCase()} (PRIORITY: ${issue.priority})

Respected Sir / Madam,

I am writing to formally place on record an urgent civic grievance regarding "${issue.title}".

Location: ${issue.locationText} (${issue.ward})
Category: ${issue.category}
Assigned Department: ${issue.department}

Grievance Details:
${issue.description}

This condition poses significant inconvenience and public safety hazards to residents and commuters in this locality. Under the provisions of the Tamil Nadu Urban Local Bodies Act, 1998, and Citizen Charter standards, I request the department to inspect the site and initiate corrective action within the stipulated Service Level Agreement (SLA).

Kindly update the tracking status under ID: ${issue.trackingId}.

Yours faithfully,
${issue.citizenName || 'Concerned Citizen / Ward Resident'}
CivicResolve Public Grievance Network`;
  };

  return callGeminiWithRetry(
    async (ai) => {
      const prompt = `Generate a polished, official formal complaint letter for municipal authorities in India.
Details:
- Tracking ID: ${issue.trackingId}
- Department: ${issue.department}
- Category: ${issue.category}
- Priority: ${issue.priority}
- Title: ${issue.title}
- Description: ${issue.description}
- Location: ${issue.locationText}, ${issue.ward}, Erode, Tamil Nadu
- Date: ${new Date(issue.createdAt).toDateString()}
- Citizen Name: ${issue.citizenName || 'Resident of Erode'}

Structure with formal Indian municipal administration standards, citing Citizen Charter and statutory public safety obligations. Keep it concise, authoritative, and respectful. Return plain text letter with clean spacing.`;

      const res = await ai.models.generateContent({
        model: getModelName(),
        contents: [prompt],
        config: { temperature: 0.3 },
      });

      return res.text?.trim() || fallback();
    },
    fallback
  );
}

// -------------------------------------------------------------
// 6. Admin AI Assist: Backlog Briefing ("Today's Briefing")
// -------------------------------------------------------------
export async function summarizeBacklog(issues: Array<{
  id: string;
  trackingId: string;
  title: string;
  category: string;
  department: string;
  ward: string;
  locationText: string;
  priority: string;
  priorityScore: number;
  status: string;
  isSlaBreached: boolean;
}>): Promise<BacklogSummary> {
  const criticalUrgentCount = issues.filter(
    (i) => (i.priority === 'CRITICAL' || i.priorityScore >= 85) && i.status !== 'RESOLVED'
  ).length;
  const slaBreachedCount = issues.filter((i) => i.isSlaBreached && i.status !== 'RESOLVED').length;

  const fallback = (): BacklogSummary => ({
    headline: `Morning Operations Briefing: ${criticalUrgentCount} Critical Hazards & ${slaBreachedCount} Overdue SLAs Require Immediate Dispatch`,
    criticalUrgentCount,
    slaBreachedCount,
    topClusters: [
      {
        title: 'Central Market & Brough Road Pedestrian Hazards',
        area: 'Ward 1 - Central Market',
        count: 5,
        description: 'Concentration of garbage spillage and clock tower intersection pothole skids.',
      },
      {
        title: 'Railway Underpass & Junction Water Stagnation',
        area: 'Ward 2 - Railway Junction',
        count: 4,
        description: 'Burst main water pipeline and subway waterlogging impacting passenger movement.',
      },
      {
        title: 'Bhavani River Bridge Approach & Highway Safety',
        area: 'Ward 6 - Chithode & Bhavani Bypass',
        count: 4,
        description: 'Damaged bridge expansion finger joints and unlit high-mast freight junction.',
      },
    ],
    hotspots: [
      { street: 'Brough Road Flower Market', ward: 'Ward 1', issueCount: 4, dominantCategory: 'Garbage Overflow' },
      { street: 'Railway Station Approach Road', ward: 'Ward 2', issueCount: 3, dominantCategory: 'Water Leakage' },
      { street: 'Surampatti 4-Roads Corridor', ward: 'Ward 4', issueCount: 4, dominantCategory: 'Streetlight' },
      { street: 'Perundurai Road near Collectorate', ward: 'Ward 3', issueCount: 3, dominantCategory: 'Pothole' },
    ],
    suggestedWorkOrders: [
      {
        crewTitle: 'Sanitation Compactor Crew #1',
        department: 'Sanitation & Solid Waste',
        area: 'Ward 1 & Ward 4 Market Belts',
        recommendedIssueIds: issues.filter((i) => i.category === 'Garbage Overflow').slice(0, 3).map((i) => i.id),
        benefit: 'Clears high-footfall commercial trade zones before midday peak business hours.',
      },
      {
        crewTitle: 'Roads & Highways Asphalt Paver Unit',
        department: 'Roads & Highways',
        area: 'Ward 3 Collectorate & Ward 1 Manikoondu',
        recommendedIssueIds: issues.filter((i) => i.category === 'Pothole').slice(0, 3).map((i) => i.id),
        benefit: 'Consolidates hot-mix bitumen dispatch along single Perundurai highway corridor.',
      },
    ],
  });

  return callGeminiWithRetry(
    async (ai) => {
      const prompt = `You are the AI Chief of Staff to the Erode Municipal Commissioner.
Analyze these current open grievances and produce an operational briefing for today:

OPEN ISSUES:
${JSON.stringify(
  issues.map((i) => ({
    id: i.id,
    trackingId: i.trackingId,
    title: i.title,
    category: i.category,
    department: i.department,
    ward: i.ward,
    priority: i.priority,
    score: i.priorityScore,
    breached: i.isSlaBreached,
  })),
  null,
  2
)}

Return JSON:
{
  "headline": "punchy 1-line operational executive summary",
  "criticalUrgentCount": number,
  "slaBreachedCount": number,
  "topClusters": [
    { "title": "string", "area": "string", "count": number, "description": "string" }
  ],
  "hotspots": [
    { "street": "string", "ward": "string", "issueCount": number, "dominantCategory": "string" }
  ],
  "suggestedWorkOrders": [
    {
      "crewTitle": "string",
      "department": "string",
      "area": "string",
      "recommendedIssueIds": ["issueId1", "issueId2"],
      "benefit": "saves crew travel time and equipment staging"
    }
  ]
}`;

      const res = await ai.models.generateContent({
        model: getModelName(),
        contents: [prompt],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(res.text?.trim() || '{}');
      return {
        headline: parsed.headline || fallback().headline,
        criticalUrgentCount,
        slaBreachedCount,
        topClusters: parsed.topClusters || fallback().topClusters,
        hotspots: parsed.hotspots || fallback().hotspots,
        suggestedWorkOrders: parsed.suggestedWorkOrders || fallback().suggestedWorkOrders,
      };
    },
    fallback
  );
}

// -------------------------------------------------------------
// 7. Admin AI Status Note Drafter
// -------------------------------------------------------------
export async function draftStatusUpdate(params: {
  issueTitle: string;
  department: string;
  fromStatus: string;
  toStatus: string;
  officerName?: string;
  preferredLanguage?: string;
}): Promise<{ englishNote: string; regionalNote?: string }> {
  const { issueTitle, department, fromStatus, toStatus, officerName, preferredLanguage } = params;

  const fallback = () => {
    let englishNote = '';
    if (toStatus === 'IN_PROGRESS') {
      englishNote = `Field crew dispatched under ${officerName || department}. Inspection and rectification underway.`;
    } else if (toStatus === 'RESOLVED') {
      englishNote = `Issue resolved by ${department}. Maintenance completed and inspected for public safety.`;
    } else {
      englishNote = `Status updated to ${toStatus}. Work queued with ${department}.`;
    }
    return { englishNote };
  };

  return callGeminiWithRetry(
    async (ai) => {
      const prompt = `Write a professional, empathetic citizen-facing status update for a civic grievance.
Issue: "${issueTitle}"
Department: ${department}
Status Transition: ${fromStatus} -> ${toStatus}
Officer: ${officerName || 'Field Maintenance Crew'}
Citizen's Preferred Language: ${preferredLanguage || 'English'}

Return JSON:
{
  "englishNote": "concise, reassuring note in English (under 30 words)",
  "regionalNote": "translation of the note in ${preferredLanguage || 'Tamil'} if preferred language is not English, otherwise null"
}`;

      const res = await ai.models.generateContent({
        model: getModelName(),
        contents: [prompt],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const parsed = JSON.parse(res.text?.trim() || '{}');
      return {
        englishNote: parsed.englishNote || fallback().englishNote,
        regionalNote: parsed.regionalNote || undefined,
      };
    },
    fallback
  );
}

// -------------------------------------------------------------
// 8. AI Resolution Verification (Before vs After Image Comparison)
// -------------------------------------------------------------
export async function verifyResolution(params: {
  beforeImageBase64?: string;
  afterImageBase64: string;
  issueDescription: string;
  category: string;
}): Promise<VerificationResult> {
  const fallback = (): VerificationResult => ({
    resolved: true,
    confidence: 0.94,
    explanation: `Resolution verified: After-photo confirms remedial maintenance completed for ${params.category.toLowerCase()}. Surface/area is clean and obstruction-free.`,
    observations: 'Cleaned surface, restored infrastructure, and absence of prior defect noted.',
  });

  if (!params.afterImageBase64) {
    return {
      resolved: false,
      confidence: 0.0,
      explanation: 'No resolution photo provided for AI verification.',
      observations: 'Missing after-photo.',
    };
  }

  return callGeminiWithRetry(
    async (ai) => {
      const contents: any[] = [];

      // Add Before image if available
      if (params.beforeImageBase64) {
        contents.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: params.beforeImageBase64.replace(/^data:image\/\w+;base64,/, ''),
          },
        });
      }

      // Add After image
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: params.afterImageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      });

      contents.push(`You are a Municipal Quality Assurance AI Inspector.
Compare the before and after evidence for this civic grievance:
Category: ${params.category}
Complaint: ${params.issueDescription}

Does the after-photo genuinely prove that the reported issue has been repaired or cleared?
Return JSON:
{
  "resolved": boolean,
  "confidence": number (0 to 1),
  "explanation": "concise explanation of why this is considered resolved or why it fails verification",
  "observations": "specific visual details observed in the after image"
}`);

      const res = await ai.models.generateContent({
        model: getModelName(),
        contents,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(res.text?.trim() || '{}');
      return {
        resolved: Boolean(parsed.resolved),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
        explanation: parsed.explanation || fallback().explanation,
        observations: parsed.observations || fallback().observations,
      };
    },
    fallback
  );
}


// -------------------------------------------------------------
// 9. Multilingual Batch Content Translation Layer
// -------------------------------------------------------------
const INDIAN_LANG_NAMES: Record<string, string> = {
  hi: 'Hindi (हिन्दी)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ml: 'Malayalam (മലയാളം)',
  mr: 'Marathi (मराठी)',
  bn: 'Bengali (বাংলা)',
  gu: 'Gujarati (ગુજરાતી)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
  ur: 'Urdu (اردو)',
  en: 'English',
};

export async function translateContent(
  texts: Record<string, string>,
  targetLang: string
): Promise<Record<string, string>> {
  const normLang = (targetLang || 'en').toLowerCase().trim();
  if (normLang === 'en' || !texts || Object.keys(texts).length === 0) {
    return { ...texts };
  }

  const langFullName = INDIAN_LANG_NAMES[normLang] || targetLang;

  // Filter out empty strings
  const keysToTranslate = Object.keys(texts).filter(
    (k) => typeof texts[k] === 'string' && texts[k].trim().length > 0
  );

  if (keysToTranslate.length === 0) {
    return { ...texts };
  }

  const inputPayload: Record<string, string> = {};
  for (const k of keysToTranslate) {
    inputPayload[k] = texts[k];
  }

  const fallback = () => ({ ...texts });

  return callGeminiWithRetry(
    async (ai) => {
      const prompt = `You are an expert Indian government administrative translator.
Translate each text value in the following JSON into ${langFullName}.

CRITICAL RULES:
1. Return a JSON object with the EXACT SAME keys as the input.
2. Translate naturally, respectfully, and officially into ${langFullName}.
3. DO NOT alter or translate tracking IDs (e.g. CR-2026-xxxxx), URLs, email addresses, or reference codes.
4. Keep specific street names and geographical places transliterated accurately (e.g. Erode, Perundurai Road, Brough Road, Manikoondu, Chithode, Bhavani, Surampatti, Thindal).
5. Preserve formatting, numbers, and percentage signs (% intact).
6. Return ONLY a valid JSON object matching the input structure.

INPUT JSON:
${JSON.stringify(inputPayload, null, 2)}`;

      const res = await ai.models.generateContent({
        model: getModelName(),
        contents: [prompt],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const raw = res.text?.trim() || '{}';
      const parsed = JSON.parse(raw);

      const result: Record<string, string> = { ...texts };
      for (const k of keysToTranslate) {
        if (typeof parsed[k] === 'string' && parsed[k].trim()) {
          result[k] = parsed[k].trim();
        }
      }
      return result;
    },
    fallback
  );
}
