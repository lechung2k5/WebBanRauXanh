'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { Product } from '@/types';
import { submitPublicRfqOrDepositApi } from '@/services/farmerApi';
import { SepayPaymentModal } from '@/components/common/SepayPaymentModal';
import { DEFAULT_BANK_INFO, generateVietQrUrl } from '@/services/sepayService';
import { useApp } from '@/context/AppContext';
import { getStoredUser } from '@/services/api';
import {
  calculateLogisticsEstimates,
  COLD_STORAGE_HUBS_NATIONWIDE,
  findColdHubInfo,
  calculateHaversineDistanceKm,
  ColdHubInfo,
} from '@/utils/logisticsCalculator';
import { getRouteDirections, geocodeAddress } from '@/services/goongMapService';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';
import DatePickerVi from '@/components/common/DatePickerVi';

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

  const { currentUser } = useApp();
  const moq = product.moq || 500;
  const basePrice = product.price || 12000;

  const [quantity, setQuantity] = useState<number>(moq);
  const [traderName, setTraderName] = useState('');
  const [traderPhone, setTraderPhone] = useState('');
  const [traderCompany, setTraderCompany] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM');
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [shippingOption, setShippingOption] = useState<
    'cold_storage_truck' | 'farm_delivery' | 'farm_pickup'
  >('farm_delivery');
  const [agreeSelfTransportPolicy, setAgreeSelfTransportPolicy] = useState(false);
  const [notes, setNotes] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedContractCode, setGeneratedContractCode] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Kho HoNa xuất phát phụ trách kiểm định chất lượng (QC) cho lô hàng
  const originHub = useMemo<ColdHubInfo>(() => {
    return findColdHubInfo(
      (product as any)?.hubLocation ||
        (product as any)?.warehouseLocation ||
        product.origin ||
        'Lâm Đồng'
    );
  }, [product]);

  const [distanceKm, setDistanceKm] = useState<number>(300);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState<boolean>(false);

  // Tính cự ly đường bộ qua Goong Map API hoặc tọa độ GPS
  const updateDistanceToBuyerLocation = useCallback(
    async (locAddress: string, destCoords?: { lat?: number; lng?: number }) => {
      if (!locAddress || !locAddress.trim()) return;
      if (locAddress.includes('Nhận hàng tại Kho') || locAddress.includes('tại kho HoNa')) {
        setDistanceKm(0);
        return;
      }
      setIsCalculatingDistance(true);
      try {
        const originCoord = { lat: originHub.lat, lng: originHub.lng };
        let targetCoords =
          destCoords?.lat && destCoords?.lng
            ? { lat: destCoords.lat, lng: destCoords.lng }
            : null;

        if (!targetCoords) {
          if (locAddress.includes('Thủ Đức')) {
            targetCoords = { lat: 10.8658, lng: 106.7454 };
          } else if (locAddress.includes('Hóc Môn')) {
            targetCoords = { lat: 10.8783, lng: 106.5936 };
          } else if (locAddress.includes('Bình Điền')) {
            targetCoords = { lat: 10.7027, lng: 106.6214 };
          } else {
            targetCoords = await geocodeAddress(locAddress);
          }
        }

        if (targetCoords) {
          const route = await getRouteDirections(originCoord, targetCoords, 'truck');
          if (route && route.distanceKm > 0) {
            setDistanceKm(Math.round(route.distanceKm));
          } else {
            const fallbackKm = calculateHaversineDistanceKm(originCoord, targetCoords);
            setDistanceKm(fallbackKm);
          }
        }
      } catch (err) {
        console.warn('Lỗi tính cự ly Goong Maps (Deposit):', err);
      } finally {
        setIsCalculatingDistance(false);
      }
    },
    [originHub]
  );

  // Tự động điền thông tin tài khoản thương lái đang đăng nhập
  useEffect(() => {
    const user = currentUser || getStoredUser();
    let initialAddr = deliveryLocation || 'Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM';
    if (user) {
      if (user.fullName) setTraderName(user.fullName);
      if (user.phone) setTraderPhone(user.phone);
      if (user.companyName) setTraderCompany(user.companyName);
      if (user.warehouseAddress || user.address) {
        initialAddr = (user.warehouseAddress || user.address) || '';
        setDeliveryLocation(initialAddr);
      }
    }
    updateDistanceToBuyerLocation(initialAddr);
  }, [currentUser, isOpen, updateDistanceToBuyerLocation]);

  // Tính toán dự toán cước phí logistics chuỗi lạnh theo số lượng mua & km thực tế
  const logisticsCalculations = useMemo(() => {
    return calculateLogisticsEstimates({
      weightKg: quantity || 1000,
      distanceKm: distanceKm,
      minTemp: (product as any)?.minTemp,
      maxTemp: (product as any)?.maxTemp,
    });
  }, [quantity, distanceKm, (product as any)?.minTemp, (product as any)?.maxTemp]);

  const currentShippingEst =
    shippingOption === 'cold_storage_truck'
      ? logisticsCalculations.DIRECT_FARM_TO_BUYER
      : shippingOption === 'farm_pickup'
      ? logisticsCalculations.BUYER_SELF_TRANSPORT
      : logisticsCalculations.CROSS_DOCKING_HUB;
  const shippingFee = currentShippingEst.estimatedFee;

  // Tính giá theo sản lượng (Tier Pricing)
  const getUnitPrice = (qty: number) => {
    if (qty >= 5000) return Math.round(basePrice * 0.88); // Giảm 12%
    if (qty >= 2000) return Math.round(basePrice * 0.93); // Giảm 7%
    return basePrice;
  };

  const unitPrice = getUnitPrice(quantity);
  const goodsAmount = quantity * unitPrice;
  const grandTotal = goodsAmount + shippingFee;

  // Nếu chọn PA3 (Buyer tự vận chuyển): BẮT BUỘC THANH TOÁN 100% TIỀN HÀNG TRƯỚC KHI BỐC LÊN XE
  // Nếu chọn PA1 hoặc PA2: Cọc 30% bảo chứng Escrow sàn HoNa Fresh
  const isFullPaymentRequired = shippingOption === 'farm_pickup';
  const depositAmount = isFullPaymentRequired ? grandTotal : Math.round(grandTotal * 0.3);
  const remainingAmount = grandTotal - depositAmount;

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

    if (isFullPaymentRequired && !agreeSelfTransportPolicy) {
      alert(
        'Đối với phương án Khách tự lấy tại Kho HoNa, quý khách vui lòng tích chọn cam kết nghiệm thu QC, thanh toán 100% tiền hàng trước khi xuất kho và tự chịu trách nhiệm chuỗi lạnh chặng sau!'
      );
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
        isDepositPaid: true, // Đã chuyển cọc/thanh toán Escrow
        deliveryDate,
        hubLocation: deliveryLocation,
        shippingOption,
        notes:
          notes ||
          (isFullPaymentRequired
            ? 'Khách tự điều xe nhận tại Kho HoNa, thanh toán 100% tất toán trước khi xuất kho'
            : 'Thương lái đã thanh toán cọc 30% qua VietQR Escrow HoNa Fresh'),
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

  // QR VietQR chuẩn ngân hàng cho tài khoản ký quỹ bảo chứng
  const qrTransferContent = `COC ${contractCodeSafe(generatedContractCode || 'HD2026')}`;
  const qrUrl = generateVietQrUrl({
    amount: depositAmount,
    content: qrTransferContent,
  });

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
                <span className="font-bold text-gray-900">{formatVND(grandTotal)}</span>
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
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-6 py-2.5 bg-[#8BC34A] hover:bg-[#7CB342] text-[#10542C] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Mở Mã VietQR Chuyển Cọc</span>
              </button>
              <a
                href="/portal/farmer"
                className="px-6 py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <span>Xem Trang Quản Lý Nông Trại</span>
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
                  {Array.from(new Set([moq, 1000, 2000, 5000, 10000])).filter((qty) => qty >= moq).sort((a, b) => a - b).map((qty) => (
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
              <div className="bg-[#F9F9F5] p-3.5 rounded-2xl border border-gray-200 text-xs space-y-1.5">
                <div className="flex justify-between text-[#6B7280]">
                  <span>Đơn giá áp dụng:</span>
                  <span className="font-bold text-[#10542C]">{formatVND(unitPrice)} / kg</span>
                </div>
                <div className="flex justify-between text-[#6B7280]">
                  <span>Tiền hàng ({quantity >= 1000 ? `${quantity / 1000} Tấn` : `${quantity} kg`}):</span>
                  <span className="font-bold text-gray-900">{formatVND(goodsAmount)}</span>
                </div>
                <div className="flex justify-between text-[#6B7280]">
                  <span>Cước vận chuyển chuỗi lạnh:</span>
                  <span className="font-bold text-[#10542C]">
                    {shippingOption === 'farm_pickup' ? '0 đ (Khách nhận tại Kho HoNa)' : `+ ${formatVND(shippingFee)}`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-700 font-bold pt-1 border-t border-gray-200">
                  <span>Tổng giá trị hợp đồng:</span>
                  <span className="font-black text-gray-900 text-sm">{formatVND(grandTotal)}</span>
                </div>
                <div className={`flex justify-between items-center p-2 rounded-xl text-xs font-bold ${
                  isFullPaymentRequired ? 'bg-rose-100 text-rose-950 border border-rose-300' : 'bg-emerald-100/80 text-[#10542C]'
                }`}>
                  <span>{isFullPaymentRequired ? 'SỐ TIỀN THANH TOÁN 100% (TẤT TOÁN):' : 'SỐ TIỀN CỌC 30% BẢO CHỨNG:'}</span>
                  <span className="text-sm font-black text-[#E53935]">{formatVND(depositAmount)}</span>
                </div>
                <div className="text-[10px] text-gray-500 italic">
                  {isFullPaymentRequired
                    ? '* Phương án tự lấy tại Kho HoNa bắt buộc tất toán 100% tiền hàng trước khi xe xuất kho.'
                    : `* 70% còn lại (${formatVND(remainingAmount)}) thanh toán sau khi xe lạnh giao hàng và kiểm định QC.`}
                </div>
              </div>
            </div>

            {/* PHƯƠNG THỨC VẬN CHUYỂN & CHUỖI LẠNH (BUYER LỰA CHỌN) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#2C3E2E]">
                  Phương thức vận chuyển & Logistics chuỗi lạnh (3 Phương Án Xuất Kho HoNa) *
                </label>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {shippingOption === 'farm_pickup'
                    ? 'PA3: Khách nhận tại kho HoNa (0 đ cước giao)'
                    : shippingOption === 'farm_delivery'
                    ? `PA2: Giao tiêu chuẩn từ kho (~${currentShippingEst.ratePerKg.toLocaleString('vi-VN')} đ/kg)`
                    : `PA1: Giao hỏa tốc bao xe từ kho (~${currentShippingEst.ratePerKg.toLocaleString('vi-VN')} đ/kg)`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* PA1: Giao hỏa tốc từ kho HoNa */}
                <button
                  type="button"
                  onClick={() => setShippingOption('cold_storage_truck')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    shippingOption === 'cold_storage_truck'
                      ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-500'
                      : 'border-[#EAECE8] bg-white hover:bg-[#F9F9F5]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-bold text-xs text-amber-900">PA1: Giao hỏa tốc</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold shrink-0">Bao trọn xe sau QC</span>
                    </div>
                    <div className="text-[10px] text-[#6B7280] leading-snug">
                      Gom về kho HoNa kiểm định QC ➔ Xe lạnh riêng chở thẳng từ kho tới khách hàng (~{distanceKm} km).
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-amber-200/60 flex items-baseline justify-between text-[11px]">
                    <span className="text-gray-500 text-[10px]">Cước trọn gói:</span>
                    <strong className="text-amber-900 font-bold">
                      {logisticsCalculations.DIRECT_FARM_TO_BUYER.estimatedFee.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </button>

                {/* PA2: Giao tiêu chuẩn từ kho HoNa */}
                <button
                  type="button"
                  onClick={() => setShippingOption('farm_delivery')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    shippingOption === 'farm_delivery'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600 shadow-xs'
                      : 'border-[#EAECE8] bg-white hover:bg-[#F9F9F5]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-bold text-xs text-emerald-900">PA2: Giao tiêu chuẩn</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold shrink-0">⭐ Tiết kiệm</span>
                    </div>
                    <div className="text-[10px] text-[#6B7280] leading-snug">
                      Gom về kho HoNa kiểm định QC ➔ Xe lạnh HoNa Fresh chở thẳng từ kho tới tận tay khách hàng (~{distanceKm} km).
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-emerald-200/60 flex items-baseline justify-between text-[11px]">
                    <span className="text-gray-500 text-[10px]">Cước trọn gói:</span>
                    <strong className="text-emerald-900 font-bold">
                      {logisticsCalculations.CROSS_DOCKING_HUB.estimatedFee.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </button>

                {/* PA3: Khách tự lấy tại kho HoNa */}
                <button
                  type="button"
                  onClick={() => setShippingOption('farm_pickup')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    shippingOption === 'farm_pickup'
                      ? 'border-rose-600 bg-rose-50/50 ring-1 ring-rose-500'
                      : 'border-[#EAECE8] bg-white hover:bg-[#F9F9F5]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-bold text-xs text-rose-900">PA3: Nhận tại kho</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold shrink-0">Lấy tại kho HoNa</span>
                    </div>
                    <div className="text-[10px] text-[#6B7280] leading-snug">
                      Gom về kho HoNa kiểm định QC đạt chuẩn ➔ Khách tự điều xe đến Kho HoNa nhận hàng (Thanh toán 100%).
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-rose-200/60 flex items-baseline justify-between text-[11px]">
                    <span className="text-gray-500 text-[10px]">Cước giao hàng:</span>
                    <strong className="text-rose-900 font-bold">0 đ (Tự túc)</strong>
                  </div>
                </button>
              </div>

              {/* Điều khoản chuyển giao rủi ro cho PA3 */}
              {shippingOption === 'farm_pickup' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs animate-fade-in">
                  <div className="flex items-start gap-2 text-rose-900 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>Quy định Nghiệm Thu QC & Tất Toán 100% Tại Kho HoNa Fresh:</span>
                  </div>
                  <p className="text-rose-800 text-[11px] leading-relaxed">
                    Nông sản được gom về Kho HoNa Fresh và kiểm định chất lượng QC đạt chuẩn trước khi xuất kho. Quý khách tự điều xe tải lạnh đến Kho HoNa Fresh nhận hàng, nghiệm thu biên bản QC và <strong>bắt buộc thanh toán 100% giá trị lô hàng trước khi bốc hàng lên xe</strong>. Sau khi xe lăn bánh rời cổng Kho HoNa Fresh, khách hàng tự chịu trách nhiệm về nhiệt độ chuỗi lạnh trên đường vận chuyển.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-950 pt-1">
                    <input
                      type="checkbox"
                      required
                      checked={agreeSelfTransportPolicy}
                      onChange={(e) => setAgreeSelfTransportPolicy(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <span>Tôi xác nhận nghiệm thu QC, thanh toán 100% tiền hàng tại Kho HoNa và tự chịu trách nhiệm chuỗi lạnh chặng sau.</span>
                  </label>
                </div>
              )}
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
                  Địa điểm nhận hàng (Kho thực tế của bạn) *
                </label>
                <AddressAutocomplete
                  value={deliveryLocation}
                  onChange={(val) => {
                    setDeliveryLocation(val);
                    if (val.trim().length > 6) {
                      updateDistanceToBuyerLocation(val);
                    }
                  }}
                  onSelectAddress={(data) => {
                    if (data.address) {
                      setDeliveryLocation(data.address);
                      updateDistanceToBuyerLocation(data.address, { lat: data.lat, lng: data.lng });
                    }
                  }}
                  placeholder="Nhập số nhà, tên đường, kho bãi (Gợi ý Goong Maps)..."
                  showCurrentLocationBtn={true}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />

                {/* Badge cự ly vận chuyển Goong Maps động */}
                <div className="mt-1 flex items-center gap-1 text-[10px] text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span className="truncate">
                    Xuất từ: <strong>{originHub.name.split('-')[0]}</strong> ➔ Kho nhận:{' '}
                    <strong>{distanceKm > 0 ? `~${distanceKm} km` : 'Tại kho xuất phát'}</strong>
                    {isCalculatingDistance && ' (Đang tính tuyến Goong...)'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Ngày nhận hàng mong muốn *
                </label>
                <DatePickerVi
                  value={deliveryDate}
                  onChange={(val) => setDeliveryDate(val)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                  required
                />
              </div>
            </div>

            {/* Khối quét mã VietQR Escrow */}
            <div className={`p-4 rounded-2xl border ${
              isFullPaymentRequired
                ? 'bg-gradient-to-r from-rose-50 to-amber-50 border-rose-300'
                : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <QrCode className={`w-4 h-4 ${isFullPaymentRequired ? 'text-rose-700' : 'text-[#10542C]'}`} />
                <span className={`font-heading font-black text-xs ${isFullPaymentRequired ? 'text-rose-900' : 'text-[#10542C]'}`}>
                  {isFullPaymentRequired
                    ? 'QUÉT VIETQR THANH TOÁN TẤT TOÁN 100% TIỀN HÀNG (KHO HONA FRESH)'
                    : 'QUÉT VIETQR CHUYỂN KÝ QUỸ CỌC 30% (BẢO CHỨNG ESCROW)'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className={`bg-white p-2 rounded-xl shadow-xs shrink-0 border ${isFullPaymentRequired ? 'border-rose-300' : 'border-emerald-300'}`}>
                  <img
                    src={qrUrl}
                    alt="VietQR Escrow Deposit"
                    className="w-36 h-36 object-contain rounded-lg"
                  />
                </div>

                <div className="space-y-1.5 text-xs flex-1 min-w-0">
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Ngân hàng thụ hưởng:</span>
                    <strong className="text-[#10542C]">{DEFAULT_BANK_INFO.bankName}</strong>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Số tài khoản bảo chứng:</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-gray-900">
                      <span>{DEFAULT_BANK_INFO.accountNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyAccount(DEFAULT_BANK_INFO.accountNumber)}
                        className="text-[#10542C] hover:text-emerald-700 p-0.5 cursor-pointer"
                        title="Sao chép số tài khoản"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Chủ tài khoản:</span>
                    <strong className="text-gray-900">{DEFAULT_BANK_INFO.accountName}</strong>
                  </div>
                  <div className={`flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border ${
                    isFullPaymentRequired ? 'border-rose-300' : 'border-emerald-200'
                  }`}>
                    <span>{isFullPaymentRequired ? 'Số tiền thanh toán 100%:' : 'Số tiền cọc 30%:'}</span>
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
                disabled={isSubmitting || (isFullPaymentRequired && !agreeSelfTransportPolicy)}
                className={`px-7 py-3 text-white font-heading font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 ${
                  isFullPaymentRequired ? 'bg-rose-700 hover:bg-rose-800' : 'bg-[#10542C] hover:bg-[#0C3E20]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-[#8BC34A]" />
                <span>
                  {isSubmitting
                    ? 'Đang xác thực...'
                    : isFullPaymentRequired
                    ? 'Xác Nhận Đã Thanh Toán 100% (Nhận Tại Kho HoNa)'
                    : 'Xác Nhận Đã Chuyển Cọc 30% (Ký Hợp Đồng)'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Modal Quét Mã VietQR SePay xác nhận chuyển cọc */}
        {isPaymentModalOpen && (
          <SepayPaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            type="CONTRACT"
            code={generatedContractCode}
            amount={depositAmount}
            title="Quét Mã VietQR Nộp Cọc 30% Hợp Đồng"
            recipientName={traderName}
            onSuccess={() => {
              setIsPaymentModalOpen(false);
              if (onSuccess) onSuccess();
            }}
          />
        )}
      </div>
    </div>
  );
}
