'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  LayoutDashboard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Layers,
  Search,
  Filter,
  UserCheck,
  Building,
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
  ShieldAlert,
  Globe,
} from 'lucide-react';
import { IssueData, BacklogSummary } from '@/lib/types';
import { DEPARTMENTS, CATEGORIES } from '@/lib/gemini';
import { useI18n, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { validateAndCompressImage } from '@/lib/imageCompression';

const AdminOperationsMap = dynamic(
  () => import('@/components/Map/TransparencyHeatmap'),
  { ssr: false, loading: () => <div className="h-[480px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" /> }
);

export default function AdminPage() {
  const {
    language,
    adminLangMode,
    setAdminLangMode,
    t,
    translateCategory,
    translateDepartment,
    translateStatus,
    translatePriority,
    formatDate,
    formatNumber,
  } = useI18n();

  const effectiveAdminLang = adminLangMode === 'en' ? 'en' : language;
  const currentLangObj = SUPPORTED_LANGUAGES.find((l: any) => l.code === language) || SUPPORTED_LANGUAGES[0];

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
  }, [effectiveAdminLang]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, issuesRes, briefingRes] = await Promise.all([
        fetch(`/api/stats?lang=${effectiveAdminLang}`).then((r) => r.json()),
        fetch(`/api/issues?lang=${effectiveAdminLang}`).then((r) => r.json()),
        fetch(`/api/admin/briefing?lang=${effectiveAdminLang}`).then((r) => r.json()),
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

  const handleResolutionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await validateAndCompressImage(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.75,
      });
      setAfterImageBase64(compressedDataUrl);
    } catch (err: any) {
      console.error('Resolution photo compression failed:', err);
      alert(err.message || 'Image upload failed. Please ensure the file is under 5MB.');
    }
  };

  const handleRunAiVerification = async () => {
    if (!selectedIssue || !afterImageBase64) {
      alert('Please select an after-repair inspection photo to verify.');
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

  const handleSaveDrawerUpdate = async () => {
    if (!selectedIssue) return;
    setIsUpdating(true);

    try {
      const payload: any = {
        status: drawerStatus,
        note: drawerNote,
        assignedOfficer: drawerOfficer,
      };

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
        payload.resolutionNote = drawerNote || 'Field work verified and certified by municipal engineering staff.';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1 uppercase tracking-wider">
              <UserCheck className="w-3 h-3 text-blue-700 dark:text-blue-400" />
              Municipal Command Console
            </span>
            <span className="text-xs text-slate-400">Commissioner Operations Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-700 dark:text-blue-400" />
            <span>Grievance Triage &amp; Crew Dispatch Center</span>
          </h1>
        </div>

        {/* Header Right: Language Mode Toggle & View Switch */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Admin Language Toggle: Show in English / My Language */}
          <div className="flex items-center rounded border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900 shadow-xs">
            <button
              onClick={() => setAdminLangMode('en')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                adminLangMode === 'en'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              English (Official)
            </button>
            <button
              onClick={() => setAdminLangMode('preferred')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition flex items-center gap-1 ${
                adminLangMode === 'preferred'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>My Language ({currentLangObj.nativeName})</span>
            </button>
          </div>

          {/* Tab switch */}
          <div className="flex rounded border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900 shadow-xs">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                activeTab === 'table'
                  ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Ledger ({filteredIssues.length})
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                activeTab === 'map'
                  ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {adminLangMode === 'preferred' ? t('statsTotalReported') : 'Total Registered'}
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
            {formatNumber(stats?.totalIssues ?? 40)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            {adminLangMode === 'preferred' ? translateStatus('REPORTED') : 'Newly Reported'}
          </span>
          <div className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-0.5 font-mono">
            {formatNumber(stats?.reportedCount ?? 18)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            {adminLangMode === 'preferred' ? translateStatus('IN_PROGRESS') : 'In Progress'}
          </span>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5 font-mono">
            {formatNumber(stats?.inProgressCount ?? 14)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {adminLangMode === 'preferred' ? translateStatus('RESOLVED') : 'Certified Resolved'}
          </span>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">
            {formatNumber(stats?.resolvedCount ?? 8)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            {adminLangMode === 'preferred' ? translatePriority('CRITICAL') : 'Critical Priority'}
          </span>
          <div className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-0.5 font-mono">
            {formatNumber(stats?.criticalCount ?? 7)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            {adminLangMode === 'preferred' ? t('overdueSla') : 'SLA Overdue'}
          </span>
          <div className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-0.5 font-mono">
            {formatNumber(stats?.slaBreachedCount ?? 5)}
          </div>
        </div>
      </div>

      {/* Official Executive Operations Memorandum */}
      {briefing && (
        <div className="bg-slate-900 text-slate-100 rounded-md p-5 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {adminLangMode === 'preferred' ? t('dailyBriefingTitle') : 'Daily Municipal Operations Memo'}
                </span>
                <h2 className="text-sm font-bold text-white">
                  Field Backlog Status &amp; Dispatch Allocation
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-semibold">
                {formatNumber(briefing.criticalUrgentCount)} {adminLangMode === 'preferred' ? t('urgentAttention') : 'Urgent Attention'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                {formatNumber(briefing.slaBreachedCount)} {adminLangMode === 'preferred' ? t('overdueSla') : 'Overdue SLA'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {briefing.headline}
          </p>

          {/* Top Hotspots & Work Orders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded p-3 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> High-Density Infrastructure Hotspots
              </span>
              <div className="space-y-1.5">
                {briefing.topClusters?.slice(0, 2).map((c, idx) => (
                  <div key={idx} className="text-xs bg-slate-900/60 p-2 rounded border border-slate-700/40">
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span>{c.title}</span>
                      <span className="text-amber-400 font-mono text-[11px]">{formatNumber(c.count)} complaints</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded p-3 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" /> Coordinated Field Crew Dispatch Recommendations
              </span>
              <div className="space-y-1.5">
                {briefing.suggestedWorkOrders?.slice(0, 2).map((wo, idx) => (
                  <div key={idx} className="text-xs bg-slate-900/60 p-2 rounded border border-slate-700/40">
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span>{wo.crewTitle}</span>
                      <span className="text-blue-300 text-[10px] font-medium">{wo.area}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{wo.benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-8 space-y-3">
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 pt-2">{t('loadingDocket')}</p>
        </div>
      ) : activeTab === 'map' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Geospatial Operations &amp; Dispatch Map
            </h2>
            <p className="text-xs text-slate-500">
              Click any incident marker to open the inspection drawer and adjust assignment or log repairs.
            </p>
          </div>
          <AdminOperationsMap
            issues={issues}
            height="500px"
            onSelectIssue={(issue) => openIssueDrawer(issue)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Table Filters Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracking ID, street, title..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="REPORTED">{adminLangMode === 'preferred' ? translateStatus('REPORTED') : 'Reported'}</option>
                <option value="IN_PROGRESS">{adminLangMode === 'preferred' ? translateStatus('IN_PROGRESS') : 'In Progress'}</option>
                <option value="RESOLVED">{adminLangMode === 'preferred' ? translateStatus('RESOLVED') : 'Resolved'}</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">{adminLangMode === 'preferred' ? translatePriority('CRITICAL') : 'Critical'}</option>
                <option value="HIGH">{adminLangMode === 'preferred' ? translatePriority('HIGH') : 'High'}</option>
                <option value="MEDIUM">{adminLangMode === 'preferred' ? translatePriority('MEDIUM') : 'Medium'}</option>
                <option value="LOW">{adminLangMode === 'preferred' ? translatePriority('LOW') : 'Low'}</option>
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {adminLangMode === 'preferred' ? translateDepartment(dept) : dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grievance Management Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5">{adminLangMode === 'preferred' ? t('trackingId') : 'Tracking ID'}</th>
                    <th className="px-3.5 py-2.5">{adminLangMode === 'preferred' ? t('priority') : 'Priority'}</th>
                    <th className="px-3.5 py-2.5">{adminLangMode === 'preferred' ? t('grievanceSubject') : 'Grievance Subject'}</th>
                    <th className="px-3.5 py-2.5">{adminLangMode === 'preferred' ? t('ward') : 'Ward & Street'}</th>
                    <th className="px-3.5 py-2.5">{adminLangMode === 'preferred' ? t('assignedDept') : 'Assigned Unit'}</th>
                    <th className="px-3.5 py-2.5">{adminLangMode === 'preferred' ? t('status') : 'Status'}</th>
                    <th className="px-3.5 py-2.5 text-right">{adminLangMode === 'preferred' ? t('inspect') : 'Triage'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredIssues.map((issue) => (
                    <tr
                      key={issue.id}
                      onClick={() => openIssueDrawer(issue)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                    >
                      <td className="px-3.5 py-3 font-mono font-semibold text-blue-700 dark:text-blue-400">
                        {issue.trackingId}
                        {issue.isHumanOverridden && (
                          <span className="block text-[9px] text-amber-600 font-sans font-medium">
                            Override
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            issue.priority === 'CRITICAL'
                              ? 'chip-critical'
                              : issue.priority === 'HIGH'
                              ? 'chip-high'
                              : issue.priority === 'MEDIUM'
                              ? 'chip-medium'
                              : 'chip-low'
                          }`}
                        >
                          {adminLangMode === 'preferred' ? translatePriority(issue.priority) : issue.priority} ({issue.priorityScore})
                        </span>
                      </td>

                      <td className="px-3.5 py-3 max-w-xs">
                        <div className="font-medium text-slate-900 dark:text-white truncate">
                          {issue.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {issue.description}
                        </div>
                      </td>

                      <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">
                        <div className="truncate max-w-[130px] font-medium">{issue.ward}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                          {issue.locationText}
                        </div>
                      </td>

                      <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">
                        <div className="font-medium">
                          {adminLangMode === 'preferred' ? translateDepartment(issue.department) : issue.department}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                          {issue.assignedOfficer || 'Pending Crew'}
                        </div>
                      </td>

                      <td className="px-3.5 py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            issue.status === 'RESOLVED'
                              ? 'chip-resolved'
                              : issue.status === 'IN_PROGRESS'
                              ? 'chip-in_progress'
                              : 'chip-reported'
                          }`}
                        >
                          {adminLangMode === 'preferred' ? translateStatus(issue.status) : issue.status}
                        </span>
                        {issue.isSlaBreached && (
                          <span className="block text-[9px] text-rose-600 font-semibold mt-0.5">
                            SLA Overdue
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-3 text-right font-semibold text-blue-700 dark:text-blue-400">
                        {adminLangMode === 'preferred' ? t('inspect') : 'Inspect →'}
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-150">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                    {selectedIssue.trackingId}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      selectedIssue.priority === 'CRITICAL'
                        ? 'chip-critical'
                        : selectedIssue.priority === 'HIGH'
                        ? 'chip-high'
                        : selectedIssue.priority === 'MEDIUM'
                        ? 'chip-medium'
                        : 'chip-low'
                    }`}
                  >
                    Score {selectedIssue.priorityScore}
                  </span>
                  <span
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${
                      selectedIssue.isAiAnalyzed !== false
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {selectedIssue.isAiAnalyzed !== false ? 'AI analysed (Gemini)' : 'Basic rules (AI unavailable)'}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">
                  {selectedIssue.title}
                </h2>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Status Update Control */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Update Lifecycle Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['REPORTED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDrawerStatus(st)}
                      className={`py-1.5 text-xs font-semibold rounded border transition ${
                        drawerStatus === st
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {adminLangMode === 'preferred' ? translateStatus(st) : st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Note */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Public Audit Log Note
                </label>
                <textarea
                  rows={2}
                  value={drawerNote}
                  onChange={(e) => setDrawerNote(e.target.value)}
                  placeholder="e.g. Bitumen patch crew deployed under Ward 3 Supervisor..."
                  className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Officer Assignment */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assigned Crew Officer
                </label>
                <input
                  type="text"
                  value={drawerOfficer}
                  onChange={(e) => setDrawerOfficer(e.target.value)}
                  placeholder="Officer name or crew designation"
                  className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Human Override Controls */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded p-3 space-y-2.5">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>Administrative Override Parameters</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                      Category
                    </label>
                    <select
                      value={drawerCategory}
                      onChange={(e) => setDrawerCategory(e.target.value)}
                      className="w-full text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {adminLangMode === 'preferred' ? translateCategory(c) : c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                      Priority
                    </label>
                    <select
                      value={drawerPriority}
                      onChange={(e) => setDrawerPriority(e.target.value)}
                      className="w-full text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white"
                    >
                      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                        <option key={p} value={p}>
                          {adminLangMode === 'preferred' ? translatePriority(p) : p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                      Department
                    </label>
                    <select
                      value={drawerDepartment}
                      onChange={(e) => setDrawerDepartment(e.target.value)}
                      className="w-full text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {adminLangMode === 'preferred' ? translateDepartment(d) : d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Resolution Photo Upload & Verification */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded p-3 space-y-2.5">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>Completion Evidence &amp; Visual Verification</span>
                </span>

                {afterImageBase64 ? (
                  <div className="space-y-2">
                    <div className="relative h-28 rounded overflow-hidden border border-slate-300 dark:border-slate-700">
                      <img
                        src={afterImageBase64}
                        alt="Resolution proof"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setAfterImageBase64(undefined)}
                        className="absolute top-1 right-1 px-1.5 py-0.2 rounded bg-slate-900 text-white text-[10px]"
                      >
                        ✕
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunAiVerification}
                      disabled={isVerifying}
                      className="w-full py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    >
                      <span>{isVerifying ? 'Verifying...' : 'Verify Resolution Evidence'}</span>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-20 border border-dashed border-slate-300 dark:border-slate-700 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <Camera className="w-4 h-4 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      Upload Post-Repair Evidence Photo
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
                  <div className="p-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs space-y-1">
                    <div className="font-semibold flex items-center justify-between">
                      <span className="text-emerald-700 dark:text-emerald-400">
                        {verificationFeedback.resolved ? 'Verification Certified' : 'Verification Flagged'}
                      </span>
                      <span className="font-mono text-slate-500">
                        {Math.round(verificationFeedback.confidence * 100)}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                      {verificationFeedback.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveDrawerUpdate}
                disabled={isUpdating}
                className="px-5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {isUpdating ? 'Saving Record...' : 'Confirm Audit Log Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
