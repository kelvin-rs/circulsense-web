'use client';

import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type AlertType = 'success' | 'warning' | 'error' | 'info';

export interface AutoAlertProps {
  type: AlertType;
  title: string;
  message: string;
  duration?: number; // Durasi dalam milidetik (default: 4500ms)
  onClose: () => void;
  className?: string;
}

export const AutoAlert: React.FC<AutoAlertProps> = ({
  type,
  title,
  message,
  duration = 4500,
  onClose,
  className = ''
}) => {
  const [progress, setProgress] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);
  const animFrameRef = useRef<number | null>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  useEffect(() => {
    if (isPaused) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    startTimeRef.current = Date.now();
    const initialRemaining = remainingTimeRef.current;

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentRemaining = Math.max(0, initialRemaining - elapsed);
      remainingTimeRef.current = currentRemaining;

      const pct = (currentRemaining / duration) * 100;
      setProgress(pct);

      if (currentRemaining <= 0) {
        handleClose();
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPaused, duration]);

  const styleConfig = {
    success: {
      bg: 'bg-[#DCFCE7]',
      border: 'border-[#86EFAC]',
      textTitle: 'text-[#14532D]',
      textDesc: 'text-[#166534]',
      progressBar: 'bg-[#16A34A]',
      icon: <CheckCircle2 className="w-5 h-5 shrink-0 text-[#16A34A] mt-0.5" />
    },
    warning: {
      bg: 'bg-[#FEF3C7]',
      border: 'border-[#FDE68A]',
      textTitle: 'text-[#78350F]',
      textDesc: 'text-[#92400E]',
      progressBar: 'bg-amber-500',
      icon: <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
    },
    error: {
      bg: 'bg-[#FEE2E2]',
      border: 'border-[#FECACA]',
      textTitle: 'text-[#7F1D1D]',
      textDesc: 'text-[#991B1B]',
      progressBar: 'bg-red-500',
      icon: <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
    },
    info: {
      bg: 'bg-[#EFF6FF]',
      border: 'border-[#BFDBFE]',
      textTitle: 'text-[#1E3A8A]',
      textDesc: 'text-[#1D4ED8]',
      progressBar: 'bg-blue-500',
      icon: <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
    }
  }[type];

  return (
    <div
      role="alert"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 ${
        styleConfig.bg
      } ${styleConfig.border} ${
        isClosing ? 'opacity-0 -translate-y-2' : 'animate-in fade-in slide-in-from-top-2'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 pr-1">
        <div className="flex items-start space-x-3">
          {styleConfig.icon}
          <div>
            <h4 className={`text-sm font-bold tracking-tight ${styleConfig.textTitle}`}>
              {title}
            </h4>
            <p className={`mt-0.5 text-xs sm:text-sm font-medium leading-relaxed opacity-95 ${styleConfig.textDesc}`}>
              {message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-1 text-current opacity-60 transition hover:bg-black/5 hover:opacity-100 cursor-pointer"
          title="Tutup Sekarang"
          aria-label="Tutup notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Animated countdown progress bar at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 overflow-hidden">
        <div
          className={`h-full transition-all duration-75 ease-linear ${styleConfig.progressBar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
