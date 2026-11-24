'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/services/auth';
import {
  Handshake,
  Plus,
  AlertCircle,
  RefreshCw,
  Loader2,
  DollarSign,
  ShieldAlert,
  FileText,
  Search,
  X,
  Printer,
  Building2,
  Sprout,
  Package,
  Receipt,
  MapPin,
  Calendar,
  Clock,
  Filter,
  ChevronDown,
  Eye,
  ArrowRight,
  CheckCircle2,
  Scale,
  ShieldCheck,
  QrCode,
  Truck,
  ExternalLink,
  FileCheck,
  Route,
} from 'lucide-react';
import { FormDialog, Row, Field, cleanVietnamese } from '@/components/admin/AdminConsole';
import { SepayPaymentModal } from '@/components/common/SepayPaymentModal';
import {
  subscribeB2bSyncEvents,
  getSyncContracts,
  updateContractFulfillmentStep,
  adminApprovePackaging,
  adminDispatchPickup,
  adminFarmHandover,
  adminWarehouseInbound,
  adminOutboundDispatch,
  adminSettleContract,
} from '@/services/b2bSyncService';
import { b2bWebSocket } from '@/services/websocketService';
import { DispatchFarmPickupModal } from '@/components/admin/DispatchFarmPickupModal';
import { ColdWarehouseInboundModal } from '@/components/admin/ColdWarehouseInboundModal';
import { OutboundDispatchManifestModal } from '@/components/admin/OutboundDispatchManifestModal';
import { SettlementStatementModal } from '@/components/admin/SettlementStatementModal';
import B2bContractViewModal, { B2bContractModalData } from '@/components/common/B2bContractViewModal';

const money = (value: unknown) => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 });

const str = (value: unknown, code?: string) => {
  if (value == null) return '—';
  const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return cleanVietnamese(val, code);
};
const f = (name: string, label: string, type = 'text', value?: string | number): Field => ({ name, label, type, value });
const select = (name: string, label: string, options: string[]): Field => ({ name, label, options });

const nextState: Record<string, string> = {
  RFQ_SENT: 'AGREED',
  AGREED: 'DEPOSIT_PAID',
  DEPOSIT_PAID: 'AT_HUB_QC',
  AT_HUB_QC: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
  DELIVERED: 'SETTLED',
};

const nextStateLabel: Record<string, string> = {
  RFQ_SENT: 'Chấp thuận đơn đàm phán',
  AGREED: 'Xác nhận cọc 30%',
  DEPOSIT_PAID: 'Chuyển trạm kiểm định',
  AT_HUB_QC: 'Điều xe vận chuyển',
  IN_TRANSIT: 'Ký nhận bàn giao',
  DELIVERED: 'Quyết toán & Giải ngân',
};

const CLAIM_LIABLE_CONFIG: Record<
  string,
  { label: string; shortLabel: string; bg: string; text: string; border: string; icon: string }
> = {
  PLATFORM: {
    label: 'Sàn HoNa Fresh (Vận chuyển & Bảo quản)',
    shortLabel: 'Sàn HoNa Fresh',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: '🏢',
  },
  FARMER: {
    label: 'Nông trại cung ứng (Đóng gói & Tiêu chuẩn)',
    shortLabel: 'Nhà vườn / Nông trại',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: '🚜',
  },
  BUYER: {
    label: 'Bên mua (Kiểm nhận & Bốc dỡ)',
    shortLabel: 'Bên mua hàng',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: '🏪',
  },
};

const CLAIM_STATUS_CONFIG: Record<
  string,
  { label: string; desc: string; bg: string; text: string; border: string; dot: string; actionLabel: string }
> = {
  OPEN: {
    label: 'Chờ phán quyết',
    desc: 'Biên bản sự cố đang chờ trọng tài sàn xem xét hồ sơ kỹ thuật và ra phán quyết giải quyết.',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500 animate-pulse',
    actionLabel: 'Xử lý phán quyết',
  },
  DISMISSED: {
    label: 'Đã hòa giải / Bác bỏ',
    desc: 'Hao hụt nằm trong dung sai kỹ thuật hợp đồng hoặc hai bên đã thương lượng chấp thuận, không khấu trừ cọc.',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    actionLabel: 'Xem quyết định',
  },
  COMPENSATED: {
    label: 'Đã bồi hoàn thiệt hại',
    desc: 'Sàn HoNa Fresh đã duyệt chi bồi hoàn từ chi phí vận hành (TK 811) giữ hộ cho bên bị ảnh hưởng.',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    actionLabel: 'Xem quyết định',
  },
  REFUNDED: {
    label: 'Đã hoàn cọc bên mua',
    desc: 'Hợp đồng hủy do sự cố bất khả kháng, tiền ký quỹ đã được hoàn 100% về tài khoản bên mua.',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    actionLabel: 'Xem quyết định',
  },
};

