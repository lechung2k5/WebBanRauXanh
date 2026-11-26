import {
  ApiResponse,
  PageResponse,
  FarmerStats,
  FarmerProfile,
  HarvestLot,
  RfqItem,
  B2BContract,
  QcInspection,
  Settlement,
  HarvestLotAllocation,
  ColdChainTelemetry,
  DeliveryProof,
  LotTrace,
} from '@/types';
import {
  getSyncContracts,
  getSyncRfqs,
  notifySyncEvent,
  B2bSyncContract,
} from '@/services/b2bSyncService';
import { sanitizeVietnamese } from '@/utils/vietnameseEncodingHelper';

export const getStoredFarmerUser = (): any => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('xanhfarm_user') || sessionStorage.getItem('xanhfarm_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-HoNa-Request': '1',
  };
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('xanhfarm_user') || sessionStorage.getItem('xanhfarm_user');
      if (raw) {
        const u = JSON.parse(raw);
        const token = u?.accessToken || u?.token;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore
    }
  }
  return headers;
};

const API_BASE_URL = '/api/backend';

// ================= FALLBACK MOCK DATA CHUẨN XÁC B2B NÔNG SẢN =================
export const FALLBACK_FARMER_PROFILE: FarmerProfile = {
  id: 1,
  farmName: 'HTX Nông Nghiệp Đà Lạt GAP',
  farmerType: 'COOPERATIVE',
  pucCode: 'VN-LDO-PUC-0849',
  taxCode: '5801459201',
  idCardNumber: '049088019284',
  bankAccount: '0071001284920',
  bankName: 'Vietcombank - CN Lâm Đồng',
  bankAccountName: 'HTX NONG NGHIEP DA LAT GAP',
  location: 'Tiểu khu 158, Phường 8, TP. Đà Lạt, Tỉnh Lâm Đồng',
  cultivatedArea: '45 Hecta',
  certifications: 'VietGAP, GlobalGAP, OCOP 4 Sao',
  username: 'farmer_dalat',
  fullName: 'Ông Nguyễn Văn Thành (Chủ tịch HTX)',
  phone: '0912.849.688',
  email: 'htx.dalatgap@gmail.com',
};

export const FALLBACK_HARVEST_LOTS: HarvestLot[] = [
  {
    id: 1,
    lotCode: 'LOT-2026-DL-001',
    farmerName: 'HTX Nông Nghiệp Đà Lạt GAP',
    productName: 'Bắp Cải Trái Tim Đà Lạt VietGAP',
    category: 'RAU_AN_LA',
    categorySlug: 'rau-an-la',
    totalWeightKg: 10000,
    availableWeightKg: 6000,
    basePricePerKg: 14000,
    imageUrl: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&auto=format&fit=crop&q=80',
    pucCode: 'VN-LDO-PUC-0849',
    harvestDate: '2026-10-28',
    expiryDate: '2026-11-12',
    totalQuantity: 10000,
    remainingQuantity: 6000,
    unit: 'kg',
    minTemp: 2.0,
    maxTemp: 6.0,
    hubLocation: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    status: 'OPEN',
    tierPricingJson: JSON.stringify([
      { minKg: 500, pricePerKg: 14000 },
      { minKg: 2000, pricePerKg: 12500 },
      { minKg: 5000, pricePerKg: 11000 },
    ]),
    tierPricing: [
      { minKg: 500, pricePerKg: 14000 },
      { minKg: 2000, pricePerKg: 12500 },
      { minKg: 5000, pricePerKg: 11000 },
    ],
  },
  {
    id: 2,
    lotCode: 'LOT-2026-DL-002',
    farmerName: 'HTX Nông Nghiệp Đà Lạt GAP',
    productName: 'Cà Chua Beef Xuất Khẩu Chuẩn GlobalGAP',
    category: 'CU_QUA',
    categorySlug: 'cu-qua-tuoi',
    totalWeightKg: 8500,
    availableWeightKg: 6500,
    basePricePerKg: 18000,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
    pucCode: 'VN-LDO-PUC-0849',
    harvestDate: '2026-10-29',
    expiryDate: '2026-11-15',
    totalQuantity: 8500,
    remainingQuantity: 6500,
    unit: 'kg',
    minTemp: 8.0,
    maxTemp: 12.0,
    hubLocation: 'Trạm Lạnh Cross-docking Đơn Dương, Lâm Đồng',
    status: 'OPEN',
    tierPricingJson: JSON.stringify([
      { minKg: 300, pricePerKg: 22000 },
      { minKg: 1500, pricePerKg: 19500 },
      { minKg: 4000, pricePerKg: 17000 },
    ]),
    tierPricing: [
      { minKg: 300, pricePerKg: 22000 },
      { minKg: 1500, pricePerKg: 19500 },
      { minKg: 4000, pricePerKg: 17000 },
    ],
  },
  {
    id: 3,
    lotCode: 'LOT-2026-DL-003',
    farmerName: 'HTX Nông Nghiệp Đà Lạt GAP',
    productName: 'Xà Lách Lô Lô Xanh Thủy Canh Nhà Màng',
    category: 'RAU_AN_LA',
    categorySlug: 'rau-an-la',
    totalWeightKg: 5000,
    availableWeightKg: 5000,
    basePricePerKg: 22000,
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    pucCode: 'VN-LDO-PUC-0849',
    harvestDate: '2026-10-27',
    expiryDate: '2026-11-04',
    totalQuantity: 3000,
    remainingQuantity: 3000,
    unit: 'kg',
    minTemp: 2.0,
    maxTemp: 5.0,
    hubLocation: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    status: 'OPEN',
    tierPricingJson: JSON.stringify([
      { minKg: 100, pricePerKg: 28000 },
      { minKg: 500, pricePerKg: 25000 },
      { minKg: 1000, pricePerKg: 22000 },
    ]),
    tierPricing: [
      { minKg: 100, pricePerKg: 28000 },
      { minKg: 500, pricePerKg: 25000 },
      { minKg: 1000, pricePerKg: 22000 },
    ],
  },
];

export const FALLBACK_RFQS: RfqItem[] = [];

export const FALLBACK_CONTRACTS: B2BContract[] = [];

export const FALLBACK_QC: QcInspection | null = null as any;

export const FALLBACK_QC_MAP: Record<number, QcInspection> = {};

export const FALLBACK_SETTLEMENTS: Settlement[] = [];

// ================= API CALLS (KÈM FALLBACK KHÔNG BAO GIỜ BỊ RỖNG) =================

// 1. Dashboard Stats
export const getFarmerStatsApi = async (): Promise<FarmerStats> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/dashboard/stats`, {
      cache: 'no-store',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data: ApiResponse<FarmerStats> = await res.json();
      if (data.result) return data.result;
    }
  } catch {
    // fallback tính động từ syncContracts thật
  }

  let totalRev = 0;
  let escrow = 0;
  let openLots = 3;
  let runningContracts = 0;
  let pendingRfqs = 0;

  if (typeof window !== 'undefined') {
    try {
      const syncContracts = getSyncContracts();
      const syncRfqs = getSyncRfqs();
      const localLots: HarvestLot[] = JSON.parse(localStorage.getItem('b2b_farmer_lots') || '[]');
      const localOpenLots = localLots.filter((l) => l.status === 'OPEN').length;
      openLots = 3 + localOpenLots;

      // Doanh thu thật: Hợp đồng đã tất toán hoàn tất (Mốc 6 hoặc finalPaidStatus === 'PAID')
      const completedContracts = syncContracts.filter(
        (c) => c.fulfillmentStep === 6 || c.finalPaidStatus === 'PAID'
      );
      totalRev = completedContracts.reduce(
        (sum, c) => sum + (c.settledAmount || c.totalAmount),
        0
      );

      // Tiền cọc Escrow 30% bảo chứng THỰC TẾ của các hợp đồng đang thực hiện (Mốc 2-5)
      const inProgressContracts = syncContracts.filter(
        (c) => c.depositStatus === 'DEPOSIT_PAID' && c.fulfillmentStep < 6
      );
      escrow = inProgressContracts.reduce((sum, c) => sum + (c.depositAmount || 0), 0);

      // Hợp đồng đang chạy
      runningContracts = syncContracts.filter((c) => c.fulfillmentStep < 6).length;

      // RFQ đang chờ phản hồi
      pendingRfqs = syncRfqs.filter((r) => r.status === 'PENDING').length;
    } catch {}
  }

  return {
    totalRevenue: totalRev,
    escrowHolding: escrow,
    openLotsCount: openLots,
    runningContractsCount: runningContracts,
    pendingRfqCount: pendingRfqs,
  };
};

// 2. Profile
export const getFarmerProfileApi = async (): Promise<FarmerProfile> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/profile`, {
      cache: 'no-store',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Không thể tải thông tin hồ sơ nông dân');
    const data: ApiResponse<FarmerProfile> = await res.json();
    const result = data.result || FALLBACK_FARMER_PROFILE;
    return {
      ...result,
      farmName: sanitizeVietnamese(result.farmName) || 'HTX Nông Nghiệp Đà Lạt GAP',
      location: sanitizeVietnamese(result.location) || 'Tiểu khu 158, Phường 8, TP. Đà Lạt, Tỉnh Lâm Đồng',
      fullName: sanitizeVietnamese(result.fullName),
      bankAccountName: sanitizeVietnamese(result.bankAccountName),
    };
  } catch {
    return FALLBACK_FARMER_PROFILE;
  }
};

