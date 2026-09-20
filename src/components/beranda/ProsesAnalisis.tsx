'use client';

import React, { useState, useEffect } from 'react';
import { GasData, VisualData } from '@/types/circulsense';
import { Eye, Thermometer, Wind, Clock, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ProsesAnalisisProps {
  gasData: GasData;
  visualData: VisualData;
  onCancel: () => void;
  onComplete: () => void;
}

interface StepItem {
  id: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

export const ProsesAnalisis: React.FC<ProsesAnalisisProps> = ({
  gasData,
  visualData,
  onCancel,
  onComplete
}) => {
  const STEPS: StepItem[] = [
    {
      id: 1,
      label: 'Pemeriksaan Visual & Kematangan Buah',
      sublabel: 'Menganalisis keseragaman pigmen merah dan keutuhan bentuk stroberi',
      icon: <Eye className="w-4 h-4 text-emerald-600" />
    },
    {
      id: 2,
      label: 'Pemeriksaan Suhu & Kelembaban Ruang',
      sublabel: gasData?.temperature 
        ? `Suhu terdeteksi ${gasData.temperature.toFixed(1)}°C dengan kelembaban optimal` 
        : 'Mengecek kestabilan iklim mikro kotak penyimpanan',
      icon: <Thermometer className="w-4 h-4 text-blue-600" />
    },
    {
      id: 3,
      label: 'Pemeriksaan Kualitas Udara & Aroma Buah',
      sublabel: 'Memastikan udara segar dan bebas dari emisi gas dekomposisi',
      icon: <Wind className="w-4 h-4 text-cyan-600" />
    },
    {
      id: 4,
      label: 'Kalkulasi Mutu & Sisa Masa Simpan',
      sublabel: 'Menghitung waktu konsumsi terbaik dan rekomendasi penyimpanan',
      icon: <Clock className="w-4 h-4 text-amber-600" />
    }
  ];

  const [progress, setProgress] = useState<number>(12);
  const currentStepIndex = Math.min(Math.floor((progress / 100) * STEPS.length), STEPS.length - 1);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;
  const hasTriggeredRef = React.useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (!hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            setTimeout(() => {
              onCompleteRef.current();
            }, 300);
          }
          return 100;
        }
        const next = prev + 16;
        if (next >= 100) {
          clearInterval(interval);
          if (!hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            setTimeout(() => {
              onCompleteRef.current();
            }, 300);
          }
          return 100;
        }
        return next;
      });
    }, 450);

    return () => clearInterval(interval);
  }, []);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 pt-4 animate-in fade-in duration-300">
      {/* Top Card */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="inline-flex items-center space-x-1.5 text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            <span>Pemeriksaan Sedang Berlangsung</span>
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1.5">
            Pemeriksaan Kualitas & Kesegaran Buah
          </h2>
          <p className="text-xs text-slate-500">
            Menganalisis sampel stroberi dan kondisi kotak penyimpanan
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
        >
          Batalkan
        </button>
      </div>

      {/* Circular Progress & Animated Graphic */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center relative overflow-hidden">
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
              className="text-emerald-600 transition-all duration-300 ease-out"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {progress}%
            </span>
            <span className="text-[11px] font-bold text-emerald-700 tracking-wider">
              {progress === 100 ? 'Selesai' : 'Menganalisis'}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <div className="text-sm font-extrabold text-slate-900">
            Sampel Buah: {visualData.item_name || 'Stroberi'}
          </div>
          <p className="text-xs text-slate-500 max-w-sm">
            Hasil klasifikasi mutu dan rekomendasi penyimpanan siap disajikan sesaat lagi.
          </p>
        </div>
      </div>

      {/* Human-Friendly Inspection Steps */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
          Tahapan Pemeriksaan Sampel
        </h3>

        <div className="space-y-2.5">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex || progress === 100;
            const isCurrent = idx === currentStepIndex && progress < 100;

            return (
              <div
                key={step.id}
                className={`flex items-start justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                  isCurrent
                    ? 'bg-emerald-50/80 border-emerald-300 shadow-xs ring-1 ring-emerald-200'
                    : isCompleted
                    ? 'bg-slate-50 border-slate-200 opacity-90'
                    : 'bg-white border-slate-100 opacity-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0 mt-0.5">
                    {step.icon}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      {step.label}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {step.sublabel}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {isCompleted ? (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Selesai</span>
                    </span>
                  ) : isCurrent ? (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 animate-pulse px-2 py-0.5 rounded-md">
                      <span>Memeriksa...</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400">
                      Menunggu
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
