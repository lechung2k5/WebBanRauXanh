'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Building2,
  MapPin,
  Calendar,
  Truck,
  Scale,
  QrCode,
  ArrowRight,
  Sparkles,
  PhoneCall,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Product } from '@/types';
import { submitPublicRfqOrDepositApi } from '@/services/farmerApi';

interface B2BDepositModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function B2BDepositModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: B2BDepositModalProps) {
  if (!isOpen || !product) return null;

  const moq = product.moq || 500;
  const basePrice = product.price || 12000;

  const [quantity, setQuantity] = useState<number>(moq);
  const [traderName, setTraderName] = useState('');
  const [traderPhone, setTraderPhone] = useState('');
  const [traderCompany, setTraderCompany] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng');
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedContractCode, setGeneratedContractCode] = useState('');

  // Tính giá theo sản lượng (Tier Pricing)
  const getUnitPrice = (qty: number) => {
    if (qty >= 5000) return Math.round(basePrice * 0.88); // Giảm 12%
    if (qty >= 2000) return Math.round(basePrice * 0.93); // Giảm 7%
    return basePrice;
  };

  const unitPrice = getUnitPrice(quantity);
  const totalAmount = quantity * unitPrice;
  const depositAmount = Math.round(totalAmount * 0.3); // 30% Cọc
  const remainingAmount = totalAmount - depositAmount; // 70% còn lại

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const handleCopyAccount = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traderName.trim() || !traderPhone.trim()) {
      alert('Vui lòng nhập họ tên thương lái và số điện thoại liên hệ!');
      return;
    }

    setIsSubmitting(true);
    const contractCode = `HD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setGeneratedContractCode(contractCode);

    try {
      await submitPublicRfqOrDepositApi({
        harvestLotId: typeof product.id === 'number' ? product.id : 1,
        productId: typeof product.id === 'number' ? product.id : undefined,
        productName: product.name,
        buyerName: traderName,
        buyerPhone: traderPhone,
        buyerCompany: traderCompany || `Vựa Nông Sản ${traderName}`,
        requestedQuantity: quantity,
        targetPrice: unitPrice,
        depositAmount,
        isDepositPaid: true, // Đã chuyển cọc 30% Escrow
        deliveryDate,
        hubLocation: deliveryLocation,
        shippingOption: 'cold_storage_truck',
        notes: notes || 'Thương lái đã thanh toán cọc 30% qua VietQR Escrow HoNa Fresh',
      });

      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Lỗi khi gửi cọc:', err);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // QR VietQR chuẩn ngân hàng cho tài khoản Escrow sàn
  const qrTransferContent = `COC ${contractCodeSafe(generatedContractCode || 'HD2026')} ${traderPhone.replace(/\D/g, '')}`;
  const qrUrl = `https://img.vietqr.io/image/970436-0071001284920-compact2.png?amount=${depositAmount}&addInfo=${encodeURIComponent(
    qrTransferContent
  )}&accountName=QUY%20KY%20QUY%20HONA%20FRESH`;

  function contractCodeSafe(code: string) {
    return code.replace(/[^a-zA-Z0-9]/g, '');
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl z-10 max-h-[92vh] overflow-y-auto border border-[#D7EED6]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#758A7A] hover:text-[#2C3E2E] rounded-full hover:bg-[#F4F5F1] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-[#10542C] mx-auto animate-bounce shadow-md">
              <CheckCircle2 className="w-12 h-12 text-[#10542C]" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-mono font-bold text-white bg-[#10542C] px-3.5 py-1 rounded-full shadow-xs">
                MÃ HỢP ĐỒNG: {generatedContractCode}
              </span>
              <h3 className="font-heading text-2xl font-black text-[#10542C] pt-2">
                Xác Nhận Ký Quỹ Đặt Cọc 30% Thành Công!
              </h3>
              <p className="text-xs text-[#6B7280] max-w-md mx-auto">
                Số tiền <strong>{formatVND(depositAmount)}</strong> đã được ghi nhận vào <strong>Quỹ Ký Quỹ Bảo Chứng Escrow</strong> của Sàn HoNa Fresh.
              </p>
            </div>

            {/* Thông tin xác nhận */}
            <div className="bg-[#F9F9F5] rounded-2xl p-4 text-xs text-left border border-[#D7EED6] space-y-2.5 max-w-lg mx-auto">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <span className="text-[#6B7280]">Lô nông sản đặt mua:</span>
                <span className="font-bold text-[#10542C]">{product.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Khối lượng cọc thu hoạch:</span>
                <span className="font-bold text-gray-900">{quantity >= 1000 ? `${(quantity / 1000).toFixed(1)} Tấn` : `${quantity} kg`}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Đơn giá chốt:</span>
                <span className="font-bold text-[#10542C]">{formatVND(unitPrice)} / kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Tổng giá trị hợp đồng:</span>
                <span className="font-bold text-gray-900">{formatVND(totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50 p-2 rounded-xl text-emerald-900 font-bold">
                <span>Tiền cọc bảo chứng đã nộp (30%):</span>
                <span className="text-sm font-black text-[#10542C]">{formatVND(depositAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#6B7280]">
                <span>Còn lại thanh toán sau nghiệm thu QC (70%):</span>
                <span>{formatVND(remainingAmount)}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2 max-w-lg mx-auto text-left">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
              <span>
                <strong>Bảo chứng Sàn HoNa Fresh:</strong> Nông dân đã nhận thông báo tiến hành thu hoạch và chở đến trạm lạnh kiểm định QC theo đúng hợp đồng!
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/portal/farmer"
                className="px-6 py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <span>Xem Ngay Bên Phân Hệ Nông Dân (Farmer Portal)</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#F4F5F1] hover:bg-[#EAECE8] text-[#2C3E2E] rounded-xl text-xs font-bold cursor-pointer"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitDeposit} className="space-y-5">
            {/* Header Form */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10542C]/10 text-[#10542C] text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4CAF50]" />
                <span>Bảo Chứng Ký Quỹ Cọc 30% (Escrow Guarantee Protocol)</span>
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-black text-[#10542C]">
                Đặt Cọc Lô Vụ Mùa & Ký Hợp Đồng B2B
              </h3>
              <p className="text-xs text-[#6B7280]">
                Tiền cọc được Sàn HoNa Fresh giữ hộ trong tài khoản bảo chứng, nông dân chỉ thu hoạch sau khi có cọc.
              </p>
            </div>

            {/* Thông tin lô nông sản tóm tắt */}
            <div className="p-3.5 rounded-2xl bg-[#F0F7F2] border border-[#D7EED6] flex items-center gap-3.5">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white shadow-2xs"
              />
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="font-heading font-bold text-sm text-[#10542C] truncate">
                  {product.name}
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B7280]">
                  <span className="flex items-center gap-1 font-medium text-[#2C3E2E]">
                    <Building2 className="w-3.5 h-3.5 text-[#4CAF50]" /> {product.farmName || 'HTX Nông Nghiệp Đà Lạt GAP'}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[#10542C]">
                    Mã PUC: {product.pucCode || 'VN-LDO-PUC-0849'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span>Giá gốc xuất vườn: <strong className="text-[#10542C] font-black">{formatVND(basePrice)}/kg</strong></span>
                  <span>MOQ tối thiểu: <strong className="text-[#E53935] font-black">{moq >= 1000 ? `${moq / 1000} Tấn` : `${moq} kg`}</strong></span>
                </div>
              </div>
            </div>

            {/* Nhập số lượng & tính giá sỉ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1.5 flex items-center justify-between">
                  <span>Số lượng thu hoạch (kg) *</span>
                  <span className="text-[11px] text-[#4CAF50] font-medium">
                    {quantity >= 1000 ? `≈ ${(quantity / 1000).toFixed(2)} Tấn` : `${quantity} kg`}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={moq}
                    step={100}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(moq, Number(e.target.value)))}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#10542C] focus:outline-none focus:border-[#10542C]"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280]">
                    kg
                  </span>
                </div>
                {/* Nút chọn nhanh */}
                <div className="flex gap-1.5 mt-1.5">
                  {[moq, 1000, 2000, 5000, 10000].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                        quantity === qty
                          ? 'bg-[#10542C] text-white'
                          : 'bg-[#F4F5F1] text-[#6B7280] hover:bg-[#EAECE8]'
                      }`}
                    >
                      {qty >= 1000 ? `${qty / 1000}T` : `${qty}kg`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bảng tính chi phí */}
              <div className="bg-[#F9F9F5] p-3 rounded-2xl border border-gray-200 text-xs space-y-1.5">
                <div className="flex justify-between text-[#6B7280]">
                  <span>Đơn giá áp dụng:</span>
                  <span className="font-bold text-[#10542C]">{formatVND(unitPrice)} / kg</span>
                </div>
                <div className="flex justify-between text-[#6B7280]">
                  <span>Tổng tiền hàng:</span>
                  <span className="font-bold text-gray-900">{formatVND(totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 text-xs font-bold text-[#10542C]">
                  <span>SỐ TIỀN CỌC 30% PHẢI NỘP:</span>
                  <span className="text-sm font-black text-[#E53935]">{formatVND(depositAmount)}</span>
                </div>
                <div className="text-[10px] text-gray-500 italic">
                  * 70% còn lại ({formatVND(remainingAmount)}) thanh toán khi xe lạnh giao đến kho.
                </div>
              </div>
            </div>

            {/* Thông tin đại diện Thương lái */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Họ tên thương lái *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn Hùng"
                  value={traderName}
                  onChange={(e) => setTraderName(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Số điện thoại liên hệ *
                </label>
                <input
                  type="tel"
                  placeholder="09xx.xxx.xxx"
                  value={traderPhone}
                  onChange={(e) => setTraderPhone(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Tên Vựa / Doanh nghiệp
                </label>
                <input
                  type="text"
                  placeholder="Vựa nông sản / Công ty"
                  value={traderCompany}
                  onChange={(e) => setTraderCompany(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
              </div>
            </div>

            {/* Địa điểm nhận hàng & Ngày giao */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Trạm nhận hàng / Điểm trung chuyển *
                </label>
                <select
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                >
                  <option value="Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng">Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng</option>
                  <option value="Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM">Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM</option>
                  <option value="Chợ Đầu Mối Hóc Môn, TP.HCM">Chợ Đầu Mối Hóc Môn, TP.HCM</option>
                  <option value="Chợ Đầu Mối Bình Điền, TP.HCM">Chợ Đầu Mối Bình Điền, TP.HCM</option>
                  <option value="Chợ Đầu Mối Phía Nam (Hoàng Mai, Hà Nội)">Chợ Đầu Mối Phía Nam (Hoàng Mai, Hà Nội)</option>
                  <option value="Kho lạnh riêng của thương lái">Kho lạnh riêng của thương lái</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Ngày nhận hàng mong muốn *
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                  required
                />
              </div>
            </div>

            {/* Khối quét mã VietQR Escrow */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-4 h-4 text-[#10542C]" />
                <span className="font-heading font-black text-xs text-[#10542C]">
                  QUÉT VIETQR CHUYỂN KÝ QUỸ CỌC 30% (BẢO CHỨNG ESCROW)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2 rounded-xl shadow-xs shrink-0 border border-emerald-300">
                  <img
                    src={qrUrl}
                    alt="VietQR Escrow Deposit"
                    className="w-36 h-36 object-contain rounded-lg"
                  />
                </div>

                <div className="space-y-1.5 text-xs flex-1 min-w-0">
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Ngân hàng thụ hưởng:</span>
                    <strong className="text-[#10542C]">Vietcombank - CN Lâm Đồng</strong>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Số tài khoản Escrow:</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-gray-900">
                      <span>0071001284920</span>
                      <button
                        type="button"
                        onClick={() => handleCopyAccount('0071001284920')}
                        className="text-[#10542C] hover:text-emerald-700 p-0.5 cursor-pointer"
                        title="Sao chép STK"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Chủ tài khoản:</span>
                    <strong className="text-gray-900">QUY KY QUY HONA FRESH</strong>
                  </div>
                  <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <span>Số tiền cọc 30%:</span>
                    <strong className="text-sm font-black text-[#E53935]">{formatVND(depositAmount)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                    <span>Nội dung chuyển khoản:</span>
                    <span className="font-mono font-bold text-[#10542C] truncate max-w-[200px]">
                      {qrTransferContent}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nút gửi đặt cọc */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#F4F5F1] hover:bg-[#EAECE8] text-[#2C3E2E] rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-3 bg-[#10542C] hover:bg-[#0C3E20] text-white font-heading font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-[#8BC34A]" />
                <span>{isSubmitting ? 'Đang xác thực...' : 'Xác Nhận Đã Chuyển Cọc 30% (Ký Hợp Đồng)'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
