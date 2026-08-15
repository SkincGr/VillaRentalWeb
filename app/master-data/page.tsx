'use client';

import { useState, useEffect } from 'react';
import { 
  supabase, 
  Customer, 
  Platform, 
  House, 
  Owner, 
  HouseToPeriod, 
  Nationality 
} from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  Globe, 
  Home as HomeIcon, 
  UserCheck, 
  Search, 
  Calendar, 
  Pencil, 
  Plus, 
  X, 
  Save, 
  RefreshCw, 
  Percent, 
  Flag,
  Check,
  AlertCircle
} from 'lucide-react';

const MONTH_OPTIONS = [
  { val: 1, name: '01 - Ιανουάριος (January)' },
  { val: 2, name: '02 - Φεβρουάριος (February)' },
  { val: 3, name: '03 - Μάρτιος (March)' },
  { val: 4, name: '04 - Απρίλιος (April)' },
  { val: 5, name: '05 - Μάιος (May)' },
  { val: 6, name: '06 - Ιούνιος (June)' },
  { val: 7, name: '07 - Ιούλιος (July)' },
  { val: 8, name: '08 - Αύγουστος (August)' },
  { val: 9, name: '09 - Σεπτέμβριος (September)' },
  { val: 10, name: '10 - Οκτώβριος (October)' },
  { val: 11, name: '11 - Νοέμβριος (November)' },
  { val: 12, name: '12 - Δεκέμβριος (December)' },
];

