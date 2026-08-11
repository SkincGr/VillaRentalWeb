'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Globe, TrendingUp, Calendar, Users, Home, Clock, BarChart2 } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const GR_MONTHS = ['', 'Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαϊ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];

const PALETTE = [
  '#38bdf8', '#818cf8', '#34d399', '#fb923c', '#f472b6',
  '#a78bfa', '#facc15', '#2dd4bf', '#f87171', '#60a5fa',
  '#c084fc', '#4ade80', '#fbbf24', '#e879f9', '#22d3ee',
  '#fb7185', '#a3e635', '#f97316',
];

// year → color (2015..2026)
const YEAR_COLORS: Record<number, string> = {
  2015: '#f87171', 2016: '#fb923c', 2017: '#facc15', 2018: '#4ade80',
  2019: '#34d399', 2020: '#22d3ee', 2021: '#38bdf8', 2022: '#60a5fa',
  2023: '#818cf8', 2024: '#a78bfa', 2025: '#e879f9', 2026: '#f472b6',
};

const DURATION_BUCKETS = [
  { key: '1-3',  label: '1-3 μέρες',  color: '#38bdf8', min: 1,  max: 3  },
  { key: '4-7',  label: '4-7 μέρες',  color: '#34d399', min: 4,  max: 7  },
  { key: '8-14', label: '8-14 μέρες', color: '#facc15', min: 8,  max: 14 },
  { key: '15-21',label: '15-21 μέρες',color: '#fb923c', min: 15, max: 21 },
  { key: '22+',  label: '22+ μέρες',  color: '#f472b6', min: 22, max: Infinity },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface RawReservation {
  reser_id: number;
  start_date: string;  // ISO timestamp e.g. "2015-07-04T00:00:00+00:00"
  end_date: string;
  canceled: boolean;
  f_house_aid: number | null;
  customers: {
    nationality: { nationality: string; symbol: string | null } | null;
  } | null;
  houses: {
    house_aid: number;
    house_name: string;
    start_period_date?: string | null;
    end_period_date?: string | null;
  } | null;
}

interface HousePeriodEntry {
  yearFrom: number;
  yearTo: number;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

function getFullYearPeriod(year: number): HousePeriodEntry {
  return {
    yearFrom: year,
    yearTo: year,
    startMonth: 1,
    startDay: 1,
    endMonth: 12,
    endDay: 31,
  };
}
interface NatCount { name: string; value: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Extract year/month from ISO timestamp or date string
function getYear(d: string): number  { return new Date(d).getFullYear(); }
function getMonth(d: string): number { return new Date(d).getMonth() + 1; } // 1-12

function parseMonth(s: string | null | undefined): number {
  if (!s) return 5;
  const value = s.trim();
  const yearMonthMatch = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (yearMonthMatch) return parseInt(yearMonthMatch[2], 10) || 5;

  const shortMatch = value.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (shortMatch) return parseInt(shortMatch[1], 10) || 5;

  const fallback = value.match(/(\d{1,2})/);
  return fallback ? parseInt(fallback[1], 10) || 5 : 5;
}

function getAllowedMonths(sp: string | null, ep: string | null): number[] {
  const startMonth = parseMonth(sp);
  const endMonth = parseMonth(ep);
  const from = Math.min(startMonth, endMonth);
  const to = Math.max(startMonth, endMonth);

  if (startMonth && endMonth && from >= 1 && to <= 12) {
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }

  return [5, 6, 7, 8, 9, 10];
}

function toInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function getPeriodForYear(periods: HousePeriodEntry[], year: number): HousePeriodEntry | null {
  const matches = periods
    .filter(period => year >= period.yearFrom && year <= period.yearTo)
    .sort((a, b) => {
      const rangeA = a.yearTo - a.yearFrom;
      const rangeB = b.yearTo - b.yearFrom;
      return rangeA - rangeB || b.yearFrom - a.yearFrom;
    });

  return matches[0] ?? null;
}

function getPeriodMonths(period: HousePeriodEntry): number[] {
  const startMonth = Math.min(12, Math.max(1, period.startMonth));
  const endMonth = Math.min(12, Math.max(1, period.endMonth));

  if (startMonth <= endMonth) {
    return Array.from({ length: endMonth - startMonth + 1 }, (_, index) => startMonth + index);
  }

  return [
    ...Array.from({ length: 13 - startMonth }, (_, index) => startMonth + index),
    ...Array.from({ length: endMonth }, (_, index) => index + 1),
  ];
}

function isReservationInsidePeriod(reservation: RawReservation, period: HousePeriodEntry, year: number): boolean {
  const reservationStart = new Date(reservation.start_date);
  const reservationEnd = new Date(reservation.end_date);
  const periodStart = new Date(Date.UTC(year, period.startMonth - 1, period.startDay));
  const periodEndYear = period.endMonth < period.startMonth ? year + 1 : year;
  const periodEnd = new Date(Date.UTC(periodEndYear, period.endMonth - 1, period.endDay + 1));

  return reservationEnd > periodStart && reservationStart < periodEnd;
}

function formatHousePeriod(period: HousePeriodEntry): string {
  return `${period.startDay} ${GR_MONTHS[period.startMonth]} – ${period.endDay} ${GR_MONTHS[period.endMonth]}`;
}

function calcDays(s: string, e: string): number {
  const diff = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400000);
  return Math.max(1, diff);
}

function getBucket(d: number): string {
  if (d <= 3) return '1-3';
  if (d <= 7) return '4-7';
  if (d <= 14) return '8-14';
  if (d <= 21) return '15-21';
  return '22+';
}

function buildCounts(rows: RawReservation[]): NatCount[] {
  const map: Record<string, number> = {};
  for (const r of rows) {
    if (r.canceled) continue;
    const nat = r.customers?.nationality?.nationality ?? 'Άγνωστη';
    map[nat] = (map[nat] ?? 0) + 1;
  }
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function pct(val: number, total: number) {
  return total === 0 ? '0%' : `${((val / total) * 100).toFixed(1)}%`;
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 shadow-xl text-xs">
      <p className="font-bold text-white mb-1">{d.name}</p>
      <p className="text-sky-400">{d.value} κρατήσεις</p>
    </div>
  );
}

function StackedBarTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-xl text-xs max-w-[220px]">
      <p className="font-black text-white mb-2">{label}</p>
      {payload.filter((p: any) => p.value > 0).sort((a: any, b: any) => b.value - a.value).map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-0.5">
          <span style={{ color: p.fill }}>{p.dataKey}</span>
          <span className="text-white font-semibold">{p.value}{unit ? ` ${unit}` : ''} ({pct(p.value, total)})</span>
        </div>
      ))}
      <div className="border-t border-slate-700 mt-2 pt-1.5 flex justify-between">
        <span className="text-slate-400">Σύνολο</span>
        <span className="text-white font-bold">{total}{unit ? ` ${unit}` : ''}</span>
      </div>
    </div>
  );
}

