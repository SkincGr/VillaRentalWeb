import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfmltxeattdcdetbrcie.supabase.co';
const supabaseAnonKey = 'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [housesRes, reservationsRes, taxKlimakaRes, taxItemsRes, platformsRes, nationalityRes, customersRes] = await Promise.all([
      supabase.from('houses').select('*'),
      supabase
        .from('reservations')
        .select(`
          *,
          customers (
            *,
            nationality (*)
          ),
          platforms (*),
          houses (*)
        `)
        .order('start_date', { ascending: true }),
      supabase.from('tax_klimaka').select('*'),
      supabase.from('tax_klimaka_items').select('*').order('from_amount', { ascending: true }),
      supabase.from('platforms').select('*'),
      supabase.from('nationality').select('*').order('nationality', { ascending: true }),
      supabase.from('customers').select('*, nationality (*)').order('name', { ascending: true })
    ]);

    if (reservationsRes.error) {
      console.error('API Reservations Error:', reservationsRes.error);
      return NextResponse.json({ error: reservationsRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      houses: housesRes.data || [],
      reservations: reservationsRes.data || [],
      taxKlimaka: taxKlimakaRes.data || [],
      taxKlimakaItems: taxItemsRes.data || [],
      platforms: platformsRes.data || [],
      nationalities: nationalityRes.data || [],
      customers: customersRes.data || []
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
