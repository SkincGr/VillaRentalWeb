'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  CalendarCheck, 
  Calendar
} from 'lucide-react';

const mobileNavItems = [
  { name: 'Κρατήσεις', href: '/', icon: CalendarCheck },
  { name: 'Ημερολόγιο', href: '/calendar', icon: Calendar }
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-lg flex items-center justify-center gap-8 py-2 px-4 shadow-2xl">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-5 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              isActive
                ? 'text-sky-400 font-extrabold bg-sky-500/10 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
