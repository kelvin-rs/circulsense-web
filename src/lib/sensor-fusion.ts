import { GasData, VisualData, FusionResult, UpcyclingRecommendation, FreshnessStatus } from '@/types/circulsense';

// Catalog of Upcycling Recommendations
export const RECIPE_CATALOG: Record<string, { layu: UpcyclingRecommendation; segar: UpcyclingRecommendation; busuk: UpcyclingRecommendation }> = {
  Tomat: {
    layu: {
      id: 'rec_tomato_sauce',
      type: 'Resep Masakan',
      title: 'Saus Tomat Homemade',
      subtitle: 'Manfaatkan tomat layu untuk membuat saus lezat tanpa bahan pengawet.',
      prep_time: '25 menit',
      difficulty: 'Mudah',
      description: 'Tomat yang mulai lembek dan keriput memiliki kandungan gula alami yang terkonsentrasi, sangat cocok dijadikan saus pasta, marinara, atau dasar bumbu pizza daripada dibuang.',
      ingredients: [
        '500g Tomat Layu / Sangat Matang',
        '3 siung Bawang Putih, cincang halus',
        '1/2 buah Bawang Bombay, cincang',
        '1 sdm Minyak Zaitun atau Minyak Sayur',
        '1 sdt Garam & 1/2 sdt Lada Bubuk',
        '1 sdt Gula Pasir & Daun Basil/Oregano secukupnya'
      ],
      steps: [
        'Cuci bersih tomat layu, buang pangkal tangkainya, lalu rebus selama 2 menit dan kupas kulitnya yang telah melunak.',
        'Haluskan daging tomat dengan blender atau garpu kasar.',
        'Tumis bawang putih dan bawang bombay dengan sedikit minyak hingga harum keemasan.',
        'Tuangkan puree tomat ke dalam wajan, tambahkan garam, lada, gula, dan oregano.',
        'Masak dengan api kecil selama 15-20 menit hingga kuah mengental dan aroma matang sempurna.',
        'Simpan dalam toples kaca kedap udara di kulkas untuk masa simpan hingga 2 minggu.'
      ],
      tips: 'Tambahkan perasan sedikit jeruk nipis untuk penyeimbang rasa segar alami.',
      image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'
    },
    segar: {
      id: 'rec_tomato_salad',
      type: 'Resep Masakan',
      title: 'Salad Tomat Segar & Dressing Madu',
      subtitle: 'Tomat segar renyah kaya antioksidan likopen.',
      prep_time: '10 menit',
      difficulty: 'Mudah',
      description: 'Potongan tomat segar dengan tekstur padat dan berair, disajikan dingin dengan dressing minyak zaitun dan madu.',
      ingredients: [
        '300g Tomat Segar',
        '1 sdm Minyak Zaitun',
        '1 sdt Madu Murni',
        '1 sdm Air Lemon',
        'Sejumput Garam dan Lada Hitam'
      ],
      steps: [
        'Iris tomat segar setebal 0.5 cm secara rapi.',
        'Campurkan minyak zaitun, madu, air lemon, garam, dan lada dalam mangkuk kecil.',
        'Siramkan dressing secara merata di atas irisan tomat sesaat sebelum disajikan.'
      ],
      tips: 'Simpan tomat di suhu ruang terbuka agar aroma manis alaminya terjaga optimal.',
      image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'
    },
    busuk: {
      id: 'rec_tomato_compost',
      type: 'Kompos',
      title: 'Kompos Organik Aerobik & Pupuk Cair',
      subtitle: 'Konversi tomat busuk menjadi nutrisi tanah tinggi fosfor & kalium.',
      prep_time: '15 menit',
      difficulty: 'Mudah',
      description: 'Tomat yang telah terdegradasi dan mengeluarkan gas metana tinggi tidak boleh dikonsumsi. Alihkan langsung ke komposter aerobik untuk menyuburkan tanaman tanpa mencemari atmosfer.',
      ingredients: [
        'Tomat busuk (sumber nitrogen & air)',
        'Sampah cokelat (daun kering, serbuk gergaji, atau kardus sobek)',
        'Aktivator EM4 atau air cucian beras'
      ],
      steps: [
        'Cacah tomat busuk menjadi potongan lebih kecil untuk mempercepat dekomposisi mikroba.',
        'Lapisi dasar wadah komposter dengan materi cokelat kering setebal 5 cm.',
        'Masukkan cacahan tomat, lalu tutup kembali dengan lapisan materi cokelat untuk mencegah bau dan lalat.',
        'Siram sedikit aktivator mikroba dan aduk seminggu sekali untuk sirkulasi oksigen.'
      ],
      tips: 'Jangan masukkan tomat busuk yang terkena minyak goreng atau bahan kimia berbahaya.',
      image_url: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80'
    }
  },
  'Sawi Hijau': {
    layu: {
      id: 'rec_sawi_stirfry',
      type: 'Resep Masakan',
      title: 'Tumis Sawi Gurih Bawang Putih',
      subtitle: 'Kembalikan kerenyahan sawi layu dengan tumisan api besar (wok hei).',
      prep_time: '15 menit',
      difficulty: 'Mudah',
      description: 'Sawi yang mulai kehilangan kadar air tetap lezat dan kaya serat saat dimasak dengan teknik tumis cepat.',
      ingredients: [
        '1 ikat Sawi Hijau Layu',
        '4 siung Bawang Putih, geprek',
        '1 sdm Saus Tiram',
        '1/2 sdt Minyak Wijen',
        'Garam dan merica secukupnya'
      ],
      steps: [
        'Rendam sawi layu di dalam air es dingin selama 5 menit untuk menyegarkan kembali batangnya.',
        'Potong-potong sepanjang 3-4 cm.',
        'Tumis bawang putih cincang hingga harum kekuningan.',
        'Masukkan bagian batang sawi terlebih dahulu, masak 1 menit, lalu masukkan daunnya.',
        'Beri saus tiram, garam, dan tetesan minyak wijen. Angkat saat masih hijau cerah.'
      ],
      tips: 'Perendaman air es bekerja secara osmosis mengembalikan turgor sel sayuran.',
      image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
    },
    segar: {
      id: 'rec_sawi_fresh',
      type: 'Resep Masakan',
      title: 'Sup Bening Sawi Jamur Enoki',
      subtitle: 'Kuah kaldu hangat gurih dengan sawi hijau segar.',
      prep_time: '15 menit',
      difficulty: 'Mudah',
      description: 'Sawi segar dipadu dengan jamur dan kaldu gurih untuk makan siang menyehatkan.',
      ingredients: ['Sawi Hijau segar', 'Jamur Enoki', 'Bawang Putih', 'Kaldu Ayam/Jamur', 'Merica'],
      steps: [
        'Didihkan air kaldu dengan tumisan bawang putih.',
        'Masukkan jamur dan sawi segar.',
        'Masak selama 2-3 menit agar sawi tetap renyah.'
      ],
      image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
    },
    busuk: {
      id: 'rec_sawi_eco_enzyme',
      type: 'Eco Enzyme',
      title: 'Eco Enzyme & Kompos Nitrogen Tinggi',
      subtitle: 'Fermentasi sayuran busuk menjadi cairan pembersih serbaguna.',
      prep_time: '20 menit',
      difficulty: 'Mudah',
      description: 'Sawi yang berlendir dan mengeluarkan bau amonia difermentasi dengan molase gula merah.',
      ingredients: ['100g Gula Merah / Molase', '300g Sisa Sawi Busuk', '1000ml Air Bersih'],
      steps: [
        'Larutkan gula merah ke dalam wadah berisi air.',
        'Masukkan potongan sayur sawi busuk.',
        'Tutup rapat dan simpan di tempat teduh selama 3 bulan untuk menghasilkan enzim pembersih alami.'
      ],
      image_url: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80'
    }
  },
  Pisang: {
    layu: {
      id: 'rec_banana_bread',
      type: 'Resep Masakan',
      title: 'Bolu Pisang Kukus Karamel (Banana Bread)',
      subtitle: 'Pisang berbintik hitam (overripe) menghasilkan bolu paling wangi dan manis.',
      prep_time: '35 menit',
      difficulty: 'Mudah',
      description: 'Bintik hitam pada kulit pisang menandakan pemecahan pati menjadi fruktosa alami yang melimpah, bahan terbaik untuk cake dan pancake tanpa perlu banyak gula tambahan.',
      ingredients: [
        '3 buah Pisang Kulit Hitam/Layu',
        '1 butir Telur Ayam',
        '4 sdm Minyak Kelapa / Margarin cair',
        '6 sdm Tepung Terigu',
        '1/2 sdt Baking Soda & Sejumput Garam'
      ],
      steps: [
        'Haluskan pisang matang menggunakan garpu.',
        'Kocok telur bersama pisang dan margarin cair hingga tercampur rata.',
        'Ayak tepung terigu dan baking soda ke dalam adonan pisang, aduk perlahan.',
        'Tuang adonan ke loyang dan kukus selama 25-30 menit dengan api sedang.',
        'Tusuk dengan lidi untuk mengecek kematangan, sajikan hangat.'
      ],
      tips: 'Semakin hitam bintik kulit pisang, semakin kuat aroma pisang pada kue yang dihasilkan!',
      image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80'
    },
    segar: {
      id: 'rec_banana_smoothie',
      type: 'Resep Masakan',
      title: 'Smoothie Pisang Madu & Susu Gandum',
      subtitle: 'Minuman energi tinggi potasium penambah stamina.',
      prep_time: '5 menit',
      difficulty: 'Mudah',
      description: 'Pisang segar kuning mulus di-blend bersama susu dan madu alami.',
      ingredients: ['2 buah Pisang Segar', '200ml Susu Segar', '1 sdm Madu', 'Es Batu'],
      steps: ['Kupas dan potong pisang.', 'Masukkan semua bahan ke dalam blender dan haluskan selama 30 detik.'],
      image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80'
    },
    busuk: {
      id: 'rec_banana_liquid_fert',
      type: 'Kompos',
      title: 'Pupuk Organik Cair Kalium Tinggi',
      subtitle: 'Nutrisi organik booster pembungaan dan pembuahan tanaman.',
      prep_time: '10 menit',
      difficulty: 'Mudah',
      description: 'Pisang yang berlendir dan hancur difermentasi dengan air untuk diekstrak kandungan kalium dan fosfor alaminya.',
      ingredients: ['Pisang busuk beserta kulitnya', 'Air kelapa atau air biasa', '1 sdt gula pasir'],
      steps: [
        'Potong pisang busuk dan masukkan ke dalam botol bekas.',
        'Tambahkan air dan sedikit gula, kocok lalu tutup longgar.',
        'Biarkan terfermentasi 7 hari, lalu saring cairannya untuk disiram ke tanaman hias atau buah.'
      ],
      image_url: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80'
    }
  },
  Selada: {
    layu: {
      id: 'rec_selada_soup',
      type: 'Resep Masakan',
      title: 'Sup Selada Telur Puyuh Gurih',
      subtitle: 'Selada layu yang lembut dijadikan hidangan sup ala oriental.',
      prep_time: '15 menit',
      difficulty: 'Mudah',
      description: 'Selada yang tidak lagi garing untuk salad sangat cocok diseduh dalam kuah kaldu panas.',
      ingredients: ['1 bonggol Selada Layu', '6 butir Telur Puyuh matang', '2 siung Bawang Putih', 'Kaldu ayam'],
      steps: [
        'Rebus kaldu ayam dengan irisan bawang putih.',
        'Masukkan telur puyuh dan selada layu yang sudah dicuci bersih.',
        'Matikan api setelah 1 menit agar nutrisi daun tetap optimal.'
      ],
      image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
    },
    segar: {
      id: 'rec_selada_crispy',
      type: 'Resep Masakan',
      title: 'Garden Fresh Salad Bowl',
      subtitle: 'Salad selada renyah dengan saus wijen sangrai.',
      prep_time: '10 menit',
      difficulty: 'Mudah',
      description: 'Selada segar renyah berpadu dengan irisan mentimun dan dressing wijen.',
      ingredients: ['Selada segar', 'Mentimun', 'Tomat ceri', 'Dressing wijen sangrai'],
      steps: ['Potong kasar selada segar.', 'Campurkan dengan bahan sayur lainnya dan tuang dressing.'],
      image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
    },
    busuk: {
      id: 'rec_selada_compost',
      type: 'Kompos',
      title: 'Kompos Penggembur Tanah Cepat Urai',
      subtitle: 'Dekomposisi cepat untuk memperbaiki porositas tanah kebun.',
      prep_time: '10 menit',
      difficulty: 'Mudah',
      description: 'Selada yang membusuk memiliki serat lunak yang cepat diurai oleh cacing tanah dan mikroba.',
      ingredients: ['Selada busuk', 'Tanah kebun', 'Sekam bakar'],
      steps: ['Campurkan selada busuk dengan sekam dan tanah.', 'Diamkan 10 hari dalam pot kompos.'],
      image_url: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80'
    }
  }
};

