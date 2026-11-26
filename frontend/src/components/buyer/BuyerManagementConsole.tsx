'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { api } from '@/services/auth';
import {
  getBuyerB2bContractsApi,
  getBuyerRfqsApi,
  respondBuyerRfqApi,
  cancelBuyerRfqApi,
  getStoredUser,
  getProducts,
  confirmBuyerDepositApi,
  confirmBuyerFinalPaymentApi,
  getBuyerFinalPaymentQrApi,
  getBuyerTelemetryApi,
  getBuyerClaimsApi,
  createBuyerClaimApi,
  dispatchBuyerSelfPickupApi,
  type BuyerClaim,
} from '@/services/api';
import { updateContractFulfillmentStatusApi } from '@/services/farmerApi';
import { formatDateVi, formatStatusVi } from '@/utils/formatters';
import { b2bWebSocket } from '@/services/websocketService';
import { useRfqUnreadChatCounts } from '@/hooks/useRfqUnreadChatCounts';
import {
  fleetDispatchApi,
  OutboundDeliveryStopDto,
  BuyerEpodConfirmRequest,
} from '@/services/fleetDispatchApi';
import {
  B2bSyncContract,
  B2bSyncRfq,
  getSyncContracts,
  getSyncRfqs,
  subscribeB2bSyncEvents,
  buyerAcceptCounterRfq,
  buyerCounterRfq,
  buyerPayDeposit,
  buyerPayFinalSettlement,
  removeLocalContractByCode,
} from '@/services/b2bSyncService';
import { B2BContract, Product } from '@/types';
import B2BNegotiationModal from '@/components/B2BNegotiationModal';
import { SepayPaymentModal } from '@/components/common/SepayPaymentModal';
import { GoongMapViewer } from '@/components/common/GoongMapViewer';
import { ContractLiveTrackingMap } from '@/components/common/ContractLiveTrackingMap';
import { SignaturePad } from '@/components/admin/AdminConsole';
import { DeliveryReceiptModal } from '@/components/common/DeliveryReceiptModal';
import OrderTrackingModal from '@/components/OrderTrackingModal';
import B2bContractViewModal, { B2bContractModalData } from '@/components/common/B2bContractViewModal';
import B2BChatModal from '@/components/chat/B2BChatModal';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';
import { getShippingMethodLabel, calculateB2bContractFinancials } from '@/utils/logisticsCalculator';
import Pagination from '@/components/Pagination';
import {
  LayoutDashboard,
  Sprout,
  Handshake,
  FileText,
  Truck,
  User as UserIcon,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  QrCode,
  MapPin,
  Building2,
  Phone,
  Scale,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  FileCheck2,
  X,
  Eye,
  Edit3,
  MessageSquare,
  Filter,
  ArrowUpDown,
  CreditCard,
} from 'lucide-react';

type BuyerTab = 'overview' | 'catalog' | 'negotiations' | 'contracts' | 'shipments' | 'claims' | 'profile';

function computeClientStep(rawStatus?: string, depositStatus?: string, rawFulfillment?: string): number {
  const s = String(rawStatus || '').trim().toUpperCase();
  const fs = String(rawFulfillment || '').trim().toUpperCase();
  const ds = String(depositStatus || '').trim().toUpperCase();

  if (s === 'SETTLED' || s === 'COMPLETED') return 6;
  if (s === 'DELIVERED') return 5;
  if (fs === 'COMPLETED') return 6;
  if (s === 'IN_TRANSIT' || fs === 'DELIVERED' || fs === 'IN_TRANSIT') return 5;
  if (s === 'QC_PASSED' || s === 'READY_OUTBOUND' || s === 'OUTBOUND_DISPATCHED' || s === 'QC_FAILED' || s === 'AT_HUB_QC' || fs === 'HUB_DELIVERED' || fs === 'QC_FAILED' || fs === 'QC_RETURNED_REFUNDED') return 4;
  if (s === 'IN_TRANSIT_HUB' || s === 'PICKUP_DISPATCHED' || s === 'PACKAGING_APPROVED' || fs === 'PACKAGING_APPROVED') return 3;
  if (s === 'ACTIVE' || s === 'DEPOSIT_PAID' || ds === 'DEPOSIT_PAID' || s === 'HARVEST_SUBMITTED' || s === 'HARVEST_REJECTED' || s === 'HARVESTED' || fs === 'HARVESTING' || fs === 'HARVEST_SUBMITTED' || fs === 'HARVESTED') return 2;
  return 1;
}

function computeClientStepName(rawStatus?: string, depositStatus?: string, rawFulfillment?: string, isApproved?: boolean): string {
  const s = String(rawStatus || '').trim().toUpperCase();
  const fs = String(rawFulfillment || '').trim().toUpperCase();
  const ds = String(depositStatus || '').trim().toUpperCase();

  if (s === 'SETTLED' || s === 'COMPLETED') return 'Đã Thanh Toán 100% · Hoàn Tất Hợp Đồng';
  if (s === 'DELIVERED' || fs === 'DELIVERED') return 'Đã Ký Nhận ePOD · Chờ Thanh Toán 70% Còn Lại';
  if (fs === 'COMPLETED') return 'Giao Dịch Thành Công · Đã Quyết Toán 100% Tiền Tươi';
  if (s === 'IN_TRANSIT' || fs === 'IN_TRANSIT') return 'Xe Lạnh Đang Vận Chuyển Tới Kho Buyer';
  if (s === 'OUTBOUND_DISPATCHED') return 'Đã Điều Phối Xe Lạnh Chặng Cuối (Outbound)';
  if (s === 'QC_PASSED') return 'Đạt Chuẩn QC HoNa Fresh · Đang Lưu Kho Mát Chờ Xuất';
  if (s === 'AT_HUB_QC' || fs === 'HUB_DELIVERED') return 'Đã Tới Trạm Hub · Đang Kiểm Định QC (Brix / Nitrat)';
  if (s === 'IN_TRANSIT_HUB') return 'Tài Xế Đã Lấy Hàng · Đang Vận Chuyển Về Trạm Hub';
  if (s === 'PICKUP_DISPATCHED') return 'Đã Điều Phối Xe Gom · Tài Xế Đang Tới Vườn Lấy Hàng';
  if (s === 'PACKAGING_APPROVED' || isApproved) return 'BQT Đã Duyệt Bao Bì · Sẵn Sàng Điều Xe Gom';
  if (s === 'HARVESTED' || fs === 'HARVESTED') return 'Đã Đóng Gói (QR Code) · Chờ BQT Duyệt Bao Bì';
  if (s === 'ACTIVE' || s === 'DEPOSIT_PAID' || ds === 'DEPOSIT_PAID') return 'Đã Cọc 30% · Nhà Vườn Chuẩn Bị Thu Hoạch và Đóng Gói';
  return 'Chờ Buyer Đặt Cọc 30% Escrow';
}

