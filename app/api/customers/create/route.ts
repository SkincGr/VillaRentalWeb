import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfmltxeattdcdetbrcie.supabase.co';
const supabaseAnonKey = 'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, f_nationallity_aid } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          name: name.trim(),
          email: email ? email.trim() : null,
          phone: phone ? phone.trim() : null,
          f_nationallity_aid: f_nationallity_aid ? Number(f_nationallity_aid) : null
        }
      ])
      .select(`
        *,
        nationality (*)
      `);

    if (error) {
      console.error('Error creating customer:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, customer: data?.[0] });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
