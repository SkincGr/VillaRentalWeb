'use client';

import { useState, useEffect } from 'react';
import { supabase, Customer, Platform, House, Owner } from '@/lib/supabaseClient';
import { Users, Globe, Home as HomeIcon, UserCheck, Search, Calendar } from 'lucide-react';

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'platforms' | 'houses' | 'owners'>('customers');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAllMasterData();
  }, []);

  async function fetchAllMasterData() {
    setLoading(true);
    try {
      const [custRes, platRes, houseRes, ownRes] = await Promise.all([
        supabase.from('customers').select('*').order('custom_id', { ascending: true }),
        supabase.from('platforms').select('*').order('platform_id', { ascending: true }),
        supabase.from('houses').select('*').order('house_aid', { ascending: true }),
        supabase.from('owners').select('*').order('owner_aid', { ascending: true })
      ]);

      if (custRes.data) setCustomers(custRes.data);
      if (platRes.data) setPlatforms(platRes.data);
      if (houseRes.data) {
        setHouses(houseRes.data.map((h: any) => ({
          ...h,
          start_period_date: h.start_period_date || '05-15',
          end_period_date: h.end_period_date || '10-15'
        })));
      }
      if (ownRes.data) setOwners(ownRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = customers.filter(c => 
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredPlatforms = platforms.filter(p => 
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHouses = houses.filter(h => 
    !search || (h.house_name && h.house_name.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredOwners = owners.filter(o => 
    !search || (o.name && o.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Master Data</h1>
        <p className="text-sm text-slate-400">Διαχείριση Πελατών, Πλατφορμών, Σπιτιών & Ιδιοκτητών</p>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => { setActiveTab('customers'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'customers'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Πελάτες ({customers.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('platforms'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'platforms'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Πλατφόρμες ({platforms.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('houses'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'houses'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <HomeIcon className="w-4 h-4" />
          <span>Σπίτια / Βίλες ({houses.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('owners'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'owners'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Ιδιοκτήτες ({owners.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Αναζήτηση..."
          className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Content Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Φόρτωση δεδομένων...</div>
        ) : activeTab === 'customers' ? (
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Όνομα</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Τηλέφωνο</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCustomers.map(c => (
                <tr key={c.custom_id} className="hover:bg-slate-800/40">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">#{c.custom_id}</td>
                  <td className="px-5 py-3.5 font-semibold text-white">{c.name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-300">{c.email || '-'}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-300">{c.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === 'platforms' ? (
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Όνομα Πλατφόρμας</th>
                <th className="px-5 py-4">Προμήθεια (%)</th>
                <th className="px-5 py-4">Φορολογήσιμη</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPlatforms.map(p => (
                <tr key={p.platform_id} className="hover:bg-slate-800/40">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">#{p.platform_id}</td>
                  <td className="px-5 py-3.5 font-semibold text-white">{p.name}</td>
                  <td className="px-5 py-3.5 font-semibold text-sky-400">{(p.commission * 100).toFixed(0)}%</td>
                  <td className="px-5 py-3.5">
                    {p.tax_able ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ναι</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700/50 text-slate-400">Όχι</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === 'houses' ? (
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Όνομα Σπιτιού / Βίλας</th>
                <th className="px-5 py-4">Έναρξη Περιόδου (StartPeriod)</th>
                <th className="px-5 py-4">Λήξη Περιόδου (EndPeriod)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredHouses.map(h => (
                <tr key={h.house_aid} className="hover:bg-slate-800/40">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">#{h.house_aid}</td>
                  <td className="px-5 py-3.5 font-semibold text-white">{h.house_name}</td>
                  <td className="px-5 py-3.5 font-bold text-amber-400">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Calendar className="w-3.5 h-3.5" />
                      15 Μαΐου ({h.start_period_date || '05-15'})
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-amber-400">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Calendar className="w-3.5 h-3.5" />
                      15 Οκτωβρίου ({h.end_period_date || '10-15'})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Όνομα Ιδιοκτήτη</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Τηλέφωνο</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOwners.map(o => (
                <tr key={o.owner_aid} className="hover:bg-slate-800/40">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">#{o.owner_aid}</td>
                  <td className="px-5 py-3.5 font-semibold text-white">{o.name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-300">{o.email || '-'}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-300">{o.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
