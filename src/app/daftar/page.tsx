'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight, Check, X } from 'lucide-react';

export default function DaftarPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Aturan Validasi Kata Sandi Kuat
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasSymbol;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg('Harap lengkapi semua kolom formulir pendaftaran.');
      return;
    }

    if (!hasMinLength) {
      setErrorMsg('Kata sandi harus terdiri dari minimal 6 karakter.');
      return;
    }

    if (!hasUppercase) {
      setErrorMsg('Kata sandi harus mengandung setidaknya 1 huruf besar (kapital A-Z).');
      return;
    }

    if (!hasSymbol) {
      setErrorMsg('Kata sandi harus mengandung setidaknya 1 karakter simbol (contoh: !@#$%^&*).');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Kata sandi dan konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await signUp(email, password, {
      nama_lengkap: fullName
    });

    if (res.error) {
      setErrorMsg(res.error);
      setLoading(false);
    } else {
      setSuccessMsg('Pendaftaran berhasil! Mengalihkan ke Beranda...');
      setTimeout(() => {
        window.location.href = '/beranda';
      }, 500);
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#1E293B] flex flex-col justify-between selection:bg-[#16A34A] selection:text-white">
      {/* Header Bersih */}
      <header className="w-full bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/beranda" className="flex items-center space-x-2.5 select-none">
            <div className="w-9 h-9 rounded-xl bg-[#2D7A38] flex items-center justify-center text-white font-bold text-base">
              C
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-extrabold text-[#0F172A] text-lg tracking-tight">CirculSense</span>
              <span className="text-[#16A34A] font-extrabold text-lg">AI</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Kontainer Form Daftar */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Daftar Akun CirculSense
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Mulai Pemantauan Kesegaran Bahan Makanan
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl animate-in fade-in duration-150">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-xs font-semibold rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            {/* Field Nama Lengkap */}
            <div className="space-y-1">
              <label className="font-bold text-[#334155] block">Nama Lengkap:</label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D7A38] text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            {/* Field Email */}
            <div className="space-y-1">
              <label className="font-bold text-[#334155] block">Alamat Email:</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan alamat email aktif"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D7A38] text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            {/* Field Kata Sandi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#334155] block">Kata Sandi:</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 karakter, huruf besar & simbol"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D7A38] text-xs sm:text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#334155] block">Konfirmasi Sandi:</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D7A38] text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Indikator Checklist Kriteria Kata Sandi Kuat */}
            {password.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                <div className="text-[11px] font-bold text-slate-600">
                  Syarat Keamanan Kata Sandi:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                  <div
                    className={`flex items-center space-x-1 font-semibold ${
                      hasMinLength ? 'text-[#16A34A]' : 'text-slate-400'
                    }`}
                  >
                    {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>Min. 6 karakter</span>
                  </div>

                  <div
                    className={`flex items-center space-x-1 font-semibold ${
                      hasUppercase ? 'text-[#16A34A]' : 'text-slate-400'
                    }`}
                  >
                    {hasUppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>Huruf besar (A-Z)</span>
                  </div>

                  <div
                    className={`flex items-center space-x-1 font-semibold ${
                      hasSymbol ? 'text-[#16A34A]' : 'text-slate-400'
                    }`}
                  >
                    {hasSymbol ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>Simbol (!@#$%)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tombol Submit Daftar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D7A38] hover:bg-[#23632D] text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 text-xs sm:text-sm shadow-xs cursor-pointer disabled:opacity-60"
            >
              <span>{loading ? 'Mendaftarkan Akun ke Supabase...' : 'Daftar Sekarang'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            Sudah memiliki akun?{' '}
            <Link href="/masuk" className="text-[#2D7A38] font-bold hover:underline">
              Masuk di sini
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-100 bg-white">
        © 2026 CirculSense AI • Sistem Cerdas Fusi Sensor & Evaluasi Pangan
      </footer>
    </main>
  );
}
