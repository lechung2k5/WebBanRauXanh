'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  FileText,
  ChevronRight,
  RotateCw,
  Eye,
  AlertTriangle,
  Building2,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  TrendingUp,
  LockKeyhole,
  Scale,
  QrCode,
  Image as ImageIcon,
  X,
  Printer,
  ExternalLink,
  Edit3,
  Award,
} from 'lucide-react';
import {
  B2bSyncContract,
  getSyncContracts,
  subscribeB2bSyncEvents,
  farmerStartHarvest,
  farmerCompleteHarvest,
  farmerVerifyHarvest,
  replaceSyncContracts,
} from '@/services/b2bSyncService';
import { getFarmerContractsFromServer, startFarmerHarvest } from '@/services/farmerApi';
import { api } from '@/services/auth';
import { HarvestPackagingModal } from '@/components/farmer/HarvestPackagingModal';
import B2bContractViewModal, { B2bContractModalData } from '@/components/common/B2bContractViewModal';
import { formatDateVi, formatStatusVi, formatFulfillmentStatusVi } from '@/utils/formatters';
import { b2bWebSocket } from '@/services/websocketService';
import { ContractLiveTrackingMap } from '@/components/common/ContractLiveTrackingMap';

interface FarmerOrderManagementViewProps {
  onNavigateToPostSale: (contractId: number) => void;
  formatVnd: (val?: number) => string;
}

const parsePickupDetails = (rawStr: unknown) => {
  const text = String(rawStr || '').trim();
  if (!text || text === '—') {
    return {
      farmLocation: 'Vườn Nông Dân VietGAP, Xã Xuân Thọ, Đà Lạt',
      contactPhone: '0912.345.678',
      roadAccess: 'Đường bê tông nông thôn 6m, xe tải 5 tấn vào tận bãi sân đóng gói nhà vườn',
    };
  }

  let contactPhone = '';
  const phoneMatch = text.match(/(?:SĐT|Số\s*điện\s*thoại)?\s*đ[oóòỏõọôốồổỗộ]n\s*xe:\s*([0-9\.\s]+)/iu);
  if (phoneMatch) {
    contactPhone = phoneMatch[1].replace(/[-–—\s]+$/, '').trim();
  }

  let roadAccess = '';
  const roadMatch = text.match(/[-–—]\s*([^\)]+)/u);
  if (roadMatch) {
    roadAccess = roadMatch[1].trim();
  }

  // Tẩy sạch triệt để toàn bộ các cụm (SĐT đón xe: ...) bị lặp nhiều lần để lấy tên rẫy/địa chỉ tinh gọn
  let farmLocation = text
    .replace(/\s*\(\s*(?:s[đd]t|số\s*điện\s*thoại)?\s*đ[oóòỏõọôốồổỗộ]n\s*xe[\s\S]*?\)/giu, '')
    .trim();
  farmLocation = farmLocation.replace(/\(\s*\)/g, '').trim();

  return {
    farmLocation: farmLocation || 'Vườn Nông Dân VietGAP, Xã Xuân Thọ, Đà Lạt',
    contactPhone: contactPhone || '0912.345.678',
    roadAccess: roadAccess || 'Đường bê tông nông thôn 6m, xe tải 5 tấn vào tận bãi sân đóng gói nhà vườn',
  };
};

function computeClientStep(rawStatus?: string, depositStatus?: string, rawFulfillment?: string): number {
  const s = String(rawStatus || '').trim().toUpperCase();
  const fs = String(rawFulfillment || '').trim().toUpperCase();
  const ds = String(depositStatus || '').trim().toUpperCase();

  if (s === 'COMPLETED' || s === 'SETTLED' || fs === 'COMPLETED') return 6;
  if (s === 'DELIVERED' || s === 'IN_TRANSIT' || fs === 'DELIVERED' || fs === 'IN_TRANSIT') return 5;
  if (s === 'QC_PASSED' || s === 'READY_OUTBOUND' || s === 'OUTBOUND_DISPATCHED' || s === 'QC_FAILED' || s === 'AT_HUB_QC' || fs === 'HUB_DELIVERED' || fs === 'QC_FAILED' || fs === 'QC_RETURNED_REFUNDED') return 4;
  if (s === 'IN_TRANSIT_HUB' || s === 'PICKUP_DISPATCHED' || s === 'PACKAGING_APPROVED' || fs === 'PACKAGING_APPROVED') return 3;
  if (
    s === 'ACTIVE' || s === 'DEPOSIT_PAID' || ds === 'DEPOSIT_PAID' ||
    s === 'HARVEST_SUBMITTED' || s === 'HARVEST_REJECTED' || s === 'HARVESTED' ||
    fs === 'HARVEST_SUBMITTED' || fs === 'HARVESTED' ||
    fs === 'HARVESTING' || fs === 'WAITING_HARVEST'
  ) return 2;
  return 1;
}

function computeClientStepName(rawStatus?: string, depositStatus?: string, rawFulfillment?: string, isApproved?: boolean): string {
  const s = String(rawStatus || '').trim().toUpperCase();
  const fs = String(rawFulfillment || '').trim().toUpperCase();
  const ds = String(depositStatus || '').trim().toUpperCase();

  if (s === 'COMPLETED' || fs === 'COMPLETED') return 'Giao Dịch Thành Công · Đã Quyết Toán 100% Tiền Tươi';
  if (s === 'SETTLED') return 'Buyer Đã Ký ePOD và Thanh Toán 70% · Chờ Kế Toán Giải Ngân';
  if (s === 'DELIVERED' || fs === 'DELIVERED') return 'Đã Giao Tới Kho Buyer · Chờ Buyer Nghiệm Thu và Ký ePOD';
  if (s === 'IN_TRANSIT' || fs === 'IN_TRANSIT') return 'Xe Lạnh Đang Vận Chuyển Tới Kho Buyer';
  if (s === 'OUTBOUND_DISPATCHED') return 'Đã Điều Phối Xe Lạnh Chặng Cuối (Outbound)';
  if (s === 'QC_PASSED') return 'Đạt Chuẩn QC HoNa Fresh · Đang Lưu Kho Mát Chờ Xuất';
  if (s === 'AT_HUB_QC' || fs === 'HUB_DELIVERED') return 'Đã Tới Trạm Hub · Đang Kiểm Định QC (Brix / Nitrat)';
  if (s === 'IN_TRANSIT_HUB') return 'Tài Xế Đã Lấy Hàng · Đang Vận Chuyển Về Trạm Hub';
  if (s === 'PICKUP_DISPATCHED') return 'Đã Điều Phối Xe Gom · Tài Xế Đang Tới Vườn Lấy Hàng';
  if (s === 'PACKAGING_APPROVED' || isApproved) return 'BQT Đã Duyệt Bao Bì · Đã Thu Hoạch Xong & Chờ Điều Xe';
  if (s === 'HARVEST_REJECTED') return 'BQT Yêu Cầu Làm Lại Nghiệm Thu · Vui Lòng Cập Nhật';
  if (s === 'HARVEST_SUBMITTED' || fs === 'HARVEST_SUBMITTED' || s === 'HARVESTED' || fs === 'HARVESTED') return 'Đã Nộp Nghiệm Thu · Chờ BQT Duyệt Đóng Gói';
  if (s === 'ACTIVE' || s === 'DEPOSIT_PAID' || ds === 'DEPOSIT_PAID') return 'Đã Cọc 30% · Nhà Vườn Chuẩn Bị Thu Hoạch và Đóng Gói';
  return 'Chờ Buyer Đặt Cọc 30% Escrow';
}

