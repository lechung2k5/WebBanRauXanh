/**
 * agriPricingHelper.ts
 * Tiện ích quản lý Giá Cơ Sở, Phân loại Nông Sản theo đặc thù trọng lượng,
 * Bảng 3 nấc chiết khấu sỉ (3-Tier Pricing) và Cố vấn thu mua lời nhất cho Thương Lái (Buyer).
 */

export type AgriCategoryType = 'LEAFY_GREEN' | 'ROOT_TUBER' | 'FRUIT_VEG' | 'MUSHROOM_HERB' | 'GENERAL';

export interface AgriCategoryConfig {
  type: AgriCategoryType;
  label: string;
  badgeColor: string;
  description: string;
  // Ngưỡng khối lượng tiêu chuẩn (kg) cho 3 nấc sỉ
  tier1MinKg: number; // Mức 1: Định mức sỉ tối thiểu (MOQ)
  tier2MinKg: number; // Mức 2: Sỉ tầm trung
  tier3MinKg: number; // Mức 3: Sỉ quy mô lớn (Mua lời nhất)
  // Tỷ lệ % chiết khấu (Sale) so với Giá Cơ Sở
  tier1DiscountPercent: number; // Thường là 0% (Giá cơ sở chuẩn)
  tier2DiscountPercent: number; // Giảm từ 6% - 8%
  tier3DiscountPercent: number; // Giảm từ 12% - 15% (Lời nhất)
  minLotPercentage: number;     // % tối thiểu của sản lượng lô hàng
  quickQuantities: number[];    // Các nút chọn nhanh số lượng phù hợp
}

export const AGRI_CATEGORY_CONFIGS: Record<AgriCategoryType, AgriCategoryConfig> = {
  // 1. RAU ĂN LÁ: Cồng kềnh, nhẹ, mau dập -> 50kg đã là khối lượng sỉ rất lớn!
  LEAFY_GREEN: {
    type: 'LEAFY_GREEN',
    label: 'Rau Ăn Lá',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Rau nhẹ, cồng kềnh, tươi mát (50kg đã là số lượng sỉ lớn)',
    tier1MinKg: 50,
    tier2MinKg: 100,
    tier3MinKg: 250,
    tier1DiscountPercent: 0,
    tier2DiscountPercent: 6,
    tier3DiscountPercent: 12,
    minLotPercentage: 5,
    quickQuantities: [50, 100, 200, 250, 500],
  },

  // 2. CỦ QUẢ NẶNG: Nặng, bảo quản lâu -> 50kg là rất nhỏ, sỉ phải từ hàng trăm kg đến cả tấn!
  ROOT_TUBER: {
    type: 'ROOT_TUBER',
    label: 'Củ & Nông Sản Nặng',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Nông sản củ nặng, chắc thịt (50kg là nhỏ, sỉ chuẩn từ 300kg - vài tấn)',
    tier1MinKg: 300,
    tier2MinKg: 800,
    tier3MinKg: 2000,
    tier1DiscountPercent: 0,
    tier2DiscountPercent: 7,
    tier3DiscountPercent: 15,
    minLotPercentage: 5,
    quickQuantities: [300, 500, 800, 1000, 2000, 5000],
  },

  // 3. RAU ĂN QUẢ & TRÁI CÂY TƯƠI: Mức trung bình
  FRUIT_VEG: {
    type: 'FRUIT_VEG',
    label: 'Rau Ăn Quả & Trái Cây',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Quả tươi Đà Lạt (Cà chua, ớt chuông, dâu tây, bơ...)',
    tier1MinKg: 100,
    tier2MinKg: 300,
    tier3MinKg: 800,
    tier1DiscountPercent: 0,
    tier2DiscountPercent: 6,
    tier3DiscountPercent: 13,
    minLotPercentage: 5,
    quickQuantities: [100, 200, 300, 500, 800, 1500],
  },

  // 4. NẤM TƯƠI & THẢO MỘC CAO CẤP: Giá trị cao, sản lượng thu hoạch ít -> 15-20kg là chuẩn sỉ
  MUSHROOM_HERB: {
    type: 'MUSHROOM_HERB',
    label: 'Nấm & Thảo Mộc',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Nấm hữu cơ và thảo mộc cao cấp (Sỉ đóng thùng từ 20kg)',
    tier1MinKg: 20,
    tier2MinKg: 50,
    tier3MinKg: 100,
    tier1DiscountPercent: 0,
    tier2DiscountPercent: 5,
    tier3DiscountPercent: 12,
    minLotPercentage: 5,
    quickQuantities: [20, 50, 100, 200],
  },

  // 5. NÔNG SẢN TỔNG HỢP / CHUNG
  GENERAL: {
    type: 'GENERAL',
    label: 'Nông Sản Tiêu Chuẩn',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Nông sản an toàn xuất vườn',
    tier1MinKg: 100,
    tier2MinKg: 300,
    tier3MinKg: 1000,
    tier1DiscountPercent: 0,
    tier2DiscountPercent: 6,
    tier3DiscountPercent: 12,
    minLotPercentage: 5,
    quickQuantities: [100, 300, 500, 1000, 2000],
  },
};

