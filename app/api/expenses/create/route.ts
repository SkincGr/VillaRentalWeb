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
    const { f_expcategory_aid, dateis, expense, comments } = body;

    if (!dateis || expense === undefined) {
      return NextResponse.json({ error: 'Missing required fields: dateis, expense' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        f_expcategory_aid: f_expcategory_aid ? Number(f_expcategory_aid) : null,
        dateis,
        expense: Number(expense),
        comments: comments || null,
      })
      .select('*, expcategory(expcategory_aid, expcategory)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, expense: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
