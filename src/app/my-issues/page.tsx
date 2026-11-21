'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Search,
  Filter,
  PlusCircle,
  ThumbsUp,
  Clock,
  MapPin,
  ChevronRight,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { IssueData } from '@/lib/types';

export default function MyIssuesPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [issues, setIssues] = useState<IssueData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    fetchIssues();
  }, [statusFilter, categoryFilter]);

  const fetchIssues = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    if (categoryFilter !== 'ALL') params.append('category', categoryFilter);

    fetch(`/api/issues?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.issues) setIssues(data.issues);
      })
      .catch((err) => console.error('Failed to load issues:', err))
      .finally(() => setLoading(false));
  };

  const filteredIssues = issues.filter((i) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.trackingId.toLowerCase().includes(q) ||
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.locationText.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-sky-600" />
            <span>Civic Grievance Tracking Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track real-time progress, dispatch timelines, and SLA adherence across Erode.
          </p>
        </div>

        <Link
          href="/report"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('reportIssueBtn')}</span>
        </Link>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, title, street or ward..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="REPORTED">Reported</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="ALL">All Categories</option>
            <option value="Pothole">Pothole</option>
            <option value="Garbage Overflow">Garbage Overflow</option>
            <option value="Streetlight">Streetlight</option>
            <option value="Water Leakage">Water Leakage</option>
            <option value="Road Damage">Road Damage</option>
            <option value="Drainage Blockage">Drainage Blockage</option>
            <option value="Fallen Tree">Fallen Tree</option>
            <option value="Stray Animals">Stray Animals</option>
            <option value="Noise/Other">Noise / Other</option>
          </select>

          {/* View Toggle */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading grievances...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No grievances found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search filters or report a new issue in your neighborhood.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIssues.map((issue) => (
            <Link
              key={issue.id}
              href={`/issues/${issue.id}`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Header row: Tracking ID & Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-extrabold text-slate-500 group-hover:text-sky-600 transition">
                    {issue.trackingId}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${issue.status === 'RESOLVED'
                          ? 'badge-resolved'
                          : issue.status === 'IN_PROGRESS'
                            ? 'badge-in_progress'
                            : 'badge-reported'
                        }`}
                    >
                      {issue.status}
                    </span>

                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${issue.priority === 'CRITICAL'
                          ? 'badge-critical'
                          : issue.priority === 'HIGH'
                            ? 'badge-high'
                            : issue.priority === 'MEDIUM'
                              ? 'badge-medium'
                              : 'badge-low'
                        }`}
                    >
                      {issue.priority}
                    </span>
                  </div>
                </div>

                {/* Title & Category */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-sky-600 transition">
                    {issue.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {issue.description}
                  </p>
                </div>

                {/* Translation chip if present */}
                {issue.detectedLanguage && issue.detectedLanguage !== 'English' && (
                  <div className="text-[10px] text-sky-700 dark:text-sky-300 font-medium bg-sky-50 dark:bg-sky-950/60 px-2 py-1 rounded-md line-clamp-1">
                    Translated from {issue.detectedScript || issue.detectedLanguage}
                  </div>
                )}
              </div>

              {/* Bottom Metadata */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                  <MapPin className="w-3 h-3 text-red-500" />
                  <span className="truncate max-w-[140px]">{issue.ward}</span>
                </span>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                    <ThumbsUp className="w-3 h-3 text-sky-600" />
                    <span>{issue.upvotes}</span>
                  </span>
                  <span className="text-sky-600 font-bold group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Tracking ID</th>
                  <th className="px-4 py-3">Grievance Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Ward</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    onClick={() => router.push(`/issues/${issue.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-sky-600">
                      {issue.trackingId}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                      {issue.title}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      {issue.category}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 truncate max-w-[140px]">
                      {issue.ward}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      {issue.department}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${issue.priority === 'CRITICAL'
                            ? 'badge-critical'
                            : issue.priority === 'HIGH'
                              ? 'badge-high'
                              : issue.priority === 'MEDIUM'
                                ? 'badge-medium'
                                : 'badge-low'
                          }`}
                      >
                        {issue.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${issue.status === 'RESOLVED'
                            ? 'badge-resolved'
                            : issue.status === 'IN_PROGRESS'
                              ? 'badge-in_progress'
                              : 'badge-reported'
                          }`}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-sky-600">
                      View →
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

