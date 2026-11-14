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
  farmerId?: number;
  farmerName?: string;
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
  expiresAt?: string;
  contractId?: number;
  contractCode?: string;
  depositStatus?: string;
  depositAmount?: number;
}

export interface B2bNotification {
  id: string;
  audience: 'BUYER' | 'FARMER' | 'ADMIN' | 'ALL';
  type: string;
  title: string;
  message: string;
  rfqCode?: string;
  lotCode?: string;
  lotId?: number;
  read: boolean;
  createdAt: string;
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
const STORAGE_KEY_NOTIFICATIONS = 'hona_b2b_notifications_v1';
const CHANNEL_NAME = 'hona_b2b_sync_channel';

// Dữ liệu mẫu khởi tạo đồng bộ ban đầu: Để trống để người dùng thực hiện giao dịch mới từ đầu
const INITIAL_RFQS: B2bSyncRfq[] = [];

const INITIAL_CONTRACTS: B2bSyncContract[] = [];

// Quản lý Broadcast Channel an toàn
let broadcastChannel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
  return broadcastChannel;
}

function addNotification(notification: Omit<B2bNotification, 'id' | 'read' | 'createdAt'>) {
  if (typeof window === 'undefined') return;
  const current = getSyncNotifications();
  const next: B2bNotification = {
    ...notification,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify([next, ...current].slice(0, 80)));
  window.dispatchEvent(new CustomEvent('b2b_notification_updated', { detail: next }));
}

