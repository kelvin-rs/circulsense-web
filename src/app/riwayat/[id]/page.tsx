'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { fetchScanRecords } from '@/lib/supabase';
import { ScanRecord, GasData } from '@/types/circulsense';
import { mqttService, MQTTStatus } from '@/lib/mqtt';
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Shield,
  Activity,
  Leaf,
  ChevronRight,
  TrendingDown,
  CookingPot
} from 'lucide-react';

const DEFAULT_SAMPLE_RECORDS: ScanRecord[] = [
  {
    id: 'sample-1',
    item_name: 'Tomat',
    category: 'Sayur',
    freshness_score: 3,
    status: 'Layu',
    visual_condition: 'Tekstur Lembek & Kulit Berkerut',
    action_taken: 'Diolah menjadi saus tomat',
    recommendation_title: 'Saus Tomat Homemade Herbal',
    gas_ch4_ppm: 2.15,
    gas_aqi_ppm: 48,
    saved_weight_kg: 0.5,
    prevented_ch4_g: 12.5,
    prevented_co2e_g: 48.2,
    financial_savings_idr: 4200,
    image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
    created_at: '2025-05-12T09:30:00.000Z'
  },
  {
    id: 'sample-2',
    item_name: 'Sawi Hijau',
    category: 'Sayur',
    freshness_score: 4,
    status: 'Segar',
    visual_condition: 'Daun Segar Hijau Cerah',
    action_taken: 'Dimasak menjadi tumis sawi',
    recommendation_title: 'Tumis Sawi Bawang Putih',
    gas_ch4_ppm: 0.85,
    gas_aqi_ppm: 32,
    saved_weight_kg: 0.4,
    prevented_ch4_g: 10.0,
    prevented_co2e_g: 35.0,
    financial_savings_idr: 3500,
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    created_at: '2025-05-11T18:20:00.000Z'
  },
  {
    id: 'sample-3',
    item_name: 'Pisang',
    category: 'Buah',
    freshness_score: 1,
    status: 'Busuk',
    visual_condition: 'Bercak Hitam Menyeluruh & Fermentasi',
    action_taken: 'Dibuat kompos cair',
    recommendation_title: 'Pupuk Organik Cair (POC) Pisang',
    gas_ch4_ppm: 4.80,
    gas_aqi_ppm: 110,
    saved_weight_kg: 0.6,
    prevented_ch4_g: 15.0,
    prevented_co2e_g: 65.0,
    financial_savings_idr: 0,
    image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80',
    created_at: '2025-05-10T16:40:00.000Z'
  },
  {
    id: 'sample-4',
    item_name: 'Selada',
    category: 'Sayur',
    freshness_score: 4,
    status: 'Segar',
    visual_condition: 'Kerenyahan Daun Optimal',
    action_taken: 'Dibuat salad',
    recommendation_title: 'Salad Sayur Segar Dressing Lemon',
    gas_ch4_ppm: 0.65,
    gas_aqi_ppm: 28,
    saved_weight_kg: 0.3,
    prevented_ch4_g: 7.5,
    prevented_co2e_g: 28.0,
    financial_savings_idr: 4000,
    image_url: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&auto=format&fit=crop&q=80',
    created_at: '2025-05-09T11:15:00.000Z'
  },
  {
    id: 'sample-5',
    item_name: 'Tomat',
    category: 'Sayur',
    freshness_score: 2,
    status: 'Terlalu Matang',
    visual_condition: 'Kulit Berair & Mulai Melunak',
    action_taken: 'Diolah menjadi pizza mini',
    recommendation_title: 'Topping Pizza Mini Crust',
    gas_ch4_ppm: 2.90,
    gas_aqi_ppm: 55,
    saved_weight_kg: 0.5,
    prevented_ch4_g: 12.5,
    prevented_co2e_g: 52.0,
    financial_savings_idr: 4500,
    image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
    created_at: '2025-05-08T10:05:00.000Z'
  }
];

