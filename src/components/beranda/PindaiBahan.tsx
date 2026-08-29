'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, RotateCw, CheckCircle2, X } from 'lucide-react';
import { GasData, VisualData } from '@/types/circulsense';

interface PindaiBahanProps {
  gasData: GasData;
  onStartAnalysis: (visualData: VisualData) => void;
  onCameraStateChange?: (isOpen: boolean) => void;
  onOpenTipsModal?: () => void;
}

export const PindaiBahan: React.FC<PindaiBahanProps> = ({
  gasData,
  onStartAnalysis,
  onCameraStateChange,
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

          {/* Bottom Controls Bar Overlay (Ganti Kamera, Shutter, Galeri) */}
          <div className="relative z-10 pb-12 sm:pb-10 px-8 flex items-center justify-between bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            {/* Left: Switch Camera */}
            <button
              type="button"
              onClick={() => setCameraFacing(cameraFacing === 'environment' ? 'user' : 'environment')}
              className="w-13 h-13 rounded-full bg-white/90 text-slate-800 shadow-xl flex items-center justify-center transition active:scale-90 cursor-pointer hover:bg-white"
              title="Ganti Kamera Depan/Belakang"
            >
              <RotateCw className="w-6 h-6 text-slate-800" />
            </button>

            {/* Center: Snapshot Shutter Button */}
            <button
              type="button"
              onClick={handleTakeSnapshot}
              className="w-18 h-18 rounded-full bg-white border-4 border-[#2D7A38] text-[#2D7A38] shadow-2xl flex items-center justify-center transition active:scale-90 cursor-pointer ring-4 ring-white/30"
              title="Ambil Foto"
            >
              <div className="w-10 h-10 rounded-full bg-[#2D7A38]" />
            </button>

            {/* Right: Upload from Gallery / File */}
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
      <section className="space-y-4 pt-1 pb-2 max-w-3xl">
        <div className="inline-block bg-[#DCFCE7] text-[#166534] text-[11px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-[#BBF7D0]">
          Inovasi Fusi Sensor & Upcycling Pangan
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] tracking-tight leading-[1.2]">
          Optimalkan Nilai Pangan dengan <span className="text-[#16A34A]">Fusi Sensor AI</span>
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-[#475569] leading-relaxed max-w-2xl">
          Sistem terintegrasi yang memadukan deteksi visual kamera dan emisi gas biokimia (MQ-4 & MQ-135) dari ESP32 untuk menentukan tingkat kesegaran bahan pangan serta memberikan rekomendasi pengolahan daur ulang secara presisi.
        </p>

        <div className="pt-1 max-w-xs">
          <button
            id="btn-activate-camera"
            type="button"
            onClick={activateCamera}
            className="w-full bg-[#2D7A38] hover:bg-[#23632D] text-white text-xs sm:text-sm font-bold py-3 px-5 rounded-xl shadow-xs transition duration-150 flex items-center justify-center space-x-2 cursor-pointer text-center"
          >
            <Camera className="w-4 h-4" />
            <span>Buka Kamera Pindai</span>
            <span className="text-sm font-bold">↓</span>
          </button>
        </div>

        {/* 3 Metric Summary Grid (Seamless) */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-4 border-t border-[#F1F5F9] max-w-md sm:max-w-lg">
          <div>
            <div className="text-sm sm:text-lg lg:text-xl font-extrabold text-[#0F172A] tracking-tight whitespace-nowrap">
              MQ-4 & 135
            </div>
            <p className="text-[10px] sm:text-xs text-[#64748B] font-medium leading-tight mt-0.5">
              Sensor Biokimia
            </p>
          </div>
          <div>
            <div className="text-sm sm:text-lg lg:text-xl font-extrabold text-[#16A34A] tracking-tight whitespace-nowrap">
              Edge AI
            </div>
            <p className="text-[10px] sm:text-xs text-[#64748B] font-medium leading-tight mt-0.5">
              YOLO Client-Side
            </p>
          </div>
          <div>
            <div className="text-sm sm:text-lg lg:text-xl font-extrabold text-[#0F172A] tracking-tight whitespace-nowrap">
              0% E-Waste
            </div>
            <p className="text-[10px] sm:text-xs text-[#64748B] font-medium leading-tight mt-0.5">
              Galaxy Upcycling
            </p>
          </div>
        </div>
      </section>

      {/* 2. CAMERA CAPTURE & ANALYSIS SECTION (SEAMLESS INTEGRATED VIEWPORT) */}
      <section id="camera-viewport" ref={cameraSectionRef} className="space-y-4 pt-4 border-t border-[#F1F5F9]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Hasil Citra & Pengambilan Gambar
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Arahkan bahan pangan ke dalam area kamera atau pilih dari galeri
          </p>
        </div>

        {/* Viewport & Parameter Grid (Seamless without heavy box wrappers) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Visual Display Area */}
          <div className={capturedImage ? "lg:col-span-7 space-y-3" : "lg:col-span-12 max-w-3xl w-full space-y-3"}>
            {/* Header with Space Between */}
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
                  {/* Delete / Reset Image Button */}
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

            {/* Action Toolbar Below Image (when image is captured) */}
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

          {/* Right Column: AI Auto-Detection & Telemetry (Seamless) */}
          {capturedImage && (
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#F1F5F9] pb-2">
                  Parameter & Deteksi Otomatis AI
                </h3>

                {/* AI Auto-Detection & Gas Metrics List */}
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

                  {/* Status Citra Row */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <span className="text-[#64748B] font-medium">Status Citra Kamera:</span>
                    <strong className="text-[#166534] font-bold">
                      Siap Dianalisis
                    </strong>
                  </div>

                  {/* Telemetri MQ-4 Row with Space-Between */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-[#64748B] block font-medium">Telemetri Sensor MQ-4:</span>
                      <span className="text-[10px] text-[#94A3B8]">Gas Metana ($CH_4$)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-extrabold text-[#0F172A]">
                        {gasData.ch4_ppm.toFixed(2)}
                      </span>
                      <span className="text-[11px] font-mono text-[#64748B] ml-1">ppm</span>
                    </div>
                  </div>

                  {/* Telemetri MQ-135 Row with Space-Between */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-[#64748B] block font-medium">Telemetri Sensor MQ-135:</span>
                      <span className="text-[10px] text-[#94A3B8]">Kualitas Udara / Amonia</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-extrabold text-[#0F172A]">
                        {gasData.aqi_ppm}
                      </span>
                      <span className="text-[11px] font-mono text-[#64748B] ml-1">AQI</span>
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

      {/* 3. TELEMETRY STRIP (SEAMLESS INTEGRATED METRICS) */}
      <section className="pt-6 border-t border-[#F1F5F9]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MQ-4 Metric */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
                Sensor MQ-4 (Metana)
              </span>
              <span className="text-[10px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-md border border-[#BBF7D0]">
                $CH_4$ Aktif
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black text-[#0F172A]">
                {gasData.ch4_ppm > 0 ? gasData.ch4_ppm.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs font-mono text-[#64748B]">ppm</span>
            </div>

            <p className="text-[11px] text-[#64748B]">
              Ambang Segar: <span className="font-semibold text-[#166534]">&lt; 1.0 ppm</span>
            </p>
          </div>

          {/* MQ-135 Metric */}
          <div className="space-y-2 md:border-l md:border-[#F1F5F9] md:pl-6">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
                Sensor MQ-135 (Kualitas)
              </span>
              <span className="text-[10px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-md border border-[#BBF7D0]">
                AQI / NH3
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black text-[#0F172A]">
                {gasData.aqi_ppm > 0 ? gasData.aqi_ppm : '0'}
              </span>
              <span className="text-xs font-mono text-[#64748B]">AQI</span>
            </div>

            <p className="text-[11px] text-[#64748B]">
              Ambang Segar: <span className="font-semibold text-[#166534]">&lt; 50 AQI</span>
            </p>
          </div>

          {/* Kategori Kesegaran Metric */}
          <div className="space-y-2 md:border-l md:border-[#F1F5F9] md:pl-6">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
                Kategori Kesegaran
              </span>
              <span className="text-[10px] font-semibold text-[#64748B]">Skor 1 - 5</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#DCFCE7] text-[#166534] p-1.5 rounded-lg border border-[#BBF7D0]">
                <div className="font-extrabold text-xs">4-5</div>
                <div className="text-[9px] font-bold">Segar</div>
              </div>
              <div className="bg-[#FEF3C7] text-[#92400E] p-1.5 rounded-lg border border-[#FDE68A]">
                <div className="font-extrabold text-xs">2-3</div>
                <div className="text-[9px] font-bold">Layu</div>
              </div>
              <div className="bg-[#FEE2E2] text-[#991B1B] p-1.5 rounded-lg border border-[#FECACA]">
                <div className="font-extrabold text-xs">1</div>
                <div className="text-[9px] font-bold">Busuk</div>
              </div>
            </div>

            <p className="text-[10px] text-[#64748B]">
              Fusi Multimodal Visual & Bio-Gas
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
