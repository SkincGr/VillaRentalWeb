import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfmltxeattdcdetbrcie.supabase.co';
const supabaseAnonKey = 'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      reser_id, 
      fee, 
      num_of_visitors, 
      kids, 
      start_date, 
      end_date, 
      f_platform_id, 
      f_house_aid, 
      notes, 
      comments,
      f_custom_id,
      customer_name,
      f_nationallity_aid,
      advanced_payment,
      payed,
      rank
    } = body;

    if (!reser_id) {
      return NextResponse.json({ error: 'Missing reser_id' }, { status: 400 });
    }

    // 1. If customer ID exists, update customer name & nationality
    if (f_custom_id) {
      const custUpdate: any = {};
      if (customer_name) custUpdate.name = customer_name.trim();
      if (f_nationallity_aid) custUpdate.f_nationallity_aid = Number(f_nationallity_aid);

      if (Object.keys(custUpdate).length > 0) {
        await supabase
          .from('customers')
          .update(custUpdate)
          .eq('custom_id', f_custom_id);
      }
    }

    // 2. Update reservation fields
    const { data, error } = await supabase
      .from('reservations')
      .update({
        fee: Number(fee || 0),
        num_of_visitors: Number(num_of_visitors || 1),
        kids: Number(kids || 0),
        start_date: start_date ? new Date(start_date).toISOString() : undefined,
        end_date: end_date ? new Date(end_date).toISOString() : undefined,
        f_platform_id: Number(f_platform_id),
        f_house_aid: Number(f_house_aid || 1),
        notes: notes || null,
        comments: comments || null,
        advanced_payment: (advanced_payment !== undefined && advanced_payment !== null) ? Number(advanced_payment) : 0,
        payed: payed !== undefined ? Boolean(payed) : undefined,
        rank: (rank !== undefined && rank !== null && rank !== '') ? Number(rank) : null
      })
      .eq('reser_id', reser_id)
      .select();

    if (error) {
      console.error('Error updating reservation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: data?.[0] });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