function createNotificationForEvent(type: string, payload: any) {
  if (type === 'RFQ_SERVER_SYNCED') return;
  const rfq = payload?.rfq || payload;
  const rfqCode = rfq?.rfqCode;
  const productName = rfq?.productName || payload?.productName || 'lô nông sản';
  const contractCode = payload?.contractCode || rfq?.contractCode || '';

  if (type === 'RFQ_CREATED') {
    addNotification({
      audience: 'FARMER',
      type,
      title: 'Có yêu cầu báo giá mới',
      message: `Khách mua vừa gửi yêu cầu báo giá cho ${productName}.`,
      rfqCode,
    });
    addNotification({
      audience: 'ADMIN',
      type,
      title: 'Yêu cầu đàm phán mới',
      message: `Khách mua ${rfq?.buyerName || ''} gửi yêu cầu báo giá cho ${productName}.`,
      rfqCode,
    });
  } else if (type === 'RFQ_UPDATED') {
    const status = rfq?.status;
    const message =
      status === 'WAITING_BUYER'
        ? `Nhà vườn đã gửi phản hồi mức giá cho ${productName}.`
        : status === 'ACCEPTED'
        ? `Mức giá đề xuất cho ${productName} đã được chấp thuận!`
        : status === 'REJECTED'
        ? `Mức giá đề xuất cho ${productName} chưa được chấp thuận.`
        : `Yêu cầu báo giá ${rfqCode || ''} vừa được cập nhật.`;
    addNotification({ audience: 'BUYER', type, title: 'Cập nhật đàm phán giá', message, rfqCode });
    addNotification({
      audience: 'ADMIN',
      type,
      title: 'Đàm phán giá thay đổi',
      message: `Yêu cầu ${rfqCode || ''} cho ${productName} vừa được cập nhật trạng thái.`,
      rfqCode,
    });
  } else if (type === 'RFQ_COUNTERED_BY_BUYER') {
    addNotification({
      audience: 'FARMER',
      type,
      title: 'Khách mua gửi mức giá mới',
      message: `Khách mua vừa đề xuất mức giá mới cho ${productName}.`,
      rfqCode,
    });
    addNotification({
      audience: 'ADMIN',
      type,
      title: 'Khách mua thương lượng giá',
      message: `Khách mua vừa gửi mức giá đề xuất mới cho ${productName}.`,
      rfqCode,
    });
  } else if (type === 'RFQ_ACCEPTED_BY_BUYER') {
    addNotification({
      audience: 'FARMER',
      type,
      title: 'Khách mua đã chốt đơn',
      message: `Khách mua đã chấp thuận đề xuất giá cho ${productName} và tạo hợp đồng.`,
      rfqCode,
    });
    addNotification({
      audience: 'ADMIN',
      type,
      title: 'Đàm phán chốt thành công',
      message: `Hai bên đã thống nhất giá cho ${productName}. Hợp đồng đã được tạo.`,
      rfqCode,
    });
  } else if (type === 'CONTRACT_CREATED') {
    addNotification({
      audience: 'BUYER',
      type,
      title: 'Hợp đồng mua bán đã lập',
      message: `Hợp đồng cho ${productName} đã sẵn sàng để quét mã đặt cọc 30% bảo chứng.`,
      rfqCode,
    });
    addNotification({
      audience: 'ADMIN',
      type,
      title: 'Hợp đồng mới được tạo',
      message: `Hợp đồng ${contractCode} cho ${productName} vừa được tạo.`,
      rfqCode,
    });
  } else if (type === 'DEPOSIT_PAID') {
    addNotification({
      audience: 'FARMER',
      type,
      title: 'Đã nhận tiền cọc 30% bảo chứng',
      message: `Khách mua đã thanh toán 30% tiền cọc cho hợp đồng ${contractCode}. Nhà vườn có thể tiến hành thu hoạch!`,
      rfqCode,
    });
    addNotification({
      audience: 'BUYER',
      type,
      title: 'Đặt cọc 30% thành công',
      message: `Đã xác nhận tiền cọc 30% cho hợp đồng ${contractCode}. Tiền được sàn bảo chứng an toàn.`,
      rfqCode,
    });
    addNotification({
      audience: 'ADMIN',
      type,
      title: 'Hợp đồng đã nhận cọc 30%',
      message: `Hợp đồng ${contractCode} đã nhận cọc 30% bảo chứng thành công.`,
      rfqCode,
    });
  } else if (type === 'EPOD_SIGNED') {
    addNotification({
      audience: 'FARMER',
      type,
      title: 'Khách mua đã ký nhận hàng',
      message: `Khách mua đã ký biên bản bàn giao cho hợp đồng ${contractCode}. Tiền hàng sẵn sàng giải ngân!`,
      rfqCode,
    });
    addNotification({
      audience: 'ADMIN',
      type,
      title: 'Biên bản nhận hàng đã ký',
      message: `Hợp đồng ${contractCode} đã hoàn tất bàn giao và ký nhận hàng.`,
      rfqCode,
    });
  } else if (type === 'FINAL_PAID') {
    addNotification({
      audience: 'FARMER',
      type,
      title: 'Quyết toán thành công',
      message: `Toàn bộ tiền hàng hợp đồng ${contractCode} đã được giải ngân về tài khoản ngân hàng.`,
      rfqCode,
    });
    addNotification({
      audience: 'BUYER',
      type,
      title: 'Hợp đồng hoàn tất',
      message: `Đơn hàng ${contractCode} đã hoàn tất thanh toán. Cảm ơn quý khách!`,
      rfqCode,
    });
    addNotification({
      audience: 'ADMIN',
      type,
      title: 'Hợp đồng hoàn tất thanh toán',
      message: `Hợp đồng ${contractCode} đã hoàn tất quyết toán 100%.`,
      rfqCode,
    });
  } else if (type === 'LOT_CREATED') {
    const lot = (payload as any)?.lot || payload;
    const lotCode = lot?.lotCode || 'Lô nông sản';
    const productName = lot?.productName || 'Nông sản';
    const farmerName = lot?.farmerName || 'Nhà vườn';
    const source = (payload as any)?.source || (payload as any)?.creatorRole;

    if (source === 'ADMIN') {
      // 1. Khi ADMIN đăng lô hàng: Đã có đầy đủ thông tin, CHỈ CẦN gửi thông báo cho FARMER
      addNotification({
        audience: 'FARMER',
        type: 'LOT_CREATED_BY_ADMIN',
        title: 'Ban quản trị đã đăng lô nông sản mới',
        message: `Ban quản trị đã đăng lô nông sản "${productName}" (${lotCode}) cho nhà vườn với đầy đủ thông số kiểm định và mở bán sỉ trên sàn B2B.`,
        rfqCode: lotCode,
        lotCode,
        lotId: lot?.id,
      });
    } else {
      // 2. Khi FARMER đăng lô hàng mới: Gửi thông báo cho ADMIN để Admin bấm vào chuyển tới lô hàng bổ sung field còn thiếu
      addNotification({
        audience: 'ADMIN',
        type: 'LOT_CREATED_BY_FARMER',
        title: 'Lô thu hoạch mới chờ duyệt & bổ sung thông số',
        message: `Nhà vườn ${farmerName} vừa đăng lô thu hoạch "${productName}" (${lotCode}). Bấm vào đây để đến lô hàng trong mục Nguồn cung & danh mục để bổ sung các trường còn thiếu.`,
        rfqCode: lotCode,
        lotCode,
        lotId: lot?.id,
      });
      addNotification({
        audience: 'FARMER',
        type: 'LOT_SUBMITTED',
        title: 'Đã gửi đăng ký lô thu hoạch',
        message: `Lô thu hoạch "${productName}" (${lotCode}) đã gửi đến Quản trị viên. Đang chờ Ban quản trị kiểm duyệt và bổ sung thông số trước khi mở bán.`,
        rfqCode: lotCode,
        lotCode,
        lotId: lot?.id,
      });
    }
  } else if (type === 'LOT_STATUS_UPDATED') {
    const lot = (payload as any)?.lot || payload;
    const lotCode = lot?.lotCode || (payload as any)?.lotCode || 'Lô nông sản';
    const productName = lot?.productName || (payload as any)?.productName || 'Nông sản';
    const newStatus = (payload as any)?.status || lot?.status;
    const reason = (payload as any)?.rejectionReason || lot?.rejectionReason;
    const note = (payload as any)?.auditNote || lot?.auditNote;

    if (newStatus === 'OPEN') {
      addNotification({
        audience: 'FARMER',
        type: 'LOT_APPROVED',
        title: 'Lô thu hoạch đã được phê duyệt!',
        message: `Lô "${productName}" (${lotCode}) đã được Admin phê duyệt và chính thức mở bán sỉ trên sàn!${note ? ` Ghi chú: ${note}` : ''}`,
        rfqCode: lotCode,
        lotCode,
        lotId: lot?.id,
      });
      addNotification({
        audience: 'ADMIN',
        type: 'LOT_STATUS_CHANGED',
        title: 'Đã duyệt mở bán lô hàng',
        message: `Lô "${productName}" (${lotCode}) đã được mở bán công khai trên sàn sỉ.`,
        rfqCode: lotCode,
        lotCode,
        lotId: lot?.id,
      });
    } else if (newStatus === 'REJECTED') {
      addNotification({
        audience: 'FARMER',
        type: 'LOT_REJECTED',
        title: 'Lô thu hoạch chưa được duyệt',
        message: `Lô "${productName}" (${lotCode}) bị từ chối phê duyệt. Lý do: ${reason || note || 'Chưa đạt chuẩn kiểm nghiệm'}.`,
        rfqCode: lotCode,
        lotCode,
        lotId: lot?.id,
      });
    } else if (newStatus === 'SUSPENDED') {
      addNotification({
        audience: 'FARMER',
        type: 'LOT_SUSPENDED',
        title: 'Lô thu hoạch bị tạm khóa',
        message: `Lô "${productName}" (${lotCode}) đã bị Admin tạm khóa kiểm tra. Lý do: ${reason || note || 'Khiếu nại dư lượng hoặc sự cố kho lạnh'}.`,
        rfqCode: lotCode,
        lotCode,
        lotId: lot?.id,
      });
    }
  } else if (type === 'LOT_UPDATED') {
    const lot = (payload as any)?.lot || payload;
    const updated = (payload as any)?.updatedLot || payload;
    const lotCode = lot?.lotCode || updated?.lotCode || 'Lô nông sản';
    const productName = updated?.productName || lot?.productName || 'Nông sản';
    addNotification({
      audience: 'FARMER',
      type: 'LOT_UPDATED_BY_ADMIN',
      title: 'Admin đã bổ sung thông tin lô hàng',
      message: `Quản trị viên vừa cập nhật thông số và tiêu chuẩn cho lô "${productName}" (${lotCode}).`,
      rfqCode: lotCode,
      lotCode,
      lotId: lot?.id,
    });
  }
}

