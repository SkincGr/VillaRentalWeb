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
      customer_name
    } = body;

    if (!reser_id) {
      return NextResponse.json({ error: 'Missing reser_id' }, { status: 400 });
    }

    // 1. If customer name updated and customer ID exists, update customer name
    if (f_custom_id && customer_name) {
      await supabase
        .from('customers')
        .update({ name: customer_name.trim() })
        .eq('custom_id', f_custom_id);
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
        comments: comments || null
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