/**
 * Sensor Fusion Calculation Engine:
 * Fuses visual image feature confidence with gas sensor telemetry (MQ-4 & MQ-135)
 */
export function runSensorFusion(visual: VisualData, gas: GasData): FusionResult {
  // 1. Normalize Visual Score [0, 1]
  const vScoreNorm = Math.min(Math.max((visual.visual_score - 1) / 4, 0), 1);

  // 2. Normalize MQ-4 Methane Gas Score [0, 1] (Lower ppm is better)
  // < 1.0 ppm -> 1.0 (Fresh)
  // 1.0 - 2.5 ppm -> 0.6 (Warning / Overripe)
  // > 2.5 ppm -> 0.1 (Rotten / Decomposition)
  let mq4ScoreNorm = 1.0;
  if (gas.ch4_ppm > 2.5) {
    mq4ScoreNorm = Math.max(0, 1 - (gas.ch4_ppm / 5));
  } else if (gas.ch4_ppm > 1.0) {
    mq4ScoreNorm = 0.5 + (0.4 * ((2.5 - gas.ch4_ppm) / 1.5));
  }

  // 3. Normalize MQ-135 Air Quality / NH3 Score [0, 1]
  // < 50 ppm -> 1.0 (Fresh)
  // 50 - 120 ppm -> 0.55 (Moderate VOCs)
  // > 120 ppm -> 0.1 (High Ammonia / Spoilage)
  let mq135ScoreNorm = 1.0;
  if (gas.aqi_ppm > 120) {
    mq135ScoreNorm = Math.max(0, 1 - (gas.aqi_ppm / 250));
  } else if (gas.aqi_ppm > 50) {
    mq135ScoreNorm = 0.5 + (0.4 * ((120 - gas.aqi_ppm) / 70));
  }

  // 4. Weighted Multimodal Fusion (0.4 Visual + 0.3 MQ-4 + 0.3 MQ-135)
  const weightedScore = (0.4 * vScoreNorm) + (0.3 * mq4ScoreNorm) + (0.3 * mq135ScoreNorm);

  // Map to 1-5 scale
  let calculatedScore = Math.round(1 + (weightedScore * 4));
  calculatedScore = Math.min(Math.max(calculatedScore, 1), 5);

  // Decision Thresholds
  let status: FreshnessStatus = 'Layu';
  let badgeColor: 'green' | 'yellow' | 'red' = 'yellow';
  let statusSummary = 'Masih layak diolah sebelum terbuang';

  if (calculatedScore >= 4) {
    status = 'Segar';
    badgeColor = 'green';
    statusSummary = 'Kualitas prima, aman untuk konsumsi langsung atau olahan segar';
  } else if (calculatedScore <= 1 || gas.ch4_ppm >= 2.8 || gas.aqi_ppm >= 140) {
    status = 'Busuk';
    calculatedScore = 1;
    badgeColor = 'red';
    statusSummary = 'Tidak aman dikonsumsi (Emisi gas tinggi), alihkan ke komposter organik';
  } else {
    // Score 2-3
    if (calculatedScore === 2) {
      status = 'Terlalu Matang';
    } else {
      status = 'Layu';
    }
    badgeColor = 'yellow';
    statusSummary = 'Masih layak diolah sebelum terbuang';
  }

  // Gas summary categorizations
  const ch4_status: 'Rendah' | 'Sedang' | 'Tinggi' = gas.ch4_ppm < 1.0 ? 'Rendah' : gas.ch4_ppm < 2.5 ? 'Sedang' : 'Tinggi';
  const aqi_status: 'Baik' | 'Sedang' | 'Tinggi' = gas.aqi_ppm < 50 ? 'Baik' : gas.aqi_ppm < 120 ? 'Sedang' : 'Tinggi';
  const visual_status: 'Segar' | 'Layu' | 'Berkerut' | 'Busuk' = 
    status === 'Segar' ? 'Segar' : status === 'Busuk' ? 'Busuk' : (visual.defects.includes('Kulit Berkerut') ? 'Berkerut' : 'Layu');

  // Select Recommendation
  const itemCatalog = RECIPE_CATALOG[visual.item_name] || RECIPE_CATALOG['Tomat'];
  let recommendation = itemCatalog.layu;
  if (status === 'Segar') {
    recommendation = itemCatalog.segar;
  } else if (status === 'Busuk') {
    recommendation = itemCatalog.busuk;
  }

  // Quantify Environmental & Financial Impact
  const saved_weight_kg = status === 'Busuk' ? 0.35 : 0.5; // Average sample portion
  const prevented_ch4_g = Number((saved_weight_kg * (status === 'Busuk' ? 4.2 : 13.6)).toFixed(1));
  const prevented_co2e_g = Number((saved_weight_kg * (status === 'Busuk' ? 10.5 : 34.0)).toFixed(1));
  const financial_savings_idr = status === 'Busuk' ? 5000 : 15000;

  return {
    item_name: visual.item_name,
    category: visual.category,
    freshness_score: calculatedScore,
    status,
    status_badge_color: badgeColor,
    status_summary: statusSummary,
    gas_summary: {
      ch4_ppm: gas.ch4_ppm,
      ch4_status,
      aqi_ppm: gas.aqi_ppm,
      aqi_status,
      visual_status
    },
    recommendation,
    saved_weight_kg,
    prevented_ch4_g,
    prevented_co2e_g,
    financial_savings_idr,
    scan_time: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' • ' + 
               new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    image_url: visual.image_url
  };
}
