export type FreshnessStatus = 'Segar' | 'Layu' | 'Busuk' | 'Terlalu Matang';

export interface GasData {
  ch4_ppm: number;       // MQ-4 Methane gas in ppm (normal: <1.0, warning: 1.0-2.5, rotten: >2.5)
  aqi_ppm: number;       // MQ-135 Air quality / NH3 in ppm (normal: <50, warning: 50-120, rotten: >120)
  raw_mq4?: number;
  raw_mq135?: number;
  battery: number;       // Percentage (e.g. 87%)
  is_connected: boolean;
  timestamp: string;
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