export default function MasterDataPage() {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'customers' | 'platforms' | 'nationalities' | 'houses' | 'owners'>('customers');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [housePeriods, setHousePeriods] = useState<HouseToPeriod[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null | 'NEW'>(null);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null | 'NEW'>(null);
  const [editingNationality, setEditingNationality] = useState<Nationality | null | 'NEW'>(null);
  const [editingHouse, setEditingHouse] = useState<{ house: House | 'NEW'; period?: HouseToPeriod } | null>(null);
  const [editingOwner, setEditingOwner] = useState<Owner | null | 'NEW'>(null);

  // Quick nationality sub-modal from customer form
  const [showQuickNationalityModal, setShowQuickNationalityModal] = useState(false);
  const [quickNationalityName, setQuickNationalityName] = useState('');
  const [quickNationalitySymbol, setQuickNationalitySymbol] = useState('');

  // Form states
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '', f_nationallity_aid: '' });
  const [platformForm, setPlatformForm] = useState({ name: '', commission: 0, plat_commission: 0, tax_able: true });
  const [nationalityForm, setNationalityForm] = useState({ nationality: '', symbol: '' });
  const [houseForm, setHouseForm] = useState({
    house_name: '',
    start_day: 15,
    start_month: 5,
    end_day: 20,
    end_month: 10,
    efective_startyear: 2000,
    efective_endyear: 2099
  });
  const [ownerForm, setOwnerForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    fetchAllMasterData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  async function fetchAllMasterData() {
    setLoading(true);
    try {
      const [custRes, platRes, natRes, houseRes, ownRes, periodRes] = await Promise.all([
        supabase.from('customers').select('*, nationality (*)').order('name', { ascending: true }),
        supabase.from('platforms').select('*').order('name', { ascending: true }),
        supabase.from('nationality').select('*').order('nationality', { ascending: true }),
        supabase.from('houses').select('*').order('house_aid', { ascending: true }),
        supabase.from('owners').select('*').order('name', { ascending: true }),
        supabase.from('house_to_periods').select('*').order('efective_startyear', { ascending: true })
      ]);

      if (custRes.data) setCustomers(custRes.data);
      if (platRes.data) setPlatforms(platRes.data);
      if (natRes.data) setNationalities(natRes.data);
      if (houseRes.data) setHouses(houseRes.data);
      if (periodRes.data) setHousePeriods(periodRes.data);
      if (ownRes.data) setOwners(ownRes.data);
    } catch (e) {
      console.error(e);
      showToast('Σφάλμα κατά τη φόρτωση δεδομένων');
    } finally {
      setLoading(false);
    }
  }

  // ── CUSTOMER SAVE ──────────────────────────────────────────────────────────
  const handleOpenCustomerModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerForm({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        f_nationallity_aid: customer.f_nationallity_aid ? String(customer.f_nationallity_aid) : ''
      });
    } else {
      setEditingCustomer('NEW');
      setCustomerForm({ name: '', email: '', phone: '', f_nationallity_aid: '' });
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return;

    setActionLoading(true);
    try {
      const payload: any = {
        name: customerForm.name.trim(),
        email: customerForm.email.trim() || null,
        phone: customerForm.phone.trim() || null,
        f_nationallity_aid: customerForm.f_nationallity_aid ? Number(customerForm.f_nationallity_aid) : null
      };

      if (editingCustomer === 'NEW') {
        const { error } = await supabase.from('customers').insert([payload]);
        if (error) throw error;
        showToast('Ο πελάτης δημιουργήθηκε επιτυχώς!');
      } else if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('custom_id', editingCustomer.custom_id);
        if (error) throw error;
        showToast('Ο πελάτης ενημερώθηκε επιτυχώς!');
      }

      setEditingCustomer(null);
      await fetchAllMasterData();
    } catch (err: any) {
      console.error(err);
      showToast(`Σφάλμα: ${err.message || 'Αποτυχία αποθήκευσης'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── PLATFORM SAVE ──────────────────────────────────────────────────────────
  const handleOpenPlatformModal = (platform?: Platform) => {
    if (platform) {
      setEditingPlatform(platform);
      setPlatformForm({
        name: platform.name || '',
        commission: (platform.commission ?? 0) * 100,
        plat_commission: (platform.plat_commission ?? 0) * 100,
        tax_able: Boolean(platform.tax_able)
      });
    } else {
      setEditingPlatform('NEW');
      setPlatformForm({ name: '', commission: 15, plat_commission: 3, tax_able: true });
    }
  };

  const handleSavePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformForm.name.trim()) return;

    setActionLoading(true);
    try {
      const payload: any = {
        name: platformForm.name.trim(),
        commission: Number(platformForm.commission || 0) / 100,
        plat_commission: Number(platformForm.plat_commission || 0) / 100,
        tax_able: platformForm.tax_able
      };

      if (editingPlatform === 'NEW') {
        const { error } = await supabase.from('platforms').insert([payload]);
        if (error) throw error;
        showToast('Η πλατφόρμα δημιουργήθηκε επιτυχώς!');
      } else if (editingPlatform) {
        const { error } = await supabase
          .from('platforms')
          .update(payload)
          .eq('platform_id', editingPlatform.platform_id);
        if (error) throw error;
        showToast('Η πλατφόρμα ενημερώθηκε επιτυχώς!');
      }

      setEditingPlatform(null);
      await fetchAllMasterData();
    } catch (err: any) {
      console.error(err);
      showToast(`Σφάλμα: ${err.message || 'Αποτυχία αποθήκευσης'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── NATIONALITY SAVE ───────────────────────────────────────────────────────
  const handleOpenNationalityModal = (nat?: Nationality) => {
    if (nat) {
      setEditingNationality(nat);
      setNationalityForm({
        nationality: nat.nationality || '',
        symbol: nat.symbol || ''
      });
    } else {
      setEditingNationality('NEW');
      setNationalityForm({ nationality: '', symbol: '' });
    }
  };

  const handleSaveNationality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationalityForm.nationality.trim()) return;

    setActionLoading(true);
    try {
      const payload: any = {
        nationality: nationalityForm.nationality.trim(),
        symbol: nationalityForm.symbol.trim() || null
      };

      if (editingNationality === 'NEW') {
        const { error } = await supabase.from('nationality').insert([payload]);
        if (error) throw error;
        showToast('Η εθνικότητα δημιουργήθηκε επιτυχώς!');
      } else if (editingNationality) {
        const { error } = await supabase
          .from('nationality')
          .update(payload)
          .eq('nationality_aid', editingNationality.nationality_aid);
        if (error) throw error;
        showToast('Η εθνικότητα ενημερώθηκε επιτυχώς!');
      }

      setEditingNationality(null);
      await fetchAllMasterData();
    } catch (err: any) {
      console.error(err);
      showToast(`Σφάλμα: ${err.message || 'Αποτυχία αποθήκευσης'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Nationality Add from Customer Modal
  const handleSaveQuickNationality = async () => {
    if (!quickNationalityName.trim()) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('nationality')
        .insert([{ nationality: quickNationalityName.trim(), symbol: quickNationalitySymbol.trim() || null }])
        .select();

      if (error) throw error;
      const created = data?.[0];
      if (created) {
        setNationalities(prev => [...prev, created].sort((a, b) => a.nationality.localeCompare(b.nationality)));
        setCustomerForm(prev => ({ ...prev, f_nationallity_aid: String(created.nationality_aid) }));
      }
      setShowQuickNationalityModal(false);
      setQuickNationalityName('');
      setQuickNationalitySymbol('');
      showToast('Η εθνικότητα προστέθηκε!');
    } catch (err: any) {
      showToast(`Σφάλμα: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── HOUSE & PERIOD SAVE ────────────────────────────────────────────────────
  const handleOpenHouseModal = (house?: House) => {
    if (house) {
      const period = housePeriods.find(p => p.f_house_aid === house.house_aid);
      setEditingHouse({ house, period });
      setHouseForm({
        house_name: house.house_name?.trim() || '',
        start_day: period?.start_day ?? 15,
        start_month: period?.start_month ?? 5,
        end_day: period?.end_day ?? 20,
        end_month: period?.end_month ?? 10,
        efective_startyear: period?.efective_startyear ?? 2000,
        efective_endyear: period?.efective_endyear ?? 2099
      });
    } else {
      setEditingHouse({ house: 'NEW' });
      setHouseForm({
        house_name: '',
        start_day: 15,
        start_month: 5,
        end_day: 20,
        end_month: 10,
        efective_startyear: 2000,
        efective_endyear: 2099
      });
    }
  };

  const handleSaveHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseForm.house_name.trim()) return;

    setActionLoading(true);
    try {
      let targetHouseAid: number | null = null;

      if (editingHouse?.house === 'NEW') {
        const { data, error } = await supabase
          .from('houses')
          .insert([{ house_name: houseForm.house_name.trim(), f_city_aid: 1 }])
          .select();
        if (error) throw error;
        targetHouseAid = data?.[0]?.house_aid;
      } else if (editingHouse?.house) {
        targetHouseAid = editingHouse.house.house_aid;
        const { error } = await supabase
          .from('houses')
          .update({ house_name: houseForm.house_name.trim() })
          .eq('house_aid', targetHouseAid);
        if (error) throw error;
      }

      // Save / Update house_to_periods
      if (targetHouseAid) {
        const periodPayload = {
          f_house_aid: targetHouseAid,
          start_day: Number(houseForm.start_day),
          start_month: Number(houseForm.start_month),
          end_day: Number(houseForm.end_day),
          end_month: Number(houseForm.end_month),
          efective_startyear: Number(houseForm.efective_startyear),
          efective_endyear: Number(houseForm.efective_endyear)
        };

        const existingPeriod = housePeriods.find(p => p.f_house_aid === targetHouseAid);
        if (existingPeriod) {
          await supabase
            .from('house_to_periods')
            .update(periodPayload)
            .eq('f_house_aid', targetHouseAid);
        } else {
          await supabase
            .from('house_to_periods')
            .insert([periodPayload]);
        }
      }

      showToast('Το σπίτι & η περίοδος αποθηκεύτηκαν επιτυχώς!');
      setEditingHouse(null);
      await fetchAllMasterData();
    } catch (err: any) {
      console.error(err);
      showToast(`Σφάλμα: ${err.message || 'Αποτυχία αποθήκευσης'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── OWNER SAVE ─────────────────────────────────────────────────────────────
  const handleOpenOwnerModal = (owner?: Owner) => {
    if (owner) {
      setEditingOwner(owner);
      setOwnerForm({
        name: owner.name || '',
        email: owner.email || '',
        phone: owner.phone || ''
      });
    } else {
      setEditingOwner('NEW');
      setOwnerForm({ name: '', email: '', phone: '' });
    }
  };

  const handleSaveOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerForm.name.trim()) return;

    setActionLoading(true);
    try {
      const payload: any = {
        name: ownerForm.name.trim(),
        email: ownerForm.email.trim() || null,
        phone: ownerForm.phone.trim() || null
      };

      if (editingOwner === 'NEW') {
        const { error } = await supabase.from('owners').insert([payload]);
        if (error) throw error;
        showToast('Ο ιδιοκτήτης δημιουργήθηκε επιτυχώς!');
      } else if (editingOwner) {
        const { error } = await supabase
          .from('owners')
          .update(payload)
          .eq('owner_aid', editingOwner.owner_aid);
        if (error) throw error;
        showToast('Ο ιδιοκτήτης ενημερώθηκε επιτυχώς!');
      }

      setEditingOwner(null);
      await fetchAllMasterData();
    } catch (err: any) {
      console.error(err);
      showToast(`Σφάλμα: ${err.message || 'Αποτυχία αποθήκευσης'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── FILTERED DATA ──────────────────────────────────────────────────────────
  const q = search.toLowerCase();

  const filteredCustomers = customers.filter(c => 
    !q || c.name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q)) || (c.nationality?.nationality && c.nationality.nationality.toLowerCase().includes(q))
  );

  const filteredPlatforms = platforms.filter(p => 
    !q || p.name.toLowerCase().includes(q)
  );

  const filteredNationalities = nationalities.filter(n =>
    !q || n.nationality.toLowerCase().includes(q) || (n.symbol && n.symbol.toLowerCase().includes(q))
  );

  const filteredHouses = houses.filter(h => 
    !q || (h.house_name && h.house_name.toLowerCase().includes(q))
  );

  const filteredOwners = owners.filter(o => 
    !q || (o.name && o.name.toLowerCase().includes(q)) || (o.email && o.email.toLowerCase().includes(q)) || (o.phone && o.phone.includes(q))
  );

  // New Button text according to active Tab
  const getNewButtonLabel = () => {
    switch (activeTab) {
      case 'customers': return '+ Νέος Πελάτης';
      case 'platforms': return '+ Νέα Πλατφόρμα';
      case 'nationalities': return '+ Νέα Εθνικότητα';
      case 'houses': return '+ Νέο Σπίτι';
      case 'owners': return '+ Νέος Ιδιοκτήτης';
    }
  };

  const handleOpenNewActiveModal = () => {
    switch (activeTab) {
      case 'customers': handleOpenCustomerModal(); break;
      case 'platforms': handleOpenPlatformModal(); break;
      case 'nationalities': handleOpenNationalityModal(); break;
      case 'houses': handleOpenHouseModal(); break;
      case 'owners': handleOpenOwnerModal(); break;
    }
  };

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto w-full overflow-hidden space-y-4">
      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-sky-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <Check className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ── FRAME 1: TOP FIXED FRAME (TITLE, TABS, SEARCH & NEW BUTTON) ── */}
      <div className={`p-4 rounded-2xl border-2 shadow-md shrink-0 space-y-3.5 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-wide flex items-center gap-2">
              <span>Master Data</span>
            </h1>
            <p className="text-xs text-slate-400">Διαχείριση & Επεξεργασία Πελατών, Πλατφορμών, Εθνικοτήτων, Σπιτιών & Ιδιοκτητών</p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Αναζήτηση..."
                className={`w-full border rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-sky-500 transition-colors ${
                  isDark ? 'bg-slate-950 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* + New Button */}
            <button
              type="button"
              onClick={handleOpenNewActiveModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{getNewButtonLabel()}</span>
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/40 pt-3">
          <button
            onClick={() => { setActiveTab('customers'); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-400/40'
                : isDark ? 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Πελάτες ({customers.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('platforms'); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'platforms'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-400/40'
                : isDark ? 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Πλατφόρμες ({platforms.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('nationalities'); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'nationalities'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-400/40'
                : isDark ? 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Εθνικότητες ({nationalities.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('houses'); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'houses'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-400/40'
                : isDark ? 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <HomeIcon className="w-3.5 h-3.5" />
            <span>Σπίτια ({houses.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('owners'); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'owners'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-400/40'
                : isDark ? 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Ιδιοκτήτες ({owners.length})</span>
          </button>
        </div>
      </div>

      {/* ── FRAME 2: BOTTOM SCROLLABLE FRAME (DATA TABLES / CARDS) ── */}
      <div className="flex-1 overflow-y-auto pr-1 pb-20 min-h-0">
        <div className={`rounded-2xl border transition-colors shadow-sm overflow-hidden ${
          isDark ? 'glass-panel border-slate-800 bg-slate-900/60' : 'bg-white border-slate-200'
        }`}>
          {loading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
              <p className="text-sm font-semibold">Φόρτωση δεδομένων...</p>
            </div>
          ) : activeTab === 'customers' ? (
            /* ── 1. CUSTOMERS TABLE ── */
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-slate-400 text-xs uppercase shadow-sm">
                <tr className="border-b-2 border-slate-800">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Όνομα Πελάτη</th>
                  <th className="px-4 py-3 font-semibold">Εθνικότητα</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Τηλέφωνο</th>
                  <th className="px-4 py-3 font-semibold text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {filteredCustomers.map(c => (
                  <tr key={c.custom_id} className={`hover:bg-slate-800/30 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <td className="px-4 py-3 font-mono text-slate-500">#{c.custom_id}</td>
                    <td className="px-4 py-3 font-bold text-white text-sm">{c.name}</td>
                    <td className="px-4 py-3">
                      {c.nationality ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                          {c.nationality.symbol && <span>{c.nationality.symbol}</span>}
                          <span>{c.nationality.nationality}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{c.email || '-'}</td>
                    <td className="px-4 py-3 text-slate-400">{c.phone || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenCustomerModal(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Επεξεργασία</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Δεν βρέθηκαν πελάτες</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === 'platforms' ? (
            /* ── 2. PLATFORMS TABLE ── */
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-slate-400 text-xs uppercase shadow-sm">
                <tr className="border-b-2 border-slate-800">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Όνομα Πλατφόρμας</th>
                  <th className="px-4 py-3 font-semibold">Προμήθεια Διαχειριστή (%)</th>
                  <th className="px-4 py-3 font-semibold">Προμήθεια Πλατφόρμας (%)</th>
                  <th className="px-4 py-3 font-semibold">Φορολογήσιμη</th>
                  <th className="px-4 py-3 font-semibold text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {filteredPlatforms.map(p => (
                  <tr key={p.platform_id} className={`hover:bg-slate-800/30 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <td className="px-4 py-3 font-mono text-slate-500">#{p.platform_id}</td>
                    <td className="px-4 py-3 font-bold text-white text-sm">{p.name}</td>
                    <td className="px-4 py-3 font-bold text-sky-400">{((p.commission ?? 0) * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 font-bold text-amber-400">{((p.plat_commission ?? 0) * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3">
                      {p.tax_able ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Ναι</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">Όχι</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenPlatformModal(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Επεξεργασία</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPlatforms.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Δεν βρέθηκαν πλατφόρμες</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === 'nationalities' ? (
            /* ── 3. NATIONALITIES TABLE (NEW) ── */
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-slate-400 text-xs uppercase shadow-sm">
                <tr className="border-b-2 border-slate-800">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Σύμβολο / Σημαία</th>
                  <th className="px-4 py-3 font-semibold">Όνομα Εθνικότητας</th>
                  <th className="px-4 py-3 font-semibold text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {filteredNationalities.map(n => (
                  <tr key={n.nationality_aid} className={`hover:bg-slate-800/30 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <td className="px-4 py-3 font-mono text-slate-500">#{n.nationality_aid}</td>
                    <td className="px-4 py-3 font-bold text-base">
                      {n.symbol ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                          {n.symbol}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-white text-sm">{n.nationality}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenNationalityModal(n)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Επεξεργασία</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredNationalities.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">Δεν βρέθηκαν εθνικότητες</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === 'houses' ? (
            /* ── 4. HOUSES & PERIODS TABLE ── */
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-slate-400 text-xs uppercase shadow-sm">
                <tr className="border-b-2 border-slate-800">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Όνομα Σπιτιού / Βίλας</th>
                  <th className="px-4 py-3 font-semibold">Έναρξη Περιόδου (Start)</th>
                  <th className="px-4 py-3 font-semibold">Λήξη Περιόδου (End)</th>
                  <th className="px-4 py-3 font-semibold">Έτη Ισχύος</th>
                  <th className="px-4 py-3 font-semibold text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {filteredHouses.map(h => {
                  const houseP = housePeriods.find(p => p.f_house_aid === h.house_aid);
                  const startStr = houseP ? `${String(houseP.start_day).padStart(2, '0')}/${String(houseP.start_month).padStart(2, '0')}` : '15/05';
                  const endStr = houseP ? `${String(houseP.end_day).padStart(2, '0')}/${String(houseP.end_month).padStart(2, '0')}` : '20/10';
                  const yearsStr = houseP ? `${houseP.efective_startyear} - ${houseP.efective_endyear}` : '2000 - 2099';

                  return (
                    <tr key={h.house_aid} className={`hover:bg-slate-800/30 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      <td className="px-4 py-3 font-mono text-slate-500">#{h.house_aid}</td>
                      <td className="px-4 py-3 font-bold text-white text-sm">{h.house_name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
                          <Calendar className="w-3.5 h-3.5" />
                          {startStr}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
                          <Calendar className="w-3.5 h-3.5" />
                          {endStr}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{yearsStr}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenHouseModal(h)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Επεξεργασία</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredHouses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Δεν βρέθηκαν σπίτια</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            /* ── 5. OWNERS TABLE ── */
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-slate-400 text-xs uppercase shadow-sm">
                <tr className="border-b-2 border-slate-800">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Όνομα Ιδιοκτήτη</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Τηλέφωνο</th>
                  <th className="px-4 py-3 font-semibold text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {filteredOwners.map(o => (
                  <tr key={o.owner_aid} className={`hover:bg-slate-800/30 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <td className="px-4 py-3 font-mono text-slate-500">#{o.owner_aid}</td>
                    <td className="px-4 py-3 font-bold text-white text-sm">{o.name}</td>
                    <td className="px-4 py-3 text-slate-400">{o.email || '-'}</td>
                    <td className="px-4 py-3 text-slate-400">{o.phone || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenOwnerModal(o)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Επεξεργασία</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOwners.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">Δεν βρέθηκαν ιδιοκτήτες</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS SECTION (CREATE & EDIT)
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── 1. CUSTOMER MODAL ── */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-extrabold">
                  {editingCustomer === 'NEW' ? 'Προσθήκη Νέου Πελάτη' : `Επεξεργασία Πελάτη #${editingCustomer.custom_id}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Όνομα Πελάτη *</label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="π.χ. John Doe"
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
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  placeholder="john@example.com"
                  className={`w-full p-2.5 rounded-xl border font-normal ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Τηλέφωνο</label>
                <input
                  type="text"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  placeholder="+44 7123 456789"
                  className={`w-full p-2.5 rounded-xl border font-normal ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Εθνικότητα</label>
                <div className="flex items-center gap-2">
                  <select
                    value={customerForm.f_nationallity_aid}
                    onChange={(e) => setCustomerForm({ ...customerForm, f_nationallity_aid: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-sky-400' : 'bg-slate-50 border-slate-300 text-sky-600'
                    }`}
                  >
                    <option value="">Επιλέξτε Εθνικότητα...</option>
                    {nationalities.map(n => (
                      <option key={n.nationality_aid} value={n.nationality_aid}>
                        {n.symbol ? `${n.symbol} ` : ''}{n.nationality}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowQuickNationalityModal(true)}
                    className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    title="Νέα Εθνικότητα"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Αποθήκευση Πελάτη</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. PLATFORM MODAL ── */}
      {editingPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-extrabold">
                  {editingPlatform === 'NEW' ? 'Προσθήκη Νέας Πλατφόρμας' : `Επεξεργασία Πλατφόρμας #${editingPlatform.platform_id}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlatform(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlatform} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Όνομα Πλατφόρμας *</label>
                <input
                  type="text"
                  value={platformForm.name}
                  onChange={(e) => setPlatformForm({ ...platformForm, name: e.target.value })}
                  placeholder="π.χ. Airbnb, Booking.com"
                  className={`w-full p-2.5 rounded-xl border font-semibold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Προμήθεια Διαχειριστή (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={platformForm.commission}
                    onChange={(e) => setPlatformForm({ ...platformForm, commission: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border font-bold text-sky-400 ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Προμήθεια Πλατφόρμας (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={platformForm.plat_commission}
                    onChange={(e) => setPlatformForm({ ...platformForm, plat_commission: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border font-bold text-amber-400 ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold block text-sm">Φορολογήσιμη Κράτηση</span>
                  <span className="text-slate-400 text-[11px]">Υπολογισμός φόρου εισοδήματος & περιβάλλοντος</span>
                </div>
                <input
                  type="checkbox"
                  checked={platformForm.tax_able}
                  onChange={(e) => setPlatformForm({ ...platformForm, tax_able: e.target.checked })}
                  className="w-5 h-5 rounded accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlatform(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Αποθήκευση Πλατφόρμας</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 3. NATIONALITY MODAL ── */}
      {editingNationality && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-extrabold">
                  {editingNationality === 'NEW' ? 'Προσθήκη Νέας Εθνικότητας' : `Επεξεργασία Εθνικότητας #${editingNationality.nationality_aid}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingNationality(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNationality} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Όνομα Εθνικότητας / Χώρας *</label>
                <input
                  type="text"
                  value={nationalityForm.nationality}
                  onChange={(e) => setNationalityForm({ ...nationalityForm, nationality: e.target.value })}
                  placeholder="π.χ. Greece, Germany, United Kingdom"
                  className={`w-full p-2.5 rounded-xl border font-semibold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Σύμβολο / Σημαία (Emoji)</label>
                <input
                  type="text"
                  value={nationalityForm.symbol}
                  onChange={(e) => setNationalityForm({ ...nationalityForm, symbol: e.target.value })}
                  placeholder="π.χ. 🇬🇷, 🇩🇪, 🇬🇧"
                  className={`w-full p-2.5 rounded-xl border font-bold text-base ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNationality(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Αποθήκευση Εθνικότητας</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. HOUSE & PERIOD MODAL ── */}
      {editingHouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <HomeIcon className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-extrabold">
                  {editingHouse.house === 'NEW' ? 'Προσθήκη Νέου Σπιτιού & Περιόδου' : `Επεξεργασία Σπιτιού #${editingHouse.house.house_aid}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingHouse(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHouse} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Όνομα Σπιτιού / Βίλας *</label>
                <input
                  type="text"
                  value={houseForm.house_name}
                  onChange={(e) => setHouseForm({ ...houseForm, house_name: e.target.value })}
                  placeholder="π.χ. Villa Winston"
                  className={`w-full p-2.5 rounded-xl border font-bold text-sm ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              {/* Operating Period Settings (house_to_periods) */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>Περίοδος Ενοικίασης (Rental Period)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Start Date */}
                  <div>
                    <label className="block font-semibold mb-1 text-slate-400">Έναρξη: Ημέρα / Μήνας</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={houseForm.start_day}
                        onChange={(e) => setHouseForm({ ...houseForm, start_day: Number(e.target.value) })}
                        className="p-2 rounded-lg border border-slate-700 bg-slate-900 text-center font-bold text-amber-400"
                        title="Ημέρα Έναρξης"
                        required
                      />
                      <select
                        value={houseForm.start_month}
                        onChange={(e) => setHouseForm({ ...houseForm, start_month: Number(e.target.value) })}
                        className="col-span-2 p-2 rounded-lg border border-slate-700 bg-slate-900 font-semibold text-white text-xs"
                      >
                        {MONTH_OPTIONS.map(m => (
                          <option key={`sm-${m.val}`} value={m.val}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block font-semibold mb-1 text-slate-400">Λήξη: Ημέρα / Μήνας</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={houseForm.end_day}
                        onChange={(e) => setHouseForm({ ...houseForm, end_day: Number(e.target.value) })}
                        className="p-2 rounded-lg border border-slate-700 bg-slate-900 text-center font-bold text-amber-400"
                        title="Ημέρα Λήξης"
                        required
                      />
                      <select
                        value={houseForm.end_month}
                        onChange={(e) => setHouseForm({ ...houseForm, end_month: Number(e.target.value) })}
                        className="col-span-2 p-2 rounded-lg border border-slate-700 bg-slate-900 font-semibold text-white text-xs"
                      >
                        {MONTH_OPTIONS.map(m => (
                          <option key={`em-${m.val}`} value={m.val}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-400">Από Έτος (Start Year)</label>
                    <input
                      type="number"
                      value={houseForm.efective_startyear}
                      onChange={(e) => setHouseForm({ ...houseForm, efective_startyear: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 font-mono text-center font-bold text-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-400">Έως Έτος (End Year)</label>
                    <input
                      type="number"
                      value={houseForm.efective_endyear}
                      onChange={(e) => setHouseForm({ ...houseForm, efective_endyear: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 font-mono text-center font-bold text-slate-200"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingHouse(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Αποθήκευση Σπιτιού & Περιόδου</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. OWNER MODAL ── */}
      {editingOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-extrabold">
                  {editingOwner === 'NEW' ? 'Προσθήκη Νέου Ιδιοκτήτη' : `Επεξεργασία Ιδιοκτήτη #${editingOwner.owner_aid}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingOwner(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOwner} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Όνομα Ιδιοκτήτη *</label>
                <input
                  type="text"
                  value={ownerForm.name}
                  onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                  placeholder="π.χ. Winston George"
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
                  value={ownerForm.email}
                  onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                  placeholder="owner@example.com"
                  className={`w-full p-2.5 rounded-xl border font-normal ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Τηλέφωνο</label>
                <input
                  type="text"
                  value={ownerForm.phone}
                  onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                  placeholder="+30 6912345678"
                  className={`w-full p-2.5 rounded-xl border font-normal ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOwner(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Αποθήκευση Ιδιοκτήτη</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUICK NATIONALITY MODAL (FROM CUSTOMER FORM) ── */}
      {showQuickNationalityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-sm rounded-2xl border p-6 space-y-4 shadow-2xl relative transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-extrabold">Νέα Εθνικότητα</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickNationalityModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Όνομα Εθνικότητας *</label>
                <input
                  type="text"
                  value={quickNationalityName}
                  onChange={(e) => setQuickNationalityName(e.target.value)}
                  placeholder="π.χ. Australia"
                  className={`w-full p-2.5 rounded-xl border font-semibold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Σύμβολο / Σημαία (Emoji)</label>
                <input
                  type="text"
                  value={quickNationalitySymbol}
                  onChange={(e) => setQuickNationalitySymbol(e.target.value)}
                  placeholder="π.χ. 🇦🇺"
                  className={`w-full p-2.5 rounded-xl border font-bold text-base ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickNationalityModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Ακύρωση
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickNationality}
                  disabled={actionLoading || !quickNationalityName.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Προσθήκη</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
