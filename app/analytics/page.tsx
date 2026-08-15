'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { supabase, Reservation, Platform, House } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3, TrendingUp, DollarSign, Percent, PieChart as PieIcon,
  Calendar, Building2, Receipt, ShieldCheck, ArrowUpRight,
  TrendingDown, Layers, CheckCircle2, Wallet, Trees
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';

interface TaxKlimakaItem {
  tax_klimaka_items_aid: number;
  f_tax_klimaka_aid: number;
  from_amount: number;
  to_amount: number;
  pososto: number;
}

interface Expense {
  expenses_aid: number;
  dateis: string | null;
  expense: number;
}

const PALETTE = [
  '#38bdf8', '#818cf8', '#34d399', '#fb923c', '#f472b6',
  '#a78bfa', '#facc15', '#2dd4bf', '#f87171', '#60a5fa',
  '#c084fc', '#4ade80'
];

const MONTH_NAMES = [
  'Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαϊ', 'Ιουν',
  'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'
];

function isPlatformTaxable(platform: Platform | null | undefined): boolean {
  if (!platform) return false;
  const val = platform.tax_able as unknown;
  return val === true || val === 1 || val === '1' || val === 'true' || val === 't';
}

function diffDays(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.max(0, Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24)));
}

function fmt(n: number) {
  return n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calculateProgressiveTax(taxableGrossFee: number, items: TaxKlimakaItem[]): number {
  if (taxableGrossFee <= 0) return 0;
  const brackets = items.length > 0
    ? items.filter(i => i.f_tax_klimaka_aid === 1).sort((a, b) => a.from_amount - b.from_amount)
    : [
        { tax_klimaka_items_aid: 1, f_tax_klimaka_aid: 1, from_amount: 0, to_amount: 12000, pososto: 15 },
        { tax_klimaka_items_aid: 2, f_tax_klimaka_aid: 1, from_amount: 12000, to_amount: 25000, pososto: 35 },
        { tax_klimaka_items_aid: 3, f_tax_klimaka_aid: 1, from_amount: 25000, to_amount: 1000000, pososto: 45 },
      ];

  let totalTax = 0;
  for (const b of brackets) {
    if (taxableGrossFee > b.from_amount) {
      const taxableInBracket = Math.min(taxableGrossFee, b.to_amount) - b.from_amount;
      totalTax += taxableInBracket * (b.pososto / 100);
    }
  }
  return totalTax;
}

export default function AnalyticsPage() {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [taxItems, setTaxItems] = useState<TaxKlimakaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedHouse, setSelectedHouse] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [resRes, expRes, houseRes, taxRes] = await Promise.all([
        supabase.from('reservations').select('*, platforms(*), customers(*), houses(*)'),
        supabase.from('expenses').select('*'),
        supabase.from('houses').select('*'),
        supabase.from('tax_klimaka_items').select('*'),
      ]);

      if (resRes.data) setReservations(resRes.data);
      if (expRes.data) setExpenses(expRes.data);
      if (houseRes.data) setHouses(houseRes.data);
      if (taxRes.data) setTaxItems(taxRes.data);
    } catch (e) {
      console.error('Error fetching analytics data:', e);
    } finally {
      setLoading(false);
    }
  }

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    reservations.forEach(r => {
      if (r.start_date) {
        const y = new Date(r.start_date).getFullYear().toString();
        if (y && !isNaN(Number(y))) years.add(y);
      }
    });
    expenses.forEach(e => {
      if (e.dateis) {
        const y = e.dateis.split('T')[0].split('-')[0];
        if (y && !isNaN(Number(y))) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [reservations, expenses]);

  // Filtered reservations & expenses
  const filteredData = useMemo(() => {
    const resList = reservations.filter(r => {
      if (r.canceled) return false;
      if (selectedYear !== 'all') {
        const y = new Date(r.start_date).getFullYear().toString();
        if (y !== selectedYear) return false;
      }
      if (selectedHouse !== 'all') {
        if (String(r.f_house_aid) !== selectedHouse) return false;
      }
      return true;
    });

    const expList = expenses.filter(e => {
      if (!e.dateis) return false;
      if (selectedYear !== 'all') {
        const y = e.dateis.split('T')[0].split('-')[0];
        if (y !== selectedYear) return false;
      }
      return true;
    });

    return { resList, expList };
  }, [reservations, expenses, selectedYear, selectedHouse]);

  // Comprehensive Financial Metrics
  const financials = useMemo(() => {
    const { resList, expList } = filteredData;

    let activeCount = 0;
    let totalGrossRevenue = 0;
    let taxableGrossRevenue = 0;
    let nonTaxableGrossRevenue = 0;
    let totalDays = 0;
    let taxableDays = 0;
    let totalPlatComm = 0;
    let totalMgrComm = 0;

    resList.forEach(r => {
      activeCount++;
      const fee = Number(r.fee || 0);
      const platRate = Number(r.platforms?.plat_commission || 0);
      const mgrRate = Number(r.platforms?.commission || 0);
      const isTaxable = isPlatformTaxable(r.platforms);
      const days = diffDays(r.start_date, r.end_date);

      totalGrossRevenue += fee;
      totalDays += days;

      if (isTaxable) {
        taxableGrossRevenue += fee;
        taxableDays += days;
      } else {
        nonTaxableGrossRevenue += fee;
      }

      const platComm = fee * platRate;
      const remaining = fee - platComm;
      const mgrComm = remaining * mgrRate;

      totalPlatComm += platComm;
      totalMgrComm += mgrComm;
    });

    const envFee = taxableDays * 15;
    const totalCommissions = totalPlatComm + totalMgrComm + envFee;
    const netBeforeTaxExp = totalGrossRevenue - totalCommissions;

    const totalExpenses = expList.reduce((sum, e) => sum + Number(e.expense || 0), 0);
    const tax = calculateProgressiveTax(taxableGrossRevenue, taxItems);
    const netCleanProfit = netBeforeTaxExp - totalExpenses - tax;

    const adr = totalDays > 0 ? totalGrossRevenue / totalDays : 0;
    const avgStay = activeCount > 0 ? totalDays / activeCount : 0;

    return {
      activeCount,
      totalGrossRevenue,
      taxableGrossRevenue,
      nonTaxableGrossRevenue,
      totalDays,
      taxableDays,
      totalPlatComm,
      totalMgrComm,
      envFee,
      totalCommissions,
      netBeforeTaxExp,
      totalExpenses,
      tax,
      netCleanProfit,
      adr,
      avgStay
    };
  }, [filteredData, taxItems]);

  // Platform Breakdown
  const platformStats = useMemo(() => {
    const map = new Map<string, { count: number; gross: number; days: number; net: number }>();

    filteredData.resList.forEach(r => {
      const platName = r.platforms?.name || 'Άγνωστη';
      const fee = Number(r.fee || 0);
      const platRate = Number(r.platforms?.plat_commission || 0);
      const mgrRate = Number(r.platforms?.commission || 0);
      const days = diffDays(r.start_date, r.end_date);

      const platComm = fee * platRate;
      const mgrComm = (fee - platComm) * mgrRate;
      const net = fee - platComm - mgrComm;

      const curr = map.get(platName) || { count: 0, gross: 0, days: 0, net: 0 };
      map.set(platName, {
        count: curr.count + 1,
        gross: curr.gross + fee,
        days: curr.days + days,
        net: curr.net + net
      });
    });

    return Array.from(map.entries()).map(([name, s]) => ({
      name,
      count: s.count,
      gross: s.gross,
      days: s.days,
      net: s.net,
      percent: financials.totalGrossRevenue > 0 ? (s.gross / financials.totalGrossRevenue) * 100 : 0
    })).sort((a, b) => b.gross - a.gross);
  }, [filteredData.resList, financials.totalGrossRevenue]);

  // Monthly breakdown for Chart
  const monthlyChartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: MONTH_NAMES[i],
      monthNum: i + 1,
      revenue: 0,
      expenses: 0,
      profit: 0,
      days: 0
    }));

    filteredData.resList.forEach(r => {
      const m = new Date(r.start_date).getMonth();
      const fee = Number(r.fee || 0);
      const days = diffDays(r.start_date, r.end_date);
      if (m >= 0 && m < 12) {
        months[m].revenue += fee;
        months[m].days += days;
      }
    });

    filteredData.expList.forEach(e => {
      if (e.dateis) {
        const parts = e.dateis.split('T')[0].split('-');
        const m = parseInt(parts[1], 10) - 1;
        if (m >= 0 && m < 12) {
          months[m].expenses += Number(e.expense || 0);
        }
      }
    });

    months.forEach(m => {
      m.profit = m.revenue - m.expenses;
    });

    return months;
  }, [filteredData]);

  return (
    <div className={`h-full flex flex-col max-w-7xl mx-auto w-full space-y-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* ── FRAME 1: TOP FIXED FRAME (TITLE, CONTROLS & KPI CARDS) ── */}
      <div className="p-4 rounded-2xl border-2 border-slate-800 bg-slate-900 text-white space-y-4 shadow-md shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide">Αναλυτικά Οικονομικά & KPI</h1>
              <p className="text-xs text-slate-400">Πλήρης ανάλυση εσόδων, προμηθειών, εξόδων και καθαρής κερδοφορίας</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Επιλογή Έτους"
                className="bg-transparent text-slate-200 outline-none cursor-pointer pr-2 font-bold"
              >
                <option value="all" className="bg-slate-900 text-white">Όλα τα Έτη</option>
                {availableYears.map(y => (
                  <option key={y} value={y} className="bg-slate-900 text-white">{y}</option>
                ))}
              </select>
            </div>

            {/* House Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 text-violet-400" />
              <select
                value={selectedHouse}
                onChange={(e) => setSelectedHouse(e.target.value)}
                aria-label="Επιλογή Σπιτιού"
                className="bg-transparent text-slate-200 outline-none cursor-pointer pr-2 font-bold"
              >
                <option value="all" className="bg-slate-900 text-white">Όλα τα Σπίτια</option>
                {houses.map(h => (
                  <option key={h.house_aid} value={String(h.house_aid)} className="bg-slate-900 text-white">
                    {h.house_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Gross Revenue */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Έσοδα</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-emerald-400 mt-1">€{fmt(financials.totalGrossRevenue)}</div>
            <div className="text-[10px] text-slate-400">{financials.activeCount} κρατήσεις · {financials.totalDays}ημ</div>
          </div>

          {/* Commissions */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Commissions</span>
              <Percent className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-lg font-black text-purple-400 mt-1">€{fmt(financials.totalCommissions)}</div>
            <div className="text-[10px] text-slate-400">Πλατφ. + Mgr + Τέλος</div>
          </div>

          {/* Expenses */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Έξοδα</span>
              <Receipt className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="text-lg font-black text-orange-400 mt-1">€{fmt(financials.totalExpenses)}</div>
            <div className="text-[10px] text-slate-400">Λειτουργικά έξοδα</div>
          </div>

          {/* Tax */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Φόρος</span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-black text-amber-400 mt-1">€{fmt(financials.tax)}</div>
            <div className="text-[10px] text-slate-400">Προοδευτική κλίμακα</div>
          </div>

          {/* Clean Profit */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 col-span-2 sm:col-span-1 lg:col-span-2 bg-gradient-to-r from-sky-950/40 to-indigo-950/40">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Καθαρό Εισόδημα</span>
              <Wallet className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className={`text-xl font-black mt-1 ${financials.netCleanProfit >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
              €{fmt(financials.netCleanProfit)}
            </div>
            <div className="text-[10px] text-slate-400">
              ADR: €{fmt(financials.adr)}/ημ · Μέση Διαμονή: {financials.avgStay.toFixed(1)}ημ
            </div>
          </div>
        </div>
      </div>

      {/* ── FRAME 2: BOTTOM SCROLLABLE FRAME (CHARTS & DETAILED ANALYSIS) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5 pb-20">
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm">Φόρτωση αναλυτικών δεδομένων...</p>
          </div>
        ) : (
          <>
            {/* Section 1: Monthly Financial Trajectory */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Μηνιαία Οικονομική Εξέλιξη (Έσοδα vs Έξοδα vs Καθαρό)</span>
                  </h2>
                  <p className="text-xs text-slate-400">Σύγκριση ακαθάριστων εσόδων και λειτουργικών εξόδων ανά μήνα</p>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `€${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(val: any) => [`€${fmt(Number(val))}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar dataKey="revenue" name="Έσοδα" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Έξοδα" fill="#fb923c" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Διαφορά" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Section 2: Platform Distribution & Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Pie Chart */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-sky-400" />
                  <span>Μερίδιο Εσόδων ανά Πλατφόρμα</span>
                </h2>

                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformStats}
                        dataKey="gross"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {platformStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                        formatter={(val: any) => [`€${fmt(Number(val))}`, 'Έσοδα']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs pr-1">
                  {platformStats.map((p, idx) => (
                    <div key={p.name} className="flex items-center justify-between text-slate-300 py-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}></span>
                        <span>{p.name}</span>
                      </div>
                      <span className="font-bold text-white">{p.percent.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Performance Table */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 lg:col-span-2 space-y-3 flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <span>Απόδοση Πλατφορμών & Καθαρή Είσπραξη</span>
                  </h2>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2 font-bold">Πλατφόρμα</th>
                          <th className="pb-2 font-bold text-center">Κρατήσεις</th>
                          <th className="pb-2 font-bold text-center">Ημέρες</th>
                          <th className="pb-2 font-bold text-right">Ακαθάριστα</th>
                          <th className="pb-2 font-bold text-right">Καθαρά (προ φόρου)</th>
                          <th className="pb-2 font-bold text-right">Μερίδιο</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {platformStats.map(p => (
                          <tr key={p.name} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 font-bold text-white">{p.name}</td>
                            <td className="py-2.5 text-center text-slate-300">{p.count}</td>
                            <td className="py-2.5 text-center text-slate-300">{p.days}</td>
                            <td className="py-2.5 text-right font-semibold text-emerald-400">€{fmt(p.gross)}</td>
                            <td className="py-2.5 text-right font-semibold text-sky-400">€{fmt(p.net)}</td>
                            <td className="py-2.5 text-right font-bold text-white">{p.percent.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Micro note */}
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Τα καθαρά υπολογίζονται αφαιρώντας τις προμήθειες πλατφόρμας και διαχείρισης.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
