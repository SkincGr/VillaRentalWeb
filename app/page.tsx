'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Reservation, House, Platform, Nationality } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { 
  Eye, 
  X, 
  Ban, 
  User, 
  Calendar as CalendarIcon, 
  Users, 
  FileText,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  BarChart3,
  TrendingUp,
  Receipt,
  PieChart,
  Trees,
  AlertTriangle,
  Pencil,
  Trash2,
  Save,
  Globe
} from 'lucide-react';

export interface TaxKlimakaItem {
  tax_klimaka_items_aid: number;
  f_tax_klimaka_aid: number;
  from_amount: number;
  to_amount: number;
  pososto: number;
}

// Helper to safely check if a platform is taxable (handles boolean, integer 1/0, and strings 'true'/'false'/'1'/'0')
function isPlatformTaxable(platform: any): boolean {
  if (!platform) return false;
  const val = platform.tax_able;
  if (val === true || val === 1 || val === '1' || val === 'true' || val === 't') {
    return true;
  }
  return false;
}

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

// Helper to format ISO date string for HTML <input type="date"> (YYYY-MM-DD)
function formatDateInput(isoString: string | null | undefined): string {
  if (!isoString) return '';
  return isoString.split('T')[0];
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

// Helper to check if a reservation date has already expired (end_date < today)
function isReservationExpired(endDateIso: string | null | undefined): boolean {
  if (!endDateIso) return false;
  const todayStr = new Date().toISOString().split('T')[0]; // e.g. "2026-08-05"
  const endStr = endDateIso.split('T')[0];
  return endStr < todayStr;
}

// Helper to calculate single reservation financials:
function calculateFinancials(feeNum: number, platCommRate: number, managerCommRate: number) {
  const fee = Number(feeNum || 0);
  const platComm = fee * Number(platCommRate || 0);
  const remaining = fee - platComm;
  const mgrComm = remaining * Number(managerCommRate || 0);
  const netFee = fee - platComm - mgrComm;

  return {
    fee,
    platformCommission: platComm,
    managerCommission: mgrComm,
    netFee
  };
}

// Progressive Tax Calculation algorithm (Tax_Klimaka_Items for Natural Person / f_tax_klimaka_aid: 1)
function calculateProgressiveTax(taxableGrossFee: number, items: TaxKlimakaItem[]): number {
  if (taxableGrossFee <= 0) return 0;
  
  const brackets = items.length > 0 
    ? items.filter(i => i.f_tax_klimaka_aid === 1).sort((a, b) => a.from_amount - b.from_amount)
    : [
        { tax_klimaka_items_aid: 1, f_tax_klimaka_aid: 1, from_amount: 0, to_amount: 12000, pososto: 15 },
        { tax_klimaka_items_aid: 2, f_tax_klimaka_aid: 1, from_amount: 12000, to_amount: 25000, pososto: 35 },
        { tax_klimaka_items_aid: 3, f_tax_klimaka_aid: 1, from_amount: 25000, to_amount: 1000000, pososto: 45 }
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

// Helper to compute aggregate financial metrics for a list of reservations
function computePeriodFinancials(resList: Reservation[], taxItems: TaxKlimakaItem[]) {
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

    // Duration days
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

  return {
    activeCount,
    cancelCount,
    totalFee,
    taxableFee,
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

export default function ReservationsPage() {
  const { user, role, ownerId, selectedHouseId: globalSelectedHouseId, assignedHouseIds, theme } = useAuth();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [taxItems, setTaxItems] = useState<TaxKlimakaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedHouseId, setSelectedHouseId] = useState<number | 'ALL'>('ALL');
  const [onlyCurrent, setOnlyCurrent] = useState<boolean>(false);
  const [hideCancelled, setHideCancelled] = useState<boolean>(false);

  // Modals
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [showFinancialModal, setShowFinancialModal] = useState<boolean>(false);
  const [editingRes, setEditingRes] = useState<Partial<Reservation> & { customer_name?: string; f_nationallity_aid?: number } | null>(null);
  const [deletingResId, setDeletingResId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [role, ownerId]);

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

      if (json.taxKlimakaItems) {
        setTaxItems(json.taxKlimakaItems);
      }

      if (json.platforms) {
        setPlatforms(json.platforms);
      }

      if (json.nationalities) {
        setNationalities(json.nationalities);
      }
    } catch (err) {
      console.error('Fetch error:', err);
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

  // Toggle reservation cancellation status
  const handleToggleCancel = async (res: Reservation) => {
    setActionLoading(true);
    const newStatus = !res.canceled;

    try {
      const response = await fetch('/api/reservations/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reser_id: res.reser_id, canceled: newStatus })
      });

      const json = await response.json();
      if (json.success) {
        setReservations(prev => prev.map(r => r.reser_id === res.reser_id ? { ...r, canceled: newStatus } : r));
        setSelectedRes(prev => prev ? { ...prev, canceled: newStatus } : null);
      } else {
        alert('Σφάλμα ενημέρωσης: ' + (json.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error toggling cancellation:', err);
      alert('Σφάλμα σύνδεσης κατά την ακύρωση/επαναφορά');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal for a reservation
  const handleOpenEdit = (res: Reservation) => {
    setEditingRes({
      reser_id: res.reser_id,
      f_custom_id: res.f_custom_id,
      customer_name: res.customers?.name || '',
      f_nationallity_aid: res.customers?.f_nationallity_aid || (res.customers?.nationality?.nationality_aid),
      start_date: formatDateInput(res.start_date),
      end_date: formatDateInput(res.end_date),
      fee: res.fee,
      num_of_visitors: res.num_of_visitors,
      kids: res.kids,
      f_platform_id: res.f_platform_id,
      f_house_aid: res.f_house_aid || 1,
      notes: res.notes || '',
      comments: res.comments || ''
    });
  };

  // Save edited reservation
  const handleSaveEdit = async () => {
    if (!editingRes || !editingRes.reser_id) return;
    setActionLoading(true);

    try {
      const response = await fetch('/api/reservations/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRes)
      });

      const json = await response.json();
      if (json.success) {
        await fetchData(); // Re-fetch clean joined data
        setEditingRes(null);
        setSelectedRes(null);
      } else {
        alert('Σφάλμα αποθήκευσης: ' + (json.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error saving reservation:', err);
      alert('Σφάλμα σύνδεσης κατά την αποθήκευση');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm & Delete reservation
  const handleDeleteReservation = async (reserId: number) => {
    setActionLoading(true);

    try {
      const response = await fetch('/api/reservations/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reser_id: reserId })
      });

      const json = await response.json();
      if (json.success) {
        setReservations(prev => prev.filter(r => r.reser_id !== reserId));
        setDeletingResId(null);
        setSelectedRes(null);
        setEditingRes(null);
      } else {
        alert('Σφάλμα διαγραφής: ' + (json.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error deleting reservation:', err);
      alert('Σφάλμα σύνδεσης κατά τη διαγραφή');
    } finally {
      setActionLoading(false);
    }
  };

  // 1. BASE YEAR & HOUSE RESERVATIONS (ALL records for selected year & house)
  const baseYearAndHouseReservations = reservations.filter((res) => {
    if (assignedHouseIds.length > 0 && res.f_house_aid) {
      if (!assignedHouseIds.includes(res.f_house_aid)) return false;
    }

    if (selectedHouseId !== 'ALL' && res.f_house_aid !== selectedHouseId) {
      return false;
    }

    const resYear = getYearFromIso(res.start_date);
    if (resYear !== selectedYear) {
      return false;
    }

    return true;
  });

  // 2. FILTERED RESERVATIONS FOR THE CARD LIST (sorted by start_date ASCENDING)
  const filteredReservations = baseYearAndHouseReservations
    .filter((res) => {
      if (hideCancelled && res.canceled) {
        return false;
      }

      if (onlyCurrent && isReservationExpired(res.end_date)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));

  // Counters for the list view
  const listTotalCount = filteredReservations.length;
  const listCancelledCount = filteredReservations.filter(r => r.canceled).length;

  // INCOME FOR THE SUMMARY BAR (Sum of Net Fee for non-canceled VISIBLE reservations on screen)
  const visibleNetIncome = filteredReservations
    .filter(r => !r.canceled)
    .reduce((sum, res) => {
      const { netFee } = calculateFinancials(
        res.fee,
        res.platforms?.plat_commission || 0,
        res.platforms?.commission || 0
      );
      return sum + netFee;
    }, 0);

  // FINANCIAL MODAL CALCULATIONS (Always uses ALL records for selected year & house)
  const actualFinancials = computePeriodFinancials(baseYearAndHouseReservations, taxItems);

  // Potential Financials (assuming 0 cancellations)
  const potentialFinancials = computePeriodFinancials(
    baseYearAndHouseReservations.map(r => ({ ...r, canceled: false })),
    taxItems
  );

  const cancellationLoss = Math.max(0, potentialFinancials.netIncomeAfterTax - actualFinancials.netIncomeAfterTax);

  const isDark = theme === 'dark';

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* ── FILTER & SUMMARY PANEL ── */}
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

          {/* Action Buttons: Toggle Όλα/Τρέχοντα & Hide Cancelled */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle Όλα / Τρέχοντα */}
            <button
              type="button"
              onClick={() => setOnlyCurrent(!onlyCurrent)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                onlyCurrent
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/20'
                  : isDark
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-slate-200/80 border-slate-300 text-slate-700 hover:bg-slate-300'
              }`}
              title={onlyCurrent ? 'Εμφάνιση μόνο τρεχουσών/μελλοντικών κρατήσεων' : 'Εμφάνιση όλων των κρατήσεων'}
            >
              {onlyCurrent ? <Clock className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
              <span>{onlyCurrent ? 'Τρέχοντα' : 'Όλα'}</span>
            </button>

            {/* Toggle Hide Cancelled Button */}
            <button
              type="button"
              onClick={() => setHideCancelled(!hideCancelled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
        </div>

        {/* Counter & Summary Line: Reservations | Income | Financial Details Button */}
        <div className={`mt-3 pt-3 border-t text-xs font-semibold flex flex-wrap items-center justify-between gap-2.5 ${
          isDark ? 'border-slate-800 text-slate-400' : 'border-sky-200/80 text-sky-900'
        }`}>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span>Reservations: </span>
              <span className="font-bold text-sky-500">{listTotalCount}</span>
            </div>

            <span>|</span>

            <div>
              <span>Income: </span>
              <span className="font-extrabold text-emerald-400">
                €{visibleNetIncome.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <span>|</span>

            {/* Financial Summary Icon Button */}
            <button
              type="button"
              onClick={() => setShowFinancialModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all cursor-pointer shadow-sm"
              title="Αναλυτικά Οικονομικά Στοιχεία & Φόρος (Όλες οι εγγραφές του έτους)"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Οικονομικά Στοιχεία</span>
            </button>
          </div>

          {listCancelledCount > 0 && (
            <div className="flex items-center gap-1 text-rose-500">
              <Ban className="w-3.5 h-3.5" />
              <span>{listCancelledCount} cancelled</span>
            </div>
          )}
        </div>
      </div>

      {/* ── RESERVATION CARDS LIST (Sorted by start_date ASCENDING) ── */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm">Φόρτωση κρατήσεων...</p>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border text-slate-400 ${
          isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <p className="text-sm">Δεν βρέθηκαν κρατήσεις για τα επιλεγμένα φίλτρα ({selectedYear}).</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReservations.map((res) => {
            const startDisplay = formatDateDisplay(res.start_date);
            const endDisplay = formatDateDisplay(res.end_date);
            const monthBadge = getMonthBadge(res.start_date);
            const expired = isReservationExpired(res.end_date);
            const nationalityName = res.customers?.nationality?.nationality || '';
            
            // Duration calculation
            let diffDays = 0;
            if (res.start_date && res.end_date) {
              const s = new Date(res.start_date).getTime();
              const e = new Date(res.end_date).getTime();
              if (!isNaN(s) && !isNaN(e)) {
                diffDays = Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24));
              }
            }

            // Financial Calculations
            const { fee, managerCommission, netFee } = calculateFinancials(
              res.fee,
              res.platforms?.plat_commission || 0,
              res.platforms?.commission || 0
            );

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
                {/* Top Row: Customer Name, Nationality Badge & Month Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {/* Customer Name & Nationality Badge Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-base font-extrabold tracking-tight flex items-center gap-2 ${
                        res.canceled 
                          ? 'line-through text-rose-500' 
                          : isDark ? 'text-indigo-300' : 'text-indigo-900'
                      }`}>
                        {res.canceled && <Ban className="w-4 h-4 text-rose-500 shrink-0" />}
                        <span>{res.customers?.name || 'Unknown Customer'}</span>
                      </h3>

                      {/* Prominent Nationality Badge */}
                      {nationalityName && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1 shadow-sm">
                          <Globe className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>{nationalityName}</span>
                        </span>
                      )}
                    </div>

                    {/* Status Badges Row (Cancelled / Expired) */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {res.canceled && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30">
                          🚫 ΑΚΥΡΩΘΗΚΕ
                        </span>
                      )}
                      {expired && !res.canceled && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          Έληξε
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Month Badge & Action Icons: Eye, Pencil Edit, Trash Delete */}
                  <div className="flex items-center gap-1.5">
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm mr-1">
                      {monthBadge}
                    </span>

                    {/* Eye Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRes(res);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-all cursor-pointer"
                      title="Προβολή"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(res);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer"
                      title="Επεξεργασία / Διόρθωση"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingResId(res.reser_id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Διαγραφή Κράτησης"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Dates & Duration Row */}
                <div className="mt-2 text-xs font-semibold text-slate-400 italic">
                  <span>{startDisplay} - {endDisplay}</span>
                  {diffDays > 0 && <span className="ml-1 text-slate-500">({diffDays} days)</span>}
                </div>

                {/* Fee / Manager Commission Line (Below Date) */}
                <div className="mt-1 text-xs font-medium text-slate-400 flex items-center gap-2">
                  <span>Fee: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>€{fee.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</strong></span>
                  <span>/</span>
                  <span>Manager: <strong className="text-indigo-400">€{managerCommission.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</strong></span>
                </div>

                {/* Details Subtitle Row & Green Net Price Tag */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-400 space-x-1.5">
                    <span className="font-semibold text-sky-400">{res.platforms?.name || 'N/A'}</span>
                    <span>|</span>
                    <span>{res.num_of_visitors} persons</span>
                    {res.kids > 0 && <span>/ {res.kids} kids</span>}
                  </div>

                  {/* Green Price Tag = Net Fee */}
                  <div className={`text-base font-extrabold ${
                    res.canceled 
                      ? 'text-slate-500 line-through' 
                      : 'text-emerald-500'
                  }`}>
                    €{netFee.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── EDIT / CORRECTION MODAL (Pencil Click) ── */}
      {editingRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold">Επεξεργασία Κράτησης #{editingRes.reser_id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRes(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4 text-xs">
              {/* Customer Name & Nationality */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Όνομα Πελάτη</label>
                  <input
                    type="text"
                    value={editingRes.customer_name || ''}
                    onChange={(e) => setEditingRes({ ...editingRes, customer_name: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Εθνικότητα</label>
                  <select
                    value={editingRes.f_nationallity_aid || ''}
                    onChange={(e) => setEditingRes({ ...editingRes, f_nationallity_aid: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-sky-400' : 'bg-slate-50 border-slate-300 text-sky-600'
                    }`}
                  >
                    <option value="">Επιλέξτε Εθνικότητα...</option>
                    {nationalities.map(n => (
                      <option key={n.nationality_aid} value={n.nationality_aid}>
                        {n.nationality}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Ημερομηνία Έναρξης</label>
                  <input
                    type="date"
                    value={editingRes.start_date || ''}
                    onChange={(e) => setEditingRes({ ...editingRes, start_date: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Ημερομηνία Λήξης</label>
                  <input
                    type="date"
                    value={editingRes.end_date || ''}
                    onChange={(e) => setEditingRes({ ...editingRes, end_date: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Fee & Visitors */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Αρχικό Fee (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRes.fee ?? 0}
                    onChange={(e) => setEditingRes({ ...editingRes, fee: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border font-bold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-50 border-slate-300 text-emerald-600'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Ενήλικες</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRes.num_of_visitors ?? 1}
                    onChange={(e) => setEditingRes({ ...editingRes, num_of_visitors: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Παιδιά</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRes.kids ?? 0}
                    onChange={(e) => setEditingRes({ ...editingRes, kids: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Platform & House */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Πλατφόρμα</label>
                  <select
                    value={editingRes.f_platform_id || ''}
                    onChange={(e) => setEditingRes({ ...editingRes, f_platform_id: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-sky-400' : 'bg-slate-50 border-slate-300 text-sky-600'
                    }`}
                  >
                    {platforms.map(p => (
                      <option key={p.platform_id} value={p.platform_id}>
                        {p.name} {p.tax_able ? '(Taxable)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Σπίτι</label>
                  <select
                    value={editingRes.f_house_aid || ''}
                    onChange={(e) => setEditingRes({ ...editingRes, f_house_aid: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-indigo-400' : 'bg-slate-50 border-slate-300 text-indigo-600'
                    }`}
                  >
                    {houses.map(h => (
                      <option key={h.house_aid} value={h.house_aid}>
                        {h.house_name?.trim() || `House #${h.house_aid}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Σημειώσεις / Σχόλια</label>
                <textarea
                  rows={2}
                  value={editingRes.notes || editingRes.comments || ''}
                  onChange={(e) => setEditingRes({ ...editingRes, notes: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border font-normal ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="Επιπλέον πληροφορίες..."
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingResId(editingRes.reser_id!)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Διαγραφή</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRes(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Ακύρωση
                  </button>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:from-sky-400 hover:to-indigo-500 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-sky-500/20 disabled:opacity-50"
                  >
                    {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Αποθήκευση</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deletingResId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className={`w-full max-w-sm rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold">Επιβεβαίωση Διαγραφής</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Είστε σίγουροι ότι θέλετε να διαγράψετε οριστικά την κράτηση <strong>#{deletingResId}</strong>; Η ενέργεια αυτή δεν μπορεί να αναιρεθεί.
            </p>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingResId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Ακύρωση
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleDeleteReservation(deletingResId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Οριστική Διαγραφή</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FINANCIAL SUMMARY MODAL (Calculates on ALL records for selected year & house) ── */}
      {showFinancialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl relative transition-colors max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight">Οικονομική Αναφορά {selectedYear}</h3>
                  <p className="text-xs text-slate-400">Συνολικά στοιχεία έτους (περιλαμβάνει όλες τις εγγραφές)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFinancialModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Financial Table / Card Content */}
            <div className="space-y-4 text-xs">
              {/* SECTION A: Overview Metrics */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                    <Receipt className="w-4 h-4 text-sky-400" />
                    Reservations:
                  </span>
                  <span className="font-bold text-sm text-sky-400">{actualFinancials.activeCount}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                    <Ban className="w-4 h-4 text-rose-400" />
                    Cancelation:
                  </span>
                  <span className="font-bold text-sm text-rose-400">{actualFinancials.cancelCount}</span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/60 pt-2">
                  <span className="text-slate-400 font-semibold">Fee:</span>
                  <span className="font-bold text-sm">
                    €{actualFinancials.totalFee.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                    <span className="ml-1 text-slate-400 font-normal text-[11px]">
                      (€{actualFinancials.taxableFee.toLocaleString('el-GR', { minimumFractionDigits: 2 })} taxable)
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Days:</span>
                  <span className="font-bold text-sm">
                    {actualFinancials.totalDays} ημέρες
                    <span className="ml-1 text-slate-400 font-normal text-[11px]">
                      ({actualFinancials.taxableDays} taxable)
                    </span>
                  </span>
                </div>
              </div>

              {/* SECTION B: Commissions Breakdown */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <p className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-indigo-400" />
                  Προμήθειες & Επιβαρύνσεις
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Platform Commission:</span>
                  <span className="font-semibold text-rose-400">
                    €{actualFinancials.totalPlatComm.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Manager Commission:</span>
                  <span className="font-semibold text-indigo-400">
                    €{actualFinancials.totalMgrComm.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Perivalon calculated ONLY on Taxable Days */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Trees className="w-3.5 h-3.5 text-emerald-400" />
                    Περιβάλλον ({actualFinancials.taxableDays} ημ. * €15):
                  </span>
                  <span className="font-semibold text-emerald-400">
                    €{actualFinancials.perivalon.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 font-bold text-sm">
                  <span>Σύνολο Commissions:</span>
                  <span className="text-amber-400">
                    €{actualFinancials.totalCommissions.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* SECTION C: Income & Progressive Tax */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <p className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Έσοδα & Φόρος
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Income (Net Fee):</span>
                  <span className="font-extrabold text-sm text-emerald-400">
                    €{actualFinancials.totalNetFee.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Φόρος (Progressive Tax):</span>
                  <span className="font-bold text-sm text-rose-400">
                    -€{actualFinancials.tax.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5 text-base font-black">
                  <span>Net Income (After Tax):</span>
                  <span className="text-indigo-400">
                    €{actualFinancials.netIncomeAfterTax.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* SECTION D: Cancellation Loss */}
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-sm">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Απώλεια Λόγω Ακυρώσεων:
                  </span>
                  <span className="text-base text-rose-400 font-extrabold">
                    -€{cancellationLoss.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  * Υπολογίζεται ως η διαφορά του Net Income αν δεν υπήρχε καμία ακύρωση (€{potentialFinancials.netIncomeAfterTax.toLocaleString('el-GR', { minimumFractionDigits: 2 })}) με το τρέχον Net Income (€{actualFinancials.netIncomeAfterTax.toLocaleString('el-GR', { minimumFractionDigits: 2 })}).
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFinancialModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-white hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESERVATION DETAILS MODAL (Eye Icon Click) ── */}
      {selectedRes && (() => {
        const { fee, platformCommission, managerCommission, netFee } = calculateFinancials(
          selectedRes.fee,
          selectedRes.platforms?.plat_commission || 0,
          selectedRes.platforms?.commission || 0
        );
        const natName = selectedRes.customers?.nationality?.nationality || '';

        return (
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
                  type="button"
                  onClick={() => setSelectedRes(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
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
                    {natName && (
                      <p className="text-xs font-semibold text-sky-400 mt-0.5 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                        <span>{natName}</span>
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{selectedRes.customers?.email || 'Χωρίς Email'}</p>
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

                {/* Financial Breakdown */}
                <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Πλατφόρμα:</span>
                    <span className="text-sky-400 font-bold">{selectedRes.platforms?.name}</span>
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

              {/* Modal Footer with Actions: Edit, Delete, Toggle Cancel */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedRes)}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Επεξεργασία</span>
                  </button>

                  {/* Toggle Cancel Button */}
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleToggleCancel(selectedRes)}
                    className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 ${
                      selectedRes.canceled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {actionLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : selectedRes.canceled ? (
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
                  onClick={() => setSelectedRes(null)}
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
