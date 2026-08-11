'use client';

import { useState, useEffect } from 'react';
import { supabase, Reservation } from '@/lib/supabaseClient';
import { BarChart3, TrendingUp, DollarSign, Percent, PieChart } from 'lucide-react';

export default function AnalyticsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  async function fetchReservations() {
    setLoading(true);
    const { data } = await supabase
      .from('reservations')
      .select('*, platforms(*), customers(*)');

    setReservations(data || []);
    setLoading(false);
  }

  // Calculate totals
  const activeReservations = reservations.filter(r => !r.canceled);
  const totalGrossRevenue = activeReservations.reduce((sum, r) => sum + Number(r.fee || 0), 0);
  
  // Total Commission
  const totalCommission = activeReservations.reduce((sum, r) => {
    const commRate = r.platforms?.commission || 0;
    return sum + (Number(r.fee || 0) * commRate);
  }, 0);

  const totalNetRevenue = totalGrossRevenue - totalCommission;

  // Platform Breakdown
  const platformRevenueMap = new Map<string, { count: number; gross: number }>();
  activeReservations.forEach(r => {
    const platName = r.platforms?.name || 'Άγνωστη';
    const current = platformRevenueMap.get(platName) || { count: 0, gross: 0 };
    platformRevenueMap.set(platName, {
      count: current.count + 1,
      gross: current.gross + Number(r.fee || 0)
    });
  });

  const platformBreakdown = Array.from(platformRevenueMap.entries()).map(([name, stat]) => ({
    name,
    count: stat.count,
    gross: stat.gross,
    percent: totalGrossRevenue > 0 ? (stat.gross / totalGrossRevenue) * 100 : 0
  })).sort((a, b) => b.gross - a.gross);

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto w-full overflow-hidden gap-4">
      <div className="shrink-0 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <span>Αναλυτικά & Στατιστικά</span>
          </h1>
          <p className="text-sm text-slate-400">Οικονομική ανάλυση εσόδων, προμηθειών & πληρότητας</p>
        </div>

        {/* Financial Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Gross Revenue */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Ακαθάριστα Έσοδα</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-400 mt-2">
            €{totalGrossRevenue.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Σύνολο από ενεργές κρατήσεις</p>
        </div>

        {/* Total Commission */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Συνολικές Προμήθειες</span>
            <Percent className="w-5 h-5 text-rose-400" />
          </div>
          <h3 className="text-2xl font-bold text-rose-400 mt-2">
            €{totalCommission.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Προμήθειες προς πλατφόρμες</p>
        </div>

        {/* Net Revenue */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Καθαρά Έσοδα</span>
            <TrendingUp className="w-5 h-5 text-sky-400" />
          </div>
          <h3 className="text-2xl font-bold text-sky-400 mt-2">
            €{totalNetRevenue.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Έσοδα μετά την αφαίρεση προμηθειών</p>
        </div>
        </div>
      </div>

      {/* Revenue Breakdown by Platform */}
      <div className="flex-1 min-h-0 overflow-y-auto glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 pb-20">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <PieChart className="w-5 h-5 text-sky-400" />
          <span>Κατανομή Εσόδων ανά Πλατφόρμα</span>
        </h3>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Φόρτωση αναλυτικών...</div>
        ) : (
          <div className="space-y-3">
            {platformBreakdown.map(item => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-200">{item.name} ({item.count} κρατήσεις)</span>
                  <span className="font-bold text-emerald-400">
                    €{item.gross.toLocaleString('el-GR', { minimumFractionDigits: 2 })} ({item.percent.toFixed(1)}%)
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