// ─── Pie Label ────────────────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, outerRadius, percent, name }: any) {
  if (percent < 0.04) return null;
  const R = Math.PI / 180;
  const r = outerRadius + 24;
  const x = cx + r * Math.cos(-midAngle * R);
  const y = cy + r * Math.sin(-midAngle * R);
  return (
    <text x={x} y={y} fill="#94a3b8" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={600}>
      {name} {(percent * 100).toFixed(1)}%
    </text>
  );
}

// ─── Pie Section ──────────────────────────────────────────────────────────────
function PieSection({ title, subtitle, icon: Icon, data, color }: {
  title: string; subtitle: string; icon: any; data: NatCount[]; color: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <p className="text-slate-400 text-xs">{subtitle} · {total} κρατήσεις</p>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm py-10">Χωρίς δεδομένα</div>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" outerRadius={78} innerRadius={34} dataKey="value" labelLine={false} label={PieLabel}>
                  {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="transparent" />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2.5 group">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="text-slate-300 text-xs flex-1 truncate group-hover:text-white transition-colors">{d.name}</span>
                <span className="text-slate-400 text-xs font-mono">{d.value}</span>
                <span className="text-sky-400 text-xs font-bold w-12 text-right">{pct(d.value, total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function SectionDivider({ icon: Icon, title, subtitle, color }: { icon: any; title: string; subtitle: string; color: string; }) {
  return (
    <div className={`flex items-center gap-3 py-2 border-l-4 pl-4 ${color}`}>
      <Icon className="w-5 h-5 text-slate-300" />
      <div>
        <h2 className="font-black text-white text-base">{title}</h2>
        <p className="text-slate-400 text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StatisticsPage() {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  const [reservations, setReservations] = useState<RawReservation[]>([]);
  const [housePeriods, setHousePeriods] = useState<Record<number, HousePeriodEntry[]>>({});
  const [loading, setLoading] = useState(true);

  // House analysis state
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'nationality' | 'monthly' | 'duration'>('nationality');

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setLoading(true);

      try {
        const response = await fetch('/api/reservations', { cache: 'no-store' });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error || 'Αδυναμία φόρτωσης στατιστικών');
        }

        const items = Array.isArray(json?.reservations) ? json.reservations : [];
        const normalizedPeriods: Record<number, HousePeriodEntry[]> = {};

        if (json?.housePeriods && typeof json.housePeriods === 'object') {
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

        if (isMounted) {
          setReservations(items as RawReservation[]);
          setHousePeriods(normalizedPeriods);
        }
      } catch (err) {
        console.error('Statistics load error:', err);
        if (isMounted) {
          setReservations([]);
          setHousePeriods({});
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentYear = new Date().getFullYear();

  // ── Nationality data ────────────────────────────────────────────────────────
  const allData      = useMemo(() => buildCounts(reservations), [reservations]);
  const fiveYearData = useMemo(() => buildCounts(reservations.filter(r => r.start_date >= `${currentYear - 4}-01-01`)), [reservations, currentYear]);
  const threeYearData= useMemo(() => buildCounts(reservations.filter(r => r.start_date >= `${currentYear - 2}-01-01`)), [reservations, currentYear]);

  const { barData: natBarData, allNats } = useMemo(() => {
    const yearMap: Record<number, Record<string, number>> = {};
    const natSet = new Set<string>();
    for (const r of reservations) {
      if (r.canceled) continue;
      const yr = getYear(r.start_date);
      if (isNaN(yr)) continue;
      const nat = r.customers?.nationality?.nationality ?? 'Άγνωστη';
      natSet.add(nat);
      yearMap[yr] = yearMap[yr] ?? {};
      yearMap[yr][nat] = (yearMap[yr][nat] ?? 0) + 1;
    }
    const years = Object.keys(yearMap).map(Number).sort();
    return {
      barData: years.map(yr => ({ year: yr.toString(), ...yearMap[yr] })),
      allNats: Array.from(natSet).sort(),
    };
  }, [reservations]);

  const topNats = useMemo(() => allData.map(d => d.name), [allData]);
  const totalAll = allData.reduce((s, d) => s + d.value, 0);

  // ── House monthly data ──────────────────────────────────────────────────────
  const houseAnalysis = useMemo(() => {
    const houseMap: Record<number, {
      house: RawReservation['houses'];
      allowedMonths: number[];
      periodsByYear: Record<number, HousePeriodEntry>;
      years: number[];
      byYearMonth: Record<string, Record<number, { days: number; bookings: number }>>;
      totalByMonth: Record<number, { days: number; bookings: number }>;
    }> = {};

    for (const r of reservations) {
      if (r.canceled || !r.houses) continue;
      const hid = r.houses.house_aid;
      if (!houseMap[hid]) {
        houseMap[hid] = {
          house: r.houses,
          allowedMonths: [],
          periodsByYear: {},
          years: [],
          byYearMonth: {},
          totalByMonth: {},
        };
      }
      const entry = houseMap[hid];
      const yr = getYear(r.start_date);
      const periodInfo = getPeriodForYear(housePeriods[hid] ?? [], yr) ?? getFullYearPeriod(yr);
      if (!isReservationInsidePeriod(r, periodInfo, yr)) continue;

      const allowedMonthsForYear = getPeriodMonths(periodInfo);
      const mo = getMonth(r.start_date);
      if (!allowedMonthsForYear.includes(mo)) continue;

      entry.periodsByYear[yr] = periodInfo;
      allowedMonthsForYear.forEach(month => {
        if (!entry.allowedMonths.includes(month)) entry.allowedMonths.push(month);
        entry.totalByMonth[month] = entry.totalByMonth[month] ?? { days: 0, bookings: 0 };
      });

      const days = calcDays(r.start_date, r.end_date);
      const yrStr = yr.toString();
      if (!entry.byYearMonth[yrStr]) {
        const init: Record<number, { days: number; bookings: number }> = {};
        allowedMonthsForYear.forEach(m => { init[m] = { days: 0, bookings: 0 }; });
        entry.byYearMonth[yrStr] = init;
      }
      if (!entry.years.includes(yr)) entry.years.push(yr);
      entry.byYearMonth[yrStr][mo].days += days;
      entry.byYearMonth[yrStr][mo].bookings += 1;
      entry.totalByMonth[mo].days += days;
      entry.totalByMonth[mo].bookings += 1;
    }
    Object.values(houseMap).forEach(h => {
      h.years.sort((a, b) => a - b);
      h.allowedMonths.sort((a, b) => a - b);
    });
    return Object.values(houseMap).filter(house => house.years.length > 0);
  }, [housePeriods, reservations]);

  const houses = useMemo(() => houseAnalysis.map(h => h.house!), [houseAnalysis]);

  // auto-select first house
  useEffect(() => {
    if (houses.length > 0 && selectedHouseId === null) setSelectedHouseId(houses[0].house_aid);
  }, [houses, selectedHouseId]);

  const selectedHouseData = useMemo(
    () => houseAnalysis.find(h => h.house?.house_aid === selectedHouseId),
    [houseAnalysis, selectedHouseId]
  );

  // Build chart data for selected house
  const houseChartData = useMemo(() => {
    if (!selectedHouseData) return { chartRows: [], years: [] };
    const { allowedMonths, byYearMonth, years } = selectedHouseData;
    const chartRows = allowedMonths.map(m => {
      const row: any = { month: GR_MONTHS[m] };
      years.forEach(yr => {
        const d = byYearMonth[yr.toString()]?.[m];
        row[yr.toString()] = d?.bookings ?? 0;
      });
      return row;
    });
    return { chartRows, years };
  }, [selectedHouseData]);

  // ── Duration data ───────────────────────────────────────────────────────────
  const durationAnalysis = useMemo(() => {
    const yearMap: Record<string, Record<string, number>> = {};
    const yearStats: Record<string, { min: number; max: number; sum: number; count: number }> = {};

    for (const r of reservations) {
      if (r.canceled) continue;
      const yr = getYear(r.start_date).toString();
      const days = calcDays(r.start_date, r.end_date);
      const bucket = getBucket(days);
      if (!yearMap[yr]) {
        yearMap[yr] = { '1-3': 0, '4-7': 0, '8-14': 0, '15-21': 0, '22+': 0 };
        yearStats[yr] = { min: Infinity, max: 0, sum: 0, count: 0 };
      }
      yearMap[yr][bucket]++;
      yearStats[yr].min = Math.min(yearStats[yr].min, days);
      yearStats[yr].max = Math.max(yearStats[yr].max, days);
      yearStats[yr].sum += days;
      yearStats[yr].count++;
    }

    const years = Object.keys(yearMap).sort();
    return {
      barData: years.map(yr => ({ year: yr, ...yearMap[yr] })),
      statsData: years.map(yr => ({
        year: yr,
        min: yearStats[yr].min === Infinity ? 0 : yearStats[yr].min,
        max: yearStats[yr].max,
        avg: yearStats[yr].count ? Math.round(yearStats[yr].sum / yearStats[yr].count * 10) / 10 : 0,
        total: yearStats[yr].count,
      })),
    };
  }, [reservations]);

  return (
    <div className={`h-full flex flex-col max-w-7xl mx-auto w-full overflow-hidden space-y-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>

      {/* ── FRAME 1: TOP FIXED ── */}
      <div className="p-4 rounded-2xl border-2 border-slate-800 bg-slate-900 text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">Στατιστικά</h1>
            <p className="text-xs text-slate-400">Ανάλυση κρατήσεων · Εθνικότητα · Μήνες · Διάρκεια</p>
          </div>
          {!loading && (
            <div className="ml-auto flex gap-4">
              <div className="text-center">
                <div className="text-xl font-black text-sky-400">{totalAll}</div>
                <div className="text-[10px] text-slate-400 uppercase">Κρατήσεις</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-emerald-400">{allData.length}</div>
                <div className="text-[10px] text-slate-400 uppercase">Εθνικότητες</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-violet-400">{houses.length}</div>
                <div className="text-[10px] text-slate-400 uppercase">Σπίτια</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FRAME 2: SCROLLABLE ── */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-2 shrink-0"
        role="tablist"
        aria-label="Κατηγορίες στατιστικών"
      >
        {[
          { id: 'nationality' as const, label: 'Εθνικότητα', icon: Globe, activeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
          { id: 'monthly' as const, label: 'Ενοικιάσεις ανά Μήνα', icon: Calendar, activeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
          { id: 'duration' as const, label: 'Ανά Διάρκεια Ενοικίασης', icon: Clock, activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? tab.activeClass
                  : 'border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 pb-20 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Φόρτωση δεδομένων...</p>
          </div>
        ) : (
          <>
            {/* ════════════════════════════════════════════════════════
                SECTION 1 — ΕΘΝΙΚΟΤΗΤΑ
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'nationality' && (
              <div className="space-y-6" role="tabpanel">
            <SectionDivider icon={Globe} title="Ανάλυση Εθνικότητας" subtitle="Κατανομή κρατήσεων ανά χώρα επισκεπτών" color="border-sky-500" />

            {/* 3 Pie Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PieSection title="Όλα τα Χρόνια" subtitle="Σύνολο" icon={Globe} data={allData} color="from-sky-500 to-indigo-600" />
              <PieSection title="Τελευταία Πενταετία" subtitle={`${currentYear - 4} – ${currentYear}`} icon={TrendingUp} data={fiveYearData} color="from-violet-500 to-purple-600" />
              <PieSection title="Τελευταία Τριετία" subtitle={`${currentYear - 2} – ${currentYear}`} icon={Calendar} data={threeYearData} color="from-emerald-500 to-teal-600" />
            </div>

            {/* Year-by-Year Stacked Bar (Nationality) */}
            <div className="glass-panel rounded-2xl border border-slate-800 p-5">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Εξέλιξη Εθνικότητας ανά Έτος</h3>
                  <p className="text-slate-400 text-xs">Σύνθεση εθνικοτήτων κρατήσεων για κάθε χρονιά</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={natBarData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<StackedBarTooltip />} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(v) => <span style={{ color: '#94a3b8' }}>{v}</span>} />
                    {allNats.map((nat, i) => (
                      <Bar key={nat} dataKey={nat} stackId="a"
                        fill={PALETTE[topNats.indexOf(nat) >= 0 ? topNats.indexOf(nat) : i] ?? PALETTE[i % PALETTE.length]}
                        radius={i === allNats.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Nationality % Table */}
            <div className="glass-panel rounded-2xl border border-slate-800">
              <div className="p-4 border-b border-slate-800">
                <h3 className="font-bold text-white text-sm">Αναλυτικός Πίνακας ανά Έτος (%)</h3>
                <p className="text-slate-400 text-xs mt-0.5">Ποσοστό κάθε εθνικότητας για κάθε έτος — τα μηδενικά παραλείπονται</p>
              </div>
              <table className="w-full text-xs text-slate-300 min-w-[900px]">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b-2 border-slate-700">
                    <th className="sticky left-0 z-30 bg-slate-900 px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap shadow-[2px_0_6px_rgba(0,0,0,0.4)]">Εθνικότητα</th>
                    {natBarData.map(b => <th key={b.year} className="bg-slate-900 px-3 py-3 text-center text-slate-400 font-semibold uppercase tracking-wider">{b.year}</th>)}
                    <th className="bg-slate-900 px-4 py-3 text-center text-sky-400 font-bold uppercase tracking-wider">Σύνολο</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {allData.map((nat, i) => {
                    const rowTotal = natBarData.reduce((s, b) => s + ((b as any)[nat.name] ?? 0), 0);
                    return (
                      <tr key={nat.name} className="hover:bg-slate-800/30 transition-colors">
                        <td className="sticky left-0 z-10 bg-slate-900 px-4 py-2.5 font-medium text-white whitespace-nowrap shadow-[2px_0_6px_rgba(0,0,0,0.3)]">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                            {nat.name}
                          </div>
                        </td>
                        {natBarData.map(b => {
                          const val = (b as any)[nat.name] ?? 0;
                          const yrTotal = allNats.reduce((s, n) => s + ((b as any)[n] ?? 0), 0);
                          return (
                            <td key={b.year} className="px-3 py-2.5 text-center">
                              {val > 0 ? (
                                <span className="font-semibold text-white">{pct(val, yrTotal)}<span className="text-slate-500 ml-1">({val})</span></span>
                              ) : <span className="text-slate-700">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-sky-400 font-bold">{pct(rowTotal, totalAll)}</span>
                          <span className="text-slate-500 ml-1">({rowTotal})</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-700 bg-slate-800/40">
                    <td className="sticky left-0 z-10 bg-slate-800 px-4 py-3 font-bold text-white uppercase text-[10px] tracking-wide shadow-[2px_0_6px_rgba(0,0,0,0.3)]">Σύνολο</td>
                    {natBarData.map(b => {
                      const tot = allNats.reduce((s, n) => s + ((b as any)[n] ?? 0), 0);
                      return <td key={b.year} className="px-3 py-3 text-center font-bold text-emerald-400">{tot}</td>;
                    })}
                    <td className="px-4 py-3 text-center font-bold text-emerald-400">{totalAll}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ════════════════════════════════════════════════════════
                SECTION 2 — ΑΝΑΛΥΣΗ ΑΝΑ ΣΠΙΤΙ / ΜΗΝΑ
            ═══════════════════════════════════════════════════════════ */}
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="space-y-6" role="tabpanel">
            <SectionDivider icon={Home} title="Ενοικιάσεις ανά Μήνα" subtitle="Πλήθος κρατήσεων ανά μήνα, με ξεχωριστή μπάρα για κάθε έτος" color="border-violet-500" />

            <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
              {/* House Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {houses.map(h => (
                    <button key={h.house_aid} onClick={() => setSelectedHouseId(h.house_aid)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedHouseId === h.house_aid
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                      }`}>
                      {h.house_name}
                    </button>
                  ))}
                </div>
                <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                  Occurrence (Κρατήσεις)
                </span>
              </div>

              {/* Info about rental period */}
              {selectedHouseData && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>📅 Περίοδος ενοικίασης από House to Periods:</span>
                  {selectedHouseData.years.map(year => {
                    const period = selectedHouseData.periodsByYear[year];
                    return period ? (
                      <span key={year} className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-slate-300 font-semibold">
                        {year}: {formatHousePeriod(period)}
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {/* Stacked Bar Chart: months × years */}
              {houseChartData.chartRows.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Δεν υπάρχουν δεδομένα για αυτό το σπίτι</div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={houseChartData.chartRows} barGap={4} barCategoryGap="20%" margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={42}
                        label={{ value: 'Occurrence', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10, dy: 40 }} />
                      <Tooltip content={<StackedBarTooltip unit="κρατήσεις" />} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(v) => <span style={{ color: YEAR_COLORS[parseInt(v)] ?? '#94a3b8' }}>{v}</span>} />
                      {houseChartData.years.map((yr, i) => (
                        <Bar key={yr} dataKey={yr.toString()}
                          fill={YEAR_COLORS[yr] ?? PALETTE[i % PALETTE.length]}
                          radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Month × Year Table */}
              {selectedHouseData && (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs text-slate-300">
                    <thead className="sticky top-0 z-10 bg-slate-900 shadow-md">
                      <tr className="border-b border-slate-700 bg-slate-900/60">
                        <th className="px-4 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wider">Μήνας</th>
                        {selectedHouseData.years.map(yr => (
                          <th key={yr} className="px-3 py-2.5 text-center font-semibold" style={{ color: YEAR_COLORS[yr] ?? '#94a3b8' }}>{yr}</th>
                        ))}
                        <th className="px-4 py-2.5 text-center text-slate-300 font-semibold">Σύνολο</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {selectedHouseData.allowedMonths.map(m => {
                        const rowTotal = selectedHouseData.years.reduce((s, yr) => {
                          const d = selectedHouseData.byYearMonth[yr.toString()]?.[m];
                          return s + (d?.bookings ?? 0);
                        }, 0);
                        return (
                          <tr key={m} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-2 font-semibold text-white">{GR_MONTHS[m]}</td>
                            {selectedHouseData.years.map(yr => {
                              const d = selectedHouseData.byYearMonth[yr.toString()]?.[m];
                              const val = d?.bookings ?? 0;
                              return (
                                <td key={yr} className="px-3 py-2 text-center">
                                  {val > 0 ? <span className="font-semibold text-white">{val}</span> : <span className="text-slate-700">—</span>}
                                </td>
                              );
                            })}
                            <td className="px-4 py-2 text-center font-bold text-sky-400">{rowTotal || <span className="text-slate-700">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-700 bg-slate-800/40">
                        <td className="px-4 py-2.5 font-bold text-white uppercase text-[10px] tracking-wide">Σύνολο</td>
                        {selectedHouseData.years.map(yr => {
                          const tot = selectedHouseData.allowedMonths.reduce((s, m) => {
                            const d = selectedHouseData.byYearMonth[yr.toString()]?.[m];
                            return s + (d?.bookings ?? 0);
                          }, 0);
                          return <td key={yr} className="px-3 py-2.5 text-center font-bold text-emerald-400">{tot}</td>;
                        })}
                        <td className="px-4 py-2.5 text-center font-bold text-emerald-400">
                          {selectedHouseData.allowedMonths.reduce((s, m) => s + (selectedHouseData.totalByMonth[m]?.bookings ?? 0), 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════════════════════
                SECTION 3 — ΔΙΑΡΚΕΙΑ ΚΡΑΤΗΣΕΩΝ
            ═══════════════════════════════════════════════════════════ */}
              </div>
            )}

            {activeTab === 'duration' && (
              <div className="space-y-6" role="tabpanel">
            <SectionDivider icon={Clock} title="Ανά Διάρκεια Ενοικίασης" subtitle="Κατανομή ημερών κάθε κράτησης — πόσο διαρκεί η κάθε ενοικίαση" color="border-amber-500" />

            <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Κατανομή Διάρκειας</h3>
                  <p className="text-slate-400 text-xs">Stacked bars ανά διάρκεια κράτησης (ημέρες)</p>
                </div>
                {/* Duration bucket legend */}
                <div className="ml-auto flex flex-wrap gap-3">
                  {DURATION_BUCKETS.map(b => (
                    <div key={b.key} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded" style={{ background: b.color }} />
                      <span className="text-xs text-slate-400">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={durationAnalysis.barData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<StackedBarTooltip unit="κρατήσεις" />} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
                    {DURATION_BUCKETS.map((b, i) => (
                      <Bar key={b.key} dataKey={b.key} stackId="a" fill={b.color}
                        radius={i === DURATION_BUCKETS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary stats table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-slate-300 min-w-[600px]">
                  <thead className="sticky top-0 z-10 bg-slate-900 shadow-md">
                    <tr className="border-b border-slate-700 bg-slate-900/60">
                      <th className="px-4 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wider">Έτος</th>
                      <th className="px-4 py-2.5 text-center text-slate-400 font-semibold uppercase tracking-wider">Κρατήσεις</th>
                      <th className="px-4 py-2.5 text-center text-slate-400 font-semibold uppercase tracking-wider">Min (μέρες)</th>
                      <th className="px-4 py-2.5 text-center text-slate-400 font-semibold uppercase tracking-wider">Max (μέρες)</th>
                      <th className="px-4 py-2.5 text-center text-sky-400 font-semibold uppercase tracking-wider">Μέσος Όρος</th>
                      {DURATION_BUCKETS.map(b => (
                        <th key={b.key} className="px-3 py-2.5 text-center font-semibold uppercase tracking-wider" style={{ color: b.color }}>{b.key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {durationAnalysis.statsData.map(row => {
                      const barRow = durationAnalysis.barData.find(b => b.year === row.year);
                      return (
                        <tr key={row.year} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-sky-400">{row.year}</td>
                          <td className="px-4 py-2.5 text-center text-white font-semibold">{row.total}</td>
                          <td className="px-4 py-2.5 text-center text-emerald-400 font-semibold">{row.min}</td>
                          <td className="px-4 py-2.5 text-center text-rose-400 font-semibold">{row.max}</td>
                          <td className="px-4 py-2.5 text-center text-sky-400 font-bold">{row.avg}</td>
                          {DURATION_BUCKETS.map(b => {
                            const val = (barRow as any)?.[b.key] ?? 0;
                            return (
                              <td key={b.key} className="px-3 py-2.5 text-center">
                                {val > 0 ? (
                                  <span className="font-semibold text-white">
                                    {val}
                                    <span className="text-slate-500 ml-1">({pct(val, row.total)})</span>
                                  </span>
                                ) : <span className="text-slate-700">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
