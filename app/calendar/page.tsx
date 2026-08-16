'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Reservation, House, TaxKlimaka, TaxKlimakaItem, getTaxDiscountPercentage, calculateProgressiveTax } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  BarChart3, 
  TrendingUp, 
  Calendar as CalendarIcon,
  X,
  User,
  Users,
  FileText,
  Pencil,
  Ban,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  Star
} from 'lucide-react';

interface HousePeriodEntry {
  yearFrom: number;
  yearTo: number;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

function getDefaultHousePeriod(year: number): HousePeriodEntry {
  return {
    yearFrom: 2000,
    yearTo: 2099,
    startMonth: 5,
    startDay: 1,
    endMonth: 10,
    endDay: 20,
  };
}

function toInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function getPeriodForYear(periods: HousePeriodEntry[], year: number): HousePeriodEntry | null {
  return periods
    .filter(period => year >= period.yearFrom && year <= period.yearTo)
    .sort((a, b) => {
      const rangeA = a.yearTo - a.yearFrom;
      const rangeB = b.yearTo - b.yearFrom;
      return rangeA - rangeB || b.yearFrom - a.yearFrom;
    })[0] ?? null;
}

function formatOperatingPeriod(period: HousePeriodEntry | null): string {
  if (!period) return 'Δεν έχει οριστεί περίοδος';
  return `${String(period.startDay).padStart(2, '0')}/${String(period.startMonth).padStart(2, '0')} - ${String(period.endDay).padStart(2, '0')}/${String(period.endMonth).padStart(2, '0')}`;
}

function isPlatformTaxable(platform: any): boolean {
  if (!platform) return false;
  const val = platform.tax_able;
  return val === true || val === 1 || val === '1' || val === 'true' || val === 't';
}

function hasIncomingTurnover(currentRes: Reservation, allReservations: Reservation[]): boolean {
  if (currentRes.canceled || !currentRes.start_date) return false;
  
  const curStart = currentRes.start_date.split('T')[0];

  return allReservations.some(other => {
    if (other.reser_id === currentRes.reser_id || other.canceled) return false;
    if (other.f_house_aid !== currentRes.f_house_aid) return false;

    const otherEnd = other.end_date ? other.end_date.split('T')[0] : '';
    return curStart === otherEnd;
  });
}

function calculateFinancials(
  rawFee: number | null | undefined,
  platformCommissionRate: number | null | undefined,
  managerCommissionRate: number | null | undefined
) {
  const fee = Number(rawFee || 0);
  const platRate = Number(platformCommissionRate || 0);
  const mgrRate = Number(managerCommissionRate || 0);

  const platformCommission = fee * platRate;
  const remainingAfterPlatform = fee - platformCommission;
  const managerCommission = remainingAfterPlatform * mgrRate;
  const netFee = fee - platformCommission - managerCommission;

  return { fee, platformCommission, managerCommission, netFee };
}

function computePeriodFinancials(
  resList: Reservation[], 
  taxItems: TaxKlimakaItem[], 
  taxKlimakaList: TaxKlimaka[] = [],
  targetYear?: number
) {
  let activeCount = 0;
  let cancelCount = 0;
  let totalFee = 0;
  let taxableFee = 0;
  let totalDays = 0;
  let taxableDays = 0;
  let totalPlatComm = 0;
  let totalMgrComm = 0;
  let totalNetFee = 0;

  resList.forEach(res => {
    if (res.canceled) {
      cancelCount++;
      return;
    }

    activeCount++;
    const fee = Number(res.fee || 0);
    const platRate = Number(res.platforms?.plat_commission || 0);
    const mgrRate = Number(res.platforms?.commission || 0);
    const isTaxable = isPlatformTaxable(res.platforms);

    let days = 0;
    if (res.start_date && res.end_date) {
      const s = new Date(res.start_date).getTime();
      const e = new Date(res.end_date).getTime();
      if (!isNaN(s) && !isNaN(e)) {
        days = Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24));
      }
    }

    totalFee += fee;
    totalDays += days;

    if (isTaxable) {
      taxableFee += fee;
      taxableDays += days;
    }

    const { platformCommission, managerCommission, netFee } = calculateFinancials(res.fee, platRate, mgrRate);

    totalPlatComm += platformCommission;
    totalMgrComm += managerCommission;
    totalNetFee += netFee;
  });

  const perivalon = taxableDays * 15;
  const totalCommissions = totalPlatComm + totalMgrComm + perivalon;
  const discountPct = getTaxDiscountPercentage(taxKlimakaList, targetYear);
  const effectiveTaxableAmount = discountPct > 0 ? taxableFee * (1 - discountPct / 100) : taxableFee;
  const tax = calculateProgressiveTax(taxableFee, taxItems, discountPct);
  const netIncomeAfterTax = totalNetFee - tax;

  return {
    activeCount,
    cancelCount,
    totalFee,
    taxableFee,
    discountPct,
    effectiveTaxableAmount,
    totalDays,
    taxableDays,
    totalPlatComm,
    totalMgrComm,
    perivalon,
    totalCommissions,
    totalNetFee,
    tax,
    netIncomeAfterTax
  };
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
  const router = useRouter();
  const { theme, assignedHouseIds, selectedHouseId: globalSelectedHouseId } = useAuth();
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedHouseId, setSelectedHouseId] = useState<number>(1);
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [housePeriods, setHousePeriods] = useState<Record<number, HousePeriodEntry[]>>({});
  const [taxItems, setTaxItems] = useState<TaxKlimakaItem[]>([]);
  const [taxKlimaka, setTaxKlimaka] = useState<TaxKlimaka[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Selected reservation details popup
  const [activeResPopup, setActiveResPopup] = useState<Reservation | null>(null);

  // Toggle cancellation for active popup reservation
  const handleToggleCancel = async (res: Reservation) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/reservations/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reser_id: res.reser_id,
          canceled: !res.canceled
        })
      });
      const json = await response.json();
      if (json.success) {
        await fetchData();
        setActiveResPopup(prev => prev ? { ...prev, canceled: !prev.canceled } : null);
      }
    } catch (err) {
      console.error('Cancel toggle error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Reference for current month card scrolling
  const currentMonthRef = useRef<HTMLDivElement | null>(null);

  const currentMonthIdx = new Date().getMonth();
  const currentYearNum = new Date().getFullYear();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/reservations', { cache: 'no-store' });
      const json = await res.json();
      
      if (json.houses && json.houses.length > 0) {
        let filteredHouses = json.houses;
        if (assignedHouseIds.length > 0) {
          filteredHouses = json.houses.filter((h: House) => assignedHouseIds.includes(h.house_aid));
        }
        setHouses(filteredHouses);
        
        // Default to first specific house
        if (filteredHouses.length > 0) {
          setSelectedHouseId(filteredHouses[0].house_aid);
        }
      }
      
      if (json.reservations) {
        setReservations(json.reservations);
      }

      if (json.taxKlimakaItems) {
        setTaxItems(json.taxKlimakaItems);
      }

      if (json.taxKlimaka) {
        setTaxKlimaka(json.taxKlimaka);
      }

      const normalizedPeriods: Record<number, HousePeriodEntry[]> = {};
      if (json.housePeriods && typeof json.housePeriods === 'object') {
        Object.entries(json.housePeriods as Record<string, any>).forEach(([houseId, value]) => {
          const rows = Array.isArray(value) ? value : [value];
          normalizedPeriods[Number(houseId)] = rows
            .map(period => ({
              yearFrom: toInteger(period?.yearFrom, 0),
              yearTo: toInteger(period?.yearTo, 9999),
              startMonth: toInteger(period?.startMonth, 1),
              startDay: toInteger(period?.startDay, 1),
              endMonth: toInteger(period?.endMonth, 12),
              endDay: toInteger(period?.endDay, 31),
            }))
            .filter(period =>
              period.yearFrom <= period.yearTo &&
              period.startMonth >= 1 && period.startMonth <= 12 &&
              period.endMonth >= 1 && period.endMonth <= 12 &&
              period.startDay >= 1 && period.startDay <= 31 &&
              period.endDay >= 1 && period.endDay <= 31
            );
        });
      }
      setHousePeriods(normalizedPeriods);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Sync global selected house if set to a specific house
  useEffect(() => {
    if (globalSelectedHouseId && globalSelectedHouseId !== 'ALL') {
      setSelectedHouseId(Number(globalSelectedHouseId));
    }
  }, [globalSelectedHouseId]);

  // Scroll to current month when loading completes or year changes
  useEffect(() => {
    if (!loading && selectedYear === currentYearNum && currentMonthRef.current) {
      setTimeout(() => {
        currentMonthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [loading, selectedYear, currentYearNum]);

  const configuredOperatingPeriod = getPeriodForYear(housePeriods[selectedHouseId] ?? [], selectedYear);
  const currentOperatingPeriod = configuredOperatingPeriod ?? getDefaultHousePeriod(selectedYear);
  const currentOperatingPeriodLabel = formatOperatingPeriod(currentOperatingPeriod);

  // 1. Filter active non-canceled reservations for selected year & SPECIFIC house
  const activeYearReservations = reservations.filter(res => {
    if (res.canceled) return false;

    if (res.f_house_aid !== selectedHouseId) {
      return false;
    }

    const startYear = parseInt(getYearFromIso(res.start_date), 10);
    const endYear = parseInt(getYearFromIso(res.end_date), 10);

    return startYear === selectedYear || endYear === selectedYear;
  });

  // 2. Compute Top 2 KPI Metrics
  const totalReservationsCount = activeYearReservations.length;
  let nonTaxableReservationsCount = 0;
  let totalDaysBooked = 0;
  let nonTaxableDaysBooked = 0;

  activeYearReservations.forEach(res => {
    const isTaxable = isPlatformTaxable(res.platforms);
    if (!isTaxable) {
      nonTaxableReservationsCount++;
    }

    if (res.start_date && res.end_date) {
      const s = new Date(res.start_date).getTime();
      const e = new Date(res.end_date).getTime();
      if (!isNaN(s) && !isNaN(e)) {
        const days = Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24));
        totalDaysBooked += days;
        if (!isTaxable) {
          nonTaxableDaysBooked += days;
        }
      }
    }
  });



  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Weekday headers
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

  // Helper to check if a day is a TURNOVER date (where one reservation ends and another starts)
  function isTurnoverDay(yearNum: number, monthIdx: number, dayNum: number): boolean {
    const mStr = String(monthIdx + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const targetIsoStr = `${yearNum}-${mStr}-${dStr}`;

    const hasCheckout = activeYearReservations.some(r => r.end_date && r.end_date.split('T')[0] === targetIsoStr);
    const hasCheckin = activeYearReservations.some(r => r.start_date && r.start_date.split('T')[0] === targetIsoStr);

    return hasCheckout && hasCheckin;
  }

  // Helper to check if a date is OUTSIDE the house operating period
  function isDateOutsideOperatingPeriod(monthIdx: number, dayNum: number): boolean {
    if (!currentOperatingPeriod) return true;

    const target = new Date(Date.UTC(selectedYear, monthIdx, dayNum));
    const periodStart = new Date(Date.UTC(
      selectedYear,
      currentOperatingPeriod.startMonth - 1,
      currentOperatingPeriod.startDay
    ));
    const endYear = currentOperatingPeriod.endMonth < currentOperatingPeriod.startMonth
      ? selectedYear + 1
      : selectedYear;
    const periodEnd = new Date(Date.UTC(
      endYear,
      currentOperatingPeriod.endMonth - 1,
      currentOperatingPeriod.endDay
    ));

    return target < periodStart || target > periodEnd;
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
    <div className="h-full flex flex-col max-w-6xl mx-auto w-full overflow-hidden space-y-4">
      {/* ── FRAME 1: TOP FIXED FRAME (HEADER & KPI METRICS) ── */}
      <div className={`p-4 rounded-2xl border-2 shadow-md shrink-0 space-y-3.5 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* PURPLE HEADER BAR */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-2xl shadow-lg p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Title & Operating Period Subtitle */}
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-indigo-200 shrink-0" />
              <div>
                <h1 className="text-lg font-extrabold tracking-wide">Year Calendar</h1>
                <p className="text-[11px] text-indigo-200">
                  Περίοδος Ενοικίασης: <strong className="text-amber-300">{currentOperatingPeriodLabel}</strong>
                </p>
              </div>
            </div>

            {/* Center: Year Selector Navigation (< 2026 >) */}
            <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-xl border border-white/20 shadow-inner mx-auto sm:mx-0">
              <button
                type="button"
                onClick={() => setSelectedYear(prev => prev - 1)}
                className="p-1 rounded-lg hover:bg-white/20 transition-all text-white cursor-pointer active:scale-95"
                title="Προηγούμενο Έτος"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
              </button>

              <span className="text-lg font-black tracking-widest text-white px-2">
                {selectedYear}
              </span>

              <button
                type="button"
                onClick={() => setSelectedYear(prev => prev + 1)}
                className="p-1 rounded-lg hover:bg-white/20 transition-all text-white cursor-pointer active:scale-95"
                title="Επόμενο Έτος"
              >
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Right: Single House Selector Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedHouseId}
                onChange={(e) => setSelectedHouseId(Number(e.target.value))}
                className="bg-black/30 hover:bg-black/40 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl border border-white/20 focus:outline-none cursor-pointer"
              >
                {houses.map(h => (
                  <option key={h.house_aid} value={h.house_aid} className="bg-slate-900 text-white font-bold">
                    {h.house_name?.trim() || `House #${h.house_aid}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TOP 2 KPI SUMMARY CARDS (Hidden on mobile, visible on desktop/tablet) */}
        <div className="hidden sm:grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
            isDark 
              ? 'bg-slate-950/80 border-slate-800 text-white' 
              : 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-indigo-400">Reservations</div>
              <div className="text-xl font-black text-sky-400 flex items-baseline gap-1.5">
                <span>{totalReservationsCount}</span>
                {nonTaxableReservationsCount > 0 && (
                  <span className="text-xs font-bold text-slate-400">({nonTaxableReservationsCount})</span>
                )}
              </div>
              <div className="text-[10px] font-bold text-slate-400">Total Reservations</div>
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
            isDark 
              ? 'bg-slate-950/80 border-slate-800 text-white' 
              : 'bg-sky-50/80 border-sky-200 text-sky-950'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-sky-400">Days</div>
              <div className="text-xl font-black text-emerald-400 flex items-baseline gap-1.5">
                <span>{totalDaysBooked}</span>
                {nonTaxableDaysBooked > 0 && (
                  <span className="text-xs font-bold text-slate-400">({nonTaxableDaysBooked})</span>
                )}
              </div>
              <div className="text-[10px] font-bold text-slate-400">Days Booked</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FRAME 2: BOTTOM SCROLLABLE FRAME (CALENDAR GRID) ── */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-20">
        {/* Legend Bar */}
        <div className={`p-3 rounded-xl border text-xs font-semibold flex flex-wrap items-center justify-between gap-3 mb-4 ${
          isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-300 border border-amber-400"></span>
              <span>Κρατημένο</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-rose-600 text-white font-black text-[10px] flex items-center justify-center">15</span>
              <span className="text-rose-500 font-bold">Ημέρα (CheckOut/CheckIn)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-700"></span>
              <span>Διαθέσιμο Ενοικίασης</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 line-through font-bold">12</span>
              <span className="text-slate-400">(Εκτός Περιόδου {currentOperatingPeriodLabel})</span>
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
            const isCurrentMonth = selectedYear === currentYearNum && monthIdx === currentMonthIdx;
            
            const firstDayIndex = new Date(selectedYear, monthIdx, 1).getDay();
            const totalDaysInMonth = new Date(selectedYear, monthIdx + 1, 0).getDate();

            return (
              <div
                key={monthName}
                ref={isCurrentMonth ? currentMonthRef : null}
                className={`p-4 rounded-2xl border shadow-md transition-all relative ${
                  isCurrentMonth
                    ? isDark 
                      ? 'bg-slate-900 border-indigo-500/80 ring-2 ring-indigo-500/40 shadow-indigo-500/10' 
                      : 'bg-white border-indigo-500/80 ring-2 ring-indigo-500/30 shadow-indigo-500/10'
                    : isDark 
                      ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' 
                      : 'bg-white border-slate-200 hover:shadow-lg'
                }`}
              >
                {/* Current Month Active Badge */}
                {isCurrentMonth && (
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md">
                    Τρέχων Μήνας
                  </span>
                )}

                {/* Month Card Header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/40">
                  <h3 className={`text-base font-extrabold ${
                    isCurrentMonth 
                      ? 'text-indigo-400 font-black' 
                      : isDark ? 'text-indigo-300' : 'text-indigo-900'
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
                    const isTurnover = isTurnoverDay(selectedYear, monthIdx, dayNum);
                    const isBooked = Boolean(res);
                    const isClosed = !isBooked && isDateOutsideOperatingPeriod(monthIdx, dayNum);

                    return (
                      <div
                        key={`day-${monthIdx}-${dayNum}`}
                        onClick={() => res && setActiveResPopup(res)}
                        className={`h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition-all ${
                          isTurnover
                            ? 'bg-rose-600 text-white font-black cursor-pointer hover:scale-110 shadow-md shadow-rose-600/40 ring-2 ring-rose-400'
                            : isBooked
                              ? 'bg-amber-300 text-slate-950 font-black cursor-pointer hover:scale-110 shadow-sm shadow-amber-400/40'
                              : isClosed
                                ? 'line-through opacity-35 text-slate-500 bg-slate-100 dark:bg-slate-950/40 cursor-not-allowed'
                                : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                        title={
                          isTurnover
                            ? `⚠️ Ημέρα (CheckOut/CheckIn)`
                            : res 
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
      </div>{/* end Frame 2 */}

      {/* ── RESERVATION DETAILS MODAL (Identical to Reservations page) ── */}
      {activeResPopup && (() => {
        const { fee, platformCommission, managerCommission, netFee } = calculateFinancials(
          activeResPopup.fee,
          activeResPopup.platforms?.plat_commission || 0,
          activeResPopup.platforms?.commission || 0
        );
        const natName = activeResPopup.customers?.nationality?.nationality || '';
        const isIncomingTurnover = hasIncomingTurnover(activeResPopup, reservations);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl relative transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-lg font-extrabold flex items-center gap-2">
                    <span>Κράτηση #{activeResPopup.reser_id}</span>
                    {activeResPopup.canceled ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Ακυρώθηκε</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Ενεργή</span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">Πληροφορίες κράτησης & πελάτη</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveResPopup(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-sm">
                <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <User className="w-5 h-5 text-sky-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Πελάτης</p>
                    <p className="font-bold text-base mt-0.5">
                      {activeResPopup.customers?.name || 'N/A'}
                      {natName && <span className="ml-1.5 text-xs font-semibold text-sky-400 font-normal">({natName})</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{activeResPopup.customers?.email || 'Χωρίς Email'}</p>
                    <p className="text-xs text-slate-400">{activeResPopup.customers?.phone || 'Χωρίς Τηλέφωνο'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl border ${
                    isIncomingTurnover 
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' 
                      : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <CalendarIcon className="w-4 h-4 text-indigo-400" />
                        <span>Ημερομηνίες</span>
                      </div>
                      {isIncomingTurnover && <span className="text-[10px] font-black text-rose-500">⚠️ (CheckOut/CheckIn)</span>}
                    </div>
                    <p className="text-xs font-semibold text-slate-300">
                      {formatDateDisplay(activeResPopup.start_date)} ➔ {formatDateDisplay(activeResPopup.end_date)}
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Επισκέπτες</span>
                    </div>
                    <p className="text-xs font-bold">{activeResPopup.num_of_visitors} Ενήλικες {activeResPopup.kids > 0 && `, ${activeResPopup.kids} Παιδιά`}</p>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Πλατφόρμα:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sky-400 font-bold">{activeResPopup.platforms?.name}</span>
                      {activeResPopup.rank != null && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-1 text-[11px]">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>Αξιολόγηση: {activeResPopup.rank}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Αρχικό Fee:</span>
                    <span className="font-semibold">€{fee.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Προμήθεια Πλατφόρμας:</span>
                    <span className="text-rose-400 font-semibold">-€{platformCommission.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Προμήθεια Manager:</span>
                    <span className="text-indigo-400 font-semibold">-€{managerCommission.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-base font-bold">
                    <span>Καθαρό Ποσό (Net Fee):</span>
                    <span className="text-emerald-500">€{netFee.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {(activeResPopup.notes || activeResPopup.comments) && (
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Σημειώσεις</span>
                    </div>
                    <p className="text-xs italic text-slate-300">{activeResPopup.notes || activeResPopup.comments}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/?edit=${activeResPopup.reser_id}`);
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Επεξεργασία</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleToggleCancel(activeResPopup)}
                    className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 ${
                      activeResPopup.canceled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {actionLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : activeResPopup.canceled ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Επαναφορά</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5" />
                        <span>Ακύρωση</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveResPopup(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
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
