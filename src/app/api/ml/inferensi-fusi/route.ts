import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runSensorFusion, RECIPE_CATALOG } from '@/lib/sensor-fusion';

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
      raw_mq4,
      raw_mq135,
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
      image_url: image_url || '',
      batch_weight_kg: Number(saved_weight_kg ?? 0.5)
    };

    const gasInput = {
      ch4_ppm: Number(ch4_ppm ?? 0.0),
      aqi_ppm: Number(aqi_ppm ?? 0.0),
      raw_mq4: raw_mq4 !== undefined ? Number(raw_mq4) : undefined,
      raw_mq135: raw_mq135 !== undefined ? Number(raw_mq135) : undefined,
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

    // Cek apakah Python ML service aktif (Localhost REST atau Tunnel)
    let isLiveMl = false;
    try {
      const mlBaseUrl = (process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const mlRes = await fetch(`${mlBaseUrl}/predict/fusion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: image_url || '',
          temperature: Number(temperature ?? 27.0),
          humidity: Number(humidity ?? 65.0),
          ch4_ppm: Number(ch4_ppm ?? 0.0),
          raw_mq4: raw_mq4,
          aqi_ppm: Number(aqi_ppm ?? 0.0),
          raw_mq135: raw_mq135,
          saved_weight_kg: Number(saved_weight_kg ?? 0.5)
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (mlRes.ok) {
        const mlJson = await mlRes.json();
        if (mlJson.success && mlJson.data) {
          isLiveMl = true;
          const md = mlJson.data;
          fusionResult.is_live_ml = true;
          fusionResult.freshness_score = md.freshness_score;
          fusionResult.status = md.status;
          fusionResult.status_badge_color = md.badge_color;
          fusionResult.status_summary = md.summary || md.action_recommendation || fusionResult.status_summary;
          fusionResult.shelf_life.hours_remaining = md.shelf_life_hours;
          fusionResult.shelf_life.days_remaining = md.shelf_life_days;
          fusionResult.shelf_life.time_to_mature_hours = md.time_to_mature_hours ?? md.time_to_ripe_hours ?? 0;
          fusionResult.shelf_life.time_to_ripe_hours = md.time_to_mature_hours ?? md.time_to_ripe_hours ?? 0;
          fusionResult.shelf_life.time_to_ripe_days = md.time_to_mature_days ?? md.time_to_ripe_days ?? 0;
          fusionResult.shelf_life.time_to_spoil_hours = md.time_to_spoil_hours ?? md.shelf_life_hours;
          fusionResult.shelf_life.time_to_spoil_days = md.time_to_spoil_days ?? md.shelf_life_days;
          fusionResult.shelf_life.ripeness_stage = md.ripeness_stage;
          fusionResult.shelf_life.disease_detected = md.disease_detected;
          fusionResult.shelf_life.inventory_action = md.inventory_action;
          fusionResult.shelf_life.pricing_strategy = md.pricing_strategy;
          fusionResult.shelf_life.urgency_level = md.urgency_level || (md.status === 'Busuk' ? 'Kedaluwarsa' : (md.status === 'Terlalu Matang' ? 'Perhatian' : (md.status === 'Layu' ? 'Kritis' : 'Aman')));

          const isRotten = md.status === 'Busuk' || md.disease_detected === 'Gray_Mold' || md.grade === 'Rotten';
          if (isRotten) {
            fusionResult.recommendation = RECIPE_CATALOG['Stroberi']?.busuk || fusionResult.recommendation;
          } else if (md.status === 'Terlalu Matang' || md.status === 'Layu') {
            fusionResult.recommendation = RECIPE_CATALOG['Stroberi']?.layu || fusionResult.recommendation;
          } else {
            fusionResult.recommendation = RECIPE_CATALOG['Stroberi']?.segar || fusionResult.recommendation;
          }

          if (md.bounding_boxes && md.bounding_boxes.length > 0) {
            fusionResult.detection_bboxes = md.bounding_boxes;
            fusionResult.detection_bbox = [
              md.bounding_boxes[0].x,
              md.bounding_boxes[0].y,
              md.bounding_boxes[0].w,
              md.bounding_boxes[0].h
            ];
          }
          if (md.impact) {
            fusionResult.prevented_ch4_g = md.impact.prevented_ch4_g;
            fusionResult.prevented_co2e_g = md.impact.prevented_co2e_g;
            fusionResult.financial_savings_idr = md.impact.financial_savings_idr;
          }
        }
      }
    } catch {
      // Python server sedang offline, gunakan local calculation engine
    }

    const weightKg = Number(saved_weight_kg ?? fusionResult.saved_weight_kg ?? 0.5);
    const preventedCH4 = fusionResult.prevented_ch4_g;
    const preventedCO2e = fusionResult.prevented_co2e_g;
    const financialSavings = fusionResult.financial_savings_idr;

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
