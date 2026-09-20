import { 
  GasData, 
  VisualData, 
  FusionResult, 
  UpcyclingRecommendation, 
  FreshnessStatus,
  RipenessStage,
  DiseaseStatus,
  InventoryAction,
  PricingAction,
  ColorValidationDetail,
  ShelfLifeDetail
} from '@/types/circulsense';

// Katalog Rekomendasi Penyelamatan Khusus Buah Stroberi
export const RECIPE_CATALOG: Record<string, { layu: UpcyclingRecommendation; segar: UpcyclingRecommendation; busuk: UpcyclingRecommendation }> = {
  Stroberi: {
    layu: {
      id: 'rec_strawberry_jam',
      type: 'Pengolahan UMKM',
      title: 'Selai Stroberi Homemade (Artisan Strawberry Jam)',
      subtitle: 'Selamatkan stok stroberi yang mulai lembek menjadi selai premium bernilai jual tinggi.',
      prep_time: '30 menit',
      difficulty: 'Mudah',
      description: 'Stroberi yang memasuki fase lewat matang (overripe) memiliki kadar gula fruktosa dan aroma pektin paling kuat. Sangat optimal dimasak menjadi selai artisan atau compote kue daripada dibuang menjadi sampah.',
      ingredients: [
        '1 kg Stroberi Layu / Terlalu Matang',
        '350g Gula Pasir (bisa disesuaikan)',
        '2 sdm Air Perasan Lemon / Jeruk Nipis (pengawet asam alami & pektin booster)',
        '1/4 sdt Garam Halus'
      ],
      steps: [
        'Cuci cepat stroberi dengan air mengalir dingin, buang daun kelopak hijau dan bagian yang terlalu lembek.',
        'Potong stroberi menjadi 2 atau 4 bagian, masukkan ke dalam panci anti-lengket bersama gula pasir.',
        'Diamkan 10 menit hingga air alami stroberi keluar (maceration).',
        'Masak dengan api sedang sambil diaduk perlahan dan hancurkan buah menggunakan sendok kayu.',
        'Tambahkan air perasan lemon, kecilkan api dan aduk selama 20 menit hingga mengental dan berbuih pekat.',
        'Uji kekentalan di atas piring dingin. Tuang selai panas ke dalam jar kaca steril, tutup rapat dan simpan (tahan hingga 3 bulan).'
      ],
      tips: 'Jual selai ini sebagai produk olahan bernilai tambah Rp 35.000 - Rp 50.000 per toples kepada pelanggan toko.',
      image_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80'
    },
    segar: {
      id: 'rec_strawberry_fresh_retail',
      type: 'Pengolahan UMKM',
      title: 'Display Etalase Premium & Paket Stroberi Segar',
      subtitle: 'Kualitas Grade A: Tahan 3-5 hari ke depan pada suhu etalase sejuk.',
      prep_time: '10 menit',
      difficulty: 'Mudah',
      description: 'Stroberi padat berwarna merah menyala dengan kelopak hijau segar. Segera tata di rak etalase depan dengan ventilasi udara baik, atau kemas dalam mika berlubang untuk menjaga harga jual maksimal.',
      ingredients: [
        'Stroberi Segar Grade A',
        'Wadah mika berlubang (ventilasi respirasi)',
        'Bantalan busa / jaring buah pengaman memar'
      ],
      steps: [
        'Pilah stroberi dan pastikan tidak ada buah yang lembek berdempetan.',
        'Keringkan dari embun berlebih sebelum masuk ke etalase.',
        'Atur dengan tangkai menghadap ke bawah dalam satu lapis (hindari tumpukan lebih dari 2 lapis).',
        'Pertahankan display pada suhu sejuk 15-20°C untuk memperpanjang daya pikat pelanggan.'
      ],
      tips: 'Jual dengan harga ritel penuh (Rp 70.000 - Rp 90.000/kg) untuk memaksimalkan margin keuntungan.',
      image_url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80'
    },
    busuk: {
      id: 'rec_strawberry_compost',
      type: 'Kompos',
      title: 'Kompos Organik & Bio-Enzim Asam Buah',
      subtitle: 'Konversi stroberi berjamur / busuk menjadi pupuk booster tanaman tinggi kalium.',
      prep_time: '15 menit',
      difficulty: 'Mudah',
      description: 'Stroberi yang telah terinfeksi kapang abu-abu (Botrytis / Gray Mold) dan mengeluarkan emisi gas metana tidak aman dijual. Segera pisahkan dan masukkan ke komposter aerobik atau botol eco-enzyme untuk mencegah kontaminasi silang ke stok lain.',
      ingredients: [
        'Stroberi busuk berjamur (sumber glukosa & nitrogen)',
        'Materi cokelat kering (serbuk kayu / sekam / daun kering)',
        'Molase / Gula merah dan bio-aktivator EM4'
      ],
      steps: [
        'Segera isolasi dari keranjang dagangan agar spora jamur tidak menulari buah segar lainnya.',
        'Cacah stroberi dan masukkan ke wadah komposter bersama sekam/serbuk kayu.',
        'Atau masukkan ke dalam galon dengan rasio 1 bagian gula merah : 3 bagian stroberi : 10 bagian air untuk eco enzyme pembersih organik.'
      ],
      tips: 'Tindakan cepat ini memutus sumber emisi gas metana di pasar dan mensterilkan kios dari spora jamur.',
      image_url: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80'
    }
  }
};

