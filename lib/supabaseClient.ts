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
  customers?: Customer;
  platforms?: Platform;
  houses?: House;
}
