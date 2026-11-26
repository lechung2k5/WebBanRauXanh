'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  TrendingDown,
  Award,
  AlertTriangle,
  Lightbulb,
  Check,
  Percent,
  LockKeyhole,
} from 'lucide-react';
import { Product } from '@/types';
import { createBuyerRfqApi, updateBuyerRfqApi, getStoredUser } from '@/services/api';
import { saveSyncRfq, B2bSyncRfq } from '@/services/b2bSyncService';
import { useApp } from '@/context/AppContext';
import {
  detectAgriCategory,
  calculate3TierPricing,
  analyzeBuyerPurchaseStrategy,
} from '@/utils/agriPricingHelper';
import {
  calculateLogisticsEstimates,
  findColdHubInfo,
  calculateHaversineDistanceKm,
  ColdHubInfo,
} from '@/utils/logisticsCalculator';
import { getRouteDirections, geocodeAddress } from '@/services/goongMapService';
import DatePickerVi from '@/components/common/DatePickerVi';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';

interface B2BNegotiationModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingRfq?: B2bSyncRfq | null;
  onSaveEdit?: (updatedData: {
    id: number;
    requestedQuantityKg: number;
    targetPricePerKg: number;
    deliveryLocation: string;
    desiredDeliveryDate: string;
    shippingOption: string;
    notes: string;
  }) => Promise<void>;
}

