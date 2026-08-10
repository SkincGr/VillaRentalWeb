import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qfmltxeattdcdetbrcie.supabase.co',
  'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA'
);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { expenses_aid } = body;

    if (!expenses_aid) {
      return NextResponse.json({ error: 'Missing expenses_aid' }, { status: 400 });
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('expenses_aid', expenses_aid);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