export default function FarmerOrderManagementView({
  onNavigateToPostSale,
  formatVnd,
}: FarmerOrderManagementViewProps) {
  const [contracts, setContracts] = useState<B2bSyncContract[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'WAITING_DEPOSIT' | 'STEP_2' | 'STEP_3' | 'STEP_4' | 'STEP_6'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewingContract, setViewingContract] = useState<B2bContractModalData | null>(null);
  const [reviewingContract, setReviewingContract] = useState<B2bSyncContract | null>(null);

  // Modal Nghiệm thu Thu hoạch & Đóng gói sau khi cắt rau
  const [harvestVerificationContract, setHarvestVerificationContract] = useState<B2bSyncContract | null>(null);
  const [actualWeight, setActualWeight] = useState<number>(0);
  const [packagingType, setPackagingType] = useState<string>('Thùng xốp 15kg (Dán tem niêm phong)');
  const [boxCount, setBoxCount] = useState<number>(10);
  const [proofImage, setProofImage] = useState<string>('https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600');
  const [farmPickupAddress, setFarmPickupAddress] = useState<string>('');
  const [harvestNotes, setHarvestNotes] = useState<string>('Rau thu hoạch sáng sớm, cuống tươi ráo sương, tỷ lệ loại 1 đạt 98%');
  const [submittingVerification, setSubmittingVerification] = useState<boolean>(false);
  const [liveTrackingContract, setLiveTrackingContract] = useState<any | null>(null);
  const [qcDetailContract, setQcDetailContract] = useState<any | null>(null);

  const openPrintQcReportA4 = (c: any) => {
    const win = window.open('', '_blank', 'width=900,height=780');
    if (!win) {
      setQcDetailContract(c);
      return;
    }

    const isQcReturned = c.qcStatus === 'QC_RETURNED' || c.fulfillmentStatus === 'QC_RETURNED_REFUNDED';
    const isQcFailed = !isQcReturned && (c.qcStatus === 'QC_FAILED' || c.status === 'QC_FAILED');
    const isFailed = isQcReturned || isQcFailed;

    const brixVal = Number(c.qcBrix ?? 12.5);
    const nitrateVal = Number(c.qcNitratePpm ?? 220);
    const pesticideSafe = c.qcPesticideSafe !== false;
    const tempVal = Number(c.farmHandoverTemp ?? 4.0);

    const inspectDate = c.qcPassedAt ? new Date(c.qcPassedAt) : new Date();
    const dayStr = String(inspectDate.getDate()).padStart(2, '0');
    const monthStr = String(inspectDate.getMonth() + 1).padStart(2, '0');
    const yearStr = String(inspectDate.getFullYear());
    const harvestDateStr = c.harvestedAt
      ? new Date(c.harvestedAt).toLocaleDateString('vi-VN')
      : c.createdAt
      ? new Date(c.createdAt).toLocaleDateString('vi-VN')
      : `${dayStr}/${monthStr}/${yearStr}`;

    const q3Weight = Number(c.inboundNetWeightKg || c.actualHarvestWeightKg || c.quantityKg || 0);
    const overallResult = isQcReturned
      ? 'Không đạt (Đã lập biên bản hoàn hàng & hoàn cọc)'
      : isQcFailed
      ? 'Không đạt'
      : 'Đạt chuẩn QA/QC HoNa Fresh';
    const recommendation = c.deliveryNotes
      ? c.deliveryNotes
      : isFailed
      ? 'Cô lập lô hàng không đạt chuẩn, lập biên bản hoàn trả Nhà vườn và hoàn cọc 30% Escrow cho Thương lái.'
      : `Lô hàng đạt chuẩn VietGAP (${q3Weight.toLocaleString('vi-VN')} kg). Cho phép lưu kho mát tại ${c.hubWarehouseZone || 'Zone A'} / ${c.hubRackBin || 'BIN A-01'} và ưu tiên xuất kho theo FEFO.`;

    const actionGuide = isFailed
      ? `1. Tạm khóa lô hàng ${c.lotCode || c.contractCode} trên hệ thống xuất kho Outbound.\n2. Thông báo Nhà vườn (${c.farmerName || 'Chủ vườn'}) nhận lại hàng hoàn trả tại trạm ${c.hubName || 'HoNa Fresh'}.\n3. Kiểm tra lại quy trình canh tác (Brix/Nitrate/BVTV) trước khi mở bán lô kế tiếp.`
      : `1. Tiếp nhận bảo quản liên tục ở dải nhiệt độ 2.0°C – 6.0°C tại ${c.hubWarehouseZone || 'Zone A'} / ${c.hubRackBin || 'BIN A-01'}.\n2. Mở khóa ghép chuyến giao hàng Outbound tới kho Thương lái (${c.buyerName || 'Buyer'}).\n3. Đối soát và giải ngân Payout cho Nhà vườn sau khi hoàn tất ePOD.`;

    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Báo Cáo Kiểm Soát Chất Lượng (QA/QC) - ${c.contractCode}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: "Times New Roman", Times, serif; color: #0f172a; font-size: 13px; line-height: 1.5; max-width: 820px; margin: 0 auto; padding: 16px; }
            .no-print { display: flex; justify-content: flex-end; gap: 8px; padding-bottom: 12px; margin-bottom: 14px; border-bottom: 1px dashed #cbd5e1; font-family: Arial, sans-serif; }
            @media print { .no-print { display: none !important; } body { padding: 0; max-width: none; } }
            table.header-box { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            table.header-box td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: center; vertical-align: top; }
            h2.sec { font-size: 13.5px; font-weight: bold; margin: 14px 0 6px; }
            p.line { margin: 4px 0; }
            table.criteria { width: 100%; border-collapse: collapse; margin: 8px 0 12px; }
            table.criteria th, table.criteria td { border: 1px solid #64748b; padding: 7px 9px; font-size: 12.5px; }
            table.criteria th { background: #f1f5f9; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()" style="background:#10542c;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:bold;cursor:pointer;">In Báo Cáo QC (A4)</button>
            <button onclick="window.close()" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:8px 14px;border-radius:8px;font-weight:bold;cursor:pointer;">Đóng</button>
          </div>

          <table class="header-box">
            <tr>
              <td style="width:42%;">
                <div style="font-weight:bold;">Bộ phận</div>
                <div style="margin-top:6px;">Phòng Kiểm Định Chất Lượng (QA/QC)<br/>Hệ thống HoNa Fresh</div>
              </td>
              <td style="width:58%;">
                <div style="font-weight:bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div style="font-weight:bold;">Độc lập - Tự do - Hạnh phúc</div>
                <div>---------</div>
                <div style="margin-top:6px;font-style:italic;">Ngày ${dayStr} Tháng ${monthStr} Năm ${yearStr}</div>
              </td>
            </tr>
          </table>

          <div style="text-align:center;margin:10px 0 16px;">
            <div style="font-size:16px;font-weight:bold;">BÁO CÁO</div>
            <div style="font-size:15px;font-weight:bold;margin-top:2px;">KIỂM SOÁT CHẤT LƯỢNG SẢN PHẨM (QA/QC)</div>
          </div>

          <h2 class="sec">1. Thông tin sản phẩm</h2>
          <p class="line"><strong>Tên sản phẩm:</strong> ${c.productName || 'Nông sản VietGAP'} (Khối lượng: ${q3Weight.toLocaleString('vi-VN')} kg)</p>
          <p class="line"><strong>Mã sản phẩm / Hợp đồng:</strong> ${c.contractCode}</p>
          <p class="line"><strong>Ngày sản xuất / Thu hoạch:</strong> ${harvestDateStr}</p>
          <p class="line"><strong>Lô sản xuất / Mã PUC:</strong> ${c.lotCode || 'LOT-VG'} ${c.pucCode ? `· ${c.pucCode}` : ''}</p>

          <h2 class="sec">2. Thông tin bộ phận/ đơn vị kiểm tra</h2>
          <p class="line"><strong>Tên người kiểm tra:</strong> Kỹ thuật viên KCS HoNa Fresh</p>
          <p class="line"><strong>Chức vụ:</strong> Chuyên viên Kiểm soát Chất lượng (QA/QC) — ${c.hubName || 'Trạm Trung Chuyển HoNa Fresh'}</p>
          <p class="line"><strong>Ngày kiểm tra:</strong> ${inspectDate.toLocaleString('vi-VN')}</p>

          <h2 class="sec">3. Tiêu chí kiểm soát chất lượng</h2>
          <table class="criteria">
            <thead>
              <tr>
                <th style="width:45px;">STT</th>
                <th>Tiêu chí kiểm tra</th>
                <th>Tiêu chuẩn đầu ra</th>
                <th>Kết quả kiểm tra</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align:center;">1</td>
                <td>Độ ngọt / Chất lượng (Brix)</td>
                <td style="text-align:center;">≥ 10.0 °Bx</td>
                <td style="text-align:center;font-weight:bold;">${brixVal} °Bx</td>
                <td style="text-align:center;font-weight:bold;color:${brixVal >= 10 ? '#15803d' : '#be123c'};">${brixVal >= 10 ? 'Đạt' : 'Không đạt'}</td>
              </tr>
              <tr>
                <td style="text-align:center;">2</td>
                <td>Dư lượng Nitrate (NO₃⁻)</td>
                <td style="text-align:center;">≤ 300 ppm</td>
                <td style="text-align:center;font-weight:bold;">${nitrateVal} ppm</td>
                <td style="text-align:center;font-weight:bold;color:${nitrateVal <= 300 ? '#15803d' : '#be123c'};">${nitrateVal <= 300 ? 'Đạt' : 'Vượt ngưỡng'}</td>
              </tr>
              <tr>
                <td style="text-align:center;">3</td>
                <td>Dư lượng thuốc BVTV (Test nhanh)</td>
                <td style="text-align:center;">Âm tính (0%)</td>
                <td style="text-align:center;font-weight:bold;">${pesticideSafe ? 'Âm tính' : 'Dương tính'}</td>
                <td style="text-align:center;font-weight:bold;color:${pesticideSafe ? '#15803d' : '#be123c'};">${pesticideSafe ? 'An toàn' : 'Không đạt'}</td>
              </tr>
              <tr>
                <td style="text-align:center;">4</td>
                <td>Nhiệt độ bảo quản & Cảm quan</td>
                <td style="text-align:center;">2.0°C – 6.0°C, tươi ráo</td>
                <td style="text-align:center;font-weight:bold;">${tempVal.toFixed(1)} °C</td>
                <td style="text-align:center;font-weight:bold;color:#15803d;">Đạt chuỗi lạnh</td>
              </tr>
            </tbody>
          </table>

          <h2 class="sec">4. Đánh giá tổng quát</h2>
          <p class="line" style="padding-left:14px;">- <strong>Kết quả chung:</strong> <span style="font-weight:bold;color:${isFailed ? '#be123c' : '#15803d'};">${overallResult}</span></p>
          <p class="line" style="padding-left:14px;">- <strong>Khuyến nghị:</strong> ${recommendation}</p>

          <h2 class="sec">5. Hướng dẫn triển khai xử lý & bảo quản</h2>
          <div style="white-space:pre-line;padding-left:14px;">${actionGuide}</div>

          <div style="display:flex;justify-content:space-between;gap:24px;margin-top:26px;text-align:center;">
            <div style="flex:1;">
              <div style="font-weight:bold;">ĐẠI DIỆN NHÀ VƯỜN</div>
              <div style="font-size:11px;color:#475569;margin-bottom:46px;">(Đã đối soát kết quả)</div>
              <div style="font-weight:bold;">${c.farmerName || 'Nhà vườn cung ứng'}</div>
            </div>
            <div style="flex:1;">
              <div style="font-weight:bold;">NGƯỜI KIỂM TRA (QA/QC)</div>
              <div style="font-size:11px;color:#475569;margin-bottom:46px;">(Ký xác thực điện tử)</div>
              <div style="font-weight:bold;">KTV KCS HoNa Fresh</div>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const openHarvestVerificationModal = (contract: B2bSyncContract) => {
    const defaultQty = contract.quantityKg || 100;
    setHarvestVerificationContract(contract);
    setActualWeight(contract.actualHarvestWeightKg || defaultQty);
    setPackagingType(contract.packageType || 'Thùng xốp 15kg (Dán tem niêm phong)');
    setBoxCount(contract.packageCount || Math.ceil(defaultQty / 15));
    setProofImage(contract.harvestProofImageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600');
    setFarmPickupAddress(contract.farmPickupAddress || contract.farmerCompany || 'Nông trại VietGAP HoNa Fresh, Đơn Dương, Lâm Đồng');
    setHarvestNotes('Rau thu hoạch sáng sớm, cuống tươi ráo sương, tỷ lệ loại 1 đạt 98%');
  };

  const handleConfirmVerifyHarvest = async () => {
    if (!harvestVerificationContract) return;
    setSubmittingVerification(true);
    try {
      const cId = harvestVerificationContract.id;
      const qrData = `HONAFRESH-PUC-${harvestVerificationContract.contractCode}-BOX-${boxCount}`;

      // 1. Gọi backend API
      const harvestPayload = {
        actualHarvestWeightKg: actualWeight,
        grade1Ratio: 96,
        harvestProofImageUrl: proofImage,
        packageCount: boxCount,
        packageType: packagingType,
        qrCodeData: qrData,
        farmPickupAddress: farmPickupAddress,
        notes: harvestNotes,
      };
      await api(`farmer/contracts/${cId}/verify-harvest`, 'POST', harvestPayload).catch((err) => {
        console.warn('API verify-harvest warning:', err);
      });

      // 2. Cập nhật sync store
      farmerVerifyHarvest(cId, harvestPayload);

      // 3. Bắn STOMP WebSocket cho Admin và Buyer
      b2bWebSocket.publish('/topic/contracts', {
        action: 'HARVESTED',
        contractCode: harvestVerificationContract.contractCode,
        status: 'HARVESTED',
        ...harvestPayload,
      });

      setActionSuccessMsg('Đã nghiệm thu thu hoạch xong! Dữ liệu đã chuyển sang Ban Quản Trị để điều phối xe.');
      setHarvestVerificationContract(null);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      void reloadContracts();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi nộp biên bản nghiệm thu.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Load contracts from sync service and backend API
  const isReloadingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedReloadContracts = useCallback((delay = 600) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void reloadContracts();
    }, delay);
  }, []);

  const reloadContracts = async () => {
    if (isReloadingRef.current) return;
    isReloadingRef.current = true;
    setRefreshing(true);
    try {
      const apiContracts = await getFarmerContractsFromServer().catch(() => []);
      const map = new Map<string, B2bSyncContract>();

      // 1. Nếu Backend API có trả về dữ liệu -> Server là thẩm quyền tuyệt đối!
      if (apiContracts && apiContracts.length > 0) {
        for (const ac of apiContracts) {
          if (!ac || !ac.contractCode) continue;
          const key = ac.contractCode.trim().toUpperCase();
          const rawStatus = String((ac as any).status || ac.depositStatus || '').toUpperCase();
          const rawFulfillment = String(ac.fulfillmentStatus || (ac as any).fulfillment_status || '').toUpperCase();
          const isDepositPaid = rawStatus === 'DEPOSIT_PAID' || ac.depositStatus === 'DEPOSIT_PAID' || Boolean(ac.depositPaidAt) || rawStatus === 'ACTIVE';
          const isApproved = Boolean(
            (ac as any).packagingApproved ||
            (ac as any).packaging_approved ||
            rawStatus === 'PACKAGING_APPROVED' ||
            rawStatus === 'PICKUP_DISPATCHED' ||
            rawStatus === 'IN_TRANSIT_HUB' ||
            rawStatus === 'AT_HUB_QC' ||
            rawStatus === 'QC_PASSED' ||
            rawStatus === 'OUTBOUND_DISPATCHED' ||
            rawStatus === 'IN_TRANSIT' ||
            rawStatus === 'DELIVERED' ||
            rawStatus === 'SETTLED' ||
            rawStatus === 'COMPLETED'
          );
          const isHarvestDone = Boolean(
            (ac as any).is_harvest_done ||
            Boolean((ac as any).actualHarvestWeightKg) ||
            Boolean((ac as any).actual_harvest_weight_kg) ||
            isApproved ||
            rawStatus === 'HARVESTED'
          );

          const fStep = (ac as any).fulfillmentStep || computeClientStep(rawStatus, ac.depositStatus, rawFulfillment);
          const fName = (ac as any).fulfillmentStatusName || computeClientStepName(rawStatus, ac.depositStatus, rawFulfillment, isApproved);

          const item: B2bSyncContract = {
            id: ac.id,
            contractCode: ac.contractCode,
            rfqCode: ac.rfqCode || `RFQ-${ac.id}`,
            lotId: ac.harvestLotId,
            lotCode: ac.lotCode || 'LOT-2026-DL-001',
            productName: ac.productName || 'Nông sản VietGAP',
            buyerName: ac.buyerName || 'Khách mua sỉ',
            buyerPhone: ac.buyerPhone || '0901234567',
            buyerCompany: (ac as any).buyerCompany || ac.buyerName || 'Khách mua sỉ',
            buyerAddress: (ac as any).buyerAddress || (ac as any).deliveryAddress || ac.hubName || '',
            farmerName: (ac as any).farmerName || ac.farmName || 'HTX Nông Nghiệp Đà Lạt GAP',
            farmerPhone: ac.farmerPhone || '0912345678',
            farmerCompany: (ac as any).farmerCompany || ac.farmName || 'HTX Nông Nghiệp Đà Lạt GAP',
            farmerAddress: (ac as any).farmerAddress || (ac as any).farmPickupAddress || '',
            pucCode: (ac as any).pucCode || '',
            shippingOption: (ac as any).shippingOption || (ac as any).shipping_option || 'CROSS_DOCKING_HUB',
            quantityKg: Number(ac.quantity) || 0,
            agreedPricePerKg: Number(ac.unitPrice) || 0,
            totalAmount: Number(ac.totalAmount) || 0,
            depositAmount: Number(ac.depositAmount) || 0,
            remainingAmount: Number(ac.remainingAmount) || (Number(ac.totalAmount || 0) - Number(ac.depositAmount || 0)),
            status: rawStatus,
            depositStatus: isDepositPaid ? 'DEPOSIT_PAID' : 'WAITING_DEPOSIT',
            depositPaidAt: ac.depositPaidAt,
            fulfillmentStatus: rawFulfillment,
            fulfillmentStep: fStep,
            fulfillmentStatusName: fName,
            truckLicensePlate: ac.pickupTruckPlate || ac.truckType || '',
            truckDriverName: ac.pickupDriverName || '',
            truckDriverPhone: ac.pickupDriverPhone || '',
            truckTempCurrent: 4.0,
            deliveryAddress: (ac as any).buyerAddress || (ac as any).deliveryAddress || ac.hubName || 'Trạm Trung Chuyển Đức Trọng',
            deliveryTimeSlot: ac.hubDeliveryDate || '06:00 - 09:00',
            finalPaidStatus: (ac.settlementId || (ac as any).settledAt || (ac as any).remainingPaymentStatus === 'PAID' || rawStatus === 'SETTLED' || rawStatus === 'COMPLETED' || fStep === 6) ? 'PAID' : 'UNPAID',
            epodSignedAt: (ac as any).epodDeliveredAt || (ac as any).epodSignedAt || ((ac as any).epodSignatureUrl ? ((ac as any).epodDeliveredAt || new Date().toISOString()) : undefined),
            epodDeliveredWeightKg: (ac as any).epodDeliveredWeightKg || ac.quantity,
            hubWarehouseZone: (ac as any).hubWarehouseZone || (ac as any).hub_warehouse_zone,
            hubRackBin: (ac as any).hubRackBin || (ac as any).hub_rack_bin,
            hubInboundAt: (ac as any).hubInboundAt || (ac as any).hub_inbound_at,
            qcStatus: (ac as any).qcStatus || (ac as any).qc_status,
            qcPassedAt: (ac as any).qcPassedAt || (ac as any).qc_passed_at,
            outboundTruckPlate: (ac as any).outboundTruckPlate || (ac as any).outbound_truck_plate,
            outboundDriverName: (ac as any).outboundDriverName || (ac as any).outbound_driver_name,
            settledAt: (ac as any).settledAt || (ac as any).settled_at,
            remainingPaymentStatus: (ac as any).remainingPaymentStatus || (ac as any).remaining_payment_status,
            packagingApproved: isApproved,
            isHarvestDone: isHarvestDone,
            actualHarvestWeightKg: (ac as any).actual_harvest_weight_kg || (ac as any).actualHarvestWeightKg,
            grade1Ratio: (ac as any).grade1_ratio || (ac as any).grade1Ratio || 96,
            packageCount: (ac as any).package_count || (ac as any).packageCount,
            packageType: (ac as any).package_type || (ac as any).packageType,
            harvestProofImageUrl: (ac as any).harvest_proof_image_url || (ac as any).harvestProofImageUrl,
            qrCodeData: (ac as any).qr_code_data || (ac as any).qrCodeData,
            farmPickupAddress: (ac as any).farm_pickup_address || (ac as any).farmPickupAddress,
            deliveryNotes: (ac as any).deliveryNotes || (ac as any).delivery_notes || '',
            notes: (ac as any).notes || (ac as any).harvest_notes,
            createdAt: ac.createdAt || new Date().toISOString(),
          } as any;

          map.set(key, item);
        }
      } else {
        // Fallback local nếu server không có dữ liệu
        const localSync: B2bSyncContract[] = getSyncContracts();
        for (const lc of localSync) {
          if (lc && lc.contractCode) {
            map.set(lc.contractCode.trim().toUpperCase(), lc);
          }
        }
      }

      const mergedList = Array.from(map.values());
      setContracts(mergedList);
      replaceSyncContracts(mergedList, false);
    } catch (err) {
      console.error('Lỗi tải danh sách hợp đồng Farmer:', err);
    } finally {
      isReloadingRef.current = false;
      setRefreshing(false);
    }
  };

  const handleStartHarvest = async (contractId: number | string) => {
    try {
      farmerStartHarvest(contractId);
      await startFarmerHarvest(Number(contractId)).catch(() => {});
      setActionSuccessMsg('Đã chuyển sang bước Thu hoạch nông sản tại vườn!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      void reloadContracts();
    } catch {}
  };

  const handleCompleteHarvest = (contractId: number | string) => {
    try {
      farmerCompleteHarvest(contractId);
      setActionSuccessMsg('Đã xác nhận thu hoạch xong! Dữ liệu đã chuyển sang Admin để kiểm định.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      void reloadContracts();
    } catch {}
  };

  useEffect(() => {
    void reloadContracts();

    // Lắng nghe trực tiếp từ STOMP WebSocket Message Broker (/topic/contracts)
    const unsubContracts = b2bWebSocket.subscribeContracts((payload) => {
      const code = payload?.contractCode || payload?.contract?.contractCode || payload?.contract?.contract_code;
      const rawStatus = (payload?.action || payload?.contract?.status || payload?.contract?.deposit_status || '').toUpperCase();
      const isDepositPaid = rawStatus === 'DEPOSIT_PAID' || payload?.action === 'DEPOSIT_PAID';
      const isApprovedPackaging = rawStatus === 'PACKAGING_APPROVED' || payload?.action === 'PACKAGING_APPROVED' || payload?.action === 'ADMIN_APPROVED_PACKAGING';

      if (isApprovedPackaging && code) {
        setActionSuccessMsg(`Ban Quản Trị HoNa vừa phê duyệt quy cách đóng gói cho Hợp đồng ${code}! Đang phân công xe lạnh đến rẫy.`);
        try {
          const approvedCodes: string[] = JSON.parse(localStorage.getItem('hona_packaging_approved_codes') || '[]');
          if (!approvedCodes.includes(code)) {
            approvedCodes.push(code);
            localStorage.setItem('hona_packaging_approved_codes', JSON.stringify(approvedCodes));
          }
        } catch {}
        setContracts((prev) =>
          prev.map((c) => {
            if (c.contractCode && c.contractCode.trim().toUpperCase() === code.trim().toUpperCase()) {
              return {
                ...c,
                packagingApproved: true,
                packaging_approved: true,
                status: 'PACKAGING_APPROVED',
                fulfillmentStatusName: 'BQT Đã Duyệt Đóng Gói (Chờ Xe Lạnh Đến Lấy)',
              };
            }
            return c;
          })
        );
        setReviewingContract((prev) => {
          if (prev && prev.contractCode && prev.contractCode.trim().toUpperCase() === code.trim().toUpperCase()) {
            return {
              ...prev,
              packagingApproved: true,
              packaging_approved: true,
              status: 'PACKAGING_APPROVED',
            };
          }
          return prev;
        });
      } else if (isDepositPaid && code) {
        setContracts((prev) =>
          prev.map((c) => {
            if (c.contractCode && c.contractCode.trim().toUpperCase() === code.trim().toUpperCase()) {
              return {
                ...c,
                status: !c.status || c.status === 'AGREED' || c.status === 'RFQ_SENT' ? 'DEPOSIT_PAID' : c.status,
                depositStatus: 'DEPOSIT_PAID',
                depositPaidAt: new Date().toISOString(),
                fulfillmentStep: c.fulfillmentStep <= 1 ? 2 : c.fulfillmentStep,
                fulfillmentStatusName: c.fulfillmentStep <= 1 ? 'Đã Đóng Cọc 30% · Chờ Thu Hoạch & Đóng Gói' : c.fulfillmentStatusName,
              };
            }
            return c;
          })
        );
        setActionSuccessMsg(`Hợp đồng ${code} vừa nhận cọc 30% Escrow thành công! Bạn có thể bắt đầu thu hoạch.`);
      } else if (rawStatus === 'AT_HUB_QC' && code) {
        setContracts((prev) =>
          prev.map((c) => {
            if (c.contractCode && c.contractCode.trim().toUpperCase() === code.trim().toUpperCase()) {
              return {
                ...c,
                status: 'AT_HUB_QC',
                fulfillmentStatus: 'AT_HUB_QC',
                fulfillmentStep: 4,
                fulfillmentStatusName: 'Đã Tới Trạm Hub · Đang Kiểm Định QC (Brix / Nitrat)',
              };
            }
            return c;
          })
        );
        setActionSuccessMsg(`Xe lạnh đã đưa nông sản Hợp đồng ${code} về trạm Hub! Đang tiến hành kiểm định QC & lưu kho.`);
      } else if (rawStatus === 'IN_TRANSIT' && code) {
        const cData = payload?.contract || {};
        setContracts((prev) =>
          prev.map((c) => {
            if (c.contractCode && c.contractCode.trim().toUpperCase() === code.trim().toUpperCase()) {
              return {
                ...c,
                status: 'IN_TRANSIT',
                fulfillmentStatus: 'IN_TRANSIT',
                fulfillmentStep: 5,
                fulfillmentStatusName: 'Xe Lạnh Đang Vận Chuyển Tới Kho Buyer',
                outboundTruckPlate: cData.outboundTruckPlate || (c as any).outboundTruckPlate,
                outboundDriverName: cData.outboundDriverName || (c as any).outboundDriverName,
                driverGpsLat: cData.driverGpsLat ?? (c as any).driverGpsLat,
                driverGpsLng: cData.driverGpsLng ?? (c as any).driverGpsLng,
              } as any;
            }
            return c;
          })
        );
        setActionSuccessMsg(`Chuyến xe lạnh giao Hợp đồng ${code} đã xuất bến! Bạn có thể xem đường đi GPS trực tiếp.`);
      } else if ((rawStatus === 'PACKAGING_REJECTED' || rawStatus === 'HARVEST_REJECTED') && code) {
        const rejectReason = payload?.reason || payload?.contract?.delivery_notes || payload?.contract?.deliveryNotes || '';
        setContracts((prev) =>
          prev.map((c) =>
            c.contractCode && c.contractCode.trim().toUpperCase() === code.trim().toUpperCase()
              ? { ...c, status: 'HARVEST_REJECTED', packagingApproved: false, deliveryNotes: rejectReason || (c as any).deliveryNotes }
              : c
          )
        );
        setActionSuccessMsg(`Ban Quản Trị yêu cầu làm lại nghiệm thu cho Hợp đồng ${code}${rejectReason ? `: ${rejectReason}` : '.'}`);
      } else if ((rawStatus === 'BALANCE_PAID' || rawStatus === 'DELIVERED') && code) {
        const isPaid100 = rawStatus === 'BALANCE_PAID';
        setContracts((prev) =>
          prev.map((c) =>
            c.contractCode && c.contractCode.trim().toUpperCase() === code.trim().toUpperCase()
              ? {
                  ...c,
                  status: 'DELIVERED',
                  fulfillmentStatus: isPaid100 ? 'COMPLETED' : 'DELIVERED',
                  fulfillmentStep: isPaid100 ? 6 : 5,
                  fulfillmentStatusName: isPaid100
                    ? 'Hoàn Thành · Buyer Đã Thanh Toán Đủ 100%'
                    : 'Đã Giao Hàng · Chờ Buyer Thanh Toán 70% Còn Lại',
                  ...(isPaid100 ? { remainingPaymentStatus: 'PAID' } : {}),
                }
              : c
          )
        );
        setActionSuccessMsg(
          isPaid100
            ? `Thương lái đã thanh toán đủ 70% còn lại cho Hợp đồng ${code} · Đơn đã hoàn thành, chờ Kế toán giải ngân!`
            : `Hợp đồng ${code} đã giao hàng thành công!`
        );
      } else if (rawStatus === 'SETTLED' && code) {
        setContracts((prev) =>
          prev.map((c) =>
            c.contractCode && c.contractCode.trim().toUpperCase() === code.trim().toUpperCase()
              ? {
                  ...c,
                  status: 'SETTLED',
                  fulfillmentStatus: 'SETTLED',
                  fulfillmentStep: 6,
                  fulfillmentStatusName: 'Giao Dịch Thành Công · Đã Quyết Toán 100%',
                  remainingPaymentStatus: 'PAID',
                  finalPaidStatus: 'PAID',
                }
              : c
          )
        );
        setActionSuccessMsg(`Sàn HoNa Fresh đã giải ngân hoàn tất cho Hợp đồng ${code}!`);
      } else {
        setActionSuccessMsg(`Hợp đồng ${code || ''} vừa được cập nhật thời gian thực!`);
      }
      setTimeout(() => setActionSuccessMsg(null), 5000);
      debouncedReloadContracts(600);
    });

    // Lắng nghe sự kiện đồng bộ từ tab Buyer hoặc các tab khác
    const unsubscribe = subscribeB2bSyncEvents((event) => {
      if (!event || event.type === 'CONTRACTS_SYNCED' || event.type === 'CONTRACTS_STORAGE_SYNC' || event.type === 'LOT_UPDATED' || event.type === 'PRODUCT_UPDATED') {
        return;
      }
      if (event?.type === 'ADMIN_APPROVED_PACKAGING') {
        const c = event?.payload as any;
        setActionSuccessMsg(`Ban Quản Trị HoNa vừa phê duyệt quy cách đóng gói cho Hợp đồng ${c?.contractCode || ''}! Đang phân công xe lạnh đến rẫy.`);
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
      debouncedReloadContracts(600);
    });

    const unsubDispatch = b2bWebSocket.subscribeDispatch((payload) => {
      const action = String(payload?.action || '').toUpperCase();
      if (
        action.includes('OUTBOUND_TRIP') ||
        action.includes('TRIP_RETURNING') ||
        action.includes('TRIP_ARRIVED') ||
        action.includes('TRIP_COMPLETED') ||
        action.includes('STOP_LOADED')
      ) {
        debouncedReloadContracts(300);
      }
    });

    return () => {
      unsubContracts();
      unsubDispatch();
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debouncedReloadContracts]);

  // Filter & Search
  const filteredContracts = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return contracts.filter((c) => {
      if (!c) return false;
      const matchSearch =
        !q ||
        (c.contractCode || '').toLowerCase().includes(q) ||
        (c.buyerName || '').toLowerCase().includes(q) ||
        (c.productName || '').toLowerCase().includes(q) ||
        (c.lotCode || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'WAITING_DEPOSIT') return c.depositStatus !== 'DEPOSIT_PAID' && (c.fulfillmentStep === 1 || !c.fulfillmentStep);
      if (filterStatus === 'STEP_2') return c.fulfillmentStep === 2;
      if (filterStatus === 'STEP_3') return c.fulfillmentStep === 3;
      if (filterStatus === 'STEP_4') return c.fulfillmentStep === 4 || c.fulfillmentStep === 5;
      if (filterStatus === 'STEP_6') return c.fulfillmentStep === 6 || c.fulfillmentStatusName === 'COMPLETED';
      return true;
    });
  }, [contracts, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalOrders = contracts.length;
    const waitingDeposit = contracts.filter((c) => c.depositStatus === 'WAITING_DEPOSIT').length;
    const inTransit = contracts.filter((c) => c.fulfillmentStep === 3).length;
    const completed = contracts.filter((c) => c.fulfillmentStep === 6).length;
    const totalRevenue = contracts.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    const totalEscrowHolding = contracts
      .filter((c) => c.depositStatus === 'DEPOSIT_PAID')
      .reduce((sum, c) => sum + (c.depositAmount || 0), 0);

    return { totalOrders, waitingDeposit, inTransit, completed, totalRevenue, totalEscrowHolding };
  }, [contracts]);

  const showSuccessNotice = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Thông Báo Thành Công */}
      <div className="rounded-3xl bg-gradient-to-r from-[#10542C] via-[#1B6A3A] to-[#2E7D32] p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-green-100 backdrop-blur-md mb-2">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
              <span>QUẢN LÝ TIẾN ĐỘ ĐƠN HÀNG & TIỀN CỌC</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight">
              Quản Lý Hợp Đồng & Đơn Hàng B2B
            </h1>
            <p className="text-sm text-green-100/90 mt-1 max-w-2xl">
              Theo dõi và cập nhật trạng thái đơn hàng xuyên suốt tiến trình từ nhận cọc 30%, thu hoạch, vận chuyển xe lạnh đến bàn giao và thanh toán. Dữ liệu đồng bộ trực tiếp với khách mua.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={reloadContracts}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2.5 text-xs font-bold text-white transition active:scale-95"
            >
              <RotateCw className={`w-4 h-4 text-emerald-300 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Đồng Bộ Ngay</span>
            </button>
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="mt-4 rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-3 text-xs font-bold text-emerald-100 flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* 2. KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 block uppercase">Tổng Đơn Hàng</span>
          <span className="text-2xl font-black text-[#10542C] mt-1 block">{stats.totalOrders}</span>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Hợp đồng B2B chốt</span>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-amber-100 shadow-2xs bg-amber-50/20">
          <span className="text-[11px] font-bold text-amber-700 block uppercase">Chờ Cọc 30%</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{stats.waitingDeposit}</span>
          <span className="text-[10px] text-amber-600/80 mt-0.5 block">Chờ khách mua quét mã chuyển cọc</span>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-blue-100 shadow-2xs bg-blue-50/20">
          <span className="text-[11px] font-bold text-blue-700 block uppercase">Đang Vận Chuyển</span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">{stats.inTransit}</span>
          <span className="text-[10px] text-blue-600/80 mt-0.5 block">Xe lạnh có cảm biến nhiệt độ</span>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-emerald-100 shadow-2xs bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-700 block uppercase">Đã Quyết Toán</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{stats.completed}</span>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Tiền đã giải ngân về tài khoản</span>
        </div>

        <div className="col-span-2 rounded-2xl bg-white p-4 border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-gray-500 block uppercase">Tiền Cọc Bảo Chứng (30%)</span>
              <span className="text-lg font-black text-emerald-700 mt-0.5 block">{formatVnd(stats.totalEscrowHolding)}</span>
            </div>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">Bảo chứng sàn</span>
          </div>
          <div className="pt-2 border-t border-gray-100 mt-2 flex justify-between text-[11px] text-gray-500">
            <span>Tổng giá trị hợp đồng:</span>
            <b className="text-gray-800">{formatVnd(stats.totalRevenue)}</b>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search & Bộ Lọc Nhanh */}
      <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã hợp đồng (HD-...), tên Buyer, nông sản hoặc mã lô..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#10542C] focus:ring-1 focus:ring-[#10542C] transition bg-gray-50/50"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-gray-400" /> Lọc:
          </span>
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === 'ALL' ? 'bg-[#10542C] text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả ({contracts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('WAITING_DEPOSIT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === 'WAITING_DEPOSIT' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Chờ cọc 30%
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('STEP_2')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === 'STEP_2' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Thu hoạch & Đóng gói
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('STEP_3')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === 'STEP_3' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Đang vận chuyển
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('STEP_6')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === 'STEP_6' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Đã hoàn tất
          </button>
        </div>
      </div>

      {/* 4. Danh Sách Đơn Hàng & Cập Nhật Tiến Trình Nghiệp Vụ */}
      {filteredContracts.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center border border-dashed border-gray-200">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-700">Chưa có đơn hàng nào phù hợp</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Khi khách mua gửi yêu cầu báo giá và hai bên chốt đơn thành công, hợp đồng và tiến trình giao hàng sẽ tự động xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => {
            const cStatusUpper = String(contract.status || '').toUpperCase();
            const isDepositPaid =
              contract.depositStatus === 'DEPOSIT_PAID' ||
              [
                'DEPOSIT_PAID',
                'ACTIVE',
                'HARVESTING',
                'HARVEST_SUBMITTED',
                'HARVEST_REJECTED',
                'HARVESTED',
                'PACKAGING_APPROVED',
                'PICKUP_DISPATCHED',
                'IN_TRANSIT_HUB',
                'AT_HUB_QC',
                'QC_PASSED',
                'OUTBOUND_DISPATCHED',
                'IN_TRANSIT',
                'DELIVERED',
                'SETTLED',
                'COMPLETED',
              ].includes(cStatusUpper);
            const isHarvestRejected =
              String(contract.status || '').toUpperCase() === 'HARVEST_REJECTED';
            const isHarvestDone = Boolean(
              !isHarvestRejected &&
              (
                (contract as any).isHarvestDone ||
                contract.actualHarvestWeightKg ||
                String(contract.status || '').toUpperCase() === 'HARVEST_SUBMITTED' ||
                String((contract as any).fulfillmentStatus || '').toUpperCase() === 'HARVEST_SUBMITTED' ||
                contract.fulfillmentStatusName?.includes('Đã Thu Hoạch') ||
                contract.fulfillmentStatusName?.includes('Đã Nộp') ||
                contract.fulfillmentStep > 2
              )
            );
            const isPackagingApproved = Boolean(
              !isHarvestRejected &&
              (
                (contract as any).packagingApproved ||
                contract.pickupTruckPlate ||
                contract.fulfillmentStep >= 3 ||
                contract.fulfillmentStatusName?.includes('Đã Duyệt')
              )
            );
            const isWaitingAdminApproval = isHarvestDone && !isPackagingApproved;
            const isHarvesting = (contract as any).isHarvesting || (contract.fulfillmentStep === 2 && !isHarvestDone);

            return (
              <div
                key={`${contract.contractCode || "contract"}-${contract.id}`}
                className="rounded-3xl bg-white border border-gray-100 shadow-2xs p-5 transition-all hover:border-green-200 hover:shadow-xs relative overflow-hidden"
              >
                {/* Trạng thái cọc bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    contract.fulfillmentStep === 6
                      ? 'bg-emerald-500'
                      : contract.fulfillmentStep >= 3
                      ? 'bg-blue-500'
                      : isDepositPaid
                      ? 'bg-amber-500'
                      : 'bg-gray-300'
                  }`}
                />

                {/* Header đơn hàng */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-[#10542C] font-bold">
                      <ShoppingBag className="w-5 h-5 text-[#10542C]" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-base font-black text-gray-800 font-mono tracking-tight">
                          {contract.contractCode}
                        </strong>
                        <span className="text-[10px] rounded-full bg-gray-100 text-gray-600 font-mono px-2 py-0.5">
                          {contract.lotCode}
                        </span>
                        {contract.rfqCode && (
                          <span className="text-[10px] rounded-full bg-sky-50 text-sky-700 font-mono px-2 py-0.5">
                            Yêu cầu gốc: {contract.rfqCode}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ngày tạo: {new Date(contract.createdAt).toLocaleDateString('vi-VN')} · Giao hàng: {contract.deliveryTimeSlot}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge cọc */}
                    {isDepositPaid ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Đã Cọc 30% ({formatVnd(contract.depositAmount)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Chờ Cọc 30% ({formatVnd(contract.depositAmount)})
                      </span>
                    )}

                    {/* Badge trạng thái */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
                        contract.fulfillmentStep === 6
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : contract.fulfillmentStep >= 3
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : isWaitingAdminApproval
                          ? 'bg-amber-50 text-amber-900 border border-amber-300'
                          : isPackagingApproved
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isHarvestRejected ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-rose-600" />
                          <span>Mốc 2/6: BQT Yêu Cầu Làm Lại Nghiệm Thu</span>
                        </>
                      ) : isWaitingAdminApproval ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span>Mốc 2/6: Đã Nộp Nghiệm Thu · Chờ BQT Duyệt Đóng Gói</span>
                        </>
                      ) : isPackagingApproved && contract.fulfillmentStep <= 2 ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mốc 2/6: BQT Đã Duyệt Đóng Gói · Chờ Xe Lạnh Đến Lấy</span>
                        </>
                      ) : (
                        <span>Mốc {contract.fulfillmentStep}/6: {formatFulfillmentStatusVi(contract.fulfillmentStatusName, contract.fulfillmentStep)}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Body chi tiết đơn hàng */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 text-xs sm:text-sm">
                  {/* Cột 1: Thông tin nông sản */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Nông Sản Xuất Kho</span>
                    <strong className="text-base font-bold text-[#10542C] block">{contract.productName}</strong>
                    <div className="flex justify-between text-gray-700 pt-1">
                      <span>Sản lượng chốt:</span>
                      <b className="text-gray-900 font-mono text-sm sm:text-base">{(contract.quantityKg ?? 0).toLocaleString('vi-VN')} kg</b>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Đơn giá chốt:</span>
                      <b className="text-[#10542C] font-mono text-sm sm:text-base">{formatVnd(contract.agreedPricePerKg)}/kg</b>
                    </div>
                    <div className="flex justify-between text-gray-900 pt-1.5 border-t border-gray-200 font-bold">
                      <span>Tổng tiền hàng:</span>
                      <span className="text-[#10542C] font-mono text-base sm:text-lg font-black">{formatVnd(contract.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Cột 2: Thông tin Thương lái (Buyer) */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Thương Lái Mua Sỉ</span>
                    <strong className="text-base font-bold text-gray-900 block">{contract.buyerCompany}</strong>
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-gray-500">Người đại diện:</span>
                      <b className="text-gray-900">{contract.buyerName}</b>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {isDepositPaid ? (
                        <span className="font-mono text-gray-900 font-bold">{contract.buyerPhone}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs" title="Thông tin liên hệ thương lái mở khóa sau khi nhận cọc">
                          <LockKeyhole className="w-3 h-3 text-amber-600" />
                          <span>•••••••••• (Hiện sau khi cọc)</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-1.5 text-gray-600 pt-1 border-t border-gray-200">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{contract.deliveryAddress}</span>
                    </div>
                  </div>

                  {/* Cột 3: Vận chuyển xe lạnh & Biên bản bàn giao */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Vận Chuyển & Bàn Giao</span>
                    {contract.fulfillmentStep < 3 && !isPackagingApproved ? (
                      isHarvestRejected ? (
                        <div className="space-y-1.5 py-1">
                          <div className="flex items-center gap-1.5 text-rose-900 bg-rose-50 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-rose-300">
                            <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>BQT yêu cầu làm lại nghiệm thu</span>
                          </div>
                          <p className="text-xs text-rose-800 leading-relaxed font-medium">
                            Lý do: {(contract as any).deliveryNotes || 'Vui lòng kiểm tra lại ảnh cân, tem dán hoặc số liệu và nộp lại cho BQT duyệt.'}
                          </p>
                        </div>
                      ) : isWaitingAdminApproval ? (
                        <div className="space-y-1.5 py-1">
                          <div className="flex items-center gap-1.5 text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-amber-300">
                            <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                            <span>Chờ BQT duyệt đóng gói</span>
                          </div>
                          <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                            Đã nộp biên bản cân ({contract.actualHarvestWeightKg || contract.quantityKg} kg, {contract.packageCount || 10} thùng). Ban Quản Trị HoNa đang kiểm tra ảnh cân & tem dán trước khi phân công xe lạnh.
                          </p>
                          <button
                            type="button"
                            onClick={() => setReviewingContract(contract)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10542C] hover:underline pt-0.5 cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-[#10542C]" /> Xem lại ảnh & tem đã nộp
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 py-1">
                          <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-amber-200">
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Chờ xong đóng gói để điều xe</span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Phương tiện vận chuyển sẽ được điều phối sau khi nhà vườn xác nhận đóng gói và in tem dán thùng.
                          </p>
                        </div>
                      )
                    ) : isPackagingApproved && !contract.pickupTruckPlate && contract.fulfillmentStep <= 3 ? (
                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>BQT đã duyệt · Đang điều xe lạnh</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Quy cách đóng gói đạt chuẩn ({contract.packageCount || 10} thùng). Hệ thống đang phân công xe lạnh chuyên dụng đến nhận hàng tại vườn.
                        </p>
                        <button
                          type="button"
                          onClick={() => setReviewingContract(contract)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10542C] hover:underline pt-0.5 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-[#10542C]" /> Xem lại ảnh & tem đã nộp
                        </button>
                      </div>
                    ) : contract.fulfillmentStep === 4 ? (
                      <div className="space-y-1.5 py-0.5">
                        {(contract as any).fulfillmentStatus === 'QC_RETURNED_REFUNDED' || contract.qcStatus === 'QC_RETURNED' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-rose-800 bg-rose-50 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-rose-300">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Không Đạt QC · Đã Lập Biên Bản Hoàn Hàng & Hoàn Cọc</span>
                            </div>
                            {(contract as any).deliveryNotes && (
                              <p className="text-[11px] text-rose-800 leading-relaxed">{(contract as any).deliveryNotes}</p>
                            )}
                          </div>
                        ) : contract.qcStatus === 'QC_FAILED' || contract.status === 'QC_FAILED' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-rose-800 bg-rose-50 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-rose-300">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Không Đạt Kiểm Định QC · Chờ Hoàn Hàng</span>
                            </div>
                            <p className="text-[11px] text-rose-800 leading-relaxed">
                              Lý do: {(contract as any).deliveryNotes || 'Chỉ số kiểm định chưa đạt chuẩn HoNa Fresh.'}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>
                                {contract.qcStatus === 'QC_PASSED' || contract.status === 'QC_PASSED'
                                  ? 'Đã Đạt Chuẩn QC & Lưu Kho HoNa'
                                  : 'Đã Nhập Kho HoNa · Đang Chờ Kiểm Định QC'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-0.5">
                              <span className="text-gray-500">Khu vực lưu:</span>
                              <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                {(contract as any).hubWarehouseZone || 'Zone A (Lạnh mát 2-6°C)'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Tọa độ kệ:</span>
                              <span className="font-mono font-bold text-gray-800">
                                {(contract as any).hubRackBin || 'Kệ R-01 Ô A-01'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-700 pt-1 border-t border-gray-100">
                              <span>Nhiệt độ kho:</span>
                              <span className="font-mono font-bold text-emerald-700">
                                4.0°C (Chuẩn 2-6°C)
                              </span>
                            </div>
                            {(contract.qcStatus === 'QC_PASSED' || contract.status === 'QC_PASSED') && (
                              <button
                                type="button"
                                onClick={() => setQcDetailContract(contract)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10542C] hover:underline pt-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem Biên Bản Kiểm Định QC</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    ) : contract.fulfillmentStep === 5 ? (
                      <div className="space-y-1.5 py-0.5">
                        <div className="flex items-center gap-1.5 text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-blue-200">
                          <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Xe Lạnh Outbound Đang Giao Buyer</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="text-gray-500">Biển số xe:</span>
                          <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {(contract as any).outboundTruckPlate || contract.truckLicensePlate || '51D-921.34'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Tài xế phụ trách:</span>
                          <span className="font-bold text-gray-800 truncate max-w-[150px]">
                            {(contract as any).outboundDriverName || 'Tài xế Outbound HoNa'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-700 pt-1 border-t border-gray-100">
                          <span>Nhiệt độ thùng:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            4.0°C (Chuẩn 2-6°C)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLiveTrackingContract(contract)}
                          className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Xem Đường Đi GPS Tài Xế</span>
                        </button>
                      </div>
                    ) : contract.fulfillmentStep === 6 ? (
                      <div className="space-y-1.5 py-0.5">
                        <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-100 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-300">
                          <Award className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>Giao Nhận Hoàn Tất & Đã Quyết Toán</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="text-gray-500">Biên bản ePOD:</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Đã nghiệm thu đạt chuẩn
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Quyết toán:</span>
                          <span className="font-bold text-emerald-700">
                            Đã giải ngân 100% tiền tươi
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-0.5">
                        <div className="flex items-center gap-1.5 text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-blue-200">
                          <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Xe Lạnh Đang Đến Lấy Hàng</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="text-gray-500">Biển số xe:</span>
                          <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {contract.truckLicensePlate || contract.pickupTruckPlate || '29H-882.14'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Tài xế phụ trách:</span>
                          <span className="font-bold text-gray-800 truncate max-w-[150px]">
                            {contract.truckDriverName || contract.pickupDriverName || 'Nguyễn Văn Tài'}
                          </span>
                        </div>
                        {(contract.truckDriverPhone || contract.pickupDriverPhone) && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">SĐT tài xế:</span>
                            <a
                              href={`tel:${contract.truckDriverPhone || contract.pickupDriverPhone}`}
                              className="font-mono font-bold text-[#10542C] hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-[#10542C]" />
                              {contract.truckDriverPhone || contract.pickupDriverPhone}
                            </a>
                          </div>
                        )}
                        <div className="flex justify-between text-xs text-gray-700 pt-1 border-t border-gray-100">
                          <span>Nhiệt độ thùng:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {contract.truckTempCurrent || 4.2}°C (Chuẩn 2-6°C)
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-700 pt-1 border-t border-gray-100">
                      <span>Biên bản nhận hàng:</span>
                      {contract.epodSignedAt ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã ký ({contract.epodDeliveredWeightKg} kg)
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold">Chưa ký</span>
                      )}
                    </div>
                    <div className="flex justify-between text-gray-900 pt-1 border-t border-gray-200 font-bold">
                      <span>Quyết toán 70%:</span>
                      <span className={contract.finalPaidStatus === 'PAID' ? 'text-emerald-700 font-bold' : 'text-gray-600'}>
                        {contract.finalPaidStatus === 'PAID' ? 'Đã giải ngân' : 'Chờ tất toán'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline 6 mốc mini bar */}
                <div className="pt-2 pb-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-2">
                    <span className="flex items-center gap-1 text-[#10542C]">
                      <Clock className="w-3.5 h-3.5" /> Tiến Trình Giao Nhận & Quyết Toán (Mốc {contract.fulfillmentStep}/6)
                    </span>
                    <span className="text-gray-400 font-normal">
                      {contract.fulfillmentStep === 6 ? 'Đã thanh toán tiền về tài khoản' : 'Đang xử lý theo hợp đồng'}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5">
                    {[
                      { step: 1, label: '1. Chốt & Cọc' },
                      { step: 2, label: '2. Thu Hoạch' },
                      { step: 3, label: '3. Lấy Hàng' },
                      { step: 4, label: '4. Kiểm Định & Lưu Kho' },
                      { step: 5, label: '5. Giao Hàng' },
                      { step: 6, label: '6. Hoàn Tất' },
                    ].map((m) => {
                      const isDone = contract.fulfillmentStep >= m.step;
                      const isCurrent = contract.fulfillmentStep === m.step;
                      return (
                        <div
                          key={m.step}
                          className={`rounded-lg py-1.5 px-2 text-center text-[10px] font-bold transition-all ${
                            isCurrent
                              ? 'bg-[#10542C] text-white shadow-2xs ring-2 ring-green-300'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {m.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer: Trạng thái vận hành & Thao tác */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="text-gray-500 font-semibold">Trạng thái vận hành:</span>
                    <span className={`font-bold px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                      isWaitingAdminApproval
                        ? 'text-amber-900 bg-amber-50 border-amber-300'
                        : isPackagingApproved && !contract.pickupTruckPlate && contract.fulfillmentStep <= 3
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                        : 'text-[#10542C] bg-emerald-50 border-emerald-200'
                    }`}>
                      {isHarvestRejected ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-rose-600" />
                          <span>Mốc 2/6: BQT Yêu Cầu Làm Lại Nghiệm Thu</span>
                        </>
                      ) : isWaitingAdminApproval ? (
                        <>
                          <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                          <span>Mốc 2/6: Đã Nộp Nghiệm Thu · Chờ BQT Duyệt Đóng Gói</span>
                        </>
                      ) : isPackagingApproved && !contract.pickupTruckPlate && contract.fulfillmentStep <= 3 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Mốc 3/6: BQT Đã Duyệt Đóng Gói · Chờ Xe Lạnh Đến Lấy</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-4 h-4 text-[#10542C]" />
                          <span>Mốc {contract.fulfillmentStep}/6: {formatFulfillmentStatusVi(contract.fulfillmentStatusName, contract.fulfillmentStep)}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Thao tác Thu hoạch của Nông dân khi hợp đồng đã nhận cọc */}
                    {isDepositPaid && (
                      (() => {
                        if (isHarvestRejected) {
                          return (
                            <button
                              type="button"
                              onClick={() => setHarvestVerificationContract(contract)}
                              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                            >
                              <Scale className="w-4 h-4" />
                              <span>Làm Lại Nghiệm Thu & Đóng Gói</span>
                            </button>
                          );
                        }
                        if (isWaitingAdminApproval) {
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1.5 bg-amber-100 text-amber-900 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-amber-300">
                                <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                                <span>Chờ BQT Duyệt Đóng Gói</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setReviewingContract(contract)}
                                className="flex items-center gap-1 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs px-3 py-2.5 rounded-xl border border-gray-200 transition cursor-pointer"
                                title="Xem lại ảnh cân và tem QR đã nộp"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                <span>Xem Biên Bản</span>
                              </button>
                            </div>
                          );
                        }

                        if (isPackagingApproved && contract.fulfillmentStep <= 2) {
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1.5 bg-emerald-100 text-[#10542C] font-bold text-xs px-3.5 py-2.5 rounded-xl border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>BQT Đã Duyệt Đóng Gói</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setReviewingContract(contract)}
                                className="flex items-center gap-1 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs px-3 py-2.5 rounded-xl border border-gray-200 transition cursor-pointer"
                                title="Xem lại ảnh cân và tem QR đã nộp"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                <span>Xem Biên Bản</span>
                              </button>
                            </div>
                          );
                        }

                        if (isHarvestDone) {
                          return (
                            <span className="flex items-center gap-1.5 bg-emerald-100 text-[#10542C] font-bold text-xs px-3.5 py-2.5 rounded-xl border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Đã Thu Hoạch Xong</span>
                            </span>
                          );
                        }

                        if (isHarvesting) {
                          return (
                            <button
                              type="button"
                              onClick={() => openHarvestVerificationModal(contract)}
                              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-98"
                              title="Mở biểu mẫu nghiệm thu thu hoạch thực tế, ảnh cân điện tử, số thùng & tem QR để gửi Admin điều phối xe"
                            >
                              <Scale className="w-3.5 h-3.5 text-white" />
                              <span>Nghiệm Thu Thu Hoạch & Đóng Gói</span>
                            </button>
                          );
                        }

                        // Mốc 1: Chờ thu hoạch
                        return (
                          <button
                            type="button"
                            onClick={() => void handleStartHarvest(contract.id)}
                            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-98"
                            title="Bắt đầu triển khai thu hoạch nông sản tại vườn"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                            <span>Bắt Đầu Thu Hoạch</span>
                          </button>
                        );
                      })()
                    )}

                    {/* Nút Xem Văn Bản Hợp Đồng B2B Điện Tử */}
                    <button
                      type="button"
                      onClick={() =>
                        setViewingContract({
                          id: Number(contract.id),
                          contractCode: contract.contractCode,
                          rfqCode: contract.rfqCode,
                          lotCode: contract.lotCode,
                          productName: contract.productName,
                          buyerName: contract.buyerName || 'Trần Thị Thương',
                          buyerCompany: contract.buyerCompany || 'Công Ty TNHH Thu Mua Sỉ Nông Sản Sài Gòn',
                          buyerRepresentative: contract.buyerName || 'Trần Thị Thương',
                          buyerPhone: contract.buyerPhone || '0987.654.321',
                          buyerAddress: (contract as any).buyerAddress || contract.deliveryAddress || '',
                          farmerName: (contract as any).farmerName || contract.farmerCompany || 'HTX Nông Nghiệp Đà Lạt GAP',
                          farmerCompany: contract.farmerCompany || (contract as any).farmName || 'HTX Nông Nghiệp Đà Lạt GAP',
                          farmerRepresentative: (contract as any).farmerName || contract.farmerCompany || '',
                          farmerPhone: contract.farmerPhone || '0912.345.678',
                          farmerAddress: (contract as any).farmerAddress || (contract as any).farmPickupAddress || '',
                          farmerPuc: (contract as any).pucCode || '',
                          quantityKg: contract.quantityKg,
                          unitPrice: contract.agreedPricePerKg,
                          totalAmount: contract.totalAmount,
                          goodsAmount: (contract.quantityKg || 0) * (contract.agreedPricePerKg || 0),
                          shippingOption: (contract as any).shippingOption || 'CROSS_DOCKING_HUB',
                          shippingFee: (contract as any).shippingFee,
                          depositAmount: contract.depositAmount,
                          remainingAmount: contract.remainingAmount,
                          depositStatus: contract.depositStatus,
                          fulfillmentStatusName: contract.fulfillmentStatusName,
                          deliveryAddress: contract.deliveryAddress,
                          deliveryTimeSlot: contract.deliveryTimeSlot,
                          createdAt: contract.createdAt,
                          actualHarvestWeightKg: (contract as any).actualHarvestWeightKg || contract.quantityKg,
                          packageCount: (contract as any).packageCount,
                          packageType: (contract as any).packageType,
                          farmPickupAddress: (contract as any).farmPickupAddress,
                          harvestNotes: (contract as any).notes || (contract as any).harvestNotes,
                          harvestProofImageUrl: (contract as any).harvestProofImageUrl,
                          grade1Ratio: (contract as any).grade1Ratio,
                          isHarvestDone: Boolean((contract as any).isHarvestDone || contract.fulfillmentStep >= 2),
                          packagingApproved: Boolean(contract.packagingApproved || contract.packaging_approved || contract.status === 'PACKAGING_APPROVED'),
                          packaging_approved: Boolean(contract.packagingApproved || contract.packaging_approved || contract.status === 'PACKAGING_APPROVED'),
                          qrCodeData: (contract as any).qrCodeData,
                        })
                      }
                      className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#10542C] font-bold text-xs px-3.5 py-2.5 rounded-xl transition border border-emerald-200 cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#10542C]" />
                      <span>Xem Hợp Đồng B2B</span>
                    </button>

                    {/* Nút Xem Biên Bản Kiểm Định QC & Theo dõi GPS ngay trên thẻ hợp đồng */}
                    {(contract.qcStatus === 'QC_PASSED' ||
                      contract.status === 'QC_PASSED' ||
                      contract.qcStatus === 'QC_FAILED' ||
                      contract.status === 'QC_FAILED' ||
                      contract.qcStatus === 'QC_RETURNED' ||
                      contract.fulfillmentStep >= 4) ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPrintQcReportA4(contract)}
                          className="flex items-center gap-1.5 bg-[#10542C] hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem Biên Bản Kiểm Định QC</span>
                        </button>
                        {contract.fulfillmentStep === 5 && (
                          <button
                            type="button"
                            onClick={() => setLiveTrackingContract(contract)}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Đường Đi GPS</span>
                          </button>
                        )}
                      </div>
                    ) : isPackagingApproved || contract.fulfillmentStep === 3 ? (
                      <button
                        type="button"
                        onClick={() => setReviewingContract(contract)}
                        className="flex items-center gap-2 bg-[#10542C] hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-98"
                      >
                        <span>Xem Biên Bản Đóng Gói</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (isHarvestRejected) {
                          return (
                            <button
                              type="button"
                              onClick={() => setHarvestVerificationContract(contract)}
                              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                            >
                              <Scale className="w-4 h-4" />
                              <span>Làm Lại Nghiệm Thu & Đóng Gói</span>
                            </button>
                          );
                        }
                        if (isWaitingAdminApproval) {
                            alert('Biên bản nghiệm thu & đóng gói đang chờ Ban Quản Trị HoNa phê duyệt đạt chuẩn. Sau khi Admin duyệt quy cách và phân công xe lạnh, hệ thống sẽ mở khóa theo dõi hành trình xe lạnh.');
                          } else {
                            alert('Hợp đồng chưa nghiệm thu đóng gói. Vui lòng bấm "Nghiệm Thu Thu Hoạch & Đóng Gói" trước.');
                          }
                        }}
                        className="flex items-center gap-1.5 bg-gray-100 hover:bg-amber-50 text-gray-500 hover:text-amber-800 border border-gray-200 hover:border-amber-300 font-bold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                        title={isWaitingAdminApproval ? "Cần Ban Quản Trị duyệt đóng gói để mở hành trình xe lạnh" : "Chưa hoàn thành nghiệm thu đóng gói"}
                      >
                        <LockKeyhole className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isWaitingAdminApproval ? 'Chờ BQT Duyệt Mở Hành Trình Xe' : 'Chưa Mở Khóa Vận Chuyển'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nghiệm Thu Thu Hoạch & Đóng Gói (Mốc 2) */}
      {harvestVerificationContract && (
        <HarvestPackagingModal
          contract={harvestVerificationContract}
          isOpen={Boolean(harvestVerificationContract)}
          onClose={() => setHarvestVerificationContract(null)}
          onSubmit={async (data) => {
            const cId = harvestVerificationContract.id;
            await api(`farmer/contracts/${cId}/verify-harvest`, 'POST', data).catch((err) => {
              console.warn('API verify-harvest warning:', err);
            });

            farmerVerifyHarvest(cId, data);
            b2bWebSocket.publish('/topic/contracts', {
              action: 'HARVESTED',
              contractCode: harvestVerificationContract.contractCode,
              status: 'HARVESTED',
              ...data,
            });

            setActionSuccessMsg('Đã nghiệm thu thu hoạch xong! Dữ liệu đã chuyển sang Ban Quản Trị để điều phối xe.');
            setHarvestVerificationContract(null);
            setTimeout(() => setActionSuccessMsg(null), 4000);
            void reloadContracts();
          }}
        />
      )}

      {/* Modal Xem Lại Biên Bản Nghiệm Thu Đóng Gói & Tem QR Dán Thùng */}
      {reviewingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-5">
            {/* Header modal */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#10542C] flex items-center justify-center">
                  <Scale className="w-5 h-5 text-[#10542C]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Biên Bản Nghiệm Thu & Đóng Gói
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Hợp đồng: <strong className="text-[#10542C]">{reviewingContract.contractCode}</strong> &bull; {reviewingContract.productName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingContract(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trạng thái duyệt của Ban Quản Trị */}
            {(() => {
              const isApproved = Boolean(
                (reviewingContract as any).packagingApproved ||
                (reviewingContract as any).packaging_approved ||
                reviewingContract.status === 'PACKAGING_APPROVED' ||
                reviewingContract.fulfillmentStatusName?.includes('Đã Duyệt Đóng Gói') ||
                reviewingContract.pickupTruckPlate ||
                reviewingContract.fulfillmentStep >= 3 ||
                (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('hona_packaging_approved_codes') || '[]').includes(reviewingContract.contractCode))
              );
              return isApproved ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-900 text-sm">Ban Quản Trị HoNa Đã Phê Duyệt Đạt Chuẩn</p>
                    <p className="text-emerald-700 mt-0.5">
                      Quy cách đóng thùng và mã tem QR đã được kiểm duyệt. Hệ thống đang tiến hành điều phối xe tải lạnh chuyên dụng đến lấy hàng tại vườn.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                  <div className="text-xs">
                    <p className="font-bold text-amber-900 text-sm">Đang Chờ Ban Quản Trị Kiểm Tra & Duyệt Đóng Gói</p>
                    <p className="text-amber-800 mt-0.5 leading-relaxed">
                      Hệ thống đã chuyển giao ảnh cân rẫy và thông số nghiệm thu đến Ban Quản Trị HoNa Fresh. Nút theo dõi xe lạnh sẽ mở khóa ngay khi Admin bấm duyệt đạt chuẩn.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 4 thông số kỹ thuật */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Sản lượng thực thu</span>
                <span className="text-base font-black text-[#10542C] font-mono">
                  {(reviewingContract.actualHarvestWeightKg || reviewingContract.quantityKg || 0).toLocaleString('vi-VN')} kg
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Tỷ lệ Loại 1</span>
                <span className="text-base font-black text-emerald-700 font-mono">
                  {(reviewingContract as any).grade1Ratio || 96}%
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Số lượng thùng</span>
                <span className="text-base font-black text-blue-700 font-mono mt-0.5">
                  {reviewingContract.packageCount || 10} thùng
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Quy cách</span>
                <span className="text-xs font-bold text-gray-800 mt-1 leading-snug break-words">
                  {reviewingContract.packageType || 'Thùng xốp 15kg (Dán tem niêm phong)'}
                </span>
              </div>
            </div>

            {/* Ảnh minh chứng cân rẫy & đóng thùng */}
            {reviewingContract.harvestProofImageUrl && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#10542C]" />
                  Ảnh Minh Chứng Cân Điện Tử & Đóng Thùng Tại Vườn:
                </span>
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-black/5 aspect-video sm:aspect-21/9 max-h-56">
                  <img
                    src={reviewingContract.harvestProofImageUrl}
                    alt="Ảnh nghiệm thu đóng thùng"
                    className="w-full h-full object-cover"
                  />
                  <a
                    href={reviewingContract.harvestProofImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-black/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 backdrop-blur-xs transition"
                  >
                    <ExternalLink className="w-3 h-3" /> Xem ảnh gốc
                  </a>
                </div>
              </div>
            )}

            {/* Tem QR code dán thùng PUC & Nút in lại */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                      reviewingContract.qrCodeData || `HONAFRESH-PUC-${reviewingContract.contractCode}`
                    )}`}
                    alt="QR Tem Thùng"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Tem Nhãn Truy Xuất PUC</span>
                  <strong className="text-xs font-mono font-bold text-gray-900 block mt-0.5">
                    {reviewingContract.qrCodeData || `PUC-${reviewingContract.contractCode}`}
                  </strong>
                  <span className="text-[11px] text-gray-600 block mt-0.5">
                    Đã in {reviewingContract.packageCount || 10} nhãn decal dán lên từng thùng xốp
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (!printWin) return;
                  const c = reviewingContract;
                  const count = c.packageCount || 10;
                  const itemsHtml = Array.from({ length: count }, (_, i) => {
                    const boxNum = i + 1;
                    const boxCode = `BOX-${String(boxNum).padStart(2, '0')}`;
                    const fullCode = `${c.contractCode}-${boxCode}`;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `https://honafresh.vn/tra-cuu?contract=${c.contractCode}&box=${boxCode}`
                    )}`;
                    return `
                      <div style="border: 2px dashed #10542C; padding: 12px; margin-bottom: 16px; border-radius: 8px; page-break-inside: avoid; font-family: sans-serif; display: flex; gap: 12px;">
                        <img src="${qrUrl}" style="width: 90px; height: 90px;" />
                        <div>
                          <div style="font-weight: 900; color: #10542C; font-size: 14px;">HONA FRESH - TEM TRUY XUẤT NGUỒN GỐC</div>
                          <div style="font-weight: bold; font-size: 13px; margin: 2px 0;">${c.productName}</div>
                          <div style="font-size: 11px; color: #555;">Mã HĐ: <b>${c.contractCode}</b> &bull; Kiện: <b>${boxNum}/${count}</b></div>
                          <div style="font-size: 11px; color: #555;">Nông trại: ${c.farmerCompany || c.farmerName}</div>
                          <div style="font-size: 11px; color: #555;">Quy cách: ${c.packageType || 'Thùng xốp 15kg'}</div>
                        </div>
                      </div>
                    `;
                  }).join('');

                  printWin.document.write(`
                    <html>
                      <head><title>In Tem Dán Thùng - ${c.contractCode}</title></head>
                      <body onload="window.print(); window.close();" style="padding: 16px;">
                        ${itemsHtml}
                      </body>
                    </html>
                  `);
                  printWin.document.close();
                }}
                className="px-4 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>In Lại Tem Dán Thùng</span>
              </button>
            </div>

            {/* Điểm đón xe tại vườn */}
            {(() => {
              const pickup = parsePickupDetails(reviewingContract.farmPickupAddress || reviewingContract.farmerCompany);
              return (
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-2">
                  <span className="font-bold text-gray-800 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Thông Tin Điểm Đón Xe Tải Lạnh Tại Vườn
                  </span>

                  <div className="bg-white p-3 rounded-xl border border-gray-200/90 space-y-2 text-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-gray-500 font-semibold sm:w-36 shrink-0">Địa chỉ rẫy / Vườn:</span>
                      <span className="font-bold text-gray-900">{pickup.farmLocation}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 pt-1.5 border-t border-gray-100">
                      <span className="text-gray-500 font-semibold sm:w-36 shrink-0">SĐT người đón xe:</span>
                      <span className="font-mono font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                        {pickup.contactPhone}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 pt-1.5 border-t border-gray-100">
                      <span className="text-gray-500 font-semibold sm:w-36 shrink-0 mt-0.5">Hạ tầng đường vào rẫy:</span>
                      <span className="text-gray-800 font-medium leading-relaxed flex-1">
                        {pickup.roadAccess}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Footer modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  const target = reviewingContract;
                  setReviewingContract(null);
                  openHarvestVerificationModal(target);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                title="Cập nhật lại sản lượng thực thu, số thùng, ảnh cân thực tế hoặc địa chỉ đón xe"
              >
                <Edit3 className="w-4 h-4 text-amber-700" />
                <span>Chỉnh Sửa Biên Bản Nghiệm Thu</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewingContract(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Toàn Văn Hợp Đồng B2B Điện Tử */}
      <B2bContractViewModal
        isOpen={Boolean(viewingContract)}
        contract={viewingContract}
        role="FARMER"
        onClose={() => setViewingContract(null)}
      />

      {/* Modal Bản đồ Theo dõi Đường đi GPS Tài xế */}
      {liveTrackingContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Theo Dõi Lộ Trình Giao Hàng GPS — {liveTrackingContract.contractCode}
                </h3>
                <p className="text-xs text-gray-500">
                  Vị trí GPS xe tải lạnh được cập nhật trực tiếp từ chuyến giao hàng HoNa Express
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLiveTrackingContract(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ContractLiveTrackingMap contract={liveTrackingContract} height={380} />
          </div>
        </div>
      )}

      {/* Modal Xem Biên Bản Kiểm Định QC Chuẩn Nghiệp Vụ B2B */}
      {qcDetailContract && (() => {
        const isQcReturned =
          qcDetailContract.qcStatus === 'QC_RETURNED' ||
          qcDetailContract.fulfillmentStatus === 'QC_RETURNED_REFUNDED';
        const isQcFailed =
          !isQcReturned &&
          (qcDetailContract.qcStatus === 'QC_FAILED' || qcDetailContract.status === 'QC_FAILED');
        const brixVal = Number(qcDetailContract.qcBrix ?? 12.5);
        const nitrateVal = Number(qcDetailContract.qcNitratePpm ?? 220);
        const pesticideSafe = qcDetailContract.qcPesticideSafe !== false;
        const tempVal = Number(qcDetailContract.farmHandoverTemp ?? 4.0);
        const q1Weight = Number(qcDetailContract.quantityKg || 0);
        const q2Weight = Number(qcDetailContract.actualHarvestWeightKg || q1Weight);
        const q3Weight = Number(qcDetailContract.inboundNetWeightKg || q2Weight);
        const inspectedTime = qcDetailContract.qcPassedAt
          ? new Date(qcDetailContract.qcPassedAt).toLocaleString('vi-VN')
          : new Date().toLocaleString('vi-VN');

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-xs max-h-[92vh] flex flex-col">
              {/* Quốc hiệu & Tiêu đề Biên bản */}
              <div className="px-6 py-4 bg-gradient-to-r from-[#0F3820] to-[#10542C] text-white flex items-start justify-between gap-4 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                    <ShieldCheck className="w-4 h-4" />
                    <span>HỆ THỐNG NÔNG SẢN B2B HONA FRESH · PHÒNG KIỂM ĐỊNH KCS</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    BIÊN BẢN KIỂM ĐỊNH CHẤT LƯỢNG NÔNG SẢN (QC)
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-100/90 font-mono">
                    <span>Số BB: QC-{qcDetailContract.contractCode}</span>
                    <span>·</span>
                    <span>Thời gian: {inspectedTime}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQcDetailContract(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                {/* 1. Kết luận kiểm định */}
                <div
                  className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2 ${
                    isQcReturned || isQcFailed
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">
                      Kết luận thẩm định chất lượng lô hàng
                    </span>
                    <strong className="text-sm">
                      {isQcReturned
                        ? 'KHÔNG ĐẠT CHUẨN QC — ĐÃ LẬP BIÊN BẢN HOÀN HÀNG & HOÀN CỌC'
                        : isQcFailed
                        ? 'KHÔNG ĐẠT CHUẨN QC — TẠM ĐÓNG BĂNG CHỜ XỬ LÝ HOÀN TRẢ'
                        : 'ĐẠT CHUẨN KIỂM ĐỊNH CHẤT LƯỢNG VIETGAP / HONA FRESH'}
                    </strong>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-white font-bold text-[11px] ${
                      isQcReturned || isQcFailed ? 'bg-rose-600' : 'bg-emerald-600'
                    }`}
                  >
                    {isQcReturned ? 'HOÀN HÀNG' : isQcFailed ? 'KHÔNG ĐẠT' : '✓ PASS QC'}
                  </span>
                </div>

                {/* 2. Thông tin pháp lý 2 bên & Vị trí lưu kho */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Thông tin hợp đồng & Lô hàng</span>
                    <p>Hợp đồng: <strong className="font-mono text-[#10542C]">{qcDetailContract.contractCode}</strong></p>
                    <p>Nông sản: <strong>{qcDetailContract.productName}</strong></p>
                    <p>Mã lô / PUC: <strong className="font-mono">{qcDetailContract.lotCode || 'LOT-VG'} · {qcDetailContract.pucCode || 'VN-PUC'}</strong></p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Đối tác & Điểm kiểm định</span>
                    <p>Nhà vườn: <strong>{qcDetailContract.farmerCompany || qcDetailContract.farmerName || 'Nhà vườn VietGAP'}</strong></p>
                    <p>Thương lái: <strong>{qcDetailContract.buyerName || 'Thương lái B2B'}</strong></p>
                    <p>Vị trí lưu kho: <strong className="font-mono text-slate-900">{qcDetailContract.hubWarehouseZone || 'Zone A'} / {qcDetailContract.hubRackBin || 'BIN A-01'}</strong></p>
                  </div>
                </div>

                {/* 3. Bảng đối soát sản lượng Q1 -> Q2 -> Q3 */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                    I. Đối Soát Sản Lượng Nghiệm Thu Tại Trạm
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-slate-200 text-center p-3 bg-white">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Cam kết HĐ (Q1)</span>
                      <strong className="font-mono text-sm text-slate-800">{q1Weight.toLocaleString()} kg</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Thực thu tại vườn (Q2)</span>
                      <strong className="font-mono text-sm text-slate-800">{q2Weight.toLocaleString()} kg</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Đạt chuẩn nhập kho (Q3)</span>
                      <strong className={`font-mono text-sm ${isQcFailed || isQcReturned ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {isQcFailed || isQcReturned ? '0 kg (Từ chối)' : `${q3Weight.toLocaleString()} kg`}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 4. Bảng chỉ tiêu kỹ thuật KCS */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                    II. Kết Quả Phân Tích Chỉ Tiêu An Toàn Thực Phẩm
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] uppercase text-slate-500">
                        <th className="py-2 px-3">Chỉ tiêu kiểm tra</th>
                        <th className="py-2 px-3">Ngưỡng chuẩn VietGAP</th>
                        <th className="py-2 px-3">Kết quả đo</th>
                        <th className="py-2 px-3 text-right">Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2 px-3 font-medium">Độ ngọt / Chất lượng (Brix)</td>
                        <td className="py-2 px-3 font-mono text-slate-500">≥ 10.0 °Bx</td>
                        <td className="py-2 px-3 font-mono font-bold">{brixVal} °Bx</td>
                        <td className="py-2 px-3 text-right font-bold">
                          <span className={brixVal >= 10 ? 'text-emerald-700' : 'text-rose-600'}>
                            {brixVal >= 10 ? 'Đạt' : 'Không đạt'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Dư lượng Nitrate (NO₃⁻)</td>
                        <td className="py-2 px-3 font-mono text-slate-500">≤ 300 ppm</td>
                        <td className="py-2 px-3 font-mono font-bold">{nitrateVal} ppm</td>
                        <td className="py-2 px-3 text-right font-bold">
                          <span className={nitrateVal <= 300 ? 'text-emerald-700' : 'text-rose-600'}>
                            {nitrateVal <= 300 ? 'Đạt' : 'Vượt ngưỡng'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Test nhanh thuốc BVTV</td>
                        <td className="py-2 px-3 font-mono text-slate-500">Âm tính (0%)</td>
                        <td className="py-2 px-3 font-bold">{pesticideSafe ? 'Âm tính' : 'Dương tính'}</td>
                        <td className="py-2 px-3 text-right font-bold">
                          <span className={pesticideSafe ? 'text-emerald-700' : 'text-rose-600'}>
                            {pesticideSafe ? 'An toàn' : 'Không đạt'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Nhiệt độ bảo quản đầu vào</td>
                        <td className="py-2 px-3 font-mono text-slate-500">2.0°C – 6.0°C</td>
                        <td className="py-2 px-3 font-mono font-bold">{tempVal.toFixed(1)} °C</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">Đạt chuỗi lạnh</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 5. Ghi chú / Căn cứ xử lý nghiệp vụ */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-950 space-y-1">
                  <strong className="block">III. Ghi chú KCS & Căn cứ xử lý tiếp theo:</strong>
                  {qcDetailContract.deliveryNotes ? (
                    <p>{qcDetailContract.deliveryNotes}</p>
                  ) : isQcFailed || isQcReturned ? (
                    <p>
                      Lô hàng không đáp ứng tiêu chuẩn chất lượng cam kết tại hợp đồng. Kho HoNa Fresh tiến hành lập biên bản hoàn trả hàng về Nhà vườn và hoàn trả 30% tiền cọc Escrow cho Thương lái theo quy định.
                    </p>
                  ) : (
                    <p>
                      Lô hàng đủ điều kiện lưu kho mát FEFO và xuất giao chặng cuối (Outbound) tới kho Thương lái. Khoản giải ngân Payout cho Nhà vườn sẽ được thực hiện sau khi Thương lái ký nhận biên bản ePOD.
                    </p>
                  )}
                </div>

                {/* 6. Chữ ký điện tử 2 bên */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-center">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Đại Diện Trạm Kiểm Định KCS</span>
                    <strong className="text-[#10542C] block">KTV QC HoNa Fresh</strong>
                    <span className="text-[10px] text-emerald-700 font-mono block">✓ Đã ký số điện tử</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Xác Nhận Nhà Vườn Cung Ứng</span>
                    <strong className="text-slate-900 block">{qcDetailContract.farmerName || 'Chủ Nông Trại'}</strong>
                    <span className="text-[10px] text-slate-500 font-mono block">Đã đối soát kết quả kiểm định</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-700 cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>In Biên Bản</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQcDetailContract(null)}
                  className="px-5 py-2 rounded-xl bg-[#10542C] hover:bg-emerald-900 font-bold text-white cursor-pointer"
                >
                  Đóng Biên Bản
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
