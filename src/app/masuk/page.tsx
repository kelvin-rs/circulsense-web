'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/beranda';
  const emailParam = searchParams.get('email') || '';
  const isVerified = searchParams.get('verified') === 'true';

  const { signIn } = useAuth();
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedBanner, setVerifiedBanner] = useState(isVerified);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Silakan lengkapi alamat email dan kata sandi Anda.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await signIn(email, password);
    if (res.error) {
      setErrorMsg(res.error);
      setLoading(false);
    } else {
      router.push(redirectUrl);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
          Masuk ke CirculSense
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Akses riwayat fusi biokimia dan dasbor dampak lingkungan akun Anda
        </p>
      </div>

      {verifiedBanner && (
        <div className="p-3.5 bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-xs font-semibold rounded-xl flex items-center space-x-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Email Anda terkonfirmasi! Silakan masukkan kata sandi untuk masuk.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl animate-in fade-in duration-150">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Field Email */}
        <div className="space-y-1">
          <label className="font-bold text-[#334155] block">Alamat Email:</label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan alamat email terdaftar"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D7A38] text-xs sm:text-sm"
              required
            />
          </div>
        </div>

        {/* Field Kata Sandi */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-bold text-[#334155]">Kata Sandi:</label>
          </div>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi akun Anda"
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

        {/* Tombol Submit Masuk */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2D7A38] hover:bg-[#23632D] text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 text-xs sm:text-sm shadow-xs cursor-pointer disabled:opacity-60"
        >
          <span>{loading ? 'Memverifikasi Kredensial...' : 'Masuk Sekarang'}</span>
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
        Belum memiliki akun?{' '}
        <Link href="/daftar" className="text-[#2D7A38] font-bold hover:underline">
          Daftar Akun Baru
        </Link>
      </div>
    </div>
  );
}

export default function MasukPage() {
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

      {/* Kontainer Form Masuk wrapped in Suspense */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <Suspense fallback={<div className="text-xs text-slate-400 font-bold">Memuat form login...</div>}>
          <LoginForm />
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-100 bg-white">
        © 2026 CirculSense AI • Sistem Cerdas Fusi Sensor & Evaluasi Pangan
      </footer>
    </main>
  );
}
