'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Reservation, House } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  BarChart3, 
  TrendingUp, 
  CircleDollarSign,
  Calendar as CalendarIcon,
  X,
  User,
  Building,
  Tag,
  Ban
} from 'lucide-react';

function isPlatformTaxable(platform: any): boolean {
  if (!platform) return false;
  const val = platform.tax_able;
  return val === true || val === 1 || val === '1' || val === 'true' || val === 't';
}

function calculateFinancials(feeNum: number, platCommRate: number, managerCommRate: number) {
  const fee = Number(feeNum || 0);
  const platComm = fee * Number(platCommRate || 0);
  const remaining = fee - platComm;
  const mgrComm = remaining * Number(managerCommRate || 0);
  const netFee = fee - platComm - mgrComm;
  return { fee, netFee };
}

function getYearFromIso(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const match = isoString.match(/^(\d{4})/);
  return match ? match[1] : '';
}

function formatDateDisplay(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  const parts = isoString.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoString;
}

export default function YearCalendarPage() {
  const { theme, assignedHouseIds, selectedHouseId: globalSelectedHouseId } = useAuth();
  
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedHouseId, setSelectedHouseId] = useState<number | 'ALL'>('ALL');
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected reservation details popup
  const [activeResPopup, setActiveResPopup] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/reservations', { cache: 'no-store' });
      const json = await res.json();
      
      if (json.houses) {
        let filteredHouses = json.houses;
        if (assignedHouseIds.length > 0) {
          filteredHouses = json.houses.filter((h: House) => assignedHouseIds.includes(h.house_aid));
        }
        setHouses(filteredHouses);
      }
      
      if (json.reservations) {
        setReservations(json.reservations);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Sync global selected house
  useEffect(() => {
    if (globalSelectedHouseId) {
      setSelectedHouseId(globalSelectedHouseId);
    }
  }, [globalSelectedHouseId]);

  // Extract available years
  const availableYears = Array.from(
    new Set(reservations.map(r => parseInt(getYearFromIso(r.start_date), 10)).filter(Boolean))
  ).sort((a, b) => b - a);

  // Active selected house metadata
  const currentHouse = houses.find(h => h.house_aid === selectedHouseId) || houses[0];
  const startPeriodStr = currentHouse?.start_period_date || '05-15'; // Default 15 May
  const endPeriodStr = currentHouse?.end_period_date || '10-15';     // Default 15 October

  // 1. Filter active non-canceled reservations for selected year & house
  const activeYearReservations = reservations.filter(res => {
    if (res.canceled) return false;

    if (assignedHouseIds.length > 0 && res.f_house_aid) {
      if (!assignedHouseIds.includes(res.f_house_aid)) return false;
    }

    if (selectedHouseId !== 'ALL' && res.f_house_aid !== selectedHouseId) {
      return false;
    }

    const startYear = parseInt(getYearFromIso(res.start_date), 10);
    const endYear = parseInt(getYearFromIso(res.end_date), 10);

    return startYear === selectedYear || endYear === selectedYear;
  });

  // 2. Compute Top 3 KPI Metrics
  const totalReservationsCount = activeYearReservations.length;

  let totalDaysBooked = 0;
  let totalNetProfit = 0;

  activeYearReservations.forEach(res => {
    if (res.start_date && res.end_date) {
      const s = new Date(res.start_date).getTime();
      const e = new Date(res.end_date).getTime();
      if (!isNaN(s) && !isNaN(e)) {
        const days = Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24));
        totalDaysBooked += days;
      }
    }

    const { netFee } = calculateFinancials(
      res.fee,
      res.platforms?.plat_commission || 0,
      res.platforms?.commission || 0
    );
    totalNetProfit += netFee;
  });

  // Month names (English matching screenshot: January, February, March...)
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Weekday headers matching screenshot: S M T W T F S
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Helper to check if a specific date is booked by an active reservation
  function getBookedReservationForDate(yearNum: number, monthIdx: number, dayNum: number): Reservation | undefined {
    const target = new Date(Date.UTC(yearNum, monthIdx, dayNum));

    return activeYearReservations.find(res => {
      if (!res.start_date || !res.end_date) return false;
      const sStr = res.start_date.split('T')[0];
      const eStr = res.end_date.split('T')[0];
      const tStr = target.toISOString().split('T')[0];
      return tStr >= sStr && tStr < eStr;
    });
  }

  // Helper to check if a date is OUTSIDE the house operating period (e.g., outside 15 May - 15 Oct)
  function isDateOutsideOperatingPeriod(monthIdx: number, dayNum: number): boolean {
    const mStr = String(monthIdx + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const mmdd = `${mStr}-${dStr}`;

    // Normalize start/end period strings (e.g. '2026-05-15' or '05-15')
    const startMMDD = startPeriodStr.includes('-') && startPeriodStr.length > 5 ? startPeriodStr.slice(5) : startPeriodStr;
    const endMMDD = endPeriodStr.includes('-') && endPeriodStr.length > 5 ? endPeriodStr.slice(5) : endPeriodStr;

    return mmdd < startMMDD || mmdd > endMMDD;
  }

  // Count booked days in a month
  function getBookedDaysCountForMonth(yearNum: number, monthIdx: number): number {
    const daysInMonth = new Date(yearNum, monthIdx + 1, 0).getDate();
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (getBookedReservationForDate(yearNum, monthIdx, d)) {
        count++;
      }
    }
    return count;
  }

  const isDark = theme === 'dark';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── PURPLE HEADER BAR (matching screenshot) ── */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-2xl shadow-xl overflow-hidden">
        {/* Top Title Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-indigo-200" />
            <div>
              <h1 className="text-xl font-extrabold tracking-wide">Year Calendar</h1>
              <p className="text-xs text-indigo-200">
                Περίοδος Ενοικίασης: <strong className="text-amber-300">15 Μαΐου - 15 Οκτωβρίου</strong>
              </p>
            </div>
          </div>

          {/* House Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedHouseId}
              onChange={(e) => setSelectedHouseId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold focus:outline-none backdrop-blur-md cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Όλα τα Σπίτια</option>
              {houses.map(h => (
                <option key={h.house_aid} value={h.house_aid} className="bg-slate-900 text-white">
                  {h.house_name?.trim() || `House #${h.house_aid}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Year Navigation Bar with Left & Right Arrows */}
        <div className="px-6 py-3 bg-black/10 flex items-center justify-between max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => setSelectedYear(prev => prev - 1)}
            className="p-2 rounded-xl hover:bg-white/15 transition-all text-white cursor-pointer active:scale-95"
            title="Προηγούμενο Έτος"
          >
            <ChevronLeft className="w-6 h-6 stroke-[3]" />
          </button>

          <span className="text-2xl font-black tracking-wider text-white">
            {selectedYear}
          </span>

          <button
            type="button"
            onClick={() => setSelectedYear(prev => prev + 1)}
            className="p-2 rounded-xl hover:bg-white/15 transition-all text-white cursor-pointer active:scale-95"
            title="Επόμενο Έτος"
          >
            <ChevronRight className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* ── TOP 3 SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Reservations */}
        <div className={`p-4 rounded-2xl border shadow-sm flex items-center gap-4 transition-all ${
          isDark 
            ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200' 
            : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Total</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-300">
              {totalReservationsCount}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Reservations</div>
          </div>
        </div>

        {/* Card 2: Days Booked */}
        <div className={`p-4 rounded-2xl border shadow-sm flex items-center gap-4 transition-all ${
          isDark 
            ? 'bg-sky-950/30 border-sky-800/50 text-sky-200' 
            : 'bg-sky-50/80 border-sky-200 text-sky-950'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-sky-600 dark:text-sky-400">Days</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {totalDaysBooked}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Days Booked</div>
          </div>
        </div>

        {/* Card 3: Income Net Profit */}
        <div className={`p-4 rounded-2xl border shadow-sm flex items-center gap-4 transition-all ${
          isDark 
            ? 'bg-amber-950/30 border-amber-800/50 text-amber-200' 
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">Income</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              €{totalNetProfit.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Net Profit</div>
          </div>
        </div>
      </div>

      {/* ── LEGEND BAR FOR OPERATING PERIOD & BOOKINGS ── */}
      <div className={`p-3 rounded-xl border text-xs font-semibold flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-300 border border-amber-400"></span>
            <span>Κρατημένο</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-700"></span>
            <span>Διαθέσιμο Ενοικίασης</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 line-through font-bold">12</span>
            <span className="text-slate-400">(Εκτός Περιόδου 15/05 - 15/10)</span>
          </div>
        </div>
      </div>

      {/* ── 12 MONTHS GRID CARDS ── */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm">Φόρτωση ημερολογίου...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {monthNames.map((monthName, monthIdx) => {
            const bookedCount = getBookedDaysCountForMonth(selectedYear, monthIdx);
            
            // Calculate calendar grid for this month
            const firstDayIndex = new Date(selectedYear, monthIdx, 1).getDay(); // 0 = Sunday
            const totalDaysInMonth = new Date(selectedYear, monthIdx + 1, 0).getDate();

            return (
              <div
                key={monthName}
                className={`p-4 rounded-2xl border shadow-md transition-all ${
                  isDark 
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' 
                    : 'bg-white border-slate-200 hover:shadow-lg'
                }`}
              >
                {/* Month Card Header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/40">
                  <h3 className={`text-base font-extrabold ${
                    isDark ? 'text-indigo-300' : 'text-indigo-900'
                  }`}>
                    {monthName}
                  </h3>

                  {/* Month Booked Days Badge */}
                  <span className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center transition-all ${
                    bookedCount > 0
                      ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-400/30'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {bookedCount}
                  </span>
                </div>

                {/* Weekday Labels (S M T W T F S) */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {weekDays.map((wd, i) => (
                    <div key={`${monthName}-wd-${i}`} className="text-[11px] font-bold text-slate-400">
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {/* Empty cells before day 1 */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${monthIdx}-${i}`} className="h-7"></div>
                  ))}

                  {/* Actual Days 1..N */}
                  {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const res = getBookedReservationForDate(selectedYear, monthIdx, dayNum);
                    const isBooked = Boolean(res);
                    const isClosed = !isBooked && isDateOutsideOperatingPeriod(monthIdx, dayNum);

                    return (
                      <div
                        key={`day-${monthIdx}-${dayNum}`}
                        onClick={() => res && setActiveResPopup(res)}
                        className={`h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                          isBooked
                            ? 'bg-amber-300 text-slate-950 font-black cursor-pointer hover:scale-110 shadow-sm shadow-amber-400/40'
                            : isClosed
                              ? 'line-through opacity-35 text-slate-500 bg-slate-100 dark:bg-slate-950/40 cursor-not-allowed'
                              : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                        title={
                          res 
                            ? `${res.customers?.name || 'Booked'} (${res.platforms?.name || ''})` 
                            : isClosed 
                              ? 'Εκτός Περιόδου Ενοικίασης (15/05 - 15/10)' 
                              : 'Διαθέσιμο'
                        }
                      >
                        {dayNum}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RESERVATION DETAILS POPUP ── */}
      {activeResPopup && (() => {
        const { fee, netFee } = calculateFinancials(
          activeResPopup.fee,
          activeResPopup.platforms?.plat_commission || 0,
          activeResPopup.platforms?.commission || 0
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-extrabold">Κράτηση #{activeResPopup.reser_id}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveResPopup(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm text-sky-400">
                  <User className="w-4 h-4" />
                  <span>{activeResPopup.customers?.name || 'N/A'}</span>
                  {activeResPopup.customers?.nationality?.nationality && (
                    <span className="text-xs text-slate-400 font-normal">
                      ({activeResPopup.customers.nationality.nationality})
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Ημερομηνίες:</span>
                  <span className="font-bold text-white">
                    {formatDateDisplay(activeResPopup.start_date)} ➔ {formatDateDisplay(activeResPopup.end_date)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Πλατφόρμα:</span>
                  <span className="font-bold text-sky-400">{activeResPopup.platforms?.name || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Σπίτι:</span>
                  <span className="font-bold text-indigo-400">{activeResPopup.houses?.house_name || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-800">
                  <span>Net Fee (Καθαρό Εισόδημα):</span>
                  <span className="font-extrabold text-sm text-emerald-400">
                    €{netFee.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveResPopup(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
