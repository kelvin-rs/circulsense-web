'use client';

import React, { useState } from 'react';
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
  const [selectedTab, setSelectedTab] = useState<'Resep Masakan' | 'Kompos' | 'Eco Enzyme'>(
    result.recommendation.type
  );

  const itemCatalog = RECIPE_CATALOG[result.item_name] || RECIPE_CATALOG['Tomat'];

  let currentRec: UpcyclingRecommendation = result.recommendation;
  if (selectedTab === 'Resep Masakan') {
    currentRec = result.status === 'Segar' ? itemCatalog.segar : itemCatalog.layu;
  } else if (selectedTab === 'Kompos') {
    currentRec = itemCatalog.busuk;
  } else if (selectedTab === 'Eco Enzyme') {
    currentRec = {
      id: 'rec_eco_enzyme_general',
      type: 'Eco Enzyme',
      title: `Eco Enzyme Kulit & Ampas ${result.item_name}`,
      subtitle: 'Fermentasi anaerobik menghasilkan cairan pembersih enzimatik.',
      prep_time: '15 menit',
      difficulty: 'Mudah',
      description: `Manfaatkan sisa kulit atau bagian yang tidak dapat dikonsumsi dari ${result.item_name} untuk membuat cairan pembersih serbaguna ramah lingkungan.`,
      ingredients: [
        `300g Bahan Organik (${result.item_name})`,
        '100g Gula Merah / Molase Alami',
        '1000ml Air Bersih'
      ],
      steps: [
        'Campurkan gula merah dan air dalam botol kedap udara hingga larut.',
        'Masukkan cacahan bahan organik, sisakan ruang udara 20% di botol.',
        'Simpan di tempat teduh dan buka tutup perlahan pada 2 minggu pertama untuk membuang gas.',
        'Panen cairan bening kecokelatan setelah 90 hari.'
      ],
      image_url: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80'
    };
  }

  const getStatusBadge = () => {
    switch (result.status_badge_color) {
      case 'green':
        return {
          bg: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
          gaugePos: '15%',
          label: 'Segar'
        };
      case 'yellow':
        return {
          bg: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
          gaugePos: '50%',
          label: 'Layu / Terlalu Matang'
        };
      case 'red':
      default:
        return {
          bg: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
          gaugePos: '85%',
          label: 'Busuk'
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-8 pb-16 pt-2">
      <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] leading-tight">Hasil Klasifikasi & Fusi Sensor</h2>
          <p className="text-xs text-[#64748B]">Evaluasi saintifik kelayakan konsumsi bahan pangan</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-[#2D7A38] bg-[#DCFCE7] hover:bg-[#BBF7D0] px-4 py-2 rounded-xl transition cursor-pointer"
        >
          ← Pindai Ulang
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-5">
            <div className="flex items-center space-x-5">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-[#E2E8F0]">
                <img
                  src={result.image_url}
                  alt={result.item_name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-extrabold text-[#0F172A] leading-tight">
                  {result.item_name}
                </h3>
                <p className="text-xs text-[#64748B] font-medium mt-0.5">
                  Waktu Pemindaian: {result.scan_time}
                </p>

                <div className="mt-3 flex items-center space-x-3">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black text-[#0F172A]">
                      {result.freshness_score}
                    </span>
                    <span className="text-sm font-bold text-[#94A3B8]">/5</span>
                  </div>

                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusBadge.bg}`}>
                    {statusBadge.label}
                  </span>
                </div>

                <p className="text-xs text-[#475569] mt-2 font-medium">
                  {result.status_summary}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <div className="flex justify-between text-xs font-semibold text-[#64748B] mb-2">
                <span className="text-[#166534]">Segar (4-5)</span>
                <span className="text-[#92400E]">Layu (2-3)</span>
                <span className="text-[#991B1B]">Busuk (1)</span>
              </div>

              <div className="relative w-full h-2.5 rounded-full bg-gradient-to-r from-[#22C55E] via-[#F59E0B] to-[#EF4444]">
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#0F172A] shadow-md transition-all duration-500"
                  style={{ left: statusBadge.gaugePos }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Rincian Parameter Multimodal
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-2xl p-4 border border-[#E2E8F0] text-center">
                <span className="text-xs text-[#64748B] font-semibold block">Gas Metana (MQ-4)</span>
                <div className="text-lg font-bold text-[#0F172A] mt-1">
                  {result.gas_summary.ch4_ppm} <span className="text-xs font-normal text-[#64748B]">ppm</span>
                </div>
                <span className="inline-block mt-1 text-[11px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-md">
                  {result.gas_summary.ch4_status}
                </span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-[#E2E8F0] text-center">
                <span className="text-xs text-[#64748B] font-semibold block">Kualitas (MQ-135)</span>
                <div className="text-lg font-bold text-[#0F172A] mt-1">
                  {result.gas_summary.aqi_ppm} <span className="text-xs font-normal text-[#64748B]">AQI</span>
                </div>
                <span className="inline-block mt-1 text-[11px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-md">
                  {result.gas_summary.aqi_status}
                </span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-[#E2E8F0] text-center">
                <span className="text-xs text-[#64748B] font-semibold block">Visi AI (YOLO)</span>
                <div className="text-sm font-bold text-[#0F172A] mt-1 truncate">
                  {result.gas_summary.visual_status}
                </div>
                <span className="inline-block mt-1 text-[11px] font-bold text-[#1E293B] bg-slate-200 px-2 py-0.5 rounded-md">
                  {result.category}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-5">
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Rekomendasi Aksi Upcycling
            </h4>

            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
              {(['Resep Masakan', 'Kompos', 'Eco Enzyme'] as const).map((tab) => {
                const isSelected = selectedTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedTab(tab)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#2D7A38] text-white shadow-xs'
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-slate-50 p-5 space-y-4">
              <div className="flex items-start space-x-4">
                <img
                  src={currentRec.image_url}
                  alt={currentRec.title}
                  className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-[#E2E8F0]"
                />
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-[#0F172A] text-base leading-snug">
                    {currentRec.title}
                  </h5>
                  <p className="text-xs text-[#475569] leading-relaxed mt-1">
                    {currentRec.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                <span>Durasi: <strong className="text-[#0F172A]">{currentRec.prep_time || '20 menit'}</strong></span>
                <span>Tingkat: <strong className="text-[#0F172A]">{currentRec.difficulty || 'Mudah'}</strong></span>
              </div>

              <button
                type="button"
                onClick={() => onOpenRecipeModal(currentRec)}
                className="w-full bg-[#2D7A38] hover:bg-[#23632D] text-white font-bold py-3 px-4 rounded-xl transition cursor-pointer text-xs sm:text-sm"
              >
                Lihat Panduan Langkah Lengkap →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