/**
 * Validasi Kroma Sensor Spektral TCS34725 terhadap Deteksi Kamera
 * Tanpa data dummy: Jika sensor belum terhubung / bernilai 0, laporkan status tanpa data.
 */
export function validateColorSensor(gas: GasData, visualScore: number): ColorValidationDetail {
  const r = gas.color_r ?? 0;
  const g = gas.color_g ?? 0;
  const b = gas.color_b ?? 0;
  const lux = gas.color_lux ?? 0;
  const colorTemp = gas.color_temp ?? 0;
  const hex = gas.color_hex || '#000000';
  const colorName = gas.color_name || 'Belum Ada Data Sensor';

  // Jika data sensor fisik belum ada (bernilai 0)
  if (r === 0 && g === 0 && b === 0) {
    return {
      sensor_hex: hex,
      sensor_name: colorName,
      red_ratio: 0,
      lux: 0,
      color_temp_kelvin: 0,
      consistency_status: 'Belum Ada Data Sensor',
      message: 'Sensor warna fisik TCS34725 belum mengirimkan data (nilai 0). Sistem mengandalkan deteksi visual kamera.'
    };
  }

  const totalRgb = r + g + b + 0.001;
  const redRatio = Number((r / totalRgb).toFixed(3));

  let consistencyStatus: 'Sangat Konsisten' | 'Tervalidasi (Pencahayaan Redup Terkoreksi)' | 'Peringatan Anomali Warna' | 'Belum Ada Data Sensor' = 'Sangat Konsisten';
  let message = 'Spektrum warna sensor fisik mengonfirmasi hasil visual kamera secara presisi.';

  if (redRatio >= 0.52 && visualScore <= 2 && lux < 250 && lux > 0) {
    consistencyStatus = 'Tervalidasi (Pencahayaan Redup Terkoreksi)';
    message = `Sensor TCS34725 membaca pigmen merah pekat (${(redRatio * 100).toFixed(0)}%), mengoreksi kamera yang meredup akibat bayangan di kios.`;
  } else if (redRatio < 0.40 && visualScore >= 4) {
    consistencyStatus = 'Peringatan Anomali Warna';
    message = 'Kamera mendeteksi warna cerah akibat silau lampu, namun TCS34725 mendeteksi dominasi kehijauan/pucat (buah masih muda).';
  } else if (redRatio >= 0.48) {
    consistencyStatus = 'Sangat Konsisten';
    message = `Kanal kroma merah spektral (${(redRatio * 100).toFixed(0)}%) valid dan konsisten dengan tingkat kematangan visual kamera.`;
  }

  return {
    sensor_hex: hex,
    sensor_name: colorName,
    red_ratio: redRatio,
    lux,
    color_temp_kelvin: colorTemp,
    consistency_status: consistencyStatus,
    message
  };
}

/**
 * Sensor Fusion Engine:
 * Menghitung Prediksi Sisa Umur Simpan (Shelf-Life), Indikator Kematangan, Deteksi Penyakit,
 * dan Rekomendasi Manajemen Stok Cerdas Pedagang untuk Buah Stroberi.
 * Menggunakan nilai 0 jika data IoT belum tersedia (tidak menggunakan data dummy).
 */
