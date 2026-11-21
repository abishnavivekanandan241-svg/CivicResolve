import type { Metadata } from 'next';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import './globals.css';
import { I18nProvider, SupportedLanguage } from '@/lib/i18n';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'CivicResolve — AI-Powered Civic Grievance Platform',
  description:
    'Report civic grievances in under 30 seconds with Google Gemini multimodal intelligence, automated municipal routing, and real-time resolution verification.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialLang: SupportedLanguage = 'en';
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get('civic_lang')?.value;
    if (cookieVal && ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'ur'].includes(cookieVal)) {
      initialLang = cookieVal as SupportedLanguage;
    }
  } catch {}

  return (
    <html lang={initialLang} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors" suppressHydrationWarning>
        <I18nProvider initialLang={initialLang}>
          <Suspense fallback={<header className="h-16 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1 w-full">{children}</main>
          <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">CivicResolve</span>
                <span>• Erode City Municipal Corporation Pilot</span>
              </div>
              <div>
                <span>Powered by Google Gemini 2.5 Flash Multimodal SDK</span>
              </div>
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}

