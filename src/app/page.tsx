'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Building2,
  Layers,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { IssueData } from '@/lib/types';

// Dynamically import Heatmap Map with SSR disabled
const TransparencyHeatmap = dynamic(
  () => import('@/components/Map/TransparencyHeatmap'),
  { ssr: false, loading: () => <div className="h-[400px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" /> }
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
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-12 pb-16 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100/80 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Next-Gen Urban Governance with Google Gemini 2.5 Flash</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Report Civic Issues in 30 Seconds.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">
                Resolved with AI Precision.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Multimodal Gemini intelligence detects Indic languages, assesses public impact, routes to municipal departments with automated SLAs, and guarantees verified resolutions.
            </p>

            {/* CTAs & Track-by-ID Search Bar */}
            <div className="pt-2 max-w-xl mx-auto space-y-4">
              <form
                onSubmit={handleTrackSubmit}
                className="flex items-center p-1.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-sky-500/40 shadow-lg shadow-sky-500/10 focus-within:border-sky-500 transition"
              >
                <div className="pl-3 text-slate-400">
                  <Search className="w-5 h-5 text-sky-600" />
                </div>
                <input
                  type="text"
                  value={trackingQuery}
                  onChange={(e) => setTrackingQuery(e.target.value)}
                  placeholder={t('trackInputPlaceholder')}
                  className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none uppercase font-mono tracking-wide"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-md transition"
                >
                  {t('trackAction')}
                </button>
              </form>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/report"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-sky-600/25 transition group"
                >
                  <span>{t('reportIssueBtn')}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/transparency"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>{t('transparencyMapBtn')}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Operational KPIs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">{t('statsTotalReported')}</span>
              <Layers className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats?.totalIssues ?? 40}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Across 6 Corporation Wards</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">{t('statsResolutionRate')}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {stats?.resolvedPercentage ?? 20}%
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{stats?.resolvedCount ?? 8} verified resolutions</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">{t('statsAvgTime')}</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats?.avgResolutionHours ?? 18} <span className="text-sm font-medium text-slate-400">{t('statsHours')}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">From intake to verified fix</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Active Urgent Work</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-600">
              {stats?.criticalCount ?? 7}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">High public-risk dispatches</p>
          </div>
        </div>
      </section>

      {/* Mini Public Transparency Map Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Live Grievance Activity — Erode City
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time geotagged complaints color-coded by lifecycle stage.
              </p>
            </div>

            <Link
              href="/transparency"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700"
            >
              <span>Explore Full Transparency Map &amp; Ward Leaderboard</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Map */}
          <TransparencyHeatmap issues={issues} height="400px" />
        </div>
      </section>

      {/* Recently Resolved Gallery with Before/After */}
      {resolvedShowcases.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Recently Resolved &amp; AI-Verified</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Municipal crews verify resolution by submitting evidence photos analyzed by Gemini.
                </p>
              </div>

              <Link
                href="/transparency"
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <span>View All Resolved</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {resolvedShowcases.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col group hover:shadow-md transition"
                >
                  {/* Before / After Dual Image Container */}
                  <div className="grid grid-cols-2 h-44 bg-slate-100 dark:bg-slate-800 relative">
                    <div className="relative border-r border-slate-200 dark:border-slate-700">
                      <img
                        src={issue.imageUrl || '/seed/road-damage.svg'}
                        alt="Before"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-red-600/90 text-white text-[10px] font-bold">
                        BEFORE
                      </span>
                    </div>

                    <div className="relative">
                      <img
                        src={issue.resolutionImageUrl || '/seed/pothole-after.svg'}
                        alt="After"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-bold">
                        AFTER
                      </span>
                    </div>

                    {/* AI Verified Ribbon */}
                    <div className="absolute bottom-2 inset-x-2 bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> AI Resolution Verified
                      </span>
                      <span className="text-slate-300 font-mono">
                        {Math.round((issue.resolutionConfidence || 0.95) * 100)}% Match
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{issue.trackingId}</span>
                        <span>{issue.ward}</span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-sky-600 transition">
                        {issue.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {issue.resolutionNote || issue.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {issue.department}
                      </span>
                      <Link
                        href={`/issues/${issue.id}`}
                        className="font-bold text-sky-600 hover:text-sky-700 flex items-center gap-0.5"
                      >
                        <span>Audit Trail</span>
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
