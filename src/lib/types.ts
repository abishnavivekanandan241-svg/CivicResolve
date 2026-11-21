export type Role = 'CITIZEN' | 'ADMIN';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type IssueStatus = 'REPORTED' | 'IN_PROGRESS' | 'RESOLVED';
export type IssuePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityFactor {
  factor: string;
  weight: number;
  explanation: string;
}

export interface StatusEventData {
  id: string;
  issueId: string;
  fromStatus: string;
  toStatus: string;
  note?: string | null;
  actorId?: string | null;
  actor?: {
    id: string;
    name: string;
    role: string;
  } | null;
  createdAt: string | Date;
}

export interface IssueData {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string | null;
  locationText: string;
  lat: number;
  lng: number;
  ward: string;
  imageUrl?: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  priorityScore: number;
  priorityFactors?: string | null;
  department: string;
  aiSummary?: string | null;
  aiReasoning?: string | null;
  aiConfidence?: number | null;
  safetyRisk: boolean;
  detectedLanguage?: string | null;
  detectedScript?: string | null;
  isRomanizedIndic: boolean;
  originalText?: string | null;
  englishTranslation?: string | null;
  preferredReplyLanguage?: string | null;
  duplicateOfId?: string | null;
  duplicateOf?: {
    id: string;
    trackingId: string;
    title: string;
    status: string;
  } | null;
  duplicates?: IssueData[];
  upvotes: number;
  slaDueAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  resolvedAt?: string | Date | null;
  reporterId?: string | null;
  reporter?: {
    id: string;
    name: string;
    email: string;
  } | null;
  resolutionImageUrl?: string | null;
  resolutionVerified: boolean;
  resolutionConfidence?: number | null;
  resolutionNote?: string | null;
  assignedOfficer?: string | null;
  isAiAnalyzed: boolean;
  isHumanOverridden: boolean;
  isSlaBreached?: boolean;
  statusEvents?: StatusEventData[];
  hasUpvoted?: boolean;
}

export interface GeminiAnalysisResult {
  category: string;
  subcategory: string;
  department: string;
  priority: IssuePriority;
  priorityScore: number;
  priorityFactors: PriorityFactor[];
  safetyRisk: boolean;
  summary: string;
  reasoning: string;
  confidence: number;
  imageMatchesDescription: boolean;
  imageObservations?: string;
  detectedLanguage: string;
  detectedScript: string;
  isRomanizedIndic: boolean;
  englishTranslation: string;
  suggestedTitle?: string;
  missingInfo?: string[];
  isAiGenerated: boolean;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateTrackingId?: string;
  duplicateId?: string;
  duplicateTitle?: string;
  distanceMeters?: number;
  matchReason?: string;
}

export interface VerificationResult {
  resolved: boolean;
  confidence: number;
  explanation: string;
  observations: string;
}

export interface BacklogSummary {
  headline: string;
  criticalUrgentCount: number;
  slaBreachedCount: number;
  topClusters: {
    title: string;
    area: string;
    count: number;
    description: string;
  }[];
  hotspots: {
    street: string;
    ward: string;
    issueCount: number;
    dominantCategory: string;
  }[];
  suggestedWorkOrders: {
    crewTitle: string;
    department: string;
    area: string;
    recommendedIssueIds: string[];
    benefit: string;
  }[];
}

