'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { fetchScanRecordById, deleteScanRecord, normalizeFreshnessPct } from '@/lib/supabase';
import { formatShelfLifeHuman, formatFreshnessScoreHuman } from '@/lib/display-format';
import { ScanRecord, GasData } from '@/types/circulsense';
import { mqttService, MQTTStatus } from '@/lib/mqtt';
import {
  ArrowLeft,
  Calendar,
  CookingPot,
  Layers,
  Trash2,
  Award,
  ShieldCheck,
  Clock,
  Thermometer,
  Wind,
  Sparkles,
  Leaf
} from 'lucide-react';
import { LoadingOverlay } from '@/components/LoadingOverlay';

// Helper pembersih format teks
function cleanLabel(text?: string): string {
  if (!text) return '';
  return text
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, (match) => {
      if (match.includes('Grade') || match.includes('Hari') || match.includes('Super')) return match;
      return '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export default function RiwayatDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<ScanRecord | null>(null);
  const [gasData, setGasData] = useState<GasData>(mqttService.getCurrentData());
  const [mqttStatus, setMqttStatus] = useState<MQTTStatus>('disconnected');
  const [loading, setLoading] = useState(true);
  const [selectedFruitIdx, setSelectedFruitIdx] = useState<number>(0);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteScanRecord(id);
      router.push('/riwayat');
    } catch (e) {
      console.error('Gagal menghapus riwayat:', e);
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
    }
  };

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
          <span className="text-xs font-semibold text-[#64748B]">Memuat detail riwayat...</span>
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

  // Multi-fruit handling
  const fruitList: any[] = (record.fruits_list && record.fruits_list.length > 0) ? record.fruits_list : [];
  const totalFruits = record.fruits_detected || (fruitList.length > 0 ? fruitList.length : 1);
  const activeFruit = fruitList.length > 0 ? fruitList[selectedFruitIdx] : null;

  // Aktifkan data buah spesifik atau fallback record utama
  const activeGrade = activeFruit?.grade_label || record.ripeness_stage || record.visual_condition || 'Matang Sempurna (Grade A Super)';
  const activeEdibility = activeFruit?.edibility || record.edibility || 'Kondisi prima siap makan';
  const activeDisease = activeFruit?.disease_label || record.disease_detected || 'Sehat & Bebas Penyakit';

  const shelf = formatShelfLifeHuman({
    daysSpoil: activeFruit?.days_to_spoil != null ? Number(activeFruit.days_to_spoil) : record.shelf_life_days,
    hoursSpoil: activeFruit?.shelf_life_hours != null ? Number(activeFruit.shelf_life_hours) : record.shelf_life_hours,
    daysMature: activeFruit?.days_to_mature != null ? Number(activeFruit.days_to_mature) : record.time_to_mature_days,
    hoursMature: activeFruit?.time_to_mature_hours != null ? Number(activeFruit.time_to_mature_hours) : record.time_to_mature_hours,
    gradeLabel: activeGrade,
    status: record.status
  });

  const scoreFmt = formatFreshnessScoreHuman(
    activeFruit?.freshness_score != null ? activeFruit.freshness_score : record.freshness_score,
    record.status,
    activeGrade
  );

  const isRotten = shelf.hours <= 0 || activeGrade.toLowerCase().includes('busuk') || activeGrade.toLowerCase().includes('rotten') || record.status === 'Busuk';
  const isFresh = scoreFmt.percentScore >= 65 && !isRotten;

  // Bounding box buah aktif
  const activeBbox = activeFruit?.bbox_norm || record.detection_bbox || record.bounding_boxes?.[0];

  return (
    <main className="min-h-screen bg-white text-[#1E293B] flex flex-col selection:bg-[#16A34A] selection:text-white">
      <Header mqttStatus={mqttStatus} battery={gasData.battery} />

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 pb-32 md:pb-16 space-y-4">
        {/* 1. TOP BAR */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3 min-w-0">
            <Link
              href="/riwayat"
              className="w-9 h-9 rounded-xl bg-slate-100 text-[#334155] flex items-center justify-center hover:bg-slate-200 transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-[#0F172A] tracking-tight truncate">
                Detail Pemeriksaan Buah
              </h1>
              <p className="text-xs text-slate-500 font-medium flex items-center space-x-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{formatDate(record.created_at)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsConfirmDeleteOpen(true)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition cursor-pointer flex items-center space-x-1.5 text-xs font-bold shrink-0"
            title="Hapus Catatan Ini"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hapus Riwayat</span>
          </button>
        </div>

        {/* 2. SUMMARY HEADER CARD: 1 PEMINDAIAN (DAPAT MEMUAT BEBERAPA BUAH) */}
        {totalFruits > 1 && (
          <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center space-x-1.5 text-emerald-300">
                <Layers className="w-4 h-4" />
                <span>{totalFruits} Buah Stroberi Terdeteksi Sekaligus dalam 1 Sampel</span>
              </span>
            </div>

            {/* TAB SELECTOR BUAH */}
            <div className="flex flex-wrap gap-1.5">
              {fruitList.map((f: any, idx: number) => {
                const isSelected = selectedFruitIdx === idx;
                const fGrade = cleanLabel(f.grade_label || f.grade || 'Matang');
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedFruitIdx(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span>🍓 Buah #{f.fruit_index || idx + 1}</span>
                    <span className="text-[10px] opacity-80">({fGrade})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. CITRA BUAH & BOUNDING BOX */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[16/8] rounded-2xl overflow-hidden bg-slate-900 shadow-xs border border-slate-200">
          {record.image_url ? (
            <img
              src={record.image_url}
              alt={record.item_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              <Layers className="w-10 h-10" />
            </div>
          )}

          {/* Render bounding box untuk setiap buah terdeteksi */}
          {fruitList && fruitList.length > 0 ? (
            fruitList.map((f: any, idx: number) => {
              const rawBbox = f.bbox_norm || f.bbox || (f.x !== undefined ? [f.x, f.y, f.w, f.h] : null);
              if (!rawBbox || !Array.isArray(rawBbox) || rawBbox.length !== 4) return null;
              const isSelected = selectedFruitIdx === idx;
              const left = Math.max(0, (rawBbox[0] - rawBbox[2] / 2) * 100);
              const top = Math.max(0, (rawBbox[1] - rawBbox[3] / 2) * 100);
              const width = Math.min(100 - left, rawBbox[2] * 100);
              const height = Math.min(100 - top, rawBbox[3] * 100);

              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFruitIdx(idx);
                  }}
                  title={`🍓 Stroberi #${idx + 1}`}
                  className={`absolute rounded transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-emerald-400 bg-emerald-500/25 ring-2 ring-emerald-300 z-10'
                      : 'border-2 border-dashed border-amber-300/80 bg-amber-400/15 hover:bg-amber-400/30 z-0'
                  }`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                >
                  <span
                    className={`absolute -top-3.5 -left-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-xs ${
                      isSelected
                        ? 'bg-emerald-600 text-white border border-emerald-300'
                        : 'bg-slate-900/80 text-amber-300'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                </div>
              );
            })
          ) : (
            activeBbox && Array.isArray(activeBbox) && activeBbox.length === 4 && (
              <div
                className="absolute border-2 border-emerald-400 bg-emerald-500/20 rounded pointer-events-none transition-all duration-300"
                style={{
                  left: `${Math.max(0, (activeBbox[0] - activeBbox[2] / 2) * 100)}%`,
                  top: `${Math.max(0, (activeBbox[1] - activeBbox[3] / 2) * 100)}%`,
                  width: `${Math.min(100, activeBbox[2] * 100)}%`,
                  height: `${Math.min(100, activeBbox[3] * 100)}%`,
                }}
              />
            )
          )}

          <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-xs font-bold px-2.5 py-1 rounded-lg">
            {record.item_name} {totalFruits > 1 ? `(Buah #${selectedFruitIdx + 1} dari ${totalFruits})` : ''}
          </div>

          <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-xs text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-lg">
            {totalFruits} Buah Teridentifikasi
          </div>
        </div>

        {/* 4. STATUS & KUALITAS BUAH AKTIF */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Kartu Mutu & Kesegaran */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Kualitas & Mutu Buah</span>
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isFresh ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {cleanLabel(activeGrade)}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Skor Kesegaran ML:</span>
                <div className="flex items-baseline space-x-1">
                  <strong className={`font-black ${scoreFmt.scoreColor}`}>
                    {scoreFmt.decimalScore}
                  </strong>
                  <span className="text-[10px] text-slate-400 font-bold">/ 1.0</span>
                  <span className="text-[11px] text-slate-500 font-semibold">({scoreFmt.percentScore}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Kelayakan Konsumsi:</span>
                <strong className="text-slate-800 font-bold text-right max-w-[65%] truncate">
                  {cleanLabel(activeEdibility)}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Kondisi Fisik:</span>
                <span className="text-slate-700 font-medium text-right max-w-[65%] truncate">
                  {cleanLabel(activeFruit?.desc || record.physical_desc || 'Bebas cacat fisik')}
                </span>
              </div>
            </div>
          </div>

          {/* Kartu Masa Simpan & Kesehatan */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Masa Simpan & Kesehatan</span>
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${shelf.badgeClass}`}>
                {shelf.badgeText}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{shelf.timeUnit === 'jam' ? 'Batas Waktu Simpan:' : 'Daya Tahan Simpan:'}</span>
                <strong className="text-slate-900 font-bold">{shelf.primaryText}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Status Penyakit:</span>
                <strong className={`font-bold ${isRotten ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {cleanLabel(activeDisease)}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Saran Tindakan:</span>
                <span className="text-slate-700 font-medium text-right max-w-[65%] truncate">
                  {record.inventory_action || 'Pajang di Etalase Utama'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. TABEL RANGKUMAN SELURUH BUAH JIKA MULTI-BUAH */}
        {fruitList.length > 1 && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Rangkuman Seluruh Buah ({fruitList.length} Buah Terdeteksi)
              </span>
              <span className="text-[11px] text-slate-500">Klik baris untuk menyorot buah</span>
            </div>

            <div className="divide-y divide-slate-200/80 rounded-xl overflow-hidden border border-slate-200 bg-white">
              {fruitList.map((f: any, idx: number) => {
                const isCurrent = selectedFruitIdx === idx;
                const fGrade = cleanLabel(f.grade_label || f.grade || 'Matang');
                const fDis = cleanLabel(f.disease_label || 'Sehat Bebas Jamur');
                const fShelf = formatShelfLifeHuman({
                  daysSpoil: f.days_to_spoil,
                  hoursSpoil: f.shelf_life_hours,
                  daysMature: f.days_to_mature,
                  hoursMature: f.time_to_mature_hours,
                  gradeLabel: fGrade,
                  status: record.status
                });

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedFruitIdx(idx)}
                    className={`p-3 text-xs flex items-center justify-between gap-2 cursor-pointer transition ${
                      isCurrent ? 'bg-emerald-50/90 font-bold text-emerald-900' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 truncate">
                          {fGrade}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {fDis}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-extrabold block ${fShelf.hours <= 0 ? 'text-red-700' : (fShelf.isUrgent ? 'text-amber-700' : 'text-emerald-700')}`}>
                        {fShelf.badgeText}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {fShelf.stageLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. TELEMETRI SENSOR SAAT PEMINDAIAN */}
        {(() => {
          const hasTemp = record.temperature != null && Number(record.temperature) > 0;
          const hasHum = record.humidity != null && Number(record.humidity) > 0;
          const hasCh4 = record.gas_ch4_ppm != null && Number(record.gas_ch4_ppm) > 0;
          const hasAqi = record.gas_aqi_ppm != null && Number(record.gas_aqi_ppm) > 0;
          const hasAnyIot = hasTemp || hasHum || hasCh4 || hasAqi;

          return (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Kondisi Ruangan & Sensor Saat Pindai
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  hasAnyIot
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    : 'text-slate-500 bg-slate-100 border-slate-200'
                }`}>
                  {hasAnyIot ? '✓ Sensor IoT Terhubung (Data Real)' : 'Data IoT Belum Terdeteksi'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[11px] font-semibold text-slate-500 block flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-blue-600" /> Suhu Ruang
                  </span>
                  <strong className="text-sm font-extrabold text-slate-900">
                    {hasTemp ? `${Number(record.temperature).toFixed(1)} °C` : '-'}
                  </strong>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[11px] font-semibold text-slate-500 block flex items-center gap-1">
                    <Wind className="w-3 h-3 text-cyan-600" /> Kelembaban
                  </span>
                  <strong className="text-sm font-extrabold text-slate-900">
                    {hasHum ? `${Number(record.humidity).toFixed(0)} %` : '-'}
                  </strong>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[11px] font-semibold text-slate-500 block flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Gas Metana
                  </span>
                  <strong className="text-sm font-extrabold text-slate-900">
                    {hasCh4 ? `${Number(record.gas_ch4_ppm).toFixed(2)} ppm` : '-'}
                  </strong>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[11px] font-semibold text-slate-500 block flex items-center gap-1">
                    <Leaf className="w-3 h-3 text-amber-600" /> Kualitas Udara
                  </span>
                  <strong className="text-sm font-extrabold text-slate-900">
                    {hasAqi ? `${Math.round(Number(record.gas_aqi_ppm))} AQI` : '-'}
                  </strong>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 7. SARAN UPCYCLING & RESEP */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
            <CookingPot className="w-4 h-4" />
            <span>Pilihan Olahan Bila Stok Belum Habis</span>
          </div>

          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
            {record.recommendation_title || record.action_taken || 'Olahan Pangan Ramah Lingkungan'}
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed">
            Metode pengolahan terbaik untuk menjaga nilai nutrisi buah dan mencegah pembusukan di tempat sampah.
          </p>
        </div>
      </div>

      {/* MODAL KONFIRMASI HAPUS */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-[#0F172A] text-base">Hapus Catatan Ini?</h3>
              <p className="text-xs text-slate-500">
                Seluruh riwayat pemeriksaan sampel ini (termasuk {totalFruits} buah terdeteksi) akan dihapus dari database.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      <LoadingOverlay
        isOpen={isDeleting}
        title="Menghapus Catatan Pemindaian..."
        message="Sedang menghapus data dari database..."
        variant="deleting"
      />

      <BottomNav />
    </main>
  );
}
