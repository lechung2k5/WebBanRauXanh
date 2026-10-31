import {
  ApiResponse,
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

export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('xanhfarm_user') || sessionStorage.getItem('xanhfarm_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.token) {
          headers['Authorization'] = `Bearer ${u.token}`;
        }
      }
    } catch {
      // ignore
    }
  }
  return headers;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

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

export const FALLBACK_RFQS: RfqItem[] = [
  {
    id: 1,
    rfqCode: 'RFQ-2026-0891',
    harvestLotId: 1,
    harvestLotCode: 'LOT-2026-DL-001',
    productName: 'Bắp Cải Trái Tim Đà Lạt VietGAP',
    buyerName: 'Anh Trần Quốc Bảo (Chợ Đầu Mối Thủ Đức)',
    buyerPhone: '0908.776.889',
    buyerCompany: 'Vựa Rau Củ Bảo Phát - Ô B12 Chợ Đầu Mối Thủ Đức',
    requestedQuantity: 4000,
    targetPrice: 11500,
    deliveryDate: '2026-10-28',
    hubLocation: 'Trạm Lạnh Đức Trọng',
    status: 'PENDING',
    createdAt: '2026-10-26T07:15:00',
  },
  {
    id: 2,
    rfqCode: 'RFQ-2026-0892',
    harvestLotId: 2,
    harvestLotCode: 'LOT-2026-DL-002',
    productName: 'Cà Chua Beef Xuất Khẩu Chuẩn GlobalGAP',
    buyerName: 'Chị Mai Lan (Thu Mua Hệ Thống)',
    buyerPhone: '0918.234.567',
    buyerCompany: 'Chuỗi Cung Ứng Nông Sản Sạch Miền Nam',
    requestedQuantity: 2500,
    targetPrice: 18500,
    deliveryDate: '2026-10-29',
    hubLocation: 'Trạm Lạnh Đơn Dương',
    status: 'PENDING',
    createdAt: '2026-10-26T08:00:00',
  },
  {
    id: 3,
    rfqCode: 'RFQ-2026-0888',
    harvestLotId: 1,
    harvestLotCode: 'LOT-2026-DL-001',
    productName: 'Bắp Cải Trái Tim Đà Lạt VietGAP',
    buyerName: 'Nguyễn Văn Nam (Trưởng bộ phận Thu mua B2B)',
    buyerPhone: '0933.112.233',
    buyerCompany: 'Hệ Thống Siêu Thị Nông Sản B2B Việt Nam',
    requestedQuantity: 5000,
    targetPrice: 11000,
    deliveryDate: '2026-10-28',
    hubLocation: 'Trạm Lạnh Đức Trọng',
    status: 'ACCEPTED',
    createdAt: '2026-10-25T14:20:00',
  },
];

export const FALLBACK_CONTRACTS: B2BContract[] = [
  {
    id: 1,
    contractCode: 'HD-2026-B2B-0104',
    rfqId: 3,
    rfqCode: 'RFQ-2026-0888',
    harvestLotId: 1,
    lotCode: 'LOT-2026-DL-001',
    productName: 'Bắp Cải Trái Tim Đà Lạt VietGAP',
    buyerName: 'Vựa Rau Củ Bảo Phát - Chợ Đầu Mối Thủ Đức',
    buyerPhone: '0908.776.889',
    quantity: 5000,
    unitPrice: 11000,
    totalAmount: 55000000,
    depositAmount: 16500000,
    depositStatus: 'DEPOSIT_PAID',
    fulfillmentStatus: 'HUB_DELIVERED',
    hubName: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    hubDeliveryDate: '2026-10-28',
    createdAt: '2026-10-25T15:00:00',
    hasQc: true,
  },
  {
    id: 2,
    contractCode: 'HD-2026-B2B-0098',
    rfqId: 2,
    rfqCode: 'RFQ-2026-0870',
    harvestLotId: 2,
    lotCode: 'LOT-2026-DL-002',
    productName: 'Cà Chua Beef Xuất Khẩu Chuẩn GlobalGAP',
    buyerName: 'Chuỗi Cung Ứng Nông Sản Sạch Miền Nam',
    buyerPhone: '0918.234.567',
    quantity: 2000,
    unitPrice: 19500,
    totalAmount: 39000000,
    depositAmount: 11700000,
    depositStatus: 'DEPOSIT_PAID',
    fulfillmentStatus: 'COMPLETED',
    hubName: 'Trạm Lạnh Cross-docking Đơn Dương, Lâm Đồng',
    hubDeliveryDate: '2026-10-24',
    createdAt: '2026-10-23T09:30:00',
    hasQc: true,
  },
];

