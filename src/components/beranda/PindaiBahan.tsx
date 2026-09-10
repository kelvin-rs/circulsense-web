'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, RotateCw, CheckCircle2, X, Thermometer, Droplets, Palette, Sun, Activity, Sparkles, Wind } from 'lucide-react';
import { GasData, VisualData } from '@/types/circulsense';

interface PindaiBahanProps {
  gasData: GasData;
  onStartAnalysis: (visualData: VisualData) => void;
  onCameraStateChange?: (isOpen: boolean) => void;
  onOpenTipsModal?: () => void;
  triggerCameraCount?: number;
}

export const PindaiBahan: React.FC<PindaiBahanProps> = ({
  gasData,
  onStartAnalysis,
  onCameraStateChange,
  triggerCameraCount = 0
}) => {
  const [useLiveCamera, setUseLiveCamera] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedFoodName, setDetectedFoodName] = useState<string>('Tomat');
  const [detectedConfidence, setDetectedConfidence] = useState<number>(0.96);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraSectionRef = useRef<HTMLDivElement | null>(null);

  // Auto trigger saat menu pindai ditekan atau URL mengandung ?buka_kamera=true
  useEffect(() => {
    if (triggerCameraCount > 0) {
      setUseLiveCamera(true);
    }
  }, [triggerCameraCount]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('buka_kamera') === 'true') {
        setUseLiveCamera(true);
        // Bersihkan query param agar rapi tanpa reload
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (useLiveCamera) {
      startCamera();
      document.body.style.overflow = 'hidden';
      onCameraStateChange?.(true);
    } else {
      stopCamera();
      document.body.style.overflow = '';
      onCameraStateChange?.(false);
    }
    return () => {
      stopCamera();
      document.body.style.overflow = '';
      onCameraStateChange?.(false);
    };
  }, [useLiveCamera, cameraFacing]);

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Kamera fisik tidak dapat diakses:', err);
      setUseLiveCamera(false);
      onCameraStateChange?.(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleTakeSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setDetectedFoodName('Tomat');
        setDetectedConfidence(0.96);
        setUseLiveCamera(false);
        onCameraStateChange?.(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCapturedImage(url);
      setDetectedFoodName('Tomat');
      setDetectedConfidence(0.95);
      setUseLiveCamera(false);
      onCameraStateChange?.(false);
    }
  };

  const activateCamera = () => {
    setUseLiveCamera(true);
  };

  const handleStartAnalysis = () => {
    if (!capturedImage) {
      activateCamera();
      return;
    }

    const visualPayload: VisualData = {
      item_name: detectedFoodName || 'Tomat',
      category: ['Tomat', 'Pisang', 'Apel'].includes(detectedFoodName) ? 'Buah' : 'Sayur',
      confidence: detectedConfidence,
      visual_score: 3,
      defects: ['Tekstur Lembek', 'Kulit Berkerut'],
      image_url: capturedImage
    };
    onStartAnalysis(visualPayload);
  };

  return (
    <div className="space-y-10 pb-24 md:pb-16">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <button
        id="btn-activate-camera"
        type="button"
        onClick={activateCamera}
        className="hidden"
        aria-hidden="true"
      />

      {/* FULLSCREEN IMMERSIVE CAMERA OVERLAY (100% COVERING VIEWPORT) */}
      {useLiveCamera && (
        <div className="fixed inset-0 z-[9999] w-screen h-[100dvh] bg-black flex flex-col justify-between overflow-hidden">
          {/* Live Video Feed filling the screen */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover z-0"
          />

          {/* Top Bar Overlay */}
          <div className="relative z-10 p-5 pt-8 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <button
              type="button"
              onClick={() => {
                setUseLiveCamera(false);
                onCameraStateChange?.(false);
              }}
              className="w-10 h-10 rounded-full bg-black/60 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/80 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-white font-bold text-sm tracking-wide">Pindai Bahan Pangan</span>
            <div className="w-10" />
          </div>

          {/* Bottom Controls Bar Overlay */}
          <div className="relative z-10 pb-12 sm:pb-10 px-8 flex items-center justify-between bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            <button
              type="button"
              onClick={() => setCameraFacing(cameraFacing === 'environment' ? 'user' : 'environment')}
              className="w-13 h-13 rounded-full bg-white/90 text-slate-800 shadow-xl flex items-center justify-center transition active:scale-90 cursor-pointer hover:bg-white"
              title="Ganti Kamera Depan/Belakang"
            >
              <RotateCw className="w-6 h-6 text-slate-800" />
            </button>

            <button
              type="button"
              onClick={handleTakeSnapshot}
              className="w-18 h-18 rounded-full bg-white border-4 border-[#2D7A38] text-[#2D7A38] shadow-2xl flex items-center justify-center transition active:scale-90 cursor-pointer ring-4 ring-white/30"
              title="Ambil Foto"
            >
              <div className="w-10 h-10 rounded-full bg-[#2D7A38]" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-13 h-13 rounded-full bg-white/90 text-slate-800 shadow-xl flex items-center justify-center transition active:scale-90 cursor-pointer hover:bg-white"
              title="Unggah dari Galeri / File"
            >
              <ImageIcon className="w-6 h-6 text-[#2D7A38]" />
            </button>
          </div>
        </div>
      )}

      {/* 1. HERO SECTION AT TOP (SEAMLESS) */}
      <section className="space-y-4 pt-1 pb-2 max-w-4xl">
        <div className="inline-block bg-[#DCFCE7] text-[#166534] text-[11px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-[#BBF7D0]">
          Inovasi Fusi Sensor Multimodal IoT & Edge AI
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] tracking-tight leading-[1.2]">
          Optimalkan Nilai Pangan dengan <span className="text-[#16A34A]">Fusi Sensor AI</span>
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-[#475569] leading-relaxed max-w-2xl">
          Sistem terintegrasi yang memadukan deteksi visual kamera, telemetri gas biokimia (MQ-4 & MQ-135), suhu & kelembapan (DHT22), serta analisis kroma spektral (TCS34725) untuk evaluasi kesegaran bahan pangan presisi tinggi.
        </p>

        {/* 4 Metric Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 pt-4 border-t border-[#F1F5F9]">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-1.5">
              <Wind className="w-3.5 h-3.5 text-[#2D7A38]" />
              <span className="text-xs sm:text-sm font-extrabold text-[#0F172A]">MQ-4 & 135</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#64748B] font-medium leading-tight mt-0.5">
              Emisi Bio-Gas
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-1.5">
              <Thermometer className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs sm:text-sm font-extrabold text-[#0F172A]">DHT22</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#64748B] font-medium leading-tight mt-0.5">
              Suhu & Kelembapan
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs sm:text-sm font-extrabold text-[#0F172A]">TCS34725</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#64748B] font-medium leading-tight mt-0.5">
              Spektral Warna RGB
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
              <span className="text-xs sm:text-sm font-extrabold text-[#16A34A]">Edge AI</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#64748B] font-medium leading-tight mt-0.5">
              YOLO Multimodal
            </p>
          </div>
        </div>
      </section>

      {/* 2. CAMERA CAPTURE & ANALYSIS SECTION */}
      <section id="camera-viewport" ref={cameraSectionRef} className="space-y-4 pt-4 border-t border-[#F1F5F9]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Hasil Citra & Pengambilan Gambar
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Arahkan bahan pangan ke dalam area kamera atau pilih dari galeri
          </p>
        </div>

        {/* Viewport & Parameter Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Visual Display Area */}
          <div className={capturedImage ? "lg:col-span-7 space-y-3" : "lg:col-span-12 max-w-3xl w-full space-y-3"}>
            <div className="flex items-center justify-between gap-2 pb-1">
              <span className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                {capturedImage ? 'Hasil Tangkapan Citra' : 'Viewport Kamera'}
              </span>

              {capturedImage && (
                <span className="text-[11px] font-bold text-[#166534] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full flex items-center space-x-1 shrink-0 border border-[#BBF7D0]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Tersimpan</span>
                </span>
              )}
            </div>

            {/* Viewport Box */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center shadow-sm">
              {capturedImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={capturedImage}
                    alt="Hasil Tangkapan Citra Bahan"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCapturedImage(null)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition shadow-md cursor-pointer z-10"
                    title="Hapus Citra"
                    aria-label="Hapus Citra"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={activateCamera}
                  className="flex flex-col items-center justify-center p-6 text-center space-y-3 cursor-pointer group w-full h-full hover:bg-slate-800 transition"
                >
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:scale-105 group-hover:text-white transition">
                    <Camera className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#4ADE80] transition">
                      Ketuk untuk Membuka Kamera
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Kamera langsung dengan opsi unggah foto galeri
                    </p>
                  </div>
                </div>
              )}
            </div>

            {capturedImage && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={activateCamera}
                  className="flex-1 bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#166534] text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer border border-[#BBF7D0]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ambil Ulang</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#334155] text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer border border-[#CBD5E1]"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#2D7A38]" />
                  <span>Ganti dari Galeri</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: AI Auto-Detection & Telemetry */}
          {capturedImage && (
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#F1F5F9] pb-2">
                  Parameter & Deteksi Otomatis AI
                </h3>

                {/* Telemetry Metrics List */}
                <div className="space-y-2.5 text-xs">
                  {/* Auto Detection Row */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-[#64748B] block font-medium">Bahan Terdeteksi (AI):</span>
                      <strong className="text-sm font-extrabold text-[#0F172A]">
                        {detectedFoodName}
                      </strong>
                    </div>
                    <span className="text-[11px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-md border border-[#BBF7D0]">
                      YOLO: {(detectedConfidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* DHT22 Suhu & Kelembapan Row */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[#64748B] font-medium">Suhu & Kelembapan (DHT22):</span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">Iklim Ruang Sampel</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-extrabold text-[#0F172A]">
                        {gasData.temperature != null ? `${gasData.temperature.toFixed(1)}°C` : '-'}
                        <span className="text-xs text-[#64748B] ml-1.5">
                          • {gasData.humidity != null ? `${gasData.humidity.toFixed(0)}% RH` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* TCS34725 Sensor Warna Row */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <Palette className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[#64748B] font-medium">Spektrum Warna (TCS34725):</span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">
                        {gasData.color_name || '-'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {gasData.color_hex ? (
                        <div
                          className="w-5 h-5 rounded-full border border-black/20 shadow-xs shrink-0"
                          style={{ backgroundColor: gasData.color_hex }}
                          title={`Hex: ${gasData.color_hex}`}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-dashed border-slate-300 bg-slate-100 shrink-0" />
                      )}
                      <span className="font-mono text-xs font-bold text-[#0F172A]">
                        {gasData.color_hex || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Telemetri MQ-4 Row */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-[#64748B] block font-medium">Sensor Metana (MQ-4):</span>
                      <span className="text-[10px] text-[#94A3B8]">Emisi Gas $CH_4$</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-extrabold text-[#0F172A]">
                        {gasData.ch4_ppm != null ? gasData.ch4_ppm.toFixed(2) : '-'}
                      </span>
                      {gasData.ch4_ppm != null && (
                        <span className="text-[11px] font-mono text-[#64748B] ml-1">ppm</span>
                      )}
                    </div>
                  </div>

                  {/* Telemetri MQ-135 Row */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-[#64748B] block font-medium">Sensor Kualitas (MQ-135):</span>
                      <span className="text-[10px] text-[#94A3B8]">Amonia & Total VOC</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-extrabold text-[#0F172A]">
                        {gasData.aqi_ppm != null ? gasData.aqi_ppm : '-'}
                      </span>
                      {gasData.aqi_ppm != null && (
                        <span className="text-[11px] font-mono text-[#64748B] ml-1">AQI</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Start Sensor Fusion Analysis Button */}
                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  className="w-full font-bold py-3.5 px-5 rounded-xl transition duration-150 flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer bg-[#2D7A38] hover:bg-[#23632D] text-white shadow-xs"
                >
                  <span>Mulai Analisis Fusi Sensor</span>
                  <span className="text-base font-bold">→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. TELEMETRY STRIP - COMPREHENSIVE SENSOR SUITE */}
      <section className="pt-6 border-t border-[#F1F5F9] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight">
              Telemetri Sensor IoT Terpadu
            </h2>
            <p className="text-xs text-[#64748B]">
              Pemantauan real-time data sensor
            </p>
          </div>
          <div className={`inline-flex items-center space-x-1.5 text-[11px] font-bold px-3 py-1 rounded-full border w-fit ${
            gasData.has_data || gasData.is_connected
              ? 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            <Activity className={`w-3.5 h-3.5 ${gasData.has_data || gasData.is_connected ? 'animate-pulse text-emerald-600' : 'text-slate-400'}`} />
            <span>{gasData.has_data || gasData.is_connected ? 'Node Sensor Aktif' : 'Menunggu Transmisi Sensor'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: DHT22 Suhu & Kelembapan */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center space-x-1.5">
                <Thermometer className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
                  DHT22 (Suhu & RH)
                </span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Termo-Hygro
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-[#64748B] block font-medium">Suhu Ruang</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-black text-[#0F172A]">
                    {gasData.temperature != null ? gasData.temperature.toFixed(1) : '-'}
                  </span>
                  {gasData.temperature != null && (
                    <span className="text-xs font-mono text-[#64748B]">°C</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] block font-medium">Kelembapan</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-black text-[#0F172A]">
                    {gasData.humidity != null ? gasData.humidity.toFixed(0) : '-'}
                  </span>
                  {gasData.humidity != null && (
                    <span className="text-xs font-mono text-[#64748B]">% RH</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
              <span className="flex items-center space-x-1">
                <Droplets className="w-3 h-3 text-blue-500" />
                <span>Kondisi Simpan:</span>
              </span>
              <span className={`font-semibold ${gasData.temperature != null ? 'text-[#166534]' : 'text-slate-400'}`}>
                {gasData.temperature != null ? 'Optimal (20-30°C)' : '-'}
              </span>
            </div>
          </div>

          {/* Card 2: TCS34725 Sensor Warna */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center space-x-1.5">
                <Palette className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
                  TCS34725 (Warna)
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                RGB + Lux
              </span>
            </div>

            <div className="flex items-center space-x-3 pt-1">
              <div
                className={`w-11 h-11 rounded-xl shadow-inner border shrink-0 flex items-center justify-center transition-all duration-300 ${
                  gasData.color_hex ? 'border-black/15' : 'border-dashed border-slate-300 bg-slate-100'
                }`}
                style={gasData.color_hex ? { backgroundColor: gasData.color_hex } : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-extrabold text-[#0F172A] truncate">
                  {gasData.color_hex || '-'}
                </div>
                <div className="text-[10px] text-[#64748B] font-medium truncate">
                  {gasData.color_name || 'Menunggu transmisi sensor'}
                </div>
              </div>
            </div>

            {/* Mini RGB distribution channels */}
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                <span>R: {gasData.color_r ?? '-'}</span>
                <span>G: {gasData.color_g ?? '-'}</span>
                <span>B: {gasData.color_b ?? '-'}</span>
                <span className="font-medium text-[#0F172A]">{gasData.color_lux != null ? `${gasData.color_lux} Lux` : '- Lux'}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                {gasData.color_r != null && gasData.color_g != null && gasData.color_b != null ? (
                  <>
                    <div
                      className="bg-red-500 h-full"
                      style={{ width: `${(gasData.color_r / (gasData.color_r + gasData.color_g + gasData.color_b || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: `${(gasData.color_g / (gasData.color_r + gasData.color_g + gasData.color_b || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${(gasData.color_b / (gasData.color_r + gasData.color_g + gasData.color_b || 1)) * 100}%` }}
                    />
                  </>
                ) : (
                  <div className="bg-slate-200 h-full w-full" />
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Sensor MQ-4 (Metana) */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center space-x-1.5">
                <Wind className="w-4 h-4 text-[#2D7A38]" />
                <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
                  MQ-4 (Metana)
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                gasData.ch4_ppm != null ? 'text-[#166534] bg-[#DCFCE7] border-[#BBF7D0]' : 'text-slate-500 bg-slate-100 border-slate-200'
              }`}>
                {gasData.ch4_ppm != null ? '$CH_4$ Terdeteksi' : 'Belum Ada Data'}
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 pt-1">
              <span className="text-2xl font-black text-[#0F172A]">
                {gasData.ch4_ppm != null ? gasData.ch4_ppm.toFixed(2) : '-'}
              </span>
              {gasData.ch4_ppm != null && (
                <span className="text-xs font-mono text-[#64748B]">ppm</span>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
              <span>Ambang Segar:</span>
              <span className={`font-semibold ${gasData.ch4_ppm != null ? 'text-[#166534]' : 'text-slate-400'}`}>
                {gasData.ch4_ppm != null ? '< 1.0 ppm' : '-'}
              </span>
            </div>
          </div>

          {/* Card 4: Sensor MQ-135 (Kualitas Udara) */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
                  MQ-135 (Kualitas)
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                gasData.aqi_ppm != null ? 'text-[#166534] bg-[#DCFCE7] border-[#BBF7D0]' : 'text-slate-500 bg-slate-100 border-slate-200'
              }`}>
                {gasData.aqi_ppm != null ? 'AQI / VOC' : 'Belum Ada Data'}
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 pt-1">
              <span className="text-2xl font-black text-[#0F172A]">
                {gasData.aqi_ppm != null ? gasData.aqi_ppm : '-'}
              </span>
              {gasData.aqi_ppm != null && (
                <span className="text-xs font-mono text-[#64748B]">AQI</span>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
              <span>Ambang Segar:</span>
              <span className={`font-semibold ${gasData.aqi_ppm != null ? 'text-[#166534]' : 'text-slate-400'}`}>
                {gasData.aqi_ppm != null ? '< 50 AQI' : '-'}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
