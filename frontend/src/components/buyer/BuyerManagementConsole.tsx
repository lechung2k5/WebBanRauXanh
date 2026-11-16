'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { api } from '@/services/auth';
import {
  getBuyerB2bContractsApi,
  getBuyerRfqsApi,
  respondBuyerRfqApi,
  updateBuyerRfqApi,
  cancelBuyerRfqApi,
  getStoredUser,
  getProducts,
  confirmBuyerDepositApi,
} from '@/services/api';
import { updateContractFulfillmentStatusApi } from '@/services/farmerApi';
import { formatDateVi, formatStatusVi } from '@/utils/formatters';
import { b2bWebSocket } from '@/services/websocketService';
import {
  B2bSyncContract,
  B2bSyncRfq,
  getSyncContracts,
  getSyncRfqs,
  subscribeB2bSyncEvents,
  buyerAcceptCounterRfq,
  buyerCounterRfq,
  buyerPayDeposit,
  removeLocalContractByCode,
} from '@/services/b2bSyncService';
import { B2BContract, Product } from '@/types';
import B2BNegotiationModal from '@/components/B2BNegotiationModal';
import { SepayPaymentModal } from '@/components/common/SepayPaymentModal';
import { GoongMapViewer } from '@/components/common/GoongMapViewer';
import OrderTrackingModal from '@/components/OrderTrackingModal';
import B2bContractViewModal, { B2bContractModalData } from '@/components/common/B2bContractViewModal';
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
  Filter,
  ArrowUpDown,
} from 'lucide-react';

type BuyerTab = 'overview' | 'catalog' | 'negotiations' | 'contracts' | 'shipments' | 'profile';