export const updateFarmerProfileApi = async (profileData: Partial<FarmerProfile>): Promise<FarmerProfile> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify(profileData),
    });
    const data: ApiResponse<FarmerProfile> = await res.json();
    if (!res.ok || data.code !== 200) {
      throw new Error(data.message || 'Lỗi khi cập nhật hồ sơ nông dân');
    }
    return data.result;
  } catch (err: unknown) {
    console.warn('API update profile offline, updating local state:', err);
    return { ...FALLBACK_FARMER_PROFILE, ...profileData };
  }
};

const getUserLotsStorageKey = (farmerId?: number | string | null): string => {
  const resolvedId = farmerId ?? getStoredFarmerUser()?.id;
  return resolvedId ? `b2b_farmer_lots_${resolvedId}` : 'b2b_farmer_lots';
};

// Helper: Lưu Lô Vụ Mùa vào localStorage theo đúng tài khoản Farmer
export const saveLocalLot = (lot: HarvestLot) => {
  if (typeof window === 'undefined') return;
  try {
    const currentUser = getStoredFarmerUser();
    const ownerId = lot.farmerId ?? currentUser?.id;
    const lotWithOwner: HarvestLot = ownerId ? { ...lot, farmerId: Number(ownerId) } : lot;
    const storageKey = getUserLotsStorageKey(ownerId);

    const existing: HarvestLot[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const filtered = existing.filter((l) => l.id !== lotWithOwner.id && l.lotCode !== lotWithOwner.lotCode);
    filtered.unshift(lotWithOwner);
    localStorage.setItem(storageKey, JSON.stringify(filtered));
    localStorage.setItem('b2b_farmer_lots', JSON.stringify(filtered));

    // Đồng bộ sang xanhfarm_custom_harvest_lots để Admin thấy ngay trong Admin Console
    const customRaw = localStorage.getItem('xanhfarm_custom_harvest_lots');
    const customLots: HarvestLot[] = customRaw ? JSON.parse(customRaw) : [];
    const filteredCustom = customLots.filter((l) => l.id !== lotWithOwner.id && l.lotCode !== lotWithOwner.lotCode);
    filteredCustom.unshift(lotWithOwner);
    localStorage.setItem('xanhfarm_custom_harvest_lots', JSON.stringify(filteredCustom));

    window.dispatchEvent(new CustomEvent('b2b_lot_updated', { detail: lotWithOwner }));
    window.dispatchEvent(new Event('storage'));
  } catch {}
};

// 3. Harvest Lots
export const getFarmerHarvestLotsApi = async (): Promise<HarvestLot[]> => {
  const currentUser = getStoredFarmerUser();
  const currentFarmerId = currentUser?.id ? Number(currentUser.id) : null;
  const userStorageKey = getUserLotsStorageKey(currentFarmerId);

  let serverLots: HarvestLot[] = [];
  let isApiSuccess = false;
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/harvest-lots`, {
      cache: 'no-store',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data: ApiResponse<HarvestLot[]> = await res.json();
      const items = data.result || (data as unknown as { data: HarvestLot[] }).data;
      if (Array.isArray(items)) {
        serverLots = items;
        isApiSuccess = true;
      }
    }
  } catch {
    // fallback offline bên dưới
  }

  const normalizeLot = (lot: HarvestLot): HarvestLot => {
    let parsedTier = lot.tierPricing;
    if (!parsedTier && lot.tierPricingJson) {
      try {
        parsedTier = JSON.parse(lot.tierPricingJson);
      } catch {}
    }
    return {
      ...lot,
      farmerName: sanitizeVietnamese(lot.farmerName) || currentUser?.companyName || currentUser?.fullName || 'Nông trại',
      tierPricing: parsedTier,
    };
  };

  // Khi API backend thành công: chỉ hiển thị đúng các lô do tài khoản này đăng trên Server
  if (isApiSuccess) {
    const ownedServerLots = serverLots
      .filter((lot) => !currentFarmerId || lot.farmerId == null || Number(lot.farmerId) === currentFarmerId)
      .map(normalizeLot);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(ownedServerLots));
        localStorage.setItem('b2b_farmer_lots', JSON.stringify(ownedServerLots));
      } catch {}
    }

    return ownedServerLots;
  }

  // Fallback khi mất kết nối: chỉ đọc cache riêng của đúng farmerId hiện tại
  if (typeof window !== 'undefined' && currentFarmerId) {
    try {
      const raw = localStorage.getItem(userStorageKey);
      if (raw) {
        const cached: HarvestLot[] = JSON.parse(raw);
        return cached
          .filter((lot) => Number(lot.farmerId) === currentFarmerId)
          .map(normalizeLot);
      }
    } catch {}
  }

  return [];
};

export const createHarvestLotApi = async (lotData: {
  productName: string;
  farmerName?: string;
  categorySlug?: string;
  category?: string;
  imageUrl?: string;
  pucCode: string;
  harvestDate: string;
  expiryDate: string;
  totalQuantity: number;
  unit?: string;
  minTemp?: number;
  maxTemp?: number;
  reqTempMin?: number;
  reqTempMax?: number;
  basePricePerKg?: number;
  tierPricingJson: string;
  hubLocation?: string;
  shippingMethod?: 'DIRECT_FARM_TO_BUYER' | 'CROSS_DOCKING_HUB' | 'BUYER_SELF_TRANSPORT' | string;
  estimatedShippingFee?: number;
}): Promise<HarvestLot> => {
  let normalizedTiers: any[] = [];
  try {
    const parsed = JSON.parse(lotData.tierPricingJson || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      normalizedTiers = parsed.map((item: any) => {
        const p = Number(item.price ?? item.pricePerKg ?? item.price_per_kg ?? 0);
        return {
          minKg: Number(item.minKg || item.quantity || 0),
          price: p,
          pricePerKg: p,
        };
      });
    }
  } catch (_) {}

  const basePricePerKg =
    lotData.basePricePerKg !== undefined && lotData.basePricePerKg !== null
      ? Number(lotData.basePricePerKg)
      : (normalizedTiers.length > 0 ? normalizedTiers[0].price : 0);

  const minTemp = Number(lotData.minTemp ?? lotData.reqTempMin ?? 2.0);
  const maxTemp = Number(lotData.maxTemp ?? lotData.reqTempMax ?? 6.0);
  const normalizedTierPricingJson = JSON.stringify(normalizedTiers);

  const payload = {
    ...lotData,
    totalWeightKg: lotData.totalQuantity,
    availableWeightKg: lotData.totalQuantity,
    basePricePerKg,
    minTemp,
    maxTemp,
    reqTempMin: minTemp,
    reqTempMax: maxTemp,
    tierPricingJson: normalizedTierPricingJson,
    pucCode: lotData.pucCode || 'PUC-LD-001',
    status: 'PENDING_APPROVAL',
  };

  try {
    const res = await fetch(`${API_BASE_URL}/farmer/harvest-lots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data: ApiResponse<HarvestLot> = await res.json();
    const resultLot = data.result || (data as unknown as { data: HarvestLot }).data;
    if (res.ok && resultLot) {
      const finalLot: HarvestLot = {
        ...resultLot,
        basePricePerKg: resultLot.basePricePerKg || basePricePerKg,
        minTemp: resultLot.minTemp ?? resultLot.reqTempMin ?? minTemp,
        maxTemp: resultLot.maxTemp ?? resultLot.reqTempMax ?? maxTemp,
        reqTempMin: resultLot.reqTempMin ?? resultLot.minTemp ?? minTemp,
        reqTempMax: resultLot.reqTempMax ?? resultLot.maxTemp ?? maxTemp,
        tierPricingJson: resultLot.tierPricingJson || normalizedTierPricingJson,
        tierPricing: normalizedTiers,
        status: resultLot.status || 'PENDING_APPROVAL',
        auditNote: resultLot.auditNote || 'Đang chờ Quản trị viên xét duyệt & bổ sung thông số.',
        shippingMethod: (resultLot.shippingMethod as any) || (lotData.shippingMethod as any) || 'CROSS_DOCKING_HUB',
        estimatedShippingFee: resultLot.estimatedShippingFee || lotData.estimatedShippingFee,
      };
      saveLocalLot(finalLot);
      // Khi FARMER đăng lô hàng mới: Gửi thông báo cho ADMIN để Admin duyệt & bổ sung field còn thiếu
      notifySyncEvent('LOT_CREATED', {
        lot: finalLot,
        source: 'FARMER',
        creatorRole: 'FARMER',
      });
      return finalLot;
    }

    // Nếu Backend phản hồi lỗi HTTP (401, 403, 400, 500)
    const errorMsg =
      data?.message ||
      (res.status === 401
        ? 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập tài khoản Nông dân. Vui lòng đăng nhập lại!'
        : `Lỗi máy chủ khi tạo lô hàng (Mã lỗi HTTP: ${res.status}). Vui lòng kiểm tra lại!`);
    throw new Error(errorMsg);
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
    console.warn('Backend API create lot error, saving locally:', err);
  }

  const currentUser = getStoredFarmerUser();
  const mockLot: HarvestLot = {
    id: Date.now(),
    lotCode: `LOT-2026-DL-${Math.floor(100 + Math.random() * 900)}`,
    farmerId: currentUser?.id ? Number(currentUser.id) : undefined,
    farmerName: lotData.farmerName || currentUser?.companyName || currentUser?.fullName || 'Nông trại HoNa Fresh',
    productName: lotData.productName,
    category: lotData.category || 'RAU_AN_LA',
    categorySlug: lotData.categorySlug || 'rau-an-la',
    totalWeightKg: lotData.totalQuantity,
    availableWeightKg: lotData.totalQuantity,
    basePricePerKg: basePricePerKg,
    imageUrl: lotData.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
    pucCode: lotData.pucCode,
    harvestDate: lotData.harvestDate,
    expiryDate: lotData.expiryDate,
    totalQuantity: lotData.totalQuantity,
    remainingQuantity: lotData.totalQuantity,
    unit: lotData.unit || 'kg',
    minTemp: minTemp,
    maxTemp: maxTemp,
    reqTempMin: minTemp,
    reqTempMax: maxTemp,
    hubLocation: lotData.hubLocation || 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    warehouseLocation: lotData.hubLocation || 'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1',
    status: 'PENDING_APPROVAL',
    auditNote: 'Lô nông sản do nông dân đăng ký, đang chờ Quản trị viên xét duyệt & bổ sung thông số.',
    shippingMethod: (lotData.shippingMethod as any) || 'CROSS_DOCKING_HUB',
    estimatedShippingFee: lotData.estimatedShippingFee,
    tierPricingJson: normalizedTierPricingJson,
    tierPricing: normalizedTiers,
  };
  saveLocalLot(mockLot);
  // Khi FARMER đăng lô hàng mới: Gửi thông báo cho ADMIN
  notifySyncEvent('LOT_CREATED', {
    lot: mockLot,
    source: 'FARMER',
    creatorRole: 'FARMER',
  });
  return mockLot;
};

