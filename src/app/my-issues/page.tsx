'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Search,
  PlusCircle,
  ThumbsUp,
  MapPin,
  Layers,
  ChevronRight,
  ArrowRight,
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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Official Municipal Records
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-700 dark:text-blue-400" />
            <span>Public Grievance Registry &amp; Dispatch Ledger</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Real-time audit log of civic complaints, statutory SLA targets, and field resolution certificates across Erode.
          </p>
        </div>

        <Link
          href="/report"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition self-start sm:self-auto shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>File New Grievance</span>
        </Link>
      </div>

      {/* Filters & Search Toolbar - Enterprise Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, title, street or ward..."
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
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
            className="text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
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
          <div className="flex rounded border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Querying municipal grievance database...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-3">
          <Layers className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No records matching query</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your search filters or file a new infrastructure grievance.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW - Official Ledger */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-2.5">Tracking ID</th>
                  <th className="px-3.5 py-2.5">Grievance Subject</th>
                  <th className="px-3.5 py-2.5">Category</th>
                  <th className="px-3.5 py-2.5">Ward</th>
                  <th className="px-3.5 py-2.5">Assigned Department</th>
                  <th className="px-3.5 py-2.5">Priority</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    onClick={() => router.push(`/issues/${issue.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                  >
                    <td className="px-3.5 py-3 font-mono font-semibold text-blue-700 dark:text-blue-400">
                      {issue.trackingId}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                      {issue.title}
                    </td>
                    <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">
                      {issue.category}
                    </td>
                    <td className="px-3.5 py-3 text-slate-500 truncate max-w-[130px]">
                      {issue.ward}
                    </td>
                    <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">
                      {issue.department}
                    </td>
                    <td className="px-3.5 py-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${issue.priority === 'CRITICAL'
                            ? 'chip-critical'
                            : issue.priority === 'HIGH'
                              ? 'chip-high'
                              : issue.priority === 'MEDIUM'
                                ? 'chip-medium'
                                : 'chip-low'
                          }`}
                      >
                        {issue.priority}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${issue.status === 'RESOLVED'
                            ? 'chip-resolved'
                            : issue.status === 'IN_PROGRESS'
                              ? 'chip-in_progress'
                              : 'chip-reported'
                          }`}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right font-semibold text-blue-700 dark:text-blue-400">
                      Inspect →
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW - Structured Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIssues.map((issue) => (
            <Link
              key={issue.id}
              href={`/issues/${issue.id}`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {issue.trackingId}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${issue.status === 'RESOLVED'
                          ? 'chip-resolved'
                          : issue.status === 'IN_PROGRESS'
                            ? 'chip-in_progress'
                            : 'chip-reported'
                        }`}
                    >
                      {issue.status}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${issue.priority === 'CRITICAL'
                          ? 'chip-critical'
                          : issue.priority === 'HIGH'
                            ? 'chip-high'
                            : issue.priority === 'MEDIUM'
                              ? 'chip-medium'
                              : 'chip-low'
                        }`}
                    >
                      {issue.priority}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-700 transition">
                    {issue.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {issue.description}
                  </p>
                </div>

                {issue.detectedLanguage && issue.detectedLanguage !== 'English' && (
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded line-clamp-1 border border-slate-200 dark:border-slate-700">
                    Source: {issue.detectedScript || issue.detectedLanguage}
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 truncate max-w-[150px]">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{issue.ward}</span>
                </span>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-mono font-medium text-slate-600 dark:text-slate-300">
                    <ThumbsUp className="w-3 h-3" />
                    <span>{issue.upvotes}</span>
                  </span>
                  <span className="text-blue-700 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
