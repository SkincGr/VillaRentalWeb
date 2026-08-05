import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://qfmltxeattdcdetbrcie.supabase.co';
const VALID_ANON_KEY = 'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.trim().startsWith('http')) 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim() 
  : DEFAULT_URL;

const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
const supabaseAnonKey = envKey.includes('luRxRKO') ? envKey : VALID_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Customer {
  custom_id: number;
  name: string;
  f_nationallity_aid: number | null;
  email: string | null;
  phone: string | null;
}

export interface Platform {
  platform_id: number;
  name: string;
  commission: number;
  tax_able: boolean;
  payment_way: number;
  plat_commission: number | null;
}

export interface House {
  house_aid: number;
  f_city_aid: number | null;
  house_name: string | null;
}

export interface Reservation {
  reser_id: number;
  f_house_aid: number | null;
  f_platform_id: number;
  f_custom_id: number;
  start_date: string;
  end_date: string;
  fee: number;
  num_of_visitors: number;
  notes: string | null;
  reservation_day: string;
  comments: string | null;
  canceled: boolean;
  kids: number;
  advanced_payment: number;
  // Joined fields
  customers?: Customer;
  platforms?: Platform;
  houses?: House;
}

export interface Nationality {
  nationality_aid: number;
  nationality: string;
  symbol: string | null;
}

export interface Owner {
  owner_aid: number;
  f_nationality_aid: number | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  is_company: boolean | null;
}

export interface Manager {
  manager_aid: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  f_nationality_aid: number | null;
}

export interface ManagerToHouse {
  manager_to_house_aid: number;
  f_manager_aid: number;
  f_house_aid: number;
}