export const FALLBACK_QC: QcInspection = {
  id: 1,
  contractId: 1,
  contractCode: 'HD-2026-B2B-0104',
  productName: 'Bắp Cải Trái Tim Đà Lạt VietGAP',
  inspectorName: 'Nguyễn Văn Thành (Kỹ sư Kiểm định Trạm Đức Trọng)',
  inspectedAt: '2026-10-26T08:30:00',
  grossWeight: 5000,
  netQualifiedWeight: 4850,
  rejectedWeight: 150,
  qualifiedPercent: 97.0,
  brixScore: 12.8,
  moisturePercent: 85.2,
  qcNotes: 'Bắp cuộn chắc, tươi giòn tự nhiên, phế phẩm dập cuống 3.0% đã được tách loại tại chỗ. Nhiệt độ tâm sản phẩm đo đạt 4.2°C, đáp ứng đầy đủ điều kiện lưu kho lạnh xe B2B.',
  samplePhotoUrl: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600',
};

export const FALLBACK_QC_MAP: Record<number, QcInspection> = {
  1: FALLBACK_QC,
  2: {
    id: 2,
    contractId: 2,
    contractCode: 'HD-2026-B2B-0098',
    productName: 'Cà Chua Beef Xuất Khẩu Chuẩn GlobalGAP',
    inspectorName: 'Lê Hồng Quân (Kỹ sư Kiểm định Trạm Đơn Dương)',
    inspectedAt: '2026-10-24T10:15:00',
    grossWeight: 2000,
    netQualifiedWeight: 1940,
    rejectedWeight: 60,
    qualifiedPercent: 97.0,
    brixScore: 5.8,
    moisturePercent: 93.5,
    qcNotes: 'Quả thu hoạch ở độ chín hường 25-30% đạt chuẩn xuất khẩu. Vỏ bóng chắc, tai xanh tươi. Nhiệt độ tâm quả đo đạt 11.2°C, phù hợp xe lạnh 10°C - 12°C chống tổn thương lạnh.',
    samplePhotoUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600',
  },
};

export const FALLBACK_SETTLEMENTS: Settlement[] = [
  {
    id: 1,
    settlementCode: 'STL-2026-10-0042',
    contractId: 1,
    contractCode: 'HD-2026-B2B-0104',
    productName: 'Bắp Cải Trái Tim Đà Lạt VietGAP',
    qualifiedWeight: 4850,
    unitPrice: 11000,
    grossAmount: 53350000,
    platformFeePercent: 3.0,
    platformFee: 1600500,
    payoutAmount: 51749500,
    bankName: 'Vietcombank - CN Lâm Đồng',
    bankAccount: '0071001284920',
    bankAccountName: 'HTX NONG NGHIEP DA LAT GAP',
    bankReference: 'VCB-B2B-984210',
    isPaid: true,
    paidAt: '2026-10-26T10:15:00',
    taxFormType: 'FORM_01_TNDN',
    createdAt: '2026-10-26T10:15:00',
  },
  {
    id: 2,
    settlementCode: 'STL-2026-10-0038',
    contractId: 2,
    contractCode: 'HD-2026-B2B-0098',
    productName: 'Cà Chua Beef Xuất Khẩu Chuẩn GlobalGAP',
    qualifiedWeight: 1940,
    unitPrice: 19500,
    grossAmount: 37830000,
    platformFeePercent: 3.0,
    platformFee: 1134900,
    payoutAmount: 36695100,
    bankName: 'Vietcombank - CN Lâm Đồng',
    bankAccount: '0071001284920',
    bankAccountName: 'HTX NONG NGHIEP DA LAT GAP',
    bankReference: 'VCB-B2B-772190',
    isPaid: true,
    paidAt: '2026-10-24T16:45:00',
    taxFormType: 'FORM_01_TNDN',
    createdAt: '2026-10-24T16:45:00',
  },
];

// ================= API CALLS (KÈM FALLBACK KHÔNG BAO GIỜ BỊ RỖNG) =================

