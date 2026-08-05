'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  CalendarCheck, 
  Calendar, 
  Users, 
  BarChart3, 
  Receipt 
} from 'lucide-react';

const navItems = [
  { name: 'Κρατήσεις', href: '/', icon: CalendarCheck },
  { name: 'Ημερολόγιο', href: '/calendar', icon: Calendar },
  { name: 'Master Data', href: '/master-data', icon: Users },
  { name: 'Αναλυτικά', href: '/analytics', icon: BarChart3 },
  { name: 'Έξοδα', href: '/expenses', icon: Receipt },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-lg flex items-center justify-around py-1.5 px-1 shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
              isActive
                ? 'text-sky-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg transition-all ${
              isActive ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 scale-110' : ''
            }`}>
              <Icon className="w-4 h-4" />
            </div>
            <span>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
