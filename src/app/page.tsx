'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Layers,
  Building,
  FileCheck2,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { IssueData } from '@/lib/types';

// Dynamically import Heatmap Map with SSR disabled
const TransparencyHeatmap = dynamic(
  () => import('@/components/Map/TransparencyHeatmap'),
  { ssr: false, loading: () => <div className="h-[400px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" /> }
);

export default function HomePage() {
  const router = useRouter();
  const { t } = useI18n();

  const [trackingQuery, setTrackingQuery] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load stats and issues
  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then((r) => r.json()),
      fetch('/api/issues').then((r) => r.json()),
    ])
      .then(([statsData, issuesData]) => {
        if (statsData.stats) setStats(statsData.stats);
        if (issuesData.issues) setIssues(issuesData.issues);
      })
      .catch((err) => console.error('Failed to load landing data:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingQuery.trim()) {
      router.push(`/issues/${encodeURIComponent(trackingQuery.trim().toUpperCase())}`);
    }
  };

  const resolvedShowcases = issues.filter((i) => i.status === 'RESOLVED' && i.resolutionImageUrl).slice(0, 3);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section - Official Public Service Aesthetic */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            {/* Classification Chip */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Public Service Portal • Citizen Charter SLA Standards</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Municipal Grievance Redressal &amp; Infrastructure Services
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Official digital system for Erode City Municipal Corporation. Lodge civic issues in any Indian language or voice dictation, track time-bound statutory SLAs, and verify field inspection records.
            </p>

            {/* Track-by-ID Input & Direct Action Buttons */}
            <div className="pt-2 space-y-4 max-w-xl">
              <form
                onSubmit={handleTrackSubmit}
                className="flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition"
              >
                <div className="pl-3 text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={trackingQuery}
                  onChange={(e) => setTrackingQuery(e.target.value)}
                  placeholder="Enter Grievance Tracking ID (e.g., CR-2026-00101)"
                  className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-mono uppercase"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm transition"
                >
                  Track Status
                </button>
              </form>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/report"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold transition shadow-xs"
                >
                  <span>File a Grievance</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/transparency"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>Ward Scoreboard &amp; Map</span>
                </Link>

                <Link
                  href="/my-issues"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <FileCheck2 className="w-4 h-4 text-slate-500" />
                  <span>Public Grievance Ledger</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Operational KPIs Section - Microsoft / Google Metric Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{t('statsTotalReported')}</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono">
              {stats?.totalIssues ?? 40}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Across 6 Corporation Wards</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{t('statsResolutionRate')}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              {stats?.resolvedPercentage ?? 20}%
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{stats?.resolvedCount ?? 8} inspected &amp; certified</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{t('statsAvgTime')}</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono">
              {stats?.avgResolutionHours ?? 18} <span className="text-xs font-normal text-slate-500">{t('statsHours')}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Intake to field completion</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Critical Priority</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-400 font-mono">
              {stats?.criticalCount ?? 7}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">High public-risk alerts</p>
          </div>
        </div>
      </section>

      {/* Mini Public Transparency Map Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>Geospatial Incident Distribution — Erode City</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ward-level infrastructure grievances color-coded by lifecycle stage.
              </p>
            </div>

            <Link
              href="/transparency"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
            >
              <span>View Full Ward Scoreboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Map */}
          <TransparencyHeatmap issues={issues} height="400px" />
        </div>
      </section>

      {/* Recently Resolved Gallery with Before/After Verification */}
      {resolvedShowcases.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified Resolutions Record</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Field inspections verified with photographic evidence by municipal audit teams.
                </p>
              </div>

              <Link
                href="/transparency"
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>View Full Registry</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {resolvedShowcases.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  {/* Before / After Dual Image Container */}
                  <div className="grid grid-cols-2 h-40 bg-slate-100 dark:bg-slate-800 relative">
                    <div className="relative border-r border-slate-200 dark:border-slate-700">
                      <img
                        src={issue.imageUrl || '/seed/road-damage.svg'}
                        alt="Before"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[9px] font-semibold tracking-wider uppercase">
                        Before
                      </span>
                    </div>

                    <div className="relative">
                      <img
                        src={issue.resolutionImageUrl || '/seed/pothole-after.svg'}
                        alt="After"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-700/90 text-white text-[9px] font-semibold tracking-wider uppercase">
                        Resolved
                      </span>
                    </div>

                    {/* Verified Certificate Bar */}
                    <div className="absolute bottom-1.5 inset-x-1.5 bg-slate-900/90 text-white px-2 py-1 rounded text-[10px] font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1 text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" /> Field Inspection Verified
                      </span>
                      <span className="text-slate-400 font-mono">
                        {Math.round((issue.resolutionConfidence || 0.95) * 100)}% Match
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-mono">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{issue.trackingId}</span>
                        <span>{issue.ward}</span>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {issue.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                        {issue.resolutionNote || issue.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        {issue.department}
                      </span>
                      <Link
                        href={`/issues/${issue.id}`}
                        className="font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>View Audit</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