export function syncLotStatusToFarmerStorage(
  lotCode?: string,
  newStatus?: string,
  rejectionReason?: string,
  auditNote?: string,
  lotId?: number | string
) {
  if (typeof window === 'undefined' || !newStatus) return;
  const normalizedCode = lotCode ? lotCode.trim().toUpperCase() : '';
  const normalizedId = lotId ? String(lotId).trim() : '';

  const updateLotItem = (l: any) => {
    const lCode = (l.lotCode || '').trim().toUpperCase();
    const lId = String(l.id || '').trim();
    const matchCode = normalizedCode && (lCode === normalizedCode || lId === normalizedCode);
    const matchId = normalizedId && (lId === normalizedId || lCode === normalizedId);
    if (matchCode || matchId) {
      return {
        ...l,
        status: newStatus,
        rejectionReason: rejectionReason !== undefined ? rejectionReason : l.rejectionReason,
        auditNote: auditNote !== undefined ? auditNote : l.auditNote,
      };
    }
    return l;
  };

  // 1. Cập nhật b2b_farmer_lots (Portal Nông Dân)
  try {
    const raw = localStorage.getItem('b2b_farmer_lots');
    const lots: any[] = raw ? JSON.parse(raw) : [];
    let matched = false;
    const updated = lots.map((l: any) => {
      const lCode = (l.lotCode || '').trim().toUpperCase();
      const lId = String(l.id || '').trim();
      if ((normalizedCode && (lCode === normalizedCode || lId === normalizedCode)) ||
          (normalizedId && (lId === normalizedId || lCode === normalizedId))) {
        matched = true;
      }
      return updateLotItem(l);
    });

    // Nếu trong b2b_farmer_lots chưa có bản ghi này (ví dụ tạo từ mock ban đầu), lấy từ custom lots sang
    if (!matched) {
      const customRaw = localStorage.getItem('xanhfarm_custom_harvest_lots');
      if (customRaw) {
        const customLots: any[] = JSON.parse(customRaw);
        const found = customLots.find((c: any) => {
          const cCode = (c.lotCode || '').trim().toUpperCase();
          const cId = String(c.id || '').trim();
          return (normalizedCode && (cCode === normalizedCode || cId === normalizedCode)) ||
                 (normalizedId && (cId === normalizedId || cCode === normalizedId));
        });
        if (found) {
          updated.unshift(updateLotItem(found));
        }
      }
    }
    localStorage.setItem('b2b_farmer_lots', JSON.stringify(updated));
  } catch {}

  // 2. Cập nhật xanhfarm_custom_harvest_lots (Admin Console & Sàn B2B)
  try {
    const raw = localStorage.getItem('xanhfarm_custom_harvest_lots');
    if (raw) {
      const lots: any[] = JSON.parse(raw);
      const updated = lots.map(updateLotItem);
      localStorage.setItem('xanhfarm_custom_harvest_lots', JSON.stringify(updated));
    }
  } catch {}

  // 3. ĐỒNG BỘ XUYÊN TRÌNH DUYỆT (Cross-Browser Server Shared Sync)
  // Gửi trực tiếp lên Server Endpoint để mọi trình duyệt khác (Chrome, Edge, Firefox, Incognito)
  // nhận được trạng thái mới nhất ngay lập tức khi polling
  try {
    fetch('/api/b2b-shared-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPDATE_STATUS',
        lotCode: normalizedCode,
        id: normalizedId,
        status: newStatus,
        auditNote,
        rejectionReason,
      }),
    }).catch(() => {});
  } catch {}
}