/**
 * Nhận diện nhóm nông sản dựa vào tên hoặc danh mục
 */
export function detectAgriCategory(nameOrCategory?: string, categorySlug?: string): AgriCategoryConfig {
  const text = `${nameOrCategory || ''} ${categorySlug || ''}`.toLowerCase();

  // Nhóm Nấm & Gia vị thảo mộc
  if (
    text.includes('nấm') ||
    text.includes('nam_tuoi') ||
    text.includes('gia vị') ||
    text.includes('thảo mộc') ||
    text.includes('hành lá') ||
    text.includes('ngò') ||
    text.includes('húng') ||
    text.includes('rau_gia_vi')
  ) {
    return AGRI_CATEGORY_CONFIGS.MUSHROOM_HERB;
  }

  // Nhóm Củ & Nông sản nặng (khoai tây, cà rốt, củ dền, củ cải, khoai lang, bí đỏ, gừng, tỏi...)
  if (
    text.includes('củ') ||
    text.includes('cu_qua') ||
    text.includes('khoai') ||
    text.includes('cà rốt') ||
    text.includes('bí đỏ') ||
    text.includes('gừng') ||
    text.includes('tỏi') ||
    text.includes('hành tây') ||
    text.includes('bắp ngô')
  ) {
    return AGRI_CATEGORY_CONFIGS.ROOT_TUBER;
  }

  // Nhóm Rau ăn lá (cải, xà lách, rau muống, rau dền, ngót, mồng tơi, bó xôi...)
  if (
    text.includes('rau') ||
    text.includes('cải') ||
    text.includes('xà lách') ||
    text.includes('muống') ||
    text.includes('dền') ||
    text.includes('ngót') ||
    text.includes('mồng tơi') ||
    text.includes('bó xôi') ||
    text.includes('bắp cải') ||
    text.includes('rau_an_la') ||
    text.includes('leaf')
  ) {
    return AGRI_CATEGORY_CONFIGS.LEAFY_GREEN;
  }

  // Nhóm Rau ăn quả & Trái cây (cà chua, dưa leo, ớt chuông, dâu tây, bơ...)
  if (
    text.includes('cà chua') ||
    text.includes('dưa leo') ||
    text.includes('dưa leo') ||
    text.includes('ớt chuông') ||
    text.includes('dâu') ||
    text.includes('bơ') ||
    text.includes('trái') ||
    text.includes('quả')
  ) {
    return AGRI_CATEGORY_CONFIGS.FRUIT_VEG;
  }

  return AGRI_CATEGORY_CONFIGS.GENERAL;
}

export interface PricingTierItem {
  tierIndex: 1 | 2 | 3;
  name: string;
  minKg: number;
  pricePerKg: number;
  discountPercent: number;
  savingsPerKg: number;
  isBestValue: boolean;
  tagline: string;
}

/**
 * Tính toán 3 Mức Giá Sỉ (3-Tier Pricing) theo Giá Cơ Sở và Loại Sản Phẩm
 */
