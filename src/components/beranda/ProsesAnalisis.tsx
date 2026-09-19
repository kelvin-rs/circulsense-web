'use client';

import React, { useState, useEffect } from 'react';
import { GasData, VisualData } from '@/types/circulsense';

interface ProsesAnalisisProps {
  gasData: GasData;
  visualData: VisualData;
  onCancel: () => void;
  onComplete: () => void;
}

interface StepItem {
  id: number;
  label: string;
  sublabel?: string;
}

export const ProsesAnalisis: React.FC<ProsesAnalisisProps> = ({
  gasData,
  visualData,
  onCancel,
  onComplete
}) => {
  const STEPS: StepItem[] = [
    { id: 1, label: 'Ekstraksi Visual & Indikator Kematangan Internal (YOLO AI)', sublabel: 'Analisis morfologi dan tekstur buah Stroberi' },
    { id: 2, label: 'Validasi Kroma Spektral Sensor Fisik (TCS34725)', sublabel: gasData?.color_hex ? `Koreksi iluminasi via kroma (${gasData.color_hex})` : 'Sensor kroma belum aktif (Nilai 0)' },
    { id: 3, label: 'Analisis Stres Termal & Kelembapan (DHT22)', sublabel: gasData?.temperature ? `Suhu ${gasData.temperature.toFixed(1)}°C, RH ${gasData.humidity ? gasData.humidity.toFixed(0) : '0'}%` : 'Sensor DHT22 belum aktif (Nilai 0°C)' },
    { id: 4, label: 'Deteksi Emisi Gas Dini Dekomposisi (MQ-4 & MQ-135)', sublabel: gasData?.ch4_ppm ? `CH4 ${gasData.ch4_ppm.toFixed(2)} ppm • AQI ${gasData.aqi_ppm ?? 0}` : 'Sensor MQ belum aktif (Nilai 0 ppm)' },
    { id: 5, label: 'Prediksi Sisa Umur Simpan (Shelf-Life Engine)', sublabel: 'Estimasi hitungan jam & hari simpan objektif' },
    { id: 6, label: 'Rekomendasi Aksi Inventaris & Strategi Penjualan Pedagang', sublabel: 'Penentuan etalase depan, stok gudang, atau diskon cepat' }
  ];

  const [progress, setProgress] = useState<number>(10);
  const currentStepIndex = Math.min(Math.floor((progress / 100) * STEPS.length), STEPS.length - 1);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 300);
          return 100;
        }
        const next = prev + 18;
        return next > 100 ? 100 : next;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 pt-4">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Proses Analisis Fusi Sensor</h2>
          <p className="text-xs text-[#64748B]">Sedang memproses data visual dan telemetri gas</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 transition cursor-pointer"
        >
          Batalkan
        </button>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#E2E8F0] shadow-xs flex flex-col items-center justify-center">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 130 130">
            <circle
              cx="65"
              cy="65"
              r={radius}
              className="text-slate-100"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="65"
              cy="65"
              r={radius}
              className="text-[#2D7A38] transition-all duration-300 ease-out"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {progress}%
            </span>
            <span className="text-[11px] font-semibold text-[#2D7A38] uppercase tracking-wider">
              {progress === 100 ? 'Selesai' : 'Komputasi'}
            </span>
          </div>
        </div>

        <p className="text-sm font-semibold text-[#334155] mt-4">
          Menganalisis sampel: <strong className="text-[#0F172A]">{visualData.item_name}</strong>
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
          Tahapan Algoritma Fusi
        </h3>

        <div className="space-y-2">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex || progress === 100;
            const isCurrent = idx === currentStepIndex && progress < 100;

            return (
              <div
                key={step.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  isCurrent
                    ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                    : isCompleted
                    ? 'bg-slate-50 border-[#E2E8F0]'
                    : 'opacity-40 border-transparent'
                }`}
              >
                <div>
                  <p
                    className={`text-xs font-bold ${
                      isCurrent
                        ? 'text-[#166534]'
                        : isCompleted
                        ? 'text-[#0F172A]'
                        : 'text-[#94A3B8]'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.sublabel && (
                    <span className="text-[11px] text-[#64748B] block mt-0.5 font-medium">
                      {step.sublabel}
                    </span>
                  )}
                </div>

                {isCompleted && (
                  <span className="text-[10px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                    Selesai
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
