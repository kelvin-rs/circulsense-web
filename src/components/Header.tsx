'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MQTTStatus } from '@/lib/mqtt';

interface HeaderProps {
  mqttStatus: MQTTStatus;
  battery: number;
}

export const Header: React.FC<HeaderProps> = () => {
  const pathname = usePathname();

  const navLinks = [
    { href: '/beranda', label: 'Beranda' },
    { href: '/riwayat', label: 'Riwayat Analisis' },
    { href: '/laporan', label: 'Laporan Dampak' },
    { href: '/profil', label: 'Profil' }
  ] as const;

  return (
    <header className="w-full bg-white border-b border-[#E2E8F0] sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Identitas Brand */}
          <Link href="/beranda" className="flex items-center space-x-2.5 sm:space-x-3 select-none">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#2D7A38] flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0">
              C
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-[#0F172A] text-base sm:text-xl tracking-tight leading-tight">
                CirculSense
              </span>
              <span className="text-[#16A34A] font-extrabold text-base sm:text-xl">AI</span>
            </div>
          </Link>

          {/* Tautan Navigasi Desktop */}
          <nav className="hidden md:flex items-center space-x-7 lg:space-x-9">
            {navLinks.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === '/beranda' && (pathname === '/' || pathname === '/beranda')) ||
                (item.href === '/laporan' && pathname === '/report');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-semibold transition py-2 relative ${
                    isActive
                      ? 'text-[#2D7A38]'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#2D7A38] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Tombol Aksi Autentikasi Pengguna (Masuk & Daftar) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href="/masuk"
              className="text-xs sm:text-sm font-bold text-[#334155] hover:text-[#0F172A] px-2.5 sm:px-3 py-1.5 transition cursor-pointer"
            >
              Masuk
            </Link>
            <Link
              href="/daftar"
              className="bg-[#2D7A38] hover:bg-[#23632D] text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition cursor-pointer shadow-xs"
            >
              Daftar
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
