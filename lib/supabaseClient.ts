import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfmltxeattdcdetbrcie.supabase.co';
const supabaseAnonKey = 'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface House {
  house_aid: number;
  house_name: string;
  f_city_aid?: number;
  start_period_date?: string | null; // e.g. '05-15' or '2026-05-15'
  end_period_date?: string | null;   // e.g. '10-15' or '2026-10-15'
}

export interface HouseToPeriod {
  f_house_aid: number;
  start_month: number;
  start_day: number;
  end_month: number;
  end_day: number;
  efective_startyear: number;
  efective_endyear: number;
  created_at?: string;
}

export interface Platform {
  platform_id: number;
  name: string;
  commission: number;
  tax_able: boolean;
  payment_way?: number;
  plat_commission?: number;
}

export interface Nationality {
  nationality_aid: number;
  nationality: string;
  symbol?: string | null;
}

export interface Customer {
  custom_id: number;
  name: string;
  email?: string;
  phone?: string;
  f_nationallity_aid?: number;
  nationality?: Nationality | null;
}

export interface Owner {
  owner_aid: number;
  name: string;
  email?: string;
  phone?: string;
}

export interface Reservation {
  reser_id: number;
  f_house_aid?: number;
  f_platform_id?: number;
  f_custom_id?: number;
  start_date: string;
  end_date: string;
  fee: number;
  num_of_visitors: number;
  kids: number;
  notes?: string;
  comments?: string;
  canceled: boolean;
  payed?: boolean;
  reservation_day?: string;
  advanced_payment?: number;
  rank?: number | null;
  customers?: Customer;
  platforms?: Platform;
  houses?: House;
}

export interface TaxKlimaka {
  tax_range_aid: number;
  start_date: string | null;
  end_date: string | null;
  is_company: boolean;
  fpa: number;
  discount: number;
}

export interface TaxKlimakaItem {
  tax_klimaka_items_aid: number;
  f_tax_klimaka_aid: number;
  from_amount: number;
  to_amount: number;
  pososto: number;
}

export function getTaxDiscountPercentage(taxKlimakaList: TaxKlimaka[] = [], year?: number): number {
  if (!taxKlimakaList || taxKlimakaList.length === 0) return 5;
  const targetYear = year || new Date().getFullYear();
  const match = taxKlimakaList.find(tk => {
    if (tk.is_company) return false;
    const startYear = tk.start_date ? parseInt(tk.start_date.split('-')[0], 10) : 2000;
    const endYear = tk.end_date ? parseInt(tk.end_date.split('-')[0], 10) : 2099;
    return targetYear >= startYear && targetYear <= endYear;
  });
  if (match && typeof match.discount === 'number') {
    return match.discount;
  }
  const nonCompany = taxKlimakaList.find(tk => !tk.is_company);
  return nonCompany?.discount ?? 5;
}

export function calculateProgressiveTax(taxableGrossFee: number, items: TaxKlimakaItem[], discountPct: number = 0): number {
  if (taxableGrossFee <= 0) return 0;
  
  // Subtract discount percentage from taxable amount:
  // e.g. 5% discount -> effective taxable = taxableGrossFee * (1 - discountPct / 100)
  const effectiveTaxable = discountPct > 0 
    ? taxableGrossFee * (1 - discountPct / 100) 
    : taxableGrossFee;

  if (effectiveTaxable <= 0) return 0;

  const brackets = items && items.length > 0 
    ? items.filter(i => i.f_tax_klimaka_aid === 1).sort((a, b) => a.from_amount - b.from_amount)
    : [
        { tax_klimaka_items_aid: 1, f_tax_klimaka_aid: 1, from_amount: 0, to_amount: 12000, pososto: 15 },
        { tax_klimaka_items_aid: 2, f_tax_klimaka_aid: 1, from_amount: 12000, to_amount: 25000, pososto: 35 },
        { tax_klimaka_items_aid: 3, f_tax_klimaka_aid: 1, from_amount: 25000, to_amount: 1000000, pososto: 45 }
      ];

  let totalTax = 0;
  for (const b of brackets) {
    if (effectiveTaxable > b.from_amount) {
      const taxableInBracket = Math.min(effectiveTaxable, b.to_amount) - b.from_amount;
      totalTax += taxableInBracket * (b.pososto / 100);
    }
  }
  return totalTax;
}