export default function BuyerManagementConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, authLoading, logout, setCurrentUser } = useApp();

  const [activeTab, setActiveTab] = useState<BuyerTab>('overview');
  const isStandaloneMode = searchParams.get('standalone') === '1';

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const validTabs: BuyerTab[] = ['overview', 'catalog', 'negotiations', 'contracts', 'claims', 'profile'];
    if (tabParam && validTabs.includes(tabParam as BuyerTab)) {
      setActiveTab(tabParam as BuyerTab);
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Dữ liệu nghiệp vụ
  const [contracts, setContracts] = useState<B2BContract[]>([]);
  const [syncContracts, setSyncContracts] = useState<B2bSyncContract[]>([]);
  const [rfqs, setRfqs] = useState<B2bSyncRfq[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [outboundStops, setOutboundStops] = useState<OutboundDeliveryStopDto[]>([]);
  const [selectedDeliveryStopId, setSelectedDeliveryStopId] = useState<number | null>(null);
  const [deliveryTelemetry, setDeliveryTelemetry] = useState<Array<{ temperature: number; humidity: number; alert: boolean; recordedAt: string }>>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [buyerClaims, setBuyerClaims] = useState<BuyerClaim[]>([]);
  const [claimContractId, setClaimContractId] = useState<number>(0);
  const [claimDamagedWeight, setClaimDamagedWeight] = useState('');
  const [claimCause, setClaimCause] = useState('Hàng hóa hư hỏng hoặc không đạt chất lượng khi nhận');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [activeEpodModalStop, setActiveEpodModalStop] = useState<OutboundDeliveryStopDto | null>(null);
  const [buyerSignerName, setBuyerSignerName] = useState<string>('');
  const [buyerSignerPhone, setBuyerSignerPhone] = useState<string>('');
  const [buyerSignatureData, setBuyerSignatureData] = useState<string>('');
  const [buyerNotes, setBuyerNotes] = useState<string>('');
  const [confirmingEpod, setConfirmingEpod] = useState<boolean>(false);

  // Bộ lọc & Tìm kiếm & Phân trang nguồn nông sản sỉ
  const [catalogKeywordInput, setCatalogKeywordInput] = useState('');
  const [catalogKeyword, setCatalogKeyword] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('ALL');
  const [catalogSort, setCatalogSort] = useState<'default' | 'price_asc' | 'price_desc' | 'moq_asc'>('default');
  const [catalogPage, setCatalogPage] = useState(1);
  // Mỗi trang hiển thị tối đa 10 lô; UI dùng page bắt đầu từ 1.
  const [catalogSize] = useState(10);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const catalogRequestId = useRef(0);

  // Modals
  const [negotiatingProduct, setNegotiatingProduct] = useState<Product | null>(null);
  const [selectedContractForPayment, setSelectedContractForPayment] = useState<B2BContract | B2bSyncContract | null>(null);
  const [selectedContractForFinalPayment, setSelectedContractForFinalPayment] = useState<any | null>(null);
  const [trackingContractCode, setTrackingContractCode] = useState('');
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState<B2bContractModalData | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState<{
    id: number;
    price: number;
    initialPrice?: number;
    farmerPrice?: number;
    quantity?: number;
    productName?: string;
    lotCode?: string;
    farmerName?: string;
  } | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // Quản lý Xem / Sửa / Hủy đơn đàm phán RFQ
  const [viewingRfqDetail, setViewingRfqDetail] = useState<B2bSyncRfq | null>(null);
  const [editingRfqDetail, setEditingRfqDetail] = useState<B2bSyncRfq | null>(null);
  const [cancellingRfqId, setCancellingRfqId] = useState<number | null>(null);
  const [activeChatRfq, setActiveChatRfq] = useState<B2bSyncRfq | null>(null);
  const { unreadCounts: unreadChatCounts, markChatAsRead } = useRfqUnreadChatCounts(
    rfqs,
    'BUYER',
    activeChatRfq?.rfqCode
  );

  // Tìm hoặc tái tạo thông tin Product cho đơn RFQ đang chỉnh sửa để nạp vào B2BNegotiationModal
  const editingProduct = useMemo<Product | null>(() => {
    if (!editingRfqDetail) return null;
    const found = availableProducts.find(
      (p) =>
        Number(p.harvestLotId || p.id) === Number(editingRfqDetail.harvestLotId) ||
        (p.lotCode &&
          editingRfqDetail.lotCode &&
          p.lotCode.trim().toUpperCase() === editingRfqDetail.lotCode.trim().toUpperCase())
    );
    if (found) return found;

    return {
      id: Number(editingRfqDetail.harvestLotId) || 1,
      harvestLotId: Number(editingRfqDetail.harvestLotId) || 1,
      name: editingRfqDetail.productName || 'Lô nông sản HoNa Fresh',
      price: editingRfqDetail.counterPricePerKg || editingRfqDetail.targetPricePerKg || 15000,
      lotCode: editingRfqDetail.lotCode || editingRfqDetail.rfqCode,
      farmerName: editingRfqDetail.farmerName || 'HTX Nông Nghiệp Đà Lạt GAP',
      farmerId: editingRfqDetail.farmerId,
      stockQuantity: (editingRfqDetail.requestedQuantityKg || 1000) * 3,
      totalLotVolume: (editingRfqDetail.requestedQuantityKg || 1000) * 3,
      availableVolume: (editingRfqDetail.requestedQuantityKg || 1000) * 3,
      moq: 100,
      categoryName: editingRfqDetail.productName,
      categorySlug: 'rau-an-la',
      warehouseLocation: editingRfqDetail.deliveryLocation,
      hubLocation: editingRfqDetail.deliveryLocation,
      images: ['/images/products/rau-sach.jpg'],
      imageUrl: '/images/products/rau-sach.jpg',
    } as unknown as Product;
  }, [editingRfqDetail, availableProducts]);

  // Quản lý Điều Phối Xe Lạnh HoNa Fresh sau khi Farm đóng gói
  const [dispatchingContract, setDispatchingContract] = useState<any | null>(null);
  const [pa3TruckPlate, setPa3TruckPlate] = useState<string>('');
  const [pa3DriverName, setPa3DriverName] = useState<string>('');
  const [pa3DriverPhone, setPa3DriverPhone] = useState<string>('');
  const [pa3EtaText, setPa3EtaText] = useState<string>('');
  const [pa3Notes, setPa3Notes] = useState<string>('');
  const [submittingPa3Dispatch, setSubmittingPa3Dispatch] = useState<boolean>(false);
  const [liveTrackingContract, setLiveTrackingContract] = useState<any | null>(null);
  const [viewingReceiptStop, setViewingReceiptStop] = useState<OutboundDeliveryStopDto | null>(null);
  const [contractFilter, setContractFilter] = useState<'ALL' | 'DEPOSIT' | 'QC' | 'DELIVERY' | 'DONE'>('ALL');
  const [contractsPage, setContractsPage] = useState<number>(1);
  const BUYER_CONTRACTS_PAGE_SIZE = 6;
  useEffect(() => {
    setContractsPage(1);
  }, [contractFilter]);
  const [selectedTruckPlate, setSelectedTruckPlate] = useState('49C-198.86 (Xe Thùng Lạnh HoNa Express 5 Tấn)');
  const [selectedDriverInfo, setSelectedDriverInfo] = useState('Tài xế Nguyễn Văn Tài - 0944.556.677');

  // Form Profile
  const [profileCompany, setProfileCompany] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileWarehouse, setProfileWarehouse] = useState('');

  // Dọn một hợp đồng local bị lỗi số tiền 0đ đã được xác định trước đó.
  useEffect(() => {
    removeLocalContractByCode('HD-2026-B2B-E233');
  }, []);

  // 1. Kiểm tra quyền truy cập (Role BUYER)
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/dang-nhap?redirect=/portal/buyer');
    }
  }, [authLoading, currentUser, router]);

  // Nạp thông tin hồ sơ
  useEffect(() => {
    const user = currentUser || getStoredUser();
    if (user) {
      setProfileCompany(user.companyName || '');
      setProfilePhone(user.phone || '');
      setProfileAddress(user.address || '');
      setProfileWarehouse(user.warehouseAddress || user.address || '');
    }
  }, [currentUser]);

  // 2. Tải nguồn nông sản sỉ (Tìm kiếm, Lọc danh mục & Phân trang)
  const loadCatalogData = useCallback(async () => {
    const requestId = ++catalogRequestId.current;
    setCatalogLoading(true);
    try {
      const needsClientPagination = catalogSort === 'moq_asc';
      const requestPage = needsClientPagination ? 1 : catalogPage;
      // MOQ được tính từ tierPricingJson ở frontend nên phải sắp xếp toàn bộ
      // danh sách trước, sau đó mới cắt thành trang 10 lô.
      const requestSize = needsClientPagination ? 1000 : catalogSize;
      const sortParams =
        catalogSort === 'price_asc'
          ? { sortBy: 'basePricePerKg' as const, sortDir: 'ASC' as const }
          : catalogSort === 'price_desc'
            ? { sortBy: 'basePricePerKg' as const, sortDir: 'DESC' as const }
            : {};
      const res = await getProducts({
        keyword: catalogKeyword.trim() || undefined,
        categorySlug: catalogCategory === 'ALL' ? undefined : catalogCategory,
        page: requestPage,
        size: requestSize,
        ...sortParams,
      });
      const list = [...(res.products || [])];
      if (catalogSort === 'moq_asc') {
        list.sort((a, b) => (a.moq || 500) - (b.moq || 500));
      }
      const totalElements = res.totalElements || list.length;
      const nextTotalPages = Math.max(1, Math.ceil(totalElements / catalogSize));
      const visibleProducts = needsClientPagination
        ? list.slice((catalogPage - 1) * catalogSize, catalogPage * catalogSize)
        : list;
      if (requestId !== catalogRequestId.current) return;
      if (catalogPage > nextTotalPages) {
        setCatalogPage(nextTotalPages);
        return;
      }
      setAvailableProducts(visibleProducts);
      setCatalogTotal(totalElements);
      setCatalogTotalPages(nextTotalPages);
    } catch (err) {
      console.warn('Lỗi tải danh mục nông sản:', err);
      if (requestId !== catalogRequestId.current) return;
      setAvailableProducts([]);
      setCatalogTotal(0);
      setCatalogTotalPages(1);
    } finally {
      if (requestId === catalogRequestId.current) setCatalogLoading(false);
    }
  }, [catalogKeyword, catalogCategory, catalogSort, catalogPage, catalogSize]);

  useEffect(() => {
    void loadCatalogData();
  }, [loadCatalogData]);

  // Debounce ô tìm kiếm để không gọi API/re-render theo từng phím gõ.
  useEffect(() => {
    const timer = window.setTimeout(() => setCatalogKeyword(catalogKeywordInput), 300);
    return () => window.clearTimeout(timer);
  }, [catalogKeywordInput]);

  const handleKeywordChange = (val: string) => {
    setCatalogKeywordInput(val);
    setCatalogPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setCatalogCategory(val);
    setCatalogPage(1);
  };

  const handleSortChange = (val: 'default' | 'price_asc' | 'price_desc' | 'moq_asc') => {
    setCatalogSort(val);
    setCatalogPage(1);
  };

  const handleResetCatalogFilters = () => {
    setCatalogKeywordInput('');
    setCatalogKeyword('');
    setCatalogCategory('ALL');
    setCatalogSort('default');
    setCatalogPage(1);
  };

  // 3. Tải toàn bộ dữ liệu hợp đồng & đàm phán
  const loadAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [backendContracts, backendRfqs, backendStops, backendClaims] = await Promise.all([
        getBuyerB2bContractsApi().catch(() => []),
        getBuyerRfqsApi().catch(() => []),
        fleetDispatchApi.getBuyerDeliveries().catch(() => []),
        getBuyerClaimsApi().catch(() => []),
      ]);
      setOutboundStops(Array.isArray(backendStops) ? backendStops : []);
      setBuyerClaims(Array.isArray(backendClaims) ? backendClaims : []);

      const localContracts = getSyncContracts();
      const localRfqs = getSyncRfqs();

      // Đồng bộ từ Server Shared Sync (Cross-Browser)
      let sharedRfqs: any[] = [];
      let sharedContracts: any[] = [];
      try {
        const sharedRes = await fetch('/api/b2b-shared-sync', { cache: 'no-store' });
        if (sharedRes.ok) {
          const sj = await sharedRes.json();
          sharedRfqs = sj.rfqs || [];
          sharedContracts = sj.contracts || [];
        }
      } catch {}

      const mappedBackendRfqs: B2bSyncRfq[] = (backendRfqs || []).map((br) => ({
        id: br.id,
        rfqCode: br.rfqCode,
        harvestLotId: br.harvestLotId || 1,
        lotCode: br.lotCode || `LOT-2026-DL-${br.harvestLotId}`,
        farmerId: br.farmerId,
        farmerName: br.farmerName || 'Hợp Tác Xã Nông Nghiệp',
        productName: br.productName || 'Lô nông sản',
        buyerName: br.buyerName || '',
        buyerPhone: br.buyerPhone || '',
        buyerCompany: br.buyerCompany || '',
        requestedQuantityKg: br.quantityKg || br.requestedQuantityKg || 1000,
        targetPricePerKg: br.proposedPricePerKg || 15000,
        counterPricePerKg: br.counterPricePerKg ?? undefined,
        desiredDeliveryDate: br.deliveryDate || '',
        deliveryLocation: br.deliveryLocation || '',
        shippingOption: br.shippingOption || 'cold_storage_truck',
        notes: br.notes,
        status: br.status as any,
        createdAt: br.createdAt || new Date().toISOString(),
        updatedAt: br.updatedAt || new Date().toISOString(),
        expiresAt: br.expiresAt,
        contractId: br.contractId,
        contractCode: br.contractCode,
        depositStatus: br.depositStatus,
        depositAmount: br.depositAmount,
      }));

      const seenIds = new Set<number>();
      const rfqMap = new Map<string, B2bSyncRfq>();
      let fallbackId = Date.now();

      for (const b of mappedBackendRfqs) {
        if (b.rfqCode) {
          const key = b.rfqCode.trim().toUpperCase();
          seenIds.add(b.id);
          rfqMap.set(key, b);
        }
      }
      // Chỉ giữ các RFQ thuộc đúng tài khoản Thương lái đang đăng nhập từ Backend DB

      const contractMap = new Map<string, B2BContract>();
      for (const bc of backendContracts) {
        if (bc.contractCode) {
          const code = bc.contractCode.trim().toUpperCase();
          const rawStatus = String((bc as any).status || bc.depositStatus || '').toUpperCase();
          const rawFulfillment = String((bc as any).fulfillmentStatus || (bc as any).fulfillment_status || '').toUpperCase();
          const isDepositPaid = rawStatus === 'DEPOSIT_PAID' || rawStatus === 'ACTIVE' || bc.depositStatus === 'DEPOSIT_PAID' || Boolean(bc.depositPaidAt);
          const isApproved = Boolean(
            (bc as any).packagingApproved ||
            (bc as any).packaging_approved ||
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
          const isRemainingPaid = String((bc as any).remainingPaymentStatus || (bc as any).remaining_payment_status || '').toUpperCase() === 'PAID';
          const rawStep = (bc as any).fulfillmentStep || computeClientStep(rawStatus, bc.depositStatus, rawFulfillment);
          const fStep = rawStatus === 'DELIVERED' ? (isRemainingPaid ? 6 : Math.min(5, rawStep)) : rawStep;
          const fName =
            rawStatus === 'DELIVERED'
              ? isRemainingPaid
                ? 'Đã Thanh Toán 100% · Chờ Kế Toán Quyết Toán Giải Ngân'
                : 'Đã Ký Nhận Hàng · Chờ Thanh Toán 70% Còn Lại'
              : (bc as any).fulfillmentStatusName || computeClientStepName(rawStatus, bc.depositStatus, rawFulfillment, isApproved);

          contractMap.set(code, {
            ...bc,
            packagingApproved: isApproved,
            status: rawStatus,
            depositStatus: isDepositPaid ? 'DEPOSIT_PAID' : 'PENDING_DEPOSIT',
            fulfillmentStatus: rawFulfillment,
            fulfillmentStep: fStep,
            fulfillmentStatusName: fName,
          });
        }
      }
      for (const sc of sharedContracts) {
        const code = (sc.contractCode || `HD-${sc.id}`).trim().toUpperCase();
        if (contractMap.has(code)) {
          const existing = contractMap.get(code)!;
          contractMap.set(code, {
            ...existing,
            packagingApproved: Boolean(existing.packagingApproved || sc.packagingApproved),
            actualHarvestWeightKg: existing.actualHarvestWeightKg || sc.actualHarvestWeightKg,
            grade1Ratio: existing.grade1Ratio || sc.grade1Ratio,
            packageCount: existing.packageCount || sc.packageCount,
            packageType: existing.packageType || sc.packageType,
            qrCodeData: existing.qrCodeData || sc.qrCodeData,
            farmPickupAddress: existing.farmPickupAddress || sc.farmPickupAddress,
            fulfillmentStep: existing.fulfillmentStep || sc.fulfillmentStep,
            fulfillmentStatusName: existing.fulfillmentStatusName || sc.fulfillmentStatusName,
            pickupTruckPlate: existing.pickupTruckPlate || sc.pickupTruckPlate,
            truckLicensePlate: existing.truckLicensePlate || sc.truckLicensePlate || sc.pickupTruckPlate,
            pickupDriverName: existing.pickupDriverName || sc.pickupDriverName,
            truckDriverName: existing.truckDriverName || sc.truckDriverName || sc.pickupDriverName,
            pickupDriverPhone: existing.pickupDriverPhone || sc.pickupDriverPhone,
            truckDriverPhone: existing.truckDriverPhone || sc.truckDriverPhone || sc.pickupDriverPhone,
            truckTempCurrent: existing.truckTempCurrent || sc.truckTempCurrent,
          });
        }
      }
      for (const lc of localContracts) {
        const code = (lc.contractCode || `HD-${lc.id}`).trim().toUpperCase();
        if (contractMap.has(code)) {
          const existing = contractMap.get(code)!;
          const isDepPaid = lc.depositStatus === 'DEPOSIT_PAID' || existing.depositStatus === 'DEPOSIT_PAID';
          contractMap.set(code, {
            ...existing,
            depositStatus: isDepPaid ? 'DEPOSIT_PAID' : existing.depositStatus,
            depositAmount: lc.depositAmount || existing.depositAmount,
            totalAmount: lc.totalAmount || existing.totalAmount,
            fulfillmentStep: existing.fulfillmentStep || lc.fulfillmentStep || (isDepPaid ? 2 : 1),
            fulfillmentStatusName: existing.fulfillmentStatusName || lc.fulfillmentStatusName,
            packagingApproved: Boolean(lc.packagingApproved || existing.packagingApproved),
            actualHarvestWeightKg: lc.actualHarvestWeightKg || existing.actualHarvestWeightKg,
            grade1Ratio: (lc as any).grade1Ratio || existing.grade1Ratio,
            packageCount: lc.packageCount || existing.packageCount,
            packageType: lc.packageType || existing.packageType,
            qrCodeData: lc.qrCodeData || existing.qrCodeData,
            farmPickupAddress: lc.farmPickupAddress || existing.farmPickupAddress,
            harvestProofImageUrl: lc.harvestProofImageUrl || existing.harvestProofImageUrl,
            pickupTruckPlate: lc.pickupTruckPlate || existing.pickupTruckPlate,
            truckLicensePlate: lc.truckLicensePlate || lc.pickupTruckPlate || existing.truckLicensePlate,
            pickupDriverName: lc.pickupDriverName || existing.pickupDriverName,
            truckDriverName: lc.truckDriverName || lc.pickupDriverName || existing.truckDriverName,
            pickupDriverPhone: lc.pickupDriverPhone || existing.pickupDriverPhone,
            truckDriverPhone: lc.truckDriverPhone || lc.pickupDriverPhone || existing.truckDriverPhone,
            truckTempCurrent: lc.truckTempCurrent || existing.truckTempCurrent,
          });
        }
      }

      const allCombinedContracts = Array.from(contractMap.values());
      setContracts(allCombinedContracts);

      // Chuyển đổi toàn bộ danh sách hợp đồng sang B2bSyncContract để tab Vận chuyển (Shipments) hiển thị đầy đủ
      const fullSyncList: B2bSyncContract[] = allCombinedContracts.map((ac) => ({
        id: ac.id,
        contractCode: ac.contractCode,
        rfqCode: ac.rfqCode || `RFQ-${ac.id}`,
        lotId: ac.harvestLotId || 1,
        lotCode: ac.lotCode || 'LOT-2026-DL-001',
        productName: ac.productName,
        buyerName: ac.buyerName,
        buyerPhone: ac.buyerPhone || '0901234567',
        buyerCompany: ac.buyerName,
        farmerName: ac.farmName || 'HTX Nông Nghiệp Đà Lạt GAP',
        farmerPhone: ac.farmerPhone || '0912345678',
        farmerCompany: ac.farmName || 'HTX Nông Nghiệp Đà Lạt GAP',
        quantityKg: ac.quantity,
        agreedPricePerKg: ac.unitPrice,
        totalAmount: ac.totalAmount,
        depositAmount: ac.depositAmount,
        remainingAmount: ac.remainingAmount || (ac.totalAmount - ac.depositAmount),
        depositStatus: ac.depositStatus === 'DEPOSIT_PAID' ? 'DEPOSIT_PAID' : 'WAITING_DEPOSIT',
        fulfillmentStep: (ac as any).fulfillmentStep || (ac.fulfillmentStatus === 'COMPLETED' ? 6 : ac.fulfillmentStatus === 'HUB_DELIVERED' ? 4 : 1),
        fulfillmentStatusName: (ac as any).fulfillmentStatusName || ac.fulfillmentStatus || 'Chờ Buyer Đặt Cọc 30% Escrow',
        truckLicensePlate: (ac as any).truckLicensePlate || (ac as any).pickupTruckPlate || '29H-882.14 (Xe Thùng Lạnh)',
        truckDriverName: (ac as any).truckDriverName || (ac as any).pickupDriverName || 'Tài xế Nguyễn Văn Tài',
        truckDriverPhone: (ac as any).truckDriverPhone || (ac as any).pickupDriverPhone || '0944556677',
        truckTempCurrent: (ac as any).truckTempCurrent || 4.0,
        deliveryAddress: ac.hubName || 'Trạm Trung Chuyển Đức Trọng',
        deliveryTimeSlot: ac.hubDeliveryDate || '06:00 - 09:00',
        finalPaidStatus: 'UNPAID',
        createdAt: ac.createdAt,
      }));
      setSyncContracts(fullSyncList);
      setRfqs(Array.from(rfqMap.values()));
    } catch (err) {
      console.warn('Lỗi tải dữ liệu phân hệ thương lái:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  const selectedDeliveryStop = useMemo(
    () => outboundStops.find((stop) => stop.id === selectedDeliveryStopId) || outboundStops[0] || null,
    [outboundStops, selectedDeliveryStopId],
  );

  useEffect(() => {
    if (outboundStops.length === 0) {
      setSelectedDeliveryStopId(null);
      return;
    }
    if (!outboundStops.some((stop) => stop.id === selectedDeliveryStopId)) {
      const activeStop = outboundStops.find((stop) => !['BUYER_CONFIRMED', 'REJECTED', 'CANCELLED'].includes(stop.status));
      setSelectedDeliveryStopId((activeStop || outboundStops[0]).id);
    }
  }, [outboundStops, selectedDeliveryStopId]);

  useEffect(() => {
    if (activeTab !== 'shipments' || !selectedDeliveryStop?.contractId) {
      setDeliveryTelemetry([]);
      return;
    }
    let cancelled = false;
    const loadTelemetry = async () => {
      setTelemetryLoading(true);
      try {
        const rows = await getBuyerTelemetryApi(selectedDeliveryStop.contractId);
        if (!cancelled) setDeliveryTelemetry(rows);
      } catch {
        if (!cancelled) setDeliveryTelemetry([]);
      } finally {
        if (!cancelled) setTelemetryLoading(false);
      }
    };
    void loadTelemetry();
    const timer = window.setInterval(loadTelemetry, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeTab, selectedDeliveryStop?.contractId]);

  // 3. Kết nối kênh đồng bộ thời gian thực hai chiều với Nông dân & Quản trị viên
  // Kết hợp BroadcastChannel (0ms) + Smart Polling từ Server Shared Sync (2.0s) + Sự kiện chuyển Tab Focus
  useEffect(() => {
    const handleDataSync = () => void loadAllData();
    const handleCatalogSync = () => {
      void loadCatalogData();
      void loadAllData();
    };

    window.addEventListener('b2b_sync_event', handleDataSync);
    window.addEventListener('b2b_contract_updated', handleDataSync);
    window.addEventListener('b2b_rfq_updated', handleDataSync);
    window.addEventListener('storage', handleCatalogSync);
    window.addEventListener('focus', handleCatalogSync);
    window.addEventListener('b2b_lot_updated', handleCatalogSync);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void loadCatalogData();
        void loadAllData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Đăng ký trực tiếp với STOMP WebSocket Message Broker của Spring Boot (/topic/contracts, /topic/rfqs, /topic/lots)
    const unsubContracts = b2bWebSocket.subscribeContracts((payload) => {
      setNotification(`Hợp đồng ${payload?.contractCode || ''} vừa được cập nhật thời gian thực!`);
      setTimeout(() => setNotification(null), 4000);
      void loadAllData();
    });

    const unsubRfqs = b2bWebSocket.subscribeRfqs((payload) => {
      setNotification(`Yêu cầu báo giá ${payload?.rfqCode || ''} vừa được cập nhật thời gian thực!`);
      setTimeout(() => setNotification(null), 4000);
      void loadAllData();
    });

    const unsubDispatch = b2bWebSocket.subscribeDispatch(() => {
      void loadAllData();
    });

    const unsubLots = b2bWebSocket.subscribeLots((payload: any) => {
      const action = String(payload?.action || '').toUpperCase();
      const lotObj = payload?.lot || payload;
      const lotStatus = String(lotObj?.status || '').toUpperCase();
      const targetId = lotObj?.id ?? payload?.id;
      const targetCode = String(lotObj?.lotCode || payload?.lotCode || '').trim().toUpperCase();

      if (action === 'LOT_DELETED' || (lotStatus && lotStatus !== 'OPEN')) {
        setAvailableProducts((prev) =>
          prev.filter((p) => {
            const sameId = targetId && Number(p.id) === Number(targetId);
            const sameCode = targetCode && String((p as any).lotCode || '').trim().toUpperCase() === targetCode;
            return !sameId && !sameCode;
          })
        );
      }
      void loadCatalogData();
      void loadAllData();
    });

    const unsubscribe = subscribeB2bSyncEvents((event) => {
      // Nhận sự kiện thời gian thực từ kênh đồng bộ BroadcastChannel (cùng trình duyệt)
      void loadAllData();
      if (
        event.type === 'LOT_STATUS_UPDATED' ||
        event.type === 'LOT_CREATED' ||
        event.type === 'LOT_UPDATED' ||
        event.type === 'LOT_DELETED'
      ) {
        const p: any = event.payload;
        const st = String(p?.status || p?.lot?.status || '').toUpperCase();
        const tid = p?.lotId ?? p?.lot?.id ?? p?.id;
        const tcode = String(p?.lotCode || p?.lot?.lotCode || '').trim().toUpperCase();
        if (event.type === 'LOT_DELETED' || (st && st !== 'OPEN')) {
          setAvailableProducts((prev) =>
            prev.filter((item) => {
              const sameId = tid && Number(item.id) === Number(tid);
              const sameCode = tcode && String((item as any).lotCode || '').trim().toUpperCase() === tcode;
              return !sameId && !sameCode;
            })
          );
        }
        void loadCatalogData();
      } else if (
        event.type === 'RFQ_UPDATED' ||
        event.type === 'RFQ_CREATED' ||
        event.type === 'RFQ_COUNTERED_BY_BUYER' ||
        event.type === 'CONTRACT_CREATED' ||
        event.type === 'DEPOSIT_PAID' ||
        event.type === 'EPOD_SIGNED' ||
        event.type === 'CONTRACTS_STORAGE_SYNC' ||
        event.type === 'RFQS_STORAGE_SYNC'
      ) {
        setNotification('Dữ liệu đàm phán & hợp đồng vừa được cập nhật tức thì!');
        setTimeout(() => setNotification(null), 4000);
        void loadAllData();
      }
    });

    return () => {
      unsubContracts();
      unsubRfqs();
      unsubDispatch();
      unsubLots();
      unsubscribe();
      window.removeEventListener('b2b_sync_event', handleDataSync);
      window.removeEventListener('b2b_contract_updated', handleDataSync);
      window.removeEventListener('b2b_rfq_updated', handleDataSync);
      window.removeEventListener('storage', handleCatalogSync);
      window.removeEventListener('focus', handleCatalogSync);
      window.removeEventListener('b2b_lot_updated', handleCatalogSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAllData, loadCatalogData]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Thống kê nhanh
  const totalVolumeTons = (contracts.reduce((sum, c) => sum + (c.quantity || 0), 0) / 1000).toFixed(1);
  const totalDepositHolding = contracts
    .filter((c) => c.depositStatus === 'DEPOSIT_PAID')
    .reduce((sum, c) => sum + (c.depositAmount || 0), 0);
  const pendingDepositContracts = contracts.filter((c) => c.depositStatus !== 'DEPOSIT_PAID');
  const inTransitContracts = contracts.filter((c) => c.fulfillmentStatus === 'IN_TRANSIT');

  // Xử lý chấp nhận giá đàm phán
  const handleAcceptRfq = async (rfqId: number) => {
    try {
      const selectedRfq = rfqs.find((item) => item.id === rfqId);
      const localRfqKey = selectedRfq?.rfqCode || rfqId;
      const backendRfq = await respondBuyerRfqApi(rfqId, { action: 'ACCEPT' });
      const acceptResult = buyerAcceptCounterRfq(
        localRfqKey,
        backendRfq
          ? {
              contractId: (backendRfq as any).contractId,
              contractCode: (backendRfq as any).contractCode,
              depositAmount: (backendRfq as any).depositAmount,
              depositStatus: (backendRfq as any).depositStatus,
            }
          : undefined,
        selectedRfq
      );

      // Cập nhật state RFQ ngay lập tức trong component
      setRfqs((prev) =>
        prev.map((r) =>
          r.id === rfqId || (selectedRfq?.rfqCode && r.rfqCode === selectedRfq.rfqCode)
            ? {
                ...r,
                status: 'ACCEPTED',
                contractId: (backendRfq as any)?.contractId || acceptResult?.newContract?.id || r.contractId,
                contractCode: (backendRfq as any)?.contractCode || acceptResult?.newContract?.contractCode || r.contractCode,
              }
            : r
        )
      );

      if (acceptResult?.newContract) {
        fetch('/api/b2b-shared-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'REGISTER_CONTRACT', contract: acceptResult.newContract }),
        }).catch(() => {});
      }

      fetch('/api/b2b-shared-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_RFQ_STATUS', rfqCode: selectedRfq?.rfqCode, id: rfqId, status: 'ACCEPTED' }),
      }).catch(() => {});

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('b2b_sync_event', { detail: { type: 'RFQ_ACCEPTED_BY_BUYER', rfqId, rfqCode: selectedRfq?.rfqCode } }));
        window.dispatchEvent(new CustomEvent('b2b_rfq_updated', { detail: { rfqId, rfqCode: selectedRfq?.rfqCode, status: 'ACCEPTED' } }));
        window.dispatchEvent(new CustomEvent('b2b_contract_updated', { detail: acceptResult?.newContract }));
      }

      await loadAllData();
      setActiveTab('contracts');
      setNotification('Bạn đã chấp nhận mức giá này! Hợp đồng B2B đã được tạo, vui lòng nạp cọc 30% để bắt đầu thu hoạch.');
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error('Lỗi khi chấp nhận RFQ:', err);
      alert(err instanceof Error ? err.message : 'Không thể hoàn tất chấp thuận đơn đàm phán.');
    }
  };

  const confirmDeposit = async (contract: B2BContract | B2bSyncContract) => {
    const localFallbackApplied = false;
    await confirmBuyerDepositApi(Number(contract.id), contract.contractCode);
    // Cập nhật kênh đồng bộ ngay cả khi backend xác nhận thành công để
    // farmer/admin ở tab hoặc trình duyệt khác nhìn thấy trạng thái mới.
    if (!localFallbackApplied) {
      const localContract = getSyncContracts().find(
        (item) => item.contractCode.trim().toUpperCase() === String(contract.contractCode || '').trim().toUpperCase(),
      );
      if (localContract) buyerPayDeposit(localContract.contractCode);
    }
  };

  const openFinalPayment = async (contract: any) => {
    try {
      const quote = await getBuyerFinalPaymentQrApi(Number(contract.id));
      setSelectedContractForFinalPayment({
        ...contract,
        ...quote,
        remainingAmount: Number(quote.remainingAmount ?? quote.balanceDue ?? contract.remainingAmount ?? 0),
      });
    } catch (err) {
      setNotification(err instanceof Error ? err.message : 'Chưa thể tạo thông tin thanh toán cuối.');
    }
  };

  const confirmFinalPayment = async (contract: any) => {
    try {
      await confirmBuyerFinalPaymentApi(Number(contract.id));
      buyerPayFinalSettlement(contract.contractCode || contract.id);
      b2bWebSocket.publish('/topic/contracts', {
        action: 'BALANCE_PAID',
        contractCode: contract.contractCode,
        status: 'DELIVERED',
        remainingPaymentStatus: 'PAID',
      });
      setContracts((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(contract.id) || item.contractCode === contract.contractCode
            ? {
                ...item,
                status: 'DELIVERED',
                finalPaidStatus: 'PAID',
                remainingPaymentStatus: 'PAID',
                fulfillmentStatus: 'DELIVERED',
                fulfillmentStep: 5,
                fulfillmentStatusName: 'Đã Thanh Toán Đủ 100% · Chờ Sàn Giải Ngân Nhà Vườn',
              }
            : item
        )
      );
      setSelectedContractForFinalPayment(null);
      setNotification('Đã thanh toán phần còn lại và hoàn tất giao dịch thành công!');
      setTimeout(() => setNotification(null), 4000);
      void loadAllData();
    } catch (err) {
      setNotification(err instanceof Error ? err.message : 'Có lỗi khi xác nhận thanh toán.');
      throw err;
    }
  };

  const openConfirmEpodModal = (stop: OutboundDeliveryStopDto) => {
    setActiveEpodModalStop(stop);
    setBuyerSignerName(currentUser?.fullName || currentUser?.companyName || 'Đại diện kho nhận hàng');
    setBuyerSignerPhone(currentUser?.phone || '0901.234.567');
    setBuyerSignatureData('');
    setBuyerNotes('');
  };

  const handleConfirmEpod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEpodModalStop) return;
    if (!buyerSignatureData) {
      setNotification('Vui lòng ký tên trực tiếp lên vùng chữ ký xác nhận của Người mua.');
      return;
    }
    try {
      setConfirmingEpod(true);
      const req: BuyerEpodConfirmRequest = {
        buyerSignerName: buyerSignerName.trim() || 'Người nhận hàng đại diện Buyer',
        buyerSignerPhone: buyerSignerPhone.trim() || '0901234567',
        buyerSignatureData: buyerSignatureData.trim() || 'Chữ ký số xác nhận ePOD',
        buyerNotes: buyerNotes.trim() || undefined,
      };
      await fleetDispatchApi.confirmBuyerEpod(activeEpodModalStop.id, req);
      setNotification(`Đã ký xác nhận thành công biên bản ePOD cho hợp đồng ${activeEpodModalStop.contractCode || activeEpodModalStop.contractId}!`);
      setTimeout(() => setNotification(null), 5000);
      setActiveEpodModalStop(null);
      await loadAllData();
    } catch (err) {
      setNotification(err instanceof Error ? err.message : 'Lỗi xác nhận ePOD');
    } finally {
      setConfirmingEpod(false);
    }
  };

  // Xử lý gửi lại mức giá mới
  const handleSendCounter = async (rfqId: number) => {
    if (!counterPriceInput || counterPriceInput.price <= 0) return;
    try {
      const selectedRfq = rfqs.find((item) => item.id === rfqId);
      const localRfqKey = selectedRfq?.rfqCode || rfqId;
      try {
        await respondBuyerRfqApi(rfqId, {
          action: 'COUNTER',
          counterPrice: counterPriceInput.price,
        });
      } catch (e) {
        console.warn('Backend API counter notice:', e);
      }
      buyerCounterRfq(localRfqKey, counterPriceInput.price);
      fetch('/api/b2b-shared-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_RFQ_STATUS',
          id: rfqId,
          rfqCode: selectedRfq?.rfqCode,
          status: 'WAITING_FARMER',
          counterPrice: counterPriceInput.price,
        }),
      }).catch(() => {});
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('b2b_sync_event', { detail: { type: 'RFQ_COUNTERED_BY_BUYER', rfqId, counterPrice: counterPriceInput.price } }));
        window.dispatchEvent(new CustomEvent('b2b_rfq_updated', { detail: { rfqId, counterPrice: counterPriceInput.price, status: 'WAITING_FARMER' } }));
      }
      setCounterPriceInput(null);
      void loadAllData();
      setNotification('Đã gửi đề xuất giá mới tới nhà vườn!');
      setTimeout(() => setNotification(null), 3000);
    } catch {
      alert('Không thể gửi mức giá đề xuất.');
    }
  };

  // Xử lý hủy đơn đàm phán RFQ
  const handleConfirmCancelRfq = async (id: number) => {
    try {
      await cancelBuyerRfqApi(id);
      setRfqs((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' as any } : r))
      );
      setCancellingRfqId(null);
      setNotification('Đã hủy đơn đàm phán.');
      setTimeout(() => setNotification(null), 3000);
      void loadAllData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi khi hủy đàm phán');
    }
  };

  // Xử lý Buyer tự điều phối xe đến kho HoNa lấy hàng (PA3 sau khi QC_PASSED)
  const handleConfirmDispatchTruck = async () => {
    if (!dispatchingContract) return;
    if (!pa3TruckPlate.trim() || !pa3DriverName.trim() || !pa3DriverPhone.trim()) {
      alert('Vui lòng nhập đầy đủ biển số xe, tên tài xế và SĐT tài xế!');
      return;
    }
    try {
      setSubmittingPa3Dispatch(true);
      await dispatchBuyerSelfPickupApi(dispatchingContract.id, {
        truckPlate: pa3TruckPlate.trim().toUpperCase(),
        driverName: pa3DriverName.trim(),
        driverPhone: pa3DriverPhone.trim(),
        etaText: pa3EtaText.trim(),
        notes: pa3Notes.trim(),
      });
      setNotification(`Đã đăng ký xe ${pa3TruckPlate.trim().toUpperCase()} (${pa3DriverName.trim()}) đến kho HoNa lấy hàng!`);
      setTimeout(() => setNotification(null), 5000);
      setDispatchingContract(null);
      void loadAllData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi điều phối xe');
    } finally {
      setSubmittingPa3Dispatch(false);
    }
  };

  // Cập nhật hồ sơ thương lái
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api<any>('auth/profile', 'PUT', {
        companyName: profileCompany,
        phone: profilePhone,
        address: profileAddress,
        warehouseAddress: profileWarehouse,
      });
      if (updated) setCurrentUser(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      alert('Không thể lưu thông tin hồ sơ. Vui lòng kiểm tra lại kết nối mạng.');
    }
  };

  const handleCreateClaim = async (event: React.FormEvent) => {
    event.preventDefault();
    const damagedWeightKg = Number(claimDamagedWeight);
    if (!claimContractId || !Number.isFinite(damagedWeightKg) || damagedWeightKg <= 0 || !claimCause.trim()) {
      setNotification('Vui lòng chọn hợp đồng, nhập khối lượng và nội dung khiếu nại hợp lệ.');
      return;
    }
    try {
      setClaimSubmitting(true);
      await createBuyerClaimApi({ contractId: claimContractId, damagedWeightKg, cause: claimCause.trim() });
      setClaimDamagedWeight('');
      setClaimCause('Hàng hóa hư hỏng hoặc không đạt chất lượng khi nhận');
      await loadAllData();
      setNotification('Đã gửi khiếu nại. Hợp đồng sẽ tạm khóa quyết toán cho tới khi Admin xử lý.');
    } catch (err) {
      setNotification(err instanceof Error ? err.message : 'Không thể gửi khiếu nại.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F2] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-[#10542C] animate-spin" />
        <span className="text-sm font-bold text-[#10542C]">Đang chuẩn bị không gian làm việc của Thương lái...</span>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F4F6F2] text-[#243A2A] flex flex-col lg:flex-row antialiased">
      {/* Toast thông báo thời gian thực */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-[#10542C] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-[#8BC34A]" />
          <span>{notification}</span>
        </div>
      )}

      {/* =========================================================================
          1. MENU DỌC BÊN TRÁI (LEFT SIDEBAR MANAGEMENT)
      ========================================================================= */}
      {!isStandaloneMode && (
      <aside className="w-full lg:w-72 lg:h-screen lg:sticky lg:top-0 bg-[#0F3820] text-white flex flex-col shrink-0 border-r border-[#1B4D2E] shadow-xl z-20">
        {/* Logo & Nhãn phân hệ */}
        <div className="p-4 sm:p-5 border-b border-white/10 space-y-2">
          <Link
            href="/"
            className="w-full flex items-center justify-center py-1 transition hover:scale-[1.02]"
          >
            <img
              src="/assets/logo/Logo_full.png"
              alt="HoNa Fresh"
              className="h-16 w-auto object-contain [filter:drop-shadow(1px_0_0_#fff)_drop-shadow(-1px_0_0_#fff)_drop-shadow(0_1px_0_#fff)_drop-shadow(0_-1px_0_#fff)_drop-shadow(0_0_4px_rgba(255,255,255,0.65))]"
            />
          </Link>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#8BC34A] block text-center">
            Cổng Thu Mua & Thương Lái
          </span>
        </div>

        {/* Thông tin thương lái tóm tắt */}
        <div className="p-4 mx-4 my-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8BC34A] text-[#0F3820] flex items-center justify-center font-bold font-heading text-sm shrink-0">
            {currentUser?.fullName?.charAt(0) || 'T'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{currentUser?.fullName || 'Thương Lái'}</p>
            <p className="text-[11px] text-[#8BC34A] truncate font-medium">
              {currentUser?.companyName || 'Đơn vị thu mua sỉ'}
            </p>
          </div>
        </div>

        {/* Danh sách mục menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'Tổng Quan', icon: LayoutDashboard },
            { id: 'catalog', label: 'Tìm Nguồn Nông Sản Sỉ', icon: Sprout },
            {
              id: 'negotiations',
              label: 'Đơn Đàm Phán Giá',
              icon: Handshake,
              badge: rfqs.filter((r) => r.status === 'WAITING_BUYER').length,
            },
            {
              id: 'contracts',
              label: 'Quản Lý Hợp Đồng',
              icon: FileText,
              badge:
                pendingDepositContracts.length +
                outboundStops.filter((s) => s.status === 'PENDING_BUYER_CONFIRMATION' || s.status === 'ARRIVED').length,
            },
            {
              id: 'claims',
              label: 'Khiếu Nại & Bồi Thường',
              icon: AlertTriangle,
              badge: buyerClaims.filter((claim) => claim.status === 'OPEN').length,
            },
            { id: 'profile', label: 'Hồ Sơ & Kho Tiếp Nhận', icon: UserIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as BuyerTab)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#8BC34A] text-[#0F3820] shadow-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#0F3820]' : 'text-[#8BC34A]'}`} />
                  <span>{item.label}</span>
                </div>
                {Boolean(item.badge && item.badge > 0) && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-[#0F3820] text-[#8BC34A]' : 'bg-[#E53935] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Nút thoát ở chân menu */}
        <div className="p-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => void logout().then(() => router.replace('/dang-nhap'))}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </aside>
      )}

      {/* =========================================================================
          2. KHU VỰC NỘI DUNG CHÍNH BÊN PHẢI (MAIN CONTENT AREA)
      ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Header thanh thoát */}
        <header className="h-16 bg-white border-b border-[#EAECE8] px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6B7280]">Bàn làm việc</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <strong className="text-[#10542C] capitalize">
              {activeTab === 'overview' && 'Tổng quan thu mua'}
              {activeTab === 'catalog' && 'Danh mục nông sản sỉ'}
              {activeTab === 'negotiations' && 'Đơn đàm phán giá sỉ'}
              {activeTab === 'contracts' && 'Quản lý hợp đồng'}
              {activeTab === 'claims' && 'Khiếu nại & bồi thường'}
              {activeTab === 'profile' && 'Hồ sơ thương lái & kho tiếp nhận'}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#10542C] text-xs font-bold transition-colors flex items-center gap-1.5 border border-emerald-200"
            >
              <span>Trang chủ</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                void loadAllData();
                if (activeTab === 'catalog') void loadCatalogData();
              }}
              disabled={refreshing}
              className="px-3.5 py-1.5 rounded-xl bg-[#F4F6F2] hover:bg-[#EAECE8] text-[#10542C] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </header>

        {/* Nội dung chi tiết từng Tab */}
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          {/* ==================== TAB 1: TỔNG QUAN (OVERVIEW) ==================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* 4 Thẻ KPI tóm tắt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-xs">
                  <span className="text-xs text-[#6B7280] font-medium block">Hợp đồng đang thực hiện</span>
                  <p className="font-heading font-black text-2xl text-[#10542C] mt-1.5">
                    {contracts.length} <span className="text-xs font-normal text-slate-500">hợp đồng</span>
                  </p>
                  <span className="text-[11px] text-emerald-700 block mt-1">Giao dịch trực tiếp nhà vườn</span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-xs">
                  <span className="text-xs text-[#6B7280] font-medium block">Sản lượng đặt thu mua</span>
                  <p className="font-heading font-black text-2xl text-[#2C3E2E] mt-1.5">
                    {totalVolumeTons} <span className="text-xs font-normal text-slate-500">Tấn</span>
                  </p>
                  <span className="text-[11px] text-slate-500 block mt-1">Đạt chuẩn chất lượng an toàn</span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-xs">
                  <span className="text-xs text-[#6B7280] font-medium block">Tiền cọc bảo chứng an toàn</span>
                  <p className="font-heading font-black text-2xl text-[#E53935] mt-1.5">
                    {formatVND(totalDepositHolding)}
                  </p>
                  <span className="text-[11px] text-emerald-700 block mt-1">Tài khoản bảo chứng giữ an toàn</span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-xs">
                  <span className="text-xs text-[#6B7280] font-medium block">Chuyến xe đang giao về kho</span>
                  <p className="font-heading font-black text-2xl text-[#1565C0] mt-1.5">
                    {inTransitContracts.length} <span className="text-xs font-normal text-slate-500">chuyến</span>
                  </p>
                  <span className="text-[11px] text-blue-700 block mt-1">Xe thùng lạnh giữ tươi</span>
                </div>
              </div>

              {/* Banner điều hướng nhanh */}
              <div className="bg-gradient-to-r from-[#10542C] to-[#1B6D3D] rounded-3xl p-6 sm:p-7 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading font-black text-lg text-white">Bạn cần nhập thêm nông sản sạch hôm nay?</h3>
                  <p className="text-xs text-white/80 mt-1 max-w-xl">
                    Hàng chục tấn rau củ quả chuẩn VietGAP từ các hợp tác xã Lâm Đồng đang sẵn sàng thu hoạch với mức giá sỉ ưu đãi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-5 py-3 rounded-2xl bg-[#8BC34A] hover:bg-[#7CB342] text-[#10542C] font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0 shadow-md"
                >
                  <Sprout className="w-4 h-4" />
                  <span>Khám phá nguồn hàng ngay</span>
                </button>
              </div>

              {/* Danh sách các đơn đàm phán cần chú ý */}
              <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0F2ED] pb-3">
                  <h4 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-[#10542C]" />
                    <span>Yêu Cầu Đàm Phán Cần Bạn Phản Hồi</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('negotiations')}
                    className="text-xs text-[#10542C] hover:underline font-bold"
                  >
                    Xem tất cả ({rfqs.length})
                  </button>
                </div>

                {rfqs.filter((r) => r.status === 'WAITING_BUYER').length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#6B7280] space-y-1">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                    <p className="font-bold text-[#2C3E2E]">Tất cả đơn đàm phán đều đang được xử lý ổn định.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0F2ED]">
                    {rfqs
                      .filter((r) => r.status === 'WAITING_BUYER')
                      .map((rfq, idx) => (
                        <div key={`overview-${rfq.rfqCode || rfq.id}-${idx}`} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-mono font-bold text-[#10542C]">{rfq.rfqCode}</span> ·{' '}
                            <strong className="text-[#2C3E2E]">{rfq.productName}</strong>
                            <p className="text-[11px] text-[#6B7280] mt-0.5">
                              Khối lượng: {rfq.requestedQuantityKg.toLocaleString()} kg · Nhà vườn đề xuất:{' '}
                              <strong className="text-[#E53935]">{formatVND(rfq.counterPricePerKg || rfq.targetPricePerKg)}/kg</strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAcceptRfq(rfq.id)}
                              className="px-3 py-1.5 bg-[#10542C] text-white rounded-lg font-bold hover:bg-[#0C3E20] transition-colors cursor-pointer"
                            >
                              Đồng ý giá này
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCounterPriceInput({
                                  id: rfq.id,
                                  price: rfq.counterPricePerKg || rfq.targetPricePerKg,
                                  initialPrice: rfq.targetPricePerKg,
                                  farmerPrice: rfq.counterPricePerKg,
                                  quantity: rfq.requestedQuantityKg,
                                  productName: rfq.productName,
                                  lotCode: rfq.lotCode,
                                  farmerName: rfq.farmerName,
                                })
                              }
                              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Đàm phán lại
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: TÌM NGUỒN NÔNG SẢN (CATALOG) ==================== */}
          {activeTab === 'catalog' && (
            <div id="buyer-catalog-section" className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading font-black text-xl text-[#10542C]">Nguồn Nông Sản Sạch Xuất Vườn</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Liên kết trực tiếp các hợp tác xã và nhà vườn uy tín tại Đà Lạt & Lâm Đồng
                  </p>
                </div>
                <div className="text-xs font-bold text-[#10542C] bg-[#EAF5E9] px-3.5 py-1.5 rounded-xl border border-[#D7EED6] self-start sm:self-auto">
                  Sẵn có: <strong>{catalogTotal}</strong> lô nông sản
                </div>
              </div>

              {/* KHỐI TÌM KIẾM & BỘ LỌC */}
              <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Ô tìm kiếm từ khóa */}
                  <div className="relative sm:col-span-2">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={catalogKeywordInput}
                      onChange={(e) => handleKeywordChange(e.target.value)}
                      placeholder="Tìm theo tên nông sản, nhà vườn, hợp tác xã..."
                      className="w-full pl-10 pr-9 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                    />
                    {Boolean(catalogKeywordInput) && (
                      <button
                        type="button"
                        onClick={() => handleKeywordChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title="Xóa từ khóa"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Lọc theo danh mục / Ngành hàng */}
                  <div>
                    <select
                      value={catalogCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#10542C] cursor-pointer"
                    >
                      <option value="ALL">Tất cả ngành hàng</option>
                      <option value="rau-an-la">Rau ăn lá VietGAP</option>
                      <option value="cu-qua-tuoi">Củ & Quả tươi</option>
                      <option value="nam-tuoi-huu-co">Nấm tươi hữu cơ</option>
                      <option value="rau-gia-vi">Rau gia vị & Khác</option>
                    </select>
                  </div>

                  {/* Lọc sắp xếp theo giá / sản lượng */}
                  <div>
                    <select
                      value={catalogSort}
                      onChange={(e) => handleSortChange(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#10542C] cursor-pointer"
                    >
                      <option value="default">Sắp xếp: Mặc định</option>
                      <option value="price_asc">Giá sỉ: Thấp đến cao</option>
                      <option value="price_desc">Giá sỉ: Cao đến thấp</option>
                      <option value="moq_asc">Đặt tối thiểu: Thấp nhất</option>
                    </select>
                  </div>
                </div>

                {/* Các nút bấm chọn nhanh danh mục + Nút Xóa lọc */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F0F2ED]">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[#6B7280] font-medium text-[11px] mr-1">Ngành hàng:</span>
                    {[
                      { id: 'ALL', label: 'Tất cả' },
                      { id: 'rau-an-la', label: 'Rau ăn lá' },
                      { id: 'cu-qua-tuoi', label: 'Củ & Quả' },
                      { id: 'nam-tuoi-huu-co', label: 'Nấm tươi' },
                      { id: 'rau-gia-vi', label: 'Rau gia vị' },
                    ].map((cat) => {
                      const isActive = catalogCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryChange(cat.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#10542C] text-white shadow-2xs'
                              : 'bg-[#F4F6F2] text-[#6B7280] hover:bg-[#EAECE8] hover:text-[#10542C]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>

                  {(Boolean(catalogKeywordInput) || catalogCategory !== 'ALL' || catalogSort !== 'default') && (
                    <button
                      type="button"
                      onClick={handleResetCatalogFilters}
                      className="px-3 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Xóa bộ lọc</span>
                    </button>
                  )}
                </div>
              </div>

              {/* LƯỚI SẢN PHẨM / KẾT QUẢ TÌM KIẾM */}
              {catalogLoading ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-[#EAECE8] shadow-xs">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#10542C] mb-2" />
                  <p className="text-xs font-bold text-[#10542C]">Đang tìm kiếm nguồn nông sản sỉ phù hợp...</p>
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-[#EAECE8] shadow-xs space-y-3">
                  <Sprout className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="font-heading font-black text-sm text-[#2C3E2E]">Không tìm thấy lô nông sản nào</p>
                    <p className="text-xs text-[#6B7280]">
                      Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh mục xuất vườn.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetCatalogFilters}
                    className="px-4 py-2 bg-[#10542C] text-white rounded-xl text-xs font-bold hover:bg-[#0C3E20] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Xem lại tất cả nông sản</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="buyer-catalog-grid">
                    {availableProducts.map((p, idx) => (
                      <div
                        key={`catalog-${p.id || p.lotCode || idx}`}
                        className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4 group"
                      >
                        <div className="space-y-3">
                          <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-100">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-[#10542C]/90 text-white font-bold text-[10px] backdrop-blur-xs">
                              Chuẩn VietGAP
                            </span>
                            {Boolean(p.availableVolume && p.availableVolume > 0) && (
                              <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono font-medium backdrop-blur-xs">
                                Sẵn có: {p.availableVolume?.toLocaleString()} kg
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-heading font-bold text-sm text-[#10542C] line-clamp-1 group-hover:text-[#0C3E20] transition-colors">
                              {p.name}
                            </h4>
                            <p className="text-[11px] text-[#6B7280] flex items-center gap-1 mt-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{p.farmName || 'Hợp Tác Xã Nông Nghiệp Đà Lạt'}</span>
                            </p>
                          </div>

                          <div className="p-3 bg-[#F9FAF8] rounded-xl border border-[#EAECE8] space-y-1 text-xs">
                            <div className="flex justify-between text-[#6B7280]">
                              <span>Giá sỉ xuất vườn:</span>
                              <strong className="text-[#10542C] font-black">{formatVND(p.price)}/kg</strong>
                            </div>
                            <div className="flex justify-between text-[#6B7280]">
                              <span>Khối lượng đặt tối thiểu:</span>
                              <span className="font-bold text-slate-700">
                                {p.moq && p.moq >= 1000 ? `${(p.moq / 1000).toFixed(1)} Tấn` : `${(p.moq || 500).toLocaleString()} kg`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setNegotiatingProduct(p)}
                          className="w-full py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Scale className="w-3.5 h-3.5 text-[#8BC34A]" />
                          <span>Thương lượng giá sỉ</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* PHÂN TRANG (PAGINATION) */}
                  <Pagination
                    currentPage={catalogPage}
                    totalPages={catalogTotalPages}
                    totalItems={catalogTotal}
                    pageSize={catalogSize}
                    onPageChange={(page) => setCatalogPage(page)}
                    scrollTargetId="buyer-catalog-section"
                  />
                </>
              )}
            </div>
          )}

          {/* ==================== TAB 3: ĐƠN ĐÀM PHÁN GIÁ SỈ ==================== */}
          {activeTab === 'negotiations' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-heading font-black text-lg text-[#10542C]">Danh Sách Đơn Đàm Phán Giá Sỉ</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Theo dõi phản hồi thỏa thuận giá từ nhà vườn và chốt tạo hợp đồng
                </p>
              </div>

              {rfqs.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-[#EAECE8] text-xs text-[#6B7280] space-y-2">
                  <Handshake className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-[#2C3E2E]">Bạn chưa gửi yêu cầu đàm phán giá nào.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="text-xs text-[#10542C] underline font-bold"
                  >
                    Xem nguồn hàng để bắt đầu đàm phán
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-[#EAECE8] overflow-hidden shadow-xs">
                  <div className="divide-y divide-[#F0F2ED]">
                    {rfqs.map((rfq, idx) => {
                      const isWaitingBuyer = rfq.status === 'WAITING_BUYER';
                      const isAccepted = rfq.status === 'ACCEPTED';
                      return (
                        <div key={`rfq-row-${rfq.rfqCode || rfq.id}-${idx}`} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#10542C]">{rfq.rfqCode}</span>
                              {(() => {
                                const meta = formatStatusVi(rfq.status);
                                return (
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${meta.badgeClass}`}>
                                    {meta.label}
                                  </span>
                                );
                              })()}
                            </div>
                            <h4 className="font-bold text-sm text-[#2C3E2E]">{rfq.productName}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7280]">
                              <span>Nhà vườn đối tác: <strong className="text-emerald-900 font-bold">{rfq.farmerName || 'HTX Nông Nghiệp'}</strong></span>
                              <span>Mã lô: <strong className="font-mono text-slate-800">{rfq.lotCode}</strong></span>
                            </div>
                            <p className="text-[#6B7280]">
                              Khối lượng: <strong>{(rfq.requestedQuantityKg || 0).toLocaleString()} kg</strong> · Giá bạn đề xuất:{' '}
                              <strong>{formatVND(rfq.targetPricePerKg)}/kg</strong>
                            </p>
                            {Boolean(rfq.counterPricePerKg) && (
                              <p className="text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded-md inline-block">
                                Nhà vườn phản hồi: {formatVND(rfq.counterPricePerKg!)}/kg
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Nút Xem chi tiết đơn đàm phán */}
                            <button
                              type="button"
                              onClick={() => setViewingRfqDetail(rfq)}
                              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-600" />
                              <span>Xem chi tiết</span>
                            </button>

                            {/* Nút Nhắn tin đàm phán với Nhà Vườn */}
                            <button
                              type="button"
                              onClick={() => {
                                markChatAsRead(rfq.rfqCode);
                                setActiveChatRfq(rfq);
                              }}
                              className="relative px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Mở phòng chat realtime đàm phán với Nhà Vườn"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-sky-700" />
                              <span>Nhắn tin</span>
                              {(unreadChatCounts[rfq.rfqCode] || 0) > 0 && (
                                <span className="absolute -top-2 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white">
                                  {unreadChatCounts[rfq.rfqCode] > 99 ? '99+' : unreadChatCounts[rfq.rfqCode]}
                                </span>
                              )}
                            </button>

                            {/* Nút Chỉnh sửa & Hủy đàm phán */}
                            {['WAITING_FARMER', 'WAITING_BUYER', 'PENDING'].includes(rfq.status) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingRfqDetail(rfq)}
                                  className="px-3 py-1.5 border border-emerald-300 hover:bg-emerald-50 text-[#10542C] font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCancellingRfqId(rfq.id)}
                                  className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Hủy</span>
                                </button>
                              </>
                            )}

                            {isWaitingBuyer && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptRfq(rfq.id)}
                                  className="px-4 py-2 bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                  Đồng ý mức giá này
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCounterPriceInput({
                                      id: rfq.id,
                                      price: rfq.counterPricePerKg || rfq.targetPricePerKg,
                                      initialPrice: rfq.targetPricePerKg,
                                      farmerPrice: rfq.counterPricePerKg,
                                      quantity: rfq.requestedQuantityKg,
                                      productName: rfq.productName,
                                      lotCode: rfq.lotCode,
                                      farmerName: rfq.farmerName,
                                    })
                                  }
                                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                  Đề xuất lại giá
                                </button>
                              </>
                            )}

                            {isAccepted && rfq.contractCode && (
                              <button
                                type="button"
                                onClick={() => setActiveTab('contracts')}
                                className="px-3.5 py-1.5 bg-[#EAF5E9] text-[#10542C] font-bold rounded-xl hover:bg-[#D7EED6] transition-colors"
                              >
                                Xem hợp đồng: {rfq.contractCode}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form popup đề xuất lại giá (Hỗ trợ cả gõ bàn phím lẫn nút tăng/giảm +/-) */}
              {counterPriceInput && (() => {
                const currentVal = counterPriceInput.price || 0;
                const qty = counterPriceInput.quantity || 1000;
                const estTotal = currentVal * qty;
                const estDeposit = Math.round(estTotal * 0.3);
                const diffFarmer = counterPriceInput.farmerPrice
                  ? currentVal - counterPriceInput.farmerPrice
                  : 0;

                const adjustPrice = (delta: number) => {
                  const next = Math.max(1000, currentVal + delta);
                  setCounterPriceInput({ ...counterPriceInput, price: next });
                };

                return (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl border border-emerald-100">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#10542C] flex items-center justify-center font-bold">
                            <Handshake className="w-4 h-4 text-[#10542C]" />
                          </div>
                          <div>
                            <h4 className="font-heading font-black text-sm sm:text-base text-[#10542C]">
                              Đề Xuất Lại Mức Giá Mua Sỉ
                            </h4>
                            <p className="text-[11px] text-gray-500">
                              {counterPriceInput.productName || 'Lô nông sản'} · {qty.toLocaleString()} kg
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCounterPriceInput(null)}
                          className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Bảng so sánh mốc giá hiện tại */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <div>
                          <span className="text-[10px] text-gray-500 block">Giá bạn đề xuất trước:</span>
                          <strong className="text-gray-800 font-mono">
                            {formatVND(counterPriceInput.initialPrice || 0)}/kg
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-700 font-bold block">Nhà vườn mong muốn:</span>
                          <strong className="text-amber-800 font-mono font-bold">
                            {counterPriceInput.farmerPrice
                              ? `${formatVND(counterPriceInput.farmerPrice)}/kg`
                              : 'Chưa có'}
                          </strong>
                        </div>
                      </div>

                      {/* KHỐI TÙY CHỈNH MỨC GIÁ: VỪA CHO NHẬP TỰ DO BÀN PHÍM VỪA CÓ NÚT BẤM TĂNG/GIẢM */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-800">
                          Mức giá bạn muốn thương lượng lại (đ/kg):
                        </label>

                        {/* Ô input kèm cặp nút tăng giảm stepper [-] và [+] */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => adjustPrice(-500)}
                            className="w-11 h-11 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-slate-700 font-black text-lg flex items-center justify-center transition border border-gray-200 cursor-pointer shrink-0"
                            title="Giảm 500 đ/kg"
                          >
                            −
                          </button>

                          <div className="relative flex-1">
                            <input
                              type="number"
                              min={1000}
                              step={100}
                              value={counterPriceInput.price || ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                setCounterPriceInput({ ...counterPriceInput, price: val });
                              }}
                              placeholder="Nhập mức giá..."
                              className="w-full px-4 py-2.5 bg-[#FAFBF9] border-2 border-emerald-200 rounded-2xl font-mono font-black text-base text-[#10542C] focus:outline-none focus:border-[#10542C] focus:bg-white text-center transition"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                              đ/kg
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => adjustPrice(500)}
                            className="w-11 h-11 rounded-2xl bg-[#10542C] hover:bg-[#0C3E20] active:scale-95 text-white font-black text-lg flex items-center justify-center transition shadow-xs cursor-pointer shrink-0"
                            title="Tăng 500 đ/kg"
                          >
                            +
                          </button>
                        </div>

                        {/* Hàng nút bấm tăng giảm nhanh (+/-) tiện lợi */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] text-gray-500 font-medium block">
                            Điều chỉnh nhanh bước giá:
                          </span>
                          <div className="grid grid-cols-6 gap-1">
                            {[
                              { label: '-2.000', val: -2000 },
                              { label: '-1.000', val: -1000 },
                              { label: '-500', val: -500 },
                              { label: '+500', val: 500 },
                              { label: '+1.000', val: 1000 },
                              { label: '+2.000', val: 2000 },
                            ].map((btn) => (
                              <button
                                key={btn.label}
                                type="button"
                                onClick={() => adjustPrice(btn.val)}
                                className={`py-1 rounded-xl text-[10px] font-bold transition cursor-pointer border ${
                                  btn.val < 0
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Các mốc gợi ý một chạm */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Boolean(counterPriceInput.initialPrice) && (
                            <button
                              type="button"
                              onClick={() =>
                                setCounterPriceInput({
                                  ...counterPriceInput,
                                  price: counterPriceInput.initialPrice!,
                                })
                              }
                              className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer"
                            >
                              Giữ giá ban đầu: {formatVND(counterPriceInput.initialPrice!)}
                            </button>
                          )}
                          {Boolean(counterPriceInput.farmerPrice && counterPriceInput.initialPrice) && (
                            <button
                              type="button"
                              onClick={() => {
                                const mid = Math.round(
                                  (counterPriceInput.farmerPrice! + counterPriceInput.initialPrice!) / 2 / 100
                                ) * 100;
                                setCounterPriceInput({ ...counterPriceInput, price: mid });
                              }}
                              className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
                            >
                              🤝 Chia đôi mức giá: {formatVND(
                                Math.round(
                                  (counterPriceInput.farmerPrice! + counterPriceInput.initialPrice!) / 2 / 100
                                ) * 100
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bảng tính toán tức thì khi thay đổi giá */}
                      <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Khối lượng mua:</span>
                          <strong className="text-slate-800 font-mono">{qty.toLocaleString()} kg</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Chênh lệch so với nhà vườn:</span>
                          <strong
                            className={`font-mono font-bold ${
                              diffFarmer < 0
                                ? 'text-rose-600'
                                : diffFarmer > 0
                                ? 'text-emerald-700'
                                : 'text-gray-600'
                            }`}
                          >
                            {diffFarmer > 0 ? `+${formatVND(diffFarmer)}` : formatVND(diffFarmer)} / kg
                          </strong>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-emerald-200/60">
                          <span className="text-gray-700 font-semibold">Tổng tiền hàng ước tính:</span>
                          <strong className="text-[#10542C] font-mono font-bold text-sm">
                            {formatVND(estTotal)}
                          </strong>
                        </div>
                        <div className="flex justify-between text-[11px] text-emerald-800">
                          <span>Tiền cọc 30% bảo chứng sàn:</span>
                          <strong className="font-mono">{formatVND(estDeposit)}</strong>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setCounterPriceInput(null)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={!currentVal || currentVal <= 0}
                          onClick={() => handleSendCounter(counterPriceInput.id)}
                          className="px-5 py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                        >
                          <Handshake className="w-4 h-4 text-[#8BC34A]" />
                          <span>Gửi Đề Xuất Tới Nhà Vườn</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ==================== TAB 4: QUẢN LÝ HỢP ĐỒNG ==================== */}
          {activeTab === 'contracts' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading font-black text-lg text-[#10542C]">Quản Lý Hợp Đồng</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Đặt cọc 30% · Kiểm định QC · Theo dõi giao hàng GPS · Ký nhận ePOD · Thanh toán 70%
                  </p>
                </div>

                {/* Bộ lọc trạng thái gọn */}
                {(() => {
                  const matchesFilter = (c: any, fId: 'ALL' | 'DEPOSIT' | 'QC' | 'DELIVERY' | 'DONE') => {
                    if (fId === 'ALL') return true;
                    const isPaid = c.depositStatus === 'DEPOSIT_PAID';
                    const step = Number(c.fulfillmentStep || 1);
                    const statusUpper = String(c.status || '').toUpperCase();
                    const matchedStop = outboundStops.find((s) => Number(s.contractId) === Number(c.id));
                    const isFinalPaid =
                      c.finalPaidStatus === 'PAID' ||
                      String(c.remainingPaymentStatus || '').toUpperCase() === 'PAID' ||
                      step >= 6 ||
                      statusUpper === 'SETTLED' ||
                      statusUpper === 'COMPLETED';

                    if (fId === 'DEPOSIT') return !isPaid;
                    if (fId === 'QC') return isPaid && step >= 2 && step <= 4 && !matchedStop && !isFinalPaid;
                    if (fId === 'DELIVERY')
                      return (
                        !isFinalPaid &&
                        (step === 5 ||
                          statusUpper === 'IN_TRANSIT' ||
                          statusUpper === 'DELIVERED' ||
                          matchedStop?.status === 'ARRIVED' ||
                          matchedStop?.status === 'PENDING_BUYER_CONFIRMATION' ||
                          matchedStop?.status === 'BUYER_CONFIRMED')
                      );
                    if (fId === 'DONE') return isFinalPaid;
                    return true;
                  };
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {[
                        { id: 'ALL' as const, label: 'Tất cả' },
                        { id: 'DEPOSIT' as const, label: 'Chờ cọc 30%' },
                        { id: 'QC' as const, label: 'Đang xử lý / QC' },
                        { id: 'DELIVERY' as const, label: 'Đang giao / Chờ ký & TT 70%' },
                        { id: 'DONE' as const, label: 'Hoàn tất' },
                      ].map((f) => {
                        const count = contracts.filter((c) => matchesFilter(c, f.id)).length;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setContractFilter(f.id)}
                            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer border ${
                              contractFilter === f.id
                                ? 'bg-[#10542C] text-white border-[#10542C] shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {f.label} ({count})
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {contracts.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-[#EAECE8] text-xs text-[#6B7280]">
                  Chưa có hợp đồng nào được tạo. Khi bạn và nhà vườn thống nhất giá đàm phán, hợp đồng sẽ xuất hiện tại đây.
                </div>
              ) : (() => {
                const filteredBuyerContracts = contracts.filter((c) => {
                  if (contractFilter === 'ALL') return true;
                  const isPaid = c.depositStatus === 'DEPOSIT_PAID';
                  const step = Number((c as any).fulfillmentStep || 1);
                  const statusUpper = String(c.status || '').toUpperCase();
                  const matchedStop = outboundStops.find((s) => Number(s.contractId) === Number(c.id));
                  const isFinalPaid =
                    (c as any).finalPaidStatus === 'PAID' ||
                    String((c as any).remainingPaymentStatus || '').toUpperCase() === 'PAID' ||
                    step >= 6 ||
                    statusUpper === 'SETTLED' ||
                    statusUpper === 'COMPLETED';
                  if (contractFilter === 'DEPOSIT') return !isPaid;
                  if (contractFilter === 'QC') return isPaid && step >= 2 && step <= 4 && !matchedStop && !isFinalPaid;
                  if (contractFilter === 'DELIVERY')
                    return (
                      !isFinalPaid &&
                      (step === 5 ||
                        statusUpper === 'IN_TRANSIT' ||
                        statusUpper === 'DELIVERED' ||
                        matchedStop?.status === 'ARRIVED' ||
                        matchedStop?.status === 'PENDING_BUYER_CONFIRMATION' ||
                        matchedStop?.status === 'BUYER_CONFIRMED')
                    );
                  if (contractFilter === 'DONE') return isFinalPaid;
                  return true;
                });
                const totalContractPages = Math.max(1, Math.ceil(filteredBuyerContracts.length / BUYER_CONTRACTS_PAGE_SIZE));
                const safeContractsPage = Math.min(contractsPage, totalContractPages);
                const pagedBuyerContracts = filteredBuyerContracts.slice(
                  (safeContractsPage - 1) * BUYER_CONTRACTS_PAGE_SIZE,
                  safeContractsPage * BUYER_CONTRACTS_PAGE_SIZE
                );
                return (
                <>
                <div id="buyer-contracts-list" className="grid grid-cols-1 gap-4">
                  {filteredBuyerContracts.length === 0 && (
                    <div className="p-10 text-center bg-white rounded-3xl border border-[#EAECE8] text-xs text-[#6B7280] space-y-3">
                      <p>
                        Không có hợp đồng nào trong mục này.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setContractFilter('ALL')}
                          className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                        >
                          Xem tất cả ({contracts.length})
                        </button>
                      </div>
                    </div>
                  )}
                  {pagedBuyerContracts.map((c, idx) => {
                    const isPaid = c.depositStatus === 'DEPOSIT_PAID';
                    const matchedStop = outboundStops.find((s) => Number(s.contractId) === Number(c.id));
                    const cardOpt = String((c as any).shippingOption || (c as any).shipping_option || '').toUpperCase();
                    const isPa3Card = cardOpt === 'PA3' || cardOpt === 'FARM_PICKUP' || cardOpt.includes('PICKUP') || cardOpt.includes('SELF');
                    return (
                      <div
                        key={`contract-${c.contractCode || c.id}-${idx}`}
                        className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECE8] shadow-xs flex flex-col gap-4 text-xs"
                      >
                        <div className="space-y-2.5 w-full">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#10542C]">{c.contractCode}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isPaid
                                ? (isPa3Card ? 'Đã nộp cọc 100% bảo chứng' : 'Đã nộp cọc 30% bảo chứng')
                                : (isPa3Card ? 'Chờ nộp cọc 100%' : 'Chờ nộp cọc 30%')}
                            </span>
                            {Boolean((c as any).packagingApproved || (c as any).packaging_approved || (c as any).status === 'PACKAGING_APPROVED') && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-teal-700" />
                                <span>BQT Đã Duyệt Đóng Gói</span>
                              </span>
                            )}
                            {Number((c as any).fulfillmentStep) >= 3 && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                                <Truck className="w-3 h-3 text-blue-700" />
                                <span>{Number((c as any).fulfillmentStep) === 3 ? 'Xe Lạnh Đang Lấy Hàng' : Number((c as any).fulfillmentStep) === 4 ? 'Đang Lưu Kho Lạnh QC' : Number((c as any).fulfillmentStep) === 5 ? 'Đang Giao Kho Buyer' : 'Đã Hoàn Tất'}</span>
                              </span>
                            )}
                          </div>

                          <h4 className="font-heading font-bold text-base text-[#2C3E2E]">{c.productName}</h4>

                          {(() => {
                            const shippingOpt = (c as any).shippingOption || (c as any).shipping_option || 'CROSS_DOCKING_HUB';
                            const shippingMeta = getShippingMethodLabel(shippingOpt);
                            const fin = calculateB2bContractFinancials({
                              quantityKg: c.quantity || 0,
                              unitPrice: c.unitPrice || 0,
                              goodsAmount: (c as any).goodsAmount,
                              shippingFee: (c as any).shippingFee,
                              totalAmount: c.totalAmount,
                              depositAmount: c.depositAmount,
                              shippingOption: shippingOpt,
                            });
                            const goodsAmount = fin.pureGoodsAmount;
                            const shippingFee = fin.shippingFee;
                            const effectiveTotal = fin.grandTotal;
                            const depositAmt = fin.depositAmount;
                            const isSelfPickup = fin.isSelfPickup;

                            return (
                              <div className="space-y-2 pt-1">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-gray-50/80 p-3 rounded-2xl border border-gray-100 text-xs">
                                  <div>
                                    <span className="text-[11px] text-gray-500 block">Khối lượng chốt:</span>
                                    <strong className="text-gray-900 font-bold text-sm">{(c.quantity || 0).toLocaleString()} kg</strong>
                                    {Boolean(c.unitPrice) && (
                                      <span className="text-[10px] text-gray-400 block font-mono">{formatVND(c.unitPrice)}/kg</span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-[11px] text-gray-500 block">Tiền nông sản:</span>
                                    <strong className="text-gray-900 font-bold text-sm font-mono">{formatVND(goodsAmount)}</strong>
                                  </div>
                                  <div>
                                    <span className="text-[11px] text-gray-500 block">Cước vận chuyển:</span>
                                    <strong className="text-[#10542C] font-bold text-sm font-mono">{formatVND(shippingFee)}</strong>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-block mt-0.5 ${shippingMeta.badgeClass}`}>
                                      {shippingMeta.badge}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[11px] text-gray-500 block">Tổng thanh toán:</span>
                                    <strong className="text-[#10542C] font-black text-sm sm:text-base font-mono">{formatVND(effectiveTotal)}</strong>
                                    <div className="text-[11px] text-[#E53935] font-bold mt-0.5">
                                      Cọc {isSelfPickup ? '100%' : '30%'}: {formatVND(depositAmt)}
                                    </div>
                                  </div>
                                </div>

                                {/* Tiến trình quy trình thực hiện hợp đồng 6 mốc */}
                                {(() => {
                                  const computedStep = computeClientStep(c.status, c.depositStatus, c.fulfillmentStatus);
                                  const rawStep = Number((c as any).fulfillmentStep || 0);
                                  const currentStep = isPaid ? Math.max(2, rawStep || computedStep) : 1;
                                  const hasActualHarvest =
                                    isPaid &&
                                    (currentStep >= 3 ||
                                      Boolean((c as any).packagingApproved || (c as any).packaging_approved));
                                  const hasPickupTruck =
                                    isPaid &&
                                    currentStep >= 3 &&
                                    Boolean((c as any).pickupTruckPlate || (c as any).truckLicensePlate);

                                  return (
                                    <>
                                      <div className="pt-2 pb-1 border-t border-gray-100">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1.5">
                                          <span className="flex items-center gap-1 text-[#10542C]">
                                            <Clock className="w-3.5 h-3.5 text-[#10542C]" />
                                            Tiến Trình Thực Hiện (Mốc {currentStep}/6)
                                          </span>
                                          <span className="text-gray-600 font-semibold text-[10px]">
                                            {!isPaid
                                              ? 'Chờ Buyer Đặt Cọc 30% Escrow'
                                              : (c as any).fulfillmentStatusName ||
                                                computeClientStepName(
                                                  c.status,
                                                  c.depositStatus,
                                                  c.fulfillmentStatus,
                                                  Boolean((c as any).packagingApproved || (c as any).packaging_approved)
                                                )}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-6 gap-1 text-center font-bold text-[10px]">
                                          {[
                                            { step: 1, label: '1. Chốt & Cọc' },
                                            { step: 2, label: '2. Thu Hoạch' },
                                            { step: 3, label: '3. Lấy Hàng' },
                                            { step: 4, label: '4. Kiểm Định & Lưu Kho' },
                                            { step: 5, label: '5. Giao Hàng' },
                                            { step: 6, label: '6. Hoàn Tất' },
                                          ].map((m) => {
                                            const isDone = currentStep > m.step;
                                            const isCurrent = currentStep === m.step;
                                            return (
                                              <div
                                                key={m.step}
                                                className={`py-1 px-1 rounded-lg transition-all ${
                                                  isCurrent
                                                    ? 'bg-[#10542C] text-white shadow-2xs font-bold'
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

                                      {/* Kết quả Kiểm Định QC tại Kho HoNa (Đạt / Không đạt / Đã hoàn hàng & hoàn cọc) */}
                                      {((c as any).qc_status === 'QC_PASSED' ||
                                        (c as any).qcStatus === 'QC_PASSED' ||
                                        c.status === 'QC_PASSED' ||
                                        (c as any).qc_status === 'QC_FAILED' ||
                                        (c as any).qcStatus === 'QC_FAILED' ||
                                        c.status === 'QC_FAILED' ||
                                        c.fulfillmentStatus === 'QC_RETURNED_REFUNDED' ||
                                        (c as any).qc_status === 'QC_RETURNED') && (
                                        <div
                                          className={`mt-1.5 p-3 rounded-2xl border text-xs space-y-1 ${
                                            c.fulfillmentStatus === 'QC_RETURNED_REFUNDED' || (c as any).qc_status === 'QC_RETURNED'
                                              ? 'bg-rose-50 border-rose-300 text-rose-900'
                                              : (c as any).qc_status === 'QC_FAILED' || (c as any).qcStatus === 'QC_FAILED' || c.status === 'QC_FAILED'
                                              ? 'bg-rose-50 border-rose-300 text-rose-900'
                                              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2 font-bold">
                                            <span>
                                              {c.fulfillmentStatus === 'QC_RETURNED_REFUNDED' || (c as any).qc_status === 'QC_RETURNED'
                                                ? '✕ Không Đạt QC — Đã Hoàn Hàng & Hoàn Cọc 30%'
                                                : (c as any).qc_status === 'QC_FAILED' || (c as any).qcStatus === 'QC_FAILED' || c.status === 'QC_FAILED'
                                                ? '✕ Không Đạt Kiểm Định QC Tại Kho'
                                                : '✓ Đã Đạt Kiểm Định QC HoNa Fresh'}
                                            </span>
                                            {((c as any).qc_brix || (c as any).qc_nitrate_ppm) && (
                                              <span className="font-mono text-[11px]">
                                                Brix: {(c as any).qc_brix || '12.5'}°Bx · Nitrate: {(c as any).qc_nitrate_ppm || '240'} ppm
                                              </span>
                                            )}
                                          </div>
                                          {((c as any).delivery_notes || (c as any).deliveryNotes) && (
                                            <p className="text-[11px] leading-relaxed">
                                              {(c as any).delivery_notes || (c as any).deliveryNotes}
                                            </p>
                                          )}
                                          {Number((c as any).refund_amount || (c as any).refundAmount || 0) > 0 && (
                                            <p className="text-[11px] font-bold text-rose-800">
                                              Số tiền đã hoàn cọc Escrow: {Number((c as any).refund_amount || (c as any).refundAmount).toLocaleString('vi-VN')} đ
                                            </p>
                                          )}
                                        </div>
                                      )}

                                      {/* Banner Đang Giao Hàng + Theo Dõi Đường Đi GPS Tài Xế (chỉ hiện sau khi Xuất Bến -> IN_TRANSIT) */}
                                      {(c.status === 'IN_TRANSIT' ||
                                        c.fulfillmentStatus === 'IN_TRANSIT') && (
                                        <div className="mt-1.5 p-3 rounded-2xl border border-blue-300 bg-blue-50/90 text-blue-900 text-xs flex flex-wrap items-center justify-between gap-2">
                                          <div className="space-y-0.5">
                                            <div className="font-bold flex items-center gap-1.5">
                                              <Truck className="w-4 h-4 text-blue-600" />
                                              <span>Xe Lạnh Đang Giao Hàng Tới Kho Bạn</span>
                                            </div>
                                            <p className="text-[11px] text-blue-800">
                                              Xe: <strong className="font-mono">{(c as any).outbound_truck_plate || (c as any).outboundTruckPlate || 'Xe Lạnh HoNa'}</strong>
                                              {' · '}Tài xế: <strong>{(c as any).outbound_driver_name || (c as any).outboundDriverName || 'Tài xế HoNa Express'}</strong>
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setLiveTrackingContract(c)}
                                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                                          >
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>Xem Đường Đi GPS</span>
                                          </button>
                                        </div>
                                      )}

                                      {/* Banner Ký Nhận Hàng ePOD trực tiếp ngay trong Quản lý hợp đồng */}
                                      {matchedStop &&
                                        (matchedStop.status === 'PENDING_BUYER_CONFIRMATION' ||
                                          matchedStop.status === 'ARRIVED') && (
                                          <div className="mt-1.5 p-3 rounded-2xl border-2 border-amber-400 bg-amber-50 text-amber-950 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs">
                                            <div className="space-y-0.5">
                                              <div className="font-bold flex items-center gap-1.5">
                                                <FileCheck2 className="w-4 h-4 text-amber-700" />
                                                <span>
                                                  {matchedStop.status === 'PENDING_BUYER_CONFIRMATION'
                                                    ? 'Tài Xế Đã Nộp Biên Bản ePOD — Chờ Bạn Ký Nhận'
                                                    : 'Xe Lạnh Đã Đến Kho — Chờ Kiểm Đếm & Ký Nhận'}
                                                </span>
                                              </div>
                                              <p className="text-[11px] text-amber-900">
                                                Thực giao: <strong className="font-mono">{Number(matchedStop.actualDeliveredWeightKg || matchedStop.expectedWeightKg).toLocaleString()} kg</strong>
                                                {Number(matchedStop.rejectedWeightKg || 0) > 0 && (
                                                  <span className="text-rose-700 font-bold">
                                                    {' · '}Hao hụt: {Number(matchedStop.rejectedWeightKg).toLocaleString()} kg
                                                  </span>
                                                )}
                                              </p>
                                            </div>
                                            {matchedStop.status === 'PENDING_BUYER_CONFIRMATION' && (
                                              <button
                                                type="button"
                                                onClick={() => openConfirmEpodModal(matchedStop)}
                                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                                              >
                                                <FileCheck2 className="w-3.5 h-3.5" />
                                                <span>Kiểm Đếm & Ký Nhận ePOD</span>
                                              </button>
                                            )}
                                          </div>
                                        )}

                                      {matchedStop && matchedStop.status === 'BUYER_CONFIRMED' && (
                                        <div className="mt-1.5 p-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 text-xs flex flex-wrap items-center justify-between gap-2">
                                          <div>
                                            <span className="font-bold flex items-center gap-1.5">
                                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                              <span>
                                                Đã Ký Nhận Biên Bản ePOD ({Number(matchedStop.actualDeliveredWeightKg || matchedStop.expectedWeightKg).toLocaleString()} kg)
                                              </span>
                                            </span>
                                            <span className="text-[11px] text-emerald-700 block pl-5">
                                              Người ký: <strong>{matchedStop.buyerSignerName || 'Đại diện kho Buyer'}</strong>
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setViewingReceiptStop(matchedStop)}
                                            className="px-3 py-1.5 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                                          >
                                            <FileCheck2 className="w-3.5 h-3.5" />
                                            <span>Xem & In Biên Bản Giao Nhận</span>
                                          </button>
                                        </div>
                                      )}

                                      {/* Thông tin nghiệm thu từ Nông dân khi đã nộp cọc & hoàn tất thu hoạch */}
                                      {hasActualHarvest && (
                                        <div className="mt-1.5 p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-[#10542C] flex items-center gap-1.5">
                                              <Scale className="w-3.5 h-3.5 text-[#10542C]" />
                                              <span>Nhà Vườn Đã Nghiệm Thu Thu Hoạch & Đóng Kiện</span>
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                              {Boolean((c as any).packagingApproved || (c as any).packaging_approved || (c as any).status === 'PACKAGING_APPROVED') && (
                                                <span className="text-[10px] font-bold bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                  <CheckCircle2 className="w-3 h-3 text-teal-700" />
                                                  <span>BQT Đã Duyệt Đóng Gói</span>
                                                </span>
                                              )}
                                              <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                                                Loại 1: {(c as any).grade1Ratio || 96}%
                                              </span>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                                            <div>
                                              <span className="text-gray-500 block">Sản lượng thực thu:</span>
                                              <strong className="text-gray-900 font-mono text-xs">{(c as any).actualHarvestWeightKg || c.quantity} kg</strong>
                                            </div>
                                            <div>
                                              <span className="text-gray-500 block">Số thùng đã đóng:</span>
                                              <strong className="text-gray-900 font-mono text-xs">{(c as any).packageCount || 10} thùng</strong>
                                            </div>
                                            <div>
                                              <span className="text-gray-500 block">Quy cách kiện:</span>
                                              <span className="text-gray-800 font-medium text-[10px] truncate block" title={(c as any).packageType || 'Thùng xốp niêm phong'}>
                                                {(c as any).packageType || 'Thùng xốp niêm phong'}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500 block">Mã tem PUC dán thùng:</span>
                                              <span className="text-emerald-800 font-mono font-bold text-[10px] truncate block" title={(c as any).qrCodeData || `${c.contractCode}-PUC`}>
                                                {(c as any).qrCodeData || `${c.contractCode}-PUC`}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Thông tin Xe Lạnh Lấy Hàng (Chỉ hiện khi đã điều xe từ Mốc 4) */}
                                      {hasPickupTruck && (
                                        <div className="mt-1.5 p-3 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-blue-900 flex items-center gap-1.5">
                                              <Truck className="w-3.5 h-3.5 text-blue-600" />
                                              <span>Xe Lạnh HoNa Đang Đến Rẫy Lấy Hàng</span>
                                            </span>
                                            <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                                              Thùng lạnh: {(c as any).truckTempCurrent || 4.2}°C (Chuẩn 2-6°C)
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-0.5">
                                            <div>
                                              <span className="text-gray-500 block">Biển số xe lạnh:</span>
                                              <strong className="text-gray-900 font-mono text-xs">{(c as any).truckLicensePlate || (c as any).pickupTruckPlate}</strong>
                                            </div>
                                            <div>
                                              <span className="text-gray-500 block">Tài xế phụ trách:</span>
                                              <strong className="text-gray-900 text-xs">{(c as any).truckDriverName || (c as any).pickupDriverName || 'Tài xế HoNa Fresh'}</strong>
                                            </div>
                                            {Boolean((c as any).truckDriverPhone || (c as any).pickupDriverPhone) && (
                                              <div>
                                                <span className="text-gray-500 block">SĐT tài xế:</span>
                                                <strong className="text-[#10542C] font-mono text-xs">{(c as any).truckDriverPhone || (c as any).pickupDriverPhone}</strong>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3.5 border-t border-gray-100">
                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => {
                                const fin = calculateB2bContractFinancials({
                                  quantityKg: c.quantity || 0,
                                  unitPrice: c.unitPrice || 0,
                                  goodsAmount: (c as any).goodsAmount,
                                  shippingFee: (c as any).shippingFee,
                                  shippingOption: (c as any).shippingOption || (c as any).shipping_option || 'CROSS_DOCKING_HUB',
                                });
                                const shippingOpt = fin.shippingOption;
                                const isSelfPickup = fin.isSelfPickup;
                                const shippingFee = fin.shippingFee;
                                const effectiveTotal = fin.grandTotal;
                                const depositAmt = fin.depositAmount;
                                setSelectedContractForPayment({
                                  ...c,
                                  totalAmount: effectiveTotal,
                                  depositAmount: depositAmt,
                                });
                              }}
                              className="px-5 py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                            >
                              <QrCode className="w-4 h-4 text-[#8BC34A]" />
                              <span>Quét VietQR nộp cọc</span>
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-[11px] border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Đã bảo chứng an toàn</span>
                            </div>
                          )}

                          {isPaid && (
                            (() => {
                              const opt = String((c as any).shippingOption || (c as any).shipping_option || '').toUpperCase();
                              const isBuyerSelfPickup = opt === 'PA3' || opt === 'FARM_PICKUP' || opt.includes('SELF') || opt.includes('PICKUP') || opt.includes('TỰ VẬN CHUYỂN') || opt.includes('TỰ LẤY');
                              const statusUpper = String((c as any).status || '').toUpperCase();
                              const qcUpper = String((c as any).qcStatus || (c as any).qc_status || '').toUpperCase();
                              const isQcDone = qcUpper === 'QC_PASSED' || qcUpper === 'PASSED' || statusUpper === 'QC_PASSED' || statusUpper === 'READY_OUTBOUND';
                              const isAlreadyDelivered = ['DELIVERED', 'SETTLED', 'COMPLETED'].includes(statusUpper);
                              if (!isBuyerSelfPickup || !isQcDone || isAlreadyDelivered) return null;
                              const hasRegisteredTruck = Boolean((c as any).outboundTruckPlate);
                              return (
                                <div className="flex flex-wrap items-center gap-2">
                                  {hasRegisteredTruck && (
                                    <span className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold flex items-center gap-1">
                                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Xe đang đến kho: {(c as any).outboundTruckPlate} · {(c as any).outboundDriverName}</span>
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPa3TruckPlate(String((c as any).outboundTruckPlate || ''));
                                      setPa3DriverName(String((c as any).outboundDriverName || '').split('(')[0].trim());
                                      setPa3DriverPhone('');
                                      setPa3EtaText('');
                                      setPa3Notes('');
                                      setDispatchingContract(c as any);
                                    }}
                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer text-xs"
                                    title="Nhập thông tin tài xế & biển số xe đến kho HoNa nhận hàng (PA3)"
                                  >
                                    <Truck className="w-3.5 h-3.5 text-white" />
                                    <span>{hasRegisteredTruck ? 'Cập nhật xe đến kho' : 'Điều xe đến kho HoNa'}</span>
                                  </button>
                                </div>
                              );
                            })()
                          )}

                          {isPaid && (
                            (() => {
                              const statusUpper = String((c as any).status || '').toUpperCase();
                              const isFinalPaid =
                                (c as any).finalPaidStatus === 'PAID' ||
                                String((c as any).remainingPaymentStatus || '').toUpperCase() === 'PAID' ||
                                (c as any).fulfillmentStep >= 6 ||
                                statusUpper === 'SETTLED' ||
                                statusUpper === 'COMPLETED';
                              const isDeliveryAccepted =
                                statusUpper === 'DELIVERED' || matchedStop?.status === 'BUYER_CONFIRMED';
                              if (!isFinalPaid && isDeliveryAccepted) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => void openFinalPayment(c as any)}
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer text-xs animate-pulse"
                                    title="Quét mã VietQR thanh toán 70% giá trị hợp đồng còn lại"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-white" />
                                    <span>Thanh toán 70% còn lại</span>
                                  </button>
                                );
                              }
                              return null;
                            })()
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const fin = calculateB2bContractFinancials({
                                quantityKg: c.quantity || 0,
                                unitPrice: c.unitPrice || 0,
                                goodsAmount: (c as any).goodsAmount,
                                shippingFee: (c as any).shippingFee,
                                shippingOption: (c as any).shippingOption || (c as any).shipping_option || 'CROSS_DOCKING_HUB',
                              });
                              const shippingOpt = fin.shippingOption;
                              const isSelfPickup = fin.isSelfPickup;
                              const goodsAmount = fin.pureGoodsAmount;
                              const shippingFee = fin.shippingFee;
                              const effectiveTotal = fin.grandTotal;
                              const depositAmt = fin.depositAmount;

                              setViewingContract({
                                id: c.id,
                                contractCode: c.contractCode,
                                rfqCode: c.rfqCode || (c.contractCode ? `RFQ-${c.contractCode.replace(/^HD-/, '')}` : ''),
                                lotCode: c.lotCode,
                                productName: c.productName,
                                buyerName: c.buyerName || currentUser?.fullName || '',
                                buyerCompany: (c as any).buyerCompany || (c as any).buyer_company || profileCompany || currentUser?.companyName || currentUser?.fullName || '',
                                buyerRepresentative: c.buyerName || currentUser?.fullName || '',
                                buyerPhone: (c as any).buyerPhone || (c as any).buyer_phone || profilePhone || currentUser?.phone || '',
                                buyerAddress: (c as any).resolved_buyer_address || (c as any).buyerAddress || (c as any).deliveryAddress || (c as any).delivery_address || profileAddress || currentUser?.address || '',
                                farmerName: (c as any).farmerCompany || (c as any).farmer_company || c.farmName || (c as any).farmerName || '',
                                farmerCompany: (c as any).farmerCompany || (c as any).farmer_company || c.farmName || (c as any).farmerName || '',
                                farmerRepresentative: (c as any).farmerName || (c as any).farmer_name || c.farmName || '',
                                farmerPhone: (c as any).farmerPhone || (c as any).farmer_phone || '',
                                farmerAddress: (c as any).farmerAddress || (c as any).farmer_address || (c as any).farmPickupAddress || '',
                                farmerPuc: (c as any).farmer_puc_code || (c as any).puc_code || (c as any).pucCode || '',
                                quantityKg: c.quantity,
                                unitPrice: c.unitPrice,
                                totalAmount: effectiveTotal,
                                goodsAmount: goodsAmount,
                                shippingOption: shippingOpt,
                                shippingFee: shippingFee,
                                depositAmount: depositAmt,
                                remainingAmount: Math.max(0, effectiveTotal - depositAmt),
                                depositStatus: c.depositStatus,
                                isDepositPaid: Boolean((c as any).isDepositPaid || (c as any).depositStatus === 'DEPOSIT_PAID' || (c as any).depositStatus === 'PAID' || (c as any).status === 'DEPOSIT_PAID' || (c as any).status === 'ACTIVE'),
                                status: (c as any).status,
                                deliveryAddress: (c as any).resolved_buyer_address || (c as any).deliveryAddress || (c as any).delivery_address || profileAddress || currentUser?.address || c.hubName || '',
                                deliveryTimeSlot: c.hubDeliveryDate,
                                createdAt: c.createdAt,
                                actualHarvestWeightKg: (c as any).actualHarvestWeightKg || c.quantity,
                                packageCount: (c as any).packageCount,
                                packageType: (c as any).packageType,
                                farmPickupAddress: (c as any).farmPickupAddress,
                                harvestNotes: (c as any).notes || (c as any).harvestNotes,
                                harvestProofImageUrl: (c as any).harvestProofImageUrl,
                                grade1Ratio: (c as any).grade1Ratio,
                                isHarvestDone: Boolean((c as any).isHarvestDone || ((c.fulfillmentStep ?? 0) >= 2)),
                                packagingApproved: Boolean((c as any).packagingApproved || (c as any).packaging_approved || (c as any).status === 'PACKAGING_APPROVED'),
                                packaging_approved: Boolean((c as any).packagingApproved || (c as any).packaging_approved || (c as any).status === 'PACKAGING_APPROVED'),
                                qrCodeData: (c as any).qrCodeData,
                              });
                            }}
                            className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#10542C] font-bold border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Xem Hợp Đồng B2B</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTrackingContractCode(c.contractCode);
                              setIsTrackingModalOpen(true);
                            }}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors flex items-center gap-1"
                          >
                            <span>Xem chi tiết</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pagination
                  currentPage={safeContractsPage}
                  totalPages={totalContractPages}
                  totalItems={filteredBuyerContracts.length}
                  pageSize={BUYER_CONTRACTS_PAGE_SIZE}
                  onPageChange={setContractsPage}
                  scrollTargetId="buyer-contracts-list"
                  itemLabel="hợp đồng"
                />
                </>
                );
              })()}
            </div>
          )}

          {/* ==================== TAB 5: CHUYẾN XE ĐANG GIAO (SHIPMENTS) ==================== */}
          {activeTab === 'shipments' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-heading font-black text-lg text-[#10542C]">Điều Phối Giao & Hoàn Tất Đơn Hàng</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Giám sát xuyên suốt từ lúc xuất kho, chuỗi lạnh, ePOD đến thanh toán và nhận hàng hoàn tất
                </p>
              </div>

              {/* Bản đồ Goong Maps lộ trình xe lạnh */}
              <GoongMapViewer
                title="Bản Đồ Lộ Trình Xe Lạnh Chở Nông Sản Về Kho"
                origin={{
                  lat: 11.9404,
                  lng: 108.4583,
                  name: selectedDeliveryStop?.hubName || 'Trạm Tiếp Nhận Nông Sản Đức Trọng, Lâm Đồng',
                }}
                destination={{
                  lat: 10.8499,
                  lng: 106.7725,
                  name: selectedDeliveryStop?.deliveryAddressSnapshot || profileWarehouse || 'Kho Tiếp Nhận Nông Sản Thủ Đức, TP.HCM',
                }}
                truckCode={selectedDeliveryStop?.vehiclePlate || 'Chưa phân xe'}
                temperature={deliveryTelemetry[0]?.temperature || 4.2}
                statusBadge={selectedDeliveryStop ? `Trạng thái: ${selectedDeliveryStop.status}` : 'Chưa có chuyến giao'}
                height={340}
              />

              {selectedDeliveryStop && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chuyến đang theo dõi</p>
                    <p className="mt-1 font-mono font-bold text-[#10542C]">{selectedDeliveryStop.tripCode || `STOP-${selectedDeliveryStop.id}`}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Xe {selectedDeliveryStop.vehiclePlate || 'chưa cập nhật'} · {selectedDeliveryStop.driverName || 'Chưa cập nhật tài xế'}</p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${deliveryTelemetry[0]?.alert ? 'border-rose-300 bg-rose-50' : 'border-emerald-200 bg-emerald-50/50'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Chuỗi lạnh gần nhất</p>
                    <p className={`mt-1 text-xl font-black ${deliveryTelemetry[0]?.alert ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {telemetryLoading ? 'Đang tải...' : deliveryTelemetry.length > 0 ? `${deliveryTelemetry[0].temperature.toFixed(1)}°C` : 'Chưa có dữ liệu'}
                    </p>
                    <p className="text-[11px] text-slate-500">{deliveryTelemetry.length > 0 ? `Độ ẩm ${deliveryTelemetry[0].humidity.toFixed(0)}% · cập nhật mỗi 10 giây` : 'Thiết bị chưa gửi telemetry cho chuyến này'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nhận hàng & ePOD</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {selectedDeliveryStop.status === 'BUYER_CONFIRMED' ? 'Đã kiểm đếm và ký nhận' : selectedDeliveryStop.status === 'PENDING_BUYER_CONFIRMATION' ? 'Chờ Buyer ký nhận' : selectedDeliveryStop.status === 'ARRIVED' ? 'Xe đã đến kho' : 'Đang vận chuyển'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Q4: {Number(selectedDeliveryStop.actualDeliveredWeightKg || selectedDeliveryStop.expectedWeightKg).toLocaleString()} kg</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thanh toán cuối</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {selectedDeliveryStop.contract?.status === 'SETTLED' ? 'Đã thanh toán & hoàn tất' : selectedDeliveryStop.status === 'BUYER_CONFIRMED' ? 'Sẵn sàng thanh toán' : 'Chờ ký nhận ePOD'}
                    </p>
                    {selectedDeliveryStop.status === 'BUYER_CONFIRMED' && selectedDeliveryStop.contract?.status !== 'SETTLED' && (
                      <button
                        type="button"
                        onClick={() => void openFinalPayment({ ...selectedDeliveryStop.contract, id: selectedDeliveryStop.contractId, contractCode: selectedDeliveryStop.contractCode })}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-[#10542C] text-white text-[11px] font-bold hover:bg-[#0C3E20]"
                      >
                        Thanh toán phần còn lại
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Banner các biên bản ePOD cần Buyer ký xác nhận ngay */}
              {outboundStops.some((s) => s.status === 'PENDING_BUYER_CONFIRMATION' || s.status === 'ARRIVED') && (
                <div className="bg-amber-50 rounded-3xl p-5 border-2 border-amber-300 shadow-md space-y-3">
                  <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce" />
                    <span>Có chuyến hàng đã giao đến kho đang chờ bạn kiểm tra & ký xác nhận biên bản ePOD!</span>
                  </div>
                  <div className="space-y-2.5">
                    {outboundStops
                      .filter((s) => s.status === 'PENDING_BUYER_CONFIRMATION' || s.status === 'ARRIVED')
                      .map((s) => (
                        <div
                          key={`pending-epod-${s.id}`}
                          className="p-4 bg-white rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-700">{s.contractCode || `HĐ #${s.contractId}`}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                                {s.status === 'PENDING_BUYER_CONFIRMATION' ? 'ĐÃ NỘP BIÊN BẢN ePOD' : 'XE ĐÃ ĐẾN KHO'}
                              </span>
                            </div>
                            <p className="text-slate-800 font-medium">{s.deliveryAddressSnapshot}</p>
                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 pt-1">
                              <span>Dự kiến: <strong>{Number(s.expectedWeightKg).toLocaleString()} kg</strong></span>
                              {s.actualDeliveredWeightKg != null && (
                                <span>Thực giao (Q4): <strong className="text-emerald-700">{Number(s.actualDeliveredWeightKg).toLocaleString()} kg</strong></span>
                              )}
                              {Number(s.rejectedWeightKg || 0) > 0 && (
                                <span className="text-rose-600 font-bold">
                                  Hư hao/Từ chối: {Number(s.rejectedWeightKg).toLocaleString()} kg ({s.rejectionReason})
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openConfirmEpodModal(s)}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                          >
                            <FileCheck2 className="w-4 h-4" />
                            <span>Ký Xác Nhận ePOD (Chốt Q4)</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Danh sách các chuyến giao hàng Outbound thực tế */}
              <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0F2ED] pb-3">
                  <h4 className="font-heading font-bold text-sm text-[#2C3E2E] flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#10542C]" />
                    <span>Lịch Sử Giao Hàng & Biên Bản Điện Tử (ePOD)</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    {outboundStops.length > 0 ? `${outboundStops.length} chuyến giao` : `${syncContracts.length} đơn hàng`}
                  </span>
                </div>

                <div className="space-y-3">
                  {outboundStops.length > 0 ? (
                    outboundStops.map((s, idx) => {
                      const isConfirmed = s.status === 'BUYER_CONFIRMED';
                      const isPending = s.status === 'PENDING_BUYER_CONFIRMATION' || s.status === 'ARRIVED';

                      return (
                        <div
                          key={`outbound-stop-${s.id}-${idx}`}
                          onClick={() => setSelectedDeliveryStopId(s.id)}
                          className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer ${
                            isConfirmed
                              ? 'bg-emerald-50/30 border-emerald-200'
                              : isPending
                              ? 'bg-amber-50/30 border-amber-200 shadow-xs'
                              : 'bg-[#F9FAF8] border-[#EAECE8]'
                          } ${selectedDeliveryStopId === s.id ? 'ring-2 ring-[#10542C]/40 border-[#10542C]' : ''}`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#10542C]">{s.contractCode || `HĐ #${s.contractId}`}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                  isConfirmed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isPending
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {isConfirmed
                                  ? 'ĐÃ KÝ NHẬN HOÀN TẤT'
                                  : isPending
                                  ? 'CHỜ KÝ BIÊN BẢN'
                                  : s.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600">Địa chỉ: {s.deliveryAddressSnapshot}</p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                              <span>Kế hoạch: <strong>{Number(s.expectedWeightKg).toLocaleString()} kg</strong></span>
                              {s.actualDeliveredWeightKg != null && (
                                <span>Thực giao (Q4): <strong className="text-emerald-700">{Number(s.actualDeliveredWeightKg).toLocaleString()} kg</strong></span>
                              )}
                              {isConfirmed && s.buyerSignerName && (
                                <span className="text-emerald-800">Người ký nhận: <strong>{s.buyerSignerName}</strong></span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => openConfirmEpodModal(s)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                              >
                                <FileCheck2 className="w-3.5 h-3.5" />
                                <span>Ký Nhận ePOD</span>
                              </button>
                            )}
                            {isConfirmed && (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Đã Chốt Q4</span>
                              </span>
                            )}
                            {isConfirmed && s.contract?.status !== 'SETTLED' && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void openFinalPayment({ ...s.contract, id: s.contractId, contractCode: s.contractCode });
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold text-xs flex items-center gap-1.5"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Thanh toán & hoàn tất</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    syncContracts.map((c, idx) => (
                      <div
                        key={`sync-contract-${c.contractCode || c.id}-${idx}`}
                        className="p-4 rounded-2xl bg-[#F9FAF8] border border-[#EAECE8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-[#10542C]">{c.contractCode}</span> ·{' '}
                          <strong className="text-[#2C3E2E]">{c.productName}</strong>
                          <p className="text-[11px] text-[#6B7280]">
                            Phương tiện: <strong>{c.truckLicensePlate || '49C-123.45'}</strong> · Tài xế:{' '}
                            {c.truckDriverName || 'Nguyễn Văn Tài'} ({c.truckDriverPhone || '0909.112.233'})
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            Địa chỉ giao: {c.deliveryAddress || profileWarehouse || 'Kho nông sản bên mua'}
                          </p>
                        </div>

                        <div className="shrink-0">
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px]">
                            {c.fulfillmentStatusName || 'Đang vận chuyển giữ tươi'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: KHIẾU NẠI & BỒI THƯỜNG ==================== */}
          {activeTab === 'claims' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-heading font-black text-lg text-[#10542C]">Khiếu Nại Giao Nhận & Bồi Thường</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">Gửi biên bản khi hàng đang giao hoặc sau khi nhận; theo dõi quyết định và mã hoàn tiền/bồi thường từ Admin.</p>
              </div>

              <form onSubmit={handleCreateClaim} className="bg-white rounded-3xl p-6 border border-rose-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-rose-800 font-black text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Lập khiếu nại mới</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <label className="space-y-1.5">
                    <span className="font-bold text-slate-700">Hợp đồng liên quan *</span>
                    <select
                      required
                      value={claimContractId || ''}
                      onChange={(event) => setClaimContractId(Number(event.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <option value="">Chọn hợp đồng đang giao/đã nhận</option>
                      {contracts
                        .filter((contract) => ['IN_TRANSIT', 'DELIVERED'].includes(String((contract as any).status || '').toUpperCase()))
                        .map((contract) => (
                          <option key={contract.id} value={contract.id}>{contract.contractCode} · {contract.productName}</option>
                        ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="font-bold text-slate-700">Khối lượng ảnh hưởng (kg) *</span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={claimDamagedWeight}
                      onChange={(event) => setClaimDamagedWeight(event.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1.5 md:col-span-1">
                    <span className="font-bold text-slate-700">Mô tả sự cố *</span>
                    <input
                      required
                      value={claimCause}
                      onChange={(event) => setClaimCause(event.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-500">Mỗi hợp đồng chỉ có một khiếu nại mở. Khiếu nại mở sẽ khóa thanh toán/giải ngân cuối.</p>
                  <button disabled={claimSubmitting} type="submit" className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold disabled:opacity-50">
                    {claimSubmitting ? 'Đang gửi...' : 'Gửi khiếu nại'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {buyerClaims.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm text-slate-500">Bạn chưa có khiếu nại nào.</div>
                ) : buyerClaims.map((claim) => {
                  const resolved = claim.status !== 'OPEN';
                  return (
                    <div key={claim.id} className={`bg-white rounded-3xl border p-5 shadow-xs space-y-3 ${resolved ? 'border-emerald-200' : 'border-rose-200'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#10542C]">{claim.claimCode}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${claim.status === 'OPEN' ? 'bg-rose-100 text-rose-800' : claim.status === 'DISMISSED' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>{claim.status}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{claim.contractCode} · {claim.productName}</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="text-slate-500">Giá trị yêu cầu</p>
                          <strong className="text-rose-700">{formatVND(claim.compensationAmount)}</strong>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3 text-xs">
                        <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-500 block">Khối lượng ảnh hưởng</span><strong>{claim.damagedWeightKg.toLocaleString()} kg</strong></div>
                        <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2"><span className="text-slate-500 block">Nội dung</span><strong>{claim.cause}</strong></div>
                      </div>
                      {(claim.resolutionNote || claim.resolutionRef) && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
                          <strong>Kết quả xử lý:</strong> {claim.resolutionNote || 'Đã xử lý'} {claim.resolutionRef ? `· Mã tham chiếu: ${claim.resolutionRef}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== TAB 6: HỒ SƠ THƯƠNG LÁI & KHO (PROFILE) ==================== */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-[#EAECE8] shadow-xs space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-heading font-black text-lg text-[#10542C]">Hồ Sơ Doanh Nghiệp & Kho Tiếp Nhận</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Thông tin này sẽ được tự động điền sẵn khi bạn gửi đơn đàm phán giá sỉ hoặc lập hợp đồng
                </p>
              </div>

              {profileSaved && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Đã lưu thông tin hồ sơ thương lái thành công!</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên Đơn Vị / Công Ty Thu Mua:</label>
                  <input
                    type="text"
                    required
                    value={profileCompany}
                    onChange={(e) => setProfileCompany(e.target.value)}
                    placeholder="VD: Công Ty Nông Sản Sài Gòn / Vựa Rau Củ Quả"
                    className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl font-bold text-[#10542C] focus:outline-none focus:border-[#10542C]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số Điện Thoại Điều Phối:</label>
                    <input
                      type="tel"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="09xx.xxx.xxx"
                      className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#10542C]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Địa Chỉ Doanh Nghiệp:</label>
                    <input
                      type="text"
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder="Số nhà, đường, phường, quận..."
                      className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#10542C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Địa Chỉ Kho / Điểm Tiếp Nhận Thực Tế (Gợi ý Goong Maps):
                  </label>
                  <AddressAutocomplete
                    value={profileWarehouse}
                    onChange={(val) => setProfileWarehouse(val)}
                    onSelectAddress={(data) => {
                      if (data.address) setProfileWarehouse(data.address);
                    }}
                    placeholder="Nhập số nhà, tên đường, kho bãi thực tế ngoài đời..."
                    showCurrentLocationBtn={true}
                    className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl font-bold text-[#10542C] focus:outline-none focus:border-[#10542C]"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Địa chỉ thực tế ngoài đời thực để hệ thống Goong Maps tự động tính toán lộ trình và chi phí xe tải lạnh chính xác.
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md"
                  >
                    Lưu Thông Tin Hồ Sơ
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          3. CÁC CỬA SỔ MODAL (ĐÀM PHÁN & THANH TOÁN VIETQR)
      ========================================================================= */}
      {/* Modal Đàm Phán Báo Giá Sỉ (Đã tự động điền thông tin tài khoản) */}
      {negotiatingProduct && (
        <B2BNegotiationModal
          product={negotiatingProduct}
          isOpen={!!negotiatingProduct}
          onClose={() => setNegotiatingProduct(null)}
          onSuccess={() => {
            setNegotiatingProduct(null);
            void loadAllData();
            setActiveTab('negotiations');
          }}
        />
      )}

      {/* Modal Quét Mã VietQR SePay Đặt Cọc 30% Hợp Đồng */}
      {selectedContractForPayment && (
        <SepayPaymentModal
          isOpen={!!selectedContractForPayment}
          onClose={() => setSelectedContractForPayment(null)}
          type="CONTRACT"
          code={String(selectedContractForPayment.contractCode || `HD-${selectedContractForPayment.id}`)}
          amount={Number(selectedContractForPayment.depositAmount || 0)}
          title="Quét Mã VietQR Nộp Cọc 30% Hợp Đồng"
          recipientName={currentUser?.fullName || 'Thương Lái'}
          onManualConfirm={() => confirmDeposit(selectedContractForPayment)}
          onSuccess={() => {
            setSelectedContractForPayment(null);
            void loadAllData();
            setNotification('Đã xác nhận nộp cọc 30% bảo chứng thành công!');
          }}
        />
      )}

      {/* Modal Quét Mã VietQR SePay Quyết Toán 70% Hợp Đồng */}
      {selectedContractForFinalPayment && (
        <SepayPaymentModal
          isOpen={!!selectedContractForFinalPayment}
          onClose={() => setSelectedContractForFinalPayment(null)}
          type="FINAL_PAYMENT"
          code={String(selectedContractForFinalPayment.contractCode || `HD-${selectedContractForFinalPayment.id}`)}
          amount={Number(selectedContractForFinalPayment.remainingAmount || Math.round((selectedContractForFinalPayment.totalAmount || 0) * 0.7))}
          title="Quét Mã VietQR Thanh Toán 70% Quyết Toán Hợp Đồng"
          recipientName={currentUser?.fullName || 'Thương Lái'}
          onManualConfirm={() => confirmFinalPayment(selectedContractForFinalPayment)}
          onSuccess={() => {
            setSelectedContractForFinalPayment(null);
            void loadAllData();
          }}
        />
      )}

      {/* Modal Ký Nhận Bàn Giao Điện Tử (ePOD) dành cho Buyer */}
      {activeEpodModalStop && (
        <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm text-[#10542C]">Ký Nhận Bàn Giao Hàng Hóa (ePOD)</h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    Hợp đồng: {activeEpodModalStop.contractCode || `#${activeEpodModalStop.contractId}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveEpodModalStop(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmEpod} className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Khối lượng kế hoạch tại trạm Hub:</span>
                  <strong className="text-slate-900">{Number(activeEpodModalStop.expectedWeightKg).toLocaleString()} kg</strong>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Khối lượng tài xế giao thực tế (Q4):</span>
                  <strong className="text-emerald-700 text-sm font-black">
                    {Number(activeEpodModalStop.actualDeliveredWeightKg || activeEpodModalStop.expectedWeightKg).toLocaleString()} kg
                  </strong>
                </div>
                {Number(activeEpodModalStop.rejectedWeightKg || 0) > 0 && (
                  <div className="flex justify-between items-center text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 font-bold">
                    <span>Hư hao/Từ chối:</span>
                    <span>{Number(activeEpodModalStop.rejectedWeightKg).toLocaleString()} kg ({activeEpodModalStop.rejectionReason})</span>
                  </div>
                )}
                {activeEpodModalStop.handoverPhotoUrl && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Ảnh chụp bàn giao giữa Tài xế & Người mua:
                    </span>
                    <img
                      src={activeEpodModalStop.handoverPhotoUrl}
                      alt="Ảnh bàn giao thực tế"
                      className="max-h-40 w-full object-cover rounded-xl border border-slate-200"
                    />
                  </div>
                )}
                {activeEpodModalStop.driverSignatureData &&
                  activeEpodModalStop.driverSignatureData.startsWith('data:image/') && (
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Chữ ký người giao (Tài xế):
                      </span>
                      <img
                        src={activeEpodModalStop.driverSignatureData}
                        alt="Chữ ký tài xế"
                        className="max-h-20 bg-white rounded-xl border border-slate-200 p-1"
                      />
                    </div>
                  )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Họ tên người nhận hàng tại kho <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={buyerSignerName}
                  onChange={(e) => setBuyerSignerName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Thắng (Quản lý kho Thủ Đức)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Số điện thoại người nhận <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={buyerSignerPhone}
                  onChange={(e) => setBuyerSignerPhone(e.target.value)}
                  placeholder="VD: 0912.345.678"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Chữ ký xác nhận của Người mua (Buyer) <span className="text-rose-500">*</span>
                </label>
                <SignaturePad onChange={setBuyerSignatureData} />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú nhận hàng (nếu có)</label>
                <textarea
                  rows={2}
                  value={buyerNotes}
                  onChange={(e) => setBuyerNotes(e.target.value)}
                  placeholder="Hàng tươi ngon đạt chuẩn, nhiệt độ thùng lạnh đo được lúc dỡ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveEpodModalStop(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={confirmingEpod}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>{confirmingEpod ? 'Đang xác nhận...' : 'Ký Xác Nhận Hoàn Tất ePOD'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Toàn Văn Hợp Đồng B2B Điện Tử */}
      <B2bContractViewModal
        isOpen={Boolean(viewingContract)}
        contract={viewingContract}
        role="BUYER"
        onClose={() => setViewingContract(null)}
        onBuyerPayDeposit={(contract) => {
          setViewingContract(null);
          const target = contracts.find((item) => item.id === contract.id || item.contractCode === contract.contractCode);
          if (target) {
            setSelectedContractForPayment(target);
          }
        }}
      />

      {/* Chi tiết hợp đồng dùng chung trung tâm tracking hiện tại, không chuyển sang giao diện cũ */}
      <OrderTrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        defaultQuery={trackingContractCode}
        initialContracts={contracts}
      />

      {/* =========================================================================
          4. CÁC MODAL BỔ SUNG: XEM / SỬA / HỦY RFQ & ĐIỀU PHỐI XE LẠNH HONA FRESH
      ========================================================================= */}

      {/* 4.1. Modal Xem Chi Tiết Đơn Đàm Phán RFQ */}
      {viewingRfqDetail && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl sm:max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Chi Tiết Báo Giá</span>
                <h3 className="font-heading font-black text-lg text-[#10542C]">{viewingRfqDetail.rfqCode}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRfqDetail(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Nông Sản Đàm Phán</span>
                <strong className="text-base font-bold text-gray-900 block">{viewingRfqDetail.productName}</strong>
                <p className="text-gray-600 text-xs">
                  Mã lô: <span className="font-mono font-bold text-slate-800">{viewingRfqDetail.lotCode}</span> • Nhà vườn: <strong>{viewingRfqDetail.farmerName || 'HTX Nông Nghiệp'}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 font-semibold block">Khối lượng mua:</span>
                  <strong className="text-base font-black text-gray-900 font-mono">
                    {(viewingRfqDetail.requestedQuantityKg || 0).toLocaleString()} kg
                  </strong>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 font-semibold block">Giá bạn đề xuất:</span>
                  <strong className="text-base font-black text-[#10542C] font-mono">
                    {formatVND(viewingRfqDetail.targetPricePerKg)}/kg
                  </strong>
                </div>
              </div>

              {Boolean(viewingRfqDetail.counterPricePerKg) && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 font-semibold block">Nhà vườn phản hồi mức giá:</span>
                  <strong className="text-base font-black text-amber-900 font-mono">
                    {formatVND(viewingRfqDetail.counterPricePerKg!)}/kg
                  </strong>
                </div>
              )}

              <div className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 leading-relaxed">
                <div className="flex justify-between items-center py-0.5 border-b border-gray-100/80 pb-1.5">
                  <span className="text-gray-500">Trạng thái:</span>
                  {(() => {
                    const meta = formatStatusVi(viewingRfqDetail.status);
                    return <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${meta.badgeClass}`}>{meta.label}</span>;
                  })()}
                </div>
                <div className="flex justify-between items-start gap-3 py-1 border-b border-gray-100/80 pb-1.5">
                  <span className="text-gray-500 shrink-0">Phương thức vận chuyển:</span>
                  <span className="text-[#10542C] font-bold text-right text-xs">
                    {getShippingMethodLabel(viewingRfqDetail.shippingOption).title}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3 py-1 border-b border-gray-100/80 pb-1.5">
                  <span className="text-gray-500 shrink-0">Địa chỉ kho nhận hàng:</span>
                  <span className="text-gray-900 font-semibold text-right text-xs break-words max-w-[70%]">
                    {viewingRfqDetail.deliveryLocation}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500">Ngày giao mong muốn:</span>
                  <strong className="text-gray-800 font-mono text-xs">{formatDateVi(viewingRfqDetail.desiredDeliveryDate)}</strong>
                </div>
                {viewingRfqDetail.notes && (
                  <div className="pt-2 border-t border-gray-200 mt-1">
                    <span className="text-gray-500 block font-semibold mb-0.5">Ghi chú từ bên mua:</span>
                    <p className="text-gray-700 italic bg-white p-2.5 rounded-xl border border-gray-100">{viewingRfqDetail.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setViewingRfqDetail(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition cursor-pointer text-xs"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewingRfqDetail;
                  setViewingRfqDetail(null);
                  setActiveChatRfq(target);
                }}
                className="flex-1 py-3 bg-[#10542C] hover:bg-[#0c3e20] text-white font-bold rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-emerald-200" />
                <span>Nhắn Tin Với Nhà Vườn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.2. Modal Chỉnh Sửa Đơn Đàm Phán RFQ (Nâng cấp đầy đủ Cố vấn giá sỉ, Goong Maps & Logistics như Modal Đàm Phán) */}
      {editingRfqDetail && editingProduct && (
        <B2BNegotiationModal
          product={editingProduct}
          editingRfq={editingRfqDetail}
          isOpen={!!editingRfqDetail}
          onClose={() => setEditingRfqDetail(null)}
          onSuccess={() => {
            setEditingRfqDetail(null);
            void loadAllData();
            setNotification('Cập nhật đơn đàm phán thành công!');
            setTimeout(() => setNotification(null), 3000);
          }}
        />
      )}

      {/* 4.3. Modal Xác Nhận Hủy Đơn Đàm Phán RFQ */}
      {cancellingRfqId !== null && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base text-gray-900">Xác Nhận Hủy Đàm Phán</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Bạn có chắc chắn muốn hủy yêu cầu đàm phán giá này không? Thao tác này sẽ ngừng phiên thương lượng với nhà vườn.
              </p>
            </div>
            <div className="flex gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setCancellingRfqId(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCancelRfq(cancellingRfqId)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition cursor-pointer shadow-md"
              >
                Đồng ý hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.4. Modal Điều Phối Xe Lạnh HoNa Fresh Sau Khi Farm Đóng Gói */}
      {dispatchingContract && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">Phương Án 3 · Tự Điều Xe Đến Kho HoNa</span>
                <h3 className="font-heading font-black text-base text-[#10542C]">
                  Đăng Ký Xe Lấy Hàng · {dispatchingContract.contractCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDispatchingContract(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs space-y-1">
              <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">Lô hàng đã đạt QC tại Kho HoNa</span>
              <strong className="text-sm font-bold text-gray-900 block">{dispatchingContract.productName}</strong>
              <div className="flex justify-between text-blue-900 pt-1 border-t border-blue-200/60">
                <span>Khối lượng cần bốc tại kho:</span>
                <b className="font-mono">{((dispatchingContract.quantity || dispatchingContract.quantityKg) ?? 0).toLocaleString()} kg</b>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Biển số xe của thương lái *</label>
                <input
                  type="text"
                  value={pa3TruckPlate}
                  onChange={(e) => setPa3TruckPlate(e.target.value)}
                  placeholder="Ví dụ: 51C-889.99"
                  className="w-full px-3 py-2.5 border rounded-xl font-mono font-bold text-gray-900 bg-[#F9FAF8] focus:outline-none focus:border-[#10542C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tên tài xế *</label>
                  <input
                    type="text"
                    value={pa3DriverName}
                    onChange={(e) => setPa3DriverName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full px-3 py-2.5 border rounded-xl font-semibold text-gray-900 bg-[#F9FAF8] focus:outline-none focus:border-[#10542C]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">SĐT tài xế *</label>
                  <input
                    type="text"
                    value={pa3DriverPhone}
                    onChange={(e) => setPa3DriverPhone(e.target.value)}
                    placeholder="Ví dụ: 0909123456"
                    className="w-full px-3 py-2.5 border rounded-xl font-mono font-semibold text-gray-900 bg-[#F9FAF8] focus:outline-none focus:border-[#10542C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Thời gian dự kiến đến kho</label>
                  <input
                    type="text"
                    value={pa3EtaText}
                    onChange={(e) => setPa3EtaText(e.target.value)}
                    placeholder="Ví dụ: 14:30 hôm nay"
                    className="w-full px-3 py-2 border rounded-xl text-gray-800 bg-[#F9FAF8] focus:outline-none focus:border-[#10542C]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Ghi chú cổng kho</label>
                  <input
                    type="text"
                    value={pa3Notes}
                    onChange={(e) => setPa3Notes(e.target.value)}
                    placeholder="Ví dụ: Xe tải lạnh 2.5 tấn"
                    className="w-full px-3 py-2 border rounded-xl text-gray-800 bg-[#F9FAF8] focus:outline-none focus:border-[#10542C]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setDispatchingContract(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submittingPa3Dispatch}
                onClick={() => void handleConfirmDispatchTruck()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Truck className="w-4 h-4 text-white" />
                <span>{submittingPa3Dispatch ? 'Đang gửi thông tin...' : 'Xác Nhận Điều Xe Đến Kho'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================= MODAL: CHAT REALTIME B2B ĐÀM PHÁN ================= */}
      <B2BChatModal
        isOpen={Boolean(activeChatRfq)}
        onClose={() => {
          if (activeChatRfq?.rfqCode) {
            markChatAsRead(activeChatRfq.rfqCode);
          }
          setActiveChatRfq(null);
        }}
        rfq={activeChatRfq ? {
          id: activeChatRfq.id,
          rfqCode: activeChatRfq.rfqCode,
          productName: activeChatRfq.productName,
          harvestLotCode: (activeChatRfq as any).harvestLotCode,
          targetPrice: (activeChatRfq as any).proposedPricePerKg || (activeChatRfq as any).targetPrice || activeChatRfq.targetPricePerKg,
          requestedQuantity: activeChatRfq.requestedQuantityKg,
          buyerName: currentUser?.fullName || 'Thương Lái Mua Sỉ',
          buyerCompany: currentUser?.companyName || 'Công Ty Thu Mua Sỉ',
          farmerName: (activeChatRfq as any).farmerName || 'Nhà Vườn VietGAP',
          farmerCompany: (activeChatRfq as any).farmerCompany || 'HTX Nông Nghiệp',
          status: activeChatRfq.status,
        } : null}
        currentUser={{
          id: currentUser?.id || 1,
          name: currentUser?.companyName || currentUser?.fullName || 'Thương Lái Mua Sỉ',
          role: 'BUYER',
        }}
      />
      {/* Modal Bản đồ Theo dõi Đường đi GPS Tài xế */}
      {liveTrackingContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Theo Dõi Lộ Trình Giao Hàng GPS — {liveTrackingContract.contractCode}
                </h3>
                <p className="text-xs text-slate-500">
                  Vị trí GPS xe tải lạnh được đồng bộ trực tiếp từ chuyến xe giao hàng HoNa Express
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLiveTrackingContract(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ContractLiveTrackingMap contract={liveTrackingContract} height={380} />
          </div>
        </div>
      )}

      {/* Modal Xem & In Biên Bản Giao Nhận Hàng Hóa (ePOD 2 bên) */}
      <DeliveryReceiptModal stop={viewingReceiptStop} onClose={() => setViewingReceiptStop(null)} />
    </div>
  );
}