export function runSensorFusion(visual: VisualData, gas: GasData): FusionResult {
  const foodName = 'Stroberi';

  // Pembacaan sensor fisik murni tanpa data dummy (nilai 0 jika belum ada data)
  const ch4 = gas.ch4_ppm ?? 0;
  const aqi = gas.aqi_ppm ?? 0;
  const temp = gas.temperature ?? 0; // °C
  const rh = gas.humidity ?? 0;     // %

  // 1. Validasi Kroma Warna Sensor Fisik TCS34725
  const colorVal = validateColorSensor(gas, visual.visual_score);

  // 2. Koreksi Skor Visual Berdasarkan Validasi Sensor Warna (Hanya jika ada data fisik)
  let adjustedVisualScore = visual.visual_score;
  if (colorVal.consistency_status === 'Tervalidasi (Pencahayaan Redup Terkoreksi)' && adjustedVisualScore < 3) {
    adjustedVisualScore = 3;
  } else if (colorVal.consistency_status === 'Peringatan Anomali Warna' && adjustedVisualScore > 3) {
    adjustedVisualScore = 2;
  }

  // 3. Stres Mikroklimat DHT22 (Arrhenius Q10 = 2.1 berbasis suhu ideal simpan 20°C)
  const effectiveTemp = temp > 0 ? Math.max(5.0, Math.min(45.0, temp)) : 27.0;
  const tempStressFactor = Math.pow(2.1, (effectiveTemp - 20.0) / 10.0);
  const rhStressFactor = rh > 75.0 ? 1.0 + (rh - 75.0) * 0.015 : 1.0;
  const environmentalStressFactor = Number((tempStressFactor * rhStressFactor).toFixed(2));

  // 4. Deteksi Peringatan Dini Gas Biokimia (MQ-4 & MQ-135)
  // Menghindari false alarm pada udara ruangan normal (MQ-135 normal: 350-800 ppm)
  const hasGasSpike = (ch4 >= 15.0 && ch4 > 0) || (aqi >= 1000.0 && aqi > 0);
  const isSeverelySpoiled = (ch4 >= 50.0 && ch4 > 0) || (aqi >= 1500.0 && aqi > 0);

  // 5. Penentuan Fase Kematangan (Ripeness Stage) & Deteksi Penyakit (5 Kelas Arsitektur Baru)
  let ripenessStage: RipenessStage = 'Fullripe (Matang Optimal)';
  let diseaseDetected: DiseaseStatus = 'Normal (Bebas Jamur)';

  const defectStr = visual.defects.join(' ').toLowerCase();

  if (defectStr.includes('gray_mold') || defectStr.includes('kapang') || isSeverelySpoiled) {
    diseaseDetected = 'Risiko Gray Mold (Botrytis)';
    ripenessStage = 'Overripe (Lewat Matang)';
  } else if (defectStr.includes('black_spot') || defectStr.includes('bintik')) {
    diseaseDetected = 'Black Spot';
    ripenessStage = 'Overripe (Lewat Matang)';
  } else if (defectStr.includes('powdery_mildew') || defectStr.includes('embun tepung')) {
    diseaseDetected = 'Powdery Mildew';
  } else if (defectStr.includes('overripe') || hasGasSpike) {
    diseaseDetected = 'Overripe (Lewat Matang)';
    ripenessStage = 'Overripe (Lewat Matang)';
  } else if (defectStr.includes('hijau') || defectStr.includes('unripe')) {
    ripenessStage = 'Unripe (Mentah)';
  } else if (defectStr.includes('oranye') || defectStr.includes('semiripe') || defectStr.includes('setengah')) {
    ripenessStage = 'Semiripe (Setengah Matang)';
  } else {
    ripenessStage = 'Fullripe (Matang Optimal)';
  }

  // 6. Komputasi Prediksi Sisa Umur Simpan (Shelf-Life in Hours & Days via Multimodal Kinetics)
  const baseSpoilageDays: Record<RipenessStage, number> = {
    'Unripe (Mentah)': 10.0,
    'Semiripe (Setengah Matang)': 7.0,
    'Fullripe (Matang Optimal)': 4.5,
    'Overripe (Lewat Matang)': 1.0
  };

  const diseaseImpactFactors: Record<string, number> = {
    'Normal (Bebas Jamur)': 1.0,
    'Normal': 1.0,
    'Powdery Mildew': 0.4,
    'Powdery_Mildew': 0.4,
    'Black Spot': 0.15,
    'Black_Spot': 0.15,
    'Overripe (Lewat Matang)': 0.25,
    'Overripe': 0.25,
    'Risiko Gray Mold (Botrytis)': 0.05,
    'Gray_Mold': 0.05
  };

  const baseDays = baseSpoilageDays[ripenessStage] || 4.5;
  const diseaseFactor = diseaseImpactFactors[diseaseDetected] ?? 1.0;

  let calculatedDays = (baseDays * diseaseFactor) / environmentalStressFactor;
  if (diseaseDetected === 'Risiko Gray Mold (Botrytis)' || isSeverelySpoiled) {
    calculatedDays = Math.min(calculatedDays, 0.2);
  }

  const daysRemaining = Number(Math.max(0.0, calculatedDays).toFixed(1));
  const effectiveHours = Math.max(0, Math.round(daysRemaining * 24.0));
  const timeToMatureHours = ripenessStage === 'Unripe (Mentah)' ? 48 : (ripenessStage === 'Semiripe (Setengah Matang)' ? 24 : 0);

  // 7. Keputusan Status & Badge Kesegaran
  let status: FreshnessStatus = 'Layu';
  let badgeColor: 'green' | 'yellow' | 'red' = 'yellow';
  let calculatedScore = 3;
  let statusSummary = '';

  if (diseaseDetected === 'Risiko Gray Mold (Botrytis)' || daysRemaining < 0.5) {
    status = 'Busuk';
    badgeColor = 'red';
    calculatedScore = 1;
    statusSummary = 'Terdeteksi infeksi jamur kapang / pembusukan aktif. Segera pisahkan ke komposter organik agar tidak menulari stok lain.';
  } else if (diseaseDetected === 'Black Spot' || diseaseDetected === 'Powdery Mildew' || (daysRemaining < 1.0 && ripenessStage !== 'Unripe (Mentah)' && ripenessStage !== 'Semiripe (Setengah Matang)')) {
    status = 'Layu';
    badgeColor = 'yellow';
    calculatedScore = 2;
    statusSummary = `Stres patologi (${diseaseDetected}) atau mendekati batas simpan (${daysRemaining} hari). Ambil tindakan diskon jual cepat hari ini.`;
  } else if (ripenessStage === 'Overripe (Lewat Matang)') {
    status = 'Terlalu Matang';
    badgeColor = 'yellow';
    calculatedScore = 3;
    statusSummary = `Fase lewat matang optimal (Sisa sekitar ${effectiveHours} jam). Aroma pektin sangat kuat, ideal dialihkan ke pengolahan selai UMKM.`;
  } else if (ripenessStage === 'Unripe (Mentah)') {
    status = 'Segar';
    badgeColor = 'green';
    calculatedScore = 5;
    statusSummary = `Buah mentah / hijau (Sisa umur simpan sekitar ${daysRemaining} hari, butuh sekitar ${timeToMatureHours} jam menuju matang). Stok sangat tahan lama, simpan di ruang pemeraman.`;
  } else if (ripenessStage === 'Semiripe (Setengah Matang)') {
    status = 'Segar';
    badgeColor = 'green';
    calculatedScore = 5;
    statusSummary = `Buah setengah matang (Sisa umur simpan sekitar ${daysRemaining} hari, butuh sekitar ${timeToMatureHours} jam menuju matang). Aman disimpan untuk display esok hari.`;
  } else if (daysRemaining >= 3.0) {
    status = 'Segar';
    badgeColor = 'green';
    calculatedScore = 5;
    statusSummary = `Kondisi prima (Sisa umur simpan sekitar ${daysRemaining} hari). Stok aman untuk pajangan utama rak etalase harga penuh.`;
  } else {
    status = 'Segar';
    badgeColor = 'green';
    calculatedScore = 4;
    statusSummary = `Matang optimal (Sisa umur simpan sekitar ${effectiveHours} jam). Prioritaskan pajang di rak depan display hari ini.`;
  }

  // 8. Rekomendasi Aksi Inventaris & Strategi Penjualan Cepat (Merchant Action)
  let inventoryAction: InventoryAction = 'Pajang di Etalase Depan Segera';
  let pricingStrategy: PricingAction = 'Harga Normal';
  let urgencyLevel: 'Aman' | 'Perhatian' | 'Kritis' | 'Kedaluwarsa' = 'Aman';

  if (status === 'Busuk') {
    inventoryAction = 'Pilah ke Komposter Organik / Bio-fermentasi';
    pricingStrategy = 'Bahan Baku Olahan';
    urgencyLevel = 'Kedaluwarsa';
  } else if (status === 'Layu') {
    inventoryAction = 'Diskon / Jual Cepat Hari Ini';
    pricingStrategy = 'Diskon 30-50%';
    urgencyLevel = 'Kritis';
  } else if (status === 'Terlalu Matang') {
    inventoryAction = 'Alihkan ke Pengolah Selai / Jus';
    pricingStrategy = 'Jual Murah Borongan';
    urgencyLevel = 'Perhatian';
  } else if (ripenessStage === 'Unripe (Mentah)' || ripenessStage === 'Semiripe (Setengah Matang)') {
    inventoryAction = 'Simpan di Gudang / Stok Cadangan';
    pricingStrategy = 'Harga Normal';
    urgencyLevel = 'Aman';
  } else {
    inventoryAction = 'Pajang di Etalase Depan Segera';
    pricingStrategy = 'Harga Normal';
    urgencyLevel = 'Aman';
  }

  const timeToRipeHours = timeToMatureHours;
  const timeToRipeDays = Number((timeToRipeHours / 24.0).toFixed(1));
  const timeToSpoilHours = effectiveHours;
  const timeToSpoilDays = daysRemaining;

  const shelfLifeDetail: ShelfLifeDetail = {
    hours_remaining: effectiveHours,
    days_remaining: daysRemaining,
    time_to_mature_hours: timeToMatureHours,
    time_to_ripe_hours: timeToRipeHours,
    time_to_ripe_days: timeToRipeDays,
    time_to_spoil_hours: timeToSpoilHours,
    time_to_spoil_days: timeToSpoilDays,
    ripeness_stage: ripenessStage,
    disease_detected: diseaseDetected,
    inventory_action: inventoryAction,
    pricing_strategy: pricingStrategy,
    urgency_level: urgencyLevel,
    environmental_stress_factor: environmentalStressFactor,
    color_validation: colorVal
  };

  const itemCatalog = RECIPE_CATALOG['Stroberi'];
  let recommendation = itemCatalog.layu;
  if (status === 'Segar') {
    recommendation = itemCatalog.segar;
  } else if (status === 'Busuk') {
    recommendation = itemCatalog.busuk;
  }

  // Bobot default standar sampel (1.0 kg)
  const batchWeightKg = Number(visual.batch_weight_kg ?? 1.0);
  
  // Harga Pasar Riil per kg Berdasarkan Benchmark Pasar Indonesia:
  // - Segar Prima (Grade A Super): Rp 75.000/kg
  // - Layu / Olahan Selai UMKM: Rp 35.000/kg
  // - Busuk / Kompos Organik: Rp 3.000/kg
  let unitPricePerKg = 75000;
  if (status === 'Segar') {
    unitPricePerKg = 75000;
  } else if (status === 'Terlalu Matang' || status === 'Layu') {
    unitPricePerKg = 35000;
  } else {
    unitPricePerKg = 3000;
  }

  const financialSavings = Math.round(batchWeightKg * unitPricePerKg);

  const isComposted = status === 'Busuk';
  const divertedKg = batchWeightKg;
  const preventedCh4 = Number((divertedKg * (isComposted ? 6.5 : 13.6)).toFixed(1));
  const preventedCo2e = Number((preventedCh4 * 28.0).toFixed(1));

  // Kategori gas murni tanpa dummy
  const ch4Status: 'Rendah' | 'Sedang' | 'Tinggi' = ch4 === 0 ? 'Rendah' : ch4 < 1.0 ? 'Rendah' : ch4 < 2.2 ? 'Sedang' : 'Tinggi';
  const aqiStatus: 'Baik' | 'Sedang' | 'Tinggi' = aqi === 0 ? 'Baik' : aqi < 50 ? 'Baik' : aqi < 110 ? 'Sedang' : 'Tinggi';
  const visualStatus: 'Segar' | 'Layu' | 'Berkerut' | 'Busuk' = 
    status === 'Segar' ? 'Segar' : status === 'Busuk' ? 'Busuk' : (visual.defects.some(d => d.toLowerCase().includes('kerut')) ? 'Berkerut' : 'Layu');

  return {
    item_name: foodName,
    category: 'Buah',
    freshness_score: calculatedScore,
    status,
    status_badge_color: badgeColor,
    status_summary: statusSummary,
    shelf_life: shelfLifeDetail,
    gas_summary: {
      ch4_ppm: ch4,
      ch4_status: ch4Status,
      aqi_ppm: aqi,
      aqi_status: aqiStatus,
      visual_status: visualStatus,
      temperature: temp,
      humidity: rh,
      color_hex: colorVal.sensor_hex,
      color_name: colorVal.sensor_name,
      color_r: gas.color_r ?? 0,
      color_g: gas.color_g ?? 0,
      color_b: gas.color_b ?? 0,
      color_lux: colorVal.lux,
      color_temp: colorVal.color_temp_kelvin
    },
    recommendation,
    saved_weight_kg: divertedKg,
    prevented_ch4_g: preventedCh4,
    prevented_co2e_g: preventedCo2e,
    financial_savings_idr: financialSavings,
    scan_time: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' • ' + 
               new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    image_url: visual.image_url
  };
}
