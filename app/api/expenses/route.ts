import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qfmltxeattdcdetbrcie.supabase.co',
  'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA',
  {
    auth: { persistSession: false },
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        });
      },
    },
  }
);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [expensesRes, categoriesRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('*, expcategory(expcategory_aid, expcategory)')
        .order('dateis', { ascending: false }),
      supabase
        .from('expcategory')
        .select('*')
        .order('expcategory', { ascending: true }),
    ]);

    return NextResponse.json({
      expenses: expensesRes.data || [],
      categories: categoriesRes.data || [],
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