let isSyncingOfflineLots = false;

/**
 * Tự động đồng bộ các lô hàng nông sản lưu tạm offline (mã LOT-2026-DL-xxx) lên Database PostgreSQL
 * Giúp các lô do Nông dân đăng lúc chưa có mạng/chưa kịp lưu DB sẽ được lưu vĩnh viễn và phát sóng WebSocket STOMP
 */
export const syncPendingOfflineLotsToServer = async (): Promise<HarvestLot[]> => {
  if (typeof window === 'undefined') return [];
  if (isSyncingOfflineLots) return [];
  isSyncingOfflineLots = true;

  try {
    const currentUser = getStoredFarmerUser();
    const currentFarmerId = currentUser?.id ? Number(currentUser.id) : null;
    const storageKey = getUserLotsStorageKey(currentFarmerId);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const lots: HarvestLot[] = JSON.parse(raw);
    const offlineLots = lots.filter(
      (l) =>
        l.lotCode &&
        l.lotCode.startsWith('LOT-2026-DL-') &&
        (Number(l.id) > 1000000000000 || typeof l.id === 'string') &&
        (!currentFarmerId || !l.farmerId || Number(l.farmerId) === currentFarmerId)
    );
    if (offlineLots.length === 0) return [];

    const syncedLots: HarvestLot[] = [];
    for (const lot of offlineLots) {
      try {
        const payload = {
          productName: lot.productName,
          farmerName: lot.farmerName,
          categorySlug: lot.categorySlug || 'rau-an-la',
          category: lot.category || 'RAU_AN_LA',
          imageUrl: lot.imageUrl,
          pucCode: lot.pucCode || 'VN-LDO-PUC-0849',
          harvestDate: lot.harvestDate,
          expiryDate: lot.expiryDate,
          totalWeightKg: lot.totalQuantity || lot.totalWeightKg || 500,
          totalQuantity: lot.totalQuantity || lot.totalWeightKg || 500,
          availableWeightKg: lot.availableWeightKg || lot.totalQuantity || 500,
          basePricePerKg: lot.basePricePerKg || 15000,
          unit: lot.unit || 'kg',
          minTemp: lot.minTemp ?? lot.reqTempMin ?? 2.0,
          maxTemp: lot.maxTemp ?? lot.reqTempMax ?? 6.0,
          reqTempMin: lot.minTemp ?? lot.reqTempMin ?? 2.0,
          reqTempMax: lot.maxTemp ?? lot.reqTempMax ?? 6.0,
          tierPricingJson: lot.tierPricingJson || JSON.stringify(lot.tierPricing || []),
          hubLocation: lot.hubLocation || lot.warehouseLocation || 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
          status: 'PENDING_APPROVAL',
        };

        const res = await fetch(`${API_BASE_URL}/farmer/harvest-lots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data: ApiResponse<HarvestLot> = await res.json();
          const serverLot = data.result || (data as unknown as { data: HarvestLot }).data;
          if (serverLot) {
            syncedLots.push(serverLot);

            // Cập nhật lại trong b2b_farmer_lots: thay thế mock lot bằng serverLot
            const currentRaw = localStorage.getItem('b2b_farmer_lots');
            const currentLots: HarvestLot[] = currentRaw ? JSON.parse(currentRaw) : [];
            const updatedLots = currentLots.map((item) =>
              item.lotCode === lot.lotCode || item.id === lot.id ? { ...item, ...serverLot } : item
            );
            localStorage.setItem('b2b_farmer_lots', JSON.stringify(updatedLots));

            // Cập nhật lại trong xanhfarm_custom_harvest_lots
            const adminRaw = localStorage.getItem('xanhfarm_custom_harvest_lots');
            const adminLots: HarvestLot[] = adminRaw ? JSON.parse(adminRaw) : [];
            const updatedAdmin = adminLots.map((item) =>
              item.lotCode === lot.lotCode || item.id === lot.id ? { ...item, ...serverLot } : item
            );
            localStorage.setItem('xanhfarm_custom_harvest_lots', JSON.stringify(updatedAdmin));
          }
        }
      } catch (err) {
        console.warn('Lỗi khi đồng bộ lô offline lên máy chủ:', lot.lotCode, err);
      }
    }
    return syncedLots;
  } catch {
    return [];
  } finally {
    isSyncingOfflineLots = false;
  }
};

export const updateHarvestLotApi = async (
  lotId: number,
  lotData: {
    productName: string;
    categorySlug?: string;
    imageUrl?: string;
    pucCode: string;
    harvestDate: string;
    expiryDate: string;
    totalQuantity: number;
    unit?: string;
    minTemp?: number;
    maxTemp?: number;
    tierPricingJson: string;
    hubLocation?: string;
    shippingMethod?: 'DIRECT_FARM_TO_BUYER' | 'CROSS_DOCKING_HUB' | 'BUYER_SELF_TRANSPORT' | string;
    estimatedShippingFee?: number;
  }
): Promise<HarvestLot> => {
  let basePricePerKg = 15000;
  try {
    const parsed = JSON.parse(lotData.tierPricingJson || '[]');
    if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].pricePerKg || parsed[0].price)) {
      basePricePerKg = Number(parsed[0].pricePerKg || parsed[0].price);
    }
  } catch (_) {}

  const payload = {
    ...lotData,
    totalWeightKg: lotData.totalQuantity,
    availableWeightKg: lotData.totalQuantity,
    basePricePerKg,
    pucCode: lotData.pucCode || 'PUC-LD-001',
  };

  try {
    const res = await fetch(`${API_BASE_URL}/farmer/harvest-lots/${lotId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data: ApiResponse<HarvestLot> = await res.json();
    const resultLot = data.result || (data as unknown as { data: HarvestLot }).data;
    if (res.ok && resultLot) {
      saveLocalLot(resultLot);
      return resultLot;
    }
  } catch (err: unknown) {
    console.warn('Backend API update lot error, saving locally:', err);
  }

  // Fallback update local storage
  let localLots: HarvestLot[] = [];
  if (typeof window !== 'undefined') {
    try {
      localLots = JSON.parse(localStorage.getItem('b2b_farmer_lots') || '[]');
    } catch {}
  }
  const current = localLots.find((l) => l.id === lotId) || FALLBACK_HARVEST_LOTS.find((l) => l.id === lotId);
  const updatedMockLot: HarvestLot = {
    ...(current || {}),
    id: lotId,
    lotCode: current?.lotCode || `LOT-2026-DL-${lotId}`,
    farmerName: current?.farmerName || 'HTX Nông Nghiệp Đà Lạt GAP',
    productName: lotData.productName,
    category: current?.category || 'RAU_AN_LA',
    categorySlug: lotData.categorySlug || current?.categorySlug || 'rau-an-la',
    totalWeightKg: lotData.totalQuantity,
    availableWeightKg: lotData.totalQuantity,
    basePricePerKg,
    imageUrl: lotData.imageUrl || current?.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
    pucCode: lotData.pucCode,
    harvestDate: lotData.harvestDate,
    expiryDate: lotData.expiryDate,
    totalQuantity: lotData.totalQuantity,
    remainingQuantity: lotData.totalQuantity,
    unit: lotData.unit || 'kg',
    minTemp: lotData.minTemp ?? 2.0,
    maxTemp: lotData.maxTemp ?? 6.0,
    hubLocation: lotData.hubLocation || 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    shippingMethod: (lotData.shippingMethod as any) || (current as any)?.shippingMethod || 'CROSS_DOCKING_HUB',
    estimatedShippingFee: lotData.estimatedShippingFee || (current as any)?.estimatedShippingFee,
    status: current?.status || 'OPEN',
    tierPricingJson: lotData.tierPricingJson,
    tierPricing: JSON.parse(lotData.tierPricingJson || '[]'),
  };
  saveLocalLot(updatedMockLot);
  return updatedMockLot;
};

export const cancelFarmerHarvestLotApi = async (lotId: number | string): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/harvest-lots/${lotId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Không thể hủy lô hàng trên máy chủ.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('chốt cọc')) {
      throw err;
    }
    console.warn('Backend API cancel lot error, updating local storage:', err);
  }

  // Cập nhật trạng thái CANCELLED trên localStorage
  if (typeof window !== 'undefined') {
    try {
      const localLots: HarvestLot[] = JSON.parse(localStorage.getItem('b2b_farmer_lots') || '[]');
      const updated = localLots.map((l) => (l.id === Number(lotId) || String(l.id) === String(lotId) ? { ...l, status: 'CANCELLED' as any } : l));
      localStorage.setItem('b2b_farmer_lots', JSON.stringify(updated));

      const adminLots: HarvestLot[] = JSON.parse(localStorage.getItem('xanhfarm_custom_harvest_lots') || '[]');
      const updatedAdmin = adminLots.map((l) => (l.id === Number(lotId) || String(l.id) === String(lotId) ? { ...l, status: 'CANCELLED' as any } : l));
      localStorage.setItem('xanhfarm_custom_harvest_lots', JSON.stringify(updatedAdmin));

      window.dispatchEvent(new CustomEvent('b2b_lot_updated', { detail: { id: lotId, status: 'CANCELLED' } }));
    } catch {}
  }
};

export const deleteFarmerHarvestLotPermanentApi = async (lotId: number | string): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/harvest-lots/${lotId}/permanent`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Không thể xóa vĩnh viễn lô hàng trên máy chủ.');
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('chốt cọc') || err.message.includes('ĐÃ HỦY'))) {
      throw err;
    }
    console.warn('Backend API permanent delete lot error, updating local storage:', err);
  }

  // Xóa hẳn khỏi localStorage
  if (typeof window !== 'undefined') {
    try {
      const localLots: HarvestLot[] = JSON.parse(localStorage.getItem('b2b_farmer_lots') || '[]');
      const filtered = localLots.filter((l) => l.id !== Number(lotId) && String(l.id) !== String(lotId));
      localStorage.setItem('b2b_farmer_lots', JSON.stringify(filtered));

      const adminLots: HarvestLot[] = JSON.parse(localStorage.getItem('xanhfarm_custom_harvest_lots') || '[]');
      const filteredAdmin = adminLots.filter((l) => l.id !== Number(lotId) && String(l.id) !== String(lotId));
      localStorage.setItem('xanhfarm_custom_harvest_lots', JSON.stringify(filteredAdmin));

      window.dispatchEvent(new CustomEvent('b2b_lot_deleted', { detail: { id: lotId } }));
    } catch {}
  }
};

// Helper: Đọc các đề xuất đàm phán do người mua gửi từ Trang Chủ hoặc Modal B2B lưu trong localStorage, lọc theo đúng Nông dân sở hữu
export const getLocalSubmittedRfqs = (farmerId?: number, farmerName?: string, userLotCodes?: Set<string>): RfqItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const rawSyncRfqs = localStorage.getItem('hona_b2b_sync_rfqs_v2');
    const rawSubmitted = localStorage.getItem('b2b_submitted_rfqs');
    const rawHistory = localStorage.getItem('b2b_rfq_history');
    const rawFarmerRfqs = localStorage.getItem('b2b_farmer_rfqs');

    const syncList = rawSyncRfqs ? JSON.parse(rawSyncRfqs) : [];
    const submittedList = rawSubmitted ? JSON.parse(rawSubmitted) : [];
    const historyList = rawHistory ? JSON.parse(rawHistory) : [];
    const farmerList = rawFarmerRfqs ? JSON.parse(rawFarmerRfqs) : [];

    const combined = [...syncList, ...submittedList, ...farmerList, ...historyList];
    const seenCodes = new Set<string>();
    const result: RfqItem[] = [];

    const normName = (farmerName || '').toLowerCase().trim();

    for (let i = 0; i < combined.length; i++) {
      const item = combined[i];
      if (!item) continue;
      const rfqCode =
        item.rfqCode ||
        (typeof item.id === 'string' && item.id.startsWith('RFQ')
          ? item.id
          : `RFQ-${item.id || 100000 + i}`);

      if (seenCodes.has(rfqCode)) continue;

      // KIỂM TRA ĐÚNG NÔNG DÂN SỞ HỮU LÔ HÀNG ĐƯỢC ĐÀM PHÁN
      if (farmerId || normName || (userLotCodes && userLotCodes.size > 0)) {
        let matched = false;
        if (farmerId && item.farmerId && Number(item.farmerId) === Number(farmerId)) {
          matched = true;
        } else if (normName && item.farmerName) {
          const itemFn = String(item.farmerName).toLowerCase().trim();
          if (itemFn.includes(normName) || normName.includes(itemFn)) {
            matched = true;
          }
        } else if (userLotCodes && (item.harvestLotCode || item.lotCode)) {
          const lcode = String(item.harvestLotCode || item.lotCode).trim().toUpperCase();
          if (userLotCodes.has(lcode)) {
            matched = true;
          }
        }
        if (!matched) continue;
      }

      seenCodes.add(rfqCode);

      const numericId =
        typeof item.id === 'number'
          ? item.id
          : parseInt(String(item.id).replace(/\D/g, '') || String(1000 + i), 10);

      result.push({
        id: numericId,
        rfqCode,
        harvestLotId: item.harvestLotId || item.lotId || item.productId || 1,
        harvestLotCode: item.harvestLotCode || item.lotCode || 'LOT-2026-DL-001',
        productName: item.productName || 'Nông Sản VietGAP HoNa Fresh',
        buyerName: item.buyerName || item.traderName || 'Thương Lái Mua Sỉ',
        buyerPhone: item.buyerPhone || item.traderPhone || '0908.776.889',
        buyerCompany:
          item.buyerCompany ||
          item.traderCompany ||
          (item.traderName ? `Vựa Nông Sản ${item.traderName}` : 'Đơn vị phân phối sỉ'),
        requestedQuantity: Number(item.requestedQuantityKg || item.requestedQuantity || item.quantity || 1000),
        targetPrice: Number(item.targetPricePerKg || item.targetPrice || 15000),
        counterPrice: item.counterPricePerKg ?? item.counterPrice,
        counterQuantity: Number(item.counterQuantity || item.requestedQuantityKg || item.requestedQuantity || 1000),
        rejectReason: item.rejectReason || item.notes,
        deliveryDate: item.desiredDeliveryDate || item.deliveryDate || '2026-10-29',
        hubLocation:
          item.deliveryLocation ||
          item.hubLocation ||
          'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
        shippingOption: item.shippingOption || item.shipping_option || 'farm_delivery',
        notes: item.notes || item.buyerNotes || '',
        coldHubAddress: item.coldHubAddress || '',
        status: item.status || 'WAITING_FARMER',
        createdAt: item.createdAt || new Date().toISOString(),
      });
    }

    return result;
  } catch (err) {
    console.error('Error reading local RFQs:', err);
    return [];
  }
};


export interface RfqStatusOverride {
  id?: number;
  rfqCode?: string;
  status: 'WAITING_FARMER' | 'WAITING_BUYER' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'PENDING' | 'COUNTER_OFFER';
  counterPrice?: number;
  counterQuantity?: number;
  rejectReason?: string;
  updatedAt: string;
}

export const getLocalRfqOverrides = (): Record<string, RfqStatusOverride> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('b2b_rfq_status_overrides');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveLocalRfqOverride = (
  rfqKey: string | number,
  override: Partial<RfqStatusOverride> & { status: RfqStatusOverride['status'] }
) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalRfqOverrides();
    const key = String(rfqKey);
    existing[key] = {
      ...existing[key],
      ...override,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('b2b_rfq_status_overrides', JSON.stringify(existing));
  } catch (err) {
    console.error('Error saving local RFQ override:', err);
  }
};

// Helper: Lưu trạng thái phản hồi đàm phán vào localStorage
export const saveLocalRfqUpdate = (updatedRfq: Partial<RfqItem> & { id: number; status: string; rfqCode?: string }) => {
  if (typeof window === 'undefined') return;
  try {
    // Luôn lưu override trạng thái theo cả ID và rfqCode (nếu có)
    saveLocalRfqOverride(updatedRfq.id, {
      id: updatedRfq.id,
      rfqCode: updatedRfq.rfqCode,
      status: updatedRfq.status as any,
      counterPrice: updatedRfq.counterPrice,
      counterQuantity: updatedRfq.counterQuantity,
      rejectReason: updatedRfq.rejectReason,
    });
    if (updatedRfq.rfqCode) {
      saveLocalRfqOverride(updatedRfq.rfqCode, {
        id: updatedRfq.id,
        rfqCode: updatedRfq.rfqCode,
        status: updatedRfq.status as any,
        counterPrice: updatedRfq.counterPrice,
        counterQuantity: updatedRfq.counterQuantity,
        rejectReason: updatedRfq.rejectReason,
      });
    }

    const rawHistory = localStorage.getItem('b2b_rfq_history');
    if (rawHistory) {
      const history = JSON.parse(rawHistory);
      const updatedHistory = history.map((item: any) => {
        const itemNumericId =
          typeof item.id === 'number'
            ? item.id
            : parseInt(String(item.id).replace(/\D/g, ''), 10);
        if (itemNumericId === updatedRfq.id || item.rfqCode === updatedRfq.rfqCode || item.id === updatedRfq.id) {
          return {
            ...item,
            status: updatedRfq.status,
            counterPrice: updatedRfq.counterPrice ?? item.counterPrice,
            counterQuantity: updatedRfq.counterQuantity ?? item.counterQuantity,
            rejectReason: updatedRfq.rejectReason ?? item.rejectReason,
          };
        }
        return item;
      });
      localStorage.setItem('b2b_rfq_history', JSON.stringify(updatedHistory));
    }

    const rawFarmer = localStorage.getItem('b2b_farmer_rfqs');
    if (rawFarmer) {
      const farmerList = JSON.parse(rawFarmer);
      const updatedFarmer = farmerList.map((item: any) => {
        const itemNumericId =
          typeof item.id === 'number'
            ? item.id
            : parseInt(String(item.id).replace(/\D/g, ''), 10);
        if (itemNumericId === updatedRfq.id || item.rfqCode === updatedRfq.rfqCode || item.id === updatedRfq.id) {
          return {
            ...item,
            status: updatedRfq.status,
            counterPrice: updatedRfq.counterPrice ?? item.counterPrice,
            counterQuantity: updatedRfq.counterQuantity ?? item.counterQuantity,
            rejectReason: updatedRfq.rejectReason ?? item.rejectReason,
          };
        }
        return item;
      });
      localStorage.setItem('b2b_farmer_rfqs', JSON.stringify(updatedFarmer));
    }

    window.dispatchEvent(new CustomEvent('b2b_sync_event', { detail: { type: 'RFQ_UPDATED', ...updatedRfq } }));
    window.dispatchEvent(new CustomEvent('b2b_rfq_updated', { detail: updatedRfq }));
  } catch (err) {
    console.error('Error saving local RFQ update:', err);
  }
};

// 4. RFQ Negotiations
export const getFarmerRfqsApi = async (): Promise<RfqItem[]> => {
  const currentUser = getStoredFarmerUser();
  const farmerId = currentUser?.id;
  const farmerName = currentUser?.companyName || currentUser?.fullName;

  // Lấy danh sách các mã lô của nông dân này để lọc chính xác
  const userLotCodes = new Set<string>();
  if (typeof window !== 'undefined') {
    try {
      const localLotsRaw = localStorage.getItem('b2b_farmer_lots');
      if (localLotsRaw) {
        const parsedLots: HarvestLot[] = JSON.parse(localLotsRaw);
        for (const l of parsedLots) {
          if (l.lotCode) userLotCodes.add(l.lotCode.trim().toUpperCase());
        }
      }
    } catch {}
  }

  let serverRfqs: RfqItem[] = [];
  let isApiSuccess = false;

  try {
    const res = await fetch(`${API_BASE_URL}/farmer/rfq`, {
      cache: 'no-store',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data: ApiResponse<RfqItem[]> = await res.json();
      if (Array.isArray(data.result)) {
        serverRfqs = data.result;
        isApiSuccess = true;
      }
    }
  } catch {
    // fallback
  }

  // Nếu Backend API thành công: Lấy toàn bộ RFQ từ Server (đã được lọc chuẩn 100% theo farmer trong DB)
  const map = new Map<string, RfqItem>();
  for (const s of serverRfqs) {
    if (s && (s.rfqCode || s.id)) {
      const key = (s.rfqCode || String(s.id)).trim().toUpperCase();
      map.set(key, {
        ...s,
        shippingOption: (s as any).shippingOption || (s as any).shipping_option || 'farm_delivery',
        notes: s.notes || (s as any).notes || '',
      });
    }
  }

  // Nếu Backend API offline hoặc có thêm local RFQs của đúng farmer này
  const localRfqs = getLocalSubmittedRfqs(farmerId, farmerName, userLotCodes);
  for (const l of localRfqs) {
    const key = (l.rfqCode || String(l.id)).trim().toUpperCase();
    if (!map.has(key)) {
      map.set(key, l);
    }
  }

  // Áp dụng overrides từ b2b_rfq_status_overrides và shared sync cho các RFQ
  const overrides = getLocalRfqOverrides();
  const syncList = getLocalSubmittedRfqs();
  const syncAccepted = new Map<string, any>();
  for (const s of syncList) {
    if (s.status === 'ACCEPTED') {
      if (s.rfqCode) syncAccepted.set(s.rfqCode.trim().toUpperCase(), s);
      if (s.id) syncAccepted.set(String(s.id), s);
    }
  }

  const list = Array.from(map.values()).map((rfq) => {
    const key = (rfq.rfqCode || String(rfq.id)).trim().toUpperCase();
    const syncItem = syncAccepted.get(key) || syncAccepted.get(String(rfq.id));
    if (syncItem && rfq.status !== 'ACCEPTED') {
      return {
        ...rfq,
        status: 'ACCEPTED' as const,
        contractId: syncItem.contractId || rfq.contractId,
        contractCode: syncItem.contractCode || rfq.contractCode,
      };
    }
    if (serverRfqs.some((item) => item.id === rfq.id)) return rfq;
    const override =
      overrides[String(rfq.id)] ||
      (rfq.rfqCode ? overrides[rfq.rfqCode] : undefined);
    if (override) {
      return {
        ...rfq,
        status: override.status,
        counterPrice: override.counterPrice ?? rfq.counterPrice,
        counterQuantity: override.counterQuantity ?? rfq.counterQuantity,
        rejectReason: override.rejectReason ?? rfq.rejectReason,
      };
    }
    return rfq;
  });

  return list;
};

export const getFarmerRfqHistoryApi = async (id: number) => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/rfq/${id}/history`, {
      cache: 'no-store',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    const data: ApiResponse<Record<string, unknown>[]> = await res.json();
    if (!res.ok) throw new Error(data.message || 'Không thể tải lịch sử đàm phán');
    return data.result || [];
  } catch {
    return [];
  }
};

export const respondToRfqApi = async (
  rfqId: number,
  actionData: {
    action: 'ACCEPT' | 'COUNTER' | 'REJECT';
    counterPrice?: number;
    counterQuantity?: number;
    rejectReason?: string;
  }
): Promise<RfqItem> => {
  const res = await fetch(`${API_BASE_URL}/farmer/rfq/${rfqId}/respond`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(actionData),
  });
  const data: ApiResponse<RfqItem> = await res.json();
  if (!res.ok || !data.result) {
    throw new Error(data.message || 'Không thể lưu phản hồi RFQ trên máy chủ.');
  }
  return { ...data.result, syncSource: 'BACKEND' };
};

