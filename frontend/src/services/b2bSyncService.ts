/**
 * Dịch vụ Đồng bộ Hóa Dữ liệu B2B Hai Chiều giữa Nông Dân (Farmer) và Thương Lái (Buyer)
 * Sử dụng BroadcastChannel + LocalStorage để đồng bộ tức thì trên trình duyệt,
 * kết hợp tương thích với Backend API.
 */

export interface B2bSyncRfq {
  id: number;
  rfqCode: string;
  harvestLotId: number;
  lotCode: string;
  productName: string;
  buyerName: string;
  buyerPhone: string;
  buyerCompany: string;
  requestedQuantityKg: number;
  targetPricePerKg: number;
  counterPricePerKg?: number;
  desiredDeliveryDate: string;
  deliveryLocation: string;
  shippingOption: string;
  notes?: string;
  status: 'WAITING_FARMER' | 'WAITING_BUYER' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'PENDING' | 'COUNTER_OFFER';
  createdAt: string;
  updatedAt: string;
}

export interface B2bSyncContract {
  id: number;
  contractCode: string;
  rfqCode?: string;
  lotId: number;
  lotCode: string;
  productName: string;
  buyerName: string;
  buyerPhone: string;
  buyerCompany: string;
  farmerName: string;
  farmerPhone: string;
  farmerCompany: string;
  quantityKg: number;
  agreedPricePerKg: number;
  totalAmount: number;
  depositAmount: number; // 30% Escrow
  remainingAmount: number; // 70% Final
  depositStatus: 'WAITING_DEPOSIT' | 'DEPOSIT_PAID';
  depositPaidAt?: string;
  fulfillmentStep: 1 | 2 | 3 | 4 | 5 | 6; // 1: Chốt đơn -> 2: Thu hoạch/đóng gói -> 3: Xe lạnh -> 4: Đã giao/ePOD -> 5: Đối soát -> 6: Hoàn tất
  fulfillmentStatusName: string;
  truckLicensePlate: string;
  truckDriverName: string;
  truckDriverPhone: string;
  truckTempCurrent: number;
  deliveryAddress: string;
  deliveryTimeSlot: string;
  epodDeliveredWeightKg?: number;
  epodDamagedWeightKg?: number;
  epodSignatureName?: string;
  epodSignatureData?: string;
  epodPhotoUrl?: string;
  epodSignedAt?: string;
  finalPaidStatus: 'UNPAID' | 'PAID';
  finalPaidAt?: string;
  settledAmount?: number;
  settledToFarmerAt?: string;
  createdAt: string;
}

const STORAGE_KEY_RFQS = 'hona_b2b_sync_rfqs_v2';
const STORAGE_KEY_CONTRACTS = 'hona_b2b_sync_contracts_v2';
const CHANNEL_NAME = 'hona_b2b_sync_channel';