const STATUS_CONFIG: Record<string, { label: string; desc: string; bg: string; text: string; border: string; dot: string }> = {
  SETTLED: {
    label: 'Đã hoàn tất & Giải ngân',
    desc: 'Hàng đã giao đạt chuẩn, tiền đã giải ngân về tài khoản nông dân.',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  DELIVERED: {
    label: 'Đã giao hàng (Chờ quyết toán)',
    desc: 'Bên mua đã ký nhận bàn giao tại kho, kế toán đang đối soát giải ngân.',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  OUTBOUND_DISPATCHED: {
    label: 'Đã xuất kho (Đang giao Buyer)',
    desc: 'Đã lập Manifest chuyến xe xuất kho chặng cuối giao đến kho của thương lái.',
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
  },
  IN_TRANSIT: {
    label: 'Đang vận chuyển lạnh',
    desc: 'Xe tải lạnh đang di chuyển và giám sát nhiệt độ thùng xe liên tục.',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  AT_HUB_QC: {
    label: 'Tại kho HoNa (Đang kiểm định QC)',
    desc: 'Lô hàng đang được kỹ thuật viên kiểm tra độ ngọt và độ ẩm tại trạm.',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  IN_TRANSIT_HUB: {
    label: 'Đang chuyển về kho HoNa',
    desc: 'Hàng đã bốc lên xe lạnh tại rẫy, đang trên đường vận chuyển về trạm trung chuyển.',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
  },
  PICKUP_DISPATCHED: {
    label: 'Đã điều xe đến rẫy lấy hàng',
    desc: 'Xe tải lạnh HoNa Express đang di chuyển đến địa chỉ rẫy của nhà vườn.',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  PACKAGING_APPROVED: {
    label: 'Đã duyệt đóng gói (Sẵn sàng điều xe)',
    desc: 'Admin đã thẩm định quy cách đóng gói đạt chuẩn, sẵn sàng điều xe tải lạnh.',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  HARVESTED: {
    label: 'Đã thu hoạch (Chờ duyệt đóng gói)',
    desc: 'Nhà vườn đã thu hoạch và đóng gói xong, chờ Admin kiểm tra và duyệt quy cách đóng gói.',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
  DEPOSIT_PAID: {
    label: 'Đã cọc 30% bảo chứng',
    desc: 'Bên mua đã chuyển cọc 30% vào tài khoản bảo chứng sàn.',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
  },
  AGREED: {
    label: 'Đã chốt hợp đồng (Chờ cọc)',
    desc: 'Hai bên đã thống nhất khối lượng & đơn giá, chờ bên mua ký quỹ cọc.',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
  },
  RFQ_SENT: {
    label: 'Chờ phản hồi RFQ',
    desc: 'Yêu cầu báo giá sỉ đã gửi tới nông dân, chờ phê duyệt.',
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  CANCELLED: {
    label: 'Đã hủy hợp đồng',
    desc: 'Hợp đồng bị hủy do quá hạn hoặc sự cố bất khả kháng.',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

const formatStatusBadge = (rawStatus: unknown) => {
  const code = String(rawStatus || '').toUpperCase().trim();
  if (STATUS_CONFIG[code]) return STATUS_CONFIG[code];

  if (code.includes('HARVEST')) return STATUS_CONFIG['HARVESTED'];
  if (code.includes('PACKAGING')) return STATUS_CONFIG['PACKAGING_APPROVED'];
  if (code.includes('PICKUP')) return STATUS_CONFIG['PICKUP_DISPATCHED'];
  if (code.includes('HUB') || code.includes('QC')) return STATUS_CONFIG['AT_HUB_QC'];
  if (code.includes('OUTBOUND')) return STATUS_CONFIG['OUTBOUND_DISPATCHED'];
  if (code.includes('TRANSIT')) return STATUS_CONFIG['IN_TRANSIT'];
  if (code.includes('DELIVER')) return STATUS_CONFIG['DELIVERED'];
  if (code.includes('SETTLE')) return STATUS_CONFIG['SETTLED'];
  if (code.includes('DEPOSIT')) return STATUS_CONFIG['DEPOSIT_PAID'];
  if (code.includes('AGREE')) return STATUS_CONFIG['AGREED'];
  if (code.includes('RFQ')) return STATUS_CONFIG['RFQ_SENT'];

  return {
    label: code || 'Chờ xử lý',
    desc: '',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  };
};

const formatDate = (isoStr: unknown) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(String(isoStr));
    if (isNaN(d.getTime())) return String(isoStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(isoStr);
  }
};

const parsePickupDetails = (rawStr: unknown) => {
  const text = String(rawStr || '').trim();
  if (!text || text === '—' || text === 'null' || text === 'undefined') {
    return {
      farmLocation: 'Thôn Đa Quý, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng',
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
    farmLocation: farmLocation || 'Thôn Đa Quý, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng',
    contactPhone: contactPhone || '0912.345.678',
    roadAccess: roadAccess || 'Đường bê tông nông thôn 6m, xe tải 5 tấn vào tận bãi sân đóng gói nhà vườn',
  };
};

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Row[]>([]);
  const [claims, setClaims] = useState<Row[]>([]);
  const [stats, setStats] = useState<Row>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ title: string; fields: Field[]; submit: (v: Row) => Promise<unknown> } | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [claimDetail, setClaimDetail] = useState<Row | null>(null);
  const [paymentContractModal, setPaymentContractModal] = useState<Row | null>(null);
  const [inspectingContract, setInspectingContract] = useState<Row | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Quản lý các Modal quy trình chuyên sâu chuẩn Production
  const [activeCustomModal, setActiveCustomModal] = useState<
    'NONE' | 'DISPATCH_PICKUP' | 'FARM_HANDOVER' | 'WAREHOUSE_INBOUND' | 'OUTBOUND_DISPATCH' | 'SETTLE'
  >('NONE');
  const [activeModalContract, setActiveModalContract] = useState<Row | null>(null);
  const [settlementQuoteData, setSettlementQuoteData] = useState<Row | null>(null);

  const openDispatchPickupModal = (row: Row) => {
    setActiveModalContract(row);
    setActiveCustomModal('DISPATCH_PICKUP');
  };

  const openFarmHandoverModal = (row: Row) => {
    setActiveModalContract(row);
    setActiveCustomModal('FARM_HANDOVER');
  };

  const openWarehouseInboundModal = (row: Row) => {
    setActiveModalContract(row);
    setActiveCustomModal('WAREHOUSE_INBOUND');
  };

  const openOutboundDispatchModal = (row: Row) => {
    setActiveModalContract(row);
    setActiveCustomModal('OUTBOUND_DISPATCH');
  };

  const openSettlementModal = async (row: Row) => {
    try {
      const q = await api<Row>(`admin/contracts/${row.id}/settlement-quote`);
      setSettlementQuoteData(q);
    } catch {
      setSettlementQuoteData(null);
    }
    setActiveModalContract(row);
    setActiveCustomModal('SETTLE');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [contractsData, disputesData, statsData] = await Promise.all([
        api<Row[]>('admin/contracts').catch(() => []),
        api<Row[]>('admin/claims').catch(() => []),
        api<Row>('admin/dashboard/stats').catch(() => ({})),
      ]);

      const syncList = getSyncContracts();
      const approvedCodes = new Set(
        (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('hona_packaging_approved_codes') || '[]') : []).map((x: string) => str(x).toUpperCase().replace(/^#/, ''))
      );
      const serverRows = Array.isArray(contractsData) ? contractsData : [];
      const serverCodes = new Set(serverRows.map((r) => str(r.contract_code).toUpperCase().replace(/^#/, '')));

      // Kết hợp thông tin tiến độ thu hoạch và trạng thái cọc từ Sync Channel
      const enrichedServerRows = serverRows.map((row) => {
        const cleanCode = str(row.contract_code).toUpperCase().replace(/^#/, '');
        const sc = syncList.find(
          (s) =>
            (s.contractCode && str(s.contractCode).toUpperCase().replace(/^#/, '') === cleanCode) ||
            s.id === Number(row.id)
        );
        const isApprovedByStore = approvedCodes.has(cleanCode);
        const isPkgApproved = Boolean(
          isApprovedByStore ||
          (sc as any)?.packagingApproved ||
          (sc as any)?.packaging_approved ||
          row.packaging_approved ||
          sc?.status === 'PACKAGING_APPROVED' ||
          str(row.status) === 'PACKAGING_APPROVED' ||
          sc?.fulfillmentStatusName?.includes('Đã Duyệt Đóng Gói')
        );
        const isDepositPaid = Boolean(
          sc?.depositStatus === 'DEPOSIT_PAID' ||
          str(row.status) === 'DEPOSIT_PAID' ||
          row.deposit_received
        );
        const isHarvestDone = Boolean(
          (sc as any)?.isHarvestDone ||
          sc?.fulfillmentStatusName?.includes('Đã Thu Hoạch') ||
          (sc?.fulfillmentStep || 0) > 2 ||
          row.actual_harvest_weight_kg ||
          str(row.status) === 'HARVESTED'
        );

        const serverStatus = str(row.status);
        const serverFulfillment = str(row.fulfillment_status);
        const isServerAdvanced = ['PICKUP_DISPATCHED', 'IN_TRANSIT_HUB', 'AT_HUB_QC', 'OUTBOUND_DISPATCHED', 'DELIVERED', 'SETTLED'].includes(serverStatus) ||
          ['PICKUP_DISPATCHED', 'IN_TRANSIT_HUB', 'AT_HUB_QC', 'OUTBOUND_DISPATCHED', 'DELIVERED', 'SETTLED'].includes(serverFulfillment);

        let finalStatus = row.status;
        if (isServerAdvanced) {
          finalStatus = serverStatus || serverFulfillment || row.status;
        } else if (isPkgApproved) {
          finalStatus = 'PACKAGING_APPROVED';
        } else if (isDepositPaid && str(row.status) === 'AGREED') {
          finalStatus = 'DEPOSIT_PAID';
        } else if (isHarvestDone && str(row.status) === 'DEPOSIT_PAID') {
          finalStatus = 'HARVESTED';
        }

        const computedFulfillStep = isServerAdvanced
          ? (finalStatus === 'IN_TRANSIT_HUB' ? 3 : finalStatus === 'AT_HUB_QC' ? 4 : (sc?.fulfillmentStep || row.fulfillment_step || 3))
          : (sc?.fulfillmentStep || (isPkgApproved ? 2 : row.fulfillment_step));

        const computedFulfillStatus = isServerAdvanced
          ? (row.fulfillment_status || finalStatus)
          : (sc?.fulfillmentStatusName || (isPkgApproved ? 'Đã Duyệt Đóng Gói (Sẵn Sàng Điều Xe)' : row.fulfillment_status));

        if (sc) {
          return {
            ...row,
            deposit_received: isDepositPaid ? (row.deposit_received || sc.depositAmount || row.deposit_30_amount) : row.deposit_received,
            status: finalStatus,
            fulfillment_step: computedFulfillStep,
            fulfillment_status: computedFulfillStatus,
            actual_harvest_weight_kg: row.actual_harvest_weight_kg || sc.actualHarvestWeightKg,
            grade1_ratio: row.grade1_ratio || (sc as any).grade1Ratio || 96,
            package_count: row.package_count || sc.packageCount,
            package_type: row.package_type || sc.packageType,
            qr_code_data: row.qr_code_data || sc.qrCodeData,
            farm_pickup_address: row.farm_pickup_address || sc.farmPickupAddress,
            harvest_proof_image_url: row.harvest_proof_image_url || sc.harvestProofImageUrl,
            harvest_notes: row.harvest_notes || (sc as any).notes,
            packaging_approved: isPkgApproved,
            is_harvest_done: isHarvestDone,
          };
        }
        return {
          ...row,
          status: finalStatus,
          packaging_approved: isPkgApproved,
          fulfillment_step: computedFulfillStep,
          fulfillment_status: computedFulfillStatus,
          is_harvest_done: Boolean(row.is_harvest_done || row.actual_harvest_weight_kg || str(row.status) === 'HARVESTED'),
        };
      });

      // Bổ sung các hợp đồng mới tạo từ Sync Channel chưa kịp ghi server
      const localRows: Row[] = syncList
        .filter((sc) => sc.contractCode && !serverCodes.has(str(sc.contractCode).toUpperCase().replace(/^#/, '')))
        .map((sc) => {
          const cleanCode = str(sc.contractCode).toUpperCase().replace(/^#/, '');
          const isApprovedByStore = approvedCodes.has(cleanCode);
          const isHarvestDone = Boolean(
            (sc as any).isHarvestDone ||
            sc.fulfillmentStatusName?.includes('Đã Thu Hoạch') ||
            sc.fulfillmentStep > 2 ||
            sc.actualHarvestWeightKg
          );
          const isPkgApproved = Boolean(
            isApprovedByStore ||
            (sc as any).packagingApproved ||
            (sc as any).packaging_approved ||
            sc.status === 'PACKAGING_APPROVED'
          );
          return {
            id: sc.id,
            contract_code: sc.contractCode,
            rfq_code: sc.rfqCode,
            lot_code: sc.lotCode,
            product_name: sc.productName,
            buyer_name: sc.buyerCompany || sc.buyerName,
            farmer_name: sc.farmerCompany || sc.farmerName,
            offered_weight_kg: sc.quantityKg,
            price_per_kg: sc.agreedPricePerKg,
            offered_price_per_kg: sc.agreedPricePerKg,
            goods_amount: sc.goodsAmount || (sc.quantityKg * sc.agreedPricePerKg),
            total_goods_amount: sc.goodsAmount || (sc.quantityKg * sc.agreedPricePerKg),
            logistics_fee_amount: sc.shippingFee || 0,
            shipping_option: sc.shippingOption,
            shipping_fee: sc.shippingFee || 0,
            total_amount: sc.totalAmount || ((sc.goodsAmount || (sc.quantityKg * sc.agreedPricePerKg)) + (sc.shippingFee || 0)),
            deposit_30_amount: sc.depositAmount,
            deposit_received: sc.depositStatus === 'DEPOSIT_PAID' ? sc.depositAmount : 0,
            status: isPkgApproved ? 'PACKAGING_APPROVED' : (isHarvestDone ? 'HARVESTED' : (sc.depositStatus === 'DEPOSIT_PAID' ? 'DEPOSIT_PAID' : 'AGREED')),
            fulfillment_step: sc.fulfillmentStep,
            fulfillment_status: isPkgApproved ? 'Đã Duyệt Đóng Gói (Sẵn Sàng Điều Xe)' : (isHarvestDone ? 'HARVESTED' : sc.fulfillmentStep > 2 ? 'IN_TRANSIT' : 'WAITING_HARVEST'),
            actual_harvest_weight_kg: sc.actualHarvestWeightKg,
            grade1_ratio: (sc as any).grade1Ratio || 96,
            package_count: sc.packageCount,
            package_type: sc.packageType,
            qr_code_data: sc.qrCodeData,
            farm_pickup_address: sc.farmPickupAddress,
            harvest_proof_image_url: sc.harvestProofImageUrl,
            harvest_notes: (sc as any).notes,
            packaging_approved: isPkgApproved,
            is_harvest_done: isHarvestDone,
            created_at: sc.createdAt,
          };
        });

      setContracts([...enrichedServerRows, ...localRows]);
      setClaims(Array.isArray(disputesData) ? disputesData : []);
      setStats(statsData || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu hợp đồng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();

    // 1. Đồng bộ sự kiện B2B nội bộ (BroadcastChannel & LocalStorage)
    const unsubscribe = subscribeB2bSyncEvents(() => {
      void loadData();
    });

    // 2. Đồng bộ thời gian thực qua STOMP WebSocket Server (/topic/contracts, /topic/lots, /topic/dispatch)
    const unsubWsContracts = b2bWebSocket.subscribeContracts(() => {
      void loadData();
    });
    const unsubWsLots = b2bWebSocket.subscribeLots(() => {
      void loadData();
    });
    const unsubWsDispatch = b2bWebSocket.subscribeDispatch(() => {
      void loadData();
    });

    return () => {
      unsubscribe();
      unsubWsContracts();
      unsubWsLots();
      unsubWsDispatch();
    };
  }, [loadData]);

  // Tự động cập nhật modal chi tiết khi nhận được Socket từ Nông Dân / Thương Lái
  useEffect(() => {
    if (detail) {
      const code = String(detail.contract_code || '').trim().toUpperCase();
      const updated = contracts.find(
        (c) =>
          Number(c.id) === Number(detail.id) ||
          (c.contract_code && String(c.contract_code).trim().toUpperCase() === code)
      );
      if (updated && JSON.stringify(updated) !== JSON.stringify(detail)) {
        setDetail(updated);
      }
    }
  }, [contracts, detail]);

  const openDialog = (title: string, endpoint: string, fields: Field[], method = 'POST', fixed: Row = {}, contractId?: number | string) => {
    setDialog({
      title,
      fields,
      submit: async (values) => {
        await api(endpoint, method, { ...values, ...fixed });
        if (fixed.status === 'AT_HUB_QC' && contractId) {
          try {
            updateContractFulfillmentStep(contractId as any, 4, { fulfillmentStatusName: 'Đã Nhập Kho HoNa & Kiểm Định QC' });
            b2bWebSocket.publish('/topic/contracts', { action: 'MOVED_TO_QC_HUB', contractId, status: 'AT_HUB_QC' });
          } catch {}
        }
        await loadData();
      },
    });
  };

  const advanceStatus = async (row: Row) => {
    const next = nextState[str(row.status)];
    if (!next) return;
    const fields: Field[] = [];
    if (['DEPOSIT_PAID', 'DELIVERED', 'SETTLED'].includes(next)) {
      try {
        const quote = await api<Row>(`admin/contracts/${row.id}/settlement-quote`);
        fields.push(
          f('reference', 'Mã giao dịch ngân hàng đã đối soát'),
          f(
            'amount',
            next === 'SETTLED' ? 'Số tiền thực chuyển nông trại (đ)' : 'Số tiền thực nhận (đ)',
            'number',
            Number(next === 'DEPOSIT_PAID' ? row.deposit_30_amount : next === 'DELIVERED' ? quote.balanceDue : quote.payout)
          )
        );
      } catch {
        fields.push(
          f('reference', 'Mã giao dịch ngân hàng đã đối soát'),
          f('amount', 'Số tiền thanh toán (đ)', 'number', 0)
        );
      }
    }
    openDialog(
      `Xác nhận chuyển trạng thái: ${nextStateLabel[str(row.status)] || next} · ${row.contract_code}`,
      `admin/contracts/${row.id}/status`,
      fields,
      'PATCH',
      { status: next },
      row.id as any
    );
  };

  const handleDispatchPickup = (row: Row) => {
    const defaultAddr = str(row.farm_pickup_address) !== '—' ? str(row.farm_pickup_address) : (str(row.farmer_name) + ' - Vùng trồng VietGAP');
    openDialog(
      `🚚 Điều phối xe lạnh lấy hàng tại vườn · ${row.contract_code}`,
      `admin/contracts/${row.id}/dispatch-pickup`,
      [
        f('truckPlate', 'Biển số xe tải lạnh HoNa Fresh', 'text', '49C-198.86 (Xe thùng lạnh 5 tấn)'),
        f('driverName', 'Tên tài xế phụ trách', 'text', 'Nguyễn Văn Tài (HoNa Cold Express)'),
        f('driverPhone', 'Số điện thoại tài xế', 'text', '0981.234.567'),
        f('pickupAddress', 'Địa chỉ vườn đón xe (Farmer khai báo)', 'text', defaultAddr),
      ],
      'POST',
      {},
      row.id as any
    );
  };

  const handleFarmHandover = (row: Row) => {
    openDialog(
      `🌿 Biên bản bàn giao & lấy hàng tại vườn · ${row.contract_code}`,
      `admin/contracts/${row.id}/farm-handover`,
      [
        f('handoverTemp', 'Nhiệt độ cuống rau đo tại farm (°C, chuẩn ≤ 15°C)', 'number', 12.5),
        f('packageCount', 'Số lượng thùng thực nhận tại farm', 'number', Number(row.package_count || 10)),
      ],
      'POST',
      {},
      row.id as any
    );
  };

  const handleWarehouseInbound = (row: Row) => {
    openDialog(
      `🏢 Nhập kho lạnh HoNa & Cấp chứng chỉ QC · ${row.contract_code}`,
      `admin/contracts/${row.id}/warehouse-inbound`,
      [
        select('zone', 'Phân khu kho bảo quản HoNa', ['Zone A (Lạnh mát 2-6°C - Rau ăn lá)', 'Zone B (Lạnh sâu -2 đến 2°C - Củ quả)', 'Zone C (Mát 8-12°C - Trái cây)']),
        f('rackBin', 'Vị trí kệ/ô lưu kho (WMS Slotting)', 'text', 'Kệ R-03 Ô B-12'),
        f('maxStorageDays', 'Số ngày tối đa lưu kho (Dựa trên ngày nhận Buyer & FEFO)', 'number', 5),
        f('qcCertUrl', 'Mã phiếu xét nghiệm / Link chứng chỉ test Nitrat/BVTV', 'text', 'https://qc.honafresh.vn/cert-' + String(row.contract_code || '').toLowerCase()),
      ],
      'POST',
      {},
      row.id as any
    );
  };

  const handleOutboundDispatch = (row: Row) => {
    openDialog(
      `🚛 Điều phối chuyến xe xuất kho chặng cuối · ${row.contract_code}`,
      `admin/contracts/${row.id}/outbound-dispatch`,
      [
        f('truckPlate', 'Biển số xe giao chặng cuối đến Buyer', 'text', '51D-921.88 (Xe lạnh HoNa Express)'),
        f('driverName', 'Tài xế giao hàng', 'text', 'Trần Quốc Bảo'),
        f('deliveryAddress', 'Địa chỉ kho Buyer nhận hàng', 'text', str(row.delivery_address)),
      ],
      'POST',
      {},
      row.id as any
    );
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        String(c.contract_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(c.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(c.buyer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(c.farmer_name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || String(c.status) === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: contracts.length };
    contracts.forEach((c) => {
      const s = String(c.status || '');
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [contracts]);

  const activeDetailStatus = detail ? (STATUS_CONFIG[String(detail.status)] || {
    label: str(detail.status),
    desc: '',
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    dot: 'bg-gray-500',
  }) : null;

  return (
    <div className="space-y-6">
      {/* Banner Chuẩn HoNa Fresh */}
      <div className="bg-gradient-to-r from-[#10542C] via-[#1B6D3D] to-[#0A4020] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
              <Handshake className="w-7 h-7 text-[#8BC34A]" /> Hợp Đồng Mua Bán Sỉ & Tiền Bảo Chứng
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-2xl">
              Giám sát toàn bộ tiến trình hợp đồng mua bán sỉ nông sản, dòng tiền đặt cọc 30% bảo chứng giao dịch an toàn và giải ngân quyết toán tới nhà vườn.
            </p>
          </div>
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Metric Cards Giám Sát Dòng Tiền */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#EAECE8] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold">Tiền Cọc Bảo Chứng Tạm Giữ</span>
            <DollarSign className="w-4 h-4 text-[#10542C]" />
          </div>
          <p className="text-2xl font-black text-[#10542C]">
            {loading ? '...' : `${money(stats.heldFunds)} đ`}
          </p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Tiền cọc 30% Sàn đang giữ hộ bảo chứng</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAECE8] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold">Doanh Thu Phí Dịch Vụ Sàn (TK 112)</span>
            <FileText className="w-4 h-4 text-[#FB8C00]" />
          </div>
          <p className="text-2xl font-black text-[#2C3E2E]">
            {loading ? '...' : `${money(stats.serviceRevenue)} đ`}
          </p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Phí hoa hồng 3% tích lũy từ các giao dịch</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAECE8] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold">Tổng Giá Trị Giao Dịch (GMV)</span>
            <Handshake className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-[#10542C]">
            {loading ? '...' : `${money(stats.gmv)} đ`}
          </p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Tổng quy mô hợp đồng đã chốt qua sàn</span>
        </div>
      </div>

      {/* Toolbar Thao Tác Hợp Đồng */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() =>
              openDialog('Tạo RFQ Hợp Đồng Sỉ Thay Mặt Bên Mua', 'admin/contracts', [
                f('buyerId', 'ID Thương Lái (BUYER đã duyệt KYC)', 'number'),
                f('lotId', 'ID Lô Nông Sản Đang Mở Bán', 'number'),
                f('weightKg', 'Khối lượng đặt sỉ (kg)', 'number'),
                f('pricePerKg', 'Đơn giá thỏa thuận (đ/kg)', 'number'),
                f('logisticsFee', 'Phí vận chuyển và lưu trạm lạnh (đ)', 'number', 0),
                f('deliveryAddress', 'Địa chỉ kho nhận hàng bên mua'),
              ])
            }
            className="px-4 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tạo RFQ / Hợp Đồng Mới
          </button>

          <button
            onClick={() =>
              openDialog('Lập Biên Bản Sự Cố Hợp Đồng', 'admin/claims', [
                f('contractId', 'ID Hợp đồng phát sinh sự cố', 'number'),
                f('damagedWeightKg', 'Khối lượng hàng hư hỏng / dập nát (kg)', 'number'),
                f('cause', 'Nguyên nhân sự cố (đứt chuỗi lạnh / trễ hẹn / dập nát)'),
                select('liableParty', 'Bên chịu trách nhiệm bồi thường', ['PLATFORM', 'FARMER']),
              ])
            }
            className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" /> Lập Biên Bản Sự Cố
          </button>
        </div>

        {/* Bộ Lọc Trạng Thái Dropdown & Ô Tìm Kiếm - Gọn gàng tiết kiệm diện tích */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown Lọc Trạng Thái */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-[#10542C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Lọc theo trạng thái hợp đồng"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`pl-8 pr-8 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-[#10542C] cursor-pointer appearance-none shadow-2xs transition-colors ${
                statusFilter !== 'ALL'
                  ? 'bg-emerald-50 border-emerald-300 text-[#10542C]'
                  : 'bg-white border-[#EAECE8] text-[#2C3E2E] hover:border-[#10542C]/40'
              }`}
            >
              <option value="ALL">Tất cả trạng thái ({statusCounts['ALL'] || 0})</option>
              <option value="SETTLED">Đã hoàn tất & Giải ngân ({statusCounts['SETTLED'] || 0})</option>
              <option value="DELIVERED">Đã giao hàng (Chờ quyết toán) ({statusCounts['DELIVERED'] || 0})</option>
              <option value="OUTBOUND_DISPATCHED">Đã xuất kho (Đang giao Buyer) ({statusCounts['OUTBOUND_DISPATCHED'] || 0})</option>
              <option value="IN_TRANSIT">Đang vận chuyển lạnh ({statusCounts['IN_TRANSIT'] || 0})</option>
              <option value="AT_HUB_QC">Tại kho HoNa (Đang kiểm định QC) ({statusCounts['AT_HUB_QC'] || 0})</option>
              <option value="IN_TRANSIT_HUB">Đang chuyển về kho HoNa ({statusCounts['IN_TRANSIT_HUB'] || 0})</option>
              <option value="PICKUP_DISPATCHED">Đã điều xe đến rẫy ({statusCounts['PICKUP_DISPATCHED'] || 0})</option>
              <option value="PACKAGING_APPROVED">Đã duyệt đóng gói ({statusCounts['PACKAGING_APPROVED'] || 0})</option>
              <option value="HARVESTED">Đã thu hoạch (Chờ duyệt đóng gói) ({statusCounts['HARVESTED'] || 0})</option>
              <option value="DEPOSIT_PAID">Đã cọc 30% bảo chứng ({statusCounts['DEPOSIT_PAID'] || 0})</option>
              <option value="AGREED">Đã chốt hợp đồng (Chờ cọc) ({statusCounts['AGREED'] || 0})</option>
              <option value="RFQ_SENT">Chờ phản hồi RFQ ({statusCounts['RFQ_SENT'] || 0})</option>
              <option value="CANCELLED">Đã hủy hợp đồng ({statusCounts['CANCELLED'] || 0})</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Ô Tìm Kiếm Hợp Đồng */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo mã HĐ, nông sản, bên mua..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-white border border-[#EAECE8] rounded-xl text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Danh Sách Hợp Đồng B2B Bảng Chuẩn */}
      <div className="space-y-3">
        <h3 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center justify-between">
          <span>Danh Sách Hợp Đồng Nguyên Tắc ({filteredContracts.length})</span>
        </h3>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-[#10542C] animate-spin" />
            <span>Đang tải danh sách hợp đồng...</span>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8]">
            <p className="font-bold text-[#2C3E2E]">Không tìm thấy hợp đồng nào phù hợp bộ lọc.</p>
            <p className="mt-1">Thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#EAECE8] rounded-2xl bg-white shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F4F6F1] text-[#52634F] font-bold">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Mã Hợp Đồng</th>
                  <th className="p-3.5 whitespace-nowrap">Nông Sản Vụ Mùa</th>
                  <th className="p-3.5 whitespace-nowrap">Bên Mua (Thương Lái)</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Sản Lượng (kg)</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Tổng Tiền Hàng (đ)</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Cọc 30% Đã Thu (đ)</th>
                  <th className="p-3.5 whitespace-nowrap">Trạng Thái</th>
                  <th className="p-3.5 text-right pr-5 whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2ED]">
                {filteredContracts.map((row) => {
                  const sCfg = formatStatusBadge(row.status);

                  return (
                    <tr key={str(row.id)} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#10542C] whitespace-nowrap">
                        {str(row.contract_code)}
                      </td>
                      <td className="p-3.5 font-bold text-[#2C3E2E]">
                        <div>{str(row.product_name)}</div>
                        {Boolean(row.lot_code) && (
                          <span className="text-[10px] text-[#6B7280] font-mono">
                            {str(row.lot_code)}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[#2C3E2E] max-w-[200px]">
                        <div className="font-bold truncate">{str(row.buyer_name || 'Công Ty Thu Mua')}</div>
                        {Boolean(row.farmer_name) && (
                          <div className="text-[10px] text-[#6B7280] truncate">
                            Bán: {str(row.farmer_name)}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-bold text-[#2C3E2E] whitespace-nowrap">
                        {money(row.offered_weight_kg)} kg
                      </td>
                      <td className="p-3.5 text-right font-black text-[#10542C] whitespace-nowrap">
                        {money(
                          (Number(row.offered_weight_kg) > 0 && Number(row.offered_price_per_kg || row.price_per_kg) > 0)
                            ? Number(row.offered_weight_kg) * Number(row.offered_price_per_kg || row.price_per_kg)
                            : row.total_goods_amount
                        )}{' '}
                        đ
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {money(row.deposit_received)} đ
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${sCfg.bg} ${sCfg.text} ${sCfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`} />
                          {sCfg.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-5 whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {/* Trạng thái đã giải ngân hoàn tất */}
                          {str(row.status) === 'SETTLED' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoàn tất
                            </span>
                          )}

                          {/* Nút thao tác chuyển trạng thái tiếp theo trong quy trình */}
                          {(() => {
                            if (str(row.status) === 'SETTLED') return null;

                            const isDepositPaid = str(row.status) === 'DEPOSIT_PAID';
                            const rawFulfill = String(row.fulfillment_status || '').toUpperCase();
                            const isHarvestDone = Boolean(
                              row.is_harvest_done ||
                              rawFulfill.includes('HARVESTED') ||
                              rawFulfill.includes('PACKAGED') ||
                              rawFulfill.includes('PICKUP_DISPATCHED') ||
                              rawFulfill.includes('IN_TRANSIT_HUB') ||
                              rawFulfill.includes('AT_HUB_QC') ||
                              String(row.status).toUpperCase().includes('HARVESTED') ||
                              String(row.status).toUpperCase().includes('AT_HUB_QC') ||
                              Number(row.fulfillment_step || 0) >= 2
                            );

                            const isAdvancedStage = [
                              'PICKUP_DISPATCHED',
                              'IN_TRANSIT_HUB',
                              'IN_TRANSIT',
                              'AT_HUB_QC',
                              'OUTBOUND_DISPATCHED',
                              'DELIVERED',
                              'SETTLED',
                            ].includes(str(row.status)) || [
                              'PICKUP_DISPATCHED',
                              'IN_TRANSIT_HUB',
                              'IN_TRANSIT',
                              'AT_HUB_QC',
                              'OUTBOUND_DISPATCHED',
                              'DELIVERED',
                              'SETTLED',
                            ].includes(rawFulfill);

                            // 1. Chờ nhà vườn thu hoạch
                            if (!isAdvancedStage && isDepositPaid && !isHarvestDone) {
                              return (
                                <span
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 rounded-xl border border-amber-200"
                                  title="Nhà vườn đang tiến hành thu hoạch nông sản tại vườn. Nút Điều phối xe sẽ xuất hiện ngay khi nhà vườn nộp biên bản nghiệm thu thu hoạch."
                                >
                                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                  <span>Chờ nhà vườn thu hoạch</span>
                                </span>
                              );
                            }

                            // 2. Farmer đã thu hoạch xong -> Admin xem nghiệm thu & duyệt đóng gói trước khi điều phối xe
                            if (!isAdvancedStage && (
                              (isDepositPaid && isHarvestDone) ||
                              str(row.status) === 'HARVESTED' ||
                              str(row.status) === 'PACKAGING_APPROVED' ||
                              rawFulfill === 'HARVESTED'
                            )) {
                              const isApproved = Boolean(row.packaging_approved || (row as any).packagingApproved || str(row.status) === 'PACKAGING_APPROVED');
                              if (!isApproved) {
                                return (
                                  <div className="flex flex-col items-start gap-1">
                                    <span className="text-[10px] text-amber-800 bg-amber-50 font-bold px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      Đã thu: {money(row.actual_harvest_weight_kg || row.offered_weight_kg)} kg ({str(row.package_count || 10)} thùng)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setInspectingContract(row)}
                                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                                      title="Kiểm tra hình ảnh đóng thùng, tỷ lệ loại 1 và duyệt quy cách trước khi điều xe"
                                    >
                                      <FileCheck className="w-3.5 h-3.5 text-white" />
                                      <span>Xem nghiệm thu & Duyệt đóng gói</span>
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div className="flex flex-col items-start gap-1">
                                  <span className="text-[10px] text-emerald-800 bg-emerald-50 font-bold px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Đã duyệt đóng gói ({str(row.package_count || 10)} thùng)
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <Link
                                      href={`/admin/inbound-dispatch?contractCode=${row.contract_code}`}
                                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#10542C] hover:bg-[#0C3E20] rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                                      title="Mở Bảng Điều Phối Lấy Hàng Kiểm Định (Gán xe kho gần nhất & kiểm soát tải trọng)"
                                    >
                                      <Route className="w-3.5 h-3.5 text-white" />
                                      <span>Điều phối thu gom rẫy</span>
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => openDispatchPickupModal(row)}
                                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-gray-200 transition cursor-pointer"
                                      title="Điều phối xe đơn lẻ"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            // 3. Đã điều phối xe đến vườn -> Xác nhận lấy hàng tại vườn
                            if (rawFulfill === 'PICKUP_DISPATCHED' || str(row.status) === 'PICKUP_DISPATCHED') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => openFarmHandoverModal(row)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Xác nhận nhiệt độ cuống rau và lấy hàng tại vườn để chở về kho HoNa"
                                >
                                  <Sprout className="w-3 h-3" />
                                  <span>Xác nhận lấy hàng tại farm</span>
                                </button>
                              );
                            }

                            // 4. Đang trên đường về kho HoNa -> Nhập kho HoNa & Kiểm định QC
                            if (rawFulfill === 'IN_TRANSIT_HUB' || str(row.status) === 'IN_TRANSIT_HUB') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => openWarehouseInboundModal(row)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Nhập kho HoNa, gán kệ Zone/Rack/Bin và cấp chứng chỉ kiểm định QC"
                                >
                                  <Building2 className="w-3 h-3" />
                                  <span>Nhập kho & Kiểm định QC</span>
                                </button>
                              );
                            }

                            // 5. Đã tại kho HoNa QC -> Điều xe xuất kho giao Buyer
                            if (str(row.status) === 'AT_HUB_QC' || rawFulfill === 'AT_HUB_QC') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => openOutboundDispatchModal(row)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#10542C] hover:bg-[#0C3E20] rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Lập chuyến xe lạnh chặng cuối ghép danh sách địa chỉ giao Buyer"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>Điều xe xuất kho giao Buyer</span>
                                </button>
                              );
                            }

                            // 6. Đã giao hàng -> Quyết toán & Giải ngân cho Farmer
                            if (str(row.status) === 'DELIVERED') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => void openSettlementModal(row)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Đối soát số kg thực nhận, trừ cọc Escrow, phí sàn 3% và giải ngân cho Nông dân"
                                >
                                  <Receipt className="w-3 h-3" />
                                  <span>Quyết toán & Giải ngân</span>
                                </button>
                              );
                            }

                            // 7. Các trạng thái khác (RFQ_SENT, AGREED, IN_TRANSIT)
                            if (nextState[str(row.status)]) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => void advanceStatus(row)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#10542C] hover:bg-[#0C3E20] rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{nextStateLabel[str(row.status)] || nextState[str(row.status)]}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              );
                            }

                            return null;
                          })()}

                          {/* Nút Chi tiết luôn cố định ở vị trí ngoài cùng bên phải, thẳng hàng 100% */}
                          <button
                            type="button"
                            onClick={() => setDetail(row)}
                            className="px-3 py-1.5 text-xs font-bold text-[#10542C] bg-[#EAF5E9] hover:bg-[#D7EED6] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bảng Tranh Chấp & Khiếu Nại Bồi Thường */}
      <div className="space-y-3 pt-6 border-t border-[#EAECE8]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Biên Bản Tranh Chấp & Bồi Thường ({claims.length})</span>
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Cơ chế trọng tài sàn HoNa Fresh: Phân định trách nhiệm hao hụt vận chuyển, hư hỏng lạnh và giải quyết bồi hoàn minh bạch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              openDialog(
                'Lập Biên Bản Sự Cố / Tranh Chấp Hợp Đồng B2B',
                'admin/claims',
                [
                  select('contractId', 'Mã hợp đồng B2B', contracts.map((c) => String(c.id))),
                  f('damagedWeightKg', 'Khối lượng hư hỏng (kg)', 'number', 10),
                  f('cause', 'Mô tả chi tiết nguyên nhân sự cố'),
                  select('liableParty', 'Bên chịu trách nhiệm', ['PLATFORM', 'FARMER']),
                ],
                'POST'
              );
            }}
            className="px-3.5 py-1.5 text-xs font-bold text-[#10542C] bg-[#EAF5E9] hover:bg-[#D7EED6] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lập biên bản sự cố</span>
          </button>
        </div>

        {claims.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8]">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
            <p className="font-bold text-[#2C3E2E]">Không có khiếu nại tranh chấp nào cần xử lý</p>
            <p className="mt-1">Tất cả các lô hàng và hợp đồng đang được vận hành an toàn và đúng quy chuẩn chất lượng.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#EAECE8] rounded-2xl bg-white shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F4F6F1] text-[#52634F] font-bold">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Mã Biên Bản</th>
                  <th className="p-3.5 whitespace-nowrap">Hợp Đồng & Nông Sản</th>
                  <th className="p-3.5 whitespace-nowrap">Nguyên Nhân Sự Cố</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Hư Hỏng (kg)</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Ước Tính Thiệt Hại (đ)</th>
                  <th className="p-3.5 whitespace-nowrap">Bên Chịu Trách Nhiệm</th>
                  <th className="p-3.5 whitespace-nowrap">Trạng Thái</th>
                  <th className="p-3.5 text-right pr-5 whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2ED]">
                {claims.map((row) => {
                  const liableCfg = CLAIM_LIABLE_CONFIG[str(row.liable_party)] || {
                    label: str(row.liable_party),
                    shortLabel: str(row.liable_party),
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                    border: 'border-gray-200',
                    icon: '⚖️',
                  };

                  const statusCfg = CLAIM_STATUS_CONFIG[str(row.status)] || {
                    label: str(row.status),
                    desc: '',
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                    border: 'border-gray-200',
                    dot: 'bg-gray-400',
                    actionLabel: 'Xem chi tiết',
                  };

                  const contractCode = str(row.contract_code || ('#HĐ-' + row.contract_id));
                  const claimCode = str(row.claim_code || ('#CLM-' + String(row.id).padStart(3, '0')));

                  return (
                    <tr key={str(row.id)} className="hover:bg-rose-50/20 transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded-lg text-xs">
                          {claimCode}
                        </span>
                        {Boolean(row.created_at) && (
                          <div className="text-[10px] text-[#6B7280] mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#6B7280]" />
                            {formatDate(row.created_at)}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-[#2C3E2E]">
                        <div className="flex items-center gap-1.5 font-bold">
                          <button
                            type="button"
                            onClick={() => {
                              const foundContract = contracts.find((c) => String(c.id) === String(row.contract_id));
                              if (foundContract) setDetail(foundContract);
                            }}
                            className="font-mono text-[#10542C] hover:underline cursor-pointer"
                            title="Xem chi tiết hợp đồng"
                          >
                            {contractCode}
                          </button>
                          <span className="text-[#9CA3AF]">·</span>
                          <span className="truncate max-w-[180px]">{str(row.product_name || 'Nông sản hợp đồng')}</span>
                        </div>
                        <div className="text-[10px] text-[#6B7280] truncate max-w-[240px] mt-0.5">
                          Mua: <span className="font-medium text-[#2C3E2E]">{str(row.buyer_name || 'Thương lái')}</span>
                          {Boolean(row.farmer_name) && (
                            <span> · Bán: <span className="font-medium text-[#2C3E2E]">{str(row.farmer_name)}</span></span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-[#2C3E2E] max-w-[260px]">
                        <p className="line-clamp-2 text-xs leading-relaxed" title={str(row.cause)}>
                          {str(row.cause)}
                        </p>
                      </td>
                      <td className="p-3.5 text-right font-bold text-[#2C3E2E] whitespace-nowrap">
                        {money(row.damaged_weight_kg)} kg
                      </td>
                      <td className="p-3.5 text-right font-black text-rose-600 whitespace-nowrap">
                        {money(row.compensation_amount)} đ
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${liableCfg.bg} ${liableCfg.text} ${liableCfg.border}`}
                          title={liableCfg.label}
                        >
                          <span>{liableCfg.icon}</span>
                          <span>{liableCfg.shortLabel}</span>
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-5 whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {str(row.status) === 'OPEN' ? (
                            <button
                              type="button"
                              onClick={() =>
                                openDialog(
                                  `Phán Quyết Tranh Chấp Hợp Đồng · ${claimCode}`,
                                  `admin/contracts/${row.contract_id}/resolve-dispute`,
                                  [
                                    select('action', 'Hình thức phán quyết', ['DISMISS', 'COMPENSATE', 'REFUND']),
                                    f('reference', 'Mã quyết định / Giao dịch bồi hoàn ngân hàng'),
                                    f('note', 'Nội dung chi tiết quyết định xử lý'),
                                  ],
                                  'POST',
                                  { claimId: row.id }
                                )
                              }
                              className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span>Xử lý phán quyết</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setClaimDetail(row)}
                              className="px-3 py-1.5 text-xs font-bold text-[#10542C] bg-[#EAF5E9] hover:bg-[#D7EED6] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-[#D7EED6]"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Xem quyết định</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog Form */}
      {dialog && (
        <FormDialog
          value={dialog}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            void loadData();
          }}
        />
      )}

      {/* 1. MODAL VĂN BẢN HỢP ĐỒNG B2B ĐIỆN TỬ DÙNG CHUNG DUY NHẤT (ADMIN, BUYER & FARMER) */}
      <B2bContractViewModal
        isOpen={Boolean(detail)}
        contract={detail ? (() => {
          const syncList = getSyncContracts();
          const targetCode = String(detail.contract_code || '').trim().toUpperCase();
          const sc = syncList.find(s => (s.contractCode && s.contractCode.toUpperCase() === targetCode) || s.id === Number(detail.id));

          const cleanStr = (val: unknown): string => {
            if (!val) return '';
            const s = String(val).trim();
            return (s === '—' || s === 'null' || s === 'undefined') ? '' : s;
          };

          const pickup = parsePickupDetails(detail.farm_pickup_address || (sc as any)?.farmPickupAddress || detail.farmer_address);

          const farmerCompany = cleanStr(detail.farmer_company) || cleanStr(sc?.farmerCompany) || cleanStr(detail.farmer_name) || 'HTX Nông Nghiệp Đà Lạt GAP';
          const farmerRep = cleanStr(detail.farmer_contact) || (cleanStr(sc?.farmerName) !== farmerCompany ? cleanStr(sc?.farmerName) : '') || 'Nguyễn Văn Nông';
          const farmerPhone = cleanStr(detail.farmer_phone) || cleanStr(sc?.farmerPhone) || pickup.contactPhone || '0912.345.678';
          const farmerAddr = pickup.farmLocation || 'Thôn Đa Quý, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng';

          const buyerCompany = cleanStr(detail.buyer_company) || cleanStr(sc?.buyerCompany) || 'Công Ty TNHH Thu Mua Sỉ Nông Sản Sài Gòn';
          const buyerRep = cleanStr(detail.buyer_contact) || (cleanStr(sc?.buyerName) !== buyerCompany ? cleanStr(sc?.buyerName) : '') || cleanStr(detail.buyer_name) || 'Trần Thị Thương';
          const buyerPhone = cleanStr(detail.buyer_phone) || cleanStr(sc?.buyerPhone) || '0987.654.321';
          const deliveryAddr = cleanStr(detail.delivery_address) || cleanStr(sc?.deliveryAddress) || 'Kho Tổng Hợp Chuỗi Lạnh Thủ Đức, TP.HCM';
          const rfqCode = cleanStr(detail.rfq_code) || cleanStr(sc?.rfqCode) || (detail.contract_code ? `RFQ-${String(detail.contract_code).replace(/^HD-/, '')}` : 'RFQ-8915FD6E');

          return {
            id: Number(detail.id),
            contractCode: str(detail.contract_code),
            rfqCode: rfqCode,
            lotCode: str(detail.lot_code || sc?.lotCode || ('LOT-' + detail.lot_id)),
            productName: str(detail.product_name || sc?.productName),
            buyerName: buyerRep,
            buyerCompany: buyerCompany,
            buyerRepresentative: buyerRep,
            buyerPhone: buyerPhone,
            buyerAddress: deliveryAddr,
            farmerName: farmerRep,
            farmerCompany: farmerCompany,
            farmerRepresentative: farmerRep,
            farmerPhone: farmerPhone,
            farmerAddress: farmerAddr,
            farmerPuc: str(detail.puc_code || (sc as any)?.farmerPuc || 'VN-LDO-PUC-0849'),
            quantityKg: Number(detail.offered_weight_kg || detail.quantityKg || sc?.quantityKg || 0),
            unitPrice: Number(detail.offered_price_per_kg || detail.price_per_kg || sc?.agreedPricePerKg || 0),
            totalAmount: Number(detail.total_contract_value || detail.total_amount || sc?.totalAmount || 0),
            goodsAmount: Number(detail.total_goods_amount || detail.goods_amount || sc?.goodsAmount || 0),
            shippingFee: Number(detail.logistics_fee_amount || detail.shippingFee || sc?.shippingFee || 0),
            shippingOption: str(detail.shipping_option || sc?.shippingOption || 'CROSS_DOCKING_HUB'),
            depositAmount: Number(detail.deposit_30_amount || detail.deposit_amount || sc?.depositAmount || 0),
            remainingAmount: Number(detail.remaining_70_amount || detail.remaining_amount || sc?.remainingAmount || 0),
            depositStatus: str(detail.deposit_received ? 'DEPOSIT_PAID' : (detail.deposit_status || sc?.depositStatus || detail.status)),
            isDepositPaid: Boolean(detail.deposit_received || detail.status === 'DEPOSIT_PAID' || detail.status === 'HARVESTED' || detail.status === 'PICKUP_DISPATCHED' || detail.status === 'IN_TRANSIT_HUB'),
            status: str(detail.status || sc?.fulfillmentStatusName),
            fulfillmentStatusName: str(detail.fulfillment_status || sc?.fulfillmentStatusName),
            deliveryAddress: deliveryAddr,
            deliveryTimeSlot: str(detail.delivery_time_slot || sc?.deliveryTimeSlot || '06:00 - 09:00'),
            createdAt: str(detail.created_at || sc?.createdAt),

            actualHarvestWeightKg: Number(detail.actual_harvest_weight_kg || sc?.actualHarvestWeightKg || detail.offered_weight_kg || 0),
            packageCount: Number(detail.package_count || sc?.packageCount || 10),
            packageType: str(detail.package_type || sc?.packageType || 'Thùng xốp 15kg (Dán tem niêm phong)'),
            farmPickupAddress: str(detail.farm_pickup_address || sc?.farmPickupAddress),
            harvestNotes: str(detail.harvest_notes || (sc as any)?.notes),
            harvestProofImageUrl: str(detail.harvest_proof_image_url || sc?.harvestProofImageUrl),
            grade1Ratio: Number(detail.grade1_ratio || (sc as any)?.grade1Ratio || 96),
            isHarvestDone: Boolean(detail.is_harvest_done || sc?.isHarvestDone || detail.actual_harvest_weight_kg || detail.status === 'HARVESTED'),
            packagingApproved: Boolean(detail.packaging_approved || (detail as any).packagingApproved || sc?.packagingApproved || sc?.packaging_approved || detail.status === 'PACKAGING_APPROVED'),
            packaging_approved: Boolean(detail.packaging_approved || (detail as any).packagingApproved || sc?.packagingApproved || sc?.packaging_approved || detail.status === 'PACKAGING_APPROVED'),
            qrCodeData: str(detail.qr_code_data || sc?.qrCodeData || ('HONAFRESH-PUC-' + detail.contract_code)),
          };
        })() : null}
        role="ADMIN"
        onClose={() => setDetail(null)}
        onAdminDispatchPickup={(contract) => {
          setDetail(null);
          openDispatchPickupModal(contract);
        }}
      />

      {/* MODAL CHI TIẾT BIÊN BẢN TRANH CHẤP & PHÁN QUYẾT BỒI THƯỜNG */}
      {claimDetail && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs p-4 flex justify-center items-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#EAECE8] overflow-hidden">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-[#8B1A1A] via-[#A82B2B] to-[#681414] text-white p-5 sm:p-6 relative">
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white tracking-wider uppercase">
                      Biên Bản Trọng Tài Sàn
                    </span>
                    <span className="text-xs text-white/90 font-mono font-bold bg-black/20 px-2 py-0.5 rounded-md">
                      #{str(claimDetail.claim_code || ('CLM-' + claimDetail.id))}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-amber-300" /> Biên Bản Xử Lý Tranh Chấp & Bồi Thường
                  </h2>
                  <p className="text-xs text-white/80 mt-1">
                    Hồ sơ phân định sự cố hao hụt/hư hỏng và quyết định giải quyết theo Quy chế sàn HoNa Fresh
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setClaimDetail(null)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Bar */}
              {(() => {
                const cStatus = CLAIM_STATUS_CONFIG[str(claimDetail.status)] || {
                  label: str(claimDetail.status),
                  desc: '',
                  bg: 'bg-white/10',
                  text: 'text-white',
                  border: 'border-white/20',
                  dot: 'bg-white',
                };
                return (
                  <div className="mt-4 pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/80">Kết quả phân xử:</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-rose-950 shadow-xs">
                        <span className={`w-2 h-2 rounded-full ${cStatus.dot}`} />
                        {cStatus.label}
                      </span>
                    </div>
                    {Boolean(claimDetail.resolution_ref) && (
                      <div className="text-xs text-white/90 font-mono">
                        Số chứng từ: <strong>{str(claimDetail.resolution_ref)}</strong>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-[#2C3E2E]">
              {/* Mô tả giải pháp từ config */}
              {(() => {
                const cStatus = CLAIM_STATUS_CONFIG[str(claimDetail.status)];
                return cStatus?.desc ? (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-900">Giải thích quyết định trọng tài:</div>
                      <p className="text-amber-800 mt-0.5 leading-relaxed">{cStatus.desc}</p>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Thông tin sự cố */}
              <div className="border border-[#EAECE8] rounded-2xl p-4 bg-[#F9FAF8] space-y-3">
                <div className="font-bold text-sm text-[#10542C] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#10542C]" />
                  <span>1. Thông Tin Sự Cố & Hợp Đồng B2B</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Hợp đồng liên quan</div>
                    <div className="font-mono font-bold text-[#10542C] text-sm mt-0.5">
                      {str(claimDetail.contract_code || ('#HĐ-' + claimDetail.contract_id))}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Nông sản vụ mùa</div>
                    <div className="font-bold text-[#2C3E2E] text-sm mt-0.5">
                      {str(claimDetail.product_name || 'Nông sản theo hợp đồng')}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Khối lượng hư hỏng ghi nhận</div>
                    <div className="font-bold text-rose-700 text-sm mt-0.5">
                      {money(claimDetail.damaged_weight_kg)} kg
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Ước tính giá trị thiệt hại</div>
                    <div className="font-black text-rose-600 text-sm mt-0.5">
                      {money(claimDetail.compensation_amount)} đ
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8] sm:col-span-2">
                    <div className="text-[11px] text-[#6B7280]">Bên xác định chịu trách nhiệm ban đầu</div>
                    <div className="mt-1 font-bold text-[#2C3E2E]">
                      {(() => {
                        const lCfg = CLAIM_LIABLE_CONFIG[str(claimDetail.liable_party)];
                        return lCfg ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${lCfg.bg} ${lCfg.text} ${lCfg.border}`}>
                            <span>{lCfg.icon}</span> {lCfg.label}
                          </span>
                        ) : (
                          str(claimDetail.liable_party)
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#EAECE8]">
                  <div className="text-[11px] text-[#6B7280] font-bold">Chi tiết nguyên nhân phát sinh sự cố:</div>
                  <p className="mt-1.5 text-xs text-[#2C3E2E] leading-relaxed italic bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                    &ldquo;{str(claimDetail.cause)}&rdquo;
                  </p>
                </div>
              </div>

              {/* Quyết định xử lý */}
              <div className="border border-[#EAECE8] rounded-2xl p-4 bg-[#F9FAF8] space-y-3">
                <div className="font-bold text-sm text-[#10542C] flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#10542C]" />
                  <span>2. Nội Dung Phán Quyết Trọng Tài & Chứng Từ Giải Quyết</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#EAECE8]">
                  <div className="text-[11px] text-[#6B7280] font-bold">Nội dung văn bản kết luận:</div>
                  <p className="mt-1.5 text-xs text-[#2C3E2E] leading-relaxed bg-emerald-50/40 p-3 rounded-lg border border-emerald-100/80 font-medium">
                    {str(claimDetail.resolution_note || 'Chưa ghi nhận nội dung văn bản phán quyết.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Mã quyết định / Tham chiếu ngân hàng</div>
                    <div className="font-mono font-bold text-[#10542C] text-xs mt-0.5">
                      {str(claimDetail.resolution_ref || '—')}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Thời điểm lập biên bản</div>
                    <div className="font-medium text-[#2C3E2E] text-xs mt-0.5">
                      {claimDetail.created_at ? formatDate(claimDetail.created_at) : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cam kết pháp lý & kiểm toán */}
              <div className="bg-[#F4F6F1] border border-[#EAECE8] rounded-2xl p-4 text-[#6B7280] flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#10542C] shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  Biên bản giải quyết tranh chấp này được ký số và lưu giữ trên hệ thống kiểm toán (Audit Trail) của sàn HoNa Fresh. Các bút toán tài chính (nếu có) đã được tự động hạch toán đối ứng trên sổ cái kế toán VAS.
                </p>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 sm:p-5 bg-[#F9FAF8] border-t border-[#EAECE8] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-[#D5D9D2] bg-white hover:bg-[#F0F2ED] text-[#2C3E2E] text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4 text-[#10542C]" /> In Biên Bản
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const foundContract = contracts.find((c) => String(c.id) === String(claimDetail.contract_id));
                    if (foundContract) {
                      setClaimDetail(null);
                      setDetail(foundContract);
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-[#10542C] text-[#10542C] hover:bg-[#EAF5E9] text-xs font-bold transition-colors cursor-pointer"
                >
                  Xem hợp đồng gốc
                </button>
                <button
                  type="button"
                  onClick={() => setClaimDetail(null)}
                  className="px-5 py-2 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KIỂM TRA & DUYỆT QUY CÁCH ĐÓNG GÓI TẠI RẪY */}
      {inspectingContract && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs p-4 flex justify-center items-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Kiểm Tra & Phê Duyệt Quy Cách Đóng Gói Tại Rẫy
                  </h2>
                  <p className="text-xs text-gray-500 font-mono">
                    Hợp đồng: <strong className="text-[#10542C]">{str(inspectingContract.contract_code)}</strong> &bull; {str(inspectingContract.product_name)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingContract(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* 1. Ảnh minh chứng cân rẫy & đóng kiện */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                    1. Ảnh Chụp Thực Tế Bàn Cân & Đóng Thùng
                  </span>
                  {Boolean(inspectingContract.harvest_proof_image_url) && (
                    <a
                      href={String(inspectingContract.harvest_proof_image_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#10542C] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Mở ảnh gốc kích thước lớn
                    </a>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center min-h-56 max-h-72">
                  {inspectingContract.harvest_proof_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={String(inspectingContract.harvest_proof_image_url)}
                      alt="Minh chứng đóng gói"
                      className="w-full h-full max-h-72 object-contain"
                    />
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <Scale className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <span>Chưa có ảnh tải lên</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Bảng thông số KCS thu hoạch rẫy */}
              <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                    2. Thống Kê Sản Lượng & Phân Loại Thực Tế
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Đạt chuẩn xuất vườn
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Sản lượng thực thu</span>
                    <p className="text-base font-black text-[#10542C] font-mono mt-1">
                      {money(inspectingContract.actual_harvest_weight_kg || inspectingContract.offered_weight_kg)} kg
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Tỷ lệ loại 1</span>
                    <p className="text-base font-black text-emerald-700 font-mono mt-1">
                      {str(inspectingContract.grade1_ratio || 96)}%
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Số thùng đã đóng</span>
                    <p className="text-base font-black text-gray-900 font-mono mt-1">
                      {str(inspectingContract.package_count || 10)} thùng
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Quy cách kiện</span>
                    <p className="text-xs font-bold text-gray-800 mt-1 leading-snug break-words">
                      {str(inspectingContract.package_type || 'Thùng xốp 15kg (Dán tem niêm phong)')}
                    </p>
                  </div>
                </div>

                {(() => {
                  const pickup = parsePickupDetails(inspectingContract.farm_pickup_address || inspectingContract.delivery_address || inspectingContract.farmer_name);
                  return (
                    <div className="pt-2.5 border-t border-gray-200 space-y-2 text-xs">
                      <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        Thông Tin Điểm Đón Xe Tải Lạnh Tại Rẫy
                      </span>

                      <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2 text-gray-700">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="text-gray-500 font-semibold sm:w-36 shrink-0">Điểm đón / Vườn:</span>
                          <span className="font-bold text-gray-900">{pickup.farmLocation}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 pt-1.5 border-t border-gray-100">
                          <span className="text-gray-500 font-semibold sm:w-36 shrink-0">SĐT người đón xe:</span>
                          <span className="font-mono font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                            {pickup.contactPhone}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 pt-1.5 border-t border-gray-100">
                          <span className="text-gray-500 font-semibold sm:w-36 shrink-0 mt-0.5">Hạ tầng đường vào:</span>
                          <span className="text-gray-800 font-medium leading-relaxed flex-1">
                            {pickup.roadAccess}
                          </span>
                        </div>
                      </div>

                      {Boolean(inspectingContract.harvest_notes) && (
                        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed">
                          <span className="font-bold block text-amber-950 mb-0.5">Ghi chú từ chủ vườn:</span>
                          <p className="italic">"{str(inspectingContract.harvest_notes)}"</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setInspectingContract(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-white text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const target = inspectingContract;
                    if (target.id) {
                      await api(`admin/contracts/${target.id}/approve-packaging`, 'POST').catch(() => {});
                    }
                    adminApprovePackaging(String(target.contract_code || target.id || ''), target);
                    b2bWebSocket.publish('/topic/contracts', {
                      action: 'PACKAGING_APPROVED',
                      contractCode: String(target.contract_code),
                      status: 'PACKAGING_APPROVED',
                      packagingApproved: true,
                    });
                    setInspectingContract(null);
                    await loadData();
                    openDispatchPickupModal(target);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Duyệt và điều xe nhanh cho riêng hợp đồng này"
                >
                  <Truck className="w-4 h-4 text-gray-600" />
                  <span>Điều Phối Nhanh</span>
                </button>

                <Link
                  href={`/admin/inbound-dispatch?contractCode=${inspectingContract.contract_code}`}
                  onClick={async () => {
                    const target = inspectingContract;
                    if (target.id) {
                      await api(`admin/contracts/${target.id}/approve-packaging`, 'POST').catch(() => {});
                    }
                    adminApprovePackaging(String(target.contract_code || target.id || ''), target);
                    b2bWebSocket.publish('/topic/contracts', {
                      action: 'PACKAGING_APPROVED',
                      contractCode: String(target.contract_code),
                      status: 'PACKAGING_APPROVED',
                      packagingApproved: true,
                    });
                    setInspectingContract(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <Route className="w-4 h-4 text-white" />
                  <span>Xác Nhận Đạt Chuẩn & Mở Bảng Điều Phối Thu Gom</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Modal Điều Phối Xe Lạnh Đến Vườn Lấy Hàng / Ký Nhận Tại Vườn */}
      {activeModalContract && (activeCustomModal === 'DISPATCH_PICKUP' || activeCustomModal === 'FARM_HANDOVER') && (
        <DispatchFarmPickupModal
          contract={activeModalContract}
          isOpen={true}
          mode={activeCustomModal === 'DISPATCH_PICKUP' ? 'DISPATCH' : 'HANDOVER'}
          onClose={() => {
            setActiveCustomModal('NONE');
            setActiveModalContract(null);
          }}
          onConfirmDispatch={async (data) => {
            await api(`admin/contracts/${activeModalContract.id}/dispatch-pickup`, 'POST', data);
            adminDispatchPickup(Number(activeModalContract.id), data);
            b2bWebSocket.publish('/topic/contracts', { action: 'PICKUP_DISPATCHED', contractCode: String(activeModalContract.contract_code) });
            await loadData();
          }}
          onConfirmHandover={async (data) => {
            await api(`admin/contracts/${activeModalContract.id}/farm-handover`, 'POST', data);
            adminFarmHandover(Number(activeModalContract.id), data);
            b2bWebSocket.publish('/topic/contracts', { action: 'IN_TRANSIT_HUB', contractCode: String(activeModalContract.contract_code) });
            b2bWebSocket.publish('/topic/dispatch', { action: 'STOP_LOADED', contractId: activeModalContract.id });
            await loadData();
          }}
        />
      )}

      {/* 2. Modal Nhập Kho Lạnh HoNa & Kiểm Định Lab QC */}
      {activeModalContract && activeCustomModal === 'WAREHOUSE_INBOUND' && (
        <ColdWarehouseInboundModal
          contract={activeModalContract}
          isOpen={true}
          onClose={() => {
            setActiveCustomModal('NONE');
            setActiveModalContract(null);
          }}
          onSubmit={async (data) => {
            await api(`admin/contracts/${activeModalContract.id}/warehouse-inbound`, 'POST', data);
            adminWarehouseInbound(Number(activeModalContract.id), data);
            b2bWebSocket.publish('/topic/contracts', { action: 'AT_HUB_QC', contractCode: String(activeModalContract.contract_code) });
            await loadData();
          }}
        />
      )}

      {/* 3. Modal Lập Chuyến Xe Xuất Kho & Phân Tuyến Giao Hàng */}
      {activeModalContract && activeCustomModal === 'OUTBOUND_DISPATCH' && (
        <OutboundDispatchManifestModal
          contract={activeModalContract}
          isOpen={true}
          onClose={() => {
            setActiveCustomModal('NONE');
            setActiveModalContract(null);
          }}
          onSubmit={async (data) => {
            await api(`admin/contracts/${activeModalContract.id}/outbound-dispatch`, 'POST', data);
            adminOutboundDispatch(Number(activeModalContract.id), data);
            b2bWebSocket.publish('/topic/contracts', { action: 'OUTBOUND_DISPATCHED', contractCode: String(activeModalContract.contract_code) });
            await loadData();
          }}
        />
      )}

      {/* 4. Modal Quyết Toán Tài Chính & Giải Ngân Cho Farmer */}
      {activeModalContract && activeCustomModal === 'SETTLE' && (
        <SettlementStatementModal
          contract={activeModalContract}
          quote={settlementQuoteData}
          isOpen={true}
          onClose={() => {
            setActiveCustomModal('NONE');
            setActiveModalContract(null);
            setSettlementQuoteData(null);
          }}
          onConfirmSettlement={async (data) => {
            await api(`admin/contracts/${activeModalContract.id}/settle`, 'POST', {
              status: 'SETTLED',
              reference: data.reference,
              amount: data.amount,
              bankTransferRef: data.bankTransferRef,
              farmerBankName: data.farmerBankName,
              farmerBankAccount: data.farmerBankAccount,
              farmerBankOwner: data.farmerBankOwner,
            });
            adminSettleContract(Number(activeModalContract.id), { payoutAmount: data.amount });
            b2bWebSocket.publish('/topic/contracts', { action: 'SETTLED', contractCode: String(activeModalContract.contract_code) });
            await loadData();
          }}
        />
      )}

      {/* Modal Quét Mã VietQR SePay Thu Cọc Hợp Đồng B2B */}
      {paymentContractModal && (
        <SepayPaymentModal
          isOpen={!!paymentContractModal}
          onClose={() => setPaymentContractModal(null)}
          type="CONTRACT"
          code={String(paymentContractModal.contract_code || `HD-${paymentContractModal.id}`)}
          amount={Number(paymentContractModal.deposit_30_amount || paymentContractModal.deposit_amount || 0)}
          title="Quét Mã VietQR Thu Cọc Hợp Đồng Sỉ"
          recipientName={String(paymentContractModal.buyer_name || 'Bên Mua')}
          onSuccess={() => {
            setPaymentContractModal(null);
            void loadData();
          }}
        />
      )}
    </div>
  );
}
