/**
 * CirculSense AI - Display Formatting Helper
 * Menyesuaikan keluaran sisa umur simpan dan skor kesegaran dengan model ML terpadu:
 * - Tidak memaksakan format 'hari' jika durasi pendek/kritis (misal < 24 jam / lewat matang -> jam).
 * - Tidak memaksakan simbol '%' yang kaku jika model menggunakan skor desimal [0.0 - 1.0].
 * - Memberikan bahasa manusiawi yang presisi untuk buah Mentah (pemeraman), Prima (daya tahan),
 *   Overripe (jam batas konsumsi), dan Busuk (0 jam / afkir).
 */

export interface ShelfLifeFormatted {
  badgeText: string;
  primaryText: string;
  secondaryText: string;
  stageLabel: string;
  badgeClass: string;
  timeUnit: 'jam' | 'hari';
  hours: number;
  days: number;
  isUrgent: boolean;
}

export interface ScoreFormatted {
  decimalScore: string;    // e.g. "0.80", "0.85"
  percentScore: number;    // e.g. 80, 85
  badgeLabel: string;      // e.g. "Prima", "Mentah", "Lewat Matang", "Busuk"
  qualityLevel: string;    // e.g. "Sangat Segar", "Segar Standar", "Lewat Matang", "Afkir"
  badgeBg: string;         // tailwind bg/border classes
  scoreColor: string;      // tailwind text color
  description: string;
}

/**
 * Normalisasi skor kesegaran ke format desimal [0.00 - 1.00] dan integer persen [0 - 100]
 */
export function normalizeScoreValues(rawScore: any): { decimal: number; percent: number; decimalStr: string } {
  if (rawScore == null || isNaN(Number(rawScore))) {
    return { decimal: 0.80, percent: 80, decimalStr: '0.80' };
  }

  const num = Number(rawScore);
  let dec = 0.80;

  if (num > 5.0) {
    // Diasumsikan dalam skala 0 - 100
    dec = Math.max(0.0, Math.min(1.0, num / 100.0));
  } else if (num > 1.0) {
    // Diasumsikan dalam skala 1 - 5
    dec = Math.max(0.0, Math.min(1.0, num / 5.0));
  } else {
    // Skala desimal murni [0.0 - 1.0] dari ML
    dec = Math.max(0.0, Math.min(1.0, num));
  }

  const pct = Math.round(dec * 100);
  return {
    decimal: Number(dec.toFixed(2)),
    percent: pct,
    decimalStr: dec.toFixed(2)
  };
}

/**
 * Format Skor Kesegaran untuk tampilan manusia yang ramah,
 * menampilkan nilai desimal ML tanpa memaksa '%' mentah yang ambigu.
 */
export function formatFreshnessScoreHuman(rawScore: any, status?: string, gradeLabel?: string): ScoreFormatted {
  const { decimal, percent, decimalStr } = normalizeScoreValues(rawScore);
  const gradeLower = (gradeLabel || status || '').toLowerCase();

  const isRotten = gradeLower.includes('busuk') || gradeLower.includes('rotten') || decimal < 0.20;
  const isOverripe = !isRotten && (gradeLower.includes('overripe') || gradeLower.includes('lewat') || decimal < 0.40);
  const isUnripe = !isRotten && !isOverripe && (gradeLower.includes('unripe') || gradeLower.includes('mentah'));
  const isSemiripe = !isRotten && !isOverripe && (gradeLower.includes('semiripe') || gradeLower.includes('setengah'));

  if (isRotten) {
    return {
      decimalScore: decimalStr,
      percentScore: percent,
      badgeLabel: 'Busuk',
      qualityLevel: 'Tidak Layak Konsumsi',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
      scoreColor: 'text-red-600',
      description: 'Kondisi rusak akibat infeksi jamur atau dekomposisi aktif. Wajib segera diafkir.'
    };
  }

  if (isOverripe) {
    return {
      decimalScore: decimalStr,
      percentScore: percent,
      badgeLabel: 'Lewat Matang',
      qualityLevel: 'Batas Akhir Konsumsi',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      scoreColor: 'text-amber-600',
      description: 'Daging buah sangat lunak. Direkomendasikan segera diolah menjadi selai/jus hari ini.'
    };
  }

  if (isUnripe) {
    return {
      decimalScore: decimalStr,
      percentScore: percent,
      badgeLabel: 'Mentah',
      qualityLevel: 'Perlu Pemeraman Alami',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      scoreColor: 'text-blue-600',
      description: 'Kondisi fisiologis segar petik dini. Butuh waktu pemeraman alami sebelum siap saji.'
    };
  }

  if (isSemiripe) {
    return {
      decimalScore: decimalStr,
      percentScore: percent,
      badgeLabel: '1/2 Matang',
      qualityLevel: 'Fase Distribusi Optimal',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      scoreColor: 'text-amber-700',
      description: 'Tekstur kokoh tahan guncangan pengiriman. Matang optimal dalam 1-2 hari.'
    };
  }

  // Fullripe / Prima
  return {
    decimalScore: decimalStr,
    percentScore: percent,
    badgeLabel: 'Prima',
    qualityLevel: 'Kualitas Rasa Puncak',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    scoreColor: 'text-emerald-700',
    description: 'Tingkat kematangan optimal siap dinikmati langsung atau dipajang di etalase utama.'
  };
}

