import { NextRequest, NextResponse } from 'next/server';

// Server-side in-memory cache shared across ALL browsers, tabs, and sessions
// Đảm bảo khi Admin duyệt ở Chrome / Incognito thì Farmer ở Edge / Firefox hay bất cứ trình duyệt nào
// đều nhận được ngay lập tức trạng thái mới nhất!

export interface SharedSyncLot {
  id: number | string;
  lotCode: string;
  status: 'PENDING_APPROVAL' | 'OPEN' | 'REJECTED' | 'SUSPENDED';
  productName?: string;
  farmerName?: string;
  farmerId?: number;
  category?: string;
  categorySlug?: string;
  pucCode?: string;
  harvestDate?: string;
  expiryDate?: string;
  totalWeightKg?: number;
  availableWeightKg?: number;
  basePricePerKg?: number;
  imageUrl?: string;
  hubLocation?: string;
  warehouseLocation?: string;
  auditNote?: string;
  rejectionReason?: string;
  tierPricingJson?: string;
  tierPricing?: any[];
  minTemp?: number;
  maxTemp?: number;
  reqTempMin?: number;
  reqTempMax?: number;
  updatedAt: string;
}

// In-memory map on Node.js / Next.js server instance
const sharedLotsMap = new Map<string, SharedSyncLot>();
const sharedRfqsMap = new Map<string, any>();
const sharedContractsMap = new Map<string, any>();

// Helper to parse JWT and extract payload (base64url decoded)
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('Failed to parse JWT', e);
    return {};
  }
}


// Khởi tạo sẵn 2 lô mẫu mà người dùng tạo
const seedLots: SharedSyncLot[] = [
  {
    id: 309,
    lotCode: 'LOT-2026-DL-644',
    productName: 'Bắp Cải Mỹ',
    farmerName: 'HTX Nông Nghiệp Rau Sạch Đơn Dương',
    farmerId: 12,
    category: 'RAU_AN_LA',
    categorySlug: 'rau-an-la',
    pucCode: 'VN-LDO-PUC-0849',
    harvestDate: '2026-11-14',
    expiryDate: '2026-11-28',
    totalWeightKg: 2000,
    availableWeightKg: 2000,
    basePricePerKg: 15000,
    imageUrl: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&auto=format&fit=crop&q=80',
    hubLocation: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    warehouseLocation: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    status: 'OPEN',
    auditNote: 'Lô nông sản đã được Admin duyệt mở bán trên sàn giao dịch B2B.',
    tierPricingJson: JSON.stringify([
      { minKg: 50, pricePerKg: 15000 },
      { minKg: 100, pricePerKg: 13500 },
      { minKg: 250, pricePerKg: 12000 },
    ]),
    reqTempMin: 2.0,
    reqTempMax: 5.0,
    minTemp: 2.0,
    maxTemp: 5.0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 310,
    lotCode: 'LOT-2026-DL-635',
    productName: 'Cà Chua Mỹ',
    farmerName: 'HTX Nông Nghiệp Rau Sạch Đơn Dương',
    farmerId: 12,
    category: 'CU_QUA',
    categorySlug: 'cu-qua-tuoi',
    pucCode: 'VN-LDO-PUC-0849',
    harvestDate: '2026-11-14',
    expiryDate: '2026-11-28',
    totalWeightKg: 2000,
    availableWeightKg: 1500,
    basePricePerKg: 15000,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
    hubLocation: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    warehouseLocation: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    status: 'OPEN',
    auditNote: 'Lô nông sản đã được Admin duyệt mở bán trên sàn giao dịch B2B.',
    tierPricingJson: JSON.stringify([
      { minKg: 100, pricePerKg: 15000 },
      { minKg: 300, pricePerKg: 13500 },
      { minKg: 800, pricePerKg: 12000 },
    ]),
    reqTempMin: 8.0,
    reqTempMax: 12.0,
    minTemp: 8.0,
    maxTemp: 12.0,
    updatedAt: new Date().toISOString(),
  },
];

for (const s of seedLots) {
  sharedLotsMap.set(s.lotCode.trim().toUpperCase(), s);
}

