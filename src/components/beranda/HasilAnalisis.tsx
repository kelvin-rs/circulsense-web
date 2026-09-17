'use client';

import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  ArrowLeft,
  Coins,
  Scale,
  ShieldCheck,
  Store,
  Tag,
  Palette,
  Thermometer,
  Wind,
  Activity,
  Flame,
  Leaf,
  Zap
} from 'lucide-react';
import { FusionResult, UpcyclingRecommendation } from '@/types/circulsense';
import { RECIPE_CATALOG } from '@/lib/sensor-fusion';

interface HasilAnalisisProps {
  result: FusionResult;
  onBack: () => void;
  onOpenRecipeModal: (recommendation: UpcyclingRecommendation) => void;
}

export const HasilAnalisis: React.FC<HasilAnalisisProps> = ({
  result,
  onBack,
  onOpenRecipeModal
}) => {
  const [selectedTab, setSelectedTab] = useState<'Pengolahan UMKM' | 'Resep Masakan' | 'Kompos' | 'Eco Enzyme'>(
    result.recommendation.type as any
  );

  const itemCatalog = RECIPE_CATALOG[result.item_name] || RECIPE_CATALOG['Stroberi'];

  let currentRec: UpcyclingRecommendation = result.recommendation;
  if (selectedTab === 'Pengolahan UMKM' || selectedTab === 'Resep Masakan') {
    currentRec = result.status === 'Segar' ? itemCatalog.segar : itemCatalog.layu;
  } else if (selectedTab === 'Kompos') {
    currentRec = itemCatalog.busuk;
  } else {
    currentRec = itemCatalog.busuk;
  }

  const shelfLife = result.shelf_life;
  const hoursLeft = shelfLife.hours_remaining;
  const daysLeft = shelfLife.days_remaining;

  const getUrgencyBadge = () => {
    switch (shelfLife.urgency_level) {
      case 'Aman':
        return {
          bg: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
          indicator: 'bg-emerald-500',
          title: 'Stok Tahan Lama (Aman)',
          gaugePos: '15%'
        };
      case 'Perhatian':
        return {
          bg: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
          indicator: 'bg-amber-500',
          title: 'Siap Jual Ritel (Perhatian)',
          gaugePos: '45%'
        };
      case 'Kritis':
        return {
          bg: 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]',
          indicator: 'bg-orange-500',
          title: 'Fase Kritis (Aksi Cepat)',
          gaugePos: '75%'
        };
      case 'Kedaluwarsa':
      default:
        return {
          bg: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
          indicator: 'bg-red-500',
          title: 'Kedaluwarsa / Rusak',
          gaugePos: '95%'
        };
    }
  };

  const urgency = getUrgencyBadge();

  return (
    <div className="space-y-6 pb-16 pt-2">
      {/* 1. TOP HEADER & BACK NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Sistem Peringatan Dini Pedagang
            </span>
            {result.is_live_ml ? (
              <span className="inline-flex items-center space-x-1 text-xs font-extrabold uppercase tracking-wider text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200 shadow-xs">
                <Zap className="w-3.5 h-3.5 text-violet-600 fill-violet-600" />
                <span>Model ML Terverifikasi (YOLOv8 + Early Fusion)</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-xs font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-xs" title="Worker AI di terminal lokal belum terdeteksi. Hasil ditampilkan berdasarkan estimasi sensor lokal.">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Estimasi Fusi Heuristik (Worker Offline)</span>
              </span>
            )}
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Pindai: {result.scan_time}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-1 leading-tight">
            Hasil Estimasi Umur Simpan & Keputusan Stok
          </h2>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#166534] bg-[#DCFCE7] hover:bg-[#BBF7D0] px-4 py-2.5 rounded-xl transition cursor-pointer self-start sm:self-auto border border-[#BBF7D0]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Pindai Sampel Lain</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            LEFT COLUMN: SHELF-LIFE DISPLAY & SENSOR VALIDATIONS
        ======================================================== */}
        <div className="lg:col-span-6 space-y-6">
          {/* Main Shelf-Life Hero Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  <img
                    src={result.image_url}
                    alt={result.item_name}
                    className="w-full h-full object-cover"
                  />
                  {result.detection_bbox && result.detection_bbox.length === 4 && (
                    <div
                      className="absolute border-2 border-emerald-400 bg-emerald-500/20 rounded pointer-events-none"
                      style={{
                        left: `${Math.max(0, (result.detection_bbox[0] - result.detection_bbox[2] / 2) * 100)}%`,
                        top: `${Math.max(0, (result.detection_bbox[1] - result.detection_bbox[3] / 2) * 100)}%`,
                        width: `${Math.min(100, result.detection_bbox[2] * 100)}%`,
                        height: `${Math.min(100, result.detection_bbox[3] * 100)}%`,
                      }}
                      title="YOLOv8 Deteksi Bounding Box"
                    />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Komoditas Teruji:
                  </span>
                  <h3 className="text-2xl font-black text-[#0F172A] leading-tight">
                    {result.item_name}
                  </h3>
                  <div className="mt-1.5 flex items-center space-x-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${urgency.bg}`}>
                      {urgency.title}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      Batch: {result.saved_weight_kg} kg
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* COUNTDOWN ESTIMASI SISA UMUR SIMPAN */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden">
              <div className="absolute right-3 top-3 opacity-10">
                <Clock className="w-24 h-24 text-white" />
              </div>

              <div className="relative z-10 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Estimasi Sisa Umur Simpan (Shelf-Life):</span>
                </span>

                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                    {hoursLeft > 0 ? `${hoursLeft} Jam` : '0 Jam'}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-slate-300">
                    ({daysLeft} Hari)
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                  {result.status_summary}
                </p>
              </div>

              {/* Visual Life-Gauge Bar */}
              <div className="pt-4 border-t border-white/10 mt-3 space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span className="text-emerald-400">5-7 Hari (Gudang)</span>
                  <span className="text-amber-300">2-4 Hari (Etalase Depan)</span>
                  <span className="text-red-400">&lt; 24 Jam (Jual Cepat)</span>
                </div>
                <div className="relative w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      hoursLeft >= 72
                        ? 'bg-emerald-500'
                        : hoursLeft >= 36
                        ? 'bg-amber-400'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, (hoursLeft / 120) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2 Critical Micro-Indicators: Ripeness & Disease */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Ripeness Phase */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 block uppercase">
                  Fase Kematangan Internal:
                </span>
                <strong className="text-sm font-extrabold text-[#0F172A] mt-0.5 block">
                  {shelfLife.ripeness_stage}
                </strong>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {shelfLife.time_to_mature_hours && shelfLife.time_to_mature_hours > 0
                    ? `Perlu ~${shelfLife.time_to_mature_hours} jam menuju matang optimal`
                    : 'Siap jual / konsumsi langsung'}
                </span>
              </div>

              {/* Disease Detection */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  shelfLife.disease_detected.toLowerCase().includes('gray') ||
                  shelfLife.disease_detected.toLowerCase().includes('mold') ||
                  shelfLife.disease_detected.toLowerCase().includes('busuk')
                    ? 'bg-red-50/70 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-[11px] font-bold text-slate-500 block uppercase">
                  Deteksi Penyakit / Cacat:
                </span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  {shelfLife.disease_detected.includes('Normal') ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : shelfLife.disease_detected.toLowerCase().includes('gray') ||
                    shelfLife.disease_detected.toLowerCase().includes('mold') ||
                    shelfLife.disease_detected.toLowerCase().includes('busuk') ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <strong
                    className={`text-sm font-extrabold truncate ${
                      shelfLife.disease_detected.toLowerCase().includes('gray') ||
                      shelfLife.disease_detected.toLowerCase().includes('mold') ||
                      shelfLife.disease_detected.toLowerCase().includes('busuk')
                        ? 'text-red-700'
                        : 'text-[#0F172A]'
                    }`}
                  >
                    {shelfLife.disease_detected}
                  </strong>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {shelfLife.disease_detected.includes('Normal')
                    ? 'Bebas tanda kapang Botrytis'
                    : 'Risiko dekomposisi jamur aktif terdeteksi'}
                </span>
              </div>
            </div>
          </div>

          {/* Multimodal Physical Sensor Cross-Validation Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center justify-between">
              <span>Validasi Sensor Fisik Multimodal</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-200">
                Anti-Bias Cahaya
              </span>
            </h4>

            {/* TCS34725 Color Cross-Validation */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-extrabold text-amber-950">
                    Validasi Kroma TCS34725:
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  {shelfLife.color_validation.consistency_status}
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                {shelfLife.color_validation.message}
              </p>
              <div className="flex items-center space-x-3 text-[11px] text-amber-800/90 pt-1 border-t border-amber-200/50">
                <span>Rasio Merah: <strong>{shelfLife.color_validation.red_ratio > 0 ? `${(shelfLife.color_validation.red_ratio * 100).toFixed(0)}%` : '0%'}</strong></span>
                <span>•</span>
                <span>Iluminasi: <strong>{shelfLife.color_validation.lux} Lux</strong></span>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-black/20"
                    style={{ backgroundColor: shelfLife.color_validation.sensor_hex || '#000000' }}
                  />
                  <span className="font-mono text-[10px]">{shelfLife.color_validation.sensor_hex || '0'}</span>
                </div>
              </div>
            </div>

            {/* DHT22 Microclimate Stress Factor */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Thermometer className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-extrabold text-blue-950">
                    Stres Mikroklimat DHT22:
                  </span>
                </div>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                  Pengali: {result.gas_summary.temperature ? `${shelfLife.environmental_stress_factor}x` : '1.0x (Baseline)'}
                </span>
              </div>
              <p className="text-xs text-blue-900 leading-relaxed">
                {result.gas_summary.temperature && result.gas_summary.temperature > 0
                  ? (shelfLife.environmental_stress_factor > 1.2
                    ? `Suhu fisik ruang (${result.gas_summary.temperature.toFixed(1)}°C) dan RH ${result.gas_summary.humidity?.toFixed(0)}% mempercepat laju respirasi stroberi.`
                    : `Suhu dan kelembapan stabil di kisaran aman.`)
                  : `Sensor DHT22 fisik belum terhubung (nilai 0°C). Menggunakan laju degradasi standar tanpa faktor percepatan.`}
              </p>
            </div>

            {/* MQ-4 & MQ-135 Gas Telemetry */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Emisi Metana (MQ-4):</span>
                <span className="text-sm font-black text-slate-800">
                  {result.gas_summary.ch4_ppm ? `${result.gas_summary.ch4_ppm.toFixed(2)} ppm` : '0.00 ppm'}
                </span>
                <span className="text-[10px] block font-semibold mt-0.5 text-slate-500">
                  {result.gas_summary.ch4_ppm ? (result.gas_summary.ch4_status === 'Rendah' ? '✓ Belum Ada Fermentasi' : '⚠️ Gas Naik') : 'Nilai 0 (Belum Terhubung)'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Kualitas Udara (MQ-135):</span>
                <span className="text-sm font-black text-slate-800">
                  {result.gas_summary.aqi_ppm ? `${result.gas_summary.aqi_ppm} AQI` : '0 AQI'}
                </span>
                <span className="text-[10px] block font-semibold mt-0.5 text-slate-500">
                  {result.gas_summary.aqi_ppm ? (result.gas_summary.aqi_status === 'Baik' ? '✓ Udara Segar Normal' : '⚠️ VOCs Terdeteksi') : 'Nilai 0 (Belum Terhubung)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: SMART INVENTORY, DYNAMIC PRICING & VALUE
        ======================================================== */}
        <div className="lg:col-span-6 space-y-6">
          {/* Smart Inventory Action & Dynamic Pricing Recommendation */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-5">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Manajemen Stok Cerdas Pedagang
              </span>
              <h3 className="text-xl font-extrabold text-[#0F172A] mt-2 leading-tight">
                Rekomendasi Aksi Cepat & Strategi Penjualan
              </h3>
            </div>

            {/* Big Action Call-out Box */}
            <div className="p-5 rounded-2xl bg-emerald-50/80 border-2 border-emerald-500/50 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-900">
                <Store className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Tindakan Inventaris Disarankan:</span>
              </div>

              <div className="text-xl font-black text-[#0F172A] leading-snug">
                {shelfLife.inventory_action}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-950">
                  Strategi Harga: <span className="underline decoration-emerald-500 decoration-2">{shelfLife.pricing_strategy}</span>
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-emerald-200/60">
                {hoursLeft >= 48
                  ? 'Stok berada dalam kondisi prima. Tempatkan pada etalase utama atau simpan di pendingin untuk memaksimalkan margin harga penuh.'
                  : hoursLeft >= 18
                  ? 'Sisa umur simpan kritis (1-2 hari). Segera pasang label diskon 25-30% atau pajang paling depan agar terjual habis hari ini sebelum merugi.'
                  : 'Stok mulai melunak dan lewat matang. Segera alihkan ke UMKM olahan (jus/selai stroberi) atau jual borongan dengan harga khusus daripada terbuang menjadi sampah.'}
              </p>
            </div>

            {/* Business Value & Loss Prevention Calculator */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Nilai Tambah Pedagang (Loss Prevention):</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-medium text-slate-500 block">Modal Terselamatkan:</span>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">
                    Rp {result.financial_savings_idr.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Berdasarkan batch {result.saved_weight_kg} kg pasokan
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-medium text-slate-500 block">Status Efisiensi:</span>
                  <div className="text-sm font-extrabold text-blue-700 mt-0.5">
                    {hoursLeft >= 24 ? '100% Modal Aman' : 'Penyelamatan Modal Cepat'}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Mencegah rugi total pembusukan
                  </span>
                </div>
              </div>
            </div>

            {/* Environmental Impact (Goal Utama) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dampak Lingkungan (Zero Waste at Source):</span>
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block">Sampah Tertahan:</span>
                  <strong className="text-sm font-black text-slate-900">{result.saved_weight_kg} kg</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Emisi $CH_4$ Dicegah:</span>
                  <strong className="text-sm font-black text-emerald-700">{result.prevented_ch4_g} gram</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Upcycling & Alternative Processing Rescue Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Panduan Alternatif Penyelamatan & Upcycling
            </h4>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-start space-x-3.5">
                <img
                  src={currentRec.image_url}
                  alt={currentRec.title}
                  className="w-18 h-18 rounded-xl object-cover shrink-0 border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-[#0F172A] text-sm leading-snug">
                    {currentRec.title}
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed mt-0.5 line-clamp-2">
                    {currentRec.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenRecipeModal(currentRec)}
                className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-bold py-2.5 px-4 rounded-xl transition cursor-pointer text-xs flex items-center justify-center space-x-1.5"
              >
                <span>Lihat Langkah Detail Upcycling</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