// 1. Dashboard Stats
export const getFarmerStatsApi = async (): Promise<FarmerStats> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/dashboard/stats`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const data: ApiResponse<FarmerStats> = await res.json();
      if (data.result) return data.result;
    }
  } catch {
    // fallback tính động
  }

  let totalRev = 51749500;
  let escrow = 16500000;
  let openLots = 3;
  let runningContracts = 1;
  let pendingRfqs = 2;

  if (typeof window !== 'undefined') {
    try {
      const localLots: HarvestLot[] = JSON.parse(localStorage.getItem('b2b_farmer_lots') || '[]');
      const localContracts: B2BContract[] = JSON.parse(localStorage.getItem('b2b_farmer_contracts') || '[]');
      const localRfqs = getLocalSubmittedRfqs();
      const overrides = getLocalRfqOverrides();

      openLots = Math.max(3, 3 + localLots.length);
      runningContracts = Math.max(1, 1 + localContracts.length);

      const contractsTotal = localContracts.reduce((s, c) => s + (c.totalAmount || 0), 0);
      const contractsDeposit = localContracts.reduce((s, c) => s + (c.depositAmount || 0), 0);
      totalRev += contractsTotal;
      escrow += contractsDeposit;

      // Đếm số RFQ PENDING còn lại
      const seenRfqKeys = new Set<string>();
      let pendingCount = 0;
      const allRfqs = [...localRfqs, ...FALLBACK_RFQS];
      for (const r of allRfqs) {
        const key = r.rfqCode || String(r.id);
        if (seenRfqKeys.has(key)) continue;
        seenRfqKeys.add(key);

        const ov = overrides[String(r.id)] || (r.rfqCode ? overrides[r.rfqCode] : undefined);
        const finalStatus = ov ? ov.status : r.status;
        if (finalStatus === 'PENDING') {
          pendingCount++;
        }
      }
      pendingRfqs = pendingCount;
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
    });
    if (!res.ok) throw new Error('Không thể tải thông tin hồ sơ nông dân');
    const data: ApiResponse<FarmerProfile> = await res.json();
    return data.result || FALLBACK_FARMER_PROFILE;
  } catch {
    return FALLBACK_FARMER_PROFILE;
  }
};

export const updateFarmerProfileApi = async (profileData: Partial<FarmerProfile>): Promise<FarmerProfile> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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

// Helper: Lưu Lô Vụ Mùa vào localStorage để bảo toàn dữ liệu
export const saveLocalLot = (lot: HarvestLot) => {
  if (typeof window === 'undefined') return;
  try {
    const existing: HarvestLot[] = JSON.parse(localStorage.getItem('b2b_farmer_lots') || '[]');
    const filtered = existing.filter((l) => l.id !== lot.id && l.lotCode !== lot.lotCode);
    filtered.unshift(lot);
    localStorage.setItem('b2b_farmer_lots', JSON.stringify(filtered));
  } catch {}
};

// 3. Harvest Lots
export const getFarmerHarvestLotsApi = async (): Promise<HarvestLot[]> => {
  let localLots: HarvestLot[] = [];
  if (typeof window !== 'undefined') {
    try {
      localLots = JSON.parse(localStorage.getItem('b2b_farmer_lots') || '[]');
    } catch {}
  }

  let serverLots = FALLBACK_HARVEST_LOTS;
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/harvest-lots`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const data: ApiResponse<HarvestLot[]> = await res.json();
      if (data.result && data.result.length > 0) {
        serverLots = data.result;
      }
    }
  } catch {
    // fallback
  }

  // Kết hợp Lô người dùng vừa tạo với Lô mặc định (Lô vừa tạo lên đầu)
  const seenCodes = new Set<string>();
  const merged: HarvestLot[] = [];

  for (const lot of [...localLots, ...serverLots]) {
    const key = lot.lotCode || String(lot.id);
    if (!seenCodes.has(key)) {
      seenCodes.add(key);
      let parsedTier = lot.tierPricing;
      if (!parsedTier && lot.tierPricingJson) {
        try {
          parsedTier = JSON.parse(lot.tierPricingJson);
        } catch {}
      }
      merged.push({ ...lot, tierPricing: parsedTier });
    }
  }

  return merged;
};

