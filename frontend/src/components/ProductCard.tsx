'use client';

import React from 'react';
import { Product } from '@/types';
import {
  Building2,
  MapPin,
  ShieldCheck,
  Leaf,
  Scale,
  Package,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product, quantity?: number) => void;
  onViewDetail?: (product: Product) => void;
  onNegotiate?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onViewDetail,
  onNegotiate,
}) => {
  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const moqText =
    product.moq && product.moq >= 1000
      ? `${(product.moq / 1000).toFixed(1)} Tấn`
      : `${product.moq || 500} kg`;

  const totalLotTons = product.totalLotVolume
    ? (product.totalLotVolume >= 1000 ? (product.totalLotVolume / 1000).toFixed(0) : product.totalLotVolume)
    : '10';

  const availableTons = product.availableVolume
    ? (product.availableVolume >= 1000 ? (product.availableVolume / 1000).toFixed(1) : product.availableVolume)
    : '8.5';

  const soldPercent = product.totalLotVolume && product.availableVolume
    ? Math.round(((product.totalLotVolume - product.availableVolume) / product.totalLotVolume) * 100)
    : 28;

  const harvestStageText =
    product.harvestStage === 'harvesting' || product.harvestStage === 'Đang thu hoạch'
      ? 'Đang thu hoạch rộ'
      : product.harvestStage === 'upcoming' || product.harvestStage === 'Sắp thu hoạch'
      ? 'Sắp thu hoạch (Đặt trước)'
      : 'Chào bán trước vụ';

  const stageBadgeStyle =
    product.harvestStage === 'harvesting' || product.harvestStage === 'Đang thu hoạch'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : product.harvestStage === 'upcoming' || product.harvestStage === 'Sắp thu hoạch'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-blue-50 text-blue-800 border-blue-200';

  return (
    <div className="group bg-white rounded-2xl border border-[#EAECE8] shadow-xs hover:shadow-lg hover:border-[#10542C]/40 transition-all duration-300 flex flex-col md:flex-row items-stretch overflow-hidden">
      {/* CỘT 1: Ảnh sản phẩm sạch sẽ - Không để badge đè lên che khuất ảnh */}
      <div
        onClick={() => onViewDetail && onViewDetail(product)}
        className="relative w-full md:w-64 lg:w-72 shrink-0 aspect-16/10 md:aspect-auto overflow-hidden bg-[#F9F9F5] cursor-pointer"
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            const fallbackApi = `/api/product-image?name=${encodeURIComponent(product.name)}`;
            if (!target.src.includes('/api/product-image')) {
              target.src = fallbackApi;
            }
          }}
        />
        {/* Subtle pill nhỏ ở góc ảnh hiển thị tiến độ vụ mùa */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-black/60 backdrop-blur-md shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8BC34A] animate-pulse" />
            {harvestStageText}
          </span>
        </div>
      </div>

      {/* CỘT 2: Nội dung lô hàng & TẤT CẢ BADGE HIỂN THỊ TRONG CARD */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-3">
        <div>
          {/* Hàng 1: Nguồn gốc Hợp Tác Xã & Vùng trồng */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280] mb-2">
            <span className="inline-flex items-center gap-1.5 font-bold text-[#10542C] bg-[#10542C]/8 px-2.5 py-1 rounded-lg border border-[#10542C]/15">
              <Building2 className="w-3.5 h-3.5 text-[#4CAF50]" />
              <span className="truncate max-w-[220px]">{product.farmName || 'HTX Nông Nghiệp Đơn Dương'}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[#4B5563] bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
              <MapPin className="w-3 h-3 text-[#8BC34A]" />
              <span>{product.farmLocation || 'Lâm Đồng'}</span>
            </span>

            {product.pucCode && (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#2C3E2E] bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                Mã PUC: <strong className="text-[#10542C]">{product.pucCode}</strong>
              </span>
            )}
          </div>

          {/* Hàng 2: Tên lô hàng nông sản */}
          <h3
            onClick={() => onViewDetail && onViewDetail(product)}
            className="font-heading text-base sm:text-lg font-extrabold text-[#2C3E2E] group-hover:text-[#10542C] transition-colors cursor-pointer line-clamp-1"
          >
            {product.name}
          </h3>

          {/* Hàng 3: Toàn bộ Badge thông số kỹ thuật HIỂN THỊ TRONG CARD (Gọn gàng, rõ ràng) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
            {/* Tiêu chuẩn chứng nhận */}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              {Array.isArray(product.certification)
                ? product.certification.join(', ')
                : (product.certification || 'Chuẩn VietGAP')}
            </span>

            {/* Quy mô tối thiểu MOQ */}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
              <Scale className="w-3 h-3 text-blue-600" />
              MOQ: {moqText}
            </span>

            {/* Quy cách sỉ */}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-stone-100 text-[#44403C] border border-stone-200">
              <Package className="w-3 h-3 text-stone-500" />
              Quy cách: {product.wholesaleUnit || 'Tấn / Tạ'}
            </span>

            {/* Bảo quản lạnh */}
            {product.storageCondition && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200">
                ❄️ {product.storageCondition}
              </span>
            )}
          </div>
        </div>

        {/* Hàng 4: Thanh tiến độ sản lượng lô */}
        <div className="p-3 bg-[#F9FBF8] rounded-xl border border-[#EAECE8] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#2C3E2E]">
            <span className="flex items-center gap-1">
              <span className="text-[#6B7280] font-normal">Tổng lô vụ này:</span> {totalLotTons} Tấn
            </span>
            <span className="text-[#10542C]">
              <span className="text-[#6B7280] font-normal">Còn sẵn sàng xuất:</span> {availableTons} Tấn
            </span>
          </div>

          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#4CAF50] to-[#10542C] h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(12, soldPercent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>Đã cọc bao tiêu: <strong className="text-[#FB8C00] font-bold">{soldPercent}%</strong></span>
            <span className="flex items-center gap-1 text-[#2C3E2E]">
              <Calendar className="w-3 h-3 text-[#10542C]" />
              Thu hoạch: {product.harvestDate || 'Trong vụ mùa này'}
            </span>
          </div>
        </div>
      </div>

      {/* CỘT 3: Bảng giá sỉ & Cụm nút hành động B2B */}
      <div className="w-full md:w-64 lg:w-72 bg-[#FAFBF9] p-4 sm:p-5 border-t md:border-t-0 md:border-l border-[#EAECE8] flex flex-col justify-between shrink-0 space-y-3">
        <div>
          <span className="text-[11px] text-[#6B7280] block font-medium">Giá sỉ xuất vườn:</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-heading text-2xl font-black text-[#10542C]">
              {formatVND(product.price)}
            </span>
            <span className="text-xs text-[#6B7280] font-semibold">/ kg</span>
          </div>

          {/* Bảng giá sỉ theo bậc số lượng */}
          {product.tieredPricing && product.tieredPricing.length > 1 ? (
            <div className="mt-2.5 p-2.5 bg-white rounded-xl border border-[#EAECE8] space-y-1 text-[11px]">
              <span className="text-[10px] text-[#6B7280] block font-bold uppercase tracking-wider">
                Bảng giá phân tầng:
              </span>
              {product.tieredPricing.slice(0, 2).map((tier, idx) => (
                <div key={idx} className="flex justify-between items-center text-[#2C3E2E]">
                  <span>≥ {tier.minQuantity} kg:</span>
                  <strong className="text-[#10542C]">{formatVND(tier.unitPrice)}/kg</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-[#6B7280] italic">
              Bao tiêu xuất vườn, hỗ trợ xe lạnh chuyên dụng
            </div>
          )}
        </div>

        {/* 2 Nút hành động B2B chính */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onNegotiate) onNegotiate(product);
              else if (onViewDetail) onViewDetail(product);
            }}
            className="w-full py-2.5 bg-white hover:bg-[#F0F5F1] text-[#10542C] border border-[#10542C] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Đàm phán giá sỉ trực tiếp với HTX"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Đàm phán giá sỉ (RFQ)</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onNegotiate) onNegotiate(product);
              else if (onViewDetail) onViewDetail(product);
            }}
            className="w-full py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            title="Đàm phán hoặc đặt cọc giữ lô hàng"
          >
            <Package className="w-3.5 h-3.5 text-[#8BC34A]" />
            <span>Liên hệ đặt cọc lô ({moqText})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