export function syncLotFieldsToFarmerStorage(updatedLot: any) {
  if (typeof window === 'undefined' || !updatedLot) return;
  const minTemp = updatedLot.reqTempMin ?? updatedLot.minTemp ?? 2.0;
  const maxTemp = updatedLot.reqTempMax ?? updatedLot.maxTemp ?? 6.0;
  const basePrice = updatedLot.basePricePerKg ?? 15000;

  let normalizedTiers: any[] = [];
  if (updatedLot.tierPricing && Array.isArray(updatedLot.tierPricing)) {
    normalizedTiers = updatedLot.tierPricing.map((t: any) => {
      const p = Number(t.price ?? t.pricePerKg ?? 0);
      return { minKg: Number(t.minKg), price: p, pricePerKg: p };
    });
  } else if (updatedLot.tierPricingJson) {
    try {
      const parsed = JSON.parse(updatedLot.tierPricingJson);
      if (Array.isArray(parsed)) {
        normalizedTiers = parsed.map((t: any) => {
          const p = Number(t.price ?? t.pricePerKg ?? 0);
          return { minKg: Number(t.minKg), price: p, pricePerKg: p };
        });
      }
    } catch {}
  }

  const enrichedLot = {
    ...updatedLot,
    minTemp,
    maxTemp,
    reqTempMin: minTemp,
    reqTempMax: maxTemp,
    basePricePerKg: basePrice,
    tierPricing: normalizedTiers.length > 0 ? normalizedTiers : updatedLot.tierPricing,
    tierPricingJson: normalizedTiers.length > 0 ? JSON.stringify(normalizedTiers) : updatedLot.tierPricingJson,
    warehouseLocation: updatedLot.warehouseLocation || 'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1',
    hubLocation: updatedLot.warehouseLocation || updatedLot.hubLocation || 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
  };

  try {
    const raw = localStorage.getItem('b2b_farmer_lots');
    if (raw) {
      const lots = JSON.parse(raw);
      if (Array.isArray(lots)) {
        const updated = lots.map((l: any) => {
          if (l.id === updatedLot.id || (updatedLot.lotCode && l.lotCode === updatedLot.lotCode)) {
            return { ...l, ...enrichedLot };
          }
          return l;
        });
        localStorage.setItem('b2b_farmer_lots', JSON.stringify(updated));
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem('xanhfarm_custom_harvest_lots');
    if (raw) {
      const lots = JSON.parse(raw);
      if (Array.isArray(lots)) {
        const updated = lots.map((l: any) => {
          if (l.id === updatedLot.id || (updatedLot.lotCode && l.lotCode === updatedLot.lotCode)) {
            return { ...l, ...enrichedLot };
          }
          return l;
        });
        localStorage.setItem('xanhfarm_custom_harvest_lots', JSON.stringify(updated));
      }
    }
  } catch {}
}

export function notifySyncEvent(type: string, payload: unknown) {
  if (typeof window === 'undefined') return;
  createNotificationForEvent(type, payload);

  // Đồng bộ storage khi có sự kiện tạo mới, thay đổi trạng thái hoặc cập nhật lô hàng
  if (type === 'LOT_CREATED') {
    const p = payload as any;
    const lot = p?.lot || p;
    if (lot && typeof window !== 'undefined') {
      try {
        const rawCustom = localStorage.getItem('xanhfarm_custom_harvest_lots');
        const customLots = rawCustom ? JSON.parse(rawCustom) : [];
        const filteredCustom = customLots.filter((l: any) => l.id !== lot.id && l.lotCode !== lot.lotCode);
        localStorage.setItem('xanhfarm_custom_harvest_lots', JSON.stringify([lot, ...filteredCustom]));
      } catch {}

      try {
        const rawFarmer = localStorage.getItem('b2b_farmer_lots');
        const farmerLots = rawFarmer ? JSON.parse(rawFarmer) : [];
        const filteredFarmer = farmerLots.filter((l: any) => l.id !== lot.id && l.lotCode !== lot.lotCode);
        localStorage.setItem('b2b_farmer_lots', JSON.stringify([lot, ...filteredFarmer]));
      } catch {}
    }
  } else if (type === 'LOT_STATUS_UPDATED') {
    const p = payload as any;
    const lotCode = p?.lotCode || p?.lot?.lotCode;
    const status = p?.status || p?.lot?.status;
    const lotId = p?.lotId || p?.lot?.id;
    if ((lotCode || lotId) && status) {
      syncLotStatusToFarmerStorage(lotCode, status, p?.rejectionReason, p?.auditNote, lotId);
    }
  } else if (type === 'LOT_UPDATED') {
    const p = payload as any;
    const updatedLot = p?.updatedLot || p?.lot || p;
    if (updatedLot) {
      syncLotFieldsToFarmerStorage(updatedLot);
    }
  }

  const channel = getChannel();
  if (channel) {
    channel.postMessage({ type, payload, timestamp: Date.now() });
  }
  // Dispatch local events so same-window listeners also wake up
  try {
    window.dispatchEvent(new CustomEvent('b2b_sync_event', { detail: { type, payload } }));
    window.dispatchEvent(new CustomEvent('b2b_rfq_updated', { detail: payload }));
    window.dispatchEvent(new CustomEvent('b2b_lot_updated', { detail: payload }));
  } catch {}
}

export function getSyncNotifications(audience?: 'BUYER' | 'FARMER' | 'ADMIN') {
  if (typeof window === 'undefined') return [] as B2bNotification[];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    const all = raw ? JSON.parse(raw) as B2bNotification[] : [];
    return audience ? all.filter((item) => item.audience === audience || item.audience === 'ALL') : all;
  } catch {
    return [] as B2bNotification[];
  }
}

export function markSyncNotificationRead(id: string) {
  if (typeof window === 'undefined') return;
  const all = getSyncNotifications();
  localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(all.map((item) => item.id === id ? { ...item, read: true } : item)));
  window.dispatchEvent(new CustomEvent('b2b_notification_updated'));
}

