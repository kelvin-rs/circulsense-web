import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper CORS Headers untuk perangkat IoT ESP32 / Gateway luar
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/iot/telemetri
 * Endpoint untuk menerima data telemetri real-time dari ESP32 / Gateway MQTT
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Koneksi database Supabase belum terkonfigurasi' },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json();

    const {
      id_pengguna,
      api_key,
      id_perangkat,
      // MQ-4 (Metana)
      ch4_ppm,
      raw_mq4,
      mq4_tegangan_raw,
      mq4_rs_ro_ratio,
      // MQ-135 (Kualitas Udara / NH3 / Gas Busuk)
      aqi_ppm,
      raw_mq135,
      mq135_tegangan_raw,
      mq135_rs_ro_ratio,
      // DHT22 (Suhu & Kelembapan)
      suhu,
      kelembapan,
      dht22_suhu_celsius,
      dht22_kelembapan_persen,
      // TCS34725 (Warna Spektral)
      warna_r,
      warna_g,
      warna_b,
      warna_c,
      warna_lux,
      suhu_warna_kelvin,
      kode_hex,
      nama_warna,
      // Perangkat
      baterai
    } = body;

    // Autentikasi Pengguna: Jika tidak ada id_pengguna, coba cari dari api_key perangkat_iot
    let targetUserId = id_pengguna;
    let targetDeviceId = id_perangkat;

    if (!targetUserId && api_key) {
      const { data: device } = await supabase
        .from('perangkat_iot')
        .select('id, id_pengguna')
        .eq('api_key', api_key)
        .maybeSingle();

      if (device) {
        targetUserId = device.id_pengguna;
        targetDeviceId = device.id;
      }
    }

    // Jika tetap tidak ada target user, ambil user pertama atau gunakan akun demo default
    if (!targetUserId) {
      const { data: defaultUser } = await supabase
        .from('pengguna')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (defaultUser) {
        targetUserId = defaultUser.id;
      } else {
        targetUserId = 'cf9ef20e-2c03-4f8e-aa4b-636913f0f627';
      }
    }

    // Data telemetri yang akan disimpan ke tabel public.telemetri_sensor
    const telemetryPayload = {
      id_pengguna: targetUserId,
      id_perangkat: targetDeviceId || null,
      
      // MQ-4
      mq4_metana_ppm: Number(ch4_ppm ?? 0.0),
      mq4_tegangan_raw: Number(mq4_tegangan_raw ?? raw_mq4 ?? 0),
      mq4_rs_ro_ratio: Number(mq4_rs_ro_ratio ?? 1.0),

      // MQ-135
      mq135_udara_ppm: Number(aqi_ppm ?? 0.0),
      mq135_tegangan_raw: Number(mq135_tegangan_raw ?? raw_mq135 ?? 0),
      mq135_rs_ro_ratio: Number(mq135_rs_ro_ratio ?? 1.0),

      // DHT22
      dht22_suhu_celsius: Number(dht22_suhu_celsius ?? suhu ?? 26.5),
      dht22_kelembapan_persen: Number(dht22_kelembapan_persen ?? kelembapan ?? 65.0),

      // TCS34725
      tcs_kanal_merah: Number(warna_r ?? 0),
      tcs_kanal_hijau: Number(warna_g ?? 0),
      tcs_kanal_biru: Number(warna_b ?? 0),
      tcs_kanal_clear: Number(warna_c ?? 0),
      tcs_intensitas_lux: Number(warna_lux ?? 0),
      tcs_suhu_warna_kelvin: Number(suhu_warna_kelvin ?? 0),
      tcs_kode_hex: kode_hex || '#2D7A38',
      tcs_nama_warna: nama_warna || 'Terdeteksi',

      waktu_perekaman: new Date().toISOString()
    };

    const { data: insertedData, error: insertErr } = await supabase
      .from('telemetri_sensor')
      .insert(telemetryPayload)
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: 'Gagal mencatat data telemetri', detail: insertErr.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update status perangkat jika ada id_perangkat
    if (targetDeviceId) {
      await supabase
        .from('perangkat_iot')
        .update({
          terakhir_aktif: new Date().toISOString(),
          level_baterai: baterai ? Number(baterai) : 100,
          status_koneksi: 'aktif'
        })
        .eq('id', targetDeviceId);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Data telemetri IoT berhasil diterima dan disimpan ke database',
        data: insertedData
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server saat memproses telemetri', detail: err?.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/iot/telemetri?id_pengguna=UUID&limit=20
 * Mengambil telemetri sensor terbaru dari database
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client belum aktif' }, { status: 500, headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id_pengguna');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let query = supabase
      .from('telemetri_sensor')
      .select('*')
      .order('waktu_perekaman', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('id_pengguna', userId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500, headers: corsHeaders });
  }
}
