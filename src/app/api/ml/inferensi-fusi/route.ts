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
      targetUserId = defaultUser?.id || 'cf9ef20e-2c03-4f8e-aa4b-636913f0f627';
    }

    if (!item_name) {
      return NextResponse.json(
        { error: 'item_name wajib disertakan' },
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
      ch4_ppm: Number(ch4_ppm ?? 0.0),
      aqi_ppm: Number(aqi_ppm ?? 0.0),
      temperature: Number(temperature ?? 27.0),
      humidity: Number(humidity ?? 65.0),
      color_r: 0,
      color_g: 0,
      color_b: 0,
      color_hex: color_hex || '#DC2626',
      color_name: color_name || 'Merah Stroberi',
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
      warna_badge_status: fusionResult.status_badge_color,
      ringkasan_analisis: fusionResult.status_summary,
      
      gas_ch4_ppm: Number(ch4_ppm ?? 0.0),
      gas_aqi_ppm: Number(aqi_ppm ?? 0.0),
      suhu_lingkungan_c: Number(temperature ?? 27.0),
      kelembapan_relatif_rh: Number(humidity ?? 65.0),
      spektrum_warna_hex: color_hex || '#DC2626',
      spektrum_nama_warna: color_name || 'Merah Stroberi',
      
      sisa_umur_simpan_jam: fusionResult.shelf_life.hours_remaining,
      sisa_hari_simpan: fusionResult.shelf_life.days_remaining,
      fase_kematangan: fusionResult.shelf_life.ripeness_stage,
      deteksi_penyakit: fusionResult.shelf_life.disease_detected,
      tindakan_stok_pedagang: fusionResult.shelf_life.inventory_action,
      rekomendasi_harga: fusionResult.shelf_life.pricing_strategy,
      status_validasi_kroma: fusionResult.shelf_life.color_validation.consistency_status,

      kondisi_visual: (defects && defects.length > 0) ? defects.join(', ') : 'Permukaan Normal',
      tindakan_diambil: fusionResult.shelf_life.inventory_action,
      judul_rekomendasi: fusionResult.recommendation.title,
      
      estimasi_berat_kg: weightKg,
      emisi_ch4_tercegah_g: preventedCH4,
      emisi_co2e_tercegah_g: preventedCO2e,
      penghematan_rupiah: financialSavings,
      foto_sampel_url: image_url || '',
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

    // 2. Simpan atau perbarui log_dampak_lingkungan (non-blocking)
    try {
      const now = new Date();
      const tahun = now.getFullYear();
      const bulan = now.getMonth() + 1;
      const periodeBulan = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const isCompost = fusionResult.status === 'Busuk';

      await supabase.from('log_dampak_lingkungan').upsert({
        id_pengguna: targetUserId,
        periode_bulan: periodeBulan,
        tahun,
        bulan,
        total_pemindaian: 1,
        total_pangan_diselamatkan_kg: isCompost ? 0 : weightKg,
        total_pangan_dikomposkan_kg: isCompost ? weightKg : 0,
        total_ch4_tercegah_g: preventedCH4,
        total_co2e_tercegah_g: preventedCO2e,
        total_penghematan_rupiah: financialSavings,
        diperbarui_pada: now.toISOString()
      }, { onConflict: 'id_pengguna,tahun,bulan' });
    } catch (logErr) {
      console.warn('Non-critical log_dampak_lingkungan upsert error:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Fusi sensor dan inferensi ML berhasil diproses dan dicatat ke database',
      data: {
        scan_id: savedScan.id,
        scan: savedScan,
        fusion: fusionResult
      }
    }, { status: 201, headers: corsHeaders });

  } catch (err: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan fusi', detail: err?.message }, { status: 500, headers: corsHeaders });
  }
}
