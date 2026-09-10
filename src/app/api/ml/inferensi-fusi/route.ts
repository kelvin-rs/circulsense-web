import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runSensorFusion } from '@/lib/sensor-fusion';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/ml/inferensi-fusi
 * Endpoint fusi multimodal: Menerima data inferensi YOLO + sensor fisik (MQ4, MQ135, DHT22, TCS34725)
 * dan mencatat ke riwayat_pemindaian serta menghitung dampak lingkungan secara otomatis.
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client belum terkonfigurasi' }, { status: 500, headers: corsHeaders });
    }

    const body = await request.json();

    const {
      id_pengguna,
      item_name,
      category,
      ch4_ppm,
      aqi_ppm,
      temperature,
      humidity,
      color_hex,
      color_name,
      visual_score,
      confidence,
      defects,
      image_url,
      saved_weight_kg
    } = body;

    let targetUserId = id_pengguna;
    if (!targetUserId) {
      const { data: defaultUser } = await supabase.from('pengguna').select('id').limit(1).maybeSingle();
      if (defaultUser) targetUserId = defaultUser.id;
    }

    if (!targetUserId || !item_name) {
      return NextResponse.json(
        { error: 'id_pengguna dan item_name wajib disertakan' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Hitung Fusi Multimodal (Visual + Gas)
    const visualInput = {
      item_name: item_name,
      category: (category as 'Sayur' | 'Buah') || 'Buah',
      confidence: Number(confidence ?? 0.95),
      visual_score: Number(visual_score ?? 3),
      defects: Array.isArray(defects) ? defects : [],
      image_url: image_url || ''
    };

    const gasInput = {
      ch4_ppm: Number(ch4_ppm ?? 0.5),
      aqi_ppm: Number(aqi_ppm ?? 30.0),
      temperature: Number(temperature ?? 26.5),
      humidity: Number(humidity ?? 65.0),
      color_r: 0,
      color_g: 0,
      color_b: 0,
      color_hex: color_hex || '#2D7A38',
      color_name: color_name || 'Alami',
      battery: 100,
      is_connected: true,
      timestamp: new Date().toISOString()
    };

    const fusionResult = runSensorFusion(visualInput, gasInput);

    const weightKg = Number(saved_weight_kg ?? 0.5);
    const preventedCH4 = weightKg * 12.5; // gram
    const preventedCO2e = preventedCH4 * 28.0; // gram (GWP 28x)
    const financialSavings = Math.round(weightKg * 20000); // IDR

    // 1. Simpan ke riwayat_pemindaian
    const scanPayload = {
      id_pengguna: targetUserId,
      nama_bahan: item_name,
      kategori_bahan: category || 'Buah',
      skor_kesegaran: fusionResult.freshness_score,
      status_kesegaran: fusionResult.status,
      
      kadar_metana_ppm: Number(ch4_ppm ?? 0.5),
      kadar_gas_organik_ppm: Number(aqi_ppm ?? 30.0),
      suhu_celsius: Number(temperature ?? 26.5),
      kelembapan_persen: Number(humidity ?? 65.0),
      kode_warna_hex: color_hex || '#2D7A38',
      nama_warna: color_name || 'Alami',
      
      kondisi_visual: (defects && defects.length > 0) ? defects.join(', ') : 'Permukaan Normal',
      tindakan_diambil: fusionResult.status === 'Segar' ? 'Konsumsi Langsung' : fusionResult.status === 'Layu' ? 'Olah Masakan' : 'Kompos / POC',
      judul_rekomendasi: fusionResult.recommendation.title,
      
      bobot_terselamatkan_kg: weightKg,
      ch4_dicegah_gram: preventedCH4,
      co2e_dicegah_gram: preventedCO2e,
      penghematan_finansial_idr: financialSavings,
      gambar_pemindaian_url: image_url || '',
      dibuat_pada: new Date().toISOString()
    };

    const { data: savedScan, error: scanErr } = await supabase
      .from('riwayat_pemindaian')
      .insert(scanPayload)
      .select()
      .single();

    if (scanErr) {
      return NextResponse.json({ error: 'Gagal menyimpan riwayat pemindaian', detail: scanErr.message }, { status: 500, headers: corsHeaders });
    }

    // 2. Simpan ke log_dampak_lingkungan
    const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const isCompost = fusionResult.status === 'Busuk';

    await supabase.from('log_dampak_lingkungan').insert({
      id_pengguna: targetUserId,
      id_pemindaian: savedScan.id,
      nama_bulan: currentMonth,
      pangan_terselamatkan_kg: isCompost ? 0 : weightKg,
      pangan_dikompos_kg: isCompost ? weightKg : 0,
      metana_dicegah_gram: preventedCH4,
      co2e_dicegah_gram: preventedCO2e,
      penghematan_finansial_idr: financialSavings,
      ekivalen_hutan_m2: Number((preventedCO2e / 1000 * 0.15).toFixed(2)),
      ekivalen_pohon: Number((preventedCO2e / 1000 * 0.045).toFixed(2)),
      dibuat_pada: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Fusi sensor dan inferensi ML berhasil diproses dan dicatat ke database',
      data: {
        scan: savedScan,
        fusion: fusionResult
      }
    }, { status: 201, headers: corsHeaders });

  } catch (err: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan fusi', detail: err?.message }, { status: 500, headers: corsHeaders });
  }
}
