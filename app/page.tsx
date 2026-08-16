'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Reservation, House, Platform, Customer, Nationality, TaxKlimaka, TaxKlimakaItem, getTaxDiscountPercentage, calculateProgressiveTax } from '@/lib/supabaseClient';
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
  Plus,
  Search,
  Globe,
  UserPlus,
  RotateCcw,
  History
} from 'lucide-react';

function isPlatformTaxable(platform: any): boolean {
  if (!platform) return false;
  const val = platform.tax_able;
  if (val === true || val === 1 || val === '1' || val === 'true' || val === 't') {
    return true;
  }
  return false;
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

function formatDateInput(isoString: string | null | undefined): string {
  if (!isoString) return '';
  return isoString.split('T')[0];
}

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

function isReservationExpired(endDateIso: string | null | undefined): boolean {
  if (!endDateIso) return false;
  const todayStr = new Date().toISOString().split('T')[0];
  const endStr = endDateIso.split('T')[0];
  return endStr < todayStr;
}

// Check if ONLY the incoming/following reservation starts on the exact day a previous reservation ends
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

export default function ReservationsPage() {
  const { user, role, ownerId, selectedHouseId: globalSelectedHouseId, assignedHouseIds, theme } = useAuth();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxItems, setTaxItems] = useState<TaxKlimakaItem[]>([]);
  const [taxKlimaka, setTaxKlimaka] = useState<TaxKlimaka[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedHouseId, setSelectedHouseId] = useState<number | 'ALL'>('ALL');
  const [onlyCurrent, setOnlyCurrent] = useState<boolean>(false);
  const [hideCancelled, setHideCancelled] = useState<boolean>(false);

  // Main Modals
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [showFinancialModal, setShowFinancialModal] = useState<boolean>(false);
  
  // Reservation Form Modal (Create or Edit)
  const [resFormModal, setResFormModal] = useState<{
    isOpen: boolean;
    isEditing: boolean;
    reser_id?: number;
    f_custom_id?: number;
    customer_name: string;
    f_nationallity_aid?: number;
    start_date: string;
    end_date: string;
    fee: number;
    advanced_payment: number;
    num_of_visitors: number;
    kids: number;
    f_platform_id: number;
    f_house_aid: number;
    notes: string;
  } | null>(null);

  // Delete Modal
  const [deletingResId, setDeletingResId] = useState<number | null>(null);

  // Sub-Modals: New Customer & New Nationality
  const [showNewCustomerModal, setShowNewCustomerModal] = useState<boolean>(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', email: '', phone: '', f_nationallity_aid: '' });

  const [showNewNationalityModal, setShowNewNationalityModal] = useState<boolean>(false);
  const [newNationalityName, setNewNationalityName] = useState('');

  // Autocomplete dropdown state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const editIdParam = searchParams.get('edit');

  useEffect(() => {
    fetchData();
  }, [role, ownerId]);

  // Handle edit trigger from URL searchParams
  useEffect(() => {
    if (editIdParam && reservations.length > 0) {
      const target = reservations.find(r => r.reser_id === Number(editIdParam));
      if (target) {
        handleOpenEditReservation(target);
      }
    }
  }, [editIdParam, reservations]);

  // Click outside to close customer dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

      if (json.taxKlimakaItems) {
        setTaxItems(json.taxKlimakaItems);
      }

      if (json.taxKlimaka) {
        setTaxKlimaka(json.taxKlimaka);
      }

      if (json.platforms) {
        setPlatforms(json.platforms);
      }

      if (json.nationalities) {
        setNationalities(json.nationalities);
      }

      if (json.customers) {
        setCustomers(json.customers);
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

  const availableYears = Array.from(
    new Set(reservations.map(r => getYearFromIso(r.start_date)).filter(Boolean))
  ).sort().reverse();

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [reservations]);

  // Open "New Reservation" Modal
  const handleOpenCreateReservation = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultHouse = selectedHouseId !== 'ALL' ? Number(selectedHouseId) : (houses[0]?.house_aid || 1);
    const defaultPlatform = platforms[0]?.platform_id || 1;

    setResFormModal({
      isOpen: true,
      isEditing: false,
      customer_name: '',
      f_custom_id: undefined,
      f_nationallity_aid: undefined,
      start_date: todayStr,
      end_date: todayStr,
      fee: 0,
      advanced_payment: 0,
      num_of_visitors: 2,
      kids: 0,
      f_platform_id: defaultPlatform,
      f_house_aid: defaultHouse,
      notes: ''
    });
  };

  // Open "Edit Reservation" Modal
  const handleOpenEditReservation = (res: Reservation) => {
    setSelectedRes(null);
    setResFormModal({
      isOpen: true,
      isEditing: true,
      reser_id: res.reser_id,
      f_custom_id: res.f_custom_id,
      customer_name: res.customers?.name || '',
      f_nationallity_aid: res.customers?.f_nationallity_aid || (res.customers?.nationality?.nationality_aid),
      start_date: formatDateInput(res.start_date),
      end_date: formatDateInput(res.end_date),
      fee: res.fee,
      advanced_payment: res.advanced_payment ?? 0,
      num_of_visitors: res.num_of_visitors,
      kids: res.kids,
      f_platform_id: res.f_platform_id || 1,
      f_house_aid: res.f_house_aid || 1,
      notes: res.notes || res.comments || ''
    });
  };

  // Save Reservation (Create or Edit)
  const handleSaveReservationForm = async () => {
    if (!resFormModal) return;
    if (!resFormModal.f_custom_id && !resFormModal.customer_name.trim()) {
      alert('Παρακαλώ επιλέξτε ή πληκτρολογήστε όνομα πελάτη');
      return;
    }

    setActionLoading(true);
    try {
      let finalCustomId = resFormModal.f_custom_id;

      if (!finalCustomId && resFormModal.customer_name.trim()) {
        const existingCust = customers.find(c => c.name.toLowerCase() === resFormModal.customer_name.trim().toLowerCase());
        if (existingCust) {
          finalCustomId = existingCust.custom_id;
        } else {
          const custRes = await fetch('/api/customers/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: resFormModal.customer_name.trim(),
              f_nationallity_aid: resFormModal.f_nationallity_aid
            })
          });
          const custJson = await custRes.json();
          if (custJson.success && custJson.customer) {
            finalCustomId = custJson.customer.custom_id;
            setCustomers(prev => [...prev, custJson.customer]);
          } else {
            alert('Σφάλμα δημιουργίας πελάτη: ' + (custJson.error || ''));
            setActionLoading(false);
            return;
          }
        }
      }

      const endpoint = resFormModal.isEditing ? '/api/reservations/update' : '/api/reservations/create';
      const payload = {
        ...resFormModal,
        f_custom_id: finalCustomId
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      if (json.success) {
        await fetchData();
        setResFormModal(null);
        setSelectedRes(null);
      } else {
        alert('Σφάλμα αποθήκευσης κράτησης: ' + (json.error || ''));
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Σφάλμα σύνδεσης');
    } finally {
      setActionLoading(false);
    }
  };

  // Create New Customer Sub-modal Save
  const handleSaveNewCustomer = async () => {
    if (!newCustomerForm.name.trim()) {
      alert('Παρακαλώ συμπληρώστε όνομα πελάτη');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch('/api/customers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomerForm)
      });

      const json = await response.json();
      if (json.success && json.customer) {
        setCustomers(prev => [...prev, json.customer]);
        
        if (resFormModal) {
          setResFormModal({
            ...resFormModal,
            f_custom_id: json.customer.custom_id,
            customer_name: json.customer.name,
            f_nationallity_aid: json.customer.f_nationallity_aid
          });
        }
        setShowNewCustomerModal(false);
        setNewCustomerForm({ name: '', email: '', phone: '', f_nationallity_aid: '' });
      } else {
        alert('Σφάλμα δημιουργίας πελάτη: ' + (json.error || ''));
      }
    } catch (err) {
      console.error('Customer create error:', err);
      alert('Σφάλμα σύνδεσης');
    } finally {
      setActionLoading(false);
    }
  };

  // Create New Nationality Sub-modal Save
  const handleSaveNewNationality = async () => {
    if (!newNationalityName.trim()) {
      alert('Παρακαλώ συμπληρώστε όνομα εθνικότητας');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch('/api/nationalities/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationality: newNationalityName.trim() })
      });

      const json = await response.json();
      if (json.success && json.nationality) {
        setNationalities(prev => [...prev, json.nationality].sort((a, b) => a.nationality.localeCompare(b.nationality)));
        
        if (showNewCustomerModal) {
          setNewCustomerForm(prev => ({ ...prev, f_nationallity_aid: String(json.nationality.nationality_aid) }));
        } else if (resFormModal) {
          setResFormModal(prev => prev ? ({ ...prev, f_nationallity_aid: json.nationality.nationality_aid }) : null);
        }

        setShowNewNationalityModal(false);
        setNewNationalityName('');
      } else {
        alert('Σφάλμα δημιουργίας εθνικότητας: ' + (json.error || ''));
      }
    } catch (err) {
      console.error('Nationality create error:', err);
      alert('Σφάλμα σύνδεσης');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle reservation payed status
  const handleTogglePayed = async (res: Reservation, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPayed = !res.payed;

    // Optimistic update
    setReservations(prev => prev.map(r => r.reser_id === res.reser_id ? { ...r, payed: newPayed } : r));

    try {
      const response = await fetch('/api/reservations/payed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reser_id: res.reser_id, payed: newPayed })
      });
      const json = await response.json();
      if (!json.success) {
        // Rollback on failure
        setReservations(prev => prev.map(r => r.reser_id === res.reser_id ? { ...r, payed: !newPayed } : r));
        alert('Σφάλμα ενημέρωσης πληρωμής: ' + (json.error || ''));
      }
    } catch (err) {
      // Rollback
      setReservations(prev => prev.map(r => r.reser_id === res.reser_id ? { ...r, payed: !newPayed } : r));
      console.error('Payed toggle error:', err);
    }
  };

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
        setResFormModal(null);
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

  // Autocomplete matching customers
  const matchingCustomers = resFormModal?.customer_name
    ? customers.filter(c => c.name.toLowerCase().includes(resFormModal.customer_name.toLowerCase()))
    : [];

  // 1. BASE YEAR & HOUSE RESERVATIONS
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

  const listTotalCount = filteredReservations.length;
  const listCancelledCount = filteredReservations.filter(r => r.canceled).length;

  const visibleNetIncome = filteredReservations
    .filter(r => !r.canceled && !r.payed)
    .reduce((sum, res) => {
      const { netFee } = calculateFinancials(
        res.fee,
        res.platforms?.plat_commission || 0,
        res.platforms?.commission || 0
      );
      return sum + netFee;
    }, 0);

  const payedNetIncome = filteredReservations
    .filter(r => !r.canceled && r.payed)
    .reduce((sum, res) => {
      const { netFee } = calculateFinancials(
        res.fee,
        res.platforms?.plat_commission || 0,
        res.platforms?.commission || 0
      );
      return sum + netFee;
    }, 0);

  const actualFinancials = computePeriodFinancials(
    baseYearAndHouseReservations, 
    taxItems, 
    taxKlimaka, 
    Number(selectedYear)
  );

  const potentialFinancials = computePeriodFinancials(
    baseYearAndHouseReservations.map(r => ({ ...r, canceled: false })),
    taxItems,
    taxKlimaka,
    Number(selectedYear)
  );

  const cancellationLoss = Math.max(0, potentialFinancials.netIncomeAfterTax - actualFinancials.netIncomeAfterTax);

  const isDark = theme === 'dark';

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full overflow-hidden space-y-4">
      {/* ── FRAME 1: TOP FIXED FRAME (GENERAL INFO & CONTROLS) ── */}
      <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 shadow-md shrink-0 transition-colors space-y-2.5 ${
        isDark 
          ? 'bg-slate-900 border-slate-800 text-white' 
          : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* Line 1: Year & House Selectors (Left) + Quick Filter Toggles (Right) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Year & House */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`text-[11px] sm:text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Έτος</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={`px-2.5 py-1 rounded-xl border text-xs sm:text-sm font-bold focus:outline-none cursor-pointer ${
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

            {/* House Selector */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`text-[11px] sm:text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Σπίτι</span>
              <select
                value={selectedHouseId}
                onChange={(e) => setSelectedHouseId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className={`px-2.5 py-1 rounded-xl border text-xs sm:text-sm font-bold focus:outline-none cursor-pointer max-w-[130px] sm:max-w-none truncate ${
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

          {/* Right Controls: Desktop vs Mobile */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {/* Desktop-only: "+ Νέα Κράτηση" Button */}
            <button
              type="button"
              onClick={handleOpenCreateReservation}
              className="hidden sm:flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/25 transition-all cursor-pointer ring-2 ring-emerald-400/40 hover:scale-105 active:scale-95 shrink-0"
            >
              <span>+ Νέα Κράτηση</span>
            </button>

            {/* Toggle Όλα / Τρέχοντα (Visible on all screens) */}
            <button
              type="button"
              onClick={() => setOnlyCurrent(!onlyCurrent)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                onlyCurrent
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-indigo-500 shadow-sm'
                  : isDark
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-slate-200/80 border-slate-300 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {onlyCurrent ? <Clock className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
              <span>{onlyCurrent ? 'Τρέχοντα' : 'Όλα'}</span>
            </button>

            {/* Toggle Hide Cancelled Button (Visible on all screens) */}
            <button
              type="button"
              onClick={() => setHideCancelled(!hideCancelled)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                hideCancelled
                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                  : isDark
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-slate-200/80 border-slate-300 text-slate-700 hover:bg-slate-300'
              }`}
              title={hideCancelled ? 'Εμφάνιση ακυρωμένων' : 'Απόκρυψη ακυρωμένων'}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{hideCancelled ? 'Show Cancelled' : 'Hide Cancelled'}</span>
            </button>

            {/* Mobile-only: Financial Summary Button placed in Top Row */}
            <button
              type="button"
              onClick={() => setShowFinancialModal(true)}
              className="sm:hidden flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Αναλυτικά Οικονομικά Στοιχεία & Φόρος"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Οικονομικά</span>
            </button>
          </div>
        </div>

        {/* Line 2: Counters & Summary */}
        <div className={`pt-2 border-t text-xs font-semibold flex items-center justify-between gap-2 ${
          isDark ? 'border-slate-800 text-slate-400' : 'border-sky-200/80 text-sky-900'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div>
              <span>Κρατήσεις: </span>
              <span className="font-bold text-sky-500">{listTotalCount}</span>
            </div>

            <span className="hidden sm:inline">•</span>

            <div>
              <span>Έσοδα: </span>
              <span className="font-extrabold text-emerald-400">
                €{visibleNetIncome.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
              </span>
              {/* Desktop-only: (+€... πληρ.) */}
              {payedNetIncome > 0 && (
                <span className="hidden sm:inline ml-1 text-amber-400 font-semibold text-[11px]">
                  (+€{payedNetIncome.toLocaleString('el-GR', { minimumFractionDigits: 2 })} πληρ.)
                </span>
              )}
            </div>

            {/* Desktop-only: Financial Summary Button in Line 2 */}
            <span className="hidden sm:inline">•</span>
            <button
              type="button"
              onClick={() => setShowFinancialModal(true)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Αναλυτικά Οικονομικά Στοιχεία & Φόρος"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Οικονομικά</span>
            </button>
          </div>

          {listCancelledCount > 0 && (
            <div className="flex items-center gap-1 text-rose-500 text-[11px]">
              <Ban className="w-3 h-3" />
              <span>{listCancelledCount} ακυρώσεις</span>
            </div>
          )}
        </div>
      </div>

      {/* ── FRAME 2: BOTTOM SCROLLABLE FRAME (DATA LIST) ── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 pb-20 min-h-0">
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm">Φόρτωση κρατήσεων...</p>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border text-slate-400 flex flex-col items-center gap-3 ${
          isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <p className="text-sm">Δεν βρέθηκαν κρατήσεις για τα επιλεγμένα φίλτρα ({selectedYear}).</p>
          <button
            type="button"
            onClick={handleOpenCreateReservation}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ Νέα Κράτηση</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReservations.map((res) => {
            const startDisplay = formatDateDisplay(res.start_date);
            const endDisplay = formatDateDisplay(res.end_date);
            const monthBadge = getMonthBadge(res.start_date);
            const nationalityName = res.customers?.nationality?.nationality || '';
            const isIncomingTurnover = hasIncomingTurnover(res, reservations);
            
            // Calculate total stays for this customer across all active reservations
            const customerStays = reservations.filter(r => {
              if (r.canceled) return false;
              if (res.f_custom_id && r.f_custom_id === res.f_custom_id) return true;
              if (res.customers?.name && r.customers?.name?.toLowerCase().trim() === res.customers.name.toLowerCase().trim()) return true;
              return false;
            });
            const stayCount = customerStays.length;
            
            let diffDays = 0;
            if (res.start_date && res.end_date) {
              const s = new Date(res.start_date).getTime();
              const e = new Date(res.end_date).getTime();
              if (!isNaN(s) && !isNaN(e)) {
                diffDays = Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24));
              }
            }

            const { fee, managerCommission, netFee } = calculateFinancials(
              res.fee,
              res.platforms?.plat_commission || 0,
              res.platforms?.commission || 0
            );

            return (
              <div
                key={res.reser_id}
                onDoubleClick={() => setSelectedRes(res)}
                onClick={() => setSelectedRes(res)}
                className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer relative group ${
                  res.canceled
                    ? isDark 
                      ? 'bg-rose-950/20 border-rose-900/40 opacity-75 hover:opacity-100' 
                      : 'bg-rose-50/80 border-rose-200 opacity-80 hover:opacity-100'
                    : isDark
                      ? 'bg-slate-900/80 border-slate-800 hover:border-sky-500/40 hover:bg-slate-800/80 shadow-md shadow-black/20'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                }`}
                title="Κάντε κλικ ή διπλό κλικ για προβολή στοιχείων κράτησης"
              >
                {/* Line 1 (Top Row): Customer Name (Nationality) [Left] ── Month Year Badge [Right] */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-1.5 flex-wrap ${
                      res.canceled 
                        ? 'line-through text-rose-500' 
                        : isDark ? 'text-indigo-300' : 'text-indigo-900'
                    }`}>
                      {res.canceled && <Ban className="w-4 h-4 text-rose-500 shrink-0" />}
                      <span>{res.customers?.name || 'Unknown Customer'}</span>
                      {nationalityName && (
                        <span className="text-xs font-semibold text-sky-400 font-normal">
                          ({nationalityName})
                        </span>
                      )}
                      {stayCount > 1 && (
                        <>
                          {/* Mobile-only badge: #2 */}
                          <span 
                            className="sm:hidden inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            title={`Ο πελάτης έχει πραγματοποιήσει ${stayCount} ενοικιάσεις συνολικά`}
                          >
                            #{stayCount}
                          </span>
                          {/* Desktop-only badge: ({stayCount} φορές) */}
                          <span 
                            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            title={`Ο πελάτης έχει πραγματοποιήσει ${stayCount} ενοικιάσεις συνολικά`}
                          >
                            <RotateCcw className="w-2.5 h-2.5 stroke-[2.5]" />
                            <span>({stayCount} φορές)</span>
                          </span>
                        </>
                      )}
                    </h3>

                    {res.canceled && (
                      <div className="mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30">
                          🚫 ΑΚΥΡΩΘΗΚΕ
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Top Right: Month-Year Badge */}
                  <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold bg-indigo-600 text-white shadow-sm shrink-0">
                    {monthBadge}
                  </span>
                </div>

                {/* Line 2: Dates & Duration (e.g. 10/05/2026 - 15/05/2026 (5 days)) */}
                <div className="mt-1 text-xs italic text-slate-400 font-semibold flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span>{startDisplay} - {endDisplay}</span>
                  {diffDays > 0 && <span className="text-slate-500 not-italic">({diffDays} days)</span>}
                  {isIncomingTurnover && (
                    <>
                      {/* Mobile-only: Triangle icon with exclamation */}
                      <span 
                        className="sm:hidden inline-flex items-center justify-center p-0.5 px-1 rounded text-[10px] font-black bg-rose-500 text-white shadow-sm not-italic animate-pulse"
                        title="Check-In & Check-Out την ίδια ημέρα"
                      >
                        <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                      </span>
                      {/* Desktop-only: Full text badge */}
                      <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white shadow-sm not-italic animate-pulse">
                        ⚠️ (CheckOut/CheckIn)
                      </span>
                    </>
                  )}
                </div>

                {/* Line 3: Fee: €0,00 / Manager: €0,00 */}
                <div className="mt-1 text-xs font-medium text-slate-400 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span>Fee: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>€{fee.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</strong></span>
                  <span>/</span>
                  <span>Manager: <strong className="text-indigo-400">€{managerCommission.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</strong></span>
                  {(res.advanced_payment ?? 0) > 0 && (
                    <span className="text-amber-400">/ Προκ: <strong>€{Number(res.advanced_payment).toLocaleString('el-GR', { minimumFractionDigits: 2 })}</strong></span>
                  )}
                </div>

                {/* Line 4 (Bottom Row): Platform | X persons [Left] ── Actions / Price [Right] */}
                <div className="mt-2 pt-2 border-t border-slate-800/40 flex items-center justify-between gap-2 text-xs">
                  {/* Left: Platform | Persons */}
                  <div className="text-slate-400 space-x-1.5 truncate">
                    <span className="font-semibold text-sky-400">{res.platforms?.name || 'N/A'}</span>
                    <span>|</span>
                    <span>{res.num_of_visitors} persons</span>
                    {res.kids > 0 && <span>/ {res.kids} kids</span>}
                  </div>

                  {/* Right Side: Responsive (Mobile: Net Price only, Desktop: Payed button + Net Price + Eye/Pencil buttons) */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Desktop-only: Payed Checkbox */}
                    {!res.canceled && (
                      <button
                        type="button"
                        onClick={(e) => handleTogglePayed(res, e)}
                        className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                          res.payed
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                            : isDark
                              ? 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-amber-400 hover:border-amber-500/40'
                              : 'bg-slate-100 border-slate-300 text-slate-400 hover:text-amber-500 hover:border-amber-400'
                        }`}
                        title={res.payed ? 'Πληρώθηκε — Κλικ για αναίρεση' : 'Σημείωση ως Πληρωμένο'}
                      >
                        <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${
                          res.payed ? 'border-amber-400 bg-amber-400' : 'border-current'
                        }`}>
                          {res.payed && <span className="text-white text-[9px] font-black">✓</span>}
                        </span>
                        <span>Payed</span>
                      </button>
                    )}

                    {/* Net Price Tag */}
                    <div className={`text-xs sm:text-sm font-extrabold ${
                      res.canceled
                        ? 'text-slate-500 line-through'
                        : res.payed
                          ? 'text-amber-400 line-through opacity-60'
                          : 'text-emerald-500'
                    }`}>
                      {(res.advanced_payment ?? 0) > 0 && !res.canceled ? (
                        <span>
                          €{(netFee - Number(res.advanced_payment)).toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                          <span className="ml-1 text-[10px] font-semibold text-amber-400/70">(-€{Number(res.advanced_payment).toLocaleString('el-GR', { minimumFractionDigits: 0 })})</span>
                        </span>
                      ) : (
                        `€${netFee.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`
                      )}
                    </div>

                    {/* Desktop-only: Eye & Pencil action buttons */}
                    <div className="hidden sm:flex items-center gap-0.5">
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

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditReservation(res);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer"
                        title="Επεξεργασία / Διόρθωση"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>



      {/* ── RESERVATION FORM MODAL ── */}
      {resFormModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {resFormModal.isEditing ? <Pencil className="w-5 h-5 text-amber-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
                <h3 className="text-lg font-bold">
                  {resFormModal.isEditing ? `Επεξεργασία Κράτησης #${resFormModal.reser_id}` : 'Νέα Κράτηση'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResFormModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveReservationForm(); }} className="space-y-4 text-xs">
              {/* Customer Autocomplete Input + "+ New Customer" Button */}
              <div className="relative" ref={dropdownRef}>
                <label className="block font-semibold mb-1 text-slate-400 flex items-center justify-between">
                  <span>Πελάτης</span>
                  {resFormModal.f_custom_id && (
                    <span className="text-[10px] text-emerald-400 font-bold">✓ Επιλέχθηκε ID #{resFormModal.f_custom_id}</span>
                  )}
                </label>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Πληκτρολογήστε όνομα για αναζήτηση..."
                      value={resFormModal.customer_name}
                      onChange={(e) => {
                        setResFormModal({
                          ...resFormModal,
                          customer_name: e.target.value,
                          f_custom_id: undefined
                        });
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className={`w-full p-2.5 rounded-xl border font-semibold pr-8 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                      required
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                  </div>

                  {/* "+ New Customer" Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustomerForm({
                        name: resFormModal.customer_name || '',
                        email: '',
                        phone: '',
                        f_nationallity_aid: resFormModal.f_nationallity_aid ? String(resFormModal.f_nationallity_aid) : ''
                      });
                      setShowNewCustomerModal(true);
                    }}
                    className="p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    title="Προσθήκη Νέου Πελάτη (+)"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+</span>
                  </button>
                </div>

                {/* Autocomplete Dropdown List of Matching Customers */}
                {showCustomerDropdown && matchingCustomers.length > 0 && (
                  <div className={`absolute left-0 right-12 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl z-50 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    {matchingCustomers.map((cust) => (
                      <div
                        key={cust.custom_id}
                        onClick={() => {
                          setResFormModal({
                            ...resFormModal,
                            f_custom_id: cust.custom_id,
                            customer_name: cust.name,
                            f_nationallity_aid: cust.f_nationallity_aid || cust.nationality?.nationality_aid
                          });
                          setShowCustomerDropdown(false);
                        }}
                        className={`p-2.5 border-b last:border-0 cursor-pointer flex items-center justify-between transition-colors ${
                          isDark ? 'border-slate-800/60 hover:bg-slate-800/80' : 'border-slate-100 hover:bg-sky-50'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-sm">{cust.name}</p>
                          <p className="text-[11px] text-slate-400">{cust.email || 'No email'}</p>
                        </div>
                        {cust.nationality?.nationality && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30">
                            {cust.nationality.nationality}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Ημερομηνία Έναρξης</label>
                  <input
                    type="date"
                    value={resFormModal.start_date}
                    onChange={(e) => setResFormModal({ ...resFormModal, start_date: e.target.value })}
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
                    value={resFormModal.end_date}
                    onChange={(e) => setResFormModal({ ...resFormModal, end_date: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Fee, Advanced Payment, Visitors, Kids */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Αρχικό Fee (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={resFormModal.fee}
                    onChange={(e) => setResFormModal({ ...resFormModal, fee: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border font-bold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-50 border-slate-300 text-emerald-600'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Προκαταβολή (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={resFormModal.advanced_payment}
                    onChange={(e) => setResFormModal({ ...resFormModal, advanced_payment: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border font-bold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-50 border-slate-300 text-amber-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Ενήλικες</label>
                  <input
                    type="number"
                    min="1"
                    value={resFormModal.num_of_visitors}
                    onChange={(e) => setResFormModal({ ...resFormModal, num_of_visitors: Number(e.target.value) })}
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
                    value={resFormModal.kids}
                    onChange={(e) => setResFormModal({ ...resFormModal, kids: Number(e.target.value) })}
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
                    value={resFormModal.f_platform_id}
                    onChange={(e) => setResFormModal({ ...resFormModal, f_platform_id: Number(e.target.value) })}
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
                    value={resFormModal.f_house_aid}
                    onChange={(e) => setResFormModal({ ...resFormModal, f_house_aid: Number(e.target.value) })}
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
                  value={resFormModal.notes}
                  onChange={(e) => setResFormModal({ ...resFormModal, notes: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border font-normal ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="Επιπλέον πληροφορίες..."
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                {resFormModal.isEditing ? (
                  <button
                    type="button"
                    onClick={() => setDeletingResId(resFormModal.reser_id!)}
                    className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Διαγραφή</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setResFormModal(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Ακύρωση
                  </button>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{resFormModal.isEditing ? 'Αποθήκευση' : 'Δημιουργία Κράτησης'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── NEW CUSTOMER SUB-MODAL (+) ── */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold">Προσθήκη Νέου Πελάτη</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveNewCustomer(); }} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Όνομα Πελάτη *</label>
                <input
                  type="text"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border font-semibold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Email</label>
                <input
                  type="email"
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border font-normal ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Τηλέφωνο</label>
                <input
                  type="text"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border font-normal ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Εθνικότητα</label>
                <div className="flex items-center gap-2">
                  <select
                    value={newCustomerForm.f_nationallity_aid}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, f_nationallity_aid: e.target.value })}
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

                  <button
                    type="button"
                    onClick={() => setShowNewNationalityModal(true)}
                    className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    title="Προσθήκη Νέας Εθνικότητας (+)"
                  >
                    <Globe className="w-4 h-4" />
                    <span>+</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Ακύρωση
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Αποθήκευση Πελάτη</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── NEW NATIONALITY SUB-MODAL (+) ── */}
      {showNewNationalityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className={`w-full max-w-sm rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">Προσθήκη Νέας Εθνικότητας</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewNationalityModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveNewNationality(); }} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Όνομα Εθνικότητας / Χώρας *</label>
                <input
                  type="text"
                  placeholder="π.χ. Italy, Spain, Switzerland..."
                  value={newNationalityName}
                  onChange={(e) => setNewNationalityName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-semibold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewNationalityModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Ακύρωση
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Προσθήκη</span>
                </button>
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
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
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

      {/* ── FINANCIAL SUMMARY MODAL ── */}
      {showFinancialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl relative transition-colors max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
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

            <div className="space-y-4 text-xs">
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
                  <span className="text-slate-400">
                    Φόρος (Progressive Tax):
                    {actualFinancials.discountPct > 0 && (
                      <span className="text-amber-400 text-[10px] ml-1">
                        (-{actualFinancials.discountPct}% έκπτωση)
                      </span>
                    )}
                  </span>
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
        const isIncomingTurnover = hasIncomingTurnover(selectedRes, reservations);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl relative transition-colors max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
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

              <div className="space-y-3.5 text-sm">
                {/* Customer Details Box */}
                {(() => {
                  const allCustStays = reservations.filter(r => {
                    if (r.canceled) return false;
                    if (selectedRes.f_custom_id && r.f_custom_id === selectedRes.f_custom_id) return true;
                    if (selectedRes.customers?.name && r.customers?.name?.toLowerCase().trim() === selectedRes.customers.name.toLowerCase().trim()) return true;
                    return false;
                  });

                  return (
                    <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <User className="w-5 h-5 text-sky-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 font-semibold uppercase flex items-center justify-between">
                          <span>Πελάτης</span>
                          {allCustStays.length > 1 && (
                            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" />
                              <span>{allCustStays.length} ενοικιάσεις συνολικά</span>
                            </span>
                          )}
                        </p>
                        <p className="font-bold text-base mt-0.5 flex items-center flex-wrap gap-1.5">
                          <span>{selectedRes.customers?.name || 'N/A'}</span>
                          {allCustStays.length > 1 && (
                            <span className="text-xs font-bold text-amber-400 font-normal">
                              ({allCustStays.length} φορές)
                            </span>
                          )}
                          {natName && <span className="text-xs font-semibold text-sky-400 font-normal">({natName})</span>}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{selectedRes.customers?.email || 'Χωρίς Email'}</p>
                        <p className="text-xs text-slate-400">{selectedRes.customers?.phone || 'Χωρίς Τηλέφωνο'}</p>
                      </div>
                    </div>
                  );
                })()}

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
                      {formatDateDisplay(selectedRes.start_date)} ➔ {formatDateDisplay(selectedRes.end_date)}
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Επισκέπτες</span>
                    </div>
                    <p className="text-xs font-bold">{selectedRes.num_of_visitors} Ενήλικες {selectedRes.kids > 0 && `, ${selectedRes.kids} Παιδιά`}</p>
                  </div>
                </div>

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

                {(selectedRes.notes || selectedRes.comments) && (
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Σημειώσεις</span>
                    </div>
                    <p className="text-xs italic text-slate-300">{selectedRes.notes || selectedRes.comments}</p>
                  </div>
                )}

                {/* ── CUSTOMER PREVIOUS / OTHER RENTALS SECTION ── */}
                {(() => {
                  const otherStays = reservations
                    .filter(r => {
                      const isSameCustomer = (selectedRes.f_custom_id && r.f_custom_id === selectedRes.f_custom_id) ||
                        (selectedRes.customers?.name && r.customers?.name?.toLowerCase().trim() === selectedRes.customers.name.toLowerCase().trim());
                      return isSameCustomer && r.reser_id !== selectedRes.reser_id;
                    })
                    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

                  return (
                    <div className={`p-3.5 rounded-xl border space-y-2.5 ${isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Προηγούμενες / Άλλες Ενοικιάσεις Πελάτη
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                          {otherStays.length > 0 ? `${otherStays.length} εγγραφές` : '1η Διαμονή'}
                        </span>
                      </div>

                      {otherStays.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-1">
                          Δεν υπάρχουν άλλες ενοικιάσεις για τον συγκεκριμένο πελάτη (Πρώτη διαμονή).
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                          {otherStays.map(stay => {
                            const sDate = formatDateDisplay(stay.start_date);
                            const eDate = formatDateDisplay(stay.end_date);
                            let sDays = 0;
                            if (stay.start_date && stay.end_date) {
                              const s = new Date(stay.start_date).getTime();
                              const e = new Date(stay.end_date).getTime();
                              if (!isNaN(s) && !isNaN(e)) {
                                sDays = Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24));
                              }
                            }

                            return (
                              <div 
                                key={stay.reser_id}
                                className={`p-2.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 transition-colors ${
                                  stay.canceled
                                    ? 'bg-rose-950/20 border-rose-900/40 text-slate-400'
                                    : isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                  <span className="font-bold">{sDate} ➔ {eDate}</span>
                                  {sDays > 0 && <span className="text-slate-400 font-normal">({sDays} ημ.)</span>}
                                </div>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="text-indigo-400 font-semibold">{stay.houses?.house_name?.trim() || 'Σπίτι'}</span>
                                  <span>•</span>
                                  <span className="text-sky-400 font-semibold">{stay.platforms?.name || 'Platform'}</span>
                                  {stay.canceled ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                      Ακυρώθηκε
                                    </span>
                                  ) : (
                                    <span className="font-bold text-emerald-400">
                                      €{Number(stay.fee || 0).toLocaleString('el-GR', { minimumFractionDigits: 0 })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditReservation(selectedRes)}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Επεξεργασία</span>
                  </button>

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