// Helper: Lưu Hợp Đồng B2B vào localStorage để bảo toàn dữ liệu
export const saveLocalContract = (contract: B2BContract) => {
  if (typeof window === 'undefined') return;
  try {
    // 1. Lưu vào b2b_farmer_contracts
    const existing: B2BContract[] = JSON.parse(localStorage.getItem('b2b_farmer_contracts') || '[]');
    const filtered = existing.filter((c) => c.id !== contract.id && c.contractCode !== contract.contractCode);
    filtered.unshift(contract);
    localStorage.setItem('b2b_farmer_contracts', JSON.stringify(filtered));

    // 2. Đồng bộ sang b2b_sync_contracts
    const syncKey = 'hona_b2b_sync_contracts_v2';
    const legacySyncKey = 'b2b_sync_contracts';
    const syncExisting: any[] = JSON.parse(
      localStorage.getItem(syncKey) || localStorage.getItem(legacySyncKey) || '[]'
    );
    const syncFiltered = syncExisting.filter((c) => c.id !== contract.id && c.contractCode !== contract.contractCode);
    const convertedToSync: B2bSyncContract = {
      id: contract.id,
      contractCode: contract.contractCode,
      rfqCode: contract.rfqCode || `RFQ-${contract.id}`,
      lotId: contract.harvestLotId,
      lotCode: contract.lotCode,
      productName: contract.productName,
      buyerName: contract.buyerName,
      buyerPhone: contract.buyerPhone || '0901234567',
      buyerCompany: contract.buyerName,
      farmerName: contract.farmName || 'HTX Nông Nghiệp Đà Lạt GAP',
      farmerPhone: '0912345678',
      farmerCompany: contract.farmName || 'HTX Nông Nghiệp Đà Lạt GAP',
      quantityKg: contract.quantity,
      agreedPricePerKg: contract.unitPrice,
      totalAmount: contract.totalAmount,
      depositAmount: contract.depositAmount,
      remainingAmount: (contract.totalAmount || 0) - (contract.depositAmount || 0),
      depositStatus: contract.depositStatus === 'DEPOSIT_PAID' ? 'DEPOSIT_PAID' : 'WAITING_DEPOSIT',
      fulfillmentStep: contract.fulfillmentStatus === 'COMPLETED' ? 6 : contract.fulfillmentStatus === 'IN_TRANSIT' ? 3 : contract.fulfillmentStatus === 'HUB_DELIVERED' ? 4 : contract.fulfillmentStatus === 'HARVESTING' ? 2 : 1,
      fulfillmentStatusName: contract.fulfillmentStatus || 'Chờ Buyer Đặt Cọc 30% Escrow',
      truckLicensePlate: '49C-198.86 (Xe Thùng Lạnh)',
      truckDriverName: 'Tài xế Nguyễn Văn Tài',
      truckDriverPhone: '0944556677',
      truckTempCurrent: 4.0,
      deliveryAddress: contract.hubName || 'Trạm Trung Chuyển Đức Trọng',
      deliveryTimeSlot: '06:00 - 09:00',
      finalPaidStatus: contract.settlementId ? 'PAID' : 'UNPAID',
      createdAt: contract.createdAt || new Date().toISOString(),
    };
    syncFiltered.unshift(convertedToSync);
    localStorage.setItem(syncKey, JSON.stringify(syncFiltered));
    // Dọn kho key cũ để Buyer/Farmer không đọc hai bản khác nhau.
    localStorage.removeItem(legacySyncKey);

    window.dispatchEvent(new CustomEvent('b2b_sync_event', { detail: { type: 'CONTRACT_CREATED', contract: convertedToSync } }));
    window.dispatchEvent(new CustomEvent('b2b_contract_updated', { detail: convertedToSync }));
  } catch {}
};