// Dữ liệu mẫu khởi tạo đồng bộ ban đầu
const INITIAL_RFQS: B2bSyncRfq[] = [
  {
    id: 1,
    rfqCode: 'RFQ-2026-0042',
    harvestLotId: 1,
    lotCode: 'LOT-2026-DL-001',
    productName: 'Bắp Cải Trái Tim Đà Lạt VietGAP',
    buyerName: 'Trần Thị Thương',
    buyerPhone: '0987654321',
    buyerCompany: 'Bách Hóa XANH Logistics',
    requestedQuantityKg: 3000,
    targetPricePerKg: 13500,
    counterPricePerKg: 14000,
    desiredDeliveryDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    deliveryLocation: 'Kho Tổng Hợp Chuỗi Lạnh Thủ Đức, TP.HCM',
    shippingOption: 'cold_storage_truck',
    notes: 'Yêu cầu kiểm định độ tươi brix >= 5.0, xe lạnh duy trì 2-5°C.',
    status: 'WAITING_BUYER',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 2,
    rfqCode: 'RFQ-2026-0058',
    harvestLotId: 2,
    lotCode: 'LOT-2026-DL-002',
    productName: 'Cà Chua Beef Xuất Khẩu Chuẩn GlobalGAP',
    buyerName: 'Nguyễn Hải Âu',
    buyerPhone: '0903111222',
    buyerCompany: 'Hải Âu Catering Sài Gòn',
    requestedQuantityKg: 2500,
    targetPricePerKg: 17500,
    counterPricePerKg: undefined,
    desiredDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    deliveryLocation: 'Bếp Ăn Công Nghiệp KCN Tân Bình, TP.HCM',
    shippingOption: 'cold_storage_truck',
    notes: 'Cần phân loại độ chín đồng đều 85-90%.',
    status: 'WAITING_FARMER',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

const INITIAL_CONTRACTS: B2bSyncContract[] = [
  {
    id: 3,
    contractCode: 'HD-2026-B2B-0089',
    rfqCode: 'RFQ-2026-0015',
    lotId: 1,
    lotCode: 'LOT-2026-DL-001',
    productName: 'Bắp Cải Trái Tim Đà Lạt VietGAP',
    buyerName: 'Công Ty CP Nông Sản Xanh Hà Nội',
    buyerPhone: '0977889900',
    buyerCompany: 'Hà Nội Green Farm Hub',
    farmerName: 'Nguyễn Văn Nông',
    farmerPhone: '0912345678',
    farmerCompany: 'Nông Trại Hữu Cơ Đà Lạt Fresh',
    quantityKg: 2000,
    agreedPricePerKg: 13500,
    totalAmount: 27000000,
    depositAmount: 8100000,
    remainingAmount: 18900000,
    depositStatus: 'DEPOSIT_PAID',
    depositPaidAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    fulfillmentStep: 4,
    fulfillmentStatusName: 'Đã Giao Đến Điểm Nhận & Chờ Ký ePOD',
    truckLicensePlate: '49C-198.86 (Xe Thùng Lạnh)',
    truckDriverName: 'Tài xế Nguyễn Văn Tài',
    truckDriverPhone: '0944556677',
    truckTempCurrent: 3.9,
    deliveryAddress: 'Kho Trung Chuyển Gia Lâm, Hà Nội',
    deliveryTimeSlot: '07:00 - 10:00',
    finalPaidStatus: 'UNPAID',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 1,
    contractCode: 'HD-2026-B2B-954',
    rfqCode: 'RFQ-2026-0038',
    lotId: 2,
    lotCode: 'LOT-2026-DL-002',
    productName: 'Cà Chua Beef Xuất Khẩu Chuẩn GlobalGAP',
    buyerName: 'Trần Thị Thương',
    buyerPhone: '0987654321',
    buyerCompany: 'Bách Hóa XANH Logistics',
    farmerName: 'Nguyễn Văn Nông',
    farmerPhone: '0912345678',
    farmerCompany: 'Nông Trại Hữu Cơ Đà Lạt Fresh',
    quantityKg: 2500,
    agreedPricePerKg: 18000,
    totalAmount: 45000000,
    depositAmount: 13500000, // 30%
    remainingAmount: 31500000, // 70%
    depositStatus: 'DEPOSIT_PAID',
    depositPaidAt: new Date(Date.now() - 86400000).toISOString(),
    fulfillmentStep: 3, // Đang vận chuyển
    fulfillmentStatusName: 'Đang Vận Chuyển Xe Lạnh Đến Kho',
    truckLicensePlate: '49C-198.86 (Xe Thùng Lạnh 5 Tấn)',
    truckDriverName: 'Tài xế Nguyễn Văn Tài',
    truckDriverPhone: '0944556677',
    truckTempCurrent: 3.8,
    deliveryAddress: 'Kho Tổng Hợp Chuỗi Lạnh Thủ Đức, TP.HCM',
    deliveryTimeSlot: '05:30 - 08:30 Sáng',
    finalPaidStatus: 'UNPAID',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 2,
    contractCode: 'HD-2026-B2B-912',
    rfqCode: 'RFQ-2026-0021',
    lotId: 1,
    lotCode: 'LOT-2026-DL-001',
    productName: 'Bắp Cải Trái Tim Đà Lạt VietGAP',
    buyerName: 'Đại diện Buyer Demo',
    buyerPhone: '0909123456',
    buyerCompany: 'Công Ty TNHH Thu Mua Sỉ Nông Sản Sài Gòn',
    farmerName: 'Nguyễn Văn Nông',
    farmerPhone: '0912345678',
    farmerCompany: 'Nông Trại Hữu Cơ Đà Lạt Fresh',
    quantityKg: 3000,
    agreedPricePerKg: 13500,
    totalAmount: 40500000,
    depositAmount: 12150000,
    remainingAmount: 28350000,
    depositStatus: 'DEPOSIT_PAID',
    depositPaidAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    fulfillmentStep: 6, // Hoàn tất
    fulfillmentStatusName: 'Hoàn Tất Đơn & Đã Giải Ngân Escrow',
    truckLicensePlate: '51D-246.88 (Xe Lạnh Chuyên Dụng)',
    truckDriverName: 'Tài xế Lê Minh Tuấn',
    truckDriverPhone: '0933557799',
    truckTempCurrent: 4.2,
    deliveryAddress: 'Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM',
    deliveryTimeSlot: '06:00 - 09:00',
    epodDeliveredWeightKg: 2980,
    epodDamagedWeightKg: 20,
    epodSignatureName: 'Trần Thị Thương',
    epodSignatureData: 'SIGNED_VERIFIED_DIGITAL',
    epodSignedAt: new Date(Date.now() - 86400000).toISOString(),
    finalPaidStatus: 'PAID',
    finalPaidAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    settledAmount: 40230000,
    settledToFarmerAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

// Quản lý Broadcast Channel an toàn
let broadcastChannel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
  return broadcastChannel;
}

function notifySyncEvent(type: string, payload: unknown) {
  if (typeof window === 'undefined') return;
  const channel = getChannel();
  if (channel) {
    channel.postMessage({ type, payload, timestamp: Date.now() });
  }
  // Dispatch local events so same-window listeners also wake up
  try {
    window.dispatchEvent(new CustomEvent('b2b_sync_event', { detail: { type, payload } }));
    window.dispatchEvent(new CustomEvent('b2b_rfq_updated', { detail: payload }));
  } catch {}
}

// ---------------------- 1. RFQ MANAGEMENT ----------------------

export function getSyncRfqs(): B2bSyncRfq[] {
  if (typeof window === 'undefined') return INITIAL_RFQS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RFQS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RFQS, JSON.stringify(INITIAL_RFQS));
      return INITIAL_RFQS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RFQS;
  }
}

export function mergeSyncRfqs(incoming: B2bSyncRfq[]) {
  const current = getSyncRfqs();
  const merged = new Map(current.map((rfq) => [rfq.rfqCode, rfq]));
  incoming.forEach((rfq) => merged.set(rfq.rfqCode, rfq));
  const updated = Array.from(merged.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  localStorage.setItem(STORAGE_KEY_RFQS, JSON.stringify(updated));
  notifySyncEvent('RFQ_SERVER_SYNCED', updated);
  return updated;
}

export function saveSyncRfq(rfq: Omit<B2bSyncRfq, 'id' | 'createdAt' | 'updatedAt'>): B2bSyncRfq {
  const current = getSyncRfqs();
  const newRfq: B2bSyncRfq = {
    ...rfq,
    id: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const updated = [newRfq, ...current];
  localStorage.setItem(STORAGE_KEY_RFQS, JSON.stringify(updated));
  notifySyncEvent('RFQ_CREATED', newRfq);
  return newRfq;
}

export function farmerRespondRfq(
  rfqIdOrCode: number | string,
  action: 'ACCEPT' | 'COUNTER' | 'REJECT',
  counterPrice?: number,
  rejectReason?: string
): { rfq: B2bSyncRfq; newContract?: B2bSyncContract } {
  const current = getSyncRfqs();
  const idx = current.findIndex(
    (r) => r.id === Number(rfqIdOrCode) || r.rfqCode === String(rfqIdOrCode)
  );
  if (idx === -1) {
    console.warn('farmerRespondRfq: RFQ không tìm thấy trong b2bSyncService:', rfqIdOrCode);
    return { rfq: current[0] };
  }

  const rfq = { ...current[idx] };
  let newContract: B2bSyncContract | undefined;

  if (action === 'ACCEPT') {
    if (!['WAITING_FARMER', 'PENDING'].includes(rfq.status)) {
      throw new Error('RFQ chưa đến lượt người bán phản hồi');
    }
    rfq.status = 'ACCEPTED';
    rfq.updatedAt = new Date().toISOString();
    // Tự động sinh hợp đồng B2B
    newContract = createContractFromRfq(rfq, rfq.targetPricePerKg);
  } else if (action === 'COUNTER') {
    if (!['WAITING_FARMER', 'PENDING'].includes(rfq.status)) {
      throw new Error('RFQ chưa đến lượt người bán phản hồi');
    }
    if (!counterPrice || counterPrice <= 0) throw new Error('Giá phản hồi không hợp lệ');
    rfq.status = 'WAITING_BUYER';
    rfq.counterPricePerKg = counterPrice;
    rfq.updatedAt = new Date().toISOString();
  } else if (action === 'REJECT') {
    if (!['WAITING_FARMER', 'PENDING'].includes(rfq.status)) {
      throw new Error('RFQ chưa đến lượt người bán phản hồi');
    }
    rfq.status = 'REJECTED';
    rfq.notes = (rfq.notes ? rfq.notes + ' | ' : '') + (rejectReason || 'Nông dân từ chối');
    rfq.updatedAt = new Date().toISOString();
  }

  current[idx] = rfq;
  localStorage.setItem(STORAGE_KEY_RFQS, JSON.stringify(current));
  notifySyncEvent('RFQ_UPDATED', { rfq, newContract });
  return { rfq, newContract };
}

export function buyerAcceptCounterRfq(rfqIdOrCode: number | string): { rfq: B2bSyncRfq; newContract: B2bSyncContract } {
  const current = getSyncRfqs();
  const idx = current.findIndex(
    (r) => r.id === Number(rfqIdOrCode) || r.rfqCode === String(rfqIdOrCode)
  );
  if (idx === -1) throw new Error('Không tìm thấy RFQ');

  const rfq = { ...current[idx] };
  if (!['WAITING_BUYER', 'COUNTER_OFFER'].includes(rfq.status)) {
    throw new Error('RFQ chưa đến lượt người mua phản hồi');
  }
  const finalPrice = rfq.counterPricePerKg || rfq.targetPricePerKg;
  rfq.status = 'ACCEPTED';
  rfq.targetPricePerKg = finalPrice;
  rfq.updatedAt = new Date().toISOString();

  current[idx] = rfq;
  localStorage.setItem(STORAGE_KEY_RFQS, JSON.stringify(current));

  const newContract = createContractFromRfq(rfq, finalPrice);
  notifySyncEvent('RFQ_ACCEPTED_BY_BUYER', { rfq, newContract });
  return { rfq, newContract };
}

export function buyerCounterRfq(
  rfqIdOrCode: number | string,
  counterPrice: number,
  counterQuantity?: number,
): B2bSyncRfq {
  if (!counterPrice || counterPrice <= 0) throw new Error('Giá phản hồi không hợp lệ');
  const current = getSyncRfqs();
  const idx = current.findIndex((r) => r.id === Number(rfqIdOrCode) || r.rfqCode === String(rfqIdOrCode));
  if (idx === -1) throw new Error('Không tìm thấy RFQ');
  const rfq = { ...current[idx] };
  if (!['WAITING_BUYER', 'COUNTER_OFFER'].includes(rfq.status)) {
    throw new Error('RFQ chưa đến lượt người mua phản hồi');
  }
  rfq.status = 'WAITING_FARMER';
  rfq.counterPricePerKg = counterPrice;
  if (counterQuantity) rfq.requestedQuantityKg = counterQuantity;
  rfq.updatedAt = new Date().toISOString();
  current[idx] = rfq;
  localStorage.setItem(STORAGE_KEY_RFQS, JSON.stringify(current));
  notifySyncEvent('RFQ_COUNTERED_BY_BUYER', rfq);
  return rfq;
}

// ---------------------- 2. CONTRACT & ORDER MANAGEMENT ----------------------

// Helper tìm vị trí hợp đồng an toàn, không bao giờ để -1 làm sập app
function findSafeContractIndex(contracts: B2bSyncContract[], idOrCode: number | string | undefined | null): number {
  if (!contracts || contracts.length === 0) return -1;
  if (!idOrCode) return 0;

  const targetStr = String(idOrCode).trim();
  const targetNum = Number(idOrCode);

  const idx = contracts.findIndex(
    (c) =>
      c.id === targetNum ||
      String(c.id) === targetStr ||
      c.contractCode === targetStr ||
      c.contractCode.toLowerCase() === targetStr.toLowerCase()
  );

  return idx !== -1 ? idx : 0; // Luôn fallback về contract đầu tiên nếu không khớp chính xác
}


export function getSyncContracts(): B2bSyncContract[] {
  if (typeof window === 'undefined') return INITIAL_CONTRACTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTRACTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(INITIAL_CONTRACTS));
      return INITIAL_CONTRACTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CONTRACTS;
  }
}

function createContractFromRfq(rfq: B2bSyncRfq, pricePerKg: number): B2bSyncContract {
  const contracts = getSyncContracts();
  const total = rfq.requestedQuantityKg * pricePerKg;
  const deposit = Math.round(total * 0.3);
  const remaining = total - deposit;
  const newContract: B2bSyncContract = {
    id: Date.now(),
    contractCode: `HD-2026-B2B-${Math.floor(100 + Math.random() * 900)}`,
    rfqCode: rfq.rfqCode,
    lotId: rfq.harvestLotId,
    lotCode: rfq.lotCode || `LOT-2026-DL-${Math.floor(100 + Math.random() * 900)}`,
    productName: rfq.productName,
    buyerName: rfq.buyerName,
    buyerPhone: rfq.buyerPhone,
    buyerCompany: rfq.buyerCompany,
    farmerName: 'Nguyễn Văn Nông',
    farmerPhone: '0912345678',
    farmerCompany: 'Nông Trại Hữu Cơ Đà Lạt Fresh',
    quantityKg: rfq.requestedQuantityKg,
    agreedPricePerKg: pricePerKg,
    totalAmount: total,
    depositAmount: deposit,
    remainingAmount: remaining,
    depositStatus: 'WAITING_DEPOSIT',
    fulfillmentStep: 1,
    fulfillmentStatusName: 'Chờ Buyer Đặt Cọc 30% Escrow',
    truckLicensePlate: '49C-198.86 (Xe Thùng Lạnh)',
    truckDriverName: 'Tài xế Nguyễn Văn Tài',
    truckDriverPhone: '0944556677',
    truckTempCurrent: 4.0,
    deliveryAddress: rfq.deliveryLocation,
    deliveryTimeSlot: '06:00 - 09:00',
    finalPaidStatus: 'UNPAID',
    createdAt: new Date().toISOString(),
  };

  const updated = [newContract, ...contracts];
  localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(updated));
  notifySyncEvent('CONTRACT_CREATED', newContract);
  return newContract;
}

