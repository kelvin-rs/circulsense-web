'use client';

import React, { useState } from 'react';
import { UpcyclingRecommendation } from '@/types/circulsense';

interface RecipeDetailModalProps {
  recommendation: UpcyclingRecommendation | null;
  onClose: () => void;
  onApplyAction?: () => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recommendation,
  onClose,
  onApplyAction
}) => {
  if (!recommendation) return null;

  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleCompleteAction = () => {
    setIsCompleted(true);
    onApplyAction?.();
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#E2E8F0]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Photo */}
        <div className="relative h-48 sm:h-56 w-full bg-slate-900 shrink-0">
          <img
            src={recommendation.image_url}
            alt={recommendation.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white font-bold flex items-center justify-center hover:bg-black/80 transition cursor-pointer"
            aria-label="Tutup"
          >
            ✕
          </button>

          <div className="absolute bottom-4 left-5 right-5">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-[#2D7A38] text-white px-3 py-1 rounded-full inline-block mb-1.5">
              {recommendation.type}
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              {recommendation.title}
            </h3>
            <p className="text-xs text-slate-200 mt-1">
              Estimasi: {recommendation.prep_time || '20 menit'} • Tingkat: {recommendation.difficulty || 'Mudah'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm">
          <p className="text-[#475569] leading-relaxed">
            {recommendation.description}
          </p>

          {recommendation.ingredients && recommendation.ingredients.length > 0 && (
            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-[#E2E8F0]">
              <h4 className="font-bold text-[#0F172A] text-xs uppercase tracking-wider">
                Daftar Bahan yang Diperlukan:
              </h4>
              <div className="space-y-2">
                {recommendation.ingredients.map((ing, idx) => {
                  const isChecked = !!checkedIngredients[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleIngredient(idx)}
                      className="flex items-center space-x-3 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="w-4 h-4 accent-[#2D7A38] rounded cursor-pointer"
                      />
                      <span className={isChecked ? 'line-through text-[#94A3B8]' : 'text-[#334155] font-medium'}>
                        {ing}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-bold text-[#0F172A] text-xs uppercase tracking-wider">
              Langkah-Langkah Pembuatan:
            </h4>
            <div className="space-y-2.5">
              {recommendation.steps.map((step, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-[#DCFCE7] text-[#166534] font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-[#334155] leading-relaxed flex-1">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {recommendation.tips && (
            <div className="bg-[#FEF3C7] rounded-2xl p-4 border border-[#FDE68A] text-xs text-[#92400E]">
              <strong className="block font-bold mb-0.5">Tips Pengolahan:</strong>
              <span>{recommendation.tips}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="p-4 bg-white border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={handleCompleteAction}
            disabled={isCompleted}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition cursor-pointer ${
              isCompleted
                ? 'bg-[#166534] text-white'
                : 'bg-[#2D7A38] hover:bg-[#23632D] text-white'
            }`}
          >
            {isCompleted ? 'Berhasil Dicatat ke Riwayat Upcycling' : 'Terapkan Aksi Upcycling Ini'}
          </button>
        </div>
      </div>
    </div>
  );
};