export function markAllSyncNotificationsRead(audience: 'BUYER' | 'FARMER' | 'ADMIN') {
  if (typeof window === 'undefined') return;
  const all = getSyncNotifications();
  localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(all.map((item) => item.audience === audience || item.audience === 'ALL' ? { ...item, read: true } : item)));
  window.dispatchEvent(new CustomEvent('b2b_notification_updated'));
}

export function subscribeB2bNotifications(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('b2b_notification_updated', handler);
  return () => window.removeEventListener('b2b_notification_updated', handler);
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
    expiresAt: rfq.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
  const rawKey = String(rfqIdOrCode || '').trim().toUpperCase();
  const numKey = Number(rfqIdOrCode);

  let idx = current.findIndex(
    (r) =>
      (!isNaN(numKey) && numKey > 0 && r.id === numKey) ||
      (r.rfqCode && r.rfqCode.trim().toUpperCase() === rawKey) ||
      (rawKey && r.rfqCode && rawKey.includes(r.rfqCode.trim().toUpperCase()))
  );

  // Fallback nếu không tìm thấy trong getSyncRfqs: quét thêm b2b_farmer_rfqs
  if (idx === -1 && typeof window !== 'undefined') {
    try {
      const fRfqs: any[] = JSON.parse(localStorage.getItem('b2b_farmer_rfqs') || '[]');
      const foundF = fRfqs.find(
        (fr) =>
          (!isNaN(numKey) && numKey > 0 && Number(fr.id) === numKey) ||
          String(fr.id) === rawKey ||
          String(fr.rfqCode).trim().toUpperCase() === rawKey
      );
      if (foundF) {
        const converted: B2bSyncRfq = {
          id: typeof foundF.id === 'number' ? foundF.id : Date.now(),
          rfqCode: foundF.rfqCode || `RFQ-${Date.now()}`,
          harvestLotId: foundF.harvestLotId || 1,
          lotCode: foundF.harvestLotCode || foundF.lotCode || 'LOT-2026-DL-001',
          farmerName: foundF.farmerName || 'HTX Nông Nghiệp Đà Lạt GAP',
          productName: foundF.productName || 'Nông sản VietGAP',
          buyerName: foundF.buyerName || 'Đại diện Buyer',
          buyerPhone: foundF.buyerPhone || '0901234567',
          buyerCompany: foundF.buyerCompany || 'Công ty Thu Mua B2B',
          requestedQuantityKg: Number(foundF.requestedQuantity || foundF.requestedQuantityKg || 1000),
          targetPricePerKg: Number(foundF.targetPrice || foundF.targetPricePerKg || 15000),
          desiredDeliveryDate: foundF.deliveryDate || new Date().toISOString().slice(0, 10),
          deliveryLocation: foundF.hubLocation || foundF.deliveryLocation || 'Trạm Trung Chuyển Đức Trọng',
          shippingOption: foundF.shippingOption || 'cold_storage_truck',
          status: 'WAITING_FARMER',
          createdAt: foundF.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        current.unshift(converted);
        idx = 0;
      }
    } catch {}
  }

  if (idx === -1) {
    console.warn('farmerRespondRfq: RFQ không tìm thấy trong b2bSyncService:', rfqIdOrCode);
    if (current.length > 0) {
      idx = 0;
    } else {
      return { rfq: {} as any };
    }
  }

  const rfq = { ...current[idx] };
  let newContract: B2bSyncContract | undefined;

  if (action === 'ACCEPT') {
    rfq.status = 'ACCEPTED';
    rfq.updatedAt = new Date().toISOString();
    // Tự động sinh hợp đồng B2B
    newContract = createContractFromRfq(rfq, rfq.targetPricePerKg);
    rfq.contractId = newContract.id;
    rfq.contractCode = newContract.contractCode;
    rfq.depositStatus = newContract.depositStatus;
    rfq.depositAmount = newContract.depositAmount;

    // Đồng bộ trạng thái lên shared API
    if (typeof window !== 'undefined') {
      fetch('/api/b2b-shared-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_RFQ_STATUS',
          rfqCode: rfq.rfqCode,
          status: 'ACCEPTED',
        }),
      }).catch(() => {});
    }
  } else if (action === 'COUNTER') {
    if (!counterPrice || counterPrice <= 0) throw new Error('Giá phản hồi không hợp lệ');
    rfq.status = 'WAITING_BUYER';
    rfq.counterPricePerKg = counterPrice;
    rfq.updatedAt = new Date().toISOString();
  } else if (action === 'REJECT') {
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

  const newContract = createContractFromRfq(rfq, finalPrice);
  rfq.contractId = newContract.id;
  rfq.contractCode = newContract.contractCode;
  rfq.depositStatus = newContract.depositStatus;
  rfq.depositAmount = newContract.depositAmount;
  current[idx] = rfq;
  localStorage.setItem(STORAGE_KEY_RFQS, JSON.stringify(current));
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

/** Đồng bộ danh sách hợp đồng Buyer từ backend, loại bỏ dữ liệu mẫu cũ trong localStorage. */
export function replaceSyncContracts(contracts: B2bSyncContract[]): B2bSyncContract[] {
  if (typeof window === 'undefined') return contracts;
  localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(contracts));
  notifySyncEvent('CONTRACTS_SYNCED', { contracts });
  return contracts;
}

