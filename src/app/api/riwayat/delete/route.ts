import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { id, clearAll, userId } = await req.json();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzjcyubngczbrmtnmzle.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_l4xeT_IohkUyzc781QJE_g_lzuhveUB';
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (clearAll) {
      if (userId) {
        await supabase.from('riwayat_pemindaian').delete().eq('id_pengguna', userId);
      } else {
        await supabase.from('riwayat_pemindaian').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      await supabase.from('scans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return NextResponse.json({ success: true, message: 'All scan records deleted' });
    }

    if (id) {
      const { error: idnErr } = await supabase.from('riwayat_pemindaian').delete().eq('id', id);
      await supabase.from('scans').delete().eq('id', id);

      if (idnErr) {
        console.warn('API route delete warning:', idnErr);
      }
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ success: false, error: 'No ID provided' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
