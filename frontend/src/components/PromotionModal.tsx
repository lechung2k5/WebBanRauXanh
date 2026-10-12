'use client';

import React, { useState } from 'react';
import { X, Gift, Copy, Check, Sparkles, Tag } from 'lucide-react';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCode?: (code: string) => void;
}

const PROMOTIONS = [
  {
    code: 'FREESHIP',
    title: 'Miễn phí giao hàng 2h',
    desc: 'Áp dụng cho mọi đơn hàng nông sản từ 100.000đ',
    expiry: 'HSD: Hôm nay',
    discount: 'Free 25.000đ',
  },
  {
    code: 'HONAFRESH10',
    title: 'Giảm 10% tổng đơn',
    desc: 'Dành cho khách hàng mới trải nghiệm rau sạch HoNa Fresh',
    expiry: 'HSD: 30/11/2026',
    discount: 'Giảm 10%',
  },
  {
    code: 'ORGANIC20',
    title: 'Giảm 20.000đ Combo',
    desc: 'Áp dụng cho đơn hàng có rau củ hữu cơ hoặc combo từ 200.000đ',
    expiry: 'HSD: 15/11/2026',
    discount: 'Giảm 20k',
  },
];

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  onClose,
  onApplyCode,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    if (onApplyCode) onApplyCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 border border-[#EAECE8]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#758A7A] hover:text-[#2C3E2E] rounded-full hover:bg-[#F4F5F1] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#4CAF50]/15 text-[#4CAF50] flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-[#10542C]">Ưu Đãi & Mã Giảm Giá</h3>
            <p className="text-xs text-[#758A7A]">Chọn mã để nhận ưu đãi cho bữa cơm tươi sạch</p>
          </div>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {PROMOTIONS.map((promo) => (
            <div
              key={promo.code}
              className="p-3.5 bg-[#F9F9F5] rounded-xl border border-[#EAECE8] flex items-center justify-between gap-3 relative overflow-hidden"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#10542C] bg-white px-2 py-0.5 rounded border border-[#EAECE8]">
                    {promo.code}
                  </span>
                  <span className="text-[11px] font-bold text-[#E53935]">{promo.discount}</span>
                </div>
                <h4 className="text-xs font-bold text-[#2C3E2E]">{promo.title}</h4>
                <p className="text-[11px] text-[#758A7A]">{promo.desc}</p>
                <div className="text-[10px] text-[#758A7A] font-medium">{promo.expiry}</div>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(promo.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                  copiedCode === promo.code
                    ? 'bg-[#10542C] text-white'
                    : 'bg-white border border-[#10542C]/30 text-[#10542C] hover:bg-[#10542C] hover:text-white'
                }`}
              >
                {copiedCode === promo.code ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