export default function RiwayatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [record, setRecord] = useState<ScanRecord | null>(null);
  const [gasData, setGasData] = useState<GasData>(mqttService.getCurrentData());
  const [mqttStatus, setMqttStatus] = useState<MQTTStatus>('disconnected');
  const [loading, setLoading] = useState(true);

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
  }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    const data = await fetchScanRecords();
    const allRecords = data && data.length > 0 ? [...data, ...DEFAULT_SAMPLE_RECORDS] : DEFAULT_SAMPLE_RECORDS;
    const found = allRecords.find((r) => r.id === id) || allRecords[0];
    setRecord(found);
    setLoading(false);
  };

  const formatDate = (isoString: string) => {
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

  if (loading || !record) {
    return (
      <main className="min-h-screen bg-white text-[#1E293B] flex flex-col">
        <Header mqttStatus={mqttStatus} battery={gasData.battery} />
        <div className="flex-1 flex items-center justify-center p-12 text-slate-400 font-bold text-sm">
          Memuat detail riwayat analisis...
        </div>
        <BottomNav />
      </main>
    );
  }

  const isFresh = record.freshness_score >= 4;
  const isDecaying = record.freshness_score === 3;

  return (
    <main className="min-h-screen bg-white text-[#1E293B] flex flex-col selection:bg-[#16A34A] selection:text-white">
      <Header
        mqttStatus={mqttStatus}
        battery={gasData.battery}
      />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-32 md:pb-16 space-y-6">
        {/* 1. TOP BACK BAR */}
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <Link
            href="/riwayat"
            className="w-10 h-10 rounded-xl bg-slate-100 text-[#334155] flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Detail Riwayat Analisis
            </h1>
            <p className="text-xs text-slate-400 font-medium flex items-center space-x-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(record.created_at)}</span>
            </p>
          </div>
        </div>

        {/* 2. PHOTO & FRESHNESS EVALUATION */}
        <div className="space-y-4">
          <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 shadow-sm">
            <img
              src={record.image_url}
              alt={record.item_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {record.item_name} ({record.category})
            </div>
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
              YOLO Client-Side AI
            </div>
          </div>

          {/* Freshness Score Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                Evaluasi Fusi Sensor
              </span>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-2xl sm:text-3xl font-black ${
                    isFresh ? 'text-[#16A34A]' : isDecaying ? 'text-amber-600' : 'text-red-600'
                  }`}
                >
                  {record.freshness_score}/5
                </span>
                <span
                  className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                    isFresh
                      ? 'bg-[#DCFCE7] text-[#166534]'
                      : isDecaying
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {record.status}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Kondisi Visual</span>
              <strong className="text-xs sm:text-sm text-[#0F172A] font-bold">
                {record.visual_condition}
              </strong>
            </div>
          </div>
        </div>

        {/* 3. GAS SENSOR TELEMETRY */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Telemetri Sensor Gas Saat Pemindaian
          </h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-bold">MQ-4 (Metana)</span>
                <Activity className="w-4 h-4 text-[#2D7A38]" />
              </div>
              <div className="text-xl font-black text-[#0F172A]">
                {record.gas_ch4_ppm.toFixed(2)}{' '}
                <span className="text-xs font-mono text-slate-400 font-normal">ppm</span>
              </div>
              <p className="text-[11px] text-slate-400">Ambang segar: &lt; 1.0 ppm</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-bold">MQ-135 (Kualitas)</span>
                <Shield className="w-4 h-4 text-[#2D7A38]" />
              </div>
              <div className="text-xl font-black text-[#0F172A]">
                {record.gas_aqi_ppm}{' '}
                <span className="text-xs font-mono text-slate-400 font-normal">AQI</span>
              </div>
              <p className="text-[11px] text-slate-400">Ambang segar: &lt; 50 AQI</p>
            </div>
          </div>
        </div>

        {/* 4. RECOMMENDED UPCYCLING ACTION */}
        <div className="p-5 rounded-2xl bg-[#DCFCE7]/60 border border-[#BBF7D0] space-y-2">
          <div className="flex items-center space-x-2 text-[#166534] font-bold text-xs uppercase tracking-wider">
            <CookingPot className="w-4 h-4" />
            <span>Rekomendasi Aksi Upcycling Pangan</span>
          </div>

          <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
            {record.recommendation_title || record.action_taken}
          </h3>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Metode pengolahan optimal berdasarkan tingkat kematangan bahan untuk mempertahankan nutrisi dan mencegah pembusukan di tempat pembuangan akhir.
          </p>
        </div>

        {/* 5. ENVIRONMENTAL & FINANCIAL IMPACT */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Dampak Lingkungan & Finansial
          </h2>

          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Pangan</span>
              <strong className="text-sm font-black text-[#0F172A]">
                {record.saved_weight_kg || 0.4} kg
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">CH₄ Dicegah</span>
              <strong className="text-sm font-black text-[#166534]">
                {record.prevented_ch4_g || 10.0} g
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Nilai Hemat</span>
              <strong className="text-sm font-black text-[#2D7A38]">
                Rp {(record.financial_savings_idr || 3500).toLocaleString('id-ID')}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
