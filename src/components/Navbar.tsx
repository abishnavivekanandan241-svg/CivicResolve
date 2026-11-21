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
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { useI18n, SUPPORTED_LANGUAGES, SupportedLanguage } from '@/lib/i18n';
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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                CivicResolve
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> Gemini
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
              Erode City Corporation
            </p>
          </div>
        </Link>

        {/* Main Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/report"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${pathname === '/report'
                ? 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            <PlusCircle className="w-4 h-4 text-sky-600" />
            <span>{t('reportIssueBtn')}</span>
          </Link>

          <Link
            href="/my-issues"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${pathname === '/my-issues'
                ? 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t('myIssuesBtn')}</span>
          </Link>

          <Link
            href="/transparency"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${pathname === '/transparency'
                ? 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            <MapPin className="w-4 h-4" />
            <span>{t('transparencyMapBtn')}</span>
          </Link>

          <Link
            href="/admin"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${pathname.startsWith('/admin')
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t('adminDashboardBtn')}</span>
          </Link>
        </nav>

        {/* Right Controls: Language, Role Switcher, Dark Mode */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Indic Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              title="Change Interface Language"
            >
              <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{currentLangObj.nativeName}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  Select Language
                </div>
                {SUPPORTED_LANGUAGES.map((lang: any) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsLangOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition ${language === lang.code
                        ? 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    <span>{lang.nativeName}</span>
                    <span className="text-[10px] text-slate-400">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Role Switcher Pill */}
          <button
            onClick={handleRoleToggle}
            disabled={isRoleSwitching}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${currentUser?.role === 'ADMIN'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-sm shadow-indigo-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-sm shadow-emerald-500/20'
              }`}
            title="Toggle between Citizen and Municipal Admin persona"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>
              {isRoleSwitching
                ? 'Switching...'
                : currentUser?.role === 'ADMIN'
                  ? 'Admin Role'
                  : 'Citizen Role'}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title="Toggle Dark / Light Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
}

