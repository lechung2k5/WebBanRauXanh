'use client';

import React from 'react';
import { Product } from '@/types';
import { ShoppingCart, Leaf, MapPin, Sparkles, ShieldCheck } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onViewDetail?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onViewDetail,
}) => {
  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-[#F0F0F0] card-soft-shadow transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl hover:border-[#10542C]/20">
      {/* 1:1 Ratio Product Image & Origin Badges */}
      <div
        onClick={() => onViewDetail && onViewDetail(product)}
        className="relative aspect-square w-full overflow-hidden bg-[#F9F9F5] cursor-pointer"
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 ease-out"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('unsplash')) {
              target.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
            }
          }}
        />

        {/* Top Badges (RuleLayout B.4: Tag xanh lá "VietGAP"/"Organic" hoặc đỏ "-20%") */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
          {product.isOrganic ? (
            <span className="inline-flex items-center gap-1 bg-[#10542C] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
              <Leaf className="w-2.5 h-2.5 text-[#8BC34A]" /> Organic
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-[#4CAF50] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              <ShieldCheck className="w-2.5 h-2.5" /> VietGAP
            </span>
          )}
        </div>

        {/* Discount Badge */}
        {discountPercent && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="bg-[#E53935] text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs">
              -{discountPercent}%
            </span>
          </div>
        )}

        {/* Farm Origin Pill */}
        {product.origin && (
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-white/95 backdrop-blur-xs text-[#5D4037] text-[10px] font-medium px-2 py-0.5 rounded-full shadow-xs border border-[#EAECE8]">
            <MapPin className="w-2.5 h-2.5 text-[#4CAF50]" />
            <span className="truncate max-w-[120px]">{product.origin}</span>
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
        <div
          onClick={() => onViewDetail && onViewDetail(product)}
          className="cursor-pointer"
        >
          <span className="text-[10px] font-bold text-[#4CAF50] uppercase tracking-wider block mb-0.5">
            {product.categoryName || 'Nông sản sạch'}
          </span>
          <h3 className="font-heading text-sm sm:text-base font-bold text-[#2C3E2E] line-clamp-2 leading-snug group-hover:text-[#10542C] transition-colors">
            {product.name}
          </h3>
          <span className="text-[11px] text-[#6B7280] font-medium block mt-1">
            Quy cách: {product.unit || '500g / túi'}
          </span>
        </div>

        {/* Pricing & Secondary Action Button (RuleLayout B.4: Nút "Thêm vào giỏ" màu Carrot Orange #FB8C00, bo tròn rounded-full) */}
        <div className="pt-2.5 border-t border-[#F0F0F0] flex items-center justify-between gap-2">
          <div>
            <div className="font-heading text-base font-black text-[#10542C]">
              {formatVND(product.price)}
            </div>
            {product.originalPrice && product.originalPrice > product.price && (
              <div className="text-[11px] text-[#6B7280] line-through">
                {formatVND(product.originalPrice)}
              </div>
            )}
          </div>

          {/* Quick Add to Cart Button (Carrot Orange #FB8C00 rounded-full) */}
          <button
            onClick={() => onAddToCart(product)}
            className="px-3.5 py-2 bg-[#FB8C00] hover:bg-[#E67E00] text-white rounded-full text-xs font-bold transition-all shadow-xs hover:shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Thêm vào giỏ hàng"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="text-[11px]">Thêm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
