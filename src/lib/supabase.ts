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
      let queryIdn = supabase
        .from('riwayat_pemindaian')
        .select('*')
        .neq('status_kesegaran', 'DIHAPUS')
        .neq('status_kesegaran', 'MENUNGGU_INFERENSI_ML')
        .order('dibuat_pada', { ascending: false });

      if (currentUserId) {
        queryIdn = queryIdn.eq('id_pengguna', currentUserId);
      }

      const { data: dataIdn, error: errIdn } = await queryIdn;

      if (!errIdn && dataIdn) {
        const mapped: ScanRecord[] = dataIdn.map((row: any) => {
          let meta: any = null;
          let cleanVisual = row.kondisi_visual || row.visual_condition || '';
          if (typeof cleanVisual === 'string' && cleanVisual.trim().startsWith('{')) {
            try {
              meta = JSON.parse(cleanVisual);
              if (meta.defects && Array.isArray(meta.defects) && meta.defects.length > 0) {
                cleanVisual = meta.defects.join(', ');
              } else if (meta.disease_detected && !meta.disease_detected.toLowerCase().includes('normal')) {
                cleanVisual = meta.disease_detected;
              } else if (meta.ripeness_stage) {
                cleanVisual = `${meta.ripeness_stage} (Normal)`;
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
            item_name: row.nama_bahan || row.item_name,
            category: (row.kategori_bahan || row.category || 'Sayur') as 'Sayur' | 'Buah',
            freshness_score: row.skor_kesegaran ?? meta?.freshness_score ?? row.freshness_score ?? 3,
            status: row.status_kesegaran || meta?.status || row.status || 'Layu',
            gas_ch4_ppm: Number(row.gas_ch4_ppm ?? row.gas_metana_ch4_ppm ?? 0),
            gas_aqi_ppm: Number(row.gas_aqi_ppm ?? row.gas_kualitas_aqi_ppm ?? 0),
            visual_condition: cleanVisual,
            action_taken: row.tindakan_diambil || row.action_taken || '',
            recommendation_title: row.judul_rekomendasi || row.recommendation_title || '',
            saved_weight_kg: Number(row.estimasi_berat_kg ?? row.saved_weight_kg ?? 5.0),
            prevented_ch4_g: Number(row.emisi_ch4_tercegah_g ?? row.prevented_ch4_g ?? 0),
            prevented_co2e_g: Number(row.emisi_co2e_tercegah_g ?? row.prevented_co2e_g ?? 0),
            financial_savings_idr: Number(row.penghematan_rupiah ?? row.financial_savings_idr ?? 0),
            image_url: row.foto_sampel_url || row.image_url || '',
            temperature: row.suhu_lingkungan_c ?? row.temperature,
            humidity: row.kelembapan_relatif_rh ?? row.humidity,
            color_hex: row.spektrum_warna_hex ?? row.color_hex,
            color_name: row.spektrum_nama_warna ?? row.color_name,
            // Shelf-Life & Merchant Inventory Mapping
            shelf_life_hours: Number(row.sisa_umur_simpan_jam ?? meta?.hours_to_spoil ?? row.shelf_life_hours ?? 48),
            shelf_life_days: Number(row.sisa_hari_simpan ?? meta?.days_to_spoil ?? row.shelf_life_days ?? 2.0),
            ripeness_stage: row.fase_kematangan || meta?.ripeness_stage || row.ripeness_stage || 'Fullripe (Matang Optimal)',
            disease_detected: row.deteksi_penyakit || meta?.disease_detected || row.disease_detected || 'Normal (Bebas Jamur)',
            inventory_action: row.tindakan_stok_pedagang || meta?.inventory_action || row.inventory_action || 'Pajang di Etalase Depan Segera',
            pricing_strategy: row.rekomendasi_harga || meta?.pricing_strategy || row.pricing_strategy || 'Harga Normal',
            color_consistency: row.status_validasi_kroma || row.color_consistency || 'Sangat Konsisten'
          };
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        }
        return mapped;
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
export async function saveScanRecord(fusion: FusionResult): Promise<ScanRecord> {
  const recordId = generateUUID();
  const nowIso = new Date().toISOString();

  let currentUserId: string | null = null;
  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      currentUserId = authData?.user?.id || null;
    } catch {
      //
    }
  }

  const newRecord: ScanRecord = {
    id: recordId,
    created_at: nowIso,
    item_name: fusion.item_name,
    category: fusion.category,
    freshness_score: fusion.freshness_score,
    status: fusion.status,
    gas_ch4_ppm: fusion.gas_summary.ch4_ppm,
    gas_aqi_ppm: fusion.gas_summary.aqi_ppm,
    visual_condition: fusion.gas_summary.visual_status,
    action_taken: fusion.shelf_life?.inventory_action || (fusion.status === 'Busuk' ? 'Dibuat kompos aerobik' : `Diolah menjadi ${fusion.recommendation.title.toLowerCase()}`),
    recommendation_title: fusion.recommendation.title,
    saved_weight_kg: fusion.saved_weight_kg,
    prevented_ch4_g: fusion.prevented_ch4_g,
    prevented_co2e_g: fusion.prevented_co2e_g,
    financial_savings_idr: fusion.financial_savings_idr,
    image_url: fusion.image_url,
    temperature: fusion.gas_summary.temperature,
    humidity: fusion.gas_summary.humidity,
    color_hex: fusion.gas_summary.color_hex,
    color_name: fusion.gas_summary.color_name,
    // Shelf-life & Merchant fields
    shelf_life_hours: fusion.shelf_life?.hours_remaining ?? 48,
    shelf_life_days: fusion.shelf_life?.days_remaining ?? 2.0,
    ripeness_stage: fusion.shelf_life?.ripeness_stage ?? 'Fullripe (Matang Optimal)',
    disease_detected: fusion.shelf_life?.disease_detected ?? 'Normal (Bebas Jamur)',
    inventory_action: fusion.shelf_life?.inventory_action ?? 'Pajang di Etalase Depan Segera',
    pricing_strategy: fusion.shelf_life?.pricing_strategy ?? 'Harga Normal',
    color_consistency: fusion.shelf_life?.color_validation?.consistency_status ?? 'Sangat Konsisten'
  };

  // Insert into Supabase table
  if (supabase) {
    try {
      const effectiveUserId = currentUserId || 'cf9ef20e-2c03-4f8e-aa4b-636913f0f627';
      const indonesianPayload = {
        id: recordId,
        id_pengguna: effectiveUserId,
        nama_bahan: fusion.item_name,
        kategori_bahan: fusion.category,
        skor_kesegaran: fusion.freshness_score,
        status_kesegaran: fusion.status,
        warna_badge_status: fusion.status_badge_color,
        ringkasan_analisis: fusion.status_summary,
        kondisi_visual: fusion.gas_summary.visual_status,
        tindakan_diambil: newRecord.action_taken,
        judul_rekomendasi: fusion.recommendation.title,
        gas_ch4_ppm: fusion.gas_summary.ch4_ppm,
        gas_aqi_ppm: fusion.gas_summary.aqi_ppm,
        suhu_lingkungan_c: fusion.gas_summary.temperature ?? 27.0,
        kelembapan_relatif_rh: fusion.gas_summary.humidity ?? 65.0,
        spektrum_warna_hex: fusion.gas_summary.color_hex ?? '#DC2626',
        spektrum_nama_warna: fusion.gas_summary.color_name ?? 'Merah Stroberi Terang',
        estimasi_berat_kg: fusion.saved_weight_kg,
        emisi_ch4_tercegah_g: fusion.prevented_ch4_g,
        emisi_co2e_tercegah_g: fusion.prevented_co2e_g,
        penghematan_rupiah: fusion.financial_savings_idr,
        foto_sampel_url: fusion.image_url,
        sisa_umur_simpan_jam: fusion.shelf_life?.hours_remaining ?? 48,
        sisa_hari_simpan: fusion.shelf_life?.days_remaining ?? 2.0,
        fase_kematangan: fusion.shelf_life?.ripeness_stage ?? 'Fullripe (Matang Optimal)',
        deteksi_penyakit: fusion.shelf_life?.disease_detected ?? 'Normal (Bebas Jamur)',
        tindakan_stok_pedagang: fusion.shelf_life?.inventory_action ?? 'Pajang di Etalase Depan Segera',
        rekomendasi_harga: fusion.shelf_life?.pricing_strategy ?? 'Harga Normal',
        status_validasi_kroma: fusion.shelf_life?.color_validation?.consistency_status ?? 'Sangat Konsisten',
        dibuat_pada: nowIso
      };

      const { error: errIdn } = await supabase.from('riwayat_pemindaian').insert([indonesianPayload]);
      if (!errIdn) {
        console.log('[Supabase] Saved to riwayat_pemindaian successfully with shelf-life');
      }

      // 2. Also insert to scans table if available
      await supabase.from('scans').insert([newRecord]);
    } catch (e) {
      console.warn('Supabase insert failed:', e);
    }
  }

  // Keep local storage in sync
  if (typeof window !== 'undefined') {
    const existing = await fetchScanRecords();
    const updated = [newRecord, ...existing.filter(r => r.id !== newRecord.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return newRecord;
}

/**
 * Delete a scan record from Supabase and local storage
 */
export async function deleteScanRecord(id: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from('riwayat_pemindaian').update({ status_kesegaran: 'DIHAPUS' }).eq('id', id);
      await supabase.from('riwayat_pemindaian').delete().eq('id', id);
      await supabase.from('scans').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const existing = await fetchScanRecords();
    const updated = existing.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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

      if (currentUserId) {
        await supabase.from('riwayat_pemindaian').update({ status_kesegaran: 'DIHAPUS' }).eq('id_pengguna', currentUserId);
        await supabase.from('riwayat_pemindaian').delete().eq('id_pengguna', currentUserId);
      } else {
        await supabase.from('riwayat_pemindaian').update({ status_kesegaran: 'DIHAPUS' }).neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('riwayat_pemindaian').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('scans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
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
          bounding_boxes: visualMeta.bounding_boxes || [],
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
