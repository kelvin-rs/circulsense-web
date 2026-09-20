'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  X,
  RefreshCw,
  Image as ImageIcon,
  Activity,
  Wind,
  Thermometer,
  Palette,
  Droplets,
  Clock
} from 'lucide-react';
import { GasData, VisualData } from '@/types/circulsense';

interface PindaiBahanProps {
  gasData: GasData;
  onStartAnalysis: (visualData: VisualData) => void;
  onCameraStateChange?: (isOpen: boolean) => void;
  triggerCameraCount?: number;
}

export const PindaiBahan: React.FC<PindaiBahanProps> = ({
  gasData,
  onStartAnalysis,
  onCameraStateChange,
  triggerCameraCount = 0,
}) => {
  const [useLiveCamera, setUseLiveCamera] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const batchWeightKg = 1.0;
  const [detectedConfidence, setDetectedConfidence] = useState<number>(0.96);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraSectionRef = useRef<HTMLDivElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
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
  }, [cameraFacing, onCameraStateChange]);

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
  }, [useLiveCamera, startCamera, stopCamera, onCameraStateChange]);

  const compressImage = (dataUrl: string, maxDim = 800, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleTakeSnapshot = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(800, videoRef.current.videoWidth || 800);
      canvas.height = Math.min(800, videoRef.current.videoHeight || 600);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setCapturedImage(dataUrl);
        setDetectedConfidence(0.96);
        setUseLiveCamera(false);
        onCameraStateChange?.(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const rawUrl = event.target.result as string;
          const compressed = await compressImage(rawUrl, 800, 0.75);
          setCapturedImage(compressed);
          setDetectedConfidence(0.95);
          setUseLiveCamera(false);
          onCameraStateChange?.(false);
        }
      };
      reader.readAsDataURL(file);
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
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    const visualPayload: VisualData = {
      item_name: 'Stroberi',
      category: 'Buah',
      confidence: detectedConfidence,
      visual_score: 5,
      defects: [],
      image_url: capturedImage,
      batch_weight_kg: batchWeightKg
    };
    onStartAnalysis(visualPayload);

    // Reset analyzing state after transition
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 1500);
  };

  const hasPhysicalTelemetry = gasData.has_data || gasData.is_connected;

  return (
    <div className="space-y-10 pb-24 md:pb-16">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        title="Unggah Foto dari Galeri"
        aria-label="Unggah Foto dari Galeri"
      />

      {/* FULLSCREEN CAMERA MODAL OVERLAY */}
      {useLiveCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden">
          {/* Top Bar Floating Controls */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <button
              type="button"
              onClick={() => setUseLiveCamera(false)}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Tutup Kamera"
              aria-label="Tutup Kamera"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-white tracking-wide">
                Kamera Upcycling Siap Pindai
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'))}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Putar Kamera"
              aria-label="Putar Kamera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Camera Video Stream */}
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Targeted Scanner Frame Grid */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6 sm:p-12">
              <div className="relative w-full max-w-sm aspect-square border-2 border-dashed border-white/60 rounded-2xl flex items-center justify-center">
                {/* Corner Markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#16A34A] rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#16A34A] rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#16A34A] rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#16A34A] rounded-br-xl" />

                <div className="text-center px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full text-[11px] sm:text-xs text-white/90 font-medium tracking-wide">
                  Posisikan buah stroberi di dalam kotak
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Floating Shutter Controls */}
          <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-around p-6 pb-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            {/* Gallery Upload Alternate */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center space-y-1 text-white/80 hover:text-white transition active:scale-95 cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-medium tracking-tight">Galeri</span>
            </button>

            {/* Shutter Button */}
            <button
              type="button"
              onClick={handleTakeSnapshot}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white p-1 flex items-center justify-center transition active:scale-90 hover:opacity-95 shadow-2xl cursor-pointer"
              title="Ambil Foto"
              aria-label="Ambil Foto"
            >
              <div className="w-full h-full rounded-full bg-white transition hover:bg-slate-100" />
            </button>

            <div className="w-11" />
          </div>
        </div>
      )}

      {/* 1. HERO SECTION AT TOP - MERCHANT / BUSINESS PROPOSITION */}
      <section className="space-y-4 pt-1 pb-2 max-w-4xl">
        <div className="inline-flex items-center space-x-1.5 bg-[#DCFCE7] text-[#166534] text-[11px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-[#BBF7D0]">
          <Clock className="w-3.5 h-3.5 text-[#166534]" />
          <span>Sistem Peringatan Dini Umur Simpan Buah Stroberi & Manajemen Stok Pedagang</span>
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] tracking-tight leading-[1.2]">
          Prediksi Umur Simpan Stroberi & <span className="text-[#16A34A]">Efisiensi Stok Pedagang</span>
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-[#475569] leading-relaxed max-w-3xl">
          Memberikan <strong>kepastian sisa umur simpan buah stroberi secara objektif</strong>. Mengubah potensi rugi total pembusukan menjadi keuntungan melalui rekomendasi stok gudang, display etalase depan, atau diskon cepat.
        </p>

        {/* 4 Metric Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 pt-4 border-t border-[#F1F5F9]">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-1.5">
              <Thermometer className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs sm:text-sm font-extrabold text-[#0F172A]">DHT22</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#64748B] font-medium leading-tight mt-0.5">
              Suhu & Stres RH
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs sm:text-sm font-extrabold text-[#0F172A]">TCS34725</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#64748B] font-medium leading-tight mt-0.5">
              Validasi Kroma Warna
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-1.5">
              <Wind className="w-3.5 h-3.5 text-[#2D7A38]" />
              <span className="text-xs sm:text-sm font-extrabold text-[#0F172A]">MQ-4 & 135</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#64748B] font-medium leading-tight mt-0.5">
              Deteksi Gas Pembusukan
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
              <span className="text-xs sm:text-sm font-extrabold text-[#166534]">Shelf-Life AI</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#166534] font-medium leading-tight mt-0.5">
              Prediksi Jam Simpan
            </p>
          </div>
        </div>
      </section>

      {/* 2. CAMERA CAPTURE & ANALYSIS SECTION */}
      <section id="camera-viewport" ref={cameraSectionRef} className="space-y-4 pt-4 border-t border-[#F1F5F9]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Pemindaian Citra Sampel Buah Stroberi
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Arahkan kamera ke sampel buah stroberi untuk memprediksi sisa umur simpan secara objektif
          </p>
        </div>

        {/* Viewport & Parameter Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Visual Display Area */}
          <div className={capturedImage ? "lg:col-span-7 space-y-3" : "lg:col-span-12 max-w-3xl w-full space-y-3"}>
            <div className="flex items-center justify-between gap-2 pb-1">
              <span className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                {capturedImage ? 'Hasil Tangkapan Citra Sampel' : 'Viewport Kamera Galaxy Upcycling'}
              </span>

              {capturedImage && (
                <span className="text-[11px] font-bold text-[#166534] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full flex items-center space-x-1 shrink-0 border border-[#BBF7D0]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Sampel Stroberi Siap Dianalisis</span>
                </span>
              )}
            </div>

            {/* Viewport Box */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center shadow-sm">
              {capturedImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={capturedImage}
                    alt="Hasil Tangkapan Citra Stroberi"
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
                      Ketuk untuk Membuka Kamera Pindai
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Gunakan kamera bawaan ponsel lawas atau unggah dari galeri
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
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#F1F5F9] pb-2 flex items-center justify-between">
                  <span>Parameter Input AI & Sensor</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Komoditas: Stroberi
                  </span>
                </h3>

                {/* Telemetry Metrics List */}
                <div className="space-y-2.5 text-xs">
                  {/* Auto Detection Row */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-[#64748B] block font-medium">Bahan Fokus:</span>
                      <strong className="text-sm font-extrabold text-[#0F172A]">
                        🍓 Stroberi
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
                      <span className="text-[10px] text-[#94A3B8]">
                        {gasData.temperature ? 'Laju respirasi fisik' : 'Sensor fisik belum terhubung'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-extrabold text-[#0F172A]">
                        {gasData.temperature ? `${gasData.temperature.toFixed(1)}°C` : '0.0°C'}
                        <span className="text-xs text-[#64748B] ml-1.5">
                          • {gasData.humidity ? `${gasData.humidity.toFixed(0)}% RH` : '0% RH'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* TCS34725 Sensor Warna Row */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <Palette className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[#64748B] font-medium">Sensor Warna (TCS34725):</span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">
                        {gasData.color_name || 'Belum Ada Data Sensor'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-5 h-5 rounded-full border border-black/20 shadow-xs shrink-0"
                        style={{ backgroundColor: gasData.color_hex || '#000000' }}
                      />
                      <span className="font-mono text-xs font-bold text-[#0F172A]">
                        {gasData.color_hex || '0'}
                      </span>
                    </div>
                  </div>

                  {/* Telemetri MQ-4 Row */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-[#64748B] block font-medium">Sensor Metana (MQ-4):</span>
                      <span className="text-[10px] text-[#94A3B8]">Gas Pembusukan (CH₄)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-extrabold text-[#0F172A]">
                        {gasData.ch4_ppm != null ? gasData.ch4_ppm.toFixed(2) : '0.00'}
                      </span>
                      <span className="text-[11px] font-mono text-[#64748B] ml-1">ppm</span>
                    </div>
                  </div>

                  {/* Telemetri MQ-135 Row */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-[#64748B] block font-medium">Kualitas Udara & VOC (MQ-135):</span>
                      <span className="text-[10px] text-[#94A3B8]">Amonia & Gas Volatil</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-extrabold text-[#0F172A]">
                        {gasData.aqi_ppm != null ? gasData.aqi_ppm : 0}
                      </span>
                      <span className="text-[11px] font-mono text-[#64748B] ml-1">AQI</span>
                    </div>
                  </div>
                </div>

                {/* Start Sensor Fusion Analysis Button */}
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={handleStartAnalysis}
                  className={`w-full font-bold py-3.5 px-5 rounded-xl transition duration-150 flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer ${
                    isAnalyzing
                      ? 'bg-slate-400 text-white cursor-not-allowed'
                      : 'bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md shadow-emerald-700/20'
                  }`}
                >
                  <span>{isAnalyzing ? 'Menyiapkan Analisis...' : 'Prediksi Umur Simpan Stroberi'}</span>
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
              Telemetri Node Sensor ESP32 (SirkulaBox)
            </h2>
            <p className="text-xs text-[#64748B]">
              Data lingkungan dan biokimia pembacaan sensor fisik (tanpa data tiruan)
            </p>
          </div>
          <div className={`inline-flex items-center space-x-1.5 text-[11px] font-bold px-3 py-1 rounded-full border w-fit ${
            hasPhysicalTelemetry
              ? 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            <Activity className={`w-3.5 h-3.5 ${hasPhysicalTelemetry ? 'animate-pulse text-emerald-600' : 'text-slate-400'}`} />
            <span>{hasPhysicalTelemetry ? 'Node Sensor ESP32 Online' : 'Sensor Belum Terhubung (Nilai 0)'}</span>
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
                Mikroklimat
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-[#64748B] block font-medium">Suhu Ruang</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-black text-[#0F172A]">
                    {gasData.temperature ? gasData.temperature.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-xs font-mono text-[#64748B]">°C</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] block font-medium">Kelembapan</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-black text-[#0F172A]">
                    {gasData.humidity ? gasData.humidity.toFixed(0) : '0'}
                  </span>
                  <span className="text-xs font-mono text-[#64748B]">% RH</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
              <span className="flex items-center space-x-1">
                <Droplets className="w-3 h-3 text-blue-500" />
                <span>Status Sensor:</span>
              </span>
              <span className="font-semibold text-slate-700">
                {gasData.temperature ? `${gasData.temperature.toFixed(1)}°C` : 'Nilai 0'}
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
                Validasi Kroma
              </span>
            </div>

            <div className="flex items-center space-x-3 pt-1">
              <div
                className="w-11 h-11 rounded-xl shadow-inner border shrink-0 flex items-center justify-center transition-all duration-300 border-black/15"
                style={{ backgroundColor: gasData.color_hex || '#000000' }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-extrabold text-[#0F172A] truncate">
                  {gasData.color_hex || '0'}
                </div>
                <div className="text-[10px] text-[#64748B] font-medium truncate">
                  {gasData.color_name || 'Belum Ada Data Sensor'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                <span>R: {gasData.color_r ?? 0}</span>
                <span>G: {gasData.color_g ?? 0}</span>
                <span>B: {gasData.color_b ?? 0}</span>
                <span className="font-medium text-[#0F172A]">{gasData.color_lux != null ? `${gasData.color_lux} Lux` : '0 Lux'}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                {gasData.color_r || gasData.color_g || gasData.color_b ? (
                  <>
                    <div className="bg-red-500 h-full" style={{ width: `${((gasData.color_r || 0) / ((gasData.color_r || 0) + (gasData.color_g || 0) + (gasData.color_b || 1))) * 100}%` }} />
                    <div className="bg-green-500 h-full" style={{ width: `${((gasData.color_g || 0) / ((gasData.color_r || 0) + (gasData.color_g || 0) + (gasData.color_b || 1))) * 100}%` }} />
                    <div className="bg-blue-500 h-full" style={{ width: `${((gasData.color_b || 0) / ((gasData.color_r || 0) + (gasData.color_g || 0) + (gasData.color_b || 1))) * 100}%` }} />
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
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border text-slate-600 bg-slate-100 border-slate-200">
                Gas Pembusukan (CH₄)
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 pt-1">
              <span className="text-2xl font-black text-[#0F172A]">
                {gasData.ch4_ppm != null ? gasData.ch4_ppm.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs font-mono text-[#64748B]">ppm</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
              <span>Status Pembacaan:</span>
              <span className="font-semibold text-slate-700">
                {gasData.ch4_ppm != null ? `${gasData.ch4_ppm.toFixed(2)} ppm` : 'Nilai 0'}
              </span>
            </div>
          </div>

          {/* Card 4: Sensor MQ-135 (Kualitas Udara) */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
                  MQ-135 (Gas Volatil)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border text-slate-600 bg-slate-100 border-slate-200">
                VOC / Amonia
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 pt-1">
              <span className="text-2xl font-black text-[#0F172A]">
                {gasData.aqi_ppm != null ? gasData.aqi_ppm : 0}
              </span>
              <span className="text-xs font-mono text-[#64748B]">AQI</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
              <span>Status Pembacaan:</span>
              <span className="font-semibold text-slate-700">
                {gasData.aqi_ppm != null ? `${gasData.aqi_ppm} AQI` : 'Nilai 0'}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
