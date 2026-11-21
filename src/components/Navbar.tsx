'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  MapPin,
  FileText,
  LayoutDashboard,
  Globe,
  UserCheck,
  Moon,
  Sun,
  PlusCircle,
  ChevronDown,
  Building,
} from 'lucide-react';
import { useI18n, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { UserSession } from '@/lib/types';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isRoleSwitching, setIsRoleSwitching] = useState(false);

  // Fetch current session
  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch((err) => console.error('Failed to load session:', err));
  }, []);

  // Sync theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') ||
      localStorage.getItem('civic_theme') === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('civic_theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('civic_theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleRoleToggle = async () => {
    setIsRoleSwitching(true);
    const newRole = currentUser?.role === 'ADMIN' ? 'CITIZEN' : 'ADMIN';
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        if (newRole === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/');
        }
        router.refresh();
      }
    } catch (err) {
      console.error('Role switch failed:', err);
    } finally {
      setIsRoleSwitching(false);
    }
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l: any) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Top Government Classification Banner */}
      <div className="bg-slate-900 text-slate-300 text-[11px] px-4 py-1 flex items-center justify-between border-b border-slate-800">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-wide">Government of Tamil Nadu</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Erode City Municipal Corporation</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-slate-400">
            <span>Public Grievance Redressal System</span>
            <span className="text-slate-600">•</span>
            <span>Citizen Charter SLA Enabled</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo - Official Municipal Style */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-md bg-blue-700 dark:bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Building className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                CivicResolve
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                Official Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Erode City Corporation
            </p>
          </div>
        </Link>

        {/* Main Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
          <Link
            href="/report"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${pathname === '/report'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            <PlusCircle className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span suppressHydrationWarning>{t('reportIssueBtn')}</span>
          </Link>

          <Link
            href="/my-issues"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${pathname === '/my-issues'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            <FileText className="w-4 h-4" />
            <span suppressHydrationWarning>{t('myIssuesBtn')}</span>
          </Link>

          <Link
            href="/transparency"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${pathname === '/transparency'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            <MapPin className="w-4 h-4" />
            <span suppressHydrationWarning>{t('transparencyMapBtn')}</span>
          </Link>

          <Link
            href="/admin"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${pathname.startsWith('/admin')
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span suppressHydrationWarning>{t('adminDashboardBtn')}</span>
          </Link>
        </nav>

        {/* Right Controls: Language, Role Switcher, Dark Mode */}
        <div className="flex items-center gap-2">
          {/* Indic Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              title="Change Interface Language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span suppressHydrationWarning>{currentLangObj.nativeName}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg py-1 z-50">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  Select Language
                </div>
                {SUPPORTED_LANGUAGES.map((lang: any) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsLangOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition ${language === lang.code
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    <span>{lang.nativeName}</span>
                    <span className="text-[10px] text-slate-400">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Role Switcher Pill - Enterprise Segmented Switch */}
          <button
            onClick={handleRoleToggle}
            disabled={isRoleSwitching}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold transition ${currentUser?.role === 'ADMIN'
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-white'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
              }`}
            title="Toggle between Citizen and Municipal Admin persona"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span suppressHydrationWarning>
              {isRoleSwitching
                ? '...'
                : currentUser?.role === 'ADMIN'
                  ? t('officialConsole')
                  : t('citizenRole')}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title="Toggle Dark / Light Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
}
