'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { fetchScanRecords, calculateImpactSummary } from '@/lib/supabase';
import { ImpactSummary, GasData } from '@/types/circulsense';
import { mqttService, MQTTStatus } from '@/lib/mqtt';
import {
  Calendar,
  ChevronDown,
  Sprout,
  Trash,
  BarChart3,
  Wallet
} from 'lucide-react';

type FilterPeriod = 'tahunan' | 'bulanan' | 'tanggal';

export default function LaporanPage() {
  const [filterType, setFilterType] = useState<FilterPeriod>('bulanan');
  const [selectedYear, setSelectedYear] = useState<string>('2025 - 2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('Mei 2025');
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-29');

  const [summary, setSummary] = useState<ImpactSummary>({
    month_name: 'Mei 2025',
    food_saved_kg: 18,
    food_composted_kg: 10,
    total_scans: 28,
    upcycle_percent: 64,
    compost_percent: 36,
    ch4_prevented_g: 245.6,
    forest_absorbed_sqm: 6.1,
    co2e_prevented_g: 612.3,
    trees_absorbed: 0.61,
    total_financial_saved_idr: 150000
  });

  const [gasData, setGasData] = useState<GasData>(mqttService.getCurrentData());
  const [mqttStatus, setMqttStatus] = useState<MQTTStatus>('disconnected');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    mqttService.init();

    const unsubMqtt = mqttService.subscribe((data) => {
      setGasData(data);
    });

    const unsubStatus = mqttService.onStatusChange((status) => {
      setMqttStatus(status);
    });

    loadData();

    return () => {
      unsubMqtt();
      unsubStatus();
    };
  }, []);

  const loadData = async () => {
    const records = await fetchScanRecords();
    if (records && records.length > 0) {
      const calculated = calculateImpactSummary(records);
      setSummary({
        month_name: 'Mei 2025',
        food_saved_kg: calculated.food_saved_kg || 18,
        food_composted_kg: calculated.food_composted_kg || 10,
        total_scans: calculated.total_scans || 28,
        upcycle_percent: calculated.upcycle_percent || 64,
        compost_percent: calculated.compost_percent || 36,
        ch4_prevented_g: calculated.ch4_prevented_g || 245.6,
        forest_absorbed_sqm: calculated.forest_absorbed_sqm || 6.1,
        co2e_prevented_g: calculated.co2e_prevented_g || 612.3,
        trees_absorbed: calculated.trees_absorbed || 0.61,
        total_financial_saved_idr: calculated.total_financial_saved_idr || 150000
      });
    }
  };

  // Multiplier switch
  const getMultiplier = () => {
    if (filterType === 'tahunan') return 12;
    if (filterType === 'tanggal') return 0.25;
    return 1;
  };

  const multiplier = getMultiplier();
  const currentSavedKg = Math.round(summary.food_saved_kg * multiplier * 10) / 10;
  const currentCompostKg = Math.round(summary.food_composted_kg * multiplier * 10) / 10;
  const currentScans = Math.round(summary.total_scans * multiplier);
  const currentCh4 = Math.round(summary.ch4_prevented_g * multiplier * 10) / 10;
  const currentCo2e = Math.round(summary.co2e_prevented_g * multiplier * 10) / 10;
  const currentForest = Math.round(summary.forest_absorbed_sqm * multiplier * 10) / 10;
  const currentTrees = Math.round(summary.trees_absorbed * multiplier * 100) / 100;
  const currentSavings = Math.round(summary.total_financial_saved_idr * multiplier);

  // SVG Donut Chart Geometry
  const size = 130;
  const strokeWidth = 22;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const upcycleOffset = circumference - (summary.upcycle_percent / 100) * circumference;

  const months = ['Mei 2025', 'April 2025', 'Maret 2025', 'Februari 2025'];

  return (
    <main className="min-h-screen bg-white text-[#1E293B] flex flex-col selection:bg-[#16A34A] selection:text-white">
      <Header
        mqttStatus={mqttStatus}
        battery={gasData.battery}
      />

      <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-5 pb-32 md:pb-16 space-y-5">
        {/* 1. SEGMENTED FILTER BAR (SESUAI TEMA HIJAU CIRCULSENSE) */}
        <div className="space-y-2">
          <div className="w-full bg-slate-100/80 p-1 rounded-xl flex items-center shadow-2xs">
            {/* Tab Tahunan */}
            <button
              type="button"
              onClick={() => setFilterType('tahunan')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold transition-all text-center rounded-lg cursor-pointer ${
                filterType === 'tahunan'
                  ? 'bg-[#2D7A38] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#2D7A38]'
              }`}
            >
              Tahunan
            </button>

            {/* Tab Bulanan */}
            <button
              type="button"
              onClick={() => setFilterType('bulanan')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold transition-all text-center rounded-lg cursor-pointer ${
                filterType === 'bulanan'
                  ? 'bg-[#2D7A38] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#2D7A38]'
              }`}
            >
              Bulanan
            </button>

            {/* Tab Tanggal */}
            <button
              type="button"
              onClick={() => setFilterType('tanggal')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold transition-all text-center rounded-lg cursor-pointer ${
                filterType === 'tanggal'
                  ? 'bg-[#2D7A38] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#2D7A38]'
              }`}
            >
              Tanggal
            </button>
          </div>

          {/* Sub-selector & Timestamp Ringkas */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400 font-medium">
              Update: 29 Agu 2026, 16:24
            </span>

            {filterType === 'bulanan' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Calendar className="w-3 h-3 text-[#2D7A38]" />
                  <span>{selectedMonth}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isMonthDropdownOpen && (
                  <div className="absolute right-0 top-8 bg-white border border-slate-100 rounded-xl shadow-xl p-1 z-20 min-w-[130px] space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                    {months.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(m);
                          setIsMonthDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          selectedMonth === m
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {filterType === 'tahunan' && (
              <span className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                Tahun: {selectedYear}
              </span>
            )}

            {filterType === 'tanggal' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-[#2D7A38]"
              />
            )}
          </div>
        </div>

        {/* 2. BAGIAN: RINGKASAN */}
        <section className="space-y-2.5">
          <h2 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
            Ringkasan
          </h2>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {/* Kartu 1: Diselamatkan */}
            <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col items-center text-center space-y-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#2D7A38] flex items-center justify-center">
                <Sprout className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold text-[#2D7A38] leading-tight">
                Diselamatkan
              </span>
              <div>
                <span className="text-xl sm:text-2xl font-extrabold text-[#0F172A] leading-none block">
                  {currentSavedKg}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">kg</span>
              </div>
            </div>

            {/* Kartu 2: Dikomposkan */}
            <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col items-center text-center space-y-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#2D7A38] flex items-center justify-center">
                <Trash className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold text-[#2D7A38] leading-tight">
                Dikomposkan
              </span>
              <div>
                <span className="text-xl sm:text-2xl font-extrabold text-[#0F172A] leading-none block">
                  {currentCompostKg}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">kg</span>
              </div>
            </div>

            {/* Kartu 3: Total Analisis */}
            <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col items-center text-center space-y-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#2D7A38] flex items-center justify-center">
                <BarChart3 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 leading-tight">
                Analisis
              </span>
              <div>
                <span className="text-xl sm:text-2xl font-extrabold text-[#0F172A] leading-none block">
                  {currentScans}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">kali</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. BAGIAN: GRAFIK REDUKSI SAMPAH */}
        <section className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
            Grafik Reduksi Sampah
          </h2>

          <div className="flex items-center justify-around gap-4 py-1">
            {/* Donut Chart */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  className="text-amber-500"
                  strokeWidth={strokeWidth}
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  className="text-[#2D7A38] transition-all duration-700"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={upcycleOffset}
                  strokeLinecap="butt"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
            </div>

            {/* Label Persentase */}
            <div className="space-y-3">
              <div className="flex items-baseline space-x-2">
                <span className="text-xl sm:text-2xl font-extrabold text-[#2D7A38]">
                  {summary.upcycle_percent}%
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-700">Upcycle</span>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-xl sm:text-2xl font-extrabold text-amber-600">
                  {summary.compost_percent}%
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-700">Kompos</span>
              </div>
            </div>
          </div>

          {/* Legenda Ringkas */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2D7A38]" />
                <span className="font-medium text-slate-600">Upcycle</span>
              </div>
              <span className="font-bold text-slate-800">{currentSavedKg} kg</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-medium text-slate-600">Kompos</span>
              </div>
              <span className="font-bold text-slate-800">{currentCompostKg} kg</span>
            </div>
          </div>
        </section>

        {/* 4. BAGIAN: EMISI TERCEGAH */}
        <section className="space-y-2.5">
          <h2 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
            Emisi Tercegah
          </h2>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Kartu CH4 */}
            <div className="bg-white border border-slate-100 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-0.5 text-center">
              <span className="text-xs font-bold text-slate-600 block">CH₄ (Metana)</span>
              <div className="text-lg sm:text-xl font-black text-[#0F172A]">
                {currentCh4} <span className="text-xs font-normal text-slate-400">g</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                ≈ {currentForest} m² hutan
              </p>
            </div>

            {/* Kartu CO2e */}
            <div className="bg-white border border-slate-100 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-0.5 text-center">
              <span className="text-xs font-bold text-slate-600 block">CO₂e</span>
              <div className="text-lg sm:text-xl font-black text-[#0F172A]">
                {currentCo2e} <span className="text-xs font-normal text-slate-400">g</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                ≈ {currentTrees} pohon
              </p>
            </div>
          </div>
        </section>

        {/* 5. BAGIAN: PENGHEMATAN */}
        <section className="space-y-2.5">
          <h2 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
            Penghematan
          </h2>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-600 block">Total Penghematan</span>
              <div className="text-xl sm:text-2xl font-extrabold text-[#2D7A38]">
                Rp {currentSavings.toLocaleString('id-ID')}
              </div>
              <span className="text-[11px] text-slate-400 font-medium block">
                {filterType === 'tahunan' ? 'Tahun ini' : filterType === 'tanggal' ? 'Hari ini' : 'Bulan ini'}
              </span>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#2D7A38] flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 stroke-[1.8]" />
            </div>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
