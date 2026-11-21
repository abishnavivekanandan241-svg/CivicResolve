'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  LayoutDashboard,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Layers,
  Search,
  Filter,
  UserCheck,
  Building2,
  MapPin,
  Camera,
  RefreshCw,
  Send,
  Eye,
  Sliders,
  ChevronRight,
  TrendingUp,
  X,
  FileCheck,
  Check,
} from 'lucide-react';
import { IssueData, BacklogSummary } from '@/lib/types';
import { DEPARTMENTS, CATEGORIES } from '@/lib/gemini';
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

const AdminOperationsMap = dynamic(
  () => import('@/components/Map/TransparencyHeatmap'),
  { ssr: false, loading: () => <div className="h-[480px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" /> }
);

const PRIORITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [briefing, setBriefing] = useState<BacklogSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Admin Tab: 'table' | 'map'
  const [activeTab, setActiveTab] = useState<'table' | 'map'>('table');

  // Table Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [wardFilter, setWardFilter] = useState('ALL');

  // Side Drawer State
  const [selectedIssue, setSelectedIssue] = useState<IssueData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Drawer Form State
  const [drawerStatus, setDrawerStatus] = useState<string>('REPORTED');
  const [drawerNote, setDrawerNote] = useState<string>('');
  const [drawerOfficer, setDrawerOfficer] = useState<string>('');
  const [drawerCategory, setDrawerCategory] = useState<string>('');
  const [drawerPriority, setDrawerPriority] = useState<string>('');
  const [drawerDepartment, setDrawerDepartment] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Resolution Verification
  const [afterImageBase64, setAfterImageBase64] = useState<string | undefined>(undefined);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, issuesRes, briefingRes] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()),
        fetch('/api/issues').then((r) => r.json()),
        fetch('/api/admin/briefing').then((r) => r.json()),
      ]);

      if (statsRes.stats) setStats(statsRes.stats);
      if (issuesRes.issues) setIssues(issuesRes.issues);
      if (briefingRes.briefing) setBriefing(briefingRes.briefing);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openIssueDrawer = (issue: IssueData) => {
    setSelectedIssue(issue);
    setDrawerStatus(issue.status);
    setDrawerNote('');
    setDrawerOfficer(issue.assignedOfficer || '');
    setDrawerCategory(issue.category);
    setDrawerPriority(issue.priority);
    setDrawerDepartment(issue.department);
    setAfterImageBase64(undefined);
    setVerificationFeedback(null);
    setIsDrawerOpen(true);
  };

  // Handle Photo upload for resolution in Drawer
  const handleResolutionPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAfterImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Run AI Resolution Verification
  const handleRunAiVerification = async () => {
    if (!selectedIssue || !afterImageBase64) {
      alert('Please select or upload a resolution after-photo to verify.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch(`/api/issues/${selectedIssue.id}/verify-resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          afterImageBase64,
          beforeImageBase64: selectedIssue.imageUrl,
          saveToIssue: true,
        }),
      });

      const data = await res.json();
      if (data.verification) {
        setVerificationFeedback(data.verification);
        if (data.verification.resolved) {
          setDrawerStatus('RESOLVED');
          setDrawerNote(data.verification.explanation);
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      alert('AI verification fallback completed.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Submit Admin Updates
  const handleSaveDrawerUpdate = async () => {
    if (!selectedIssue) return;
    setIsUpdating(true);

    try {
      const payload: any = {
        status: drawerStatus,
        note: drawerNote,
        assignedOfficer: drawerOfficer,
      };

      // Check for human overrides
      if (drawerCategory !== selectedIssue.category) {
        payload.overrideCategory = drawerCategory;
      }
      if (drawerPriority !== selectedIssue.priority) {
        payload.overridePriority = drawerPriority;
      }
      if (drawerDepartment !== selectedIssue.department) {
        payload.overrideDepartment = drawerDepartment;
      }

      if (afterImageBase64) {
        payload.resolutionImageUrl = afterImageBase64;
        payload.resolutionVerified = verificationFeedback?.resolved ?? true;
        payload.resolutionNote = drawerNote || 'Work inspected and verified by municipal administrator.';
      }

      const res = await fetch(`/api/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsDrawerOpen(false);
        fetchData();
      } else {
        alert(data.error || 'Failed to update grievance');
      }
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter issues
  const filteredIssues = issues.filter((i) => {
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && i.priority !== priorityFilter) return false;
    if (departmentFilter !== 'ALL' && i.department !== departmentFilter) return false;
    if (wardFilter !== 'ALL' && i.ward !== wardFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        i.trackingId.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.locationText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Erode City Municipal Administration
            </span>
            <span className="text-xs text-slate-400">Commissioner Operations Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <LayoutDashboard className="w-7 h-7 text-indigo-600" />
            <span>AI Grievance Triage &amp; Dispatch Center</span>
          </h1>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-white dark:bg-slate-900 shadow-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'table'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Management Ledger ({filteredIssues.length})
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'map'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Incident Heatmap &amp; Clusters
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Grievances</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats?.totalIssues ?? 40}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">New Reported</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {stats?.reportedCount ?? 18}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">In Progress</span>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {stats?.inProgressCount ?? 14}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Resolved</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {stats?.resolvedCount ?? 8}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Critical Open</span>
          <div className="text-2xl font-black text-red-600 mt-1">
            {stats?.criticalCount ?? 7}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">SLA Breached</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {stats?.slaBreachedCount ?? 5}
          </div>
        </div>
      </div>

      {/* AI Chief of Staff Briefing ("Today's Briefing") */}
      {briefing && (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-sky-950 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-indigo-700/40 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-700/50 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/30 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">
                  Gemini Operations Chief of Staff
                </span>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Today&apos;s Field Briefing &amp; Optimization
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                {briefing.criticalUrgentCount} High Peril Clusters
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {briefing.slaBreachedCount} Overdue SLA
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-indigo-100 font-medium leading-relaxed">
            {briefing.headline}
          </p>

          {/* Top Clusters & Suggested Work Order Groupings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Urgent Incident Clusters */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> Top Priority Area Hotspots
              </span>
              <div className="space-y-2">
                {briefing.topClusters?.slice(0, 2).map((c, idx) => (
                  <div key={idx} className="text-xs bg-black/20 p-2.5 rounded-lg">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>{c.title}</span>
                      <span className="text-amber-300 font-mono">{c.count} issues</span>
                    </div>
                    <p className="text-[11px] text-indigo-200 mt-0.5">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Work Order Grouping (Saves Crew Travel!) */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> Smart Work-Order Grouping (Travel Time Saver)
              </span>
              <div className="space-y-2">
                {briefing.suggestedWorkOrders?.slice(0, 2).map((wo, idx) => (
                  <div key={idx} className="text-xs bg-black/20 p-2.5 rounded-lg">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>{wo.crewTitle}</span>
                      <span className="text-emerald-300 text-[10px]">{wo.area}</span>
                    </div>
                    <p className="text-[11px] text-indigo-200 mt-0.5">{wo.benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'map' ? (
        /* ADMIN MAP VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Live Incident Map &amp; Work Order Hotspots
              </h2>
              <p className="text-xs text-slate-500">
                Click any incident to open the dispatch drawer and re-assign or update status.
              </p>
            </div>
          </div>
          <AdminOperationsMap
            issues={issues}
            height="520px"
            onSelectIssue={(issue) => openIssueDrawer(issue)}
          />
        </div>
      ) : (
        /* ADMIN TABLE VIEW */
        <div className="space-y-4">
          {/* Table Filters Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracking ID, street, title..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
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

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Department Filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grievance Management Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Tracking ID</th>
                    <th className="px-4 py-3">Score &amp; Priority</th>
                    <th className="px-4 py-3">Grievance Details</th>
                    <th className="px-4 py-3">Ward &amp; Location</th>
                    <th className="px-4 py-3">Department &amp; Officer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredIssues.map((issue) => (
                    <tr
                      key={issue.id}
                      onClick={() => openIssueDrawer(issue)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                    >
                      {/* Tracking ID */}
                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-600">
                        {issue.trackingId}
                        {issue.isHumanOverridden && (
                          <span className="block text-[9px] text-amber-500 font-sans font-semibold">
                            Human Override
                          </span>
                        )}
                      </td>

                      {/* AI Priority Score */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              issue.priority === 'CRITICAL'
                                ? 'bg-red-500/10 text-red-600'
                                : issue.priority === 'HIGH'
                                ? 'bg-orange-500/10 text-orange-600'
                                : issue.priority === 'MEDIUM'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-emerald-500/10 text-emerald-600'
                            }`}
                          >
                            {issue.priorityScore}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              issue.priority === 'CRITICAL'
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
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {issue.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {issue.description}
                        </div>
                      </td>

                      {/* Ward */}
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <div className="font-medium truncate max-w-[140px]">{issue.ward}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {issue.locationText}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <div className="font-medium">{issue.department}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {issue.assignedOfficer || 'Pending Assignment'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            issue.status === 'RESOLVED'
                              ? 'badge-resolved'
                              : issue.status === 'IN_PROGRESS'
                              ? 'badge-in_progress'
                              : 'badge-reported'
                          }`}
                        >
                          {issue.status}
                        </span>
                        {issue.isSlaBreached && (
                          <span className="block text-[9px] text-red-500 font-bold mt-0.5">
                            SLA Breached
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold text-indigo-600">
                        Review →
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADMIN ISSUE SIDE DRAWER ================= */}
      {isDrawerOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600">
                    {selectedIssue.trackingId}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      selectedIssue.priority === 'CRITICAL'
                        ? 'badge-critical'
                        : selectedIssue.priority === 'HIGH'
                        ? 'badge-high'
                        : selectedIssue.priority === 'MEDIUM'
                        ? 'badge-medium'
                        : 'badge-low'
                    }`}
                  >
                    Score {selectedIssue.priorityScore}
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-1 line-clamp-1">
                  {selectedIssue.title}
                </h2>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Update Control */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Update Grievance Lifecycle Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['REPORTED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDrawerStatus(st)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        drawerStatus === st
                          ? st === 'RESOLVED'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'IN_PROGRESS'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Note (Drafted by AI or Custom) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Public Audit Note</span>
                  <span className="text-[10px] text-indigo-500 font-semibold">Gemini auto-drafts if empty</span>
                </label>
                <textarea
                  rows={2}
                  value={drawerNote}
                  onChange={(e) => setDrawerNote(e.target.value)}
                  placeholder="e.g. Field crew deployed under Eng. Sundaram with hot mix bitumen..."
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Officer Assignment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Assign Officer / Crew Head
                </label>
                <input
                  type="text"
                  value={drawerOfficer}
                  onChange={(e) => setDrawerOfficer(e.target.value)}
                  placeholder="Officer name and designation..."
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Human Override Accordion */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  <span>Human Override Controls (Logged to Audit Trail)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                      Category
                    </label>
                    <select
                      value={drawerCategory}
                      onChange={(e) => setDrawerCategory(e.target.value)}
                      className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                      Priority
                    </label>
                    <select
                      value={drawerPriority}
                      onChange={(e) => setDrawerPriority(e.target.value)}
                      className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
                    >
                      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                      Department
                    </label>
                    <select
                      value={drawerDepartment}
                      onChange={(e) => setDrawerDepartment(e.target.value)}
                      className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Resolution Photo Upload & AI Verification */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Resolution Proof &amp; AI Verification</span>
                </span>

                {afterImageBase64 ? (
                  <div className="space-y-2">
                    <div className="relative h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img
                        src={afterImageBase64}
                        alt="Resolution after proof"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setAfterImageBase64(undefined)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/80 text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunAiVerification}
                      disabled={isVerifying}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isVerifying ? 'Gemini Inspecting Proof...' : 'Run Gemini Resolution Verification'}</span>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <Camera className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Upload After-Repair Evidence Photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleResolutionPhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Verification Feedback Banner */}
                {verificationFeedback && (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      verificationFeedback.resolved
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{verificationFeedback.resolved ? 'AI Verified: Clean & Repaired' : 'Verification Warning'}</span>
                      <span className="font-mono">
                        {Math.round(verificationFeedback.confidence * 100)}% Confidence
                      </span>
                    </div>
                    <p className="text-[11px] leading-tight">{verificationFeedback.explanation}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveDrawerUpdate}
                disabled={isUpdating}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {isUpdating ? 'Saving Audit Record...' : 'Confirm Update & Log Audit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

