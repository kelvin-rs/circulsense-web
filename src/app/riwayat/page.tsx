'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { fetchScanRecords } from '@/lib/supabase';
import { ScanRecord, GasData } from '@/types/circulsense';
import { mqttService, MQTTStatus } from '@/lib/mqtt';
import {
  Search,
  ChevronRight,
  X,
  Calendar,
  Trash2,
  Check,
  RotateCcw
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
    recommendation_title: 'Saus Tomat Homemade',
    gas_ch4_ppm: 2.15,
    gas_aqi_ppm: 48,
    saved_weight_kg: 0.5,
    prevented_ch4_g: 12.5,
    prevented_co2e_g: 48.2,
    financial_savings_idr: 4200,
    image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80',
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
    recommendation_title: 'Kompos Organik Cair POC',
    gas_ch4_ppm: 4.80,
    gas_aqi_ppm: 110,
    saved_weight_kg: 0.6,
    prevented_ch4_g: 15.0,
    prevented_co2e_g: 65.0,
    financial_savings_idr: 0,
    image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=80',
    created_at: '2025-05-08T10:05:00.000Z'
  }
];

export default function RiwayatPage() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [activeCategory, setActiveCategory] = useState<'Semua' | 'Sayur' | 'Buah'>('Semua');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [tempDate, setTempDate] = useState<string>('');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [gasData, setGasData] = useState<GasData>(mqttService.getCurrentData());
  const [mqttStatus, setMqttStatus] = useState<MQTTStatus>('disconnected');

  const popoverRef = useRef<HTMLDivElement>(null);
  const [itemToDelete, setItemToDelete] = useState<ScanRecord | null>(null);

  useEffect(() => {
    mqttService.init();

    const unsubMqtt = mqttService.subscribe((data) => {
      setGasData(data);
    });

    const unsubStatus = mqttService.onStatusChange((status) => {
      setMqttStatus(status);
    });

    loadData();

    // Close popover when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsFilterPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubMqtt();
      unsubStatus();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadData = async () => {
    const data = await fetchScanRecords();
    if (data && data.length > 0) {
      setRecords(data);
    } else {
      setRecords(DEFAULT_SAMPLE_RECORDS);
    }
  };

  const handleDeleteItem = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('circulsense_local_scans', JSON.stringify(updated));
    }
    setItemToDelete(null);
  };

  const handleTogglePopover = () => {
    setTempDate(selectedDate);
    setIsFilterPopoverOpen(!isFilterPopoverOpen);
  };

  const handleApplyFilter = () => {
    setSelectedDate(tempDate);
    setIsFilterPopoverOpen(false);
  };

  const handleResetFilter = () => {
    setTempDate('');
    setSelectedDate('');
    setIsFilterPopoverOpen(false);
  };

  const filteredRecords = records.filter((rec) => {
    const matchesCategory = activeCategory === 'Semua' || rec.category === activeCategory;
    const matchesSearch =
      rec.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.action_taken.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.status.toLowerCase().includes(searchQuery.toLowerCase());

    // Date filtering
    let matchesDate = true;
    if (selectedDate) {
      const recDate = new Date(rec.created_at).toISOString().slice(0, 10);
      matchesDate = recDate === selectedDate;
    }

    return matchesCategory && matchesSearch && matchesDate;
  });

  const getScoreBadge = (score: number, statusText: string) => {
    if (score >= 4) {
      return {
        scoreColor: 'text-[#16A34A]',
        badgeBg: 'bg-[#DCFCE7] text-[#166534]',
        label: statusText || 'Segar'
      };
    }
    if (score === 3) {
      return {
        scoreColor: 'text-amber-600',
        badgeBg: 'bg-amber-100 text-amber-800',
        label: statusText || 'Layu'
      };
    }
    if (score === 2) {
      return {
        scoreColor: 'text-orange-600',
        badgeBg: 'bg-orange-100 text-orange-800',
        label: statusText || 'Terlalu Matang'
      };
    }
    return {
      scoreColor: 'text-red-600',
      badgeBg: 'bg-red-100 text-red-800',
      label: statusText || 'Busuk'
    };
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' • ' +
        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return isoString;
    }
  };

  const formatButtonDate = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}`;
    } catch {
      return dateString;
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#1E293B] flex flex-col selection:bg-[#16A34A] selection:text-white">
      <Header
        mqttStatus={mqttStatus}
        battery={gasData.battery}
      />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-32 md:pb-16 space-y-4">
        {/* 1. TOP HEADER BAR */}
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Riwayat Analisis
          </h1>

          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition cursor-pointer"
            title="Cari Riwayat"
          >
            <Search className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Expandable Search Input Field */}
        {isSearchOpen && (
          <div className="relative animate-in fade-in duration-200">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama bahan pangan atau status..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs sm:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* 2. CATEGORY & POPOVER FILTER BAR (4 KOLOM PAS 1 BARIS) */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full pt-0.5">
          {(['Semua', 'Sayur', 'Buah'] as const).map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`py-2 px-1 rounded-full text-xs font-bold transition text-center cursor-pointer ${
                  isSelected
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'bg-slate-100 text-[#475569] hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}

          {/* POPOVER FILTER BUTTON */}
          <div className="relative w-full" ref={popoverRef}>
            <button
              type="button"
              onClick={handleTogglePopover}
              className={`w-full py-2 px-1 rounded-full text-xs font-bold border transition flex items-center justify-center space-x-1 cursor-pointer truncate ${
                selectedDate
                  ? 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
                  : isFilterPopoverOpen
                  ? 'border-[#2D7A38] text-[#2D7A38] bg-emerald-50/50'
                  : 'border-slate-200 text-[#475569] hover:bg-slate-50 bg-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{selectedDate ? formatButtonDate(selectedDate) : 'Filter'}</span>
              {selectedDate && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetFilter();
                  }}
                  className="z-20 ml-0.5 text-[#166534] hover:text-red-600"
                  title="Reset Filter"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>

            {/* MINI POPUP FILTER CARD TEPAT DI BAWAH BUTTON */}
            {isFilterPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-64 sm:w-72 bg-white rounded-2xl p-4 shadow-xl shadow-slate-900/10 border border-slate-100 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                {/* Header Kecil */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[#0F172A]">
                    <Calendar className="w-3.5 h-3.5 text-[#2D7A38]" />
                    <span>Filter Tanggal</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFilterPopoverOpen(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Input Tanggal Bersih */}
                <div className="space-y-1">
                  <input
                    type="date"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                  />
                </div>

                {/* Tombol Aksi Mini */}
                <div className="flex items-center space-x-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyFilter}
                    className="flex-1 py-2 bg-[#2D7A38] hover:bg-[#23632D] text-white font-bold text-[11px] rounded-xl transition flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Terapkan</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. SEAMLESS LIST OF ANALYSIS ITEMS */}
        <div className="divide-y divide-slate-100 pt-1">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <p className="text-sm font-semibold">Tidak ada riwayat analisis.</p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('Semua');
                  setSelectedDate('');
                  setSearchQuery('');
                }}
                className="text-xs text-[#2D7A38] font-bold hover:underline cursor-pointer"
              >
                Reset Semua Filter
              </button>
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const badge = getScoreBadge(rec.freshness_score, rec.status);
              return (
                <div
                  key={rec.id}
                  className="py-3.5 sm:py-4 px-1 sm:px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl transition group"
                >
                  {/* Left: Food Thumbnail & Info (Clickable to /riwayat/[id]) */}
                  <Link
                    href={`/riwayat/${rec.id}`}
                    className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1 cursor-pointer"
                  >
                    <img
                      src={rec.image_url}
                      alt={rec.item_name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 shadow-xs group-hover:scale-105 transition"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-[#0F172A] text-sm sm:text-base leading-tight truncate group-hover:text-[#2D7A38] transition">
                        {rec.item_name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-1 whitespace-nowrap">
                        {formatDate(rec.created_at)}
                      </p>
                    </div>
                  </Link>

                  {/* Right: Freshness Score, Delete Button & Chevron Icon */}
                  <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                    <Link
                      href={`/riwayat/${rec.id}`}
                      className="flex flex-col items-center justify-center text-center cursor-pointer"
                    >
                      <div className="flex items-baseline space-x-0.5">
                        <span className={`text-base sm:text-lg font-black leading-none ${badge.scoreColor}`}>
                          {rec.freshness_score}
                        </span>
                        <span className="text-xs font-bold text-slate-400 leading-none">/5</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 whitespace-nowrap leading-none ${badge.badgeBg}`}>
                        {badge.label}
                      </span>
                    </Link>

                    {/* Individual Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(rec);
                      }}
                      className="w-8 h-8 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-600 flex items-center justify-center transition cursor-pointer"
                      title="Hapus riwayat ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <Link href={`/riwayat/${rec.id}`} className="cursor-pointer">
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL: HAPUS SATU RIWAYAT */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-[#0F172A] text-base">Hapus Riwayat Ini?</h3>
              <p className="text-xs text-slate-500">
                Data analisis <strong>{itemToDelete.item_name}</strong> akan dihapus dari riwayat perangkat Anda.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(itemToDelete.id)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
