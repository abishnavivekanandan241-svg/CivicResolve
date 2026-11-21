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
  BarChart3,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { IssueData } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const TransparencyHeatmap = dynamic(
  () => import('@/components/Map/TransparencyHeatmap'),
  { ssr: false, loading: () => <div className="h-[480px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" /> }
);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 text-blue-700 dark:text-blue-400" />
            Public Transparency Ledger
          </span>
          <span className="text-xs text-slate-400">Section 4(1)(b) RTI Compliant</span>
        </div>
        <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Civic Transparency &amp; Ward Performance Scoreboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Real-time accountability data, ward resolution performance rankings, and verified before-and-after evidence published by Erode City Municipal Corporation.
        </p>
      </div>

      {/* Main Interactive Map & Heatmap Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>Geospatial Incident &amp; Heatmap Distribution</span>
            </h2>
            <p className="text-xs text-slate-500">
              Toggle density view to identify municipal infrastructure bottlenecks across Corporation Wards 1 through 6.
            </p>
          </div>
        </div>

        <TransparencyHeatmap issues={issues} height="460px" />
      </div>

      {/* Ward Leaderboard Scoreboard & Category Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ward Leaderboard Table (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Ward SLA Performance Ranking
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Ranked by Resolution Adherence %</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2">Rank &amp; Ward Name</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Resolved</th>
                  <th className="px-3 py-2">In Progress</th>
                  <th className="px-3 py-2">Completion Rate</th>
                  <th className="px-3 py-2 text-right">Avg SLA Turnaround</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats?.wardLeaderboard?.map((w: any, index: number) => (
                  <tr key={w.ward} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="font-mono text-slate-500 font-semibold w-4">
                        #{index + 1}
                      </span>
                      <span>{w.ward}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-slate-400">{w.total}</td>
                    <td className="px-3 py-2.5 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{w.resolved}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-slate-400">{w.inProgress}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-700 h-1.5 rounded"
                            style={{ width: `${w.resolutionRate}%` }}
                          />
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          {w.resolutionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                      {w.avgResolutionHours} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Breakdown Chart (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Grievance Category Breakdown
              </h2>
            </div>
          </div>

          <div className="h-64 w-full">
            {stats?.categoryStats && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryStats} layout="vertical" margin={{ left: -10, right: 10 }}>
                  <XAxis type="number" fontSize={10} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={110} fontSize={10} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Verified Resolution Gallery with Before/After */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Field Inspection &amp; Certification Registry</span>
          </h2>
          <p className="text-xs text-slate-500">
            Compare initial complaint evidence with post-repair completion photos verified by municipal engineers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {resolvedShowcases.map((issue) => (
            <div
              key={issue.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              {/* Dual image box */}
              <div className="grid grid-cols-2 h-32 bg-slate-100 dark:bg-slate-800 relative">
                <div className="relative border-r border-slate-200 dark:border-slate-700">
                  <img
                    src={issue.imageUrl || '/seed/road-damage.svg'}
                    alt="Before"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1.5 left-1.5 px-1 py-0.2 rounded bg-slate-900/80 text-white text-[9px] font-semibold uppercase">
                    Before
                  </span>
                </div>

                <div className="relative">
                  <img
                    src={issue.resolutionImageUrl || '/seed/pothole-after.svg'}
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-emerald-700 text-white text-[9px] font-semibold uppercase">
                    Resolved
                  </span>
                </div>
              </div>

              {/* Text metadata */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-mono">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{issue.trackingId}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Certified</span>
                  </div>
                  <h3 className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-1">
                    {issue.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                    {issue.resolutionNote || issue.description}
                  </p>
                </div>

                <Link
                  href={`/issues/${issue.id}`}
                  className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800"
                >
                  <span>View Audit Record</span>
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