/**
 * Format Sisa Umur Simpan (Shelf-Life) sesuai karakteristik biologis ML strawberry:
 * - Jika < 24 jam atau Overripe: gunakan satuan JAM (misal: "Sisa ± 18 Jam"), jangan paksakan "0.7 hari".
 * - Jika Mentah (Unripe): tampilkan kebutuhan pemeraman (misal: "Perlu Diperam ± 3.5 Hari"), bukan malah menakut-nakuti pembusukan.
 * - Jika Setengah Matang: tampilkan "Matang dalam ± 1.5 Hari".
 * - Jika Busuk: tampilkan "Afkir / 0 Jam".
 * - Jika Prima: tampilkan hari dan jam secara proporsional.
 */
export function formatShelfLifeHuman(params: {
  daysSpoil?: number | null;
  hoursSpoil?: number | null;
  daysMature?: number | null;
  hoursMature?: number | null;
  gradeLabel?: string | null;
  status?: string | null;
}): ShelfLifeFormatted {
  const gradeStr = (params.gradeLabel || params.status || '').toLowerCase();

  const isRotten = gradeStr.includes('busuk') || gradeStr.includes('rotten') || params.status === 'Busuk';
  const isOverripe = !isRotten && (gradeStr.includes('overripe') || gradeStr.includes('lewat') || gradeStr.includes('menua') || params.status === 'Terlalu Matang');
  const isUnripe = !isRotten && !isOverripe && (gradeStr.includes('unripe') || gradeStr.includes('mentah'));
  const isSemiripe = !isRotten && !isOverripe && (gradeStr.includes('semiripe') || gradeStr.includes('setengah') || gradeStr.includes('1/2'));

  const rawDaysSpoil = params.daysSpoil != null ? Number(params.daysSpoil) : (params.hoursSpoil != null ? Number((params.hoursSpoil / 24).toFixed(1)) : 3.5);
  const rawHoursSpoil = params.hoursSpoil != null ? Math.round(Number(params.hoursSpoil)) : Math.round(rawDaysSpoil * 24);

  const rawDaysMature = params.daysMature != null ? Number(params.daysMature) : (params.hoursMature != null ? Number((params.hoursMature / 24).toFixed(1)) : (isUnripe ? 3.5 : isSemiripe ? 1.5 : 0.0));
  const rawHoursMature = params.hoursMature != null ? Math.round(Number(params.hoursMature)) : Math.round(rawDaysMature * 24);

  // 1. KASUS BUSUK / RUSAK
  if (isRotten || rawHoursSpoil <= 0 || rawDaysSpoil <= 0) {
    return {
      badgeText: 'Afkir (0 Jam)',
      primaryText: '0 Jam (Tidak Layak Konsumsi)',
      secondaryText: 'Kondisi rusak / busuk. Segera pisahkan agar spora jamur tidak menular.',
      stageLabel: 'Afkir Segera',
      badgeClass: 'text-red-800 bg-red-50 border-red-200',
      timeUnit: 'jam',
      hours: 0,
      days: 0,
      isUrgent: true
    };
  }

  // 2. KASUS OVERRIPE / SISA WAKTU SINGKAT (< 24 JAM)
  // JANGAN PAKSAKAN DALAM HARI! Gunakan satuan jam yang riil dan dapat dipahami.
  if (isOverripe || rawHoursSpoil < 24 || rawDaysSpoil < 1.0) {
    const hoursEffective = Math.max(6, Math.min(24, rawHoursSpoil > 0 ? rawHoursSpoil : 18));
    return {
      badgeText: `Sisa ± ${hoursEffective} Jam`,
      primaryText: `Sisa ± ${hoursEffective} Jam (Suhu Ruang)`,
      secondaryText: 'Puncak kematangan telah lewat. Segera konsumsi atau olah jadi selai/jus hari ini.',
      stageLabel: 'Segera Habiskan Hari Ini',
      badgeClass: 'text-amber-900 bg-amber-50 border-amber-300',
      timeUnit: 'jam',
      hours: hoursEffective,
      days: Number((hoursEffective / 24).toFixed(1)),
      isUrgent: true
    };
  }

  // 3. KASUS BUAH MENTAH (UNRIPE)
  // Konsumen butuh tahu kapan buah ini matang, bukan kapan ia membusuk!
  if (isUnripe) {
    const matureDays = rawDaysMature > 0 ? rawDaysMature : 3.5;
    const totalDays = Math.max(matureDays + 3.0, rawDaysSpoil);
    return {
      badgeText: `Perlu Diperam ± ${matureDays.toFixed(1)} Hari`,
      primaryText: `Perlu Pemeraman ± ${matureDays.toFixed(1)} Hari Lagi`,
      secondaryText: `Petik dini (mengkal). Matang optimal dalam ± ${matureDays.toFixed(1)} hari, daya tahan total ± ${totalDays.toFixed(1)} hari.`,
      stageLabel: 'Pemeraman Alami',
      badgeClass: 'text-blue-800 bg-blue-50 border-blue-200',
      timeUnit: 'hari',
      hours: rawHoursMature,
      days: matureDays,
      isUrgent: false
    };
  }

  // 4. KASUS BUAH SETENGAH MATANG (SEMIRIPE)
  if (isSemiripe) {
    const matureDays = rawDaysMature > 0 ? rawDaysMature : 1.5;
    return {
      badgeText: `Matang ± ${matureDays.toFixed(1)} Hari`,
      primaryText: `Matang Optimal dalam ± ${matureDays.toFixed(1)} Hari`,
      secondaryText: `Fase distribusi ideal (kokoh). Siap dipajang etalase saat semburat merah merata (± ${rawDaysSpoil.toFixed(1)} hari masa simpan).`,
      stageLabel: 'Logistik & Pemeraman',
      badgeClass: 'text-amber-800 bg-amber-50 border-amber-200',
      timeUnit: 'hari',
      hours: rawHoursMature,
      days: matureDays,
      isUrgent: false
    };
  }

  // 5. KASUS BUAH MATANG SEMPURNA (FULLRIPE / PRIMA)
  const displayDays = Math.max(1.0, rawDaysSpoil);
  const displayHours = rawHoursSpoil > 0 ? rawHoursSpoil : Math.round(displayDays * 24);
  return {
    badgeText: `± ${displayDays.toFixed(1)} Hari Lagi (${displayHours} Jam)`,
    primaryText: `± ${displayDays.toFixed(1)} Hari Lagi`,
    secondaryText: `± ${displayHours} Jam pada suhu ruang. Simpan di chiller (4°C) untuk kesegaran lebih lama.`,
    stageLabel: 'Kondisi Prima Siap Makan',
    badgeClass: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    timeUnit: 'hari',
    hours: displayHours,
    days: displayDays,
    isUrgent: false
  };
}
