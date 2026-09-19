'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { fetchScanRecords, deleteScanRecord, clearAllScanRecords } from '@/lib/supabase';
import { ScanRecord, GasData } from '@/types/circulsense';
import { mqttService, MQTTStatus } from '@/lib/mqtt';
import {
  Search,
  ChevronRight,
  X,
  Calendar,
  Trash2,
  Check,
  RotateCcw,
  Camera,
  Layers
} from 'lucide-react';
import { AutoAlert, AlertType } from '@/components/AutoAlert';

export default function RiwayatPage() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<'Semua' | 'Sayur' | 'Buah'>('Semua');
  const [alertState, setAlertState] = useState<{ type: AlertType; title: string; message: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [tempDate, setTempDate] = useState<string>('');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [gasData, setGasData] = useState<GasData>(mqttService.getCurrentData());
  const [mqttStatus, setMqttStatus] = useState<MQTTStatus>('disconnected');

  const popoverRef = useRef<HTMLDivElement>(null);
  const [itemToDelete, setItemToDelete] = useState<ScanRecord | null>(null);
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchScanRecords();
      setRecords(data || []);
    } catch (e) {
      console.error('Error fetching scan records from DB:', e);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  }, [loadData]);

  const handleDeleteItem = async (id: string) => {
    await deleteScanRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setItemToDelete(null);
    setAlertState({
      type: 'info',
      title: 'Sampel Dihapus',
      message: 'Catatan pemindaian berhasil dihapus dari riwayat.'
    });
  };

  const handleClearAllRecords = async () => {
    setIsClearing(true);
    try {
      await clearAllScanRecords();
      setRecords([]);
      setIsConfirmClearAllOpen(false);
      setAlertState({
        type: 'success',
        title: 'Riwayat Dibersihkan',
        message: 'Seluruh riwayat pemindaian berhasil dihapus dari database.'
      });
    } catch (e: any) {
      setAlertState({
        type: 'error',
        title: 'Gagal Menghapus',
        message: e?.message || 'Terjadi kesalahan saat membersihkan riwayat.'
      });
    } finally {
      setIsClearing(false);
    }
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
      (rec.action_taken && rec.action_taken.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rec.status && rec.status.toLowerCase().includes(searchQuery.toLowerCase()));

    // Date filtering
    let matchesDate = true;
    if (selectedDate && rec.created_at) {
      const recDate = new Date(rec.created_at).toISOString().slice(0, 10);
      matchesDate = recDate === selectedDate;
    }

    return matchesCategory && matchesSearch && matchesDate;
  });

  const getScoreBadge = (score: number, statusText: string) => {
    const pct = score > 5 ? score : score * 20;
    if (statusText === 'Busuk' || pct < 40) {
      return {
        scoreColor: 'text-red-600',
        badgeBg: 'bg-red-100 text-red-800',
        label: statusText || 'Busuk'
      };
    }
    if (statusText === 'Terlalu Matang' || (pct >= 40 && pct < 60)) {
      return {
        scoreColor: 'text-orange-600',
        badgeBg: 'bg-orange-100 text-orange-800',
        label: statusText || 'Terlalu Matang'
      };
    }
    if (statusText === 'Layu' || (pct >= 60 && pct < 75)) {
      return {
        scoreColor: 'text-amber-600',
        badgeBg: 'bg-amber-100 text-amber-800',
        label: statusText || 'Layu'
      };
    }
    return {
      scoreColor: 'text-[#16A34A]',
      badgeBg: 'bg-[#DCFCE7] text-[#166534]',
      label: statusText || 'Segar'
    };
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
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
      const [, month, day] = dateString.split('-');
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
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
              Riwayat Analisis
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Data pemindaian real-time dari database
            </p>
          </div>

          <div className="flex items-center space-x-1.5">
            {records.length > 0 && (
              <button
                type="button"
                onClick={() => setIsConfirmClearAllOpen(true)}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-200 transition cursor-pointer flex items-center space-x-1"
                title="Hapus Semua Riwayat"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus Semua</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition cursor-pointer"
              title="Cari Riwayat"
            >
              <Search className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
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
              placeholder="Ketik nama bahan pangan, status kesegaran, atau rekomendasi..."
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

        {/* 2. CATEGORY & POPOVER FILTER BAR */}
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

            {/* MINI POPUP FILTER CARD */}
            {isFilterPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-64 sm:w-72 bg-white rounded-2xl p-4 shadow-xl shadow-slate-900/10 border border-slate-100 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
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

                <div className="space-y-1">
                  <input
                    type="date"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                  />
                </div>

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
          {isLoading ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 border-3 border-[#2D7A38] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#64748B] font-medium">Memuat data riwayat dari database...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Layers className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#0F172A]">Belum Ada Riwayat Analisis</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Semua hasil pemindaian dan fusi sensor akan tersimpan secara real-time di sini.
                </p>
              </div>
              <Link
                href="/beranda"
                className="inline-flex items-center space-x-1.5 bg-[#2D7A38] hover:bg-[#23632D] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Mulai Pindai Bahan</span>
              </Link>
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const badge = getScoreBadge(rec.freshness_score, rec.status);
              return (
                <div
                  key={rec.id}
                  className="py-3.5 sm:py-4 px-1 sm:px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl transition group"
                >
                  {/* Left: Food Thumbnail & Info */}
                  <Link
                    href={`/riwayat/${rec.id}`}
                    className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1 cursor-pointer"
                  >
                    {rec.image_url ? (
                      <img
                        src={rec.image_url}
                        alt={rec.item_name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 shadow-xs group-hover:scale-105 transition border border-slate-100"
                      />
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Layers className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-[#0F172A] text-sm sm:text-base leading-tight truncate group-hover:text-[#2D7A38] transition">
                        {rec.item_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <p className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                          {formatDate(rec.created_at)}
                        </p>
                        {rec.shelf_life_hours != null && (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                              rec.status === 'Busuk' || rec.freshness_score <= 1
                                ? 'text-red-800 bg-red-50 border-red-200'
                                : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                            }`}
                          >
                            {rec.status === 'Busuk' || rec.freshness_score <= 1
                              ? 'Sisa 0 Jam (Pilah)'
                              : `Sisa ${rec.shelf_life_hours} Jam`}
                          </span>
                        )}
                        {rec.disease_detected && !rec.disease_detected.toLowerCase().includes('normal') && !rec.disease_detected.toLowerCase().includes('bebas') && (
                          <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            ⚠ {rec.disease_detected}
                          </span>
                        )}
                      </div>
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
                        <span className="text-xs font-bold text-slate-400 leading-none">
                          {rec.freshness_score > 5 ? '%' : '/5'}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1.5 whitespace-nowrap leading-none ${badge.badgeBg}`}>
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
                Data analisis <strong>{itemToDelete.item_name}</strong> akan dihapus dari database Anda.
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

      {/* CONFIRMATION MODAL: HAPUS SEMUA RIWAYAT */}
      {isConfirmClearAllOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-[#0F172A] text-base">Hapus Semua Riwayat?</h3>
              <p className="text-xs text-slate-500">
                Seluruh <strong>{records.length} data riwayat analisis</strong> akan dihapus secara permanen dari database Anda.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setIsConfirmClearAllOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearAllRecords}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isClearing ? 'Menghapus...' : 'Ya, Hapus Semua'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
