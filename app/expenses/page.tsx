'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Receipt, Percent, FileCheck } from 'lucide-react';

export default function ExpensesPage() {
  const [taxRanges, setTaxRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaxData();
  }, []);

  async function fetchTaxData() {
    setLoading(true);
    const { data } = await supabase
      .from('tax_klimaka_items')
      .select('*, tax_klimaka(*)');

    setTaxRanges(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <Receipt className="w-6 h-6 text-amber-400" />
          <span>Έξοδα & Φορολογία</span>
        </h1>
        <p className="text-sm text-slate-400">Διαχείριση εξόδων και υπολογισμός φορολογικών κλιμάκων</p>
      </div>

      {/* Tax Brackets Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Percent className="w-5 h-5 text-amber-400" />
          <span>Φορολογική Κλίμακα (Tax Brackets)</span>
        </h3>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Φόρτωση φορολογικών κλιμάκων...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-4">Από Ποσό (€)</th>
                  <th className="px-5 py-4">Έως Ποσό (€)</th>
                  <th className="px-5 py-4">Ποσοστό Φόρου (%)</th>
                  <th className="px-5 py-4">Τύπος</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {taxRanges.map(item => (
                  <tr key={item.tax_klimaka_items_aid} className="hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">#{item.tax_klimaka_items_aid}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-200">€{Number(item.from_amount).toLocaleString()}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-200">€{Number(item.to_amount).toLocaleString()}</td>
                    <td className="px-5 py-3.5 font-bold text-amber-400">{item.pososto}%</td>
                    <td className="px-5 py-3.5">
                      {item.tax_klimaka?.is_company ? (
                        <span className="px-2.5 py-1 rounded-full text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Εταιρεία</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20">Φυσικό Πρόσωπο</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