export function buyerPayDeposit(contractId: number | string): B2bSyncContract {
  const contracts = getSyncContracts();
  const idx = findSafeContractIndex(contracts, contractId);
  if (idx === -1) {
    console.warn('buyerPayDeposit: Danh sách hợp đồng rỗng');
    return INITIAL_CONTRACTS[0];
  }

  const c = { ...contracts[idx] };
  c.depositStatus = 'DEPOSIT_PAID';
  c.depositPaidAt = new Date().toISOString();
  c.fulfillmentStep = 2; // Tự động chuyển sang Mốc 2: Nông dân bắt đầu thu hoạch & đóng gói
  c.fulfillmentStatusName = 'Đã Đóng Cọc 30% · Chờ Thu Hoạch & Đóng Gói';

  contracts[idx] = c;
  localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(contracts));
  notifySyncEvent('DEPOSIT_PAID', c);
  return c;
}

export function updateContractFulfillmentStep(
  contractId: number | string,
  newStep: 1 | 2 | 3 | 4 | 5 | 6,
  extraData?: Partial<B2bSyncContract>
): B2bSyncContract {
  const contracts = getSyncContracts();
  const idx = findSafeContractIndex(contracts, contractId);
  if (idx === -1) {
    console.warn('updateContractFulfillmentStep: Danh sách hợp đồng rỗng');
    return INITIAL_CONTRACTS[0];
  }

  const c = { ...contracts[idx], ...extraData };
  c.fulfillmentStep = newStep;

  const stepNames: Record<number, string> = {
    1: 'Đã Tiếp Nhận & Sắp Lịch Vận Chuyển',
    2: 'Đã Thu Hoạch & Đóng Gói Tại Farm',
    3: 'Đang Vận Chuyển Xe Lạnh Đến Kho',
    4: 'Đã Giao Đến Điểm Nhận & Chờ Ký ePOD',
    5: 'Nghiệm Thu Đối Soát & Quyết Toán Cuối',
    6: 'Hoàn Tất Đơn & Đã Giải Ngân Escrow',
  };
  c.fulfillmentStatusName = stepNames[newStep] || c.fulfillmentStatusName;

  if (newStep === 6) {
    c.finalPaidStatus = 'PAID';
    c.settledAmount = c.settledAmount || c.totalAmount;
    c.settledToFarmerAt = new Date().toISOString();
  }

  contracts[idx] = c;
  localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(contracts));
  notifySyncEvent('FULFILLMENT_STEP_UPDATED', c);
  return c;
}

