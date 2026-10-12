'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import {
  X,
  Plus,
  Minus,
  ShoppingCart,
  Zap,
  Leaf,
  ShieldCheck,
  Star,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'origin' | 'nutrition' | 'reviews'>('origin');

  if (!isOpen || !product) return null;

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const thumbnails = [
    product.imageUrl,
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600&auto=format&fit=crop&q=80',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl z-10 max-h-[92vh] overflow-y-auto border border-[#EAECE8]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#758A7A] hover:text-[#2C3E2E] rounded-full hover:bg-[#F4F5F1] transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Khối Trên (50:50 Above the fold) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-8">
          {/* Cột trái: Thư viện ảnh */}
          <div className="md:col-span-6 space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#F9F9F5] border border-[#EAECE8]">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                {product.isOrganic && (
                  <span className="inline-flex items-center gap-1 bg-[#10542C] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    <Leaf className="w-3.5 h-3.5 text-[#8BC34A]" /> Hữu cơ 100%
                  </span>
                )}
                <span className="inline-flex items-center gap-1 bg-[#8BC34A] text-[#10542C] text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                  <ShieldCheck className="w-3 h-3" /> VietGAP
                </span>
              </div>
              {discountPercent && (
                <span className="absolute top-3 right-3 bg-[#E53935] text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow-sm">
                  -{discountPercent}%
                </span>
              )}
            </div>

            {/* Dãy thumbnail trượt ngang */}
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {thumbnails.map((img, idx) => (
                <div
                  key={idx}
                  className="w-16 h-16 rounded-xl overflow-hidden border-2 border-[#10542C]/20 hover:border-[#10542C] shrink-0 cursor-pointer"
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Cột phải: Thông tin mua hàng */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-bold text-[#4CAF50] uppercase tracking-wider block">
                {product.categoryName || 'Nông sản hữu cơ'}
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E2E] mt-1 leading-tight">
                {product.name}
              </h1>

              {/* Đánh giá sao */}
              <div className="flex items-center gap-2 mt-2 text-xs">
                <div className="flex items-center text-[#FB8C00]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#FB8C00]" />
                  ))}
                </div>
                <span className="font-bold text-[#2C3E2E]">5.0</span>
                <span className="text-[#758A7A]">• Đã bán 248 phần</span>
              </div>
            </div>

            {/* Giá & quy cách */}
            <div className="p-4 bg-[#F9F9F5] rounded-xl border border-[#EAECE8] space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-2xl font-black text-[#10542C]">
                  {formatVND(product.price)}
                </span>
                <span className="text-xs font-bold text-[#758A7A]">
                  / {product.unit || '500g'}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-[#758A7A] line-through ml-2">
                    {formatVND(product.originalPrice)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#758A7A] leading-relaxed">
                {product.description || 'Rau củ được thu hoạch vào 4h sáng tại nông trại Đà Lạt & Mộc Châu, chuẩn bị và giao tươi trong 2 giờ.'}
              </p>
            </div>

            {/* Bộ tăng giảm số lượng */}
            <div className="flex items-center gap-4 pt-1">
              <span className="text-xs font-bold text-[#2C3E2E]">Số lượng:</span>
              <div className="flex items-center border border-[#EAECE8] bg-[#F9F9F5] rounded-xl px-2 py-1 gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1 text-[#758A7A] hover:text-[#10542C] cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-heading text-sm font-black text-[#2C3E2E] w-6 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-1 text-[#758A7A] hover:text-[#10542C] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs text-[#758A7A]">
                Tồn kho: <strong className="text-[#10542C]">{product.stockQuantity || 50}</strong> sản phẩm
              </span>
            </div>

            {/* Nhóm CTA (RuleLayout C.2) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onAddToCart(product, quantity);
                  onClose();
                }}
                className="py-3 px-4 rounded-xl border-2 border-[#10542C] text-[#10542C] hover:bg-[#10542C] hover:text-white font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Thêm vào giỏ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onBuyNow(product, quantity);
                  onClose();
                }}
                className="py-3 px-4 rounded-xl bg-[#FB8C00] hover:bg-[#E67E00] text-white font-heading font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#FB8C00]/25 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Mua ngay</span>
              </button>
            </div>
          </div>
        </div>

        {/* Khối Dưới (Tab thông tin minh bạch) */}
        <div className="border-t border-[#EAECE8] pt-6">
          <div className="flex border-b border-[#EAECE8] gap-6 text-sm mb-4">
            <button
              onClick={() => setActiveTab('origin')}
              className={`pb-2.5 font-heading font-bold transition-all cursor-pointer border-b-2 ${
                activeTab === 'origin'
                  ? 'border-[#10542C] text-[#10542C]'
                  : 'border-transparent text-[#758A7A] hover:text-[#2C3E2E]'
              }`}
            >
              Nguồn Gốc & Thu Hoạch
            </button>
            <button
              onClick={() => setActiveTab('nutrition')}
              className={`pb-2.5 font-heading font-bold transition-all cursor-pointer border-b-2 ${
                activeTab === 'nutrition'
                  ? 'border-[#10542C] text-[#10542C]'
                  : 'border-transparent text-[#758A7A] hover:text-[#2C3E2E]'
              }`}
            >
              Giá Trị Dinh Dưỡng
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-2.5 font-heading font-bold transition-all cursor-pointer border-b-2 ${
                activeTab === 'reviews'
                  ? 'border-[#10542C] text-[#10542C]'
                  : 'border-transparent text-[#758A7A] hover:text-[#2C3E2E]'
              }`}
            >
              Đánh Giá & Nhận Xét (18)
            </button>
          </div>

          {/* Tab 1: Nguồn gốc */}
          {activeTab === 'origin' && (
            <div className="space-y-3 text-xs text-[#2C3E2E] leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F9F9F5] p-4 rounded-xl border border-[#EAECE8]">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#4CAF50] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Nông trại xuất xứ:</span>
                    <span>{product.origin || 'Nông trại liên kết HoNa Fresh (Đà Lạt, Lâm Đồng)'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-[#4CAF50] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Thời gian thu hoạch:</span>
                    <span>Hái lúc 4:00 sáng hôm nay, đóng gói ngay sau khi phân loại</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#4CAF50] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Hạn sử dụng khuyên dùng:</span>
                    <span>3 - 5 ngày khi bảo quản ngăn mát tủ lạnh (4°C - 8°C)</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#4CAF50] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Chứng nhận chất lượng:</span>
                    <span>VietGAP No. 2489/VG & Chứng nhận Hữu cơ Nông nghiệp</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Dinh dưỡng */}
          {activeTab === 'nutrition' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 bg-[#F9F9F5] rounded-xl border border-[#EAECE8]">
                <span className="text-[#758A7A] block">Năng lượng</span>
                <span className="font-heading font-black text-[#10542C] text-base">25 kcal</span>
                <span className="text-[10px] text-[#758A7A]">/ 100g</span>
              </div>
              <div className="p-3 bg-[#F9F9F5] rounded-xl border border-[#EAECE8]">
                <span className="text-[#758A7A] block">Chất xơ</span>
                <span className="font-heading font-black text-[#10542C] text-base">2.8 g</span>
                <span className="text-[10px] text-[#758A7A]">tốt cho tiêu hóa</span>
              </div>
              <div className="p-3 bg-[#F9F9F5] rounded-xl border border-[#EAECE8]">
                <span className="text-[#758A7A] block">Vitamin C</span>
                <span className="font-heading font-black text-[#10542C] text-base">45 mg</span>
                <span className="text-[10px] text-[#758A7A]">tăng đề kháng</span>
              </div>
              <div className="p-3 bg-[#F9F9F5] rounded-xl border border-[#EAECE8]">
                <span className="text-[#758A7A] block">Khoáng chất</span>
                <span className="font-heading font-black text-[#10542C] text-base">K, Fe, Ca</span>
                <span className="text-[10px] text-[#758A7A]">giàu vi chất</span>
              </div>
            </div>
          )}

          {/* Tab 3: Đánh giá */}
          {activeTab === 'reviews' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-[#F9F9F5] rounded-xl border border-[#EAECE8] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2C3E2E]">Chị Mai Anh</span>
                    <span className="inline-flex items-center gap-1 text-[10px] bg-[#4CAF50]/15 text-[#10542C] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-[#4CAF50]" /> Đã mua hàng thành công
                    </span>
                  </div>
                  <span className="text-[#758A7A] text-[11px]">Hôm qua</span>
                </div>
                <div className="flex text-[#FB8C00]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-[#FB8C00]" />
                  ))}
                </div>
                <p className="text-xs text-[#2C3E2E]">
                  Rau rất tươi giòn, còn đọng sương, đóng gói sạch sẽ cẩn thận. Giao đến nhanh chưa đầy 1 tiếng rưỡi. Sẽ ủng hộ shop lâu dài!
                </p>
              </div>

              <div className="p-3.5 bg-[#F9F9F5] rounded-xl border border-[#EAECE8] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2C3E2E]">Anh Hoàng Long</span>
                    <span className="inline-flex items-center gap-1 text-[10px] bg-[#4CAF50]/15 text-[#10542C] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-[#4CAF50]" /> Đã mua hàng thành công
                    </span>
                  </div>
                  <span className="text-[#758A7A] text-[11px]">2 ngày trước</span>
                </div>
                <div className="flex text-[#FB8C00]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-[#FB8C00]" />
                  ))}
                </div>
                <p className="text-xs text-[#2C3E2E]">
                  Đúng chuẩn rau sạch hữu cơ, nấu canh ngọt nước tự nhiên. Cả nhà mình đều khen.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
