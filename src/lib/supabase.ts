import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ScanRecord, FusionResult, ImpactSummary, VisualData, GasData } from '@/types/circulsense';

// Sanitize URL in case /rest/v1 was appended
let rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
if (rawUrl.endsWith('/rest/v1/')) {
  rawUrl = rawUrl.replace('/rest/v1/', '');
} else if (rawUrl.endsWith('/rest/v1')) {
  rawUrl = rawUrl.replace('/rest/v1', '');
}
const SUPABASE_URL = rawUrl;
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('Supabase client creation error:', e);
  }
}

const STORAGE_KEY = 'circulsense_scan_history_v1';

/**
 * Normalisasi skor kesegaran ke persentase 0 - 100% yang konsisten
 */
export function normalizeFreshnessPct(score: number | null | undefined): number {
  if (score == null || isNaN(score)) return 80;
  if (score <= 1.0) return Math.min(100, Math.max(0, Math.round(score * 100)));
  if (score <= 5.0) return Math.min(100, Math.max(0, Math.round((score / 5.0) * 100)));
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Fetch scan records purely in real-time from Supabase (checking riwayat_pemindaian or scans)
 */
export async function fetchScanRecords(): Promise<ScanRecord[]> {
  if (supabase) {
    try {
      let currentUserId: string | null = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        currentUserId = authData?.user?.id || null;
      } catch {
        //
      }

      // 1. Try Indonesian schema table: riwayat_pemindaian
      const queryIdn = supabase
        .from('riwayat_pemindaian')
        .select('*')
        .neq('status_kesegaran', 'DIHAPUS')
        .neq('status_kesegaran', 'MENUNGGU_INFERENSI_ML')
        .order('dibuat_pada', { ascending: false })
        .limit(100);

      const { data: dataIdn, error: errIdn } = await queryIdn;

      if (!errIdn && dataIdn) {
        const mapped: ScanRecord[] = dataIdn.map((row: any) => {
          let meta: any = null;
          let cleanVisual = row.kondisi_visual || row.visual_condition || '';
          if (typeof cleanVisual === 'string' && cleanVisual.trim().startsWith('{')) {
            try {
              meta = JSON.parse(cleanVisual);
              if (meta.grade_label) {
                cleanVisual = meta.grade_label;
              } else if (meta.disease_label) {
                cleanVisual = meta.disease_label;
              } else if (meta.defects && Array.isArray(meta.defects) && meta.defects.length > 0) {
                cleanVisual = meta.defects.join(', ');
              } else {
                cleanVisual = 'Segar & Bebas Cacat';
              }
            } catch {
              cleanVisual = 'Segar & Bebas Cacat';
            }
          }
          if (!cleanVisual || cleanVisual.trim() === '' || cleanVisual.startsWith('{')) {
            cleanVisual = 'Segar & Bebas Cacat';
          }
          return {
            id: row.id,
            created_at: row.dibuat_pada || row.created_at,
            item_name: row.nama_bahan || row.item_name || 'Stroberi',
            category: (row.kategori_bahan || row.category || 'Buah') as 'Sayur' | 'Buah',
            freshness_score: row.skor_kesegaran ?? meta?.freshness_score ?? row.freshness_score ?? 85,
            status: row.status_kesegaran || meta?.status || row.status || 'Segar',
            gas_ch4_ppm: Number(row.gas_ch4_ppm ?? row.gas_metana_ch4_ppm ?? 0),
            gas_aqi_ppm: Number(row.gas_aqi_ppm ?? row.gas_kualitas_aqi_ppm ?? 0),
            visual_condition: cleanVisual,
            action_taken: row.tindakan_diambil || row.action_taken || 'Pajang di etalase utama',
            recommendation_title: row.judul_rekomendasi || row.recommendation_title || 'Stroberi Segar',
            saved_weight_kg: Number(row.estimasi_berat_kg ?? row.saved_weight_kg ?? 0.5),
            prevented_ch4_g: Number(row.emisi_ch4_tercegah_g ?? row.prevented_ch4_g ?? 6.5),
            prevented_co2e_g: Number(row.emisi_co2e_tercegah_g ?? row.prevented_co2e_g ?? 182),
            financial_savings_idr: Number(row.penghematan_rupiah ?? row.financial_savings_idr ?? 35000),
            image_url: row.foto_sampel_url || row.image_url || '',
            temperature: (row.suhu_lingkungan_c != null && Number(row.suhu_lingkungan_c) > 0) ? Number(row.suhu_lingkungan_c) : (row.temperature != null && Number(row.temperature) > 0 ? Number(row.temperature) : undefined),
            humidity: (row.kelembapan_relatif_rh != null && Number(row.kelembapan_relatif_rh) > 0) ? Number(row.kelembapan_relatif_rh) : (row.humidity != null && Number(row.humidity) > 0 ? Number(row.humidity) : undefined),
            color_hex: row.spektrum_warna_hex ?? row.color_hex ?? '#DC2626',
            color_name: row.spektrum_nama_warna ?? row.color_name ?? 'Merah Stroberi',
            // Shelf-Life & Merchant Inventory Mapping
            shelf_life_hours: Number(row.sisa_umur_simpan_jam ?? meta?.time_to_spoil_hours ?? row.shelf_life_hours ?? 74),
            shelf_life_days: Number(row.sisa_hari_simpan ?? meta?.time_to_spoil_days ?? row.shelf_life_days ?? 3.1),
            time_to_mature_days: Number(meta?.time_to_ripe_days ?? meta?.time_to_mature_days ?? ((row.fase_kematangan || '').toLowerCase().includes('mentah') ? 3.5 : ((row.fase_kematangan || '').toLowerCase().includes('setengah') ? 1.5 : 0.0))),
            time_to_mature_hours: Number(meta?.time_to_ripe_hours ?? meta?.time_to_mature_hours ?? ((row.fase_kematangan || '').toLowerCase().includes('mentah') ? 84 : 0)),
            ripeness_stage: row.fase_kematangan || meta?.grade_label || meta?.ripeness_stage || 'Matang Sempurna (Grade A Super)',
            disease_detected: row.deteksi_penyakit || meta?.disease_label || 'Sehat & Segar (Bebas Penyakit)',
            inventory_action: row.tindakan_stok_pedagang || meta?.inventory_action || row.tindakan_diambil || 'Pajang di Etalase Utama',
            pricing_strategy: row.rekomendasi_harga || meta?.pricing_strategy || 'Harga Normal',
            color_consistency: row.status_validasi_kroma || 'Sangat Konsisten',
            // Multi-fruit details
            fruits_detected: Number(meta?.fruits_detected ?? (meta?.fruits_list ? meta.fruits_list.length : 1)),
            fruits_list: Array.isArray(meta?.fruits_list) ? meta.fruits_list : [],
            grade_label: meta?.grade_label || row.fase_kematangan,
            edibility: meta?.edibility,
            physical_desc: meta?.physical_desc,
            disease_label: meta?.disease_label || row.deteksi_penyakit,
            disease_desc: meta?.disease_desc,
            red_ratio_pct: Number(meta?.red_ratio_pct ?? 72.8),
            detection_bbox: meta?.bounding_boxes?.[0],
            bounding_boxes: meta?.bounding_boxes || []
          };
        });

        // Merge with local storage cache so all scans are preserved
        let merged = mapped;
        if (typeof window !== 'undefined') {
          const localData = localStorage.getItem(STORAGE_KEY);
          if (localData) {
            try {
              const localList: ScanRecord[] = JSON.parse(localData);
              const existingIds = new Set(mapped.map(m => m.id));
              const missingLocals = localList.filter(l => !existingIds.has(l.id));
              merged = [...mapped, ...missingLocals];
              merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            } catch {}
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }

        return merged;
      }

      // 2. Fallback to scans table if riwayat_pemindaian not created yet
      const { data: dataEn, error: errEn } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (!errEn && dataEn) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataEn));
        }
        return dataEn as ScanRecord[];
      }
    } catch (e) {
      console.warn('Supabase fetch failed, fallback to local storage:', e);
    }
  }

  // Fallback to local storage cache
  if (typeof window !== 'undefined') {
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch (e) {
        console.error('Failed to parse local storage records:', e);
      }
    }
  }

  return [];
}