export default function BuyerManagementConsole() {
  const router = useRouter();
  const { currentUser, authLoading, logout, setCurrentUser } = useApp();

  const [activeTab, setActiveTab] = useState<BuyerTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Dữ liệu nghiệp vụ
  const [contracts, setContracts] = useState<B2BContract[]>([]);
  const [syncContracts, setSyncContracts] = useState<B2bSyncContract[]>([]);
  const [rfqs, setRfqs] = useState<B2bSyncRfq[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

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
  const [editingRfqDetail, setEditingRfqDetail] = useState<{
    id: number;
    rfqCode: string;
    productName: string;
    quantity: number;
    price: number;
    deliveryLocation: string;
    notes: string;
  } | null>(null);
  const [cancellingRfqId, setCancellingRfqId] = useState<number | null>(null);

  // Quản lý Điều Phối Xe Lạnh HoNa Fresh sau khi Farm đóng gói
  const [dispatchingContract, setDispatchingContract] = useState<any | null>(null);
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
      const [backendContracts, backendRfqs] = await Promise.all([
        getBuyerB2bContractsApi().catch(() => []),
        getBuyerRfqsApi().catch(() => []),
      ]);

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
      for (const sr of sharedRfqs) {
        const code = (sr.rfqCode || `RFQ-${sr.id || fallbackId}`).trim().toUpperCase();
        if (!rfqMap.has(code)) {
          let numId = typeof sr.id === 'number' ? sr.id : Number(sr.id);
          if (!numId || isNaN(numId) || seenIds.has(numId)) {
            numId = fallbackId++;
          }
          seenIds.add(numId);
          rfqMap.set(code, {
            id: numId,
            rfqCode: code,
            harvestLotId: sr.harvestLotId || 1,
            lotCode: sr.harvestLotCode || sr.lotCode || 'LOT-2026-DL-001',
            farmerId: sr.farmerId,
            farmerName: sr.farmerName || 'HTX Nông Nghiệp',
            productName: sr.productName || 'Lô nông sản',
            buyerName: sr.buyerName || '',
            buyerPhone: sr.buyerPhone || '',
            buyerCompany: sr.buyerCompany || '',
            requestedQuantityKg: Number(sr.requestedQuantity || sr.requestedQuantityKg || 1000),
            targetPricePerKg: Number(sr.targetPrice || sr.targetPricePerKg || 15000),
            counterPricePerKg: sr.counterPrice ?? undefined,
            desiredDeliveryDate: sr.deliveryDate || '',
            deliveryLocation: sr.deliveryLocation || '',
            shippingOption: sr.shippingOption || 'cold_storage_truck',
            notes: sr.notes,
            status: sr.status || 'WAITING_FARMER',
            createdAt: sr.createdAt || new Date().toISOString(),
            updatedAt: sr.updatedAt || new Date().toISOString(),
          });
        }
      }
      for (const l of localRfqs) {
        const code = (l.rfqCode || `RFQ-${l.id || fallbackId}`).trim().toUpperCase();
        if (!rfqMap.has(code)) {
          let numId = typeof l.id === 'number' ? l.id : Number(l.id);
          if (!numId || isNaN(numId) || seenIds.has(numId)) {
            numId = fallbackId++;
          }
          seenIds.add(numId);
          rfqMap.set(code, {
            ...l,
            id: numId,
            rfqCode: code,
          });
        }
      }

      const contractMap = new Map<string, B2BContract>();
      for (const bc of backendContracts) {
        if (bc.contractCode) contractMap.set(bc.contractCode.trim().toUpperCase(), bc);
      }
      for (const sc of sharedContracts) {
        const code = (sc.contractCode || `HD-${sc.id}`).trim().toUpperCase();
        if (!contractMap.has(code)) {
          contractMap.set(code, {
            id: Number(sc.id) || Date.now(),
            contractCode: sc.contractCode,
            rfqId: Number(sc.rfqId || sc.id),
            rfqCode: sc.rfqCode || `RFQ-${sc.id}`,
            harvestLotId: Number(sc.lotId || 1),
            lotCode: sc.lotCode || 'LOT-2026-DL-001',
            productName: sc.productName || 'Nông sản VietGAP',
            buyerName: sc.buyerName || '',
            buyerPhone: sc.buyerPhone || '',
            quantity: Number(sc.quantityKg || 1000),
            unitPrice: Number(sc.agreedPricePerKg || 15000),
            totalAmount: Number(sc.totalAmount || 0),
            depositAmount: Number(sc.depositAmount || 0),
            remainingAmount: Number(sc.remainingAmount || 0),
            depositStatus: sc.depositStatus || 'PENDING_DEPOSIT',
            fulfillmentStatus: sc.fulfillmentStep === 6 ? 'COMPLETED' : sc.fulfillmentStep >= 4 ? 'HUB_DELIVERED' : 'WAITING_HARVEST',
            hubDeliveryDate: sc.deliveryTimeSlot || (sc.createdAt ? sc.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
            hubName: sc.deliveryAddress || 'Trạm Trung Chuyển Đức Trọng',
            createdAt: sc.createdAt || new Date().toISOString(),
            hasQc: true,
            farmName: sc.farmerName || 'HTX Nông Nghiệp Đà Lạt GAP',
            farmerPhone: sc.farmerPhone || '0912345678',
            farmerAddress: '',
          });
        }
      }
      for (const lc of localContracts) {
        const code = (lc.contractCode || `HD-${lc.id}`).trim().toUpperCase();
        if (!contractMap.has(code)) {
          contractMap.set(code, {
            id: Number(lc.id),
            contractCode: lc.contractCode,
            rfqId: Number(lc.id),
            rfqCode: lc.rfqCode || `RFQ-${lc.id}`,
            harvestLotId: Number(lc.lotId || 1),
            lotCode: lc.lotCode,
            productName: lc.productName,
            buyerName: lc.buyerName,
            buyerPhone: lc.buyerPhone,
            quantity: lc.quantityKg,
            unitPrice: lc.agreedPricePerKg,
            totalAmount: lc.totalAmount,
            depositAmount: lc.depositAmount,
            remainingAmount: lc.remainingAmount,
            depositStatus: lc.depositStatus as any,
            fulfillmentStatus: lc.fulfillmentStep === 6 ? 'COMPLETED' : lc.fulfillmentStep >= 4 ? 'HUB_DELIVERED' : 'WAITING_HARVEST',
            hubDeliveryDate: lc.deliveryTimeSlot || (lc.createdAt ? lc.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
            hubName: lc.deliveryAddress,
            createdAt: lc.createdAt,
            hasQc: true,
            farmName: lc.farmerName || 'HTX Nông Nghiệp Đà Lạt GAP',
            farmerPhone: lc.farmerPhone || '0912345678',
            farmerAddress: '',
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
        fulfillmentStep: ac.fulfillmentStatus === 'COMPLETED' ? 6 : ac.fulfillmentStatus === 'HUB_DELIVERED' ? 4 : 1,
        fulfillmentStatusName: ac.fulfillmentStatus || 'Chờ Buyer Đặt Cọc 30% Escrow',
        truckLicensePlate: '49C-198.86 (Xe Thùng Lạnh)',
        truckDriverName: 'Tài xế Nguyễn Văn Tài',
        truckDriverPhone: '0944556677',
        truckTempCurrent: 4.0,
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
    window.addEventListener('storage', handleDataSync);
    window.addEventListener('focus', handleDataSync);
    window.addEventListener('b2b_lot_updated', handleCatalogSync);

    const handleVisibilityChange = () => {
      if (!document.hidden) void loadAllData();
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

    const unsubLots = b2bWebSocket.subscribeLots(() => {
      void loadCatalogData();
      void loadAllData();
    });

    const unsubscribe = subscribeB2bSyncEvents((event) => {
      // Nhận sự kiện thời gian thực từ kênh đồng bộ BroadcastChannel (cùng trình duyệt)
      void loadAllData();
      if (
        event.type === 'LOT_STATUS_UPDATED' ||
        event.type === 'LOT_CREATED' ||
        event.type === 'LOT_UPDATED'
      ) {
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
      unsubLots();
      unsubscribe();
      window.removeEventListener('b2b_sync_event', handleDataSync);
      window.removeEventListener('b2b_contract_updated', handleDataSync);
      window.removeEventListener('b2b_rfq_updated', handleDataSync);
      window.removeEventListener('storage', handleDataSync);
      window.removeEventListener('focus', handleDataSync);
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
      // RFQ tạo từ giao diện có thể có ID local khác ID backend, nhưng mã RFQ
      // là khóa dùng chung giữa hai kho dữ liệu.
      const localRfqKey = selectedRfq?.rfqCode || rfqId;
      let backendRfq: Awaited<ReturnType<typeof respondBuyerRfqApi>> | null = null;
      try {
        backendRfq = await respondBuyerRfqApi(rfqId, { action: 'ACCEPT' });
      } catch (e) {
        console.warn('Backend API accept notice:', e);
      }
      const acceptResult = buyerAcceptCounterRfq(localRfqKey, backendRfq ? {
        contractId: backendRfq.contractId,
        contractCode: backendRfq.contractCode,
        depositAmount: backendRfq.depositAmount,
        depositStatus: backendRfq.depositStatus,
      } : undefined);

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

      void loadAllData();
      setNotification('Bạn đã chấp nhận giá và tạo hợp đồng thành công!');
      setTimeout(() => setNotification(null), 3000);
    } catch {
      alert('Không thể hoàn tất chấp thuận đơn đàm phán.');
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

  // Xử lý chỉnh sửa đơn đàm phán RFQ
  const handleSaveEditRfq = async () => {
    if (!editingRfqDetail) return;
    try {
      await updateBuyerRfqApi(editingRfqDetail.id, {
        requestedQuantityKg: editingRfqDetail.quantity,
        targetPricePerKg: editingRfqDetail.price,
        deliveryLocation: editingRfqDetail.deliveryLocation,
        notes: editingRfqDetail.notes,
      });
      setRfqs((prev) =>
        prev.map((r) =>
          r.id === editingRfqDetail.id
            ? {
                ...r,
                requestedQuantityKg: editingRfqDetail.quantity,
                targetPricePerKg: editingRfqDetail.price,
                deliveryLocation: editingRfqDetail.deliveryLocation,
                notes: editingRfqDetail.notes,
              }
            : r
        )
      );
      setEditingRfqDetail(null);
      setNotification('Cập nhật đơn đàm phán thành công!');
      setTimeout(() => setNotification(null), 3000);
      void loadAllData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi cập nhật đàm phán');
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

  // Xử lý điều phối xe lạnh HoNa Fresh sau khi nhà vườn đóng gói (Mốc 2)
  const handleConfirmDispatchTruck = async () => {
    if (!dispatchingContract) return;
    try {
      await updateContractFulfillmentStatusApi(dispatchingContract.id, 'IN_TRANSIT');
      setNotification(`Đã điều phối xe ${selectedTruckPlate} đến nhận hàng thành công!`);
      setTimeout(() => setNotification(null), 4000);
      setDispatchingContract(null);
      void loadAllData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi điều phối xe');
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
      <aside className="w-full lg:w-72 lg:h-screen lg:sticky lg:top-0 bg-[#0F3820] text-white flex flex-col shrink-0 border-r border-[#1B4D2E] shadow-xl z-20">
        {/* Logo & Nhãn phân hệ */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8BC34A] to-[#4CAF50] flex items-center justify-center text-[#0F3820] font-black text-lg shadow-md">
              HF
            </div>
            <div>
              <h2 className="font-heading font-black text-base text-white tracking-tight">HoNa Fresh</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8BC34A] block">
                Cổng Thu Mua & Thương Lái
              </span>
            </div>
          </div>
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
              label: 'Hợp Đồng & Đặt Cọc',
              icon: FileText,
              badge: pendingDepositContracts.length,
            },
            {
              id: 'shipments',
              label: 'Chuyến Xe Đang Giao',
              icon: Truck,
              badge: inTransitContracts.length,
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
              {activeTab === 'contracts' && 'Hợp đồng & Đặt cọc'}
              {activeTab === 'shipments' && 'Theo dõi chuyến xe giao hàng'}
              {activeTab === 'profile' && 'Hồ sơ thương lái & kho tiếp nhận'}
            </strong>
          </div>

          <div className="flex items-center gap-3">
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

                            {/* Nút Chỉnh sửa & Hủy đàm phán */}
                            {['WAITING_FARMER', 'WAITING_BUYER', 'PENDING'].includes(rfq.status) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingRfqDetail({
                                      id: rfq.id,
                                      rfqCode: rfq.rfqCode,
                                      productName: rfq.productName,
                                      quantity: rfq.requestedQuantityKg,
                                      price: rfq.counterPricePerKg || rfq.targetPricePerKg,
                                      deliveryLocation: rfq.deliveryLocation || '',
                                      notes: rfq.notes || '',
                                    })
                                  }
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

          {/* ==================== TAB 4: HỢP ĐỒNG & ĐẶT CỌC ==================== */}
          {activeTab === 'contracts' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-heading font-black text-lg text-[#10542C]">Hợp Đồng Thu Mua & Đặt Cọc An Toàn</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Thanh toán cọc 30% bảo chứng tự động qua VietQR và theo dõi tiến độ giao hàng
                </p>
              </div>

              {contracts.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-[#EAECE8] text-xs text-[#6B7280]">
                  Chưa có hợp đồng nào được tạo. Khi bạn và nhà vườn thống nhất giá đàm phán, hợp đồng sẽ xuất hiện tại đây.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {contracts.map((c, idx) => {
                    const isPaid = c.depositStatus === 'DEPOSIT_PAID';
                    return (
                      <div
                        key={`contract-${c.contractCode || c.id}-${idx}`}
                        className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#10542C]">{c.contractCode}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isPaid ? 'Đã nộp cọc 30% bảo chứng' : 'Chờ nộp cọc 30%'}
                            </span>
                          </div>

                          <h4 className="font-heading font-bold text-base text-[#2C3E2E]">{c.productName}</h4>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-600">
                            <div>
                              <span>Khối lượng chốt: </span>
                              <strong className="text-slate-900">{(c.quantity || 0).toLocaleString()} kg</strong>
                            </div>
                            <div>
                              <span>Tổng giá trị hợp đồng: </span>
                              <strong className="text-[#10542C]">{formatVND(c.totalAmount || 0)}</strong>
                            </div>
                            <div>
                              <span>Tiền cọc 30%: </span>
                              <strong className="text-[#E53935]">{formatVND(c.depositAmount || 0)}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => setSelectedContractForPayment(c)}
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

                          {isPaid && ((c as any).fulfillmentStep === 2 || String(c.fulfillmentStatus) === 'PACKAGED' || c.fulfillmentStatus === 'WAITING_HARVEST') && (
                            <button
                              type="button"
                              onClick={() => setDispatchingContract(c as any)}
                              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer text-xs"
                              title="Điều phối xe lạnh HoNa Fresh đến nhà vườn bốc hàng"
                            >
                              <Truck className="w-3.5 h-3.5 text-white" />
                              <span>Điều Phối Xe Lạnh</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setViewingContract({
                                id: c.id,
                                contractCode: c.contractCode,
                                rfqCode: c.rfqCode,
                                lotCode: c.lotCode,
                                productName: c.productName,
                                buyerName: c.buyerName,
                                buyerCompany: c.buyerName,
                                farmerName: c.farmName,
                                farmerCompany: c.farmName,
                                farmerPhone: c.farmerPhone,
                                quantityKg: c.quantity,
                                unitPrice: c.unitPrice,
                                totalAmount: c.totalAmount,
                                depositAmount: c.depositAmount,
                                remainingAmount: c.remainingAmount,
                                depositStatus: c.depositStatus,
                                deliveryAddress: c.hubName,
                                deliveryTimeSlot: c.hubDeliveryDate,
                                createdAt: c.createdAt,
                              })
                            }
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
              )}
            </div>
          )}

          {/* ==================== TAB 5: CHUYẾN XE ĐANG GIAO (SHIPMENTS) ==================== */}
          {activeTab === 'shipments' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-heading font-black text-lg text-[#10542C]">Hành Trình Xe Tải Lạnh Giao Hàng</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Bản đồ lộ trình vận chuyển và phiếu ký nhận bàn giao nông sản tại kho
                </p>
              </div>

              {/* Bản đồ Goong Maps lộ trình xe lạnh */}
              <GoongMapViewer
                title="Bản Đồ Lộ Trình Xe Lạnh Chở Nông Sản Về Kho"
                origin={{
                  lat: 11.9404,
                  lng: 108.4583,
                  name: 'Trạm Tiếp Nhận Nông Sản Đức Trọng, Lâm Đồng',
                }}
                destination={{
                  lat: 10.8499,
                  lng: 106.7725,
                  name: profileWarehouse || 'Kho Tiếp Nhận Nông Sản Thủ Đức, TP.HCM',
                }}
                truckCode="49C-198.86 (Xe thùng lạnh)"
                temperature={4.2}
                statusBadge="Xe đang di chuyển an toàn"
                height={340}
              />

              {/* Danh sách các chuyến hàng */}
              <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
                <h4 className="font-heading font-bold text-sm text-[#2C3E2E] flex items-center gap-2 border-b border-[#F0F2ED] pb-3">
                  <FileCheck2 className="w-4 h-4 text-[#10542C]" />
                  <span>Phiếu Giao Nhận & Trạng Thái Xe Lạnh</span>
                </h4>

                <div className="space-y-3">
                  {syncContracts.map((c, idx) => (
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
                  ))}
                </div>
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
                    Địa Chỉ Kho Tiếp Nhận Hàng (Xe Tải Lạnh Giao Về):
                  </label>
                  <input
                    type="text"
                    required
                    value={profileWarehouse}
                    onChange={(e) => setProfileWarehouse(e.target.value)}
                    placeholder="VD: Cửa số 4, Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM"
                    className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl font-bold text-[#10542C] focus:outline-none focus:border-[#10542C]"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Địa chỉ này sẽ dùng để tính toán định tuyến lộ trình xe tải lạnh tự động.
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

      {/* Modal Xem Toàn Văn Hợp Đồng B2B Điện Tử */}
      <B2bContractViewModal
        isOpen={Boolean(viewingContract)}
        contract={viewingContract}
        onClose={() => setViewingContract(null)}
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Chi Tiết Báo Giá</span>
                <h3 className="font-heading font-black text-base text-[#10542C]">{viewingRfqDetail.rfqCode}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRfqDetail(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Nông Sản Đàm Phán</span>
                <strong className="text-sm font-bold text-gray-900 block">{viewingRfqDetail.productName}</strong>
                <p className="text-gray-600">
                  Mã lô: <span className="font-mono font-bold text-slate-800">{viewingRfqDetail.lotCode}</span> • Nhà vườn: <strong>{viewingRfqDetail.farmerName || 'HTX Nông Nghiệp'}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 font-semibold block">Khối lượng mua:</span>
                  <strong className="text-sm font-black text-gray-900 font-mono">
                    {(viewingRfqDetail.requestedQuantityKg || 0).toLocaleString()} kg
                  </strong>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 font-semibold block">Giá bạn đề xuất:</span>
                  <strong className="text-sm font-black text-[#10542C] font-mono">
                    {formatVND(viewingRfqDetail.targetPricePerKg)}/kg
                  </strong>
                </div>
              </div>

              {Boolean(viewingRfqDetail.counterPricePerKg) && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 font-semibold block">Nhà vườn phản hồi mức giá:</span>
                  <strong className="text-sm font-black text-amber-900 font-mono">
                    {formatVND(viewingRfqDetail.counterPricePerKg!)}/kg
                  </strong>
                </div>
              )}

              <div className="space-y-1 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-500">Trạng thái:</span>
                  {(() => {
                    const meta = formatStatusVi(viewingRfqDetail.status);
                    return <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${meta.badgeClass}`}>{meta.label}</span>;
                  })()}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phương thức vận chuyển:</span>
                  <strong className="text-gray-800">{viewingRfqDetail.shippingOption || 'Xe tải lạnh bảo ôn'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Địa chỉ kho nhận:</span>
                  <strong className="text-gray-800 text-right max-w-[65%] truncate">{viewingRfqDetail.deliveryLocation}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngày giao mong muốn:</span>
                  <strong className="text-gray-800">{formatDateVi(viewingRfqDetail.desiredDeliveryDate)}</strong>
                </div>
                {viewingRfqDetail.notes && (
                  <div className="pt-1 border-t border-gray-200 mt-1">
                    <span className="text-gray-500 block">Ghi chú:</span>
                    <p className="text-gray-700 italic">{viewingRfqDetail.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewingRfqDetail(null)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition cursor-pointer text-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* 4.2. Modal Chỉnh Sửa Đơn Đàm Phán RFQ */}
      {editingRfqDetail && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Chỉnh Sửa Báo Giá</span>
                <h3 className="font-heading font-black text-base text-[#10542C]">{editingRfqDetail.rfqCode}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRfqDetail(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nông sản:</label>
                <div className="px-3 py-2 bg-gray-100 rounded-xl font-bold text-gray-800">
                  {editingRfqDetail.productName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sản lượng (kg) *</label>
                  <input
                    type="number"
                    min={100}
                    value={editingRfqDetail.quantity}
                    onChange={(e) =>
                      setEditingRfqDetail({ ...editingRfqDetail, quantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-gray-900 focus:outline-none focus:border-[#10542C]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Giá bạn muốn mua (đ/kg) *</label>
                  <input
                    type="number"
                    min={1000}
                    step={100}
                    value={editingRfqDetail.price}
                    onChange={(e) =>
                      setEditingRfqDetail({ ...editingRfqDetail, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-[#10542C] focus:outline-none focus:border-[#10542C]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Địa điểm giao nhận kho:</label>
                <input
                  type="text"
                  value={editingRfqDetail.deliveryLocation}
                  onChange={(e) =>
                    setEditingRfqDetail({ ...editingRfqDetail, deliveryLocation: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-gray-800 focus:outline-none focus:border-[#10542C]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Ghi chú bổ sung:</label>
                <textarea
                  rows={2}
                  value={editingRfqDetail.notes}
                  onChange={(e) =>
                    setEditingRfqDetail({ ...editingRfqDetail, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-gray-800 focus:outline-none focus:border-[#10542C]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRfqDetail(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition cursor-pointer text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEditRfq}
                className="flex-1 py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold rounded-xl transition cursor-pointer text-xs shadow-md"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
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
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">Điều Phối Vận Tải Lạnh</span>
                <h3 className="font-heading font-black text-base text-[#10542C]">
                  Xe Lạnh HoNa Express · {dispatchingContract.contractCode}
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
              <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">Thông Tin Đơn Hàng</span>
              <strong className="text-sm font-bold text-gray-900 block">{dispatchingContract.productName}</strong>
              <div className="flex justify-between text-blue-900 pt-1 border-t border-blue-200/60">
                <span>Khối lượng cần vận chuyển:</span>
                <b className="font-mono">{((dispatchingContract.quantity || dispatchingContract.quantityKg) ?? 0).toLocaleString()} kg</b>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Chọn Phương Tiện Xe Tải Lạnh Chuyên Dụng:</label>
                <select
                  value={selectedTruckPlate}
                  onChange={(e) => setSelectedTruckPlate(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl font-bold text-gray-800 bg-[#F9FAF8] focus:outline-none focus:border-[#10542C] cursor-pointer"
                >
                  <option value="49C-198.86 (Xe Thùng Lạnh HoNa Express 5 Tấn)">
                    49C-198.86 (Xe Thùng Lạnh HoNa Express 5 Tấn - Đà Lạt)
                  </option>
                  <option value="51D-882.34 (Xe Tải Lạnh HoNa Hino 8 Tấn)">
                    51D-882.34 (Xe Tải Lạnh HoNa Hino 8 Tấn - TP.HCM)
                  </option>
                  <option value="60B-345.67 (Xe Lạnh Trung Chuyển Dầu Giây 3.5 Tấn)">
                    60B-345.67 (Xe Lạnh Trung Chuyển Dầu Giây 3.5 Tấn)
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tài Xế Phụ Trách & Hotline Vận Hành:</label>
                <select
                  value={selectedDriverInfo}
                  onChange={(e) => setSelectedDriverInfo(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl font-bold text-gray-800 bg-[#F9FAF8] focus:outline-none focus:border-[#10542C] cursor-pointer"
                >
                  <option value="Tài xế Nguyễn Văn Tài - 0944.556.677">
                    Nguyễn Văn Tài (Đội xe Lâm Đồng - 0944.556.677)
                  </option>
                  <option value="Tài xế Lê Văn Hùng - 0912.889.900">
                    Lê Văn Hùng (Đội xe TP.HCM - 0912.889.900)
                  </option>
                  <option value="Tài xế Trần Quốc Bảo - 0988.223.344">
                    Trần Quốc Bảo (Đội xe Dầu Giây - 0988.223.344)
                  </option>
                </select>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Nhiệt độ thùng xe kiểm soát IoT:</span>
                  <b className="text-emerald-700 font-mono">2.0°C - 6.0°C (Đạt chuẩn)</b>
                </div>
                <div className="flex justify-between">
                  <span>Kho giao hàng:</span>
                  <b className="text-gray-800 text-right max-w-[65%] truncate">
                    {dispatchingContract.deliveryAddress || dispatchingContract.hubName || 'Kho thương lái'}
                  </b>
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
                onClick={handleConfirmDispatchTruck}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Truck className="w-4 h-4 text-white" />
                <span>Xác Nhận Xuất Xe (Tiến Mốc 3)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