export function calculate3TierPricing(
  basePricePerKg: number,
  categoryConfig: AgriCategoryConfig,
  totalLotVolume?: number
): PricingTierItem[] {
  const base = Math.max(1000, Number(basePricePerKg) || 15000);
  const lotVol = totalLotVolume && totalLotVolume > 0 ? totalLotVolume : 10000;

  // Điều chỉnh minKg nếu lô hàng nhỏ hơn mức 3
  const t1Min = categoryConfig.tier1MinKg;
  let t2Min = categoryConfig.tier2MinKg;
  let t3Min = categoryConfig.tier3MinKg;

  if (lotVol < t3Min * 1.2) {
    t3Min = Math.max(t1Min * 2, Math.round((lotVol * 0.6) / 50) * 50);
    t2Min = Math.max(t1Min, Math.round((lotVol * 0.3) / 50) * 50);
  }

  // Làm tròn giá theo đơn vị 100đ
  const round100 = (val: number) => Math.round(val / 100) * 100;

  const t1Price = base;
  const t2Price = round100(base * (1 - categoryConfig.tier2DiscountPercent / 100));
  const t3Price = round100(base * (1 - categoryConfig.tier3DiscountPercent / 100));

  return [
    {
      tierIndex: 1,
      name: 'Mức 1: Tiêu Chuẩn',
      minKg: t1Min,
      pricePerKg: t1Price,
      discountPercent: categoryConfig.tier1DiscountPercent,
      savingsPerKg: 0,
      isBestValue: false,
      tagline: 'Giá cơ sở xuất vườn',
    },
    {
      tierIndex: 2,
      name: 'Mức 2: Sỉ Tầm Trung',
      minKg: t2Min,
      pricePerKg: t2Price,
      discountPercent: categoryConfig.tier2DiscountPercent,
      savingsPerKg: base - t2Price,
      isBestValue: false,
      tagline: `Tiết kiệm ${categoryConfig.tier2DiscountPercent}%`,
    },
    {
      tierIndex: 3,
      name: 'Mức 3: Đại Lý / Mua Lời Nhất',
      minKg: t3Min,
      pricePerKg: t3Price,
      discountPercent: categoryConfig.tier3DiscountPercent,
      savingsPerKg: base - t3Price,
      isBestValue: true,
      tagline: `🏆 Giảm sâu ${categoryConfig.tier3DiscountPercent}% (Rẻ nhất)`,
    },
  ];
}

export interface BuyerAdvisoryResult {
  currentTier: PricingTierItem;
  appliedPricePerKg: number;
  effectiveDiscountPercent: number;
  totalCost: number;
  totalSavingsComparedToBase: number;
  percentageOfLot: number;
  isBestTier: boolean;
  nextTier: PricingTierItem | null;
  kgNeededForNextTier: number;
  extraSavingsPerKgNextTier: number;
  smartAdviceHeadline: string;
  smartAdviceDetail: string;
  recommendedBestQty: number;
  isValidMinimum: boolean;
  isValidMaximum: boolean;
  validationError?: string;
}

/**
 * Phân tích và tạo Khuyến Nghị Cố Vấn Thu Mua Thông Minh (Buyer Advisory)
 */
