'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { CalendarDays, TrendingUp, Receipt, Percent, Wallet, ShieldCheck, BarChart3, Trees, DollarSign } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface Platform {
  platform_id: number;
  name: string;
  commission: number;       // Manager commission rate
  plat_commission: number;  // Platform commission rate
  tax_able: boolean | number | string;
}

interface Reservation {
  reser_id: number;
  start_date: string;
  end_date: string;
  fee: number;
  canceled: boolean;
  platforms?: Platform | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isPlatformTaxable(platform: Platform | null | undefined): boolean {
  if (!platform) return false;
  const val = platform.tax_able;
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

// Progressive tax — identical to page.tsx
function calculateProgressiveTax(taxableGrossFee: number, items: TaxKlimakaItem[]): number {
  if (taxableGrossFee <= 0) return 0;

  const brackets = items.length > 0
    ? items.filter(i => i.f_tax_klimaka_aid === 1).sort((a, b) => a.from_amount - b.from_amount)
    : [
        { tax_klimaka_items_aid: 1, f_tax_klimaka_aid: 1, from_amount: 0,     to_amount: 12000,   pososto: 15 },
        { tax_klimaka_items_aid: 2, f_tax_klimaka_aid: 1, from_amount: 12000,  to_amount: 25000,   pososto: 35 },
        { tax_klimaka_items_aid: 3, f_tax_klimaka_aid: 1, from_amount: 25000,  to_amount: 1000000, pososto: 45 },
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

// Main computation — identical logic to computePeriodFinancials in page.tsx
function computeYearFinancials(resList: Reservation[], taxItems: TaxKlimakaItem[]) {
  let activeCount = 0;
  let nonTaxableCount = 0;
  let totalFee = 0;
  let taxableFee = 0;
  let totalDays = 0;
  let taxableDays = 0;
  let nonTaxableDays = 0;
  let totalPlatComm = 0;
  let totalMgrComm = 0;
  let totalNetFee = 0;

  resList.forEach(res => {
    if (res.canceled) return;

    activeCount++;
    const fee = Number(res.fee || 0);
    const platRate = Number(res.platforms?.plat_commission || 0);
    const mgrRate = Number(res.platforms?.commission || 0);
    const isTaxable = isPlatformTaxable(res.platforms);

    const days = diffDays(res.start_date, res.end_date);

    totalFee += fee;
    totalDays += days;

    if (isTaxable) {
      taxableFee += fee;
      taxableDays += days;
    } else {
      nonTaxableCount++;
      nonTaxableDays += days;
    }

    const platComm = fee * platRate;
    const remaining = fee - platComm;
    const mgrComm = remaining * mgrRate;
    const netFee = fee - platComm - mgrComm;

    totalPlatComm += platComm;
    totalMgrComm += mgrComm;
    totalNetFee += netFee;
  });

  const perivalon = taxableDays * 15;
  const totalCommissions = totalPlatComm + totalMgrComm + perivalon;
  const tax = calculateProgressiveTax(taxableFee, taxItems);
  const netIncomeAfterTax = totalNetFee - tax;
  const nonTaxableFee = totalFee - taxableFee;

  return {
    activeCount,
    nonTaxableCount,
    totalFee,
    taxableFee,
    nonTaxableFee,
    totalDays,
    taxableDays,
    nonTaxableDays,
    totalPlatComm,
    totalMgrComm,
    perivalon,
    totalCommissions,
    totalNetFee,
    tax,
    netIncomeAfterTax,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function YearlySummaryPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [taxItems, setTaxItems] = useState<TaxKlimakaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        // Reuse the existing /api/reservations endpoint (includes taxKlimakaItems)
        const [resJson, expRes] = await Promise.all([
          fetch('/api/reservations', { cache: 'no-store' }).then(r => r.json()),
          fetch('/api/expenses', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ expenses: [] })),
        ]);

        setReservations(resJson.reservations || []);
        setTaxItems(resJson.taxKlimakaItems || []);
        setExpenses(expRes.expenses || []);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Build one row per year
  const rows = useMemo(() => {
    const yearSet = new Set<number>();
    reservations.forEach(r => {
      const y = parseInt(r.start_date?.split('-')[0] || '0');
      if (y > 2000) yearSet.add(y);
    });
    expenses.forEach(e => {
      const y = parseInt((e.dateis || '').split('-')[0] || '0');
      if (y > 2000) yearSet.add(y);
    });

    return Array.from(yearSet).sort((a, b) => b - a).map(year => {
      const yearRes = reservations.filter(r =>
        parseInt(r.start_date?.split('-')[0] || '0') === year
      );

      const fin = computeYearFinancials(yearRes, taxItems);

      const yearExpenses = expenses
        .filter(e => parseInt((e.dateis || '').split('-')[0] || '0') === year)
        .reduce((s, e) => s + Number(e.expense || 0), 0);

      return { year, fin, expenses: yearExpenses };
    });
  }, [reservations, expenses, taxItems]);

  // Grand totals
  const totals = useMemo(() => rows.reduce((acc, r) => ({
    activeCount:       acc.activeCount       + r.fin.activeCount,
    nonTaxableCount:   acc.nonTaxableCount   + r.fin.nonTaxableCount,
    totalDays:         acc.totalDays         + r.fin.totalDays,
    nonTaxableDays:    acc.nonTaxableDays    + r.fin.nonTaxableDays,
    totalFee:          acc.totalFee          + r.fin.totalFee,
    nonTaxableFee:     acc.nonTaxableFee     + r.fin.nonTaxableFee,
    totalCommissions:  acc.totalCommissions  + r.fin.totalCommissions,
    expenses:          acc.expenses          + r.expenses,
    tax:               acc.tax               + r.fin.tax,
    netIncomeAfterTax: acc.netIncomeAfterTax + r.fin.netIncomeAfterTax - r.expenses,
  }), {
    activeCount: 0, nonTaxableCount: 0,
    totalDays: 0, nonTaxableDays: 0,
    totalFee: 0, nonTaxableFee: 0,
    totalCommissions: 0, expenses: 0, tax: 0, netIncomeAfterTax: 0,
  }), [rows]);

  // Chart Data: ascending chronological order (e.g. 2015 -> 2026)
  const chartData = useMemo(() => {
    return [...rows]
      .sort((a, b) => a.year - b.year)
      .map(r => {
        const netIncome = r.fin.netIncomeAfterTax - r.expenses;
        return {
          year: r.year.toString(),
          totalFee: r.fin.totalFee,
          netIncome: netIncome,
        };
      });
  }, [rows]);

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto w-full overflow-hidden space-y-4">
      {/* ── FRAME 1: TOP FIXED FRAME (TITLE & KPI CARDS) ── */}
      <div className="p-4 rounded-2xl border-2 border-slate-800 bg-slate-900 text-white space-y-4 shadow-md shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-sky-400" />
            <span>Ανά Έτος</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ετήσια σύνοψη κρατήσεων, εξόδων, φόρων και καθαρού εισοδήματος
          </p>
        </div>

        {/* KPI Summary Cards */}
        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Συνολικά Έσοδα</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-emerald-400">€{fmt(totals.totalFee)}</p>
            </div>
            <div className="glass-card p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Commissions</span>
                <Percent className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-xl font-bold text-rose-400">€{fmt(totals.totalCommissions)}</p>
            </div>
            <div className="glass-card p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Φόρος</span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-amber-400">€{fmt(totals.tax)}</p>
            </div>
            <div className="glass-card p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Καθαρό Εισόδημα</span>
                <Wallet className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-xl font-bold text-sky-400">€{fmt(totals.netIncomeAfterTax)}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── FRAME 2: BOTTOM SCROLLABLE FRAME (CHART & DATA TABLE) ── */}
      <div className="flex-1 overflow-y-auto overflow-x-auto pr-1 space-y-4 pb-20 min-h-0">

        {/* ── LINE CHART: GROSS REVENUE (FEE) VS NET INCOME ── */}
        {!loading && chartData.length > 0 && (
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-400" />
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Εξέλιξη Εσόδων & Καθαρού Εισοδήματος ανά Έτος
                </h2>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke="#94a3b8"
                    fontSize={12}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => `€${v >= 1000 ? (v / 1000) + 'k' : v}`}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                    }}
                    formatter={(val: any) => [`€${fmt(Number(val))}`, '']}
                    labelFormatter={(label) => `Έτος: ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="totalFee"
                    name="Συνολικά Έσοδα (Fee)"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ fill: '#38bdf8', r: 4, strokeWidth: 2, stroke: '#0f172a' }}
                    activeDot={{ r: 6, stroke: '#38bdf8', strokeWidth: 2, fill: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netIncome"
                    name="Καθαρό Εισόδημα"
                    stroke="#34d399"
                    strokeWidth={3}
                    dot={{ fill: '#34d399', r: 4, strokeWidth: 2, stroke: '#0f172a' }}
                    activeDot={{ r: 6, stroke: '#34d399', strokeWidth: 2, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="glass-panel rounded-2xl border border-slate-800">
          {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-400 text-sm">Φόρτωση δεδομένων...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Δεν βρέθηκαν δεδομένα.</div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-slate-900 shadow-md">
                <tr className="border-b-2 border-slate-800 bg-slate-900">
                  <th className="bg-slate-900 text-left px-4 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Έτος</th>

                  <th className="bg-slate-900 text-center px-3 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Κρατήσεις</th>

                  <th className="bg-slate-900 text-center px-3 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Ημέρες</th>

                  <th className="bg-slate-900 text-right px-3 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Έσοδα (€)</th>

                  <th className="bg-slate-900 text-right px-3 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Commissions (€)</th>

                  <th className="bg-slate-900 text-right px-3 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Έξοδα (€)</th>
                  <th className="bg-slate-900 text-right px-3 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Φόρος (€)</th>
                  <th className="bg-slate-900 text-right px-4 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Καθαρό Εισόδημα (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.map((row, idx) => {
                  const netIncome = row.fin.netIncomeAfterTax - row.expenses;
                  return (
                    <tr
                      key={row.year}
                      className={`transition-colors hover:bg-slate-800/40 ${idx % 2 === 0 ? 'bg-slate-900/20' : ''}`}
                    >
                      {/* Year */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-sky-400 text-base">{row.year}</span>
                      </td>

                      {/* Reservations (non-taxable) */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="font-semibold text-white">{row.fin.activeCount}</span>
                        {row.fin.nonTaxableCount > 0 && (
                          <span className="text-slate-500 text-xs ml-1.5">({row.fin.nonTaxableCount})</span>
                        )}
                      </td>

                      {/* Days (non-taxable) */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="font-semibold text-white">{row.fin.totalDays}</span>
                        {row.fin.nonTaxableDays > 0 && (
                          <span className="text-slate-500 text-xs ml-1.5">({row.fin.nonTaxableDays})</span>
                        )}
                      </td>

                      {/* Fee (non-taxable) */}
                      <td className="px-3 py-3.5 text-right">
                        <span className="font-semibold text-emerald-400">€{fmt(row.fin.totalFee)}</span>
                        {row.fin.nonTaxableFee > 0 && (
                          <div className="text-slate-500 text-xs">(€{fmt(row.fin.nonTaxableFee)})</div>
                        )}
                      </td>

                      {/* Commissions (Platform + Manager + Perivalon) */}
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-rose-400 font-medium">€{fmt(row.fin.totalCommissions)}</span>
                        <div className="text-slate-600 text-[10px] mt-0.5">
                          Πλατφ: €{fmt(row.fin.totalPlatComm)} · Mgr: €{fmt(row.fin.totalMgrComm)} · Περιβ: €{fmt(row.fin.perivalon)}
                        </div>
                      </td>

                      {/* Expenses */}
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-orange-400 font-medium">€{fmt(row.expenses)}</span>
                      </td>

                      {/* Tax (progressive) */}
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-amber-400 font-medium">€{fmt(row.fin.tax)}</span>
                        {row.fin.taxableFee > 0 && (
                          <div className="text-slate-600 text-[10px] mt-0.5">επί €{fmt(row.fin.taxableFee)}</div>
                        )}
                      </td>

                      {/* Net Income After Tax & Expenses */}
                      <td className="px-4 py-3.5 text-right">
                        <span className={`font-bold text-base ${netIncome >= 0 ? 'text-sky-400' : 'text-red-400'}`}>
                          €{fmt(netIncome)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals Row */}
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-800/50">
                  <td className="px-4 py-3.5">
                    <span className="font-bold text-white text-xs uppercase tracking-wide">Σύνολο</span>
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <span className="font-bold text-white">{totals.activeCount}</span>
                    {totals.nonTaxableCount > 0 && (
                      <span className="text-slate-500 text-xs ml-1.5">({totals.nonTaxableCount})</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <span className="font-bold text-white">{totals.totalDays}</span>
                    {totals.nonTaxableDays > 0 && (
                      <span className="text-slate-500 text-xs ml-1.5">({totals.nonTaxableDays})</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className="font-bold text-emerald-400">€{fmt(totals.totalFee)}</span>
                    {totals.nonTaxableFee > 0 && (
                      <div className="text-slate-500 text-xs">(€{fmt(totals.nonTaxableFee)})</div>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className="font-bold text-rose-400">€{fmt(totals.totalCommissions)}</span>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className="font-bold text-orange-400">€{fmt(totals.expenses)}</span>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className="font-bold text-amber-400">€{fmt(totals.tax)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`font-bold text-base ${totals.netIncomeAfterTax >= 0 ? 'text-sky-400' : 'text-red-400'}`}>
                      €{fmt(totals.netIncomeAfterTax)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
        )}
      </div>

      {/* Legend */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
        <p className="font-semibold text-slate-300 mb-2">📌 Σημειώσεις υπολογισμού</p>
        <p>• <span className="text-slate-300">Κρατήσεις / Ημέρες / Έσοδα σε παρένθεση</span> = μη φορολογητέα (platforms με <code>tax_able = false</code>)</p>
        <p>• <span className="text-slate-300">Commissions</span> = Platform commission + Manager commission + Περιβαλλοντικό τέλος (φορολ. ημέρες × €15)</p>
        <p>• <span className="text-slate-300">Φόρος</span> = Προοδευτική φορολογική κλίμακα επί των <strong>ακαθάριστων φορολογητέων εσόδων</strong> (όπως στα Οικονομικά Στοιχεία)</p>
      </div>
      </div>
    </div>
  );
}
