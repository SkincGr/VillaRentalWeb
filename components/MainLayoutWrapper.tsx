'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileBottomNav from '@/components/MobileBottomNav';
import { Lock } from 'lucide-react';

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, initialized, theme } = useAuth();

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (initialized && !user && !isLoginPage) {
      router.replace('/login');
    }
  }, [initialized, user, isLoginPage, router]);

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
    <div className={`flex h-screen h-[100dvh] overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Desktop Sidebar (visible on md and larger) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <Header />
        <main className="flex-1 min-h-0 overflow-hidden p-4 pb-20 md:p-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (visible on sm and mobile) */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