// 5. Contracts & QC
export const getFarmerContractsFromServer = async (): Promise<B2BContract[]> => {
  const res = await fetch(`${API_BASE_URL}/farmer/contracts`, {
    cache: 'no-store', credentials: 'include', headers: getAuthHeaders(),
  });
  const data: ApiResponse<B2BContract[]> = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể tải hợp đồng từ máy chủ');
  return data.result || [];
};

export const startFarmerHarvest = async (id: number): Promise<B2BContract> => {
  const res = await fetch(`${API_BASE_URL}/farmer/contracts/${id}/start-harvest`, {
    method: 'POST', credentials: 'include', headers: getAuthHeaders(), body: '{}',
  });
  const data: ApiResponse<B2BContract> = await res.json();
  if (!res.ok || !data.result) throw new Error(data.message || 'Không thể bắt đầu thu hoạch');
  return data.result;
};

export const updateContractFulfillmentStatusApi = async (id: number, status: string): Promise<B2BContract> => {
  const res = await fetch(`${API_BASE_URL}/farmer/contracts/${id}/fulfillment-status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  const data: ApiResponse<B2BContract> = await res.json();
  if (!res.ok || !data.result) throw new Error(data.message || 'Không thể cập nhật tiến trình');
  return data.result;
};

export const getFarmerContractsApi = async (): Promise<B2BContract[]> => {
  const contractMap = new Map<string, B2BContract>();

  // 1. Thử tải từ Backend API
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/contracts`, {
      cache: 'no-store',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data: ApiResponse<any[]> = await res.json();
      const serverContracts = data.result || [];
      if (Array.isArray(serverContracts)) {
        for (const sc of serverContracts) {
          const code = (sc.contractCode || `HD-${sc.id}`).trim().toUpperCase();
          contractMap.set(code, {
            id: Number(sc.id),
            contractCode: sc.contractCode,
            rfqId: Number(sc.rfqId || sc.id),
            rfqCode: sc.rfqCode || `RFQ-${sc.id}`,
            harvestLotId: Number(sc.harvestLotId || sc.lotId || 1),
            lotCode: sc.lotCode || 'LOT-2026-DL-001',
            productName: sc.productName || 'Nông sản VietGAP',
            buyerName: sc.buyerName || 'Khách Mua B2B',
            buyerPhone: sc.buyerPhone || '0901234567',
            quantity: Number(sc.quantity || sc.quantityKg || 1000),
            unitPrice: Number(sc.unitPrice || sc.agreedPricePerKg || 15000),
            totalAmount: Number(sc.totalAmount || 0),
            depositAmount: Number(sc.depositAmount || 0),
            status: sc.status,
            depositStatus: sc.depositStatus || 'WAITING_DEPOSIT',
            fulfillmentStatus: sc.fulfillmentStatus || 'WAITING_HARVEST',
            fulfillmentStep: sc.fulfillmentStep,
            fulfillmentStatusName: sc.fulfillmentStatusName,
            remainingPaymentStatus: sc.remainingPaymentStatus,
            remainingAmount: sc.remainingAmount,
            settledAt: sc.settledAt,
            payoutAmount: sc.payoutAmount,
            farmerPayoutAmount: sc.farmerPayoutAmount,
            epodDeliveredWeightKg: sc.epodDeliveredWeightKg,
            epodDeliveredAt: sc.epodDeliveredAt,
            packagingApproved: sc.packagingApproved,
            hubName: sc.hubName || sc.deliveryAddress || 'Trạm Trung Chuyển Đức Trọng',
            hubDeliveryDate: sc.hubDeliveryDate || sc.deliveryTimeSlot || new Date().toISOString().slice(0, 10),
            createdAt: sc.createdAt || new Date().toISOString(),
            hasQc: true,
          } as B2BContract);
        }
        return Array.from(contractMap.values());
      }
    }
  } catch {}

  // 3. Tải từ LocalStorage (b2b_sync_contracts & b2b_farmer_contracts)
  if (typeof window !== 'undefined') {
    try {
      const syncList = getSyncContracts();
      for (const sc of syncList) {
        const code = (sc.contractCode || `HD-${sc.id}`).trim().toUpperCase();
        if (!contractMap.has(code)) {
          contractMap.set(code, {
            id: sc.id,
            contractCode: sc.contractCode,
            rfqId: sc.id,
            rfqCode: sc.rfqCode || `RFQ-${sc.id}`,
            harvestLotId: sc.lotId,
            lotCode: sc.lotCode,
            productName: sc.productName,
            buyerName: sc.buyerCompany ? `${sc.buyerName} (${sc.buyerCompany})` : sc.buyerName,
            buyerPhone: sc.buyerPhone,
            quantity: sc.quantityKg,
            unitPrice: sc.agreedPricePerKg,
            totalAmount: sc.totalAmount,
            depositAmount: sc.depositAmount,
            depositStatus: sc.depositStatus,
            fulfillmentStatus: sc.fulfillmentStep === 6 ? 'COMPLETED' : sc.fulfillmentStep >= 4 ? 'HUB_DELIVERED' : 'WAITING_HARVEST',
            hubName: sc.deliveryAddress,
            hubDeliveryDate: sc.deliveryTimeSlot || (sc.createdAt ? sc.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
            createdAt: sc.createdAt,
            hasQc: true,
            fulfillmentStep: sc.fulfillmentStep,
            finalPaidStatus: sc.finalPaidStatus,
          } as unknown as B2BContract);
        }
      }

      const farmerList: B2BContract[] = JSON.parse(localStorage.getItem('b2b_farmer_contracts') || '[]');
      for (const fc of farmerList) {
        const code = (fc.contractCode || `HD-${fc.id}`).trim().toUpperCase();
        if (!contractMap.has(code)) {
          contractMap.set(code, fc);
        }
      }
    } catch {}
  }

  const result = Array.from(contractMap.values());
  return result.length > 0 ? result : FALLBACK_CONTRACTS;
};

export const getContractQcApi = async (
  contractId: number,
  contractInfo?: B2BContract
): Promise<QcInspection | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/contracts/${contractId}/qc`, {
      cache: 'no-store',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data: ApiResponse<QcInspection> = await res.json();
      if (data.result) return data.result;
    }
  } catch {
    // ignore
  }

  // 1. Kiểm tra từ bản đồ mẫu theo ID
  if (FALLBACK_QC_MAP[contractId]) {
    return FALLBACK_QC_MAP[contractId];
  }

  // 2. Nếu có thông tin hợp đồng được truyền vào (Hợp đồng mới tạo sau khi chốt RFQ)
  if (contractInfo) {
    const gross = contractInfo.quantity || 3000;
    const net = Math.round(gross * 0.975);
    const rejected = gross - net;
    const isTomato = contractInfo.productName.toLowerCase().includes('cà chua');
    const isLettuce = contractInfo.productName.toLowerCase().includes('xà lách');

    return {
      id: contractId,
      contractId: contractInfo.id,
      contractCode: contractInfo.contractCode,
      productName: contractInfo.productName,
      inspectorName: isTomato
        ? 'Lê Hồng Quân (Kỹ sư Kiểm định Trạm Đơn Dương)'
        : 'Nguyễn Văn Thành (Kỹ sư Kiểm định Trạm Đức Trọng)',
      inspectedAt: contractInfo.createdAt || new Date().toISOString(),
      grossWeight: gross,
      netQualifiedWeight: net,
      rejectedWeight: rejected,
      qualifiedPercent: 97.5,
      brixScore: isTomato ? 5.8 : isLettuce ? 4.5 : 12.8,
      moisturePercent: isTomato ? 93.0 : isLettuce ? 95.2 : 85.2,
      qcNotes: `Biên bản kiểm tra nghiệm thu lô ${contractInfo.productName} đạt chuẩn VietGAP xuất trạm. Nhiệt độ tâm sản phẩm đo đạt chuẩn yêu cầu lưu kho xe lạnh B2B. Đạt điều kiện bàn giao thương lái.`,
      samplePhotoUrl: isTomato
        ? 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600'
        : isLettuce
        ? 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600'
        : 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600',
    };
  }

  return {
    id: contractId,
    contractId,
    contractCode: `HD-2026-${contractId}`,
    productName: 'Lô nông sản B2B',
    inspectorName: 'Kỹ sư Trạm Kiểm Định HoNa Fresh',
    inspectedAt: new Date().toISOString(),
    grossWeight: 1000,
    netQualifiedWeight: 1000,
    rejectedWeight: 0,
    qualifiedPercent: 100,
    brixScore: 10.0,
    moisturePercent: 88.0,
    qcNotes: 'Biên bản kiểm tra nghiệm thu đạt chuẩn.',
    samplePhotoUrl: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600',
  };
};

// 6. Settlements & Form 01/TNDN (Chỉ lấy dữ liệu thật từ Backend cho các đơn đã được Sàn giải ngân SETTLED)
export const getFarmerSettlementsApi = async (): Promise<Settlement[]> => {
  const result: Settlement[] = [];
  const seenContractCodes = new Set<string>();

  try {
    const res = await fetch(`${API_BASE_URL}/farmer/settlements`, {
      cache: 'no-store',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data: ApiResponse<Settlement[]> = await res.json();
      if (Array.isArray(data?.result)) {
        for (const s of data.result) {
          result.push({
            ...s,
            qualifiedWeight: Number(s.qualifiedWeight || 0),
            unitPrice: Number(s.unitPrice || 0),
            grossAmount: Number(s.grossAmount || 0),
            platformFeePercent: Number(s.platformFeePercent || 2.5),
            platformFee: Number(s.platformFee || 0),
            payoutAmount: Number(s.payoutAmount || 0),
          });
          if (s.contractCode) seenContractCodes.add(s.contractCode.trim().toUpperCase());
        }
      }
    }
  } catch {}

  try {
    const serverContracts = await getFarmerContractsFromServer();
    for (const c of serverContracts) {
      const statusUpper = String(c.status || '').toUpperCase();
      const isSettled = statusUpper === 'SETTLED' || statusUpper === 'COMPLETED';
      const codeKey = String(c.contractCode || '').trim().toUpperCase();
      if (!isSettled || (codeKey && seenContractCodes.has(codeKey))) continue;

      const gross = Number((c as any).totalGoodsAmount || (c.quantity || 0) * (c.unitPrice || 0));
      const feeRate = Number((c as any).platformFeeRate || 2.5);
      const fee = Math.round((gross * feeRate) / 100);
      const payout = Number((c as any).farmerPayoutAmount || (c as any).payoutAmount || Math.max(0, gross - fee));

      result.push({
        id: c.id,
        settlementCode: `STL-2026-${c.id}`,
        contractId: c.id,
        contractCode: c.contractCode,
        productName: c.productName,
        qualifiedWeight: c.epodDeliveredWeightKg || c.quantity,
        unitPrice: c.unitPrice,
        grossAmount: gross,
        platformFeePercent: feeRate,
        platformFee: fee,
        payoutAmount: payout,
        bankName: (c as any).farmerBankName || 'Vietcombank - CN Lâm Đồng',
        bankAccount: (c as any).farmerBankAccount || '0071001284920',
        bankAccountName: (c as any).farmerBankOwner || 'HTX NONG NGHIEP DA LAT GAP',
        bankReference: (c as any).payoutRef || (c as any).bankTransferRef || `VCB-B2B-${c.id}`,
        isPaid: true,
        paidAt: (c as any).settledAt || c.createdAt,
        taxFormType: 'FORM_01_TNDN',
        createdAt: c.createdAt,
      });
    }
  } catch {}

  return result;
};

export const getPdf01TndnUrl = (settlementId: number): string => {
  return `${API_BASE_URL}/farmer/settlements/${settlementId}/pdf-01-tndn`;
};

export const getInvoiceKctUrl = (settlementId: number): string => {
  return `${API_BASE_URL}/farmer/settlements/${settlementId}/invoice-kct`;
};

// 7. Gửi Yêu Cầu Báo Giá Sỉ (RFQ) hoặc Đặt Cọc 30% Công Khai từ Trang Chủ
export const submitPublicRfqOrDepositApi = async (reqData: any): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/rfq/public-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData),
    });
    if (res.ok) {
      const data = await res.json();
      return data.result;
    }
  } catch (err) {
    console.warn('API error, falling back to local sync:', err);
  }

  // Fallback sync to localStorage
  if (typeof window !== 'undefined') {
    const code = `RFQ-${Math.floor(100000 + Math.random() * 900000)}`;
    const newEntry = {
      id: Date.now(),
      rfqCode: code,
      harvestLotId: reqData.harvestLotId || 1,
      harvestLotCode: reqData.harvestLotCode || 'LOT-2026-DL-001',
      productName: reqData.productName || 'Nông sản VietGAP',
      buyerName: reqData.buyerName,
      buyerPhone: reqData.buyerPhone,
      buyerCompany: reqData.buyerCompany || `Vựa Nông Sản ${reqData.buyerName}`,
      requestedQuantity: reqData.requestedQuantity,
      targetPrice: reqData.targetPrice,
      deliveryDate: reqData.deliveryDate || new Date().toISOString().slice(0, 10),
      hubLocation: reqData.hubLocation || 'Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM',
      status: reqData.isDepositPaid ? 'ACCEPTED' : 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const submitted = JSON.parse(localStorage.getItem('b2b_submitted_rfqs') || '[]');
    submitted.unshift(newEntry);
    localStorage.setItem('b2b_submitted_rfqs', JSON.stringify(submitted));

    // Nếu đã cọc 30%, sinh hợp đồng B2B luôn
    if (reqData.isDepositPaid) {
      const contractCode = `HD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalAmount = reqData.requestedQuantity * reqData.targetPrice;
      const depositAmount = reqData.depositAmount || totalAmount * 0.3;
      const newContract: B2BContract = {
        id: Date.now(),
        contractCode,
        rfqId: newEntry.id,
        rfqCode: code,
        harvestLotId: newEntry.harvestLotId,
        lotCode: newEntry.harvestLotCode,
        productName: newEntry.productName,
        buyerName: reqData.buyerName,
        buyerPhone: reqData.buyerPhone,
        quantity: reqData.requestedQuantity,
        unitPrice: reqData.targetPrice,
        totalAmount,
        depositAmount,
        depositStatus: 'DEPOSIT_PAID',
        fulfillmentStatus: 'WAITING_HARVEST',
        depositPaidAt: new Date().toISOString(),
        hubDeliveryDate: newEntry.deliveryDate,
        hubName: newEntry.hubLocation,
        createdAt: new Date().toISOString(),
        hasQc: true,
      };
      saveLocalContract(newContract);
    }

    window.dispatchEvent(new Event('b2b_rfq_updated'));
    return newEntry;
  }
};