export function buyerSignEpod(
  contractId: number | string,
  deliveredWeightKg: number,
  signatureName: string,
  signatureData: string,
  photoUrl?: string
): B2bSyncContract {
  const contracts = getSyncContracts();
  const idx = findSafeContractIndex(contracts, contractId);
  if (idx === -1) {
    console.warn('buyerSignEpod: Danh sách hợp đồng rỗng');
    return INITIAL_CONTRACTS[0];
  }

  const c = { ...contracts[idx] };
  const damagedKg = Math.max(0, c.quantityKg - deliveredWeightKg);
  c.epodDeliveredWeightKg = deliveredWeightKg;
  c.epodDamagedWeightKg = damagedKg;
  c.epodSignatureName = signatureName;
  c.epodSignatureData = signatureData;
  c.epodPhotoUrl = photoUrl;
  c.epodSignedAt = new Date().toISOString();

  // Tự động tính toán số tiền quyết toán cuối 70% sau khi cấn trừ hao hụt
  const actualGoodsTotal = deliveredWeightKg * c.agreedPricePerKg;
  c.remainingAmount = Math.max(0, actualGoodsTotal - c.depositAmount);
  c.settledAmount = actualGoodsTotal;

  c.fulfillmentStep = 5; // Chuyển sang Mốc 5: Nghiệm thu & Thanh toán cuối
  c.fulfillmentStatusName = 'Đã Ký ePOD · Chờ Quyết Toán 70% Còn Lại';

  contracts[idx] = c;
  localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(contracts));
  notifySyncEvent('EPOD_SIGNED', c);
  return c;
}

