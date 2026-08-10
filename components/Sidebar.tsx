'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  CalendarCheck, 
  Calendar, 
  Users, 
  BarChart3, 
  Receipt, 
  Building2, 
  Settings,
  Sparkles,
  CalendarRange
} from 'lucide-react';

const navItems = [
  { name: 'Κρατήσεις', href: '/', icon: CalendarCheck },
  { name: 'Έξοδα', href: '/expenses', icon: Receipt },
  { name: 'Ανά Έτος', href: '/yearly-summary', icon: CalendarRange },
  { name: 'Ημερολόγιο', href: '/calendar', icon: Calendar },
  { name: 'Master Data', href: '/master-data', icon: Users },
  { name: 'Αναλυτικά', href: '/analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 glass-panel flex flex-col justify-between p-5 hidden md:flex shrink-0 min-h-screen border-r border-slate-800">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wide flex items-center gap-1.5">
              Villa Rental
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            </h1>
            <p className="text-xs text-slate-400 font-medium">Management Portal</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/10 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 px-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Supabase Connected</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>
    </aside>
  );
}