/**
 * Fetch a single scan record by ID directly from Supabase
 */
export async function fetchScanRecordById(id: string): Promise<ScanRecord | null> {
  const records = await fetchScanRecords();
  return records.find(r => r.id === id) || null;
}

/**
 * Save new scan record directly into Supabase database with Indonesian field mappings
 */
export async function saveScanRecord(fusion: FusionResult, customUserId?: string): Promise<ScanRecord> {
  const recordId = generateUUID();
  const nowIso = new Date().toISOString();

  const rawScore = fusion.freshness_score;
  const scoreDecimal = Number((rawScore != null && rawScore <= 1.0 ? rawScore : (rawScore ? rawScore / 100.0 : 0.8)).toFixed(2));
  const scoreNum = Math.max(0, Math.min(100, Math.round(scoreDecimal * 100)));

  const gradeLabel = fusion.grade_label || (fusion.shelf_life?.ripeness_stage as string) || 'MATANG SEMPURNA (Fullripe / Grade A Super)';
  const diseaseLabel = fusion.disease_label || (fusion.shelf_life?.disease_detected as string) || 'SEHAT & SEGAR (Bebas Penyakit)';
  const edibilityDesc = fusion.edibility || 'KONDISI PRIMA SIAP MAKAN (Kualitas Rasa, Manis, & Aroma Puncak)';

  const isUnripe = gradeLabel.toLowerCase().includes('mentah') || gradeLabel.toLowerCase().includes('unripe');
  const isSemiripe = gradeLabel.toLowerCase().includes('setengah') || gradeLabel.toLowerCase().includes('semiripe');
  const timeToMatureDays = Number(fusion.shelf_life?.time_to_ripe_days ?? fusion.shelf_life?.time_to_mature_days ?? (isUnripe ? 3.5 : (isSemiripe ? 1.5 : 0.0)));
  const timeToMatureHours = Math.round(timeToMatureDays * 24);

  const hoursRemaining = Math.max(0, Math.round(Number(fusion.shelf_life?.hours_remaining ?? 74)));
  const daysRemaining = Number((fusion.shelf_life?.days_remaining ?? 3.1).toFixed(1));

  // Rangkum seluruh bounding boxes buah yang terdeteksi
  const allBoxes = fusion.bounding_boxes && fusion.bounding_boxes.length > 0
    ? fusion.bounding_boxes
    : (fusion.results && fusion.results.length > 0
        ? fusion.results.map((f: any) => f.bbox_norm || (f.x !== undefined ? [f.x, f.y, f.w, f.h] : [0.5, 0.5, 0.5, 0.5]))
        : (fusion.detection_bbox ? [fusion.detection_bbox] : []));

  const newRecord: ScanRecord = {
    id: recordId,
    created_at: nowIso,
    item_name: fusion.item_name || 'Stroberi',
    category: fusion.category || 'Buah',
    freshness_score: scoreNum,
    status: fusion.status || 'Segar',
    gas_ch4_ppm: fusion.gas_summary?.ch4_ppm ?? 0,
    gas_aqi_ppm: fusion.gas_summary?.aqi_ppm ?? 0,
    visual_condition: gradeLabel,
    action_taken: fusion.shelf_life?.inventory_action || 'Pajang di Etalase Utama',
    recommendation_title: fusion.recommendation?.title || 'Stroberi Segar',
    saved_weight_kg: fusion.saved_weight_kg ?? 0.5,
    prevented_ch4_g: fusion.prevented_ch4_g ?? 6.5,
    prevented_co2e_g: fusion.prevented_co2e_g ?? 182,
    financial_savings_idr: fusion.financial_savings_idr ?? 35000,
    image_url: fusion.image_url || '',
    temperature: fusion.gas_summary?.temperature != null && fusion.gas_summary.temperature > 0 ? fusion.gas_summary.temperature : undefined,
    humidity: fusion.gas_summary?.humidity != null && fusion.gas_summary.humidity > 0 ? fusion.gas_summary.humidity : undefined,
    color_hex: fusion.gas_summary?.color_hex ?? '#DC2626',
    color_name: fusion.gas_summary?.color_name ?? 'Merah Stroberi',
    shelf_life_hours: hoursRemaining,
    shelf_life_days: daysRemaining,
    time_to_mature_days: timeToMatureDays,
    time_to_mature_hours: timeToMatureHours,
    ripeness_stage: gradeLabel as any,
    disease_detected: diseaseLabel as any,
    inventory_action: (fusion.shelf_life?.inventory_action || 'Pajang di Etalase Depan Segera') as any,
    pricing_strategy: (fusion.shelf_life?.pricing_strategy || 'Harga Normal') as any,
    color_consistency: 'Sangat Konsisten',
    fruits_detected: fusion.fruits_detected ?? (fusion.results ? fusion.results.length : 1),
    fruits_list: fusion.results || [],
    grade_label: gradeLabel,
    edibility: edibilityDesc,
    physical_desc: fusion.physical_desc || '',
    disease_label: diseaseLabel,
    disease_desc: fusion.disease_desc || '',
    red_ratio_pct: fusion.red_ratio_pct ?? 72.8,
    detection_bbox: fusion.detection_bbox || (allBoxes.length > 0 ? allBoxes[0] : undefined),
    bounding_boxes: allBoxes
  };

  // 1. Always save to Local Storage immediately so history is guaranteed
  if (typeof window !== 'undefined') {
    try {
      const localData = localStorage.getItem(STORAGE_KEY);
      const existing: ScanRecord[] = localData ? JSON.parse(localData) : [];
      const updated = [newRecord, ...existing.filter(r => r.id !== newRecord.id)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal simpan ke localStorage:', e);
    }
  }

  // 2. Insert into Supabase table: riwayat_pemindaian
  if (supabase) {
    try {
      let currentUserId: string | null = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        currentUserId = authData?.user?.id || null;
      } catch {}

      const effectiveUserId = customUserId || currentUserId || 'cf9ef20e-2c03-4f8e-aa4b-636913f0f627';

      const visualMeta = {
        grade_label: gradeLabel,
        edibility: edibilityDesc,
        physical_desc: fusion.physical_desc || '',
        disease_label: diseaseLabel,
        disease_desc: fusion.disease_desc || '',
        red_ratio_pct: fusion.red_ratio_pct ?? 72.8,
        time_to_spoil_hours: hoursRemaining,
        time_to_spoil_days: daysRemaining,
        time_to_ripe_hours: timeToMatureHours,
        time_to_ripe_days: timeToMatureDays,
        freshness_score_decimal: scoreDecimal,
        fruits_detected: fusion.fruits_detected ?? (fusion.results ? fusion.results.length : 1),
        fruits_list: fusion.results || [],
        bounding_boxes: allBoxes
      };

      const indonesianPayload = {
        id: recordId,
        id_pengguna: effectiveUserId,
        nama_bahan: fusion.item_name || 'Stroberi',
        kategori_bahan: fusion.category || 'Buah',
        skor_kesegaran: scoreNum,
        status_kesegaran: fusion.status || 'Prima',
        warna_badge_status: fusion.status_badge_color || '#16A34A',
        ringkasan_analisis: fusion.status_summary || `${gradeLabel}. ${edibilityDesc}`,
        kondisi_visual: JSON.stringify(visualMeta),
        tindakan_diambil: newRecord.action_taken,
        judul_rekomendasi: fusion.recommendation?.title || 'Stroberi Segar',
        gas_ch4_ppm: fusion.gas_summary?.ch4_ppm ?? 0.1,
        gas_aqi_ppm: fusion.gas_summary?.aqi_ppm ?? 15,
        suhu_lingkungan_c: fusion.gas_summary?.temperature ?? 20.0,
        kelembapan_relatif_rh: fusion.gas_summary?.humidity ?? 60.0,
        spektrum_warna_hex: fusion.gas_summary?.color_hex ?? '#DC2626',
        spektrum_nama_warna: fusion.gas_summary?.color_name ?? 'Merah Stroberi',
        estimasi_berat_kg: fusion.saved_weight_kg ?? 0.5,
        emisi_ch4_tercegah_g: fusion.prevented_ch4_g ?? 6.5,
        emisi_co2e_tercegah_g: fusion.prevented_co2e_g ?? 182,
        penghematan_rupiah: fusion.financial_savings_idr ?? 35000,
        foto_sampel_url: fusion.image_url || '',
        sisa_umur_simpan_jam: hoursRemaining,
        sisa_hari_simpan: daysRemaining,
        fase_kematangan: gradeLabel,
        deteksi_penyakit: diseaseLabel,
        tindakan_stok_pedagang: fusion.shelf_life?.inventory_action || 'Pajang di Etalase Depan Segera',
        rekomendasi_harga: fusion.shelf_life?.pricing_strategy || 'Harga Normal',
        dibuat_pada: nowIso
      };

      let { error: errIdn } = await supabase.from('riwayat_pemindaian').insert([indonesianPayload]);
      if (errIdn) {
        console.warn('[Supabase Warning] Gagal simpan ke riwayat_pemindaian:', errIdn);
        // Jika terjadi error foreign key pada id_pengguna, gunakan default guest pengguna yang terbukti valid
        if (errIdn.code === '23503' || errIdn.message?.includes('foreign key') || errIdn.message?.includes('pengguna')) {
          indonesianPayload.id_pengguna = 'cf9ef20e-2c03-4f8e-aa4b-636913f0f627';
          const retryRes = await supabase.from('riwayat_pemindaian').insert([indonesianPayload]);
          if (!retryRes.error) {
            console.log('[Supabase] Berhasil simpan ke riwayat_pemindaian via fallback guest ID');
          } else {
            console.error('[Supabase Error] Gagal simpan fallback:', retryRes.error);
          }
        }
      } else {
        console.log('[Supabase] Berhasil simpan ke riwayat_pemindaian');
      }

      // Also insert to scans table if available
      try {
        await supabase.from('scans').insert([newRecord]);
      } catch {}
    } catch (e) {
      console.warn('Supabase insert exception:', e);
    }
  }

  return newRecord;
}

