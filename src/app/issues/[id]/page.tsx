'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowLeft,
  Building2,
  Clock,
  MapPin,
  Sparkles,
  ThumbsUp,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
  User,
  Share2,
  Copy,
  Check,
  Calendar,
} from 'lucide-react';
import { IssueData, PriorityFactor } from '@/lib/types';
import dynamic from 'next/dynamic';

const IssueDetailMap = dynamic(
  () => import('@/components/Map/LocationPickerMap'),
  { ssr: false, loading: () => <div className="h-[220px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" /> }
);

function IssueDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/issues/${id}`)
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
  }, [id]);

  const handleToggleUpvote = async () => {
    if (!issue || isUpvoting) return;
    setIsUpvoting(true);

    // Optimistic UI update
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
        // Revert
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
    try {
      const res = await fetch(`/api/issues/${issue.id}/complaint-letter`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.letter) {
        setFormalLetterText(data.letter);
        setIsLetterModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to generate letter:', err);
    }
  };

  const copyLetter = () => {
    navigator.clipboard.writeText(formalLetterText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-medium">Loading grievance tracking ledger...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Grievance Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'Please check the Tracking ID and try again.'}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </Link>
      </div>
    );
  }

  // Parse priority factors
  let factors: PriorityFactor[] = [];
  try {
    if (issue.priorityFactors) {
      factors = JSON.parse(issue.priorityFactors);
    }
  } catch {}

  const isResolved = issue.status === 'RESOLVED';
  const isInProgress = issue.status === 'IN_PROGRESS';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button and Tracking Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Grievances</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tracking ID chip */}
          <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            {issue.trackingId}
          </span>

          {/* Status Badge */}
          <span
            className={`text-xs font-extrabold px-3 py-1 rounded-lg ${
              isResolved
                ? 'badge-resolved'
                : isInProgress
                ? 'badge-in_progress'
                : 'badge-reported'
            }`}
          >
            {issue.status}
          </span>

          {/* SLA Badge */}
          {issue.isSlaBreached && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1">
              <Clock className="w-3 h-3" /> SLA Breached
            </span>
          )}

          {/* Upvote Button */}
          <button
            onClick={handleToggleUpvote}
            disabled={isUpvoting}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition border ${
              hasUpvoted
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{upvotes} Upvotes</span>
          </button>

          {/* Formal Letter Button */}
          <button
            onClick={handleOpenLetter}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Complaint Letter</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column = Analysis & Details; Right Column = Audit Timeline & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {issue.category}
                  </span>
                  {issue.subcategory && (
                    <span className="text-[11px] text-slate-400">• {issue.subcategory}</span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {issue.title}
                </h1>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>{issue.locationText} ({issue.ward})</span>
                </p>
              </div>

              {/* Priority Score Circle */}
              <div
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black flex-shrink-0 ${
                  issue.priority === 'CRITICAL'
                    ? 'bg-red-500/10 text-red-600 border border-red-500/30'
                    : issue.priority === 'HIGH'
                    ? 'bg-orange-500/10 text-orange-600 border border-orange-500/30'
                    : issue.priority === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                }`}
              >
                <span className="text-lg leading-none">{issue.priorityScore}</span>
                <span className="text-[8px] uppercase tracking-tighter opacity-70">Impact</span>
              </div>
            </div>

            {/* Description Body */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Grievance Description
              </h3>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
                {issue.originalText || issue.description}
              </p>
            </div>

            {/* Multilingual Translation Banner */}
            {issue.detectedLanguage && issue.detectedLanguage !== 'English' && (
              <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 rounded-xl p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-sky-800 dark:text-sky-300">
                  <span>Translated from {issue.detectedScript || issue.detectedLanguage}</span>
                  {issue.isRomanizedIndic && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-100">
                      Transliterated
                    </span>
                  )}
                </div>
                <p className="text-slate-700 dark:text-slate-300 italic">
                  &ldquo;{issue.englishTranslation}&rdquo;
                </p>
              </div>
            )}

            {/* Evidence Image Gallery */}
            {(issue.imageUrl || issue.resolutionImageUrl) && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Visual Evidence Inspection
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {issue.imageUrl && (
                    <div className="space-y-1">
                      <div className="relative h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                        <img
                          src={issue.imageUrl}
                          alt="Reported Issue Photo"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
                          ORIGINAL REPORT
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Photo captured by citizen</p>
                    </div>
                  )}

                  {issue.resolutionImageUrl && (
                    <div className="space-y-1">
                      <div className="relative h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                        <img
                          src={issue.resolutionImageUrl}
                          alt="Resolution Photo"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                          AFTER RESOLUTION
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> AI Verified
                        </span>
                        <span className="text-slate-400">
                          {Math.round((issue.resolutionConfidence || 0.95) * 100)}% Confidence
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Gemini AI Intelligence Breakdown Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                  Gemini AI Civic Intelligence Engine
                </h2>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  issue.isAiAnalyzed
                    ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {issue.isAiAnalyzed ? 'AI Analysed' : 'Basic rules (AI offline)'}
              </span>
            </div>

            {/* AI Summary for Officials */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Official Executive Summary
              </span>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                {issue.aiSummary || 'Civic grievance registered for administrative review.'}
              </p>
            </div>

            {/* Plain-Language Citizen Reasoning */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Public Transparency Reasoning
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
                {issue.aiReasoning || 'Assigned based on municipal departmental jurisdiction.'}
              </p>
            </div>

            {/* Priority Factor Weights */}
            {factors.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Multi-Factor Impact Weighting
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {factors.map((factor, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                        <span>{factor.factor}</span>
                        <span className="text-sky-600 font-mono">{factor.weight}%</span>
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

        {/* Right Column (1 col): Status Timeline & Details */}
        <div className="space-y-6">
          {/* Assigned Department Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Department Assignment
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {issue.department}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Officer: {issue.assignedOfficer || 'Divisional Maintenance Unit'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">SLA Due Date:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {issue.slaDueAt
                    ? new Date(issue.slaDueAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Within 24 Hours'}
                </span>
              </div>
            </div>
          </div>

          {/* Vertical Status Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>Audit Status Timeline</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                {issue.statusEvents?.length || 1} Events
              </span>
            </div>

            <div className="space-y-6 relative pl-4 before:absolute before:top-2 before:bottom-2 before:left-1 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
              {issue.statusEvents && issue.statusEvents.length > 0 ? (
                issue.statusEvents.map((evt, idx) => (
                  <div key={evt.id || idx} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        evt.toStatus === 'RESOLVED'
                          ? 'bg-emerald-500'
                          : evt.toStatus === 'IN_PROGRESS'
                          ? 'bg-purple-500'
                          : 'bg-blue-500'
                      }`}
                    />

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {evt.toStatus === 'NONE'
                            ? 'Reported'
                            : evt.toStatus.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(evt.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
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
                <div className="text-xs text-slate-400">Timeline events initializing...</div>
              )}
            </div>
          </div>

          {/* Location Map Pin */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>Location Coordinates</span>
            </h3>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {issue.locationText}
            </p>
            <div className="h-[220px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <IssueDetailMap lat={issue.lat} lng={issue.lng} onChange={() => {}} />
            </div>
          </div>
        </div>
      </div>

      {/* Formal Letter Modal */}
      {isLetterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Official Formal Grievance Letter ({issue.trackingId})
                </h3>
              </div>
              <button
                onClick={() => setIsLetterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {formalLetterText}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button
                onClick={copyLetter}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-sm"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Copied!' : 'Copy Letter'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <span>Print / Save as PDF</span>
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
    <React.Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-slate-400">Loading grievance ledger...</div>}>
      <IssueDetailContent />
    </React.Suspense>
  );
}


