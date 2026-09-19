import React from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Coins,
  Store,
  Tag,
  Palette,
  Thermometer,
  Leaf,
  Sparkles,
  Wind,
  ChevronRight
} from 'lucide-react';
import { FusionResult, UpcyclingRecommendation } from '@/types/circulsense';

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
  const currentRec: UpcyclingRecommendation = result.recommendation;
  const shelfLife = result.shelf_life;
  const hoursLeft = shelfLife.hours_remaining;
  const daysLeft = shelfLife.days_remaining;

  // Status Urgensi Sisa Waktu Simpan
  const getUrgencyBadge = () => {
    switch (shelfLife.urgency_level) {
      case 'Aman':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          indicator: 'bg-emerald-500',
          title: 'Stok Tahan Lama (Aman)'
        };
      case 'Perhatian':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          indicator: 'bg-amber-500',
          title: 'Siap Jual Ritel (Perhatian)'
        };
      case 'Kritis':
        return {
          bg: 'bg-orange-50 text-orange-800 border-orange-200',
          indicator: 'bg-orange-500',
          title: 'Fase Kritis (Segera Jual)'
        };
      case 'Kedaluwarsa':
      default:
        return {
          bg: 'bg-red-50 text-red-800 border-red-200',
          indicator: 'bg-red-500',
          title: 'Lewat Masa Segar'
        };
    }
  };

  const urgency = getUrgencyBadge();

  // Penerjemah fase kematangan ramah manusia
  const getRipenessInfo = () => {
    const stage = (shelfLife.ripeness_stage || '').toLowerCase();
    const timeToRipe = shelfLife.time_to_mature_hours;

    if (stage.includes('unripe') || stage.includes('mentah')) {
      return {
        label: 'Mentah (Warna Hijau)',
        desc: timeToRipe && timeToRipe > 0
          ? `Perlu sekitar ${timeToRipe} jam di suhu ruang untuk merah optimal.`
          : 'Stok sangat awet, cocok disimpan lebih lama di tempat sejuk.'
      };
    }
    if (stage.includes('semi') || stage.includes('setengah')) {
      return {
        label: 'Setengah Matang (Semburat Merah)',
        desc: timeToRipe && timeToRipe > 0
          ? `Perlu sekitar ${timeToRipe} jam menuju kematangan penuh.`
          : 'Bagus untuk pengiriman jarak jauh atau pajangan bertahap.'
      };
    }
    if (stage.includes('over') || stage.includes('lewat')) {
      return {
        label: 'Sangat Matang (Lunak)',
        desc: 'Buah sangat manis namun lunak. Prioritaskan untuk konsumsi hari ini atau diolah.'
      };
    }
    return {
      label: 'Matang Sempurna (Merah Segar)',
      desc: 'Warna dan rasa berada di puncak terbaik untuk dijual di etalase utama.'
    };
  };

  const ripenessInfo = getRipenessInfo();

  // Penerjemah kondisi penyakit ramah manusia
  const getDiseaseInfo = () => {
    const disease = (shelfLife.disease_detected || '').toLowerCase();

    if (disease.includes('gray') || disease.includes('mold') || disease.includes('busuk')) {
      return {
        title: 'Kapang Abu-Abu (Jamur Stroberi)',
        desc: 'Terdeteksi tanda jamur halus. Segera pisahkan buah ini agar tidak menular ke stroberi lain.',
        isDanger: true
      };
    }
    if (disease.includes('black') || disease.includes('spot')) {
      return {
        title: 'Bercak Gelap Permukaan',
        desc: 'Ada bintik penurunan kualitas pada kulit buah. Segera jual cepat atau sortir.',
        isDanger: true
      };
    }
    if (disease.includes('mildew')) {
      return {
        title: 'Embun Jamur Tipis',
        desc: 'Terlihat lapisan jamur tipis. Bersihkan dan jangan disimpan di tempat lembab.',
        isDanger: true
      };
    }
    if (disease.includes('overripe')) {
      return {
        title: 'Pelunakan Dinding Sel',
        desc: 'Buah terlalu ranum dan mulai melunak akibat kematangan alami.',
        isDanger: false
      };
    }
    return {
      title: 'Segar & Bebas Penyakit',
      desc: 'Permukaan buah bersih, sehat, dan tidak terdeteksi gejala jamur.',
      isDanger: false
    };
  };

  const diseaseInfo = getDiseaseInfo();

  return (
    <div className="space-y-5 pb-16 pt-2">
      {/* 1. HEADER & NAVIGASI KEMBALI */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Waktu Pindai: {result.scan_time}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 leading-tight">
            Hasil Pemeriksaan Kualitas & Masa Simpan Buah
          </h2>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl transition cursor-pointer border border-emerald-200 w-full sm:w-auto shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Pindai Sampel Lain</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================
            KOLOM KIRI: STATUS BUAH, SISA MASA SIMPAN & KONDISI LINGKUNGAN
        ======================================================== */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card Utama: Info Buah & Estimasi Waktu */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
            {/* Foto & Identitas Buah */}
            <div className="flex items-center space-x-3.5">
              <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
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
                    title="Deteksi Visual Cerdas"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Komoditas Terpindai
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight truncate">
                  {result.item_name}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${urgency.bg}`}>
                    {urgency.title}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    Jumlah: {result.saved_weight_kg} kg
                  </span>
                </div>
              </div>
            </div>

            {/* Kotak Hitung Mundur Sisa Waktu Simpan */}
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden">
              <div className="absolute right-2 top-2 opacity-10 pointer-events-none">
                <Clock className="w-24 h-24 text-white" />
              </div>

              <div className="relative z-10 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Sisa Masa Segar Buah:</span>
                  </span>
                  {shelfLife.time_to_mature_hours != null && shelfLife.time_to_mature_hours > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Menuju Matang: ±{shelfLife.time_to_mature_hours} Jam
                    </span>
                  )}
                </div>

                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    {hoursLeft > 0 ? `${hoursLeft} Jam` : '0 Jam'}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-300">
                    (sekitar {daysLeft} Hari)
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                  {result.status_summary}
                </p>

                {/* Indikator Bar Masa Simpan */}
                <div className="pt-3 border-t border-white/10 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span className="text-emerald-400">Tahan Lama (&gt; 3 Hari)</span>
                    <span className="text-amber-300">Siap Ritel (1-2 Hari)</span>
                    <span className="text-rose-400">Segera Habiskan (&lt; 24 Jam)</span>
                  </div>
                  <div className="relative w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        hoursLeft >= 72
                          ? 'bg-emerald-500'
                          : hoursLeft >= 36
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(8, (hoursLeft / 120) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2 Indikator: Fase Kematangan & Kondisi Fisik Buah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Kematangan */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                  Tingkat Kematangan:
                </span>
                <strong className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                  {ripenessInfo.label}
                </strong>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  {ripenessInfo.desc}
                </p>
              </div>

              {/* Kondisi Fisik / Penyakit */}
              <div
                className={`p-3.5 rounded-xl border ${
                  diseaseInfo.isDanger
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                  Kondisi Fisik Buah:
                </span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  {diseaseInfo.isDanger ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <strong
                    className={`text-sm font-extrabold truncate ${
                      diseaseInfo.isDanger ? 'text-rose-700' : 'text-slate-900'
                    }`}
                  >
                    {diseaseInfo.title}
                  </strong>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  {diseaseInfo.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Card Ringkasan Sensor Kotak Simpan (Bersih, Praktis, Ramah Manusia) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Pemeriksaan Kondisi Kotak Simpan
              </span>
              <span className="text-xs text-emerald-700 bg-emerald-50 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Lingkungan Terpantau
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Suhu & Kelembaban */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-1.5 text-blue-700">
                    <Thermometer className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold">Suhu Ruang</span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">
                    {result.gas_summary.temperature && result.gas_summary.temperature > 0
                      ? `${result.gas_summary.temperature.toFixed(1)}°C`
                      : '25°C (Stabil)'}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {result.gas_summary.humidity && result.gas_summary.humidity > 0
                    ? `Kelembaban: ${result.gas_summary.humidity.toFixed(0)}%`
                    : 'Kelembaban normal'}
                </span>
              </div>

              {/* Deteksi Gas Pembusukan */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-1.5 text-emerald-700">
                    <Wind className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold">Kualitas Udara</span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">
                    {result.gas_summary.ch4_status === 'Tinggi' ? 'Ada Gas Busuk' : 'Segar & Bersih'}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Bebas aroma fermentasi
                </span>
              </div>

              {/* Warna Buah */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-1.5 text-amber-700">
                    <Palette className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold">Warna Buah</span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">
                    {shelfLife.color_validation.consistency_status || 'Sesuai'}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Sesuai visual kamera
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            KOLOM KANAN: AKSI PENJUALAN, NILAI TAMBAH & PANDUAN OLAHAN
        ======================================================== */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card Rekomendasi Aksi & Strategi Penjualan */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Langkah Praktis Hari Ini
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 mt-1.5 leading-tight">
                Rekomendasi Pengelolaan & Penjualan Stok
              </h3>
            </div>

            {/* Kotak Aksi Utama */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-300 space-y-2.5">
              <div className="flex items-center space-x-2 text-emerald-900">
                <Store className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Tindakan Stok Disarankan:</span>
              </div>

              <div className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {shelfLife.inventory_action}
              </div>

              <div className="flex items-center space-x-2 pt-0.5">
                <Tag className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-xs font-bold text-slate-800">
                  Strategi Harga: <span className="text-emerald-800 underline font-extrabold">{shelfLife.pricing_strategy}</span>
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-emerald-200">
                {hoursLeft >= 48
                  ? 'Kondisi buah sangat baik. Tempatkan pada etalase utama atau simpan di pendingin untuk mendapatkan harga jual optimal.'
                  : hoursLeft >= 18
                  ? 'Masa simpan terbatas (1-2 hari). Utamakan penjualan hari ini dengan diskon menarik agar stok lekas laku tanpa kerugian.'
                  : 'Buah mulai sangat matang. Segera jual borongan dengan harga khusus atau alihkan untuk diolah menjadi selai/jus segar.'}
              </p>
            </div>

            {/* Estimasi Penyelamatan Modal & Pangan (Disatukan Rapi) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Nilai Penyelamatan Modal & Pangan</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block">Estimasi Modal Terselamatkan:</span>
                  <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                    Rp {result.financial_savings_idr.toLocaleString('id-ID')}
                  </div>
                  <span className="text-xs text-slate-500">
                    Berdasarkan {result.saved_weight_kg} kg buah
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block">Pencegahan Sampah Pangan:</span>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {result.saved_weight_kg} kg
                  </div>
                  <span className="text-xs text-slate-500">
                    Mencegah pembusukan sia-sia
                  </span>
                </div>
              </div>

              {/* Dampak Emisi Ramah Manusia (Tanpa Simbol Latex $CH_4$) */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center space-x-1">
                  <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Gas Pembusukan (Metana) Dicegah:</span>
                </span>
                <strong className="font-extrabold text-emerald-700">
                  {result.prevented_ch4_g} gram
                </strong>
              </div>
            </div>
          </div>

          {/* Card Panduan Resep Olahan (Upcycling) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Pilihan Olahan Bila Stok Belum Habis
            </span>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
              <div className="flex items-start space-x-3">
                <img
                  src={currentRec.image_url}
                  alt={currentRec.title}
                  className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-slate-900 text-sm leading-snug">
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
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition cursor-pointer text-xs flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <span>Lihat Cara & Langkah Olahan</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
