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
import { saveScanRecord, supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { GasData, VisualData, FusionResult, UpcyclingRecommendation } from '@/types/circulsense';

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
          .from('telemetri_sensor')
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
  };

  const handleAnalysisCompleted = async () => {
    if (!activeVisualData) return;

    const result = runSensorFusion(activeVisualData, gasData);
    setCurrentFusionResult(result);

    await saveScanRecord(result);
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
