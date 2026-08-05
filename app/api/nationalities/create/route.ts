import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfmltxeattdcdetbrcie.supabase.co';
const supabaseAnonKey = 'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nationality } = body;

    if (!nationality || !nationality.trim()) {
      return NextResponse.json({ error: 'Nationality name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('nationality')
      .insert([
        {
          nationality: nationality.trim()
        }
      ])
      .select();

    if (error) {
      console.error('Error creating nationality:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, nationality: data?.[0] });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
