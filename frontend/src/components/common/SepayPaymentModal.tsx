'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  Clock,
  Loader2,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import {
  DEFAULT_BANK_INFO,
  generateVietQrUrl,
  checkOrderPaymentStatus,
  checkContractDepositStatus,
} from '@/services/sepayService';

interface SepayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'ORDER' | 'CONTRACT';
  code: string; // Mã đơn hàng (DH-...) hoặc Mã hợp đồng (HD-...)
  amount: number; // Số tiền cần thanh toán (VNĐ)
  title?: string;
  recipientName?: string;
  onSuccess?: () => void;
}

export const SepayPaymentModal: React.FC<SepayPaymentModalProps> = ({
  isOpen,
  onClose,
  type = 'ORDER',
  code,
  amount,
  title,
  recipientName,
  onSuccess,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [checking, setChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 phút đếm ngược

  // Nội dung chuyển khoản chuẩn hóa
  const cleanCode = code.toUpperCase().replaceAll(/[^A-Z0-9-]/g, '');
  const transferContent = type === 'ORDER' ? `HONA ${cleanCode}` : `COC ${cleanCode}`;

  const qrImageUrl = generateVietQrUrl({
    amount,
    content: transferContent,
  });

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // 1. Kiểm tra trạng thái thanh toán từ máy chủ
  const verifyPayment = useCallback(async () => {
    if (!code || isPaid) return;
    setChecking(true);
    try {
      if (type === 'ORDER') {
        const res = await checkOrderPaymentStatus(code);
        if (res.isPaid) {
          setIsPaid(true);
          if (onSuccess) onSuccess();
        }
      } else {
        const res = await checkContractDepositStatus(code);
        if (res.isDepositPaid) {
          setIsPaid(true);
          if (onSuccess) onSuccess();
        }
      }
    } finally {
      setChecking(false);
    }
  }, [code, isPaid, type, onSuccess]);

  // 2. Tự động kiểm tra định kỳ mỗi 3 giây
  useEffect(() => {
    if (!isOpen || isPaid) return;

    const interval = setInterval(() => {
      void verifyPayment();
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, isPaid, verifyPayment]);

  // 3. Bộ đếm ngược thời gian
  useEffect(() => {
    if (!isOpen || isPaid) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isPaid]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Nền làm mờ */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl z-10 max-h-[92vh] overflow-y-auto border border-[#EAECE8]">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isPaid ? (
          /* Màn hình thông báo Thanh toán thành công */
          <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-[#10542C] mx-auto shadow-md">
              <CheckCircle2 className="w-12 h-12 text-[#10542C]" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-white bg-[#10542C] px-3.5 py-1 rounded-full">
                Mã: {code}
              </span>
              <h3 className="font-heading font-black text-2xl text-[#10542C] pt-2">
                Thanh Toán Thành Công!
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Hệ thống đã tự động xác nhận số tiền chuyển khoản <strong>{formatVND(amount)}</strong>. Đơn hàng của bạn đang được chuẩn bị để giao trong thời gian sớm nhất.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          </div>
        ) : (
          /* Màn hình Quét mã VietQR chuyển khoản */
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#10542C] text-[11px] font-bold border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Thanh Toán Chuyển Khoản Tự Động</span>
              </div>
              <h3 className="font-heading font-black text-xl text-[#10542C]">
                {title || (type === 'ORDER' ? 'Quét Mã VietQR Thanh Toán Đơn Hàng' : 'Quét Mã VietQR Nộp Cọc Hợp Đồng')}
              </h3>
              <p className="text-xs text-slate-500">
                Mở ứng dụng ngân hàng bất kỳ để quét mã và chuyển tiền tự động
              </p>
            </div>

            {/* Khung hiển thị Mã QR */}
            <div className="bg-gradient-to-b from-emerald-50/60 to-white p-4 rounded-2xl border border-emerald-200 text-center space-y-2">
              <div className="relative w-52 h-52 mx-auto bg-white p-2.5 rounded-2xl shadow-sm border border-emerald-300 flex items-center justify-center">
                <img
                  src={qrImageUrl}
                  alt="Mã VietQR Thanh Toán"
                  className="w-full h-full object-contain rounded-xl select-none"
                />
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Mã có hiệu lực trong: </span>
                <strong className="text-rose-600 font-mono">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </strong>
              </div>
            </div>

            {/* Chi tiết tài khoản thụ hưởng & cú pháp */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                <strong className="text-[#10542C]">{DEFAULT_BANK_INFO.bankName}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <strong className="text-slate-800">{DEFAULT_BANK_INFO.accountName}</strong>
              </div>

              {/* Số tài khoản kèm nút sao chép */}
              <div className="flex items-center justify-between py-1 border-t border-slate-200/70">
                <span className="text-slate-500">Số tài khoản:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {DEFAULT_BANK_INFO.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(DEFAULT_BANK_INFO.accountNumber, 'acc')}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Sao chép số tài khoản"
                  >
                    {copiedField === 'acc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              {/* Số tiền cần chuyển */}
              <div className="flex items-center justify-between py-1 border-t border-slate-200/70">
                <span className="text-slate-500 font-semibold">Số tiền chính xác:</span>
                <span className="font-heading font-black text-base text-[#E53935]">
                  {formatVND(amount)}
                </span>
              </div>

              {/* Nội dung chuyển khoản */}
              <div className="flex items-center justify-between py-1.5 bg-emerald-100/60 px-3 rounded-xl border border-emerald-200">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                    Nội dung chuyển khoản (bắt buộc):
                  </span>
                  <span className="font-mono font-black text-sm text-[#10542C] tracking-wide block truncate">
                    {transferContent}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(transferContent, 'content')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                >
                  {copiedField === 'content' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'content' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            {/* Thông báo trạng thái lắng nghe tự động */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#10542C]">
                <Loader2 className="w-4 h-4 animate-spin text-[#10542C]" />
                <span>Đang tự động kiểm tra chuyển khoản...</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Sau khi bạn hoàn tất chuyển tiền trên ứng dụng ngân hàng, hệ thống sẽ tự động cập nhật trong 5 đến 10 giây.
              </p>
            </div>

            {/* Nút bấm kiểm tra thủ công & Hủy */}
            <div className="flex items-center justify-between pt-1 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
              >
                Để sau / Đóng
              </button>

              <button
                type="button"
                onClick={() => void verifyPayment()}
                disabled={checking}
                className="px-5 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Tôi đã chuyển tiền xong</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SepayPaymentModal;

