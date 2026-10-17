/**
 * Service đề xuất sản phẩm cá nhân hóa & Theo dõi hành vi người dùng (ML Recommendation Engine)
 * Sẵn sàng kết nối với Backend Machine Learning / AI model qua cấu trúc UserMLProfile & UserInteractionEvent
 */

import { Product } from '@/types';

export type RecommendationFilter = 'ml' | 'organic' | 'top_rated' | 'best_deal';

export interface UserInteractionEvent {
  type: 'VIEW_PRODUCT' | 'ADD_TO_CART' | 'SEARCH' | 'FILTER_CATEGORY' | 'FAVORITE';
  productId?: string | number;
  productSlug?: string;
  categorySlug?: string;
  categoryId?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface UserMLProfile {
  userId: string;
  recentlyViewed: { id: string | number; slug: string; timestamp: number }[];
  categoryAffinity: Record<string, number>; // Điểm quan tâm theo category: rau-sach, cu, nam-tuoi
  interactionHistory: UserInteractionEvent[];
}

const STORAGE_KEY = 'hona_user_ml_profile';

/**
 * Lấy hồ sơ sở thích người dùng từ LocalStorage
 */
export function getUserMLProfile(): UserMLProfile {
  if (typeof window === 'undefined') {
    return {
      userId: 'guest-session',
      recentlyViewed: [],
      categoryAffinity: {},
      interactionHistory: [],
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Lỗi đọc UserMLProfile từ storage:', e);
  }

  // Khởi tạo profile mặc định
  const newProfile: UserMLProfile = {
    userId: `user-${Math.random().toString(36).substring(2, 9)}`,
    recentlyViewed: [],
    categoryAffinity: {
      'rau-sach': 1,
      'cu': 1,
      'nam-tuoi': 1,
    },
    interactionHistory: [],
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
  } catch {}

  return newProfile;
}

/**
 * Lưu hồ sơ người dùng
 */
export function saveUserMLProfile(profile: UserMLProfile): void {
  if (typeof window === 'undefined') return;
  try {
    // Giữ tối đa 50 sự kiện gần nhất để tiết kiệm bộ nhớ
    if (profile.interactionHistory.length > 50) {
      profile.interactionHistory = profile.interactionHistory.slice(-50);
    }
    if (profile.recentlyViewed.length > 20) {
      profile.recentlyViewed = profile.recentlyViewed.slice(0, 20);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Lỗi lưu UserMLProfile:', e);
  }
}

/**
 * Ghi nhận hành vi: Xem chi tiết sản phẩm
 */
export function trackProductView(product: Product): void {
  const profile = getUserMLProfile();
  const now = Date.now();

  // 1. Thêm vào danh sách vừa xem (đưa lên đầu)
  profile.recentlyViewed = [
    { id: product.id, slug: product.slug, timestamp: now },
    ...profile.recentlyViewed.filter((item) => String(item.id) !== String(product.id)),
  ];

  // 2. Tăng điểm quan tâm category (+2 điểm khi xem chi tiết)
  const cat = product.categorySlug || 'rau-sach';
  profile.categoryAffinity[cat] = (profile.categoryAffinity[cat] || 0) + 2;

  // 3. Ghi log sự kiện (Event Logging cho ML)
  profile.interactionHistory.push({
    type: 'VIEW_PRODUCT',
    productId: product.id,
    productSlug: product.slug,
    categorySlug: product.categorySlug,
    categoryId: product.categoryId,
    timestamp: now,
  });

  saveUserMLProfile(profile);
}

/**
 * Ghi nhận hành vi: Thêm vào giỏ hàng
 */
export function trackAddToCart(product: Product): void {
  const profile = getUserMLProfile();
  const now = Date.now();

  // Tăng mạnh điểm quan tâm category (+5 điểm khi add to cart)
  const cat = product.categorySlug || 'rau-sach';
  profile.categoryAffinity[cat] = (profile.categoryAffinity[cat] || 0) + 5;

  profile.interactionHistory.push({
    type: 'ADD_TO_CART',
    productId: product.id,
    productSlug: product.slug,
    categorySlug: product.categorySlug,
    categoryId: product.categoryId,
    timestamp: now,
  });

  saveUserMLProfile(profile);
}

export interface RecommendedItem {
  product: Product;
  matchScore: number;
  reason: string;
}

/**
 * Thuật toán Scoring đề xuất cá nhân hóa (Collaborative & Content-based ML Simulation)
 */
export function getPersonalizedRecommendations(
  allProducts: Product[],
  limit: number = 6,
  filter: RecommendationFilter = 'ml'
): RecommendedItem[] {
  if (!allProducts || allProducts.length === 0) return [];

  const profile = getUserMLProfile();
  const affinity = profile.categoryAffinity;
  const recentIds = new Set(profile.recentlyViewed.map((r) => String(r.id)));

  // Tìm category được người dùng quan tâm nhiều nhất
  let topCategory = 'rau-sach';
  let maxAffinity = 0;
  for (const [cat, score] of Object.entries(affinity)) {
    if (score > maxAffinity) {
      maxAffinity = score;
      topCategory = cat;
    }
  }

  const scoredProducts: RecommendedItem[] = allProducts.map((p) => {
    let score = 50;
    let reason = 'Được nhiều khách hàng yêu thích';

    const catSlug = p.categorySlug || '';
    const catScore = affinity[catSlug] || 0;

    // 1. Phù hợp theo danh mục hay xem/thêm giỏ hàng
    if (catScore > 2) {
      score += Math.min(catScore * 4, 30);
      if (catSlug === 'nam-tuoi') {
        reason = 'Dựa trên sở thích nấm tươi giàu dinh dưỡng';
      } else if (catSlug === 'cu') {
        reason = 'Phù hợp với món củ quả bạn hay tìm';
      } else {
        reason = 'Hợp khẩu vị rau xanh tươi bạn đã xem';
      }
    }

    // 2. Điểm đánh giá (Rating)
    if (p.rating) {
      score += (p.rating - 4.5) * 20;
    }

    // 3. Khuyến mãi & Giảm giá
    if (p.discountPercent && p.discountPercent > 0) {
      score += p.discountPercent * 0.4;
      if (filter === 'best_deal') {
        reason = `Đang giảm ${p.discountPercent}% - Ưu đãi tốt`;
      }
    }

    // 4. Chứng nhận Organic
    if (p.isOrganic) {
      score += 15;
      if (filter === 'organic') {
        reason = 'Nông sản hữu cơ đạt chuẩn quốc tế';
      }
    }

    // Tùy chỉnh theo filter tab
    if (filter === 'top_rated') {
      score = (p.rating || 4.5) * 20 + (p.reviewCount || 10) * 0.1;
      reason = `Đánh giá ${p.rating || 5}⭐ (${p.reviewCount || 50}+ nhận xét)`;
    } else if (filter === 'best_deal') {
      score = (p.discountPercent || 0) * 3 + (p.price < 30000 ? 20 : 0);
    } else if (filter === 'organic') {
      score = p.isOrganic ? 100 : 0;
    }

    // Không lặp lại sản phẩm vừa xem nếu có đủ sản phẩm khác
    if (recentIds.has(String(p.id)) && filter === 'ml') {
      score += 5; // Vừa xem xong thì gợi ý lại một phần
    }

    const matchPercent = Math.min(99, Math.max(78, Math.round(score)));

    return {
      product: p,
      matchScore: matchPercent,
      reason,
    };
  });

  // Sắp xếp theo điểm đề xuất cao nhất
  scoredProducts.sort((a, b) => b.matchScore - a.matchScore);

  return scoredProducts.slice(0, limit);
}
