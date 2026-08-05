import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://qfmltxeattdcdetbrcie.supabase.co';
const VALID_ANON_KEY = 'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.trim().startsWith('http')) 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim() 
  : DEFAULT_URL;

const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
const supabaseAnonKey = envKey.includes('luRxRKO') ? envKey : VALID_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [housesRes, reservationsRes] = await Promise.all([
      supabase.from('houses').select('*'),
      supabase
        .from('reservations')
        .select(`
          *,
          customers (*),
          platforms (*),
          houses (*)
        `)
        .order('start_date', { ascending: false })
    ]);

    if (reservationsRes.error) {
      console.error('API Reservations Error:', reservationsRes.error);
      return NextResponse.json({ error: reservationsRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      houses: housesRes.data || [],
      reservations: reservationsRes.data || []
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
