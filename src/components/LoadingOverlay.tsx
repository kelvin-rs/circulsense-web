'use client';

import React from 'react';
import { Loader2, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoadingOverlayProps {
  isOpen: boolean;
  title: string;
  message?: string;
  variant?: 'loading' | 'deleting' | 'success';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  title,
  message,
  variant = 'loading'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          {variant === 'deleting' ? (
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
          ) : variant === 'success' ? (
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-900 leading-snug">
            {title}
          </h3>
          {message && (
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {message}
            </p>
          )}
        </div>

        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className={`h-full animate-pulse rounded-full ${
            variant === 'deleting' ? 'bg-rose-500' : 'bg-emerald-600'
          }`} style={{ width: '80%' }} />
        </div>
      </div>
    </div>
  );
};