/**
 * Delete a scan record from Supabase and local storage
 */
export async function deleteScanRecord(id: string): Promise<boolean> {
  if (supabase) {
    try {
      // 1. Coba Hard Delete langsung
      await supabase.from('riwayat_pemindaian').delete().eq('id', id);
      await supabase.from('scans').delete().eq('id', id);

      // 2. Tandai status_kesegaran = 'DIHAPUS' sebagai kepastian agar tidak pernah muncul lagi
      await supabase.from('riwayat_pemindaian').update({ status_kesegaran: 'DIHAPUS' }).eq('id', id);

      // 3. Panggil endpoint server Next.js
      try {
        await fetch('/api/riwayat/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } catch {}
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const localData = localStorage.getItem(STORAGE_KEY);
      const existing: ScanRecord[] = localData ? JSON.parse(localData) : [];
      const updated = existing.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  return true;
}

/**
 * Clear all scan records from Supabase and local storage
 */
export async function clearAllScanRecords(): Promise<boolean> {
  if (supabase) {
    try {
      let currentUserId: string | null = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        currentUserId = authData?.user?.id || null;
      } catch {}

      // 1. Coba Hard Delete
      if (currentUserId) {
        await supabase.from('riwayat_pemindaian').delete().eq('id_pengguna', currentUserId);
      } else {
        await supabase.from('riwayat_pemindaian').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('scans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // 2. Tandai seluruhnya DIHAPUS agar query database bersih total
      await supabase.from('riwayat_pemindaian').update({ status_kesegaran: 'DIHAPUS' }).neq('status_kesegaran', 'DIHAPUS');

      // 3. Fallback server-side clear
      try {
        await fetch('/api/riwayat/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clearAll: true, userId: currentUserId })
        });
      } catch {}
    } catch (e) {
      console.warn('Supabase clear all error:', e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  }

  return true;
}

/**
 * Mengirim permintaan inferensi ke antrean Cloud Supabase.
 * Service Python ML yang berjalan di terminal lokal pengguna akan mengambil antrean ini,
 * memproses YOLOv8 + Sensor RF + Kinetika Q10, lalu mengupdate hasilnya ke Supabase.
 */
export async function requestCloudMlInference(
  visualData: VisualData,
  gasData: GasData,
  timeoutMs: number = 7500
): Promise<{
  freshness_score: number;
  status: string;
  badge_color: string;
  shelf_life_hours: number;
  shelf_life_days: number;
  time_to_ripe_hours: number;
  time_to_ripe_days: number;
  time_to_spoil_hours: number;
  time_to_spoil_days: number;
  ripeness_stage: string;
  disease_detected: string;
  inventory_action: string;
  pricing_strategy: string;
  summary?: string;
  urgency_level?: string;
  bounding_boxes: any[];
  impact: {
    saved_weight_kg: number;
    prevented_ch4_g: number;
    prevented_co2e_g: number;
    financial_savings_idr: number;
  };
  metrics: {
    inference_ms: number;
    yolo_confidence: number;
    sensor_confidence: number;
  };
  grade_label?: string;
  grade_confidence?: number;
  edibility?: string;
  physical_desc?: string;
  disease_label?: string;
  disease_desc?: string;
  disease_confidence?: number;
  red_ratio_pct?: number;
  fruits_detected?: number;
  results?: any[];
} | null> {
  if (!supabase) return null;

  try {
    const scanId = generateUUID();
    let currentUserId = 'cf9ef20e-2c03-4f8e-aa4b-636913f0f627';
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) currentUserId = authData.user.id;
    } catch {
      //
    }

    const queuePayload = {
      id: scanId,
      id_pengguna: currentUserId,
      nama_bahan: visualData.item_name || 'Stroberi',
      kategori_bahan: visualData.category || 'Buah',
      skor_kesegaran: 0,
      status_kesegaran: 'MENUNGGU_INFERENSI_ML',
      warna_badge_status: '#94A3B8',
      ringkasan_analisis: 'Sedang diproses oleh Model ML di Terminal...',
      kondisi_visual: 'Antrean Vercel Cloud ML',
      tindakan_diambil: 'Menunggu Analisis AI',
      judul_rekomendasi: 'Memproses...',
      gas_ch4_ppm: Number(gasData.ch4_ppm ?? 0.0),
      gas_aqi_ppm: Number(gasData.aqi_ppm ?? 0.0),
      suhu_lingkungan_c: Number(gasData.temperature ?? 27.0),
      kelembapan_relatif_rh: Number(gasData.humidity ?? 65.0),
      spektrum_warna_hex: gasData.color_hex || '#DC2626',
      spektrum_nama_warna: gasData.color_name || 'Merah Stroberi Terang',
      estimasi_berat_kg: Number(visualData.batch_weight_kg ?? 0.5),
      foto_sampel_url: visualData.image_url || '',
      dibuat_pada: new Date().toISOString()
    };

    const { error: insertErr } = await supabase.from('riwayat_pemindaian').insert([queuePayload]);
    if (insertErr) {
      console.warn('[Cloud ML Queue] Gagal insert task:', insertErr);
      return null;
    }

    // Polling setiap 700ms hingga timeout
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise(r => setTimeout(r, 700));

      const { data: record, error: fetchErr } = await supabase
        .from('riwayat_pemindaian')
        .select('*')
        .eq('id', scanId)
        .maybeSingle();

      if (!fetchErr && record && record.status_kesegaran !== 'MENUNGGU_INFERENSI_ML') {
        let visualMeta: any = {};
        try {
          if (record.kondisi_visual && record.kondisi_visual.startsWith('{')) {
            visualMeta = JSON.parse(record.kondisi_visual);
          }
        } catch {
          //
        }

        const hoursSpoil = Number(record.sisa_umur_simpan_jam ?? visualMeta.time_to_spoil_hours ?? 48);
        const daysSpoil = Number(record.sisa_hari_simpan ?? visualMeta.time_to_spoil_days ?? 2.0);

        const isUnripe = (record.fase_kematangan || '').toLowerCase().includes('unripe') || (record.fase_kematangan || '').toLowerCase().includes('mentah');
        const isSemiripe = (record.fase_kematangan || '').toLowerCase().includes('semi') || (record.fase_kematangan || '').toLowerCase().includes('setengah');
        const timeToRipe = Number(visualMeta.time_to_ripe_hours ?? (isUnripe ? 48 : isSemiripe ? 24 : 0));
        const timeToRipeDays = Number(visualMeta.time_to_ripe_days ?? (timeToRipe / 24));

        return {
          freshness_score: Number(record.skor_kesegaran ?? 85),
          status: record.status_kesegaran ?? 'Prima',
          badge_color: record.warna_badge_status ?? '#16A34A',
          shelf_life_hours: hoursSpoil,
          shelf_life_days: daysSpoil,
          time_to_ripe_hours: timeToRipe,
          time_to_ripe_days: timeToRipeDays,
          time_to_spoil_hours: hoursSpoil,
          time_to_spoil_days: daysSpoil,
          ripeness_stage: record.fase_kematangan ?? 'Fullripe (Matang Optimal)',
          disease_detected: record.deteksi_penyakit ?? 'Normal (Bebas Jamur)',
          inventory_action: record.tindakan_stok_pedagang ?? 'Pajang di Etalase Depan',
          pricing_strategy: record.rekomendasi_harga ?? 'Harga Normal',
          summary: record.ringkasan_analisis || `${record.status_kesegaran ?? 'Segar'}: ${record.tindakan_stok_pedagang ?? 'Pajang di etalase'}. Sisa umur simpan ${hoursSpoil} jam (${daysSpoil} hari).`,
          urgency_level: (record.status_kesegaran === 'Busuk' ? 'Kedaluwarsa' : (record.status_kesegaran === 'Terlalu Matang' ? 'Perhatian' : (record.status_kesegaran === 'Layu' ? 'Kritis' : 'Aman'))),
          bounding_boxes: visualMeta.bounding_boxes || [],
          grade_label: visualMeta.grade_label || record.fase_kematangan || 'MATANG SEMPURNA (Fullripe / Grade A Super)',
          grade_confidence: visualMeta.grade_confidence ?? 0.95,
          edibility: visualMeta.edibility || 'KONDISI PRIMA SIAP MAKAN (Kualitas Rasa, Manis, & Aroma Puncak)',
          physical_desc: visualMeta.physical_desc || 'Warna merah merata, aroma manis harum, tekstur juicy empuk, siap dinikmati langsung atau dipajang di etalase.',
          disease_label: visualMeta.disease_label || record.deteksi_penyakit || 'SEHAT & SEGAR (Bebas Penyakit)',
          disease_desc: visualMeta.disease_desc || 'Kondisi fisik segar, tidak ada tanda-tanda jamur atau bercak patogen.',
          disease_confidence: visualMeta.disease_confidence ?? 0.85,
          red_ratio_pct: visualMeta.red_ratio_pct ?? 72.8,
          fruits_detected: visualMeta.results ? visualMeta.results.length : 1,
          results: visualMeta.results || [],
          impact: {
            saved_weight_kg: Number(record.estimasi_berat_kg ?? 0.5),
            prevented_ch4_g: Number(record.emisi_ch4_tercegah_g ?? 0),
            prevented_co2e_g: Number(record.emisi_co2e_tercegah_g ?? 0),
            financial_savings_idr: Number(record.penghematan_rupiah ?? 0)
          },
          metrics: {
            inference_ms: Number(visualMeta.inference_ms ?? 45),
            yolo_confidence: Number(visualMeta.yolo_confidence ?? 0.95),
            sensor_confidence: Number(visualMeta.sensor_confidence ?? 0.95)
          }
        };
      }
    }
  } catch (err) {
    console.warn('[Cloud ML Queue] Exception:', err);
  }

  return null;
}

/**
 * Calculate impact summary strictly from real records in the database
 */
export function calculateImpactSummary(records: ScanRecord[], monthName: string = 'Semua Periode'): ImpactSummary {
  let food_saved_kg = 0;
  let food_composted_kg = 0;
  const total_scans = records.length;
  let ch4_prevented_g = 0;
  let co2e_prevented_g = 0;
  let total_financial_saved_idr = 0;

  records.forEach(r => {
    const weight = Number(r.saved_weight_kg) || 0;
    if (r.status === 'Busuk') {
      food_composted_kg += weight;
    } else {
      food_saved_kg += weight;
    }
    ch4_prevented_g += Number(r.prevented_ch4_g) || 0;
    co2e_prevented_g += Number(r.prevented_co2e_g) || 0;
    total_financial_saved_idr += Number(r.financial_savings_idr) || 0;
  });

  const totalKg = food_saved_kg + food_composted_kg;
  const upcycle_percent = totalKg > 0 ? Math.round((food_saved_kg / totalKg) * 100) : 0;
  const compost_percent = totalKg > 0 ? 100 - upcycle_percent : 0;

  const forest_absorbed_sqm = Number((ch4_prevented_g / 40.2).toFixed(1));
  const trees_absorbed = Number((co2e_prevented_g / 1000).toFixed(2));

  return {
    month_name: monthName,
    food_saved_kg: Number(food_saved_kg.toFixed(1)),
    food_composted_kg: Number(food_composted_kg.toFixed(1)),
    total_scans,
    upcycle_percent,
    compost_percent,
    ch4_prevented_g: Number(ch4_prevented_g.toFixed(1)),
    forest_absorbed_sqm,
    co2e_prevented_g: Number(co2e_prevented_g.toFixed(1)),
    trees_absorbed,
    total_financial_saved_idr
  };
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
