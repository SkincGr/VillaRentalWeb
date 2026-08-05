'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

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

  // If user is not logged in and not on login page, don't render layout content while redirecting
  if (!user) {
    return null;
  }

  const isDark = theme === 'dark';

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