export default function B2BNegotiationModal({
  product,
  isOpen,
  onClose,
  onSuccess,
  editingRfq,
  onSaveEdit,
}: B2BNegotiationModalProps) {
  if (!isOpen || !product) return null;

  const { currentUser } = useApp();

  // 1. Phân loại nhóm nông sản và cấu hình giá cơ sở
  const categoryConfig = useMemo(() => {
    return detectAgriCategory(
      product.name || product.categoryName,
      product.categorySlug
    );
  }, [product.name, product.categoryName, product.categorySlug]);

  const totalLotVolume = useMemo(() => {
    return product.availableVolume || product.totalLotVolume || product.stockQuantity || 10000;
  }, [product.availableVolume, product.totalLotVolume, product.stockQuantity]);

  const basePrice = useMemo(() => {
    return product.price || 15000;
  }, [product.price]);

  const tiers = useMemo(() => {
    return calculate3TierPricing(basePrice, categoryConfig, totalLotVolume);
  }, [basePrice, categoryConfig, totalLotVolume]);

  const moq = tiers[0].minKg;

  const [quantity, setQuantity] = useState<number>(() => moq);
  const [targetPrice, setTargetPrice] = useState<number>(() => tiers[0].pricePerKg);
  const [traderName, setTraderName] = useState('');
  const [traderPhone, setTraderPhone] = useState('');
  const [traderCompany, setTraderCompany] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(
    'Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM'
  );
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [shippingOption, setShippingOption] = useState<
    'farm_pickup' | 'farm_delivery' | 'cold_storage_truck'
  >('farm_delivery');
  const [agreeSelfTransportPolicy, setAgreeSelfTransportPolicy] = useState(false);

  // Kho HoNa Fresh xuất phát phụ trách kiểm định chất lượng (QC) cho lô hàng
  const originHub = useMemo<ColdHubInfo>(() => {
    return findColdHubInfo(
      (product as any)?.hubLocation ||
        (product as any)?.warehouseLocation ||
        product.origin ||
        'Lâm Đồng'
    );
  }, [product]);

  // Cự ly vận chuyển đường bộ thực tế (km) giữa Kho HoNa và địa điểm nhận hàng của Buyer
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
        console.warn('Lỗi tính cự ly Goong Maps:', err);
      } finally {
        setIsCalculatingDistance(false);
      }
    },
    [originHub]
  );

  // Tính toán dự toán chi phí logistics lạnh theo số lượng Buyer đặt mua & cự ly km thực tế
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
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [rfqCode, setRfqCode] = useState('');

  // Tự động khởi tạo giá trị ban đầu và điền thông tin tài khoản thương lái đang đăng nhập
  useEffect(() => {
    if (!isOpen || !product) return;

    if (editingRfq) {
      setQuantity(editingRfq.requestedQuantityKg || moq);
      setTargetPrice(editingRfq.counterPricePerKg || editingRfq.targetPricePerKg || tiers[0].pricePerKg);
      if (editingRfq.buyerName) setTraderName(editingRfq.buyerName);
      if (editingRfq.buyerPhone) setTraderPhone(editingRfq.buyerPhone);
      if (editingRfq.buyerCompany) setTraderCompany(editingRfq.buyerCompany);
      if (editingRfq.deliveryLocation) {
        setDeliveryLocation(editingRfq.deliveryLocation);
        updateDistanceToBuyerLocation(editingRfq.deliveryLocation);
      }
      if (editingRfq.desiredDeliveryDate) {
        setDeliveryDate(editingRfq.desiredDeliveryDate.slice(0, 10));
      }
      if (editingRfq.shippingOption) {
        const s = editingRfq.shippingOption.toLowerCase();
        if (s.includes('pickup') || s.includes('buyer')) {
          setShippingOption('farm_pickup');
        } else if (s.includes('truck') || s.includes('cold') || s.includes('direct')) {
          setShippingOption('cold_storage_truck');
        } else {
          setShippingOption('farm_delivery');
        }
      }
      if (editingRfq.notes) setNotes(editingRfq.notes);
    } else {
      setQuantity(tiers[0].minKg);
      setTargetPrice(tiers[0].pricePerKg);
    }
  }, [isOpen, product.id, editingRfq?.id]);

  useEffect(() => {
    if (editingRfq) return;
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
  }, [currentUser, isOpen, editingRfq, updateDistanceToBuyerLocation]);

  // Phân tích chiến lược mua hàng & cố vấn giá sỉ hời nhất
  const advisory = analyzeBuyerPurchaseStrategy(
    quantity,
    basePrice,
    categoryConfig,
    totalLotVolume
  );

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const estimatedTotal = quantity * targetPrice;
  const originalTotal = quantity * basePrice;
  const totalSavings = originalTotal - estimatedTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traderName || !traderPhone) {
      alert('Vui lòng nhập tên người đại diện và số điện thoại liên hệ!');
      return;
    }

    if (!advisory.isValidMinimum) {
      alert(
        advisory.validationError ||
          `Số lượng đặt mua tối thiểu cho ${categoryConfig.label} là ${moq.toLocaleString()} kg!`
      );
      return;
    }

    if (!advisory.isValidMaximum) {
      alert(
        advisory.validationError ||
          `Số lượng đặt mua không được vượt quá ${totalLotVolume.toLocaleString()} kg (100% sản lượng lô)!`
      );
      return;
    }

    if (shippingOption === 'farm_pickup' && !agreeSelfTransportPolicy) {
      alert(
        'Đối với phương án Khách tự lấy tại Kho HoNa, quý khách vui lòng tích chọn xác nhận cam kết nghiệm thu QC, hoàn tất thanh toán 100% tiền hàng trước khi xe xuất kho!'
      );
      return;
    }

    // Chế độ CHỈNH SỬA đơn đàm phán RFQ đã tồn tại
    if (editingRfq) {
      try {
        if (onSaveEdit) {
          await onSaveEdit({
            id: editingRfq.id,
            requestedQuantityKg: quantity,
            targetPricePerKg: targetPrice,
            deliveryLocation,
            desiredDeliveryDate: deliveryDate,
            shippingOption,
            notes,
          });
        } else {
          await updateBuyerRfqApi(editingRfq.id, {
            harvestLotId: Number(editingRfq.harvestLotId || product.harvestLotId || product.id) || 1,
            quantityKg: quantity,
            proposedPricePerKg: targetPrice,
            desiredDeliveryDate: deliveryDate,
            requestedQuantityKg: quantity,
            targetPricePerKg: targetPrice,
            deliveryLocation,
            shippingOption,
            notes,
          });
        }

        const { id, createdAt, updatedAt, ...restRfq } = editingRfq as any;
        saveSyncRfq({
          ...restRfq,
          requestedQuantityKg: quantity,
          targetPricePerKg: targetPrice,
          deliveryLocation,
          desiredDeliveryDate: deliveryDate,
          shippingOption,
          notes,
          buyerName: traderName,
          buyerPhone: traderPhone,
          buyerCompany: traderCompany,
          status: 'WAITING_FARMER',
        });

        // Cập nhật localStorage
        try {
          const stored = JSON.parse(localStorage.getItem('b2b_rfq_history') || '[]');
          const updatedHistory = stored.map((item: any) =>
            item.id === editingRfq.id || item.rfqCode === editingRfq.rfqCode
              ? {
                  ...item,
                  requestedQuantity: quantity,
                  targetPrice,
                  hubLocation: deliveryLocation,
                  deliveryDate,
                  shippingOption,
                  notes,
                }
              : item
          );
          localStorage.setItem('b2b_rfq_history', JSON.stringify(updatedHistory));
        } catch (e) {
          console.warn('Lỗi cập nhật local history:', e);
        }

        onSuccess?.();
        onClose();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Lỗi cập nhật đơn đàm phán');
      }
      return;
    }

    const lotCode = product.lotCode || (product as any).batchCode || `LOT-2026-DL-00${product.id || 1}`;
    const resolvedLotId = Number(product.harvestLotId || product.id) || 1;
    let code = `RFQ-${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      const saved = (await createBuyerRfqApi({
        harvestLotId: resolvedLotId,
        lotCode,
        quantityKg: quantity,
        proposedPricePerKg: targetPrice,
        desiredDeliveryDate: deliveryDate,
        deliveryLocation,
        shippingOption,
        notes,
      })) as { rfqCode?: string };
      code = saved?.rfqCode || code;
    } catch (error) {
      console.warn('Backend API RFQ create notice (fallback to sync service):', error);
    }

    const targetFarmerId = product.farmerId;
    const targetFarmerName = product.farmerName || product.farmName || 'Nông trại HoNa Fresh';
    const buyerCompany = traderCompany || 'Công Ty Thu Mua Nông Sản Sài Gòn';

    try {
      saveSyncRfq({
        rfqCode: code,
        harvestLotId: Number(product.harvestLotId || product.id) || 1,
        lotCode,
        farmerId: targetFarmerId,
        farmerName: targetFarmerName,
        productName: product.name,
        buyerName: traderName,
        buyerPhone: traderPhone,
        buyerCompany,
        requestedQuantityKg: quantity,
        targetPricePerKg: targetPrice,
        desiredDeliveryDate: deliveryDate,
        deliveryLocation,
        shippingOption,
        notes,
        status: 'WAITING_FARMER',
      });
    } catch (syncErr) {
      console.error('Lỗi lưu B2B Sync:', syncErr);
    }

    try {
      const historyItem = {
        id: code,
        rfqCode: code,
        harvestLotId: Number(product.harvestLotId || product.id) || 1,
        harvestLotCode: lotCode,
        farmerId: targetFarmerId,
        farmerName: targetFarmerName,
        productName: product.name,
        buyerName: traderName,
        buyerPhone: traderPhone,
        buyerCompany,
        requestedQuantity: quantity,
        targetPrice: targetPrice,
        deliveryDate: deliveryDate,
        hubLocation: deliveryLocation,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      const existingHistory = JSON.parse(localStorage.getItem('b2b_rfq_history') || '[]');
      localStorage.setItem('b2b_rfq_history', JSON.stringify([historyItem, ...existingHistory]));

      const existingFarmer = JSON.parse(localStorage.getItem('b2b_farmer_rfqs') || '[]');
      localStorage.setItem('b2b_farmer_rfqs', JSON.stringify([historyItem, ...existingFarmer]));

      const existingSubmitted = JSON.parse(localStorage.getItem('b2b_submitted_rfqs') || '[]');
      localStorage.setItem(
        'b2b_submitted_rfqs',
        JSON.stringify([historyItem, ...existingSubmitted])
      );

      window.dispatchEvent(new CustomEvent('b2b_rfq_updated', { detail: historyItem }));
    } catch (storageErr) {
      console.error('Lỗi lưu history storage:', storageErr);
    }

    setRfqCode(code);
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
                <span className="font-bold text-[#10542C]">
                  {quantity >= 1000 ? `${(quantity / 1000).toFixed(1)} Tấn` : `${quantity} kg`}{' '}
                  <span className="text-gray-500 font-normal">({advisory.percentageOfLot}% lô)</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Giá sỉ thương lượng:</span>
                <span className="font-bold text-[#E53935]">{formatVND(targetPrice)} / kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Ước tính giá trị lô:</span>
                <span className="font-black text-[#10542C]">{formatVND(estimatedTotal)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg">
                  <span>Tiết kiệm so với Giá Cơ Sở:</span>
                  <span>{formatVND(totalSavings)} (-{Math.round((totalSavings / originalTotal) * 100)}%)</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Điểm nhận hàng:</span>
                <span className="font-medium text-[#2C3E2E] truncate max-w-[200px]">{deliveryLocation}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Liên hệ Nhà Vườn:</span>
                <span className="font-mono text-gray-700 font-bold flex items-center gap-1">
                  <LockKeyhole className="w-3.5 h-3.5 text-amber-600" />
                  098***.*** (Mở sau khi cọc)
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="tel:19008868"
                className="px-5 py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Tổng Đài Điều Phối B2B: 1900 8868</span>
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
                <span>
                  {editingRfq
                    ? `Chỉnh Sửa Báo Giá Đàm Phán • ${editingRfq.rfqCode}`
                    : 'Thương Lượng Giá Sỉ Trực Tiếp Nông Trại'}
                </span>
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-black text-[#10542C]">
                {editingRfq
                  ? `Cập Nhật Đơn Thu Mua: ${editingRfq.productName}`
                  : 'Gửi Yêu Cầu Thu Mua Lô Nông Sản'}
              </h3>
              <p className="text-xs text-[#6B7280]">
                {editingRfq
                  ? 'Điều chỉnh số lượng, đơn giá đề xuất hoặc thông tin vận chuyển chuỗi lạnh.'
                  : 'Thương thảo trực tiếp với Nông Trại / Hợp Tác Xã không qua trung gian.'}
              </p>
            </div>

            {/* 1. Thông tin lô nông sản, Giá Cơ Sở & Phân loại đặc thù */}
            <div className="p-4 rounded-2xl bg-[#F0F7F2] border border-[#D7EED6] space-y-3">
              <div className="flex items-center gap-3.5">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white shadow-2xs"
                />
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-heading font-bold text-sm text-[#10542C] truncate">
                      {product.name}
                    </h4>
                    {/* Badge phân loại nông sản */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryConfig.badgeColor}`}
                    >
                      {categoryConfig.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B7280]">
                    <span className="flex items-center gap-1 font-medium text-[#2C3E2E]">
                      <Building2 className="w-3.5 h-3.5 text-[#4CAF50]" /> {product.farmName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#8BC34A]" /> {product.farmLocation}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 italic">
                    ℹ️ {categoryConfig.description}
                  </p>
                </div>
              </div>

              {/* Hàng thể hiện Giá Cơ Sở và Sản Lượng Khả Dụng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#D7EED6]/60 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-emerald-100 flex items-center justify-between">
                  <span className="text-gray-600 font-medium">GIÁ CƠ SỞ (1 KG):</span>
                  <strong className="text-[#10542C] font-black text-sm">
                    {formatVND(basePrice)} / kg
                  </strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-emerald-100 flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Sản lượng khả dụng của lô:</span>
                  <strong className="text-slate-800 font-bold">
                    {totalLotVolume >= 1000
                      ? `${(totalLotVolume / 1000).toFixed(1)} Tấn (${totalLotVolume.toLocaleString()} kg)`
                      : `${totalLotVolume.toLocaleString()} kg`}
                  </strong>
                </div>
              </div>
            </div>

            {/* 2. BẢNG 3 MỨC GIÁ SỈ THEO KHỐI LƯỢNG (3-Tier Volume Pricing) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2C3E2E] flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#10542C]" />
                  <span>Bảng 3 Mức Giá Sỉ Theo Sản Lượng (Chọn để áp dụng nhanh):</span>
                </label>
                <span className="text-[11px] text-emerald-700 font-medium">
                  Tự động chiết khấu theo khối lượng
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {tiers.map((tier) => {
                  const isActive = advisory.currentTier.tierIndex === tier.tierIndex;
                  return (
                    <button
                      key={tier.tierIndex}
                      type="button"
                      onClick={() => {
                        setQuantity(tier.minKg);
                        setTargetPrice(tier.pricePerKg);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        isActive
                          ? 'border-[#10542C] bg-[#10542C]/5 ring-2 ring-[#10542C] shadow-sm'
                          : 'border-[#EAECE8] bg-white hover:border-[#10542C]/40 hover:bg-[#F9FAF8]'
                      }`}
                    >
                      {/* Huy hiệu Mua Lời Nhất */}
                      {tier.isBestValue && (
                        <span className="absolute -top-2.5 right-2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>Mua Lời Nhất</span>
                        </span>
                      )}

                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-gray-700">
                          {tier.name.split(':')[0]}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Đang áp dụng
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 font-medium">
                        Từ <strong>{tier.minKg >= 1000 ? `${tier.minKg / 1000} Tấn` : `${tier.minKg.toLocaleString()} kg`}</strong>
                      </div>

                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="font-heading font-black text-sm text-[#10542C]">
                          {formatVND(tier.pricePerKg)}
                          <span className="text-[10px] font-normal text-gray-500">/kg</span>
                        </span>
                        {tier.discountPercent > 0 ? (
                          <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            Sale -{tier.discountPercent}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium">Giá chuẩn</span>
                        )}
                      </div>

                      {tier.savingsPerKg > 0 && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                          Tiết kiệm {formatVND(tier.savingsPerKg)}/kg
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. KHỐI CỐ VẤN THU MUA CHO THƯƠNG LÁI (BUYER): MUA NHƯ THẾ NÀO CHO LỜI NHẤT */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0F3820] to-[#1B4D2E] text-white shadow-md space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#8BC34A] text-[#0F3820] flex items-center justify-center font-black">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#8BC34A]">
                    Cố Vấn Lợi Nhuận Cho Thương Lái
                  </span>
                </div>
                {advisory.isBestTier ? (
                  <span className="text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Award className="w-3 h-3" /> Đạt mức hời nhất
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-white/20 text-emerald-200 px-2 py-0.5 rounded-full">
                    Gợi ý tối ưu chi phí
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-white">{advisory.smartAdviceHeadline}</p>
                <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                  {advisory.smartAdviceDetail}
                </p>
              </div>

              {/* Nút hành động áp dụng mức giá hời nhất một chạm */}
              {!advisory.isBestTier && (
                <div className="pt-1 flex flex-wrap gap-2">
                  {advisory.nextTier && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuantity(advisory.nextTier!.minKg);
                        setTargetPrice(advisory.nextTier!.pricePerKg);
                      }}
                      className="px-3 py-1.5 bg-[#8BC34A] hover:bg-[#7CB342] text-[#0F3820] rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      👉 Nâng lên {advisory.nextTier.minKg.toLocaleString()} kg (Giảm thêm {formatVND(advisory.extraSavingsPerKgNextTier)}/kg)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setQuantity(tiers[2].minKg);
                      setTargetPrice(tiers[2].pricePerKg);
                    }}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    🏆 Mua {tiers[2].minKg.toLocaleString()} kg để LỜI NHẤT (Sale -{tiers[2].discountPercent}%)
                  </button>
                </div>
              )}
            </div>

            {/* 4. RÀNG BUỘC PHẦN TRĂM SẢN LƯỢNG LÔ HÀNG (PERCENTAGE VOLUME CONSTRAINT) */}
            <div className="p-3 bg-[#F9FAF8] rounded-2xl border border-[#EAECE8] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Tỷ lệ thu mua trên toàn lô:</span>
                <span className="font-bold text-[#10542C]">
                  {quantity.toLocaleString()} kg / {totalLotVolume.toLocaleString()} kg{' '}
                  <strong className="text-emerald-700">({advisory.percentageOfLot}% lô)</strong>
                </span>
              </div>

              {/* Progress bar trực quan */}
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    advisory.percentageOfLot > 100
                      ? 'bg-rose-500'
                      : advisory.percentageOfLot >= 50
                      ? 'bg-emerald-600'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, advisory.percentageOfLot)}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Tối thiểu: {moq.toLocaleString()} kg (Cho {categoryConfig.label})</span>
                <span>Tối đa: {totalLotVolume.toLocaleString()} kg (100% lô)</span>
              </div>

              {/* Cảnh báo ràng buộc */}
              {advisory.validationError && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{advisory.validationError}</span>
                </div>
              )}
            </div>

            {/* 5. Khối nhập số lượng & giá đàm phán chi tiết (Xếp ngang hàng) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-[#2C3E2E] mb-1.5 flex items-center justify-between">
                  <span>Số lượng cần thu mua (kg) *</span>
                  <span className="text-xs text-[#4CAF50] font-bold">
                    {quantity >= 1000 ? `≈ ${(quantity / 1000).toFixed(2)} Tấn` : `${quantity} kg`}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={totalLotVolume}
                    step="any"
                    value={quantity === 0 ? '' : quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newQty = val === '' ? 0 : Math.max(0, Number(val));
                      setQuantity(newQty);
                      if (newQty > 0) {
                        const adv = analyzeBuyerPurchaseStrategy(
                          newQty,
                          basePrice,
                          categoryConfig,
                          totalLotVolume
                        );
                        setTargetPrice(adv.appliedPricePerKg);
                      }
                    }}
                    className={`w-full bg-[#F9F9F5] border rounded-xl px-3.5 h-11 text-sm font-bold text-[#10542C] focus:outline-none ${
                      !advisory.isValidMinimum || !advisory.isValidMaximum
                        ? 'border-amber-400 ring-1 ring-amber-400'
                        : 'border-[#E5E7EB] focus:border-[#10542C]'
                    }`}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280]">
                    kg
                  </span>
                </div>

                {/* Các nút chọn nhanh số lượng thiết kế riêng cho từng loại nông sản */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {categoryConfig.quickQuantities
                    .filter((qty) => qty <= totalLotVolume)
                    .map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => {
                          setQuantity(qty);
                          const adv = analyzeBuyerPurchaseStrategy(
                            qty,
                            basePrice,
                            categoryConfig,
                            totalLotVolume
                          );
                          setTargetPrice(adv.appliedPricePerKg);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          quantity === qty
                            ? 'bg-[#10542C] text-white shadow-xs'
                            : 'bg-[#F4F5F1] text-[#6B7280] hover:bg-[#EAECE8]'
                        }`}
                      >
                        {qty >= 1000 ? `${qty / 1000}T` : `${qty}kg`}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#2C3E2E] mb-1.5 flex items-center justify-between">
                  <span>Giá sỉ đề xuất (VNĐ/kg) *</span>
                  {totalSavings > 0 && (
                    <span className="text-xs text-[#E53935] font-bold">
                      Tiết kiệm {formatVND(totalSavings)}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1000}
                    step={100}
                    value={targetPrice === 0 ? '' : targetPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetPrice(val === '' ? 0 : Math.max(0, Number(val)));
                    }}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3.5 h-11 text-sm font-bold text-[#E53935] focus:outline-none focus:border-[#10542C]"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280]">
                    đ/kg
                  </span>
                </div>

                {/* Gợi ý mức chiết khấu theo Giá Cơ Sở */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    { label: 'Giá cơ sở', price: basePrice },
                    { label: '-5%', price: Math.round((basePrice * 0.95) / 100) * 100 },
                    { label: '-10%', price: Math.round((basePrice * 0.9) / 100) * 100 },
                    { label: '-15%', price: Math.round((basePrice * 0.85) / 100) * 100 },
                  ].map((tier) => (
                    <button
                      key={tier.label}
                      type="button"
                      onClick={() => setTargetPrice(tier.price)}
                      className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        targetPrice === tier.price
                          ? 'bg-[#E53935] text-white shadow-xs'
                          : 'bg-[#F4F5F1] text-[#6B7280] hover:bg-[#EAECE8]'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Thông tin đại diện Người mua / Thương lái (Xếp ngang hàng chuẩn tuyệt đối) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-sm font-bold text-[#2C3E2E] mb-1.5 h-5 flex items-center whitespace-nowrap truncate" title="Họ tên người mua *">
                  Họ tên người mua *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn Hùng"
                  value={traderName}
                  onChange={(e) => setTraderName(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3.5 h-11 text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#2C3E2E] mb-1.5 h-5 flex items-center whitespace-nowrap truncate" title="Số điện thoại liên hệ *">
                  Số điện thoại liên hệ *
                </label>
                <input
                  type="tel"
                  placeholder="0912.345.678"
                  value={traderPhone}
                  onChange={(e) => setTraderPhone(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3.5 h-11 text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#2C3E2E] mb-1.5 h-5 flex items-center whitespace-nowrap truncate" title="Đơn vị / Doanh nghiệp">
                  Đơn vị / Doanh nghiệp
                </label>
                <input
                  type="text"
                  placeholder="Vựa nông sản / Công ty"
                  value={traderCompany}
                  onChange={(e) => setTraderCompany(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3.5 h-11 text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
              </div>
            </div>

            {/* Điểm nhận hàng & Ngày nhận hàng (Xếp ngang hàng) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-[#2C3E2E] mb-1.5 whitespace-nowrap truncate" title="Địa điểm nhận hàng (Kho khách hàng) *">
                  Địa điểm nhận hàng (Kho khách hàng) *
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
                  placeholder="Nhập số nhà, tên đường, kho bãi thực tế (Gợi ý Goong Maps)..."
                  showCurrentLocationBtn={true}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3.5 h-11 text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />

                {/* Badge cự ly vận chuyển Goong Maps động */}
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#10542C] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate">
                    Xuất từ: <strong>{originHub.name.split('-')[0]}</strong> ➔ Kho nhận:{' '}
                    <strong>{distanceKm > 0 ? `~${distanceKm} km` : 'Tại kho xuất phát'}</strong>
                    {isCalculatingDistance && ' (Đang tính tuyến Goong...)'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-1.5 text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-600">Gợi ý nhanh:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const addr = 'Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM';
                      setDeliveryLocation(addr);
                      updateDistanceToBuyerLocation(addr, { lat: 10.8658, lng: 106.7454 });
                    }}
                    className="underline hover:text-[#10542C] cursor-pointer"
                  >
                    Thủ Đức
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const addr = 'Chợ Đầu Mối Hóc Môn, TP.HCM';
                      setDeliveryLocation(addr);
                      updateDistanceToBuyerLocation(addr, { lat: 10.8783, lng: 106.5936 });
                    }}
                    className="underline hover:text-[#10542C] cursor-pointer"
                  >
                    Hóc Môn
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const addr = 'Chợ Đầu Mối Bình Điền, TP.HCM';
                      setDeliveryLocation(addr);
                      updateDistanceToBuyerLocation(addr, { lat: 10.7027, lng: 106.6214 });
                    }}
                    className="underline hover:text-[#10542C] cursor-pointer"
                  >
                    Bình Điền
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const addr = 'Nhận hàng tại Kho / Trạm buồng lạnh HoNa Fresh';
                      setDeliveryLocation(addr);
                      updateDistanceToBuyerLocation(addr);
                    }}
                    className="underline hover:text-[#10542C] cursor-pointer"
                  >
                    Tại kho HoNa
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#2C3E2E] mb-1.5 whitespace-nowrap truncate" title="Ngày cần nhận hàng dự kiến *">
                  Ngày cần nhận hàng dự kiến *
                </label>
                <DatePickerVi
                  value={deliveryDate}
                  onChange={(val) => setDeliveryDate(val)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3.5 h-11 text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
              </div>
            </div>

            {/* Phương thức vận chuyển & Logistics chuỗi lạnh */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#2C3E2E]">
                  Phương thức vận chuyển & Logistics lạnh (3 Phương Án Xuất Kho HoNa) *
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
                      Gom về kho HoNa kiểm định QC ➔ Xe lạnh HoNa Fresh chở thẳng từ kho tới tận tay khách hàng.
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
                      Gom về kho HoNa kiểm định QC ➔ Khách tự điều xe đến Kho HoNa nhận hàng (Thanh toán 100%).
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
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-rose-900 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>Quy định Nghiệm Thu QC & Tất Toán 100% Tại Kho HoNa Fresh:</span>
                  </div>
                  <p className="text-rose-800 text-[11px] leading-relaxed">
                    Nông sản được gom về Kho HoNa Fresh và kiểm định chất lượng QC đạt chuẩn trước khi xuất kho. Quý khách tự điều xe tải lạnh đến Kho HoNa Fresh nhận hàng, nghiệm thu biên bản QC và <strong>bắt buộc tất toán 100% tiền hàng trước khi bốc hàng lên xe</strong>. Sau khi xe lăn bánh rời cổng Kho HoNa Fresh, khách hàng tự chịu trách nhiệm về nhiệt độ chuỗi lạnh trên đường vận chuyển.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-950 pt-1">
                    <input
                      type="checkbox"
                      required
                      checked={agreeSelfTransportPolicy}
                      onChange={(e) => setAgreeSelfTransportPolicy(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <span>Tôi đồng ý nghiệm thu QC, thanh toán 100% tiền hàng tại Kho HoNa và tự chịu trách nhiệm vận chuyển chặng sau.</span>
                  </label>
                </div>
              )}
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                Yêu cầu chất lượng & Ghi chú thêm
              </label>
              <textarea
                rows={2}
                placeholder="Yêu cầu kiểm tra mẫu tại vườn, quy cách đóng gói sọt 50kg, thời gian điều xe..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
              />
            </div>

            {/* Tổng kết & Nút gửi */}
            <div className="p-4 rounded-2xl bg-[#F4F7F4] border border-[#D7EED6] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] text-[#6B7280]">Tiền hàng:</span>
                  <span className="font-bold text-gray-800 text-sm">{formatVND(estimatedTotal)}</span>
                  <span className="text-[10px] text-gray-500">
                    ({quantity >= 1000 ? `${(quantity / 1000).toFixed(1)} Tấn` : `${quantity} kg`} × {formatVND(targetPrice)}/kg)
                  </span>
                </div>
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="text-[11px] text-[#6B7280]">Cước logistics:</span>
                  <span className="font-bold text-[#10542C]">
                    + {formatVND(shippingFee)}
                  </span>
                  {shippingOption === 'farm_pickup' && (
                    <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-1.5 py-0.2 rounded">Gom vườn & lưu kho (Miễn chặng 2)</span>
                  )}
                  {shippingOption === 'farm_delivery' && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">Tiết kiệm ghép xe</span>
                  )}
                </div>
                <div className="pt-1 border-t border-gray-200/60 flex items-baseline gap-2">
                  <span className="text-xs font-bold text-gray-700">Tổng thanh toán dự kiến:</span>
                  <span className="font-heading text-lg sm:text-xl font-black text-[#10542C]">
                    {formatVND(estimatedTotal + shippingFee)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!advisory.isValidMinimum || !advisory.isValidMaximum || (shippingOption === 'farm_pickup' && !agreeSelfTransportPolicy)}
                className="w-full sm:w-auto px-6 py-3 bg-[#10542C] hover:bg-[#0C3E20] disabled:opacity-50 text-white font-heading font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                {editingRfq ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Lưu Cập Nhật Đàm Phán</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi đề xuất tới nhà vườn</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