// 8. Quyết toán và giải ngân hợp đồng về tài khoản ngân hàng
export const settleContractApi = async (contractId: number): Promise<Settlement> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/contracts/${contractId}/settle`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      return data.result;
    }
  } catch (err) {
    console.warn('API error settling contract:', err);
  }

  // Fallback local settlement
  const settlements = await getFarmerSettlementsApi();
  const contracts = await getFarmerContractsApi();
  const c = contracts.find((item) => item.id === contractId) || contracts[0];
  const gross = c ? c.totalAmount : 40500000;
  const fee = gross * 0.03;
  const payout = gross - fee;

  const newStl: Settlement = {
    id: Date.now(),
    settlementCode: `STL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    contractId,
    contractCode: c ? c.contractCode : 'HD-2026-0089',
    productName: c ? c.productName : 'Nông sản VietGAP',
    qualifiedWeight: c ? c.quantity * 0.98 : 3000,
    unitPrice: c ? c.unitPrice : 13500,
    grossAmount: gross,
    platformFeePercent: 3.0,
    platformFee: fee,
    payoutAmount: payout,
    bankAccount: '5400205219999',
    bankName: 'Agribank',
    bankAccountName: 'HTX RAU SACH DA LAT GAP',
    bankReference: `FT${Math.floor(Date.now() / 1000)}`,
    isPaid: true,
    paidAt: new Date().toISOString(),
    taxFormType: 'FORM_01_TNDN',
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    const localSettlements = JSON.parse(localStorage.getItem('farmer_local_settlements') || '[]');
    localSettlements.unshift(newStl);
    localStorage.setItem('farmer_local_settlements', JSON.stringify(localSettlements));
  }

  return newStl;
};

