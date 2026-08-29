'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { mqttService } from '@/lib/mqtt';
import {
  User,
  Mail,
  Building,
  Phone,
  ArrowLeft,
  Save,
  CheckCircle2,
  Camera
} from 'lucide-react';

export default function EditProfilePage() {
  const router = useRouter();
  const [gasData] = useState(mqttService.getCurrentData());

  const [fullName, setFullName] = useState('Kelvin Rohmat Setiaji');
  const [email, setEmail] = useState('kelvin.rohmat@student.pens.ac.id');
  const [phone, setPhone] = useState('0812-3456-7890');
  const [institution, setInstitution] = useState('Politeknik Elektronika Negeri Surabaya (PENS)');
  const [role, setRole] = useState('Lead Researcher & IoT Engineer');
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      router.push('/profil');
    }, 900);
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
            <span className="text-xs font-medium text-[#64748B]">Ketuk kamera untuk ubah foto</span>
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-[#CBD5E1] rounded-xl text-[#0F172A] font-bold focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#334155] block">Alamat Email:</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-[#CBD5E1] rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                  required
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-[#CBD5E1] rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                />
              </div>
            </div>

            {/* Institution */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#334155] block">Instansi / Universitas:</label>
              <div className="relative flex items-center">
                <Building className="w-4 h-4 text-[#94A3B8] absolute left-3.5" />
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-[#CBD5E1] rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#334155] block">Peran / Posisi dalam Riset:</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-[#CBD5E1] rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2D7A38]"
              />
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
                <span>Simpan Profil</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
