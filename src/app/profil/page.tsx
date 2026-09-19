'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { mqttService, MQTTStatus } from '@/lib/mqtt';
import { GasData } from '@/types/circulsense';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  User,
  Pencil,
  Key,
  FileText,
  LogOut,
  ChevronRight,
  X,
  Sparkles
} from 'lucide-react';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal';

export default function ProfilPage() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const [gasData, setGasData] = useState<GasData>(mqttService.getCurrentData());
  const [mqttStatus, setMqttStatus] = useState<MQTTStatus>('disconnected');

  // Modal Dialog for Security & Logout
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // User States
  const fullName = profile?.nama_lengkap || user?.user_metadata?.nama_lengkap || user?.email?.split('@')[0] || 'Pengguna CirculSense';
  const email = profile?.email || user?.email || '-';
  const role = profile?.peran || user?.user_metadata?.peran || 'Pengguna / Peneliti';

  // Password update
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

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

  const handleConfirmSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setIsLogoutModalOpen(false);
      router.push('/masuk?alert=logout_success');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordErr('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordErr(error.message);
      } else {
        setPasswordMsg('Kata sandi berhasil diperbarui!');
        setTimeout(() => {
          setPasswordMsg('');
          setIsSecurityModalOpen(false);
        }, 1200);
      }
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#1E293B] flex flex-col selection:bg-[#16A34A] selection:text-white">
      <Header
        mqttStatus={mqttStatus}
        battery={gasData.battery}
      />

      <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-8 py-8 pb-32 md:pb-16 space-y-8">
        {/* 1. SEAMLESS PROFILE HEADER */}
        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-[#2D7A38] to-[#1E5728] text-white flex items-center justify-center font-bold text-3xl shadow-sm ring-4 ring-[#DCFCE7]/60">
              <User className="w-12 h-12 text-white stroke-[1.5]" />
            </div>

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
              <span>{role}</span>
            </div>
          </div>
        </div>

        {/* Subtle Section Divider */}
        <div className="border-t border-[#F1F5F9]" />

        {/* 2. MENU LIST */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] px-3 pb-1">
            Menu Akun & Konfigurasi
          </div>

          {/* Edit Profil */}
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
                <span className="text-[11px] text-[#64748B]">Nama, nomor telepon, dan peran</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition" />
          </Link>

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
                <span className="text-[11px] text-[#64748B]">Lihat riwayat pemindaian bahan pangan akun Anda</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition" />
          </Link>

          {/* Keamanan & Sandi */}
          <div
            onClick={() => setIsSecurityModalOpen(true)}
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
                <span className="text-[11px] text-[#64748B]">Perbarui kata sandi akun Supabase</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition" />
          </div>

          <div className="border-t border-[#F1F5F9] my-2" />

          {/* Keluar Akun */}
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl hover:bg-red-50 transition cursor-pointer text-red-600 group text-left"
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
          </button>
        </div>
      </div>

      {/* MODAL: KEAMANAN & SANDI */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="font-extrabold text-[#0F172A] text-base">Ubah Kata Sandi</h3>
              <button
                type="button"
                onClick={() => setIsSecurityModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordErr && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                {passwordErr}
              </div>
            )}

            {passwordMsg && (
              <div className="p-3 bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-xs font-semibold rounded-xl">
                {passwordMsg}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#334155] block mb-1">Kata Sandi Baru:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordErr('');
                  }}
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

      {/* Modal Konfirmasi Keluar Akun */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmSignOut}
        isLoading={isLoggingOut}
      />

      <BottomNav />
    </main>
  );
}
