'use client';

import React, { useState, useEffect } from 'react';
import { Product, TieredPrice } from '@/types';
import { getProductGallery } from '@/services/imageService';
import {
  X,
  Plus,
  Minus,
  Scale,
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Leaf,
  PhoneCall,
  Truck,
  Package,
  Layers,
  Thermometer,
  FileText,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onOpenNegotiation?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
  onOpenNegotiation,
}) => {
  const [activeTab, setActiveTab] = useState<'specs' | 'storage' | 'farm'>('specs');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const moq = product?.moq || 500;
  const [quantity, setQuantity] = useState<number>(moq);

  useEffect(() => {
    if (product) {
      setQuantity(product.moq || 500);
      setSelectedImage(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const thumbnails = getProductGallery(product.name, product.imageUrl);
  const currentImage = selectedImage || product.imageUrl;

  // Tính giá theo phân tầng số lượng (Tiered Pricing Calculator)
  const tiers: TieredPrice[] = product.tieredPricing || [
    { minQuantity: moq, unitPrice: product.price, discountLabel: `Đơn tối thiểu (≥ ${moq} kg)` },
    { minQuantity: 2000, unitPrice: Math.round(product.price * 0.92 / 100) * 100, discountLabel: 'Lô vừa (≥ 2 Tấn) - Giảm 8%' },
    { minQuantity: 5000, unitPrice: Math.round(product.price * 0.85 / 100) * 100, discountLabel: 'Lô lớn (≥ 5 Tấn) - Giảm 15%' },
  ];

  let applicableTier = tiers[0];
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (quantity >= tiers[i].minQuantity) {
      applicableTier = tiers[i];
      break;
    }
  }

  const unitPrice = applicableTier.unitPrice;
  const totalAmount = quantity * unitPrice;
  const baseTotal = quantity * product.price;
  const savings = baseTotal - totalAmount;
  const depositAmount = Math.round(totalAmount * 0.3 / 1000) * 1000; // Đặt cọc 30% bảo lãnh sàn

  const totalLotTons = product.totalLotVolume ? (product.totalLotVolume / 1000).toFixed(0) : '15';
  const availableTons = product.availableVolume ? (product.availableVolume / 1000).toFixed(1) : '12.5';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl z-10 max-h-[92vh] overflow-y-auto border border-[#D7EED6]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#758A7A] hover:text-[#2C3E2E] rounded-full hover:bg-[#F4F5F1] transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
          {/* Cột trái: Ảnh sản phẩm & Thumbnail Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#F9F9F5] border border-[#EAECE8]">
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                <span className="bg-[#10542C] text-white text-[11px] font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Scale className="w-3 h-3 text-[#8BC34A]" />
                  MOQ: {moq >= 1000 ? `${moq / 1000} Tấn` : `${moq} kg`}
                </span>
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  {product.harvestStage === 'harvesting' ? '● Đang thu hái xuất vườn' : '⏱ Sắp thu hoạch'}
                </span>
              </div>

              {/* PUC Code */}
              {product.pucCode && (
                <div className="absolute top-3 right-3">
                  <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg">
                    PUC: {product.pucCode}
                  </span>
                </div>
              )}
            </div>

            {/* Gallery Thumbnails */}
            {thumbnails.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {thumbnails.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      currentImage === img
                        ? 'border-[#10542C] scale-105 shadow-xs'
                        : 'border-[#EAECE8] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Khối bảo lãnh giao dịch B2B */}
            <div className="p-3.5 rounded-2xl bg-[#F0F7F2] border border-[#D7EED6] text-xs space-y-1.5">
              <div className="font-bold text-[#10542C] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#4CAF50]" />
                <span>Bảo Lãnh Giao Dịch Nông Sản B2B</span>
              </div>
              <p className="text-[11px] text-[#556958] leading-relaxed">
                Thương lái đặt cọc 30% được giữ trong tài khoản ký quỹ trung gian của sàn. Tiền chỉ chuyển cho nhà vườn khi hàng đã được nghiệm thu đạt chuẩn tại vườn hoặc kho giao nhận.
              </p>
            </div>
          </div>

          {/* Cột phải: Thông tin Lô Nông Sản & Máy tính giá sỉ */}
          <div className="space-y-4">
            {/* Tiêu đề & Thông tin vùng trồng */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#4CAF50] uppercase tracking-wider">
                  {product.categoryName || 'Lô nông sản sỉ'}
                </span>
                <span className="text-[#9CA3AF]">•</span>
                <span className="text-[11px] text-[#6B7280]">
                  Sản lượng lô: <strong className="text-[#10542C]">{totalLotTons} Tấn</strong> (Còn {availableTons} Tấn)
                </span>
              </div>

              <h2 className="font-heading text-xl sm:text-2xl font-black text-[#10542C]">
                {product.name}
              </h2>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#2C3E2E] pt-1">
                <span className="flex items-center gap-1 font-bold text-[#10542C]">
                  <Building2 className="w-3.5 h-3.5 text-[#4CAF50]" />
                  {product.farmName || 'HTX Nông Nghiệp Đơn Dương'}
                </span>
                <span className="flex items-center gap-1 text-[#6B7280]">
                  <MapPin className="w-3.5 h-3.5 text-[#8BC34A]" />
                  {product.farmLocation || 'Đơn Dương, Lâm Đồng'}
                </span>
              </div>
            </div>

            {/* Bảng Giá Sỉ Phân Tầng (Tiered Pricing Table) */}
            <div className="bg-[#F9F9F5] rounded-2xl p-3.5 border border-[#EAECE8] space-y-2">
              <span className="text-xs font-bold text-[#2C3E2E] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-[#4CAF50]" />
                  Bảng giá sỉ phân tầng tại vườn (VND/kg):
                </span>
                {savings > 0 && (
                  <span className="text-[11px] text-[#E53935] font-bold">
                    Tiết kiệm {formatVND(savings)}
                  </span>
                )}
              </span>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {tiers.map((t, idx) => {
                  const isCurrent = applicableTier.minQuantity === t.minQuantity;
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-[#10542C] text-white border-[#10542C] shadow-xs'
                          : 'bg-white border-[#EAECE8] text-[#2C3E2E]'
                      }`}
                    >
                      <div className={`text-[10px] font-medium ${isCurrent ? 'text-emerald-200' : 'text-[#6B7280]'}`}>
                        ≥ {t.minQuantity >= 1000 ? `${t.minQuantity / 1000} Tấn` : `${t.minQuantity} kg`}
                      </div>
                      <div className="font-heading font-black text-sm pt-0.5">
                        {formatVND(t.unitPrice)}
                      </div>
                      <div className={`text-[9px] pt-0.5 ${isCurrent ? 'text-emerald-100' : 'text-[#E53935]'}`}>
                        {t.discountLabel.split('-')[1]?.trim() || 'Giá gốc'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Máy tính số lượng thu mua */}
            <div className="p-4 rounded-2xl bg-[#F0F7F2] border border-[#D7EED6] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#2C3E2E]">Nhập số lượng thu mua:</span>
                <span className="text-[#10542C]">
                  {quantity >= 1000 ? `≈ ${(quantity / 1000).toFixed(2)} Tấn` : `${quantity} kg`}
                </span>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[moq, 1000, 2000, 5000, 10000].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setQuantity(qty)}
                    className={`text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      quantity === qty
                        ? 'bg-[#10542C] text-white shadow-xs'
                        : 'bg-white border border-[#D7EED6] text-[#2C3E2E] hover:bg-[#F9F9F5]'
                    }`}
                  >
                    {qty >= 1000 ? `${qty / 1000} Tấn` : `${qty} kg`}
                  </button>
                ))}
              </div>

              {/* Slider & Input */}
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={moq}
                  step={100}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(moq, Number(e.target.value)))}
                  className="w-32 bg-white border border-[#D7EED6] rounded-xl px-3 py-2 text-xs font-bold text-[#10542C] focus:outline-none focus:border-[#10542C]"
                />
                <span className="text-xs font-bold text-[#6B7280]">kg</span>

                <div className="flex-1 text-right">
                  <span className="text-[10px] text-[#6B7280] block">Ước tính giá trị lô hàng:</span>
                  <span className="font-heading text-lg font-black text-[#10542C]">
                    {formatVND(totalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#D7EED6]/60 text-[#556958]">
                <span>Tiền cọc giữ lô hàng (30%): <strong className="text-[#10542C] font-bold">{formatVND(depositAmount)}</strong></span>
                <span>Thanh toán còn lại khi giao hàng</span>
              </div>
            </div>

            {/* B2B Action Buttons */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenNegotiation) onOpenNegotiation(product);
                  }}
                  className="py-3 bg-white hover:bg-[#F4F7F4] text-[#10542C] border-2 border-[#10542C] font-heading font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Scale className="w-4 h-4 text-[#10542C]" />
                  <span>Đàm phán giá sỉ (RFQ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onBuyNow(product, quantity)}
                  className="py-3 bg-[#10542C] hover:bg-[#0C3E20] text-white font-heading font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Package className="w-4 h-4 text-[#8BC34A]" />
                  <span>Đặt cọc giữ lô hàng</span>
                </button>
              </div>

              {/* Hotline gọi trực tiếp */}
              <a
                href={`tel:${product.farmContactPhone || '0988100222'}`}
                className="w-full py-2 bg-[#F9F9F5] hover:bg-[#F4F5F1] text-[#2C3E2E] border border-[#EAECE8] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#4CAF50]" />
                <span>Hotline Thương Lái - Nhà Vườn: <strong>{product.farmContactPhone || '0988.100.222'}</strong></span>
              </a>
            </div>

            {/* Tabs chi tiết */}
            <div className="pt-2">
              <div className="flex border-b border-[#EAECE8] text-xs font-bold">
                {[
                  { id: 'specs', label: 'Thông số lô & Tiêu chuẩn' },
                  { id: 'storage', label: 'Bảo quản & Vận chuyển' },
                  { id: 'farm', label: 'Hồ sơ năng lực HTX' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`py-2 px-3 border-b-2 transition-all cursor-pointer ${
                      activeTab === t.id
                        ? 'border-[#10542C] text-[#10542C]'
                        : 'border-transparent text-[#6B7280] hover:text-[#2C3E2E]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="py-3 text-xs text-[#2C3E2E] space-y-2">
                {activeTab === 'specs' && (
                  <div className="space-y-2">
                    <p className="text-[#6B7280] leading-relaxed">{product.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 bg-[#F9F9F5] rounded-lg border border-[#EAECE8]">
                        <span className="text-[#6B7280] block">Tiêu chuẩn:</span>
                        <strong className="text-[#10542C]">
                          {Array.isArray(product.certification)
                            ? product.certification.join(', ')
                            : (product.certification || 'VietGAP')}
                        </strong>
                      </div>
                      <div className="p-2 bg-[#F9F9F5] rounded-lg border border-[#EAECE8]">
                        <span className="text-[#6B7280] block">Thời gian thu hoạch:</span>
                        <strong className="text-[#10542C]">{product.harvestDate || 'Đang thu hoạch'}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'storage' && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Thermometer className="w-4 h-4 text-[#4CAF50] shrink-0 mt-0.5" />
                      <div>
                        <strong>Điều kiện bảo quản tại kho HTX:</strong>
                        <p className="text-[#6B7280] mt-0.5">{product.storageCondition || 'Kho lạnh bảo quản tiêu chuẩn 8 - 12°C'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 pt-1 border-t border-[#F0F0F0]">
                      <Truck className="w-4 h-4 text-[#8BC34A] shrink-0 mt-0.5" />
                      <div>
                        <strong>Điều kiện giao nhận & Logistics:</strong>
                        <p className="text-[#6B7280] mt-0.5">{product.shippingTerms || 'Giao tại vườn hoặc xe tải giao kho thương lái'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'farm' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Đơn vị chào bán:</span>
                      <strong className="text-[#10542C]">{product.farmName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Địa chỉ nông trại:</span>
                      <span>{product.farmLocation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Mã số vùng trồng (PUC):</span>
                      <span className="font-mono font-bold text-[#10542C]">{product.pucCode}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