export const createHarvestLotApi = async (lotData: {
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
}): Promise<HarvestLot> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/harvest-lots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(lotData),
    });
    const data: ApiResponse<HarvestLot> = await res.json();
    if (res.ok && data.code === 200 && data.result) {
      saveLocalLot(data.result);
      return data.result;
    }
  } catch (err: unknown) {
    console.warn('Backend API create lot error, generating mock lot:', err);
  }

  const mockLot: HarvestLot = {
    id: Date.now(),
    lotCode: `LOT-2026-DL-${Math.floor(100 + Math.random() * 900)}`,
    farmerName: 'HTX Nông Nghiệp Đà Lạt GAP',
    productName: lotData.productName,
    category: 'RAU_AN_LA',
    categorySlug: lotData.categorySlug || 'rau-an-la',
    totalWeightKg: lotData.totalQuantity,
    availableWeightKg: lotData.totalQuantity,
    basePricePerKg: 15000,
    imageUrl: lotData.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
    pucCode: lotData.pucCode,
    harvestDate: lotData.harvestDate,
    expiryDate: lotData.expiryDate,
    totalQuantity: lotData.totalQuantity,
    remainingQuantity: lotData.totalQuantity,
    unit: lotData.unit || 'kg',
    minTemp: lotData.minTemp ?? 2.0,
    maxTemp: lotData.maxTemp ?? 6.0,
    hubLocation: lotData.hubLocation || 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    status: 'OPEN',
    tierPricingJson: lotData.tierPricingJson,
    tierPricing: JSON.parse(lotData.tierPricingJson || '[]'),
  };
  saveLocalLot(mockLot);
  return mockLot;
};

