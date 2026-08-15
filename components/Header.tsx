'use client';

import { useAuth } from '@/context/AuthContext';
import { 
  Building2, 
  Sun, 
  Moon, 
  LogOut, 
  ShieldCheck, 
  UserCheck, 
  Home, 
  Menu,
  X,
  CalendarCheck,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase, House } from '@/lib/supabaseClient';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Receipt } from 'lucide-react';

// Mobile menu items restricted to primary core items (Ημερολόγιο, Κρατήσεις, Έξοδα)
const mobileNavItems = [
  { name: 'Ημερολόγιο', href: '/calendar', icon: Calendar },
  { name: 'Κρατήσεις', href: '/', icon: CalendarCheck },
  { name: 'Έξοδα', href: '/expenses', icon: Receipt },
];

export default function Header() {
  const pathname = usePathname();
  const { user, role, selectedHouseId, setSelectedHouseId, assignedHouseIds, theme, toggleTheme, logout } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchHouses();
  }, [assignedHouseIds, role]);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function fetchHouses() {
    if (assignedHouseIds.length === 0) {
      const { data } = await supabase.from('houses').select('*');
      setHouses(data || []);
    } else {
      const { data } = await supabase
        .from('houses')
        .select('*')
        .in('house_aid', assignedHouseIds);
      setHouses(data || []);
    }
  }

  const isDark = theme === 'dark';

  return (
    <>
      <header className={`h-16 shrink-0 border-b-2 px-3 sm:px-6 flex items-center justify-between z-30 transition-colors duration-300 ${
        isDark 
          ? 'bg-slate-900 border-slate-800 text-white' 
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        {/* Left: Mobile Menu Hamburger Button + House Filter / View Mode Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-xl border md:hidden transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-sky-400 hover:bg-slate-800' 
                : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
            }`}
            title="Μενού"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* House Filter Dropdown */}
          <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-200' 
              : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}>
            <Home className="w-4 h-4 text-sky-500 shrink-0" />
            <span className="hidden sm:inline">Προβολή:</span>
            <select
              value={selectedHouseId}
              onChange={(e) => setSelectedHouseId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-transparent focus:outline-none font-bold text-sky-500 cursor-pointer max-w-[140px] sm:max-w-none truncate"
            >
              <option value="ALL" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                {role === 'OWNER' ? 'Όλα τα Σπίτια' : 'Όλα τα Σπίτια'}
              </option>
              {houses.map(h => (
                <option key={h.house_aid} value={h.house_aid} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                  {h.house_name?.trim() || `Σπίτι #${h.house_aid}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Role Badge */}
          {role === 'MANAGER' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Διαχειριστής</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ιδιοκτήτης</span>
            </div>
          )}

          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'
            }`}
            title="Dark / Light Mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile Info & Logout Button */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden md:block text-right">
              <p className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {user?.name || 'Χρήστης'}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {user?.email}
              </p>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
              title="Αποσύνδεση"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE SLIDING DRAWER MENU (Option A: Primary Items Only) ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200">
          {/* Top Bar of Drawer */}
          <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base text-white tracking-wide flex items-center gap-1">
                  Villa Rental
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                </h2>
                <p className="text-[10px] text-slate-400">Mobile Menu</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Items in Drawer */}
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1">
              Βασικό Μενού
            </p>
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-base font-extrabold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500/25 to-indigo-500/15 text-sky-400 border border-sky-500/40 shadow-md shadow-sky-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Bottom Drawer Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">{user?.name} ({user?.email})</span>
              <button
                type="button"
                onClick={logout}
                className="text-rose-400 font-bold hover:underline flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Έξοδος</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
