import React, { useState } from 'react';
import {
  Clock,
  ArrowLeft,
  Thermometer,
  Leaf,
  Wind,
  ChevronRight,
  ShieldCheck,
  Layers,
  Award,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { FusionResult, UpcyclingRecommendation } from '@/types/circulsense';
import { formatShelfLifeHuman, formatFreshnessScoreHuman } from '@/lib/display-format';

interface HasilAnalisisProps {
  result: FusionResult;
  onBack: () => void;
  onOpenRecipeModal: (recommendation: UpcyclingRecommendation) => void;
}

// Helper untuk membersihkan simbol teknis/mesin dan mengubah ke format manusia yang ramah
function cleanHumanText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/\[.*?\]/g, '') // Hapus [TAG]
    .replace(/\(.*?\)/g, (match) => {
      if (match.includes('Grade') || match.includes('Hari') || match.includes('Super')) return match;
      return '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function parseGrade(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes('fullripe') || lower.includes('matang sempurna')) {
    return {
      title: 'Matang Sempurna',
      gradeBadge: 'Grade A Super',
      gradeBadgeColor: 'bg-emerald-600 text-white',
      desc: 'Warna merah merata, tekstur lembut berair, dan cita rasa manis berada di titik terbaik.'
    };
  }
  if (lower.includes('ripe') || lower.includes('setengah matang')) {
    return {
      title: 'Matang Optimal',
      gradeBadge: 'Grade A',
      gradeBadgeColor: 'bg-emerald-600 text-white',
      desc: 'Warna merah segar, tekstur padat renyah, sangat ideal untuk penjualan etalase.'
    };
  }
  if (lower.includes('overripe') || lower.includes('lewat')) {
    return {
      title: 'Lewat Matang',
      gradeBadge: 'Grade B (Jual Cepat)',
      gradeBadgeColor: 'bg-amber-600 text-white',
      desc: 'Sangat manis dan matang penuh. Disarankan untuk segera dikonsumsi atau dijadikan olahan selai/jus.'
    };
  }
  if (lower.includes('unripe') || lower.includes('mentah')) {
    return {
      title: 'Mentah (Belum Matang)',
      gradeBadge: 'Grade C (Pemeraman)',
      gradeBadgeColor: 'bg-cyan-600 text-white',
      desc: 'Masih tampak semburat hijau/putih. Butuh waktu pemeraman alami sebelum siap disajikan.'
    };
  }
  if (lower.includes('rotten') || lower.includes('busuk')) {
    return {
      title: 'Kondisi Rusak / Busuk',
      gradeBadge: 'Kualitas Afkir',
      gradeBadgeColor: 'bg-rose-600 text-white',
      desc: 'Ditemukan jaringan lunak atau pembusukan. Sebaiknya segera dipisahkan untuk bahan kompos.'
    };
  }
  return {
    title: cleanHumanText(label) || 'Matang Standar',
    gradeBadge: 'Kualitas Pasar',
    gradeBadgeColor: 'bg-emerald-600 text-white',
    desc: 'Kondisi buah terverifikasi sesuai standar mutu pascapanen.'
  };
}

