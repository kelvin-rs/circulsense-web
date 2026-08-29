'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { mqttService, MQTTStatus } from '@/lib/mqtt';
import { GasData } from '@/types/circulsense';
import {
  User,
  Pencil,
  Sliders,
  Key,
  FileText,
  LogOut,
  ChevronRight,
  X,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export default function ProfilPage() {
  const [gasData, setGasData] = useState<GasData>(mqttService.getCurrentData());
  const [mqttStatus, setMqttStatus] = useState<MQTTStatus>('disconnected');

  // Modal Dialogs for Hardware & Security
  const [activeModal, setActiveModal] = useState<'hardware' | 'security' | null>(null);

  // User States
  const [fullName] = useState('Kelvin Rohmat Setiaji');
  const [email] = useState('kelvin.rohmat@student.pens.ac.id');
  const [institution] = useState('Politeknik Elektronika Negeri Surabaya (PENS)');
  const [isSaved, setIsSaved] = useState(false);

  // Hardware settings
  const [brokerInput, setBrokerInput] = useState<string>(mqttService.getBrokerUrl());
  const [topicInput, setTopicInput] = useState<string>(mqttService.getTopic());
  const [mq4R0, setMq4R0] = useState<number>(10.0);
  const [mq135R0, setMq135R0] = useState<number>(36.0);

  useEffect(() => {
    mqttService.init();

    const unsubMqtt = mqttService.subscribe((data) => {
      setGasData(data);
    });

    const unsubStatus = mqttService.onStatusChange((status) => {
      setMqttStatus(status);
    });

    return () => {
      unsubMqtt();
      unsubStatus();
    };
  }, []);

  const handleSaveHardware = () => {
    setIsSaved(true);
    mqttService.connect(brokerInput, topicInput);
    setTimeout(() => {
      setIsSaved(false);
      setActiveModal(null);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-white text-[#1E293B] flex flex-col selection:bg-[#16A34A] selection:text-white">
      <Header
        mqttStatus={mqttStatus}
        battery={gasData.battery}
      />

      <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-8 py-8 pb-32 md:pb-16 space-y-8">
        {/* 1. SEAMLESS PROFILE HEADER (MENYATU DENGAN HALAMAN) */}
        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          {/* Avatar with Floating Edit Pen Icon */}
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-[#2D7A38] to-[#1E5728] text-white flex items-center justify-center font-bold text-3xl shadow-sm ring-4 ring-[#DCFCE7]/60">
              <User className="w-12 h-12 text-white stroke-[1.5]" />
            </div>

            {/* Icon Tulis untuk Membuka Halaman Edit Profile */}
            <Link
              href="/profil/edit"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#2D7A38] text-white hover:bg-[#23632D] transition shadow-md flex items-center justify-center cursor-pointer ring-2 ring-white"
              title="Edit Profil Pengguna"
            >
              <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>

          {/* User Info Details */}
          <div className="space-y-1.5 max-w-md">
            <div className="flex items-center justify-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
                {fullName}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] font-medium">{email}</p>
            <div className="flex items-center justify-center space-x-1.5 text-xs text-[#2D7A38] font-bold pt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{institution} • Tim BismillahFinal</span>
            </div>
          </div>
        </div>

        {/* Subtle Section Divider */}
        <div className="border-t border-[#F1F5F9]" />

        {/* 2. SEAMLESS MENU LIST (MENYATU TANPA KOTAK KARDUS BERTUMPUK) */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] px-3 pb-1">
            Menu Akun & Konfigurasi
          </div>

          {/* Edit Profil Link to Dedicated Page */}
          <Link
            href="/profil/edit"
            className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#DCFCE7]/70 text-[#166534] flex items-center justify-center group-hover:bg-[#DCFCE7] transition">
                <Pencil className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] block">
                  Edit Data Diri
                </span>
                <span className="text-[11px] text-[#64748B]">Nama, email, nomor telepon, dan instansi</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition" />
          </Link>

          {/* Kalibrasi Sensor & MQTT */}
          <div
            onClick={() => setActiveModal('hardware')}
            className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] block">
                  Kalibrasi Sensor & MQTT
                </span>
                <span className="text-[11px] text-[#64748B]">Broker EMQX, MQ-4 & MQ-135</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition" />
          </div>

          {/* Riwayat Sesi Analisis */}
          <Link
            href="/riwayat"
            className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] block">
                  Riwayat Analisis Fusi
                </span>
                <span className="text-[11px] text-[#64748B]">Lihat riwayat pemindaian bahan pangan</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition" />
          </Link>

          {/* Keamanan & Sandi */}
          <div
            onClick={() => setActiveModal('security')}
            className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] block">
                  Keamanan & Kata Sandi
                </span>
                <span className="text-[11px] text-[#64748B]">Perbarui kata sandi akun</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition" />
          </div>

          <div className="border-t border-[#F1F5F9] my-2" />

          {/* Keluar Akun */}
          <Link
            href="/masuk"
            className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl hover:bg-red-50 transition cursor-pointer text-red-600 group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-100 transition">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold block">Keluar Akun</span>
                <span className="text-[11px] text-red-400">Sign out dari sesi perangkat ini</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>
      </div>

      {/* MODAL: KALIBRASI HARDWARE & MQTT */}
      {activeModal === 'hardware' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="font-extrabold text-[#0F172A] text-base">Konfigurasi IoT & Sensor</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#334155] block mb-1">EMQX Broker WebSocket:</label>
                <input
                  type="text"
                  value={brokerInput}
                  onChange={(e) => setBrokerInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#CBD5E1] rounded-xl font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                />
              </div>

              <div>
                <label className="font-bold text-[#334155] block mb-1">Topik MQTT ESP32:</label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#CBD5E1] rounded-xl font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-[#F1F5F9]">
                <div className="flex justify-between font-bold">
                  <span>MQ-4 R0 Baseline (Metana):</span>
                  <span className="text-[#2D7A38] font-mono">{mq4R0.toFixed(1)} kΩ</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="25.0"
                  step="0.5"
                  value={mq4R0}
                  onChange={(e) => setMq4R0(Number(e.target.value))}
                  className="w-full accent-[#2D7A38] cursor-pointer"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between font-bold">
                  <span>MQ-135 R0 Baseline (Kualitas Udara):</span>
                  <span className="text-[#2D7A38] font-mono">{mq135R0.toFixed(1)} kΩ</span>
                </div>
                <input
                  type="range"
                  min="10.0"
                  max="60.0"
                  step="1.0"
                  value={mq135R0}
                  onChange={(e) => setMq135R0(Number(e.target.value))}
                  className="w-full accent-[#2D7A38] cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveHardware}
                  className="w-full bg-[#2D7A38] hover:bg-[#23632D] text-white font-bold py-3 rounded-xl transition cursor-pointer shadow-xs"
                >
                  {isSaved ? 'Berhasil Disimpan ✓' : 'Terapkan Pengaturan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KEAMANAN & SANDI */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="font-extrabold text-[#0F172A] text-base">Ubah Kata Sandi</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsSaved(true);
                setTimeout(() => {
                  setIsSaved(false);
                  setActiveModal(null);
                }, 1000);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-[#334155] block mb-1">Kata Sandi Lama:</label>
                <input
                  type="password"
                  placeholder="Masukkan kata sandi lama"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#334155] block mb-1">Kata Sandi Baru:</label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#2D7A38] hover:bg-[#23632D] text-white font-bold py-3 rounded-xl transition cursor-pointer shadow-xs"
                >
                  Perbarui Kata Sandi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
