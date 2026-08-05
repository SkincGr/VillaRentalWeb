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
      fee, 
      num_of_visitors, 
      kids, 
      start_date, 
      end_date, 
      f_platform_id, 
      f_house_aid, 
      f_custom_id,
      notes, 
      comments 
    } = body;

    if (!f_custom_id) {
      return NextResponse.json({ error: 'Customer is required' }, { status: 400 });
    }
    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert([
        {
          fee: Number(fee || 0),
          num_of_visitors: Number(num_of_visitors || 1),
          kids: Number(kids || 0),
          start_date: new Date(start_date).toISOString(),
          end_date: new Date(end_date).toISOString(),
          f_platform_id: Number(f_platform_id || 1),
          f_house_aid: Number(f_house_aid || 1),
          f_custom_id: Number(f_custom_id),
          notes: notes || null,
          comments: comments || null,
          canceled: false
        }
      ])
      .select();

    if (error) {
      console.error('Error creating reservation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reservation: data?.[0] });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
