'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  MapPin,
  Trophy,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  BarChart3,
  Flame,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { IssueData } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const TransparencyHeatmap = dynamic(
  () => import('@/components/Map/TransparencyHeatmap'),
  { ssr: false, loading: () => <div className="h-[480px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" /> }
);

const CATEGORY_COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

export default function TransparencyPage() {
  const [stats, setStats] = useState<any>(null);
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then((r) => r.json()),
      fetch('/api/issues').then((r) => r.json()),
    ])
      .then(([statsData, issuesData]) => {
        if (statsData.stats) setStats(statsData.stats);
        if (issuesData.issues) setIssues(issuesData.issues);
      })
      .catch((err) => console.error('Failed to load transparency data:', err))
      .finally(() => setLoading(false));
  }, []);

  const resolvedShowcases = issues.filter((i) => i.status === 'RESOLVED' && i.resolutionImageUrl);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Page Title */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <Trophy className="w-3 h-3" /> Public Transparency Portal
          </span>
          <span className="text-xs text-slate-400">Open Municipal Ledger</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
          Civic Transparency &amp; Ward Scoreboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Real-time accountability data, ward resolution performance rankings, and verified before-and-after evidence.
        </p>
      </div>

      {/* Main Interactive Map & Heatmap Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              <span>City Incident Distribution Map</span>
            </h2>
            <p className="text-xs text-slate-500">
              Toggle Heatmap to view high-density grievance zones across Erode. Click any pin for live audit status.
            </p>
          </div>
        </div>

        <TransparencyHeatmap issues={issues} height="480px" />
      </div>

      {/* Ward Leaderboard Scoreboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ward Leaderboard Table (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Ward Efficiency Leaderboard
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Ranked by Resolution %</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-3 py-2.5">Rank &amp; Ward</th>
                  <th className="px-3 py-2.5">Total</th>
                  <th className="px-3 py-2.5">Resolved</th>
                  <th className="px-3 py-2.5">In Progress</th>
                  <th className="px-3 py-2.5">Resolution Rate</th>
                  <th className="px-3 py-2.5 text-right">Avg Turnaround</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats?.wardLeaderboard?.map((w: any, index: number) => (
                  <tr key={w.ward} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${index === 0
                            ? 'bg-amber-400 text-slate-900'
                            : index === 1
                              ? 'bg-slate-300 text-slate-800'
                              : index === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                      >
                        {index + 1}
                      </span>
                      <span>{w.ward}</span>
                    </td>
                    <td className="px-3 py-3 font-mono">{w.total}</td>
                    <td className="px-3 py-3 font-mono text-emerald-600 font-bold">{w.resolved}</td>
                    <td className="px-3 py-3 font-mono text-purple-600">{w.inProgress}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{ width: `${w.resolutionRate}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                          {w.resolutionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-500">
                      {w.avgResolutionHours} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Breakdown Chart (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Category Volume
              </h2>
            </div>
          </div>

          <div className="h-64 w-full">
            {stats?.categoryStats && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryStats} layout="vertical" margin={{ left: -10, right: 10 }}>
                  <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={110} fontSize={10} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0284c7" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Verified Resolution Gallery with Before/After */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>CivicResolve Verified Resolutions</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compare original complaint photo against post-repair evidence verified by Gemini AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {resolvedShowcases.map((issue) => (
            <div
              key={issue.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              {/* Dual image box */}
              <div className="grid grid-cols-2 h-36 bg-slate-100 dark:bg-slate-800 relative">
                <div className="relative border-r border-slate-200 dark:border-slate-700">
                  <img
                    src={issue.imageUrl || '/seed/road-damage.svg'}
                    alt="Before"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1.5 left-1.5 px-1 rounded bg-red-600 text-white text-[9px] font-bold">
                    BEFORE
                  </span>
                </div>

                <div className="relative">
                  <img
                    src={issue.resolutionImageUrl || '/seed/pothole-after.svg'}
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1.5 right-1.5 px-1 rounded bg-emerald-600 text-white text-[9px] font-bold">
                    AFTER
                  </span>
                </div>
              </div>

              {/* Text metadata */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-mono font-bold text-sky-600">{issue.trackingId}</span>
                    <span className="text-emerald-600 font-bold">AI Verified</span>
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                    {issue.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                    {issue.resolutionNote || issue.description}
                  </p>
                </div>

                <Link
                  href={`/issues/${issue.id}`}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800"
                >
                  <span>View Timeline Audit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