export function analyzeBuyerPurchaseStrategy(
  quantityKg: number,
  basePricePerKg: number,
  categoryConfig: AgriCategoryConfig,
  totalAvailableLotVolume?: number
): BuyerAdvisoryResult {
  const qty = Number(quantityKg) || 0;
  const base = Math.max(1000, Number(basePricePerKg) || 15000);
  const lotVolume = totalAvailableLotVolume && totalAvailableLotVolume > 0 ? totalAvailableLotVolume : 10000;
  const tiers = calculate3TierPricing(base, categoryConfig, lotVolume);

  // Xác định bậc hiện tại
  let currentTier = tiers[0];
  if (qty >= tiers[2].minKg) {
    currentTier = tiers[2];
  } else if (qty >= tiers[1].minKg) {
    currentTier = tiers[1];
  }

  const appliedPricePerKg = currentTier.pricePerKg;
  const effectiveDiscountPercent = currentTier.discountPercent;
  const totalCost = qty * appliedPricePerKg;
  const baseTotalCost = qty * base;
  const totalSavingsComparedToBase = Math.max(0, baseTotalCost - totalCost);
  const percentageOfLot = Math.min(100, Math.round((qty / lotVolume) * 1000) / 10);

  // Kiểm tra ràng buộc hợp lệ
  let isValidMinimum = true;
  let isValidMaximum = true;
  let validationError: string | undefined = undefined;

  if (qty < tiers[0].minKg) {
    isValidMinimum = false;
    validationError = `Định mức mua tối thiểu cho ${categoryConfig.label} là ${tiers[0].minKg.toLocaleString()} kg (${categoryConfig.description}).`;
  } else if (qty > lotVolume) {
    isValidMaximum = false;
    validationError = `Khối lượng đặt mua (${qty.toLocaleString()} kg) vượt quá sản lượng còn lại của lô (${lotVolume.toLocaleString()} kg)!`;
  }

  const isBestTier = currentTier.isBestValue;
  let nextTier: PricingTierItem | null = null;
  let kgNeededForNextTier = 0;
  let extraSavingsPerKgNextTier = 0;
  let smartAdviceHeadline = '';
  let smartAdviceDetail = '';

  if (currentTier.tierIndex === 1) {
    nextTier = tiers[1];
    kgNeededForNextTier = Math.max(0, tiers[1].minKg - qty);
    extraSavingsPerKgNextTier = tiers[0].pricePerKg - tiers[1].pricePerKg;
    smartAdviceHeadline = `💡 Mẹo tiết kiệm: Mua thêm ${kgNeededForNextTier.toLocaleString()} kg để được giảm ${tiers[1].discountPercent}%!`;
    smartAdviceDetail = `Nếu nâng khối lượng lên mốc ${tiers[1].minKg.toLocaleString()} kg, đơn giá sẽ giảm từ ${tiers[0].pricePerKg.toLocaleString('vi-VN')} đ xuống ${tiers[1].pricePerKg.toLocaleString('vi-VN')} đ/kg. Bạn tiết kiệm thêm ${(extraSavingsPerKgNextTier * tiers[1].minKg).toLocaleString('vi-VN')} đ!`;
  } else if (currentTier.tierIndex === 2) {
    nextTier = tiers[2];
    kgNeededForNextTier = Math.max(0, tiers[2].minKg - qty);
    extraSavingsPerKgNextTier = tiers[1].pricePerKg - tiers[2].pricePerKg;
    smartAdviceHeadline = `🔥 Cơ hội đạt Giá Lời Nhất: Chỉ cần thêm ${kgNeededForNextTier.toLocaleString()} kg nữa!`;
    smartAdviceDetail = `Đạt mốc ${tiers[2].minKg.toLocaleString()} kg để mở khóa mức chiết khấu cực đại ${tiers[2].discountPercent}% (-${tiers[2].savingsPerKg.toLocaleString('vi-VN')} đ/kg so với giá gốc). Tổng tiết kiệm lên đến ${(tiers[2].savingsPerKg * tiers[2].minKg).toLocaleString('vi-VN')} đ!`;
  } else {
    smartAdviceHeadline = `🏆 Tuyệt vời! Bạn đang nhận Mức Giá Sỉ Lời Nhất Thị Trường (-${tiers[2].discountPercent}%)!`;
    smartAdviceDetail = `Đơn giá của bạn chỉ còn ${tiers[2].pricePerKg.toLocaleString('vi-VN')} đ/kg (tiết kiệm tổng cộng ${totalSavingsComparedToBase.toLocaleString('vi-VN')} đ so với giá cơ sở). Biên độ lợi nhuận bán lại cao nhất!`;
  }

  return {
    currentTier,
    appliedPricePerKg,
    effectiveDiscountPercent,
    totalCost,
    totalSavingsComparedToBase,
    percentageOfLot,
    isBestTier,
    nextTier,
    kgNeededForNextTier,
    extraSavingsPerKgNextTier,
    smartAdviceHeadline,
    smartAdviceDetail,
    recommendedBestQty: tiers[2].minKg,
    isValidMinimum,
    isValidMaximum,
    validationError,
  };
}
