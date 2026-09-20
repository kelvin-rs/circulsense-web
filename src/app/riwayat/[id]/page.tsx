'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { fetchScanRecordById } from '@/lib/supabase';
import { ScanRecord, GasData, UpcyclingRecommendation } from '@/types/circulsense';
import { mqttService, MQTTStatus } from '@/lib/mqtt';
import { RECIPE_CATALOG } from '@/lib/sensor-fusion';
import { RecipeDetailModal } from '@/components/RecipeDetailModal';
import {
  ArrowLeft,
  Calendar,
  CookingPot,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function RiwayatDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<ScanRecord | null>(null);
  const [gasData, setGasData] = useState<GasData>(mqttService.getCurrentData());
  const [mqttStatus, setMqttStatus] = useState<MQTTStatus>('disconnected');
  const [loading, setLoading] = useState(true);
  const [activeRecipeModal, setActiveRecipeModal] = useState<UpcyclingRecommendation | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const found = await fetchScanRecordById(id);
      setRecord(found);
    } catch (e) {
      console.error('Error fetching detail by id:', e);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    mqttService.init();

    const unsubMqtt = mqttService.subscribe((data) => {
      setGasData(data);
    });

    const unsubStatus = mqttService.onStatusChange((status) => {
      setMqttStatus(status);
    });

    loadDetail();

    return () => {
      unsubMqtt();
      unsubStatus();
    };
  }, [loadDetail]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) +
        ' pukul ' +
        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
        ' WIB'
      );
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-[#1E293B] flex flex-col">
        <Header mqttStatus={mqttStatus} battery={gasData.battery} />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-[#2D7A38] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-[#64748B]">Memuat detail data dari database...</span>
        </div>
        <BottomNav />
      </main>
    );
  }

  if (!record) {
    return (
      <main className="min-h-screen bg-white text-[#1E293B] flex flex-col">
        <Header mqttStatus={mqttStatus} battery={gasData.battery} />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#0F172A]">Data Riwayat Tidak Ditemukan</h2>
            <p className="text-xs text-[#64748B] max-w-xs mx-auto">
              Record pemindaian ini tidak tersedia di database atau telah dihapus.
            </p>
          </div>
          <Link
            href="/riwayat"
            className="inline-flex items-center space-x-2 bg-[#2D7A38] text-white text-xs font-bold px-4 py-2.5 rounded-xl"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Riwayat</span>
          </Link>
        </div>
        <BottomNav />
      </main>
    );
  }

  const scorePercent = record.freshness_score > 5 ? record.freshness_score : Math.round(record.freshness_score * 20);
  const isFresh = scorePercent >= 70;
  const isDecaying = scorePercent >= 40 && scorePercent < 70;
  const isRotten = record.status === 'Busuk' || scorePercent < 40 || (record.disease_detected?.toLowerCase().includes('gray') ?? false);

  return (
    <main className="min-h-screen bg-white text-[#1E293B] flex flex-col selection:bg-[#16A34A] selection:text-white">
      <Header
        mqttStatus={mqttStatus}
        battery={gasData.battery}
      />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-32 md:pb-16 space-y-6">
        {/* 1. TOP BACK BAR */}
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <Link
            href="/riwayat"
            className="w-10 h-10 rounded-xl bg-slate-100 text-[#334155] flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Detail Riwayat Analisis
            </h1>
            <p className="text-xs text-slate-400 font-medium flex items-center space-x-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(record.created_at)}</span>
            </p>
          </div>
        </div>

        {/* 2. PHOTO & FRESHNESS EVALUATION */}
        <div className="space-y-4">
          <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 shadow-sm">
            {record.image_url ? (
              <img
                src={record.image_url}
                alt={record.item_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <Layers className="w-12 h-12" />
              </div>
            )}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {record.item_name} ({record.category})
            </div>
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
              YOLO Edge AI
            </div>
          </div>

          {/* Freshness Score Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                Evaluasi Fusi Sensor
              </span>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-2xl sm:text-3xl font-black ${
                    isFresh ? 'text-[#16A34A]' : isDecaying ? 'text-amber-600' : 'text-red-600'
                  }`}
                >
                  {record.freshness_score > 5 ? `${record.freshness_score}%` : `${record.freshness_score}/5`}
                </span>
                <span
                  className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                    isFresh
                      ? 'bg-[#DCFCE7] text-[#166534]'
                      : isDecaying
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {record.status}
                </span>
              </div>
            </div>

            <div className="text-right max-w-[50%]">
              <span className="text-xs text-slate-400 block font-medium">Kondisi Visual</span>
              <strong className="text-xs sm:text-sm text-[#0F172A] font-bold block truncate">
                {record.visual_condition && !record.visual_condition.startsWith('{')
                  ? record.visual_condition
                  : 'Segar & Bebas Cacat'}
              </strong>
            </div>
          </div>

          {/* Prediksi Umur Simpan & Keputusan Inventaris Pedagang */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 transition ${
              isRotten
                ? 'bg-red-50/80 border-red-200/90 text-red-900'
                : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider ${
                  isRotten ? 'text-red-800' : 'text-emerald-800'
                }`}
              >
                Prediksi Umur Simpan & Aksi Stok Pedagang
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  isRotten
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                {isRotten
                  ? 'Sisa 0 Jam (Segera Dipilah)'
                  : `Sisa ${record.shelf_life_hours ?? 48} Jam (${record.shelf_life_days ?? 2.0} Hari)`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-xs text-slate-500 font-medium block">Tindakan Inventaris:</span>
                <strong className="text-slate-900 font-bold text-xs mt-0.5 block">
                  {record.inventory_action || (isRotten ? 'Pilah ke Komposter Organik' : 'Pajang di Etalase Depan Segera')}
                </strong>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-xs text-slate-500 font-medium block">Deteksi Patogen & Cacat:</span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  {record.disease_detected && !record.disease_detected.toLowerCase().includes('normal') && !record.disease_detected.toLowerCase().includes('bebas') ? (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 truncate">
                      ⚠ {record.disease_detected}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate">
                      ✓ {record.disease_detected || 'Normal (Bebas Jamur)'}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-xs text-slate-500 font-medium block">Strategi Harga & Kematangan:</span>
                <strong className="text-slate-800 font-bold text-xs mt-0.5 block truncate">
                  {record.pricing_strategy || (isRotten ? 'Bahan Olahan' : 'Harga Normal')} • {record.ripeness_stage || 'Fullripe'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* 3. MULTIMODAL SENSOR TELEMETRY */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Telemetri Sensor Terpadu Saat Pemindaian
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* MQ-4 */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">MQ-4 (Metana)</span>
              <div className="text-lg font-black text-[#0F172A]">
                {record.gas_ch4_ppm ? Number(record.gas_ch4_ppm).toFixed(2) : '0.00'}{' '}
                <span className="text-[10px] font-mono text-slate-400 font-normal">ppm</span>
              </div>
            </div>

            {/* MQ-135 */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">MQ-135 (Kualitas)</span>
              <div className="text-lg font-black text-[#0F172A]">
                {record.gas_aqi_ppm || 0}{' '}
                <span className="text-[10px] font-mono text-slate-400 font-normal">AQI</span>
              </div>
            </div>

            {/* DHT22 */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">DHT22 (Suhu/RH)</span>
              <div className="text-sm font-black text-[#0F172A]">
                {record.temperature ? Number(record.temperature).toFixed(1) : '27.0'}°C
                <span className="text-[10px] text-slate-400 ml-1">
                  {record.humidity ? Number(record.humidity).toFixed(0) : '65'}%
                </span>
              </div>
            </div>

            {/* TCS34725 */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">TCS34725 (Warna)</span>
              <div className="flex items-center space-x-1.5 pt-0.5">
                <div
                  className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                  style={{ backgroundColor: record.color_hex || '#E44034' }}
                />
                <span className="font-mono text-xs font-bold text-[#0F172A] truncate">
                  {record.color_hex || '#E44034'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. RECOMMENDED UPCYCLING ACTION & INTERACTIVE RECIPE */}
        {(() => {
          const getRecommendation = () => {
            if (!record) return RECIPE_CATALOG['Stroberi'].segar;
            const catalog = RECIPE_CATALOG[record.item_name] || RECIPE_CATALOG['Stroberi'];
            if (!catalog) return RECIPE_CATALOG['Stroberi'].segar;

            const isRottenRec = record.status === 'Busuk' ||
              (record.disease_detected || '').toLowerCase().includes('gray') ||
              (record.disease_detected || '').toLowerCase().includes('mold') ||
              (record.disease_detected || '').toLowerCase().includes('spot') ||
              (record.shelf_life_hours != null && record.shelf_life_hours <= 0);

            if (isRottenRec) return catalog.busuk;
            if (record.status === 'Terlalu Matang' || record.status === 'Layu') return catalog.layu;
            return catalog.segar;
          };

          const recDetail = getRecommendation();

          return (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  {isRotten ? 'Solusi Daur Ulang Pangan (Kompos Organik)' : 'Pilihan Resep & Aksi Olahan Pangan'}
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {recDetail.type}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                <div className="flex items-start space-x-3">
                  <img
                    src={recDetail.image_url}
                    alt={recDetail.title}
                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-slate-900 text-sm leading-snug">
                      {recDetail.title}
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5 line-clamp-2">
                      {recDetail.subtitle}
                    </p>
                    <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-500 font-medium">
                      <span>⏱ {recDetail.prep_time}</span>
                      <span>• Tingkat: {recDetail.difficulty}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveRecipeModal(recDetail)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition cursor-pointer text-xs flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <CookingPot className="w-4 h-4" />
                  <span>Lihat Resep & Langkah Olahan Lengkap</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* 5. ENVIRONMENTAL & FINANCIAL IMPACT */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Dampak Lingkungan & Finansial
          </h2>

          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Pangan</span>
              <strong className="text-sm font-black text-[#0F172A]">
                {Number(record.saved_weight_kg) || 0} kg
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">CH₄ Dicegah</span>
              <strong className="text-sm font-black text-[#166534]">
                {Number(record.prevented_ch4_g) || 0} g
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Nilai Hemat</span>
              <strong className="text-sm font-black text-[#2D7A38]">
                Rp {(Number(record.financial_savings_idr) || 0).toLocaleString('id-ID')}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />

      <RecipeDetailModal
        recommendation={activeRecipeModal}
        onClose={() => setActiveRecipeModal(null)}
      />
    </main>
  );
}
