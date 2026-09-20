'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { AutoAlert } from '@/components/AutoAlert';

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

    // 1. Panggil Model dengan CARA A (FormData /api/predict ke http://localhost:8000)
    try {
      let mlRes: Response | null = null;

      // OPSI CARA A: Gunakan FormData jika ada foto
      try {
        const formData = new FormData();
        if (activeVisualData.image_url.startsWith('data:')) {
          const blobRes = await fetch(activeVisualData.image_url);
          const blob = await blobRes.blob();
          formData.append('image', blob, 'strawberry_capture.jpg');
        } else {
          formData.append('image', activeVisualData.image_url);
        }

        formData.append('air_temperature', String(gasData.temperature ?? 20.0));
        formData.append('air_humidity', String(gasData.humidity ?? 60.0));
        const mq4Val = gasData.raw_mq4 ?? (gasData.ch4_ppm ? gasData.ch4_ppm * 25 : 75.0);
        const mq135Val = gasData.raw_mq135 ?? (gasData.aqi_ppm ? gasData.aqi_ppm * 28 : 680.0);
        formData.append('mq4', String(mq4Val));
        formData.append('mq135', String(mq135Val));

        mlRes = await fetch(`${mlBaseUrl}/api/predict`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(12000)
        });
      } catch (formErr) {
        // Fallback ke JSON jika FormData fetch terhambat
        mlRes = await fetch(`${mlBaseUrl}/api/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: activeVisualData.image_url || '',
            image_url: activeVisualData.image_url || '',
            temperature: Number(gasData.temperature ?? 20.0),
            humidity: Number(gasData.humidity ?? 60.0),
            mq4: gasData.raw_mq4 ?? (gasData.ch4_ppm ? gasData.ch4_ppm * 25 : 75.0),
            mq135: gasData.raw_mq135 ?? (gasData.aqi_ppm ? gasData.aqi_ppm * 28 : 680.0),
            saved_weight_kg: Number(activeVisualData.batch_weight_kg ?? 0.5)
          }),
          signal: AbortSignal.timeout(12000)
        });
      }

      if (mlRes && mlRes.ok) {
        const mlJson = await mlRes.json();
        const md = mlJson.data || mlJson;
        if (md.grade || md.grade_label) {
          usedLiveMl = true;
          result.is_live_ml = true;
          result.freshness_score = Number(md.freshness_score ?? 0.80);
          result.status = md.status || (md.grade === 'Fullripe' ? 'Segar' : (md.grade === 'Rotten' ? 'Busuk' : (md.grade === 'Overripe' ? 'Terlalu Matang' : 'Layu')));
          result.status_badge_color = md.badge_color || (result.status === 'Segar' ? 'green' : (result.status === 'Busuk' ? 'red' : 'yellow'));
          result.status_summary = md.summary || `${md.grade_label}. ${md.edibility || ''}`;

          // Rich 5-Class ML fields matching test_manual.py
          result.grade_label = md.grade_label || 'MATANG SEMPURNA (Fullripe / Grade A Super)';
          result.grade_confidence = md.grade_confidence ?? 0.95;
          result.grade_probs = md.grade_probs ?? {};
          result.edibility = md.edibility || 'KONDISI PRIMA SIAP MAKAN (Kualitas Rasa, Manis, & Aroma Puncak)';
          result.physical_desc = md.physical_desc || 'Warna merah merata, aroma manis harum, tekstur juicy empuk, siap dinikmati langsung atau dipajang di etalase.';
          result.disease_label = md.disease_label || md.disease_detected || 'SEHAT & SEGAR (Bebas Penyakit)';
          result.disease_desc = md.disease_desc || 'Kondisi fisik segar, tidak ada tanda-tanda jamur atau bercak patogen.';
          result.disease_confidence = md.disease_confidence ?? 0.85;
          result.red_ratio_pct = md.red_ratio_pct ?? (md.chroma ? Math.round(md.chroma.red_ratio * 100) : 72.8);
          result.fruits_detected = md.fruits_detected ?? (md.results ? md.results.length : 1);
          result.results = md.results ?? [];
          result.active_fruit_index = 0;
          result.annotated_image_path = md.annotated_image_path;
          result.sensor_analysis = md.sensor_analysis;

          // Shelf Life Kinetics
          result.shelf_life.hours_remaining = md.shelf_life_hours ?? Math.round((md.days_to_spoil ?? 3.1) * 24);
          result.shelf_life.days_remaining = md.shelf_life_days ?? md.days_to_spoil ?? 3.1;
          result.shelf_life.time_to_mature_hours = md.time_to_mature_hours ?? 0;
          result.shelf_life.time_to_ripe_hours = md.time_to_mature_hours ?? 0;
          result.shelf_life.time_to_ripe_days = md.time_to_mature_days ?? md.days_to_mature ?? 0;
          result.shelf_life.time_to_spoil_hours = md.time_to_spoil_hours ?? result.shelf_life.hours_remaining;
          result.shelf_life.time_to_spoil_days = md.time_to_spoil_days ?? result.shelf_life.days_remaining;
          result.shelf_life.ripeness_stage = md.grade_label as any;
          result.shelf_life.disease_detected = md.disease_label as any;
          result.shelf_life.inventory_action = md.inventory_action || (md.grade === 'Fullripe' ? 'Pajang di Etalase Depan Segera' : 'Diskon / Jual Cepat Hari Ini');
          result.shelf_life.pricing_strategy = md.pricing_strategy || 'Harga Normal';
          result.shelf_life.urgency_level = md.urgency_level || (md.grade === 'Rotten' ? 'Kedaluwarsa' : (md.grade === 'Overripe' ? 'Perhatian' : 'Aman'));
          result.recommendation.title = md.inventory_action || result.recommendation.title;

          result.bounding_boxes = md.bounding_boxes
            ? md.bounding_boxes.map((b: any) => [b.x, b.y, b.w, b.h])
            : (md.results ? md.results.map((r: any) => r.bbox_norm || [0.5, 0.5, 0.5, 0.5]) : []);

          if (md.results && md.results.length > 0) {
            result.results = md.results.map((r: any, idx: number) => ({
              ...r,
              bbox_norm: r.bbox_norm || (md.bounding_boxes?.[idx] ? [md.bounding_boxes[idx].x, md.bounding_boxes[idx].y, md.bounding_boxes[idx].w, md.bounding_boxes[idx].h] : [0.5, 0.5, 0.5, 0.5])
            }));
          }

          if (md.bounding_boxes && md.bounding_boxes.length > 0) {
            result.detection_bbox = [
              md.bounding_boxes[0].x,
              md.bounding_boxes[0].y,
              md.bounding_boxes[0].w,
              md.bounding_boxes[0].h
            ];
          } else if (result.results && result.results.length > 0 && result.results[0].bbox_norm) {
            result.detection_bbox = result.results[0].bbox_norm;
          }

          setSyncAlert({
            type: 'success',
            title: 'Hasil Terverifikasi ML Strawberry',
            message: `Inferensi 3-Model selesai: ${md.grade_label} (${(md.grade_confidence * 100).toFixed(1)}%).`
          });
        }
      }
    } catch {
      // Localhost direct REST offline atau diblokir HTTPS mixed-content pada Vercel
    }

    // 2. Jika direct REST tidak dapat diakses (misal pada website Vercel https://circulsense-web.vercel.app),
    // kirim ke Cloud Queue Supabase agar diproses worker lokal secara otomatis!
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

          // Rich 5-Class ML fields from Cloud Worker
          result.grade_label = (cloudRes as any).grade_label || cloudRes.ripeness_stage || 'MATANG SEMPURNA (Fullripe / Grade A Super)';
          result.grade_confidence = (cloudRes as any).grade_confidence ?? 0.95;
          result.edibility = (cloudRes as any).edibility || 'KONDISI PRIMA SIAP MAKAN (Kualitas Rasa, Manis, & Aroma Puncak)';
          result.physical_desc = (cloudRes as any).physical_desc || 'Warna merah merata, aroma manis harum, tekstur juicy empuk, siap dinikmati langsung atau dipajang di etalase.';
          result.disease_label = (cloudRes as any).disease_label || cloudRes.disease_detected || 'SEHAT & SEGAR (Bebas Penyakit)';
          result.disease_desc = (cloudRes as any).disease_desc || 'Kondisi fisik segar, tidak ada tanda-tanda jamur atau bercak patogen.';
          result.disease_confidence = (cloudRes as any).disease_confidence ?? 0.85;
          result.red_ratio_pct = (cloudRes as any).red_ratio_pct ?? 72.8;
          result.fruits_detected = (cloudRes as any).fruits_detected ?? 1;
          result.results = (cloudRes as any).results ?? [];
          result.active_fruit_index = 0;

          result.shelf_life.hours_remaining = cloudRes.shelf_life_hours;
          result.shelf_life.days_remaining = cloudRes.shelf_life_days;
          result.shelf_life.time_to_mature_hours = cloudRes.time_to_ripe_hours ?? 0;
          result.shelf_life.time_to_ripe_hours = cloudRes.time_to_ripe_hours ?? 0;
          result.shelf_life.time_to_ripe_days = cloudRes.time_to_ripe_days ?? 0;
          result.shelf_life.time_to_spoil_hours = cloudRes.time_to_spoil_hours ?? cloudRes.shelf_life_hours;
          result.shelf_life.time_to_spoil_days = cloudRes.time_to_spoil_days ?? cloudRes.shelf_life_days;
          result.shelf_life.ripeness_stage = result.grade_label as any;
          result.shelf_life.disease_detected = result.disease_label as any;
          result.shelf_life.inventory_action = cloudRes.inventory_action as any;
          result.shelf_life.pricing_strategy = cloudRes.pricing_strategy as any;
          result.shelf_life.urgency_level = (cloudRes.urgency_level || (cloudRes.status === 'Busuk' ? 'Kedaluwarsa' : (cloudRes.status === 'Terlalu Matang' ? 'Perhatian' : (cloudRes.status === 'Layu' ? 'Kritis' : 'Aman')))) as any;
          result.recommendation.title = cloudRes.inventory_action || result.recommendation.title;

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
            title: 'Hasil Terverifikasi ML Strawberry (Cloud Bridge)',
            message: `Pemeriksaan visual kamera dan sensor fisik diproses dari server model lokal (${(cloudRes as any).metrics?.inference_ms ?? 45}ms).`
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

    // Simpan hasil pemindaian ke riwayat (database & local storage)
    try {
      await saveScanRecord(result, user?.id);
    } catch (saveErr) {
      console.warn('Peringatan penyimpanan ke database:', saveErr);
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