export const HasilAnalisis: React.FC<HasilAnalisisProps> = ({
  result,
  onBack,
  onOpenRecipeModal
}) => {
  const currentRec: UpcyclingRecommendation = result.recommendation;
  const [selectedFruitIdx, setSelectedFruitIdx] = useState<number>(0);

  const fruitList = result.results && result.results.length > 0 ? result.results : null;
  const currentFruit = fruitList ? fruitList[selectedFruitIdx] : null;

  // Nilai aktif
  const rawGrade = currentFruit?.grade_label || result.grade_label || 'Matang Sempurna (Grade A Super)';
  const gradeInfo = parseGrade(rawGrade);
  const gradeConfidence = currentFruit?.grade_confidence != null ? currentFruit.grade_confidence : (result.grade_confidence ?? 0.95);

  const rawEdibility = currentFruit?.edibility || result.edibility || 'Kondisi prima siap makan dengan cita rasa manis puncak.';
  const edibility = cleanHumanText(rawEdibility);

  const physicalDesc = currentFruit?.desc || result.physical_desc || gradeInfo.desc;

  const rawDisease = currentFruit?.disease_label || result.disease_label || (result.shelf_life?.disease_detected as string) || 'Sehat & Segar (Bebas Penyakit)';
  const diseaseLabel = cleanHumanText(rawDisease) || 'Sehat & Segar Bebas Jamur';
  const diseaseDesc = currentFruit?.disease_desc || result.disease_desc || 'Kondisi fisik bersih dan bebas dari tanda-tanda bercak jamur atau pembusukan.';

  const redRatioPct = currentFruit?.chroma?.red_ratio != null 
    ? Math.round(currentFruit.chroma.red_ratio * 1000) / 10 
    : (result.red_ratio_pct ?? 72.8);

  const shelf = formatShelfLifeHuman({
    daysSpoil: currentFruit?.days_to_spoil != null ? currentFruit.days_to_spoil : result.shelf_life?.days_remaining,
    hoursSpoil: currentFruit?.shelf_life_hours != null ? currentFruit.shelf_life_hours : result.shelf_life?.hours_remaining,
    daysMature: currentFruit?.days_to_mature != null ? currentFruit.days_to_mature : (result.shelf_life?.time_to_ripe_days ?? result.shelf_life?.time_to_mature_days),
    hoursMature: currentFruit?.time_to_mature_hours != null ? currentFruit.time_to_mature_hours : (result.shelf_life?.time_to_ripe_hours ?? result.shelf_life?.time_to_mature_hours),
    gradeLabel: rawGrade,
    status: result.status
  });

  const scoreFmt = formatFreshnessScoreHuman(
    currentFruit?.freshness_score != null ? currentFruit.freshness_score : result.freshness_score,
    result.status,
    rawGrade
  );

  const actionRecommendation = currentFruit?.action_recommendation || result.shelf_life?.action_recommendation || 'Kondisi buah sangat baik. Simpan di tempat sejuk atau lemari pendingin (4°C) untuk mempertahankan kesegaran optimal.';
  const isRotten = shelf.hours <= 0 || rawGrade.toLowerCase().includes('busuk') || rawGrade.toLowerCase().includes('rotten');
  const isHealthy = !diseaseLabel.toLowerCase().includes('jamur') && !diseaseLabel.toLowerCase().includes('busuk') && !diseaseLabel.toLowerCase().includes('gray');

  return (
    <div className="space-y-4 pb-16 pt-1 max-w-5xl mx-auto">
      {/* 1. HEADER BAR & NAVIGASI KEMBALI (KOMPAK & BERSIH) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            Hasil Pemeriksaan Mutu & Kualitas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Waktu Pemeriksaan: {result.scan_time || 'Baru saja'}
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl transition cursor-pointer border border-emerald-200 w-full sm:w-auto shrink-0 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Pindai Sampel Lain</span>
        </button>
      </div>

      {/* 2. RINGKASAN CEPAT UNTUK PELANGGAN (CUSTOMER VERDICT BAR) */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
          {/* Status Utama */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Kualitas Buah</span>
            <strong className="text-sm sm:text-base font-extrabold text-slate-900 block truncate">
              {gradeInfo.title}
            </strong>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${gradeInfo.gradeBadgeColor}`}>
              {gradeInfo.gradeBadge}
            </span>
          </div>

          {/* Daya Simpan & Pemeraman */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">
              {shelf.stageLabel}
            </span>
            <strong className="text-sm sm:text-base font-extrabold text-emerald-800 block truncate">
              {shelf.primaryText}
            </strong>
            <span className="text-[11px] text-slate-500 font-medium block truncate">
              {shelf.secondaryText}
            </span>
          </div>

          {/* Kondisi Kesehatan */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Kesehatan Buah</span>
            <strong className={`text-sm sm:text-base font-extrabold block truncate ${isHealthy ? 'text-emerald-800' : 'text-rose-700'}`}>
              {isHealthy ? 'Bebas Jamur' : 'Perlu Dipilah'}
            </strong>
            <span className="text-[11px] text-slate-500 font-medium block">
              Kulit {redRatioPct}% Merah
            </span>
          </div>

          {/* Indeks Kesegaran */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Skor Kesegaran ML</span>
            <div className="flex items-baseline justify-center sm:justify-start space-x-1">
              <strong className={`text-sm sm:text-base font-black ${scoreFmt.scoreColor}`}>
                {scoreFmt.decimalScore}
              </strong>
              <span className="text-[10px] font-bold text-slate-400">/ 1.0</span>
              <span className="text-[11px] font-semibold text-slate-600">({scoreFmt.percentScore}%)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block truncate">
              {scoreFmt.qualityLevel}
            </span>
          </div>
        </div>
      </div>

      {/* 3. TABS MULTI-BUAH JIKA TERDETEKSI LEBIH DARI 1 BUAH (KOMPAK & RAPI) */}
      {fruitList && fruitList.length > 1 && (
        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold flex items-center space-x-1.5 text-emerald-300">
              <Layers className="w-3.5 h-3.5" />
              <span>Terdeteksi {fruitList.length} Buah Stroberi pada Citra</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {fruitList.map((f: any, idx: number) => {
              const fInfo = parseGrade(f.grade || f.grade_label || 'Fullripe');
              const isSelected = selectedFruitIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedFruitIdx(idx)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-2xs scale-101'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <span>🍓 Stroberi #{f.fruit_index || idx + 1}</span>
                  <span className="text-[10px] opacity-80">({fInfo.title})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. DUA KOLOM KARTU RINCIAN */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* ========================================================
            KOLOM KIRI: FOTO BUAH, KUALITAS FISIK & KESEHATAN
        ======================================================== */}
        <div className="md:col-span-6 space-y-3.5">
          {/* Card: Citra & Mutu */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
            {/* Citra & Mutu Visual Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-800">
                  Citra Sampel Terverifikasi AI
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {fruitList ? `Buah #${selectedFruitIdx + 1} dari ${fruitList.length}` : '1 Buah Terdeteksi'}
                </span>
              </div>

              {/* Wadah Visual dengan Rasio Asli & Ambient Backdrop */}
              <div className="relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-200 flex items-center justify-center min-h-[160px] max-h-[260px] shadow-2xs">
                {/* Ambient backdrop */}
                <img
                  src={result.image_url}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 scale-110 pointer-events-none select-none"
                />
                <div className="relative z-1 inline-block max-w-full max-h-[260px]">
                  <img
                    src={result.image_url}
                    alt={result.item_name}
                    className="max-w-full max-h-[260px] w-auto h-auto block mx-auto rounded-lg shadow-sm"
                  />
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
                            className={`absolute -top-3.5 -left-1 text-[9px] font-extrabold px-1 py-0.2 rounded shadow-xs ${
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
                    result.detection_bbox && result.detection_bbox.length === 4 && (
                      <div
                        className="absolute border-2 border-emerald-400 bg-emerald-500/20 rounded pointer-events-none"
                        style={{
                          left: `${Math.max(0, (result.detection_bbox[0] - result.detection_bbox[2] / 2) * 100)}%`,
                          top: `${Math.max(0, (result.detection_bbox[1] - result.detection_bbox[3] / 2) * 100)}%`,
                          width: `${Math.min(100, result.detection_bbox[2] * 100)}%`,
                          height: `${Math.min(100, result.detection_bbox[3] * 100)}%`,
                        }}
                      />
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                <span>Posisi: <strong>{currentFruit?.position_desc || 'Area Fokus'}</strong></span>
                <span>Akurasi Pengenalan: <strong>{((currentFruit?.detection_conf || 0.95) * 100).toFixed(0)}%</strong></span>
              </div>
            </div>

            {/* Mutu & Kematangan */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-800 flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kategori Mutu</span>
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${gradeInfo.gradeBadgeColor}`}>
                  {gradeInfo.gradeBadge}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500 font-medium">Tingkat Keyakinan:</span>
                  <strong className="text-slate-900 font-bold">{(gradeConfidence * 100).toFixed(0)}%</strong>
                </div>
                <div className="relative w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(10, gradeConfidence * 100))}%` }}
                  />
                </div>
              </div>

              <div className="pt-1 text-slate-700 space-y-1">
                <p>
                  <strong className="text-slate-900">Kelayakan:</strong> {edibility}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong className="text-slate-900">Ciri Fisik:</strong> {physicalDesc}
                </p>
              </div>
            </div>

            {/* Kesehatan Buah */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-800 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kondisi Kesehatan Buah</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  isHealthy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isHealthy ? 'Bebas Penyakit' : 'Perlu Penanganan'}
                </span>
              </div>

              <div className="space-y-0.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Status Kesehatan:</span>
                  <strong className={`font-bold ${isRotten ? 'text-rose-700' : 'text-slate-900'}`}>
                    {diseaseLabel}
                  </strong>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px] pt-0.5">
                  {diseaseDesc}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            KOLOM KANAN: DAYA SIMPAN, KONDISI RUANG & RESEP
        ======================================================== */}
        <div className="md:col-span-6 space-y-3.5">
          {/* Card: Masa Simpan & Penyimpanan */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-300" />
                <span>Perkiraan Masa Simpan & Konsumsi</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                Pascapanen
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Perkiraan Waktu Pascapanen:</span>
                <div className="text-lg font-extrabold text-white mt-0.5">
                  {shelf.primaryText}{' '}
                  <span className="text-xs font-normal text-slate-300">
                    ({shelf.badgeText})
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Kondisi & Status Kematangan:</span>
                <p className="text-emerald-300 font-semibold mt-0.5">
                  {shelf.secondaryText}
                </p>
              </div>

              <div className="pt-1.5 border-t border-white/10">
                <span className="text-slate-400 font-medium block">Saran Penyimpanan:</span>
                <p className="text-slate-200 leading-relaxed mt-0.5 text-[11px]">
                  {actionRecommendation}
                </p>
              </div>
            </div>
          </div>

          {/* Card: Sensor Lingkungan Ruangan */}
          {(() => {
            const hasTemp = result.gas_summary?.temperature != null && Number(result.gas_summary.temperature) > 0;
            const hasHum = result.gas_summary?.humidity != null && Number(result.gas_summary.humidity) > 0;
            const hasCh4 = result.gas_summary?.ch4_ppm != null && Number(result.gas_summary.ch4_ppm) > 0;
            const hasAqi = result.gas_summary?.aqi_ppm != null && Number(result.gas_summary.aqi_ppm) > 0;
            const hasAnyIot = hasTemp || hasHum || hasCh4 || hasAqi;

            return (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-bold text-slate-800">
                    Kondisi Ruang Penyimpanan
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    hasAnyIot
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : 'text-slate-500 bg-slate-100 border-slate-200'
                  }`}>
                    {hasAnyIot ? '✓ Sensor IoT Aktif (Data Real)' : 'Sensor IoT Belum Ada Data'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-blue-600" /> Suhu Ruang
                    </span>
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 block">
                      {hasTemp ? `${Number(result.gas_summary.temperature).toFixed(1)} °C` : '-'}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Wind className="w-3 h-3 text-cyan-600" /> Kelembaban
                    </span>
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 block">
                      {hasHum ? `${Number(result.gas_summary.humidity).toFixed(0)} %` : '-'}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" /> Gas Metana
                    </span>
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 block">
                      {hasCh4 ? `${Number(result.gas_summary.ch4_ppm).toFixed(2)} ppm` : '-'}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Leaf className="w-3 h-3 text-amber-600" /> Kualitas Udara
                    </span>
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 block">
                      {hasAqi ? `${Math.round(Number(result.gas_summary.aqi_ppm))} AQI` : '-'}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Card: Pemanfaatan & Resep */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2.5">
            <span className="text-xs font-bold text-slate-800 block">
              Pilihan Olahan Pangan Ramah Lingkungan
            </span>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
              <div className="flex items-start space-x-3">
                <img
                  src={currentRec.image_url}
                  alt={currentRec.title}
                  className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                    {currentRec.title}
                  </h5>
                  <p className="text-[11px] text-slate-500 leading-snug mt-1 line-clamp-2">
                    {currentRec.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenRecipeModal(currentRec)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl transition cursor-pointer text-xs flex items-center justify-center space-x-1.5 shadow-2xs"
              >
                <span>Lihat Panduan Resep Olahan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
