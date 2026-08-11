'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Receipt, Plus, Pencil, Trash2, X, Save, Tag,
  TrendingDown, Calendar, Filter, ChevronDown, AlertCircle, Search
} from 'lucide-react';

interface ExpCategory {
  expcategory_aid: number;
  expcategory: string;
}

interface Expense {
  expenses_aid: number;
  f_expcategory_aid: number | null;
  dateis: string | null;
  expense: number;
  comments: string | null;
  expcategory?: ExpCategory | null;
}

type FormState = {
  isOpen: boolean;
  isEditing: boolean;
  expenses_aid?: number;
  f_expcategory_aid: string;
  dateis: string;
  expense: string;
  comments: string;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  const p = iso.split('T')[0].split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function getYear(iso: string | null | undefined) {
  if (!iso) return '';
  return iso.split('T')[0].split('-')[0];
}

function getMonth(iso: string | null | undefined) {
  if (!iso) return '';
  return iso.split('T')[0].split('-')[1];
}

const MONTH_NAMES = [
  'Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαϊ', 'Ιουν',
  'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'
];

export default function ExpensesPage() {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchText, setSearchText] = useState('');

  // Form modal
  const [form, setForm] = useState<FormState | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // New category modal
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/expenses', { cache: 'no-store' });
      const json = await res.json();
      setExpenses(json.expenses || []);
      setCategories(json.categories || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Derived data ─────────────────────────────────────────
  const availableYears = useMemo(() =>
    Array.from(new Set(expenses.map(e => getYear(e.dateis)).filter(Boolean))).sort().reverse(),
    [expenses]
  );

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (getYear(e.dateis) !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && getMonth(e.dateis) !== selectedMonth) return false;
      if (selectedCategory !== 'ALL' && String(e.f_expcategory_aid) !== selectedCategory) return false;
      if (searchText && !e.comments?.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    }).sort((a, b) => (b.dateis || '').localeCompare(a.dateis || ''));
  }, [expenses, selectedYear, selectedMonth, selectedCategory, searchText]);

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.expense || 0), 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => {
      const key = e.expcategory?.expcategory || 'Χωρίς κατηγορία';
      map[key] = (map[key] || 0) + Number(e.expense || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // ── CRUD handlers ─────────────────────────────────────────
  function openCreate() {
    const today = new Date().toISOString().split('T')[0];
    setForm({
      isOpen: true, isEditing: false,
      f_expcategory_aid: '', dateis: today, expense: '', comments: ''
    });
  }

  function openEdit(exp: Expense) {
    setForm({
      isOpen: true, isEditing: true,
      expenses_aid: exp.expenses_aid,
      f_expcategory_aid: exp.f_expcategory_aid ? String(exp.f_expcategory_aid) : '',
      dateis: exp.dateis ? exp.dateis.split('T')[0] : '',
      expense: String(exp.expense),
      comments: exp.comments || ''
    });
  }

  async function handleSave() {
    if (!form) return;
    if (!form.dateis || !form.expense) {
      alert('Παρακαλώ συμπληρώστε ημερομηνία και ποσό');
      return;
    }
    setActionLoading(true);
    try {
      const endpoint = form.isEditing ? '/api/expenses/update' : '/api/expenses/create';
      const payload = {
        expenses_aid: form.expenses_aid,
        f_expcategory_aid: form.f_expcategory_aid || null,
        dateis: form.dateis,
        expense: Number(form.expense),
        comments: form.comments || null
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
        setForm(null);
      } else {
        alert('Σφάλμα: ' + (json.error || ''));
      }
    } catch (err) {
      alert('Σφάλμα σύνδεσης');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id: number) {
    setActionLoading(true);
    try {
      const res = await fetch('/api/expenses/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses_aid: id })
      });
      const json = await res.json();
      if (json.success) {
        setExpenses(prev => prev.filter(e => e.expenses_aid !== id));
        setDeletingId(null);
      } else {
        alert('Σφάλμα διαγραφής: ' + (json.error || ''));
      }
    } catch {
      alert('Σφάλμα σύνδεσης');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expcategory: newCatName.trim() })
      });
      const json = await res.json();
      if (json.success && json.category) {
        setCategories(prev => [...prev, json.category].sort((a, b) => a.expcategory.localeCompare(b.expcategory)));
        setShowNewCatModal(false);
        setNewCatName('');
        if (form) setForm({ ...form, f_expcategory_aid: String(json.category.expcategory_aid) });
      } else {
        alert('Σφάλμα: ' + (json.error || ''));
      }
    } catch {
      alert('Σφάλμα σύνδεσης');
    } finally {
      setActionLoading(false);
    }
  }

  // ── UI helpers ───────────────────────────────────────────
  const inputCls = `w-full p-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:border-amber-500 transition-colors ${
    isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
  }`;

  const labelCls = `block text-xs font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`;

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full overflow-hidden space-y-4">

      {/* ── FRAME 1: TOP FIXED FRAME (HEADER & FILTERS) ── */}
      <div className={`p-5 rounded-2xl border-2 shadow-md shrink-0 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Έξοδα
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Διαχείριση & παρακολούθηση εξόδων
              </p>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 ring-2 ring-amber-400/40"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Νέο Έξοδο</span>
          </button>
        </div>

        {/* ── FILTERS ── */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          {/* Year */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
            }`}
          >
            {availableYears.length === 0 && <option value={selectedYear}>{selectedYear}</option>}
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Month */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
            }`}
          >
            <option value="ALL">Όλοι οι μήνες</option>
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
            ))}
          </select>

          {/* Category */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-600 shadow-sm'
            }`}
          >
            <option value="ALL">Όλες οι κατηγορίες</option>
            {categories.map(c => (
              <option key={c.expcategory_aid} value={String(c.expcategory_aid)}>{c.expcategory}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Αναζήτηση σχολίων..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className={`pl-8 pr-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-amber-500 w-44 ${
                isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
              }`}
            />
          </div>
        </div>

        {/* ── SUMMARY ROW ── */}
        <div className={`mt-3 pt-3 border-t text-xs font-semibold flex flex-wrap gap-3 items-center ${
          isDark ? 'border-slate-800 text-slate-400' : 'border-amber-200 text-amber-900'
        }`}>
          <span>Εγγραφές: <strong className="text-amber-400">{filtered.length}</strong></span>
          <span>|</span>
          <span>Σύνολο: <strong className="text-amber-400 text-sm">
            €{totalFiltered.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
          </strong></span>
        </div>
      </div>

      {/* ── FRAME 2: BOTTOM SCROLLABLE FRAME (EXPENSES LIST & DATA) ── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-20 min-h-0">
      {byCategory.length > 0 && (
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <p className={`text-xs font-bold mb-3 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            Ανάλυση ανά κατηγορία
          </p>
          <div className="flex flex-wrap gap-2">
            {byCategory.map(([cat, total]) => (
              <div key={cat} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <Tag className="w-3 h-3" />
                <span className="font-semibold">{cat}</span>
                <span className="font-black">€{total.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EXPENSES LIST ── */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Φόρτωση εξόδων...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border flex flex-col items-center gap-3 ${
          isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <Receipt className="w-10 h-10 opacity-30" />
          <p className="text-sm">Δεν βρέθηκαν έξοδα για τα επιλεγμένα φίλτρα.</p>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Προσθέστε το πρώτο έξοδο!</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(exp => (
            <div
              key={exp.expenses_aid}
              className={`p-4 rounded-2xl border transition-all group ${
                isDark
                  ? 'bg-slate-900/80 border-slate-800 hover:border-amber-500/30 hover:bg-slate-800/80'
                  : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Category + Date + Comments */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {exp.expcategory?.expcategory && (
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                        isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}>
                        {exp.expcategory.expcategory}
                      </span>
                    )}
                    <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Calendar className="w-3 h-3" />
                      {formatDate(exp.dateis)}
                    </span>
                  </div>
                  {exp.comments && (
                    <p className={`mt-1.5 text-sm font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {exp.comments}
                    </p>
                  )}
                </div>

                {/* Right: Amount + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-lg font-black text-amber-400">
                    €{Number(exp.expense).toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={() => openEdit(exp)}
                    className={`p-1.5 rounded-lg transition-all ${
                      isDark ? 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-400 hover:text-amber-500'
                    }`}
                    title="Επεξεργασία"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingId(exp.expenses_aid)}
                    className={`p-1.5 rounded-lg transition-all ${
                      isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-500'
                    }`}
                    title="Διαγραφή"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* ── FAB BUTTON ── */}
      <button
        onClick={openCreate}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-amber-500 hover:bg-amber-400 text-white shadow-2xl shadow-amber-500/40 flex items-center gap-2 transition-all hover:scale-110 active:scale-95 border-2 border-amber-300"
        title="Νέο Έξοδο"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
        <span className="font-black text-xs pr-1 hidden sm:inline">Νέο Έξοδο</span>
      </button>

      {/* ── FORM MODAL ── */}
      {form?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {form.isEditing ? <Pencil className="w-5 h-5 text-amber-400" /> : <Plus className="w-5 h-5 text-amber-400" />}
                <h3 className="text-lg font-bold">
                  {form.isEditing ? `Επεξεργασία Εξόδου #${form.expenses_aid}` : 'Νέο Έξοδο'}
                </h3>
              </div>
              <button onClick={() => setForm(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category + New Category button */}
              <div>
                <label className={labelCls}>Κατηγορία</label>
                <div className="flex gap-2">
                  <select
                    value={form.f_expcategory_aid}
                    onChange={e => setForm({ ...form, f_expcategory_aid: e.target.value })}
                    className={inputCls + ' flex-1'}
                  >
                    <option value="">— Χωρίς κατηγορία —</option>
                    {categories.map(c => (
                      <option key={c.expcategory_aid} value={String(c.expcategory_aid)}>
                        {c.expcategory}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCatModal(true)}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                    title="Νέα Κατηγορία"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Νέα</span>
                  </button>
                </div>
              </div>

              {/* Date + Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ημερομηνία</label>
                  <input
                    type="date"
                    value={form.dateis}
                    onChange={e => setForm({ ...form, dateis: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Ποσό (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.expense}
                    onChange={e => setForm({ ...form, expense: e.target.value })}
                    className={inputCls + ' text-amber-400 font-bold'}
                    required
                  />
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className={labelCls}>Σχόλια / Περιγραφή</label>
                <textarea
                  rows={3}
                  placeholder="Περιγραφή εξόδου..."
                  value={form.comments}
                  onChange={e => setForm({ ...form, comments: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              {form.isEditing && (
                <button
                  onClick={() => { setDeletingId(form.expenses_aid!); setForm(null); }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /><span>Διαγραφή</span>
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setForm(null)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    isDark ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Ακύρωση
                </button>
                <button
                  onClick={handleSave}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-black shadow-lg shadow-amber-500/25 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {actionLoading
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><Save className="w-4 h-4" /><span>Αποθήκευση</span></>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW CATEGORY MODAL ── */}
      {showNewCatModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Νέα Κατηγορία</h3>
              </div>
              <button onClick={() => setShowNewCatModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Όνομα κατηγορίας..."
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
              className={inputCls}
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowNewCatModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  isDark ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-300 text-slate-600'
                }`}
              >
                Ακύρωση
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={actionLoading || !newCatName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
              >
                <Plus className="w-4 h-4" /><span>Δημιουργία</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold">Διαγραφή Εξόδου</h3>
                <p className="text-xs text-slate-400 mt-0.5">Η ενέργεια δεν μπορεί να αναιρεθεί.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setDeletingId(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${
                  isDark ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-300 text-slate-600'
                }`}
              >
                Ακύρωση
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Trash2 className="w-4 h-4" /><span>Διαγραφή</span></>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
