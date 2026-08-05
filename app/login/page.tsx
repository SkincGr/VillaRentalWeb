'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building2, Sun, Moon, Sparkles, UserCheck, ShieldCheck, ArrowRight, Lock, Mail, KeyRound, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login, theme, toggleTheme } = useAuth();

  const [email, setEmail] = useState('skinkon@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Παρακαλώ συμπληρώστε email και κωδικό πρόσβασης');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await login(email, password);
      if (res.success) {
        window.location.href = '/';
      } else {
        setError(res.error || 'Λάθος διαπιστευτήρια πρόσβασης');
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

      {/* ── LEFT HERO PANEL ── */}
      <div className={`hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-br from-sky-900 via-indigo-950 to-slate-950 border-r border-slate-800' 
          : 'bg-gradient-to-br from-sky-600 via-indigo-600 to-slate-800 text-white'
      }`}>
        {/* Background Glow */}
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
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-sky-400/10 border border-sky-400/20 text-sky-300 mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Ασφαλής Σύνδεση & Απομόνωση Δεδομένων Ανά Ιδιοκτήτη
          </span>
          <h2 className="text-5xl font-black leading-tight tracking-tight mb-6">
            Προστατευμένη<br />
            πρόσβαση στις<br />
            κρατήσεις σας.
          </h2>
          <p className="text-sky-100/70 text-base leading-relaxed max-w-md">
            Κάθε εγγεγραμμένος ιδιοκτήτης έχει αποκλειστική πρόσβαση μόνο στα δικά του ακίνητα και οικονομικά στοιχεία.
          </p>
        </div>

        {/* Footer Info */}
        <div className="relative z-10 flex items-center gap-3 pt-6 border-t border-white/10 text-xs text-sky-200/80">
          <KeyRound className="w-4 h-4 text-sky-400" />
          <span>Ασφάλεια πρόσβασης σε επίπεδο εγγραφών (Record-Level Security)</span>
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
            <h2 className="text-3xl font-extrabold tracking-tight">Σύνδεση Ιδιοκτήτη</h2>
            <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Εισάγετε το email και τον κωδικό πρόσβασής σας
            </p>
          </div>

          {/* Account Presets Notice */}
          <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
            isDark ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}>
            <div className="font-bold flex items-center gap-2 text-sm text-indigo-400">
              <UserCheck className="w-4 h-4" />
              <span>Εγγεγραμμένος Λογαριασμός Ιδιοκτήτη:</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <p>👤 <strong>Ιδιοκτήτης:</strong> skinkon@gmail.com</p>
              <p>🔑 <strong>Κωδικός:</strong> owner2026password</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold uppercase mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-700'
              }`}>
                Email Ιδιοκτήτη
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="skinkon@gmail.com"
                  className={`w-full border rounded-xl pl-10 pr-4 py-3 text-sm transition-all focus:outline-none focus:border-sky-500 font-medium ${
                    isDark 
                      ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
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
                  placeholder="Εισάγετε κωδικό..."
                  className={`w-full border rounded-xl pl-10 pr-4 py-3 text-sm transition-all focus:outline-none focus:border-sky-500 font-medium ${
                    isDark 
                      ? 'bg-slate-900/80 border-slate-800 text-white placeholder-slate-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black py-3.5 rounded-xl hover:from-sky-400 hover:to-indigo-500 transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
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

          {/* Quick Auto Fill Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setEmail('skinkon@gmail.com');
                setPassword('owner2026password');
                setError('');
              }}
              className="w-full p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-bold transition-all text-center cursor-pointer"
            >
              ⚡ Αυτόματη Συμπλήρωση Διαπιστευτηρίων Ιδιοκτήτη
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