// GET /api/b2b-shared-sync: Lấy toàn bộ các lô, RFQ và Hợp đồng đang đồng bộ xuyên trình duyệt
export async function GET() {
  const lots = Array.from(sharedLotsMap.values());
  const rfqs = Array.from(sharedRfqsMap.values());
  const contracts = Array.from(sharedContractsMap.values());
  return NextResponse.json({
    code: 200,
    message: 'Thành công',
    result: lots,
    lots,
    rfqs,
    contracts,
    total: lots.length,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

// POST /api/b2b-shared-sync: Cập nhật hoặc Thêm mới lô từ bất kỳ trình duyệt nào
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, lot, lotCode, id, status, auditNote, rejectionReason } = body;

    // 1. Thao tác cập nhật trạng thái khi Admin duyệt
    if (action === 'UPDATE_STATUS' || (lotCode && status)) {
      const code = (lotCode || lot?.lotCode || '').trim().toUpperCase();
      const lotId = String(id || lot?.id || '').trim();

      // Tìm kiếm trong map theo code hoặc id
      let targetKey: string | null = null;
      if (code && sharedLotsMap.has(code)) {
        targetKey = code;
      } else {
        for (const [k, v] of sharedLotsMap.entries()) {
          if ((code && v.lotCode.trim().toUpperCase() === code) || (lotId && String(v.id) === lotId)) {
            targetKey = k;
            break;
          }
        }
      }

      if (targetKey) {
        const existing = sharedLotsMap.get(targetKey)!;
        const updated: SharedSyncLot = {
          ...existing,
          status: status || existing.status,
          auditNote: auditNote !== undefined ? auditNote : existing.auditNote,
          rejectionReason: rejectionReason !== undefined ? rejectionReason : existing.rejectionReason,
          updatedAt: new Date().toISOString(),
        };
        sharedLotsMap.set(targetKey, updated);
        return NextResponse.json({ code: 200, message: 'Đã cập nhật trạng thái', result: updated });
      } else {
        // Tạo mới vào shared cache nếu chưa có
        const newEntry: SharedSyncLot = {
          id: id || Date.now(),
          lotCode: code || `LOT-${Date.now()}`,
          status: status || 'OPEN',
          auditNote: auditNote || 'Đã duyệt mở bán',
          rejectionReason,
          updatedAt: new Date().toISOString(),
          ...(lot || {}),
        };
        sharedLotsMap.set(newEntry.lotCode.trim().toUpperCase(), newEntry);
        return NextResponse.json({ code: 200, message: 'Đã tạo và cập nhật', result: newEntry });
      }
    }

    // 2. Thao tác khi Farmer đăng lô mới (REGISTER_LOT)
    if (action === 'REGISTER_LOT' || lot) {
      const newLot: SharedSyncLot = {
        id: lot.id || Date.now(),
        lotCode: (lot.lotCode || `LOT-${Date.now()}`).trim().toUpperCase(),
        productName: lot.productName || 'Lô nông sản',
        farmerName: lot.farmerName || 'HTX Nông Nghiệp',
        category: lot.category || 'RAU_AN_LA',
        categorySlug: lot.categorySlug || 'rau-an-la',
        pucCode: lot.pucCode || 'VN-LDO-PUC-0849',
        harvestDate: lot.harvestDate || new Date().toISOString().slice(0, 10),
        expiryDate: lot.expiryDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        totalWeightKg: lot.totalWeightKg || lot.totalQuantity || 1000,
        availableWeightKg: lot.availableWeightKg || lot.remainingQuantity || 1000,
        basePricePerKg: lot.basePricePerKg || 15000,
        imageUrl: lot.imageUrl,
        hubLocation: lot.hubLocation || lot.warehouseLocation || 'Kho bảo quản lạnh',
        warehouseLocation: lot.warehouseLocation || lot.hubLocation || 'Kho bảo quản lạnh',
        status: lot.status || 'PENDING_APPROVAL',
        auditNote: lot.auditNote || 'Chờ quản trị viên xét duyệt',
        tierPricingJson: lot.tierPricingJson,
        tierPricing: lot.tierPricing,
        minTemp: lot.minTemp ?? lot.reqTempMin,
        maxTemp: lot.maxTemp ?? lot.reqTempMax,
        reqTempMin: lot.reqTempMin ?? lot.minTemp,
        reqTempMax: lot.reqTempMax ?? lot.maxTemp,
        updatedAt: new Date().toISOString(),
      };
      sharedLotsMap.set(newLot.lotCode, newLot);
      return NextResponse.json({ code: 200, message: 'Đã lưu lô mới vào server shared cache', result: newLot });
    }

    // 3. Thao tác khi Buyer gửi RFQ (REGISTER_RFQ)
    if (action === 'REGISTER_RFQ' && body.rfq) {
      const r = body.rfq;
      const token = req.headers.get('authorization')?.split(' ')[1] || '';
      const jwtPayload = parseJwt(token);
      const farmerId = r.farmerId ?? jwtPayload.farmerId;
      const code = (r.rfqCode || `RFQ-${r.id || Date.now()}`).trim().toUpperCase();
      const savedRfq = {
        ...r,
        farmerId,
        rfqCode: code,
        updatedAt: new Date().toISOString(),
      };
      sharedRfqsMap.set(code, savedRfq);
      return NextResponse.json({ code: 200, message: 'Đã lưu RFQ vào server shared cache', result: savedRfq });
    }

    // 4. Thao tác khi Farmer hoặc Buyer cập nhật trạng thái RFQ (UPDATE_RFQ_STATUS)
    if (action === 'UPDATE_RFQ_STATUS' && (body.rfqCode || body.id)) {
      const code = String(body.rfqCode || body.id).trim().toUpperCase();
      const existing = sharedRfqsMap.get(code);
      if (existing) {
        const updated = {
          ...existing,
          status: body.status || existing.status,
          counterPrice: body.counterPrice !== undefined ? body.counterPrice : existing.counterPrice,
          counterQuantity: body.counterQuantity !== undefined ? body.counterQuantity : existing.counterQuantity,
          rejectReason: body.rejectReason !== undefined ? body.rejectReason : existing.rejectReason,
          updatedAt: new Date().toISOString(),
        };
        sharedRfqsMap.set(code, updated);
        return NextResponse.json({ code: 200, message: 'Đã cập nhật RFQ', result: updated });
      }
      return NextResponse.json({ code: 200, message: 'RFQ không tìm thấy trong shared cache' });
    }

    // 5. Thao tác đăng ký Hợp Đồng B2B mới sau khi chốt đàm phán (REGISTER_CONTRACT)
    if (action === 'REGISTER_CONTRACT' && body.contract) {
      const c = body.contract;
      const code = String(c.contractCode || `HD-2026-B2B-${c.id || Date.now()}`).trim().toUpperCase();
      const savedContract = {
        ...c,
        contractCode: code,
        updatedAt: new Date().toISOString(),
      };
      sharedContractsMap.set(code, savedContract);
      return NextResponse.json({ code: 200, message: 'Đã lưu Hợp Đồng vào server shared cache', result: savedContract });
    }

    // 6. Thao tác cập nhật trạng thái Hợp Đồng B2B (UPDATE_CONTRACT_STATUS)
    if (action === 'UPDATE_CONTRACT_STATUS' && (body.contractCode || body.id)) {
      const code = String(body.contractCode || body.id).trim().toUpperCase();
      const existing = sharedContractsMap.get(code);
      if (existing) {
        const updated = {
          ...existing,
          depositStatus: body.depositStatus || existing.depositStatus,
          fulfillmentStep: body.fulfillmentStep !== undefined ? body.fulfillmentStep : existing.fulfillmentStep,
          fulfillmentStatusName: body.fulfillmentStatusName || existing.fulfillmentStatusName,
          finalPaidStatus: body.finalPaidStatus || existing.finalPaidStatus,
          updatedAt: new Date().toISOString(),
        };
        sharedContractsMap.set(code, updated);
        return NextResponse.json({ code: 200, message: 'Đã cập nhật Hợp Đồng', result: updated });
      }
      return NextResponse.json({ code: 200, message: 'Hợp đồng không tìm thấy trong shared cache' });
    }

    return NextResponse.json({ code: 400, message: 'Yêu cầu không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err?.message || 'Lỗi server' }, { status: 500 });
  }
}
