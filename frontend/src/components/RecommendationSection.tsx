'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Flame, Award, Tag, Leaf, Brain } from 'lucide-react';
import { Product } from '@/types';
import {
  getPersonalizedRecommendations,
  RecommendedItem,
  RecommendationFilter,
  getUserMLProfile,
} from '@/services/recommendationService';
import { ProductCard } from './ProductCard';

interface RecommendationSectionProps {
  products: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onViewDetail: (product: Product) => void;
  className?: string;
}

export default function RecommendationSection({
  products,
  onAddToCart,
  onViewDetail,
  className = '',
}: RecommendationSectionProps) {
  const [activeFilter, setActiveFilter] = useState<RecommendationFilter>('ml');
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Load recommendations
  useEffect(() => {
    if (!products || products.length === 0) return;

    const profile = getUserMLProfile();
    if (profile.recentlyViewed.length > 0 || profile.interactionHistory.length > 0) {
      setHasInteracted(true);
    }

    const items = getPersonalizedRecommendations(products, 6, activeFilter);
    setRecommendations(items);
  }, [products, activeFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Shuffle slightly or re-score
      const shuffled = [...products].sort(() => Math.random() - 0.5);
      const items = getPersonalizedRecommendations(shuffled, 6, activeFilter);
      setRecommendations(items);
      setIsRefreshing(false);
    }, 400);
  };

  if (!products || products.length === 0 || recommendations.length === 0) {
    return null;
  }

  return (
    <section className={`bg-gradient-to-b from-[#F0F7F2] via-white to-white rounded-3xl border border-[#D7EED6] p-5 sm:p-7 shadow-xs space-y-5 ${className}`}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E1EFE3]">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10542C]/10 text-[#10542C] text-[11px] font-bold border border-[#10542C]/15">
            <Sparkles className="w-3.5 h-3.5 text-[#4CAF50] animate-pulse" />
            <span>AI Personalization & Machine Learning</span>
            {hasInteracted && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]" />
            )}
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-black text-[#10542C] flex items-center gap-2">
            Gợi Ý Dành Riêng Cho Bạn
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280]">
            {hasInteracted
              ? 'Đã tinh chỉnh theo lịch sử xem & khẩu vị nông sản tươi ngon bạn quan tâm'
              : 'Nông sản VietGAP & Hữu cơ tươi mới nhất trong ngày được tuyển chọn cho bạn'}
          </p>
        </div>

        {/* Nút Làm mới gợi ý */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#D7EED6] hover:bg-[#F4F5F1] text-xs font-bold text-[#10542C] flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4CAF50] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Đổi gợi ý</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'ml' as RecommendationFilter, label: 'Gợi ý cá nhân hóa', icon: Brain },
          { id: 'organic' as RecommendationFilter, label: 'Nông sản Hữu cơ', icon: Leaf },
          { id: 'top_rated' as RecommendationFilter, label: 'Đánh giá 5 sao', icon: Award },
          { id: 'best_deal' as RecommendationFilter, label: 'Khuyến mãi tốt', icon: Tag },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#10542C] text-white shadow-xs scale-102 ring-2 ring-[#10542C]/20'
                  : 'bg-white border border-[#EAECE8] text-[#556958] hover:bg-[#F9F9F5] hover:text-[#10542C]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#8BC34A]' : 'text-[#6B7280]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Danh sách lô hàng gợi ý: 1 hàng 1 card chiều ngang to ra */}
      <div className="flex flex-col gap-4 pt-1">
        {recommendations.slice(0, 3).map(({ product, matchScore, reason }) => (
          <div key={product.id} className="relative flex flex-col justify-between group space-y-1">
            {/* Tag lý do đề xuất AI */}
            <div className="flex items-center gap-2 text-xs font-bold px-1">
              <span className="inline-flex items-center gap-1 text-[#10542C] bg-white px-2.5 py-1 rounded-lg border border-[#D7EED6] shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#4CAF50]" />
                {matchScore}% phù hợp nhu cầu thu mua
              </span>
              <span className="text-xs text-[#6B7280] font-normal">
                {reason}
              </span>
            </div>

            <ProductCard
              product={product}
              onAddToCart={(p: Product) => onAddToCart(p, p.moq || 1)}
              onViewDetail={(p: Product) => onViewDetail(p)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