function createContractFromRfq(rfq: B2bSyncRfq, pricePerKg: number): B2bSyncContract {
  const contracts = getSyncContracts();
  const total = rfq.requestedQuantityKg * pricePerKg;
  const deposit = Math.round(total * 0.3);
  const remaining = total - deposit;
  const targetFarmName = rfq.farmerName || 'HTX Nông Nghiệp Đà Lạt GAP';
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
    farmerName: targetFarmName,
    farmerPhone: '0912345678',
    farmerCompany: targetFarmName,
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

  const updated = [newContract, ...contracts.filter((c) => c.id !== newContract.id && c.contractCode !== newContract.contractCode)];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(updated));
      // Lưu vào b2b_farmer_contracts để tương thích tuyệt đối cả hai phân hệ
      const existingFarmer: any[] = JSON.parse(localStorage.getItem('b2b_farmer_contracts') || '[]');
      const filteredFarmer = existingFarmer.filter((c) => c.id !== newContract.id && c.contractCode !== newContract.contractCode);
      filteredFarmer.unshift(newContract);
      localStorage.setItem('b2b_farmer_contracts', JSON.stringify(filteredFarmer));

      // Đẩy lên Server Shared Sync API
      fetch('/api/b2b-shared-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REGISTER_CONTRACT', contract: newContract }),
      }).catch(() => {});

      window.dispatchEvent(new CustomEvent('b2b_sync_event', { detail: { type: 'CONTRACT_CREATED', contract: newContract } }));
      window.dispatchEvent(new CustomEvent('b2b_contract_updated', { detail: newContract }));
    } catch {}
  }

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
