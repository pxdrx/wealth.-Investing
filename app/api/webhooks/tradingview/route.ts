import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = await req.text();
    console.log('Webhook body:', body);

    let payload: any = {};
    try { payload = JSON.parse(body); } catch { payload = { message: body }; }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: users } = await supabase.auth.admin.listUsers();
    const ownerEmail = process.env.OWNER_EMAIL;
    const user = users?.users?.find((u) => u.email === ownerEmail);
    const user_id = user?.id;
    console.log('user_id:', user_id);

    if (!user_id) {
      return NextResponse.json({ ok: false, error: 'no user' }, { status: 500 });
    }

    const { error } = await supabase.from('tv_alerts').insert({
      user_id,
      symbol: payload.symbol || 'UNKNOWN',
      alert_type: payload.alert_type || 'manual',
      timeframe: payload.timeframe || null,
      message: payload.message || body,
      payload,
    });

    console.log('Insert error:', error);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('WEBHOOK ERROR:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
