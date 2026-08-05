'use client';

import { useState, useEffect } from 'react';
import { supabase, Reservation, Customer, Platform } from '@/lib/supabaseClient';
import { 
  CalendarCheck, 
  Euro, 
  Users, 
  XCircle, 
  Search, 
  Filter, 
  Eye, 
  X,
  User,
  Calendar as CalendarIcon,
  Tag,
  FileText
} from 'lucide-react';

export default function ReservationsDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELED'>('ALL');
  
  // Detail Modal
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  async function fetchReservations() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          customers (*),
          platforms (*),
          houses (*)
        `)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching reservations:', error);
      } else {
        setReservations(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Filtered Reservations Logic
  const filteredReservations = reservations.filter((res) => {
    // Search query matching customer name or email or notes
    const custName = res.customers?.name?.toLowerCase() || '';
    const custEmail = res.customers?.email?.toLowerCase() || '';
    const notes = res.notes?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || custName.includes(q) || custEmail.includes(q) || notes.includes(q);

    // Year filter
    const startYear = res.start_date ? new Date(res.start_date).getFullYear().toString() : '';
    const matchesYear = selectedYear === 'ALL' || startYear === selectedYear;

    // Platform filter
    const matchesPlatform = selectedPlatform === 'ALL' || res.f_platform_id.toString() === selectedPlatform;

    // Status filter
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && !res.canceled) || 
      (statusFilter === 'CANCELED' && res.canceled);

    return matchesSearch && matchesYear && matchesPlatform && matchesStatus;
  });

  // Calculate Metrics
  const totalRevenue = filteredReservations.reduce((sum, r) => sum + (r.canceled ? 0 : Number(r.fee || 0)), 0);
  const totalVisitors = filteredReservations.reduce((sum, r) => sum + (r.canceled ? 0 : Number(r.num_of_visitors || 0)), 0);
  const totalBookings = filteredReservations.length;
  const canceledCount = filteredReservations.filter(r => r.canceled).length;

  // Extract available years for filter
  const years = Array.from(new Set(reservations.map(r => new Date(r.start_date).getFullYear().toString()))).sort().reverse();
  
  // Extract unique platforms
  const platformMap = new Map<number, string>();
  reservations.forEach(r => {
    if (r.platforms) {
      platformMap.set(r.platforms.platform_id, r.platforms.name);
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Διαχείριση Κρατήσεων</h1>
          <p className="text-sm text-slate-400">Προβολή, φιλτράρισμα και στατιστικά κρατήσεων</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Σύνολο Κρατήσεων</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalBookings}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Συνολικά Έσοδα</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">€{totalRevenue.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Euro className="w-6 h-6" />
          </div>
        </div>

        {/* Total Visitors */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Σύνολο Επισκεπτών</p>
            <h3 className="text-2xl font-bold text-indigo-400 mt-1">{totalVisitors}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Canceled Bookings */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ακυρώσεις</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1">{canceledCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Αναζήτηση πελάτη ή σημείωσης..."
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Όλα τα έτη</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Platform Filter */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Όλες οι Πλατφόρμες</option>
            {Array.from(platformMap.entries()).map(([id, name]) => (
              <option key={id} value={id.toString()}>{name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex bg-slate-900/80 border border-slate-700/80 rounded-xl p-1 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === 'ALL' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Όλες
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Ενεργές
            </button>
            <button
              onClick={() => setStatusFilter('CANCELED')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === 'CANCELED' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Ακυρωμένες
            </button>
          </div>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            <p>Φόρτωση κρατήσεων από το Supabase...</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p>Δεν βρέθηκαν κρατήσεις με αυτά τα φίλτρα.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Πελάτης</th>
                  <th className="px-5 py-4">Ημερομηνίες</th>
                  <th className="px-5 py-4">Πλατφόρμα</th>
                  <th className="px-5 py-4">Άτομα</th>
                  <th className="px-5 py-4">Ποσό (€)</th>
                  <th className="px-5 py-4">Κατάσταση</th>
                  <th className="px-5 py-4 text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredReservations.map((res) => {
                  const startDateStr = res.start_date ? new Date(res.start_date).toLocaleDateString('el-GR') : '-';
                  const endDateStr = res.end_date ? new Date(res.end_date).toLocaleDateString('el-GR') : '-';

                  return (
                    <tr key={res.reser_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">#{res.reser_id}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{res.customers?.name || 'Άγνωστος'}</div>
                        <div className="text-xs text-slate-400">{res.customers?.email || res.customers?.phone || '-'}</div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="font-medium text-slate-200">{startDateStr} ➔ {endDateStr}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-500/10 border border-sky-500/20 text-sky-400">
                          {res.platforms?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <span className="text-slate-200 font-semibold">{res.num_of_visitors}</span>
                        {res.kids > 0 && <span className="text-slate-400 ml-1">({res.kids} παιδιά)</span>}
                      </td>
                      <td className="px-5 py-4 font-semibold text-emerald-400">
                        €{Number(res.fee || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4">
                        {res.canceled ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            Ακυρώθηκε
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            Ενεργή
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedRes(res)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
                          title="Προβολή Λεπτομερειών"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reservation Details Modal */}
      {selectedRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-700/80 p-6 space-y-5 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Κράτηση #{selectedRes.reser_id}</span>
                  {selectedRes.canceled ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Ακυρώθηκε</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Ενεργή</span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">Πληροφορίες κράτησης & πελάτη</p>
              </div>
              <button
                onClick={() => setSelectedRes(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="space-y-4 text-sm">
              {/* Customer Box */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-start gap-3">
                <User className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Πελάτης</p>
                  <p className="font-semibold text-white text-base">{selectedRes.customers?.name || 'N/A'}</p>
                  <p className="text-xs text-slate-300">{selectedRes.customers?.email || 'Χωρίς Email'}</p>
                  <p className="text-xs text-slate-300">{selectedRes.customers?.phone || 'Χωρίς Τηλέφωνο'}</p>
                </div>
              </div>

              {/* Dates & Visitors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                    <CalendarIcon className="w-4 h-4 text-indigo-400" />
                    <span>Check-In / Check-Out</span>
                  </div>
                  <p className="text-slate-200 font-medium">{new Date(selectedRes.start_date).toLocaleDateString('el-GR')} ➔ {new Date(selectedRes.end_date).toLocaleDateString('el-GR')}</p>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Επισκέπτες</span>
                  </div>
                  <p className="text-slate-200 font-medium">{selectedRes.num_of_visitors} Ενήλικες {selectedRes.kids > 0 && `, ${selectedRes.kids} Παιδιά`}</p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Πλατφόρμα:</span>
                  <span className="text-sky-400 font-semibold">{selectedRes.platforms?.name}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Προκαταβολή:</span>
                  <span className="text-slate-200">€{selectedRes.advanced_payment || 0}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-base font-bold text-white">
                  <span>Συνολικό Ποσό:</span>
                  <span className="text-emerald-400">€{Number(selectedRes.fee).toLocaleString('el-GR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Notes & Comments */}
              {(selectedRes.notes || selectedRes.comments) && (
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Σημειώσεις / Σχόλια</span>
                  </div>
                  <p className="text-xs text-slate-300 italic">{selectedRes.notes || selectedRes.comments}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedRes(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-sm font-medium transition-all"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
