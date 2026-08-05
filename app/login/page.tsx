'use client';

import { useState } from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Building2, Sun, Moon, Sparkles, UserCheck, ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const { login, theme, toggleTheme } = useAuth();

  const [role, setRole] = useState<UserRole>('MANAGER');
  const [email, setEmail] = useState('alex@gmail.com');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'MANAGER') {
      setEmail('alex@gmail.com');
    } else {
      setEmail('skinkon@gmail.com');
    }
  };

  const handleQuickLogin = async (roleToUse: UserRole, emailToUse: string) => {
    setLoading(true);
    setError('');
    try {
      await login(emailToUse, roleToUse);
      window.location.href = '/';
    } catch (err) {
      setError('Σφάλμα σύνδεσης');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Παρακαλώ συμπληρώστε email/username και κωδικό');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await login(email, role);
      if (success) {
        window.location.href = '/';
      } else {
        setError('Λάθος διαπιστευτήρια πρόσβασης');
      }
    } catch (err) {
      setError('Σφάλμα σύνδεσης. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex relative transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Right Theme Toggle */}
      <div className="absolute top-5 right-5 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-semibold ${
            isDark 
              ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
          }`}
          title="Εναλλαγή Dark / Light Mode"
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* ── LEFT HERO PANEL (Desktop Fortio Style) ── */}
      <div className={`hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-br from-sky-900 via-indigo-950 to-slate-950 border-r border-slate-800' 
          : 'bg-gradient-to-br from-sky-600 via-indigo-600 to-slate-800 text-white'
      }`}>
        {/* Decorative Background Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide flex items-center gap-1.5 text-white">
              Villa Rental App
              <Sparkles className="w-4 h-4 text-sky-400" />
            </h1>
            <p className="text-xs text-sky-200/80 font-medium">Management Portal</p>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 my-auto py-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-400/10 border border-sky-400/20 text-sky-300 mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Πλατφόρμα Διαχείρισης Ακινήτων
          </span>
          <h2 className="text-5xl font-black leading-tight tracking-tight mb-6">
            Ολοκληρωμένη<br />
            διαχείριση κρατήσεων<br />
            & ιδιοκτησιών.
          </h2>
          <p className="text-sky-100/70 text-base leading-relaxed max-w-md">
            Πρόσβαση σε πραγματικό χρόνο για διαχειριστές και ιδιοκτήτες με προσαρμοσμένα δικαιώματα και αναλυτικές αναφορές.
          </p>
        </div>

        {/* Footer Badges */}
        <div className="relative z-10 flex items-center gap-4 pt-6 border-t border-white/10">
          <div className="flex -space-x-2">
            {['VT', 'SK', 'AL', 'VR'].map((tag, i) => (
              <div key={i} className="w-9 h-9 rounded-full bg-sky-500/20 border-2 border-indigo-900 flex items-center justify-center text-xs font-bold text-sky-300">
                {tag}
              </div>
            ))}
          </div>
          <p className="text-xs text-sky-100/80 font-medium">
            Υποστήριξη Villa Thalia & Πολλαπλών Ακινήτων
          </p>
        </div>
      </div>

      {/* ── RIGHT LOGIN FORM PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo Header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Villa Rental</h2>
              <p className="text-xs text-slate-500">Management Portal</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Σύνδεση στην Πλατφόρμα</h2>
            <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Επιλέξτε το ρόλο σας και εισάγετε τα στοιχεία σύνδεσης
            </p>
          </div>

          {/* Role Selection Tabs */}
          <div className={`p-1 rounded-2xl border flex gap-1 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-200/80 border-slate-300'
          }`}>
            <button
              type="button"
              onClick={() => handleRoleChange('MANAGER')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                role === 'MANAGER'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Διαχειριστής (Manager)</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('OWNER')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                role === 'OWNER'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Ιδιοκτήτης (Owner)</span>
            </button>
          </div>

          {/* Role Info Notice */}
          <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
            role === 'MANAGER'
              ? isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-800'
              : isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}>
            {role === 'MANAGER' ? (
              <p>📌 <strong>Διαχειριστής:</strong> Πρόσβαση στα σπίτια που σας έχουν ανατεθεί μέσω του πίνακα ManagerToHouse.</p>
            ) : (
              <p>🏡 <strong>Ιδιοκτήτης:</strong> Πρόσβαση αποκλειστικά στα δικά σας ακίνητα (Συνολική & Ανά Σπίτι προβολή).</p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold uppercase mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-700'
              }`}>
                Email / Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="name@example.com"
                  className={`w-full border rounded-xl pl-10 pr-4 py-3 text-sm transition-all focus:outline-none focus:border-sky-500 ${
                    isDark 
                      ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-700'
              }`}>
                Κωδικός Πρόσβασης
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className={`w-full border rounded-xl pl-10 pr-4 py-3 text-sm transition-all focus:outline-none focus:border-sky-500 ${
                    isDark 
                      ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:from-sky-400 hover:to-indigo-500 transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Είσοδος στην Εφαρμογή</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Accounts */}
          <div className="pt-4 border-t border-slate-800/60 space-y-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
              Γρήγορη Δοκιμή (Demo Presets)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('MANAGER', 'alex@gmail.com')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  role === 'MANAGER' 
                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' 
                    : isDark ? 'border-slate-800 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <div className="font-bold">Alex (Manager)</div>
                <div className="text-[10px] opacity-70">alex@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('OWNER', 'skinkon@gmail.com')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  role === 'OWNER' 
                    ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' 
                    : isDark ? 'border-slate-800 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <div className="font-bold">Κ. Σκινδήλιας</div>
                <div className="text-[10px] opacity-70">skinkon@gmail.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
