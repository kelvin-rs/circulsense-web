'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PindaiBahan } from '@/components/beranda/PindaiBahan';
import { ProsesAnalisis } from '@/components/beranda/ProsesAnalisis';
import { HasilAnalisis } from '@/components/beranda/HasilAnalisis';
import { RecipeDetailModal } from '@/components/RecipeDetailModal';
import { mqttService, MQTTStatus } from '@/lib/mqtt';
import { runSensorFusion, RECIPE_CATALOG } from '@/lib/sensor-fusion';
import { saveScanRecord, requestCloudMlInference, supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { GasData, VisualData, FusionResult, UpcyclingRecommendation } from '@/types/circulsense';
import { AutoAlert } from '@/components/AutoAlert';

export default function BerandaPage() {
  const { user } = useAuth();
  const [subView, setSubView] = useState<'pindai' | 'proses' | 'hasil'>('pindai');
  const [activeVisualData, setActiveVisualData] = useState<VisualData | null>(null);
  const [currentFusionResult, setCurrentFusionResult] = useState<FusionResult | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [triggerCameraCount, setTriggerCameraCount] = useState<number>(0);

  const [gasData, setGasData] = useState<GasData>(mqttService.getCurrentData());
  const [mqttStatus, setMqttStatus] = useState<MQTTStatus>('connecting');
  const [activeRecipeModal, setActiveRecipeModal] = useState<UpcyclingRecommendation | null>(null);
  const [syncAlert, setSyncAlert] = useState<{
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Periksa notifikasi login_success dari URL query
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('alert') === 'login_success') {
        setSyncAlert({
          type: 'success',
          title: 'Berhasil Masuk',
          message: 'Selamat datang kembali! Akun CirculSense Anda siap digunakan.'
        });
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, []);

  const handleTriggerCamera = () => {
    setSubView('pindai');
    setTriggerCameraCount((prev) => prev + 1);
  };

  // 1. Muat telemetri terakhir dari tabel IoT Supabase
  useEffect(() => {
    async function loadLatestTelemetry() {
      if (!supabase) return;
      try {
        const { data: latestData, error } = await supabase
          .from('telemetri_iot_mentah')
          .select('*')
          .order('waktu_perekaman', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && latestData) {
          applyTelemetry(latestData);
          return;
        }

        // Fallback ke telemetri_sensor jika telemetri_iot_mentah kosong
        const { data: userTele } = await supabase
          .from('telemetri_sensor')
          .select('*')
          .order('waktu_perekaman', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (userTele) {
          applyTelemetry(userTele);
        }
      } catch (err) {
        console.warn('Gagal memuat telemetri terakhir dari database:', err);
      }
    }

    function applyTelemetry(data: any) {
      setGasData({
        ch4_ppm: Number(data.mq4_metana_ppm ?? 0),
        aqi_ppm: Number(data.mq135_udara_ppm ?? 0),
        raw_mq4: data.mq4_tegangan_raw,
        raw_mq135: data.mq135_tegangan_raw,
        temperature: Number(data.dht22_suhu_celsius ?? 27.0),
        humidity: Number(data.dht22_kelembapan_persen ?? 65.0),
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

  const isProcessingAnalysisRef = useRef(false);

  const handleStartAnalysis = (visualData: VisualData) => {
    setActiveVisualData(visualData);
    setSubView('proses');
    setSyncAlert(null);
  };

  const handleAnalysisCompleted = async () => {
    if (!activeVisualData || isProcessingAnalysisRef.current) return;
    isProcessingAnalysisRef.current = true;

    try {
      // Basis awal fusi kinetika
      const result = runSensorFusion(activeVisualData, gasData);
      let usedLiveMl = false;
      let isCloudQueue = false;

    const mlBaseUrl = (process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');

    // 1. Coba hubungi REST API langsung (sangat cepat untuk http://localhost:3000 atau Tunnel HTTPS)
    try {
      const mlRes = await fetch(`${mlBaseUrl}/predict/fusion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: activeVisualData.image_url || '',
          temperature: Number(gasData.temperature ?? 27.0),
          humidity: Number(gasData.humidity ?? 65.0),
          ch4_ppm: Number(gasData.ch4_ppm ?? 0.0),
          raw_mq4: gasData.raw_mq4,
          aqi_ppm: Number(gasData.aqi_ppm ?? 0.0),
          raw_mq135: gasData.raw_mq135,
          saved_weight_kg: Number(activeVisualData.batch_weight_kg ?? 0.5)
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (mlRes.ok) {
        const mlJson = await mlRes.json();
        if (mlJson.success && mlJson.data) {
          usedLiveMl = true;
          const md = mlJson.data;
          result.is_live_ml = true;
          result.freshness_score = md.freshness_score;
          result.status = md.status;
          result.status_badge_color = md.badge_color;
          result.status_summary = md.summary || md.action_recommendation || result.status_summary;
          result.shelf_life.hours_remaining = md.shelf_life_hours;
          result.shelf_life.days_remaining = md.shelf_life_days;
          result.shelf_life.time_to_mature_hours = md.time_to_mature_hours ?? md.time_to_ripe_hours ?? 0;
          result.shelf_life.time_to_ripe_hours = md.time_to_mature_hours ?? md.time_to_ripe_hours ?? 0;
          result.shelf_life.time_to_ripe_days = md.time_to_mature_days ?? md.time_to_ripe_days ?? 0;
          result.shelf_life.time_to_spoil_hours = md.time_to_spoil_hours ?? md.shelf_life_hours;
          result.shelf_life.time_to_spoil_days = md.time_to_spoil_days ?? md.shelf_life_days;
          result.shelf_life.ripeness_stage = md.ripeness_stage;
          result.shelf_life.disease_detected = md.disease_detected;
          result.shelf_life.inventory_action = md.inventory_action;
          result.shelf_life.pricing_strategy = md.pricing_strategy;
          result.shelf_life.urgency_level = md.urgency_level || (md.status === 'Busuk' ? 'Kedaluwarsa' : (md.status === 'Terlalu Matang' ? 'Perhatian' : (md.status === 'Layu' ? 'Kritis' : 'Aman')));

          const isRotten = md.status === 'Busuk' || md.disease_detected === 'Gray_Mold' || md.grade === 'Rotten';
          if (isRotten) {
            result.recommendation = { ...(RECIPE_CATALOG['Stroberi']?.busuk || result.recommendation), title: md.inventory_action };
          } else if (md.status === 'Terlalu Matang' || md.status === 'Layu') {
            result.recommendation = { ...(RECIPE_CATALOG['Stroberi']?.layu || result.recommendation), title: md.inventory_action };
          } else {
            result.recommendation = { ...(RECIPE_CATALOG['Stroberi']?.segar || result.recommendation), title: md.inventory_action };
          }

          if (md.bounding_boxes && md.bounding_boxes.length > 0) {
            result.detection_bbox = [
              md.bounding_boxes[0].x,
              md.bounding_boxes[0].y,
              md.bounding_boxes[0].w,
              md.bounding_boxes[0].h
            ];
          }
          if (md.impact) {
            result.prevented_ch4_g = md.impact.prevented_ch4_g;
            result.prevented_co2e_g = md.impact.prevented_co2e_g;
            result.financial_savings_idr = md.impact.financial_savings_idr;
          }

          setSyncAlert({
            type: 'success',
            title: 'Hasil Terverifikasi AI (Lokal)',
            message: `Pemeriksaan visual kamera dan sensor fisik selesai diproses (${md.metrics?.inference_ms ?? 35}ms).`
          });
        }
      }
    } catch (restErr) {
      console.warn('[Beranda ML REST] Direct fetch gagal, fallback ke Cloud Bridge:', restErr);
    }

    // 2. Jika direct REST tidak dapat diakses (misal pada website Vercel), kirim ke Cloud Queue Supabase!
    if (!usedLiveMl) {
      try {
        const cloudRes = await requestCloudMlInference(activeVisualData, gasData, 12000);
        if (cloudRes) {
          usedLiveMl = true;
          isCloudQueue = true;
          result.is_live_ml = true;
          result.freshness_score = cloudRes.freshness_score;
          result.status = cloudRes.status as any;
          result.status_badge_color = cloudRes.badge_color as any;
          result.status_summary = cloudRes.summary || result.status_summary;
          result.shelf_life.hours_remaining = cloudRes.shelf_life_hours;
          result.shelf_life.days_remaining = cloudRes.shelf_life_days;
          result.shelf_life.time_to_mature_hours = cloudRes.time_to_ripe_hours ?? 0;
          result.shelf_life.time_to_ripe_hours = cloudRes.time_to_ripe_hours ?? 0;
          result.shelf_life.time_to_ripe_days = cloudRes.time_to_ripe_days ?? 0;
          result.shelf_life.time_to_spoil_hours = cloudRes.time_to_spoil_hours ?? cloudRes.shelf_life_hours;
          result.shelf_life.time_to_spoil_days = cloudRes.time_to_spoil_days ?? cloudRes.shelf_life_days;
          result.shelf_life.ripeness_stage = cloudRes.ripeness_stage as any;
          result.shelf_life.disease_detected = cloudRes.disease_detected as any;
          result.shelf_life.inventory_action = cloudRes.inventory_action as any;
          result.shelf_life.pricing_strategy = cloudRes.pricing_strategy as any;
          result.shelf_life.urgency_level = (cloudRes.urgency_level || (cloudRes.status === 'Busuk' ? 'Kedaluwarsa' : (cloudRes.status === 'Terlalu Matang' ? 'Perhatian' : (cloudRes.status === 'Layu' ? 'Kritis' : 'Aman')))) as any;

          const isRotten = cloudRes.status === 'Busuk' || (cloudRes.disease_detected || '').includes('Gray_Mold');
          if (isRotten) {
            result.recommendation = { ...(RECIPE_CATALOG['Stroberi']?.busuk || result.recommendation), title: cloudRes.inventory_action };
          } else if (cloudRes.status === 'Terlalu Matang' || cloudRes.status === 'Layu') {
            result.recommendation = { ...(RECIPE_CATALOG['Stroberi']?.layu || result.recommendation), title: cloudRes.inventory_action };
          } else {
            result.recommendation = { ...(RECIPE_CATALOG['Stroberi']?.segar || result.recommendation), title: cloudRes.inventory_action };
          }

          if (cloudRes.bounding_boxes && cloudRes.bounding_boxes.length > 0) {
            result.detection_bbox = [
              cloudRes.bounding_boxes[0].x,
              cloudRes.bounding_boxes[0].y,
              cloudRes.bounding_boxes[0].w,
              cloudRes.bounding_boxes[0].h
            ];
          }
          if (cloudRes.impact) {
            result.prevented_ch4_g = cloudRes.impact.prevented_ch4_g;
            result.prevented_co2e_g = cloudRes.impact.prevented_co2e_g;
            result.financial_savings_idr = cloudRes.impact.financial_savings_idr;
          }

          setSyncAlert({
            type: 'success',
            title: 'Hasil Terverifikasi AI (Cloud Bridge)',
            message: `Pemeriksaan visual kamera dan sensor fisik berhasil diproses dari cloud (${cloudRes.metrics?.inference_ms ?? 45}ms).`
          });
        }
      } catch (err) {
        console.warn('Cloud Queue gagal:', err);
      }
    }

    if (!usedLiveMl) {
      setSyncAlert({
        type: 'info',
        title: 'Mode Analisis Cerdas Standar',
        message: 'Hasil dihitung menggunakan model kualitas mutu buah dan telemetri sensor terpadu.'
      });
    }

    // Jika diproses via Cloud Queue, record sudah disimpan di riwayat_pemindaian oleh worker.
    // Jika via REST atau fallback lokal, simpan manual ke Supabase
    if (!isCloudQueue) {
      try {
        await saveScanRecord(result);
      } catch (saveErr) {
        console.warn('Peringatan penyimpanan ke database:', saveErr);
      }
    }

    setCurrentFusionResult(result);
    setSubView('hasil');
    } finally {
      isProcessingAnalysisRef.current = false;
    }
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
          <div className="mb-5">
            <AutoAlert
              type={syncAlert.type}
              title={syncAlert.title}
              message={syncAlert.message}
              duration={4500}
              onClose={() => setSyncAlert(null)}
            />
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
