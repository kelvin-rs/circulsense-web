'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { mqttService } from '@/lib/mqtt';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  ArrowLeft,
  Save,
  CheckCircle2,
  Camera
} from 'lucide-react';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();
  const [gasData] = useState(mqttService.getCurrentData());

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.nama_lengkap || '');
      setEmail(profile.email || user?.email || '');
      setPhone(profile.nomor_telepon || '');
      setRole(profile.peran || 'Pengguna / Peneliti');
    } else if (user) {
      setFullName(user.user_metadata?.nama_lengkap || user.email?.split('@')[0] || '');
      setEmail(user.email || '');
      setRole(user.user_metadata?.peran || 'Pengguna / Peneliti');
    }
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) {
      setErrorMsg('Nama lengkap tidak boleh kosong');
      return;
    }

    const res = await updateProfile({
      nama_lengkap: fullName,
      nomor_telepon: phone,
      peran: role
    });

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        router.push('/profil');
      }, 900);
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#1E293B] flex flex-col selection:bg-[#16A34A] selection:text-white">
      <Header
        mqttStatus="disconnected"
        battery={gasData.battery}
      />

      <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-8 py-6 pb-32 md:pb-16 space-y-6">
        {/* Back Link & Page Title Header */}
        <div className="flex items-center space-x-3.5 pb-3 border-b border-[#F1F5F9]">
          <Link
            href="/profil"
            className="w-10 h-10 rounded-xl bg-slate-100 text-[#334155] flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Edit Data Diri
            </h1>
            <p className="text-xs text-[#64748B]">
              Perbarui identitas profil dan kontak akun CirculSense Anda
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
            {errorMsg}
          </div>
        )}

        {isSaved && (
          <div className="p-3.5 bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-xs font-bold rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Perubahan profil berhasil disimpan! Mengalihkan ke profil...</span>
          </div>
        )}

        {/* Seamless Edit Form */}
        <div className="space-y-6 pt-2">
          {/* Avatar Photo Edit */}
          <div className="flex flex-col items-center space-y-2 pb-4 border-b border-[#F1F5F9]">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-[#2D7A38] to-[#1E5728] text-white flex items-center justify-center font-bold text-3xl shadow-sm ring-4 ring-[#DCFCE7]/60">
                <User className="w-12 h-12 text-white stroke-[1.5]" />
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#2D7A38] text-white flex items-center justify-center shadow-md ring-2 ring-white hover:bg-[#23632D] transition cursor-pointer"
                title="Ganti Foto Profil"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs font-medium text-[#64748B]">Foto Profil Akun</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#334155] block">Nama Lengkap:</label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-[#CBD5E1] rounded-xl text-[#0F172A] font-bold focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                  required
                />
              </div>
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#334155] block">Alamat Email (Akun Auth):</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5" />
                <input
                  type="email"
                  value={email}
                  disabled
                  placeholder="Alamat email akun terdaftar"
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-[#CBD5E1] rounded-xl text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#334155] block">Nomor Telepon / WhatsApp:</label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Masukkan nomor kontak Anda (contoh: 081234567890)"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-[#CBD5E1] rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#334155] block">Peran / Profesi:</label>
              <div className="relative flex items-center">
                <Briefcase className="w-4 h-4 text-[#94A3B8] absolute left-3.5" />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Masukkan peran Anda (contoh: Peneliti / Pengguna Umum)"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-[#CBD5E1] rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center space-x-3">
              <Link
                href="/profil"
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#334155] font-bold py-3.5 rounded-xl text-center transition cursor-pointer"
              >
                Batal
              </Link>
              <button
                type="submit"
                className="flex-1 bg-[#2D7A38] hover:bg-[#23632D] text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
