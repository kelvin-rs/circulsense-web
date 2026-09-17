'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PindaiBahan } from '@/components/beranda/PindaiBahan';
import { ProsesAnalisis } from '@/components/beranda/ProsesAnalisis';
import { HasilAnalisis } from '@/components/beranda/HasilAnalisis';
import { RecipeDetailModal } from '@/components/RecipeDetailModal';
import { mqttService, MQTTStatus } from '@/lib/mqtt';
import { runSensorFusion } from '@/lib/sensor-fusion';
import { saveScanRecord, submitScanTask, pollScanResult, supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { GasData, VisualData, FusionResult, UpcyclingRecommendation } from '@/types/circulsense';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function BerandaPage() {
  const { user } = useAuth();
  const [subView, setSubView] = useState<'pindai' | 'proses' | 'hasil'>('pindai');
  const [activeVisualData, setActiveVisualData] = useState<VisualData | null>(null);
  const [currentFusionResult, setCurrentFusionResult] = useState<FusionResult | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [triggerCameraCount, setTriggerCameraCount] = useState<number>(0);

  const [gasData, setGasData] = useState<GasData>(mqttService.getCurrentData());
  const [mqttStatus, setMqttStatus] = useState<MQTTStatus>('disconnected');
  const [activeRecipeModal, setActiveRecipeModal] = useState<UpcyclingRecommendation | null>(null);
  const [syncAlert, setSyncAlert] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const pendingScanPromiseRef = React.useRef<Promise<string | null> | null>(null);

  const handleTriggerCamera = () => {
    setSubView('pindai');
    setTriggerCameraCount((prev) => prev + 1);
  };

  // 1. Muat data telemetri terakhir dari database Supabase milik pengguna
  useEffect(() => {
    async function loadLatestTelemetry() {
      if (!supabase || !user) return;

      try {
        const { data, error } = await supabase
          .from('log_telemetri_iot')
          .select('*')
          .eq('id_pengguna', user.id)
          .order('waktu_perekaman', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setGasData({
            ch4_ppm: Number(data.mq4_metana_ppm ?? data.mq4_gas_metana_ppm ?? 0),
            aqi_ppm: Number(data.mq135_udara_ppm ?? data.mq135_aqi_ppm ?? 0),
            raw_mq4: data.mq4_tegangan_raw,
            raw_mq135: data.mq135_tegangan_raw,
            temperature: Number(data.dht22_suhu_celsius),
            humidity: Number(data.dht22_kelembapan_persen),
            color_r: data.tcs_kanal_merah,
            color_g: data.tcs_kanal_hijau,
            color_b: data.tcs_kanal_biru,
            color_c: data.tcs_kanal_clear,
            color_lux: data.tcs_intensitas_lux,
            color_temp: data.tcs_suhu_warna_kelvin,
            color_hex: data.tcs_kode_hex,
            color_name: data.tcs_nama_warna,
            battery: 100,
            is_connected: true,
            has_data: true,
            timestamp: data.waktu_perekaman
          });
        }
      } catch (err) {
        console.warn('Gagal memuat telemetri terakhir dari database:', err);
      }
    }

    loadLatestTelemetry();
  }, [user]);

  // 2. Inisialisasi dan dengarkan aliran data MQTT
  useEffect(() => {
    mqttService.init();

    const unsubMqtt = mqttService.subscribe((data) => {
      setGasData(data);
    });

    const unsubStatus = mqttService.onStatusChange((status) => {
      setMqttStatus(status);
    });

    return () => {
      unsubMqtt();
      unsubStatus();
    };
  }, []);

  const handleStartAnalysis = (visualData: VisualData) => {
    setActiveVisualData(visualData);
    setSubView('proses');
    setSyncAlert(null);

    // Buat antrean ke Supabase agar ditangkap otomatis oleh run_demo.bat di laptop
    pendingScanPromiseRef.current = submitScanTask(visualData, gasData)
      .then((res) => {
        if (res.error) {
          console.warn('[Sync Error]', res.error);
          setSyncAlert({
            type: 'error',
            title: 'Kendala Koneksi Database',
            message: `Gagal mengirim antrean pemindaian ke Supabase: ${res.error}. Sistem tetap melanjutkan dalam simulasi lokal.`
          });
          return null;
        }
        return res.id || null;
      })
      .catch((err) => {
        console.warn('[Sync Exception]', err);
        return null;
      });
  };

  const handleAnalysisCompleted = async () => {
    if (!activeVisualData) return;

    let mlResultFromSupabase: any = null;
    let scanId: string | null = null;

    if (pendingScanPromiseRef.current) {
      try {
        scanId = await pendingScanPromiseRef.current;
      } catch {}
    }

    if (scanId) {
      // Tunggu hingga Worker Python selesai mengupdate baris ini di Supabase (maks 10 detik)
      mlResultFromSupabase = await pollScanResult(scanId, 10000);
    }

    // Jalankan fusi sensor lokal sebagai basis
    const result = runSensorFusion(activeVisualData, gasData);

    // Jika Worker Python di laptop berhasil mengeksekusi YOLO & Multimodal, terapkan hasil nyata AI!
    if (mlResultFromSupabase) {
      result.is_live_ml = true;
      result.freshness_score = mlResultFromSupabase.skor_kesegaran ?? result.freshness_score;
      result.status = mlResultFromSupabase.status_kesegaran ?? result.status;
      result.status_badge_color = mlResultFromSupabase.warna_badge_status ?? result.status_badge_color;
      result.status_summary = mlResultFromSupabase.ringkasan_analisis ?? result.status_summary;

      // Baca metadata aman yang dienkapsulasi dari kondisi_visual
      const meta = mlResultFromSupabase._meta;
      if (meta) {
        if (meta.disease) {
          if (meta.disease === 'Gray_Mold') result.shelf_life.disease_detected = 'Risiko Gray Mold (Botrytis)';
          else if (meta.disease === 'Black_Spot') result.shelf_life.disease_detected = 'Black Spot';
          else if (meta.disease === 'Powdery_Mildew') result.shelf_life.disease_detected = 'Powdery Mildew';
          else result.shelf_life.disease_detected = 'Normal (Bebas Jamur)';
        }
        if (meta.ripeness) {
          if (meta.ripeness === 'Unripe') result.shelf_life.ripeness_stage = 'Unripe (Mentah)';
          else if (meta.ripeness === 'Semiripe') result.shelf_life.ripeness_stage = 'Semiripe (Setengah Matang)';
          else if (meta.ripeness === 'Overripe') result.shelf_life.ripeness_stage = 'Overripe (Lewat Matang)';
          else result.shelf_life.ripeness_stage = 'Fullripe (Matang Optimal)';
        }
        if (meta.hours_to_spoil != null) {
          result.shelf_life.hours_remaining = Number(meta.hours_to_spoil);
          result.shelf_life.days_remaining = Number(meta.days_to_spoil);
        }
        if (meta.action_code === 'OLAH_SEGERA') {
          result.shelf_life.inventory_action = 'Pilah ke Komposter Organik / Bio-fermentasi';
          result.shelf_life.pricing_strategy = 'Bahan Baku Olahan';
        } else if (meta.action_code === 'DISCOUNT_CEPAT') {
          result.shelf_life.inventory_action = 'Diskon / Jual Cepat Hari Ini';
          result.shelf_life.pricing_strategy = 'Diskon 30-50%';
        }
      }

      // Jika terdeteksi Busuk dari model AI
      if (result.status === 'Busuk' || result.freshness_score <= 1) {
        result.status = 'Busuk';
        result.freshness_score = 1;
        result.status_badge_color = 'red';
        result.shelf_life.hours_remaining = 0;
        result.shelf_life.days_remaining = 0;
        result.shelf_life.disease_detected = 'Risiko Gray Mold (Botrytis)';
        result.shelf_life.inventory_action = 'Pilah ke Komposter Organik / Bio-fermentasi';
        result.shelf_life.pricing_strategy = 'Bahan Baku Olahan';
      }

      if (mlResultFromSupabase.sisa_umur_simpan_jam != null) {
        result.shelf_life.hours_remaining = Number(mlResultFromSupabase.sisa_umur_simpan_jam);
        result.shelf_life.days_remaining = Number(mlResultFromSupabase.sisa_hari_simpan);
      }
      if (mlResultFromSupabase.fase_kematangan) {
        result.shelf_life.ripeness_stage = mlResultFromSupabase.fase_kematangan;
      }
      if (mlResultFromSupabase.deteksi_penyakit) {
        result.shelf_life.disease_detected = mlResultFromSupabase.deteksi_penyakit;
      }
      if (mlResultFromSupabase.tindakan_stok_pedagang) {
        result.shelf_life.inventory_action = mlResultFromSupabase.tindakan_stok_pedagang;
      }
      if (mlResultFromSupabase.rekomendasi_harga) {
        result.shelf_life.pricing_strategy = mlResultFromSupabase.rekomendasi_harga;
      }

      setSyncAlert({
        type: 'success',
        title: 'Hasil Terverifikasi AI',
        message: 'Hasil analisis YOLOv8 & Model Fusi berhasil diproses secara nyata oleh Worker Laptop Anda!'
      });
    } else {
      // Fallback jika laptop sedang offline/tidak menjalankan run_demo.bat
      await saveScanRecord(result);
      setSyncAlert({
        type: 'warning',
        title: 'Mode Estimasi Heuristik (Worker Offline)',
        message: 'Worker Python di terminal laptop tidak merespons dalam 6.5 detik. Menampilkan estimasi fusi sensor lokal.'
      });
    }

    setCurrentFusionResult(result);
    setSubView('hasil');
  };

  return (
    <main className="min-h-screen bg-white text-[#1E293B] flex flex-col selection:bg-[#16A34A] selection:text-white">
      {!isCameraOpen && (
        <Header
          mqttStatus={mqttStatus}
          battery={gasData.battery}
        />
      )}

      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 lg:px-12 py-6">
        {syncAlert && (
          <div
            className={`mb-5 p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs sm:text-sm animate-in fade-in duration-200 shadow-xs ${
              syncAlert.type === 'success'
                ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#166534]'
                : syncAlert.type === 'warning'
                ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]'
                : syncAlert.type === 'error'
                ? 'bg-[#FEE2E2] border-[#FECACA] text-[#991B1B]'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-start space-x-2.5">
              {syncAlert.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0 text-[#16A34A] mt-0.5" />}
              {syncAlert.type === 'warning' && <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />}
              {syncAlert.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />}
              {syncAlert.type === 'info' && <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />}
              <div>
                <div className="font-bold">{syncAlert.title}</div>
                <p className="mt-0.5 opacity-90">{syncAlert.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSyncAlert(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-current opacity-70 hover:opacity-100 cursor-pointer"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {subView === 'pindai' && (
          <PindaiBahan
            gasData={gasData}
            onStartAnalysis={handleStartAnalysis}
            onCameraStateChange={(isOpen) => setIsCameraOpen(isOpen)}
            triggerCameraCount={triggerCameraCount}
          />
        )}

        {subView === 'proses' && activeVisualData && (
          <ProsesAnalisis
            gasData={gasData}
            visualData={activeVisualData}
            onCancel={() => setSubView('pindai')}
            onComplete={handleAnalysisCompleted}
          />
        )}

        {subView === 'hasil' && currentFusionResult && (
          <HasilAnalisis
            result={currentFusionResult}
            onBack={() => setSubView('pindai')}
            onOpenRecipeModal={(rec) => setActiveRecipeModal(rec)}
          />
        )}
      </div>

      {!isCameraOpen && <BottomNav onTriggerCamera={handleTriggerCamera} />}

      <RecipeDetailModal
        recommendation={activeRecipeModal}
        onClose={() => setActiveRecipeModal(null)}
      />
    </main>
  );
}