// Helper: Đọc các đề xuất đàm phán do người mua gửi từ Trang Chủ hoặc Modal B2B lưu trong localStorage
export const getLocalSubmittedRfqs = (): RfqItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const rawHistory = localStorage.getItem('b2b_rfq_history');
    const rawFarmerRfqs = localStorage.getItem('b2b_farmer_rfqs');
    const historyList = rawHistory ? JSON.parse(rawHistory) : [];
    const farmerList = rawFarmerRfqs ? JSON.parse(rawFarmerRfqs) : [];

    const combined = [...farmerList, ...historyList];
    const seenCodes = new Set<string>();
    const result: RfqItem[] = [];

    for (let i = 0; i < combined.length; i++) {
      const item = combined[i];
      if (!item) continue;
      const rfqCode =
        item.rfqCode ||
        (typeof item.id === 'string' && item.id.startsWith('RFQ')
          ? item.id
          : `RFQ-${item.id || 100000 + i}`);

      if (seenCodes.has(rfqCode)) continue;
      seenCodes.add(rfqCode);

      const numericId =
        typeof item.id === 'number'
          ? item.id
          : parseInt(String(item.id).replace(/\D/g, '') || String(1000 + i), 10);

      result.push({
        id: numericId,
        rfqCode,
        harvestLotId: item.harvestLotId || item.productId || 1,
        harvestLotCode: item.harvestLotCode || 'LOT-2026-DL-001',
        productName: item.productName || 'Nông Sản VietGAP HoNa Fresh',
        buyerName: item.buyerName || item.traderName || 'Thương Lái Mua Sỉ',
        buyerPhone: item.buyerPhone || item.traderPhone || '0908.776.889',
        buyerCompany:
          item.buyerCompany ||
          item.traderCompany ||
          (item.traderName ? `Vựa Nông Sản ${item.traderName}` : 'Đơn vị phân phối sỉ'),
        requestedQuantity: Number(item.requestedQuantity || item.quantity || 1000),
        targetPrice: Number(item.targetPrice || 15000),
        counterPrice: item.counterPrice,
        counterQuantity: item.counterQuantity,
        rejectReason: item.rejectReason,
        deliveryDate: item.deliveryDate || '2026-10-29',
        hubLocation:
          item.hubLocation ||
          item.deliveryLocation ||
          'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
        status: item.status || 'PENDING',
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
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_OFFER';
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
  override: Partial<RfqStatusOverride> & { status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_OFFER' }
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
  } catch (err) {
    console.error('Error saving local RFQ update:', err);
  }
};

// 4. RFQ Negotiations
export const getFarmerRfqsApi = async (): Promise<RfqItem[]> => {
  const localRfqs = getLocalSubmittedRfqs();
  let baseRfqs = FALLBACK_RFQS;

  try {
    const res = await fetch(`${API_BASE_URL}/farmer/rfq`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const data: ApiResponse<RfqItem[]> = await res.json();
      if (data.result && data.result.length > 0) {
        baseRfqs = data.result;
      }
    }
  } catch {
    // fallback
  }

  // Kết hợp RFQs từ local và server/fallback
  let combined: RfqItem[] = [];
  if (localRfqs.length > 0) {
    const seenCodes = new Set(localRfqs.map((r) => r.rfqCode));
    combined = [...localRfqs, ...baseRfqs.filter((r) => !seenCodes.has(r.rfqCode))];
  } else {
    combined = [...baseRfqs];
  }

  // Áp dụng overrides từ b2b_rfq_status_overrides cho TẤT CẢ RFQ (kể cả fallback mẫu)
  const overrides = getLocalRfqOverrides();
  return combined.map((rfq) => {
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
  const newStatus =
    actionData.action === 'ACCEPT'
      ? 'ACCEPTED'
      : actionData.action === 'REJECT'
      ? 'REJECTED'
      : 'PENDING';

  // Lưu trạng thái vào storage
  saveLocalRfqUpdate({
    id: rfqId,
    status: newStatus,
    counterPrice: actionData.counterPrice,
    counterQuantity: actionData.counterQuantity,
    rejectReason: actionData.rejectReason,
  });

  try {
    const res = await fetch(`${API_BASE_URL}/farmer/rfq/${rfqId}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(actionData),
    });
    const data: ApiResponse<RfqItem> = await res.json();
    if (res.ok && data.code === 200 && data.result) {
      return data.result;
    }
  } catch (err: unknown) {
    console.warn('Backend API respond RFQ offline, simulating success:', err);
  }

  return {
    id: rfqId,
    rfqCode: `RFQ-2026-${rfqId}`,
    harvestLotId: 1,
    harvestLotCode: 'LOT-2026-DL-001',
    productName: 'Nông Sản VietGAP',
    buyerName: 'Thương Lái Chợ Đầu Mối',
    buyerPhone: '0908.776.889',
    buyerCompany: 'Vựa Nông Sản B2B',
    requestedQuantity: actionData.counterQuantity || 3000,
    targetPrice: actionData.counterPrice || 14000,
    deliveryDate: '2026-10-28',
    hubLocation: 'Trạm Lạnh Đức Trọng',
    status: newStatus,
    counterPrice: actionData.counterPrice,
    counterQuantity: actionData.counterQuantity,
    rejectReason: actionData.rejectReason,
    createdAt: new Date().toISOString(),
  };
};

// Helper: Lưu Hợp Đồng B2B vào localStorage để bảo toàn dữ liệu
export const saveLocalContract = (contract: B2BContract) => {
  if (typeof window === 'undefined') return;
  try {
    const existing: B2BContract[] = JSON.parse(localStorage.getItem('b2b_farmer_contracts') || '[]');
    const filtered = existing.filter((c) => c.id !== contract.id && c.contractCode !== contract.contractCode);
    filtered.unshift(contract);
    localStorage.setItem('b2b_farmer_contracts', JSON.stringify(filtered));
  } catch {}
};

// 5. Contracts & QC
export const getFarmerContractsApi = async (): Promise<B2BContract[]> => {
  let localContracts: B2BContract[] = [];
  if (typeof window !== 'undefined') {
    try {
      localContracts = JSON.parse(localStorage.getItem('b2b_farmer_contracts') || '[]');
    } catch {}
  }

  let serverContracts = FALLBACK_CONTRACTS;
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/contracts`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const data: ApiResponse<B2BContract[]> = await res.json();
      if (data.result && data.result.length > 0) {
        serverContracts = data.result;
      }
    }
  } catch {
    // fallback
  }

  // Kết hợp Hợp đồng vừa tạo với Hợp đồng mặc định
  const seenCodes = new Set<string>();
  const merged: B2BContract[] = [];
  for (const c of [...localContracts, ...serverContracts]) {
    const key = c.contractCode || String(c.id);
    if (!seenCodes.has(key)) {
      seenCodes.add(key);
      merged.push(c);
    }
  }
  return merged;
};

export const getContractQcApi = async (
  contractId: number,
  contractInfo?: B2BContract
): Promise<QcInspection | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/contracts/${contractId}/qc`, {
      cache: 'no-store',
      credentials: 'include',
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

  return { ...FALLBACK_QC, contractId };
};

// 6. Settlements & Form 01/TNDN
export const getFarmerSettlementsApi = async (): Promise<Settlement[]> => {
  let list: Settlement[] = [];
  try {
    const res = await fetch(`${API_BASE_URL}/farmer/settlements`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const data: ApiResponse<Settlement[]> = await res.json();
      if (data.result && data.result.length > 0) {
        list = data.result;
      }
    }
  } catch {
    // API network error, use fallback
  }

  if (list.length === 0) {
    list = [...FALLBACK_SETTLEMENTS];
  }

  if (typeof window !== 'undefined') {
    const localSettlements = JSON.parse(localStorage.getItem('farmer_local_settlements') || '[]');
    // Tránh trùng ID
    for (const ls of localSettlements) {
      if (!list.some((s) => s.id === ls.id || s.settlementCode === ls.settlementCode)) {
        list.unshift(ls);
      }
    }
  }

  return list;
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
    console.warn('API getLotAllocation error:', err);
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
