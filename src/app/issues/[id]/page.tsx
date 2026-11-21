'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building,
  Clock,
  MapPin,
  ThumbsUp,
  FileText,
  CheckCircle2,
  AlertTriangle,
  User,
  Copy,
  Check,
  Printer,
} from 'lucide-react';
import { IssueData, PriorityFactor } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import dynamic from 'next/dynamic';

const IssueDetailMap = dynamic(
  () => import('@/components/Map/LocationPickerMap'),
  { ssr: false, loading: () => <div className="h-[220px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" /> }
);

function IssueDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const {
    language,
    t,
    translateCategory,
    translateDepartment,
    translateStatus,
    translatePriority,
    formatDate,
    formatNumber,
  } = useI18n();

  const [issue, setIssue] = useState<IssueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upvote state
  const [upvotes, setUpvotes] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);

  // Formal Letter Modal
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [formalLetterText, setFormalLetterText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [letterLoading, setLetterLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/issues/${id}?lang=${encodeURIComponent(language)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.issue) {
          setIssue(data.issue);
          setUpvotes(data.issue.upvotes);
          setHasUpvoted(Boolean(data.issue.hasUpvoted));
        } else {
          setError(data.error || 'Grievance not found');
        }
      })
      .catch((err) => {
        console.error('Failed to load issue:', err);
        setError('Network error loading issue');
      })
      .finally(() => setLoading(false));
  }, [id, language]);

  const handleToggleUpvote = async () => {
    if (!issue || isUpvoting) return;
    setIsUpvoting(true);

    const prevUpvoted = hasUpvoted;
    const prevCount = upvotes;
    setHasUpvoted(!prevUpvoted);
    setUpvotes(prevUpvoted ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await fetch(`/api/issues/${issue.id}/upvote`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setUpvotes(data.upvotes);
        setHasUpvoted(data.hasUpvoted);
      } else {
        setHasUpvoted(prevUpvoted);
        setUpvotes(prevCount);
      }
    } catch {
      setHasUpvoted(prevUpvoted);
      setUpvotes(prevCount);
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleOpenLetter = async () => {
    if (!issue) return;
    setLetterLoading(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/complaint-letter?lang=${encodeURIComponent(language)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: language }),
      });
      const data = await res.json();
      if (data.letter) {
        setFormalLetterText(data.letter);
        setIsLetterModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to generate letter:', err);
    } finally {
      setLetterLoading(false);
    }
  };

  const copyLetter = () => {
    navigator.clipboard.writeText(formalLetterText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
          <div className="space-y-4">
            <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Record Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'Please check the Tracking ID and try again.'}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-700 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('backToLedger')}</span>
        </Link>
      </div>
    );
  }

  let factors: PriorityFactor[] = [];
  try {
    if (issue.priorityFactors) {
      factors = typeof issue.priorityFactors === 'string'
        ? JSON.parse(issue.priorityFactors)
        : issue.priorityFactors;
    }
  } catch {}

  const isResolved = issue.status === 'RESOLVED';
  const isInProgress = issue.status === 'IN_PROGRESS';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button and Official Tracking Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('backToLedger')}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tracking ID chip (Preserved untouched) */}
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            {issue.trackingId}
          </span>

          {/* Status Badge */}
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
              isResolved
                ? 'chip-resolved'
                : isInProgress
                ? 'chip-in_progress'
                : 'chip-reported'
            }`}
          >
            {translateStatus(issue.status)}
          </span>

          {/* Priority Chip */}
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              issue.priority === 'CRITICAL'
                ? 'chip-critical'
                : issue.priority === 'HIGH'
                ? 'chip-high'
                : issue.priority === 'MEDIUM'
                ? 'chip-medium'
                : 'chip-low'
            }`}
          >
            {translatePriority(issue.priority)} ({formatNumber(issue.priorityScore)})
          </span>

          {/* SLA Badge */}
          {issue.isSlaBreached && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {t('overdueSla')}
            </span>
          )}

          {/* Upvote Button */}
          <button
            onClick={handleToggleUpvote}
            disabled={isUpvoting}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition border ${
              hasUpvoted
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{formatNumber(upvotes)} {hasUpvoted ? t('upvoted') : t('upvotes')}</span>
          </button>

          {/* Formal Letter Button */}
          <button
            onClick={handleOpenLetter}
            disabled={letterLoading}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-60"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>{letterLoading ? '...' : t('generatePetition')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column = Analysis & Details; Right Column = Audit Timeline & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Issue Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold px-2 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    {translateCategory(issue.category)}
                  </span>
                  {issue.subcategory && (
                    <span className="text-[11px] text-slate-500">• {issue.subcategory}</span>
                  )}
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {issue.title}
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{issue.locationText} ({issue.ward})</span>
                </p>
              </div>

              {/* Priority Score Box */}
              <div className="w-12 h-12 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center font-mono flex-shrink-0">
                <span className="text-base font-bold text-slate-900 dark:text-white leading-none">
                  {formatNumber(issue.priorityScore)}
                </span>
                <span className="text-[8px] uppercase tracking-tighter text-slate-500">Score</span>
              </div>
            </div>

            {/* Description Body */}
            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {t('descriptionLabel')}
              </h3>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
                {issue.description}
              </p>
            </div>

            {/* Original Citizen Statement Box (Always preserved) */}
            {issue.originalText && issue.originalText !== issue.description && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">{t('originalStatement')}</span>
                  <span>{issue.detectedScript || issue.detectedLanguage}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/20 p-3 rounded border border-slate-200 dark:border-slate-800 italic">
                  &ldquo;{issue.originalText}&rdquo;
                </p>
              </div>
            )}

            {/* Evidence Image Gallery */}
            {(issue.imageUrl || issue.resolutionImageUrl) && (
              <div className="space-y-1.5 pt-1">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t('fieldEvidencePhotos')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {issue.imageUrl && (
                    <div className="space-y-1">
                      <div className="relative h-36 rounded border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={issue.imageUrl}
                          alt="Reported Issue Photo"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 rounded bg-slate-900/80 text-white text-[9px] font-semibold uppercase">
                          {t('initialInspection')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">{issue.locationText}</p>
                    </div>
                  )}

                  {issue.resolutionImageUrl && (
                    <div className="space-y-1">
                      <div className="relative h-36 rounded border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={issue.resolutionImageUrl}
                          alt="Resolution Photo"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded bg-emerald-700 text-white text-[9px] font-semibold uppercase">
                          {t('completionProof')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {t('certifiedInspection')}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {formatNumber(Math.round((issue.resolutionConfidence || 0.95) * 100))}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Triage Justification & Risk Assessment */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t('officialSummary')}
              </h2>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded border border-slate-200 dark:border-slate-700 leading-relaxed">
                {issue.aiSummary || 'Civic infrastructure complaint registered for engineering action.'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">
                {t('publicReasoning')}
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded border border-slate-200 dark:border-slate-700 leading-relaxed">
                {issue.aiReasoning || 'Routed to jurisdiction unit according to municipal Citizen Charter guidelines.'}
              </p>
            </div>

            {factors.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  {t('riskAssessment')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {factors.map((factor, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                        <span>{factor.factor}</span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">{formatNumber(factor.weight)}%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {factor.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Department, SLA, Timeline */}
        <div className="space-y-5">
          {/* Assigned Department Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('departmentalUnit')}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    {translateDepartment(issue.department)}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {issue.assignedOfficer || 'Divisional Maintenance Crew'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">{t('slaDueDate')}:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                  {formatDate(issue.slaDueAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Vertical Status Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{t('auditStatusLog')}</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                {issue.statusEvents?.length || 1}
              </span>
            </div>

            <div className="space-y-4 relative pl-3 before:absolute before:top-2 before:bottom-2 before:left-0.5 before:w-[1px] before:bg-slate-200 dark:before:bg-slate-800">
              {issue.statusEvents && issue.statusEvents.length > 0 ? (
                issue.statusEvents.map((evt, idx) => (
                  <div key={evt.id || idx} className="relative group pl-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {translateStatus(evt.toStatus)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(evt.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                        {evt.note}
                      </p>
                      {evt.actor && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          <span>{evt.actor.name} ({evt.actor.role})</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">Log entries initializing...</div>
              )}
            </div>
          </div>

          {/* Location Map Pin */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{t('geotagCoordinates')}</span>
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
              {issue.locationText}
            </p>
            <div className="h-[200px] rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
              <IssueDetailMap lat={issue.lat} lng={issue.lng} onChange={() => {}} />
            </div>
          </div>
        </div>
      </div>

      {/* Formal Letter Modal */}
      {isLetterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-md max-w-2xl w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  {t('officialMemorandum')} ({issue.trackingId})
                </h3>
              </div>
              <button
                onClick={() => setIsLetterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm px-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 rounded border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {formalLetterText}
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 mt-3">
              <button
                onClick={copyLetter}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? t('copied') : t('copyText')}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('printDocument')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IssueDetailPage() {
  return (
    <React.Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-slate-400">Loading grievance docket...</div>}>
      <IssueDetailContent />
    </React.Suspense>
  );
}
