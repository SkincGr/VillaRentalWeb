import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfmltxeattdcdetbrcie.supabase.co';
const supabaseAnonKey = 'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reser_id, canceled } = body;

    if (reser_id === undefined || canceled === undefined) {
      return NextResponse.json({ error: 'Missing reser_id or canceled parameter' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reservations')
      .update({ canceled: Boolean(canceled) })
      .eq('reser_id', reser_id)
      .select();

    if (error) {
      console.error('Error updating reservation cancel status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: data?.[0] });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
