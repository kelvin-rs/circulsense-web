export type FreshnessStatus = 'Segar' | 'Layu' | 'Busuk' | 'Terlalu Matang';

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
}

export interface UpcyclingRecommendation {
  id: string;
  type: 'Resep Masakan' | 'Kompos' | 'Eco Enzyme';
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


