'use client';

import React, { useState } from 'react';
import {
  X,
  Send,
  Building2,
  MapPin,
  Calendar,
  Truck,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  PhoneCall,
  Scale,
  Sparkles,
} from 'lucide-react';
import { Product } from '@/types';
import { submitPublicRfqOrDepositApi } from '@/services/farmerApi';

interface B2BNegotiationModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function B2BNegotiationModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: B2BNegotiationModalProps) {
  if (!isOpen || !product) return null;

  const moq = product.moq || 500;
  const basePrice = product.price || 10000;

  const [quantity, setQuantity] = useState<number>(moq);
  const [targetPrice, setTargetPrice] = useState<number>(basePrice);
  const [traderName, setTraderName] = useState('');
  const [traderPhone, setTraderPhone] = useState('');
  const [traderCompany, setTraderCompany] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM');
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [shippingOption, setShippingOption] = useState<'farm_pickup' | 'farm_delivery' | 'cold_storage_truck'>('cold_storage_truck');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [rfqCode, setRfqCode] = useState('');

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const estimatedTotal = quantity * targetPrice;
  const originalTotal = quantity * basePrice;
  const totalSavings = originalTotal - estimatedTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traderName || !traderPhone) {
      alert('Vui lòng nhập tên người đại diện và số điện thoại liên hệ!');
      return;
    }
    if (quantity < moq) {
      alert(`Số lượng đặt tối thiểu (MOQ) cho lô nông sản này là ${moq} kg!`);
      return;
    }

    const code = `RFQ-${Math.floor(100000 + Math.random() * 900000)}`;
    setRfqCode(code);

    // Gửi lên Backend API đồng bộ vào Database và Farmer Portal
    submitPublicRfqOrDepositApi({
      harvestLotId: typeof product.id === 'number' ? product.id : 1,
      productId: typeof product.id === 'number' ? product.id : undefined,
      productName: product.name,
      buyerName: traderName,
      buyerPhone: traderPhone,
      buyerCompany: traderCompany || `Vựa Nông Sản ${traderName}`,
      requestedQuantity: quantity,
      targetPrice,
      depositAmount: estimatedTotal * 0.3,
      isDepositPaid: false,
      deliveryDate,
      hubLocation: deliveryLocation,
      shippingOption,
      notes,
    });

    // Save to local storage RFQ history & farmer queue fallback
    try {
      const history = JSON.parse(localStorage.getItem('b2b_rfq_history') || '[]');
      const newEntry = {
        id: code,
        rfqCode: code,
        productId: product.id,
        harvestLotId: product.id,
        harvestLotCode: `LOT-2026-DL-${String(product.id).padStart(3, '0')}`,
        productName: product.name,
        farmName: product.farmName,
        quantity,
        requestedQuantity: quantity,
        targetPrice,
        estimatedTotal,
        traderName,
        buyerName: traderName,
        traderPhone,
        buyerPhone: traderPhone,
        traderCompany,
        buyerCompany: traderCompany || `Vựa Nông Sản ${traderName}`,
        deliveryLocation,
        hubLocation: deliveryLocation,
        deliveryDate,
        shippingOption,
        notes,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      };
      history.unshift(newEntry);
      localStorage.setItem('b2b_rfq_history', JSON.stringify(history));

      const farmerList = JSON.parse(localStorage.getItem('b2b_farmer_rfqs') || '[]');
      farmerList.unshift(newEntry);
      localStorage.setItem('b2b_farmer_rfqs', JSON.stringify(farmerList));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('b2b_rfq_updated'));
      }
    } catch {}

    setIsSubmitted(true);
    if (onSuccess) onSuccess();
  };

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

        {isSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-[#10542C] mx-auto animate-bounce">
              <CheckCircle2 className="w-9 h-9 text-[#4CAF50]" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-mono font-bold text-[#10542C] bg-[#10542C]/10 px-3 py-1 rounded-full">
                Mã yêu cầu: {rfqCode}
              </span>
              <h3 className="font-heading text-2xl font-black text-[#10542C]">
                Gửi Đề Xuất Giá Sỉ Thành Công!
              </h3>
              <p className="text-xs text-[#6B7280] max-w-md mx-auto">
                Yêu cầu đàm phán giá sỉ lô <strong>{product.name}</strong> đã được chuyển trực tiếp tới đại diện <strong>{product.farmName}</strong>.
              </p>
            </div>

            <div className="bg-[#F9F9F5] rounded-2xl p-4 text-xs text-left border border-[#EAECE8] space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Khối lượng đề xuất:</span>
                <span className="font-bold text-[#10542C]">{quantity >= 1000 ? `${(quantity / 1000).toFixed(1)} Tấn` : `${quantity} kg`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Giá sỉ thương lượng:</span>
                <span className="font-bold text-[#E53935]">{formatVND(targetPrice)} / kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Ước tính giá trị lô:</span>
                <span className="font-black text-[#10542C]">{formatVND(estimatedTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Điểm nhận hàng:</span>
                <span className="font-medium text-[#2C3E2E] truncate max-w-[200px]">{deliveryLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Hotline HTX / Nhà vườn:</span>
                <span className="font-bold text-[#10542C]">{product.farmContactPhone || '0988.100.222'}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`tel:${product.farmContactPhone || '0988100222'}`}
                className="px-5 py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Gọi trực tiếp đại diện nhà vườn</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#F4F5F1] hover:bg-[#EAECE8] text-[#2C3E2E] rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header Form */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10542C]/10 text-[#10542C] text-[11px] font-bold">
                <Scale className="w-3.5 h-3.5 text-[#4CAF50]" />
                <span>Đàm Phán Báo Giá Sỉ (B2B Request For Quote)</span>
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-black text-[#10542C]">
                Gửi Yêu Cầu Thu Mua Lô Nông Sản
              </h3>
              <p className="text-xs text-[#6B7280]">
                Thương thảo trực tiếp với Nông Trại / Hợp Tác Xã không qua trung gian.
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
                    <Building2 className="w-3.5 h-3.5 text-[#4CAF50]" /> {product.farmName}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#8BC34A]" /> {product.farmLocation}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span>Giá chào xuất vườn: <strong className="text-[#10542C] font-black">{formatVND(basePrice)}/kg</strong></span>
                  <span>MOQ tối thiểu: <strong className="text-[#E53935] font-black">{moq >= 1000 ? `${moq / 1000} Tấn` : `${moq} kg`}</strong></span>
                </div>
              </div>
            </div>

            {/* Khối nhập số lượng & giá đàm phán */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1.5 flex items-center justify-between">
                  <span>Số lượng cần thu mua (kg) *</span>
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
                    onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
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

              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1.5 flex items-center justify-between">
                  <span>Giá sỉ đề xuất (VNĐ/kg) *</span>
                  {totalSavings > 0 && (
                    <span className="text-[11px] text-[#E53935] font-bold">
                      Tiết kiệm {formatVND(totalSavings)}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={3000}
                    step={500}
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#E53935] focus:outline-none focus:border-[#10542C]"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280]">
                    đ/kg
                  </span>
                </div>
                {/* Gợi ý mức chiết khấu */}
                <div className="flex gap-1.5 mt-1.5">
                  {[
                    { label: 'Giá gốc', price: basePrice },
                    { label: '-5%', price: Math.round(basePrice * 0.95 / 100) * 100 },
                    { label: '-10%', price: Math.round(basePrice * 0.90 / 100) * 100 },
                    { label: '-15%', price: Math.round(basePrice * 0.85 / 100) * 100 },
                  ].map((tier) => (
                    <button
                      key={tier.label}
                      type="button"
                      onClick={() => setTargetPrice(tier.price)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                        targetPrice === tier.price
                          ? 'bg-[#E53935] text-white'
                          : 'bg-[#F4F5F1] text-[#6B7280] hover:bg-[#EAECE8]'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
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
                  Đơn vị / Doanh nghiệp
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

            {/* Điểm nhận hàng & Ngày giao */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Địa điểm giao / Nhận nông sản *
                </label>
                <select
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                >
                  <option value="Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM">Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM</option>
                  <option value="Chợ Đầu Mối Hóc Môn, TP.HCM">Chợ Đầu Mối Hóc Môn, TP.HCM</option>
                  <option value="Chợ Đầu Mối Bình Điền, TP.HCM">Chợ Đầu Mối Bình Điền, TP.HCM</option>
                  <option value="Chợ Đầu Mối Phía Nam (Hoàng Mai, Hà Nội)">Chợ Đầu Mối Phía Nam (Hoàng Mai, Hà Nội)</option>
                  <option value="Kho lạnh riêng của thương lái">Kho lạnh riêng của thương lái</option>
                  <option value="Nhận hàng tại cổng nông trại (FOB xuất vườn)">Nhận hàng tại cổng nông trại (FOB xuất vườn)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Ngày cần nhận hàng dự kiến
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
              </div>
            </div>

            {/* Phương thức vận chuyển */}
            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] mb-1.5">
                Phương thức vận chuyển & Logistics lạnh
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'cold_storage_truck', label: 'Xe tải lạnh bảo ôn', desc: 'Kiểm soát nhiệt 5-10°C' },
                  { id: 'farm_delivery', label: 'HTX bao vận chuyển', desc: 'Giao tận kho thương lái' },
                  { id: 'farm_pickup', label: 'Thương lái tự bốc tại vườn', desc: 'Tiết kiệm chi phí vận chuyển' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setShippingOption(opt.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      shippingOption === opt.id
                        ? 'border-[#10542C] bg-[#10542C]/5 ring-1 ring-[#10542C]'
                        : 'border-[#EAECE8] bg-white hover:bg-[#F9F9F5]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#10542C]">{opt.label}</div>
                    <div className="text-[10px] text-[#6B7280]">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                Yêu cầu chất lượng & Ghi chú thêm
              </label>
              <textarea
                rows={2}
                placeholder="Yêu cầu kiểm tra mẫu tại vườn, quy cách đóng gói sọt 50kg, đặt cọc 30% bảo lãnh sàn..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
              />
            </div>

            {/* Tổng kết & Nút gửi */}
            <div className="p-4 rounded-2xl bg-[#F4F7F4] border border-[#D7EED6] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-[#6B7280] block">Ước tính tổng giá trị lô hàng đàm phán:</span>
                <span className="font-heading text-xl font-black text-[#10542C]">
                  {formatVND(estimatedTotal)}
                </span>
                <span className="text-[11px] text-[#6B7280] ml-2">
                  ({quantity >= 1000 ? `${(quantity / 1000).toFixed(1)} Tấn` : `${quantity} kg`} × {formatVND(targetPrice)}/kg)
                </span>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-[#10542C] hover:bg-[#0C3E20] text-white font-heading font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Gửi đề xuất tới nhà vườn</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