// 9. Tra cứu Hợp Đồng B2B công khai cho Thương Lái (theo Mã Hợp Đồng hoặc SĐT)
export const trackB2bContractsApi = async (query: string): Promise<B2BContract[]> => {
  const clean = query.trim();
  if (!clean) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/farmer/contracts/track?query=${encodeURIComponent(clean)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data: ApiResponse<B2BContract[]> = await res.json();
      if (data.result && data.result.length > 0) {
        return data.result;
      }
    }
  } catch (err) {
    console.warn('API track B2B contracts error, falling back to local search:', err);
  }

  // Fallback tìm kiếm trong localStorage và Fallback contracts
  const allContracts = await getFarmerContractsApi();
  const qLower = clean.toLowerCase();
  return allContracts.filter((c) => {
    const codeMatch = c.contractCode?.toLowerCase().includes(qLower);
    const phoneMatch = c.buyerPhone?.replace(/\D/g, '').includes(clean.replace(/\D/g, ''));
    const buyerMatch = c.buyerName?.toLowerCase().includes(qLower);
    return codeMatch || phoneMatch || buyerMatch;
  });
};

// 10. Nông dân Cập nhật Lịch Hẹn Giao Trạm Trung Chuyển (Cross-docking Hub)
export const updateDeliveryScheduleApi = async (
  contractId: number,
  schedule: {
    hubDeliveryDate: string;
    hubName: string;
    timeSlot?: string;
    truckType?: string;
    notes?: string;
  }
): Promise<B2BContract> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/contracts/${contractId}/delivery-schedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(schedule),
    });
    const data: ApiResponse<B2BContract> = await res.json();
    if (res.ok && data.code === 200 && data.result) {
      saveLocalContract(data.result);
      return data.result;
    }
  } catch (err) {
    console.warn('API update delivery schedule error, fallback local:', err);
  }

  const contracts = await getFarmerContractsApi();
  const found = contracts.find((c) => c.id === contractId);
  const updated: B2BContract = {
    ...(found || FALLBACK_CONTRACTS[0]),
    id: contractId,
    hubDeliveryDate: schedule.hubDeliveryDate,
    hubName: schedule.hubName,
    deliveryTimeSlot: schedule.timeSlot,
    truckType: schedule.truckType,
    deliveryNotes: schedule.notes,
    fulfillmentStatus: 'HARVESTING',
  };
  saveLocalContract(updated);
  return updated;
};

