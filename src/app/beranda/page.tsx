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
import { saveScanRecord, requestCloudMlInference, supabase } from '@/lib/supabase';
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

  const handleTriggerCamera = () => {
    setSubView('pindai');
    setTriggerCameraCount((prev) => prev + 1);
  };

  // 1. Muat data telemetri terakhir dari database Supabase milik pengguna
  useEffect(() => {
    async function loadLatestTelemetry() {
      if (!supabase || !user) return;

      try {
        let query = supabase
          .from('telemetri_sensor')
          .select('*')
          .order('waktu_perekaman', { ascending: false })
          .limit(1);

        if (user?.id) {
          // Coba ambil telemetri milik user
          const { data: userTele } = await query.eq('id_pengguna', user.id).maybeSingle();
          if (userTele) {
            applyTelemetry(userTele);
            return;
          }
        }

        // Fallback ke telemetri terbaru dari node sensor manapun
        const { data: latestData, error } = await supabase
          .from('telemetri_sensor')
          .select('*')
          .order('waktu_perekaman', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && latestData) {
          applyTelemetry(latestData);
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

  const handleStartAnalysis = (visualData: VisualData) => {
    setActiveVisualData(visualData);
    setSubView('proses');
    setSyncAlert(null);
  };

  const handleAnalysisCompleted = async () => {
    if (!activeVisualData) return;

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
        signal: AbortSignal.timeout(2000)
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
          result.shelf_life.hours_remaining = md.shelf_life_hours;
          result.shelf_life.days_remaining = md.shelf_life_days;
          result.shelf_life.ripeness_stage = md.ripeness_stage;
          result.shelf_life.disease_detected = md.disease_detected;
          result.shelf_life.inventory_action = md.inventory_action;
          result.shelf_life.pricing_strategy = md.pricing_strategy;
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
            title: 'Hasil Terverifikasi AI Nyata (Localhost REST)',
            message: `Inferensi YOLOv8 visual, 4-Sensor Random Forest, dan Kinetika Multimodal Q10 diproses langsung oleh Terminal Python ML (${md.metrics?.inference_ms ?? 35}ms).`
          });
        }
      }
    } catch {
      // Localhost REST offline atau diblokir mixed-content pada Vercel HTTPS
    }

    // 2. Jika direct REST tidak dapat diakses (misal pada website Vercel), kirim ke Cloud Queue Supabase!
    if (!usedLiveMl) {
      try {
        const cloudRes = await requestCloudMlInference(activeVisualData, gasData, 6500);
        if (cloudRes) {
          usedLiveMl = true;
          isCloudQueue = true;
          result.is_live_ml = true;
          result.freshness_score = cloudRes.freshness_score;
          result.status = cloudRes.status as any;
          result.status_badge_color = cloudRes.badge_color as any;
          result.shelf_life.hours_remaining = cloudRes.shelf_life_hours;
          result.shelf_life.days_remaining = cloudRes.shelf_life_days;
          result.shelf_life.ripeness_stage = cloudRes.ripeness_stage as any;
          result.shelf_life.disease_detected = cloudRes.disease_detected as any;
          result.shelf_life.inventory_action = cloudRes.inventory_action as any;
          result.shelf_life.pricing_strategy = cloudRes.pricing_strategy as any;
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
            title: 'Hasil Terverifikasi AI Nyata (Vercel Cloud Bridge)',
            message: `Terminal ML di laptop Anda merespons tugas dari Vercel! Diproses via YOLOv8, Random Forest & Kinetika Q10 (${cloudRes.metrics?.inference_ms ?? 45}ms).`
          });
        }
      } catch (err) {
        console.warn('Cloud Queue gagal:', err);
      }
    }

    if (!usedLiveMl) {
      setSyncAlert({
        type: 'info',
        title: 'Mode Kinetika Terpadu (Lokal)',
        message: 'Terminal ML sedang tidak aktif. Hasil dihitung menggunakan model kinetika biokimia Q10 dan fusi telemetri sensor secara presisi.'
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
