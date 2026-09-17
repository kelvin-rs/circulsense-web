export type FreshnessStatus = 'Segar' | 'Layu' | 'Busuk' | 'Terlalu Matang';

export type RipenessStage = 'Unripe (Mentah)' | 'Semiripe (Setengah Matang)' | 'Fullripe (Matang Optimal)' | 'Overripe (Lewat Matang)';

export type DiseaseStatus = 'Normal (Bebas Jamur)' | 'Risiko Gray Mold (Botrytis)' | 'Powdery Mildew' | 'Black Spot';

export type InventoryAction = 
  | 'Simpan di Gudang / Stok Cadangan'
  | 'Pajang di Etalase Depan Segera'
  | 'Diskon / Jual Cepat Hari Ini'
  | 'Alihkan ke Pengolah Selai / Jus'
  | 'Pilah ke Komposter Organik / Bio-fermentasi';

export type PricingAction = 'Harga Normal' | 'Diskon 15-20%' | 'Diskon 30-50%' | 'Jual Murah Borongan' | 'Bahan Baku Olahan';

export interface ColorValidationDetail {
  sensor_hex: string;
  sensor_name: string;
  red_ratio: number; // R / (R + G + B)
  lux: number;
  color_temp_kelvin: number;
  consistency_status: 'Sangat Konsisten' | 'Tervalidasi (Pencahayaan Redup Terkoreksi)' | 'Peringatan Anomali Warna' | 'Belum Ada Data Sensor';
  message: string;
}

export interface ShelfLifeDetail {
  hours_remaining: number;       // e.g. 48 jam
  days_remaining: number;        // e.g. 2.0 hari
  time_to_mature_hours?: number; // e.g. 0 jika sudah matang, atau 48 jika mentah
  ripeness_stage: RipenessStage;
  disease_detected: DiseaseStatus;
  inventory_action: InventoryAction;
  pricing_strategy: PricingAction;
  urgency_level: 'Aman' | 'Perhatian' | 'Kritis' | 'Kedaluwarsa';
  environmental_stress_factor: number; // Pengali stres suhu/RH dari DHT22 (1.0 = normal, >1.5 = laju pembusukan dipercepat)
  color_validation: ColorValidationDetail;
}

export interface GasData {
  ch4_ppm?: number | null;       // MQ-4 Methane gas in ppm
  aqi_ppm?: number | null;       // MQ-135 Air quality / NH3 in ppm
  raw_mq4?: number | null;
  raw_mq135?: number | null;
  // Sensor Suhu & Kelembapan DHT22
  temperature?: number | null;   // DHT22 Temperature in °C
  humidity?: number | null;      // DHT22 Relative Humidity in %
  // Sensor Warna TCS34725
  color_r?: number | null;       // TCS34725 Red component (0-255)
  color_g?: number | null;       // TCS34725 Green component (0-255)
  color_b?: number | null;       // TCS34725 Blue component (0-255)
  color_c?: number | null;       // TCS34725 Clear channel intensity
  color_lux?: number | null;     // TCS34725 Illuminance in Lux
  color_temp?: number | null;    // TCS34725 Color Temperature in Kelvin (CCT)
  color_hex?: string | null;     // TCS34725 Hex Color
  color_name?: string | null;    // Deskripsi warna terdeteksi
  battery: number;               // Percentage
  is_connected: boolean;
  has_data?: boolean;
  timestamp?: string;
}

export interface VisualData {
  item_name: string;
  category: 'Sayur' | 'Buah';
  confidence: number;    // e.g. 0.94
  visual_score: number;  // 1-5
  defects: string[];     // e.g. ['Bintik Hitam', 'Tekstur Lembek', 'Kulit Berkerut']
  image_url: string;
  batch_weight_kg?: number; // Kuantitas batch pedagang (misal 5 kg atau 20 kg peti)
}

export interface UpcyclingRecommendation {
  id: string;
  type: 'Resep Masakan' | 'Kompos' | 'Eco Enzyme' | 'Pengolahan UMKM';
  title: string;
  subtitle: string;
  prep_time?: string;
  difficulty?: 'Mudah' | 'Sedang' | 'Lanjut';
  description: string;
  ingredients?: string[];
  steps: string[];
  tips?: string;
  image_url: string;
}

export interface FusionResult {
  item_name: string;
  category: 'Sayur' | 'Buah';
  freshness_score: number;  // 1-5 (e.g., 3/5)
  status: FreshnessStatus;
  status_badge_color: 'green' | 'yellow' | 'red';
  status_summary: string;
  shelf_life: ShelfLifeDetail; // Prediksi Umur Simpan & Keputusan Inventaris Pedagang
  gas_summary: {
    ch4_ppm: number;
    ch4_status: 'Rendah' | 'Sedang' | 'Tinggi';
    aqi_ppm: number;
    aqi_status: 'Baik' | 'Sedang' | 'Tinggi';
    visual_status: 'Segar' | 'Layu' | 'Berkerut' | 'Busuk';
    temperature?: number | null;
    humidity?: number | null;
    color_hex?: string | null;
    color_name?: string | null;
    color_r?: number | null;
    color_g?: number | null;
    color_b?: number | null;
    color_lux?: number | null;
    color_temp?: number | null;
  };
  recommendation: UpcyclingRecommendation;
  saved_weight_kg: number;
  prevented_ch4_g: number;
  prevented_co2e_g: number;
  financial_savings_idr: number;
  scan_time: string;
  image_url: string;
  is_live_ml?: boolean;
  ml_server_url?: string;
  detection_bbox?: number[];
}

export interface ScanRecord {
  id: string;
  created_at: string;
  item_name: string;
  category: 'Sayur' | 'Buah';
  freshness_score: number;
  status: FreshnessStatus;
  gas_ch4_ppm: number;
  gas_aqi_ppm: number;
  visual_condition: string;
  action_taken: string;
  recommendation_title: string;
  saved_weight_kg: number;
  prevented_ch4_g: number;
  prevented_co2e_g: number;
  financial_savings_idr: number;
  image_url: string;
  temperature?: number | null;
  humidity?: number | null;
  color_hex?: string | null;
  color_name?: string | null;
  color_r?: number | null;
  color_g?: number | null;
  color_b?: number | null;
  color_lux?: number | null;
  color_temp?: number | null;
  // Kolom Prediksi Umur Simpan Pedagang
  shelf_life_hours?: number;
  shelf_life_days?: number;
  ripeness_stage?: string;
  disease_detected?: string;
  inventory_action?: string;
  pricing_strategy?: string;
  color_consistency?: string;
}

export interface ImpactSummary {
  month_name: string;
  food_saved_kg: number;
  food_composted_kg: number;
  total_scans: number;
  upcycle_percent: number;
  compost_percent: number;
  ch4_prevented_g: number;
  forest_absorbed_sqm: number;
  co2e_prevented_g: number;
  trees_absorbed: number;
  total_financial_saved_idr: number;
}

export interface UserProfile {
  id: string;
  email: string;
  nama_lengkap: string;
  nomor_telepon?: string;
  peran?: string;
  foto_profil_url?: string;
  dibuat_pada?: string;
  diperbarui_pada?: string;
}


