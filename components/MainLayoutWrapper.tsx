'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileBottomNav from '@/components/MobileBottomNav';
import { ShieldAlert, KeyRound, ArrowRight, Building2, Sparkles, Lock } from 'lucide-react';

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, initialized, siteUnlocked, unlockSite, theme } = useAuth();

  const [sitePasscode, setSitePasscode] = useState('');
  const [sitePassError, setSitePassError] = useState('');

  const isLoginPage = pathname === '/login';

  const handleUnlockSiteSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sitePasscode.trim()) {
      setSitePassError('Παρακαλώ εισάγετε τον κωδικό ασφαλείας του ιστότοπου');
      return;
    }

    const success = unlockSite(sitePasscode);
    if (!success) {
      setSitePassError('Λανθασμένος κωδικός ασφαλείας ιστότοπου');
    } else {
      setSitePassError('');
    }
  };

  useEffect(() => {
    if (initialized && siteUnlocked && !user && !isLoginPage) {
      router.replace('/login');
    }
  }, [initialized, siteUnlocked, user, isLoginPage, router]);

  // LAYER 1 PROTECTION: SITE GATEKEEPER LOCK (STOPS ANYONE BEFORE REACHING LOGIN OR DASHBOARD)
  if (initialized && !siteUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
        {/* Glowing Background Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10 backdrop-blur-xl">
          {/* Logo & Lock Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/30">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-wide flex items-center justify-center gap-1.5 text-white">
              Villa Rental App
              <Sparkles className="w-4 h-4 text-sky-400" />
            </h1>
            <p className="text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 py-1.5 px-3 rounded-full inline-block">
              🔒 ΠΡΟΣΤΑΤΕΥΜΕΝΟΣ ΙΣΤΟΤΟΠΟΣ
            </p>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-lg font-extrabold text-white">Κλειδωμένη Πρόσβαση</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Εισάγετε τον κωδικό ασφαλείας του ιστότοπου για να συνεχίσετε στη σελίδα σύνδεσης.
            </p>
          </div>

          <form onSubmit={handleUnlockSiteSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1.5 text-slate-400">
                Κωδικός Ασφαλείας Ιστότοπου
              </label>
              <div className="relative">
                <KeyRound className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={sitePasscode}
                  onChange={(e) => { setSitePasscode(e.target.value); setSitePassError(''); }}
                  placeholder="Εισάγετε κωδικό..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-extrabold text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
                  autoFocus
                  required
                />
              </div>
            </div>

            {sitePassError && (
              <p className="text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-center">
                {sitePassError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white font-black py-3.5 rounded-2xl hover:from-sky-400 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <span>Επιβεβαίωση & Συνέχεια</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  // LAYER 2 PROTECTION: USER LOGIN REDIRECT
  if (!initialized || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-xs font-semibold text-slate-400">Απαιτείται σύνδεση χρήστη...</p>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Desktop Sidebar (visible on md and larger) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-20 md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (visible on sm and mobile) */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