export function buyerPayFinalSettlement(contractId: number | string): B2bSyncContract {
  const contracts = getSyncContracts();
  const idx = findSafeContractIndex(contracts, contractId);
  if (idx === -1) {
    console.warn('buyerPayFinalSettlement: Danh sách hợp đồng rỗng');
    return INITIAL_CONTRACTS[0];
  }

  const c = { ...contracts[idx] };
  c.finalPaidStatus = 'PAID';
  c.finalPaidAt = new Date().toISOString();
  c.fulfillmentStep = 6; // Hoàn tất
  c.fulfillmentStatusName = 'Hoàn Tất Đơn & Đã Giải Ngân Escrow';
  c.settledToFarmerAt = new Date().toISOString();

  contracts[idx] = c;
  localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(contracts));
  notifySyncEvent('FINAL_PAID', c);
  return c;
}

/**
 * Cơ chế Tự động Nghiệm Thu & Giải Ngân sau 48h:
 * Khi đơn đã giao đến nơi (Mốc 4) mà bên Mua không khiếu nại trong 48h,
 * hệ thống tự động hoàn tất Mốc 5 (Ký ePOD) và Mốc 6 (Tất toán & tiền về ví Nông Dân).
 */
export function autoCompleteContractAfterTimeout(contractId: number | string): B2bSyncContract {
  const contracts = getSyncContracts();
  const idx = findSafeContractIndex(contracts, contractId);
  if (idx === -1) {
    console.warn('autoCompleteContractAfterTimeout: Danh sách hợp đồng rỗng');
    return INITIAL_CONTRACTS[0];
  }

  const c = { ...contracts[idx] };
  if (!c.epodSignatureData) {
    c.epodDeliveredWeightKg = c.quantityKg;
    c.epodDamagedWeightKg = 0;
    c.epodSignatureName = `${c.buyerName} (Hệ Thống Tự Động Ký ePOD Sau 48h)`;
    c.epodSignatureData = 'AUTO_CONFIRMED_48H_TIMEOUT_SYSTEM';
    c.epodSignedAt = new Date().toISOString();
  }
  c.fulfillmentStep = 6;
  c.fulfillmentStatusName = 'Hoàn Tất Đơn & Đã Giải Ngân Escrow (Tự Động Sau 48h)';
  c.finalPaidStatus = 'PAID';
  c.finalPaidAt = new Date().toISOString();
  c.settledAmount = c.settledAmount || (c.quantityKg * c.agreedPricePerKg);
  c.settledToFarmerAt = new Date().toISOString();

  contracts[idx] = c;
  localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(contracts));
  notifySyncEvent('EPOD_SIGNED', c);
  notifySyncEvent('FINAL_PAID', c);
  notifySyncEvent('CONTRACT_AUTO_COMPLETED_48H', c);
  return c;
}

// ---------------------- 3. EVENT LISTENER CHO REALTIME SYNC ----------------------

export function subscribeB2bSyncEvents(
  callback: (event: { type: string; payload: unknown; timestamp: number }) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleMessage = (e: MessageEvent) => {
    if (e.data && e.data.type) {
      callback(e.data);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_CONTRACTS || e.key === STORAGE_KEY_RFQS) {
      callback({
        type: e.key === STORAGE_KEY_CONTRACTS ? 'CONTRACTS_STORAGE_SYNC' : 'RFQS_STORAGE_SYNC',
        payload: null,
        timestamp: Date.now(),
      });
    }
  };

  const channel = getChannel();
  if (channel) {
    channel.addEventListener('message', handleMessage);
  }
  window.addEventListener('storage', handleStorage);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorage);
  };
}
