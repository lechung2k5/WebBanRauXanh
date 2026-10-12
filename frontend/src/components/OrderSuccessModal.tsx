'use client';

import React from 'react';
import { OrderResponse } from '@/types';
import { CheckCircle2, Copy, ArrowRight } from 'lucide-react';

interface OrderSuccessModalProps {
  order: OrderResponse | null;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(order.orderCode);
    alert('Đã sao chép mã đơn hàng: ' + order.orderCode);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl z-10 border border-[#EAECE8]">
        <div className="w-16 h-16 bg-[#10542C]/10 text-[#10542C] rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-[#4CAF50]" />
        </div>

        <h3 className="font-heading text-2xl font-bold text-[#10542C] mb-2">Đặt Hàng Thành Công!</h3>
        <p className="text-xs text-[#758A7A] mb-6 leading-relaxed">
          Cảm ơn bạn đã tin chọn nông sản sạch của <strong className="text-[#10542C]">HoNa Fresh</strong>. Nhân viên nông trại sẽ chuẩn bị rau tươi và giao đến bạn trong vòng 2 giờ!
        </p>

        <div className="bg-[#F9F9F5] p-4 rounded-2xl border border-[#EAECE8] mb-6 text-left">
          <span className="text-[11px] font-bold text-[#758A7A] uppercase block mb-1">Mã đơn hàng của bạn</span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-base font-bold text-[#10542C]">{order.orderCode}</span>
            <button
              onClick={handleCopy}
              className="p-1.5 bg-white rounded-lg border border-[#EAECE8] text-[#10542C] hover:bg-[#F4F5F1] flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
              title="Sao chép"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Chép</span>
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Tiếp tục mua sắm</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
