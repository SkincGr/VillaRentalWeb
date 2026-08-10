import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qfmltxeattdcdetbrcie.supabase.co',
  'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA'
);

export const dynamic = 'force-dynamic';

// CREATE category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { expcategory } = body;

    if (!expcategory?.trim()) {
      return NextResponse.json({ error: 'Missing category name' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('expcategory')
      .insert({ expcategory: expcategory.trim() })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, category: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
