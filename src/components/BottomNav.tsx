'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, History, BarChart3, Camera, User } from 'lucide-react';

interface BottomNavProps {
  onTriggerCamera?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  onTriggerCamera
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleCenterClick = () => {
    if (onTriggerCamera) {
      onTriggerCamera();
    } else {
      const camBtn = document.getElementById('btn-activate-camera');
      if (camBtn) {
        camBtn.click();
      } else {
        router.push('/beranda?buka_kamera=true');
      }
    }
  };

  const leftTabs = [
    { href: '/beranda', label: 'Beranda', icon: Home },
    { href: '/riwayat', label: 'Riwayat', icon: History }
  ];

  const rightTabs = [
    { href: '/laporan', label: 'Laporan', icon: BarChart3 },
    { href: '/profil', label: 'Profil', icon: User }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 w-full bg-white border-t border-[#E2E8F0] shadow-md px-6 py-1.5 flex items-center justify-between">
      {/* Tab Sisi Kiri (Beranda & Riwayat) */}
      <div className="flex items-center space-x-6">
        {leftTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href ||
            (tab.href === '/beranda' && (pathname === '/' || pathname === '/beranda'));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-1 transition-all ${
                isActive ? 'text-[#166534]' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[11px] font-semibold mt-0.5 tracking-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Tombol Kamera Pindai Tengah */}
      <div className="relative -top-4 flex flex-col items-center">
        <button
          type="button"
          onClick={handleCenterClick}
          className="w-14 h-14 rounded-full bg-[#2D7A38] hover:bg-[#23632D] text-white shadow-lg shadow-emerald-900/25 flex items-center justify-center border-4 border-white transition transform active:scale-95 cursor-pointer ring-1 ring-[#E2E8F0]"
          aria-label="Buka Kamera Pindai"
          title="Buka Kamera Langsung"
        >
          <Camera className="w-6 h-6 stroke-[2.2]" />
        </button>
        <span className="text-[11px] font-bold text-[#166534] mt-0.5">Pindai</span>
      </div>

      {/* Tab Sisi Kanan (Laporan & Profil) */}
      <div className="flex items-center space-x-6">
        {rightTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-1 transition-all ${
                isActive ? 'text-[#166534]' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[11px] font-semibold mt-0.5 tracking-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
