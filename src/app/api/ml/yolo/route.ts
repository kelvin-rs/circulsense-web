import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/ml/yolo
 * Endpoint untuk menerima hasil deteksi visual model YOLO dari server / skrip Python
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
      nama_model,
      nama_bahan_terdeteksi,
      kategori_bahan,
      skor_kepercayaan,
      skor_kualitas_visual,
      daftar_cacat_visual,
      bounding_boxes,
      citra_input_url,
      waktu_inferensi_ms
    } = body;

    let targetUserId = id_pengguna;
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

    if (!targetUserId || !nama_bahan_terdeteksi) {
      return NextResponse.json(
        { error: 'Data tidak lengkap. Harap sertakan id_pengguna dan nama_bahan_terdeteksi.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const mlPayload = {
      id_pengguna: targetUserId,
      nama_model: nama_model || 'YOLOv8-Custom-Food-Freshness',
      nama_bahan_terdeteksi: nama_bahan_terdeteksi,
      kategori_bahan: kategori_bahan || 'Buah',
      skor_kepercayaan: Number(skor_kepercayaan ?? 0.95),
      skor_kualitas_visual: Number(skor_kualitas_visual ?? 3),
      daftar_cacat_visual: Array.isArray(daftar_cacat_visual) ? daftar_cacat_visual : [],
      bounding_boxes: Array.isArray(bounding_boxes) ? bounding_boxes : [],
      citra_input_url: citra_input_url || '',
      waktu_inferensi_ms: Number(waktu_inferensi_ms ?? 100),
      dibuat_pada: new Date().toISOString()
    };

    const { data: insertedData, error: insertErr } = await supabase
      .from('pemrosesan_ml')
      .insert(mlPayload)
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: 'Gagal menyimpan hasil inferensi YOLO', detail: insertErr.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Hasil inferensi visual YOLO berhasil disimpan',
        data: insertedData
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Gagal memproses inferensi YOLO', detail: err?.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
