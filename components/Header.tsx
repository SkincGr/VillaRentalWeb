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
  ChevronDown 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase, House } from '@/lib/supabaseClient';

export default function Header() {
  const { user, role, selectedHouseId, setSelectedHouseId, assignedHouseIds, theme, toggleTheme, logout } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);

  useEffect(() => {
    fetchHouses();
  }, [assignedHouseIds, role]);

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
    <header className={`h-16 border-b px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md transition-colors duration-300 ${
      isDark 
        ? 'glass-panel border-slate-800/80 bg-slate-950/70' 
        : 'bg-white/80 border-slate-200 shadow-sm'
    }`}>
      {/* Left: House Filter / View Mode Dropdown */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-slate-200' 
            : 'bg-slate-100 border-slate-200 text-slate-800'
        }`}>
          <Home className="w-4 h-4 text-sky-500" />
          <span>Προβολή:</span>
          <select
            value={selectedHouseId}
            onChange={(e) => setSelectedHouseId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="bg-transparent focus:outline-none font-bold text-sky-500 cursor-pointer"
          >
            <option value="ALL" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
              {role === 'OWNER' ? 'Συνολική (Όλα τα Σπίτια)' : 'Όλα τα Σπίτια'}
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
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        {role === 'MANAGER' ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Διαχειριστής</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ιδιοκτήτης</span>
          </div>
        )}

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border transition-all ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
              : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'
          }`}
          title="Dark / Light Mode"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Profile Info */}
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
            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            title="Αποσύνδεση"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
