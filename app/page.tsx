'use client';

import { useState, useEffect } from 'react';
import { supabase, Reservation, House } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { 
  Eye, 
  X, 
  Ban, 
  User, 
  Calendar as CalendarIcon, 
  Users, 
  FileText
} from 'lucide-react';

// Helper to safely extract 4-digit Year string from any ISO date string (cross-browser / iOS Safari safe)
function getYearFromIso(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const match = isoString.match(/^(\d{4})/);
  return match ? match[1] : '';
}

// Helper to format date string DD/MM/YYYY
function formatDateDisplay(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  const parts = isoString.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoString;
}

// Helper to format Month Badge (e.g. Aug 2026)
function getMonthBadge(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = isoString.split('T')[0].split('-');
  if (parts.length === 3) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    return `${months[monthIdx] || ''} ${year}`;
  }
  return '';
}

export default function ReservationsPage() {
  const { role, ownerId, selectedHouseId: globalSelectedHouseId, assignedHouseIds, theme } = useAuth();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters matching user request
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedHouseId, setSelectedHouseId] = useState<number | 'ALL'>('ALL');
  const [hideCancelled, setHideCancelled] = useState(false);

  // Selected reservation for Eye modal
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchData();
  }, [role, ownerId, assignedHouseIds]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch houses
      let houseQuery = supabase.from('houses').select('*');
      if (assignedHouseIds.length > 0) {
        houseQuery = houseQuery.in('house_aid', assignedHouseIds);
      }
      const { data: houseData } = await houseQuery;
      setHouses(houseData || []);

      // Fetch reservations with joins
      const { data: resData, error } = await supabase
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
        setReservations(resData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Sync global selected house if set from header
  useEffect(() => {
    if (globalSelectedHouseId) {
      setSelectedHouseId(globalSelectedHouseId);
    }
  }, [globalSelectedHouseId]);

  // Extract available years (safely using getYearFromIso)
  const availableYears = Array.from(
    new Set(reservations.map(r => getYearFromIso(r.start_date)).filter(Boolean))
  ).sort().reverse();

  // Set default year to latest available if current selectedYear not present
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [reservations]);

  // Role & Filter Logic
  const filteredReservations = reservations.filter((res) => {
    // 1. Role / House Assignment Filter
    if (assignedHouseIds.length > 0 && res.f_house_aid) {
      if (!assignedHouseIds.includes(res.f_house_aid)) return false;
    }

    // 2. Specific House Filter
    if (selectedHouseId !== 'ALL' && res.f_house_aid !== selectedHouseId) {
      return false;
    }

    // 3. Year Filter (Strictly matches selected year using getYearFromIso)
    const resYear = getYearFromIso(res.start_date);
    if (resYear !== selectedYear) {
      return false;
    }

    // 4. Hide Cancelled Toggle
    if (hideCancelled && res.canceled) {
      return false;
    }

    return true;
  });

  // Counters
  const totalCount = filteredReservations.length;
  const cancelledCount = filteredReservations.filter(r => r.canceled).length;

  const isDark = theme === 'dark';

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* ── FILTER & SUMMARY PANEL (Matching Mobile Layout Screenshot) ── */}
      <div className={`p-4 rounded-2xl border shadow-sm transition-colors ${
        isDark 
          ? 'bg-slate-900/90 border-slate-800' 
          : 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200'
      }`}>
        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Year & House Selection */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-sm font-bold focus:outline-none cursor-pointer ${
                  isDark 
                    ? 'bg-slate-950 border-slate-700 text-white' 
                    : 'bg-white border-slate-300 text-slate-900 shadow-sm'
                }`}
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* House / All Selector */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>House</span>
              <select
                value={selectedHouseId}
                onChange={(e) => setSelectedHouseId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className={`px-3 py-1.5 rounded-xl border text-sm font-bold focus:outline-none cursor-pointer ${
                  isDark 
                    ? 'bg-slate-950 border-slate-700 text-sky-400' 
                    : 'bg-white border-slate-300 text-indigo-600 shadow-sm'
                }`}
              >
                <option value="ALL">Όλα τα Σπίτια</option>
                {houses.map(h => (
                  <option key={h.house_aid} value={h.house_aid}>
                    {h.house_name?.trim() || `House #${h.house_aid}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle Hide Cancelled Button */}
          <button
            onClick={() => setHideCancelled(!hideCancelled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              hideCancelled
                ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                : isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-200/80 border-slate-300 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>{hideCancelled ? 'Show Cancelled' : 'Hide Cancelled'}</span>
          </button>
        </div>

        {/* Counter Info Line */}
        <div className={`mt-3 pt-3 border-t text-xs font-semibold flex items-center justify-between ${
          isDark ? 'border-slate-800 text-slate-400' : 'border-sky-200/80 text-sky-900'
        }`}>
          <div>
            <span>Reservations: </span>
            <span className="font-bold text-sky-500">{totalCount}</span>
          </div>
          {cancelledCount > 0 && (
            <div className="flex items-center gap-1 text-rose-500">
              <Ban className="w-3.5 h-3.5" />
              <span>{cancelledCount} cancelled</span>
            </div>
          )}
        </div>
      </div>

      {/* ── RESERVATION CARDS LIST ── */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm">Φόρτωση κρατήσεων...</p>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border text-slate-400 ${
          isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <p className="text-sm">Δεν βρέθηκαν κρατήσεις για το έτος {selectedYear}.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReservations.map((res) => {
            const startDisplay = formatDateDisplay(res.start_date);
            const endDisplay = formatDateDisplay(res.end_date);
            const monthBadge = getMonthBadge(res.start_date);
            
            // Duration calculation
            let diffDays = 0;
            if (res.start_date && res.end_date) {
              const s = new Date(res.start_date).getTime();
              const e = new Date(res.end_date).getTime();
              if (!isNaN(s) && !isNaN(e)) {
                diffDays = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24));
              }
            }

            return (
              <div
                key={res.reser_id}
                onClick={() => setSelectedRes(res)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                  res.canceled
                    ? isDark 
                      ? 'bg-rose-950/20 border-rose-900/40 opacity-75 hover:opacity-100' 
                      : 'bg-rose-50/80 border-rose-200 opacity-80 hover:opacity-100'
                    : isDark
                      ? 'bg-slate-900/80 border-slate-800 hover:border-sky-500/40 hover:bg-slate-800/80 shadow-md shadow-black/20'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                {/* Top Row: Customer Name & Month Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={`text-base font-extrabold tracking-tight flex items-center gap-2 ${
                      res.canceled 
                        ? 'line-through text-rose-500' 
                        : isDark ? 'text-indigo-300' : 'text-indigo-900'
                    }`}>
                      {res.canceled && <Ban className="w-4 h-4 text-rose-500 shrink-0" />}
                      <span>{res.customers?.name || 'Unknown Customer'}</span>
                    </h3>
                    {res.canceled && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30">
                        🚫 ΑΚΥΡΩΘΗΚΕ
                      </span>
                    )}
                  </div>

                  {/* Month Badge */}
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm">
                      {monthBadge}
                    </span>
                    {/* Eye Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRes(res);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-all"
                      title="Προβολή"
                    >
                      <Eye className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                {/* Dates & Duration Row */}
                <div className="mt-2 text-xs font-semibold text-slate-400 italic">
                  <span>{startDisplay} - {endDisplay}</span>
                  {diffDays > 0 && <span className="ml-1 text-slate-500">({diffDays} days)</span>}
                </div>

                {/* Details Subtitle Row */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-400 space-x-1.5">
                    <span className="font-semibold text-sky-400">{res.platforms?.name || 'N/A'}</span>
                    <span>|</span>
                    <span>{res.num_of_visitors} persons</span>
                    {res.kids > 0 && <span>/ {res.kids} kids</span>}
                  </div>

                  {/* Price Tag */}
                  <div className={`text-base font-extrabold ${
                    res.canceled 
                      ? 'text-slate-500 line-through' 
                      : 'text-emerald-500'
                  }`}>
                    €{Number(res.fee || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RESERVATION DETAILS MODAL (Eye Icon Click) ── */}
      {selectedRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl relative transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div>
                <h3 className="text-lg font-extrabold flex items-center gap-2">
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

            {/* Modal Body */}
            <div className="space-y-3.5 text-sm">
              {/* Customer Box */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <User className="w-5 h-5 text-sky-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Πελάτης</p>
                  <p className="font-bold text-base mt-0.5">{selectedRes.customers?.name || 'N/A'}</p>
                  <p className="text-xs text-slate-400">{selectedRes.customers?.email || 'Χωρίς Email'}</p>
                  <p className="text-xs text-slate-400">{selectedRes.customers?.phone || 'Χωρίς Τηλέφωνο'}</p>
                </div>
              </div>

              {/* Dates & Visitors */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                    <CalendarIcon className="w-4 h-4 text-indigo-400" />
                    <span>Ημερομηνίες</span>
                  </div>
                  <p className="text-xs font-bold">{formatDateDisplay(selectedRes.start_date)} ➔ {formatDateDisplay(selectedRes.end_date)}</p>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Επισκέπτες</span>
                  </div>
                  <p className="text-xs font-bold">{selectedRes.num_of_visitors} Ενήλικες {selectedRes.kids > 0 && `, ${selectedRes.kids} Παιδιά`}</p>
                </div>
              </div>

              {/* Financials */}
              <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Πλατφόρμα:</span>
                  <span className="text-sky-400 font-bold">{selectedRes.platforms?.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Προκαταβολή:</span>
                  <span className="font-semibold">€{selectedRes.advanced_payment || 0}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-base font-bold">
                  <span>Συνολικό Ποσό:</span>
                  <span className="text-emerald-500">€{Number(selectedRes.fee).toLocaleString('el-GR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Notes */}
              {(selectedRes.notes || selectedRes.comments) && (
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Σημειώσεις</span>
                  </div>
                  <p className="text-xs italic text-slate-300">{selectedRes.notes || selectedRes.comments}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedRes(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold transition-all"
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