// 11. Helper lấy URL in Hợp Đồng B2B Điện Tử
export const getContractPrintUrl = (contractId: number): string => {
  return `${API_BASE_URL}/farmer/contracts/${contractId}/print`;
};

export interface FarmerB2bReview {
  id: number;
  contractId: number;
  reviewerRole: 'BUYER' | 'FARMER';
  reviewerName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt?: string;
}

export const getFarmerReviewsApi = async (contractId: number): Promise<FarmerB2bReview[]> => {
  const res = await fetch(`${API_BASE_URL}/farmer/contracts/${contractId}/reviews`, {
    cache: 'no-store', credentials: 'include', headers: getAuthHeaders(),
  });
  const data: ApiResponse<FarmerB2bReview[]> = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể tải đánh giá giao dịch');
  return data.result || [];
};

export const submitFarmerReviewApi = async (contractId: number, request: { rating: number; comment?: string }): Promise<FarmerB2bReview> => {
  const res = await fetch(`${API_BASE_URL}/farmer/contracts/${contractId}/reviews`, {
    method: 'POST', cache: 'no-store', credentials: 'include',
    headers: getAuthHeaders(), body: JSON.stringify(request),
  });
  const data: ApiResponse<FarmerB2bReview> = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể lưu đánh giá giao dịch');
  return data.result;
};


// 12. Lấy Cây Phân Bổ Sản Lượng của Lô Hàng (Post-sale Allocation Tree)
export const getLotAllocationApi = async (lotId: number): Promise<HarvestLotAllocation | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/harvest-lots/${lotId}/allocation`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    const data: ApiResponse<HarvestLotAllocation> = await res.json();
    if (res.ok && data.code === 200 && data.result) {
      return data.result;
    }
  } catch (err) {
    // fallback
  }

  if (typeof window !== 'undefined') {
    try {
      const syncContracts = getSyncContracts();
      const matched = syncContracts.filter((c) => c.lotId === lotId || !lotId || lotId === 1);
      const lotContracts = matched.length > 0 ? matched : syncContracts;
      const totalAllocatedKg = lotContracts.reduce((s, c) => s + c.quantityKg, 0);
      const totalWeightKg = Math.max(10000, totalAllocatedKg + 2000);
      const availableKg = Math.max(0, totalWeightKg - totalAllocatedKg);

      return {
        lotId,
        lotCode: lotContracts[0]?.lotCode || 'LOT-2026-DL-001',
        productName: lotContracts[0]?.productName || 'Nông Sản VietGAP HoNa Fresh',
        totalWeightKg,
        allocatedWeightKg: totalAllocatedKg,
        availableWeightKg: availableKg,
        soldPercentage: Math.round((totalAllocatedKg / totalWeightKg) * 100),
        status: 'ACTIVE',
        allocations: lotContracts.map((c) => ({
          contractId: c.id,
          contractCode: c.contractCode,
          buyerName: c.buyerCompany ? `${c.buyerName} (${c.buyerCompany})` : c.buyerName,
          buyerPhone: c.buyerPhone,
          quantityKg: c.quantityKg,
          unitPrice: c.agreedPricePerKg,
          totalAmount: c.totalAmount,
          depositStatus: c.depositStatus,
          fulfillmentStatus:
            c.fulfillmentStep === 6
              ? 'COMPLETED'
              : c.fulfillmentStep === 5
              ? 'EPOD_SIGNED'
              : c.fulfillmentStep === 4
              ? 'HUB_DELIVERED'
              : c.fulfillmentStep === 3
              ? 'IN_TRANSIT'
              : c.fulfillmentStep === 2
              ? 'HARVESTING'
              : 'WAITING_DEPOSIT',
          destinationWarehouse: c.deliveryAddress,
          deliveryDate: c.deliveryTimeSlot || (c.createdAt ? c.createdAt.slice(0, 10) : '2026-10-28'),
          shipmentCode: `SHP-2026-00${c.id}`,
          shipmentStatus: c.fulfillmentStep === 6 ? 'COMPLETED' : 'IN_TRANSIT',
        })),
      };
    } catch {}
  }

  return null;
};

// 13. Lấy Dữ Liệu Cảm Biến Chuỗi Lạnh Xe Lạnh IoT (Cold-chain Telemetry)
export const getColdChainTelemetryApi = async (contractId: number): Promise<ColdChainTelemetry | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/contracts/${contractId}/telemetry`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    const data: ApiResponse<ColdChainTelemetry> = await res.json();
    if (res.ok && data.code === 200 && data.result) {
      return data.result;
    }
  } catch (err) {
    console.warn('API getColdChainTelemetry error:', err);
  }
  return null;
};

// 14. Lấy Bằng Chứng Giao Hàng Điện Tử ePOD & Giám Định Hao Hụt
export const getDeliveryProofApi = async (contractId: number): Promise<DeliveryProof | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/contracts/${contractId}/delivery-proof`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    const data: ApiResponse<DeliveryProof> = await res.json();
    if (res.ok && data.code === 200 && data.result) {
      return data.result;
    }
  } catch (err) {
    console.warn('API getDeliveryProof error:', err);
  }
  return null;
};

// 15. Lấy Dữ Liệu Tem Truy Xuất Nguồn Gốc Công Khai (Public QR Trace)
export const getLotTraceApi = async (lotCode: string): Promise<LotTrace | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/trace/lot/${lotCode}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data: ApiResponse<LotTrace> = await res.json();
    if (res.ok && data.code === 200 && data.result) {
      return data.result;
    }
  } catch (err) {
    console.warn('API getLotTrace error:', err);
  }
  return null;
};
